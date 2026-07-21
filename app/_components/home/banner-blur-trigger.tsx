"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { usePathname } from "next/navigation";
import { backgroundBlurAtom } from "@/stores/background";

/** Roughly when the home greeting has scrolled out of view. */
const HOME_BLUR_SCROLL_Y = 420;

/**
 * On the home page, blur the global background after a simple scroll
 * threshold. Clears on unmount / leave home.
 */
export function BannerBlurTrigger() {
	const setBlurred = useSetAtom(backgroundBlurAtom);
	const pathname = usePathname();

	useEffect(() => {
		if (pathname !== "/") {
			setBlurred(false);
			return;
		}

		const update = () => {
			setBlurred(window.scrollY > HOME_BLUR_SCROLL_Y);
		};

		update();
		window.addEventListener("scroll", update, { passive: true });
		return () => {
			window.removeEventListener("scroll", update);
			setBlurred(false);
		};
	}, [pathname, setBlurred]);

	return null;
}
