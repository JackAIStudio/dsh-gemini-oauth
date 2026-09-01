// Model catalog, descriptors, token limits, and aliases

import { PROVIDER, ENDPOINTS, RUNTIME_MODEL_ALIASES } from "../common/constants";
import type { AccountRecord, ModelDescriptor } from "../common/types";
import { postJson, projectForEndpoint } from "./cca-client";
import { publicAccountId } from "./store";

// Cloud Code Assist 各模型族的最大输出上限（超限 = HTTP 400）。
export function maxOutputTokensFor(modelId: string): number {
  if (modelId.startsWith("claude-")) return 64_000;
  if (modelId.startsWith("gpt-oss-")) return 32_768;
  // pro 系（含 gemini-pro-agent / gemini-3.1-pro-*）上限 65535，超 1 也会 400。
  if (modelId.startsWith("gemini-3.1-pro") || modelId.startsWith("gemini-pro-")) return 65_535;
  return 65_536;
}

export function modelDescriptor(
  id: string,
  name: string,
  family: "gemini" | "claude" | "gpt",
  extra: { maxOutputTokens?: number } = {},
): ModelDescriptor {
  const contextWindow = family === "gemini" ? 1_048_576 : family === "claude" ? 200_000 : 131_072;
  const isTiered = id.endsWith("-tiered");
  return {
    id,
    name,
    provider: PROVIDER,
    inputModalities: family === "gemini" ? ["text", "image"] : ["text"],
    thinking: true,
    contextWindow,
    maxTokens: extra.maxOutputTokens ?? maxOutputTokensFor(id),
    ...(isTiered
      ? {
        reasoning: {
          efforts: [
            { id: "low", name: "Low" },
            { id: "medium", name: "Medium" },
            { id: "high", name: "High" },
          ],
          defaultEffort: "high",
        },
      }
      : {}),
  };
}

export const STATIC_CATALOG: ModelDescriptor[] = [
  modelDescriptor("gemini-3.7-flash-tiered", "Gemini 3.7 Flash (Tiered)", "gemini"),
  modelDescriptor("gemini-3.6-flash-high", "Gemini 3.6 Flash (High)", "gemini"),
  modelDescriptor("gemini-3.6-flash-medium", "Gemini 3.6 Flash (Medium)", "gemini"),
  modelDescriptor("gemini-3.6-flash-low", "Gemini 3.6 Flash (Low)", "gemini"),
  modelDescriptor("gemini-3.5-flash-high", "Gemini 3.5 Flash (High)", "gemini"),
  modelDescriptor("gemini-3.5-flash-low", "Gemini 3.5 Flash (Low)", "gemini"),
  modelDescriptor("gemini-3.5-flash-extra-low", "Gemini 3.5 Flash (Extra Low)", "gemini"),
  modelDescriptor("gemini-pro-agent", "Gemini 3.1 Pro (High)", "gemini"),
  modelDescriptor("gemini-3.1-pro-low", "Gemini 3.1 Pro (Low)", "gemini"),
  modelDescriptor("gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite", "gemini"),
  modelDescriptor("gemini-2.5-pro", "Gemini 2.5 Pro", "gemini"),
  modelDescriptor("gemini-2.5-flash", "Gemini 2.5 Flash", "gemini"),
  modelDescriptor("gemini-2.5-flash-lite", "Gemini 2.5 Flash Lite", "gemini"),
  modelDescriptor("gemini-2.5-flash-thinking", "Gemini 2.5 Flash (Thinking)", "gemini"),
  modelDescriptor("gemini-3-flash", "Gemini 3 Flash", "gemini"),
  modelDescriptor("claude-sonnet-4-6", "Claude Sonnet 4.6 (Thinking)", "claude"),
  modelDescriptor("claude-opus-4-6-thinking", "Claude Opus 4.6 (Thinking)", "claude"),
  modelDescriptor("gpt-oss-120b-medium", "GPT-OSS 120B (Medium)", "gpt"),
];

export function skipInternalModelId(id: string): boolean {
  return /^(tab_|chat_)/i.test(id) || /(^|-)(image)$/i.test(id);
}

export function catalogFromLive(models: Record<string, any>): ModelDescriptor[] {
  const live = new Map(Object.entries(models ?? {}).filter(([id]) => !skipInternalModelId(id)));
  return STATIC_CATALOG.flatMap((entry) => {
    const info = live.get(entry.id);
    if (info === undefined) return [];
    return [{
      ...entry,
      name: typeof info.displayName === "string" && info.displayName.length > 0 ? info.displayName : entry.name,
      maxTokens: Number(info.maxOutputTokens) || entry.maxTokens,
      inputModalities: info.supportsImages === true ? ["text", "image"] : ["text"],
    }];
  });
}

export function effortToThinkingLevel(effort?: string): "HIGH" | "MEDIUM" | "LOW" {
  switch (effort) {
    case "xhigh":
    case "high": return "HIGH";
    case "medium": return "MEDIUM";
    case "low":
    case "minimal":
    case "off": return "LOW";
    default: return "MEDIUM";
  }
}

export function runtimeModelId(publicId: string): string {
  return RUNTIME_MODEL_ALIASES[publicId] ?? publicId;
}

export async function fetchCatalog(fetchImpl: typeof fetch, creds: AccountRecord): Promise<ModelDescriptor[]> {
  const accountId = publicAccountId(creds);
  for (const endpoint of ENDPOINTS) {
    const projectId = await projectForEndpoint(fetchImpl, endpoint, creds.access, creds.projectId, accountId);
    const r = await postJson(fetchImpl, endpoint, "/v1internal:fetchAvailableModels", creds.access, { project: projectId });
    if (r.ok && r.json && typeof r.json.models === "object" && r.json.models !== null) {
      return catalogFromLive(r.json.models);
    }
  }
  return STATIC_CATALOG;
}
