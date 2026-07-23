/**
 * Centralized env accessors.
 *
 * Prefer these helpers over reading `process.env` directly so Cloudflare empty-env
 * quirks and dual static/server builds stay in one place.
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

/**
 * Next.js `output` mode from `NEXT_OUTPUT`.
 *
 * - unset / `export` → static export (GitHub Pages, default)
 * - `server` / `default` / `none` / `0` / `false` → no `output` (SSR / Workers)
 *
 * Cloudflare Build Variables cannot store an empty string; set `NEXT_OUTPUT=server`
 * for a dynamic Worker build instead of clearing the var.
 */
export function getNextOutput(): "export" | undefined {
	const raw = (process.env.NEXT_OUTPUT ?? "export").trim().toLowerCase();

	if (!raw || raw === "export") return "export";

	if (
		raw === "server"
		|| raw === "default"
		|| raw === "none"
		|| raw === "0"
		|| raw === "false"
	) {
		return undefined;
	}

	return "export";
}

export function isStaticExport(): boolean {
	return getNextOutput() === "export";
}
