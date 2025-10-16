import nextra from "nextra";

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
	basePath: process.env.NEXT_PUBLIC_BASE_PATH,
	reactStrictMode: true,
	cleanDistDir: true,
	output: "export", // Enable when deploying to github page
	images: {
		unoptimized: true, // Enable when deploying to github page
	},
});
