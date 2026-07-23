import { VISUAL_FIXTURE } from "@/utils/hitokoto";
import { bannerHitokotoFont } from "./font";
import { HitokotoClient } from "./hitokoto.client";

/**
 * Static export freezes server fetches at build time, so the live quote is
 * loaded on the client. Visual builds still inject a fixed string.
 */
export const Hitokoto = () => {
	const initialText =
		process.env.VISUAL_REGRESSION === "1"
			? VISUAL_FIXTURE.hitokoto
			: undefined;

	return (
		<HitokotoClient
			fontClassName={bannerHitokotoFont.className}
			initialText={initialText}
		/>
	);
};
