import { afterEach, describe, expect, it } from "vitest";
import { getWalinePath, isPostArticlePath } from "../waline-path";

const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;

afterEach(() => {
	if (ORIGINAL_BASE_PATH === undefined) {
		delete process.env.NEXT_PUBLIC_BASE_PATH;
	} else {
		process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
	}
});

describe("isPostArticlePath", () => {
	it("matches individual post slugs under /posts", () => {
		expect(isPostArticlePath("/posts/github-250910")).toBe(true);
		expect(isPostArticlePath("/posts/dotnet-260529/")).toBe(true);
	});

	it("rejects the posts index and unrelated routes", () => {
		expect(isPostArticlePath("/posts")).toBe(false);
		expect(isPostArticlePath("/posts/")).toBe(false);
		expect(isPostArticlePath("/")).toBe(false);
		expect(isPostArticlePath("/tools/hlsl-preview")).toBe(false);
	});
});

describe("getWalinePath", () => {
	it("returns the pathname at site root", () => {
		delete process.env.NEXT_PUBLIC_BASE_PATH;
		expect(getWalinePath("/posts/github-250910")).toBe(
			"/posts/github-250910",
		);
	});

	it("prefixes NEXT_PUBLIC_BASE_PATH when set", () => {
		process.env.NEXT_PUBLIC_BASE_PATH = "/blog";
		expect(getWalinePath("/posts/github-250910")).toBe(
			"/blog/posts/github-250910",
		);
	});
});
