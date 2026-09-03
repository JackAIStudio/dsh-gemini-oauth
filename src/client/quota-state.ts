// Shared global quota state, polling, and parsing helpers

import type { QuotaSummary } from "../common/types";
import { api } from "./api";
import type { ParsedQuota, QuotaDataResponse, Translator } from "./types";

const FOCUS_DEBOUNCE_MS = 15000;

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
    const isGemini = group.displayName && /gemini/i.test(group.displayName);
    const isClaude = group.displayName && /claude|gpt|3p|openai|anthropic/i.test(group.displayName);
    if (!isGemini && !isClaude) continue;
    if (!Array.isArray(group.buckets)) continue;
    for (const bucket of group.buckets) {
      const is5h = (bucket.displayName && /5\s*hour|five\s*hour/i.test(bucket.displayName)) || bucket.bucketId === "gemini-5h" || bucket.bucketId === "3p-5h";
      const isWeek = (bucket.displayName && /week/i.test(bucket.displayName)) || bucket.bucketId === "gemini-weekly" || bucket.bucketId === "3p-weekly";
      const val = Math.max(0, Math.min(100, Math.round((bucket.remainingFraction ?? 0) * 1000) / 10));
      if (isGemini && is5h) parsed.gemini5h = val;
      if (isGemini && isWeek) parsed.geminiWeek = val;
      if (isClaude && is5h) parsed.claude5h = val;
      if (isClaude && isWeek) parsed.claudeWeek = val;
    }
  }
  return parsed;
}

export interface QuotaStoreState {
  quota: QuotaSummary | null;
  fetchedAt: string | null;
  loading: boolean;
}

export let sharedQuota: QuotaSummary | null = null;
export let sharedQuotaFetchedAt: string | null = null;
export let sharedQuotaLoading = false;
let lastFetchAt = 0;
export const quotaListeners = new Set<() => void>();
let quotaPollTimer: number | undefined = undefined;
let inFlightPoll: Promise<void> | null = null;

export function notifyQuotaListeners(): void {
  for (const fn of quotaListeners) {
    try {
      fn();
    } catch (_) {}
  }
}

export function publishQuota(value?: QuotaDataResponse | null): void {
  if (!value || !value.quota) return;
  sharedQuota = value.quota;
  sharedQuotaFetchedAt = value.fetchedAt || new Date().toISOString();
  sharedQuotaLoading = false;
  lastFetchAt = Date.now();
  notifyQuotaListeners();
}

export async function pollQuota(force = false): Promise<void> {
  if (
    !force &&
    ((typeof document !== "undefined" && (document.hidden || !document.hasFocus())) ||
      (lastFetchAt > 0 && Date.now() - lastFetchAt < FOCUS_DEBOUNCE_MS && sharedQuota !== null))
  ) {
    return;
  }

  if (inFlightPoll !== null) {
    return inFlightPoll;
  }

  sharedQuotaLoading = true;
  notifyQuotaListeners();

  inFlightPoll = (async () => {
    try {
      const val = await api<QuotaDataResponse>("/quota", { method: "POST" });
      if (val && val.quota) {
        sharedQuota = val.quota;
        sharedQuotaFetchedAt = val.fetchedAt || new Date().toISOString();
        lastFetchAt = Date.now();
      }
    } catch {
      // ignore
    } finally {
      sharedQuotaLoading = false;
      inFlightPoll = null;
      notifyQuotaListeners();
    }
  })();

  return inFlightPoll;
}

export function startGlobalPolling(): void {
  if (quotaPollTimer === undefined && typeof window !== "undefined") {
    void pollQuota(true);
    quotaPollTimer = window.setInterval(() => void pollQuota(false), 30000);
    window.addEventListener("visibilitychange", () => {
      if (!document.hidden) void pollQuota(false);
    });
    window.addEventListener("focus", () => void pollQuota(false));
  }
}
