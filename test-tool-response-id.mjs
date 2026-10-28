// 回归测试：Claude / GPT-OSS 线的 functionResponse 必须回带 functionCall 的 id。
// 否则 CCA 报 “tool_use ids were found without tool_result blocks immediately after”。
import assert from "node:assert/strict";
import { buildRequest } from "./index.js";

const claude = { id: "claude-opus-5-5-high", name: "Claude Opus 5.5 (High)", contextWindow: 1_000_000 };
const gemini = { id: "gemini-4-argon-high", name: "Gemini 4 Argon (High)", contextWindow: 1_048_576 };

const conversation = [
  { role: "user", content: [{ type: "text", text: "查一下" }] },
  {
    role: "assistant",
    source: { provider: "gemini-oauth", model: "claude-opus-5-5-high" },
    content: [
      { type: "tool-call", id: "call_a", name: "web_search", arguments: '{"queries":["x"]}' },
      { type: "tool-call", id: "call_b", name: "web_fetch", arguments: '{"url":"https://example.com"}' },
    ],
  },
  { role: "user", content: [{ type: "tool-result", toolCallId: "call_a", content: [{ type: "text", text: "No results found." }] }] },
  { role: "user", content: [{ type: "tool-result", toolCallId: "call_b", content: [{ type: "text", text: "blocked" }], isError: true }] },
];

const claudeReq = await buildRequest({ messages: conversation }, claude, "p", "t", null);
const claudeContents = claudeReq.request.contents;
const callIds = [];
const responseIds = [];
for (const message of claudeContents) {
  for (const part of message.parts) {
    if (part.functionCall !== undefined) callIds.push(part.functionCall.id);
    if (part.functionResponse !== undefined) responseIds.push(part.functionResponse.id);
  }
}
assert.deepEqual(callIds, ["call_a", "call_b"], "Claude functionCall 必须带原始 id");
assert.deepEqual(responseIds, ["call_a", "call_b"], "Claude functionResponse 必须回带同一个 id");
console.log("  ✅ Claude 线的 functionResponse 回带了 functionCall 的 id");

// Host 的真实投递形态：工具结果是独立的 role: "tool" 消息，不是 user 里的块。
const toolMessageConversation = [
  { role: "user", content: [{ type: "text", text: "查一下" }] },
  {
    role: "assistant",
    source: { provider: "gemini-oauth", model: "claude-opus-5-5-high" },
    content: [
      { type: "tool-call", id: "call_a", name: "web_search", arguments: "{}" },
      { type: "tool-call", id: "call_b", name: "web_fetch", arguments: "{}" },
    ],
  },
  { role: "tool", toolCallId: "call_a", content: [{ type: "text", text: "No results found." }], isError: false },
  { role: "tool", toolCallId: "call_b", content: [{ type: "text", text: "blocked" }], isError: true },
];

const hostReq = await buildRequest({ messages: toolMessageConversation }, claude, "p", "t", null);
const hostParts = hostReq.request.contents.flatMap((message) => message.parts);
const hostResponses = hostParts.filter((part) => part.functionResponse !== undefined);
assert.equal(hostResponses.length, 2, "role: tool 消息必须转成 functionResponse，不能退化成文本");
assert.deepEqual(hostResponses.map((part) => part.functionResponse.id), ["call_a", "call_b"]);
assert.deepEqual(hostResponses.map((part) => part.functionResponse.name), ["web_search", "web_fetch"]);
assert.equal(hostResponses[1].functionResponse.response.error, "blocked", "失败的工具调用保留 error 语义");
const leakedText = hostParts.filter((part) => part.text === "No results found." || part.text === "blocked");
assert.equal(leakedText.length, 0, "工具输出不应作为普通文本重复出现");
console.log("  ✅ role: tool 的独立工具结果被正确转成 functionResponse");

const geminiReq = await buildRequest({ messages: conversation }, gemini, "p", "t", null);
const geminiResponses = geminiReq.request.contents
  .flatMap((message) => message.parts)
  .filter((part) => part.functionResponse !== undefined);
assert.equal(geminiResponses.length, 2, "Gemini 应保留两个 functionResponse");
assert.ok(geminiResponses.every((part) => part.functionResponse.id === undefined), "Gemini 线不注入 id");
console.log("  ✅ Gemini 线的 functionResponse 未被注入 id");
