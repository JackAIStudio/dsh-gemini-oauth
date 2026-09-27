// 路由级 smoke 测试：mock cordis ctx + mock fetch，测 status/switch/remove/quota-all。
// 运行：node --import ./test-loader.mjs test-routes.mjs
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply, writeCredentialStore, emptyStore, upsertAccount } from "./index.js";

const tmpHome = mkdtempSync(join(tmpdir(), "gemini-routes-test-"));
process.env.GEMINI_TEST_HOME = tmpHome;

import { credentialPath } from "./index.js";
if (!credentialPath().startsWith(tmpHome)) {
  throw new Error(`CRITICAL TEST ISOLATION FAILURE: credentialPath (${credentialPath()}) does not start with tmpHome (${tmpHome})! Aborting to prevent wiping user credentials.`);
}

const now = Date.now();
const FAT = now + 24 * 3600_000; // 远未来,测试中不触发刷新

// ---- mock fetch：按 URL 分派 ----
const jsonRes = (status, value) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(value),
  json: async () => value,
});
const fetchMock = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  const auth = init?.headers?.authorization || init?.headers?.Authorization || "";
  if (url.includes("/v1internal:loadCodeAssist") && auth.includes("at-managed")) {
    return jsonRes(200, { gcpManaged: true, antigravityProjectId: "proj-managed" });
  }
  if (url.includes("/v1internal:loadCodeAssist") && auth.includes("at-split")) {
    return jsonRes(200, { gcpManaged: false, antigravityProjectId: "aicode-consumers" });
  }
  if (url.includes("retrieveUserQuotaSummary") && (auth.includes("at-split") || auth.includes("at-managed"))) {
    if (url.includes("daily-cloudcode-pa")) {
      return jsonRes(403, {
        error: {
          code: 403,
          message: "Verify your account to continue.",
          status: "PERMISSION_DENIED",
          details: [{
            "@type": "type.googleapis.com/google.rpc.ErrorInfo",
            reason: "VALIDATION_REQUIRED",
            domain: "cloudcode-pa.googleapis.com",
            metadata: { validation_url: "https://accounts.google.com/signin/continue?continue=https%3A%2F%2Fexample.test%2Fok" },
          }],
        },
      });
    }
    return jsonRes(200, {
      groups: [{
        displayName: "Gemini Models",
        buckets: [{ displayName: "Weekly Limit Remaining", bucketId: "gemini-weekly", remainingFraction: 1, resetTime: "2099-01-01T00:00:00Z" }],
      }],
    });
  }
  if (url.includes("retrieveUserQuotaSummary") && auth.includes("at-locked")) {
    return jsonRes(403, {
      error: {
        code: 403,
        message: "Verify your account to continue.",
        status: "PERMISSION_DENIED",
        details: [{
          "@type": "type.googleapis.com/google.rpc.ErrorInfo",
          reason: "VALIDATION_REQUIRED",
          domain: "cloudcode-pa.googleapis.com",
          metadata: { validation_url: "https://accounts.google.com/signin/continue?continue=https%3A%2F%2Fexample.test%2Fok" },
        }],
      },
    });
  }
  if (url.includes("oauth2.googleapis.com/token")) {
    return jsonRes(200, { access_token: "at-fresh", refresh_token: "rt-fresh", expires_in: 3600 });
  }
  if (url.includes("oauth2/v1/userinfo")) {
    return jsonRes(200, { email: "switch-target@test.com" });
  }
  if (url.includes("retrieveUserQuotaSummary")) {
    return jsonRes(200, {
      groups: [
        {
          displayName: "Gemini models",
          description: "Models within this group: Gemini Flash, Gemini Pro",
          buckets: [
            { displayName: "Weekly Limit Remaining", bucketId: "weekly", remainingFraction: 0.612, resetTime: "2099-01-01T00:00:00Z" },
            { displayName: "Five Hour Limit Remaining", bucketId: "five", remainingFraction: 0.108, resetTime: "2099-01-01T01:00:00Z" },
          ],
        },
        {
          displayName: "Claude and GPT models",
          description: "Models within this group: Claude Opus, Claude Sonnet, GPT-OSS",
          buckets: [
            { displayName: "Weekly Limit Remaining", bucketId: "weekly-2", remainingFraction: 1, resetTime: "2099-01-01T00:00:00Z" },
          ],
        },
      ],
    });
  }
  if (url.includes("/v1internal:loadCodeAssist") || url.includes("listCloudAICompanionProjects")) {
    return jsonRes(200, { antigravityProjectId: "proj-mock" });
  }
  if (url.includes("fetchAvailableModels")) {
    return jsonRes(200, { models: {} });
  }
  return jsonRes(404, {});
};
const savedFetch = globalThis.fetch;
globalThis.fetch = fetchMock;

// ---- mock cordis ctx ----
const handlers = new Map();
const ctx = {
  logger: { info() {}, error() {}, warn() {} },
  llm: {
    registerConfigurableProviders() {},
    registerAdapter() {},
  },
  inject: (names, fn) => fn({
    get: (n) => (n === "webServer" ? {
      register: (def, id) => {
        handlers.set(`${def.kind}:${def.path}`, def);
        return () => {};
      },
    } : undefined),
    effect: (fn) => fn(),
  }),
  effect: () => {},
  get: () => undefined,
};
apply(ctx, { proxy: "" });

// ---- 模拟 webServer 调用 ----
async function callApi(path, method = "GET", bodyObj, remote = "127.0.0.1") {
  const def = handlers.get(`exact:${path}`);
  assert.ok(def, `no handler for ${path}`);
  const req = {
    socket: { remoteAddress: remote },
    method,
    async *[Symbol.asyncIterator]() {
      if (bodyObj !== undefined) yield Buffer.from(JSON.stringify(bodyObj), "utf8");
    },
    on() {}, off() {},
  };
  let out;
  const res = {
    statusCode: 0,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    end(b) { out = b; },
    on() {}, off() {},
  };
  await def.handler(req, res);
  return JSON.parse(out);
}

let pass = 0;
async function check(name, fn) {
  try {
    await fn();
    pass += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

// 初始：两个账号,alice active
await writeCredentialStore(upsertAccount(
  upsertAccount(emptyStore(), {
    access: "at-alice", refresh: "rt-alice", expires: FAT,
    projectId: "proj-alice", email: "alice@test.com",
  }, true),
  {
    access: "at-bob", refresh: "rt-bob", expires: FAT,
    projectId: "proj-bob", email: "bob@test.com",
  }, false), // activate=false → active 仍是 alice
);

await check("status 返回账号列表与 active", async () => {
  const r = await callApi("/gemini-oauth/api/status");
  assert.equal(r.ok, true);
  assert.equal(r.value.authenticated, true);
  assert.equal(r.value.accounts.length, 2);
  assert.equal(r.value.activeAccountId, "alice@test.com");
  const active = r.value.accounts.find((a) => a.active);
  assert.equal(active.email, "alice@test.com");
  assert.equal(active.active, true);
});

await check("switch 到 bob 后 active 变化", async () => {
  const r = await callApi("/gemini-oauth/api/switch", "POST", { accountId: "bob@test.com" });
  assert.equal(r.ok, true);
  assert.equal(r.value.activeAccountId, "bob@test.com");
  const status = await callApi("/gemini-oauth/api/status");
  assert.equal(status.value.accounts.find((a) => a.active).email, "bob@test.com");
});

await check("switch 不存在账号返回失败", async () => {
  const r = await callApi("/gemini-oauth/api/switch", "POST", { accountId: "ghost@test.com" });
  assert.equal(r.ok, false);
  assert.match(r.error, /不存在/);
});

await check("quota(active=bob)+quota-all 每账号额度", async () => {
  const q = await callApi("/gemini-oauth/api/quota", "POST", undefined);
  assert.equal(q.ok, true);
  assert.equal(q.value.accountId, "bob@test.com");
  assert.ok(q.value.quota.groups.length >= 2);

  const all = await callApi("/gemini-oauth/api/quota-all", "POST", undefined);
  assert.equal(all.ok, true);
  assert.equal(all.value.accounts.length, 2);
  for (const entry of all.value.accounts) {
    assert.equal(entry.status, "ok");
    assert.ok(entry.quota.groups.length >= 2);
  }
  const bob = all.value.accounts.find((a) => a.accountId === "bob@test.com");
  assert.equal(bob.active, true);
});

await check("remove 非 active 账号后保持 active", async () => {
  const r = await callApi("/gemini-oauth/api/remove", "POST", { accountId: "alice@test.com" });
  assert.equal(r.ok, true);
  assert.equal(r.value.accounts.length, 1);
  assert.equal(r.value.activeAccountId, "bob@test.com");
  const status = await callApi("/gemini-oauth/api/status");
  assert.equal(status.value.accounts.length, 1);
});

await check("remove active 账号后落到剩余账号", async () => {
  let store = emptyStore();
  store = upsertAccount(store, { access: "at-aaa", refresh: "rt-aaa", expires: FAT, projectId: "p-aaa", email: "aaa@test.com" }, false);
  store = upsertAccount(store, { access: "at-bbb", refresh: "rt-bbb", expires: FAT, projectId: "p-bbb", email: "bbb@test.com" }, true);
  await writeCredentialStore(store);
  const r = await callApi("/gemini-oauth/api/remove", "POST", { accountId: "bbb@test.com" });
  assert.equal(r.ok, true);
  assert.equal(r.value.accounts.length, 1);
  assert.equal(r.value.activeAccountId, "aaa@test.com");
});

await check("v1 单账号文件迁移后 status 正常", async () => {
  writeFileSync(join(tmpHome, "gemini-oauth.json"), JSON.stringify({
    access: "at-legacy", refresh: "rt-legacy", expires: FAT,
    projectId: "p-legacy", email: "legacy@test.com",
  }));
  const status = await callApi("/gemini-oauth/api/status");
  assert.equal(status.ok, true);
  assert.equal(status.value.authenticated, true);
  assert.equal(status.value.accounts.length, 1);
  assert.equal(status.value.accounts[0].email, "legacy@test.com");
});

await check("logout 全部移除后 authenticated=false", async () => {
  await writeCredentialStore(upsertAccount(emptyStore(), {
    access: "at-x", refresh: "rt-x", expires: FAT, projectId: "p-x", email: "x@test.com",
  }, true));
  const r = await callApi("/gemini-oauth/api/logout", "POST", undefined);
  assert.equal(r.ok, true);
  assert.equal(r.value.authenticated, false);
  assert.equal(r.value.accounts.length, 0);
  const status = await callApi("/gemini-oauth/api/status");
  assert.equal(status.value.authenticated, false);
});

await check("额度 403 VALIDATION_REQUIRED 不再伪装成暂无额度", async () => {
  await writeCredentialStore(upsertAccount(
    upsertAccount(emptyStore(), {
      access: "at-ok", refresh: "rt-ok", expires: FAT,
      projectId: "proj-ok", email: "ok@test.com",
    }, true),
    {
      access: "at-locked", refresh: "rt-locked", expires: FAT,
      projectId: "proj-locked", email: "locked@test.com",
    }, false));
  const all = await callApi("/gemini-oauth/api/quota-all", "POST", undefined);
  assert.equal(all.ok, true);
  const ok = all.value.accounts.find((a) => a.accountId === "ok@test.com");
  const locked = all.value.accounts.find((a) => a.accountId === "locked@test.com");
  assert.equal(ok.status, "ok");
  assert.equal(locked.status, "error");
  assert.match(locked.message, /验证这个账号/);
  assert.equal(locked.validationUrl, "https://accounts.google.com/signin/continue?continue=https%3A%2F%2Fexample.test%2Fok");
  assert.equal(locked.quota, undefined);
});

await check("个人账号不展示 cloudcode-pa 上用不到的 100% 额度", async () => {
  await writeCredentialStore(upsertAccount(emptyStore(), {
    access: "at-split", refresh: "rt-split", expires: FAT,
    projectId: "aicode-consumers", email: "split@test.com",
  }, true));
  const all = await callApi("/gemini-oauth/api/quota-all", "POST", undefined);
  assert.equal(all.ok, true);
  const split = all.value.accounts.find((a) => a.accountId === "split@test.com");
  assert.equal(split.status, "error");
  assert.match(split.message, /验证这个账号/);
  assert.equal(split.quota, undefined);
});

await check("企业账号仍可回退到 cloudcode-pa 的额度", async () => {
  await writeCredentialStore(upsertAccount(emptyStore(), {
    access: "at-managed", refresh: "rt-managed", expires: FAT,
    projectId: "proj-managed", email: "managed@test.com",
  }, true));
  const all = await callApi("/gemini-oauth/api/quota-all", "POST", undefined);
  assert.equal(all.ok, true);
  const managed = all.value.accounts.find((a) => a.accountId === "managed@test.com");
  assert.equal(managed.status, "ok");
  assert.equal(managed.quota.groups[0].buckets[0].remainingFraction, 1);
});

await check("非本机 remoteAddress 拒绝 403", async () => {
  const r = await callApi("/gemini-oauth/api/status", "GET", undefined, "10.0.0.5");
  assert.equal(r.ok, false);
  assert.match(r.error, /本机/);
});

globalThis.fetch = savedFetch;
rmSync(tmpHome, { recursive: true, force: true });

console.log(`\n${pass} checks passed${process.exitCode ? " (有失败)" : ""}`);
