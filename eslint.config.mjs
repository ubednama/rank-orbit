import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/out/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/venv/**",
      "**/__pycache__/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.cjs",
      "pnpm-lock.yaml",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,cts,mts}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Node scripts (.mjs in libs/, scripts/, tooling) — give them Node globals
  {
    files: ["**/*.mjs", "**/*.cjs"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  // Prettier compatibility — must be last to disable conflicting style rules
  prettier,
);
