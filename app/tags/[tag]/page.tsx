import { PostCard } from "../../_components/post-card";
import { getPosts } from "../../posts/get-posts";

interface TagPageProps {
	params: { tag: string };
}

async function generateMetadata(tag: string) {
	return {
		title: `Posts Tagged with “${decodeURIComponent(tag)}”`,
	};
}

export default async function TagPage(props: TagPageProps) {
	const params = props.params;
	const { title } = await generateMetadata(params.tag);
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
