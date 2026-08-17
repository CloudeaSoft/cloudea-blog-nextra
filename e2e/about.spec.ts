import { expect, test, type Page } from "@playwright/test";

/**
 * About page: friend-link application section + Waline comments.
 */

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

async function gotoLight(page: Page, pathName = "/about") {
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

test.describe("about: friend-link exchange", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("shows the add-first policy, YAML templates, and comments", async ({
		page,
	}) => {
		await gotoLight(page, "/about");

		const exchange = page.getByRole("heading", { name: "友链交换" });
		await expect(exchange).toBeVisible();
		await expect(exchange).toHaveAttribute("id", "友链交换");

		await expect(page.getByText("请先将本站加入你的友链")).toBeVisible();
		await expect(
			page.locator("article").getByRole("link", { name: "Friends" }),
		).toHaveAttribute("href", "/friends");

		const siteYaml = page.locator("pre").filter({
			hasText: "link: https://blog.cloudea.work",
		});
		await expect(siteYaml).toBeVisible();
		await expect(siteYaml).toContainText("name: 清露茶坊 · Cloudea's Blog");
		await expect(siteYaml).toContainText("description: 雨落生烟，云过留露");
		await expect(siteYaml).toContainText(
			"avatar: https://blog.cloudea.work/images/avatar.jpg",
		);

		const applyYaml = page.locator("pre").filter({
			hasText: "link: https://your.site",
		});
		await expect(applyYaml).toBeVisible();
		await expect(applyYaml).toContainText("name: 你的站点名");
		await expect(applyYaml).toContainText("avatar: https://your.site/avatar.png");

		await expect(page.getByTestId("comments")).toBeVisible();
		await expect(page.getByTestId("comments")).toHaveAttribute(
			"aria-label",
			"评论",
		);
	});

	test("callout keeps type color and does not stack article p margins", async ({
		page,
	}) => {
		await gotoLight(page, "/about");

		const metrics = await page.evaluate(() => {
			const articleP = [...document.querySelectorAll("article.markdown-body p")]
				.find((node) => !node.closest(".nextra-callout"));
			const callout = document.querySelector(".nextra-callout");
			const calloutP = callout?.querySelector("p");
			if (
				!(articleP instanceof HTMLElement)
				|| !(callout instanceof HTMLElement)
				|| !(calloutP instanceof HTMLElement)
			) {
				return null;
			}

			const articleStyle = getComputedStyle(articleP);
			const calloutStyle = getComputedStyle(callout);
			const calloutPStyle = getComputedStyle(calloutP);
			return {
				articleMarginBottom: articleStyle.marginBottom,
				calloutPMarginTop: calloutPStyle.marginTop,
				calloutPMarginBottom: calloutPStyle.marginBottom,
				articleColor: articleStyle.color,
				calloutColor: calloutStyle.color,
				calloutPColor: calloutPStyle.color,
			};
		});

		expect(metrics).not.toBeNull();
		expect(parseFloat(metrics!.articleMarginBottom)).toBeGreaterThan(0);
		expect(metrics!.calloutPMarginTop).toBe("0px");
		expect(metrics!.calloutPMarginBottom).toBe("0px");
		expect(metrics!.calloutPColor).toBe(metrics!.calloutColor);
		expect(metrics!.calloutPColor).not.toBe(metrics!.articleColor);
	});
});
