window.__ModuleLoader__.load({
	id: "dsh-gemini-oauth",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/i18n.ts
var zh = {
  pageDesc: "\u4F7F\u7528 Google \u8D26\u53F7\u767B\u5F55 OAuth\uFF0C\u7528\u8BA2\u9605\u989D\u5EA6\u76F4\u63A5\u4F7F\u7528 Gemini\uFF08\u53CA\u8D26\u53F7\u4E0B\u7684\u5176\u4ED6\u6A21\u578B\uFF09\u3002",
  currentAccount: "\u5F53\u524D\u8D26\u53F7",
  login: "\u767B\u5F55",
  loggingIn: "\u767B\u5F55\u4E2D...",
  refresh: "\u5237\u65B0",
  refreshing: "\u5237\u65B0\u4E2D...",
  logout: "\u9000\u51FA",
  addAccount: "\u6DFB\u52A0\u8D26\u53F7",
  accountActive: "\u5F53\u524D\u4F7F\u7528",
  switchAccount: "\u5207\u6362",
  removeAccount: "\u79FB\u9664",
  accountsHelp: "\u5BF9\u8BDD\u4E0E\u989D\u5EA6\u4F7F\u7528\u6807\u300C\u5F53\u524D\u4F7F\u7528\u300D\u7684\u8D26\u53F7\uFF1B\u767B\u5F55\u65B0\u8D26\u53F7\u540E\u4F1A\u81EA\u52A8\u5207\u6362\u5230\u5B83\u3002",
  switchFailed: "\u5207\u6362\u8D26\u53F7\u5931\u8D25",
  removeFailed: "\u79FB\u9664\u8D26\u53F7\u5931\u8D25",
  accountSwitched: "\u5DF2\u5207\u6362\u5230 {email}",
  quotaFailed: "\u989D\u5EA6\u8BFB\u53D6\u5931\u8D25",
  quotaRemaining: "{val}% \u5269\u4F59",
  loading: "\u52A0\u8F7D\u4E2D...",
  notSignedIn: "\u672A\u767B\u5F55",
  notSignedInDesc: "\u70B9\u51FB\u767B\u5F55\u540E\u4F1A\u5728\u6D4F\u89C8\u5668\u4E2D\u5B8C\u6210 Google OAuth\uFF1B\u767B\u5F55\u6210\u529F\u540E\u8FD9\u91CC\u4F1A\u663E\u793A\u989D\u5EA6\u3002",
  noQuotaDesc: "\u6682\u65E0\u989D\u5EA6\u6570\u636E\uFF0C\u70B9\u51FB\u5237\u65B0\u3002",
  fetchingQuota: "\u6B63\u5728\u83B7\u53D6\u989D\u5EA6...",
  quota: "\u989D\u5EA6",
  resetNow: "\u73B0\u5728",
  resetUnavailable: "\u91CD\u7F6E: n/a",
  resetPrefix: "\u91CD\u7F6E: {time}",
  timeDayHour: "{days}\u5929 {hours}\u65F6",
  timeHourMin: "{hours}\u5C0F\u65F6 {minutes}\u5206",
  timeMin: "{minutes}\u5206\u949F",
  updatedAt: "\u66F4\u65B0\u65F6\u95F4\uFF1A{time}",
  loginFailed: "\u767B\u5F55\u5931\u8D25",
  modelSelector: "\u6A21\u578B\u9009\u62E9",
  modelSelectorDesc: "\u52FE\u9009\u540E\u4F1A\u51FA\u73B0\u5728\u6A21\u578B\u9009\u62E9\u5668\u91CC\u7684 Gemini \u6A21\u578B\u3002",
  selectAll: "\u5168\u9009",
  unselectAll: "\u5168\u4E0D\u9009",
  loadingModels: "\u6B63\u5728\u52A0\u8F7D\u6A21\u578B...",
  modelSelectorNote: "\u52FE\u9009\u5373\u81EA\u52A8\u4FDD\u5B58\uFF0C\u6301\u4E45\u5316\u5728\u672C\u673A\u3002\u91CD\u65B0\u6253\u5F00\u6A21\u578B\u9009\u62E9\u5668\uFF08\u6216\u65B0\u5F00\u4F1A\u8BDD\uFF09\u540E\u751F\u6548\uFF1B\u8FD0\u884C\u4E2D\u7684\u65E7\u4F1A\u8BDD\u4E0D\u53D7\u5F71\u54CD\u3002",
  network: "\u7F51\u7EDC",
  netDesc: "\u4EC5 Gemini \u6D41\u91CF\u7684 HTTP \u4EE3\u7406\uFF08\u767B\u5F55 + \u5BF9\u8BDD\uFF09\uFF0C\u5176\u4ED6\u6A21\u578B\u4E0D\u53D7\u5F71\u54CD\u3002",
  proxyLabel: "HTTP \u4EE3\u7406\uFF08\u4EC5 Gemini \u6D41\u91CF\uFF09",
  proxyPlaceholder: "\u5982 127.0.0.1:7897\uFF08\u7559\u7A7A = \u8DDF\u968F\u73AF\u5883\u53D8\u91CF\uFF09",
  proxyHelp: "\u53EA\u6709 accounts.google.com / oauth2.googleapis.com\uFF08\u767B\u5F55\uFF09\u4E0E cloudcode-pa.googleapis.com\uFF08\u5BF9\u8BDD\uFF09\u7684\u8BF7\u6C42\u8D70\u6B64\u4EE3\u7406\uFF1BDeepSeek \u7B49\u5176\u4ED6\u6A21\u578B\u4FDD\u6301\u76F4\u8FDE\u4E0D\u53D7\u5F71\u54CD\u3002\u7559\u7A7A = \u8DDF\u968F\u73AF\u5883\u53D8\u91CF HTTPS_PROXY / ALL_PROXY\uFF1B\u6CA1\u6709\u73AF\u5883\u53D8\u91CF\u65F6\u76F4\u8FDE\u3002\u672C\u673A\u4EE3\u7406\u6CA1\u5BFC\u51FA\u5230\u73AF\u5883\u53D8\u91CF\uFF08\u5982 Clash TUN \u6A21\u5F0F\uFF09\u8BF7\u586B 127.0.0.1:7897\uFF1B\u586B direct \u5F3A\u5236\u76F4\u8FDE\u3002\u4FDD\u5B58\u540E\u7ACB\u5373\u751F\u6548\u3002",
  proxySaved: "\u5DF2\u4FDD\u5B58\uFF0C\u7ACB\u5373\u751F\u6548\u3002",
  proxySaveFailed: "\u4FDD\u5B58\u5931\u8D25",
  proxySave: "\u4FDD\u5B58",
  proxySaving: "\u4FDD\u5B58\u4E2D...",
  netNeedsRestart: "dsh web \u5BBF\u4E3B\u7AEF\u8FD8\u662F\u65E7\u7248\u672C\uFF1A\u8BF7\u91CD\u542F dsh web \u540E\u518D\u4F7F\u7528\u8FD9\u91CC\u7684\u7F51\u7EDC\u8BBE\u7F6E\u3002"
};
var en = {
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
  netNeedsRestart: "The dsh web host is still running the old plugin code: restart dsh web before using the network settings here."
};
var NS = "dsh-gemini-oauth";
function createTranslator(ctx) {
  const boundT = ctx && ctx.locale && typeof ctx.locale.bind === "function" ? ctx.locale.bind(NS) : null;
  return function t(key, params) {
    if (boundT) {
      try {
        const res = boundT(key, params);
        if (res && res !== key && res !== `${NS}.${key}`) return res;
      } catch (_) {
      }
    }
    const active = ctx && ctx.locale && typeof ctx.locale.getLocale === "function" ? ctx.locale.getLocale()?.active : null;
    const isZh = active ? active.startsWith("zh") : typeof navigator !== "undefined" && navigator.language && navigator.language.startsWith("zh");
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

// src/client/styles.ts
var STYLE_ID = "dsh-gemini-oauth-settings-style";
function installStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.dgo-wrap{box-sizing:border-box;width:100%;max-width:760px;padding:0 0 24px;color:#111827}
.dgo-page-head{display:flex;align-items:center;gap:10px}
.dgo-brand-icon{color:#111827;flex-shrink:0}
.dgo-page-title{margin:0;color:#111827;font-size:20px;font-weight:700;line-height:28px}
.dgo-page-desc{margin:8px 0 18px;color:#8b93a1;font-size:13px;line-height:20px}
.dgo-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;box-shadow:none}
.dgo-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.dgo-title{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:700;color:#111827}
.dgo-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.dgo-btn{border:1px solid #d7dce3;background:#fff;color:#111827;border-radius:10px;padding:7px 12px;font-size:13px;line-height:18px;cursor:pointer}
.dgo-btn:hover{background:#f7f8fa}
.dgo-btn:disabled{cursor:not-allowed;opacity:.55}
.dgo-btn-primary{border-color:#111827;background:#111827;color:white}
.dgo-btn-primary:hover{background:#272d38}
.dgo-account{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:12px;border:1px solid #eef1f5;border-radius:10px;background:#fafbfc;color:#4b5563}
.dgo-account-list{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
.dgo-account-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid #eef1f5;border-radius:10px;background:#fafbfc;color:#4b5563}
.dgo-account-main{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1 1 auto}
.dgo-account-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:16px}
.dgo-active-badge{display:inline-flex;align-items:center;font-size:12px;line-height:16px;font-weight:650;color:#059669;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;padding:1px 8px}
.dgo-account-caption{font-size:12px;line-height:16px;color:#8b93a1}
.dgo-account-caption-error{color:#dc2626}
.dgo-account-actions{display:flex;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.dgo-accounts-help{margin-top:10px;color:#8b93a1;font-size:12px;line-height:18px}
.dgo-accounts-empty{border:1px dashed #d8dee8;border-radius:10px;padding:14px;color:#747f90;background:#fafbfc;font-size:13px;line-height:20px}
.dgo-email{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:650;min-width:0}
.dgo-email-mark{width:16px;height:12px;border:1.8px solid #7f8a9a;border-radius:3px;position:relative;flex:0 0 auto}
.dgo-email-mark:before{content:"";position:absolute;left:1px;right:1px;top:1px;height:7px;border-bottom:1.8px solid #7f8a9a;transform:skewY(-28deg)}
.dgo-email-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dgo-quota-title{margin:16px 0 6px;color:#111827;font-size:14px;font-weight:700}
.dgo-quota-group{margin-top:10px;padding:12px 14px;background:#fafbfc;border:1px solid #eef1f5;border-radius:10px}
.dgo-group-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.dgo-group-title{font-size:13px;font-weight:700;color:#111827}
.dgo-group-desc{font-size:12px;color:#8b93a1}
.dgo-row{padding:8px 0;border-top:1px solid #edf1f5}
.dgo-row:first-of-type{border-top:0;padding-top:0}
.dgo-rowtop{display:flex;align-items:baseline;justify-content:space-between;gap:12px;color:#4b5563;font-weight:600;font-size:13px}
.dgo-metrics{display:flex;align-items:baseline;gap:10px;white-space:nowrap;color:#8b93a1;font-size:12px}
.dgo-percent{font-size:13px;font-weight:750;color:#059669}
.dgo-percent-cyan{color:#0284c7}
.dgo-bar{height:6px;margin-top:6px;border-radius:999px;background:#edf1f5;overflow:hidden}
.dgo-fill{height:100%;border-radius:999px;background:#10b981}
.dgo-fill-cyan{background:#06b6d4}
.dgo-empty{border:1px dashed #d8dee8;border-radius:10px;padding:14px;color:#747f90;background:#fafbfc;font-size:13px;line-height:20px}
.dgo-error{margin-top:12px;color:#991b1b;background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;font-size:13px;white-space:pre-wrap}
.dgo-note{margin-top:12px;color:#8b93a1;font-size:12px;line-height:18px}
.dgo-model-card{margin-top:14px}
.dgo-net-card{margin-top:14px}
.dgo-net-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.dgo-net-title{font-size:14px;font-weight:700;color:#111827}
.dgo-net-desc{margin-top:3px;color:#8b93a1;font-size:12px;line-height:18px}
.dgo-net-label{display:block;margin-bottom:6px;color:#4b5563;font-size:13px;font-weight:650}
.dgo-net-input{box-sizing:border-box;width:100%;padding:8px 12px;border:1px solid #d7dce3;border-radius:10px;font-size:13px;line-height:20px;color:#111827;background:#fff;outline:none}
.dgo-net-input:focus{border-color:#111827}
.dgo-net-help{margin-top:8px;color:#8b93a1;font-size:12px;line-height:18px}
.dgo-net-actions{margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dgo-net-btn{border:1px solid #d7dce3;background:#fff;color:#111827;border-radius:10px;padding:7px 14px;font-size:13px;line-height:18px;cursor:pointer}
.dgo-net-btn:hover{background:#f7f8fa}
.dgo-net-btn:disabled{cursor:not-allowed;opacity:.55}
.dgo-net-btn-primary{border-color:#111827;background:#111827;color:white}
.dgo-net-btn-primary:hover{background:#272d38}
.dgo-net-status{margin-top:10px;color:#059669;font-size:12px;line-height:18px}
.dgo-net-status-error{margin-top:10px;color:#991b1b;background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;font-size:12px;line-height:18px;white-space:pre-wrap}
.dgo-model-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
.dgo-model-title{font-size:14px;font-weight:700;color:#111827}
.dgo-model-desc{margin-top:3px;color:#8b93a1;font-size:12px;line-height:18px}
.dgo-mini-actions{display:flex;gap:8px;white-space:nowrap}
.dgo-mini-btn{border:0;background:transparent;color:#4f5bf6;font-size:12px;line-height:18px;cursor:pointer;padding:0}
.dgo-mini-btn:hover{text-decoration:underline}
.dgo-mini-btn:disabled{cursor:not-allowed;opacity:.55}
.dgo-model-list{border:1px solid #eef1f5;border-radius:10px;overflow:hidden;max-height:320px;overflow-y:auto}
.dgo-model-row{display:flex;align-items:flex-start;gap:10px;padding:9px 14px;background:#fff;border-top:1px solid #eef1f5;cursor:pointer}
.dgo-model-row:hover{background:#fafbfc}
.dgo-model-row:first-child{border-top:0}
.dgo-check{margin-top:1px;width:16px;height:16px;accent-color:#111827;flex:0 0 auto}
.dgo-model-text{min-width:0;flex:1 1 auto}
.dgo-model-name{display:block;font-size:13px;font-weight:650;color:#111827;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dgo-model-sub{display:block;margin-top:2px;color:#9aa3b0;font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dgo-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:inherit;cursor:default;position:relative;user-select:none;white-space:nowrap;flex:0 0 auto !important;line-height:20px}
.dgo-chip:not(:last-child)::after{content:"|";color:var(--dsw-alias-separator-primary, rgba(0,0,0,0.2));margin:0 10px;font-size:12px;line-height:20px}
.dgo-chip:hover{opacity:0.8}
.dgo-chip-danger{color:#dc2626}
.dgo-chip-danger:hover{opacity:0.8}
.dgo-chip-icon{width:14px;height:14px;color:inherit;flex-shrink:0}
.dgo-tooltip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 12px;border-radius:8px;font-size:12px;line-height:18px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.15s;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.dgo-chip:hover .dgo-tooltip{opacity:1}
.dgo-tooltip::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border-width:5px;border-style:solid;border-color:#111827 transparent transparent transparent}
.dgo-tt-title{font-weight:600;margin-bottom:6px;color:#e5e7eb}
.dgo-tt-row{display:flex;justify-content:space-between;gap:16px;margin-top:4px;color:#9ca3af}
.dgo-tt-val{color:#fff;font-weight:500}
`;
  document.head.append(style);
}

// src/client/components/GeminiIcon.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var GEMINI_SVG_PATH = "M12 2c-.6 5-4 8.5-9 9 5 .5 8.4 4 9 9 .6-5 4-8.5 9-9-5-.5-8.4-4-9-9Z";
function GeminiIcon({ size = 20, className = "" }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      className,
      style: { flexShrink: 0, display: "inline-block", verticalAlign: "middle" },
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: GEMINI_SVG_PATH, fill: "currentColor" })
    }
  );
}

// src/client/GeminiSettings.tsx
var import_react2 = require("react");

// src/common/constants.ts
var API_PATH = "/gemini-oauth/api";
var decodeBase64 = (str) => {
  if (typeof atob === "function") return atob(str);
  if (typeof Buffer !== "undefined") return Buffer.from(str, "base64").toString("utf8");
  return "";
};
var DEFAULT_CLIENT_ID = decodeBase64(
  "MTA3MTAwNjA2MDU5MS10bWhzc2luMmgyMWxjcmUyMzV2dG9sb2poNGc0MDNlcC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbQ=="
);
var DEFAULT_CLIENT_SECRET = decodeBase64(
  "R09DU1BYLUs1OEZXUjQ4NkxkTEoxbUxCOHNYQzR6NnFEQWY="
);
var MODEL_CACHE_TTL_MS = 5 * 60 * 1e3;
var OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1e3;
var DISCOVERY_TIMEOUT_MS = 30 * 1e3;
var PROJECT_CACHE_TTL_MS = 30 * 60 * 1e3;
var ACCOUNT_PROFILE_TTL_MS = 30 * 60 * 1e3;

// src/client/api.ts
async function api(path, options) {
  const response = await fetch(`${API_PATH}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options && options.headers ? options.headers : {}
    }
  });
  const body = await response.json().catch(() => ({ ok: false, error: "invalid-json" }));
  if (!response.ok || !body.ok) {
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return body.value;
}
async function netFetch(path, options) {
  const response = await fetch(`${API_PATH}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options && options.headers ? options.headers : {}
    }
  });
  if (response.status === 404) {
    throw { __netHostStale: true };
  }
  const body = await response.json().catch(() => ({ ok: false, error: "invalid-json" }));
  if (!response.ok || !body.ok) {
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return body.value;
}

// src/client/quota-state.ts
function formatReset(resetTime, t) {
  if (!resetTime) return "n/a";
  const timestamp = Date.parse(resetTime);
  if (!Number.isFinite(timestamp)) return resetTime;
  const delta = timestamp - Date.now();
  if (delta <= 0) return t("resetNow");
  const totalMinutes = Math.round(delta / 6e4);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor(totalMinutes % (60 * 24) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return t("timeDayHour", { days, hours });
  if (hours > 0) return t("timeHourMin", { hours, minutes });
  return t("timeMin", { minutes });
}
function parseQuota(rawQuota) {
  const parsed = { gemini5h: null, geminiWeek: null, claude5h: null, claudeWeek: null };
  if (!rawQuota || !Array.isArray(rawQuota.groups)) return parsed;
  for (const group of rawQuota.groups) {
    const isGemini = group.displayName && group.displayName.includes("Gemini");
    const isClaude = group.displayName && group.displayName.includes("Claude");
    if (!isGemini && !isClaude) continue;
    if (!Array.isArray(group.buckets)) continue;
    for (const bucket of group.buckets) {
      const is5h = bucket.displayName && bucket.displayName.includes("Five Hour");
      const isWeek = bucket.displayName && bucket.displayName.includes("Weekly");
      const val = Math.max(0, Math.min(100, Math.round((bucket.remainingFraction ?? 0) * 1e3) / 10));
      if (isGemini && is5h) parsed.gemini5h = val;
      if (isGemini && isWeek) parsed.geminiWeek = val;
      if (isClaude && is5h) parsed.claude5h = val;
      if (isClaude && isWeek) parsed.claudeWeek = val;
    }
  }
  return parsed;
}
var sharedQuota = null;
var quotaListeners = /* @__PURE__ */ new Set();
var quotaPollTimer = void 0;
var isPolling = false;
function publishQuota(value) {
  if (!value || !value.quota) return;
  sharedQuota = value.quota;
  for (const fn of quotaListeners) fn(sharedQuota);
}
async function pollQuota(force = false) {
  if (!force && (typeof document !== "undefined" && (document.hidden || !document.hasFocus()))) return;
  if (isPolling) return;
  isPolling = true;
  try {
    const val = await api("/quota", { method: "POST" });
    if (val && val.quota) {
      sharedQuota = val.quota;
      for (const fn of quotaListeners) fn(sharedQuota);
    }
  } catch {
  } finally {
    isPolling = false;
  }
}
function startGlobalPolling() {
  if (quotaPollTimer === void 0 && typeof window !== "undefined") {
    pollQuota(true);
    quotaPollTimer = window.setInterval(() => pollQuota(false), 3e4);
    window.addEventListener("visibilitychange", () => {
      if (!document.hidden) pollQuota(true);
    });
    window.addEventListener("focus", () => pollQuota(true));
  }
}

// src/client/components/AccountList.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function AccountList({ accounts, quotaAll, busy, onSwitch, onRemove, t }) {
  const quotaEntryOf = (accountId) => {
    if (!quotaAll || !Array.isArray(quotaAll.accounts)) return void 0;
    return quotaAll.accounts.find((entry) => entry.accountId === accountId || entry.email === accountId);
  };
  const accountCaptionOf = (entry) => {
    if (entry === void 0) return void 0;
    if (entry.status === "error") return { text: `${t("quotaFailed")}\uFF1A${entry.message ?? ""}`, error: true };
    if (entry.status !== "ok" || !entry.quota) return void 0;
    const parsed = parseQuota(entry.quota);
    const val = parsed.geminiWeek ?? parsed.gemini5h ?? parsed.claudeWeek ?? parsed.claude5h;
    return val === null ? void 0 : { text: t("quotaRemaining", { val }), error: false };
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dgo-account-list", children: [
    accounts.map((account) => {
      const caption = accountCaptionOf(quotaEntryOf(account.id));
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dgo-account-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dgo-account-main", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dgo-email", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dgo-email-mark", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dgo-email-text", children: account.email || account.id })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dgo-account-meta", children: [
            account.active && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dgo-active-badge", children: t("accountActive") }),
            caption && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: `dgo-account-caption${caption.error ? " dgo-account-caption-error" : ""}`, children: caption.text })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dgo-account-actions", children: [
          !account.active && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              className: "dgo-btn",
              disabled: busy,
              onClick: () => onSwitch(account.id),
              children: t("switchAccount")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              className: "dgo-btn",
              disabled: busy,
              onClick: () => onRemove(account.id),
              children: t("removeAccount")
            }
          )
        ] })
      ] }, account.id);
    }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dgo-accounts-help", children: t("accountsHelp") })
  ] });
}

// src/client/components/QuotaRow.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function QuotaRow({ bucket, accent, t }) {
  const percent = Math.max(0, Math.min(100, Math.round((bucket.remainingFraction ?? 0) * 1e3) / 10));
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dgo-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dgo-rowtop", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { children: bucket.displayName || bucket.bucketId || t("quota") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dgo-metrics", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("resetPrefix", { time: formatReset(bucket.resetTime, t) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `dgo-percent${accent === "cyan" ? " dgo-percent-cyan" : ""}`, children: `${percent}%` })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dgo-bar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        className: `dgo-fill${accent === "cyan" ? " dgo-fill-cyan" : ""}`,
        style: { width: `${percent}%` }
      }
    ) })
  ] });
}

// src/client/components/QuotaSection.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
function QuotaSection({ quota, t }) {
  if (!quota || !quota.quota || !Array.isArray(quota.quota.groups)) return null;
  const groups = quota.quota.groups.map((group) => ({
    displayName: group.displayName,
    description: group.description,
    buckets: Array.isArray(group.buckets) ? group.buckets : []
  })).filter((group) => group.buckets && group.buckets.length > 0);
  if (groups.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dgo-quota-title", children: t("quota") }),
    groups.map((group, index) => {
      const isCyan = /claude|gpt|3p|openai|anthropic/i.test(`${group.displayName || ""} ${group.description || ""}`);
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dgo-quota-group", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dgo-group-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dgo-group-title", children: group.displayName || t("quota") }),
          group.description && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dgo-group-desc", children: group.description })
        ] }),
        group.buckets?.map((bucket, bucketIndex) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          QuotaRow,
          {
            bucket,
            accent: isCyan ? "cyan" : "green",
            t
          },
          bucket.bucketId || bucketIndex
        ))
      ] }, group.displayName || index);
    })
  ] });
}

// src/client/components/ModelSelector.tsx
var import_react = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
function ModelSelector({ options, busy, onToggle, onSetAll, t }) {
  const familyOrder = (option) => {
    const text = `${option.id || ""} ${option.name || ""}`.toLowerCase();
    if (text.includes("gemini")) return 1;
    if (text.includes("claude")) return 2;
    if (text.includes("gpt")) return 3;
    return 4;
  };
  const versionOf = (option) => {
    const match = `${option.id} ${option.name}`.match(/(?:gemini|claude|gpt)[-_ ]*v?(\d+(?:\.\d+)*)/i) || `${option.id} ${option.name}`.match(/\b(\d+(?:\.\d+)+)\b/);
    if (!match) return [0];
    return match[1].split(".").map((num) => parseInt(num, 10) || 0);
  };
  const sortedOptions = (0, import_react.useMemo)(() => {
    return [...options].sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      const famA = familyOrder(a);
      const famB = familyOrder(b);
      if (famA !== famB) return famA - famB;
      const va = versionOf(a);
      const vb = versionOf(b);
      const len = Math.max(va.length, vb.length);
      for (let i = 0; i < len; i++) {
        const na = va[i] ?? 0;
        const nb = vb[i] ?? 0;
        if (na !== nb) return nb - na;
      }
      return (a.name || a.id || "").localeCompare(b.name || b.id || "");
    });
  }, [options]);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("section", { className: "dgo-card dgo-model-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dgo-model-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dgo-model-title", children: t("modelSelector") }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dgo-model-desc", children: t("modelSelectorDesc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dgo-mini-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "dgo-mini-btn", disabled: busy, onClick: () => onSetAll(true), children: t("selectAll") }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "dgo-mini-btn", disabled: busy, onClick: () => onSetAll(false), children: t("unselectAll") })
      ] })
    ] }),
    sortedOptions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dgo-empty", children: t("loadingModels") }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dgo-model-list", children: sortedOptions.map((option) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { className: "dgo-model-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "input",
        {
          className: "dgo-check",
          type: "checkbox",
          checked: !!option.enabled,
          disabled: busy,
          onChange: (event) => onToggle(option.id, event.target.checked)
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dgo-model-text", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dgo-model-name", children: option.name || option.id }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dgo-model-sub", children: option.id })
      ] })
    ] }, option.id)) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dgo-note", children: t("modelSelectorNote") })
  ] });
}

// src/client/components/NetworkSection.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function NetworkSection({
  proxy,
  loaded,
  supported,
  busy,
  status,
  onChange,
  onSave,
  t
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "dgo-card dgo-net-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dgo-net-head", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dgo-net-title", children: t("network") }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dgo-net-desc", children: t("netDesc") })
    ] }) }),
    !loaded ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dgo-empty", children: t("loading") }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { htmlFor: "dgo-net-proxy", style: { display: "block" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dgo-net-label", children: t("proxyLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "input",
        {
          id: "dgo-net-proxy",
          className: "dgo-net-input",
          type: "text",
          value: proxy,
          autoComplete: "off",
          spellCheck: false,
          placeholder: t("proxyPlaceholder"),
          disabled: busy || !supported,
          onChange: (event) => onChange(event.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "dgo-net-help", children: t("proxyHelp") }),
    !supported && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dgo-net-status-error", children: t("netNeedsRestart") }),
    supported && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dgo-net-actions", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "button",
      {
        className: "dgo-net-btn dgo-net-btn-primary",
        disabled: busy || !loaded,
        onClick: onSave,
        children: busy ? t("proxySaving") : t("proxySave")
      }
    ) }),
    status && status.ok && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dgo-net-status", children: t("proxySaved") }),
    status && !status.ok && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dgo-net-status-error", children: status.error })
  ] });
}

// src/client/GeminiSettings.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
function GeminiSettings({ ctx }) {
  const [, setLocaleRev] = (0, import_react2.useState)(0);
  (0, import_react2.useEffect)(() => {
    if (!ctx || !ctx.locale || typeof ctx.locale.subscribe !== "function") return;
    return ctx.locale.subscribe(() => setLocaleRev((r) => r + 1));
  }, [ctx]);
  const tr = (0, import_react2.useMemo)(() => createTranslator(ctx), [ctx]);
  const [status, setStatus] = (0, import_react2.useState)({ loading: true });
  const [quota, setQuota] = (0, import_react2.useState)(void 0);
  const [quotaAll, setQuotaAll] = (0, import_react2.useState)(void 0);
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)("");
  const [notice, setNotice] = (0, import_react2.useState)("");
  const pollRef = (0, import_react2.useRef)(void 0);
  const [models, setModels] = (0, import_react2.useState)(void 0);
  const [modelBusy, setModelBusy] = (0, import_react2.useState)(false);
  const [netProxy, setNetProxy] = (0, import_react2.useState)("");
  const [netBusy, setNetBusy] = (0, import_react2.useState)(false);
  const [netStatus, setNetStatus] = (0, import_react2.useState)(void 0);
  const [netLoaded, setNetLoaded] = (0, import_react2.useState)(false);
  const [netSupported, setNetSupported] = (0, import_react2.useState)(true);
  const refreshNet = (0, import_react2.useCallback)(async () => {
    try {
      const value = await netFetch("/settings");
      setNetProxy(value && typeof value.proxy === "string" ? value.proxy : "");
      setNetSupported(true);
    } catch (err) {
      if (err && err.__netHostStale) setNetSupported(false);
    } finally {
      setNetLoaded(true);
    }
  }, []);
  const saveNet = (0, import_react2.useCallback)(async () => {
    setNetBusy(true);
    setNetStatus(void 0);
    try {
      const value = await netFetch("/settings", {
        method: "POST",
        body: JSON.stringify({ proxy: netProxy })
      });
      setNetProxy(value && typeof value.proxy === "string" ? value.proxy : "");
      setNetStatus({ ok: true });
    } catch (err) {
      if (err && err.__netHostStale) {
        setNetStatus({ ok: false, error: tr("netNeedsRestart") });
      } else {
        setNetStatus({ ok: false, error: `${tr("proxySaveFailed")}\uFF1A${err instanceof Error ? err.message : String(err)}` });
      }
    } finally {
      setNetBusy(false);
    }
  }, [netProxy, tr]);
  const refreshStatus = (0, import_react2.useCallback)(async () => {
    const value = await api("/status");
    setStatus({ loading: false, ...value });
    return value;
  }, []);
  const refreshModels = (0, import_react2.useCallback)(async () => {
    const value = await api("/models");
    setModels(value);
    return value;
  }, []);
  const refreshQuotaAll = (0, import_react2.useCallback)(async () => {
    try {
      const value = await api("/quota-all", { method: "POST" });
      setQuotaAll(value);
      return value;
    } catch {
      return void 0;
    }
  }, []);
  const saveModels = (0, import_react2.useCallback)(async (enabledModelIds) => {
    setModelBusy(true);
    setError("");
    try {
      const value = await api("/models", {
        method: "POST",
        body: JSON.stringify({ enabledModelIds })
      });
      setModels(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setModelBusy(false);
    }
  }, []);
  const refreshQuota = (0, import_react2.useCallback)(async () => {
    setBusy(true);
    setError("");
    try {
      const value = await api("/quota", { method: "POST" });
      setQuota(value);
      publishQuota(value);
      await refreshStatus();
      await refreshModels();
      await refreshQuotaAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [refreshStatus, refreshModels, refreshQuotaAll]);
  (0, import_react2.useEffect)(() => {
    installStyle();
    let cancelled = false;
    void refreshStatus().then((value) => {
      if (!cancelled && value.authenticated) {
        void refreshQuota();
        void refreshModels();
      }
    }).catch((err) => {
      if (!cancelled) {
        setStatus({ loading: false, authenticated: false, accounts: [] });
        setError(err instanceof Error ? err.message : String(err));
      }
    });
    void refreshNet();
    return () => {
      cancelled = true;
      if (pollRef.current !== void 0) window.clearInterval(pollRef.current);
    };
  }, [refreshQuota, refreshStatus, refreshModels, refreshNet]);
  const startLogin = (0, import_react2.useCallback)(async () => {
    setBusy(true);
    setError("");
    try {
      const value = await api("/login", { method: "POST" });
      if (value.authUrl) window.open(value.authUrl, "_blank", "noopener,noreferrer");
      if (pollRef.current !== void 0) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        try {
          const next = await refreshStatus();
          if (next.login && next.login.status === "complete") {
            window.clearInterval(pollRef.current);
            pollRef.current = void 0;
            await refreshQuota();
          }
          if (next.login && next.login.status === "error") {
            window.clearInterval(pollRef.current);
            pollRef.current = void 0;
            setError(next.login.error || tr("loginFailed"));
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }, 2e3);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [refreshQuota, refreshStatus, tr]);
  const switchAccount = (0, import_react2.useCallback)(async (accountId) => {
    setBusy(true);
    setError("");
    try {
      const value = await api("/switch", {
        method: "POST",
        body: JSON.stringify({ accountId })
      });
      setStatus({ loading: false, ...value });
      setQuota(void 0);
      setNotice(tr("accountSwitched", { email: value.email || accountId }));
      await refreshQuota();
    } catch (err) {
      setError(`${tr("switchFailed")}\uFF1A${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }, [refreshQuota, tr]);
  const removeAccount = (0, import_react2.useCallback)(async (accountId) => {
    setBusy(true);
    setError("");
    try {
      const value = await api("/remove", {
        method: "POST",
        body: JSON.stringify({ accountId })
      });
      setStatus({ loading: false, ...value });
      setQuota(void 0);
      setQuotaAll(void 0);
      if (value.authenticated) await refreshQuota();
    } catch (err) {
      setError(`${tr("removeFailed")}\uFF1A${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }, [refreshQuota, tr]);
  const accountList = Array.isArray(status.accounts) && status.accounts.length > 0 ? status.accounts : status.authenticated ? [{ id: status.activeAccountId ?? status.email ?? "active", email: status.email, active: true, expires: 0 }] : [];
  const toggleModel = (0, import_react2.useCallback)((modelId, enabled) => {
    const current = new Set((models?.options?.filter((option) => option.enabled) ?? []).map((option) => option.id));
    if (enabled) current.add(modelId);
    else current.delete(modelId);
    void saveModels([...current]);
  }, [models, saveModels]);
  const setAllModels = (0, import_react2.useCallback)((enabled) => {
    const ids = enabled ? models?.options?.map((option) => option.id) ?? [] : [];
    void saveModels(ids);
  }, [models, saveModels]);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dgo-wrap", children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dgo-page-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(GeminiIcon, { size: 24, className: "dgo-brand-icon" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h2", { className: "dgo-page-title", children: "Gemini OAuth \u767B\u5F55" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "dgo-page-desc", children: tr("pageDesc") }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("section", { className: "dgo-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dgo-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dgo-title", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(GeminiIcon, { size: 18, className: "dgo-brand-icon" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: tr("currentAccount") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dgo-actions", children: [
          !status.authenticated && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            "button",
            {
              className: "dgo-btn dgo-btn-primary",
              disabled: busy,
              onClick: startLogin,
              children: busy ? tr("loggingIn") : tr("login")
            }
          ),
          status.authenticated && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            "button",
            {
              className: "dgo-btn dgo-btn-primary",
              disabled: busy,
              onClick: refreshQuota,
              children: busy ? tr("refreshing") : tr("refresh")
            }
          ),
          status.authenticated && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            "button",
            {
              className: "dgo-btn",
              disabled: busy,
              onClick: () => void startLogin(),
              children: busy ? tr("loggingIn") : tr("addAccount")
            }
          )
        ] })
      ] }),
      !status.authenticated ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dgo-accounts-empty", children: tr("notSignedInDesc") }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        AccountList,
        {
          accounts: accountList,
          quotaAll,
          busy,
          onSwitch: switchAccount,
          onRemove: removeAccount,
          t: tr
        }
      ),
      !status.authenticated && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dgo-empty", children: tr("notSignedInDesc") }),
      status.authenticated && !quota && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dgo-empty", children: busy ? tr("fetchingQuota") : tr("noQuotaDesc") }),
      status.authenticated && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(QuotaSection, { quota: quota ?? null, t: tr }),
      error && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dgo-error", children: error }),
      notice && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dgo-note", children: notice }),
      quota && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dgo-note", children: tr("updatedAt", { time: new Date(quota.fetchedAt).toLocaleString() }) })
    ] }),
    status.authenticated && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      ModelSelector,
      {
        options: models?.options ?? [],
        busy: modelBusy,
        onToggle: toggleModel,
        onSetAll: setAllModels,
        t: tr
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      NetworkSection,
      {
        proxy: netProxy,
        loaded: netLoaded,
        supported: netSupported,
        busy: netBusy,
        status: netStatus,
        onChange: (val) => {
          setNetProxy(val);
          setNetStatus(void 0);
        },
        onSave: () => void saveNet(),
        t: tr
      }
    )
  ] });
}

// src/client/components/GeminiUsageChip.tsx
var import_react3 = require("react");
var import_jsx_runtime8 = require("react/jsx-runtime");
function GeminiUsageChip() {
  const [quotaData, setQuotaData] = (0, import_react3.useState)(sharedQuota);
  (0, import_react3.useEffect)(() => {
    startGlobalPolling();
    const handler = (q) => setQuotaData(q);
    quotaListeners.add(handler);
    if (sharedQuota) setQuotaData(sharedQuota);
    return () => {
      quotaListeners.delete(handler);
    };
  }, []);
  if (!quotaData) return null;
  const parsed = parseQuota(quotaData);
  if (parsed.gemini5h === null) return null;
  const isDanger = parsed.geminiWeek !== null && parsed.geminiWeek < 10;
  const displayVal = isDanger ? parsed.geminiWeek : parsed.gemini5h;
  const displayText = isDanger ? `\u5468\u544A\u6025 (${displayVal}%)` : `${displayVal}% \u5269\u4F59`;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: `dgo-chip ${isDanger ? "dgo-chip-danger" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(GeminiIcon, { size: 14, className: "dgo-chip-icon" }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: displayText }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dgo-tooltip", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "dgo-tt-title", children: "Gemini \u989D\u5EA6\u8BE6\u60C5" }),
      parsed.gemini5h !== null && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dgo-tt-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "Gemini 5\u5C0F\u65F6\u5269\u4F59\uFF1A" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dgo-tt-val", children: `${parsed.gemini5h}%` })
      ] }),
      parsed.geminiWeek !== null && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dgo-tt-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "Gemini \u672C\u5468\u5269\u4F59\uFF1A" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dgo-tt-val", children: `${parsed.geminiWeek}%` })
      ] }),
      parsed.claude5h !== null && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dgo-tt-row", style: { marginTop: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "Claude/GPT 5h\u5269\u4F59\uFF1A" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dgo-tt-val", children: `${parsed.claude5h}%` })
      ] }),
      parsed.claudeWeek !== null && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dgo-tt-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "Claude/GPT \u672C\u5468\u5269\u4F59\uFF1A" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dgo-tt-val", children: `${parsed.claudeWeek}%` })
      ] })
    ] })
  ] });
}

// src/client/index.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
var inject = ["slots", "locale"];
function apply(ctx) {
  installStyle();
  if (ctx.locale && typeof ctx.locale.register === "function") {
    ctx.locale.register(NS, { zh, en });
  }
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "gemini-oauth",
    order: 13,
    label: () => "Gemini OAuth \u767B\u5F55",
    icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(GeminiIcon, { size: 14 })
  }, (props) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(GeminiSettings, { ...props, ctx })));
  ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
    name: "conversation.composer.dock",
    id: "dsh-gemini-oauth-usage-dock",
    order: -90,
    label: () => "Gemini OAuth"
  }, (props) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(GeminiUsageChip, { ...props })));
}


		return module.exports;
	}
});
