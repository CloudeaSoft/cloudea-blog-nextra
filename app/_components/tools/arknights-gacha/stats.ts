import { rarityStars } from "./parse";
import type { GachaRecord } from "./types";

export type RarityShareBucket = {
	stars: number;
	count: number;
	/** 0–1 share of total records. */
	ratio: number;
};

export type PullCostStats = {
	/** Mean pulls between 5★ (completed intervals, oldest→newest). */
	avgFiveStar: number | null;
	/** Mean pulls between 6★ (completed intervals, oldest→newest). */
	avgSixStar: number | null;
	/** Pulls since the latest 6★ (0 if the newest pull is a 6★). */
	currentPity: number;
	fiveStarCount: number;
	sixStarCount: number;
	total: number;
};

/** Aggregate pull counts by displayed star rarity (rarity + 1). */
export function computeRarityShare(records: GachaRecord[]): RarityShareBucket[] {
	if (records.length === 0) return [];

	const counts = new Map<number, number>();
	for (const record of records) {
		const stars = rarityStars(record.rarity);
		counts.set(stars, (counts.get(stars) ?? 0) + 1);
	}

	const total = records.length;
	return [...counts.entries()]
		.sort((a, b) => b[0] - a[0])
		.map(([stars, count]) => ({
			stars,
			count,
			ratio: count / total,
		}));
}

/** Group newest-first records by pool, preserving order within each group. */
function groupByPool(
	recordsNewestFirst: GachaRecord[],
): Map<string, GachaRecord[]> {
	const byPool = new Map<string, GachaRecord[]>();
	for (const record of recordsNewestFirst) {
		const list = byPool.get(record.poolId);
		if (list) {
			list.push(record);
		} else {
			byPool.set(record.poolId, [record]);
		}
	}
	return byPool;
}

/**
 * Completed pull intervals per pool, oldest→newest within each pool.
 * Pity resets at pool boundaries, so intervals never span pools.
 */
function pullIntervalsPerPool(
	recordsNewestFirst: GachaRecord[],
	stars: number,
): Map<string, number[]> {
	const intervals = new Map<string, number[]>();
	for (const newestFirst of groupByPool(recordsNewestFirst).values()) {
		const chronological = [...newestFirst].reverse();
		const poolIntervals: number[] = [];
		let since = 0;

		for (const record of chronological) {
			since += 1;
			if (rarityStars(record.rarity) === stars) {
				poolIntervals.push(since);
				since = 0;
			}
		}

		intervals.set(newestFirst[0]!.poolId, poolIntervals);
	}
	return intervals;
}

/**
 * Average pulls spent per target star, using completed intervals
 * from oldest to newest. Intervals are computed per pool (pity resets
 * at pool boundaries) and then combined across pools.
 */
export function averagePullCost(
	recordsNewestFirst: GachaRecord[],
	stars: number,
): number | null {
	if (recordsNewestFirst.length === 0) return null;

	const intervals: number[] = [];
	for (const poolIntervals of pullIntervalsPerPool(
		recordsNewestFirst,
		stars,
	).values()) {
		intervals.push(...poolIntervals);
	}

	if (intervals.length === 0) return null;
	const sum = intervals.reduce((acc, value) => acc + value, 0);
	return sum / intervals.length;
}

/**
 * Pulls since the most recent 6★. Computed within the pool of the newest
 * record only — pity never carries across pools.
 */
export function currentSixStarPity(recordsNewestFirst: GachaRecord[]): number {
	const newest = recordsNewestFirst[0];
	if (!newest) return 0;

	let pity = 0;
	for (const record of recordsNewestFirst) {
		if (record.poolId !== newest.poolId) continue;
		if (rarityStars(record.rarity) === 6) break;
		pity += 1;
	}
	return pity;
}

export function computePullCostStats(records: GachaRecord[]): PullCostStats {
	let fiveStarCount = 0;
	let sixStarCount = 0;
	for (const record of records) {
		const stars = rarityStars(record.rarity);
		if (stars === 5) fiveStarCount += 1;
		if (stars === 6) sixStarCount += 1;
	}

	return {
		avgFiveStar: averagePullCost(records, 5),
		avgSixStar: averagePullCost(records, 6),
		currentPity: currentSixStarPity(records),
		fiveStarCount,
		sixStarCount,
		total: records.length,
	};
}

export function formatPercent(ratio: number): string {
	return `${(ratio * 100).toFixed(1)}%`;
}

export function formatAvgPulls(value: number | null): string {
	if (value === null) return "—";
	return value.toFixed(1);
}

export type PoolSummary = {
	poolId: string;
	poolName: string;
	/** Number of pulls in this pool within the current record set. */
	count: number;
};

export type SixStarPull = {
	name: string;
	/** Pulls spent to obtain this 6★ (oldest→newest interval). */
	count: number;
};

/** Unique pools in a newest-first list, ordered by most recent pull. */
export function listPoolsFromRecords(recordsNewestFirst: GachaRecord[]): PoolSummary[] {
	const seen = new Map<string, PoolSummary>();
	for (const record of recordsNewestFirst) {
		const existing = seen.get(record.poolId);
		if (existing) {
			existing.count += 1;
			continue;
		}
		seen.set(record.poolId, {
			poolId: record.poolId,
			poolName: record.poolName,
			count: 1,
		});
	}
	return [...seen.values()];
}

/** When `poolId` is null, return all records (「全部」). */
export function filterRecordsByPool(
	records: GachaRecord[],
	poolId: string | null,
): GachaRecord[] {
	if (poolId === null) return records;
	return records.filter((record) => record.poolId === poolId);
}

/**
 * Six-star pulls with per-hit cost, oldest→newest. Costs are computed per
 * pool (pity resets at pool boundaries) and merged in global time order.
 * Input is newest-first like the rest of the tool.
 */
export function sixStarHistory(recordsNewestFirst: GachaRecord[]): SixStarPull[] {
	if (recordsNewestFirst.length === 0) return [];

	type Hit = SixStarPull & { gachaTs: string; pos: number };
	const hits: Hit[] = [];

	for (const newestFirst of groupByPool(recordsNewestFirst).values()) {
		const chronological = [...newestFirst].reverse();
		let since = 0;

		for (const record of chronological) {
			since += 1;
			if (rarityStars(record.rarity) === 6) {
				hits.push({
					name: record.charName,
					count: since,
					gachaTs: record.gachaTs,
					pos: record.pos,
				});
				since = 0;
			}
		}
	}

	return hits
		.sort(
			(a, b) => Number(a.gachaTs) - Number(b.gachaTs) || a.pos - b.pos,
		)
		.map(({ name, count }) => ({ name, count }));
}
