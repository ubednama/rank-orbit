// next/jest handles TS/JSX transform via SWC; no @nx/react preset needed.
// Plain CJS so Node 24 / Jest 30 don't fight over module resolution.

const nextJest = require("next/jest.js");

// Use __dirname so this resolves to apps/client/ regardless of where jest is
// invoked from (root jest.config.js orchestration vs. running this file directly).
const createJestConfig = nextJest({ dir: __dirname });

const config = {
  displayName: "client",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  coverageDirectory: "../../coverage/apps/client",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@shared/types$": "<rootDir>/../../libs/shared/types/src/index.ts",
    "^@shared/utils$": "<rootDir>/../../libs/shared/utils/src/index.ts",
  },
};

module.exports = createJestConfig(config);
