import type { Config } from "jest";

// Self-contained config (no jest.preset.js — Nx-only).
const config: Config = {
  displayName: "db",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../coverage/libs/db",
};

export default config;
