import { PostCard } from "@/app/_components/posts/post-card";
import { getCategories, getPosts } from "@/app/posts/get-posts";

type CategoryParams = { category: string };

type CategoryPageProps = {
	params: Promise<CategoryParams>;
};

export async function generateMetadata(props: CategoryPageProps) {
	const params = await props.params;
	return {
		title: `Posts Categorized with “${decodeURIComponent(params.category)}”`,
	};
}

// output: export
export async function generateStaticParams(): Promise<CategoryParams[]> {
	const allCategories = await getCategories();
	return [...new Set(allCategories)].map((category) => ({ category }));
}

export default async function CategoryPage(props: CategoryPageProps) {
	const params = await props.params;
	const { title } = await generateMetadata(props);
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
