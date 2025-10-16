import Link from "next/link";
import { getTags } from "../posts/get-posts";

export default async function PostsPage() {
	const tags = await getTags();
	const allTags = Object.create(null);

	for (const tag of tags) {
		allTags[tag] ??= 0;
		allTags[tag] += 1;
	}
	return (
		<div data-pagefind-ignore="all">
			<div
				className="not-prose"
				style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}
			>
				{Object.entries(allTags).map(([tag, count]) => (
					<Link
						key={tag}
						href={`/tags/${tag}`}
						className="nextra-tag"
					>
						{tag}
						{`(${count as number})`}
					</Link>
				))}
			</div>
		</div>
	);
}
