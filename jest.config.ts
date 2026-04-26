import type { Config } from "jest";

// Manual project list (no @nx/jest auto-discovery — see ADR 004).
// Each per-app/lib jest config is responsible for its own preset, env, transformer.
const config: Config = {
  projects: [
    "<rootDir>/apps/api-gateway",
    "<rootDir>/apps/crawler-service",
    "<rootDir>/apps/client",
    "<rootDir>/libs/db",
    "<rootDir>/libs/shared/types",
    "<rootDir>/libs/shared/utils",
  ],
  // ai-service is Python — use `pytest` (run from its own Makefile, not jest).
};

export default config;
