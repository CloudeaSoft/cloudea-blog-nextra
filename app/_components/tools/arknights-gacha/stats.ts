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

/**
 * Average pulls spent per target star, using completed intervals
 * from oldest to newest (pulls from data start / previous hit → this hit).
 */
export function averagePullCost(
	recordsNewestFirst: GachaRecord[],
	stars: number,
): number | null {
	if (recordsNewestFirst.length === 0) return null;

	const chronological = [...recordsNewestFirst].reverse();
	const intervals: number[] = [];
	let since = 0;

	for (const record of chronological) {
		since += 1;
		if (rarityStars(record.rarity) === stars) {
			intervals.push(since);
			since = 0;
		}
	}

	if (intervals.length === 0) return null;
	const sum = intervals.reduce((acc, value) => acc + value, 0);
	return sum / intervals.length;
}

/** Pulls since the most recent 6★ in a newest-first list. */
export function currentSixStarPity(recordsNewestFirst: GachaRecord[]): number {
	let pity = 0;
	for (const record of recordsNewestFirst) {
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
