import { M_PLUS_Rounded_1c, ZCOOL_XiaoWei } from "next/font/google";

/** Soft rounded brand face — same family as navbar / loading. */
export const bannerGreetingFont = M_PLUS_Rounded_1c({
	subsets: ["latin"],
	weight: ["700"],
});

/**
 * Soft literary display face for hitokoto — distinctive CJK forms with
 * even stroke weight that holds up at banner quote sizes (unlike brush
 * calligraphy with extreme thick/thin contrast).
 */
export const bannerHitokotoFont = ZCOOL_XiaoWei({
	subsets: ["latin"],
	weight: ["400"],
	display: "swap",
	preload: false,
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
