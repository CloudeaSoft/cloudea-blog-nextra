import { Link } from "next-view-transitions";
import { getDistinctTags } from "@/app/posts/get-posts";

export default async function TagsPage() {
	const tags = await getDistinctTags();

	if (Object.keys(tags).length === 0) {
		return (
			<p className="text-gray-500 dark:text-gray-400 text-center py-12">
				暂无标签
			</p>
		);
	}

	return (
		<div
			data-pagefind-ignore="all"
			className="max-w-4xl mx-auto px-4 py-8 mt-5"
		>
			<div className="not-prose flex flex-wrap gap-5">
				{Object.entries(tags)
					.sort(([, a], [, b]) => b - a) // Order by number
					.map(([tag, count]) => (
						<Link
							key={tag}
							href={`/tags/${tag}`}
							className="inline-flex items-center gap-1 px-6 py-3 text-sm rounded-full transition-transform! duration-200 hover:scale-110 border border-solid"
							style={{
								backgroundColor: "var(--background-color-transparent-80)",
								borderColor: "var(--border-color)",
							}}
						>
							<span>{tag}</span>
							<span className="x:text-xs opacity-70">{count}</span>
						</Link>
					))}
			</div>
		</div>
	);
}
