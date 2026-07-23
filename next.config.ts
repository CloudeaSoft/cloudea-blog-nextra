import nextra from "nextra";
import { getBasePath, getNextOutput } from "./utils/env";

const withNextra = nextra({
	defaultShowCopyCode: true,
	readingTime: true,
	search: {
		codeblocks: true,
	},
	staticImage: true,
	mdxOptions: {
		rehypePrettyCodeOptions: {
			theme: {
				default: "dark-plus",
				light: "light-plus",
				dark: "dark-plus",
				sepia: "monokai",
			},
		},
	},
});

export default withNextra({
	basePath: getBasePath(),
	reactStrictMode: true,
	cleanDistDir: true,
	output: getNextOutput(),
	images: {
		// Required for static export; kept for server builds until an image loader is wired.
		unoptimized: true,
	},
	turbopack: {
		resolveAlias: {
			// Path to your `mdx-components` file with extension
			"next-mdx-import-source-file": "./mdx-components.tsx",
		},
	},
});
