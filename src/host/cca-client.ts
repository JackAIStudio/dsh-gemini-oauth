// Cloud Code Assist (CCA) HTTP communication and project/account discovery

import { createHash } from "node:crypto";
import { ENDPOINTS, PROJECT_CACHE_TTL_MS, ACCOUNT_PROFILE_TTL_MS } from "../common/constants";
import type { AccountRecord, QuotaSummary } from "../common/types";
import { safeJson } from "./store";
import type { EgressInfo, FetchJsonResult } from "./types";

export function ccaHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": "antigravity/1.15.8 darwin/arm64",
    "x-goog-api-client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
    "client-metadata": JSON.stringify({ ideType: "ANTIGRAVITY", platform: "MACOS", pluginType: "GEMINI" }),
  };
}

export async function postJson<T = any>(
  fetchImpl: typeof fetch,
  endpoint: string,
  path: string,
  token: string,
  body: any,
): Promise<FetchJsonResult<T>> {
  const res = await fetchImpl(`${endpoint}${path}`, {
    method: "POST",
    headers: ccaHeaders(token),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, json: safeJson(text), text };
}

export function stableProjectId(seed: string): string {
  const bytes = createHash("sha1").update(`antigravity:${seed}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function extractProjectId(data: any): string | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const direct = data.antigravityProjectId ?? data.projectId ?? data.backendProjectId
    ?? data.userDefinedCloudaicompanionProject ?? data.cloudaicompanionProject ?? data.project;
  if (typeof direct === "string" && direct.length > 0) return direct;
  if (typeof direct === "object" && direct !== null && typeof direct.id === "string") return direct.id;
  for (const key of ["projects", "projectIds", "cloudaicompanionProjects"]) {
    const value = data[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = extractProjectId(item);
        if (nested) return nested;
        if (typeof item === "string" && item.length > 0) return item;
      }
    }
  }
  return undefined;
}

export async function loadCodeAssistProject(
  fetchImpl: typeof fetch,
  endpoint: string,
  access: string,
): Promise<string | undefined> {
  const r = await postJson(fetchImpl, endpoint, "/v1internal:loadCodeAssist", access, {
    metadata: { ideType: "ANTIGRAVITY", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" },
  });
  if (!r.ok || !r.json) return undefined;
  const projectId = extractProjectId(r.json);
  if (projectId) return projectId;
  const l = await postJson(fetchImpl, endpoint, "/v1internal:listCloudAICompanionProjects", access, {});
  if (l.ok && l.json) return extractProjectId(l.json);
  return undefined;
}

// 项目按端点配对：daily 给 consumer 项目（aicode-consumers），主端点给个人
// 项目（cloudaicompanionProject）。用错项目 = 400/429。
// 多账号后缓存按账号隔离。
export const projectCache = new Map<string, { projectId?: string; expiresAt: number }>();

export async function projectForEndpoint(
  fetchImpl: typeof fetch,
  endpoint: string,
  access: string,
  fallback?: string,
  accountId?: string,
): Promise<string | undefined> {
  const cacheKey = accountId === undefined ? endpoint : `${accountId}\n${endpoint}`;
  const cached = projectCache.get(cacheKey);
  if (cached !== undefined && cached.expiresAt > Date.now()) return cached.projectId;
  let projectId: string | undefined;
  try {
    projectId = await loadCodeAssistProject(fetchImpl, endpoint, access);
  } catch {
    projectId = undefined;
  }
  projectCache.set(cacheKey, { projectId, expiresAt: Date.now() + PROJECT_CACHE_TTL_MS });
  return projectId ?? fallback;
}

// 登录期用：任一端点拿到项目即可。
export async function discoverProject(fetchImpl: typeof fetch, access: string): Promise<string | undefined> {
  for (const endpoint of ENDPOINTS) {
    const projectId = await loadCodeAssistProject(fetchImpl, endpoint, access);
    if (projectId) return projectId;
  }
  return undefined;
}

// loadCodeAssist 的个人/企业标记：个人账号绑定 daily 端点。
export const accountProfileCache = new Map<string, { gcpManaged: boolean; expiresAt: number }>();

export async function resolveAccountProfile(
  fetchImpl: typeof fetch,
  access: string,
  accountId?: string,
): Promise<boolean> {
  const key = accountId === undefined ? "" : accountId;
  const cached = accountProfileCache.get(key);
  if (cached !== undefined && cached.expiresAt > Date.now()) {
    return cached.gcpManaged;
  }
  let gcpManaged = false;
  try {
    const r = await postJson(fetchImpl, ENDPOINTS[0], "/v1internal:loadCodeAssist", access, {
      metadata: { ideType: "ANTIGRAVITY", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" },
    });
    if (r.ok && typeof r.json === "object" && r.json !== null) {
      gcpManaged = r.json.gcpManaged === true;
    }
  } catch { /* 探测失败按个人账号保守处理 */ }
  accountProfileCache.set(key, { gcpManaged, expiresAt: Date.now() + ACCOUNT_PROFILE_TTL_MS });
  return gcpManaged;
}

export async function egressDiagnostic(fetchImpl: typeof fetch): Promise<EgressInfo | undefined> {
  try {
    const r = await fetchImpl("https://ipinfo.io/json", { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return undefined;
    const j = (await r.json()) as any;
    if (typeof j !== "object" || j === null || typeof j.ip !== "string") return undefined;
    return {
      ip: j.ip,
      country: typeof j.country === "string" ? j.country : undefined,
      city: typeof j.city === "string" ? j.city : undefined,
      org: typeof j.org === "string" ? j.org : undefined,
    };
  } catch {
    return undefined;
  }
}

export async function fetchQuota(fetchImpl: typeof fetch, creds: AccountRecord): Promise<QuotaSummary | undefined> {
  for (const endpoint of ENDPOINTS) {
    const r = await postJson<QuotaSummary>(fetchImpl, endpoint, "/v1internal:retrieveUserQuotaSummary", creds.access, {});
    if (r.ok && r.json) return r.json;
  }
  return undefined;
}
