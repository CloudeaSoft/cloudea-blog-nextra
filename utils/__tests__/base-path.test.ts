import { describe, expect, it } from "vitest";
import { normalizeBasePath } from "../base-path";

describe("normalizeBasePath", () => {
	it("treats unset, blank, and / as site root", () => {
		expect(normalizeBasePath(undefined)).toBe("");
		expect(normalizeBasePath("")).toBe("");
		expect(normalizeBasePath("   ")).toBe("");
		expect(normalizeBasePath("/")).toBe("");
		expect(normalizeBasePath(" / ")).toBe("");
	});

	it("keeps a real subpath, adds a leading slash, and strips a trailing slash", () => {
		expect(normalizeBasePath("/blog")).toBe("/blog");
		expect(normalizeBasePath("/blog/")).toBe("/blog");
		expect(normalizeBasePath("blog")).toBe("/blog");
		expect(normalizeBasePath(" blog ")).toBe("/blog");
	});
});
