"use client";

import Link from "next/link";
import { Icon } from "@iconify-icon/react";
import type { Heading } from "nextra";
import { useState, type FC } from "react";
import cn from "clsx";

/**
 * Collapsible table of contents shown only on mobile (< lg), sticky just below
 * the fixed 4rem navbar. Mirrors the Nuxt blog pattern where the TOC is a
 * sticky bar at the top on small screens. The desktop sidebar TOC (`TOC`)
 * stays untouched.
 *
 * Rendered as a sibling of the article (outside `.markdown-body`) so the
 * markdown post styles never apply to its list.
 */
export const MobileToc: FC<{ toc: Heading[] }> = ({ toc }) => {
	const [open, setOpen] = useState(false);

	if (!toc.length) return null;

	return (
		<div
			className="lg:hidden sticky top-16 z-20"
			style={{
				backgroundColor: "var(--background-color-transparent-40)",
				backdropFilter: "blur(16px)",
				WebkitBackdropFilter: "blur(16px)",
				borderBottom:
					"1px dotted color-mix(in srgb, var(--first-text-color) 25%, transparent)",
			}}
		>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				className="w-full flex items-center justify-between gap-2 px-5 py-3 text-left text-sm font-medium"
				style={{ color: "var(--first-text-color)" }}
			>
				<span className="inline-flex items-center gap-2">
					<Icon
						icon="lucide:list"
						height={16}
					/>
					Table of Contents
				</span>
				<Icon
					icon="lucide:chevron-down"
					height={16}
					className={cn(
						"shrink-0 transition-transform duration-200",
						open && "rotate-180",
					)}
				/>
			</button>
			{open && (
				<ul
					className="max-h-[50vh] overflow-y-auto px-3 pb-3 flex flex-col text-sm"
					style={{ color: "var(--second-text-color)" }}
				>
					{toc.map((heading) => (
						<li key={heading.id}>
							<Link
								href={`#${heading.id}`}
								onClick={() => setOpen(false)}
								className="block truncate rounded-md py-1.5 opacity-80 hover:opacity-100"
								style={{
									paddingInlineStart: `${0.5 + Math.max(0, heading.depth - 2) * 0.85}rem`,
								}}
							>
								{heading.value}
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
