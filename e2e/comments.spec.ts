import { expect, test, type Page } from "@playwright/test";

const POST_WITH_COMMENTS = "/posts/github-250908";

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

async function gotoThemed(page: Page, path: string, theme: "light" | "dark") {
	await page.goto(path, { waitUntil: "networkidle" });
	await page.emulateMedia({
		reducedMotion: "reduce",
		colorScheme: theme,
	});
	await page.waitForFunction(() => {
		const root = document.documentElement;
		return root.classList.contains("light") || root.classList.contains("dark");
	});
	await page.evaluate((nextTheme) => {
		document.documentElement.classList.remove("light", "dark");
		document.documentElement.classList.add(nextTheme);
		document.documentElement.style.colorScheme = nextTheme;
	}, theme);
	await page.evaluate(async () => {
		if (document.fonts?.ready) await document.fonts.ready;
	});
	await page.waitForTimeout(100);
}

async function resolvedColors(page: Page) {
	return page.evaluate(() => {
		const root = document.querySelector(".waline-comments");
		if (!(root instanceof HTMLElement)) {
			return null;
		}

		const probe = (token: string) => {
			const span = document.createElement("span");
			span.style.color = `var(${token})`;
			root.appendChild(span);
			const color = getComputedStyle(span).color;
			span.remove();
			return color;
		};

		return {
			walineTheme: probe("--waline-theme-color"),
			walineActive: probe("--waline-active-color"),
			primary: probe("--primary-color"),
			selection: probe("--selection-color"),
		};
	});
}

test.describe("Waline comment theme", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	for (const theme of ["light", "dark"] as const) {
		test(`${theme} accent matches --primary-color`, async ({ page }) => {
			await gotoThemed(page, POST_WITH_COMMENTS, theme);
			const comments = page.locator(".waline-comments");
			await comments.waitFor();
			await comments.scrollIntoViewIfNeeded();

			const colors = await resolvedColors(page);
			expect(colors).not.toBeNull();
			expect(colors?.walineTheme).toBe(colors?.primary);
			expect(colors?.walineActive).toBe(colors?.selection);
			expect(colors?.primary).toBe("rgb(163, 31, 52)");
			expect(colors?.selection).toBe("rgb(190, 36, 60)");
		});
	}
});
