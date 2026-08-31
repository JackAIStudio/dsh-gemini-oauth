# dsh-gemini-oauth

DeepSeek Harness 自有、独立维护的 **Gemini (Google Antigravity / Cloud Code Assist) 供应商插件** —— 可视为 `dsh-grok-oauth` 的 Gemini 对应物。

仓库：<https://github.com/JackAIStudio/dsh-gemini-oauth>

## 功能（MVP 首版）

- **Google 订阅 OAuth (PKCE) 登录 / 退出**——走 Antigravity / Cloud Code Assist 的公开客户端凭据，不要求 console API key。
- **模型走订阅额度**：Gemini Flash / Pro（含 tiered 档位）、账号下的 Claude / GPT-OSS 都在模型选择器里，吃 5 小时桶 + 周桶。
- **额度展示**：设置 → Gemini OAuth 卡，显示 Gemini 与 Claude/GPT 两个池的额度进度与重置倒计时。
- **模型白名单**：同一张设置卡里可按模型勾选 —— 勾选的才会出现在模型选择器；「全选 / 全不选」一键切换；持久化在 `$DSH_HOME/gemini-oauth-models.json`（未配置 = 全部可见）。
- **代理自适应**：设置卡「网络」填 `host:port`（默认继承 `HTTPS_PROXY` / `ALL_PROXY`；`direct` 强制直连）。国内需要能出 Google。
- **原生体验**：thinking（reasoning-delta）、流式输出、工具调用（functionDeclarations / functionCall）按 DSH 原生 chunk 协议映射；不注入厂商 system prompt。
- **图片输入**：Gemini 家族模型支持粘贴图片（经 DSH attachment 服务解析成 `inlineData` 发给 CCA）；PDF / 音频 / 视频等媒体类型暂未接入。
- 凭据写在 `$DSH_HOME/gemini-oauth.json`（0600），自动 refresh，网络抖动刷新失败不丢凭据。
- **多账号**：设置卡可保存多个 Google 账号（`$DSH_HOME/gemini-oauth.json` v2：`accounts[]` + `activeAccountId`），切换 / 移除账号，每个账号独立刷新与额度展示；新登录账号自动成为 active。旧版单账号文件读取时自动迁移为 v2。
- **端点/项目配对**：对齐官方 agy 客户端行为——个人账号（`loadCodeAssist` 无 `gcpManaged`）严格只用 `daily-cloudcode-pa` + consumer 项目（`aicode-consumers`）；企业/GCP 账号才允许回退 `cloudcode-pa`（`loadCodeAssist` 实时解析，30 分钟缓存）。个人账号访问 `cloudcode-pa` 恒返回 429（Google 将其 gating 给企业账号），不再做跨端点回退。

## 已知限制（后续迭代）

- 多账号仅支持**手动切换**（设置卡切换 active / 移除账号；新登录账号自动成为 active），不做号池轮换、设备指纹、429 自动轮换——那是风控面，社区已有人因此被 Google 封停。每个账号凭据独立存储、独立刷新；单请求内绝不混用账号 token。
- 无 429 水位时的空响应只重试端点，不做 3 次指数退避（后续按 Grok 插件节奏加）。

## 安装

```bash
# 新电脑（从 GitHub 安装）
dsh plugin --profile web add github:JackAIStudio/dsh-gemini-oauth

# 开发机（本机源码目录）
dsh plugin --profile web add file:$HOME/Documents/dshspace/plugins/dsh-gemini-oauth
# 改源码后：
corepack pnpm install --dir "$HOME/.dsh/profiles/web"
```

host 侧会 `import "@deepseek-ai/schemastery"` 等 DSH 包，**必须用 `file:`/`github:`**，不要用 `link:`（Node ESM 会从源码目录解析依赖，找不到宿主的 peer）。

host 插件要重启 `dsh web` 才加载新的 `index.js`。

## 用法

1. 重启 `dsh web`。
2. 设置 → **Gemini OAuth** → 登录（浏览器完成 Google OAuth）。
3. 任意会话 `/model` 选择 `Gemini OAuth` 下的模型（如 Gemini 3.6 Flash High / Gemini 3.1 Pro (High)）。
4. 额度条在设置卡里；模型选择器中的模型来自 `fetchAvailableModels` 在线目录（5 分钟缓存），离线回退静态目录。

## 排错速查

- **403 "You do not have a valid license"**：CCA 按 `User-Agent` 校验客户端身份，必须以 `antigravity/` 开头（本插件已把 DSH attribution 合并进 UA comment，勿移除）。
- **某模型 400 "invalid argument"**：两件事——① 工具参数里的 `$schema` / `$defs` / `$ref` / `type` 数组（插件已白名单清洗 + `$defs` 展开）；② `maxOutputTokens` 超模型上限（pro 65535 / gpt-oss 32768 / claude 64000，插件已按族截断）。
- **"Gemini 3.1 Pro (High)" 请求 400**：consumer 线上该模型的真实请求 id 是 `gemini-pro-agent`（`gemini-3.1-pro-high` 只是同名显示），插件已内置别名映射。
- **主端点 429 "Resource has been exhausted"**：个人账号上属端点 gating（`cloudcode-pa` 仅限企业/GCP 许可），与订阅余额无关（余额看 `retrieveUserQuotaSummary`）；个人账号默认只用 `daily-cloudcode-pa`，daily 上的 429 是瞬时风控/并发限流，插件会退避重试（2s/6s/14s），通常几十秒内自愈。
- **HTTP 400 "User location is not supported"**：Google 按出口 IP 限制地区（大陆不在支持列表；**支持国家 ≠ 该路径接受当前 IP**——G-Core/IDC 等机房 IP 会被间歇性拒绝，优先家宽/原生/住宅线路）。确认插件设置卡「网络」已填代理（如 `127.0.0.1:7897`）；该判定在 Google 侧偶发瞬时出现（几十秒到几分钟自愈），插件会在 daily 端点退避重试，最终报错时附当前代理出口 IP/ASN 诊断。
- **图片输入报「需要 attachment 服务」**：附件服务是惰性解析的，首次请求即接入 `ctx.attachments`；若持续报错请确认 dsh web 已重启。
- **工具调用后 400 "missing a thought_signature"**：工具闭环要求回传 `functionCall` 的 `thought_signature`（同一 provider+model 才有效）。插件会在流式输出时把签名存进块上并在下一轮回传；若自定义封装绕过了 DSH 的消息组装请确保保留了块上的 `thoughtSignature` 字段。

## 目录结构

- `index.js` —— host 侧：OAuth/PKCE + LlmAdapter + 额度 + HTTP API + cordis 装配。
- `client.js` —— 客户端设置卡（登录 / 额度 / 模型白名单）。
- `cordis.patch.yml` —— 注册 `llm-gemini-oauth` loader 行。

## 上游来源与许可

协议与实现参考 MIT 授权的 `LiZhenNet/dsh-antigravity` 与 `OpenSaozi/dsh-antigravity`（并借鉴 Gemini CLI 的 Cloud Code Assist wire）；client 卡结构参照 LiZhenNet。保留 MIT 许可与版权声明。
