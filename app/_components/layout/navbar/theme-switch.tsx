"use client";

import { Icon } from "@iconify-icon/react";
import { useTheme } from "next-themes";
import { Button } from "nextra/components";
import { useMounted } from "nextra/hooks";

export function ThemeSwitch() {
	const { setTheme, resolvedTheme } = useTheme();
	const mounted = useMounted();
	const isDark = resolvedTheme === "dark";

	const toggleTheme = () => {
		setTheme(isDark ? "light" : "dark");
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
