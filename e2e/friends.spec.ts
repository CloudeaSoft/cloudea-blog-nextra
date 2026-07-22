import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

/**
 * Friends page coverage:
 * 1. YAML-driven categories / cards render
 * 2. Desktop + mobile About → Friends navigation
 * 3. Card chrome (single-line text, hover keeps colors, external hit link)
 */

type FriendLink = {
	name: string;
	link: string;
	description?: string;
	avatar?: string;
};

type FriendCategory = {
	links_category: string;
	list: FriendLink[];
};

function loadFriendsYaml(): FriendCategory[] {
	const filePath = path.join(process.cwd(), "app/friends/friends.yml");
	const data = parse(fs.readFileSync(filePath, "utf8")) as FriendCategory[];
	expect(Array.isArray(data)).toBeTruthy();
	expect(data.length).toBeGreaterThan(0);
	return data;
}

async function prepare(page: Page) {
	await page.route("https://events.vercount.one/**", (route) => route.abort());
	await page.route("**/vercount.one/**", (route) => route.abort());
	// Avatars are decorative for these assertions; avoid flaky external loads.
	await page.route("**/avatar.png", (route) => route.abort());
	await page.route("**/dicebear.com/**", (route) => route.abort());
	await page.addInitScript(() => {
		try {
			localStorage.setItem("theme", "light");
		} catch {
			/* ignore */
		}
	});
}

async function gotoLight(page: Page, pathName = "/friends") {
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

test.describe("friends: page content", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("renders categories and cards from friends.yml", async ({ page }) => {
		const categories = loadFriendsYaml();
		await gotoLight(page, "/friends");

		await expect(page.getByRole("heading", { level: 1, name: "Friends" })).toBeVisible();

		for (const category of categories) {
			await expect(
				page.locator(".friends-category__title", {
					hasText: category.links_category,
				}),
			).toBeVisible();

			for (const friend of category.list) {
				const card = page.locator(".friend-card", {
					has: page.locator(".friend-card__name", { hasText: friend.name }),
				});
				await expect(card).toBeVisible();
				await expect(card.locator(".friend-card__name")).toHaveText(friend.name);
				if (friend.description) {
					await expect(card.locator(".friend-card__desc")).toHaveText(
						friend.description,
					);
				}
				await expect(card.locator(".friend-card__hit")).toHaveAttribute(
					"href",
					friend.link,
				);
				await expect(card.locator(".friend-card__hit")).toHaveAttribute(
					"target",
					"_blank",
				);
				await expect(card.locator(".friend-card__hit")).toHaveAttribute(
					"rel",
					"noopener noreferrer",
				);
			}
		}

		await expect(page.getByRole("heading", { name: "Exchange" })).toBeVisible();
		await expect(
			page.locator(".friends-exchange__mail"),
		).toHaveAttribute("href", /mailto:cloudeasoft@qq\.com/);
	});

	test("title and description stay single-line", async ({ page }) => {
		await gotoLight(page, "/friends");
		const card = page.locator(".friend-card").first();
		await expect(card).toBeVisible();

		const styles = await card.evaluate((el) => {
			const name = el.querySelector(".friend-card__name");
			const desc = el.querySelector(".friend-card__desc");
			if (!name) return null;
			const nameStyle = getComputedStyle(name);
			const descStyle = desc ? getComputedStyle(desc) : null;
			return {
				nameWhiteSpace: nameStyle.whiteSpace,
				nameOverflow: nameStyle.overflow,
				nameTextOverflow: nameStyle.textOverflow,
				descWhiteSpace: descStyle?.whiteSpace ?? null,
				descOverflow: descStyle?.overflow ?? null,
				descTextOverflow: descStyle?.textOverflow ?? null,
			};
		});

		expect(styles).not.toBeNull();
		expect(styles!.nameWhiteSpace).toBe("nowrap");
		expect(styles!.nameOverflow).toBe("hidden");
		expect(styles!.nameTextOverflow).toBe("ellipsis");
		if (styles!.descWhiteSpace !== null) {
			expect(styles!.descWhiteSpace).toBe("nowrap");
			expect(styles!.descOverflow).toBe("hidden");
			expect(styles!.descTextOverflow).toBe("ellipsis");
		}
	});

	test("hover does not recolor name or description", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "hover is a desktop concern");

		await gotoLight(page, "/friends");
		const card = page.locator(".friend-card").first();
		await expect(card).toBeVisible();

		const before = await card.evaluate((el) => {
			const name = el.querySelector(".friend-card__name");
			const desc = el.querySelector(".friend-card__desc");
			return {
				name: name ? getComputedStyle(name).color : null,
				desc: desc ? getComputedStyle(desc).color : null,
			};
		});

		await card.hover();
		await page.waitForTimeout(120);

		const after = await card.evaluate((el) => {
			const name = el.querySelector(".friend-card__name");
			const desc = el.querySelector(".friend-card__desc");
			return {
				name: name ? getComputedStyle(name).color : null,
				desc: desc ? getComputedStyle(desc).color : null,
			};
		});

		expect(after.name).toBe(before.name);
		expect(after.desc).toBe(before.desc);
	});
});

test.describe("friends: navigation", () => {
	test.beforeEach(async ({ page }) => {
		await prepare(page);
	});

	test("desktop About menu links to Friends", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop only");

		await gotoLight(page, "/");
		const aboutMenu = page.locator(".navbar-links .navbar-menu").filter({
			hasText: "About",
		});
		await aboutMenu.hover();

		const friendsOption = aboutMenu.locator(".navbar-menu__option", {
			hasText: "Friends",
		});
		await expect(friendsOption).toBeVisible();
		await expect(friendsOption).toHaveAttribute("href", "/friends");

		await friendsOption.click();
		await page.waitForURL("**/friends");
		await expect(page.getByRole("heading", { level: 1, name: "Friends" })).toBeVisible();

		// About stays the active top-level item while on /friends.
		await expect(
			page.locator(".navbar-links .navbar-link--menu[data-active]"),
		).toBeVisible();
	});

	test("mobile About menu links to Friends", async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile only");

		await gotoLight(page, "/");
		await page.getByTestId("mobile-menu-button").click();
		await expect(page.getByTestId("mobile-nav-drawer")).toHaveAttribute(
			"data-open",
			"true",
		);

		const drawer = page.getByTestId("mobile-nav-drawer");
		const aboutSubmenu = drawer.getByTestId("mobile-nav-submenu");
		// Accordion starts expanded — Friends is reachable without an extra tap.
		await expect(aboutSubmenu).toHaveAttribute("data-open", "true");
		const friendsLink = drawer.getByRole("link", { name: "Friends" });
		await expect(friendsLink).toBeVisible();
		await friendsLink.click();

		await page.waitForURL("**/friends");
		await expect(page.getByRole("heading", { level: 1, name: "Friends" })).toBeVisible();
	});
});
