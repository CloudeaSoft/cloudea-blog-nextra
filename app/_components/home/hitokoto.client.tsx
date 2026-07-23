"use client";

import { useEffect, useState } from "react";
import cn from "clsx";
import { GetHitokoto } from "@/utils/hitokoto";
import { TypingEffect } from "./typing-effect";

type HitokotoClientProps = {
	fontClassName: string;
	/** When set (visual regression build), skip network and use this text. */
	initialText?: string;
};

export const HitokotoClient = ({
	fontClassName,
	initialText,
}: HitokotoClientProps) => {
	const [text, setText] = useState(initialText ?? "");

	useEffect(() => {
		if (initialText != null) {
			return;
		}

		let cancelled = false;
		void GetHitokoto().then((hito) => {
			if (!cancelled && hito?.hitokoto) {
				setText(hito.hitokoto);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [initialText]);

	if (!text) {
		return (
			<span
				data-testid="hitokoto"
				className="banner-hitokoto block w-[80%]"
			/>
		);
	}

	return (
		<span
			data-testid="hitokoto"
			className="banner-hitokoto block w-[80%]"
		>
			<TypingEffect
				className={cn("banner-hitokoto__text", fontClassName)}
				text={text}
			/>
		</span>
	);
};
