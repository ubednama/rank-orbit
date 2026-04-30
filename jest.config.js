// Manual project list (no @nx/jest auto-discovery — see ADR 004).
// Each per-app/lib jest config is responsible for its own preset, env, transformer.
// Plain CJS so Node 24 + Jest 30 don't fight over .cts ESM/CJS resolution.
//
// Note: libs/shared/types and libs/shared/utils have no jest.config — they're
// path-aliased TS sources, not standalone Jest projects. They're omitted here.

module.exports = {
  projects: [
    "<rootDir>/apps/api-gateway",
    "<rootDir>/apps/crawler-service",
    "<rootDir>/apps/client",
    "<rootDir>/libs/db",
  ],
  // ai-service is Python — use `pytest` (run from its own Makefile, not jest).
};
