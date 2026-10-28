// Wire protocol, tool schema normalization, thought signatures, and request building

import { randomUUID } from "node:crypto";
import { LlmError } from "@deepseek-ai/dsh-llm";
import { PROVIDER } from "../common/constants";
import type { ModelDescriptor } from "../common/types";
import { generationConfigFor, runtimeModelId } from "./catalog";

// Cloud Code Assist 的 Gemini 线用 Protobuf JSON 严格反序列化工具 schema，
// 只认下面这组键；$schema / $defs / $ref / additionalProperties 等任何其他
// 字段都会导致 HTTP 400。
export const ALLOWED_TOOL_SCHEMA_KEYS = new Set([
  "type",
  "description",
  "properties",
  "required",
  "items",
  "enum",
]);

export function normalizeToolSchema(node: any, defs?: Record<string, any>): any {
  if (node === null || node === undefined) return node;
  if (typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map((entry) => normalizeToolSchema(entry, defs));
  // zod 风格引用 schema：先把 #/$defs/Name 展开，再走白名单。
  if (typeof node.$ref === "string" && defs) {
    const refName = node.$ref.replace(/^#\/\$defs\//, "").replace(/^#\/definitions\//, "");
    const target = defs[refName];
    if (target !== undefined) return normalizeToolSchema(target, defs);
  }
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!ALLOWED_TOOL_SCHEMA_KEYS.has(key)) continue;
    if (key === "type") {
      out.type = Array.isArray(value)
        ? (value.find((entry) => typeof entry === "string" && entry !== "null") ?? "string")
        : value;
    } else if (key === "properties") {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        out.properties = {};
        for (const [name, schema] of Object.entries(value)) {
          out.properties[name] = normalizeToolSchema(schema, defs);
        }
      }
    } else if (key === "items") {
      out.items = normalizeToolSchema(value, defs);
    } else if (key === "required") {
      out.required = Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : value;
    } else if (key === "enum") {
      out.enum = value;
    } else if (key === "description") {
      out.description = value;
    }
  }
  return out;
}

export function serializeBlocks(blocks: any[]): string {
  return blocks.map((block) => {
    if (block.type === "text") return block.text;
    if (block.type === "reasoning") return "";
    if (block.type === "image") return "[image]";
    return "";
  }).filter((text) => text.length > 0).join("\n");
}

export const BASE64_SIGNATURE_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export function isValidThoughtSignature(signature: any): boolean {
  return typeof signature === "string"
    && signature.length > 0
    && signature.length % 4 === 0
    && BASE64_SIGNATURE_PATTERN.test(signature);
}

export function resolvedThoughtSignature(isSameProviderAndModel: boolean, signature: any): string | undefined {
  return isSameProviderAndModel && isValidThoughtSignature(signature) ? signature : undefined;
}

export function modelIdentity(message: any): { provider: string; model: string } {
  const source = message?.source ?? {};
  return {
    provider: source.provider ?? message?.provider ?? "",
    model: source.model ?? message?.model ?? "",
  };
}

export function isGeminiFamily(modelId: string): boolean {
  return !modelId.startsWith("claude-") && !modelId.startsWith("gpt-oss-");
}

/**
 * 把一次工具调用的结果翻成一个或多个 CCA part。
 *
 * Host 有两条投递路径：独立的 `role: "tool"` 消息（带 toolCallId / isError），
 * 以及 user 消息里的 `tool-result` 块。两条都必须变成 functionResponse，
 * 否则工具输出会被当成普通对话文本，CCA 侧就看不到与之配对的 tool_result。
 */
async function toolResultParts(
  toolCallId: any,
  content: any,
  isError: boolean,
  model: ModelDescriptor,
  attachments: any,
  signal: AbortSignal | undefined,
  toolNames: Map<string, string>,
): Promise<any[]> {
  const id = typeof toolCallId === "string" && toolCallId.length > 0 ? toolCallId : undefined;
  const name = (id !== undefined ? toolNames.get(id) : undefined) ?? "tool";
  const text = serializeBlocks(content ?? []);
  const response = isError === true ? { error: text } : { result: text };
  // Claude / GPT-OSS 走 Anthropic 兼容线：functionCall 与 functionResponse 必须带同一个
  // id，否则 CCA 认不出这是哪次调用的结果，报 "tool_use ids were found without
  // tool_result blocks immediately after"。Gemini 家不使用该字段，保持原样。
  const responseId = id !== undefined
    && (model.id.startsWith("claude-") || model.id.startsWith("gpt-oss-"))
    ? { id }
    : {};
  const parts: any[] = [{ functionResponse: { name, ...responseId, response } }];
  if (isError !== true && isGeminiFamily(model.id)) {
    for (const sub of content ?? []) {
      if (sub?.type !== "image") continue;
      if (!attachments || typeof attachments.readImage !== "function") break;
      const stored = await attachments.readImage(sub.attachment, signal);
      const mimeType = stored?.ref?.mediaType ?? sub.attachment?.mediaType ?? "image/jpeg";
      const data = stored?.data ?? new Uint8Array();
      parts.push({ inlineData: { mimeType, data: Buffer.from(data).toString("base64") } });
    }
  }
  return parts;
}

export async function buildContents(
  options: any,
  attachments: any,
  signal: AbortSignal | undefined,
  model: ModelDescriptor,
): Promise<any[]> {
  const contents: any[] = [];
  const toolNames = new Map<string, string>();
  const push = (role: string, parts: any[]) => {
    if (parts.length === 0) return;
    const last = contents[contents.length - 1];
    if (last && last.role === role && role === "user") {
      last.parts.push(...parts);
      return;
    }
    contents.push({ role, parts });
  };

  for (const message of options.messages ?? []) {
    // Host 以独立消息投递工具结果（role: "tool"）。必须先把它转成 functionResponse，
    // 否则会掉进下面的 user 分支被当成普通文本，CCA 侧就报 tool_use 缺 tool_result。
    if (message.role === "tool") {
      push("user", await toolResultParts(
        message.toolCallId,
        message.content,
        message.isError === true,
        model,
        attachments,
        signal,
        toolNames,
      ));
      continue;
    }
    if (message.role === "assistant") {
      const parts: any[] = [];
      const identity = modelIdentity(message);
      const isSameProviderAndModel = identity.provider === PROVIDER && identity.model === model.id;
      const replayBlocks = Array.isArray(message.source?.replayState?.blocks)
        ? message.source.replayState.blocks
        : [];
      let blockIndex = 0;
      for (const block of message.content ?? []) {
        const replayBlock = replayBlocks[blockIndex] ?? {};
        if (block.type === "text") {
          if (!block.text || block.text.trim() === "") {
            blockIndex++;
            continue;
          }
          const rawSig = replayBlock.textSignature ?? block.textSignature;
          const signature = resolvedThoughtSignature(isSameProviderAndModel, rawSig);
          parts.push({ text: block.text, ...(signature ? { thoughtSignature: signature } : {}) });
        } else if (block.type === "reasoning") {
          if (!block.text || block.text.trim() === "") {
            blockIndex++;
            continue;
          }
          if (isSameProviderAndModel) {
            const rawSig = replayBlock.thinkingSignature ?? block.thinkingSignature;
            const signature = resolvedThoughtSignature(isSameProviderAndModel, rawSig);
            parts.push({ thought: true, text: block.text, ...(signature ? { thoughtSignature: signature } : {}) });
          } else {
            parts.push({ text: block.text });
          }
        } else if (block.type === "tool-call") {
          toolNames.set(block.id, block.name);
          let args = {};
          try { args = JSON.parse(block.arguments); } catch { /* 保底空对象 */ }
          const rawSig = replayBlock.thoughtSignature ?? block.thoughtSignature;
          const signature = resolvedThoughtSignature(isSameProviderAndModel, rawSig);
          const functionCall: Record<string, any> = { name: block.name, args };
          if (model.id.startsWith("claude-") || model.id.startsWith("gpt-oss-")) {
            functionCall.id = block.id;
          }
          parts.push({ ...(signature ? { thoughtSignature: signature } : {}), functionCall });
        }
        blockIndex++;
      }
      push("model", parts);
      continue;
    }
    if (message.role === "system") continue;

    const parts: any[] = [];
    const results: any[] = [];
    for (const block of message.content ?? []) {
      if (block.type === "text") {
        parts.push({ text: block.text });
      } else if (block.type === "tool-result") {
        results.push(block);
      } else if (block.type === "image") {
        if (!attachments || typeof attachments.readImage !== "function") {
          throw new LlmError("Gemini OAuth — 图片输入需要 attachment 服务", "UNSUPPORTED_CONTENT");
        }
        const stored = await attachments.readImage(block.attachment, signal);
        const mimeType = stored?.ref?.mediaType ?? block.attachment?.mediaType ?? "image/png";
        const data = stored?.data ?? new Uint8Array();
        parts.push({ inlineData: { mimeType, data: Buffer.from(data).toString("base64") } });
      }
    }
    push("user", parts);

    for (const block of results) {
      push("user", await toolResultParts(
        block.toolCallId,
        block.content,
        block.isError === true,
        model,
        attachments,
        signal,
        toolNames,
      ));
    }
  }
  return contents;
}

export function buildTools(options: any): any[] | undefined {
  if (!options.tools || options.tools.length === 0) return undefined;
  return [{
    functionDeclarations: options.tools.map((tool: any) => {
      const params = tool.parameters;
      const defs = (typeof params === "object" && params !== null && !Array.isArray(params))
        ? (params.$defs ?? params.definitions)
        : undefined;
      return {
        name: tool.name,
        description: tool.description,
        parameters: normalizeToolSchema(params, defs),
      };
    }),
  }];
}

export async function buildRequest(
  options: any,
  model: ModelDescriptor,
  projectId: string | undefined,
  access: string,
  attachments: any,
  signal?: AbortSignal,
): Promise<any> {
  const request: Record<string, any> = {
    contents: await buildContents(options, attachments, signal, model),
  };
  if (typeof options.system === "string" && options.system.length > 0) {
    request.systemInstruction = { role: "user", parts: [{ text: options.system }] };
  }
  request.generationConfig = generationConfigFor(model, options);
  const tools = buildTools(options);
  if (tools) request.tools = tools;
  if (options.sessionId) request.sessionId = String(options.sessionId);

  return {
    project: projectId,
    model: runtimeModelId(model.id),
    request,
    requestType: "agent",
    userAgent: "antigravity",
    requestId: `agent-${randomUUID()}`,
  };
}
