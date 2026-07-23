import nextra from "nextra";
import { getBasePath } from "./utils/env";

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
	output: "export", // Enable when deploying to github page
	images: {
		unoptimized: true, // Enable when deploying to github page
	},
	turbopack: {
		resolveAlias: {
			// Path to your `mdx-components` file with extension
			"next-mdx-import-source-file": "./mdx-components.tsx",
		},
	},
});
