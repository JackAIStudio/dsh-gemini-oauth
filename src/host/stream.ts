// SSE streaming, backoff retry, error attribution, and StreamChunk production

import { randomUUID } from "node:crypto";
import { LlmError, attributionHeaders } from "@deepseek-ai/dsh-llm";
const CallId = (id: string) => id as any;
import {
  ENDPOINTS,
  LOCATION_RETRY_PATTERN,
  TRANSIENT_BACKOFF_MS,
  LOCATION_HINT,
  GATED_ENDPOINT_HINT,
} from "../common/constants";
import type { AccountRecord, ModelDescriptor } from "../common/types";
import {
  ccaHeaders,
  egressDiagnostic,
  projectForEndpoint,
  resolveAccountProfile,
} from "./cca-client";
import { publicAccountId, safeJson } from "./store";
import { buildRequest, isValidThoughtSignature } from "./wire";

export function isJsonRecord(value: any): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeToolCallId(raw: any, fallbackName: string): string {
  const id = typeof raw === "string" && raw.length > 0 ? raw : `${fallbackName || "tool"}_${randomUUID()}`;
  return id.length <= 256 ? id : id.slice(0, 256);
}

export function sleepMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new LlmError("Gemini OAuth 请求已取消", "ABORTED"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new LlmError("Gemini OAuth 请求已取消", "ABORTED"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function friendlyError(status: number, text: string): string {
  const parsed = safeJson(text);
  if (isJsonRecord(parsed) && isJsonRecord(parsed.error) && typeof parsed.error.message === "string") {
    const details = parsed.error.details;
    if (Array.isArray(details) && details.length > 0) {
      const violators = details.flatMap((entry: any) =>
        Array.isArray(entry?.fieldViolations)
          ? entry.fieldViolations.map((violation: any) => violation?.field ?? "").filter((field: any) => typeof field === "string")
          : []);
      if (violators.length > 0) {
        return `${parsed.error.message}\n违规字段: ${[...new Set(violators)].slice(0, 5).join(", ")}`;
      }
    }
    return parsed.error.message;
  }
  return text.slice(0, 200);
}

export function classifyError(message: string): string {
  if (/\b(?:401|403)\b|invalid_grant|AUTH/i.test(message)) return "AUTH";
  if (/no capacity|capacity|503/i.test(message)) return "CAPACITY";
  if (/quota|RESOURCE_EXHAUSTED|exhausted/i.test(message)) return "QUOTA_EXCEEDED";
  if (/\b429\b|rate.?limit/i.test(message)) return "RATE_LIMIT";
  if (/\btimeout|timed out|aborted/i.test(message)) return "TIMEOUT";
  if (/fetch failed|econnreset|socket|transport|网络/i.test(message)) return "TRANSPORT";
  return "GEMINI_OAUTH_ERROR";
}

export async function* consumeSse(response: Response, _model: ModelDescriptor): AsyncGenerator<any, void, unknown> {
  if (response.body === null) throw new LlmError("Gemini OAuth 返回了空的响应流", "TRANSPORT");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const blocks: any[] = [];
  let current: any = undefined; // { type: 'text'|'reasoning', text, textSignature?, thinkingSignature? }
  let hasContent = false;
  let hasToolCall = false;
  let rawFinishReason: string | undefined = undefined;
  let usage: any = undefined;

  const closeCurrent = (out: any[]) => {
    if (current === undefined) return;
    const index = blocks.length - 1;
    const block = current.type === "text"
      ? { type: "text", text: current.text, ...(current.textSignature ? { textSignature: current.textSignature } : {}) }
      : { type: "reasoning", text: current.text, ...(current.thinkingSignature ? { thinkingSignature: current.thinkingSignature } : {}) };
    out.push({ type: "block-end", index, block });
    current = undefined;
  };

  const consume = (chunk: any) => {
    const out: any[] = [];
    if (!isJsonRecord(chunk.response)) return out;
    const data = chunk.response;
    const candidate = Array.isArray(data.candidates) ? data.candidates[0] : undefined;
    for (const part of candidate?.content?.parts ?? []) {
      if (!isJsonRecord(part)) continue;
      if (typeof part.text === "string") {
        const reasoning = part.thought === true;
        const blockType = reasoning ? "reasoning" : "text";
        if (current === undefined || current.type !== blockType) {
          closeCurrent(out);
          current = { type: blockType, text: "" };
          blocks.push(current);
          out.push({ type: "block-start", index: blocks.length - 1, blockType });
        }
        const index = blocks.length - 1;
        current.text += part.text;
        if (isValidThoughtSignature(part.thoughtSignature)) {
          if (reasoning) current.thinkingSignature = part.thoughtSignature;
          else current.textSignature = part.thoughtSignature;
        }
        hasContent = true;
        out.push({ type: reasoning ? "reasoning-delta" : "text-delta", index, text: part.text });
      }
      if (isJsonRecord(part.functionCall)) {
        closeCurrent(out);
        const toolName = typeof part.functionCall.name === "string" ? part.functionCall.name : "";
        const toolId = sanitizeToolCallId(part.functionCall.id, toolName);
        const args = isJsonRecord(part.functionCall.args) ? part.functionCall.args : {};
        const argsText = JSON.stringify(args);
        const index = blocks.length;
        const signature = isValidThoughtSignature(part.thoughtSignature) ? part.thoughtSignature : undefined;
        const block = {
          type: "tool-call",
          id: CallId(toolId),
          name: toolName,
          arguments: argsText,
          ...(signature ? { thoughtSignature: signature } : {}),
        };
        blocks.push(block);
        hasContent = true;
        hasToolCall = true;
        out.push({ type: "block-start", index, blockType: "tool-call" });
        out.push({ type: "tool-call-delta", index, id: CallId(toolId), name: toolName, argumentsDelta: argsText });
        out.push({ type: "block-end", index, block });
      }
    }
    if (typeof candidate?.finishReason === "string") rawFinishReason = candidate.finishReason;
    if (isJsonRecord(data.usageMetadata)) usage = data.usageMetadata;
    return out;
  };

  while (true) {
    let readResult: any;
    try {
      readResult = await reader.read();
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      const causeMsg = err?.cause?.message ? ` (${err.cause.message})` : "";
      throw new LlmError(`Gemini OAuth 数据流中断（${rawMsg}${causeMsg}），请检查代理连接稳定性。`, "TRANSPORT");
    }
    const { done, value } = readResult;
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const jsonText = line.slice(5).trim();
      if (jsonText.length === 0 || jsonText === "[DONE]") continue;
      const chunk = safeJson(jsonText);
      if (chunk === undefined) continue;
      if (isJsonRecord(chunk.error)) {
        const message = typeof chunk.error.message === "string" ? chunk.error.message : JSON.stringify(chunk.error);
        throw new LlmError(`Gemini OAuth 服务端错误：${message}`, classifyError(message));
      }
      for (const emitted of consume(chunk)) yield emitted;
    }
  }
  if (buffer.trim().length > 0 && buffer.startsWith("data:")) {
    for (const emitted of consume(safeJson(buffer.slice(5).trim()) ?? {})) yield emitted;
  }
  if (!hasContent) throw new LlmError("Gemini OAuth 返回了空响应", "EMPTY_RESPONSE");
  const finishOut: any[] = [];
  closeCurrent(finishOut);
  for (const emitted of finishOut) yield emitted;

  let reason: any;
  if (hasToolCall) reason = { kind: "tool-calls" };
  else if (rawFinishReason === "MAX_TOKENS") reason = { kind: "max-tokens" };
  else if (rawFinishReason === "STOP" || rawFinishReason === undefined) reason = { kind: "stop" };
  else reason = { kind: "error", failure: { message: `Gemini OAuth 结束原因：${rawFinishReason}`, code: "GEMINI_OAUTH_FINISH_REASON" } };

  if (usage !== undefined) {
    const cacheRead = Number(usage.cachedContentTokenCount) || 0;
    yield {
      type: "usage",
      usage: {
        inputTokens: Math.max(0, (Number(usage.promptTokenCount) || 0) - cacheRead),
        outputTokens: (Number(usage.candidatesTokenCount) || 0) + (Number(usage.thoughtsTokenCount) || 0),
        reasoningTokens: Number(usage.thoughtsTokenCount) || 0,
        ...(cacheRead > 0 ? { cacheReadTokens: cacheRead } : {}),
      },
    };
  }
  yield { type: "finish", reason };
}

export async function* streamChunks(
  fetchImpl: typeof fetch,
  options: any,
  model: ModelDescriptor,
  creds: AccountRecord,
  attachments: any,
): AsyncGenerator<any, void, unknown> {
  const accountId = publicAccountId(creds);
  const gcpManaged = await resolveAccountProfile(fetchImpl, creds.access, accountId);
  const endpoints = gcpManaged ? ENDPOINTS : [ENDPOINTS[0]];
  let lastStatus: number | undefined;
  let lastErrorText = "";
  const endpointErrors: string[] = [];

  for (const endpoint of endpoints) {
    if (options.signal?.aborted) throw new LlmError("Gemini OAuth 请求已取消", "ABORTED");
    const projectId = await projectForEndpoint(fetchImpl, endpoint, creds.access, creds.projectId, accountId);
    const body = JSON.stringify(await buildRequest(options, model, projectId, creds.access, attachments, options.signal));
    const attribution = attributionHeaders();
    const { "user-agent": attributionUa, ...attributionRest } = attribution as any;
    const mergedUa = attributionUa
      ? `antigravity/1.15.8 darwin/arm64 (${attributionUa})`
      : "antigravity/1.15.8 darwin/arm64";

    const sendOnce = async () => {
      const response = await fetchImpl(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: {
          ...ccaHeaders(creds.access),
          ...attributionRest,
          "user-agent": mergedUa,
          accept: "text/event-stream",
          ...(model.id.startsWith("claude-") ? { "anthropic-beta": "interleaved-thinking-2025-05-14" } : {}),
        },
        body,
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      });
      const text = response.ok ? "" : await response.text().catch(() => "");
      return { ok: response.ok, status: response.status, text, response };
    };

    const sendWithNetworkRetry = async () => {
      let netRetries = 0;
      const maxNetRetries = 1; // 严格仅重试 1 次快速自愈，避免掩盖节点坏死或导致会话长时间挂起
      while (true) {
        if (options.signal?.aborted) throw new LlmError("Gemini OAuth 请求已取消", "ABORTED");
        try {
          return await sendOnce();
        } catch (err: any) {
          if (options.signal?.aborted || err?.name === "AbortError" || err?.code === "ABORTED") {
            throw new LlmError("Gemini OAuth 请求已取消", "ABORTED");
          }
          if (netRetries < maxNetRetries) {
            netRetries++;
            // 快速等待 500ms：让系统连接池清理失效 Socket 并重新握手
            await sleepMs(500, options.signal);
            continue;
          }
          const rawMsg = err?.message || String(err);
          const causeMsg = err?.cause?.message ? ` (${err.cause.message})` : "";
          throw new LlmError(
            `Gemini OAuth 网络连接断开（${rawMsg}${causeMsg}）。已自动快速重试 1 次仍失败，请检查本地代理（ClashVerge）连接或节点状态。`,
            "TRANSPORT",
          );
        }
      }
    };

    let { ok, status, text, response } = await sendWithNetworkRetry();
    if (!ok && (status === 429 || (status === 400 && LOCATION_RETRY_PATTERN.test(text)))) {
      for (const delay of TRANSIENT_BACKOFF_MS.slice(1)) {
        await sleepMs(delay, options.signal);
        ({ ok, status, text, response } = await sendWithNetworkRetry());
        if (ok) break;
        if (!(status === 429 || (status === 400 && LOCATION_RETRY_PATTERN.test(text)))) break;
      }
    }
    lastStatus = status;
    if (ok) {
      yield* consumeSse(response, model);
      return;
    }
    lastErrorText = text;
    endpointErrors.push(`${endpoint.replace("https://", "")} -> HTTP ${status}: ${friendlyError(status, lastErrorText)}`);
    if (![400, 403, 404, 429, 500, 502, 503, 504].includes(status)) break;
  }

  const combined = endpointErrors.join("；");
  const code = classifyError(combined);
  const locationIssue = LOCATION_RETRY_PATTERN.test(combined);
  const quotaIssue = /\b429\b|quota|exhausted/i.test(combined);
  const gatedIssue = !gcpManaged && /cloudcode-pa\.googleapis\.com.*429/i.test(combined);
  const diag = (locationIssue || quotaIssue) && !gatedIssue ? await egressDiagnostic(fetchImpl) : undefined;
  throw new LlmError(
    `Gemini OAuth 请求失败：${combined || `HTTP ${lastStatus ?? "?"}`}` +
      `${gatedIssue ? `\n${GATED_ENDPOINT_HINT}` : ""}${locationIssue ? `\n${LOCATION_HINT}` : ""}` +
      `${diag ? `\n[出口诊断] 当前代理出口 ${diag.ip}${diag.country ? `（${diag.country}${diag.city ? ` ${diag.city}` : ""}` : ""}${diag.org ? ` / ${diag.org}` : ""}${diag.country ? "）" : ""}` : ""}`,
    code,
  );
}
