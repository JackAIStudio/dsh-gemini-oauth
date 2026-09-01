// OAuth authentication, token management, and local loopback server

import { randomBytes, createHash } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import {
  AUTH_URL,
  TOKEN_URL,
  REDIRECT_PATH,
  DEFAULT_CALLBACK_PORT,
  SCOPES,
} from "../common/constants";
import type { AccountRecord } from "../common/types";
import { clientConfig, readCredentialStore, writeCredentialStore, upsertAccount } from "./store";
import type { LoginSession, TokenExchangeResponse } from "./types";

let loginSession: LoginSession | undefined = undefined;

export function getLoginSession(): LoginSession | undefined {
  return loginSession;
}

export function setLoginSession(session: LoginSession | undefined): void {
  loginSession = session;
}

export function isLoopbackAddress(address?: string): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

export function openBrowser(url: string): void {
  try {
    if (process.platform === "darwin") {
      spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    } else if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    } else {
      spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
    }
  } catch {
    // 打不开就让用户复制 authUrl。
  }
}

export async function exchangeTokens(
  fetchImpl: typeof fetch,
  params: Record<string, string>,
): Promise<TokenExchangeResponse> {
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`token 交换失败 HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<TokenExchangeResponse>;
}

export async function refreshCredential(
  fetchImpl: typeof fetch,
  creds: AccountRecord,
): Promise<AccountRecord> {
  const { clientId, clientSecret } = clientConfig();
  const tokens = await exchangeTokens(fetchImpl, {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: creds.refresh,
    grant_type: "refresh_token",
  });
  return {
    ...creds,
    access: tokens.access_token,
    refresh: typeof tokens.refresh_token === "string" ? tokens.refresh_token : creds.refresh,
    expires: Date.now() + tokens.expires_in * 1000 - 300_000,
  };
}

// 刷新结果区分「IdP 明确拒绝」与「网络不可达」：网络失败保留旧凭据以便
// 下次重试（对齐 grok 的 ensureFresh*：网络抖动不把用户踢下线）。
export async function tryRefreshCredential(
  fetchImpl: typeof fetch,
  creds: AccountRecord,
): Promise<{ ok: true; creds: AccountRecord } | { ok: false; network: boolean; error: any }> {
  try {
    const refreshed = await refreshCredential(fetchImpl, creds);
    return { ok: true, creds: refreshed };
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    const network = !/token(\s|%)?交换失败 HTTP (?:400|401|403)|invalid_grant|invalid_request/i.test(text);
    return { ok: false, network, error };
  }
}

export async function startLoginFlow(
  fetchImpl: typeof fetch,
  onAccountSuccess?: () => void,
): Promise<{ authUrl: string }> {
  if (loginSession !== undefined) {
    return { authUrl: loginSession.authUrl };
  }
  const { clientId, clientSecret } = clientConfig();
  const verifier = Buffer.from(randomBytes(32)).toString("base64url");
  const challenge = Buffer.from(createHash("sha256").update(verifier).digest()).toString("base64url");
  const state = Buffer.from(randomBytes(24)).toString("base64url");
  const port = Number(process.env.GEMINI_OAUTH_CALLBACK_PORT) || DEFAULT_CALLBACK_PORT;
  const redirectUri = `http://localhost:${port}${REDIRECT_PATH}`;

  let resolveCallback!: (code: string) => void;
  let rejectCallback!: (err: Error) => void;
  const callbackDone = new Promise<string>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", redirectUri);
    if (url.pathname !== REDIRECT_PATH) {
      res.writeHead(404).end();
      return;
    }
    const code = url.searchParams.get("code");
    if (url.searchParams.get("state") !== state || code === null) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("OAuth 回调校验失败");
      rejectCallback(new Error("OAuth state 或 code 校验失败"));
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      .end("<html><body><h2>Gemini OAuth 登录完成</h2>可以关闭此页。</body></html>");
    resolveCallback(code);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  const authUrlObject = new URL(AUTH_URL);
  authUrlObject.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    access_type: "offline",
    prompt: "consent",
  }).toString();
  const authUrl = authUrlObject.toString();

  loginSession = { state, verifier, server, authUrl, status: "pending" };
  openBrowser(authUrl);

  void callbackDone
    .then(async (code) => {
      try {
        const tokens = await exchangeTokens(fetchImpl, {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code_verifier: verifier,
        });
        if (typeof tokens.refresh_token !== "string") throw new Error("OAuth 未返回 refresh token");
        let email: string | undefined;
        try {
          const ui = await fetchImpl("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
            headers: { authorization: `Bearer ${tokens.access_token}` },
          });
          email = ui.ok ? ((await ui.json()) as any).email : undefined;
        } catch { /* 静默 */ }

        const { discoverProject, stableProjectId } = await import("./cca-client");
        const projectId = await discoverProject(fetchImpl, tokens.access_token)
          ?? stableProjectId(email || "gemini-oauth-default");
        const store = await readCredentialStore();
        await writeCredentialStore(upsertAccount(store, {
          access: tokens.access_token,
          refresh: tokens.refresh_token,
          expires: Date.now() + tokens.expires_in * 1000 - 300_000,
          projectId,
          email,
        }));
        onAccountSuccess?.();
        if (loginSession) loginSession.status = "complete";
      } catch (error) {
        if (loginSession) {
          loginSession.status = "error";
          loginSession.error = error instanceof Error && error.message.length > 0 ? error.message : String(error);
        }
      }
    })
    .catch(() => {})
    .finally(() => {
      setTimeout(() => {
        loginSession?.server?.close();
        loginSession = undefined;
      }, 5000);
    });

  return { authUrl };
}
