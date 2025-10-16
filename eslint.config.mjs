import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

export default defineConfig([
	globalIgnores([
		"node_modules/**",
		".next/**", // Next.js build artifacts
		"out/**", // Build artifacts
		"public/_pagefind/**", // Pagefind search index
	]),
	eslintConfigPrettier,
	{
		files: ["**/*.js", "**/*.jsx", "**/*.mjs"],
		plugins: {
			js,
			stylistic,
		},
		extends: ["js/recommended", "stylistic/recommended"],
		rules: {
			"no-unused-vars": "warn",
			"no-undef": "off",
			"no-console": "off",
			"no-unsafe-optional-chaining": "error",
			"comma-dangle": ["error", "always-multiline"],
			"@stylistic/quotes": ["error", "double"],
			"@stylistic/semi": ["error", "always"],
			"@stylistic/arrow-parens": ["error", "always"],
			"@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
			"@stylistic/operator-linebreak": ["off", "before"],
			"@stylistic/jsx-closing-tag-location": "off",
			"@stylistic/member-delimiter-style": [
				"error",
				{
					multiline: {
						delimiter: "semi",
						requireLast: true,
					},
					singleline: {
						delimiter: "semi",
						requireLast: false,
					},
					multilineDetection: "brackets",
				},
			],
			"@stylistic/indent": ["error", "tab"],
			"@stylistic/no-tabs": "off",
			"@stylistic/jsx-indent-props": ["error", "tab"],
		},
	},
	{
		files: ["**/*.ts", "**/*.tsx"],
		plugins: {
			stylistic,
			tseslint,
		},
		extends: ["tseslint/recommended", "stylistic/recommended"],
		rules: {
			"no-unused-vars": "warn",
			"no-undef": "off",
			"no-console": "off",
			"no-unsafe-optional-chaining": "error",
			"comma-dangle": ["error", "always-multiline"],
			"@typescript-eslint/triple-slash-reference": "off",
			"@stylistic/quotes": ["error", "double"],
			"@stylistic/semi": ["error", "always"],
			"@stylistic/arrow-parens": ["error", "always"],
			"@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
			"@stylistic/operator-linebreak": ["off", "before"],
			"@stylistic/jsx-closing-tag-location": "off",
			"@stylistic/member-delimiter-style": [
				"error",
				{
					multiline: {
						delimiter: "semi",
						requireLast: true,
					},
					singleline: {
						delimiter: "semi",
						requireLast: false,
					},
					multilineDetection: "brackets",
				},
			],
			"@stylistic/indent": ["error", "tab"],
			"@stylistic/indent-binary-ops": ["error", "tab"],
			"@stylistic/no-tabs": "off",
			"@stylistic/jsx-indent-props": ["error", "tab"],
		},
	},
]);
