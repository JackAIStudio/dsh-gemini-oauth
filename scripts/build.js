import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const isWatch = process.argv.includes('--watch');

async function buildHost() {
  console.log('[build] Building Host (index.js)...');
  const ctx = await esbuild.context({
    entryPoints: [path.join(rootDir, 'src/host/index.ts')],
    outfile: path.join(rootDir, 'index.js'),
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    sourcemap: false,
    packages: 'external',
    banner: {
      js: '/** dsh-gemini-oauth Host plugin - Modular Build */\n'
    }
  });

  if (isWatch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

async function buildClient() {
  console.log('[build] Building Client (client.js)...');
  
  // Wrap bundle in window.__ModuleLoader__.load
  const wrapPlugin = {
    name: 'dsh-module-loader-wrap',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length > 0) return;
        const clientJsPath = path.join(rootDir, 'client.js');
        const code = fs.readFileSync(clientJsPath, 'utf8');
        const wrapped = `window.__ModuleLoader__.load({
\tid: "dsh-gemini-oauth",
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

${code}

\t\treturn module.exports;
\t}
});
`;
        fs.writeFileSync(clientJsPath, wrapped, 'utf8');
      });
    }
  };

  const ctx = await esbuild.context({
    entryPoints: [path.join(rootDir, 'src/client/index.tsx')],
    outfile: path.join(rootDir, 'client.js'),
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: ['es2022', 'chrome100', 'safari15'],
    jsx: 'automatic',
    plugins: [wrapPlugin],
    external: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'cordis',
      '@deepseek-ai/*'
    ]
  });

  if (isWatch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

async function main() {
  try {
    await buildHost();
    await buildClient();
    console.log('[build] Complete.');
  } catch (err) {
    console.error('[build] Failed:', err);
    process.exit(1);
  }
}

main();
