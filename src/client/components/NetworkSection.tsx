import React from "react";
import type { NetStatusState, Translator } from "../types";

interface NetworkSectionProps {
  proxy: string;
  loaded: boolean;
  supported: boolean;
  busy: boolean;
  status?: NetStatusState;
  onChange: (proxy: string) => void;
  onSave: () => void;
  t: Translator;
}

export function NetworkSection({
  proxy,
  loaded,
  supported,
  busy,
  status,
  onChange,
  onSave,
  t,
}: NetworkSectionProps) {
  return (
    <section className="dgo-card dgo-net-card">
      <div className="dgo-net-head">
        <div>
          <div className="dgo-net-title">{t("network")}</div>
          <div className="dgo-net-desc">{t("netDesc")}</div>
        </div>
      </div>
      {!loaded ? (
        <div className="dgo-empty">{t("loading")}</div>
      ) : (
        <label htmlFor="dgo-net-proxy" style={{ display: "block" }}>
          <span className="dgo-net-label">{t("proxyLabel")}</span>
          <input
            id="dgo-net-proxy"
            className="dgo-net-input"
            type="text"
            value={proxy}
            autoComplete="off"
            spellCheck={false}
            placeholder={t("proxyPlaceholder")}
            disabled={busy || !supported}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      )}
      <p className="dgo-net-help">{t("proxyHelp")}</p>
      {!supported && <div className="dgo-net-status-error">{t("netNeedsRestart")}</div>}
      {supported && (
        <div className="dgo-net-actions">
          <button
            className="dgo-net-btn dgo-net-btn-primary"
            disabled={busy || !loaded}
            onClick={onSave}
          >
            {busy ? t("proxySaving") : t("proxySave")}
          </button>
        </div>
      )}
      {status && status.ok && <div className="dgo-net-status">{t("proxySaved")}</div>}
      {status && !status.ok && <div className="dgo-net-status-error">{status.error}</div>}
    </section>
  );
}
