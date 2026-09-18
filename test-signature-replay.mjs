import assert from "node:assert/strict";
import { buildRequest } from "./index.js";

console.log("Testing buildRequest with replayState and legacy thoughtSignature...");

const fakeModel = { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000 };

const sig1 = Buffer.from("signature_1_test").toString("base64");
const sig2 = Buffer.from("signature_2_test").toString("base64");

// 1. 测试从 replayState 中正确还原 thoughtSignature
const replayOptions = {
  messages: [
    {
      role: "assistant",
      source: {
        provider: "gemini-oauth",
        model: "gemini-2.5-flash",
        replayState: {
          response: { kind: "gemini-oauth", provider: "gemini-oauth", model: "gemini-2.5-flash", stopReason: "tool-calls" },
          blocks: [
            { type: "reasoning", thinkingSignature: sig1 },
            { type: "tool-call", thoughtSignature: sig2 }
          ]
        }
      },
      content: [
        { type: "reasoning", text: "I will check files" },
        { type: "tool-call", id: "call_1", name: "bash", arguments: '{"command":"pwd"}' }
      ]
    },
    {
      role: "user",
      content: [
        { type: "tool-result", toolCallId: "call_1", content: [{ type: "text", text: "/Users/jkw" }] }
      ]
    }
  ]
};

const req1 = await buildRequest(replayOptions, fakeModel, "test-project", "mock-token", null);
const parts1 = req1.request.contents[0].parts;
assert.equal(parts1[0].thoughtSignature, sig1, "Thinking block must get signature from replayState");
assert.equal(parts1[1].thoughtSignature, sig2, "Tool-call block must get signature from replayState");
console.log("  ✅ buildRequest correctly restored signatures from replayState");

// 2. 测试向后兼容：旧版 block 上直接挂 thoughtSignature
const legacyOptions = {
  messages: [
    {
      role: "assistant",
      source: {
        provider: "gemini-oauth",
        model: "gemini-2.5-flash"
      },
      content: [
        { type: "reasoning", text: "Legacy thinking", thinkingSignature: sig1 },
        { type: "tool-call", id: "call_2", name: "bash", arguments: '{"command":"ls"}', thoughtSignature: sig2 }
      ]
    }
  ]
};

const req2 = await buildRequest(legacyOptions, fakeModel, "test-project", "mock-token", null);
const parts2 = req2.request.contents[0].parts;
assert.equal(parts2[0].thoughtSignature, sig1, "Legacy thinking signature must be preserved");
assert.equal(parts2[1].thoughtSignature, sig2, "Legacy tool signature must be preserved");
console.log("  ✅ buildRequest backward compatibility with legacy block signatures passed");

// 3. 测试跨模型/跨 provider 不带错误签名
const foreignOptions = {
  messages: [
    {
      role: "assistant",
      source: {
        provider: "openai",
        model: "gpt-4o"
      },
      content: [
        { type: "reasoning", text: "Foreign thinking", thinkingSignature: sig1 }
      ]
    }
  ]
};

const req3 = await buildRequest(foreignOptions, fakeModel, "test-project", "mock-token", null);
assert.equal(req3.request.contents[0].parts[0].thoughtSignature, undefined, "Foreign signature must not be forwarded");
console.log("  ✅ Foreign model signature isolation verified");

console.log("🎉 ALL BUILDREQUEST SIGNATURE TESTS PASSED!");
