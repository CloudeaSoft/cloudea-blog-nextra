import type { GachaAuth } from "./types";

export const AUTH_STORAGE_KEY = "cloudea-tools-arknights-gacha-auth-v1";

const EMPTY_AUTH: GachaAuth = {
	uid: "",
	cookie: "",
	accountToken: "",
	roleToken: "",
};

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string";
}

export function normalizeAuth(value: Partial<GachaAuth> | null | undefined): GachaAuth {
	return {
		uid: value?.uid?.trim() ?? "",
		cookie: value?.cookie?.trim() ?? "",
		accountToken: value?.accountToken?.trim() ?? "",
		roleToken: value?.roleToken?.trim() ?? "",
	};
}

export function isAuthComplete(auth: GachaAuth): boolean {
	return Boolean(
		auth.uid && auth.cookie && auth.accountToken && auth.roleToken,
	);
}

export function loadAuth(): GachaAuth {
	if (typeof window === "undefined") return { ...EMPTY_AUTH };
	try {
		const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
		if (!raw) return { ...EMPTY_AUTH };
		const parsed = JSON.parse(raw) as Partial<GachaAuth>;
		return normalizeAuth({
			uid: isNonEmptyString(parsed.uid) ? parsed.uid : "",
			cookie: isNonEmptyString(parsed.cookie) ? parsed.cookie : "",
			accountToken: isNonEmptyString(parsed.accountToken)
				? parsed.accountToken
				: "",
			roleToken: isNonEmptyString(parsed.roleToken) ? parsed.roleToken : "",
		});
	} catch {
		return { ...EMPTY_AUTH };
	}
}

export function saveAuth(auth: GachaAuth): GachaAuth {
	const normalized = normalizeAuth(auth);
	if (typeof window !== "undefined") {
		window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
	}
	return normalized;
}

export function clearAuth(): void {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
