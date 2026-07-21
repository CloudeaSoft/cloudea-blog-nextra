import type { PageMapItem } from "nextra";
import type { FC } from "react";
import { Stack } from "./stack";
import { ClientNavbar, MobileNavbar, NavbarShell } from "./index.client";
import { getCategories, getPosts, getTags } from "@/app/posts/get-posts";
import "./navbar.scss";

export const Navbar: FC<{ pageMap: PageMapItem[] }> = async ({ pageMap }) => {
	const [tags, posts, categories] = await Promise.all([
		getTags(),
		getPosts(),
		getCategories(),
	]);
	const uniqueTagsCount = new Set(tags).size;
	const uniqueCategoriesCount = new Set(categories).size;

	const sideLinks = [
		{
			name: "Categories",
			icon: "lucide:folder",
			link: "/categories",
			count: uniqueCategoriesCount,
		},
		{ name: "Tags", icon: "lucide:tag", link: "/tags", count: uniqueTagsCount },
		{
			name: "Posts",
			icon: "lucide:archive",
			link: "/posts",
			count: posts.length,
		},
	];

	return (
		<NavbarShell>
			<div className="flex justify-between w-full max-w-300 z-1005 h-full items-center">
				<Stack />

				<ClientNavbar pageMap={pageMap} />
			</div>

			<MobileNavbar
				links={sideLinks}
				pageMap={pageMap}
			/>
		</NavbarShell>
	);
};
