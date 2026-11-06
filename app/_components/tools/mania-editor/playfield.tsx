"use client";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { type Beatmap, type Note, createNote } from "./model";
import { beatLines, snapTime, stepGridTime } from "./timing";
import { editNotes, moveNotes } from "./editing";
import { columnAccent, noteBounds } from "./note-skin";
import { createNoteRenderer } from "./note-renderer";
import { createNoteIndex, createScrollPosition } from "./render-index";
import { type PlaybackClock, usePlaybackFrame } from "./use-playback-frame";
export type EditMode = "select" | "note" | "hold";
type Position = {
	lane: number;
	time: number;
	x: number;
	y: number;
};
type Gesture = {
	start: Position;
	now: Position;
	kind: "box" | "move" | "tail" | "note" | "hold";
	ids: string[];
	note?: Note;
	additive: boolean;
};
type Props = {
	disabled: boolean;
	map: Beatmap;
	time: number;
	playing: boolean;
	clock: PlaybackClock;
	end: number;
	preview: boolean;
	windowMs: number;
	divisor: number;
	mode: EditMode;
	selected: string[];
	onSelect: (ids: string[]) => void;
	onEdit: (map: Beatmap) => void;
	onSeek: (time: number) => void;
	onSnapStep: (direction: number) => void;
	onError: (message: string) => void;
};
export function Playfield(props: Props) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [size, setSize] = useState({ width: 600, height: 460 });
	const [gesture, setGesture] = useState<Gesture | null>(null);
	const latest = useRef(props);
	latest.current = props;
	const { map, time, windowMs, preview, playing, divisor, selected } = props;
	const left = 48;
	const right = size.width - 16;
	const bottom = size.height - 44;
	const laneWidth = (right - left) / map.keys;
	const scale = (bottom - 20) / windowMs;
	const scrollPosition = useMemo(() => createScrollPosition(map.timing), [map.timing]);
	const noteIndex = useMemo(() => createNoteIndex(map.notes), [map.notes]);
	const renderNote = useMemo(() => createNoteRenderer(), []);
	const selection = useMemo(() => new Set(selected), [selected]);
	const yAt = (at: number) => bottom - (preview ? scrollPosition(at) - scrollPosition(time) : at - time) * scale;
	useEffect(() => {
		const element = canvas.current!;
		const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
		observer.observe(element);
		const wheel = (event: WheelEvent) => {
			event.preventDefault();
			const p = latest.current;
			if (p.disabled || !event.deltaY)
				return;
			if (event.ctrlKey) {
				p.onSnapStep(-Math.sign(event.deltaY));
				return;
			}
			if (!p.playing) p.onSeek(stepGridTime(p.map, p.time, p.divisor, Math.sign(event.deltaY) * (event.shiftKey ? 4 : 1), p.end));
		};
		element.addEventListener("wheel", wheel, { passive: false });
		return () => {
			observer.disconnect();
			element.removeEventListener("wheel", wheel);
		};
	}, []);
	useEffect(() => {
		setGesture(null);
	}, [map, preview, props.disabled, windowMs, divisor]);
	usePlaybackFrame(props.clock, (time) => {
		const element = canvas.current;
		if (!element)
			return;
		const ratio = window.devicePixelRatio || 1;
		const width = Math.round(size.width * ratio);
		const height = Math.round(size.height * ratio);
		if (element.width !== width) element.width = width;
		if (element.height !== height) element.height = height;
		const ctx = element.getContext("2d", { alpha: false });
		if (!ctx)
			return;
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		const origin = preview ? scrollPosition(time) : time;
		const yAt = (at: number) => bottom - ((preview ? scrollPosition(at) : at) - origin) * scale;
		ctx.fillStyle = "#10141f";
		ctx.fillRect(0, 0, size.width, size.height);
		for (let lane = 0; lane < map.keys; lane++) {
			ctx.fillStyle = lane % 2 ? "#1b2130" : "#151b28";
			ctx.fillRect(left + lane * laneWidth, 0, laneWidth - 1, size.height);
			ctx.fillStyle = "#9aa7c2";
			ctx.font = "11px monospace";
			ctx.textAlign = "center";
			ctx.fillText(String(lane + 1), left + (lane + 0.5) * laneWidth, bottom + 28);
		}
		for (const line of beatLines(map, Math.max(0, time - 500), time + windowMs * (preview ? 10 : 1.1), preview ? 1 : divisor)) {
			const y = yAt(line.time);
			if (y < 0 || y > size.height)
				continue;
			ctx.fillStyle = line.bar ? "#526076" : line.major ? "#344057" : "#232d40";
			ctx.fillRect(left, y, right - left, line.bar ? 2 : 1);
			if (line.major) {
				ctx.fillStyle = "#8391ac";
				ctx.textAlign = "right";
				ctx.font = "10px monospace";
				ctx.fillText((line.time / 1000).toFixed(2), left - 7, y + 3);
			}
		}
		const drawNote = (note: Note, ghost = false) => {
			const head = yAt(note.time);
			const tail = yAt(note.endTime);
			const bounds = noteBounds(head, tail, laneWidth);
			if (bounds.top > bottom || head < 0)
				return;
			if (ghost) {
				ctx.save();
				ctx.beginPath();
				ctx.rect(left, 24, right - left, bottom - 24);
				ctx.clip();
			}
			renderNote(ctx, { x: left + note.lane * laneWidth + 2, laneWidth, head, tail, accent: columnAccent(map.keys, note.lane), selected: selection.has(note.id), ghost }, ratio);
			if (ghost) ctx.restore();
		};
		// Share one clip for the whole note pass instead of saving/clipping each sprite.
		ctx.save();
		ctx.beginPath();
		ctx.rect(left, 24, right - left, bottom - 24);
		ctx.clip();
		for (let i = noteIndex.firstVisible(time - 500); i < map.notes.length; i++) {
			const note = map.notes[i];
			if (note.time > time + windowMs * (preview ? 10 : 1.1)) break;
			if (note.endTime < time - 500) continue;
			drawNote(note);
		}
		ctx.restore();
		if (gesture) {
			if (gesture.kind === "box") {
				ctx.fillStyle = "#a5c5ff22";
				ctx.strokeStyle = "#a5c5ff";
				const x = Math.min(gesture.start.x, gesture.now.x);
				const y = Math.min(gesture.start.y, gesture.now.y);
				const w = Math.abs(gesture.now.x - gesture.start.x);
				const h = Math.abs(gesture.now.y - gesture.start.y);
				ctx.fillRect(x, y, w, h);
				ctx.strokeRect(x, y, w, h);
			} else if (gesture.kind === "hold" || gesture.kind === "note") {
				drawNote({ ...createNote(gesture.start.lane, Math.min(gesture.start.time, gesture.now.time), Math.max(gesture.start.time, gesture.now.time)), id: "ghost" }, true);
			} else if (gesture.note) {
				for (const note of map.notes.filter((n) => gesture.ids.includes(n.id))) {
					const delta = gesture.now.time - gesture.start.time;
					const lane = note.lane + gesture.now.lane - gesture.start.lane;
					if (lane < 0 || lane >= map.keys) continue;
					drawNote(gesture.kind === "tail" ? { ...note, endTime: Math.max(note.time + 1, note.endTime + delta) } : { ...note, time: note.time + delta, endTime: note.endTime + delta, lane }, true);
				}
			}
		}
		ctx.fillStyle = "#7adbd5";
		ctx.fillRect(left, bottom, right - left, 2);
		ctx.fillStyle = "#10141fcc";
		ctx.fillRect(0, 0, size.width, 24);
		ctx.fillStyle = "#b5c3da";
		ctx.textAlign = "left";
		ctx.font = "11px monospace";
		ctx.fillText(preview ? "PREVIEW / SV" : "COMPOSE / TIME", left + 8, 16);
	});
	function position(event: {
		currentTarget: HTMLCanvasElement;
		clientX: number;
		clientY: number;
	}): Position {
		const rect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		return { x, y, lane: Math.max(0, Math.min(map.keys - 1, Math.floor((x - left) / laneWidth))), time: snapTime(map, time + (bottom - y) / scale, divisor) };
	}
	function hit(point: Position): Note | undefined {
		return [...map.notes].reverse().find((n) => {
			const bounds = noteBounds(yAt(n.time), yAt(n.endTime), laneWidth);
			return n.lane === point.lane && point.y >= bounds.top - 4 && point.y <= bounds.bottom + 4;
		});
	}
	function down(event: PointerEvent<HTMLCanvasElement>) {
		event.currentTarget.focus();
		if (props.disabled || playing || preview || event.button !== 0)
			return;
		const point = position(event);
		if (point.x < left || point.x > right)
			return;
		event.currentTarget.setPointerCapture(event.pointerId);
		const note = hit(point);
		const additive = event.shiftKey || event.ctrlKey || event.metaKey;
		if (props.mode === "select" && note) {
			const ids = additive ? (selected.includes(note.id) ? selected.filter((id) => id !== note.id) : [...selected, note.id]) : selected.includes(note.id) ? selected : [note.id];
			props.onSelect(ids);
			setGesture({ start: point, now: point, kind: note.endTime > note.time && point.y <= yAt(note.endTime) + 4 && ids.length === 1 ? "tail" : "move", ids, note, additive });
		} else
			setGesture({ start: point, now: point, kind: props.mode === "select" ? "box" : props.mode, ids: [], additive });
	}
	function up(event: PointerEvent<HTMLCanvasElement>) {
		if (!gesture || props.disabled)
			return;
		setGesture(null);
		const point = position(event);
		try {
			if (gesture.kind === "box") {
				const ids = map.notes.filter((n) => n.lane >= Math.min(gesture.start.lane, point.lane) && n.lane <= Math.max(gesture.start.lane, point.lane) && n.time <= Math.max(gesture.start.time, point.time) && n.endTime >= Math.min(gesture.start.time, point.time)).map((n) => n.id);
				props.onSelect(gesture.additive ? [...new Set([...selected, ...ids])] : ids);
			} else if (gesture.kind === "move") {
				const dt = point.time - gesture.start.time;
				const dl = point.lane - gesture.start.lane;
				if (dt || dl)
					props.onEdit(moveNotes(map, gesture.ids, dt, dl));
			} else if (gesture.kind === "tail" && gesture.note) {
				const delta = point.time - gesture.start.time;
				if (delta) props.onEdit(editNotes(map, [{ ...gesture.note, endTime: gesture.note.endTime + delta }]));
			} else {
				const start = gesture.kind === "note" ? gesture.start.time : Math.min(gesture.start.time, point.time);
				const end = gesture.kind === "note" ? start : Math.max(gesture.start.time, point.time);
				if (gesture.kind === "hold" && start === end)
					throw new Error("拖动一段距离以绘制长条。");
				const note = createNote(gesture.start.lane, start, end);
				props.onEdit(editNotes(map, [note]));
				props.onSelect([note.id]);
			}
		} catch (error) {
			props.onError(error instanceof Error ? error.message : "编辑失败。");
		}
	}
	return (
		<canvas
			ref={canvas}
			className="mania-playfield"
			data-mode={props.mode}
			style={{ maxWidth: Math.max(192, map.keys * 56 + 64) }}
			tabIndex={0}
			role="application"
			aria-label="Mania 谱面编辑区"
			aria-disabled={props.disabled}
			onPointerDown={down}
			onPointerMove={(event) => {
				if (gesture)
					setGesture({ ...gesture, now: position(event) });
			}}
			onPointerUp={up}
			onPointerCancel={() => setGesture(null)}
			onContextMenu={(event) => {
				event.preventDefault();
				if (props.disabled || playing || preview)
					return;
				const note = hit(position(event));
				if (note)
					props.onEdit(editNotes(map, [], [note.id]));
			}}
		/>
	);
}
