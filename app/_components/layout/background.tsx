"use client";

import { useTheme } from "next-themes";
import { getImageUrl } from "@/utils/get-resources-url";
import { useMounted } from "nextra/hooks";
import type { CSSProperties } from "react";
import { useAtomValue } from "jotai";
import { backgroundBlurAtom } from "@/stores/background";
import "./background.scss";

// Use the large viewport (`lvh`), not `dvh`: on mobile Chrome the UA chrome
// retracts while scrolling, and a dynamic height would reflow `background-size:
// cover` and make the wallpaper jump. `lvh` stays fixed at the chrome-hidden
// size so the cover crop is stable; a little overflow under the address bar is
// fine for a fixed full-bleed layer.
const layerStyle: CSSProperties = {
	zIndex: -1,
	position: "fixed",
	top: 0,
	height: "100lvh",
	width: "100%",
};

const mediaStyle: CSSProperties = {
	position: "absolute",
	inset: 0,
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
				data-theme-layer="light"
				style={{
					...layerStyle,
					opacity: isLight ? 1 : 0,
				}}
			>
				<div
					className="site-background-media"
					style={{
						...mediaStyle,
						backgroundImage: `url(${getImageUrl("wallhaven-wqery6-light.webp")})`,
					}}
				/>
			</div>
			<div
				aria-hidden
				className="site-background-layer"
				data-blurred={blurred || undefined}
				data-theme-layer="dark"
				style={{
					...layerStyle,
					opacity: isLight ? 0 : 1,
				}}
			>
				<div
					className="site-background-media"
					style={{
						...mediaStyle,
						backgroundImage: `url(${getImageUrl("wallhaven-wqery6-dark.webp")})`,
					}}
				/>
			</div>
			{/* Soft atmosphere on top of the wallpaper: mist + floating lights. */}
			<div
				aria-hidden
				className="site-background-atmosphere"
				data-blurred={blurred || undefined}
				data-theme={isLight ? "light" : "dark"}
			>
				<span className="site-background-mist site-background-mist--a" />
				<span className="site-background-mist site-background-mist--b" />
				<span className="site-background-orb site-background-orb--1" />
				<span className="site-background-orb site-background-orb--2" />
				<span className="site-background-orb site-background-orb--3" />
			</div>
		</>
	);
};
