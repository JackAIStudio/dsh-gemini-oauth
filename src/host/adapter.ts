// DSH LlmAdapter implementation for Gemini OAuth

import { LlmAdapter, LlmError } from "@deepseek-ai/dsh-llm";
import { PROVIDER, PROVIDER_NAME, MODEL_CACHE_TTL_MS } from "../common/constants";
import type { AccountRecord, ModelDescriptor } from "../common/types";
import { discoverProject, stableProjectId } from "./cca-client";
import { fetchCatalog, maxOutputTokensFor, STATIC_CATALOG } from "./catalog";
import {
  activeAccountFrom,
  deleteCredentialStore,
  findAccountIndex,
  publicAccountId,
  readCredentialStore,
  readModelConfig,
  removeAccount,
  upsertAccount,
  writeCredentialStore,
  writeModelConfig,
} from "./store";
import { tryRefreshCredential } from "./oauth";
import { streamChunks } from "./stream";
import type { CatalogCache } from "./types";

export function toResolvedModel(entry: ModelDescriptor): any {
  return {
    provider: PROVIDER,
    id: entry.id,
    name: entry.name,
    inputModalities: entry.inputModalities ?? ["text"],
    context: { contextWindow: entry.contextWindow ?? 1_048_576 },
    defaultMaxTokens: entry.maxTokens ?? 65_536,
    maxTokens: entry.maxTokens ?? 65_536,
    ...(entry.reasoning ? { reasoning: entry.reasoning } : {}),
  };
}

export class GemOAuthRuntime {
  fetch: typeof fetch;
  attachments: any;
  resolveAttachments?: () => any;
  catalogCache?: CatalogCache;

  constructor(attachments?: any) {
    this.fetch = globalThis.fetch;
    this.attachments = attachments;
    this.catalogCache = undefined;
  }

  setFetch(fetchImpl: typeof fetch): void {
    this.fetch = fetchImpl;
  }

  async ensureAccess(signal?: AbortSignal, accountId?: string): Promise<AccountRecord> {
    let store = await readCredentialStore();
    let account: AccountRecord | undefined;
    if (accountId === undefined) {
      account = activeAccountFrom(store);
    } else {
      const index = findAccountIndex(store, accountId);
      account = index >= 0 ? store.accounts[index] : undefined;
    }
    if (account === undefined) {
      throw new LlmError("Gemini OAuth 未登录 —— 请到「设置 → Gemini OAuth」完成 Google 登录", "AUTH");
    }
    if (account.expires < Date.now() + 300_000) {
      const refreshed = await tryRefreshCredential(this.fetch, account);
      if (refreshed.ok === true) {
        account = refreshed.creds;
        store = upsertAccount(store, account, false);
        await writeCredentialStore(store).catch(() => {});
      } else if (refreshed.ok === false && refreshed.network === false) {
        const targetId = publicAccountId(account) ?? accountId;
        if (targetId !== undefined) {
          const next = removeAccount(store, targetId);
          if (next.accounts.length === 0) await deleteCredentialStore().catch(() => {});
          else await writeCredentialStore(next).catch(() => {});
        }
        throw new LlmError("Gemini OAuth 登录已失效，请重新登录该账号", "AUTH");
      }
    }
    if (typeof account.projectId !== "string" || account.projectId.length === 0) {
      const projectId = await discoverProject(this.fetch, account.access)
        ?? stableProjectId(account.email || publicAccountId(account) || "gemini-oauth-default");
      account = { ...account, projectId };
      store = upsertAccount(store, account, false);
      await writeCredentialStore(store).catch(() => {});
    }
    if (signal?.aborted) throw new LlmError("Gemini OAuth 请求已取消", "ABORTED");
    return account;
  }

  resetCatalogCache(): void {
    this.catalogCache = undefined;
  }

  async catalog(signal?: AbortSignal): Promise<ModelDescriptor[]> {
    if (this.catalogCache !== undefined && this.catalogCache.expiresAt > Date.now()) {
      return this.catalogCache.list;
    }
    let list = STATIC_CATALOG;
    try {
      const creds = await this.ensureAccess(signal);
      list = await fetchCatalog(this.fetch, creds);
    } catch {
      // 未登录 / 在线校正失败时保留静态目录
    }
    this.catalogCache = { list, expiresAt: Date.now() + MODEL_CACHE_TTL_MS };
    return list;
  }

  async enabledModels(): Promise<Set<string> | undefined> {
    return readModelConfig();
  }

  async setEnabledModels(enabledModelIds: string[]): Promise<Set<string> | undefined> {
    await writeModelConfig(enabledModelIds);
    return readModelConfig();
  }
}

export class GemOAuthAdapter extends LlmAdapter {
  runtime: GemOAuthRuntime;

  constructor(runtime: GemOAuthRuntime) {
    super();
    this.runtime = runtime;
  }

  providerInfo(provider: string): { id: string; name: string } {
    return { id: provider, name: PROVIDER_NAME };
  }

  async listModels(_provider: string): Promise<any[]> {
    const catalog = await this.runtime.catalog();
    const enabled = await this.runtime.enabledModels();
    const visible = enabled === undefined
      ? catalog
      : catalog.filter((entry) => enabled.has(entry.id));
    return visible.map((entry) => toResolvedModel(entry));
  }

  async resolveModel(_provider: string, modelId: string, signal?: AbortSignal): Promise<any> {
    const catalog = await this.runtime.catalog(signal);
    const found = catalog.find((entry) => entry.id === modelId);
    return toResolvedModel(found ?? {
      id: modelId,
      name: modelId,
      provider: PROVIDER,
      inputModalities: modelId.startsWith("gemini-") ? ["text", "image"] : ["text"],
      thinking: true,
      contextWindow: 1_048_576,
      maxTokens: maxOutputTokensFor(modelId),
    });
  }

  async *stream(options: any): AsyncGenerator<any, void, unknown> {
    const creds = await this.runtime.ensureAccess(options.signal);
    const model = await this.resolveModel(options.provider, options.model, options.signal);
    const attachments = this.runtime.attachments
      ?? (typeof this.runtime.resolveAttachments === "function" ? this.runtime.resolveAttachments() : undefined);
    yield* streamChunks(this.runtime.fetch, options, model, creds, attachments);
  }
}
