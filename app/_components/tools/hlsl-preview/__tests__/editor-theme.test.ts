import { describe, expect, it } from "vitest";
import {
	GEOM_THEME_DARK,
	GEOM_THEME_LIGHT,
} from "../register-csharp";
import {
	isGeomEditorThemeReady,
	resolveGeomEditorTheme,
} from "../editor-theme";

describe("resolveGeomEditorTheme", () => {
	it("uses the dark geom theme when the resolved site theme is dark", () => {
		expect(resolveGeomEditorTheme("dark")).toBe(GEOM_THEME_DARK);
	});

	it("uses the light geom theme for light and unknown values", () => {
		expect(resolveGeomEditorTheme("light")).toBe(GEOM_THEME_LIGHT);
		expect(resolveGeomEditorTheme(undefined)).toBe(GEOM_THEME_LIGHT);
	});
});

describe("isGeomEditorThemeReady", () => {
	it("waits until the client is mounted and next-themes has resolved", () => {
		expect(isGeomEditorThemeReady(false, undefined)).toBe(false);
		expect(isGeomEditorThemeReady(false, "dark")).toBe(false);
		expect(isGeomEditorThemeReady(true, undefined)).toBe(false);
		expect(isGeomEditorThemeReady(true, "dark")).toBe(true);
		expect(isGeomEditorThemeReady(true, "light")).toBe(true);
	});
});
