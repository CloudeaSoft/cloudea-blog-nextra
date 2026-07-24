import { describe, expect, it } from "vitest";
import { TOOLS } from "../registry";

describe("tools registry", () => {
	it("lists HLSL Preview with a stable route", () => {
		expect(TOOLS.length).toBeGreaterThan(0);
		const hlsl = TOOLS.find((tool) => tool.id === "hlsl-preview");
		expect(hlsl).toBeDefined();
		expect(hlsl!.href).toBe("/tools/hlsl-preview");
		expect(hlsl!.title).toMatch(/HLSL/i);
	});

	it("lists Arknights Gacha History with a stable route", () => {
		const gacha = TOOLS.find((tool) => tool.id === "arknights-gacha");
		expect(gacha).toBeDefined();
		expect(gacha!.href).toBe("/tools/arknights-gacha");
		expect(gacha!.title).toMatch(/Arknights/i);
	});

	it("keeps unique ids and hrefs", () => {
		const ids = TOOLS.map((tool) => tool.id);
		const hrefs = TOOLS.map((tool) => tool.href);
		expect(new Set(ids).size).toBe(ids.length);
		expect(new Set(hrefs).size).toBe(hrefs.length);
	});
});
