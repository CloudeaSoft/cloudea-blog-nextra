import { Link } from "next-view-transitions";
import { getDistinctCategories } from "../posts/get-posts";

export default async function CategoriesPage() {
	const categories = await getDistinctCategories();

	if (categories.length <= 0) {
		return (
			<p className="text-gray-500 dark:text-gray-400 text-center py-12">
				暂无分类
			</p>
		);
	}

	return (
		<div
			data-pagefind-ignore="all"
			className="max-w-4xl mx-auto px-4 py-8 mt-5"
		>
			<div className="not-prose flex flex-wrap gap-5">
				{Object.entries(categories)
					.sort(([, a], [, b]) => b - a) // Order by number
					.map(([category, count]) => (
						<Link
							key={category}
							href={`/categories/${category}`}
							className="inline-flex items-center gap-1 px-6 py-3 text-sm rounded-full transition-all! duration-200 hover:scale-110 border border-solid"
							style={{
								backgroundColor: "var(--background-color-transparent-80)",
								borderColor: "var(--border-color)",
							}}
						>
							<span>{category}</span>
							<span className="x:text-xs opacity-70">{count}</span>
						</Link>
					))}
			</div>
		</div>
	);
}
