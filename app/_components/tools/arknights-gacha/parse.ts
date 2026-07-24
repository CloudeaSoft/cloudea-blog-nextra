import {
	GachaApiError,
	type GachaApiEnvelope,
	type GachaCategory,
	type GachaHistoryPage,
	type GachaRecord,
	type RawGachaCategory,
	type RawGachaHistoryPage,
	type RawGachaRecord,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
	if (typeof value !== "string") {
		throw new GachaApiError(`Invalid field "${field}": expected string`);
	}
	return value;
}

function asNumber(value: unknown, field: string): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new GachaApiError(`Invalid field "${field}": expected number`);
	}
	return value;
}

function asBoolean(value: unknown, field: string): boolean {
	if (typeof value !== "boolean") {
		throw new GachaApiError(`Invalid field "${field}": expected boolean`);
	}
	return value;
}

export function categoryLabel(name: string): string {
	return name.replace(/\s*\n\s*/g, " ").trim();
}

export function parseEnvelopeData<T>(
	payload: unknown,
	parseData: (data: unknown) => T,
): T {
	if (!isRecord(payload)) {
		throw new GachaApiError("Invalid API response: expected object");
	}

	const code = asNumber(payload.code, "code");
	const msg = typeof payload.msg === "string" ? payload.msg : "";

	if (code !== 0) {
		throw new GachaApiError(msg || `API returned code ${code}`, { code });
	}

	return parseData(payload.data);
}

export function parseRawCategory(value: unknown): RawGachaCategory {
	if (!isRecord(value)) {
		throw new GachaApiError("Invalid category entry");
	}
	return {
		id: asString(value.id, "id"),
		name: asString(value.name, "name"),
	};
}

export function parseCategory(value: unknown): GachaCategory {
	const raw = parseRawCategory(value);
	return {
		id: raw.id,
		name: raw.name,
		label: categoryLabel(raw.name),
	};
}

export function parseCategoriesPayload(payload: unknown): GachaCategory[] {
	return parseEnvelopeData(payload, (data) => {
		if (!Array.isArray(data)) {
			throw new GachaApiError("Invalid categories payload: expected array");
		}
		return data.map(parseCategory);
	});
}

export function parseRawRecord(value: unknown): RawGachaRecord {
	if (!isRecord(value)) {
		throw new GachaApiError("Invalid history record");
	}
	return {
		poolId: asString(value.poolId, "poolId"),
		poolName: asString(value.poolName, "poolName"),
		charId: asString(value.charId, "charId"),
		charName: asString(value.charName, "charName"),
		rarity: asNumber(value.rarity, "rarity"),
		isNew: asBoolean(value.isNew, "isNew"),
		gachaTs: asString(value.gachaTs, "gachaTs"),
		pos: asNumber(value.pos, "pos"),
	};
}

export function parseRecord(value: unknown): GachaRecord {
	const raw = parseRawRecord(value);
	const ms = Number(raw.gachaTs);
	if (!Number.isFinite(ms)) {
		throw new GachaApiError(`Invalid gachaTs: ${raw.gachaTs}`);
	}
	return {
		...raw,
		gachaAt: new Date(ms),
	};
}

export function parseRawHistoryPage(value: unknown): RawGachaHistoryPage {
	if (!isRecord(value)) {
		throw new GachaApiError("Invalid history page");
	}
	if (!Array.isArray(value.list)) {
		throw new GachaApiError("Invalid history page: expected list array");
	}
	return {
		list: value.list.map(parseRawRecord),
		hasMore: asBoolean(value.hasMore, "hasMore"),
	};
}

export function parseHistoryPage(value: unknown): GachaHistoryPage {
	const raw = parseRawHistoryPage(value);
	return {
		list: raw.list.map((item) => parseRecord(item)),
		hasMore: raw.hasMore,
	};
}

export function parseHistoryPayload(payload: unknown): GachaHistoryPage {
	return parseEnvelopeData(payload, parseHistoryPage);
}

export function recordKey(record: Pick<GachaRecord, "gachaTs" | "pos" | "charId">): string {
	return `${record.gachaTs}:${record.pos}:${record.charId}`;
}

export function mergeHistoryRecords(
	existing: GachaRecord[],
	incoming: GachaRecord[],
): GachaRecord[] {
	const seen = new Set(existing.map(recordKey));
	const merged = [...existing];
	for (const record of incoming) {
		const key = recordKey(record);
		if (seen.has(key)) continue;
		seen.add(key);
		merged.push(record);
	}
	return merged;
}

/** Official rarity is 0–5; UI stars = rarity + 1. */
export function rarityStars(rarity: number): number {
	return rarity + 1;
}

export type { GachaApiEnvelope };
