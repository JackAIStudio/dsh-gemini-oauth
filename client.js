// dsh-gemini-oauth 客户端：设置 → Gemini OAuth 登录卡。
// 结构参照 LiZhenNet/dsh-antigravity 的 settings client（MIT），已精简：
// 保留账号、登录/退出/刷新与额度展示；模型清单由模型选择器直接消费。
window.__ModuleLoader__.load({
  id: "dsh-gemini-oauth",
  factory(require) {
    const React = require("react");
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const STYLE_ID = "dsh-gemini-oauth-settings-style";
    const API = "/gemini-oauth/api";
    const NS = "dsh-gemini-oauth";
    const GEMINI_SVG_PATH =
      "M12 2c-.6 5-4 8.5-9 9 5 .5 8.4 4 9 9 .6-5 4-8.5 9-9-5-.5-8.4-4-9-9Z";

    const zh = {
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

    const en = {
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

    function createTranslator(ctx) {
      const boundT = (ctx && ctx.locale && typeof ctx.locale.bind === "function")
        ? ctx.locale.bind(NS)
        : null;
      return function t(key, params) {
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

    function installStyle() {
      if (document.getElementById(STYLE_ID)) return;
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

    async function api(path, options) {
      const response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          "content-type": "application/json",
          ...(options && options.headers ? options.headers : {}),
        },
      });
      const body = await response.json().catch(() => ({ ok: false, error: "invalid-json" }));
      if (!response.ok || !body.ok) {
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      return body.value;
    }

    function GeminiIcon({ size = 20, className = "" }) {
      return React.createElement(
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
        },
        React.createElement("path", {
          d: GEMINI_SVG_PATH,
          fill: "currentColor",
        }),
      );
    }

    function formatReset(resetTime, t) {
      if (!resetTime) return "n/a";
      const timestamp = Date.parse(resetTime);
      if (!Number.isFinite(timestamp)) return resetTime;
      const delta = timestamp - Date.now();
      if (delta <= 0) return t("resetNow");
      const totalMinutes = Math.round(delta / 60000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;
      if (days > 0) return t("timeDayHour", { days, hours });
      if (hours > 0) return t("timeHourMin", { hours, minutes });
      return t("timeMin", { minutes });
    }

    function QuotaRow({ bucket, accent, t }) {
      const percent = Math.max(0, Math.min(100, Math.round((bucket.remainingFraction ?? 0) * 1000) / 10));
      return React.createElement("div", { className: "dgo-row" },
        React.createElement("div", { className: "dgo-rowtop" },
          React.createElement("div", null, bucket.displayName || bucket.bucketId || t("quota")),
          React.createElement("div", { className: "dgo-metrics" },
            React.createElement("span", null, t("resetPrefix", { time: formatReset(bucket.resetTime, t) })),
            React.createElement("span", { className: `dgo-percent${accent === "cyan" ? " dgo-percent-cyan" : ""}` }, `${percent}%`),
          ),
        ),
        React.createElement("div", { className: "dgo-bar" },
          React.createElement("div", {
            className: `dgo-fill${accent === "cyan" ? " dgo-fill-cyan" : ""}`,
            style: { width: `${percent}%` },
          }),
        ),
      );
    }

    function GeminiSettings({ ctx }) {
      const [, setLocaleRev] = useState(0);
      useEffect(() => {
        if (!ctx || !ctx.locale || typeof ctx.locale.subscribe !== "function") return;
        return ctx.locale.subscribe(() => setLocaleRev((r) => r + 1));
      }, [ctx]);

      const tr = useMemo(() => createTranslator(ctx), [ctx]);

      const [status, setStatus] = useState({ loading: true });
      const [quota, setQuota] = useState(undefined);
      const [quotaAll, setQuotaAll] = useState(undefined);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState("");
      const [notice, setNotice] = useState("");
      const pollRef = useRef(undefined);

      const [models, setModels] = useState(undefined);
      const [modelBusy, setModelBusy] = useState(false);

      // 网络区：proxy 读写。host 侧保存到 dsh-settings 后 applyTransport
      // 立即重建 fetch，因此这里保存后无需提示重启。
      const [netProxy, setNetProxy] = useState("");
      const [netBusy, setNetBusy] = useState(false);
      const [netStatus, setNetStatus] = useState(undefined); // { ok: true } | { ok: false, error }
      const [netLoaded, setNetLoaded] = useState(false);
      const [netSupported, setNetSupported] = useState(true);

      const netFetch = useCallback(async (path, options) => {
        const response = await fetch(`${API}${path}`, {
          ...options,
          headers: {
            "content-type": "application/json",
            ...(options && options.headers ? options.headers : {}),
          },
        });
        // 旧版 host 没有 /settings 路由（HTTP 404）：网络区降级为只读提示。
        if (response.status === 404) throw { __netHostStale: true };
        const body = await response.json().catch(() => ({ ok: false, error: "invalid-json" }));
        if (!response.ok || !body.ok) throw new Error(body.error || `HTTP ${response.status}`);
        return body.value;
      }, []);

      const refreshNet = useCallback(async () => {
        try {
          const value = await netFetch("/settings");
          setNetProxy(value && typeof value.proxy === "string" ? value.proxy : "");
          setNetSupported(true);
        } catch (err) {
          if (err && err.__netHostStale) setNetSupported(false);
        } finally {
          setNetLoaded(true);
        }
      }, [netFetch]);

      const saveNet = useCallback(async () => {
        setNetBusy(true);
        setNetStatus(undefined);
        try {
          const value = await netFetch("/settings", {
            method: "POST",
            body: JSON.stringify({ proxy: netProxy }),
          });
          setNetProxy(value && typeof value.proxy === "string" ? value.proxy : "");
          setNetStatus({ ok: true });
        } catch (err) {
          if (err && err.__netHostStale) {
            // host 侧尚未加载新版代码：提示重启而不是报一串 404。
            setNetStatus({ ok: false, error: tr("netNeedsRestart") });
          } else {
            setNetStatus({ ok: false, error: `${tr("proxySaveFailed")}：${err instanceof Error ? err.message : String(err)}` });
          }
        } finally {
          setNetBusy(false);
        }
      }, [netProxy, netFetch, tr]);

      const refreshStatus = useCallback(async () => {
        const value = await api("/status");
        setStatus({ loading: false, ...value });
        return value;
      }, []);

      const refreshModels = useCallback(async () => {
        const value = await api("/models");
        setModels(value);
        return value;
      }, []);

      // 每个已保存账号的额度摘要：老 host 没有 /quota-all 路由（404）时静默跳过。
      const refreshQuotaAll = useCallback(async () => {
        try {
          const value = await api("/quota-all", { method: "POST" });
          setQuotaAll(value);
          return value;
        } catch {
          return undefined;
        }
      }, []);

      const saveModels = useCallback(async (enabledModelIds) => {
        setModelBusy(true);
        setError("");
        try {
          const value = await api("/models", {
            method: "POST",
            body: JSON.stringify({ enabledModelIds }),
          });
          setModels(value);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setModelBusy(false);
        }
      }, []);

      const refreshQuota = useCallback(async () => {
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

      useEffect(() => {
        installStyle();
        let cancelled = false;
        void refreshStatus()
          .then((value) => {
            if (!cancelled && value.authenticated) {
              void refreshQuota();
              void refreshModels();
            }
          })
          .catch((err) => {
            if (!cancelled) {
              setStatus({ loading: false, authenticated: false });
              setError(err instanceof Error ? err.message : String(err));
            }
          });
        void refreshNet();
        return () => {
          cancelled = true;
          if (pollRef.current !== undefined) window.clearInterval(pollRef.current);
        };
      }, [refreshQuota, refreshStatus, refreshModels, refreshNet]);

      const startLogin = useCallback(async () => {
        setBusy(true);
        setError("");
        try {
          const value = await api("/login", { method: "POST" });
          if (value.authUrl) window.open(value.authUrl, "_blank", "noopener,noreferrer");
          if (pollRef.current !== undefined) window.clearInterval(pollRef.current);
          pollRef.current = window.setInterval(async () => {
            try {
              const next = await refreshStatus();
              if (next.login && next.login.status === "complete") {
                window.clearInterval(pollRef.current);
                pollRef.current = undefined;
                await refreshQuota();
              }
              if (next.login && next.login.status === "error") {
                window.clearInterval(pollRef.current);
                pollRef.current = undefined;
                setError(next.login.error || tr("loginFailed"));
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          }, 2000);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      }, [refreshQuota, refreshStatus, tr]);

      const logout = useCallback(async () => {
        setBusy(true);
        setError("");
        try {
          const value = await api("/logout", { method: "POST" });
          setStatus({ loading: false, ...value });
          setQuota(undefined);
          setQuotaAll(undefined);
          if (value.authenticated) await refreshQuota();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      }, [refreshQuota]);

      const switchAccount = useCallback(async (accountId) => {
        setBusy(true);
        setError("");
        try {
          const value = await api("/switch", {
            method: "POST",
            body: JSON.stringify({ accountId }),
          });
          setStatus({ loading: false, ...value });
          setQuota(undefined);
          setNotice(tr("accountSwitched", { email: value.email || accountId }));
          await refreshQuota();
        } catch (err) {
          setError(`${tr("switchFailed")}：${err instanceof Error ? err.message : String(err)}`);
        } finally {
          setBusy(false);
        }
      }, [refreshQuota, tr]);

      const removeAccount = useCallback(async (accountId) => {
        setBusy(true);
        setError("");
        try {
          const value = await api("/remove", {
            method: "POST",
            body: JSON.stringify({ accountId }),
          });
          setStatus({ loading: false, ...value });
          setQuota(undefined);
          setQuotaAll(undefined);
          if (value.authenticated) await refreshQuota();
        } catch (err) {
          setError(`${tr("removeFailed")}：${err instanceof Error ? err.message : String(err)}`);
        } finally {
          setBusy(false);
        }
      }, [refreshQuota, tr]);

      const quotaGroups = useMemo(() => {
        if (!quota || !quota.quota) return [];
        const groups = Array.isArray(quota.quota.groups) ? quota.quota.groups : [];
        return groups.map((group) => ({
          displayName: group.displayName,
          description: group.description,
          buckets: Array.isArray(group.buckets) ? group.buckets : [],
        })).filter((group) => group.buckets.length > 0);
      }, [quota]);

      const accountList = Array.isArray(status.accounts) && status.accounts.length > 0
        ? status.accounts
        : (status.authenticated
            ? [{ id: status.activeAccountId ?? status.email ?? "active", email: status.email, active: true }]
            : []);

      const quotaEntryOf = (accountId) => {
        if (!quotaAll || !Array.isArray(quotaAll.accounts)) return undefined;
        return quotaAll.accounts.find((entry) => entry.accountId === accountId || entry.email === accountId);
      };

      const accountCaptionOf = (entry) => {
        if (entry === undefined) return undefined;
        if (entry.status === "error") return { text: `${tr("quotaFailed")}：${entry.message ?? ""}`, error: true };
        if (entry.status !== "ok" || !entry.quota) return undefined;
        const parsed = parseQuota(entry.quota);
        const val = parsed.geminiWeek ?? parsed.gemini5h ?? parsed.claudeWeek ?? parsed.claude5h;
        return val === null ? undefined : { text: tr("quotaRemaining", { val }), error: false };
      };

      // 模型勾选：已启用在前，Gemini → Claude → GPT 家族排序，同族版本从新到旧。
      const familyOrder = (option) => {
        const text = `${option.id || ""} ${option.name || ""}`.toLowerCase();
        if (text.includes("gemini")) return 1;
        if (text.includes("claude")) return 2;
        if (text.includes("gpt")) return 3;
        return 4;
      };
      const versionOf = (option) => {
        const match = `${option.id} ${option.name}`.match(/(?:gemini|claude|gpt)[-_ ]*v?(\d+(?:\.\d+)*)/i)
          || `${option.id} ${option.name}`.match(/\b(\d+(?:\.\d+)+)\b/);
        if (!match) return [0];
        return match[1].split(".").map((num) => parseInt(num, 10) || 0);
      };
      const compareOptions = (a, b) => {
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
      };
      const modelOptions = useMemo(() => {
        const options = models && Array.isArray(models.options) ? models.options : [];
        return [...options].sort(compareOptions);
      }, [models]);

      const toggleModel = useCallback((modelId, enabled) => {
        const current = new Set((modelOptions.filter((option) => option.enabled)).map((option) => option.id));
        if (enabled) current.add(modelId);
        else current.delete(modelId);
        void saveModels([...current]);
      }, [modelOptions, saveModels]);

      const setAllModels = useCallback((enabled) => {
        const ids = enabled
          ? modelOptions.map((option) => option.id)
          : [];
        void saveModels(ids);
      }, [modelOptions, saveModels]);

      return React.createElement("div", { className: "dgo-wrap" },
        React.createElement("div", { className: "dgo-page-head" },
          React.createElement(GeminiIcon, { size: 24, className: "dgo-brand-icon" }),
          React.createElement("h2", { className: "dgo-page-title" }, "Gemini OAuth 登录"),
        ),
        React.createElement("p", { className: "dgo-page-desc" }, tr("pageDesc")),
        React.createElement("section", { className: "dgo-card" },
          React.createElement("div", { className: "dgo-head" },
            React.createElement("div", { className: "dgo-title" },
              React.createElement(GeminiIcon, { size: 18, className: "dgo-brand-icon" }),
              React.createElement("span", null, tr("currentAccount")),
            ),
            React.createElement("div", { className: "dgo-actions" },
              !status.authenticated && React.createElement("button", { className: "dgo-btn dgo-btn-primary", disabled: busy, onClick: startLogin }, busy ? tr("loggingIn") : tr("login")),
              status.authenticated && React.createElement("button", { className: "dgo-btn dgo-btn-primary", disabled: busy, onClick: refreshQuota }, busy ? tr("refreshing") : tr("refresh")),
              status.authenticated && React.createElement("button", { className: "dgo-btn", disabled: busy, onClick: () => void startLogin() }, busy ? tr("loggingIn") : tr("addAccount")),
            ),
          ),
          !status.authenticated
            ? React.createElement("div", { className: "dgo-accounts-empty" }, tr("notSignedInDesc"))
            : React.createElement("div", { className: "dgo-account-list" },
                accountList.map((account) => {
                  const caption = accountCaptionOf(quotaEntryOf(account.id));
                  return React.createElement("div", { className: "dgo-account-row", key: account.id },
                    React.createElement("div", { className: "dgo-account-main" },
                      React.createElement("div", { className: "dgo-email" },
                        React.createElement("span", { className: "dgo-email-mark", "aria-hidden": "true" }),
                        React.createElement("span", { className: "dgo-email-text" }, account.email || account.id),
                      ),
                      React.createElement("div", { className: "dgo-account-meta" },
                        account.active && React.createElement("span", { className: "dgo-active-badge" }, tr("accountActive")),
                        caption && React.createElement("span", { className: `dgo-account-caption${caption.error ? " dgo-account-caption-error" : ""}` }, caption.text),
                      ),
                    ),
                    React.createElement("div", { className: "dgo-account-actions" },
                      !account.active && React.createElement("button", { className: "dgo-btn", disabled: busy, onClick: () => void switchAccount(account.id) }, tr("switchAccount")),
                      React.createElement("button", { className: "dgo-btn", disabled: busy, onClick: () => void removeAccount(account.id) }, tr("removeAccount")),
                    ),
                  );
                }),
                React.createElement("div", { className: "dgo-accounts-help" }, tr("accountsHelp")),
              ),
          !status.authenticated && React.createElement("div", { className: "dgo-empty" }, tr("notSignedInDesc")),
          status.authenticated && !quota && React.createElement("div", { className: "dgo-empty" }, busy ? tr("fetchingQuota") : tr("noQuotaDesc")),
          status.authenticated && quotaGroups.length > 0 && React.createElement("div", { className: "dgo-quota-title" }, tr("quota")),
          status.authenticated && quotaGroups.map((group, index) => {
            const isCyan = /claude|gpt|3p|openai|anthropic/i.test(`${group.displayName || ""} ${group.description || ""}`);
            return React.createElement("div", { className: "dgo-quota-group", key: group.displayName || index },
              React.createElement("div", { className: "dgo-group-head" },
                React.createElement("span", { className: "dgo-group-title" }, group.displayName || tr("quota")),
                group.description && React.createElement("span", { className: "dgo-group-desc" }, group.description),
              ),
              group.buckets.map((bucket, bucketIndex) => React.createElement(QuotaRow, {
                key: bucket.bucketId || bucketIndex,
                bucket,
                accent: isCyan ? "cyan" : "green",
                t: tr,
              })),
            );
          }),
          error && React.createElement("div", { className: "dgo-error" }, error),
          notice && React.createElement("div", { className: "dgo-note" }, notice),
          quota && React.createElement("div", { className: "dgo-note" },
            tr("updatedAt", { time: new Date(quota.fetchedAt).toLocaleString() }),
          ),
        ),
        status.authenticated && React.createElement("section", { className: "dgo-card dgo-model-card" },
          React.createElement("div", { className: "dgo-model-head" },
            React.createElement("div", null,
              React.createElement("div", { className: "dgo-model-title" }, tr("modelSelector")),
              React.createElement("div", { className: "dgo-model-desc" }, tr("modelSelectorDesc")),
            ),
            React.createElement("div", { className: "dgo-mini-actions" },
              React.createElement("button", { className: "dgo-mini-btn", disabled: modelBusy, onClick: () => setAllModels(true) }, tr("selectAll")),
              React.createElement("button", { className: "dgo-mini-btn", disabled: modelBusy, onClick: () => setAllModels(false) }, tr("unselectAll")),
            ),
          ),
          modelOptions.length === 0
            ? React.createElement("div", { className: "dgo-empty" }, tr("loadingModels"))
            : React.createElement("div", { className: "dgo-model-list" },
                modelOptions.map((option) => React.createElement("label", { className: "dgo-model-row", key: option.id },
                  React.createElement("input", {
                    className: "dgo-check",
                    type: "checkbox",
                    checked: !!option.enabled,
                    disabled: modelBusy,
                    onChange: (event) => toggleModel(option.id, event.target.checked),
                  }),
                  React.createElement("span", { className: "dgo-model-text" },
                    React.createElement("span", { className: "dgo-model-name" }, option.name || option.id),
                    React.createElement("span", { className: "dgo-model-sub" }, option.id),
                  ),
                )),
              ),
          React.createElement("div", { className: "dgo-note" }, tr("modelSelectorNote")),
        ),
        React.createElement("section", { className: "dgo-card dgo-net-card" },
          React.createElement("div", { className: "dgo-net-head" },
            React.createElement("div", null,
              React.createElement("div", { className: "dgo-net-title" }, tr("network")),
              React.createElement("div", { className: "dgo-net-desc" }, tr("netDesc")),
            ),
          ),
          !netLoaded
            ? React.createElement("div", { className: "dgo-empty" }, tr("loading"))
            : React.createElement("label", { htmlFor: "dgo-net-proxy", style: { display: "block" } },
                React.createElement("span", { className: "dgo-net-label" }, tr("proxyLabel")),
                React.createElement("input", {
                  id: "dgo-net-proxy",
                  className: "dgo-net-input",
                  type: "text",
                  value: netProxy,
                  autoComplete: "off",
                  spellCheck: false,
                  placeholder: tr("proxyPlaceholder"),
                  disabled: netBusy || !netSupported,
                  onChange: (event) => {
                    setNetProxy(event.target.value);
                    setNetStatus(undefined);
                  },
                }),
              ),
          React.createElement("p", { className: "dgo-net-help" }, tr("proxyHelp")),
          !netSupported && React.createElement("div", { className: "dgo-net-status-error" }, tr("netNeedsRestart")),
          netSupported && React.createElement("div", { className: "dgo-net-actions" },
            React.createElement("button", {
              className: "dgo-net-btn dgo-net-btn-primary",
              disabled: netBusy || !netLoaded,
              onClick: () => void saveNet(),
            }, netBusy ? tr("proxySaving") : tr("proxySave")),
          ),
          netStatus && netStatus.ok && React.createElement("div", { className: "dgo-net-status" }, tr("proxySaved")),
          netStatus && !netStatus.ok && React.createElement("div", { className: "dgo-net-status-error" }, netStatus.error),
        ),
      );
    }

    let sharedQuota = null;
    let quotaListeners = new Set();
    let quotaPollTimer = undefined;
    let isPolling = false;

    // 设置页刷新/切换账号后同步给聊天 dock 的额度芯片（模块级共享状态）。
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
      } catch (err) {
        // ignore
      } finally {
        isPolling = false;
      }
    }

    function startGlobalPolling() {
      if (quotaPollTimer === undefined && typeof window !== "undefined") {
        pollQuota(true);
        quotaPollTimer = window.setInterval(() => pollQuota(false), 30000);
        window.addEventListener("visibilitychange", () => {
          if (!document.hidden) pollQuota(true);
        });
        window.addEventListener("focus", () => pollQuota(true));
      }
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
          const val = Math.max(0, Math.min(100, Math.round((bucket.remainingFraction ?? 0) * 1000) / 10));
          if (isGemini && is5h) parsed.gemini5h = val;
          if (isGemini && isWeek) parsed.geminiWeek = val;
          if (isClaude && is5h) parsed.claude5h = val;
          if (isClaude && isWeek) parsed.claudeWeek = val;
        }
      }
      return parsed;
    }

    function GeminiUsageChip() {
      const [quotaData, setQuotaData] = useState(sharedQuota);
      useEffect(() => {
        startGlobalPolling();
        const handler = (q) => setQuotaData(q);
        quotaListeners.add(handler);
        if (sharedQuota) setQuotaData(sharedQuota);
        return () => quotaListeners.delete(handler);
      }, []);

      if (!quotaData) return null;
      const parsed = parseQuota(quotaData);
      
      if (parsed.gemini5h === null) return null;

      const isDanger = parsed.geminiWeek !== null && parsed.geminiWeek < 10;
      const displayVal = isDanger ? parsed.geminiWeek : parsed.gemini5h;
      const displayText = isDanger ? `周告急 (${displayVal}%)` : `${displayVal}% 剩余`;

      return React.createElement("div", { className: `dgo-chip ${isDanger ? "dgo-chip-danger" : ""}` },
        React.createElement(GeminiIcon, { size: 14, className: "dgo-chip-icon" }),
        React.createElement("span", null, displayText),
        React.createElement("div", { className: "dgo-tooltip" },
          React.createElement("div", { className: "dgo-tt-title" }, "Gemini 额度详情"),
          parsed.gemini5h !== null && React.createElement("div", { className: "dgo-tt-row" },
            React.createElement("span", null, "Gemini 5小时剩余："),
            React.createElement("span", { className: "dgo-tt-val" }, `${parsed.gemini5h}%`)
          ),
          parsed.geminiWeek !== null && React.createElement("div", { className: "dgo-tt-row" },
            React.createElement("span", null, "Gemini 本周剩余："),
            React.createElement("span", { className: "dgo-tt-val" }, `${parsed.geminiWeek}%`)
          ),
          parsed.claude5h !== null && React.createElement("div", { className: "dgo-tt-row", style: { marginTop: 10 } },
            React.createElement("span", null, "Claude/GPT 5h剩余："),
            React.createElement("span", { className: "dgo-tt-val" }, `${parsed.claude5h}%`)
          ),
          parsed.claudeWeek !== null && React.createElement("div", { className: "dgo-tt-row" },
            React.createElement("span", null, "Claude/GPT 本周剩余："),
            React.createElement("span", { className: "dgo-tt-val" }, `${parsed.claudeWeek}%`)
          )
        )
      );
    }

    return {
      inject: ["slots", "locale"],
      apply(ctx) {
        installStyle();
        if (ctx.locale && typeof ctx.locale.register === "function") {
          ctx.locale.register(NS, { zh, en });
        }
        ctx.slots.inject("settings.section", () => ctx.slots.register({
          name: "settings.section",
          id: "gemini-oauth",
          order: 13,
          label: () => "Gemini OAuth 登录",
          icon: React.createElement(GeminiIcon, { size: 14 }),
        }, (props) => React.createElement(GeminiSettings, { ...props, ctx })));

        ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
          name: "conversation.composer.dock",
          id: "dsh-gemini-oauth-usage-dock",
          order: -90,
          label: () => "Gemini OAuth",
        }, (props) => React.createElement(GeminiUsageChip, props)));
      },
    };
  },
});
