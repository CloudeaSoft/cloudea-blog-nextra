import { getArknightsServiceBaseUrl } from "@/utils/env";
import {
	mergeHistoryRecords,
	parseCategoriesPayload,
	parseHistoryPayload,
	recordKey,
} from "./parse";
import {
	GachaApiError,
	type GachaAuth,
	type GachaCategory,
	type GachaHistoryPage,
	type GachaRecord,
} from "./types";

export const ARKNIGHTS_SERVICE_BASE_URL = getArknightsServiceBaseUrl();

export const DEFAULT_HISTORY_PAGE_SIZE = 50;
export const DEFAULT_PAGE_DELAY_MS = 300;

export type FetchLike = typeof fetch;

export type GachaClientOptions = {
	baseUrl?: string;
	fetch?: FetchLike;
	pageSize?: number;
	pageDelayMs?: number;
	signal?: AbortSignal;
};

function authHeaders(auth: GachaAuth): HeadersInit {
	// Browsers forbid setting `Cookie` from JS; the CF Worker maps `x-cookie` → Cookie.
	return {
		"Accept": "application/json",
		"x-cookie": auth.cookie,
		"x-account-token": auth.accountToken,
		"x-role-token": auth.roleToken,
	};
}

function assertAuth(auth: GachaAuth): void {
	if (!auth.uid.trim()) throw new GachaApiError("uid is required");
	if (!auth.cookie.trim()) throw new GachaApiError("Cookie is required");
	if (!auth.accountToken.trim()) throw new GachaApiError("x-account-token is required");
	if (!auth.roleToken.trim()) throw new GachaApiError("x-role-token is required");
}

async function readJson(response: Response): Promise<unknown> {
	const text = await response.text();
	try {
		return JSON.parse(text) as unknown;
	} catch (cause) {
		throw new GachaApiError("Invalid JSON response", {
			status: response.status,
			cause,
		});
	}
}

async function requestJson(
	url: string,
	auth: GachaAuth,
	options: GachaClientOptions,
): Promise<unknown> {
	const fetchImpl = options.fetch ?? fetch;
	let response: Response;
	try {
		response = await fetchImpl(url, {
			method: "GET",
			headers: authHeaders(auth),
			signal: options.signal,
		});
	} catch (cause) {
		if (cause instanceof Error && cause.name === "AbortError") throw cause;
		throw new GachaApiError("Network request failed", { cause });
	}

	const payload = await readJson(response);
	if (!response.ok) {
		const msg =
			typeof payload === "object" &&
			payload !== null &&
			"msg" in payload &&
			typeof (payload as { msg: unknown }).msg === "string"
				? (payload as { msg: string }).msg
				: `HTTP ${response.status}`;
		throw new GachaApiError(msg, { status: response.status });
	}
	return payload;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	if (ms <= 0) return Promise.resolve();
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
			return;
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

export function buildCategoriesUrl(uid: string, baseUrl = ARKNIGHTS_SERVICE_BASE_URL): string {
	const url = new URL(`${baseUrl}/user/api/inquiry/gacha/cate`);
	url.searchParams.set("uid", uid);
	return url.toString();
}

export function buildHistoryUrl(
	params: {
		uid: string;
		category: string;
		size?: number;
		gachaTs?: string;
		pos?: number;
	},
	baseUrl = ARKNIGHTS_SERVICE_BASE_URL,
): string {
	const url = new URL(`${baseUrl}/user/api/inquiry/gacha/history`);
	url.searchParams.set("uid", params.uid);
	url.searchParams.set("category", params.category);
	url.searchParams.set("size", String(params.size ?? DEFAULT_HISTORY_PAGE_SIZE));
	if (params.gachaTs !== undefined) {
		url.searchParams.set("gachaTs", params.gachaTs);
	}
	if (params.pos !== undefined) {
		url.searchParams.set("pos", String(params.pos));
	}
	return url.toString();
}

export async function fetchCategories(
	auth: GachaAuth,
	options: GachaClientOptions = {},
): Promise<GachaCategory[]> {
	assertAuth(auth);
	const url = buildCategoriesUrl(auth.uid, options.baseUrl);
	const payload = await requestJson(url, auth, options);
	return parseCategoriesPayload(payload);
}

export type HistoryPageCursor = {
	gachaTs: string;
	pos: number;
};

export async function fetchHistoryPage(
	auth: GachaAuth,
	category: string,
	cursor?: HistoryPageCursor,
	options: GachaClientOptions = {},
): Promise<GachaHistoryPage> {
	assertAuth(auth);
	if (!category.trim()) throw new GachaApiError("category is required");

	const url = buildHistoryUrl(
		{
			uid: auth.uid,
			category,
			size: options.pageSize ?? DEFAULT_HISTORY_PAGE_SIZE,
			gachaTs: cursor?.gachaTs,
			pos: cursor?.pos,
		},
		options.baseUrl,
	);
	const payload = await requestJson(url, auth, options);
	return parseHistoryPayload(payload);
}

export type FetchAllHistoryProgress = {
	pages: number;
	records: number;
	hasMore: boolean;
};

export async function fetchAllHistoryForCategory(
	auth: GachaAuth,
	category: string,
	options: GachaClientOptions & {
		onProgress?: (progress: FetchAllHistoryProgress) => void;
		/** When a page's records are all already known, stop paging (incremental sync). */
		knownKeys?: ReadonlySet<string>;
	} = {},
): Promise<GachaRecord[]> {
	assertAuth(auth);
	if (!category.trim()) throw new GachaApiError("category is required");

	const delayMs = options.pageDelayMs ?? DEFAULT_PAGE_DELAY_MS;
	let records: GachaRecord[] = [];
	let cursor: HistoryPageCursor | undefined;
	let pages = 0;
	let hasMore = true;

	while (hasMore) {
		if (pages > 0) {
			await sleep(delayMs, options.signal);
		}

		const page = await fetchHistoryPage(auth, category, cursor, options);
		pages += 1;
		records = mergeHistoryRecords(records, page.list);

		const caughtUpToCache = Boolean(
			options.knownKeys
			&& page.list.length > 0
			&& page.list.every((item) => options.knownKeys!.has(recordKey(item))),
		);
		hasMore = page.hasMore && !caughtUpToCache;
		options.onProgress?.({
			pages,
			records: records.length,
			hasMore,
		});

		if (!hasMore) break;
		if (page.list.length === 0) {
			throw new GachaApiError("History page reported hasMore but returned an empty list");
		}
		const last = page.list[page.list.length - 1]!;
		cursor = { gachaTs: last.gachaTs, pos: last.pos };
	}

	return records;
}
