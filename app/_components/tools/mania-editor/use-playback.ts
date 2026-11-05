"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Beatmap, type Project } from "./model";
import { findAsset } from "./archive";
import { HitSoundPlayer, resolveHitSamples } from "./hitsounds";
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
	const sounds = useRef<HitSoundPlayer | null>(null);
	const startVersion = useRef(0);
	const starting = useRef(false);
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
		startVersion.current++;
		starting.current = false;
		sounds.current?.stop();
		active.current = false;
		audio.current?.pause();
		setPlaying(false);
	}, []);
	const seek = useCallback((value: number) => {
		if (!Number.isFinite(value))
			return;
		startVersion.current++;
		if (starting.current) setPlaying(false);
		starting.current = false;
		sounds.current?.stop();
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
		sounds.current?.clearCustom();
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
		if (active.current || starting.current) {
			pause();
			return;
		}
		const cfg = config.current;
		if (cfg.loop.enabled && (current.current < cfg.loop.start || current.current >= cfg.loop.end))
			seek(cfg.loop.start);
		else if (current.current >= endRef.current - 1 || (audio.current && current.current >= cfg.duration))
			seek(0);
		const version = ++startVersion.current;
		starting.current = true;
		setPlaying(true);
		try {
			context.current ??= new AudioContext();
			sounds.current ??= new HitSoundPlayer(context.current);
			await context.current.resume();
			if (cfg.hitsounds) await sounds.current.prepare();
			if (version !== startVersion.current) return;
			if (audio.current) {
				audio.current.playbackRate = config.current.rate;
				audio.current.volume = config.current.volume;
				await audio.current.play();
			}
			if (version !== startVersion.current) return;
			previous.current = current.current - 0.01;
			active.current = true;
			setPlaying(true);
		} catch (error) {
			if (version !== startVersion.current) return;
			pause();
			config.current.onError(`无法播放：${error instanceof Error ? error.message : "音频不可用"}`);
		} finally {
			if (version === startVersion.current) starting.current = false;
		}
	}, [pause, seek]);
	useEffect(() => {
		if (!hitsounds) sounds.current?.stop();
		else if (sounds.current) void sounds.current.prepare().catch(() => {
			config.current.onError("无法载入默认击打音，请重试。");
		});
	}, [hitsounds]);
	useEffect(() => {
		let frame = 0;
		let stamp = performance.now();
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
							sounds.current?.play(resolveHitSamples(cfg.map, note, cfg.filename, cfg.assets), cfg.volume, cfg.onError);
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
		startVersion.current++;
		sounds.current?.stop();
		void context.current?.close();
	}, []);
	return { time, playing, rate, setRate, volume, setVolume, hitsounds, setHitsounds, duration, end, loop, setLoop, hasAudio: !!bytes, seek, pause, toggle };
}
