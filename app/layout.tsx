import type { Metadata } from "next";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { FC, ReactNode } from "react";
import { Layout } from "@/app/_components/layout";
import { getImageUrl } from "@/utils/get-resources-url";

import "./globals.css";

const SITE_DESCRIPTION =
	"Cloudea's personal blog — notes on .NET, game development, algorithms, and travel.";

export const metadata: Metadata = {
	metadataBase: new URL("https://blog.cloudea.work"),
	title: {
		absolute: "Cloudea's Blog",
		template: "%s - Cloudea's Blog",
	},
	description: SITE_DESCRIPTION,
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
	openGraph: {
		type: "website",
		siteName: "Cloudea's Blog",
		title: "Cloudea's Blog",
		description: SITE_DESCRIPTION,
		images: [getImageUrl("wallhaven-wqery6-light.webp")],
	},
};

const RootLayout: FC<{ children: ReactNode }> = async ({ children }) => {
	const pageMap = await getPageMap();
	return (
		<html
			lang="en"
			dir="ltr"
			suppressHydrationWarning
		>
			<Head faviconGlyph="✦">
				<script defer src="https://events.vercount.one/js"></script>
			</Head>
			<body style={{ margin: 0, padding: 0 }}>
				<Layout pageMap={pageMap}>{children}</Layout>
			</body>
		</html>
	);
};

export default RootLayout;
