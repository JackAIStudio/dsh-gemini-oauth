// DSH purpose: session-title 不得继承对话 thinking，也不能被 64 token 预算饿死。
// 运行：node --import ./test-loader.mjs test-session-title.mjs
import assert from "node:assert/strict";
import {
  effortToThinkingLevel,
  thinkingConfigFor,
  resolveMaxOutputTokens,
  generationConfigFor,
  SESSION_TITLE_MIN_OUTPUT_TOKENS,
  buildRequest,
} from "./index.js";

let pass = 0;
function check(name, fn) {
  const run = async () => {
    try {
      await fn();
      pass += 1;
      console.log(`  ok  ${name}`);
    } catch (error) {
      console.error(`FAIL  ${name}: ${error.message}`);
      process.exitCode = 1;
    }
  };
  return run();
}

const jobs = [];
jobs.push(check("未传 effort 时默认 MEDIUM（对话请求）", () => {
  assert.equal(effortToThinkingLevel(undefined), "MEDIUM");
  assert.equal(effortToThinkingLevel("high"), "HIGH");
  assert.equal(effortToThinkingLevel("off"), "LOW");
}));

jobs.push(check("tiered 对话请求继承 effort，标题请求强制 LOW", () => {
  const modelId = "gemini-3.8-flash-tiered";
  assert.deepEqual(thinkingConfigFor(modelId, { reasoningEffort: "high" }), { thinkingLevel: "HIGH" });
  assert.deepEqual(thinkingConfigFor(modelId, {}), { thinkingLevel: "MEDIUM" });
  assert.deepEqual(
    thinkingConfigFor(modelId, { purpose: "session-title", reasoningEffort: "high" }),
    { thinkingLevel: "LOW" },
  );
  assert.equal(thinkingConfigFor("gemini-2.5-flash", { purpose: "session-title" }), undefined);
}));

jobs.push(check("标题请求把 64 token 抬到至少 1024，且不超过模型上限", () => {
  const modelId = "gemini-3.8-flash-tiered";
  assert.equal(resolveMaxOutputTokens(modelId, { maxTokens: 64 }), 64);
  assert.equal(
    resolveMaxOutputTokens(modelId, { purpose: "session-title", maxTokens: 64 }),
    SESSION_TITLE_MIN_OUTPUT_TOKENS,
  );
  assert.equal(
    resolveMaxOutputTokens(modelId, { purpose: "session-title", maxTokens: 4096 }),
    4096,
  );
  assert.equal(
    resolveMaxOutputTokens("gpt-oss-120b-medium", { purpose: "session-title", maxTokens: 64 }),
    SESSION_TITLE_MIN_OUTPUT_TOKENS,
  );
}));

jobs.push(check("generationConfig：标题请求 = LOW thinking + 抬高预算", () => {
  const model = { id: "gemini-3.8-flash-tiered", maxTokens: 65_536 };
  const chat = generationConfigFor(model, { reasoningEffort: "high", maxTokens: 8192 });
  assert.equal(chat.maxOutputTokens, 8192);
  assert.deepEqual(chat.thinkingConfig, { thinkingLevel: "HIGH" });

  const title = generationConfigFor(model, {
    purpose: "session-title",
    reasoningEffort: "high",
    maxTokens: 64,
  });
  assert.equal(title.maxOutputTokens, SESSION_TITLE_MIN_OUTPUT_TOKENS);
  assert.deepEqual(title.thinkingConfig, { thinkingLevel: "LOW" });
}));

jobs.push(check("buildRequest 把 purpose 写进 generationConfig", async () => {
  const model = {
    id: "gemini-3.8-flash-tiered",
    name: "Gemini 3.8 Flash (Tiered)",
    provider: "gemini-oauth",
    inputModalities: ["text"],
    thinking: true,
    contextWindow: 1_048_576,
    maxTokens: 65_536,
  };
  const envelope = await buildRequest(
    {
      purpose: "session-title",
      reasoningEffort: "high",
      maxTokens: 64,
      messages: [{ role: "user", content: [{ type: "text", text: "帮我修一下侧栏标题" }] }],
      system: "Create a concise title",
    },
    model,
    "proj",
    "token",
    undefined,
  );
  assert.equal(envelope.request.generationConfig.maxOutputTokens, SESSION_TITLE_MIN_OUTPUT_TOKENS);
  assert.deepEqual(envelope.request.generationConfig.thinkingConfig, { thinkingLevel: "LOW" });
  assert.equal(envelope.request.tools, undefined);
}));

await Promise.all(jobs);
if (process.exitCode) {
  console.error(`session-title tests failed (${pass} passed)`);
  process.exit(1);
}
console.log(`session-title tests passed (${pass})`);
