import { normalizeBasePath } from "./base-path";

export const getImageUrl = (path: string): string => {
	if (!path) return "";

	if (
		path.startsWith("http://")
		|| path.startsWith("https://")
		|| path.startsWith("//")
	) {
		return path;
	}

	const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

	if (path.startsWith("/images")) {
		return `${basePath}${path}`;
	}

	if (path.startsWith("images/")) {
		return `${basePath}/${path}`;
	}

	if (path.startsWith("/")) {
		return `${basePath}/images${path}`;
	}

	return `${basePath}/images/${path}`;
};
