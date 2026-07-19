import { PostCard } from "../../_components/posts/post-card";
import { getPosts, getTags } from "../../posts/get-posts";

export async function generateMetadata(props) {
	const params = await props.params;
	return {
		title: `Posts Tagged with “${decodeURIComponent(params.tag)}”`,
	};
}

// output: export
export async function generateStaticParams(): Promise<{ tag }[]> {
	const allTags = await getTags();
	return [...new Set(allTags)].map((tag) => ({ tag }));
}

export default async function TagPage(props) {
	const params = props.params;
	const { title } = await generateMetadata({ params });
	const posts = await getPosts();
	return (
		<>
			<h1>{title}</h1>
			{posts
				.filter((post) =>
					post.frontMatter.tags.includes(decodeURIComponent(params.tag)),
				)
				.map((post) => (
					<PostCard
						key={post.route}
						post={post}
					/>
				))}
		</>
	);
}
