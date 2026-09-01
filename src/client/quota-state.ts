// Shared global quota state, polling, and parsing helpers

import type { QuotaSummary } from "../common/types";
import { api } from "./api";
import type { ParsedQuota, QuotaDataResponse, Translator } from "./types";

export function formatReset(resetTime: string | undefined, t: Translator): string {
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

export function parseQuota(rawQuota?: QuotaSummary | null): ParsedQuota {
  const parsed: ParsedQuota = { gemini5h: null, geminiWeek: null, claude5h: null, claudeWeek: null };
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

export let sharedQuota: QuotaSummary | null = null;
export const quotaListeners = new Set<(quota: QuotaSummary | null) => void>();
let quotaPollTimer: number | undefined = undefined;
let isPolling = false;

export function publishQuota(value?: QuotaDataResponse | null): void {
  if (!value || !value.quota) return;
  sharedQuota = value.quota;
  for (const fn of quotaListeners) fn(sharedQuota);
}

export async function pollQuota(force = false): Promise<void> {
  if (!force && (typeof document !== "undefined" && (document.hidden || !document.hasFocus()))) return;
  if (isPolling) return;
  isPolling = true;
  try {
    const val = await api<QuotaDataResponse>("/quota", { method: "POST" });
    if (val && val.quota) {
      sharedQuota = val.quota;
      for (const fn of quotaListeners) fn(sharedQuota);
    }
  } catch {
    // ignore
  } finally {
    isPolling = false;
  }
}

export function startGlobalPolling(): void {
  if (quotaPollTimer === undefined && typeof window !== "undefined") {
    pollQuota(true);
    quotaPollTimer = window.setInterval(() => pollQuota(false), 30000);
    window.addEventListener("visibilitychange", () => {
      if (!document.hidden) pollQuota(true);
    });
    window.addEventListener("focus", () => pollQuota(true));
  }
}
