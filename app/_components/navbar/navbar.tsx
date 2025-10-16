"use client";

import { usePathname } from "next/navigation";
import type { PageMapItem } from "nextra";
import { Anchor, Search } from "nextra/components";
import { normalizePages } from "nextra/normalize-pages";
import type { FC } from "react";
import { Stack } from "./stack";
import { ThemeSwitch } from "./theme-switch";
import { Github } from "./github";

export const Navbar: FC<{ pageMap: PageMapItem[] }> = ({ pageMap }) => {
	const pathname = usePathname();
	const { topLevelNavbarItems } = normalizePages({
		list: pageMap,
		route: pathname,
	});

	return (
		<div
			style={{
				height: "4rem",
			}}
		>
			<div
				style={{
					display: "flex",
					background: "green",
					justifyContent: "center",
					height: "4rem",
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					zIndex: 1,
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						width: "100%",
						maxWidth: "1200px",
					}}
				>
					<Stack />

					<ul
						style={{
							display: "flex",
							listStyleType: "none",
							padding: 20,
							gap: 20,
							background: "lightcoral",
							margin: 0,
						}}
					>
						{topLevelNavbarItems.map((item) => {
							const route = item.route || ("href" in item ? item.href! : "");
							return (
								<li key={route}>
									<Anchor
										href={route}
										style={{ textDecoration: "none" }}
									>
										{item.title}
									</Anchor>
								</li>
							);
						})}
					</ul>
					<Search />
					<ul
						style={{
							display: "flex",
							listStyleType: "none",
							background: "lightcoral",
							margin: 0,
							alignItems: "center",
							gap: 20,
							padding: 20,
						}}
					>
						<li>
							<ThemeSwitch />
						</li>
						<li>
							<Github />
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
};
