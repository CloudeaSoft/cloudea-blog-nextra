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

export async function getDistinctTags() {
	const tags = await getTags();
	return getDistinct(tags);
}

export async function getCategories() {
	const posts = await getPosts();
	const categories = posts.map((post) => post.frontMatter.category);
	return categories;
}

export async function getDistinctCategories() {
	const categories = await getCategories();
	return getDistinct(categories);
}

async function getDistinct<T extends string | number | symbol = string>(
	arr: T[],
) {
	const allTags = Object.create(null) as Record<T, number>;
	for (const item of arr) {
		allTags[item] ??= 0;
		allTags[item]++;
	}

	return allTags;
}
