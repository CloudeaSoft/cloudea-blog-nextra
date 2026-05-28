import Link from "next/link";
import type { FC } from "react";

export const Footer: FC = () => {
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
							<img
								src="/images/nextra.svg"
								style={{
									display: "inline-block",
								}}
								width={14}
								height={14}
							/>
						</span>
						Nextra
					</Link>
				</div>
				<div>
					THEME&nbsp;
					<Link href="https://github.com/CloudeaSoft/cloudea-blog-nextra" target="_blank">
						Cloudea
					</Link>
				</div>
			</div>
			<div>
				{`© 2022 - ${new Date().getFullYear()} Cloudea`}
				<br />
				12 posts in total 8.4k words in total
				<br />
			</div>
			<div>
				VISITOR COUNT 666
				<br />
				TOTAL PAGE VIEWS 1142
			</div>
		</footer>
	);
};
