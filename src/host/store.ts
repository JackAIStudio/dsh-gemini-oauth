// Credential store and model configuration management for dsh-gemini-oauth

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile, chmod } from "node:fs/promises";
import { dirname } from "node:path";
import { dshHomePath } from "@deepseek-ai/dsh-home-paths";
import {
  CREDENTIAL_FILENAME,
  MODEL_CONFIG_FILENAME,
  CREDENTIAL_VERSION,
  DEFAULT_CLIENT_ID,
  DEFAULT_CLIENT_SECRET,
} from "../common/constants";
import type { AccountRecord, CredentialStore } from "../common/types";
import type { ClientCredentialsConfig, ModelConfigData } from "./types";

export function credentialPath(): string {
  return dshHomePath(CREDENTIAL_FILENAME);
}

export function clientConfig(): ClientCredentialsConfig {
  return {
    clientId: process.env.GEMINI_OAUTH_CLIENT_ID || DEFAULT_CLIENT_ID,
    clientSecret: process.env.GEMINI_OAUTH_CLIENT_SECRET || DEFAULT_CLIENT_SECRET,
  };
}

export function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// ---- 多账号 store（v2：{ version, activeAccountId, accounts: [...] }）----
// 账号唯一键：email（小写）优先，缺 email 时用 projectId，再缺用 refresh 的指纹。
export function accountKeyOf(creds: Partial<AccountRecord>): string | undefined {
  if (typeof creds.email === "string" && creds.email.length > 0) return creds.email.toLowerCase();
  if (typeof creds.projectId === "string" && creds.projectId.length > 0) return creds.projectId;
  return undefined;
}

export function publicAccountId(creds: Partial<AccountRecord>): string | undefined {
  return accountKeyOf(creds) ?? (typeof creds.refresh === "string" && creds.refresh.length > 0
    ? createHash("sha1").update(`gemini:${creds.refresh}`).digest("hex").slice(0, 16)
    : undefined);
}

export function sameAccount(left: Partial<AccountRecord>, right: Partial<AccountRecord>): boolean {
  const leftKey = accountKeyOf(left);
  const rightKey = accountKeyOf(right);
  return leftKey !== undefined && rightKey !== undefined && leftKey === rightKey;
}

export function cloneAccount(creds: AccountRecord): AccountRecord {
  const out: AccountRecord = {
    access: creds.access,
    refresh: creds.refresh,
    expires: creds.expires,
  };
  if (typeof creds.projectId === "string" && creds.projectId.length > 0) out.projectId = creds.projectId;
  if (typeof creds.email === "string" && creds.email.length > 0) out.email = creds.email;
  if (typeof creds.tierName === "string" && creds.tierName.length > 0) out.tierName = creds.tierName;
  return out;
}

export function isAccountRecord(value: any): value is AccountRecord {
  return typeof value === "object" && value !== null
    && typeof value.access === "string" && value.access.length > 0
    && typeof value.refresh === "string" && value.refresh.length > 0
    && typeof value.expires === "number" && Number.isFinite(value.expires);
}

export function emptyStore(): CredentialStore {
  return { version: CREDENTIAL_VERSION, accounts: [] };
}

export function storeFromLegacy(creds: AccountRecord): CredentialStore {
  const cloned = cloneAccount(creds);
  const id = publicAccountId(cloned);
  return {
    version: CREDENTIAL_VERSION,
    ...(id !== undefined ? { activeAccountId: id } : {}),
    accounts: [cloned],
  };
}

export function findAccountIndex(store: CredentialStore, accountId: string | undefined): number {
  if (typeof accountId !== "string" || accountId.length === 0) return -1;
  const needle = accountId.trim();
  const lowered = needle.toLowerCase();
  return store.accounts.findIndex((account) =>
    publicAccountId(account) === needle
    || accountKeyOf(account) === needle
    || (typeof account.email === "string" && account.email.toLowerCase() === lowered));
}

export function activeAccountFrom(store: CredentialStore): AccountRecord | undefined {
  if (store.accounts.length === 0) return undefined;
  const index = findAccountIndex(store, store.activeAccountId);
  return store.accounts[index >= 0 ? index : 0];
}

export function upsertAccount(store: CredentialStore, creds: AccountRecord, activate = true): CredentialStore {
  const next = cloneAccount(creds);
  const accounts: AccountRecord[] = [];
  let replaced = false;
  for (const account of store.accounts) {
    if (sameAccount(account, next)) {
      accounts.push(next);
      replaced = true;
    } else {
      accounts.push(cloneAccount(account));
    }
  }
  if (!replaced) accounts.push(next);
  const activeId = activate === false && store.activeAccountId !== undefined
    ? store.activeAccountId
    : publicAccountId(next) ?? store.activeAccountId;
  return {
    version: CREDENTIAL_VERSION,
    ...(activeId !== undefined ? { activeAccountId: activeId } : {}),
    accounts,
  };
}

export function switchActiveAccount(store: CredentialStore, accountId: string): CredentialStore | undefined {
  const index = findAccountIndex(store, accountId);
  if (index < 0) return undefined;
  const id = publicAccountId(store.accounts[index]);
  return {
    version: CREDENTIAL_VERSION,
    ...(id !== undefined ? { activeAccountId: id } : {}),
    accounts: store.accounts.map(cloneAccount),
  };
}

export function removeAccount(store: CredentialStore, accountId: string): CredentialStore {
  const index = findAccountIndex(store, accountId);
  if (index < 0) {
    return store.accounts.length === 0 ? emptyStore() : {
      version: CREDENTIAL_VERSION,
      ...(store.activeAccountId !== undefined ? { activeAccountId: store.activeAccountId } : {}),
      accounts: store.accounts.map(cloneAccount),
    };
  }
  const accounts = store.accounts.filter((_, at) => at !== index).map(cloneAccount);
  if (accounts.length === 0) return emptyStore();
  const removedWasActive = findAccountIndex(store, store.activeAccountId) === index || store.activeAccountId === undefined;
  const nextActive = removedWasActive ? publicAccountId(accounts[0]) : store.activeAccountId;
  return {
    version: CREDENTIAL_VERSION,
    ...(nextActive !== undefined ? { activeAccountId: nextActive } : {}),
    accounts,
  };
}

export function decodeCredentialStore(raw: any): CredentialStore | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  // v2：accounts 数组。
  if (Array.isArray(raw.accounts)) {
    const accounts: AccountRecord[] = [];
    for (const entry of raw.accounts) {
      if (!isAccountRecord(entry)) return undefined;
      accounts.push(cloneAccount(entry));
    }
    const activeAccountId = typeof raw.activeAccountId === "string" && raw.activeAccountId.length > 0
      ? raw.activeAccountId
      : undefined;
    const store: CredentialStore = { version: CREDENTIAL_VERSION, accounts };
    if (activeAccountId !== undefined) store.activeAccountId = activeAccountId;
    const active = activeAccountFrom(store);
    if (active !== undefined) {
      const id = publicAccountId(active);
      if (id !== undefined) store.activeAccountId = id;
    } else {
      delete store.activeAccountId;
    }
    return store;
  }
  // v1 单账号（{ access, refresh, expires, projectId?, email? }）→ 迁移。
  if (!isAccountRecord(raw)) return undefined;
  return storeFromLegacy(raw);
}

export async function readCredentialStore(): Promise<CredentialStore> {
  let parsed: any;
  try {
    parsed = JSON.parse(await readFile(credentialPath(), "utf8"));
  } catch {
    return emptyStore();
  }
  const store = decodeCredentialStore(parsed);
  if (store === undefined) return emptyStore();
  // v1 → v2 迁移后立即落盘，保证后续写入都是新结构。
  if (!Array.isArray(parsed.accounts)) {
    await writeCredentialStore(store).catch(() => {});
  }
  return store;
}

export async function writeCredentialStore(store: CredentialStore): Promise<void> {
  await mkdir(dirname(credentialPath()), { recursive: true });
  const body = JSON.stringify({
    version: CREDENTIAL_VERSION,
    ...(store.activeAccountId !== undefined ? { activeAccountId: store.activeAccountId } : {}),
    accounts: store.accounts.map(cloneAccount),
  }, null, 2);
  const tmp = `${credentialPath()}.${process.pid}.tmp`;
  await writeFile(tmp, body, { mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, credentialPath());
}

export async function deleteCredentialStore(): Promise<void> {
  await unlink(credentialPath()).catch(() => {});
}

// ---------------------------------------------------------------------------
// 模型可见性白名单：$DSH_HOME/gemini-oauth-models.json
// ---------------------------------------------------------------------------
export function modelConfigPath(): string {
  return dshHomePath(MODEL_CONFIG_FILENAME);
}

export async function readModelConfig(): Promise<Set<string> | undefined> {
  try {
    const parsed = JSON.parse(await readFile(modelConfigPath(), "utf8")) as ModelConfigData;
    if (Array.isArray(parsed?.enabledModelIds)) {
      return new Set(parsed.enabledModelIds.filter((id) => typeof id === "string"));
    }
    return undefined; // 未配置 → 全部
  } catch {
    return undefined;
  }
}

export async function writeModelConfig(enabledModelIds: string[]): Promise<void> {
  await mkdir(dirname(modelConfigPath()), { recursive: true });
  const tmp = `${modelConfigPath()}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify({ enabledModelIds }, null, 2), { mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, modelConfigPath());
}

export async function resetModelConfig(): Promise<void> {
  await unlink(modelConfigPath()).catch(() => {});
}
