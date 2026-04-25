import nextJest from "next/jest.js";

// next/jest handles TS/JSX transform via SWC; no @nx/react preset needed.
const createJestConfig = nextJest({ dir: "./" });

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

export default createJestConfig(config);
