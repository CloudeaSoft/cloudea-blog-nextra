export const getImageUrl = (path: string): string => {
	if (!path) return "";

	if (
		path.startsWith("http://")
		|| path.startsWith("https://")
		|| path.startsWith("//")
	) {
		return path;
	}

	if (path.startsWith("/images")) {
		return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
	}

	if (path.startsWith("images/")) {
		return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/${path}`;
	}

	if (path.startsWith("/")) {
		return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images${path}`;
	}

	return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/${path}`;
};
