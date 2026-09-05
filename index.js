/** dsh-gemini-oauth Host plugin - Modular Build */

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// src/common/constants.ts
var PROVIDER, PROVIDER_NAME, SETTINGS_NS_TEXT, CREDENTIAL_FILENAME, MODEL_CONFIG_FILENAME, API_PATH, AUTH_URL, TOKEN_URL, REDIRECT_PATH, DEFAULT_CALLBACK_PORT, SCOPES, ENDPOINTS, decodeBase64, DEFAULT_CLIENT_ID, DEFAULT_CLIENT_SECRET, MODEL_CACHE_TTL_MS, OAUTH_CALLBACK_TIMEOUT_MS, DISCOVERY_TIMEOUT_MS, PROJECT_CACHE_TTL_MS, ACCOUNT_PROFILE_TTL_MS, CREDENTIAL_VERSION, RUNTIME_MODEL_ALIASES, LOCATION_RETRY_PATTERN, TRANSIENT_BACKOFF_MS, LOCATION_HINT, GATED_ENDPOINT_HINT;
var init_constants = __esm({
  "src/common/constants.ts"() {
    PROVIDER = "gemini-oauth";
    PROVIDER_NAME = "Gemini OAuth";
    SETTINGS_NS_TEXT = "llm-gemini-oauth";
    CREDENTIAL_FILENAME = "gemini-oauth.json";
    MODEL_CONFIG_FILENAME = "gemini-oauth-models.json";
    API_PATH = "/gemini-oauth/api";
    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    TOKEN_URL = "https://oauth2.googleapis.com/token";
    REDIRECT_PATH = "/oauth-callback";
    DEFAULT_CALLBACK_PORT = 51121;
    SCOPES = [
      "https://www.googleapis.com/auth/aicode",
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/cclog",
      "https://www.googleapis.com/auth/experimentsandconfigs"
    ];
    ENDPOINTS = [
      "https://daily-cloudcode-pa.googleapis.com",
      "https://cloudcode-pa.googleapis.com"
    ];
    decodeBase64 = (str) => {
      if (typeof atob === "function") return atob(str);
      if (typeof Buffer !== "undefined") return Buffer.from(str, "base64").toString("utf8");
      return "";
    };
    DEFAULT_CLIENT_ID = decodeBase64(
      "MTA3MTAwNjA2MDU5MS10bWhzc2luMmgyMWxjcmUyMzV2dG9sb2poNGc0MDNlcC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbQ=="
    );
    DEFAULT_CLIENT_SECRET = decodeBase64(
      "R09DU1BYLUs1OEZXUjQ4NkxkTEoxbUxCOHNYQzR6NnFEQWY="
    );
    MODEL_CACHE_TTL_MS = 5 * 60 * 1e3;
    OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1e3;
    DISCOVERY_TIMEOUT_MS = 30 * 1e3;
    PROJECT_CACHE_TTL_MS = 30 * 60 * 1e3;
    ACCOUNT_PROFILE_TTL_MS = 30 * 60 * 1e3;
    CREDENTIAL_VERSION = 2;
    RUNTIME_MODEL_ALIASES = {
      "gemini-3.1-pro-high": "gemini-pro-agent"
    };
    LOCATION_RETRY_PATTERN = /location is not supported/i;
    TRANSIENT_BACKOFF_MS = [0, 2e3, 6e3, 14e3];
    LOCATION_HINT = "\u51FA\u53E3 IP \u98CE\u63A7\u5224\u5B9A\uFF08Google \u6309\u51FA\u53E3 IP \u7684 \u56FD\u5BB6/ASN/\u673A\u623F\u7279\u5F81 \u95F4\u6B47\u6027\u62D2\u7EDD\uFF1B\u652F\u6301\u56FD\u5BB6 \u2260 \u8BE5\u8DEF\u5F84\u63A5\u53D7\u5F53\u524D IP\uFF09\u3002\u5EFA\u8BAE\uFF1A\u63D2\u4EF6\u8BBE\u7F6E\u5361\u300C\u7F51\u7EDC\u300D\u4F7F\u7528\u4EE3\u7406\uFF08127.0.0.1:7897\uFF09\uFF0C\u8282\u70B9\u4F18\u5148\u9009 \u5BB6\u5BBD/\u539F\u751F/\u4F4F\u5B85 \u7EBF\u8DEF\uFF0C\u907F\u5F00 G-Core/IDC \u673A\u623F IP";
    GATED_ENDPOINT_HINT = "cloudcode-pa.googleapis.com \u4EC5\u9650\u4F01\u4E1A/GCP \u8BB8\u53EF\u8D26\u53F7\uFF08\u4E2A\u4EBA\u8BA2\u9605\u8D26\u53F7\u8BBF\u95EE\u6052\u4E3A 429\uFF0C\u5DF2\u6309\u5B98\u65B9\u5BA2\u6237\u7AEF\u7B56\u7565\u4E0D\u518D\u56DE\u9000\u8BE5\u7AEF\u70B9\uFF09";
  }
});

// src/host/store.ts
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile, chmod } from "node:fs/promises";
import { dirname } from "node:path";
import { dshHomePath } from "@deepseek-ai/dsh-home-paths";
function credentialPath() {
  return dshHomePath(CREDENTIAL_FILENAME);
}
function clientConfig() {
  return {
    clientId: process.env.GEMINI_OAUTH_CLIENT_ID || DEFAULT_CLIENT_ID,
    clientSecret: process.env.GEMINI_OAUTH_CLIENT_SECRET || DEFAULT_CLIENT_SECRET
  };
}
function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return void 0;
  }
}
function accountKeyOf(creds) {
  if (typeof creds.email === "string" && creds.email.length > 0) return creds.email.toLowerCase();
  if (typeof creds.projectId === "string" && creds.projectId.length > 0) return creds.projectId;
  return void 0;
}
function publicAccountId(creds) {
  return accountKeyOf(creds) ?? (typeof creds.refresh === "string" && creds.refresh.length > 0 ? createHash("sha1").update(`gemini:${creds.refresh}`).digest("hex").slice(0, 16) : void 0);
}
function sameAccount(left, right) {
  const leftKey = accountKeyOf(left);
  const rightKey = accountKeyOf(right);
  return leftKey !== void 0 && rightKey !== void 0 && leftKey === rightKey;
}
function cloneAccount(creds) {
  const out = {
    access: creds.access,
    refresh: creds.refresh,
    expires: creds.expires
  };
  if (typeof creds.projectId === "string" && creds.projectId.length > 0) out.projectId = creds.projectId;
  if (typeof creds.email === "string" && creds.email.length > 0) out.email = creds.email;
  if (typeof creds.tierName === "string" && creds.tierName.length > 0) out.tierName = creds.tierName;
  return out;
}
function isAccountRecord(value) {
  return typeof value === "object" && value !== null && typeof value.access === "string" && value.access.length > 0 && typeof value.refresh === "string" && value.refresh.length > 0 && typeof value.expires === "number" && Number.isFinite(value.expires);
}
function emptyStore() {
  return { version: CREDENTIAL_VERSION, accounts: [] };
}
function storeFromLegacy(creds) {
  const cloned = cloneAccount(creds);
  const id = publicAccountId(cloned);
  return {
    version: CREDENTIAL_VERSION,
    ...id !== void 0 ? { activeAccountId: id } : {},
    accounts: [cloned]
  };
}
function findAccountIndex(store, accountId) {
  if (typeof accountId !== "string" || accountId.length === 0) return -1;
  const needle = accountId.trim();
  const lowered = needle.toLowerCase();
  return store.accounts.findIndex((account) => publicAccountId(account) === needle || accountKeyOf(account) === needle || typeof account.email === "string" && account.email.toLowerCase() === lowered);
}
function activeAccountFrom(store) {
  if (store.accounts.length === 0) return void 0;
  const index = findAccountIndex(store, store.activeAccountId);
  return store.accounts[index >= 0 ? index : 0];
}
function upsertAccount(store, creds, activate = true) {
  const next = cloneAccount(creds);
  const accounts = [];
  let replaced = false;
  for (const account of store.accounts) {
    if (sameAccount(account, next)) {
      accounts.push(next);
      replaced = true;
    } else {
      accounts.push(cloneAccount(account));
    }
  }
  if (!replaced) accounts.push(next);
  const activeId = activate === false && store.activeAccountId !== void 0 ? store.activeAccountId : publicAccountId(next) ?? store.activeAccountId;
  return {
    version: CREDENTIAL_VERSION,
    ...activeId !== void 0 ? { activeAccountId: activeId } : {},
    accounts
  };
}
function switchActiveAccount(store, accountId) {
  const index = findAccountIndex(store, accountId);
  if (index < 0) return void 0;
  const id = publicAccountId(store.accounts[index]);
  return {
    version: CREDENTIAL_VERSION,
    ...id !== void 0 ? { activeAccountId: id } : {},
    accounts: store.accounts.map(cloneAccount)
  };
}
function removeAccount(store, accountId) {
  const index = findAccountIndex(store, accountId);
  if (index < 0) {
    return store.accounts.length === 0 ? emptyStore() : {
      version: CREDENTIAL_VERSION,
      ...store.activeAccountId !== void 0 ? { activeAccountId: store.activeAccountId } : {},
      accounts: store.accounts.map(cloneAccount)
    };
  }
  const accounts = store.accounts.filter((_, at) => at !== index).map(cloneAccount);
  if (accounts.length === 0) return emptyStore();
  const removedWasActive = findAccountIndex(store, store.activeAccountId) === index || store.activeAccountId === void 0;
  const nextActive = removedWasActive ? publicAccountId(accounts[0]) : store.activeAccountId;
  return {
    version: CREDENTIAL_VERSION,
    ...nextActive !== void 0 ? { activeAccountId: nextActive } : {},
    accounts
  };
}
function decodeCredentialStore(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return void 0;
  if (Array.isArray(raw.accounts)) {
    const accounts = [];
    for (const entry of raw.accounts) {
      if (!isAccountRecord(entry)) return void 0;
      accounts.push(cloneAccount(entry));
    }
    const activeAccountId = typeof raw.activeAccountId === "string" && raw.activeAccountId.length > 0 ? raw.activeAccountId : void 0;
    const store = { version: CREDENTIAL_VERSION, accounts };
    if (activeAccountId !== void 0) store.activeAccountId = activeAccountId;
    const active = activeAccountFrom(store);
    if (active !== void 0) {
      const id = publicAccountId(active);
      if (id !== void 0) store.activeAccountId = id;
    } else {
      delete store.activeAccountId;
    }
    return store;
  }
  if (!isAccountRecord(raw)) return void 0;
  return storeFromLegacy(raw);
}
async function readCredentialStore() {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(credentialPath(), "utf8"));
  } catch {
    return emptyStore();
  }
  const store = decodeCredentialStore(parsed);
  if (store === void 0) return emptyStore();
  if (!Array.isArray(parsed.accounts)) {
    await writeCredentialStore(store).catch(() => {
    });
  }
  return store;
}
async function writeCredentialStore(store) {
  await mkdir(dirname(credentialPath()), { recursive: true });
  const body = JSON.stringify({
    version: CREDENTIAL_VERSION,
    ...store.activeAccountId !== void 0 ? { activeAccountId: store.activeAccountId } : {},
    accounts: store.accounts.map(cloneAccount)
  }, null, 2);
  const tmp = `${credentialPath()}.${process.pid}.tmp`;
  await writeFile(tmp, body, { mode: 384 });
  await chmod(tmp, 384);
  await rename(tmp, credentialPath());
}
async function deleteCredentialStore() {
  await unlink(credentialPath()).catch(() => {
  });
}
function modelConfigPath() {
  return dshHomePath(MODEL_CONFIG_FILENAME);
}
async function readModelConfig() {
  try {
    const parsed = JSON.parse(await readFile(modelConfigPath(), "utf8"));
    if (Array.isArray(parsed?.enabledModelIds)) {
      return new Set(parsed.enabledModelIds.filter((id) => typeof id === "string"));
    }
    return void 0;
  } catch {
    return void 0;
  }
}
async function writeModelConfig(enabledModelIds) {
  await mkdir(dirname(modelConfigPath()), { recursive: true });
  const tmp = `${modelConfigPath()}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ enabledModelIds }, null, 2), { mode: 384 });
  await chmod(tmp, 384);
  await rename(tmp, modelConfigPath());
}
async function resetModelConfig() {
  await unlink(modelConfigPath()).catch(() => {
  });
}
var init_store = __esm({
  "src/host/store.ts"() {
    init_constants();
  }
});

// src/host/cca-client.ts
var cca_client_exports = {};
__export(cca_client_exports, {
  accountProfileCache: () => accountProfileCache,
  ccaHeaders: () => ccaHeaders,
  discoverProject: () => discoverProject,
  egressDiagnostic: () => egressDiagnostic,
  extractProjectId: () => extractProjectId,
  fetchQuota: () => fetchQuota,
  loadCodeAssistProject: () => loadCodeAssistProject,
  postJson: () => postJson,
  projectCache: () => projectCache,
  projectForEndpoint: () => projectForEndpoint,
  resolveAccountProfile: () => resolveAccountProfile,
  stableProjectId: () => stableProjectId
});
import { createHash as createHash2 } from "node:crypto";
function ccaHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": "antigravity/1.15.8 darwin/arm64",
    "x-goog-api-client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
    "client-metadata": JSON.stringify({ ideType: "ANTIGRAVITY", platform: "MACOS", pluginType: "GEMINI" })
  };
}
async function postJson(fetchImpl, endpoint, path, token, body) {
  const res = await fetchImpl(`${endpoint}${path}`, {
    method: "POST",
    headers: ccaHeaders(token),
    body: JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, json: safeJson(text), text };
}
function stableProjectId(seed) {
  const bytes = createHash2("sha1").update(`antigravity:${seed}`).digest().subarray(0, 16);
  bytes[6] = bytes[6] & 15 | 80;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function extractProjectId(data) {
  if (typeof data !== "object" || data === null) return void 0;
  const direct = data.antigravityProjectId ?? data.projectId ?? data.backendProjectId ?? data.userDefinedCloudaicompanionProject ?? data.cloudaicompanionProject ?? data.project;
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
  return void 0;
}
async function loadCodeAssistProject(fetchImpl, endpoint, access) {
  const r = await postJson(fetchImpl, endpoint, "/v1internal:loadCodeAssist", access, {
    metadata: { ideType: "ANTIGRAVITY", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" }
  });
  if (!r.ok || !r.json) return void 0;
  const projectId = extractProjectId(r.json);
  if (projectId) return projectId;
  const l = await postJson(fetchImpl, endpoint, "/v1internal:listCloudAICompanionProjects", access, {});
  if (l.ok && l.json) return extractProjectId(l.json);
  return void 0;
}
async function projectForEndpoint(fetchImpl, endpoint, access, fallback, accountId) {
  const cacheKey = accountId === void 0 ? endpoint : `${accountId}
${endpoint}`;
  const cached = projectCache.get(cacheKey);
  if (cached !== void 0 && cached.expiresAt > Date.now()) return cached.projectId;
  let projectId;
  try {
    projectId = await loadCodeAssistProject(fetchImpl, endpoint, access);
  } catch {
    projectId = void 0;
  }
  projectCache.set(cacheKey, { projectId, expiresAt: Date.now() + PROJECT_CACHE_TTL_MS });
  return projectId ?? fallback;
}
async function discoverProject(fetchImpl, access) {
  for (const endpoint of ENDPOINTS) {
    const projectId = await loadCodeAssistProject(fetchImpl, endpoint, access);
    if (projectId) return projectId;
  }
  return void 0;
}
async function resolveAccountProfile(fetchImpl, access, accountId) {
  const key = accountId === void 0 ? "" : accountId;
  const cached = accountProfileCache.get(key);
  if (cached !== void 0 && cached.expiresAt > Date.now()) {
    return cached.gcpManaged;
  }
  let gcpManaged = false;
  try {
    const r = await postJson(fetchImpl, ENDPOINTS[0], "/v1internal:loadCodeAssist", access, {
      metadata: { ideType: "ANTIGRAVITY", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" }
    });
    if (r.ok && typeof r.json === "object" && r.json !== null) {
      gcpManaged = r.json.gcpManaged === true;
    }
  } catch {
  }
  accountProfileCache.set(key, { gcpManaged, expiresAt: Date.now() + ACCOUNT_PROFILE_TTL_MS });
  return gcpManaged;
}
async function egressDiagnostic(fetchImpl) {
  try {
    const r = await fetchImpl("https://ipinfo.io/json", { signal: AbortSignal.timeout(4e3) });
    if (!r.ok) return void 0;
    const j = await r.json();
    if (typeof j !== "object" || j === null || typeof j.ip !== "string") return void 0;
    return {
      ip: j.ip,
      country: typeof j.country === "string" ? j.country : void 0,
      city: typeof j.city === "string" ? j.city : void 0,
      org: typeof j.org === "string" ? j.org : void 0
    };
  } catch {
    return void 0;
  }
}
async function fetchQuota(fetchImpl, creds) {
  for (const endpoint of ENDPOINTS) {
    const r = await postJson(fetchImpl, endpoint, "/v1internal:retrieveUserQuotaSummary", creds.access, {});
    if (r.ok && r.json) return r.json;
  }
  return void 0;
}
var projectCache, accountProfileCache;
var init_cca_client = __esm({
  "src/host/cca-client.ts"() {
    init_constants();
    init_store();
    projectCache = /* @__PURE__ */ new Map();
    accountProfileCache = /* @__PURE__ */ new Map();
  }
});

// src/host/index.ts
init_constants();
init_store();
import z from "@deepseek-ai/schemastery";
import { ProxyAgent, fetch as undiciFetch } from "undici";

// src/host/catalog.ts
init_constants();
init_cca_client();
init_store();
function maxOutputTokensFor(modelId) {
  if (modelId.startsWith("claude-")) return 64e3;
  if (modelId.startsWith("gpt-oss-")) return 32768;
  if (modelId.startsWith("gemini-3.1-pro") || modelId.startsWith("gemini-pro-")) return 65535;
  return 65536;
}
function modelDescriptor(id, name2, family, extra = {}) {
  const contextWindow = family === "gemini" ? 1048576 : family === "claude" ? 2e5 : 131072;
  const isTiered = id.endsWith("-tiered");
  return {
    id,
    name: name2,
    provider: PROVIDER,
    inputModalities: family === "gemini" ? ["text", "image"] : ["text"],
    thinking: true,
    contextWindow,
    maxTokens: extra.maxOutputTokens ?? maxOutputTokensFor(id),
    ...isTiered ? {
      reasoning: {
        efforts: [
          { id: "low", name: "Low" },
          { id: "medium", name: "Medium" },
          { id: "high", name: "High" }
        ],
        defaultEffort: "high"
      }
    } : {}
  };
}
var STATIC_CATALOG = [
  modelDescriptor("gemini-3.8-flash-tiered", "Gemini 3.8 Flash (Tiered)", "gemini"),
  modelDescriptor("gemini-3.7-flash-tiered", "Gemini 3.7 Flash (Tiered)", "gemini"),
  modelDescriptor("gemini-3.6-flash-high", "Gemini 3.6 Flash (High)", "gemini"),
  modelDescriptor("gemini-3.6-flash-medium", "Gemini 3.6 Flash (Medium)", "gemini"),
  modelDescriptor("gemini-3.6-flash-low", "Gemini 3.6 Flash (Low)", "gemini"),
  modelDescriptor("gemini-3.5-flash-high", "Gemini 3.5 Flash (High)", "gemini"),
  modelDescriptor("gemini-3.5-flash-low", "Gemini 3.5 Flash (Low)", "gemini"),
  modelDescriptor("gemini-3.5-flash-extra-low", "Gemini 3.5 Flash (Extra Low)", "gemini"),
  modelDescriptor("gemini-pro-agent", "Gemini 3.1 Pro (High)", "gemini"),
  modelDescriptor("gemini-3.1-pro-low", "Gemini 3.1 Pro (Low)", "gemini"),
  modelDescriptor("gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite", "gemini"),
  modelDescriptor("gemini-2.5-pro", "Gemini 2.5 Pro", "gemini"),
  modelDescriptor("gemini-2.5-flash", "Gemini 2.5 Flash", "gemini"),
  modelDescriptor("gemini-2.5-flash-lite", "Gemini 2.5 Flash Lite", "gemini"),
  modelDescriptor("gemini-2.5-flash-thinking", "Gemini 2.5 Flash (Thinking)", "gemini"),
  modelDescriptor("gemini-3-flash", "Gemini 3 Flash", "gemini"),
  modelDescriptor("claude-sonnet-4-6", "Claude Sonnet 4.6 (Thinking)", "claude"),
  modelDescriptor("claude-opus-4-6-thinking", "Claude Opus 4.6 (Thinking)", "claude"),
  modelDescriptor("gpt-oss-120b-medium", "GPT-OSS 120B (Medium)", "gpt")
];
function skipInternalModelId(id) {
  return /^(tab_|chat_)/i.test(id) || /(^|-)(image)$/i.test(id);
}
function catalogFromLive(models) {
  const live = new Map(Object.entries(models ?? {}).filter(([id]) => !skipInternalModelId(id)));
  return STATIC_CATALOG.flatMap((entry) => {
    const info = live.get(entry.id);
    if (info === void 0) return [];
    return [{
      ...entry,
      name: typeof info.displayName === "string" && info.displayName.length > 0 ? info.displayName : entry.name,
      maxTokens: Number(info.maxOutputTokens) || entry.maxTokens,
      inputModalities: info.supportsImages === true ? ["text", "image"] : ["text"]
    }];
  });
}
function effortToThinkingLevel(effort) {
  switch (effort) {
    case "xhigh":
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    case "low":
    case "minimal":
    case "off":
      return "LOW";
    default:
      return "MEDIUM";
  }
}
function runtimeModelId(publicId) {
  return RUNTIME_MODEL_ALIASES[publicId] ?? publicId;
}
async function fetchCatalog(fetchImpl, creds) {
  const accountId = publicAccountId(creds);
  for (const endpoint of ENDPOINTS) {
    const projectId = await projectForEndpoint(fetchImpl, endpoint, creds.access, creds.projectId, accountId);
    const r = await postJson(fetchImpl, endpoint, "/v1internal:fetchAvailableModels", creds.access, { project: projectId });
    if (r.ok && r.json && typeof r.json.models === "object" && r.json.models !== null) {
      return catalogFromLive(r.json.models);
    }
  }
  return STATIC_CATALOG;
}

// src/host/adapter.ts
init_constants();
init_cca_client();
import { LlmAdapter, LlmError as LlmError3 } from "@deepseek-ai/dsh-llm";
init_store();

// src/host/oauth.ts
init_constants();
init_store();
import { randomBytes, createHash as createHash3 } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
var loginSession = void 0;
function getLoginSession() {
  return loginSession;
}
function setLoginSession(session) {
  loginSession = session;
}
function isLoopbackAddress(address) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}
function openBrowser(url) {
  try {
    if (process.platform === "darwin") {
      spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    } else if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    } else {
      spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
    }
  } catch {
  }
}
async function exchangeTokens(fetchImpl, params) {
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`token \u4EA4\u6362\u5931\u8D25 HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}
async function refreshCredential(fetchImpl, creds) {
  const { clientId, clientSecret } = clientConfig();
  const tokens = await exchangeTokens(fetchImpl, {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: creds.refresh,
    grant_type: "refresh_token"
  });
  return {
    ...creds,
    access: tokens.access_token,
    refresh: typeof tokens.refresh_token === "string" ? tokens.refresh_token : creds.refresh,
    expires: Date.now() + tokens.expires_in * 1e3 - 3e5
  };
}
async function tryRefreshCredential(fetchImpl, creds) {
  try {
    const refreshed = await refreshCredential(fetchImpl, creds);
    return { ok: true, creds: refreshed };
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    const network = !/token(\s|%)?交换失败 HTTP (?:400|401|403)|invalid_grant|invalid_request/i.test(text);
    return { ok: false, network, error };
  }
}
async function startLoginFlow(fetchImpl, onAccountSuccess) {
  if (loginSession !== void 0) {
    return { authUrl: loginSession.authUrl };
  }
  const { clientId, clientSecret } = clientConfig();
  const verifier = Buffer.from(randomBytes(32)).toString("base64url");
  const challenge = Buffer.from(createHash3("sha256").update(verifier).digest()).toString("base64url");
  const state = Buffer.from(randomBytes(24)).toString("base64url");
  const port = Number(process.env.GEMINI_OAUTH_CALLBACK_PORT) || DEFAULT_CALLBACK_PORT;
  const redirectUri = `http://localhost:${port}${REDIRECT_PATH}`;
  let resolveCallback;
  let rejectCallback;
  const callbackDone = new Promise((resolve, reject) => {
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
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("OAuth \u56DE\u8C03\u6821\u9A8C\u5931\u8D25");
      rejectCallback(new Error("OAuth state \u6216 code \u6821\u9A8C\u5931\u8D25"));
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end("<html><body><h2>Gemini OAuth \u767B\u5F55\u5B8C\u6210</h2>\u53EF\u4EE5\u5173\u95ED\u6B64\u9875\u3002</body></html>");
    resolveCallback(code);
  });
  await new Promise((resolve, reject) => {
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
    prompt: "consent"
  }).toString();
  const authUrl = authUrlObject.toString();
  loginSession = { state, verifier, server, authUrl, status: "pending" };
  openBrowser(authUrl);
  void callbackDone.then(async (code) => {
    try {
      const tokens = await exchangeTokens(fetchImpl, {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: verifier
      });
      if (typeof tokens.refresh_token !== "string") throw new Error("OAuth \u672A\u8FD4\u56DE refresh token");
      let email;
      try {
        const ui = await fetchImpl("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { authorization: `Bearer ${tokens.access_token}` }
        });
        email = ui.ok ? (await ui.json()).email : void 0;
      } catch {
      }
      const { discoverProject: discoverProject2, stableProjectId: stableProjectId2 } = await Promise.resolve().then(() => (init_cca_client(), cca_client_exports));
      const projectId = await discoverProject2(fetchImpl, tokens.access_token) ?? stableProjectId2(email || "gemini-oauth-default");
      const store = await readCredentialStore();
      await writeCredentialStore(upsertAccount(store, {
        access: tokens.access_token,
        refresh: tokens.refresh_token,
        expires: Date.now() + tokens.expires_in * 1e3 - 3e5,
        projectId,
        email
      }));
      onAccountSuccess?.();
      if (loginSession) loginSession.status = "complete";
    } catch (error) {
      if (loginSession) {
        loginSession.status = "error";
        loginSession.error = error instanceof Error && error.message.length > 0 ? error.message : String(error);
      }
    }
  }).catch(() => {
  }).finally(() => {
    setTimeout(() => {
      loginSession?.server?.close();
      loginSession = void 0;
    }, 5e3);
  });
  return { authUrl };
}

// src/host/stream.ts
init_constants();
init_cca_client();
init_store();
import { randomUUID as randomUUID2 } from "node:crypto";
import { LlmError as LlmError2, attributionHeaders } from "@deepseek-ai/dsh-llm";

// src/host/wire.ts
init_constants();
import { randomUUID } from "node:crypto";
import { LlmError } from "@deepseek-ai/dsh-llm";
var ALLOWED_TOOL_SCHEMA_KEYS = /* @__PURE__ */ new Set([
  "type",
  "description",
  "properties",
  "required",
  "items",
  "enum"
]);
function normalizeToolSchema(node, defs) {
  if (node === null || node === void 0) return node;
  if (typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map((entry) => normalizeToolSchema(entry, defs));
  if (typeof node.$ref === "string" && defs) {
    const refName = node.$ref.replace(/^#\/\$defs\//, "").replace(/^#\/definitions\//, "");
    const target = defs[refName];
    if (target !== void 0) return normalizeToolSchema(target, defs);
  }
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (!ALLOWED_TOOL_SCHEMA_KEYS.has(key)) continue;
    if (key === "type") {
      out.type = Array.isArray(value) ? value.find((entry) => typeof entry === "string" && entry !== "null") ?? "string" : value;
    } else if (key === "properties") {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        out.properties = {};
        for (const [name2, schema] of Object.entries(value)) {
          out.properties[name2] = normalizeToolSchema(schema, defs);
        }
      }
    } else if (key === "items") {
      out.items = normalizeToolSchema(value, defs);
    } else if (key === "required") {
      out.required = Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : value;
    } else if (key === "enum") {
      out.enum = value;
    } else if (key === "description") {
      out.description = value;
    }
  }
  return out;
}
function serializeBlocks(blocks) {
  return blocks.map((block) => {
    if (block.type === "text") return block.text;
    if (block.type === "reasoning") return "";
    if (block.type === "image") return "[image]";
    return "";
  }).filter((text) => text.length > 0).join("\n");
}
var BASE64_SIGNATURE_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
function isValidThoughtSignature(signature) {
  return typeof signature === "string" && signature.length > 0 && signature.length % 4 === 0 && BASE64_SIGNATURE_PATTERN.test(signature);
}
function resolvedThoughtSignature(isSameProviderAndModel, signature) {
  return isSameProviderAndModel && isValidThoughtSignature(signature) ? signature : void 0;
}
function modelIdentity(message) {
  const source = message?.source ?? {};
  return {
    provider: source.provider ?? message?.provider ?? "",
    model: source.model ?? message?.model ?? ""
  };
}
function isGeminiFamily(modelId) {
  return !modelId.startsWith("claude-") && !modelId.startsWith("gpt-oss-");
}
async function buildContents(options, attachments, signal, model) {
  const contents = [];
  const toolNames = /* @__PURE__ */ new Map();
  const push = (role, parts) => {
    if (parts.length === 0) return;
    const last = contents[contents.length - 1];
    if (last && last.role === role && role === "user") {
      last.parts.push(...parts);
      return;
    }
    contents.push({ role, parts });
  };
  for (const message of options.messages ?? []) {
    if (message.role === "assistant") {
      const parts2 = [];
      const identity = modelIdentity(message);
      const isSameProviderAndModel = identity.provider === PROVIDER && identity.model === model.id;
      for (const block of message.content ?? []) {
        if (block.type === "text") {
          if (!block.text || block.text.trim() === "") continue;
          const signature = resolvedThoughtSignature(isSameProviderAndModel, block.textSignature);
          parts2.push({ text: block.text, ...signature ? { thoughtSignature: signature } : {} });
        } else if (block.type === "reasoning") {
          if (!block.text || block.text.trim() === "") continue;
          if (isSameProviderAndModel) {
            const signature = resolvedThoughtSignature(isSameProviderAndModel, block.thinkingSignature);
            parts2.push({ thought: true, text: block.text, ...signature ? { thoughtSignature: signature } : {} });
          } else {
            parts2.push({ text: block.text });
          }
        } else if (block.type === "tool-call") {
          toolNames.set(block.id, block.name);
          let args = {};
          try {
            args = JSON.parse(block.arguments);
          } catch {
          }
          const signature = resolvedThoughtSignature(isSameProviderAndModel, block.thoughtSignature);
          const functionCall = { name: block.name, args };
          if (model.id.startsWith("claude-") || model.id.startsWith("gpt-oss-")) {
            functionCall.id = block.id;
          }
          parts2.push({ ...signature ? { thoughtSignature: signature } : {}, functionCall });
        }
      }
      push("model", parts2);
      continue;
    }
    if (message.role === "system") continue;
    const parts = [];
    const results = [];
    for (const block of message.content ?? []) {
      if (block.type === "text") {
        parts.push({ text: block.text });
      } else if (block.type === "tool-result") {
        results.push(block);
      } else if (block.type === "image") {
        if (!attachments || typeof attachments.readImage !== "function") {
          throw new LlmError("Gemini OAuth \u2014 \u56FE\u7247\u8F93\u5165\u9700\u8981 attachment \u670D\u52A1", "UNSUPPORTED_CONTENT");
        }
        const stored = await attachments.readImage(block.attachment, signal);
        const mimeType = stored?.ref?.mediaType ?? block.attachment?.mediaType ?? "image/png";
        const data = stored?.data ?? new Uint8Array();
        parts.push({ inlineData: { mimeType, data: Buffer.from(data).toString("base64") } });
      }
    }
    push("user", parts);
    for (const block of results) {
      const name2 = toolNames.get(block.toolCallId) ?? "tool";
      const text = serializeBlocks(block.content);
      const response = block.isError === true ? { error: text } : { result: text };
      const parts2 = [{ functionResponse: { name: name2, response } }];
      if (block.isError !== true && isGeminiFamily(model.id)) {
        for (const sub of block.content ?? []) {
          if (sub?.type !== "image") continue;
          if (!attachments || typeof attachments.readImage !== "function") break;
          const stored = await attachments.readImage(sub.attachment, signal);
          const mimeType = stored?.ref?.mediaType ?? sub.attachment?.mediaType ?? "image/jpeg";
          const data = stored?.data ?? new Uint8Array();
          parts2.push({ inlineData: { mimeType, data: Buffer.from(data).toString("base64") } });
        }
      }
      push("user", parts2);
    }
  }
  return contents;
}
function buildTools(options) {
  if (!options.tools || options.tools.length === 0) return void 0;
  return [{
    functionDeclarations: options.tools.map((tool) => {
      const params = tool.parameters;
      const defs = typeof params === "object" && params !== null && !Array.isArray(params) ? params.$defs ?? params.definitions : void 0;
      return {
        name: tool.name,
        description: tool.description,
        parameters: normalizeToolSchema(params, defs)
      };
    })
  }];
}
async function buildRequest(options, model, projectId, access, attachments, signal) {
  const request = {
    contents: await buildContents(options, attachments, signal, model)
  };
  if (typeof options.system === "string" && options.system.length > 0) {
    request.systemInstruction = { role: "user", parts: [{ text: options.system }] };
  }
  const generationConfig = {};
  const cap = maxOutputTokensFor(model.id);
  const modelMax = model.maxTokens ?? model.defaultMaxTokens ?? cap;
  const maxOutput = Math.min(options.maxTokens ?? modelMax, Number(modelMax) || cap, cap);
  generationConfig.maxOutputTokens = maxOutput;
  if (model.id.endsWith("-tiered")) {
    generationConfig.thinkingConfig = { thinkingLevel: effortToThinkingLevel(options.reasoningEffort) };
  }
  request.generationConfig = generationConfig;
  const tools = buildTools(options);
  if (tools) request.tools = tools;
  if (options.sessionId) request.sessionId = String(options.sessionId);
  return {
    project: projectId,
    model: runtimeModelId(model.id),
    request,
    requestType: "agent",
    userAgent: "antigravity",
    requestId: `agent-${randomUUID()}`
  };
}

// src/host/stream.ts
var CallId = (id) => id;
function isJsonRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function sanitizeToolCallId(raw, fallbackName) {
  const id = typeof raw === "string" && raw.length > 0 ? raw : `${fallbackName || "tool"}_${randomUUID2()}`;
  return id.length <= 256 ? id : id.slice(0, 256);
}
function sleepMs(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new LlmError2("Gemini OAuth \u8BF7\u6C42\u5DF2\u53D6\u6D88", "ABORTED"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new LlmError2("Gemini OAuth \u8BF7\u6C42\u5DF2\u53D6\u6D88", "ABORTED"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
function friendlyError(status, text) {
  const parsed = safeJson(text);
  if (isJsonRecord(parsed) && isJsonRecord(parsed.error) && typeof parsed.error.message === "string") {
    const details = parsed.error.details;
    if (Array.isArray(details) && details.length > 0) {
      const violators = details.flatMap((entry) => Array.isArray(entry?.fieldViolations) ? entry.fieldViolations.map((violation) => violation?.field ?? "").filter((field) => typeof field === "string") : []);
      if (violators.length > 0) {
        return `${parsed.error.message}
\u8FDD\u89C4\u5B57\u6BB5: ${[...new Set(violators)].slice(0, 5).join(", ")}`;
      }
    }
    return parsed.error.message;
  }
  return text.slice(0, 200);
}
function classifyError(message) {
  if (/\b(?:401|403)\b|invalid_grant|AUTH/i.test(message)) return "AUTH";
  if (/no capacity|capacity|503/i.test(message)) return "CAPACITY";
  if (/quota|RESOURCE_EXHAUSTED|exhausted/i.test(message)) return "QUOTA_EXCEEDED";
  if (/\b429\b|rate.?limit/i.test(message)) return "RATE_LIMIT";
  if (/\btimeout|timed out|aborted/i.test(message)) return "TIMEOUT";
  if (/fetch failed|econnreset|socket|transport|网络/i.test(message)) return "TRANSPORT";
  return "GEMINI_OAUTH_ERROR";
}
async function* consumeSse(response, _model) {
  if (response.body === null) throw new LlmError2("Gemini OAuth \u8FD4\u56DE\u4E86\u7A7A\u7684\u54CD\u5E94\u6D41", "TRANSPORT");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const blocks = [];
  let current = void 0;
  let hasContent = false;
  let hasToolCall = false;
  let rawFinishReason = void 0;
  let usage = void 0;
  const closeCurrent = (out) => {
    if (current === void 0) return;
    const index = blocks.length - 1;
    const block = current.type === "text" ? { type: "text", text: current.text, ...current.textSignature ? { textSignature: current.textSignature } : {} } : { type: "reasoning", text: current.text, ...current.thinkingSignature ? { thinkingSignature: current.thinkingSignature } : {} };
    out.push({ type: "block-end", index, block });
    current = void 0;
  };
  const consume = (chunk) => {
    const out = [];
    if (!isJsonRecord(chunk.response)) return out;
    const data = chunk.response;
    const candidate = Array.isArray(data.candidates) ? data.candidates[0] : void 0;
    for (const part of candidate?.content?.parts ?? []) {
      if (!isJsonRecord(part)) continue;
      if (typeof part.text === "string") {
        const reasoning = part.thought === true;
        const blockType = reasoning ? "reasoning" : "text";
        if (current === void 0 || current.type !== blockType) {
          closeCurrent(out);
          current = { type: blockType, text: "" };
          blocks.push(current);
          out.push({ type: "block-start", index: blocks.length - 1, blockType });
        }
        const index = blocks.length - 1;
        current.text += part.text;
        if (isValidThoughtSignature(part.thoughtSignature)) {
          if (reasoning) current.thinkingSignature = part.thoughtSignature;
          else current.textSignature = part.thoughtSignature;
        }
        hasContent = true;
        out.push({ type: reasoning ? "reasoning-delta" : "text-delta", index, text: part.text });
      }
      if (isJsonRecord(part.functionCall)) {
        closeCurrent(out);
        const toolName = typeof part.functionCall.name === "string" ? part.functionCall.name : "";
        const toolId = sanitizeToolCallId(part.functionCall.id, toolName);
        const args = isJsonRecord(part.functionCall.args) ? part.functionCall.args : {};
        const argsText = JSON.stringify(args);
        const index = blocks.length;
        const signature = isValidThoughtSignature(part.thoughtSignature) ? part.thoughtSignature : void 0;
        const block = {
          type: "tool-call",
          id: CallId(toolId),
          name: toolName,
          arguments: argsText,
          ...signature ? { thoughtSignature: signature } : {}
        };
        blocks.push(block);
        hasContent = true;
        hasToolCall = true;
        out.push({ type: "block-start", index, blockType: "tool-call" });
        out.push({ type: "tool-call-delta", index, id: CallId(toolId), name: toolName, argumentsDelta: argsText });
        out.push({ type: "block-end", index, block });
      }
    }
    if (typeof candidate?.finishReason === "string") rawFinishReason = candidate.finishReason;
    if (isJsonRecord(data.usageMetadata)) usage = data.usageMetadata;
    return out;
  };
  while (true) {
    let readResult;
    try {
      readResult = await reader.read();
    } catch (err) {
      const rawMsg = err?.message || String(err);
      const causeMsg = err?.cause?.message ? ` (${err.cause.message})` : "";
      throw new LlmError2(`Gemini OAuth \u6570\u636E\u6D41\u4E2D\u65AD\uFF08${rawMsg}${causeMsg}\uFF09\uFF0C\u8BF7\u68C0\u67E5\u4EE3\u7406\u8FDE\u63A5\u7A33\u5B9A\u6027\u3002`, "TRANSPORT");
    }
    const { done, value } = readResult;
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const jsonText = line.slice(5).trim();
      if (jsonText.length === 0 || jsonText === "[DONE]") continue;
      const chunk = safeJson(jsonText);
      if (chunk === void 0) continue;
      if (isJsonRecord(chunk.error)) {
        const message = typeof chunk.error.message === "string" ? chunk.error.message : JSON.stringify(chunk.error);
        throw new LlmError2(`Gemini OAuth \u670D\u52A1\u7AEF\u9519\u8BEF\uFF1A${message}`, classifyError(message));
      }
      for (const emitted of consume(chunk)) yield emitted;
    }
  }
  if (buffer.trim().length > 0 && buffer.startsWith("data:")) {
    for (const emitted of consume(safeJson(buffer.slice(5).trim()) ?? {})) yield emitted;
  }
  if (!hasContent) throw new LlmError2("Gemini OAuth \u8FD4\u56DE\u4E86\u7A7A\u54CD\u5E94", "EMPTY_RESPONSE");
  const finishOut = [];
  closeCurrent(finishOut);
  for (const emitted of finishOut) yield emitted;
  let reason;
  if (hasToolCall) reason = { kind: "tool-calls" };
  else if (rawFinishReason === "MAX_TOKENS") reason = { kind: "max-tokens" };
  else if (rawFinishReason === "STOP" || rawFinishReason === void 0) reason = { kind: "stop" };
  else reason = { kind: "error", failure: { message: `Gemini OAuth \u7ED3\u675F\u539F\u56E0\uFF1A${rawFinishReason}`, code: "GEMINI_OAUTH_FINISH_REASON" } };
  if (usage !== void 0) {
    const cacheRead = Number(usage.cachedContentTokenCount) || 0;
    yield {
      type: "usage",
      usage: {
        inputTokens: Math.max(0, (Number(usage.promptTokenCount) || 0) - cacheRead),
        outputTokens: (Number(usage.candidatesTokenCount) || 0) + (Number(usage.thoughtsTokenCount) || 0),
        reasoningTokens: Number(usage.thoughtsTokenCount) || 0,
        ...cacheRead > 0 ? { cacheReadTokens: cacheRead } : {}
      }
    };
  }
  yield { type: "finish", reason };
}
async function* streamChunks(fetchImpl, options, model, creds, attachments) {
  const accountId = publicAccountId(creds);
  const gcpManaged = await resolveAccountProfile(fetchImpl, creds.access, accountId);
  const endpoints = gcpManaged ? ENDPOINTS : [ENDPOINTS[0]];
  let lastStatus;
  let lastErrorText = "";
  const endpointErrors = [];
  for (const endpoint of endpoints) {
    if (options.signal?.aborted) throw new LlmError2("Gemini OAuth \u8BF7\u6C42\u5DF2\u53D6\u6D88", "ABORTED");
    const projectId = await projectForEndpoint(fetchImpl, endpoint, creds.access, creds.projectId, accountId);
    const body = JSON.stringify(await buildRequest(options, model, projectId, creds.access, attachments, options.signal));
    const attribution = attributionHeaders();
    const { "user-agent": attributionUa, ...attributionRest } = attribution;
    const mergedUa = attributionUa ? `antigravity/1.15.8 darwin/arm64 (${attributionUa})` : "antigravity/1.15.8 darwin/arm64";
    const sendOnce = async () => {
      const response2 = await fetchImpl(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: {
          ...ccaHeaders(creds.access),
          ...attributionRest,
          "user-agent": mergedUa,
          accept: "text/event-stream",
          ...model.id.startsWith("claude-") ? { "anthropic-beta": "interleaved-thinking-2025-05-14" } : {}
        },
        body,
        ...options.signal === void 0 ? {} : { signal: options.signal }
      });
      const text2 = response2.ok ? "" : await response2.text().catch(() => "");
      return { ok: response2.ok, status: response2.status, text: text2, response: response2 };
    };
    const sendWithNetworkRetry = async () => {
      let netRetries = 0;
      const maxNetRetries = 1;
      while (true) {
        if (options.signal?.aborted) throw new LlmError2("Gemini OAuth \u8BF7\u6C42\u5DF2\u53D6\u6D88", "ABORTED");
        try {
          return await sendOnce();
        } catch (err) {
          if (options.signal?.aborted || err?.name === "AbortError" || err?.code === "ABORTED") {
            throw new LlmError2("Gemini OAuth \u8BF7\u6C42\u5DF2\u53D6\u6D88", "ABORTED");
          }
          if (netRetries < maxNetRetries) {
            netRetries++;
            await sleepMs(500, options.signal);
            continue;
          }
          const rawMsg = err?.message || String(err);
          const causeMsg = err?.cause?.message ? ` (${err.cause.message})` : "";
          throw new LlmError2(
            `Gemini OAuth \u7F51\u7EDC\u8FDE\u63A5\u65AD\u5F00\uFF08${rawMsg}${causeMsg}\uFF09\u3002\u5DF2\u81EA\u52A8\u5FEB\u901F\u91CD\u8BD5 1 \u6B21\u4ECD\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u672C\u5730\u4EE3\u7406\uFF08ClashVerge\uFF09\u8FDE\u63A5\u6216\u8282\u70B9\u72B6\u6001\u3002`,
            "TRANSPORT"
          );
        }
      }
    };
    let { ok, status, text, response } = await sendWithNetworkRetry();
    if (!ok && (status === 429 || status === 400 && LOCATION_RETRY_PATTERN.test(text))) {
      for (const delay of TRANSIENT_BACKOFF_MS.slice(1)) {
        await sleepMs(delay, options.signal);
        ({ ok, status, text, response } = await sendWithNetworkRetry());
        if (ok) break;
        if (!(status === 429 || status === 400 && LOCATION_RETRY_PATTERN.test(text))) break;
      }
    }
    lastStatus = status;
    if (ok) {
      yield* consumeSse(response, model);
      return;
    }
    lastErrorText = text;
    endpointErrors.push(`${endpoint.replace("https://", "")} -> HTTP ${status}: ${friendlyError(status, lastErrorText)}`);
    if (![400, 403, 404, 429, 500, 502, 503, 504].includes(status)) break;
  }
  const combined = endpointErrors.join("\uFF1B");
  const code = classifyError(combined);
  const locationIssue = LOCATION_RETRY_PATTERN.test(combined);
  const quotaIssue = /\b429\b|quota|exhausted/i.test(combined);
  const gatedIssue = !gcpManaged && /cloudcode-pa\.googleapis\.com.*429/i.test(combined);
  const diag = (locationIssue || quotaIssue) && !gatedIssue ? await egressDiagnostic(fetchImpl) : void 0;
  throw new LlmError2(
    `Gemini OAuth \u8BF7\u6C42\u5931\u8D25\uFF1A${combined || `HTTP ${lastStatus ?? "?"}`}${gatedIssue ? `
${GATED_ENDPOINT_HINT}` : ""}${locationIssue ? `
${LOCATION_HINT}` : ""}${diag ? `
[\u51FA\u53E3\u8BCA\u65AD] \u5F53\u524D\u4EE3\u7406\u51FA\u53E3 ${diag.ip}${diag.country ? `\uFF08${diag.country}${diag.city ? ` ${diag.city}` : ""}` : ""}${diag.org ? ` / ${diag.org}` : ""}${diag.country ? "\uFF09" : ""}` : ""}`,
    code
  );
}

// src/host/adapter.ts
function toResolvedModel(entry) {
  return {
    provider: PROVIDER,
    id: entry.id,
    name: entry.name,
    inputModalities: entry.inputModalities ?? ["text"],
    context: { contextWindow: entry.contextWindow ?? 1048576 },
    defaultMaxTokens: entry.maxTokens ?? 65536,
    maxTokens: entry.maxTokens ?? 65536,
    ...entry.reasoning ? { reasoning: entry.reasoning } : {}
  };
}
var GemOAuthRuntime = class {
  fetch;
  attachments;
  resolveAttachments;
  catalogCache;
  constructor(attachments) {
    this.fetch = globalThis.fetch;
    this.attachments = attachments;
    this.catalogCache = void 0;
  }
  setFetch(fetchImpl) {
    this.fetch = fetchImpl;
  }
  async ensureAccess(signal, accountId) {
    let store = await readCredentialStore();
    let account;
    if (accountId === void 0) {
      account = activeAccountFrom(store);
    } else {
      const index = findAccountIndex(store, accountId);
      account = index >= 0 ? store.accounts[index] : void 0;
    }
    if (account === void 0) {
      throw new LlmError3("Gemini OAuth \u672A\u767B\u5F55 \u2014\u2014 \u8BF7\u5230\u300C\u8BBE\u7F6E \u2192 Gemini OAuth\u300D\u5B8C\u6210 Google \u767B\u5F55", "AUTH");
    }
    if (account.expires < Date.now() + 3e5) {
      const refreshed = await tryRefreshCredential(this.fetch, account);
      if (refreshed.ok === true) {
        account = refreshed.creds;
        store = upsertAccount(store, account, false);
        await writeCredentialStore(store).catch(() => {
        });
      } else if (refreshed.ok === false && refreshed.network === false) {
        const targetId = publicAccountId(account) ?? accountId;
        if (targetId !== void 0) {
          const next = removeAccount(store, targetId);
          if (next.accounts.length === 0) await deleteCredentialStore().catch(() => {
          });
          else await writeCredentialStore(next).catch(() => {
          });
        }
        throw new LlmError3("Gemini OAuth \u767B\u5F55\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u8BE5\u8D26\u53F7", "AUTH");
      }
    }
    if (typeof account.projectId !== "string" || account.projectId.length === 0) {
      const projectId = await discoverProject(this.fetch, account.access) ?? stableProjectId(account.email || publicAccountId(account) || "gemini-oauth-default");
      account = { ...account, projectId };
      store = upsertAccount(store, account, false);
      await writeCredentialStore(store).catch(() => {
      });
    }
    if (signal?.aborted) throw new LlmError3("Gemini OAuth \u8BF7\u6C42\u5DF2\u53D6\u6D88", "ABORTED");
    return account;
  }
  resetCatalogCache() {
    this.catalogCache = void 0;
  }
  async catalog(signal) {
    if (this.catalogCache !== void 0 && this.catalogCache.expiresAt > Date.now()) {
      return this.catalogCache.list;
    }
    let list = STATIC_CATALOG;
    try {
      const creds = await this.ensureAccess(signal);
      list = await fetchCatalog(this.fetch, creds);
    } catch {
    }
    this.catalogCache = { list, expiresAt: Date.now() + MODEL_CACHE_TTL_MS };
    return list;
  }
  async enabledModels() {
    return readModelConfig();
  }
  async setEnabledModels(enabledModelIds) {
    await writeModelConfig(enabledModelIds);
    return readModelConfig();
  }
};
var GemOAuthAdapter = class extends LlmAdapter {
  runtime;
  constructor(runtime) {
    super();
    this.runtime = runtime;
  }
  providerInfo(provider) {
    return { id: provider, name: PROVIDER_NAME };
  }
  async listModels(_provider) {
    const catalog = await this.runtime.catalog();
    const enabled = await this.runtime.enabledModels();
    const visible = enabled === void 0 ? catalog : catalog.filter((entry) => enabled.has(entry.id));
    return visible.map((entry) => toResolvedModel(entry));
  }
  async resolveModel(_provider, modelId, signal) {
    const catalog = await this.runtime.catalog(signal);
    const found = catalog.find((entry) => entry.id === modelId);
    return toResolvedModel(found ?? {
      id: modelId,
      name: modelId,
      provider: PROVIDER,
      inputModalities: modelId.startsWith("gemini-") ? ["text", "image"] : ["text"],
      thinking: true,
      contextWindow: 1048576,
      maxTokens: maxOutputTokensFor(modelId)
    });
  }
  async *stream(options) {
    const creds = await this.runtime.ensureAccess(options.signal);
    const model = await this.resolveModel(options.provider, options.model, options.signal);
    const attachments = this.runtime.attachments ?? (typeof this.runtime.resolveAttachments === "function" ? this.runtime.resolveAttachments() : void 0);
    yield* streamChunks(this.runtime.fetch, options, model, creds, attachments);
  }
};

// src/host/routes.ts
init_constants();
init_cca_client();
init_store();
function sendJson(res, statusCode, value) {
  const body = JSON.stringify(value);
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(body);
}
var readBody = async (req, signal) => {
  const chunks = [];
  for await (const chunk of req) {
    if (signal?.aborted) return "";
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
};
var apiHandler = (methodOrMap, run) => async (req, res) => {
  if (!isLoopbackAddress(req.socket?.remoteAddress)) {
    sendJson(res, 403, { ok: false, error: "\u4EC5\u652F\u6301\u672C\u673A\u8BBF\u95EE" });
    return;
  }
  const methods = typeof methodOrMap === "string" ? { [methodOrMap]: run } : methodOrMap;
  const handler = methods[req.method ?? ""];
  if (handler === void 0) {
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
      const message = result.error instanceof Error ? result.error.message : typeof result.error === "string" && result.error.length > 0 ? result.error : "\u8BF7\u6C42\u5931\u8D25";
      sendJson(res, 200, { ok: false, error: message });
      return;
    }
    sendJson(res, 200, { ok: true, value: result.value });
  } catch (error) {
    if (ac.signal.aborted) return;
    sendJson(res, 200, {
      ok: false,
      error: error instanceof Error && error.message.length > 0 ? error.message : "\u5185\u90E8\u9519\u8BEF"
    });
  } finally {
    res.off("close", onClose);
  }
};
function accountView(account, active) {
  return {
    id: publicAccountId(account) ?? "",
    ...typeof account.email === "string" ? { email: account.email } : {},
    expires: account.expires,
    active: active === true
  };
}
function statusView(store) {
  const active = activeAccountFrom(store);
  if (active === void 0) return { authenticated: false, accounts: [] };
  const activeId = publicAccountId(active);
  return {
    authenticated: true,
    ...typeof active.email === "string" ? { email: active.email } : {},
    ...typeof active.tierName === "string" ? { tierName: active.tierName } : {},
    ...activeId !== void 0 ? { activeAccountId: activeId } : {},
    accounts: store.accounts.map((account) => accountView(account, publicAccountId(account) === activeId))
  };
}
function redactSecrets(message, ...accounts) {
  let out = message;
  for (const account of accounts) {
    for (const secret of [account?.access, account?.refresh]) {
      if (typeof secret === "string" && secret.length > 0) out = out.split(secret).join("[redacted]");
    }
  }
  return out;
}
function registerApiRoutes(ctx, runtime, ns) {
  const routeStatus = async (signal) => {
    const store = await readCredentialStore();
    const loginSession2 = getLoginSession();
    const login = loginSession2 === void 0 ? void 0 : { status: loginSession2.status, ...loginSession2.error ? { error: loginSession2.error } : {} };
    const value = statusView(store);
    if (login !== void 0) value.login = login;
    const active = activeAccountFrom(store);
    if (active !== void 0 && typeof active.email !== "string") {
      try {
        const r = await runtime.fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { authorization: `Bearer ${active.access}` },
          signal
        });
        if (r.ok) {
          const email = (await r.json()).email;
          if (typeof email === "string") {
            const next = upsertAccount(store, { ...active, email }, false);
            await writeCredentialStore(next).catch(() => {
            });
            value.email = email;
          }
        }
      } catch {
      }
    }
    return { ok: true, value };
  };
  const routeLogin = async () => {
    const res = await startLoginFlow(runtime.fetch, () => runtime.resetCatalogCache());
    return { ok: true, value: res };
  };
  const routeRemoveAccount = async (req, signal) => {
    let accountId;
    try {
      const raw = await readBody(req, signal);
      const payload = raw.trim().length > 0 ? JSON.parse(raw) : void 0;
      accountId = payload && typeof payload.accountId === "string" ? payload.accountId : void 0;
    } catch {
      return { ok: false, error: "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON" };
    }
    const store = await readCredentialStore();
    let targetId = accountId;
    if (targetId === void 0) {
      const active = activeAccountFrom(store);
      targetId = active === void 0 ? void 0 : publicAccountId(active);
    }
    if (targetId === void 0) {
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
  const routeSwitchAccount = async (req, signal) => {
    const raw = await readBody(req, signal);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return { ok: false, error: "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON" };
    }
    const accountId = payload?.accountId;
    if (typeof accountId !== "string" || accountId.length === 0) {
      return { ok: false, error: "accountId \u5FC5\u586B" };
    }
    const store = await readCredentialStore();
    const switched = switchActiveAccount(store, accountId);
    if (switched === void 0) return { ok: false, error: "\u8BE5\u8D26\u53F7\u4E0D\u5B58\u5728\u4E8E\u672C\u673A" };
    await writeCredentialStore(switched);
    runtime.resetCatalogCache();
    const status = statusView(switched);
    const active = activeAccountFrom(switched);
    if (active !== void 0 && typeof active.email !== "string") {
      try {
        const r = await runtime.fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { authorization: `Bearer ${active.access}` },
          signal
        });
        if (r.ok) {
          const email = (await r.json()).email;
          if (typeof email === "string") {
            const next = upsertAccount(switched, { ...active, email }, false);
            await writeCredentialStore(next).catch(() => {
            });
            status.email = email;
          }
        }
      } catch {
      }
    }
    return { ok: true, value: status };
  };
  const routeQuota = async (req, signal) => {
    let accountId;
    try {
      const raw = await readBody(req, signal);
      const payload = raw.trim().length > 0 ? JSON.parse(raw) : void 0;
      accountId = payload && typeof payload.accountId === "string" ? payload.accountId : void 0;
    } catch {
      return { ok: false, error: "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON" };
    }
    const creds = await runtime.ensureAccess(signal, accountId);
    const quota = await fetchQuota(runtime.fetch, creds);
    return {
      ok: true,
      value: {
        quota: quota ?? null,
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        accountId: publicAccountId(creds)
      }
    };
  };
  const routeQuotaAll = async (signal) => {
    let store = await readCredentialStore();
    if (store.accounts.length === 0) return { ok: true, value: { accounts: [], fetchedAt: (/* @__PURE__ */ new Date()).toISOString() } };
    const activeId = (() => {
      const active = activeAccountFrom(store);
      return active === void 0 ? void 0 : publicAccountId(active);
    })();
    const results = [];
    for (const account of store.accounts) {
      const id = publicAccountId(account) ?? "";
      const base = {
        accountId: id,
        ...typeof account.email === "string" ? { email: account.email } : {},
        active: id === activeId
      };
      let current = account;
      if (current.expires < Date.now() + 3e5) {
        const refreshed = await tryRefreshCredential(runtime.fetch, current);
        if (refreshed.ok) {
          current = refreshed.creds;
          store = upsertAccount(store, current, false);
          await writeCredentialStore(store).catch(() => {
          });
        }
      }
      try {
        const quota = await fetchQuota(runtime.fetch, current);
        results.push({ ...base, status: "ok", quota: quota ?? null });
      } catch (error) {
        const message = error instanceof Error && error.message.length > 0 ? error.message : "\u989D\u5EA6\u8BFB\u53D6\u5931\u8D25";
        results.push({ ...base, status: "error", message: redactSecrets(message, account, current) });
      }
      if (signal?.aborted) break;
    }
    return { ok: true, value: { accounts: results, fetchedAt: (/* @__PURE__ */ new Date()).toISOString() } };
  };
  const modelsView = async (signal, enabledOverride) => {
    const catalog = await runtime.catalog(signal);
    const enabled = enabledOverride ?? await runtime.enabledModels();
    return {
      options: catalog.map((entry) => ({
        id: entry.id,
        name: entry.name,
        inputModalities: entry.inputModalities ?? ["text"],
        ...entry.reasoning ? { reasoning: entry.reasoning } : {},
        enabled: enabled === void 0 ? true : enabled.has(entry.id)
      })),
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  };
  const routeModels = async (signal) => {
    return { ok: true, value: await modelsView(signal) };
  };
  const routeModelsSave = async (req, signal) => {
    const raw = await readBody(req, signal);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return { ok: false, error: "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON" };
    }
    if (!Array.isArray(payload?.enabledModelIds) || payload.enabledModelIds.some((id) => typeof id !== "string")) {
      return { ok: false, error: "enabledModelIds \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4" };
    }
    const enabled = await runtime.setEnabledModels(payload.enabledModelIds);
    return { ok: true, value: await modelsView(signal, enabled) };
  };
  const settingsView = (settings) => {
    const descriptor = settings.describe().find((entry) => entry.ns === ns);
    const value = descriptor?.value;
    return {
      proxy: typeof value?.proxy === "string" ? value.proxy : "",
      revision: descriptor?.revision ?? 0
    };
  };
  const routeSettings = async () => {
    const settings = ctx.get("settings");
    if (settings === void 0) return { ok: true, value: { proxy: "", revision: 0 } };
    return { ok: true, value: settingsView(settings) };
  };
  const routeSettingsSave = async (req, signal) => {
    const settings = ctx.get("settings");
    if (settings === void 0) return { ok: false, error: "\u8BBE\u7F6E\u670D\u52A1\u4E0D\u53EF\u7528" };
    const raw = await readBody(req, signal);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return { ok: false, error: "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON" };
    }
    const proxy = payload?.proxy;
    if (typeof proxy !== "string") return { ok: false, error: "proxy \u5FC5\u987B\u662F\u5B57\u7B26\u4E32" };
    const before = settingsView(settings);
    const ops = [];
    if (before.proxy !== proxy) ops.push({ op: "set", path: ["proxy"], value: proxy });
    const expectedRevision = typeof payload?.expectedRevision === "number" ? payload.expectedRevision : void 0;
    if (ops.length > 0) await settings.mutate(ns, ops, expectedRevision);
    return { ok: true, value: settingsView(settings) };
  };
  ctx.inject(["webServer"], (web) => {
    const webServer = web.get("webServer");
    web.effect(() => {
      const disposers = [
        webServer.register({ kind: "exact", path: `${API_PATH}/status`, handler: apiHandler("GET", (_req, signal) => routeStatus(signal)) }, "dsh-gemini-oauth/status"),
        webServer.register({ kind: "exact", path: `${API_PATH}/login`, handler: apiHandler("POST", () => routeLogin()) }, "dsh-gemini-oauth/login"),
        webServer.register({ kind: "exact", path: `${API_PATH}/logout`, handler: apiHandler("POST", (req, signal) => routeRemoveAccount(req, signal)) }, "dsh-gemini-oauth/logout"),
        webServer.register({ kind: "exact", path: `${API_PATH}/switch`, handler: apiHandler("POST", (req, signal) => routeSwitchAccount(req, signal)) }, "dsh-gemini-oauth/switch"),
        webServer.register({ kind: "exact", path: `${API_PATH}/remove`, handler: apiHandler("POST", (req, signal) => routeRemoveAccount(req, signal)) }, "dsh-gemini-oauth/remove"),
        webServer.register({
          kind: "exact",
          path: `${API_PATH}/quota`,
          handler: apiHandler({
            GET: (req, signal) => routeQuota(req, signal),
            POST: (req, signal) => routeQuota(req, signal)
          })
        }, "dsh-gemini-oauth/quota"),
        webServer.register({ kind: "exact", path: `${API_PATH}/quota-all`, handler: apiHandler("POST", (_req, signal) => routeQuotaAll(signal)) }, "dsh-gemini-oauth/quota-all"),
        webServer.register({
          kind: "exact",
          path: `${API_PATH}/models`,
          handler: apiHandler({
            GET: (_req, signal) => routeModels(signal),
            POST: (req, signal) => routeModelsSave(req, signal)
          })
        }, "dsh-gemini-oauth/models"),
        webServer.register({
          kind: "exact",
          path: `${API_PATH}/settings`,
          handler: apiHandler({
            GET: () => routeSettings(),
            POST: (req, signal) => routeSettingsSave(req, signal)
          })
        }, "dsh-gemini-oauth/settings")
      ];
      return () => {
        for (const dispose of disposers) {
          try {
            dispose?.();
          } catch {
          }
        }
      };
    });
  });
}

// src/host/index.ts
var settingsNamespace = (ns) => ns;
function installSectionCompat(ctx, ns, schema, entry, hooks) {
  ctx.inject(["settings"], (sctx) => {
    if (sctx.settings && typeof sctx.settings.installSection === "function") {
      sctx.settings.installSection(ctx, ns, schema, entry, hooks);
    } else if (sctx.settings && typeof sctx.settings.register === "function") {
      const scope = sctx.settings.register(ns, schema, {
        base: entry,
        ...hooks.validate ? { validate: hooks.validate } : {}
      });
      hooks.setSource(() => scope.get());
      hooks.onChange();
      scope.watch?.(() => hooks.onChange());
    }
  });
}
var name = "dsh-gemini-oauth";
var inject = ["llm"];
var Config = z.object({
  proxy: z.string().description("\u4EE3\u7406 host:port\uFF08\u7559\u7A7A\u7EE7\u627F HTTPS_PROXY / ALL_PROXY\uFF1B\u586B direct \u5F3A\u5236\u76F4\u8FDE\uFF09").default("")
});
function apply(ctx, config) {
  const NS = settingsNamespace(SETTINGS_NS_TEXT);
  let current = () => config;
  let lastRaw;
  let lastGood;
  const runtime = new GemOAuthRuntime();
  runtime.resolveAttachments = () => {
    try {
      return ctx.get("attachments");
    } catch {
      return void 0;
    }
  };
  const resolveOptions = () => {
    const raw = current();
    if (raw === lastRaw && lastGood !== void 0) return lastGood;
    lastGood = raw;
    lastRaw = raw;
    return lastGood;
  };
  const applyTransport = () => {
    const raw = resolveOptions().proxy?.trim?.() ?? "";
    const proxySetting = raw || process.env.HTTPS_PROXY || process.env.ALL_PROXY || "";
    if (!proxySetting || proxySetting === "direct") {
      runtime.setFetch((input, init) => globalThis.fetch(input, init));
      return;
    }
    try {
      const proxyUri = proxySetting.startsWith("http") || proxySetting.startsWith("socks") ? proxySetting : `http://${proxySetting}`;
      const dispatcher = new ProxyAgent({
        uri: proxyUri,
        keepAliveTimeout: 15e3,
        keepAliveMaxTimeout: 3e4
      });
      runtime.setFetch((input, init) => undiciFetch(input, { ...init, dispatcher }));
      ctx.logger.info("llm-gemini-oauth: proxy enabled", proxySetting);
    } catch (error) {
      ctx.logger.error("llm-gemini-oauth: invalid proxy setting, falling back to direct", error);
      runtime.setFetch((input, init) => globalThis.fetch(input, init));
    }
  };
  applyTransport();
  const adapter = new GemOAuthAdapter(runtime);
  ctx.llm.registerConfigurableProviders([{
    provider: PROVIDER,
    displayName: PROVIDER_NAME,
    settingsNs: NS,
    settingsPath: []
  }]);
  ctx.llm.registerAdapter([PROVIDER], adapter);
  registerApiRoutes(ctx, runtime, NS);
  installSectionCompat(ctx, NS, Config, config, {
    setSource: (source) => {
      current = source;
    },
    onChange: () => {
      applyTransport();
    }
  });
  ctx.effect(() => async () => {
    const session = getLoginSession();
    session?.server?.close();
    setLoginSession(void 0);
  });
}
export {
  Config,
  GemOAuthAdapter,
  PROVIDER,
  PROVIDER_NAME,
  RUNTIME_MODEL_ALIASES,
  accountKeyOf,
  activeAccountFrom,
  apply,
  decodeCredentialStore,
  deleteCredentialStore,
  emptyStore,
  findAccountIndex,
  inject,
  name,
  publicAccountId,
  readCredentialStore,
  readModelConfig,
  removeAccount,
  resetModelConfig,
  runtimeModelId,
  storeFromLegacy,
  switchActiveAccount,
  upsertAccount,
  writeCredentialStore,
  writeModelConfig
};
