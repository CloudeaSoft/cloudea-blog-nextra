"use client";

import { useEffect, useRef, type FC } from "react";
import { usePathname } from "next/navigation";
import { init, type WalineInstance } from "@waline/client";
import "@waline/client/style";
import { getWalineServerUrl } from "@/utils/env";
import { getWalinePath, isPostArticlePath } from "./waline-path";

export const Comments: FC = () => {
	const pathname = usePathname();
	const containerRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<WalineInstance | null>(null);

	const enabled = isPostArticlePath(pathname);
	const path = getWalinePath(pathname);

	useEffect(() => {
		if (!enabled || !containerRef.current) return;

		instanceRef.current = init({
			el: containerRef.current,
			serverURL: getWalineServerUrl(),
			path,
			lang: "zh-CN",
			dark: "html[class~='dark']",
		}) ?? null;

		return () => {
			instanceRef.current?.destroy();
			instanceRef.current = null;
		};
	}, [enabled, path]);

	if (!enabled) return null;

	return (
		<section
			className="waline-comments not-prose mt-12 pt-8 border-t border-solid"
			style={{ borderColor: "var(--border-color)" }}
			data-pagefind-ignore
			aria-label="评论"
		>
			<div ref={containerRef} />
		</section>
	);
};
