"use client";

import { useState, useEffect } from "react";
import "./loading.scss";
import { CloudeaImage } from "@/app/_components/ui/image";
import { M_PLUS_Rounded_1c } from "next/font/google";
import cn from "clsx";

const mPlusRounded1c = M_PLUS_Rounded_1c({
	weight: "400",
	subsets: ["latin"],
});

/** Hard cap so a hung deferred script (e.g. analytics) cannot trap the splash. */
const LOADING_FALLBACK_MS = 1600;

export const Loading = () => {
	const [isLoading, setIsLoading] = useState(true);
	const [gone, setGone] = useState(false);

	useEffect(() => {
		let finished = false;
		const finish = () => {
			if (finished) return;
			finished = true;
			setIsLoading(false);
		};

		if (document.readyState === "complete") {
			finish();
		} else {
			window.addEventListener("load", finish, { once: true });
		}

		const timeout = window.setTimeout(finish, LOADING_FALLBACK_MS);

		return () => {
			window.removeEventListener("load", finish);
			window.clearTimeout(timeout);
		};
	}, []);

	if (gone) return null;

	return (
		<div
			className={cn("loader-bg", { "fade-out": !isLoading })}
			onAnimationEnd={(event) => {
				if (event.target !== event.currentTarget) return;
				if (!isLoading) setGone(true);
			}}
			style={{
				position: "fixed",
				background: "white",
				zIndex: 9999,
				width: "100%",
				height: "100%",
			}}
		>
			<p
				id="loading"
				className={mPlusRounded1c.className}
			>
				<span>
					その歌声は
					<span style={{ display: "inline-block", marginRight: "-0.3rem" }}>
						、
					</span>
					春風と共に
				</span>
				──
			</p>
			<div className="loading-bg">
				<CloudeaImage
					className="sakura-1"
					src="loading-bg.gif"
					alt="sakura"
					width={240}
					height={240}
					priority={true}
				/>
			</div>
		</div>
	);
};
