// 测试专用 loader：mock DSH 运行时依赖，让 index.js 可在 node 下直接加载。
// 运行：node --import ./test-loader.mjs test-store.mjs
import { registerHooks } from "node:module";

const mockSources = {
  "@deepseek-ai/schemastery": `
    const chain = new Proxy(function chainFn() {}, {
      get(_t, prop) {
        if (prop === Symbol.toPrimitive) return () => "[mock-schema]";
        if (prop === "then") return undefined;
        return chain;
      },
      apply() { return chain; },
    });
    export default chain;
  `,
  "@deepseek-ai/dsh-llm": `
    export class LlmAdapter {}
    export class LlmError extends Error { constructor(message, code) { super(message); this.code = code; } }
    export const CallId = (value) => value;
    export const attributionHeaders = () => ({});
  `,
  "@deepseek-ai/dsh-settings": `
    export const installSettingsSection = () => {};
    export const settingsNamespace = (ns) => ns;
  `,
  "@deepseek-ai/dsh-home-paths": `
    import { join } from "node:path";
    export const dshHomePath = (name) => join(process.env.GEMINI_TEST_HOME ?? process.cwd(), name);
  `,
  undici: `
    export class ProxyAgent { constructor(value) { this.value = value; } }
    export const fetch = globalThis.fetch;
  `,
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (Object.prototype.hasOwnProperty.call(mockSources, specifier)) {
      return { url: `mock:${specifier}`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("mock:")) {
      return { format: "module", source: mockSources[url.slice(5)], shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
