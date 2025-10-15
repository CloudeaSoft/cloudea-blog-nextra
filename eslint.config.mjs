import { defineConfig } from "eslint/config";
import js from "@eslint/js";

const config = defineConfig([
  {
    ignores: [
      "node_modules/**",
      ".next/**", // Next.js build artifacts
      "out/**", // Build artifacts
      "public/_pagefind/**", // Pagefind search index
    ],
    files: ["**/*.js"],
    plugins: {
      js,
    },
    extends: ["js/recommended"],
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "off",
      "no-console": "warn",
      "no-unsafe-optional-chaining": "error",
    },
  },
]);

export default config;
