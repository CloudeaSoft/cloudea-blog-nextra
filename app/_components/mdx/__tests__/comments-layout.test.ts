import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const commentsCss = readFileSync(resolve(dir, "../comments.css"), "utf8");
const mdxComponents = readFileSync(
	resolve(dir, "../../../../mdx-components.tsx"),
	"utf8",
);

describe("Waline comment layout isolation", () => {
	it("keeps Waline a sibling of .markdown-body, not a descendant", () => {
		const wrapper = mdxComponents.slice(
			mdxComponents.indexOf("wrapper("),
		);

		expect(wrapper).toMatch(
			/<div className="markdown-body prose max-md:prose-sm dark:prose-invert">/,
		);
		expect(wrapper).toMatch(/<\/div>\s*<Comments \/>/);
		expect(wrapper).not.toMatch(
			/page-sheet__panel markdown-body/,
		);
	});

	it("restores the Markdown toolbar <a> to the same flex box as sibling actions", () => {
		const match = commentsCss.match(
			/\.waline-comments a\.wl-action\s*\{([^}]+)\}/,
		);
		expect(match?.[1]).toBeDefined();

		const body = match?.[1] ?? "";
		expect(body).toMatch(/display:\s*inline-flex/);
		expect(body).toMatch(/align-items:\s*center/);
		expect(body).toMatch(/justify-content:\s*center/);
		expect(body).toMatch(/padding:\s*0/);
		expect(body).toMatch(/background-image:\s*none/);
		expect(body).toMatch(/line-height:\s*1/);
	});
});
