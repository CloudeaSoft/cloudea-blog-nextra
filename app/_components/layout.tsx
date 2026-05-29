import { ThemeProvider } from "next-themes";
import { ViewTransitions } from "next-view-transitions";
import { FC } from "react";
import { Loading } from "./loading";

import { Footer } from "./footer";
import { Navbar } from "./navbar/navbar";
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
					<div style={{ width: "100%" }}>
						{banner}
						<ViewTransitions>{children}</ViewTransitions>
					</div>
				</div>
				<Footer />
			</div>
			<Background />
		</ThemeProvider>
	);
};
