import { getBasePath } from "@/utils/env";

function pathSegments(pathname: string): string[] {
	return pathname.split("/").filter(Boolean);
}

/** True for individual post routes (`/posts/:slug`), not the index. */
export function isPostArticlePath(pathname: string): boolean {
	const parts = pathSegments(pathname);
	return parts[0] === "posts" && parts.length >= 2;
}

/** True for the Friends page (`/friends`), with or without a trailing slash. */
export function isFriendsPath(pathname: string): boolean {
	const parts = pathSegments(pathname);
	return parts.length === 1 && parts[0] === "friends";
}

/** Pages that mount the Waline comment widget. */
export function isCommentsEnabledPath(pathname: string): boolean {
	return isPostArticlePath(pathname) || isFriendsPath(pathname);
}

/** Public path Waline uses to group comments (includes basePath when set). */
export function getWalinePath(pathname: string): string {
	const joined = `${getBasePath()}${pathname}`;
	return joined || "/";
}
