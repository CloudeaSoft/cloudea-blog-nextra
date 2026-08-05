import type { Metadata } from "next";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { FC, ReactNode } from "react";
import { Layout } from "@/app/_components/layout";
import { getImageUrl } from "@/utils/get-resources-url";

import "./globals.css";

const SITE_URL = "https://blog.cloudea.work";
const SITE_NAME = "Cloudea's Blog";
const SITE_DESCRIPTION =
	"Cloudea 的个人博客 — 记录 .NET、游戏开发、算法与旅行。Personal notes on .NET, game development, algorithms, and travel.";

/** Default share image (site wallpaper). */
const DEFAULT_OG_IMAGE = getImageUrl("wallhaven-wqery6-light.webp");

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		absolute: SITE_NAME,
		template: `%s - ${SITE_NAME}`,
	},
	description: SITE_DESCRIPTION,
	applicationName: SITE_NAME,
	generator: "Next.js",
	appleWebApp: {
		title: SITE_NAME,
	},
	icons: [
		getImageUrl("favicon-16.ico"),
		getImageUrl("favicon-32.ico"),
		getImageUrl("favicon-96.ico"),
	],
	openGraph: {
		type: "website",
		locale: "zh_CN",
		alternateLocale: ["en_US"],
		url: SITE_URL,
		siteName: SITE_NAME,
		title: SITE_NAME,
		description: SITE_DESCRIPTION,
		images: [
			{
				url: DEFAULT_OG_IMAGE,
				alt: SITE_NAME,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: SITE_NAME,
		description: SITE_DESCRIPTION,
		images: [DEFAULT_OG_IMAGE],
	},
};

const RootLayout: FC<{ children: ReactNode }> = async ({ children }) => {
	const pageMap = await getPageMap();
	return (
		<html
			lang="zh-CN"
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
