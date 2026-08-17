import { afterEach, describe, expect, it } from "vitest";
import {
	getWalinePath,
	isCommentsEnabledPath,
	isFriendsPath,
	isPostArticlePath,
} from "../waline-path";

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
		expect(isPostArticlePath("/about")).toBe(false);
		expect(isPostArticlePath("/friends")).toBe(false);
		expect(isPostArticlePath("/tools/hlsl-preview")).toBe(false);
	});
});

describe("isFriendsPath", () => {
	it("matches /friends with or without a trailing slash", () => {
		expect(isFriendsPath("/friends")).toBe(true);
		expect(isFriendsPath("/friends/")).toBe(true);
	});

	it("rejects nested or unrelated routes", () => {
		expect(isFriendsPath("/friends/list")).toBe(false);
		expect(isFriendsPath("/about")).toBe(false);
		expect(isFriendsPath("/")).toBe(false);
	});
});

describe("isCommentsEnabledPath", () => {
	it("enables comments on post articles and Friends", () => {
		expect(isCommentsEnabledPath("/posts/github-250910")).toBe(true);
		expect(isCommentsEnabledPath("/friends")).toBe(true);
		expect(isCommentsEnabledPath("/friends/")).toBe(true);
	});

	it("keeps comments off About, indexes, and other pages", () => {
		expect(isCommentsEnabledPath("/about")).toBe(false);
		expect(isCommentsEnabledPath("/posts")).toBe(false);
		expect(isCommentsEnabledPath("/")).toBe(false);
		expect(isCommentsEnabledPath("/docs")).toBe(false);
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
