import { afterEach, describe, expect, it } from "vitest";
import {
	isPreviewSnapshot,
	loadSnapshot,
	saveSnapshot,
	sanitizeTextureDataUrl,
	SNAPSHOT_STORAGE_KEY,
	SNAPSHOT_VERSION,
	WHITE_PIXEL_DATA_URL,
} from "../snapshot";

const LEGACY_WHITE
	= "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W6YQAAAAASUVORK5CYII=";

function installMemoryLocalStorage() {
	const store = new Map<string, string>();
	const localStorage = {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		clear: () => store.clear(),
	};
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: { localStorage },
	});
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: localStorage,
	});
	return store;
}

afterEach(() => {
	Reflect.deleteProperty(globalThis, "window");
	Reflect.deleteProperty(globalThis, "localStorage");
});

describe("sanitizeTextureDataUrl", () => {
	it("replaces the legacy grayscale+alpha placeholder", () => {
		expect(sanitizeTextureDataUrl(LEGACY_WHITE)).toBe(WHITE_PIXEL_DATA_URL);
	});

	it("leaves other data URLs untouched", () => {
		expect(sanitizeTextureDataUrl(WHITE_PIXEL_DATA_URL)).toBe(WHITE_PIXEL_DATA_URL);
		expect(sanitizeTextureDataUrl("data:image/png;base64,abc")).toBe(
			"data:image/png;base64,abc",
		);
	});
});

describe("isPreviewSnapshot", () => {
	it("accepts a valid v1 payload", () => {
		expect(
			isPreviewSnapshot({
				version: SNAPSHOT_VERSION,
				savedAt: "2026-01-01T00:00:00.000Z",
				csharpSource: "a",
				vertexSource: "b",
				fragmentSource: "c",
				csParams: [],
				vsParams: [],
				psParams: [],
				textures: [],
			}),
		).toBe(true);
	});

	it("rejects incomplete payloads", () => {
		expect(isPreviewSnapshot(null)).toBe(false);
		expect(isPreviewSnapshot({})).toBe(false);
		expect(
			isPreviewSnapshot({
				version: 2,
				csharpSource: "",
				vertexSource: "",
				fragmentSource: "",
				csParams: [],
				vsParams: [],
				psParams: [],
				textures: [],
			}),
		).toBe(false);
	});
});

describe("saveSnapshot / loadSnapshot", () => {
	it("round-trips through localStorage and sanitizes textures", () => {
		installMemoryLocalStorage();
		const result = saveSnapshot({
			csharpSource: "cs",
			vertexSource: "vs",
			fragmentSource: "ps",
			csParams: [{ id: "wink", label: "wink", value: 1, min: 0, max: 1, step: 0.01 }],
			vsParams: [],
			psParams: [],
			textures: [
				{
					id: "t1",
					name: "Ring",
					fileName: "ring.png",
					dataUrl: LEGACY_WHITE,
				},
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const raw = JSON.parse(localStorage.getItem(SNAPSHOT_STORAGE_KEY)!) as {
			textures: Array<{ dataUrl: string }>;
		};
		expect(raw.textures[0]!.dataUrl).toBe(LEGACY_WHITE);

		const loaded = loadSnapshot();
		expect(loaded).not.toBeNull();
		expect(loaded!.csharpSource).toBe("cs");
		expect(loaded!.textures[0]!.dataUrl).toBe(WHITE_PIXEL_DATA_URL);
		expect(loaded!.savedAt).toBe(result.savedAt);
	});

	it("returns null without window / for corrupt data", () => {
		expect(loadSnapshot()).toBeNull();
		installMemoryLocalStorage();
		localStorage.setItem(SNAPSHOT_STORAGE_KEY, "{not-json");
		expect(loadSnapshot()).toBeNull();
		localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify({ version: 1 }));
		expect(loadSnapshot()).toBeNull();
	});
});
