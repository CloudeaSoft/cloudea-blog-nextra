"use client";

import { Icon } from "@iconify-icon/react";
import Link from "next/link";

export const Github = () => {
	return GithubBase("lucide:github", 24);
};

export const GithubNav = () => {
	return GithubBase("line-md:github-twotone", 24);
};

const GithubBase = (icon: string, size: number) => {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<Link
				href="https://github.com/CloudeaSoft"
				target="_blank"
			>
				<Icon
					icon={icon}
					height={size}
				/>
			</Link>
		</div>
	);
};
