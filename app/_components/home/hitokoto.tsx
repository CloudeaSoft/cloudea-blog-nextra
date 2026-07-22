import cn from "clsx";
import { GetHitokoto } from "@/utils/hitokoto";
import { bannerHitokotoFont } from "./font";
import { TypingEffect } from "./typing-effect";

export const Hitokoto = async () => {
	const hito = await GetHitokoto();
	if (!hito) {
		return <></>;
	}

	const text = hito.hitokoto;
	return (
		<span
			data-testid="hitokoto"
			className="banner-hitokoto block w-[80%]"
		>
			<TypingEffect
				className={cn("banner-hitokoto__text", bannerHitokotoFont.className)}
				text={text}
			/>
		</span>
	);
};
