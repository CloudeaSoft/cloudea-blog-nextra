import { Icon } from "@iconify-icon/react";
import { Link } from "next-view-transitions";
import type { FC } from "react";

interface PostCardProps {
	post: {
		route: string;
		frontMatter: BlogMetadata;
	};
}

export const PostCard: FC<PostCardProps> = ({ post }) => {
	const { description, date, title } = post.frontMatter;
	const dateObj = date && new Date(date);
	return (
		<div key={post.route}>
			{post.frontMatter.cover && (
				<div
					className="w-full h-37.5"
					style={{ backgroundImage: `url(${post.frontMatter.cover})` }}
				>
					<Link href={post.route}>
						<img
							src={post.frontMatter.cover}
							alt={title}
							className="w-full h-full object-cover"
						/>
					</Link>
				</div>
			)}
			<div
				className={`${post.frontMatter.cover ? "pt-5" : "pt-7"} pb-7 px-7 gap-5 flex-col flex`}
			>
				<h2 className="x:mt-6 x:mb-2 x:text-xl x:font-semibold">
					<Link
						href={post.route}
						className="x:no-underline!"
					>
						{title}
					</Link>
				</h2>
				{description && (
					<p className="x:mb-2 x:dark:text-gray-400 x:text-gray-600">
						{description}
					</p>
				)}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						textAlign: "center",
						lineHeight: 1,
						fontSize: "0.9rem",
						color: "var(--third-text-color)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
						{dateObj && (
							<div
								className="text-[0.95rem]"
								style={{
									display: "flex",
									alignItems: "center",
								}}
							>
								<Icon
									icon="line-md:calendar"
									width={20}
									style={{ paddingRight: "0.4rem" }}
								/>
								{dateObj.toLocaleDateString("en-CA")}
							</div>
						)}
						{post.frontMatter.categories! && (
							<div>
								<Icon
									icon="line-md:folder"
									width={20}
									style={{ paddingRight: "0.4rem" }}
								/>
								{post.frontMatter.categories}
							</div>
						)}
						{post.frontMatter.tags?.length && (
							<div
								className="text-[0.95rem]"
								style={{
									display: "flex",
									alignItems: "center",
								}}
							>
								<Icon
									icon="lucide:tag"
									width={18}
									style={{ paddingRight: "0.2rem" }}
								/>
								&nbsp;
								<ul style={{ display: "flex", gap: "0.4rem" }}>
									{post.frontMatter.tags?.map((tag, index) => (
										<li key={tag}>
											{index !== 0 && (
												<span style={{ paddingRight: "0.4rem" }}>|</span>
											)}
											<Link href={`/tags/${tag}`}>{tag}</Link>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
					<Link
						href={post.route}
						className="x:ml-2 flex items-center justify-center"
					>
						Read More
						<Icon
							icon="line-md:chevron-right"
							width={22}
						/>
					</Link>
				</div>
			</div>
		</div>
	);
};
