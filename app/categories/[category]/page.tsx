import { PostCard } from "../../_components/post-card";
import { getPosts, getCategories } from "../../posts/get-posts";

export async function generateMetadata(props) {
	const params = await props.params;
	return {
		title: `Posts Categorized with “${decodeURIComponent(params.category)}”`,
	};
}

export async function generateStaticParams(): Promise<{ category }[]> {
	const allCategories = await getCategories();
	return [...new Set(allCategories)].map((category) => ({ category }));
}

export default async function CategoryPage(props) {
	const params = await props.params;
	const { title } = await generateMetadata({ params });
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
