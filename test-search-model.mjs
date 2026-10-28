// 回归测试：原生 Google Search 只能用 Gemini 系模型。
// 在 gemini-oauth 里选 Claude / GPT-OSS 时，搜索要走默认 Gemini 模型，
// 否则 CCA 返回 200 但 groundingMetadata 为空，上层当成「搜到 0 条」。
import assert from "node:assert/strict";
import { DEFAULT_SEARCH_MODEL, searchModelFor } from "./index.js";

assert.equal(searchModelFor("gemini-4-argon-high"), "gemini-4-argon-high");
assert.equal(searchModelFor("gemini-3.8-flash-tiered"), "gemini-3.8-flash-tiered");
assert.equal(searchModelFor("gemini-3.1-pro-high"), "gemini-pro-agent", "别名仍然生效");
assert.equal(searchModelFor(undefined), DEFAULT_SEARCH_MODEL, "未指定模型时用默认");
assert.equal(searchModelFor(""), DEFAULT_SEARCH_MODEL);
assert.equal(searchModelFor("claude-opus-5-5-high"), DEFAULT_SEARCH_MODEL, "Claude 必须回退");
assert.equal(searchModelFor("claude-sonnet-5-5-low"), DEFAULT_SEARCH_MODEL);
assert.equal(searchModelFor("claude-opus-4-6-thinking"), DEFAULT_SEARCH_MODEL);
assert.equal(searchModelFor("gpt-oss-120b-medium"), DEFAULT_SEARCH_MODEL, "GPT-OSS 必须回退");
console.log("  ✅ 原生搜索只对 Gemini 模型使用原模型，其余回退到默认 Gemini 搜索模型");
