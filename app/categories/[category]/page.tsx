import { PostCard } from "../../_components/post-card";
import { getPosts } from "../../posts/get-posts";

interface CategoryPageProps {
	params: { category: string };
}

async function generateMetadata(category: string) {
	return {
		title: `Posts Categorized with “${decodeURIComponent(category)}”`,
	};
}

export default async function CategoryPage(props: CategoryPageProps) {
	const params = props.params;
	const { title } = await generateMetadata(params.category);
	const posts = await getPosts();
	return (
		<>
			<h1>{title}</h1>
			{posts
				.filter(
					(post) =>
						post.frontMatter.category === decodeURIComponent(params.category),
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
