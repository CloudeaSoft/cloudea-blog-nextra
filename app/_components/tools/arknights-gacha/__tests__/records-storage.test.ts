import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	clearCategoryRecords,
	clearUidRecords,
	listCachedCategories,
	loadCategoryRecords,
	mergeDisplayCategories,
	recordsStorageKey,
	saveCategoryRecords,
	serializeRecord,
	sortRecordsNewestFirst,
} from "../records-storage";
import type { GachaRecord } from "../types";

function sample(overrides: Partial<GachaRecord> = {}): GachaRecord {
	return {
		poolId: "p",
		poolName: "池",
		charId: "char_a",
		charName: "A",
		rarity: 5,
		isNew: false,
		gachaTs: "2000",
		pos: 0,
		gachaAt: new Date(2000),
		...overrides,
	};
}

class MemoryStorage implements Storage {
	private data = new Map<string, string>();

	get length() {
		return this.data.size;
	}

	clear() {
		this.data.clear();
	}

	getItem(key: string) {
		return this.data.has(key) ? this.data.get(key)! : null;
	}

	key(index: number) {
		return [...this.data.keys()][index] ?? null;
	}

	removeItem(key: string) {
		this.data.delete(key);
	}

	setItem(key: string, value: string) {
		this.data.set(key, value);
	}
}

describe("records-storage", () => {
	beforeEach(() => {
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: { localStorage: new MemoryStorage() },
		});
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: (globalThis as { window: { localStorage: Storage } }).window.localStorage,
		});
	});

	afterEach(() => {
		Reflect.deleteProperty(globalThis, "window");
		Reflect.deleteProperty(globalThis, "localStorage");
	});

	it("uses distinct keys per uid and category", () => {
		expect(recordsStorageKey("u1", "normal")).not.toBe(
			recordsStorageKey("u1", "classic"),
		);
		expect(recordsStorageKey("u1", "normal")).not.toBe(
			recordsStorageKey("u2", "normal"),
		);
	});

	it("saves and loads records for a uid+category bucket", () => {
		const records = [
			sample({ gachaTs: "100", charId: "old", gachaAt: new Date(100) }),
			sample({ gachaTs: "300", charId: "new", gachaAt: new Date(300) }),
		];
		saveCategoryRecords("uid-1", "normal", records, {
			name: "标准寻访",
			label: "标准寻访",
		});

		const loaded = loadCategoryRecords("uid-1", "normal");
		expect(loaded.map((r) => r.charId)).toEqual(["new", "old"]);
		expect(loaded[0]!.gachaAt.getTime()).toBe(300);
		expect(loadCategoryRecords("uid-1", "classic")).toEqual([]);
		expect(loadCategoryRecords("uid-2", "normal")).toEqual([]);
	});

	it("does not create a cache key for empty record lists", () => {
		expect(saveCategoryRecords("uid-1", "normal", [])).toBeNull();
		expect(
			window.localStorage.getItem(recordsStorageKey("uid-1", "normal")),
		).toBeNull();
	});

	it("stores both original name and normalized label", () => {
		const saved = saveCategoryRecords("uid-1", "anniver_fest", [sample()], {
			name: "限定寻访\n庆典",
			label: "限定寻访 庆典",
		});
		expect(saved).toMatchObject({
			categoryName: "限定寻访\n庆典",
			categoryLabel: "限定寻访 庆典",
		});

		const listed = listCachedCategories("uid-1");
		expect(listed[0]).toMatchObject({
			id: "anniver_fest",
			name: "限定寻访\n庆典",
			label: "限定寻访 庆典",
			recordCount: 1,
		});
	});

	it("lists only non-empty cached categories for a uid", () => {
		saveCategoryRecords("uid-1", "normal", [sample()], {
			name: "标准寻访",
			label: "标准寻访",
		});
		saveCategoryRecords("uid-1", "classic", [
			sample({ charId: "c", gachaTs: "9", gachaAt: new Date(9) }),
		], {
			name: "中坚寻访",
			label: "中坚寻访",
		});
		saveCategoryRecords("uid-2", "normal", [sample({ charId: "other" })]);

		expect(listCachedCategories("uid-1").map((item) => item.id).sort()).toEqual([
			"classic",
			"normal",
		]);
		expect(listCachedCategories("uid-1").find((item) => item.id === "normal")).toMatchObject({
			name: "标准寻访",
			label: "标准寻访",
			recordCount: 1,
		});
	});

	it("merges cached categories first, then uncached API categories", () => {
		const merged = mergeDisplayCategories(
			[
				{ id: "normal", name: "标准寻访", label: "标准寻访" },
				{ id: "MH_02", name: "新池", label: "新池" },
			],
			[
				{
					id: "classic",
					name: "中坚寻访",
					label: "中坚寻访",
					recordCount: 3,
					updatedAt: "2026-01-01T00:00:00.000Z",
				},
				{
					id: "normal",
					name: "标准寻访",
					label: "标准寻访",
					recordCount: 10,
					updatedAt: "2026-01-02T00:00:00.000Z",
				},
			],
		);

		expect(merged.map((item) => item.id)).toEqual(["classic", "normal", "MH_02"]);
		expect(merged[0]).toMatchObject({
			cached: true,
			name: "中坚寻访",
			label: "中坚寻访",
			recordCount: 3,
		});
		expect(merged[2]).toMatchObject({
			id: "MH_02",
			cached: false,
			recordCount: 0,
		});
	});

	it("clears one category without touching another", () => {
		saveCategoryRecords("uid-1", "normal", [sample()]);
		saveCategoryRecords("uid-1", "classic", [
			sample({ charId: "classic-only", gachaTs: "9", gachaAt: new Date(9) }),
		]);
		clearCategoryRecords("uid-1", "normal");
		expect(loadCategoryRecords("uid-1", "normal")).toEqual([]);
		expect(loadCategoryRecords("uid-1", "classic")).toHaveLength(1);
	});

	it("clears all categories for a uid", () => {
		saveCategoryRecords("uid-1", "normal", [sample()]);
		saveCategoryRecords("uid-1", "classic", [sample({ charId: "c" })]);
		saveCategoryRecords("uid-2", "normal", [sample({ charId: "other" })]);
		clearUidRecords("uid-1");
		expect(loadCategoryRecords("uid-1", "normal")).toEqual([]);
		expect(loadCategoryRecords("uid-1", "classic")).toEqual([]);
		expect(loadCategoryRecords("uid-2", "normal")).toHaveLength(1);
	});

	it("sorts newest first and serializes without gachaAt", () => {
		const sorted = sortRecordsNewestFirst([
			sample({ gachaTs: "1", pos: 1 }),
			sample({ gachaTs: "3", pos: 0 }),
			sample({ gachaTs: "3", pos: 2 }),
		]);
		expect(sorted.map((r) => `${r.gachaTs}:${r.pos}`)).toEqual([
			"3:2",
			"3:0",
			"1:1",
		]);
		expect(serializeRecord(sorted[0]!)).not.toHaveProperty("gachaAt");
	});
});
