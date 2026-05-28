import { PostCard } from "../_components/post-card";
import { Item } from "nextra/normalize-pages";
import "./page.css";

export const metadata = {
	title: "Posts",
};

export default async function PostsPage({ posts }: { posts: Item[] }) {
	return (
		<div data-pagefind-ignore="all">
			<ul>
				{posts.map((post) => (
					<li
						key={post.route}
						className="post-card"
						style={{
							position: "relative",
							borderRadius: "18px",
							boxSizing: "border-box",
							background: "var(--background-color-transparent-80)",
							marginBottom: "38px",
							overflow: "hidden",
						}}
					>
						<PostCard post={post} />
					</li>
				))}
			</ul>
		</div>
	);
}
