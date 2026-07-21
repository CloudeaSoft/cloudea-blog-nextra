import { expect, test, type Page } from "@playwright/test";

/**
 * Post TOC must stick with the fixed navbar at the top while scrolling.
 * Desktop: sidebar TOC. Mobile: sticky TOC bar under the navbar.
 */

const POST_WITH_TOC = "/posts/github-250908";

async function prepare(page: Page) {
	await page.route("https://events.vercount.one/**", (route) => route.abort());
	await page.route("**/vercount.one/**", (route) => route.abort());
	await page.addInitScript(() => {
		try {
			localStorage.setItem("theme", "light");
		} catch {
			/* ignore */
		}
	});
}

async function gotoLight(page: Page, path: string) {
	await page.goto(path, { waitUntil: "networkidle" });
	await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
	await page.waitForFunction(() => {
		const root = document.documentElement;
		return root.classList.contains("light") || root.classList.contains("dark");
	});
	await page.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		document.documentElement.style.colorScheme = "light";
	});
	await page.evaluate(async () => {
		if (document.fonts?.ready) await document.fonts.ready;
	});
	await page.waitForTimeout(100);
}

async function stickyMetrics(page: Page, tocTestId: string) {
	return page.evaluate((id) => {
		const toc = document.querySelector(`[data-testid="${id}"]`);
		const bar = document.querySelector("nav.navbar-bar");
		if (!toc || !bar) return null;

		const tocRect = toc.getBoundingClientRect();
		const barRect = bar.getBoundingClientRect();
		const style = getComputedStyle(toc);
		const rootStyle = getComputedStyle(document.body);
		const navbarHeight = rootStyle.getPropertyValue("--navbar-height").trim();

		return {
			position: style.position,
			top: style.top,
			navbarHeight,
			tocTop: tocRect.top,
			tocLeft: tocRect.left,
			tocRight: tocRect.right,
			tocWidth: tocRect.width,
			tocVisible:
				tocRect.bottom > 0
				&& tocRect.top < window.innerHeight
				&& tocRect.right > 0
				&& tocRect.left < window.innerWidth,
			barBottom: barRect.bottom,
			barTop: barRect.top,
			gap: tocRect.top - barRect.bottom,
			viewportWidth: window.innerWidth,
		};
	}, tocTestId);
}

test.describe("post TOC sticks with navbar", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("desktop TOC stays under navbar while scrolling", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");

		await gotoLight(page, POST_WITH_TOC);
		const toc = page.getByTestId("desktop-toc");
		await expect(toc).toBeVisible();

		// Scroll far enough that sticky engages and navbar goes compact.
		await page.evaluate(() => window.scrollTo(0, 900));
		await page.waitForTimeout(400);

		const metrics = await stickyMetrics(page, "desktop-toc");
		expect(metrics).not.toBeNull();
		expect(metrics!.position).toBe("sticky");
		expect(metrics!.barTop).toBeLessThanOrEqual(1);
		expect(metrics!.tocVisible).toBeTruthy();
		expect(metrics!.tocWidth).toBeGreaterThan(150);
		expect(metrics!.tocLeft).toBeLessThan(metrics!.viewportWidth);
		// TOC sits just below the fixed navbar (≈ 30px gap from sticky top offset).
		expect(metrics!.gap).toBeGreaterThan(20);
		expect(metrics!.gap).toBeLessThan(45);
		// Compact navbar still tracked via --navbar-height.
		expect(metrics!.navbarHeight).toBe("3rem");

		await expect(toc).toHaveScreenshot("post-desktop-toc-sticky.png");
		await expect(page).toHaveScreenshot("post-toc-sticky-with-navbar.png", {
			fullPage: false,
		});
	});

	test("mobile TOC bar sticks under navbar while scrolling", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

		await gotoLight(page, POST_WITH_TOC);
		const toc = page.getByTestId("mobile-toc");
		await expect(toc).toBeVisible();

		await page.evaluate(() => window.scrollTo(0, 700));
		await page.waitForTimeout(400);

		const metrics = await stickyMetrics(page, "mobile-toc");
		expect(metrics).not.toBeNull();
		expect(metrics!.position).toBe("sticky");
		expect(metrics!.barTop).toBeLessThanOrEqual(1);
		expect(metrics!.tocVisible).toBeTruthy();
		// Mobile TOC should sit flush under the navbar (no large gap).
		expect(metrics!.gap).toBeGreaterThanOrEqual(-1);
		expect(metrics!.gap).toBeLessThan(4);
		expect(metrics!.navbarHeight).toBe("3rem");

		await expect(page).toHaveScreenshot("post-mobile-toc-sticky-with-navbar.png", {
			fullPage: false,
		});
	});
});
