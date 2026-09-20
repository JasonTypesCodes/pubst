import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
  {
    rules: {
      // Match the TypeScript compiler: a leading underscore means
      // "declared to document the contract, deliberately unused".
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "all" },
      ],
    },
  },
  {
    // Chai's `expect(x).to.be.true` assertions read as unused expressions.
    files: ["src/**/*.test.ts", "src/**/*.test-d.ts"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    files: ["src/browser.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
);
