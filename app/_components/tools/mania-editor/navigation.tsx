"use client";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { Beatmap } from "./model";
import { stepGridTime } from "./timing";

type NavigationProps = {
	map: Beatmap;
	time: number;
	end: number;
	disabled: boolean;
	onSeek: (time: number) => void;
};

/** Stable-style horizontal density bars arranged along the song's vertical time axis. */
export function DensityOverview({ map, time, end, disabled, onSeek, windowMs, divisor }: NavigationProps & { windowMs: number; divisor: number }) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const dragging = useRef(false);
	const [size, setSize] = useState({ width: 32, height: 400 });
	useEffect(() => {
		const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
		observer.observe(canvas.current!);
		return () => observer.disconnect();
	}, []);
	useEffect(() => {
		const element = canvas.current!;
		const ratio = window.devicePixelRatio || 1;
		element.width = Math.round(size.width * ratio);
		element.height = Math.round(size.height * ratio);
		const ctx = element.getContext("2d");
		if (!ctx) return;
		ctx.scale(ratio, ratio);
		ctx.clearRect(0, 0, size.width, size.height);
		const bins = new Uint32Array(Math.max(1, Math.floor(size.height / 3)));
		for (const note of map.notes) {
			const bin = Math.min(bins.length - 1, Math.floor(note.time / end * bins.length));
			bins[bin]++;
		}
		const peak = bins.reduce((max, count) => Math.max(max, count), 1);
		ctx.fillStyle = "#acb7ce";
		bins.forEach((count, i) => {
			if (count) ctx.fillRect(2, (bins.length - i - 1) / bins.length * size.height, (size.width - 4) * count / peak, Math.max(1, size.height / bins.length - 1));
		});
	}, [map.notes, end, size]);
	function seek(event: PointerEvent<HTMLDivElement>) {
		const rect = event.currentTarget.getBoundingClientRect();
		onSeek(Math.round(Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height)) * end));
	}
	return (
		<div
			className="mania-overview"
			role="slider"
			aria-label="全曲音符密度总览"
			aria-orientation="vertical"
			aria-valuemin={0}
			aria-valuemax={Math.round(end)}
			aria-valuenow={Math.round(time)}
			aria-disabled={disabled}
			tabIndex={disabled ? -1 : 0}
			title="全曲音符密度 · 点击或拖动定位"
			onPointerDown={(event) => {
				if (disabled || event.button !== 0) return;
				event.currentTarget.focus();
				event.currentTarget.setPointerCapture(event.pointerId);
				dragging.current = true;
				seek(event);
			}}
			onPointerMove={(event) => { if (dragging.current && !disabled) seek(event); }}
			onPointerUp={() => { dragging.current = false; }}
			onPointerCancel={() => { dragging.current = false; }}
			onKeyDown={(event) => {
				if (disabled) return;
				if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
					event.stopPropagation();
					event.preventDefault();
					onSeek(event.key === "Home" ? 0 : event.key === "End" ? end : stepGridTime(map, time, divisor, (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 4 : 1), end));
				}
			}}
		>
			<canvas ref={canvas} aria-hidden="true" />
			<div className="mania-overview-window" style={{ top: `${(1 - Math.min(end, time + windowMs) / end) * 100}%`, height: `${Math.min(windowMs, end - time) / end * 100}%` }} />
			<div className="mania-overview-position" style={{ top: `${(1 - time / end) * 100}%` }} />
		</div>
	);
}

type Marker = { id: string; time: number; kind: "bookmark" | "red" | "green" | "preview"; label: string };
export function SongTimeline({ map, time, end, disabled, onSeek }: NavigationProps) {
	const markers = useMemo(() => {
		const result: Marker[] = map.timing.map((point) => ({ id: point.id, time: point.time, kind: point.uninherited ? "red" : "green", label: `${point.uninherited ? "BPM 定时点" : "继承定时点"} ${point.time} ms` }));
		for (const at of new Set((map.editor.Bookmarks || "").split(",").filter(Boolean).map(Number).filter((at) => Number.isFinite(at) && at >= 0)))
			result.push({ id: `bookmark-${at}`, time: at, kind: "bookmark", label: `书签 ${at} ms` });
		const preview = Number(map.general.PreviewTime ?? -1);
		if (Number.isFinite(preview) && preview >= 0)
			result.push({ id: "preview", time: preview, kind: "preview", label: `预览点 ${preview} ms` });
		return result;
	}, [map.timing, map.editor.Bookmarks, map.general.PreviewTime]);
	return (
		<div className="mania-timeline" role="group" aria-label="歌曲时间轴">
			<div className="mania-timeline-track">
				<div className="mania-timeline-axis" />
				{Array.from({ length: 5 }, (_, i) => (
					<span className="mania-timeline-label" key={i} style={{ left: `${i * 25}%` }}>{`${Math.floor(end * i / 4 / 60000)}:${String(Math.floor(end * i / 4 / 1000 % 60)).padStart(2, "0")}`}</span>
				))}
				{markers.filter((marker) => marker.time <= end).map((marker) => (
					<button
						type="button"
						key={marker.id}
						className={`mania-timeline-marker is-${marker.kind}`}
						style={{ left: `${Math.max(0, marker.time) / end * 100}%` }}
						aria-label={marker.label}
						title={marker.label}
						disabled={disabled}
						onClick={() => onSeek(marker.time)}
					/>
				))}
				<input aria-label="播放进度" type="range" min={0} max={end} step={1} value={time} disabled={disabled} onChange={(event) => onSeek(Number(event.target.value))} />
			</div>
		</div>
	);
}
