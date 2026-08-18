import { describe, expect, it } from "vitest";
import {
	isExplicitCodeLanguage,
	normalizeCodeLanguage,
	resolveCodeBlockFilename,
} from "../code-pre-meta";

describe("isExplicitCodeLanguage", () => {
	it("rejects missing, blank, and implicit default languages", () => {
		expect(isExplicitCodeLanguage(undefined)).toBe(false);
		expect(isExplicitCodeLanguage(null)).toBe(false);
		expect(isExplicitCodeLanguage("")).toBe(false);
		expect(isExplicitCodeLanguage("   ")).toBe(false);
		expect(isExplicitCodeLanguage("plaintext")).toBe(false);
		expect(isExplicitCodeLanguage("PlainText")).toBe(false);
		expect(isExplicitCodeLanguage("text")).toBe(false);
		expect(isExplicitCodeLanguage("txt")).toBe(false);
	});

	it("accepts fence languages used in posts", () => {
		expect(isExplicitCodeLanguage("js")).toBe(true);
		expect(isExplicitCodeLanguage("bash")).toBe(true);
		expect(isExplicitCodeLanguage("csharp")).toBe(true);
		expect(isExplicitCodeLanguage("C++")).toBe(true);
		expect(isExplicitCodeLanguage("log")).toBe(true);
	});
});

describe("resolveCodeBlockFilename", () => {
	it("prefers a filename over the language label", () => {
		expect(resolveCodeBlockFilename("example.js", "js")).toBe("example.js");
		expect(resolveCodeBlockFilename("  notes.log  ", "log")).toBe("notes.log");
	});

	it("uses the original language token when the fence is explicit", () => {
		expect(resolveCodeBlockFilename(undefined, "js")).toBe("js");
		expect(resolveCodeBlockFilename("", "C++")).toBe("C++");
		expect(resolveCodeBlockFilename(undefined, "csharp")).toBe("csharp");
	});

	it("omits a header for unmarked or implicit languages", () => {
		expect(resolveCodeBlockFilename(undefined, undefined)).toBeUndefined();
		expect(resolveCodeBlockFilename(undefined, "plaintext")).toBeUndefined();
		expect(resolveCodeBlockFilename("", "text")).toBeUndefined();
		expect(resolveCodeBlockFilename(undefined, "txt")).toBeUndefined();
	});

	it("still shows a filename when the language is implicit", () => {
		expect(resolveCodeBlockFilename("notes.txt", "plaintext")).toBe("notes.txt");
	});
});

describe("normalizeCodeLanguage", () => {
	it("lowercases language ids for icon matching", () => {
		expect(normalizeCodeLanguage("CSharp")).toBe("csharp");
		expect(normalizeCodeLanguage("C++")).toBe("c++");
		expect(normalizeCodeLanguage("JS")).toBe("js");
	});

	it("returns undefined for missing or blank values", () => {
		expect(normalizeCodeLanguage(undefined)).toBeUndefined();
		expect(normalizeCodeLanguage("")).toBeUndefined();
		expect(normalizeCodeLanguage("  ")).toBeUndefined();
	});
});
