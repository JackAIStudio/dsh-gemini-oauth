# dsh-gemini-oauth 仓库规则（AGENTS.md）

> 本规范面向所有参与此仓库维护的 AI Agent 与人类贡献者。

---

## 1. 源码单一事实源（SOT）与构建规则

* **禁止直接修改根目录的 `index.js` 与 `client.js`**：
  * 根目录的 `index.js` 和 `client.js` 是 `esbuild` 的打包产物（Artifacts），不是源码。
  * **所有功能开发、Bug 修复必须在 `src/` 目录下进行**。直接修改根目录打包文件会在下次构建时被完全覆盖。
* **改动必须经过构建**：
  * 修改 `src/` 后，必须运行 `pnpm run build`（或开发时保持 `pnpm run dev`）。
* **提交前三道门禁（Definition of Done）**：
  1. `pnpm run build`：打包生成 `index.js` 和 `client.js`。
  2. `pnpm run typecheck`：TypeScript 静态类型检查必须 0 错误（`tsc --noEmit`）。
  3. `pnpm test`：运行测试套件（多账号 Store + API 路由测试），必须全部 Pass。

---

## 2. 模块职责与文件拆分规范（防止单文件膨胀）

为了防止代码重新沦为单文件几千行的“大泥球”，导致后续 Agent 读取和修改极其缓慢，必须严格遵守以下文件划分：

### 目录与职责划分

| 目录/文件 | 严格职责范围 |
| :--- | :--- |
| **`src/common/constants.ts`** | 全局常量（端点、OAuth Scopes、模型别名、重试退避时间、提示文案等）。 |
| **`src/common/types.ts`** | 前后端共享的数据结构定义（`AccountRecord`, `CredentialStore`, `QuotaSummary` 等）。 |
| **`src/host/store.ts`** | 凭据管理与持久化（多账号 CRUD、v1->v2 迁移、原子文件写入、模型白名单配置）。 |
| **`src/host/oauth.ts`** | Google OAuth 2.0 PKCE 流程、本地 51121 回调 HTTP 服务、Token 交换与自动刷新。 |
| **`src/host/cca-client.ts`** | Cloud Code Assist (CCA) 底层通信（请求头构造、项目探测、账号画像、出口 IP 诊断、额度拉取）。 |
| **`src/host/catalog.ts`** | 模型目录管理（静态底表、在线 fetchAvailableModels 动态校正、Token 上限与思考级别计算）。 |
| **`src/host/wire.ts`** | 请求组装与 Schema 转换（Protobuf JSON 白名单校验、多模态图片/工具结果组装、`thoughtSignature` 签名保留）。 |
| **`src/host/stream.ts`** | SSE 流式解析器（文本/思考/工具块组装、瞬时 400 location / 429 退避重试、错误分类与脱敏归因）。 |
| **`src/host/adapter.ts`** | DSH `LlmAdapter` 适配层与 `GemOAuthRuntime` 实例。 |
| **`src/host/routes.ts`** | 本机 WebServer HTTP API 路由（`/status`, `/login`, `/logout`, `/switch`, `/quota`, `/models`, `/settings` 等）。 |
| **`src/host/index.ts`** | Host 插件顶层入口（`apply` 函数、组件生命周期绑定）。 |
| **`src/client/components/`** | 独立的 React TSX 组件（图标、进度条、账号列表、额度分组、模型勾选、网络设置、Dock 芯片等）。 |
| **`src/client/GeminiSettings.tsx`** | 设置面板整合主视图。 |
| **`src/client/index.tsx`** | Client 插件顶层入口（注册设置页卡片与输入框底部 Dock 芯片）。 |

---

## 3. 代码编写红线与硬约束

1. **单文件体积红线**：
   * 单个源码文件建议保持在 **50 ~ 200 行**。
   * 新增独立功能（如新的设置项、新的子卡片、新的解析器）必须**新建独立文件**，禁止直接在已有文件中大量追加代码。
2. **UI 编写必须使用 React TSX**：
   * 严禁使用手写 `React.createElement` 的方式编写 UI。
   * 新的视图逻辑拆分至 `src/client/components/` 下。
3. **凭据安全与脱敏**：
   * 任何返回给前端、输出到日志或错误提示中的文本，**严禁包含 `access_token` 或 `refresh_token`**。
   * 异常处理中必须使用 `redactSecrets` 进行脱敏。
4. **跨平台兼容**：
   * 路径处理统一使用 `node:path`。
   * 浏览器唤起统一走 `src/host/oauth.ts` 中的 `openBrowser`，不得硬编码 macOS 的 `open` 命令。
