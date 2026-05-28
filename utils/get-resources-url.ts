export const getImageUrl = (path: string): string => {
	// 空值处理
	if (!path) return "";

	// 外部 URL：不处理
	if (
		path.startsWith("http://")
		|| path.startsWith("https://")
		|| path.startsWith("//")
	) {
		return path;
	}

	// 已经有 /images 前缀：直接返回（但要处理 basePath）
	if (path.startsWith("/images")) {
		return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
	}

	// 已经有 images 前缀（无斜杠）
	if (path.startsWith("images/")) {
		return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/${path}`;
	}

	// 以 / 开头
	if (path.startsWith("/")) {
		return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images${path}`;
	}

	// 相对路径
	return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/${path}`;
};
