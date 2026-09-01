// Client-specific types for dsh-gemini-oauth

import type {
  AccountView,
  ModelCatalogOption,
  QuotaGroup,
  QuotaSummary,
  StatusView,
  SettingsView,
  AccountQuotaResult,
} from "../common/types";

export interface ClientStatusState extends Partial<StatusView> {
  loading: boolean;
}

export interface QuotaDataResponse {
  quota?: QuotaSummary | null;
  fetchedAt: string;
  accountId?: string;
}

export interface QuotaAllResponse {
  accounts: AccountQuotaResult[];
  fetchedAt: string;
}

export interface ModelsDataResponse {
  options: ModelCatalogOption[];
  fetchedAt: string;
}

export interface ParsedQuota {
  gemini5h: number | null;
  geminiWeek: number | null;
  claude5h: number | null;
  claudeWeek: number | null;
}

export interface NetStatusState {
  ok: boolean;
  error?: string;
}

export interface Translator {
  (key: string, params?: Record<string, string | number>): string;
}
