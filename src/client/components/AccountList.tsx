import React from "react";
import type { AccountQuotaResult, AccountView, QuotaAllView, QuotaSummary } from "../../common/types";
import { geminiQuotaBuckets } from "../quota-state";
import type { QuotaDataResponse, Translator } from "../types";
import { QuotaSection } from "./QuotaSection";

interface AccountListProps {
  accounts: AccountView[];
  quotaAll?: QuotaAllView;
  activeQuota?: QuotaDataResponse;
  busy: boolean;
  onSwitch: (accountId: string) => void;
  onRemove: (accountId: string) => void;
  t: Translator;
}

function quotaOf(
  account: AccountView,
  quotaAll?: QuotaAllView,
  activeQuota?: QuotaDataResponse,
): AccountQuotaResult | undefined {
  const fromAll = quotaAll?.accounts.find(
    (entry) => entry.accountId === account.id || entry.email === account.id || (account.email !== undefined && entry.email === account.email),
  );
  if (fromAll) return fromAll;
  if (account.active && activeQuota?.quota) {
    return {
      accountId: account.id,
      email: account.email,
      active: true,
      status: "ok",
      quota: activeQuota.quota,
    };
  }
  return undefined;
}

function geminiQuotaOrUndefined(quota?: QuotaSummary | null): QuotaSummary | null | undefined {
  if (!quota) return quota;
  return geminiQuotaBuckets(quota).length > 0 ? quota : undefined;
}

export function AccountList({ accounts, quotaAll, activeQuota, busy, onSwitch, onRemove, t }: AccountListProps) {
  return (
    <div className="dgo-account-list">
      {accounts.map((account) => {
        const entry = quotaOf(account, quotaAll, activeQuota);
        const geminiQuota = entry?.status === "ok" ? geminiQuotaOrUndefined(entry.quota) : undefined;
        const waiting = entry === undefined && (busy || quotaAll === undefined);
        return (
          <div className="dgo-account-row" key={account.id}>
            <div className="dgo-account-head">
              <div className="dgo-account-main">
                <div className="dgo-email">
                  <span className="dgo-email-mark" aria-hidden="true" />
                  <span className="dgo-email-text">{account.email || account.id}</span>
                </div>
                <div className="dgo-account-meta">
                  {account.active && <span className="dgo-active-badge">{t("accountActive")}</span>}
                  {entry?.status === "error" && (
                    <span className="dgo-account-caption dgo-account-caption-error">
                      {`${t("quotaFailed")}：${entry.message ?? ""}`}
                    </span>
                  )}
                  {waiting && <span className="dgo-account-caption">{t("fetchingQuota")}</span>}
                  {entry?.status === "ok" && !geminiQuota && !waiting && (
                    <span className="dgo-account-caption">{t("noQuotaDesc")}</span>
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
            {geminiQuota && <QuotaSection quota={geminiQuota} embedded t={t} />}
          </div>
        );
      })}
      <div className="dgo-accounts-help">{t("accountsHelp")}</div>
    </div>
  );
}
