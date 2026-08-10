import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: [
			"app/_components/tools/**/__tests__/**/*.test.ts",
			"app/_components/mdx/**/__tests__/**/*.test.ts",
			"app/friends/**/__tests__/**/*.test.ts",
			"utils/**/__tests__/**/*.test.ts",
		],
		exclude: [
			"**/node_modules/**",
			"**/e2e/**",
			"**/.next/**",
		],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname),
		},
	},
});
