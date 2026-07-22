import type { Page } from "@playwright/test";

/** Scroll the app scrollport (falls back to window). */
export async function scrollPage(page: Page, y: number) {
	await page.evaluate((top) => {
		const root = document.querySelector("[data-scroll-root]");
		if (root instanceof HTMLElement) {
			root.scrollTo(0, top);
			return;
		}
		window.scrollTo(0, top);
	}, y);
}
