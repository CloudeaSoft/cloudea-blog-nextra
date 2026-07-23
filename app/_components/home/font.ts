import { M_PLUS_Rounded_1c, Noto_Serif_SC } from "next/font/google";

/** Soft rounded brand face — same family as navbar / loading. */
export const bannerGreetingFont = M_PLUS_Rounded_1c({
	subsets: ["latin"],
	weight: ["700"],
});

/**
 * Literary serif for hitokoto.
 * Noto Serif SC covers Simplified Chinese (and kana), unlike Shippori Mincho's
 * latin-only subset which left most CJK glyphs missing.
 */
export const bannerHitokotoFont = Noto_Serif_SC({
	subsets: ["latin"],
	weight: ["500"],
	display: "swap",
	// Full CJK face is large — don't block first paint with a preload.
	preload: false,
	// Keep system CJK serifs in the cascade instead of a latin metric fallback.
	adjustFontFallback: false,
	fallback: [
		"Source Han Serif SC",
		"Noto Serif CJK SC",
		"Songti SC",
		"STSong",
		"SimSun",
		"Hiragino Mincho ProN",
		"Yu Mincho",
		"serif",
	],
});
