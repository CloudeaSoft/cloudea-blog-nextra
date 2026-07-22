import { expect, test, type Page, type Locator } from "@playwright/test";
import { scrollPage } from "./helpers";

/**
 * Navbar interaction coverage:
 * 1. Desktop: expanded (top) vs compact (scrolled) navbar
 * 2. Mobile: drawer slides in (must not teleport / flash)
 * 3. Mobile: hamburger uses Iconify transition icons when toggling
 */

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

async function gotoLight(page: Page, path = "/") {
	await page.goto(path, { waitUntil: "networkidle" });
	await page.emulateMedia({ colorScheme: "light" });
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

async function readTransition(locator: Locator) {
	return locator.evaluate((el) => {
		const style = getComputedStyle(el);
		const durations = style.transitionDuration
			.split(",")
			.map((part) => parseFloat(part.trim()))
			.filter((n) => !Number.isNaN(n));
		const maxDurationSec = durations.length ? Math.max(...durations) : 0;
		return {
			property: style.transitionProperty,
			duration: style.transitionDuration,
			maxDurationSec,
			translate: style.translate,
			transform: style.transform,
			visibility: style.visibility,
		};
	});
}

/** Sample computed translate/transform for ~durationMs via rAF. */
async function sampleMotion(locator: Locator, durationMs = 220) {
	return locator.evaluate(async (el, ms) => {
		const samples: string[] = [];
		const start = performance.now();
		while (performance.now() - start < ms) {
			const style = getComputedStyle(el);
			samples.push(style.translate || style.transform);
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		}
		return samples;
	}, durationMs);
}

function isFullyOpen(sample: string) {
	return (
		sample === "none"
		|| sample === "0px"
		|| sample === ""
		|| sample === "matrix(1, 0, 0, 1, 0, 0)"
	);
}

function isFullyClosed(sample: string) {
	return sample === "100%" || /matrix\(1,\s*0,\s*0,\s*1,\s*\d/.test(sample);
}

test.describe("navbar: scroll compact", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("desktop expanded vs compact", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");

		await gotoLight(page, "/");
		await page.emulateMedia({ reducedMotion: "reduce" });

		const bar = page.locator("nav.navbar-bar").first();

		await expect(bar).not.toHaveAttribute("data-compact");
		await expect(bar).toHaveScreenshot("navbar-expanded.png");

		await scrollPage(page, 80);
		await expect(bar).toHaveAttribute("data-compact", "true");
		await page.waitForTimeout(350); // height transition ~320ms
		await expect(bar).toHaveScreenshot("navbar-compact.png");
	});

	test("mobile stays expanded after scroll", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

		await gotoLight(page, "/");
		await page.emulateMedia({ reducedMotion: "reduce" });

		const bar = page.locator("nav.navbar-bar").first();
		await expect(bar).not.toHaveAttribute("data-compact");

		await scrollPage(page, 80);
		await page.waitForTimeout(100);
		await expect(bar).not.toHaveAttribute("data-compact");
	});
});

test.describe("navbar: mobile drawer slide", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("drawer slides open without flashing", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

		await gotoLight(page, "/");
		await page.emulateMedia({ reducedMotion: "no-preference" });

		const button = page.getByTestId("mobile-menu-button");
		const drawer = page.getByTestId("mobile-nav-drawer");

		await expect(drawer).not.toHaveAttribute("data-open");

		const closed = await readTransition(drawer);
		expect(closed.property).toMatch(/translate/);
		expect(closed.maxDurationSec).toBeGreaterThanOrEqual(0.25);

		await expect(page.locator("nav.navbar-bar")).toHaveScreenshot(
			"mobile-menu-closed-bar.png",
			{ animations: "allow" },
		);

		// Start sampling in the same turn as the click so we catch intermediate frames.
		const samplesPromise = sampleMotion(drawer, 240);
		await button.click();
		const samples = await samplesPromise;

		await expect(drawer).toHaveAttribute("data-open", "true");

		const unique = [...new Set(samples)];
		expect(unique.length).toBeGreaterThan(1);
		// Must pass through at least one intermediate value (not only closed→open jump).
		const hasIntermediate = samples.some(
			(sample) => !isFullyOpen(sample) && !isFullyClosed(sample),
		);
		expect(hasIntermediate).toBeTruthy();

		// Transition contract: removing translate from transition would cause a flash.
		const midContract = await readTransition(drawer);
		expect(midContract.property).toMatch(/translate/);
		expect(midContract.maxDurationSec).toBeGreaterThanOrEqual(0.25);

		await page.waitForTimeout(200);
		const open = await readTransition(drawer);
		expect(open.visibility).toBe("visible");
		expect(isFullyOpen(open.translate) || isFullyOpen(open.transform)).toBeTruthy();

		await expect(page).toHaveScreenshot("mobile-drawer-open.png", {
			animations: "allow",
		});
	});
});

test.describe("navbar: desktop menu dismiss", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("menu panel closes after clicking a link", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");

		await gotoLight(page, "/");
		await page.emulateMedia({ reducedMotion: "reduce" });

		const aboutMenu = page.locator(".navbar-links .navbar-menu").filter({
			hasText: "About",
		});
		const dropdown = aboutMenu.locator(".navbar-menu__dropdown");

		await aboutMenu.hover();
		await expect(dropdown).toBeVisible();

		const friendsOption = aboutMenu.locator(".navbar-menu__option", {
			hasText: "Friends",
		});
		await friendsOption.click();
		await page.waitForURL("**/friends");

		// Headless UI Menu closes the panel on MenuItem activate.
		await expect(dropdown).toHaveCount(0);

		// Leaving and re-hovering must be able to open again.
		await page.locator("body").hover({ position: { x: 8, y: 8 } });
		await aboutMenu.hover();
		await expect(aboutMenu.locator(".navbar-menu__dropdown")).toBeVisible();
	});
});

test.describe("navbar: mobile menu icon transition", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("hamburger uses transition icons when toggling", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

		await gotoLight(page, "/");
		await page.emulateMedia({ reducedMotion: "no-preference" });

		const button = page.getByTestId("mobile-menu-button");
		const icon = page.getByTestId("mobile-menu-icon");

		// Closed state must use the animated close→menu iconify set.
		await expect(icon).toHaveAttribute("icon", "line-md:close-to-menu-transition");
		await expect(button).toHaveScreenshot("mobile-menu-icon-closed.png", {
			animations: "allow",
		});

		await button.click();
		// Open state must use the animated menu→close set (not a static glyph swap).
		await expect(icon).toHaveAttribute("icon", "line-md:menu-to-close-transition");
		await page.waitForTimeout(450);
		await expect(button).toHaveScreenshot("mobile-menu-icon-open.png", {
			animations: "allow",
		});

		await button.click();
		await expect(icon).toHaveAttribute("icon", "line-md:close-to-menu-transition");
		await page.waitForTimeout(450);
		await expect(button).toHaveScreenshot("mobile-menu-icon-closed-again.png", {
			animations: "allow",
		});
	});
});
