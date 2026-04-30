// Self-contained jest config (no jest.preset.js — Nx-only).
// Plain CJS for Node 24 / Jest 30 compatibility.

module.exports = {
  displayName: "db",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../coverage/libs/db",
};
