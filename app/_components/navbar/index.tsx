import type { PageMapItem } from "nextra";
import type { FC } from "react";
import { Stack } from "./stack";
import { ClientNavbar } from "./index.client";

export const Navbar: FC<{ pageMap: PageMapItem[] }> = ({ pageMap }) => {
	return (
		<header
			style={{
				height: "4rem",
			}}
		>
			<nav
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

					<ClientNavbar pageMap={pageMap} />
				</div>
			</nav>
		</header>
	);
};
