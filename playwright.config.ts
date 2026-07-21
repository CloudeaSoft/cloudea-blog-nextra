import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	timeout: 60_000,
	expect: {
		toHaveScreenshot: {
			// Allow tiny antialiasing / font rasterization drift across runs.
			maxDiffPixelRatio: 0.02,
			animations: "disabled",
			caret: "hide",
		},
	},
	use: {
		baseURL: BASE_URL,
		colorScheme: "light",
		trace: "on-first-retry",
		locale: "en-US",
		timezoneId: "UTC",
	},
	projects: [
		{
			name: "desktop-chromium",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 720 },
			},
		},
		{
			name: "mobile-chromium",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 390, height: 844 },
				isMobile: true,
				hasTouch: true,
				userAgent:
					"Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
			},
		},
	],
	webServer: {
		command: `pnpm exec serve out -l ${PORT}`,
		url: BASE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
