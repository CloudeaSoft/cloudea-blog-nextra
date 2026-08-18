const IMPLICIT_LANGUAGES = new Set(["plaintext", "text", "txt"]);

function trimOrEmpty(value: string | undefined | null): string {
	return value?.trim() ?? "";
}

export function isExplicitCodeLanguage(
	language: string | undefined | null,
): boolean {
	const normalized = trimOrEmpty(language).toLowerCase();
	if (!normalized) {
		return false;
	}
	return !IMPLICIT_LANGUAGES.has(normalized);
}

export function resolveCodeBlockFilename(
	filename: string | undefined | null,
	language: string | undefined | null,
): string | undefined {
	const trimmedFilename = trimOrEmpty(filename);
	if (trimmedFilename) {
		return trimmedFilename;
	}
	const trimmedLanguage = trimOrEmpty(language);
	if (isExplicitCodeLanguage(trimmedLanguage)) {
		return trimmedLanguage;
	}
	return undefined;
}

export function normalizeCodeLanguage(
	language: string | undefined | null,
): string | undefined {
	const trimmed = trimOrEmpty(language);
	if (!trimmed) {
		return undefined;
	}
	return trimmed.toLowerCase();
}
