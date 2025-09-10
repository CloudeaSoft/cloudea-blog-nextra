import type { Metadata } from "next";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { FC, ReactNode } from "react";
import { CloudeaTheme } from "./_components/layout";
import "nextra-theme-docs/style.css";
import { getImageUrl } from "../utils/get-resources-url";

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
        <CloudeaTheme pageMap={pageMap}>{children}</CloudeaTheme>
      </body>
    </html>
  );
};

export default RootLayout;
