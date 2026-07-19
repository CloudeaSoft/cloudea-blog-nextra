"use client";

import { useTransitionRouter } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { Button } from "nextra/components";
import type { FC } from "react";

export const GoBack: FC = () => {
	const router = useTransitionRouter();
	const segments = usePathname().split("/");

	const isNestedPage = segments.length > 2;
	if (!isNestedPage) return null;

	// history.back() is safe here: InPageAnchors rewrites in-page #anchor
	// clicks to replaceState, so no hash entries stand between this page and
	// the real previous one.
	return (
		<Button
			onClick={router.back}
			className="x:print:hidden x:underline x:mb-6 x:inline-block"
		>
			← Back
		</Button>
	);
};
