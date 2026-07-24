import {
	ARKNIGHTS_SERVICE_BASE_URL,
	type FetchLike,
} from "./client";
import { GachaApiError, type GachaAuth } from "./types";

export const AS_SERVICE_BASE_URL =
	"https://blog-backend.cloudeasoft.workers.dev/arknights-as-service";

export const BINDING_SERVICE_BASE_URL =
	"https://blog-backend.cloudeasoft.workers.dev/arknights-binding-service";

/** Official web app code used by ak.hypergryph.com oauth grant. */
export const HG_WEB_APP_CODE = "be36d44aa36bfb5b";

export type BoundRole = {
	uid: string;
	nickName: string;
	channelName: string;
};

export type ExchangeResult = {
	auth: GachaAuth;
	role: BoundRole;
	roles: BoundRole[];
};

export type ExchangeOptions = {
	fetch?: FetchLike;
	asBaseUrl?: string;
	bindingBaseUrl?: string;
	akBaseUrl?: string;
	signal?: AbortSignal;
	/** When multiple Arknights bindings exist, prefer this uid. */
	preferUid?: string;
};

function browserishHeaders(extra: Record<string, string> = {}): HeadersInit {
	return {
		"Accept": "application/json, text/plain, */*",
		"Origin": "https://ak.hypergryph.com",
		"Referer": "https://ak.hypergryph.com/",
		"User-Agent":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
		...extra,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
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

function envelopeData(payload: unknown, step: string): Record<string, unknown> {
	if (!isRecord(payload)) {
		throw new GachaApiError(`${step}: invalid response`);
	}
	if (typeof payload.code === "number" && payload.code !== 0) {
		const msg = typeof payload.msg === "string" && payload.msg
			? payload.msg
			: `${step} failed (code ${payload.code})`;
		throw new GachaApiError(msg, { code: payload.code });
	}
	if (!isRecord(payload.data)) {
		throw new GachaApiError(`${step}: missing data`);
	}
	return payload.data;
}

async function postJson(
	url: string,
	body: unknown,
	options: ExchangeOptions,
	headers?: Record<string, string>,
): Promise<{ payload: unknown; response: Response }> {
	const fetchImpl = options.fetch ?? fetch;
	let response: Response;
	try {
		response = await fetchImpl(url, {
			method: "POST",
			headers: browserishHeaders({
				"Content-Type": "application/json;charset=UTF-8",
				...headers,
			}),
			body: JSON.stringify(body),
			signal: options.signal,
		});
	} catch (cause) {
		if (cause instanceof Error && cause.name === "AbortError") throw cause;
		throw new GachaApiError("Network request failed", { cause });
	}
	const payload = await readJson(response);
	if (!response.ok) {
		throw new GachaApiError(`HTTP ${response.status}`, { status: response.status });
	}
	return { payload, response };
}

async function getJson(
	url: string,
	options: ExchangeOptions,
	headers?: Record<string, string>,
): Promise<unknown> {
	const fetchImpl = options.fetch ?? fetch;
	let response: Response;
	try {
		response = await fetchImpl(url, {
			method: "GET",
			headers: browserishHeaders(headers),
			signal: options.signal,
		});
	} catch (cause) {
		if (cause instanceof Error && cause.name === "AbortError") throw cause;
		throw new GachaApiError("Network request failed", { cause });
	}
	const payload = await readJson(response);
	if (!response.ok) {
		throw new GachaApiError(`HTTP ${response.status}`, { status: response.status });
	}
	return payload;
}

export function parseBindingRoles(payload: unknown): BoundRole[] {
	const data = envelopeData(payload, "binding_list");
	const list = data.list;
	if (!Array.isArray(list)) {
		throw new GachaApiError("binding_list: missing list");
	}

	const roles: BoundRole[] = [];
	for (const game of list) {
		if (!isRecord(game) || game.appCode !== "arknights") continue;
		const bindingList = game.bindingList;
		if (!Array.isArray(bindingList)) continue;
		for (const account of bindingList) {
			if (!isRecord(account)) continue;
			if (typeof account.uid !== "string" || !account.uid) continue;
			roles.push({
				uid: account.uid,
				nickName: typeof account.nickName === "string" ? account.nickName : account.uid,
				channelName:
					typeof account.channelName === "string" ? account.channelName : "",
			});
		}
	}
	return roles;
}

function pickRole(roles: BoundRole[], preferUid?: string): BoundRole {
	if (roles.length === 0) {
		throw new GachaApiError("没有绑定的明日方舟角色");
	}
	if (preferUid) {
		const hit = roles.find((role) => role.uid === preferUid);
		if (hit) return hit;
	}
	return roles[0]!;
}

/**
 * Exchange a Hypergryph account token for gacha-query credentials,
 * mirroring the official web login chain used by community tools.
 */
export async function exchangeHgToken(
	hgToken: string,
	options: ExchangeOptions = {},
): Promise<ExchangeResult> {
	const token = hgToken.trim();
	if (!token) throw new GachaApiError("token is required");

	const asBase = options.asBaseUrl ?? AS_SERVICE_BASE_URL;
	const bindingBase = options.bindingBaseUrl ?? BINDING_SERVICE_BASE_URL;
	const akBase = options.akBaseUrl ?? ARKNIGHTS_SERVICE_BASE_URL;

	const grant = await postJson(
		`${asBase}/user/oauth2/v2/grant`,
		{ token, appCode: HG_WEB_APP_CODE, type: 1 },
		options,
	);
	const grantData = envelopeData(grant.payload, "oauth grant");
	const grantToken = grantData.token;
	if (typeof grantToken !== "string" || !grantToken) {
		throw new GachaApiError("oauth grant: missing token");
	}

	const bindingPayload = await getJson(
		`${bindingBase}/account/binding/v1/binding_list?${new URLSearchParams({
			token: grantToken,
			appCode: "arknights",
		}).toString()}`,
		options,
	);
	const roles = parseBindingRoles(bindingPayload);
	const role = pickRole(roles, options.preferUid);

	const u8 = await postJson(
		`${bindingBase}/account/binding/v1/u8_token_by_uid`,
		{ token: grantToken, uid: role.uid },
		options,
	);
	const u8Data = envelopeData(u8.payload, "u8_token");
	const roleToken = u8Data.token;
	if (typeof roleToken !== "string" || !roleToken) {
		throw new GachaApiError("u8_token: missing token");
	}

	const login = await postJson(
		`${akBase}/user/api/role/login`,
		{
			token: roleToken,
			source_from: "",
			share_type: "",
			share_by: "",
		},
		options,
		{ Referer: "https://ak.hypergryph.com/user/headhunting" },
	);

	const akUserCenter = login.response.headers.get("x-ak-user-center");
	if (!akUserCenter) {
		throw new GachaApiError("role login: missing ak-user-center cookie");
	}

	return {
		auth: {
			uid: role.uid,
			cookie: `ak-user-center=${akUserCenter}`,
			accountToken: token,
			roleToken,
		},
		role,
		roles,
	};
}
