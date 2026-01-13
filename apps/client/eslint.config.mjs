import nextEslintPluginNext from "@next/eslint-plugin-next";
import nx from "@nx/eslint-plugin";
import baseConfig from "../../eslint.config.mjs";

export default [
  { plugins: { "@next/next": nextEslintPluginNext } },
  ...baseConfig,
  ...nx.configs["flat/react-typescript"],
  {
    ignores: [".next/**/*", "**/generated/**/*"],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@next/next/no-html-link-for-pages": ["error", "apps/client/src/app"],
    },
  },
];
