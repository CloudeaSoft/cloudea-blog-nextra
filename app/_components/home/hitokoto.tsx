import { GetHitokoto } from "../../../utils/hitokoto";
import { TypingEffect } from "./typing-effect";

export const Hitokoto = async () => {
	const hito = await GetHitokoto();
	if (!hito) {
		return <></>;
	}

	const text = hito.hitokoto;
	return (
		<TypingEffect
			className="text-[1.25rem]"
			text={text}
		/>
	);
};
