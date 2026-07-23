/**
 * Centralized public env accessors.
 *
 * Cloudflare Workers Builds cannot store an empty string; callers should prefer
 * these helpers over reading `process.env` directly so unset / blank / "/" for
 * NEXT_PUBLIC_BASE_PATH all mean site root.
 */

/** @internal Exported for unit tests. */
export function normalizeBasePath(value: string | undefined): string {
	if (value == null) return "";

	const trimmed = value.trim();
	if (!trimmed || trimmed === "/") return "";

	const withoutTrailing = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
	return withoutTrailing.startsWith("/") ? withoutTrailing : `/${withoutTrailing}`;
}

export function getBaseUrl(): string {
	return (process.env.NEXT_PUBLIC_BASE_URL ?? "").trim().replace(/\/+$/, "");
}

export function getBasePath(): string {
	return normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
}

/** Absolute site origin including basePath, e.g. https://example.com/blog */
export function getSiteUrl(): string {
	return `${getBaseUrl()}${getBasePath()}`;
}
