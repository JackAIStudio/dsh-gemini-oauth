import React, { useState, useEffect, useRef, useMemo } from "react";
import type { QuotaSummary } from "../../common/types";
import { GeminiIcon } from "./GeminiIcon";
import {
  formatReset,
  parseQuota,
  quotaListeners,
  sharedQuota,
  sharedQuotaFetchedAt,
  sharedQuotaLoading,
  startGlobalPolling,
  pollQuota,
} from "../quota-state";
import { createTranslator } from "../i18n";
import type { Translator } from "../types";

export interface GeminiUsageChipProps {
  seat?: "dock" | "hero";
  useSession?: any;
  ctx?: any;
}

function isBlankComposer(useSession: any): boolean {
  return typeof useSession === "function" && useSession((s: any) => s?.composerPhase) === "blank";
}

function buildTooltip(quota: QuotaSummary | null, fetchedAt: string | null, t: Translator): string {
  if (!quota || !Array.isArray(quota.groups)) return t("quota");
  const lines: string[] = ["Gemini 额度详情"];
  for (const group of quota.groups) {
    if (!group.buckets || group.buckets.length === 0) continue;
    lines.push(`\n【${group.displayName || "额度"}】`);
    for (const b of group.buckets) {
      const pct = Math.max(0, Math.min(100, Math.round((b.remainingFraction ?? 0) * 1000) / 10));
      const resetStr = b.resetTime ? ` · ${t("resetPrefix", { time: formatReset(b.resetTime, t) })}` : "";
      lines.push(`${b.displayName || b.bucketId}：${pct}% 剩余${resetStr}`);
    }
  }
  if (fetchedAt) {
    try {
      const timeStr = new Date(fetchedAt).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      lines.push(`\n更新于 ${timeStr}`);
    } catch (_) {}
  }
  lines.push("点击刷新");
  return lines.join("\n");
}

export function GeminiUsageChip(props: GeminiUsageChipProps) {
  const [, bump] = useState(0);
  const blank = isBlankComposer(props.useSession);
  const running = typeof props.useSession === "function" ? props.useSession((s: any) => s?.running) : false;
  const prevRunning = useRef(running);

  const t = useMemo(() => createTranslator(props.ctx), [props.ctx]);

  useEffect(() => {
    startGlobalPolling();
    const handler = () => bump((n) => n + 1);
    quotaListeners.add(handler);
    return () => {
      quotaListeners.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (prevRunning.current === true && running === false) {
      void pollQuota(true);
    }
    prevRunning.current = running;
  }, [running]);

  // Seat check: hero only on blank composer, dock only in active conversation
  if (props.seat && (props.seat === "hero") !== blank) {
    return null;
  }

  const quota = sharedQuota;
  if (!quota) return null;

  const parsed = parseQuota(quota);
  const primaryVal =
    parsed.geminiWeek !== null && parsed.gemini5h !== null
      ? Math.min(parsed.geminiWeek, parsed.gemini5h)
      : parsed.geminiWeek ?? parsed.gemini5h ?? parsed.claudeWeek ?? parsed.claude5h;

  if (primaryVal === null || primaryVal === undefined) return null;

  const isDanger = primaryVal < 10;
  const isWarn = primaryVal < 25;
  const displayText = isDanger ? `周告急 (${primaryVal}%)` : `${primaryVal}% 剩余`;
  const loading = sharedQuotaLoading;

  const className = [
    "dgo-usage",
    loading ? "is-loading" : "",
    isDanger ? "is-alert" : isWarn ? "is-warn" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tooltipTitle = buildTooltip(quota, sharedQuotaFetchedAt, t);

  return (
    <div className="dgo-usage-dock">
      <button
        type="button"
        className={className}
        title={tooltipTitle}
        aria-label={`Gemini ${displayText}`}
        onClick={() => void pollQuota(true)}
      >
        <span className="dgo-usage-mark">
          <GeminiIcon size={12} />
        </span>
        <span className="dgo-usage-amount">{displayText}</span>
      </button>
    </div>
  );
}
