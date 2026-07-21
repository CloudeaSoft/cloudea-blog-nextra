import Link from "next/link";
import type { Heading } from "nextra";
import type { FC } from "react";
import cn from "clsx";

export const TOC: FC<{ toc: Heading[]; className?: string }> = ({ toc, className }) => {
	return (
		<div
			className={cn(
				"toc-sticky w-52 rounded-2xl border-2 border-solid h-fit p-5",
				"sticky self-start overflow-y-auto",
				className,
			)}
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
