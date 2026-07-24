import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ARKNIGHTS_SERVICE_BASE_URL,
	buildCategoriesUrl,
	buildHistoryUrl,
	fetchAllHistoryForCategory,
	fetchCategories,
	fetchHistoryPage,
} from "../client";
import type { GachaAuth } from "../types";

const auth: GachaAuth = {
	uid: "123456789",
	cookie: "session=abc",
	accountToken: "account-token",
	roleToken: "role-token",
};

afterEach(() => {
	vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("URL builders", () => {
	it("builds category and history URLs", () => {
		expect(buildCategoriesUrl("uid-1")).toBe(
			`${ARKNIGHTS_SERVICE_BASE_URL}/user/api/inquiry/gacha/cate?uid=uid-1`,
		);
		expect(
			buildHistoryUrl({
				uid: "uid-1",
				category: "normal",
				size: 50,
				gachaTs: "100",
				pos: 3,
			}),
		).toBe(
			`${ARKNIGHTS_SERVICE_BASE_URL}/user/api/inquiry/gacha/history?uid=uid-1&category=normal&size=50&gachaTs=100&pos=3`,
		);
	});
});

describe("fetchCategories", () => {
	it("sends auth headers and parses categories", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				code: 0,
				msg: "",
				data: [{ id: "normal", name: "标准寻访" }],
			}),
		);

		const categories = await fetchCategories(auth, { fetch: fetchMock });
		expect(categories).toEqual([
			{ id: "normal", name: "标准寻访", label: "标准寻访" },
		]);

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(String(url)).toContain("/user/api/inquiry/gacha/cate?uid=123456789");
		const headers = new Headers(init?.headers);
		expect(headers.get("Cookie")).toBeNull();
		expect(headers.get("x-cookie")).toBe("session=abc");
		expect(headers.get("x-account-token")).toBe("account-token");
		expect(headers.get("x-role-token")).toBe("role-token");
	});
});

describe("fetchHistoryPage / fetchAllHistoryForCategory", () => {
	it("paginates with gachaTs and pos until hasMore is false", async () => {
		const page1 = {
			code: 0,
			msg: "",
			data: {
				hasMore: true,
				list: [
					{
						poolId: "p",
						poolName: "池",
						charId: "char_a",
						charName: "A",
						rarity: 5,
						isNew: true,
						gachaTs: "200",
						pos: 1,
					},
					{
						poolId: "p",
						poolName: "池",
						charId: "char_b",
						charName: "B",
						rarity: 3,
						isNew: false,
						gachaTs: "100",
						pos: 0,
					},
				],
			},
		};
		const page2 = {
			code: 0,
			msg: "",
			data: {
				hasMore: false,
				list: [
					{
						poolId: "p",
						poolName: "池",
						charId: "char_c",
						charName: "C",
						rarity: 2,
						isNew: false,
						gachaTs: "50",
						pos: 0,
					},
				],
			},
		};

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(page1))
			.mockResolvedValueOnce(jsonResponse(page2));

		const progress: Array<{ pages: number; records: number; hasMore: boolean }> = [];
		const records = await fetchAllHistoryForCategory(auth, "normal", {
			fetch: fetchMock,
			pageDelayMs: 0,
			onProgress: (p) => progress.push(p),
		});

		expect(records.map((r) => r.charId)).toEqual(["char_a", "char_b", "char_c"]);
		expect(progress).toEqual([
			{ pages: 1, records: 2, hasMore: true },
			{ pages: 2, records: 3, hasMore: false },
		]);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(String(fetchMock.mock.calls[0]![0])).not.toContain("gachaTs=");
		expect(String(fetchMock.mock.calls[1]![0])).toContain("gachaTs=100");
		expect(String(fetchMock.mock.calls[1]![0])).toContain("pos=0");
	});

	it("parses a single page via fetchHistoryPage", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({
				code: 0,
				msg: "",
				data: {
					hasMore: false,
					list: [
						{
							poolId: "p",
							poolName: "池",
							charId: "char_a",
							charName: "A",
							rarity: 5,
							isNew: false,
							gachaTs: "1",
							pos: 0,
						},
					],
				},
			}),
		);

		const page = await fetchHistoryPage(auth, "classic", undefined, {
			fetch: fetchMock,
		});
		expect(page.hasMore).toBe(false);
		expect(page.list).toHaveLength(1);
	});

	it("stops paging early when a page is fully covered by knownKeys", async () => {
		const page1 = {
			code: 0,
			msg: "",
			data: {
				hasMore: true,
				list: [
					{
						poolId: "p",
						poolName: "池",
						charId: "char_new",
						charName: "New",
						rarity: 5,
						isNew: true,
						gachaTs: "300",
						pos: 0,
					},
				],
			},
		};
		const page2 = {
			code: 0,
			msg: "",
			data: {
				hasMore: true,
				list: [
					{
						poolId: "p",
						poolName: "池",
						charId: "char_old",
						charName: "Old",
						rarity: 3,
						isNew: false,
						gachaTs: "100",
						pos: 0,
					},
				],
			},
		};
		const page3 = {
			code: 0,
			msg: "",
			data: {
				hasMore: true,
				list: [
					{
						poolId: "p",
						poolName: "池",
						charId: "char_older",
						charName: "Older",
						rarity: 2,
						isNew: false,
						gachaTs: "50",
						pos: 0,
					},
				],
			},
		};

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(page1))
			.mockResolvedValueOnce(jsonResponse(page2))
			.mockResolvedValueOnce(jsonResponse(page3));

		const records = await fetchAllHistoryForCategory(auth, "normal", {
			fetch: fetchMock,
			pageDelayMs: 0,
			knownKeys: new Set(["100:0:char_old"]),
		});

		expect(records.map((r) => r.charId)).toEqual(["char_new", "char_old"]);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
