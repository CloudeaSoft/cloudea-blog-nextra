import { expect, test, type Page } from "@playwright/test";
import { scrollPage } from "./helpers";

/**
 * Visual regression suite — screenshot baselines for layout/style changes.
 *
 * Workflow:
 * 1. VISUAL_REGRESSION=1 pnpm build
 * 2. pnpm test:visual              # compare against committed baselines
 * 3. pnpm test:visual:update       # refresh baselines after intentional UI changes
 */

const ROUTES = [
	{ name: "home", path: "/" },
	{ name: "posts", path: "/posts" },
	{ name: "categories", path: "/categories" },
	{ name: "tags", path: "/tags" },
	{ name: "about", path: "/about" },
	{ name: "friends", path: "/friends" },
	{ name: "post-sample", path: "/posts/github-250908" },
] as const;

async function preparePage(page: Page) {
	// Block third-party analytics that can mutate the DOM.
	await page.route("https://events.vercount.one/**", (route) => route.abort());
	await page.route("**/vercount.one/**", (route) => route.abort());
	// Friend avatars are external; abort so networkidle is not blocked by remote hosts.
	await page.route("**/avatar.png", (route) => route.abort());
	await page.route("**/avatar.jpg", (route) => route.abort());
	await page.route("**/dicebear.com/**", (route) => route.abort());

	// Force light theme before first paint (next-themes reads localStorage).
	await page.addInitScript(() => {
		try {
			localStorage.setItem("theme", "light");
		} catch {
			/* ignore */
		}
	});
}

async function gotoStable(page: Page, path: string) {
	await page.goto(path, { waitUntil: "networkidle" });
	await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });

	// Wait until next-themes has applied the resolved theme class.
	await page.waitForFunction(() => {
		const root = document.documentElement;
		return root.classList.contains("light") || root.classList.contains("dark");
	});

	// Prefer light; if dark won the race, force it.
	await page.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		document.documentElement.style.colorScheme = "light";
	});

	// Ensure webfonts / icon fonts have settled.
	await page.evaluate(async () => {
		if (document.fonts?.ready) {
			await document.fonts.ready;
		}
	});

	// Splash stays mounted and only fades out after `window.load`.
	await page.waitForFunction(() => {
		const splash = document.querySelector(".loader-bg");
		if (!splash) return true;
		const style = getComputedStyle(splash);
		return (
			splash.classList.contains("fade-out")
			&& (style.visibility === "hidden" || style.opacity === "0")
		);
	}, { timeout: 10_000 });

	// Brief settle for layout after theme + fonts + splash.
	await page.waitForTimeout(150);
}

test.describe("visual regression", () => {
	test.beforeEach(async ({ page }) => {
		await preparePage(page);
	});

	for (const route of ROUTES) {
		test(`${route.name} viewport`, async ({ page }, testInfo) => {
			await gotoStable(page, route.path);

			await expect(page).toHaveScreenshot(`${route.name}.png`, {
				fullPage: false,
				mask: [page.getByTestId("hitokoto")],
			});

			testInfo.annotations.push({
				type: "route",
				description: route.path,
			});
		});
	}

	test("home background blur after scroll", async ({ page }) => {
		await gotoStable(page, "/");

		// BannerBlurTrigger enables blur when scrollY > 420.
		await scrollPage(page, 480);
		await page.waitForTimeout(300);

		await expect
			.poll(async () =>
				page.locator(".site-background-layer[data-blurred]").count(),
			)
			.toBeGreaterThan(0);

		await expect(page).toHaveScreenshot("home-blurred.png", {
			fullPage: false,
			mask: [page.getByTestId("hitokoto")],
		});
	});
});
