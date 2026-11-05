import type { Beatmap, Note, Project } from "./model";
import { findAsset } from "./archive";
import { timingAt } from "./timing";
import { getBasePath } from "@/utils/env";

export type DefaultHitSound = `${"normal" | "soft" | "drum"}-hit${"normal" | "whistle" | "finish" | "clap"}`;
export type HitSample = { fallback: DefaultHitSound; volume: number; data?: Uint8Array };

const banks = ["normal", "soft", "drum"] as const;
const kinds = ["normal", "whistle", "finish", "clap"] as const;

export function resolveHitSamples(map: Beatmap, note: Note, filename: string, assets: Project["assets"]): HitSample[] {
	const point = timingAt(map, note.time);
	const parts = note.sample.split(":");
	const normalSet = Number(parts[0]) || point.sampleSet;
	const additionSet = Number(parts[1]) || normalSet;
	const index = Number(parts[2]) || point.sampleIndex;
	const volume = (Number(parts[3]) || point.volume) / 100;
	const custom = parts.slice(4).join(":");
	const bank = (set: number) => banks[set - 1] || "normal";
	if (custom) return [{ fallback: `${bank(normalSet)}-hitnormal`, volume, data: findAsset(assets, filename, custom) }];
	return kinds.filter((_, i) => i === 0 || (note.hitSound & (1 << i))).map((kind) => {
		const fallback: DefaultHitSound = `${bank(kind === "normal" ? normalSet : additionSet)}-hit${kind}`;
		const name = `${fallback}${index > 1 ? index : ""}`;
		const data = ["wav", "ogg", "mp3"].map((ext) => findAsset(assets, filename, `${name}.${ext}`)).find(Boolean);
		return { fallback, volume, data };
	});
}

/** Default samples are site assets, never part of the exported beatmap. */
export class HitSoundPlayer {
	private defaults = new Map<DefaultHitSound, Promise<AudioBuffer>>();
	private custom = new Map<Uint8Array, Promise<AudioBuffer | null>>();
	private sources = new Set<AudioBufferSourceNode>();
	private generation = 0;

	constructor(private context: AudioContext) {}

	private loadDefault(name: DefaultHitSound) {
		let pending = this.defaults.get(name);
		if (!pending) {
			pending = fetch(`${getBasePath()}/audio/mania/${name}.wav`).then(async (response) => {
				if (!response.ok) throw new Error("无法载入默认击打音，请重试。");
				return this.context.decodeAudioData(await response.arrayBuffer());
			}).catch((error) => {
				this.defaults.delete(name);
				throw error;
			});
			this.defaults.set(name, pending);
		}
		return pending;
	}

	async prepare() {
		await Promise.all(banks.flatMap((bank) => kinds.map((kind) => this.loadDefault(`${bank}-hit${kind}`))));
	}

	clearCustom() {
		this.custom.clear();
	}

	stop() {
		this.generation++;
		for (const source of this.sources) source.stop();
		this.sources.clear();
	}

	play(samples: HitSample[], volume: number, onError: (message: string) => void) {
		const generation = this.generation;
		const at = this.context.currentTime;
		for (const sample of samples) {
			if (sample.volume * volume <= 0) continue;
			let custom: Promise<AudioBuffer | null> | undefined;
			if (sample.data) {
				custom = this.custom.get(sample.data);
				if (!custom) {
					custom = this.context.decodeAudioData(new Uint8Array(sample.data).buffer).catch(() => null);
					this.custom.set(sample.data, custom);
				}
			}
			void (custom || Promise.resolve(null)).then((buffer) => buffer || this.loadDefault(sample.fallback)).then((buffer) => {
				if (generation !== this.generation || this.context.currentTime - at > 0.15) return;
				const source = this.context.createBufferSource();
				const gain = this.context.createGain();
				source.buffer = buffer;
				gain.gain.value = sample.volume * volume;
				source.connect(gain).connect(this.context.destination);
				this.sources.add(source);
				source.onended = () => {
					this.sources.delete(source);
					source.disconnect();
					gain.disconnect();
				};
				source.start();
			}).catch((error) => {
				if (generation === this.generation) onError(error instanceof Error ? error.message : "无法播放击打音。");
			});
		}
	}
}
