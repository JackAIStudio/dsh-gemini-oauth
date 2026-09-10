import React, { useState, useEffect, useRef, useMemo } from "react";
import type { QuotaSummary } from "../../common/types";
import { GeminiIcon } from "./GeminiIcon";
import {
  formatReset,
  geminiQuotaBuckets,
  parseQuota,
  quotaBucketLabel,
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
  if (typeof document !== "undefined") {
    const phase = document.querySelector("[data-phase]")?.getAttribute("data-phase");
    if (phase === "hero" || phase === "settling") return true;
    if (phase === "active") return false;
  }
  if (typeof useSession !== "function") return true;
  const snap = useSession((s: any) => s);
  if (snap && typeof snap === "object") {
    if (snap.composerPhase === "blank") return true;
    if (snap.blank === true && snap.promptAttempted !== true) return true;
  }
  return false;
}

function buildTooltip(quota: QuotaSummary | null, fetchedAt: string | null, t: Translator): string {
  const buckets = geminiQuotaBuckets(quota);
  if (buckets.length === 0) return t("quota");
  const lines: string[] = ["Gemini 额度详情"];
  for (const b of buckets) {
    const pct = Math.max(0, Math.min(100, Math.round((b.remainingFraction ?? 0) * 1000) / 10));
    const resetStr = b.resetTime ? ` · ${t("resetPrefix", { time: formatReset(b.resetTime, t) })}` : "";
    lines.push(`${quotaBucketLabel(b, t)}：${pct}% 剩余${resetStr}`);
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
    if (sharedQuota === null) void pollQuota(true);
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
  if (!quota) {
    if (sharedQuotaLoading) {
      return (
        <div className="dgo-usage-dock">
          <button
            type="button"
            className="dgo-usage is-loading"
            title="Gemini 额度查询中..."
            aria-label="Gemini 额度查询中..."
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void pollQuota(true);
            }}
          >
            <span className="dgo-usage-mark">
              <GeminiIcon size={12} />
            </span>
            <span className="dgo-usage-amount">...</span>
          </button>
        </div>
      );
    }
    return null;
  }

  const parsed = parseQuota(quota);
  const primaryVal = parsed.gemini5h ?? parsed.geminiWeek;

  if (primaryVal === null || primaryVal === undefined) return null;

  const isWeekDanger = parsed.geminiWeek !== null && parsed.geminiWeek < 10;
  const is5hDanger = parsed.gemini5h !== null && parsed.gemini5h < 10;
  const isDanger = isWeekDanger || is5hDanger;
  const isWarn =
    (parsed.gemini5h !== null && parsed.gemini5h < 25) ||
    (parsed.geminiWeek !== null && parsed.geminiWeek < 25);

  const displayText = isWeekDanger
    ? `周告急 (${parsed.geminiWeek}%)`
    : is5hDanger
    ? `告急 (${primaryVal}%)`
    : `${primaryVal}% 剩余`;
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
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void pollQuota(true);
        }}
      >
        <span className="dgo-usage-mark">
          <GeminiIcon size={12} />
        </span>
        <span className="dgo-usage-amount">{displayText}</span>
      </button>
    </div>
  );
}
