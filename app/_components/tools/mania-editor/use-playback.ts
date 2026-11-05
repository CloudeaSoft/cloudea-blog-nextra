"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Beatmap, type Note, type Project } from "./model";
import { findAsset } from "./archive";
import { timingAt } from "./timing";
type Loop = {
	enabled: boolean;
	start: number;
	end: number;
};
/** The media clock is authoritative. The performance clock is only used without audio. */
export function usePlayback(map: Beatmap, filename: string, assets: Project["assets"], onError: (message: string) => void) {
	const [time, setTime] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [rate, setRate] = useState(1);
	const [volume, setVolume] = useState(0.7);
	const [hitsounds, setHitsounds] = useState(true);
	const [duration, setDuration] = useState(0);
	const [loop, setLoop] = useState<Loop>({ enabled: false, start: 0, end: 5000 });
	const audio = useRef<HTMLAudioElement | null>(null);
	const context = useRef<AudioContext | null>(null);
	const buffers = useRef(new Map<Uint8Array, Promise<AudioBuffer | null>>());
	const current = useRef(time);
	const active = useRef(false);
	const previous = useRef(0);
	const config = useRef({ map, filename, assets, rate, volume, hitsounds, loop, duration, onError });
	config.current = { map, filename, assets, rate, volume, hitsounds, loop, duration, onError };
	const bytes = findAsset(assets, filename, map.general.AudioFilename);
	const lastNote = map.notes.reduce((last, n) => Math.max(last, n.endTime), 0);
	const lastMarker = [Number(map.general.PreviewTime) || 0, ...map.timing.map((point) => point.time), ...(map.editor.Bookmarks || "").split(",").map(Number)].reduce((last, at) => Number.isFinite(at) ? Math.max(last, at) : last, 0);
	const end = Math.max(duration, lastNote + 2000, lastMarker, 10000);
	const endRef = useRef(end);
	endRef.current = end;
	const pause = useCallback(() => {
		active.current = false;
		audio.current?.pause();
		setPlaying(false);
	}, []);
	const seek = useCallback((value: number) => {
		if (!Number.isFinite(value))
			return;
		const next = Math.max(0, Math.min(endRef.current, value));
		current.current = next;
		previous.current = next;
		setTime(next);
		if (audio.current)
			audio.current.currentTime = Math.min(next, config.current.duration || next) / 1000;
	}, []);
	useEffect(() => {
		pause();
		current.current = 0;
		previous.current = 0;
		setTime(0);
		setDuration(0);
		buffers.current.clear();
		if (!bytes) {
			audio.current = null;
			return;
		}
		const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
		const media = new Audio(url);
		media.preload = "auto";
		media.onloadedmetadata = () => {
			if (Number.isFinite(media.duration))
				setDuration(media.duration * 1000);
		};
		media.onerror = () => config.current.onError("浏览器无法解码此音频，请换用 MP3、OGG 或 WAV。");
		audio.current = media;
		return () => {
			media.pause();
			media.onloadedmetadata = null;
			media.onerror = null;
			media.removeAttribute("src");
			media.load();
			URL.revokeObjectURL(url);
			if (audio.current === media)
				audio.current = null;
		};
	}, [bytes, filename, pause]);
	useEffect(() => {
		if (audio.current) {
			audio.current.playbackRate = rate;
			audio.current.volume = volume;
		}
	}, [rate, volume, bytes]);
	const toggle = useCallback(async () => {
		if (active.current) {
			pause();
			return;
		}
		try {
			context.current ??= new AudioContext();
			await context.current.resume();
			const cfg = config.current;
			if (cfg.loop.enabled && (current.current < cfg.loop.start || current.current >= cfg.loop.end))
				seek(cfg.loop.start);
			else if (current.current >= endRef.current - 1 || (audio.current && current.current >= cfg.duration))
				seek(0);
			if (audio.current) {
				audio.current.playbackRate = cfg.rate;
				audio.current.volume = cfg.volume;
				await audio.current.play();
			}
			previous.current = current.current - 0.01;
			active.current = true;
			setPlaying(true);
		} catch (error) {
			pause();
			config.current.onError(`无法播放：${error instanceof Error ? error.message : "音频不可用"}`);
		}
	}, [pause, seek]);
	useEffect(() => {
		let frame = 0;
		let stamp = performance.now();
		const sound = (note: Note) => {
			const ctx = context.current;
			if (!ctx)
				return;
			const cfg = config.current;
			const point = timingAt(cfg.map, note.time);
			const parts = note.sample.split(":");
			const level = (Number(parts[3]) || point.volume) / 100 * cfg.volume;
			const normalSet = Number(parts[0]) || point.sampleSet;
			const additionSet = Number(parts[1]) || normalSet;
			const index = Number(parts[2]) || point.sampleIndex;
			const custom = parts.slice(4).join(":");
			const names = custom ? [custom] : ["normal", ...(note.hitSound & 2 ? ["whistle"] : []), ...(note.hitSound & 4 ? ["finish"] : []), ...(note.hitSound & 8 ? ["clap"] : [])].map((kind) => `${["", "normal", "soft", "drum"][kind === "normal" ? normalSet : additionSet]}-hit${kind}${index > 1 ? index : ""}`);
			const playAt = ctx.currentTime;
			for (const [i, name] of names.entries()) {
				const data = custom ? findAsset(cfg.assets, cfg.filename, name) : ["wav", "ogg", "mp3"].map((ext) => findAsset(cfg.assets, cfg.filename, `${name}.${ext}`)).find(Boolean);
				if (data) {
					let pending = buffers.current.get(data);
					if (!pending) {
						pending = ctx.decodeAudioData(new Uint8Array(data).buffer).catch(() => null);
						buffers.current.set(data, pending);
					}
					void pending.then((buffer) => {
						if (!buffer || !active.current || ctx.currentTime - playAt > 0.15)
							return;
						const source = ctx.createBufferSource();
						const gain = ctx.createGain();
						source.buffer = buffer;
						gain.gain.value = level;
						source.connect(gain).connect(ctx.destination);
						source.start();
					});
				} else {
					// Original synthetic fallback: no osu! skin or game resources are bundled.
					const oscillator = ctx.createOscillator();
					const gain = ctx.createGain();
					oscillator.frequency.value = [880, 1500, 440, 220][i] || 880;
					gain.gain.setValueAtTime(level * 0.16, playAt);
					gain.gain.exponentialRampToValueAtTime(0.001, playAt + 0.045);
					oscillator.connect(gain).connect(ctx.destination);
					oscillator.start(playAt);
					oscillator.stop(playAt + 0.05);
				}
			}
		};
		const tick = (now: number) => {
			const dt = now - stamp;
			stamp = now;
			if (active.current) {
				const cfg = config.current;
				let next = audio.current ? audio.current.currentTime * 1000 : current.current + dt * cfg.rate;
				if (cfg.loop.enabled && next >= cfg.loop.end) {
					next = cfg.loop.start;
					seek(next);
					previous.current = next - 0.01;
					if (audio.current?.paused)
						void audio.current.play().catch(() => pause());
				}
				if (cfg.hitsounds && next - previous.current < 250) {
					for (const note of cfg.map.notes) {
						if (note.time > next)
							break;
						if (note.time > previous.current)
							sound(note);
					}
				}
				previous.current = next;
				current.current = Math.min(next, endRef.current);
				setTime(current.current);
				if (next >= endRef.current || audio.current?.ended)
					pause();
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [pause, seek]);
	useEffect(() => () => {
		void context.current?.close();
	}, []);
	return { time, playing, rate, setRate, volume, setVolume, hitsounds, setHitsounds, duration, end, loop, setLoop, hasAudio: !!bytes, seek, pause, toggle };
}
