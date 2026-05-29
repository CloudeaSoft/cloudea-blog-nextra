import { GetHitokoto } from "../utils/hitokoto";
import PostsPage from "./posts/page";
import { Github } from "./_components/navbar";
import { Email } from "./_components/navbar/email";
import { CloudeaImage } from "./_components/image";
import Link from "next/link";
import { Icon } from "@iconify-icon/react";

import "./page.css";
import { getCategories, getPosts, getTags } from "./posts/get-posts";

export default async function Index() {
	return (
		<>
			<Banner />
			<Content>
				<PostsPage />
			</Content>
		</>
	);
}

const Banner = async () => {
	const hito = await GetHitokoto();

	return (
		<div
			style={{
				height: "calc(100dvh - 4rem)",
				position: "relative",
				display: "flex",
				width: "100%",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<div
				style={{
					textAlign: "center",
					fontSize: "3rem",
					lineHeight: 1.2,

					display: "flex",
					flexDirection: "column",
					gap: 30,

					color: "var(--home-banner-text-color)",
				}}
			>
				Hi! Here is Cloudea.
				{hito != null && (
					<p style={{ fontSize: "1.5rem" }}>
						{hito.hitokoto}
						&nbsp;——&nbsp;
						{hito.from_who ?? hito.from}
					</p>
				)}
			</div>
			<div
				style={{
					position: "absolute",
					bottom: "40px",
					left: "50%",
					transform: "translateX(-50%)",
					padding: "15px 20px",
					background: "var(--background-color-transparent-40)",
					backdropFilter: "blur(16px)",
					border: "1px solid rgba(100,100,100,0.5)",
					borderRadius: "30px",

					display: "flex",
					gap: 20,
				}}
			>
				<Github />
				<Email />
			</div>
		</div>
	);
};

const Content = async ({ children }) => {
	const tags = await getTags();
	const uniqueTagsCount = new Set(tags).size;
	const posts = await getPosts();
	const categories = await getCategories();
	const uniqueCategoriesCount = new Set(categories).size;

	const sideLinks = [
		{
			name: "Categories",
			icon: "lucide:bookmark",
			link: "/categories",
			count: uniqueCategoriesCount,
		},
		{ name: "Tags", icon: "lucide:tag", link: "/tags", count: uniqueTagsCount },
		{
			name: "Posts",
			icon: "lucide:folder",
			link: "/posts",
			count: posts.length,
		},
	];

	return (
		<div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
			<div style={{ width: "240px", height: "auto", margin: "0 38px" }}>
				<div style={{ position: "sticky", top: "8rem" }}>
					<div
						style={{
							borderRadius: "18px",
							textAlign: "center",
							alignItems: "center",
							background: "var(--background-color-transparent-80)",
							boxShadow: "var(--cloudea-box-shadow)",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								padding: "20px",
								display: "flex",
								justifyContent: "center",
								background: "var(--background-color-transparent-80)",
							}}
						>
							<CloudeaImage
								style={{
									borderRadius: "16px",
									border: "2px solid var(--border-color)",
									overflow: "hidden",
									width: "80px",
									height: "80px",
								}}
								src="avatar.jpg"
								alt="CloudeaSoft"
								width={80}
								height={80}
							/>
						</div>
						<div
							style={{
								padding: "0 20px 20px",
								background: "var(--background-color-transparent-80)",
							}}
						>
							<div style={{ fontSize: "1.1rem" }}>Cloudea</div>
							<div
								style={{
									marginTop: "20px",
									fontSize: "0.9rem",
									color: "var(--third-text-color)",
									fontStyle: "italic",
								}}
							>
								意思が希望を生んで、希望が夢を育てて、夢が世界を変えるんだ
							</div>
						</div>
						<div className="sidebar-links grid grid-cols-3 gap-1 p-5 border-t border-(--border-color)">
							{sideLinks.map((linkItem) => (
								<Link
									key={linkItem.link}
									href={linkItem.link}
									className="flex flex-col items-center justify-center"
								>
									<div>
										<Icon
											icon={linkItem.icon}
											width={18}
											className="mr-1"
										/>
										<span className="text-xs">{linkItem.name}</span>
									</div>
									<div className="font-bold text-[1.1rem] mt-1">
										{linkItem.count}
									</div>
								</Link>
							))}
						</div>
					</div>
				</div>
			</div>
			<div
				style={{
					position: "relative",
					width: "80%",
					maxWidth: "1000px",
					minHeight: "100%",
				}}
			>
				{children}
			</div>
		</div>
	);
};
