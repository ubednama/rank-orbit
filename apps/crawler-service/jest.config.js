// Self-contained jest config (no jest.preset.js — Nx-only).
// Plain CJS for Node 24 / Jest 30 compatibility.

module.exports = {
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
