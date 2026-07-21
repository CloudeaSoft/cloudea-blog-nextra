"use client";

import { useTheme } from "next-themes";
import { getImageUrl } from "@/utils/get-resources-url";
import { useMounted } from "nextra/hooks";
import type { CSSProperties } from "react";
import { useAtomValue } from "jotai";
import { backgroundBlurAtom } from "@/stores/background";
import "./background.scss";

const layerStyle: CSSProperties = {
	zIndex: -1,
	position: "fixed",
	top: 0,
	height: "100dvh",
	width: "100%",
	background: "center no-repeat",
	backgroundSize: "cover",
};

export const Background = () => {
	const { resolvedTheme } = useTheme();
	const mounted = useMounted();
	const blurred = useAtomValue(backgroundBlurAtom);

	// Before mount we can't know the theme, so the dark layer stays visible
	// (same default as before). Both layers stay mounted so theme changes
	// cross-fade instead of swapping instantly.
	const isLight = mounted && resolvedTheme === "light";

	return (
		<>
			<div
				aria-hidden
				className="site-background-layer"
				data-blurred={blurred || undefined}
				style={{
					...layerStyle,
					backgroundImage: `url(${getImageUrl("wallhaven-wqery6-light.webp")})`,
					opacity: isLight ? 1 : 0,
				}}
			></div>
			<div
				aria-hidden
				className="site-background-layer"
				data-blurred={blurred || undefined}
				style={{
					...layerStyle,
					backgroundImage: `url(${getImageUrl("wallhaven-wqery6-dark.webp")})`,
					opacity: isLight ? 0 : 1,
				}}
			></div>
		</>
	);
};
