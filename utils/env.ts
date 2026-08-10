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
 * In-app home href for Link components.
 * Prefer a relative path so builds succeed when NEXT_PUBLIC_BASE_URL is unset
 * (Cloudflare clone has no .env; Build Variables are easy to miss).
 */
export function getHomeHref(): string {
	return getBasePath() || "/";
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

/** Production Arknights proxy Worker (workers.dev). */
export const DEFAULT_BLOG_BACKEND_URL =
	"https://blog-backend.cloudeasoft.workers.dev";

/**
 * Origin of the blog Cloudflare Worker proxy.
 *
 * - unset → production Worker
 * - local: `http://127.0.0.1:8787` (`pnpm worker:dev`)
 * - debug deploy: `https://blog-backend-dev.<account>.workers.dev`
 */
export function getBlogBackendUrl(): string {
	const raw = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();
	if (!raw) return DEFAULT_BLOG_BACKEND_URL;
	return raw.replace(/\/+$/, "");
}

export function getArknightsServiceBaseUrl(): string {
	return `${getBlogBackendUrl()}/arknights-service`;
}

export function getArknightsAsServiceBaseUrl(): string {
	return `${getBlogBackendUrl()}/arknights-as-service`;
}

export function getArknightsBindingServiceBaseUrl(): string {
	return `${getBlogBackendUrl()}/arknights-binding-service`;
}

/** Production Waline comment server. */
export const DEFAULT_COMMENT_URL = "https://blog-comment.cloudea.work";

/**
 * Origin of the Waline comment backend.
 *
 * - unset → production: https://blog-comment.cloudea.work
 * - override with NEXT_PUBLIC_COMMENT_URL when pointing at a local/debug instance
 */
export function getCommentUrl(): string {
	const raw = (process.env.NEXT_PUBLIC_COMMENT_URL ?? "").trim();
	if (!raw) return DEFAULT_COMMENT_URL;
	return raw.replace(/\/+$/, "");
}
