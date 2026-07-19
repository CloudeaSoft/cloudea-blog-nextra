"use client";

import { useEffect } from "react";

/**
 * In-page anchor links (#hash) scroll smoothly and update the URL hash, but
 * via replaceState — so they never create history entries. Without this,
 * every TOC or heading-permalink click pushes a #hash entry, and the Back
 * button (GoBack) as well as the browser's own back button have to pop each
 * hash entry before they can actually leave the page.
 *
 * The listener runs in the capture phase so its preventDefault() lands before
 * Next <Link>'s own click handler (which skips navigation when the event is
 * already default-prevented) and before the browser's native anchor jump.
 */
export const InPageAnchors = () => {
	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			if (
				event.defaultPrevented
				|| event.button !== 0
				|| event.metaKey
				|| event.ctrlKey
				|| event.shiftKey
				|| event.altKey
			) {
				return;
			}
			const anchor = (event.target as Element).closest<HTMLAnchorElement>(
				"a[href^='#']",
			);
			if (!anchor) return;
			const hash = anchor.getAttribute("href");
			if (!hash || hash === "#") return;
			const target = document.getElementById(decodeURIComponent(hash.slice(1)));
			if (!target) return;

			event.preventDefault();
			target.scrollIntoView();
			// Preserve history.state (Next.js stores router internals there).
			history.replaceState(history.state, "", hash);
		};

		document.addEventListener("click", onClick, { capture: true });
		return () => {
			document.removeEventListener("click", onClick, { capture: true });
		};
	}, []);

	return null;
};
