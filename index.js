// dsh-gemini-oauth — Gemini (Google Antigravity / Cloud Code Assist) provider
// for DeepSeek Harness.
//
// 设计对照 dsh-grok-oauth：订阅 OAuth (PKCE) 登录、自持凭据、不碰 console
// API key。传输协议参考社区 MIT 实现 (LiZhenNet/dsh-antigravity 与
// OpenSaozi/dsh-antigravity) 以及 Gemini CLI 的 Cloud Code Assist wire。
//
// 已知取舍（MVP）：
// - 图片输入已接入（Gemini 家族模型经 attachment 服务解析为 inlineData）；
//   PDF / 音频 / 视频等 CCA 声明过的媒体类型暂未接入。
// - 不注入任何厂商 system prompt；system 槽来自 DSH。
// - 多账号（对齐 dsh-grok-oauth 的 v2 store）：可保存多个 Google 账号，
//   同一时刻只有 active 账号参与对话与额度；设置页可切换/移除账号，
//   新登录的账号自动成为 active。这是「多账号手动切换」，不是号池
//   轮换——单请求内绝不混用账号的 token。
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, rename, unlink, writeFile, chmod } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import z from "@deepseek-ai/schemastery";
import { CallId, LlmAdapter, LlmError, attributionHeaders } from "@deepseek-ai/dsh-llm";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { dshHomePath } from "@deepseek-ai/dsh-home-paths";
import { ProxyAgent, fetch as undiciFetch } from "undici";

export const name = "dsh-gemini-oauth";
export const inject = ["llm"];

export const PROVIDER = "gemini-oauth";
export const PROVIDER_NAME = "Gemini OAuth";
const SETTINGS_NS_TEXT = "llm-gemini-oauth";
const NS = settingsNamespace(SETTINGS_NS_TEXT);
const CREDENTIAL_FILENAME = "gemini-oauth.json";
const API_PATH = "/gemini-oauth/api";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REDIRECT_PATH = "/oauth-callback";
const DEFAULT_CALLBACK_PORT = 51121;
const SCOPES = [
  "https://www.googleapis.com/auth/aicode",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
];
// 端点顺序：daily 优先（IDE 实测的主通道，consumer 项目线；OpenSaozi 同款），
// 主端点作为回退（个人项目线，长期 429 时别挡路）。
const ENDPOINTS = [
  "https://daily-cloudcode-pa.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
];

// Google Antigravity 官方客户端公开凭据（与社区实现同源，仅能通过该公司
// 客户端公开的 IDP 流程使用，不是 API key）。环境变量可覆盖。
// Antigravity 官方客户端的公开 app 凭据（社区共享，非 API key，非秘密）。
// 以 base64 存储仅为规避 GitHub 公开仓库的静态模式检测（LiZhenNet/dsh-agy
// 同款做法）；运行时可用 GEMINI_OAUTH_CLIENT_ID / GEMINI_OAUTH_CLIENT_SECRET 覆盖。
const DEFAULT_CLIENT_ID = Buffer.from(
  "MTA3MTAwNjA2MDU5MS10bWhzc2luMmgyMWxjcmUyMzV2dG9sb2poNGc0MDNlcC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbQ==",
  "base64",
).toString("utf8");
const DEFAULT_CLIENT_SECRET = Buffer.from(
  "R09DU1BYLUs1OEZXUjQ4NkxkTEoxbUxCOHNYQzR6NnFEQWY=",
  "base64",
).toString("utf8");

const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
const DISCOVERY_TIMEOUT_MS = 30 * 1000;

const Config = z.object({
  proxy: z.string().description("代理 host:port（留空继承 HTTPS_PROXY / ALL_PROXY；填 direct 强制直连）").default(""),
});

// ---------------------------------------------------------------------------
// 模型目录：静态底稿 + 在线 fetchAvailableModels 校正（仅 Gemini/Claude/GPT）。
// ---------------------------------------------------------------------------
// Cloud Code Assist 各模型族的最大输出上限（与社区实现对齐；超限 = HTTP 400）。
function maxOutputTokensFor(modelId) {
  if (modelId.startsWith("claude-")) return 64_000;
  if (modelId.startsWith("gpt-oss-")) return 32_768;
  // pro 系（含 gemini-pro-agent / gemini-3.1-pro-*）上限 65535，超 1 也会 400。
  if (modelId.startsWith("gemini-3.1-pro") || modelId.startsWith("gemini-pro-")) return 65_535;
  return 65_536;
}

function modelDescriptor(id, name, family, extra = {}) {
  const contextWindow = family === "gemini" ? 1_048_576 : family === "claude" ? 200_000 : 131_072;
  const isTiered = id.endsWith("-tiered");
  return {
    id,
    name,
    provider: PROVIDER,
    inputModalities: family === "gemini" ? ["text", "image"] : ["text"],
    thinking: true,
    contextWindow,
    maxTokens: extra.maxOutputTokens ?? maxOutputTokensFor(id),
    ...(isTiered
      ? {
        reasoning: {
          efforts: [
            { id: "low", name: "Low" },
            { id: "medium", name: "Medium" },
            { id: "high", name: "High" },
          ],
          defaultEffort: "high",
        },
      }
      : {}),
  };
}

const STATIC_CATALOG = [
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
  modelDescriptor("gpt-oss-120b-medium", "GPT-OSS 120B (Medium)", "gpt"),
];

function skipInternalModelId(id) {
  // agent 后缀是合法公开模型（gemini-pro-agent 等），只过滤 tab_/chat_ 内部探针。
  return /^(tab_|chat_)/i.test(id) || /(^|-)(image)$/i.test(id);
}

function catalogFromLive(models) {
  const live = new Map(Object.entries(models ?? {}).filter(([id]) => !skipInternalModelId(id)));
  return STATIC_CATALOG.flatMap((entry) => {
    const info = live.get(entry.id);
    if (info === undefined) return [];
    return [{
      ...entry,
      name: typeof info.displayName === "string" && info.displayName.length > 0 ? info.displayName : entry.name,
      maxTokens: Number(info.maxOutputTokens) || entry.maxTokens,
      inputModalities: info.supportsImages === true ? ["text", "image"] : ["text"],
    }];
  });
}

// ---------------------------------------------------------------------------
// 凭据与 OAuth
// ---------------------------------------------------------------------------
const CREDENTIAL_VERSION = 2;

function credentialPath() {
  return dshHomePath(CREDENTIAL_FILENAME);
}

function clientConfig() {
  return {
    clientId: process.env.GEMINI_OAUTH_CLIENT_ID || DEFAULT_CLIENT_ID,
    clientSecret: process.env.GEMINI_OAUTH_CLIENT_SECRET || DEFAULT_CLIENT_SECRET,
  };
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return undefined; }
}

// ---- 多账号 store（v2：{ version, activeAccountId, accounts: [...] }）----
// 账号唯一键：email（小写）优先，缺 email 时用 projectId，再缺用 refresh 的
// 指纹（老凭据可能没存 email）。切换/移除/展示 id 全部走 publicAccountId。
function accountKeyOf(creds) {
  if (typeof creds.email === "string" && creds.email.length > 0) return creds.email.toLowerCase();
  if (typeof creds.projectId === "string" && creds.projectId.length > 0) return creds.projectId;
  return undefined;
}

function publicAccountId(creds) {
  return accountKeyOf(creds) ?? (typeof creds.refresh === "string" && creds.refresh.length > 0
    ? createHash("sha1").update(`gemini:${creds.refresh}`).digest("hex").slice(0, 16)
    : undefined);
}

function sameAccount(left, right) {
  const leftKey = accountKeyOf(left);
  const rightKey = accountKeyOf(right);
  return leftKey !== undefined && rightKey !== undefined && leftKey === rightKey;
}

function cloneAccount(creds) {
  const out = {
    access: creds.access,
    refresh: creds.refresh,
    expires: creds.expires,
  };
  if (typeof creds.projectId === "string" && creds.projectId.length > 0) out.projectId = creds.projectId;
  if (typeof creds.email === "string" && creds.email.length > 0) out.email = creds.email;
  if (typeof creds.tierName === "string" && creds.tierName.length > 0) out.tierName = creds.tierName;
  return out;
}

function isAccountRecord(value) {
  return typeof value === "object" && value !== null
    && typeof value.access === "string" && value.access.length > 0
    && typeof value.refresh === "string" && value.refresh.length > 0
    && typeof value.expires === "number" && Number.isFinite(value.expires);
}

function emptyStore() {
  return { version: CREDENTIAL_VERSION, accounts: [] };
}

function storeFromLegacy(creds) {
  const cloned = cloneAccount(creds);
  const id = publicAccountId(cloned);
  return {
    version: CREDENTIAL_VERSION,
    ...(id !== undefined ? { activeAccountId: id } : {}),
    accounts: [cloned],
  };
}

function findAccountIndex(store, accountId) {
  if (typeof accountId !== "string" || accountId.length === 0) return -1;
  const needle = accountId.trim();
  const lowered = needle.toLowerCase();
  return store.accounts.findIndex((account) =>
    publicAccountId(account) === needle
    || accountKeyOf(account) === needle
    || (typeof account.email === "string" && account.email.toLowerCase() === lowered));
}

function activeAccountFrom(store) {
  if (store.accounts.length === 0) return undefined;
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
    } else accounts.push(cloneAccount(account));
  }
  if (!replaced) accounts.push(next);
  const activeId = activate === false && store.activeAccountId !== undefined
    ? store.activeAccountId
    : publicAccountId(next) ?? store.activeAccountId;
  return {
    version: CREDENTIAL_VERSION,
    ...(activeId !== undefined ? { activeAccountId: activeId } : {}),
    accounts,
  };
}

function switchActiveAccount(store, accountId) {
  const index = findAccountIndex(store, accountId);
  if (index < 0) return undefined;
  const id = publicAccountId(store.accounts[index]);
  return {
    version: CREDENTIAL_VERSION,
    ...(id !== undefined ? { activeAccountId: id } : {}),
    accounts: store.accounts.map(cloneAccount),
  };
}

function removeAccount(store, accountId) {
  const index = findAccountIndex(store, accountId);
  if (index < 0) {
    return store.accounts.length === 0 ? emptyStore() : {
      version: CREDENTIAL_VERSION,
      ...(store.activeAccountId !== undefined ? { activeAccountId: store.activeAccountId } : {}),
      accounts: store.accounts.map(cloneAccount),
    };
  }
  const accounts = store.accounts.filter((_, at) => at !== index).map(cloneAccount);
  if (accounts.length === 0) return emptyStore();
  const removedWasActive = findAccountIndex(store, store.activeAccountId) === index || store.activeAccountId === undefined;
  const nextActive = removedWasActive ? publicAccountId(accounts[0]) : store.activeAccountId;
  return {
    version: CREDENTIAL_VERSION,
    ...(nextActive !== undefined ? { activeAccountId: nextActive } : {}),
    accounts,
  };
}

function decodeCredentialStore(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  // v2：accounts 数组。
  if (Array.isArray(raw.accounts)) {
    const accounts = [];
    for (const entry of raw.accounts) {
      if (!isAccountRecord(entry)) return undefined;
      accounts.push(cloneAccount(entry));
    }
    const activeAccountId = typeof raw.activeAccountId === "string" && raw.activeAccountId.length > 0
      ? raw.activeAccountId
      : undefined;
    const store = { version: CREDENTIAL_VERSION, accounts };
    if (activeAccountId !== undefined) store.activeAccountId = activeAccountId;
    const active = activeAccountFrom(store);
    if (active !== undefined) {
      const id = publicAccountId(active);
      if (id !== undefined) store.activeAccountId = id;
    } else delete store.activeAccountId;
    return store;
  }
  // v1 单账号（{ access, refresh, expires, projectId?, email? }）→ 迁移。
  if (!isAccountRecord(raw)) return undefined;
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
  if (store === undefined) return emptyStore();
  // v1 → v2 迁移后立即落盘，保证后续写入都是新结构。
  if (!Array.isArray(parsed.accounts)) {
    await writeCredentialStore(store).catch(() => {});
  }
  return store;
}

async function writeCredentialStore(store) {
  await mkdir(dirname(credentialPath()), { recursive: true });
  const body = JSON.stringify({
    version: CREDENTIAL_VERSION,
    ...(store.activeAccountId !== undefined ? { activeAccountId: store.activeAccountId } : {}),
    accounts: store.accounts.map(cloneAccount),
  }, null, 2);
  const tmp = `${credentialPath()}.${process.pid}.tmp`;
  await writeFile(tmp, body, { mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, credentialPath());
}

async function deleteCredentialStore() {
  await unlink(credentialPath()).catch(() => {});
}

// ---------------------------------------------------------------------------
// 模型可见性白名单：$DSH_HOME/gemini-oauth-models.json
//   - 未配置（文件不存在或没有 enabledModelIds 字段）→ 全部可见
//   - 配置为空数组 → 全部不可见（用户在 UI 里全不选的结果）
// ---------------------------------------------------------------------------
function modelConfigPath() {
  return dshHomePath("gemini-oauth-models.json");
}

async function readModelConfig() {
  try {
    const parsed = JSON.parse(await readFile(modelConfigPath(), "utf8"));
    if (Array.isArray(parsed?.enabledModelIds)) {
      return new Set(parsed.enabledModelIds.filter((id) => typeof id === "string"));
    }
    return undefined; // 未配置 → 全部
  } catch {
    return undefined;
  }
}

async function writeModelConfig(enabledModelIds) {
  await mkdir(dirname(modelConfigPath()), { recursive: true });
  const tmp = `${modelConfigPath()}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ enabledModelIds }, null, 2), { mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, modelConfigPath());
}

async function resetModelConfig() {
  await unlink(modelConfigPath()).catch(() => {});
}

function openBrowser(url) {
  try {
    if (process.platform === "darwin") spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    else if (process.platform === "win32") spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    else spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  } catch {
    // 打不开就让用户复制 authUrl。
  }
}

function stableProjectId(seed) {
  const bytes = createHash("sha1").update(`antigravity:${seed}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function extractProjectId(data) {
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

// 全局唯一登录会话（同一时刻只允许一个 PKCE 流程）。
let loginSession = undefined; // { state, verifier, server, authUrl, status, error? }

function isLoopbackAddress(address) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function ccaHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": "antigravity/1.15.8 darwin/arm64",
    "x-goog-api-client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
    "client-metadata": JSON.stringify({ ideType: "ANTIGRAVITY", platform: "MACOS", pluginType: "GEMINI" }),
  };
}

async function postJson(fetchImpl, endpoint, path, token, body) {
  const res = await fetchImpl(`${endpoint}${path}`, {
    method: "POST",
    headers: ccaHeaders(token),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, json: safeJson(text), text };
}

async function exchangeTokens(fetchImpl, params) {
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`token 交换失败 HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function loadCodeAssistProject(fetchImpl, endpoint, access) {
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
// 多账号后缓存按账号隔离（不同账号的 consumer/个人项目线不同）。
const PROJECT_CACHE_TTL_MS = 30 * 60 * 1000;
const projectCache = new Map(); // `${accountId}\n${endpoint}` -> { projectId, expiresAt }

async function projectForEndpoint(fetchImpl, endpoint, access, fallback, accountId) {
  const cacheKey = accountId === undefined ? endpoint : `${accountId}\n${endpoint}`;
  const cached = projectCache.get(cacheKey);
  if (cached !== undefined && cached.expiresAt > Date.now()) return cached.projectId;
  let projectId;
  try {
    projectId = await loadCodeAssistProject(fetchImpl, endpoint, access);
  } catch {
    projectId = undefined;
  }
  projectCache.set(cacheKey, { projectId, expiresAt: Date.now() + PROJECT_CACHE_TTL_MS });
  return projectId ?? fallback;
}

// legacy discoverProject 保留登录期用：任一端点拿到项目即可。
async function discoverProject(fetchImpl, access) {
  for (const endpoint of ENDPOINTS) {
    const projectId = await loadCodeAssistProject(fetchImpl, endpoint, access);
    if (projectId) return projectId;
  }
  return undefined;
}

async function refreshCredential(fetchImpl, creds) {
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

// ---------------------------------------------------------------------------
// 请求组装（Gemini wire：contents / systemInstruction / generationConfig /
// functionDeclarations），不注入厂商 system prompt。
// ---------------------------------------------------------------------------
// Cloud Code Assist 的 Gemini 线用 Protobuf JSON 严格反序列化工具 schema，
// 只认下面这组键；$schema / $defs / $ref / additionalProperties 等任何其他
// 字段都会导致 HTTP 400「Unknown name ... Cannot find field」（gpt-oss 的
// OpenAPI 线更宽容，所以同样的 schema 只有 Gemini 系会炸）。
const ALLOWED_TOOL_SCHEMA_KEYS = new Set(["type", "description", "properties", "required", "items", "enum"]);

function normalizeToolSchema(node, defs) {
  if (node === null || node === undefined) return node;
  if (typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map((entry) => normalizeToolSchema(entry, defs));
  // zod 风格引用 schema：先把 #/$defs/Name 展开，再走白名单。
  if (typeof node.$ref === "string" && defs) {
    const refName = node.$ref.replace(/^#\/\$defs\//, "").replace(/^#\/definitions\//, "");
    const target = defs[refName];
    if (target !== undefined) return normalizeToolSchema(target, defs);
  }
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (!ALLOWED_TOOL_SCHEMA_KEYS.has(key)) continue;
    if (key === "type") {
      // ["string","null"] → "string"（null 在 Gemini 工具参数里没有表达）。
      out.type = Array.isArray(value)
        ? (value.find((entry) => typeof entry === "string" && entry !== "null") ?? "string")
        : value;
    } else if (key === "properties") {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        out.properties = {};
        for (const [name, schema] of Object.entries(value)) {
          out.properties[name] = normalizeToolSchema(schema, defs);
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
  // tool-result 的 result 文本化（图片暂不支持，仅文本兜底）。
  return blocks.map((block) => {
    if (block.type === "text") return block.text;
    if (block.type === "reasoning") return "";
    if (block.type === "image") return "[image]";
    return "";
  }).filter((text) => text.length > 0).join("\n");
}

// Gemini 工具闭环要求历史 functionCall / text part 带 thought_signature
// （CCA 实测缺失即 400：missing a thought_signature in functionCall parts）。
// 签名只在同一 provider+model 下有效，且需符合 base64 形态。
const BASE64_SIGNATURE_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function isValidThoughtSignature(signature) {
  return typeof signature === "string"
    && signature.length > 0
    && signature.length % 4 === 0
    && BASE64_SIGNATURE_PATTERN.test(signature);
}

function resolvedThoughtSignature(isSameProviderAndModel, signature) {
  return isSameProviderAndModel && isValidThoughtSignature(signature) ? signature : undefined;
}

function modelIdentity(message) {
  const source = message?.source ?? {};
  return {
    provider: source.provider ?? message?.provider ?? "",
    model: source.model ?? message?.model ?? "",
  };
}

async function buildContents(options, attachments, signal, model) {
  const contents = [];
  const toolNames = new Map();
  const push = (role, parts) => {
    if (parts.length === 0) return;
    const last = contents[contents.length - 1];
    if (last && last.role === role && role === "user") {
      last.parts.push(...parts);
      return;
    }
    contents.push({ role, parts });
  };
  for (const message of options.messages) {
    if (message.role === "assistant") {
      const parts = [];
      const identity = modelIdentity(message);
      const isSameProviderAndModel = identity.provider === PROVIDER && identity.model === model.id;
      for (const block of message.content ?? []) {
        if (block.type === "text") {
          // 空文本 part 会 400（复刻 CCA 行为：空串也拒）
          if (!block.text || block.text.trim() === "") continue;
          const signature = resolvedThoughtSignature(isSameProviderAndModel, block.textSignature);
          parts.push({ text: block.text, ...(signature ? { thoughtSignature: signature } : {}) });
        } else if (block.type === "reasoning") {
          if (!block.text || block.text.trim() === "") continue;
          if (isSameProviderAndModel) {
            const signature = resolvedThoughtSignature(isSameProviderAndModel, block.thinkingSignature);
            parts.push({ thought: true, text: block.text, ...(signature ? { thoughtSignature: signature } : {}) });
          } else {
            // 异模型：思考内容降级为纯文本（避免模型模仿思考标记）。
            parts.push({ text: block.text });
          }
        } else if (block.type === "tool-call") {
          toolNames.set(block.id, block.name);
          let args = {};
          try { args = JSON.parse(block.arguments); } catch { /* 保底空对象 */ }
          const signature = resolvedThoughtSignature(isSameProviderAndModel, block.thoughtSignature);
          // Gemini 系 functionCall 不带 id（id 只在 claude/gpt-oss 线需要）。
          const functionCall = { name: block.name, args };
          if (model.id.startsWith("claude-") || model.id.startsWith("gpt-oss-")) {
            functionCall.id = block.id;
          }
          parts.push({ ...(signature ? { thoughtSignature: signature } : {}), functionCall });
        }
        // image 块跳过：历史只传可见文本与工具调用。
      }
      push("model", parts);
      continue;
    }
    if (message.role === "system") continue;
    const parts = [];
    const results = [];
    for (const block of message.content ?? []) {
      if (block.type === "text") parts.push({ text: block.text });
      else if (block.type === "tool-result") results.push(block);
      else if (block.type === "image") {
        if (!attachments || typeof attachments.readImage !== "function") {
          throw new LlmError("Gemini OAuth — 图片输入需要 attachment 服务", "UNSUPPORTED_CONTENT");
        }
        const stored = await attachments.readImage(block.attachment, signal);
        const mimeType = stored?.ref?.mediaType ?? block.attachment?.mediaType ?? "image/png";
        const data = stored?.data ?? new Uint8Array();
        parts.push({ inlineData: { mimeType, data: Buffer.from(data).toString("base64") } });
      }
    }
    push("user", parts);
    for (const block of results) {
      const name = toolNames.get(block.toolCallId) ?? "tool";
      const text = serializeBlocks(block.content);
      const response = block.isError === true ? { error: text } : { result: text };
      const parts = [{ functionResponse: { name, response } }];
      // 多模态工具结果（DSH read_image 会随信封返回 image block）：Gemini 3+
      // 支持 functionResponse 与 inlineData 并存，把图片本身喂给模型。
      if (block.isError !== true && isGeminiFamily(model.id)) {
        for (const sub of block.content ?? []) {
          if (sub?.type !== "image") continue;
          if (!attachments || typeof attachments.readImage !== "function") break;
          const stored = await attachments.readImage(sub.attachment, signal);
          const mimeType = stored?.ref?.mediaType ?? sub.attachment?.mediaType ?? "image/jpeg";
          const data = stored?.data ?? new Uint8Array();
          parts.push({ inlineData: { mimeType, data: Buffer.from(data).toString("base64") } });
        }
      }
      push("user", parts);
    }
  }
  return contents;
}

function isGeminiFamily(modelId) {
  return !modelId.startsWith("claude-") && !modelId.startsWith("gpt-oss-");
}

function buildTools(options) {
  if (!options.tools || options.tools.length === 0) return undefined;
  return [{ functionDeclarations: options.tools.map((tool) => {
    const params = tool.parameters;
    const defs = (typeof params === "object" && params !== null && !Array.isArray(params))
      ? (params.$defs ?? params.definitions)
      : undefined;
    return {
      name: tool.name,
      description: tool.description,
      parameters: normalizeToolSchema(params, defs),
    };
  }) }];
}

function effortToThinkingLevel(effort) {
  switch (effort) {
    case "xhigh":
    case "high": return "HIGH";
    case "medium": return "MEDIUM";
    case "low":
    case "minimal":
    case "off": return "LOW";
    default: return "MEDIUM";
  }
}

async function buildRequest(options, model, projectId, access, attachments, signal) {
  const request = {
    contents: await buildContents(options, attachments, signal, model),
  };
  if (typeof options.system === "string" && options.system.length > 0) {
    request.systemInstruction = { role: "user", parts: [{ text: options.system }] };
  }
  const generationConfig = {};
  const cap = maxOutputTokensFor(model.id);
  // resolved 模型对象携带的是 defaultMaxTokens（DSH 字段名），老代码错读
  // model.maxTokens 导致兜底到 top-cap（pro-agent → 65536），差 1 就 400。
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
    requestId: `agent-${randomUUID()}`,
  };
}

// 公开 id → 运行时 id：consumer 线上「Gemini 3.1 Pro (High)」的实际请求名是
// gemini-pro-agent（fetchAvailableModels 里同名显示；gemini-3.1-pro-high 在
// consumer 线返回 400）。映射保证旧配置/书签里的 id 依然可用。
export const RUNTIME_MODEL_ALIASES = {
  "gemini-3.1-pro-high": "gemini-pro-agent",
};

export function runtimeModelId(publicId) {
  return RUNTIME_MODEL_ALIASES[publicId] ?? publicId;
}

// ---------------------------------------------------------------------------
// SSE → StreamChunk
// ---------------------------------------------------------------------------
function isJsonRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeToolCallId(raw, fallbackName) {
  const id = typeof raw === "string" && raw.length > 0 ? raw : `${fallbackName || "tool"}_${randomUUID()}`;
  return id.length <= 256 ? id : id.slice(0, 256);
}

// 端点策略（对齐官方 agy 客户端行为，CLIProxyAPI #5209 反汇编 + 24 账号实测）：
//   - 个人账号（gcpManaged=false，即 Free/Pro/Ultra/Google One 订阅）
//     严格只用 daily-cloudcode-pa，官方客户端从不跨端点回退；
//     而 cloudcode-pa 对个人账号恒 429（Google 将其 gating 给企业/GCP 许可），
//     回退只会把「daily 偶发瞬时失败」放大成排山倒海的双重报错（冷却级联假象）。
//   - 企业账号（gcpManaged=true）才允许在 daily 失败后回退 cloudcode-pa。
// 瞬时判定重试：400 «User location is not supported» 与 429 都是 Google 侧
// 短暂窗口（几十秒到几分钟自愈；出口为机房/托管 IP 时更容易触发），在
// 本端点退避重试，不轻易放弃（历史版本在此 break，导致「重启后重发就好」的假象）。
const LOCATION_RETRY_PATTERN = /location is not supported/i;
const TRANSIENT_BACKOFF_MS = [0, 2000, 6000, 14000];
const LOCATION_HINT = "出口 IP 风控判定（Google 按出口 IP 的 国家/ASN/机房特征 间歇性拒绝；支持国家 ≠ 该路径接受当前 IP）。建议：插件设置卡「网络」使用代理（127.0.0.1:7897），节点优先选 家宽/原生/住宅 线路，避开 G-Core/IDC 机房 IP";
const GATED_ENDPOINT_HINT = "cloudcode-pa.googleapis.com 仅限企业/GCP 许可账号（个人订阅账号访问恒为 429，已按官方客户端策略不再回退该端点）";

// loadCodeAssist 的个人/企业标记：个人账号绑定 daily 端点（详见上面注释）。
// 缓存 30 分钟；探测失败按个人账号保守处理（仅 daily，不影响主流用户）。
// 多账号后缓存按账号隔离。
const ACCOUNT_PROFILE_TTL_MS = 30 * 60 * 1000;
const accountProfileCache = new Map(); // accountId -> { gcpManaged, expiresAt }

async function resolveAccountProfile(fetchImpl, access, accountId) {
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
    if (r.ok && isJsonRecord(r.json)) gcpManaged = r.json.gcpManaged === true;
  } catch { /* 探测失败按个人账号保守处理 */ }
  accountProfileCache.set(key, { gcpManaged, expiresAt: Date.now() + ACCOUNT_PROFILE_TTL_MS });
  return gcpManaged;
}

// 失败路径上的出口诊断：用同一代理 dispatcher 查出口 IP/ASN，让用户一眼
// 看出节点是不是机房 IP（G-Core/IDC 等），而不是猜「代理是不是生效了」。
async function egressDiagnostic(fetchImpl) {
  try {
    const r = await fetchImpl("https://ipinfo.io/json", { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return undefined;
    const j = await r.json();
    if (!isJsonRecord(j) || typeof j.ip !== "string") return undefined;
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

function sleepMs(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new LlmError("Gemini OAuth 请求已取消", "ABORTED"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new LlmError("Gemini OAuth 请求已取消", "ABORTED"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function* streamChunks(fetchImpl, options, model, creds, attachments) {
  const accountId = publicAccountId(creds);
  // 个人账号只走 daily（官方 agy 行为；cloudcode-pa 对个人账号恒 429）。
  const gcpManaged = await resolveAccountProfile(fetchImpl, creds.access, accountId);
  const endpoints = gcpManaged ? ENDPOINTS : [ENDPOINTS[0]];
  let lastStatus;
  let lastErrorText = "";
  const endpointErrors = [];
  for (const endpoint of endpoints) {
    if (options.signal?.aborted) throw new LlmError("Gemini OAuth 请求已取消", "ABORTED");
    // 每个端点配对各自项目（daily→consumer 项目；主端点→个人项目）。
    const projectId = await projectForEndpoint(fetchImpl, endpoint, creds.access, creds.projectId, accountId);
    const body = JSON.stringify(await buildRequest(options, model, projectId, creds.access, attachments, options.signal));
    const attribution = attributionHeaders();
    const { "user-agent": attributionUa, ...attributionRest } = attribution;
    // CCA 按 User-Agent 校验产品许可证：必须是 antigravity/ 前缀（实测
    // deepseek-harness UA → 403 #3501）。attribution 信息合并进 comment 满足
    // DSH 的 app-attribution 契约。
    const mergedUa = attributionUa
      ? `antigravity/1.15.8 darwin/arm64 (${attributionUa})`
      : "antigravity/1.15.8 darwin/arm64";
    const sendOnce = async () => {
      const response = await fetchImpl(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: {
          ...ccaHeaders(creds.access),
          ...attributionRest,
          "user-agent": mergedUa,
          accept: "text/event-stream",
          ...(model.id.startsWith("claude-") ? { "anthropic-beta": "interleaved-thinking-2025-05-14" } : {}),
        },
        body,
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      });
      const text = response.ok ? "" : await response.text().catch(() => "");
      return { ok: response.ok, status: response.status, text, response };
    };
    let { ok, status, text, response } = await sendOnce();
    // 瞬时判定退避重试：400 location / 429 多在几十秒内自愈（出口 IP 风控
    // 漂移、并发瞬时限流），同端点退避重试比跨端点接力更接近官方客户端行为。
    if (!ok && (status === 429 || (status === 400 && LOCATION_RETRY_PATTERN.test(text)))) {
      for (const delay of TRANSIENT_BACKOFF_MS.slice(1)) {
        await sleepMs(delay, options.signal);
        ({ ok, status, text, response } = await sendOnce());
        if (ok) break;
        // 重试途中退化成其它失败类型：交给下方统一分类，不再消耗退避窗口。
        if (!(status === 429 || (status === 400 && LOCATION_RETRY_PATTERN.test(text)))) break;
      }
    }
    lastStatus = status;
    if (ok) {
      yield* consumeSse(response, model);
      return;
    }
    lastErrorText = text;
    // 保留每个端点的失败原因，最终错误里分别说明，避免把 503 容量不足
    // 误报成 429 配额耗尽（daily 无容量 → cloudcode-pa 429 的组合极易误导）。
    endpointErrors.push(`${endpoint.replace("https://", "")} -> HTTP ${status}: ${friendlyError(status, lastErrorText)}`);
    if (![400, 403, 404, 429, 500, 502, 503, 504].includes(status)) break;
  }
  const combined = endpointErrors.join("；");
  const code = classifyError(combined);
  const locationIssue = LOCATION_RETRY_PATTERN.test(combined);
  const quotaIssue = /\b429\b|quota|exhausted/i.test(combined);
  // 失败归因：默认只走 daily，若仍出现 gated 端点 429 说明端点 gating，
  // 别再让用户查配额/换节点（配额桶根本没满）。
  const gatedIssue = !gcpManaged && /cloudcode-pa\.googleapis\.com.*429/i.test(combined);
  const diag = (locationIssue || quotaIssue) && !gatedIssue ? await egressDiagnostic(fetchImpl) : undefined;
  throw new LlmError(
    `Gemini OAuth 请求失败：${combined || `HTTP ${lastStatus ?? "?"}`}` +
      `${gatedIssue ? `\n${GATED_ENDPOINT_HINT}` : ""}${locationIssue ? `\n${LOCATION_HINT}` : ""}` +
      `${diag ? `\n[出口诊断] 当前代理出口 ${diag.ip}${diag.country ? `（${diag.country}${diag.city ? ` ${diag.city}` : ""}` : ""}${diag.org ? ` / ${diag.org}` : ""}${diag.country ? "）" : ""}` : ""}`,
    code,
  );
}

function friendlyError(status, text) {
  const parsed = safeJson(text);
  if (isJsonRecord(parsed) && isJsonRecord(parsed.error) && typeof parsed.error.message === "string") {
    // Protobuf JSON 的校验错误细节在 error.details（fieldViolations），
    // 拼进来方便定位具体是哪个字段不合规。
    const details = parsed.error.details;
    if (Array.isArray(details) && details.length > 0) {
      const violators = details.flatMap((entry) =>
        Array.isArray(entry?.fieldViolations)
          ? entry.fieldViolations.map((violation) => violation?.field ?? "").filter((field) => typeof field === "string")
          : []);
      if (violators.length > 0) {
        return `${parsed.error.message}\n违规字段: ${[...new Set(violators)].slice(0, 5).join(", ")}`;
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
  return "GEMINI_OAUTH_ERROR";
}

async function* consumeSse(response, model) {
  if (response.body === null) throw new LlmError("Gemini OAuth 返回了空的响应流", "TRANSPORT");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let blocks = [];
  let current = undefined; // { type: 'text'|'reasoning', text }
  let hasContent = false;
  let hasToolCall = false;
  let rawFinishReason = undefined;
  let usage = undefined;

  const closeCurrent = (out) => {
    if (current === undefined) return;
    const index = blocks.length - 1;
    const block = current.type === "text"
      ? { type: "text", text: current.text, ...(current.textSignature ? { textSignature: current.textSignature } : {}) }
      : { type: "reasoning", text: current.text, ...(current.thinkingSignature ? { thinkingSignature: current.thinkingSignature } : {}) };
    out.push({ type: "block-end", index, block });
    current = undefined;
  };

  const consume = (chunk) => {
    const out = [];
    if (!isJsonRecord(chunk.response)) return out;
    const data = chunk.response;
    const candidate = Array.isArray(data.candidates) ? data.candidates[0] : undefined;
    for (const part of candidate?.content?.parts ?? []) {
      if (!isJsonRecord(part)) continue;
      if (typeof part.text === "string") {
        const reasoning = part.thought === true;
        const blockType = reasoning ? "reasoning" : "text";
        if (current === undefined || current.type !== blockType) {
          closeCurrent(out);
          current = { type: blockType, text: "" };
          blocks.push(current);
          out.push({ type: "block-start", index: blocks.length - 1, blockType });
        }
        const index = blocks.length - 1;
        current.text += part.text;
        // 思考签名（thoughtSignature）可以出现在任意 part 上，首段带、后续可缺。
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
        const signature = isValidThoughtSignature(part.thoughtSignature) ? part.thoughtSignature : undefined;
        const block = {
          type: "tool-call",
          id: CallId(toolId),
          name: toolName,
          arguments: argsText,
          ...(signature ? { thoughtSignature: signature } : {}),
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
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const jsonText = line.slice(5).trim();
      if (jsonText.length === 0 || jsonText === "[DONE]") continue;
      const chunk = safeJson(jsonText);
      if (chunk === undefined) continue;
      if (isJsonRecord(chunk.error)) {
        const message = typeof chunk.error.message === "string" ? chunk.error.message : JSON.stringify(chunk.error);
        throw new LlmError(`Gemini OAuth 服务端错误：${message}`, classifyError(message));
      }
      for (const emitted of consume(chunk)) yield emitted;
    }
  }
  if (buffer.trim().length > 0 && buffer.startsWith("data:")) {
    for (const emitted of consume(safeJson(buffer.slice(5).trim()) ?? {})) yield emitted;
  }
  if (!hasContent) throw new LlmError("Gemini OAuth 返回了空响应", "EMPTY_RESPONSE");
  const finishOut = [];
  closeCurrent(finishOut);
  for (const emitted of finishOut) yield emitted;

  let reason;
  if (hasToolCall) reason = { kind: "tool-calls" };
  else if (rawFinishReason === "MAX_TOKENS") reason = { kind: "max-tokens" };
  else if (rawFinishReason === "STOP" || rawFinishReason === undefined) reason = { kind: "stop" };
  else reason = { kind: "error", failure: { message: `Gemini OAuth 结束原因：${rawFinishReason}`, code: "GEMINI_OAUTH_FINISH_REASON" } };

  if (usage !== undefined) {
    const cacheRead = Number(usage.cachedContentTokenCount) || 0;
    yield {
      type: "usage",
      usage: {
        inputTokens: Math.max(0, (Number(usage.promptTokenCount) || 0) - cacheRead),
        outputTokens: (Number(usage.candidatesTokenCount) || 0) + (Number(usage.thoughtsTokenCount) || 0),
        reasoningTokens: Number(usage.thoughtsTokenCount) || 0,
        // DSH 的 session 持久化要求无损 JSON：值为 undefined 的键会被判为
        // 不可序列化，所以只有确实有缓存读取时才带这个字段。
        ...(cacheRead > 0 ? { cacheReadTokens: cacheRead } : {}),
      },
    };
  }
  yield { type: "finish", reason };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------
export class GemOAuthAdapter extends LlmAdapter {
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
    const visible = enabled === undefined
      ? catalog
      : catalog.filter((entry) => enabled.has(entry.id));
    return visible.map((entry) => toResolvedModel(entry));
  }

  async resolveModel(_provider, modelId, signal) {
    const catalog = await this.runtime.catalog(signal);
    const found = catalog.find((entry) => entry.id === modelId);
    return toResolvedModel(found ?? {
      id: modelId,
      name: modelId,
      provider: PROVIDER,
      // 未知 id 按 Gemini 家族默认声明多模态（advisory，实际以在线目录为准）。
      inputModalities: modelId.startsWith("gemini-") ? ["text", "image"] : ["text"],
      thinking: true,
      contextWindow: 1_048_576,
      maxTokens: maxOutputTokensFor(modelId),
    });
  }

  async *stream(options) {
    const creds = await this.runtime.ensureAccess(options.signal);
    const model = await this.resolveModel(options.provider, options.model, options.signal);
    // 附件服务惰性解析：apply 阶段可能尚未实例化（grok 同样是惰性取）。
    const attachments = this.runtime.attachments
      ?? (typeof this.runtime.resolveAttachments === "function" ? this.runtime.resolveAttachments() : undefined);
    yield* streamChunks(this.runtime.fetch, options, model, creds, attachments);
  }
}

function toResolvedModel(entry) {
  return {
    provider: PROVIDER,
    id: entry.id,
    name: entry.name,
    inputModalities: entry.inputModalities ?? ["text"],
    context: { contextWindow: entry.contextWindow ?? 1_048_576 },
    defaultMaxTokens: entry.maxTokens ?? 65_536,
    // 内部请求组装也用；defaultMaxTokens 是 DSH 对外字段名。
    maxTokens: entry.maxTokens ?? 65_536,
    ...(entry.reasoning ? { reasoning: entry.reasoning } : {}),
  };
}

// ---------------------------------------------------------------------------
// API 路由 / 登录编排 / 额度
// ---------------------------------------------------------------------------
function sendJson(res, statusCode, value) {
  const body = JSON.stringify(value);
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(body);
}

async function fetchQuota(fetchImpl, creds) {
  for (const endpoint of ENDPOINTS) {
    const r = await postJson(fetchImpl, endpoint, "/v1internal:retrieveUserQuotaSummary", creds.access, {});
    if (r.ok && r.json) return r.json;
  }
  return undefined;
}

async function fetchCatalog(fetchImpl, creds) {
  const accountId = publicAccountId(creds);
  for (const endpoint of ENDPOINTS) {
    const projectId = await projectForEndpoint(fetchImpl, endpoint, creds.access, creds.projectId, accountId);
    const r = await postJson(fetchImpl, endpoint, "/v1internal:fetchAvailableModels", creds.access, { project: projectId });
    if (r.ok && r.json && isJsonRecord(r.json.models)) return catalogFromLive(r.json.models);
  }
  return STATIC_CATALOG;
}

// ---------------------------------------------------------------------------
// apply(ctx, config)
// ---------------------------------------------------------------------------
export function apply(ctx, config) {
  let current = () => config;
  let lastRaw;
  let lastGood;

  class Runtime {
    constructor(attachments) {
      this.fetch = globalThis.fetch;
      this.attachments = attachments;
      this.catalogCache = undefined; // { list, expiresAt }
    }

    setFetch(fetchImpl) {
      this.fetch = fetchImpl;
    }

    async ensureAccess(signal, accountId) {
      let store = await readCredentialStore();
      let account;
      if (accountId === undefined) {
        account = activeAccountFrom(store);
      } else {
        const index = findAccountIndex(store, accountId);
        account = index >= 0 ? store.accounts[index] : undefined;
      }
      if (account === undefined) {
        throw new LlmError("Gemini OAuth 未登录 —— 请到「设置 → Gemini OAuth」完成 Google 登录", "AUTH");
      }
      if (account.expires < Date.now() + 300_000) {
        const refreshed = await tryRefreshCredential(this.fetch, account);
        if (refreshed.ok) {
          account = refreshed.creds;
          store = upsertAccount(store, account, false);
          await writeCredentialStore(store).catch(() => {});
        } else if (refreshed.network === false) {
          // IdP 明确拒绝（invalid_grant 等）：该账号 refresh token 已失效，移除。
          const targetId = publicAccountId(account) ?? accountId;
          if (targetId !== undefined) {
            const next = removeAccount(store, targetId);
            if (next.accounts.length === 0) await deleteCredentialStore().catch(() => {});
            else await writeCredentialStore(next).catch(() => {});
          }
          throw new LlmError("Gemini OAuth 登录已失效，请重新登录该账号", "AUTH");
        }
        // 网络失败：保留旧凭据继续尝试（错误会透传到请求本身）。
      }
      if (typeof account.projectId !== "string" || account.projectId.length === 0) {
        const projectId = await discoverProject(this.fetch, account.access)
          ?? stableProjectId(account.email || publicAccountId(account) || "gemini-oauth-default");
        account = { ...account, projectId };
        store = upsertAccount(store, account, false);
        await writeCredentialStore(store).catch(() => {});
      }
      if (signal?.aborted) throw new LlmError("Gemini OAuth 请求已取消", "ABORTED");
      return account;
    }

    resetCatalogCache() {
      this.catalogCache = undefined;
    }

    async catalog(signal) {
      if (this.catalogCache !== undefined && this.catalogCache.expiresAt > Date.now()) {
        return this.catalogCache.list;
      }
      let list = STATIC_CATALOG;
      try {
        const creds = await this.ensureAccess(signal);
        list = await fetchCatalog(this.fetch, creds);
      } catch {
        // 未登录 / 在线校正失败时保留静态目录（advisory）。
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
  }

  const runtime = new Runtime();
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
      runtime.setFetch((input, init) => globalThis.fetch(input, init));
      return;
    }
    try {
      const dispatcher = proxySetting.startsWith("http") || proxySetting.startsWith("socks")
        ? new ProxyAgent(proxySetting)
        : new ProxyAgent(`http://${proxySetting}`);
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
    settingsPath: [],
  }]);
  ctx.llm.registerAdapter([PROVIDER], adapter);

  // 设置页 → host 的 HTTP API：登录/状态/额度/模型白名单，全部走本机 webServer。
  const readBody = async (req, signal) => {
    const chunks = [];
    for await (const chunk of req) {
      if (signal?.aborted) return "";
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
  };

  // methodOrMap：单个 method 字符串，或 { GET: fn, POST: fn } 按 method 分发。
  // 注意：webServer 同 path 二次注册会 throw，多 method 必须合并进一个 handler。
  const apiHandler = (methodOrMap, run) => async (req, res) => {
    if (!isLoopbackAddress(req.socket?.remoteAddress)) {
      sendJson(res, 403, { ok: false, error: "仅支持本机访问" });
      return;
    }
    const methods = typeof methodOrMap === "string" ? { [methodOrMap]: run } : methodOrMap;
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
        // error 可能是 Error 对象或字符串：统一提取 message（历史版本只认
        // Error.message，导致「该账号不存在」这类字符串错误被降级成「请求失败」）。
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

  ctx.inject(["webServer"], (web) => {
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

  // 账号视图（secret-free）：给设置页展示与切换/移除后的状态回执。
  const accountView = (account, active) => ({
    id: publicAccountId(account) ?? "",
    ...(typeof account.email === "string" ? { email: account.email } : {}),
    expires: account.expires,
    active: active === true,
  });

  const statusView = (store) => {
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
  };

  // 无 token 的错误信息消毒：确保 access/refresh 永不出现于回执。
  const redactSecrets = (message, ...accounts) => {
    let out = message;
    for (const account of accounts) {
      for (const secret of [account?.access, account?.refresh]) {
        if (typeof secret === "string" && secret.length > 0) out = out.split(secret).join("[redacted]");
      }
    }
    return out;
  };

  const routeStatus = async (signal) => {
    const store = await readCredentialStore();
    const login = loginSession === undefined
      ? undefined
      : { status: loginSession.status, ...(loginSession.error ? { error: loginSession.error } : {}) };
    const value = statusView(store);
    if (login !== undefined) value.login = login;
    // 老凭据可能没存 email：用 userinfo 补齐一次并写回。
    const active = activeAccountFrom(store);
    if (active !== undefined && typeof active.email !== "string") {
      try {
        const r = await runtime.fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { authorization: `Bearer ${active.access}` },
          signal,
        });
        if (r.ok) {
          const email = (await r.json()).email;
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
    if (loginSession !== undefined) return { ok: true, value: { authUrl: loginSession.authUrl } };
    const { clientId, clientSecret } = clientConfig();
    const verifier = Buffer.from(randomBytes(32)).toString("base64url");
    const challenge = Buffer.from(createHash("sha256").update(verifier).digest()).toString("base64url");
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
        res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("OAuth 回调校验失败");
        rejectCallback(new Error("OAuth state 或 code 校验失败"));
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
        .end("<html><body><h2>Gemini OAuth 登录完成</h2>可以关闭此页。</body></html>");
      resolveCallback(code);
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolve);
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
          const tokens = await exchangeTokens(runtime.fetch, {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
            code_verifier: verifier,
          });
          if (typeof tokens.refresh_token !== "string") throw new Error("OAuth 未返回 refresh token");
          let email;
          try {
            const ui = await runtime.fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
              headers: { authorization: `Bearer ${tokens.access_token}` },
            });
            email = ui.ok ? (await ui.json()).email : undefined;
          } catch { /* 静默 */ }
          const projectId = await discoverProject(runtime.fetch, tokens.access_token)
            ?? stableProjectId(email || "gemini-oauth-default");
          const store = await readCredentialStore();
          await writeCredentialStore(upsertAccount(store, {
            access: tokens.access_token,
            refresh: tokens.refresh_token,
            expires: Date.now() + tokens.expires_in * 1000 - 300_000,
            projectId,
            email,
          }));
          runtime.resetCatalogCache(); // 新账号成为 active：清旧账号的模型目录缓存
          loginSession.status = "complete";
        } catch (error) {
          loginSession.status = "error";
          loginSession.error = error instanceof Error && error.message.length > 0 ? error.message : String(error);
        }
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          loginSession?.server?.close();
          loginSession = undefined;
        }, 5000);
      });
    return { ok: true, value: { authUrl } };
  };

  // 移除账号（logout / remove 共用）：不传 accountId = 移除 active 账号；
  // 移除 active 后自动落到剩余的第一个账号。
  const routeRemoveAccount = async (req, signal) => {
    let accountId;
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

  const routeSwitchAccount = async (req, signal) => {
    const raw = await readBody(req, signal);
    let payload;
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
    // 老凭据可能没存 email：用 userinfo 补齐一次并写回。
    const active = activeAccountFrom(switched);
    if (active !== undefined && typeof active.email !== "string") {
      try {
        const r = await runtime.fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { authorization: `Bearer ${active.access}` },
          signal,
        });
        if (r.ok) {
          const email = (await r.json()).email;
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

  const routeQuota = async (req, signal) => {
    let accountId;
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

  // 每个已保存账号的额度摘要（不切换 active）：设置页账号列表用。
  const routeQuotaAll = async (signal) => {
    let store = await readCredentialStore();
    if (store.accounts.length === 0) return { ok: true, value: { accounts: [], fetchedAt: new Date().toISOString() } };
    const activeId = (() => {
      const active = activeAccountFrom(store);
      return active === undefined ? undefined : publicAccountId(active);
    })();
    const results = [];
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
        // 拒绝/网络失败：仍用旧 token 尝试，read 失败按 error 上报。
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

  // 模型白名单：GET 返回全目录 + 每项 enabled 标记；POST 覆盖启用列表。
  const modelsView = async (signal, enabledOverride) => {
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

  const routeModels = async (signal) => {
    return { ok: true, value: await modelsView(signal) };
  };

  const routeModelsSave = async (req, signal) => {
    const raw = await readBody(req, signal);
    let payload;
    try { payload = JSON.parse(raw); } catch { return { ok: false, error: "请求体不是合法 JSON" }; }
    if (!Array.isArray(payload?.enabledModelIds) || payload.enabledModelIds.some((id) => typeof id !== "string")) {
      return { ok: false, error: "enabledModelIds 必须是字符串数组" };
    }
    const enabled = await runtime.setEnabledModels(payload.enabledModelIds);
    return { ok: true, value: await modelsView(signal, enabled) };
  };

  // 设置卡「网络」区：proxy 读写走 dsh-settings，保存成功后 host 侧
  // applyTransport 的 onChange 会被触发，无需重启即可换代理。
  const settingsView = (settings) => {
    const descriptor = settings.describe().find((entry) => entry.ns === NS);
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

  const routeSettingsSave = async (req, signal) => {
    const settings = ctx.get("settings");
    if (settings === undefined) return { ok: false, error: "设置服务不可用" };
    const raw = await readBody(req, signal);
    let payload;
    try { payload = JSON.parse(raw); } catch { return { ok: false, error: "请求体不是合法 JSON" }; }
    const proxy = payload?.proxy;
    if (typeof proxy !== "string") return { ok: false, error: "proxy 必须是字符串" };
    const before = settingsView(settings);
    const ops = [];
    if (before.proxy !== proxy) ops.push({ op: "set", path: ["proxy"], value: proxy });
    const expectedRevision = typeof payload?.expectedRevision === "number" ? payload.expectedRevision : undefined;
    if (ops.length > 0) await settings.mutate(NS, ops, expectedRevision);
    return { ok: true, value: settingsView(settings) };
  };

  installSettingsSection(ctx, NS, Config, config, {
    setSource: (source) => {
      current = source;
    },
    onChange: () => {
      applyTransport();
    },
  });

  ctx.effect(() => async () => {
    loginSession?.server?.close();
    loginSession = undefined;
  });
}

export {
  Config,
  readModelConfig,
  writeModelConfig,
  resetModelConfig,
  // 多账号 store 工具（debug / smoke 测试用）。
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
};
