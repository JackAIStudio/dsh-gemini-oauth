// WebServer HTTP API route handlers for settings, status, quota, models, and accounts

import type { ServerResponse, IncomingMessage } from "node:http";
import { API_PATH } from "../common/constants";
import type {
  AccountRecord,
  AccountView,
  CredentialStore,
  ModelsView,
  SettingsView,
  StatusView,
} from "../common/types";
import { fetchQuota } from "./cca-client";
import { getLoginSession, isLoopbackAddress, startLoginFlow, tryRefreshCredential } from "./oauth";
import {
  activeAccountFrom,
  deleteCredentialStore,
  emptyStore,
  publicAccountId,
  readCredentialStore,
  removeAccount,
  switchActiveAccount,
  upsertAccount,
  writeCredentialStore,
} from "./store";
import type { GemOAuthRuntime } from "./adapter";

export function sendJson(res: ServerResponse, statusCode: number, value: any): void {
  const body = JSON.stringify(value);
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(body);
}

export const readBody = async (req: IncomingMessage, signal?: AbortSignal): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    if (signal?.aborted) return "";
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
};

export const apiHandler = (
  methodOrMap: string | Record<string, (req: IncomingMessage, signal?: AbortSignal) => Promise<{ ok: boolean; value?: any; error?: any }>>,
  run?: (req: IncomingMessage, signal?: AbortSignal) => Promise<{ ok: boolean; value?: any; error?: any }>,
) => async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  if (!isLoopbackAddress((req.socket as any)?.remoteAddress)) {
    sendJson(res, 403, { ok: false, error: "仅支持本机访问" });
    return;
  }
  const methods = typeof methodOrMap === "string" ? { [methodOrMap]: run! } : methodOrMap;
  const handler = methods[req.method ?? ""];
  if (handler === undefined) {
    res.setHeader("allow", Object.keys(methods).join(", ") || "GET, POST");
    sendJson(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }
  const ac = new AbortController();
  const onClose = () => ac.abort();
  res.on("close", onClose);
  try {
    const result = await handler(req, ac.signal);
    if (ac.signal.aborted) return;
    if (!result.ok) {
      const message = result.error instanceof Error
        ? result.error.message
        : (typeof result.error === "string" && result.error.length > 0 ? result.error : "请求失败");
      sendJson(res, 200, { ok: false, error: message });
      return;
    }
    sendJson(res, 200, { ok: true, value: result.value });
  } catch (error) {
    if (ac.signal.aborted) return;
    sendJson(res, 200, {
      ok: false,
      error: error instanceof Error && error.message.length > 0 ? error.message : "内部错误",
    });
  } finally {
    res.off("close", onClose);
  }
};

export function accountView(account: AccountRecord, active: boolean): AccountView {
  return {
    id: publicAccountId(account) ?? "",
    ...(typeof account.email === "string" ? { email: account.email } : {}),
    expires: account.expires,
    active: active === true,
  };
}

export function statusView(store: CredentialStore): StatusView {
  const active = activeAccountFrom(store);
  if (active === undefined) return { authenticated: false, accounts: [] };
  const activeId = publicAccountId(active);
  return {
    authenticated: true,
    ...(typeof active.email === "string" ? { email: active.email } : {}),
    ...(typeof active.tierName === "string" ? { tierName: active.tierName } : {}),
    ...(activeId !== undefined ? { activeAccountId: activeId } : {}),
    accounts: store.accounts.map((account) => accountView(account, publicAccountId(account) === activeId)),
  };
}

export function redactSecrets(message: string, ...accounts: (AccountRecord | undefined)[]): string {
  let out = message;
  for (const account of accounts) {
    for (const secret of [account?.access, account?.refresh]) {
      if (typeof secret === "string" && secret.length > 0) out = out.split(secret).join("[redacted]");
    }
  }
  return out;
}

export function registerApiRoutes(ctx: any, runtime: GemOAuthRuntime, ns: any): void {
  const routeStatus = async (signal?: AbortSignal) => {
    const store = await readCredentialStore();
    const loginSession = getLoginSession();
    const login = loginSession === undefined
      ? undefined
      : { status: loginSession.status, ...(loginSession.error ? { error: loginSession.error } : {}) };
    const value = statusView(store);
    if (login !== undefined) (value as any).login = login;
    const active = activeAccountFrom(store);
    if (active !== undefined && typeof active.email !== "string") {
      try {
        const r = await runtime.fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { authorization: `Bearer ${active.access}` },
          signal,
        });
        if (r.ok) {
          const email = ((await r.json()) as any).email;
          if (typeof email === "string") {
            const next = upsertAccount(store, { ...active, email }, false);
            await writeCredentialStore(next).catch(() => {});
            value.email = email;
          }
        }
      } catch { /* 静默 */ }
    }
    return { ok: true, value };
  };

  const routeLogin = async () => {
    const res = await startLoginFlow(runtime.fetch, () => runtime.resetCatalogCache());
    return { ok: true, value: res };
  };

  const routeRemoveAccount = async (req: IncomingMessage, signal?: AbortSignal) => {
    let accountId: string | undefined;
    try {
      const raw = await readBody(req, signal);
      const payload = raw.trim().length > 0 ? JSON.parse(raw) : undefined;
      accountId = payload && typeof payload.accountId === "string" ? payload.accountId : undefined;
    } catch {
      return { ok: false, error: "请求体不是合法 JSON" };
    }
    const store = await readCredentialStore();
    let targetId = accountId;
    if (targetId === undefined) {
      const active = activeAccountFrom(store);
      targetId = active === undefined ? undefined : publicAccountId(active);
    }
    if (targetId === undefined) {
      await deleteCredentialStore();
      runtime.resetCatalogCache();
      return { ok: true, value: statusView(emptyStore()) };
    }
    const next = removeAccount(store, targetId);
    if (next.accounts.length === 0) await deleteCredentialStore();
    else await writeCredentialStore(next);
    runtime.resetCatalogCache();
    return { ok: true, value: statusView(next) };
  };

  const routeSwitchAccount = async (req: IncomingMessage, signal?: AbortSignal) => {
    const raw = await readBody(req, signal);
    let payload: any;
    try { payload = JSON.parse(raw); } catch { return { ok: false, error: "请求体不是合法 JSON" }; }
    const accountId = payload?.accountId;
    if (typeof accountId !== "string" || accountId.length === 0) {
      return { ok: false, error: "accountId 必填" };
    }
    const store = await readCredentialStore();
    const switched = switchActiveAccount(store, accountId);
    if (switched === undefined) return { ok: false, error: "该账号不存在于本机" };
    await writeCredentialStore(switched);
    runtime.resetCatalogCache();
    const status = statusView(switched);
    const active = activeAccountFrom(switched);
    if (active !== undefined && typeof active.email !== "string") {
      try {
        const r = await runtime.fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { authorization: `Bearer ${active.access}` },
          signal,
        });
        if (r.ok) {
          const email = ((await r.json()) as any).email;
          if (typeof email === "string") {
            const next = upsertAccount(switched, { ...active, email }, false);
            await writeCredentialStore(next).catch(() => {});
            status.email = email;
          }
        }
      } catch { /* 静默 */ }
    }
    return { ok: true, value: status };
  };

  const routeQuota = async (req: IncomingMessage, signal?: AbortSignal) => {
    let accountId: string | undefined;
    try {
      const raw = await readBody(req, signal);
      const payload = raw.trim().length > 0 ? JSON.parse(raw) : undefined;
      accountId = payload && typeof payload.accountId === "string" ? payload.accountId : undefined;
    } catch {
      return { ok: false, error: "请求体不是合法 JSON" };
    }
    const creds = await runtime.ensureAccess(signal, accountId);
    const quota = await fetchQuota(runtime.fetch, creds);
    return {
      ok: true,
      value: {
        quota: quota ?? null,
        fetchedAt: new Date().toISOString(),
        accountId: publicAccountId(creds),
      },
    };
  };

  const routeQuotaAll = async (signal?: AbortSignal) => {
    let store = await readCredentialStore();
    if (store.accounts.length === 0) return { ok: true, value: { accounts: [], fetchedAt: new Date().toISOString() } };
    const activeId = (() => {
      const active = activeAccountFrom(store);
      return active === undefined ? undefined : publicAccountId(active);
    })();
    const results: any[] = [];
    for (const account of store.accounts) {
      const id = publicAccountId(account) ?? "";
      const base = {
        accountId: id,
        ...(typeof account.email === "string" ? { email: account.email } : {}),
        active: id === activeId,
      };
      let current = account;
      if (current.expires < Date.now() + 300_000) {
        const refreshed = await tryRefreshCredential(runtime.fetch, current);
        if (refreshed.ok) {
          current = refreshed.creds;
          store = upsertAccount(store, current, false);
          await writeCredentialStore(store).catch(() => {});
        }
      }
      try {
        const quota = await fetchQuota(runtime.fetch, current);
        results.push({ ...base, status: "ok", quota: quota ?? null });
      } catch (error) {
        const message = error instanceof Error && error.message.length > 0 ? error.message : "额度读取失败";
        results.push({ ...base, status: "error", message: redactSecrets(message, account, current) });
      }
      if (signal?.aborted) break;
    }
    return { ok: true, value: { accounts: results, fetchedAt: new Date().toISOString() } };
  };

  const modelsView = async (signal?: AbortSignal, enabledOverride?: Set<string>): Promise<ModelsView> => {
    const catalog = await runtime.catalog(signal);
    const enabled = enabledOverride ?? await runtime.enabledModels();
    return {
      options: catalog.map((entry) => ({
        id: entry.id,
        name: entry.name,
        inputModalities: entry.inputModalities ?? ["text"],
        ...(entry.reasoning ? { reasoning: entry.reasoning } : {}),
        enabled: enabled === undefined ? true : enabled.has(entry.id),
      })),
      fetchedAt: new Date().toISOString(),
    };
  };

  const routeModels = async (signal?: AbortSignal) => {
    return { ok: true, value: await modelsView(signal) };
  };

  const routeModelsSave = async (req: IncomingMessage, signal?: AbortSignal) => {
    const raw = await readBody(req, signal);
    let payload: any;
    try { payload = JSON.parse(raw); } catch { return { ok: false, error: "请求体不是合法 JSON" }; }
    if (!Array.isArray(payload?.enabledModelIds) || payload.enabledModelIds.some((id: any) => typeof id !== "string")) {
      return { ok: false, error: "enabledModelIds 必须是字符串数组" };
    }
    const enabled = await runtime.setEnabledModels(payload.enabledModelIds);
    return { ok: true, value: await modelsView(signal, enabled) };
  };

  const settingsView = (settings: any): SettingsView => {
    const descriptor = settings.describe().find((entry: any) => entry.ns === ns);
    const value = descriptor?.value;
    return {
      proxy: typeof value?.proxy === "string" ? value.proxy : "",
      revision: descriptor?.revision ?? 0,
    };
  };

  const routeSettings = async () => {
    const settings = ctx.get("settings");
    if (settings === undefined) return { ok: true, value: { proxy: "", revision: 0 } };
    return { ok: true, value: settingsView(settings) };
  };

  const routeSettingsSave = async (req: IncomingMessage, signal?: AbortSignal) => {
    const settings = ctx.get("settings");
    if (settings === undefined) return { ok: false, error: "设置服务不可用" };
    const raw = await readBody(req, signal);
    let payload: any;
    try { payload = JSON.parse(raw); } catch { return { ok: false, error: "请求体不是合法 JSON" }; }
    const proxy = payload?.proxy;
    if (typeof proxy !== "string") return { ok: false, error: "proxy 必须是字符串" };
    const before = settingsView(settings);
    const ops = [];
    if (before.proxy !== proxy) ops.push({ op: "set", path: ["proxy"], value: proxy });
    const expectedRevision = typeof payload?.expectedRevision === "number" ? payload.expectedRevision : undefined;
    if (ops.length > 0) await settings.mutate(ns, ops, expectedRevision);
    return { ok: true, value: settingsView(settings) };
  };

  ctx.inject(["webServer"], (web: any) => {
    const webServer = web.get("webServer");
    web.effect(() => {
      const disposers = [
        webServer.register({ kind: "exact", path: `${API_PATH}/status`, handler: apiHandler("GET", (_req, signal) => routeStatus(signal)) }, "dsh-gemini-oauth/status"),
        webServer.register({ kind: "exact", path: `${API_PATH}/login`, handler: apiHandler("POST", () => routeLogin()) }, "dsh-gemini-oauth/login"),
        webServer.register({ kind: "exact", path: `${API_PATH}/logout`, handler: apiHandler("POST", (req, signal) => routeRemoveAccount(req, signal)) }, "dsh-gemini-oauth/logout"),
        webServer.register({ kind: "exact", path: `${API_PATH}/switch`, handler: apiHandler("POST", (req, signal) => routeSwitchAccount(req, signal)) }, "dsh-gemini-oauth/switch"),
        webServer.register({ kind: "exact", path: `${API_PATH}/remove`, handler: apiHandler("POST", (req, signal) => routeRemoveAccount(req, signal)) }, "dsh-gemini-oauth/remove"),
        webServer.register({ kind: "exact", path: `${API_PATH}/quota`, handler: apiHandler("POST", (req, signal) => routeQuota(req, signal)) }, "dsh-gemini-oauth/quota"),
        webServer.register({ kind: "exact", path: `${API_PATH}/quota-all`, handler: apiHandler("POST", (_req, signal) => routeQuotaAll(signal)) }, "dsh-gemini-oauth/quota-all"),
        webServer.register({
          kind: "exact",
          path: `${API_PATH}/models`,
          handler: apiHandler({
            GET: (_req, signal) => routeModels(signal),
            POST: (req, signal) => routeModelsSave(req, signal),
          }),
        }, "dsh-gemini-oauth/models"),
        webServer.register({
          kind: "exact",
          path: `${API_PATH}/settings`,
          handler: apiHandler({
            GET: () => routeSettings(),
            POST: (req, signal) => routeSettingsSave(req, signal),
          }),
        }, "dsh-gemini-oauth/settings"),
      ];
      return () => {
        for (const dispose of disposers) {
          try { dispose?.(); } catch { /* 忽略 */ }
        }
      };
    });
  });
}
