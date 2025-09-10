import { ThemeProvider } from "next-themes";
import { ViewTransitions } from "next-view-transitions";
import { FC } from "react";
import { Loading } from "./loading";

import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { LayoutProps } from "../../types/layout-props";

import "./theme.scss";

export const Layout: FC<LayoutProps> = ({ children, ...themeConfig }) => {
  const { footer, navbar, pageMap, nextThemes, banner, ...rest } = themeConfig;

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
          <div>
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
    </ThemeProvider>
  );
};
