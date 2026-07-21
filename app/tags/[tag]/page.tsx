import { PostCard } from "@/app/_components/posts/post-card";
import { getPosts, getTags } from "@/app/posts/get-posts";

type TagParams = { tag: string };

type TagPageProps = {
	params: Promise<TagParams>;
};

export async function generateMetadata(props: TagPageProps) {
	const params = await props.params;
	return {
		title: `Posts Tagged with “${decodeURIComponent(params.tag)}”`,
	};
}

// output: export
export async function generateStaticParams(): Promise<TagParams[]> {
	const allTags = await getTags();
	return [...new Set(allTags)].map((tag) => ({ tag }));
}

export default async function TagPage(props: TagPageProps) {
	const params = await props.params;
	const { title } = await generateMetadata(props);
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
