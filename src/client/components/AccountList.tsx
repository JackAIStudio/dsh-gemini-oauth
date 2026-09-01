import React from "react";
import type { AccountQuotaResult, AccountView, QuotaAllView } from "../../common/types";
import { parseQuota } from "../quota-state";
import type { Translator } from "../types";

interface AccountListProps {
  accounts: AccountView[];
  quotaAll?: QuotaAllView;
  busy: boolean;
  onSwitch: (accountId: string) => void;
  onRemove: (accountId: string) => void;
  t: Translator;
}

export function AccountList({ accounts, quotaAll, busy, onSwitch, onRemove, t }: AccountListProps) {
  const quotaEntryOf = (accountId: string): AccountQuotaResult | undefined => {
    if (!quotaAll || !Array.isArray(quotaAll.accounts)) return undefined;
    return quotaAll.accounts.find((entry) => entry.accountId === accountId || entry.email === accountId);
  };

  const accountCaptionOf = (entry?: AccountQuotaResult): { text: string; error: boolean } | undefined => {
    if (entry === undefined) return undefined;
    if (entry.status === "error") return { text: `${t("quotaFailed")}：${entry.message ?? ""}`, error: true };
    if (entry.status !== "ok" || !entry.quota) return undefined;
    const parsed = parseQuota(entry.quota);
    const val = parsed.geminiWeek ?? parsed.gemini5h ?? parsed.claudeWeek ?? parsed.claude5h;
    return val === null ? undefined : { text: t("quotaRemaining", { val }), error: false };
  };

  return (
    <div className="dgo-account-list">
      {accounts.map((account) => {
        const caption = accountCaptionOf(quotaEntryOf(account.id));
        return (
          <div className="dgo-account-row" key={account.id}>
            <div className="dgo-account-main">
              <div className="dgo-email">
                <span className="dgo-email-mark" aria-hidden="true" />
                <span className="dgo-email-text">{account.email || account.id}</span>
              </div>
              <div className="dgo-account-meta">
                {account.active && <span className="dgo-active-badge">{t("accountActive")}</span>}
                {caption && (
                  <span className={`dgo-account-caption${caption.error ? " dgo-account-caption-error" : ""}`}>
                    {caption.text}
                  </span>
                )}
              </div>
            </div>
            <div className="dgo-account-actions">
              {!account.active && (
                <button
                  className="dgo-btn"
                  disabled={busy}
                  onClick={() => onSwitch(account.id)}
                >
                  {t("switchAccount")}
                </button>
              )}
              <button
                className="dgo-btn"
                disabled={busy}
                onClick={() => onRemove(account.id)}
              >
                {t("removeAccount")}
              </button>
            </div>
          </div>
        );
      })}
      <div className="dgo-accounts-help">{t("accountsHelp")}</div>
    </div>
  );
}
