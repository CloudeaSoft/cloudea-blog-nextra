import Image from "next/image";
import Link from "next/link";
import type { FC } from "react";
import { getPosts } from "@/app/posts/get-posts";
import formatWords from "@/utils/format-words";
import { getImageUrl } from "@/utils/get-resources-url";
import { ClientFooter } from "./index.client";

export const Footer: FC = async () => {
	const posts = await getPosts();
	const totalWords = posts.reduce(
		(sum, post) => sum + (post.frontMatter?.readingTime?.words ?? 0),
		0,
	);

	return (
		<footer
			style={{
				background: "var(--background-color-transparent-80)",
				padding: 20,
				display: "flex",
				justifyContent: "space-between",

				borderTop: "1px solid var(--border-color)",
				color: "var(--third-text-color)",
			}}
		>
			<div>
				<div>
					Powered by&nbsp;
					<Link
						href="https://nextra.site"
						target="_blank"
						style={{
							display: "inline-flex",
							justifyContent: "center",
							alignItems: "center",
						}}
					>
						<span>
							<Image
								src={getImageUrl("nextra.svg")}
								style={{
									display: "inline-block",
								}}
								width={14}
								height={14}
								alt="Nextra Logo"
							/>
						</span>
						Nextra
					</Link>
				</div>
				<div>
					THEME&nbsp;
					<Link
						href="https://github.com/CloudeaSoft/cloudea-blog-nextra"
						target="_blank"
					>
						Cloudea
					</Link>
				</div>
			</div>
			<div className="text-center">
				{`© 2022 - ${new Date().getFullYear()} Cloudea`}
				<br />
				{`${posts.length} posts in total ${formatWords(totalWords)} words in total`}
				<br />
			</div>
			<div className="text-right">
				<ClientFooter />
			</div>
		</footer>
	);
};
