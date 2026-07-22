/** Marks the element that owns page scroll (see `globals.css` `.app-scroll`). */
export const SCROLL_ROOT_SELECTOR = "[data-scroll-root]";

export function getScrollRoot(): HTMLElement | null {
	if (typeof document === "undefined") return null;
	return document.querySelector<HTMLElement>(SCROLL_ROOT_SELECTOR);
}

/** Scroll offset of the app scrollport (falls back to `window` before mount). */
export function getScrollY(): number {
	const root = getScrollRoot();
	return root ? root.scrollTop : window.scrollY;
}

/** Listen for scroll on the app scrollport (or `window` as fallback). */
export function onScrollY(
	handler: () => void,
	options?: AddEventListenerOptions,
): () => void {
	const root = getScrollRoot();
	const target: HTMLElement | Window = root ?? window;
	target.addEventListener("scroll", handler, options);
	return () => target.removeEventListener("scroll", handler);
}
