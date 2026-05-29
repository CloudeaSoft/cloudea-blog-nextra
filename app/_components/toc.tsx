import Link from "next/link";
import type { Heading } from "nextra";
import type { FC } from "react";

export const TOC: FC<{ toc: Heading[] }> = ({ toc }) => {
	console.log(toc);
	return (
		<div
			className="w-50 rounded-2xl border-2 border-solid h-fit p-5"
			style={{
				backgroundColor: "var(--background-color-transparent-80)",
				borderColor: "var(--border-color)",
				color: "var(--second-text-color)",
			}}
		>
			<h3>Table of Contents</h3>
			<ul className="w-full mt-5 flex flex-col gap-1">
				{toc.map((heading) => (
					<li
						key={heading.id}
						className="truncate"
					>
						<Link href={`#${heading.id}`}>{heading.value}</Link>
					</li>
				))}
			</ul>
		</div>
	);
};
