/**
 * Normalize NEXT_PUBLIC_BASE_PATH for hosts that cannot set an empty env value
 * (e.g. Cloudflare Workers Builds UI). Unset, blank, and "/" all mean site root.
 */
export function normalizeBasePath(value: string | undefined): string {
	if (value == null) return "";

	const trimmed = value.trim();
	if (!trimmed || trimmed === "/") return "";

	const withoutTrailing = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
	return withoutTrailing.startsWith("/") ? withoutTrailing : `/${withoutTrailing}`;
}
