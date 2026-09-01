// i18n dictionaries and translator factory for dsh-gemini-oauth

import type { Translator } from "./types";

export const zh: Record<string, string> = {
  pageDesc: "使用 Google 账号登录 OAuth，用订阅额度直接使用 Gemini（及账号下的其他模型）。",
  currentAccount: "当前账号",
  login: "登录",
  loggingIn: "登录中...",
  refresh: "刷新",
  refreshing: "刷新中...",
  logout: "退出",
  addAccount: "添加账号",
  accountActive: "当前使用",
  switchAccount: "切换",
  removeAccount: "移除",
  accountsHelp: "对话与额度使用标「当前使用」的账号；登录新账号后会自动切换到它。",
  switchFailed: "切换账号失败",
  removeFailed: "移除账号失败",
  accountSwitched: "已切换到 {email}",
  quotaFailed: "额度读取失败",
  quotaRemaining: "{val}% 剩余",
  loading: "加载中...",
  notSignedIn: "未登录",
  notSignedInDesc: "点击登录后会在浏览器中完成 Google OAuth；登录成功后这里会显示额度。",
  noQuotaDesc: "暂无额度数据，点击刷新。",
  fetchingQuota: "正在获取额度...",
  quota: "额度",
  resetNow: "现在",
  resetUnavailable: "重置: n/a",
  resetPrefix: "重置: {time}",
  timeDayHour: "{days}天 {hours}时",
  timeHourMin: "{hours}小时 {minutes}分",
  timeMin: "{minutes}分钟",
  updatedAt: "更新时间：{time}",
  loginFailed: "登录失败",
  modelSelector: "模型选择",
  modelSelectorDesc: "勾选后会出现在模型选择器里的 Gemini 模型。",
  selectAll: "全选",
  unselectAll: "全不选",
  loadingModels: "正在加载模型...",
  modelSelectorNote: "勾选即自动保存，持久化在本机。重新打开模型选择器（或新开会话）后生效；运行中的旧会话不受影响。",
  network: "网络",
  netDesc: "仅 Gemini 流量的 HTTP 代理（登录 + 对话），其他模型不受影响。",
  proxyLabel: "HTTP 代理（仅 Gemini 流量）",
  proxyPlaceholder: "如 127.0.0.1:7897（留空 = 跟随环境变量）",
  proxyHelp: "只有 accounts.google.com / oauth2.googleapis.com（登录）与 cloudcode-pa.googleapis.com（对话）的请求走此代理；DeepSeek 等其他模型保持直连不受影响。留空 = 跟随环境变量 HTTPS_PROXY / ALL_PROXY；没有环境变量时直连。本机代理没导出到环境变量（如 Clash TUN 模式）请填 127.0.0.1:7897；填 direct 强制直连。保存后立即生效。",
  proxySaved: "已保存，立即生效。",
  proxySaveFailed: "保存失败",
  proxySave: "保存",
  proxySaving: "保存中...",
  netNeedsRestart: "dsh web 宿主端还是旧版本：请重启 dsh web 后再使用这里的网络设置。",
};

export const en: Record<string, string> = {
  pageDesc: "Sign in with Google OAuth to use Gemini with your subscription quota.",
  currentAccount: "Current Account",
  login: "Sign in",
  loggingIn: "Signing in...",
  refresh: "Refresh",
  refreshing: "Refreshing...",
  logout: "Sign out",
  addAccount: "Add account",
  accountActive: "Active",
  switchAccount: "Use",
  removeAccount: "Remove",
  accountsHelp: "Chats and quota use the account marked Active; newly signed-in accounts become active automatically.",
  switchFailed: "Failed to switch account",
  removeFailed: "Failed to remove account",
  accountSwitched: "Switched to {email}",
  quotaFailed: "Quota unavailable",
  quotaRemaining: "{val}% left",
  loading: "Loading...",
  notSignedIn: "Not signed in",
  notSignedInDesc: "Click Sign in to complete Google OAuth in your browser. Quotas will appear here after login.",
  noQuotaDesc: "No quota data yet. Click Refresh.",
  fetchingQuota: "Fetching quota data...",
  quota: "Quota",
  resetNow: "now",
  resetUnavailable: "Reset: n/a",
  resetPrefix: "Reset: {time}",
  timeDayHour: "{days}d {hours}h",
  timeHourMin: "{hours}h {minutes}m",
  timeMin: "{minutes}m",
  updatedAt: "Updated at: {time}",
  loginFailed: "Login failed",
  modelSelector: "Model Selection",
  modelSelectorDesc: "Checked models will appear in the Gemini model picker.",
  selectAll: "Select all",
  unselectAll: "Deselect all",
  loadingModels: "Loading models...",
  modelSelectorNote: "Saved automatically and persisted locally. Reopen the model picker (or start a new session) to see the change; running sessions are unaffected.",
  network: "Network",
  netDesc: "HTTP proxy for Gemini traffic only (sign-in + chat); other models are unaffected.",
  proxyLabel: "HTTP proxy (Gemini traffic only)",
  proxyPlaceholder: "e.g. 127.0.0.1:7897 (leave empty to follow the environment)",
  proxyHelp: "Only accounts.google.com / oauth2.googleapis.com (sign-in) and cloudcode-pa.googleapis.com (chat) requests use this proxy; other models like DeepSeek stay on the direct connection. Empty = use HTTPS_PROXY / ALL_PROXY from the environment; with no such variables the plugin connects directly. If your local proxy is not exported to the environment (e.g. Clash TUN mode), enter 127.0.0.1:7897. Enter direct to force a direct connection. Applies immediately after saving.",
  proxySaved: "Saved. Applied immediately.",
  proxySaveFailed: "Save failed",
  proxySave: "Save",
  proxySaving: "Saving...",
  netNeedsRestart: "The dsh web host is still running the old plugin code: restart dsh web before using the network settings here.",
};

export const NS = "dsh-gemini-oauth";

export function createTranslator(ctx: any): Translator {
  const boundT = (ctx && ctx.locale && typeof ctx.locale.bind === "function")
    ? ctx.locale.bind(NS)
    : null;
  return function t(key: string, params?: Record<string, string | number>): string {
    if (boundT) {
      try {
        const res = boundT(key, params);
        if (res && res !== key && res !== `${NS}.${key}`) return res;
      } catch (_) {}
    }
    const active = (ctx && ctx.locale && typeof ctx.locale.getLocale === "function")
      ? ctx.locale.getLocale()?.active
      : null;
    const isZh = active ? active.startsWith("zh") : (typeof navigator !== "undefined" && navigator.language && navigator.language.startsWith("zh"));
    const dict = isZh ? zh : en;
    let text = dict[key] || en[key] || zh[key] || key;
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return text;
  };
}
