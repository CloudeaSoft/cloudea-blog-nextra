import { describe, expect, it } from "vitest";
import {
	averagePullCost,
	computePullCostStats,
	computeRarityShare,
	currentSixStarPity,
	filterRecordsByPool,
	formatAvgPulls,
	formatPercent,
	listPoolsFromRecords,
	sixStarHistory,
} from "../stats";
import type { GachaRecord } from "../types";

function sample(rarity: number, overrides: Partial<GachaRecord> = {}): GachaRecord {
	return {
		poolId: "p",
		poolName: "池",
		charId: `char_${rarity}`,
		charName: "干员",
		rarity,
		isNew: false,
		gachaTs: "1",
		pos: 0,
		gachaAt: new Date(1),
		...overrides,
	};
}

/** Newest-first sequence helper: first arg is newest. */
function newestFirst(...rarities: number[]): GachaRecord[] {
	return rarities.map((rarity, index) =>
		sample(rarity, {
			gachaTs: String(1000 - index),
			pos: index,
			charId: `char_${index}`,
			gachaAt: new Date(1000 - index),
		}),
	);
}

describe("computeRarityShare", () => {
	it("returns empty for no records", () => {
		expect(computeRarityShare([])).toEqual([]);
	});

	it("aggregates by displayed stars and sorts descending", () => {
		const buckets = computeRarityShare([
			sample(5),
			sample(5),
			sample(3),
			sample(2),
			sample(5),
		]);
		expect(buckets).toEqual([
			{ stars: 6, count: 3, ratio: 0.6 },
			{ stars: 4, count: 1, ratio: 0.2 },
			{ stars: 3, count: 1, ratio: 0.2 },
		]);
	});
});

describe("averagePullCost / pity", () => {
	it("averages completed intervals for 5★ and 6★", () => {
		// chrono oldest→newest API rarity: 2,2,4,2,5,2,3
		const records = newestFirst(3, 2, 5, 2, 4, 2, 2);
		// 5★ (rarity 4) at pull 3 → avg 3
		expect(averagePullCost(records, 5)).toBe(3);
		// 6★ (rarity 5) at pull 5 → avg 5
		expect(averagePullCost(records, 6)).toBe(5);
	});

	it("returns null when the target star never appears", () => {
		expect(averagePullCost(newestFirst(2, 2, 3), 6)).toBeNull();
	});

	it("counts pulls since the latest 6★", () => {
		expect(currentSixStarPity(newestFirst(2, 3, 5, 2))).toBe(2);
		expect(currentSixStarPity(newestFirst(5, 2, 2))).toBe(0);
		expect(currentSixStarPity(newestFirst(2, 3, 4))).toBe(3);
	});

	it("aggregates pull-cost stats", () => {
		const stats = computePullCostStats(newestFirst(2, 4, 5, 2, 4));
		expect(stats).toMatchObject({
			avgFiveStar: 2,
			avgSixStar: 3,
			currentPity: 2,
			fiveStarCount: 2,
			sixStarCount: 1,
			total: 5,
		});
	});
});

describe("formatters", () => {
	it("formats percent and average pulls", () => {
		expect(formatPercent(0.6)).toBe("60.0%");
		expect(formatPercent(1 / 3)).toBe("33.3%");
		expect(formatAvgPulls(12.5)).toBe("12.5");
		expect(formatAvgPulls(null)).toBe("—");
	});
});

describe("listPoolsFromRecords / filterRecordsByPool", () => {
	it("lists unique pools in newest-first encounter order", () => {
		const records = [
			sample(2, { poolId: "b", poolName: "乙", gachaTs: "3", charId: "1" }),
			sample(3, { poolId: "a", poolName: "甲", gachaTs: "2", charId: "2" }),
			sample(5, { poolId: "b", poolName: "乙", gachaTs: "1", charId: "3" }),
		];
		expect(listPoolsFromRecords(records)).toEqual([
			{ poolId: "b", poolName: "乙", count: 2 },
			{ poolId: "a", poolName: "甲", count: 1 },
		]);
	});

	it("returns empty for no records", () => {
		expect(listPoolsFromRecords([])).toEqual([]);
	});

	it("filters by poolId or returns all when null", () => {
		const records = [
			sample(2, { poolId: "a", charId: "1" }),
			sample(3, { poolId: "b", charId: "2" }),
			sample(4, { poolId: "a", charId: "3" }),
		];
		expect(filterRecordsByPool(records, null)).toEqual(records);
		expect(filterRecordsByPool(records, "a").map((r) => r.charId)).toEqual(["1", "3"]);
		expect(filterRecordsByPool(records, "missing")).toEqual([]);
	});
});

describe("sixStarHistory", () => {
	it("returns empty when there are no 6★", () => {
		expect(sixStarHistory(newestFirst(2, 3, 4))).toEqual([]);
	});

	it("records each 6★ with pulls spent since previous (or start)", () => {
		// chrono oldest→newest API rarity: 2,2,5,2,5  → costs 3 then 2
		const records = [
			sample(5, { charName: "乙", gachaTs: "5", charId: "5", pos: 0 }),
			sample(2, { charName: "杂", gachaTs: "4", charId: "4", pos: 0 }),
			sample(5, { charName: "甲", gachaTs: "3", charId: "3", pos: 0 }),
			sample(2, { charName: "杂", gachaTs: "2", charId: "2", pos: 0 }),
			sample(2, { charName: "杂", gachaTs: "1", charId: "1", pos: 0 }),
		];
		expect(sixStarHistory(records)).toEqual([
			{ name: "甲", count: 3 },
			{ name: "乙", count: 2 },
		]);
	});
});

describe("pool-aware stats across pools", () => {
	it("resets six-star intervals at pool boundaries", () => {
		// Pool 甲 chrono: 2,2,5 → cost 3; Pool 乙 chrono: 2,5 → cost 2.
		const records = [
			sample(5, { poolId: "乙", poolName: "乙", charName: "乙六", gachaTs: "5", charId: "5" }),
			sample(2, { poolId: "乙", poolName: "乙", charName: "杂", gachaTs: "4", charId: "4" }),
			sample(5, { poolId: "甲", poolName: "甲", charName: "甲六", gachaTs: "3", charId: "3" }),
			sample(2, { poolId: "甲", poolName: "甲", charName: "杂", gachaTs: "2", charId: "2" }),
			sample(2, { poolId: "甲", poolName: "甲", charName: "杂", gachaTs: "1", charId: "1" }),
		];
		// Naively summing across pools would report 乙六 as 4 (3 + 1).
		expect(sixStarHistory(records)).toEqual([
			{ name: "甲六", count: 3 },
			{ name: "乙六", count: 2 },
		]);
	});

	it("keeps per-pool intervals when pools interleave in time", () => {
		// 乙 chrono: 2,5 → cost 2; 甲 chrono: 2,5 → cost 2, but time interleaves.
		const records = [
			sample(5, { poolId: "乙", poolName: "乙", charName: "乙六", gachaTs: "5", charId: "5" }),
			sample(2, { poolId: "甲", poolName: "甲", charName: "杂", gachaTs: "4", charId: "4" }),
			sample(2, { poolId: "乙", poolName: "乙", charName: "杂", gachaTs: "3", charId: "3" }),
			sample(5, { poolId: "甲", poolName: "甲", charName: "甲六", gachaTs: "2", charId: "2" }),
			sample(2, { poolId: "甲", poolName: "甲", charName: "杂", gachaTs: "1", charId: "1" }),
		];
		expect(sixStarHistory(records)).toEqual([
			{ name: "甲六", count: 2 },
			{ name: "乙六", count: 2 },
		]);
	});

	it("computes current pity within the newest pool only", () => {
		// Newest record is 乙; pool 乙 has a 6★ two pulls back.
		const records = [
			sample(2, { poolId: "乙", gachaTs: "4", charId: "4" }),
			sample(5, { poolId: "乙", gachaTs: "3", charId: "3" }),
			sample(2, { poolId: "甲", gachaTs: "2", charId: "2" }),
			sample(2, { poolId: "甲", gachaTs: "1", charId: "1" }),
		];
		expect(currentSixStarPity(records)).toBe(1);
		// Without a 6★ in the newest pool, pity counts all its pulls.
		expect(currentSixStarPity([
			sample(2, { poolId: "乙", gachaTs: "4", charId: "4" }),
			sample(2, { poolId: "乙", gachaTs: "3", charId: "3" }),
			sample(5, { poolId: "甲", gachaTs: "2", charId: "2" }),
			sample(2, { poolId: "甲", gachaTs: "1", charId: "1" }),
		])).toBe(2);
	});

	it("averages completed intervals per pool", () => {
		// 甲: 2,2,5 → 3; 乙: 2,4,2,5 → 4 → average 3.5.
		const records = [
			sample(5, { poolId: "乙", gachaTs: "5", charId: "5" }),
			sample(2, { poolId: "乙", gachaTs: "4", charId: "4" }),
			sample(4, { poolId: "乙", gachaTs: "3", charId: "3" }),
			sample(2, { poolId: "乙", gachaTs: "2", charId: "2" }),
			sample(5, { poolId: "甲", gachaTs: "1", charId: "1" }),
			sample(2, { poolId: "甲", gachaTs: "0", charId: "0" }),
			sample(2, { poolId: "甲", gachaTs: "-1", charId: "-1" }),
		];
		expect(averagePullCost(records, 6)).toBe(3.5);
	});
});
