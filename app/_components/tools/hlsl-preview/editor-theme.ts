import {
	GEOM_THEME_DARK,
	GEOM_THEME_LIGHT,
} from "./register-csharp";

/** Map next-themes' resolved value onto Monaco geom theme ids. */
export function resolveGeomEditorTheme(
	resolvedTheme: string | undefined,
): typeof GEOM_THEME_DARK | typeof GEOM_THEME_LIGHT {
	return resolvedTheme === "dark" ? GEOM_THEME_DARK : GEOM_THEME_LIGHT;
}

/**
 * Monaco must not mount until next-themes has resolved.
 * Mounting earlier locks the first onMount closure to the light fallback and
 * can overwrite the correct dark theme after create.
 */
export function isGeomEditorThemeReady(
	mounted: boolean,
	resolvedTheme: string | undefined,
): boolean {
	return mounted && resolvedTheme != null;
}
