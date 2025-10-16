import { ThemeProvider } from "next-themes";
import { ViewTransitions } from "next-view-transitions";
import { FC } from "react";
import { Loading } from "./loading";

import { Footer } from "./footer";
import { Navbar } from "./navbar/navbar";
import { Sidebar } from "./sidebar";
import { LayoutProps } from "../../types/layout-props";

import "./theme.scss";
import { Background } from "./background";

export const Layout: FC<LayoutProps> = ({ children, ...themeConfig }) => {
	const { pageMap, nextThemes, banner } = themeConfig;
	return (
		<ThemeProvider
			attribute="class"
			enableColorScheme
			themes={["light", "dark"]}
			{...nextThemes}
		>
			<Loading />
			<div>
				<Navbar pageMap={pageMap} />
				<div style={{ display: "flex" }}>
					<Sidebar pageMap={pageMap} />
					<div style={{ width: "100%" }}>
						{banner}
						<article
							className="x:container x:px-4 x:prose x:max-md:prose-sm x:dark:prose-invert"
							dir="ltr"
							data-pagefind-body
						>
							<ViewTransitions>{children}</ViewTransitions>
						</article>
					</div>
				</div>
				<Footer />
			</div>
			<Background />
		</ThemeProvider>
	);
};
