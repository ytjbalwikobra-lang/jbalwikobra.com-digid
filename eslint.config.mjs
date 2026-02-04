import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tailwindcssPlugin from "eslint-plugin-tailwindcss";

// Local plugin for Cyber-Compact Design System enforcement
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cyberCompactPlugin = require('./eslint-rules/index.js');

export default tseslint.config(
  {
    ignores: ["build/**", "node_modules/**", "**/*.js", "src/__tests__/**", "eslint-rules/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      tailwindcss: tailwindcssPlugin,
      "cyber-compact": cyberCompactPlugin,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-empty": "off",
      "no-useless-escape": "off",
      "prefer-const": "off",
      "tailwindcss/no-custom-classname": "off",
      "tailwindcss/classnames-order": "off",
      "tailwindcss/enforces-shorthand": "off",
      "tailwindcss/migration-from-tailwind-2": "off",
      "no-case-declarations": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
      // TypeScript handles prop validation - disable prop-types rule
      "react/prop-types": "off",
      // Cyber-Compact Design System enforcement - ERROR mode enabled
      "cyber-compact/no-hardcoded-colors": "error",
    },
  },
  {
    files: ["src/utils/**/*.ts", "src/directTest.ts", "api/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
);
