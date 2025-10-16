import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";
import * as mdx from "eslint-plugin-mdx";

const GLOBAL_IGNORES = [
	"node_modules/**",
	".next/**", // Next.js build artifacts
	"out/**", // Build artifacts
	"public/_pagefind/**", // Pagefind search index
];

const commonRules = {
	"indent": ["error", "tab"],
	"no-unused-vars": "off", // handled by @typescript-eslint/no-unused-vars
	"no-undef": "off",
	"no-console": "off",
	"no-unsafe-optional-chaining": "error",
	"comma-dangle": ["error", "always-multiline"],
	"no-unreachable": "warn",
};

const stylisticRules = {
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
};

const typescriptRules = {
	"@typescript-eslint/no-unused-vars": "warn",
	"@typescript-eslint/triple-slash-reference": "off",
};

export default defineConfig([
	globalIgnores(GLOBAL_IGNORES),
	{
		files: ["**/*.{js,jsx,mjs,ts,tsx,mts}"],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			stylistic.configs.recommended,
		],
		plugins: {
			"@typescript-eslint": tseslint.plugin,
			"@stylistic": stylistic,
		},
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						"eslint.config.mjs",
						"build/*.ts",
						"postcss.config.mjs",
					],
					defaultProject: "tsconfig.json",
				},
				tsconfigRootDir: import.meta.dirname,
				sourceType: "module",
			},
		},
		rules: {
			...commonRules,
			...stylisticRules,
			...typescriptRules,
		},
	},
	{
		...mdx.flat,
	},
	{
		...mdx.flatCodeBlocks,
		rules: {
			"react/jsx-no-undef": "off",
		},
	},
]);
