import { normalizePages } from "nextra/normalize-pages";
import { getPageMap } from "nextra/page-map";
import sortDate from "../../utils/sort-date";

export async function getPosts() {
	const { directories } = normalizePages({
		list: await getPageMap("/posts"),
		route: "/posts",
	});

	return directories.filter((post) => post.name !== "index").sort(sortDate);
}

export async function getTags() {
	const posts = await getPosts();
	const tags = posts.flatMap((post) => post.frontMatter.tags);
	return tags;
}
