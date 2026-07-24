import { describe, expect, it, vi, afterEach } from "vitest";
import {
	AS_SERVICE_BASE_URL,
	BINDING_SERVICE_BASE_URL,
	exchangeHgToken,
	parseBindingRoles,
} from "../auth-exchange";
import { ARKNIGHTS_SERVICE_BASE_URL } from "../client";

afterEach(() => {
	vi.restoreAllMocks();
});

function jsonResponse(
	body: unknown,
	init: { status?: number; headers?: Record<string, string> } = {},
): Response {
	return new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		headers: {
			"Content-Type": "application/json",
			...(init.headers ?? {}),
		},
	});
}

describe("parseBindingRoles", () => {
	it("extracts arknights bindings", () => {
		const roles = parseBindingRoles({
			code: 0,
			msg: "",
			data: {
				list: [
					{
						appCode: "other",
						bindingList: [{ uid: "x", nickName: "X", channelName: "官服" }],
					},
					{
						appCode: "arknights",
						bindingList: [
							{ uid: "100", nickName: "博士A", channelName: "官服" },
							{ uid: "200", nickName: "博士B", channelName: "B服" },
						],
					},
				],
			},
		});
		expect(roles).toEqual([
			{ uid: "100", nickName: "博士A", channelName: "官服" },
			{ uid: "200", nickName: "博士B", channelName: "B服" },
		]);
	});
});

describe("exchangeHgToken", () => {
	it("walks grant → binding → u8 → role login", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes("/user/oauth2/v2/grant")) {
				return jsonResponse({ code: 0, msg: "", data: { token: "grant-token" } });
			}
			if (url.includes("/binding_list")) {
				return jsonResponse({
					code: 0,
					msg: "",
					data: {
						list: [
							{
								appCode: "arknights",
								bindingList: [
									{ uid: "123", nickName: "Cloudea", channelName: "官服" },
								],
							},
						],
					},
				});
			}
			if (url.includes("/u8_token_by_uid")) {
				return jsonResponse({ code: 0, msg: "", data: { token: "u8-token" } });
			}
			if (url.includes("/user/api/role/login")) {
				return jsonResponse(
					{ code: 0, msg: "", data: {} },
					{ headers: { "x-ak-user-center": "cookie-value%2Fencoded" } },
				);
			}
			throw new Error(`unexpected url: ${url}`);
		});

		const result = await exchangeHgToken("hg-account-token", {
			fetch: fetchMock as unknown as typeof fetch,
		});

		expect(result.role).toEqual({
			uid: "123",
			nickName: "Cloudea",
			channelName: "官服",
		});
		expect(result.auth).toEqual({
			uid: "123",
			cookie: "ak-user-center=cookie-value%2Fencoded",
			accountToken: "hg-account-token",
			roleToken: "u8-token",
		});

		expect(String(fetchMock.mock.calls[0]![0])).toBe(
			`${AS_SERVICE_BASE_URL}/user/oauth2/v2/grant`,
		);
		expect(String(fetchMock.mock.calls[1]![0])).toContain(
			`${BINDING_SERVICE_BASE_URL}/account/binding/v1/binding_list`,
		);
		expect(String(fetchMock.mock.calls[2]![0])).toBe(
			`${BINDING_SERVICE_BASE_URL}/account/binding/v1/u8_token_by_uid`,
		);
		expect(String(fetchMock.mock.calls[3]![0])).toBe(
			`${ARKNIGHTS_SERVICE_BASE_URL}/user/api/role/login`,
		);
	});

	it("prefers a specific uid when provided", async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes("/grant")) {
				return jsonResponse({ code: 0, data: { token: "g" }, msg: "" });
			}
			if (url.includes("/binding_list")) {
				return jsonResponse({
					code: 0,
					msg: "",
					data: {
						list: [
							{
								appCode: "arknights",
								bindingList: [
									{ uid: "1", nickName: "A", channelName: "官服" },
									{ uid: "2", nickName: "B", channelName: "B服" },
								],
							},
						],
					},
				});
			}
			if (url.includes("/u8_token")) {
				return jsonResponse({ code: 0, data: { token: "u8" }, msg: "" });
			}
			return jsonResponse(
				{ code: 0, data: {}, msg: "" },
				{ headers: { "x-ak-user-center": "c" } },
			);
		});

		const result = await exchangeHgToken("tok", {
			fetch: fetchMock as unknown as typeof fetch,
			preferUid: "2",
		});
		expect(result.auth.uid).toBe("2");
		expect(result.role.nickName).toBe("B");
	});
});
