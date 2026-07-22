import { M_PLUS_Rounded_1c, Shippori_Mincho } from "next/font/google";

/** Soft rounded brand face — same family as navbar / loading. */
export const bannerGreetingFont = M_PLUS_Rounded_1c({
	subsets: ["latin"],
	weight: ["700"],
});

/** Literary mincho for hitokoto — calm contrast under the greeting. */
export const bannerHitokotoFont = Shippori_Mincho({
	subsets: ["latin"],
	weight: ["500"],
});
