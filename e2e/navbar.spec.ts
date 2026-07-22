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

	test("mobile expands then compactifies on scroll", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

		await gotoLight(page, "/");
		await page.emulateMedia({ reducedMotion: "reduce" });

		const bar = page.locator("nav.navbar-bar").first();
		await expect(bar).not.toHaveAttribute("data-compact");

		await scrollPage(page, 80);
		await expect(bar).toHaveAttribute("data-compact", "true");
		await page.waitForTimeout(350);
		await expect(bar).toHaveScreenshot("mobile-navbar-compact.png");
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

	test("hover still opens after clicking the menu button", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");

		await gotoLight(page, "/");
		await page.emulateMedia({ reducedMotion: "reduce" });

		const aboutMenu = page.locator(".navbar-links .navbar-menu").filter({
			hasText: "About",
		});
		const dropdown = aboutMenu.locator(".navbar-menu__dropdown");
		const trigger = aboutMenu.locator(".navbar-link--menu");

		await aboutMenu.hover();
		await expect(dropdown).toBeVisible();

		// Real mouse click used to stick Headless UI's pointerType at "mouse",
		// after which programmatic click()-to-open from mouseenter stopped working.
		await trigger.click();
		await page.locator("body").hover({ position: { x: 8, y: 8 } });
		await expect(dropdown).toHaveCount(0);

		await aboutMenu.hover();
		await expect(aboutMenu.locator(".navbar-menu__dropdown")).toBeVisible();
	});
});

test.describe("navbar: mobile nested menu", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("About submenu starts expanded and toggles on click", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

		await gotoLight(page, "/");
		await page.getByTestId("mobile-menu-button").click();

		const drawer = page.getByTestId("mobile-nav-drawer");
		const submenu = drawer.getByTestId("mobile-nav-submenu");
		const aboutButton = submenu.getByRole("button", { name: /About/i });
		const friendsLink = submenu.getByRole("link", { name: "Friends" });

		await expect(submenu).toHaveAttribute("data-open", "true");
		await expect(friendsLink).toBeVisible();

		await aboutButton.click();
		await expect(submenu).not.toHaveAttribute("data-open", "true");
		await expect(friendsLink).toHaveCount(0);

		await aboutButton.click();
		await expect(submenu).toHaveAttribute("data-open", "true");
		await expect(friendsLink).toBeVisible();
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

/**
 * Nextra portals `.nextra-search-results` to <body> (default z-30). The sticky
 * header / mobile drawer use a z-50 stacking context, so without an override
 * results paint underneath — clipped by the glass bar on desktop, fully
 * hidden behind the drawer on mobile.
 */
test.describe("navbar: search results stacking", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("desktop results paint above the sticky navbar", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");

		await gotoLight(page, "/");
		await page.emulateMedia({ reducedMotion: "reduce" });

		const search = page.locator(".navbar-bar .nextra-search input").first();
		await search.click();
		await search.fill("test");

		const results = page.locator(".nextra-search-results");
		await expect(results).toBeVisible();

		const stacking = await page.evaluate(() => {
			const panel = document.querySelector(".nextra-search-results");
			const header = document.querySelector(".navbar-header");
			if (!(panel instanceof HTMLElement) || !(header instanceof HTMLElement)) {
				return null;
			}
			const panelZ = Number(getComputedStyle(panel).zIndex);
			const headerZ = Number(getComputedStyle(header).zIndex);
			const rr = panel.getBoundingClientRect();
			const hr = header.getBoundingClientRect();
			// Probe inside the panel, preferring the overlap with the sticky bar
			// where a too-low z-index would let the header win hit-testing.
			const y = Math.min(rr.top + 8, Math.max(hr.bottom - 2, rr.top + 2));
			const x = rr.left + rr.width / 2;
			const topEl = document.elementFromPoint(x, y);
			return {
				panelZ,
				headerZ,
				hitResults: !!(topEl && (topEl === panel || panel.contains(topEl))),
				hitHeader: !!(topEl && (topEl === header || header.contains(topEl))),
			};
		});

		expect(stacking).not.toBeNull();
		expect(stacking!.panelZ).toBeGreaterThan(stacking!.headerZ);
		expect(stacking!.hitResults).toBeTruthy();
		expect(stacking!.hitHeader).toBeFalsy();
	});

	test("mobile results paint above the drawer", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

		await gotoLight(page, "/");
		await page.emulateMedia({ reducedMotion: "reduce" });

		await page.getByTestId("mobile-menu-button").click();
		const drawer = page.getByTestId("mobile-nav-drawer");
		await expect(drawer).toHaveAttribute("data-open", "true");

		const search = drawer.locator(".nextra-search input");
		await search.click();
		await search.fill("test");

		const results = page.locator(".nextra-search-results");
		await expect(results).toBeVisible();

		const stacking = await page.evaluate(() => {
			const panel = document.querySelector(".nextra-search-results");
			const drawerEl = document.querySelector(
				"[data-testid='mobile-nav-drawer']",
			);
			if (!(panel instanceof HTMLElement) || !(drawerEl instanceof HTMLElement)) {
				return null;
			}
			const panelZ = Number(getComputedStyle(panel).zIndex);
			const drawerZ = Number(getComputedStyle(drawerEl).zIndex);
			const rr = panel.getBoundingClientRect();
			const x = rr.left + rr.width / 2;
			const y = rr.top + Math.min(80, rr.height / 2);
			const topEl = document.elementFromPoint(x, y);
			return {
				panelZ,
				drawerZ,
				inViewport: rr.width > 0 && rr.height > 0
					&& rr.bottom > 0
					&& rr.top < window.innerHeight,
				hitResults: !!(topEl && (topEl === panel || panel.contains(topEl))),
				hitDrawer: !!(topEl && drawerEl.contains(topEl) && !panel.contains(topEl)),
			};
		});

		expect(stacking).not.toBeNull();
		expect(stacking!.panelZ).toBeGreaterThan(stacking!.drawerZ);
		expect(stacking!.inViewport).toBeTruthy();
		expect(stacking!.hitResults).toBeTruthy();
		expect(stacking!.hitDrawer).toBeFalsy();
	});
});
