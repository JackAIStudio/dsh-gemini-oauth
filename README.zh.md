# dsh-gemini-oauth

DeepSeek Harness 自有、独立维护的 **Gemini (Google Antigravity / Cloud Code Assist) 供应商插件** —— 可视为 `dsh-grok-oauth` 的 Gemini 对应物。

仓库：<https://github.com/JackAIStudio/dsh-gemini-oauth>

## 功能（MVP 首版）

- **Google 订阅 OAuth (PKCE) 登录 / 退出**——走 Antigravity / Cloud Code Assist 的公开客户端凭据，不要求 console API key。
- **模型走订阅额度**：Gemini Flash / Pro（含 tiered 档位）、账号下的 Claude / GPT-OSS 都在模型选择器里，吃 5 小时桶 + 周桶。
- **额度展示**：设置 → Gemini (Antigravity) 卡，显示 Gemini 与 Claude/GPT 两个池的额度进度与重置倒计时。
- **模型白名单**：同一张设置卡里可按模型勾选 —— 勾选的才会出现在模型选择器；「全选 / 全不选」一键切换；持久化在 `$DSH_HOME/gemini-oauth-models.json`（未配置 = 全部可见）。
- **代理自适应**：设置卡「网络」填 `host:port`（默认继承 `HTTPS_PROXY` / `ALL_PROXY`；`direct` 强制直连）。国内需要能出 Google。
- **原生体验**：thinking（reasoning-delta）、流式输出、工具调用（functionDeclarations / functionCall）按 DSH 原生 chunk 协议映射；不注入厂商 system prompt。
- **图片输入**：Gemini 家族模型支持粘贴图片（经 DSH attachment 服务解析成 `inlineData` 发给 CCA）；PDF / 音频 / 视频等媒体类型暂未接入。
- 凭据写在 `$DSH_HOME/gemini-oauth.json`（0600），自动 refresh，网络抖动刷新失败不丢凭据。
- **端点/项目配对**：按 IDE 实测的主通道走 `daily-cloudcode-pa` + consumer 项目（`aicode-consumers`）；`cloudcode-pa` 主端点作为回退并配对各自项目（`loadCodeAssist` 实时解析，30 分钟缓存）。

## 已知限制（后续迭代）

- 单账号；不做多号池、设备指纹、429 自动轮换——那是风控面，社区已有人因此被 Google 封停。
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
2. 设置 → **Gemini (Antigravity)** → 登录（浏览器完成 Google OAuth）。
3. 任意会话 `/model` 选择 `Gemini (Antigravity)` 下的模型（如 Gemini 3.6 Flash High / Gemini 3.1 Pro (High)）。
4. 额度条在设置卡里；模型选择器中的模型来自 `fetchAvailableModels` 在线目录（5 分钟缓存），离线回退静态目录。

## 排错速查

- **403 "You do not have a valid license"**：CCA 按 `User-Agent` 校验客户端身份，必须以 `antigravity/` 开头（本插件已把 DSH attribution 合并进 UA comment，勿移除）。
- **某模型 400 "invalid argument"**：两件事——① 工具参数里的 `$schema` / `$defs` / `$ref` / `type` 数组（插件已白名单清洗 + `$defs` 展开）；② `maxOutputTokens` 超模型上限（pro 65535 / gpt-oss 32768 / claude 64000，插件已按族截断）。
- **"Gemini 3.1 Pro (High)" 请求 400**：consumer 线上该模型的真实请求 id 是 `gemini-pro-agent`（`gemini-3.1-pro-high` 只是同名显示），插件已内置别名映射。
- **主端点 429 "Resource has been exhausted"**：属端点级限流，与订阅余额无关（余额看 `retrieveUserQuotaSummary`）；daily 通路上不受影响。
- **图片输入报「需要 attachment 服务」**：附件服务是惰性解析的，首次请求即接入 `ctx.attachments`；若持续报错请确认 dsh web 已重启。

## 目录结构

- `index.js` —— host 侧：OAuth/PKCE + LlmAdapter + 额度 + HTTP API + cordis 装配。
- `client.js` —— 客户端设置卡（登录 / 额度 / 模型白名单）。
- `cordis.patch.yml` —— 注册 `llm-gemini-oauth` loader 行。

## 上游来源与许可

协议与实现参考 MIT 授权的 `LiZhenNet/dsh-antigravity` 与 `OpenSaozi/dsh-antigravity`（并借鉴 Gemini CLI 的 Cloud Code Assist wire）；client 卡结构参照 LiZhenNet。保留 MIT 许可与版权声明。
