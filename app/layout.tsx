import type { Metadata } from "next";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { FC, ReactNode } from "react";
import { Layout } from "./_components/layout";
import { getImageUrl } from "../utils/get-resources-url";

import "nextra-theme-docs/style.css";
import "./global.scss";

export const metadata: Metadata = {
  metadataBase: new URL("https://blog.cloudea.work"),
  title: {
    absolute: "",
    template: "%s - Cloudea's Blog",
  },
  description: "",
  applicationName: "Cloudea's Blog",
  generator: "Next.js",
  appleWebApp: {
    title: "Cloudeas Blog",
  },
  icons: [
    getImageUrl("favicon-16.ico"),
    getImageUrl("favicon-32.ico"),
    getImageUrl("favicon-96.ico"),
  ],
};

const RootLayout: FC<{ children: ReactNode }> = async ({ children }) => {
  const pageMap = await getPageMap();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head faviconGlyph="✦" />
      <body style={{ margin: 0, padding: 0 }}>
        <Layout pageMap={pageMap}>{children}</Layout>
      </body>
    </html>
  );
};

export default RootLayout;
