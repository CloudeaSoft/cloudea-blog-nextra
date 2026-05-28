"use client";

import { usePathname } from "next/navigation";
import type { PageMapItem } from "nextra";
import { Anchor, Search } from "nextra/components";
import { normalizePages } from "nextra/normalize-pages";
import type { FC } from "react";
import { Stack } from "./stack";
import { ThemeSwitch } from "./theme-switch";
import { GithubNav } from "./github";

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

					justifyContent: "center",
					height: "4rem",
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					zIndex: 1,

					background:
						"linear-gradient(120deg, rgba(247, 135, 54, 0.208) 0%, rgba(54, 125, 247, 0.208) 100%)",
					backdropFilter: "blur(10px)",
					borderBottom: "1px solid var(--border-color)",
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
							margin: 0,
						}}
					>
						{topLevelNavbarItems.map((item) => {
							const route = item.route || ("href" in item ? item.href! : "");
							return (
								<li key={route}>
									<Anchor
										href={route}
										style={{ textDecoration: "none", fontSize: "1.2rem" }}
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
							<GithubNav />
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
};
