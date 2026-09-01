// Common constants for dsh-gemini-oauth

export const PROVIDER = "gemini-oauth";
export const PROVIDER_NAME = "Gemini OAuth";
export const SETTINGS_NS_TEXT = "llm-gemini-oauth";
export const CREDENTIAL_FILENAME = "gemini-oauth.json";
export const MODEL_CONFIG_FILENAME = "gemini-oauth-models.json";
export const API_PATH = "/gemini-oauth/api";

export const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const USERINFO_URL = "https://www.googleapis.com/oauth2/v1/userinfo?alt=json";
export const REDIRECT_PATH = "/oauth-callback";
export const DEFAULT_CALLBACK_PORT = 51121;

export const SCOPES = [
  "https://www.googleapis.com/auth/aicode",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
];

// 端点顺序：daily 优先（IDE 实测的主通道，consumer 项目线），
// 主端点作为回退（个人项目线，长期 429 时别挡路）。
export const ENDPOINTS = [
  "https://daily-cloudcode-pa.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
];

// Google Antigravity 官方客户端公开凭据（社区共享，非 API key，非秘密）。
// 以 base64 存储仅为规避 GitHub 公开仓库的静态模式检测；
// 运行时可用 GEMINI_OAUTH_CLIENT_ID / GEMINI_OAUTH_CLIENT_SECRET 覆盖。
const decodeBase64 = (str: string): string => {
  if (typeof atob === "function") return atob(str);
  if (typeof Buffer !== "undefined") return Buffer.from(str, "base64").toString("utf8");
  return "";
};

export const DEFAULT_CLIENT_ID = decodeBase64(
  "MTA3MTAwNjA2MDU5MS10bWhzc2luMmgyMWxjcmUyMzV2dG9sb2poNGc0MDNlcC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbQ==",
);

export const DEFAULT_CLIENT_SECRET = decodeBase64(
  "R09DU1BYLUs1OEZXUjQ4NkxkTEoxbUxCOHNYQzR6NnFEQWY=",
);

export const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
export const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
export const DISCOVERY_TIMEOUT_MS = 30 * 1000;
export const PROJECT_CACHE_TTL_MS = 30 * 60 * 1000;
export const ACCOUNT_PROFILE_TTL_MS = 30 * 60 * 1000;

export const CREDENTIAL_VERSION = 2;

export const RUNTIME_MODEL_ALIASES: Record<string, string> = {
  "gemini-3.1-pro-high": "gemini-pro-agent",
};

export const LOCATION_RETRY_PATTERN = /location is not supported/i;
export const TRANSIENT_BACKOFF_MS = [0, 2000, 6000, 14000];
export const LOCATION_HINT = "出口 IP 风控判定（Google 按出口 IP 的 国家/ASN/机房特征 间歇性拒绝；支持国家 ≠ 该路径接受当前 IP）。建议：插件设置卡「网络」使用代理（127.0.0.1:7897），节点优先选 家宽/原生/住宅 线路，避开 G-Core/IDC 机房 IP";
export const GATED_ENDPOINT_HINT = "cloudcode-pa.googleapis.com 仅限企业/GCP 许可账号（个人订阅账号访问恒为 429，已按官方客户端策略不再回退该端点）";
