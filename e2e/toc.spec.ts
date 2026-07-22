import { expect, test, type Page } from "@playwright/test";
import { scrollPage } from "./helpers";

/**
 * TOC coverage for the sticky sidebar / mobile bar:
 * 1. Desktop: stays flush under the navbar while compact height animates
 * 2. Empty headings: desktop + mobile TOC chrome still renders
 */

const POST_WITH_HEADINGS = "/posts/dotnet-260529";
const POST_WITHOUT_HEADINGS = "/posts/github-250910";

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

function desktopToc(page: Page) {
	return page.locator(".toc-sticky").filter({ has: page.locator("h3") });
}

function mobileToc(page: Page) {
	return page.locator(".toc-sticky").filter({ has: page.getByRole("button") });
}

test.describe("toc: sticky flush under compact navbar", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("desktop TOC top tracks navbar height mid-animation", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");

		await gotoLight(page, POST_WITH_HEADINGS);
		await page.emulateMedia({ reducedMotion: "no-preference" });

		const bar = page.locator("nav.navbar-bar").first();
		const toc = desktopToc(page);

		await expect(toc).toBeVisible();
		await expect(toc.getByRole("heading", { name: "Table of Contents" })).toBeVisible();

		// Stick the TOC, then settle expanded so the next compact toggle animates.
		await scrollPage(page, 900);
		await page.waitForTimeout(400);
		await page.evaluate(() => {
			document.querySelector(".navbar-header")?.removeAttribute("data-compact");
			document.querySelector("nav.navbar-bar")?.removeAttribute("data-compact");
		});
		await expect(bar).not.toHaveAttribute("data-compact");
		await page.waitForTimeout(400);

		const result = await page.evaluate(async () => {
			const nav = document.querySelector("nav.navbar-bar");
			const header = document.querySelector(".navbar-header");
			const tocEl = [...document.querySelectorAll(".toc-sticky")].find((el) => {
				const style = getComputedStyle(el);
				return (
					style.display !== "none"
					&& el.offsetWidth > 100
					&& !!el.querySelector(":scope > h3")
				);
			});
			if (!nav || !header || !tocEl) {
				return { error: "missing nav or toc" as const };
			}

			const samples: { navH: number; tocTop: number; gap: number }[] = [];
			const push = () => {
				const nr = nav.getBoundingClientRect();
				const tr = tocEl.getBoundingClientRect();
				samples.push({
					navH: +nr.height.toFixed(2),
					tocTop: +tr.top.toFixed(2),
					gap: +(tr.top - nr.bottom).toFixed(2),
				});
			};

			push();
			header.setAttribute("data-compact", "");
			nav.setAttribute("data-compact", "");

			await new Promise<void>((resolve) => {
				const start = performance.now();
				const tick = (now: number) => {
					push();
					if (now - start < 400) requestAnimationFrame(tick);
					else resolve();
				};
				requestAnimationFrame(tick);
			});

			const uniqueHeights = [...new Set(samples.map((s) => s.navH))];
			const uniqueTops = [...new Set(samples.map((s) => s.tocTop))];
			const maxAbsGap = Math.max(...samples.map((s) => Math.abs(s.gap)));

			return {
				uniqueHeights,
				uniqueTops,
				maxAbsGap,
				heightAnimated: uniqueHeights.length > 2,
				topAnimated: uniqueTops.length > 2,
				settled: samples.at(-1),
			};
		});

		expect(result).not.toHaveProperty("error");
		if ("error" in result) return;

		expect(result.heightAnimated).toBeTruthy();
		expect(result.topAnimated).toBeTruthy();
		expect(result.maxAbsGap).toBeLessThanOrEqual(1);
		expect(result.settled?.gap).toBeCloseTo(0, 0);
		await expect(bar).toHaveAttribute("data-compact");
	});

	test("desktop TOC sits flush after compact settles", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");

		await gotoLight(page, POST_WITH_HEADINGS);
		await page.emulateMedia({ reducedMotion: "reduce" });

		await scrollPage(page, 900);
		const bar = page.locator("nav.navbar-bar").first();
		await expect(bar).toHaveAttribute("data-compact", "true");
		await page.waitForTimeout(50);

		const gap = await page.evaluate(() => {
			const nav = document.querySelector("nav.navbar-bar");
			const tocEl = [...document.querySelectorAll(".toc-sticky")].find((el) => {
				const style = getComputedStyle(el);
				return (
					style.display !== "none"
					&& el.offsetWidth > 100
					&& !!el.querySelector(":scope > h3")
				);
			});
			if (!nav || !tocEl) return null;
			const nr = nav.getBoundingClientRect();
			const tr = tocEl.getBoundingClientRect();
			return +(tr.top - nr.bottom).toFixed(2);
		});

		expect(gap).not.toBeNull();
		expect(Math.abs(gap ?? 99)).toBeLessThanOrEqual(1);
	});
});

test.describe("toc: empty headings still visible", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("desktop sidebar shows placeholder when toc is empty", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");

		await gotoLight(page, POST_WITHOUT_HEADINGS);
		await page.emulateMedia({ reducedMotion: "reduce" });

		const toc = desktopToc(page);
		await expect(toc).toBeVisible();
		await expect(toc.getByRole("heading", { name: "Table of Contents" })).toBeVisible();
		await expect(toc.getByText("No headings")).toBeVisible();
		await expect(toc.locator("a")).toHaveCount(0);
	});

	test("mobile bar shows when toc is empty", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

		await gotoLight(page, POST_WITHOUT_HEADINGS);
		await page.emulateMedia({ reducedMotion: "reduce" });

		const toc = mobileToc(page);
		await expect(toc).toBeVisible();
		await expect(toc.getByRole("button", { name: /Table of Contents/i })).toBeVisible();

		await toc.getByRole("button", { name: /Table of Contents/i }).click();
		await expect(toc.getByText("No headings")).toBeVisible();
	});
});
