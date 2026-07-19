"use client";

import { usePathname } from "next/navigation";
import { useMounted } from "nextra/hooks";
import type { FC, ReactNode } from "react";
import { getGitIssueUrl } from "./utils";
import Link from "next/link";

export const NotFoundLink: FC<{
	children: ReactNode;
	labels: string;
}> = ({ children, labels }) => {
	const pathname = usePathname();
	const mounted = useMounted();
	const ref = mounted && document.referrer;
	const referrer = ref ? ` from "${ref}"` : "";

	return (
		<Link
			className="x:mt-[1.25em]"
			href={getGitIssueUrl({
				repository: "https://github.com/CloudeaSoft/cloudea-blog-nextra",
				title: `Found broken "${mounted ? pathname : ""}" link${referrer}. Please fix!`,
				labels,
			})}
		>
			{children}
		</Link>
	);
};
