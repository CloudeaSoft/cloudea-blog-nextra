import { getBasePath } from "@/utils/env";

/** True for individual post routes (`/posts/:slug`), not the index. */
export function isPostArticlePath(pathname: string): boolean {
	const parts = pathname.split("/").filter(Boolean);
	return parts[0] === "posts" && parts.length >= 2;
}

/** Public path Waline uses to group comments (includes basePath when set). */
export function getWalinePath(pathname: string): string {
	const joined = `${getBasePath()}${pathname}`;
	return joined || "/";
}
