// 多账号 store 逻辑 smoke 测试（纯函数，不碰网络与真实凭据文件）。
// 运行：node --import ./test-loader.mjs test-store.mjs
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  decodeCredentialStore,
  storeFromLegacy,
  upsertAccount,
  switchActiveAccount,
  removeAccount,
  accountKeyOf,
  publicAccountId,
  activeAccountFrom,
  findAccountIndex,
  emptyStore,
  readCredentialStore,
  writeCredentialStore,
  deleteCredentialStore,
} from "./index.js";

const now = Date.now();
const mk = (email, access, refresh, extra = {}) => ({
  access: access || `at-${email}`,
  refresh: refresh || `rt-${email}`,
  expires: now + 3600_000,
  email,
  ...extra,
});

let pass = 0;
function check(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

// ---- v1 → v2 迁移 ----
check("v1 单账号迁移为 v2 store", () => {
  const migrated = decodeCredentialStore({
    access: "at-a",
    refresh: "rt-a",
    expires: now + 1000,
    projectId: "proj-a",
    email: "A@EXAMPLE.com",
  });
  assert.equal(migrated.version, 2);
  assert.equal(migrated.accounts.length, 1);
  assert.equal(migrated.activeAccountId, "a@example.com"); // email lowercase
  assert.equal(migrated.accounts[0].projectId, "proj-a");
});

check("v1 无 email 时用 projectId 作账号键", () => {
  const migrated = decodeCredentialStore({ access: "at", refresh: "rt", expires: now + 1000, projectId: "proj-x" });
  assert.equal(migrated.activeAccountId, "proj-x");
});

check("v1 无 email/projectId 时用 refresh 指纹", () => {
  const migrated = decodeCredentialStore({ access: "at", refresh: "rt-abc", expires: now + 1000 });
  assert.equal(typeof migrated.activeAccountId, "string");
  assert.equal(migrated.activeAccountId.length, 16);
  assert.equal(publicAccountId(migrated.accounts[0]), migrated.activeAccountId);
});

check("坏数据解码为 undefined（上层转空 store）", () => {
  assert.equal(decodeCredentialStore(null), undefined);
  assert.equal(decodeCredentialStore({}), undefined);
  assert.equal(decodeCredentialStore({ access: "at" }), undefined);
  assert.equal(decodeCredentialStore({ version: 2, accounts: [{ access: "at" }] }), undefined);
});

// ---- upsert / switch / remove ----
const a1 = mk("alice@gmail.com", "at-alice", "rt-alice", { projectId: "p1" });
const a2 = mk("bob@gmail.com", "at-bob", "rt-bob", { projectId: "p2" });

check("新账号追加并激活", () => {
  let store = storeFromLegacy(a1);
  store = upsertAccount(store, a2);
  assert.equal(store.accounts.length, 2);
  assert.equal(store.activeAccountId, "bob@gmail.com");
  assert.equal(activeAccountFrom(store).email, "bob@gmail.com");
});

check("同 email 刷新 token 时替换不追加", () => {
  let store = storeFromLegacy(a1);
  store = upsertAccount(store, a2);
  store = upsertAccount(store, { ...a1, access: "at-alice-new", expires: now + 7200_000 }, false);
  assert.equal(store.accounts.length, 2);
  const alice = store.accounts.find((x) => x.email === "alice@gmail.com");
  assert.equal(alice.access, "at-alice-new");
  assert.equal(store.activeAccountId, "bob@gmail.com"); // activate=false 不动 active
});

check("切换 active 账号", () => {
  let store = upsertAccount(storeFromLegacy(a1), a2, false); // active=alice
  const switched = switchActiveAccount(store, "BOB@gmail.com"); // 大小写不敏感
  assert.equal(switched.activeAccountId, "bob@gmail.com");
  assert.equal(activeAccountFrom(switched).email, "bob@gmail.com");
});

check("切换不存在的账号返回 undefined", () => {
  const store = storeFromLegacy(a1);
  assert.equal(switchActiveAccount(store, "nobody@x.com"), undefined);
});

check("移除 active 账号后落到剩余第一个账号", () => {
  let store = upsertAccount(storeFromLegacy(a1), a2); // active=bob
  const next = removeAccount(store, "bob@gmail.com");
  assert.equal(next.accounts.length, 1);
  assert.equal(next.accounts[0].email, "alice@gmail.com");
  assert.equal(next.activeAccountId, "alice@gmail.com");
});

check("移除非 active 账号保持 active 不变", () => {
  let store = upsertAccount(storeFromLegacy(a1), a2, false); // active=alice
  const next = removeAccount(store, "bob@gmail.com");
  assert.equal(next.accounts.length, 1);
  assert.equal(next.activeAccountId, "alice@gmail.com");
});

check("移除最后一个账号得到空 store", () => {
  const next = removeAccount(storeFromLegacy(a1), "alice@gmail.com");
  assert.equal(next.accounts.length, 0);
  assert.equal(next.activeAccountId, undefined);
  assert.deepEqual(next, emptyStore());
});

check("移除不存在的账号不改动内容", () => {
  let store = upsertAccount(storeFromLegacy(a1), a2, false);
  const before = JSON.stringify(store);
  const next = removeAccount(store, "nobody@x.com");
  assert.equal(next.accounts.length, 2);
  assert.equal(next.activeAccountId, store.activeAccountId);
  assert.equal(JSON.stringify(next), before); // 内容不变
  assert.notEqual(next, store); // 但返回新结构,原 store 不被修改
  assert.equal(JSON.stringify(store), before);
});

// ---- decode v2 的规范化 ----
check("v2 decode：清洗字段 + 修正 activeAccountId", () => {
  const decoded = decodeCredentialStore({
    version: 2,
    activeAccountId: "bob@gmail.com",
    accounts: [
      { access: "at-a", refresh: "rt-a", expires: now + 1000, email: "alice@gmail.com", junk: true },
      { access: "at-b", refresh: "rt-b", expires: now + 1000, email: "bob@gmail.com" },
    ],
  });
  assert.equal(decoded.accounts.length, 2);
  assert.equal(decoded.accounts[0].junk, undefined); // 多余字段被剔除
  assert.equal(decoded.activeAccountId, "bob@gmail.com");
});

check("v2 decode：activeAccountId 指向不存在账号时回退第一个", () => {
  const decoded = decodeCredentialStore({
    version: 2,
    activeAccountId: "ghost",
    accounts: [{ access: "at", refresh: "rt", expires: now + 1000, email: "only@gmail.com" }],
  });
  assert.equal(decoded.activeAccountId, "only@gmail.com");
});

check("v2 decode：空账号数组", () => {
  const decoded = decodeCredentialStore({ version: 2, activeAccountId: "x", accounts: [] });
  assert.equal(decoded.accounts.length, 0);
  assert.equal(decoded.activeAccountId, undefined);
});

// ---- 文件读写（tmp home，不碰真实凭据）----
const tmpHome = mkdtempSync(join(tmpdir(), "gemini-store-test-"));
process.env.GEMINI_TEST_HOME = tmpHome;

async function checkAsync(name, fn) {
  try {
    await fn();
    pass += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

await checkAsync("read/write/delete 真实落盘", async () => {
  const path = join(tmpHome, "gemini-oauth.json");
  await writeCredentialStore(emptyStore());
  assert.ok(existsSync(path));
  const raw = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(raw.version, 2);
  const store = await readCredentialStore();
  assert.equal(store.accounts.length, 0);

  await writeCredentialStore(upsertAccount(emptyStore(), { ...mk("file@test.com"), projectId: "p-file" }));
  const read = await readCredentialStore();
  assert.equal(read.accounts.length, 1);
  assert.equal(read.activeAccountId, "file@test.com");

  await deleteCredentialStore();
  assert.ok(!existsSync(path));
});

await checkAsync("v1 文件读取时自动迁移并落盘 v2", async () => {
  const path = join(tmpHome, "gemini-oauth.json");
  writeFileSync(path, JSON.stringify({ access: "at-old", refresh: "rt-old", expires: now + 9999_000, email: "legacy@test.com", projectId: "p-legacy" }));
  const store = await readCredentialStore();
  assert.equal(store.version, 2);
  assert.equal(store.accounts.length, 1);
  assert.equal(store.activeAccountId, "legacy@test.com");
  const raw = JSON.parse(readFileSync(path, "utf8"));
  assert.ok(Array.isArray(raw.accounts), "迁移后文件应为 v2 结构");
});

// 清理
rmSync(tmpHome, { recursive: true, force: true });

console.log(`\n${pass} checks passed${process.exitCode ? " (有失败)" : ""}`);
