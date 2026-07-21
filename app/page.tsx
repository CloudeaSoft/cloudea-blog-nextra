import PostsPage from "@/app/_components/posts/post-list";
import { Hitokoto } from "@/app/_components/home/hitokoto";
import { BannerBlurTrigger } from "@/app/_components/home/banner-blur-trigger";
import { Github } from "@/app/_components/layout/navbar/github";
import { Email } from "@/app/_components/layout/navbar/email";
import { CloudeaImage } from "@/app/_components/ui/image";
import Link from "next/link";
import { Icon } from "@iconify-icon/react";
import cn from "clsx";

import "./page.css";
import { getCategories, getPosts, getTags } from "@/app/posts/get-posts";

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
			<div className="flex flex-col gap-7.5 text-center text-[3rem] leading-[1.2] text-(--home-banner-text-color)">
				<span>Hi! Here is Cloudea.</span>
				<Hitokoto />
			</div>
			<BannerBlurTrigger />
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
		<div className="flex justify-center w-full px-5">
			<div className={cn("w-60 h-auto mr-9", "max-lg:hidden")}>
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
						<div className="sidebar-links grid grid-cols-3 gap-2 p-3 border-t border-(--border-color)">
							{sideLinks.map((linkItem) => (
								<Link
									key={linkItem.link}
									href={linkItem.link}
									className="flex flex-col items-center justify-center gap-1"
								>
									<Icon
										icon={linkItem.icon}
										width={18}
									/>
									<span className="text-xs">{linkItem.name}</span>
									<div className="font-bold text-[1.1rem]">
										{linkItem.count}
									</div>
								</Link>
							))}
						</div>
					</div>
				</div>
			</div>
			<div className={cn("relative w-[80%] max-w-250 min-h-full", "max-lg:w-[95%]")}>
				{children}
			</div>
		</div>
	);
};
