import { getPosts, getTags } from "./get-posts";
import { PostCard } from "../_components/post-card";

export const metadata = {
  title: "Posts",
};

export default async function PostsPage() {
  const tags = await getTags();
  const posts = await getPosts();
  const allTags = Object.create(null);

  for (const tag of tags) {
    allTags[tag] ??= 0;
    allTags[tag] += 1;
  }
  return (
    <div data-pagefind-ignore="all">
      {posts.map((post) => (
        <PostCard key={post.route} post={post} />
      ))}
    </div>
  );
}
