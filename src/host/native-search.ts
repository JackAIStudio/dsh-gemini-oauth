// Native Google Search Grounding for dsh-gemini-oauth

import { randomUUID } from "node:crypto";
import { ENDPOINTS } from "../common/constants";
import { ccaHeaders, projectForEndpoint } from "./cca-client";
import { runtimeModelId } from "./catalog";
import { GemOAuthRuntime } from "./adapter";
import { publicAccountId, safeJson } from "./store";

export const GEMINI_NATIVE_SEARCH_SERVICE = "geminiNativeSearch";

export interface GeminiSearchSource {
  url: string;
  title?: string;
  snippet?: string;
}

export interface GeminiSearchResult {
  sources: GeminiSearchSource[];
  truncated: boolean;
}

export interface GeminiNativeSearch {
  available(): boolean;
  search(
    query: string,
    options?: { model?: string; maxResults?: number; signal?: AbortSignal }
  ): Promise<GeminiSearchResult>;
}

function pushSource(
  sources: GeminiSearchSource[],
  seen: Set<string>,
  url: unknown,
  title?: unknown,
  snippet?: unknown
) {
  if (typeof url !== "string" || !/^https?:\/\//u.test(url)) return;
  const label = typeof title === "string" && title.length > 0 && title !== url ? title.trim() : undefined;
  const excerpt = typeof snippet === "string" && snippet.length > 0 ? snippet.trim() : undefined;

  if (seen.has(url)) {
    const existing = sources.find((s) => s.url === url);
    if (existing !== undefined) {
      if (existing.title === undefined && label !== undefined) existing.title = label;
      if (existing.snippet === undefined && excerpt !== undefined) existing.snippet = excerpt;
    }
    return;
  }
  seen.add(url);
  const item: GeminiSearchSource = { url };
  if (label !== undefined) item.title = label;
  if (excerpt !== undefined) item.snippet = excerpt;
  sources.push(item);
}

function fillTitlesAndSnippetsFromText(sources: GeminiSearchSource[], seen: Set<string>, text: string) {
  const mdLinkRegex = /\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/gmu;
  for (const match of text.matchAll(mdLinkRegex)) {
    const title = match[1]?.trim();
    const url = match[2];
    if (url) pushSource(sources, seen, url, title);
  }
}

export function parseGeminiGroundingChunks(data: any, maxResults?: number): GeminiSearchResult {
  const sources: GeminiSearchSource[] = [];
  const seen = new Set<string>();

  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  let generatedText = "";

  for (const candidate of candidates) {
    // 1. 从 groundingMetadata 中读取 groundingChunks 和 groundingSupports
    const grounding = candidate?.groundingMetadata;
    const chunks = Array.isArray(grounding?.groundingChunks) ? grounding.groundingChunks : [];
    
    // 构建每个 chunk 的引用文本（如果有 supports）
    const snippetsByChunkIndex = new Map<number, string>();
    const supports = Array.isArray(grounding?.groundingSupports) ? grounding.groundingSupports : [];
    for (const support of supports) {
      const segText = support?.segment?.text;
      const indices = Array.isArray(support?.groundingChunkIndices) ? support.groundingChunkIndices : [];
      if (typeof segText === "string" && segText.length > 0) {
        for (const idx of indices) {
          if (typeof idx === "number" && !snippetsByChunkIndex.has(idx)) {
            snippetsByChunkIndex.set(idx, segText);
          }
        }
      }
    }

    chunks.forEach((chunk: any, idx: number) => {
      const web = chunk?.web;
      if (web && typeof web.uri === "string") {
        pushSource(sources, seen, web.uri, web.title, snippetsByChunkIndex.get(idx));
      }
    });

    // 2. 收集文本以作备用
    for (const part of candidate?.content?.parts ?? []) {
      if (typeof part?.text === "string") generatedText += `${part.text}\n`;
    }
  }

  // 3. 兜底提取
  if (sources.length === 0 && generatedText.length > 0) {
    fillTitlesAndSnippetsFromText(sources, seen, generatedText);
  }

  const limit = typeof maxResults === "number" && maxResults > 0 ? maxResults : sources.length;
  return {
    sources: sources.slice(0, limit),
    truncated: sources.length > limit,
  };
}

export async function geminiNativeWebSearch(input: {
  fetch: typeof fetch;
  access: string;
  projectId?: string;
  endpoint?: string;
  query: string;
  model?: string;
  maxResults?: number;
  signal?: AbortSignal;
}): Promise<GeminiSearchResult> {
  const query = input.query.trim();
  if (query.length === 0) throw new Error("gemini native search: query must be non-empty");

  const endpoint = input.endpoint || ENDPOINTS[0];
  const modelId = runtimeModelId(input.model && input.model.length > 0 ? input.model : "gemini-3.8-flash-tiered");

  const body = {
    project: input.projectId,
    model: modelId,
    request: {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Perform a Google search to answer: "${query}". Use the Google Search tool and provide accurate sources.`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 2048,
      },
      tools: [{ googleSearch: {} }],
    },
    requestType: "agent",
    userAgent: "antigravity",
    requestId: `search-${randomUUID()}`,
  };

  const response = await input.fetch(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: {
      ...ccaHeaders(input.access),
      accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal: input.signal,
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new Error(`gemini native search: HTTP ${response.status} ${raw.slice(0, 200)}`);
  }

  const text = await response.text();
  const lines = text.split("\n");
  const sources: GeminiSearchSource[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const payloadText = line.slice(5).trim();
    if (!payloadText || payloadText === "[DONE]") continue;
    const chunk = safeJson(payloadText);
    if (!chunk || !chunk.response) continue;

    const parsed = parseGeminiGroundingChunks(chunk.response, input.maxResults);
    for (const item of parsed.sources) {
      pushSource(sources, seen, item.url, item.title, item.snippet);
    }
  }

  const limit = typeof input.maxResults === "number" && input.maxResults > 0 ? input.maxResults : sources.length;
  return {
    sources: sources.slice(0, limit),
    truncated: sources.length > limit,
  };
}

export function installGeminiNativeSearch(
  ctx: { logger?: { error?: (error: unknown) => void; info?: (...args: any[]) => void } },
  input: {
    runtime: GemOAuthRuntime;
  }
): GeminiNativeSearch {
  return {
    available() {
      return true;
    },
    async search(query: string, options?: { model?: string; maxResults?: number; signal?: AbortSignal }) {
      const creds = await input.runtime.ensureAccess(options?.signal);
      const accountId = publicAccountId(creds);
      const endpoint = ENDPOINTS[0];
      const projectId = await projectForEndpoint(
        input.runtime.fetch,
        endpoint,
        creds.access,
        creds.projectId,
        accountId
      );

      return geminiNativeWebSearch({
        fetch: input.runtime.fetch,
        access: creds.access,
        projectId,
        endpoint,
        query,
        model: options?.model,
        maxResults: options?.maxResults,
        signal: options?.signal,
      });
    },
  };
}
