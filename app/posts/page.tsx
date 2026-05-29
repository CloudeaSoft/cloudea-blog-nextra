import { PostCard } from "../_components/post-card";
import "./page.css";
import { getPosts } from "./get-posts";

export const metadata = {
	title: "Posts",
};

export default async function PostsPage() {
	const posts = await getPosts();
	return (
		<div data-pagefind-ignore="all">
			<ul>
				{posts.map((post) => (
					<PostCard post={post} />
				))}
			</ul>
		</div>
	);
}
