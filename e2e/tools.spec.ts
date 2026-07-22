import { expect, test, type Page } from "@playwright/test";

/**
 * Tools hub + HLSL Preview smoke coverage (functional, not screenshot-based).
 */

async function prepare(page: Page) {
	await page.route("https://events.vercount.one/**", (route) => route.abort());
	await page.route("**/vercount.one/**", (route) => route.abort());
	await page.route("https://cdn.jsdelivr.net/**", (route) => route.continue());
	await page.addInitScript(() => {
		try {
			localStorage.setItem("theme", "light");
			localStorage.removeItem("cloudea-tools-hlsl-preview-snapshot-v1");
		} catch {
			/* ignore */
		}
	});
}

async function gotoLight(page: Page, pathName: string) {
	await page.goto(pathName, { waitUntil: "domcontentloaded" });
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
}

test.describe("tools: hub", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("lists HLSL Preview and links to the tool", async ({ page }) => {
		await gotoLight(page, "/tools");
		await expect(page.getByRole("heading", { level: 1, name: "Tools" })).toBeVisible();
		const card = page.locator("a", { hasText: "HLSL Preview" }).first();
		await expect(card).toBeVisible();
		await expect(card).toHaveAttribute("href", "/tools/hlsl-preview");
		await card.click();
		await expect(page).toHaveURL(/\/tools\/hlsl-preview\/?$/);
	});
});

test.describe("tools: hlsl preview", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("renders preview chrome and compiles defaults", async ({ page }) => {
		await gotoLight(page, "/tools/hlsl-preview");

		await expect(
			page.getByRole("heading", { level: 1, name: "HLSL Preview" }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: /Compile & Run/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /^Save$/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /^Reset$/i })).toBeVisible();
		await expect(page.locator("canvas.hlsl-preview__canvas")).toBeVisible();

		// Editors (Monaco may still be loading — labels are enough for smoke).
		await expect(page.getByText("C# — geometry / Draw(time)")).toBeVisible();
		await expect(page.getByText("VS — vertex shader")).toBeVisible();
		await expect(page.getByText("PS — pixel / fragment shader")).toBeVisible();

		await page.getByRole("button", { name: /Compile & Run/i }).click();
		await expect(page.locator(".hlsl-preview__status")).toContainText(/Running|Saved/i, {
			timeout: 15_000,
		});
		await expect(page.locator(".hlsl-preview__error")).toHaveCount(0);
	});

	test("Save writes a localStorage snapshot", async ({ page }) => {
		await gotoLight(page, "/tools/hlsl-preview");
		const saveButton = page.getByRole("button", { name: /^Save$/i });
		await expect(saveButton).toBeVisible();

		await saveButton.click();

		await expect.poll(async () => {
			return page.evaluate(() =>
				localStorage.getItem("cloudea-tools-hlsl-preview-snapshot-v1"));
		}).toBeTruthy();

		const raw = await page.evaluate(() =>
			localStorage.getItem("cloudea-tools-hlsl-preview-snapshot-v1"));
		const parsed = JSON.parse(raw!) as {
			version: number;
			csharpSource: string;
			textures: unknown[];
			savedAt: string;
		};
		expect(parsed.version).toBe(1);
		expect(parsed.csharpSource.length).toBeGreaterThan(0);
		expect(Array.isArray(parsed.textures)).toBeTruthy();
		expect(parsed.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

		// Ctrl/Cmd+S should also persist (capture-phase handler on the page).
		await page.locator(".hlsl-preview").click();
		await page.keyboard.press("Control+KeyS");
		await expect.poll(async () => {
			const next = await page.evaluate(() =>
				localStorage.getItem("cloudea-tools-hlsl-preview-snapshot-v1"));
			if (!next) return false;
			const snap = JSON.parse(next) as { savedAt: string };
			return snap.savedAt !== parsed.savedAt;
		}).toBeTruthy();
	});
});
