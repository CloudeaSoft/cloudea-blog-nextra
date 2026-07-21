import type { Item } from "nextra/normalize-pages";

export default (a: Item, b: Item) => {
	if (!a.frontMatter?.date) return -1;
	if (!b.frontMatter?.date) return -1;
	return new Date(a.frontMatter.date) > new Date(b.frontMatter.date) ? -1 : 1;
};
