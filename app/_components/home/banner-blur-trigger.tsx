"use client";

import {
	type ReactNode,
	useEffect,
	useRef,
} from "react";
import { useSetAtom } from "jotai";
import { usePathname } from "next/navigation";
import { backgroundBlurAtom } from "@/stores/background";

/**
 * Observes the home greeting. When it leaves the viewport, signals the
 * global Background to blur; clears the signal on unmount / leave home.
 */
export function BannerBlurTrigger({ children }: { children: ReactNode }) {
	const ref = useRef<HTMLSpanElement>(null);
	const setBlurred = useSetAtom(backgroundBlurAtom);
	const pathname = usePathname();

	useEffect(() => {
		if (pathname !== "/") {
			setBlurred(false);
			return;
		}

		const target = ref.current;
		if (!target) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setBlurred(!entry.isIntersecting);
			},
			{
				// Treat as gone once it fully exits below the fixed navbar (~4rem).
				threshold: 0,
				rootMargin: "-64px 0px 0px 0px",
			},
		);

		observer.observe(target);
		return () => {
			observer.disconnect();
			setBlurred(false);
		};
	}, [pathname, setBlurred]);

	return (
		<span
			ref={ref}
			className="home-banner-greeting"
		>
			{children}
		</span>
	);
}
