import { categoryLabel, recordKey } from "./parse";
import type { GachaRecord } from "./types";

export const RECORDS_STORAGE_PREFIX = "cloudea-tools-arknights-gacha-records-v1";

/** Serializable form — `gachaAt` is revived from `gachaTs` on load. */
export type StoredGachaRecord = Omit<GachaRecord, "gachaAt">;

export type CategoryRecordsCache = {
	version: 1;
	uid: string;
	category: string;
	/** Original API category name (may contain newlines). Used for display. */
	categoryName: string;
	/** Normalized label for runtime matching / fallbacks. */
	categoryLabel: string;
	updatedAt: string;
	records: StoredGachaRecord[];
};

export type CachedCategoryInfo = {
	id: string;
	/** Original API name for display. */
	name: string;
	/** Normalized label for runtime. */
	label: string;
	recordCount: number;
	updatedAt: string | null;
};

export function recordsStorageKey(uid: string, category: string): string {
	return `${RECORDS_STORAGE_PREFIX}:${encodeURIComponent(uid)}:${encodeURIComponent(category)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStoredRecord(value: unknown): StoredGachaRecord | null {
	if (!isRecord(value)) return null;
	if (
		typeof value.poolId !== "string"
		|| typeof value.poolName !== "string"
		|| typeof value.charId !== "string"
		|| typeof value.charName !== "string"
		|| typeof value.rarity !== "number"
		|| typeof value.isNew !== "boolean"
		|| typeof value.gachaTs !== "string"
		|| typeof value.pos !== "number"
	) {
		return null;
	}
	return {
		poolId: value.poolId,
		poolName: value.poolName,
		charId: value.charId,
		charName: value.charName,
		rarity: value.rarity,
		isNew: value.isNew,
		gachaTs: value.gachaTs,
		pos: value.pos,
	};
}

function resolveCachedNames(parsed: Record<string, unknown>, categoryId: string): {
	categoryName: string;
	categoryLabel: string;
} {
	const rawName = typeof parsed.categoryName === "string" ? parsed.categoryName : "";
	const rawLabel = typeof parsed.categoryLabel === "string" ? parsed.categoryLabel : "";

	if (rawName.trim()) {
		return {
			categoryName: rawName,
			categoryLabel: rawLabel.trim() || categoryLabel(rawName),
		};
	}

	if (rawLabel.trim()) {
		// Legacy caches only stored label — keep it for both until next save.
		return {
			categoryName: rawLabel,
			categoryLabel: rawLabel.trim(),
		};
	}

	return {
		categoryName: categoryId,
		categoryLabel: categoryId,
	};
}

function parseCachePayload(raw: string): CategoryRecordsCache | null {
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.records)) {
			return null;
		}
		if (typeof parsed.uid !== "string" || typeof parsed.category !== "string") {
			return null;
		}
		const records: StoredGachaRecord[] = [];
		for (const item of parsed.records) {
			const stored = parseStoredRecord(item);
			if (stored) records.push(stored);
		}
		const names = resolveCachedNames(parsed, parsed.category);
		return {
			version: 1,
			uid: parsed.uid,
			category: parsed.category,
			categoryName: names.categoryName,
			categoryLabel: names.categoryLabel,
			updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
			records,
		};
	} catch {
		return null;
	}
}

export function serializeRecord(record: GachaRecord): StoredGachaRecord {
	return {
		poolId: record.poolId,
		poolName: record.poolName,
		charId: record.charId,
		charName: record.charName,
		rarity: record.rarity,
		isNew: record.isNew,
		gachaTs: record.gachaTs,
		pos: record.pos,
	};
}

export function reviveRecord(record: StoredGachaRecord): GachaRecord {
	const ms = Number(record.gachaTs);
	return {
		...record,
		gachaAt: new Date(Number.isFinite(ms) ? ms : NaN),
	};
}

export function sortRecordsNewestFirst(records: GachaRecord[]): GachaRecord[] {
	return [...records].sort((a, b) => {
		const ts = Number(b.gachaTs) - Number(a.gachaTs);
		if (ts !== 0) return ts;
		return b.pos - a.pos;
	});
}

export function loadCategoryRecords(uid: string, category: string): GachaRecord[] {
	if (typeof window === "undefined") return [];
	if (!uid.trim() || !category.trim()) return [];

	const raw = window.localStorage.getItem(recordsStorageKey(uid, category));
	if (!raw) return [];
	const payload = parseCachePayload(raw);
	if (!payload || payload.records.length === 0) return [];
	return sortRecordsNewestFirst(payload.records.map(reviveRecord));
}

export type SaveCategoryRecordsOptions = {
	/** Original API category name (preferred for display). */
	name?: string;
	/** Normalized label; derived from `name` when omitted. */
	label?: string;
};

/**
 * Persist records for uid+category.
 * Empty lists do **not** create a cache key (and remove any existing empty bucket).
 */
export function saveCategoryRecords(
	uid: string,
	category: string,
	records: GachaRecord[],
	options: SaveCategoryRecordsOptions = {},
): CategoryRecordsCache | null {
	if (!uid.trim() || !category.trim()) return null;

	if (records.length === 0) {
		clearCategoryRecords(uid, category);
		return null;
	}

	const name = options.name?.trim()
		? options.name
		: (options.label?.trim() ? options.label : category);
	const label = options.label?.trim() || categoryLabel(name);

	const payload: CategoryRecordsCache = {
		version: 1,
		uid,
		category,
		categoryName: name,
		categoryLabel: label,
		updatedAt: new Date().toISOString(),
		records: sortRecordsNewestFirst(records).map(serializeRecord),
	};

	if (typeof window !== "undefined") {
		window.localStorage.setItem(
			recordsStorageKey(uid, category),
			JSON.stringify(payload),
		);
	}
	return payload;
}

export function clearCategoryRecords(uid: string, category: string): void {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(recordsStorageKey(uid, category));
}

/** Remove all cached gacha record buckets for a uid. */
export function clearUidRecords(uid: string): void {
	if (typeof window === "undefined" || !uid.trim()) return;
	const prefix = `${RECORDS_STORAGE_PREFIX}:${encodeURIComponent(uid)}:`;
	const keys: string[] = [];
	for (let i = 0; i < window.localStorage.length; i += 1) {
		const key = window.localStorage.key(i);
		if (key?.startsWith(prefix)) keys.push(key);
	}
	for (const key of keys) {
		window.localStorage.removeItem(key);
	}
}

/** List non-empty cached categories for a uid (no empty keys). */
export function listCachedCategories(uid: string): CachedCategoryInfo[] {
	if (typeof window === "undefined" || !uid.trim()) return [];

	const prefix = `${RECORDS_STORAGE_PREFIX}:${encodeURIComponent(uid)}:`;
	const result: CachedCategoryInfo[] = [];

	for (let i = 0; i < window.localStorage.length; i += 1) {
		const key = window.localStorage.key(i);
		if (!key?.startsWith(prefix)) continue;

		const raw = window.localStorage.getItem(key);
		if (!raw) continue;
		const payload = parseCachePayload(raw);
		if (!payload || payload.records.length === 0) continue;

		let id = payload.category;
		try {
			const fromKey = decodeURIComponent(key.slice(prefix.length));
			if (fromKey) id = fromKey;
		} catch {
			// keep payload.category
		}

		result.push({
			id,
			name: payload.categoryName,
			label: payload.categoryLabel,
			recordCount: payload.records.length,
			updatedAt: payload.updatedAt || null,
		});
	}

	return result.sort((a, b) => {
		const at = a.updatedAt ? Date.parse(a.updatedAt) : 0;
		const bt = b.updatedAt ? Date.parse(b.updatedAt) : 0;
		if (bt !== at) return bt - at;
		return a.id.localeCompare(b.id);
	});
}

export function knownRecordKeys(records: GachaRecord[]): Set<string> {
	return new Set(records.map(recordKey));
}

export type DisplayCategory = {
	id: string;
	name: string;
	label: string;
	cached: boolean;
	recordCount: number;
};

/** Cached categories first, then API categories not yet cached. */
export function mergeDisplayCategories(
	apiCategories: Array<{ id: string; name: string; label: string }>,
	cachedCategories: CachedCategoryInfo[],
): DisplayCategory[] {
	const apiById = new Map(apiCategories.map((item) => [item.id, item]));
	const seen = new Set<string>();
	const out: DisplayCategory[] = [];

	for (const cached of cachedCategories) {
		const api = apiById.get(cached.id);
		out.push({
			id: cached.id,
			name: api?.name ?? cached.name,
			label: api?.label ?? cached.label,
			cached: true,
			recordCount: cached.recordCount,
		});
		seen.add(cached.id);
	}

	for (const api of apiCategories) {
		if (seen.has(api.id)) continue;
		out.push({
			id: api.id,
			name: api.name,
			label: api.label,
			cached: false,
			recordCount: 0,
		});
	}

	return out;
}
