import type { DemoParam } from "./param-slider-panel";
import type { TextureItem } from "./texture-panel";

export const SNAPSHOT_STORAGE_KEY = "cloudea-tools-hlsl-preview-snapshot-v1";
export const SNAPSHOT_VERSION = 1 as const;

export type SnapshotTexture = TextureItem & {
	dataUrl: string;
};

export type PreviewSnapshot = {
	version: typeof SNAPSHOT_VERSION;
	savedAt: string;
	csharpSource: string;
	vertexSource: string;
	fragmentSource: string;
	csParams: DemoParam[];
	vsParams: DemoParam[];
	psParams: DemoParam[];
	textures: SnapshotTexture[];
};

export function isPreviewSnapshot(value: unknown): value is PreviewSnapshot {
	if (!value || typeof value !== "object") return false;
	const v = value as Record<string, unknown>;
	return (
		v.version === SNAPSHOT_VERSION
		&& typeof v.csharpSource === "string"
		&& typeof v.vertexSource === "string"
		&& typeof v.fragmentSource === "string"
		&& Array.isArray(v.csParams)
		&& Array.isArray(v.vsParams)
		&& Array.isArray(v.psParams)
		&& Array.isArray(v.textures)
	);
}

export function loadSnapshot(): PreviewSnapshot | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (!isPreviewSnapshot(parsed)) return null;
		return {
			...parsed,
			textures: parsed.textures.map((texture) => ({
				...texture,
				dataUrl: sanitizeTextureDataUrl(texture.dataUrl),
			})),
		};
	} catch {
		return null;
	}
}

export function saveSnapshot(snapshot: Omit<PreviewSnapshot, "version" | "savedAt">): {
	ok: true;
	savedAt: string;
} | { ok: false; error: string } {
	if (typeof window === "undefined") {
		return { ok: false, error: "localStorage unavailable" };
	}
	const payload: PreviewSnapshot = {
		version: SNAPSHOT_VERSION,
		savedAt: new Date().toISOString(),
		...snapshot,
	};
	try {
		window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));
		return { ok: true, savedAt: payload.savedAt };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Failed to write localStorage",
		};
	}
}

export function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") resolve(reader.result);
			else reject(new Error("Unexpected FileReader result"));
		};
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
}

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Failed to decode texture data URL"));
		image.src = dataUrl;
	});
}

/** 1×1 opaque white PNG (RGBA color type 6 — WebGL-safe). */
export const WHITE_PIXEL_DATA_URL
	= "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP4DwQACfsD/Wj6HMwAAAAASUVORK5CYII=";

/** Legacy grayscale+alpha placeholder that WebGL rejects (`texImage2D: bad image data`). */
const LEGACY_WHITE_PIXEL_DATA_URL
	= "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W6YQAAAAASUVORK5CYII=";

export function sanitizeTextureDataUrl(dataUrl: string): string {
	return dataUrl === LEGACY_WHITE_PIXEL_DATA_URL ? WHITE_PIXEL_DATA_URL : dataUrl;
}
