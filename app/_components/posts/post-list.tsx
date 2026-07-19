import { PostCard } from "./post-card";
import "./post-list.css";
import { getPosts } from "../../posts/get-posts";

export const metadata = {
	title: "Posts",
};

export default async function PostsPage() {
	const posts = await getPosts();
	return (
		<div data-pagefind-ignore="all">
			<ul>
				{posts.map((post) => (
					<PostCard
						key={post.route}
						post={post}
					/>
				))}
			</ul>
		</div>
	);
}
