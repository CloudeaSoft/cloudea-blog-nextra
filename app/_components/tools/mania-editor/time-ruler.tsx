"use client";
import { useEffect, useRef, useState } from "react";
import type { Beatmap } from "./model";
import { beatLines } from "./timing";
import { type PlaybackClock, usePlaybackFrame } from "./use-playback-frame";

type Props = {
	map: Beatmap;
	clock: PlaybackClock;
	windowMs: number;
	divisor: number;
	disabled: boolean;
	onZoom: (direction: number) => void;
};

export function TimeRuler(props: Props) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [width, setWidth] = useState(600);
	const latest = useRef(props);
	latest.current = props;
	useEffect(() => {
		const element = canvas.current!;
		const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		observer.observe(element);
		const wheel = (event: WheelEvent) => {
			if (!event.ctrlKey) return;
			// A non-passive listener prevents the browser's own Ctrl-wheel page zoom here.
			event.preventDefault();
			if (!latest.current.disabled && event.deltaY)
				latest.current.onZoom(Math.sign(event.deltaY));
		};
		element.addEventListener("wheel", wheel, { passive: false });
		return () => {
			observer.disconnect();
			element.removeEventListener("wheel", wheel);
		};
	}, []);
	const { map, windowMs, divisor } = props;
	usePlaybackFrame(props.clock, (time) => {
		const element = canvas.current!;
		const ratio = window.devicePixelRatio || 1;
		const pixelWidth = Math.round(width * ratio);
		const pixelHeight = Math.round(28 * ratio);
		if (element.width !== pixelWidth) element.width = pixelWidth;
		if (element.height !== pixelHeight) element.height = pixelHeight;
		const ctx = element.getContext("2d");
		if (!ctx) return;
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		ctx.clearRect(0, 0, width, 28);
		ctx.font = "10px monospace";
		const scale = Math.max(1, width - 24) / windowMs;
		let lastLabel = -Infinity;
		let lastTick = -Infinity;
		ctx.textAlign = "left";
		for (const line of beatLines(map, time, time + windowMs, divisor)) {
			const x = 12 + (line.time - time) * scale;
			if (x - lastTick < 3 && !line.major) continue;
			ctx.fillStyle = line.bar ? "#edf0f5" : line.major ? "#9ca9c1" : "#4b566a";
			ctx.fillRect(x, line.major ? 15 : 21, 1, line.major ? 13 : 7);
			lastTick = x;
			if (line.major && x - lastLabel >= 55 && x < width - 52) {
				ctx.fillText(`${(line.time / 1000).toFixed(2)}s`, x + 3, 12);
				lastLabel = x;
			}
		}
		ctx.fillStyle = "#7adbd5";
		ctx.fillRect(12, 1, 2, 27);
	});
	return (
		<div className="mania-ruler" role="group" aria-label="时间标尺" aria-disabled={props.disabled}>
			<canvas ref={canvas} aria-hidden="true" />
		</div>
	);
}
