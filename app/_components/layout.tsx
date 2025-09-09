import { ThemeProvider } from "next-themes";
import { ViewTransitions } from "next-view-transitions";
import { FC, ReactNode, ComponentProps } from "react";

const Layout: FC<{
  children: ReactNode;
  nextThemes?: Omit<ComponentProps<typeof ThemeProvider>, "children">;
  banner?: ReactNode;
}> = ({ children, nextThemes, banner }) => {
  return (
    <ThemeProvider attribute="class" {...nextThemes}>
      {banner}
      <article
        className="x:container x:px-4 x:prose x:max-md:prose-sm x:dark:prose-invert"
        dir="ltr"
        data-pagefind-body
      >
        <ViewTransitions>{children}</ViewTransitions>
      </article>
    </ThemeProvider>
  );
};

import type { PageMapItem } from "nextra";
import version from "nextra/package.json";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

export const CloudeaTheme: FC<{
  children: ReactNode;
  pageMap: PageMapItem[];
}> = ({ children, pageMap }) => {
  return (
    <>
      <Navbar pageMap={pageMap} />
      <div style={{ display: "flex" }}>
        <Sidebar pageMap={pageMap} />
        <Layout>{children}</Layout>
      </div>
      <Footer />
    </>
  );
};
