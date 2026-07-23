import { afterEach, describe, expect, it } from "vitest";
import {
	getBasePath,
	getBaseUrl,
	getHomeHref,
	getNextOutput,
	getSiteUrl,
	isStaticExport,
	normalizeBasePath,
} from "../env";

const ORIGINAL_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;
const ORIGINAL_NEXT_OUTPUT = process.env.NEXT_OUTPUT;

afterEach(() => {
	if (ORIGINAL_BASE_URL === undefined) {
		delete process.env.NEXT_PUBLIC_BASE_URL;
	} else {
		process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL_BASE_URL;
	}

	if (ORIGINAL_BASE_PATH === undefined) {
		delete process.env.NEXT_PUBLIC_BASE_PATH;
	} else {
		process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
	}

	if (ORIGINAL_NEXT_OUTPUT === undefined) {
		delete process.env.NEXT_OUTPUT;
	} else {
		process.env.NEXT_OUTPUT = ORIGINAL_NEXT_OUTPUT;
	}
});

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

describe("env accessors", () => {
	it("reads and trims NEXT_PUBLIC_BASE_URL", () => {
		process.env.NEXT_PUBLIC_BASE_URL = " https://example.com/ ";
		expect(getBaseUrl()).toBe("https://example.com");
	});

	it("normalizes NEXT_PUBLIC_BASE_PATH from process.env", () => {
		delete process.env.NEXT_PUBLIC_BASE_PATH;
		expect(getBasePath()).toBe("");

		process.env.NEXT_PUBLIC_BASE_PATH = "/";
		expect(getBasePath()).toBe("");

		process.env.NEXT_PUBLIC_BASE_PATH = "/blog/";
		expect(getBasePath()).toBe("/blog");
	});

	it("builds site URL from base URL + base path", () => {
		process.env.NEXT_PUBLIC_BASE_URL = "https://example.com";
		process.env.NEXT_PUBLIC_BASE_PATH = "/";
		expect(getSiteUrl()).toBe("https://example.com");

		process.env.NEXT_PUBLIC_BASE_PATH = "/blog";
		expect(getSiteUrl()).toBe("https://example.com/blog");
	});

	it("builds a relative home href without requiring BASE_URL", () => {
		delete process.env.NEXT_PUBLIC_BASE_URL;
		delete process.env.NEXT_PUBLIC_BASE_PATH;
		expect(getHomeHref()).toBe("/");

		process.env.NEXT_PUBLIC_BASE_PATH = "/";
		expect(getHomeHref()).toBe("/");

		process.env.NEXT_PUBLIC_BASE_PATH = "/blog";
		expect(getHomeHref()).toBe("/blog");
	});

	it("defaults NEXT_OUTPUT to static export", () => {
		delete process.env.NEXT_OUTPUT;
		expect(getNextOutput()).toBe("export");
		expect(isStaticExport()).toBe(true);

		process.env.NEXT_OUTPUT = "export";
		expect(getNextOutput()).toBe("export");
	});

	it("disables static export for server / Workers builds", () => {
		for (const value of ["server", "default", "none", "0", "false", "SERVER"]) {
			process.env.NEXT_OUTPUT = value;
			expect(getNextOutput()).toBeUndefined();
			expect(isStaticExport()).toBe(false);
		}
	});
});
