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
});
