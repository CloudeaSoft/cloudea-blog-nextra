import { expect, test, type Page } from "@playwright/test";

/**
 * Mobile page-sheet contract:
 * 1. Short full-bleed pages: the translucent panel meets the footer (no
 *    wallpaper gap).
 * 2. Tall full-bleed pages: the panel must not paint over the footer.
 * Desktop keeps the floating card + margin above the footer.
 */

async function prepare(page: Page) {
	await page.route("https://events.vercount.one/**", (route) => route.abort());
	await page.route("**/vercount.one/**", (route) => route.abort());
	await page.route("**/avatar.png", (route) => route.abort());
	await page.route("**/avatar.jpg", (route) => route.abort());
	await page.route("**/dicebear.com/**", (route) => route.abort());
	await page.addInitScript(() => {
		try {
			localStorage.setItem("theme", "light");
		} catch {
			/* ignore */
		}
	});
}

async function gotoLight(page: Page, pathName: string) {
	await page.goto(pathName, { waitUntil: "networkidle" });
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

type SheetFooterGeometry = {
	gap: number;
	panelBottom: number;
	footerTop: number;
	footerHeight: number;
	footerCovered: boolean;
	footerInView: boolean;
};

async function sheetFooterGeometry(page: Page): Promise<SheetFooterGeometry> {
	const geometry = await page.evaluate(() => {
		const root = document.querySelector("[data-scroll-root]");
		const footer = document.querySelector(".site-footer");
		const panel = document.querySelector(".page-sheet__panel");
		if (
			!(root instanceof HTMLElement)
			|| !(footer instanceof HTMLElement)
			|| !(panel instanceof HTMLElement)
		) {
			return null;
		}

		const rootRect = root.getBoundingClientRect();
		const footerRect = footer.getBoundingClientRect();
		const panelRect = panel.getBoundingClientRect();
		const topInScroll = (rect: DOMRect) => rect.top - rootRect.top + root.scrollTop;
		const panelBottom = topInScroll(panelRect) + panelRect.height;
		const footerTop = topInScroll(footerRect);
		const probeY = footerRect.top + Math.min(8, Math.max(1, footerRect.height / 4));
		const probeX = footerRect.left + footerRect.width / 2;
		const hit = document.elementFromPoint(probeX, probeY);
		const footerInView = footerRect.bottom > rootRect.top && footerRect.top < rootRect.bottom;

		return {
			gap: footerTop - panelBottom,
			panelBottom,
			footerTop,
			footerHeight: footerRect.height,
			footerCovered: footerInView && hit != null && !footer.contains(hit),
			footerInView,
		};
	});

	expect(geometry, "page-sheet panel and footer should be in the DOM").not.toBeNull();
	return geometry as SheetFooterGeometry;
}

async function scrollToEnd(page: Page) {
	await page.evaluate(() => {
		const root = document.querySelector("[data-scroll-root]");
		if (root instanceof HTMLElement) {
			root.scrollTop = root.scrollHeight;
			return;
		}
		window.scrollTo(0, document.documentElement.scrollHeight);
	});
	await page.waitForTimeout(50);
}

const SHORT_SHEET_ROUTES = [
	{ name: "tools", path: "/tools" },
	{ name: "friends", path: "/friends" },
] as const;

const TALL_SHEET_ROUTES = [
	{ name: "about", path: "/about" },
	{ name: "post-sample", path: "/posts/github-250908" },
] as const;

test.describe("layout: mobile page sheet", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	for (const route of SHORT_SHEET_ROUTES) {
		test(`${route.name} panel meets the footer without covering it`, async ({
			page,
		}, testInfo) => {
			test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

			await gotoLight(page, route.path);
			const geometry = await sheetFooterGeometry(page);

			expect(geometry.footerHeight).toBeGreaterThan(20);
			expect(geometry.gap).toBeGreaterThanOrEqual(-1);
			expect(geometry.gap).toBeLessThanOrEqual(2);
			expect(geometry.footerCovered).toBe(false);
		});
	}

	for (const route of TALL_SHEET_ROUTES) {
		test(`${route.name} does not cover the footer at the bottom`, async ({
			page,
		}, testInfo) => {
			test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

			await gotoLight(page, route.path);
			await scrollToEnd(page);
			const geometry = await sheetFooterGeometry(page);

			expect(geometry.footerInView).toBe(true);
			expect(geometry.footerHeight).toBeGreaterThan(20);
			expect(geometry.gap).toBeGreaterThanOrEqual(-1);
			expect(geometry.footerCovered).toBe(false);
		});
	}
});

test.describe("layout: desktop page sheet", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("tools keeps a margin between the card and the footer", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");

		await gotoLight(page, "/tools");
		await scrollToEnd(page);
		const geometry = await sheetFooterGeometry(page);

		expect(geometry.footerCovered).toBe(false);
		expect(geometry.gap).toBeGreaterThan(20);
	});
});
