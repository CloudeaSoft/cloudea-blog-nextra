import { Link } from "next-view-transitions";
import type { FC, ReactNode } from "react";

export const Meta: FC<BlogMetadata & { children: ReactNode }> = ({
	author,
	tags,
	readingTime,
	category,
	children,
}) => {
	const tagsEl = tags?.map((t) => (
		<Link
			key={t}
			href={`/tags/${t}`}
			className="nextra-tag"
		>
			{t}
		</Link>
	));

	const readingTimeText = readingTime?.text;

	// Primary meta line: author · create time · reading time · category.
	const primary = [
		author || null,
		children || null,
		readingTimeText || null,
		category
			? (
				<Link
					key="category"
					href={`/categories/${category}`}
					className="x:hover:underline"
				>
					{category}
				</Link>
			)
			: null,
	].filter(Boolean);

	return (
		<div className="x:mt-2 x:flex x:flex-col x:gap-2 x:text-sm x:dark:text-gray-400 x:text-gray-600">
			<div className="x:flex x:flex-wrap x:items-center x:gap-x-2 x:gap-y-1">
				{primary.map((item, i) => (
					<span
						key={i}
						className="x:flex x:items-center x:gap-x-2"
					>
						{i > 0 && (
							<span
								aria-hidden
								className="x:opacity-40"
							>
								·
							</span>
						)}
						{item}
					</span>
				))}
			</div>
			{tagsEl && tagsEl.length > 0 && (
				<div className="x:flex x:flex-wrap x:items-center x:gap-2">
					{tagsEl}
				</div>
			)}
		</div>
	);
};
