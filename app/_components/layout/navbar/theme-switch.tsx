"use client";

import { Icon } from "@iconify-icon/react";
import { useTheme } from "next-themes";
import { Button } from "nextra/components";
import { useMounted } from "nextra/hooks";

function prefersReducedMotion(): boolean {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

/**
 * next-themes only applies the class in useEffect, which is too late for
 * View Transition's "new" snapshot. Mirror its class + color-scheme update
 * synchronously, and snap wallpaper layers the same way Background does.
 */
function applyThemeDom(theme: "light" | "dark") {
	const root = document.documentElement;
	root.classList.remove("light", "dark");
	root.classList.add(theme);
	root.style.colorScheme = theme;

	document.querySelectorAll<HTMLElement>("[data-theme-layer]").forEach((el) => {
		el.style.opacity = el.dataset.themeLayer === theme ? "1" : "0";
	});
}

export function ThemeSwitch() {
	const { setTheme, resolvedTheme } = useTheme();
	const mounted = useMounted();
	const isDark = resolvedTheme === "dark";

	const toggleTheme = () => {
		const next = isDark ? "light" : "dark";

		const apply = () => {
			applyThemeDom(next);
			setTheme(next);
		};

		if (prefersReducedMotion() || !document.startViewTransition) {
			apply();
			return;
		}

		const root = document.documentElement;
		root.dataset.themeTransition = "";

		const transition = document.startViewTransition(apply);

		void transition.finished.finally(() => {
			delete root.dataset.themeTransition;
		});
	};

	const iconName =
		mounted && isDark
			? "line-md:sunny-outline-to-moon-loop-transition"
			: "line-md:moon-filled-alt-to-sunny-filled-loop-transition";
	const iconColor = mounted && isDark ? "#2731f1" : "#fb7f24";

	return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<div
				style={{
					width: 24,
					height: 24,
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<Button
					aria-label="Toggle Color Mode"
					className="x:p-2"
					onClick={toggleTheme}
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<Icon
						icon={iconName}
						height="24"
						style={{ color: iconColor }}
					/>
				</Button>
			</div>
		</div>
	);
}
