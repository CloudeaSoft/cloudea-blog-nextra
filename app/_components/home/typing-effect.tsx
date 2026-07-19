// components/Typewriter.tsx
"use client";

import { useState, useEffect, CSSProperties } from "react";
import cn from "clsx";

interface TypewriterProps {
	text: string;
	speed?: number;
	className?: string;
	style?: CSSProperties;
}

export const TypingEffect = ({
	text,
	className,
	style,
	speed = 100,
}: TypewriterProps) => {
	const [displayText, setDisplayText] = useState("");
	const [isComplete, setIsComplete] = useState(false);

	useEffect(() => {
		if (displayText.length < text.length) {
			const timer = setTimeout(() => {
				setDisplayText(text.slice(0, displayText.length + 1));
			}, speed);
			return () => clearTimeout(timer);
		} else if (!isComplete) {
			setIsComplete(true);
		}
	}, [displayText, text, speed, isComplete]);

	return (
		<span
			className={cn(className, "flex items-center justify-center")}
			style={style}
		>
			{displayText}
			{!isComplete && (
				<span
					className={cn(
						className,
						"typing-cursor inline-block w-0.5 h-5 bg-current ml-0.5 align-middle",
					)}
				/>
			)}
		</span>
	);
};
