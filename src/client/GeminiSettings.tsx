import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type {
  AccountView,
  ModelsView,
  QuotaAllView,
  SettingsView,
  StatusView,
} from "../common/types";
import { api, netFetch } from "./api";
import { createTranslator } from "./i18n";
import { installStyle } from "./styles";
import { publishQuota } from "./quota-state";
import { GeminiIcon } from "./components/GeminiIcon";
import { AccountList } from "./components/AccountList";
import { QuotaSection } from "./components/QuotaSection";
import { ModelSelector } from "./components/ModelSelector";
import { NetworkSection } from "./components/NetworkSection";
import type { ClientStatusState, NetStatusState, QuotaDataResponse } from "./types";

export function GeminiSettings({ ctx }: { ctx: any }) {
  const [, setLocaleRev] = useState(0);
  useEffect(() => {
    if (!ctx || !ctx.locale || typeof ctx.locale.subscribe !== "function") return;
    return ctx.locale.subscribe(() => setLocaleRev((r) => r + 1));
  }, [ctx]);

  const tr = useMemo(() => createTranslator(ctx), [ctx]);

  const [status, setStatus] = useState<ClientStatusState>({ loading: true });
  const [quota, setQuota] = useState<QuotaDataResponse | undefined>(undefined);
  const [quotaAll, setQuotaAll] = useState<QuotaAllView | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pollRef = useRef<number | undefined>(undefined);

  const [models, setModels] = useState<ModelsView | undefined>(undefined);
  const [modelBusy, setModelBusy] = useState(false);

  // 网络区：proxy 读写
  const [netProxy, setNetProxy] = useState("");
  const [netBusy, setNetBusy] = useState(false);
  const [netStatus, setNetStatus] = useState<NetStatusState | undefined>(undefined);
  const [netLoaded, setNetLoaded] = useState(false);
  const [netSupported, setNetSupported] = useState(true);

  const refreshNet = useCallback(async () => {
    try {
      const value = await netFetch<SettingsView>("/settings");
      setNetProxy(value && typeof value.proxy === "string" ? value.proxy : "");
      setNetSupported(true);
    } catch (err: any) {
      if (err && err.__netHostStale) setNetSupported(false);
    } finally {
      setNetLoaded(true);
    }
  }, []);

  const saveNet = useCallback(async () => {
    setNetBusy(true);
    setNetStatus(undefined);
    try {
      const value = await netFetch<SettingsView>("/settings", {
        method: "POST",
        body: JSON.stringify({ proxy: netProxy }),
      });
      setNetProxy(value && typeof value.proxy === "string" ? value.proxy : "");
      setNetStatus({ ok: true });
    } catch (err: any) {
      if (err && err.__netHostStale) {
        setNetStatus({ ok: false, error: tr("netNeedsRestart") });
      } else {
        setNetStatus({ ok: false, error: `${tr("proxySaveFailed")}：${err instanceof Error ? err.message : String(err)}` });
      }
    } finally {
      setNetBusy(false);
    }
  }, [netProxy, tr]);

  const refreshStatus = useCallback(async () => {
    const value = await api<StatusView>("/status");
    setStatus({ loading: false, ...value });
    return value;
  }, []);

  const refreshModels = useCallback(async () => {
    const value = await api<ModelsView>("/models");
    setModels(value);
    return value;
  }, []);

  const refreshQuotaAll = useCallback(async () => {
    try {
      const value = await api<QuotaAllView>("/quota-all", { method: "POST" });
      setQuotaAll(value);
      return value;
    } catch {
      return undefined;
    }
  }, []);

  const saveModels = useCallback(async (enabledModelIds: string[]) => {
    setModelBusy(true);
    setError("");
    try {
      const value = await api<ModelsView>("/models", {
        method: "POST",
        body: JSON.stringify({ enabledModelIds }),
      });
      setModels(value);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setModelBusy(false);
    }
  }, []);

  const refreshQuota = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const value = await api<QuotaDataResponse>("/quota", { method: "POST" });
      setQuota(value);
      publishQuota(value);
      await refreshStatus();
      await refreshModels();
      await refreshQuotaAll();
    } catch (err: any) {
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
          setStatus({ loading: false, authenticated: false, accounts: [] });
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
      const value = await api<{ authUrl?: string }>("/login", { method: "POST" });
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
        } catch (err: any) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }, 2000);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [refreshQuota, refreshStatus, tr]);

  const switchAccount = useCallback(async (accountId: string) => {
    setBusy(true);
    setError("");
    try {
      const value = await api<StatusView>("/switch", {
        method: "POST",
        body: JSON.stringify({ accountId }),
      });
      setStatus({ loading: false, ...value });
      setQuota(undefined);
      setNotice(tr("accountSwitched", { email: value.email || accountId }));
      await refreshQuota();
    } catch (err: any) {
      setError(`${tr("switchFailed")}：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }, [refreshQuota, tr]);

  const removeAccount = useCallback(async (accountId: string) => {
    setBusy(true);
    setError("");
    try {
      const value = await api<StatusView>("/remove", {
        method: "POST",
        body: JSON.stringify({ accountId }),
      });
      setStatus({ loading: false, ...value });
      setQuota(undefined);
      setQuotaAll(undefined);
      if (value.authenticated) await refreshQuota();
    } catch (err: any) {
      setError(`${tr("removeFailed")}：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }, [refreshQuota, tr]);

  const accountList: AccountView[] = Array.isArray(status.accounts) && status.accounts.length > 0
    ? status.accounts
    : (status.authenticated
        ? [{ id: status.activeAccountId ?? status.email ?? "active", email: status.email, active: true, expires: 0 }]
        : []);

  const toggleModel = useCallback((modelId: string, enabled: boolean) => {
    const current = new Set((models?.options?.filter((option) => option.enabled) ?? []).map((option) => option.id));
    if (enabled) current.add(modelId);
    else current.delete(modelId);
    void saveModels([...current]);
  }, [models, saveModels]);

  const setAllModels = useCallback((enabled: boolean) => {
    const ids = enabled
      ? (models?.options?.map((option) => option.id) ?? [])
      : [];
    void saveModels(ids);
  }, [models, saveModels]);

  return (
    <div className="dgo-wrap">
      <div className="dgo-page-head">
        <GeminiIcon size={24} className="dgo-brand-icon" />
        <h2 className="dgo-page-title">Gemini OAuth 登录</h2>
      </div>
      <p className="dgo-page-desc">{tr("pageDesc")}</p>

      <section className="dgo-card">
        <div className="dgo-head">
          <div className="dgo-title">
            <GeminiIcon size={18} className="dgo-brand-icon" />
            <span>{tr("currentAccount")}</span>
          </div>
          <div className="dgo-actions">
            {!status.authenticated && (
              <button
                className="dgo-btn dgo-btn-primary"
                disabled={busy}
                onClick={startLogin}
              >
                {busy ? tr("loggingIn") : tr("login")}
              </button>
            )}
            {status.authenticated && (
              <button
                className="dgo-btn dgo-btn-primary"
                disabled={busy}
                onClick={refreshQuota}
              >
                {busy ? tr("refreshing") : tr("refresh")}
              </button>
            )}
            {status.authenticated && (
              <button
                className="dgo-btn"
                disabled={busy}
                onClick={() => void startLogin()}
              >
                {busy ? tr("loggingIn") : tr("addAccount")}
              </button>
            )}
          </div>
        </div>

        {!status.authenticated ? (
          <div className="dgo-accounts-empty">{tr("notSignedInDesc")}</div>
        ) : (
          <AccountList
            accounts={accountList}
            quotaAll={quotaAll}
            busy={busy}
            onSwitch={switchAccount}
            onRemove={removeAccount}
            t={tr}
          />
        )}

        {!status.authenticated && (
          <div className="dgo-empty">{tr("notSignedInDesc")}</div>
        )}

        {status.authenticated && !quota && (
          <div className="dgo-empty">{busy ? tr("fetchingQuota") : tr("noQuotaDesc")}</div>
        )}

        {status.authenticated && (
          <QuotaSection quota={quota ?? null} t={tr} />
        )}

        {error && <div className="dgo-error">{error}</div>}
        {notice && <div className="dgo-note">{notice}</div>}
        {quota && (
          <div className="dgo-note">
            {tr("updatedAt", { time: new Date(quota.fetchedAt).toLocaleString() })}
          </div>
        )}
      </section>

      {status.authenticated && (
        <ModelSelector
          options={models?.options ?? []}
          busy={modelBusy}
          onToggle={toggleModel}
          onSetAll={setAllModels}
          t={tr}
        />
      )}

      <NetworkSection
        proxy={netProxy}
        loaded={netLoaded}
        supported={netSupported}
        busy={netBusy}
        status={netStatus}
        onChange={(val) => {
          setNetProxy(val);
          setNetStatus(undefined);
        }}
        onSave={() => void saveNet()}
        t={tr}
      />
    </div>
  );
}
