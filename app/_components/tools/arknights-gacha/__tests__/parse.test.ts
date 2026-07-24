import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	categoryLabel,
	mergeHistoryRecords,
	parseCategoriesPayload,
	parseHistoryPayload,
	rarityStars,
	recordKey,
} from "../parse";
import type { GachaRecord } from "../types";
import { GachaApiError } from "../types";

const assetsDir = path.resolve(__dirname, "../../../../../e2e/assets");
const cateFixture = JSON.parse(
	readFileSync(path.join(assetsDir, "cate.json"), "utf8"),
) as unknown;
const historyFixture = JSON.parse(
	readFileSync(path.join(assetsDir, "history.json"), "utf8"),
) as unknown;

function sampleRecord(overrides: Partial<GachaRecord> = {}): GachaRecord {
	return {
		poolId: "pool",
		poolName: "池",
		charId: "char_1",
		charName: "干员",
		rarity: 5,
		isNew: false,
		gachaTs: "1000",
		pos: 0,
		gachaAt: new Date(1000),
		...overrides,
	};
}

describe("categoryLabel", () => {
	it("collapses newlines to spaces", () => {
		expect(categoryLabel("限定寻访\n庆典")).toBe("限定寻访 庆典");
	});
});

describe("parseCategoriesPayload", () => {
	it("parses the cate fixture", () => {
		const categories = parseCategoriesPayload(cateFixture);
		expect(categories).toHaveLength(4);
		expect(categories[0]).toEqual({
			id: "anniver_fest",
			name: "限定寻访\n庆典",
			label: "限定寻访 庆典",
		});
		expect(categories.map((c) => c.id)).toEqual([
			"anniver_fest",
			"MH_02",
			"normal",
			"classic",
		]);
	});

	it("rejects non-zero API codes", () => {
		expect(() =>
			parseCategoriesPayload({ code: 1, data: [], msg: "unauthorized" }),
		).toThrow(GachaApiError);
	});
});

describe("parseHistoryPayload", () => {
	it("parses the history fixture", () => {
		const page = parseHistoryPayload(historyFixture);
		expect(page.hasMore).toBe(true);
		expect(page.list).toHaveLength(10);
		expect(page.list[0]).toMatchObject({
			poolId: "LINKAGE_74_0_1",
			poolName: "幽境狩人",
			charId: "char_253_greyy",
			charName: "格雷伊",
			rarity: 3,
			isNew: false,
			gachaTs: "1781262384631",
			pos: 0,
		});
		expect(page.list[0]!.gachaAt.getTime()).toBe(1781262384631);
	});
});

describe("mergeHistoryRecords", () => {
	it("deduplicates by gachaTs+pos+charId", () => {
		const a = sampleRecord({ gachaTs: "1", pos: 0, charId: "a" });
		const b = sampleRecord({ gachaTs: "1", pos: 0, charId: "a", charName: "dup" });
		const c = sampleRecord({ gachaTs: "1", pos: 1, charId: "a" });
		const merged = mergeHistoryRecords([a], [b, c]);
		expect(merged).toHaveLength(2);
		expect(merged[0]!.charName).toBe("干员");
		expect(recordKey(merged[1]!)).toBe("1:1:a");
	});
});

describe("rarityStars", () => {
	it("maps official rarity to displayed stars", () => {
		expect(rarityStars(5)).toBe(6);
		expect(rarityStars(2)).toBe(3);
	});
});
