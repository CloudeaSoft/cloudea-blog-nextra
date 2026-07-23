import { M_PLUS_Rounded_1c, Ma_Shan_Zheng } from "next/font/google";

/** Soft rounded brand face — same family as navbar / loading. */
export const bannerGreetingFont = M_PLUS_Rounded_1c({
	subsets: ["latin"],
	weight: ["700"],
});

/**
 * Brush-script literary face for hitokoto — heavy, expansive calligraphy
 * (对联 / 短句气质), with system CJK serifs for any missing glyphs.
 */
export const bannerHitokotoFont = Ma_Shan_Zheng({
	subsets: ["latin"],
	weight: ["400"],
	display: "swap",
	preload: false,
	adjustFontFallback: false,
	fallback: [
		"ZCOOL XiaoWei",
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
