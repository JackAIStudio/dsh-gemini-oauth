import React, { useState, useEffect } from "react";
import type { QuotaSummary } from "../../common/types";
import { GeminiIcon } from "./GeminiIcon";
import { parseQuota, quotaListeners, sharedQuota, startGlobalPolling } from "../quota-state";

export function GeminiUsageChip() {
  const [quotaData, setQuotaData] = useState<QuotaSummary | null>(sharedQuota);

  useEffect(() => {
    startGlobalPolling();
    const handler = (q: QuotaSummary | null) => setQuotaData(q);
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
  const displayText = isDanger ? `周告急 (${displayVal}%)` : `${displayVal}% 剩余`;

  return (
    <div className={`dgo-chip ${isDanger ? "dgo-chip-danger" : ""}`}>
      <GeminiIcon size={14} className="dgo-chip-icon" />
      <span>{displayText}</span>
      <div className="dgo-tooltip">
        <div className="dgo-tt-title">Gemini 额度详情</div>
        {parsed.gemini5h !== null && (
          <div className="dgo-tt-row">
            <span>Gemini 5小时剩余：</span>
            <span className="dgo-tt-val">{`${parsed.gemini5h}%`}</span>
          </div>
        )}
        {parsed.geminiWeek !== null && (
          <div className="dgo-tt-row">
            <span>Gemini 本周剩余：</span>
            <span className="dgo-tt-val">{`${parsed.geminiWeek}%`}</span>
          </div>
        )}
        {parsed.claude5h !== null && (
          <div className="dgo-tt-row" style={{ marginTop: 10 }}>
            <span>Claude/GPT 5h剩余：</span>
            <span className="dgo-tt-val">{`${parsed.claude5h}%`}</span>
          </div>
        )}
        {parsed.claudeWeek !== null && (
          <div className="dgo-tt-row">
            <span>Claude/GPT 本周剩余：</span>
            <span className="dgo-tt-val">{`${parsed.claudeWeek}%`}</span>
          </div>
        )}
      </div>
    </div>
  );
}
