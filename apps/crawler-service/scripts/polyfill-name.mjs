// esbuild-bundled deps (puppeteer 24, lighthouse 13, etc.) reference __name from
// the helper that esbuild emits with --keep-names. When loaded via tsx + Node 24
// ESM, the helper isn't always in scope, causing ReferenceError. Define it
// globally so any module that calls __name() finds it.
if (typeof globalThis.__name === "undefined") {
  globalThis.__name = (target, value) =>
    Object.defineProperty(target, "name", { value, configurable: true });
}
