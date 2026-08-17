"use no memo";

import {
	Callout,
	Code,
	Details,
	Pre,
	Summary,
	Table,
	withGitHubAlert,
	withIcons,
} from "nextra/components";
import { useMDXComponents as getNextraMDXComponents } from "nextra/mdx-components";
import type { MDXComponents, UseMDXComponents } from "nextra/mdx-components";
import type { ComponentProps, FC } from "react";
import type { MDXWrapper } from "nextra";
import { Meta } from "@/app/_components/mdx/meta";
import { GoBack } from "@/app/_components/mdx/go-back";
import { InPageAnchors } from "@/app/_components/mdx/in-page-anchors";
import { FigureImage } from "@/app/_components/mdx/figure-image";
import { Comments } from "@/app/_components/mdx/comments";
import { isValidDate } from "@/utils/is-valid-date";
import { TOC } from "@/app/_components/mdx/toc";
import { MobileToc } from "@/app/_components/mdx/toc-mobile";
import cn from "clsx";
import "@/app/_components/mdx/markdown.css";

const createHeading = (
	Tag: `h${2 | 3 | 4 | 5 | 6}`,
): FC<ComponentProps<typeof Tag>> =>
	function HeadingLink({ children, id, className, ...props }) {
		return (
			<Tag
				id={id}
				// can be added by footnotes
				className={className === "sr-only" ? "x:sr-only" : ""}
				{...props}
			>
				{children}
				{id && (
					<a
						href={`#${id}`}
						className="not-prose subheading-anchor"
						aria-label="Permalink for this section"
					/>
				)}
			</Tag>
		);
	};
const CALLOUT_TYPE = Object.freeze({
	caution: "error",
	important: "important",
	note: "info",
	tip: "default",
	warning: "warning",
});
const Blockquote = withGitHubAlert(({ type, ...props }) => (
	<Callout
		type={CALLOUT_TYPE[type]}
		{...props}
	/>
));

type BlogMDXComponents = MDXComponents & {
	DateFormatter?: FC<{ date: Date }>;
};

const DEFAULT_COMPONENTS = getNextraMDXComponents({
	blockquote: Blockquote,
	code: Code,
	details: Details,
	h2: createHeading("h2"),
	h3: createHeading("h3"),
	h4: createHeading("h4"),
	h5: createHeading("h5"),
	h6: createHeading("h6"),
	pre: withIcons(Pre),
	summary: Summary,
	table: Table,
	td: Table.Td,
	th: Table.Th,
	tr: Table.Tr,
});

export const useMDXComponents: UseMDXComponents<typeof DEFAULT_COMPONENTS> = <T extends BlogMDXComponents>(
	comp?: T,
) => {
	const { DateFormatter, ...components } = comp ?? {};
	return {
		...DEFAULT_COMPONENTS,
		FigureImage,
		wrapper({ toc, children, metadata }: ComponentProps<MDXWrapper>) {
			const date = (metadata as BlogMetadata).date;
			if (date && !isValidDate(date)) {
				throw new Error(
					`Invalid date "${date}". Provide date in "YYYY/M/D", "YYYY/M/D H:m", "YYYY-MM-DD", "[YYYY-MM-DD]T[HH:mm]" or "[YYYY-MM-DD]T[HH:mm:ss.SSS]Z" format.`,
				);
			}
			const dateObj = date && new Date(date);
			return (
				<div
					className={cn(
						"page-sheet flex px-10 py-10 gap-10",
						"max-lg:flex-col max-lg:gap-0 max-lg:px-0 max-lg:py-0 max-lg:w-full",
					)}
				>
					<MobileToc toc={toc} />
					<article
						className={cn(
							"page-sheet__panel lg:container px-8 py-8 max-lg:px-5 max-lg:py-6 backdrop-blur-2xl rounded-2xl border-2 border-solid",
							"max-lg:rounded-none max-lg:border-none! max-lg:shadow-none w-full",
						)}
						dir="ltr"
						data-pagefind-body
						style={{
							borderColor: "var(--border-color)",
							backgroundColor: "var(--background-color-transparent-80)",
						}}
					>
						{/* Post typography stays on this inner wrapper so Waline
						    (sibling, like MobileToc) is not restyled by markdown.css. */}
						<div className="markdown-body prose max-md:prose-sm dark:prose-invert">
							<GoBack />
							<InPageAnchors />
							<header className="mb-8">
								<h1 className="post-title">{metadata.title}</h1>
								<Meta {...(metadata as BlogMetadata)}>
									{dateObj && (
										<time dateTime={dateObj.toISOString()}>
											{DateFormatter
												? (
													<DateFormatter date={dateObj} />
												)
												: (
													dateObj.toLocaleDateString()
												)}
										</time>
									)}
								</Meta>
							</header>
							{children}
						</div>
						<Comments />
					</article>
					<TOC
						toc={toc}
						className="max-lg:hidden"
					/>
				</div>
			);
		},
		...components,
	};
};
