import { describe, expect, it } from "vitest";
import {
	averagePullCost,
	computePullCostStats,
	computeRarityShare,
	currentSixStarPity,
	formatAvgPulls,
	formatPercent,
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
