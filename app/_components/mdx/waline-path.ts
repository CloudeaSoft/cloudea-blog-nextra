import { getBasePath } from "@/utils/env";

function pathSegments(pathname: string): string[] {
	return pathname.split("/").filter(Boolean);
}

/** True for individual post routes (`/posts/:slug`), not the index. */
export function isPostArticlePath(pathname: string): boolean {
	const parts = pathSegments(pathname);
	return parts[0] === "posts" && parts.length >= 2;
}

/** True for the About page (`/about`), with or without a trailing slash. */
export function isAboutPath(pathname: string): boolean {
	const parts = pathSegments(pathname);
	return parts.length === 1 && parts[0] === "about";
}

/** Pages that mount the Waline comment widget. */
export function isCommentsEnabledPath(pathname: string): boolean {
	return isPostArticlePath(pathname) || isAboutPath(pathname);
}

/** Public path Waline uses to group comments (includes basePath when set). */
export function getWalinePath(pathname: string): string {
	const joined = `${getBasePath()}${pathname}`;
	return joined || "/";
}
