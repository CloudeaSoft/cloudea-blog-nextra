import nextra from "nextra";

const withNextra = nextra({
  defaultShowCopyCode: true,
  readingTime: true,
  search: {
    codeblocks: true,
  },
  staticImage: true,
});

export default withNextra({
  reactStrictMode: true,
  cleanDistDir: true,
  output: "export", // Enable when deploying to github page
  images: {
    unoptimized: true, // Enable when deploying to github page
  },
});
