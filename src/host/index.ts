// dsh-gemini-oauth — Gemini (Google Antigravity / Cloud Code Assist) provider for DeepSeek Harness.

import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import {
  PROVIDER,
  PROVIDER_NAME,
  SETTINGS_NS_TEXT,
  RUNTIME_MODEL_ALIASES,
} from "../common/constants";
import {
  decodeCredentialStore,
  storeFromLegacy,
  upsertAccount,
  switchActiveAccount,
  removeAccount,
  accountKeyOf,
  publicAccountId,
  activeAccountFrom,
  findAccountIndex,
  emptyStore,
  readCredentialStore,
  writeCredentialStore,
  deleteCredentialStore,
  readModelConfig,
  writeModelConfig,
  resetModelConfig,
} from "./store";
import { runtimeModelId } from "./catalog";
import { GemOAuthAdapter, GemOAuthRuntime } from "./adapter";
import { registerApiRoutes } from "./routes";
import { getLoginSession, setLoginSession } from "./oauth";

export const name = "dsh-gemini-oauth";
export const inject = ["llm"];

export const Config = z.object({
  proxy: z.string().description("代理 host:port（留空继承 HTTPS_PROXY / ALL_PROXY；填 direct 强制直连）").default(""),
});

export function apply(ctx: any, config: any): void {
  const NS = settingsNamespace(SETTINGS_NS_TEXT);
  let current = () => config;
  let lastRaw: any;
  let lastGood: any;

  const runtime = new GemOAuthRuntime();
  runtime.resolveAttachments = () => {
    try {
      return ctx.get("attachments");
    } catch {
      return undefined;
    }
  };

  const resolveOptions = () => {
    const raw = current();
    if (raw === lastRaw && lastGood !== undefined) return lastGood;
    lastGood = raw;
    lastRaw = raw;
    return lastGood;
  };

  const applyTransport = () => {
    const raw = resolveOptions().proxy?.trim?.() ?? "";
    const proxySetting = raw || process.env.HTTPS_PROXY || process.env.ALL_PROXY || "";
    if (!proxySetting || proxySetting === "direct") {
      runtime.setFetch((input: any, init: any) => globalThis.fetch(input, init));
      return;
    }
    try {
      const dispatcher = proxySetting.startsWith("http") || proxySetting.startsWith("socks")
        ? new ProxyAgent(proxySetting)
        : new ProxyAgent(`http://${proxySetting}`);
      runtime.setFetch((input: any, init: any) => undiciFetch(input, { ...init, dispatcher }) as any);
      ctx.logger.info("llm-gemini-oauth: proxy enabled", proxySetting);
    } catch (error) {
      ctx.logger.error("llm-gemini-oauth: invalid proxy setting, falling back to direct", error);
      runtime.setFetch((input: any, init: any) => globalThis.fetch(input, init));
    }
  };
  applyTransport();

  const adapter = new GemOAuthAdapter(runtime);
  ctx.llm.registerConfigurableProviders([{
    provider: PROVIDER,
    displayName: PROVIDER_NAME,
    settingsNs: NS,
    settingsPath: [],
  }]);
  ctx.llm.registerAdapter([PROVIDER], adapter);

  registerApiRoutes(ctx, runtime, NS);

  installSettingsSection(ctx, NS, Config, config, {
    setSource: (source: any) => {
      current = source;
    },
    onChange: () => {
      applyTransport();
    },
  });

  ctx.effect(() => async () => {
    const session = getLoginSession();
    session?.server?.close();
    setLoginSession(undefined);
  });
}

export {
  PROVIDER,
  PROVIDER_NAME,
  RUNTIME_MODEL_ALIASES,
  runtimeModelId,
  readModelConfig,
  writeModelConfig,
  resetModelConfig,
  decodeCredentialStore,
  storeFromLegacy,
  upsertAccount,
  switchActiveAccount,
  removeAccount,
  accountKeyOf,
  publicAccountId,
  activeAccountFrom,
  findAccountIndex,
  emptyStore,
  readCredentialStore,
  writeCredentialStore,
  deleteCredentialStore,
  GemOAuthAdapter,
};
