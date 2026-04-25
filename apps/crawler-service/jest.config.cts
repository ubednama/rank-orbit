import type { Config } from "jest";

// Self-contained config (no jest.preset.js — Nx-only).
const config: Config = {
  displayName: "crawler-service",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  moduleNameMapper: {
    "^@shared/types$": "<rootDir>/../../libs/shared/types/src/index.ts",
    "^@shared/utils$": "<rootDir>/../../libs/shared/utils/src/index.ts",
  },
  coverageDirectory: "../../coverage/apps/crawler-service",
};

export default config;
