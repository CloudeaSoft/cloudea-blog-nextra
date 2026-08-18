import { expect, test, type Page } from "@playwright/test";

const POST_WITH_LANGUAGE = "/posts/js-nuxt-pinia";
const POST_WITHOUT_LANGUAGE = "/posts/ds-pop-sequence";
const POST_WITH_LOG = "/posts/github-250908";

async function prepare(page: Page) {
	await page.route("https://events.vercount.one/**", (route) => route.abort());
	await page.route("**/vercount.one/**", (route) => route.abort());
	await page.route("https://blog-comment.cloudea.work/**", (route) => route.abort());
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
	await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
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

function fencedBlocks(page: Page) {
	return page.locator("div.nextra-code");
}

function codeHeaders(page: Page) {
	return page.locator("div.nextra-code > div:has(+ pre)");
}

test.describe("markdown code blocks", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("shows language header and copy on explicit fences", async ({ page }) => {
		await gotoLight(page, POST_WITH_LANGUAGE);

		const blocks = fencedBlocks(page);
		await expect(blocks.first()).toBeVisible();

		const headers = codeHeaders(page);
		await expect(headers.first()).toBeVisible();
		await expect(headers.first()).toContainText("bash");
		await expect(headers).toHaveCount(await blocks.count());

		await expect(headers.first().getByTitle("Copy code")).toBeVisible();
	});

	test("shows log language label on github post fences", async ({ page }) => {
		await gotoLight(page, POST_WITH_LOG);

		const headers = codeHeaders(page);
		await expect(headers.first()).toBeVisible();
		await expect(headers.first()).toContainText("log");
		await expect(headers.first().getByTitle("Copy code")).toBeVisible();
	});

	test("omits header on unmarked fences but keeps copy", async ({ page }) => {
		await gotoLight(page, POST_WITHOUT_LANGUAGE);

		const blocks = fencedBlocks(page);
		await expect(blocks.first()).toBeVisible();
		await expect(codeHeaders(page)).toHaveCount(0);

		await expect(blocks.first().getByTitle("Copy code")).toBeAttached();
	});
});
