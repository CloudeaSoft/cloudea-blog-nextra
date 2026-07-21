"use client";

import Link from "next/link";
import { Icon } from "@iconify-icon/react";
import type { Heading } from "nextra";
import { useState, type FC } from "react";
import cn from "clsx";

/**
 * Collapsible table of contents shown only on mobile (< lg), sticky flush
 * under the fixed navbar. Compact height/`top` timing lives on `.toc-sticky`
 * in navbar.scss so it tracks the bar mid-animation.
 *
 * Rendered as a sibling of the article (outside `.markdown-body`) so the
 * markdown post styles never apply to its list.
 */
export const MobileToc: FC<{ toc?: Heading[] }> = ({ toc = [] }) => {
	const [open, setOpen] = useState(false);

	return (
		<div
			className="toc-sticky lg:hidden sticky z-20"
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
				aria-controls="mobile-toc-list"
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
			<div
				className={cn(
					"grid transition-[grid-template-rows,visibility] duration-200 ease-out",
					open ? "grid-rows-[1fr] visible" : "grid-rows-[0fr] invisible",
				)}
			>
				<div className="overflow-hidden">
					<ul
						id="mobile-toc-list"
						className="max-h-[50vh] overflow-y-auto px-3 pb-3 flex flex-col text-sm"
						style={{ color: "var(--second-text-color)" }}
					>
						{toc.length
							? toc.map((heading) => (
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
							))
							: (
								<li className="px-2 py-1.5 opacity-60">No headings</li>
							)}
					</ul>
				</div>
			</div>
		</div>
	);
};
