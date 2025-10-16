"use-client";

import Link from "next/link";
import { GitHubIcon } from "nextra/icons";

export const Github = () => {
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
				<GitHubIcon height="24" />
			</Link>
		</div>
	);
};
