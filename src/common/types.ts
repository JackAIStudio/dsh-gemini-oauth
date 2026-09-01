// Common types for dsh-gemini-oauth

export interface AccountRecord {
  access: string;
  refresh: string;
  expires: number;
  projectId?: string;
  email?: string;
  tierName?: string;
}

export interface CredentialStore {
  version: number;
  activeAccountId?: string;
  accounts: AccountRecord[];
}

export interface ModelReasoningEffort {
  id: string;
  name: string;
}

export interface ModelDescriptor {
  id: string;
  name: string;
  provider: string;
  inputModalities: ("text" | "image")[];
  thinking: boolean;
  contextWindow: number;
  maxTokens: number;
  defaultMaxTokens?: number;
  reasoning?: {
    efforts: ModelReasoningEffort[];
    defaultEffort: string;
  };
}

export interface ModelCatalogOption {
  id: string;
  name: string;
  inputModalities: ("text" | "image")[];
  reasoning?: {
    efforts: ModelReasoningEffort[];
    defaultEffort: string;
  };
  enabled: boolean;
}

export interface QuotaBucket {
  displayName?: string;
  bucketId?: string;
  remainingFraction?: number;
  resetTime?: string;
}

export interface QuotaGroup {
  displayName?: string;
  description?: string;
  buckets?: QuotaBucket[];
}

export interface QuotaSummary {
  groups?: QuotaGroup[];
  [key: string]: unknown;
}

export interface AccountView {
  id: string;
  email?: string;
  expires: number;
  active: boolean;
}

export interface StatusView {
  authenticated: boolean;
  email?: string;
  tierName?: string;
  activeAccountId?: string;
  accounts: AccountView[];
  login?: {
    status: string;
    error?: string;
  };
}

export interface AccountQuotaResult {
  accountId: string;
  email?: string;
  active: boolean;
  status: "ok" | "error";
  quota?: QuotaSummary | null;
  message?: string;
}

export interface QuotaAllView {
  accounts: AccountQuotaResult[];
  fetchedAt: string;
}

export interface ModelsView {
  options: ModelCatalogOption[];
  fetchedAt: string;
}

export interface SettingsView {
  proxy: string;
  revision: number;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  value?: T;
  error?: string;
}
