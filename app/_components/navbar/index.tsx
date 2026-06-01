import type { PageMapItem } from "nextra";
import type { FC } from "react";
import { Stack } from "./stack";
import { ClientNavbar, MobileNavbar } from "./index.client";
import { getCategories, getPosts, getTags } from "../../posts/get-posts";

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
		<header
			style={{
				height: "4rem",
			}}
		>
			<nav
				style={{
					display: "flex",

					justifyContent: "center",
					height: "4rem",
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					zIndex: 1,

					background:
						"linear-gradient(120deg, rgba(247, 135, 54, 0.208) 0%, rgba(54, 125, 247, 0.208) 100%)",
					backdropFilter: "blur(10px)",
					borderBottom: "1px solid var(--border-color)",
				}}
			>
				<div className="flex justify-between w-full max-w-300 z-1005">
					<Stack />

					<ClientNavbar pageMap={pageMap} />
				</div>

				<MobileNavbar
					links={sideLinks}
					pageMap={pageMap}
				/>
			</nav>
		</header>
	);
};
