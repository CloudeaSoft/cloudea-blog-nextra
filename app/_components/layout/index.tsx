import { ThemeProvider } from "next-themes";
import { ViewTransitions } from "next-view-transitions";
import { FC } from "react";
import { Loading } from "./loading";

import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { LayoutProps } from "@/types/layout-props";

import "./theme.scss";
import { Background } from "./background";

export const Layout: FC<LayoutProps> = ({ children, ...themeConfig }) => {
	const { pageMap, nextThemes, banner } = themeConfig;
	return (
		<ThemeProvider
			attribute="class"
			enableColorScheme
			disableTransitionOnChange
			themes={["light", "dark"]}
			{...nextThemes}
		>
			<Loading />
			<div
				className="app-scroll flex flex-col min-h-full"
				data-scroll-root
			>
				<Navbar pageMap={pageMap} />

				<main className="flex-1 w-full">
					{banner}
					<ViewTransitions>{children}</ViewTransitions>
				</main>

				<Footer />
			</div>
			<Background />
		</ThemeProvider>
	);
};
