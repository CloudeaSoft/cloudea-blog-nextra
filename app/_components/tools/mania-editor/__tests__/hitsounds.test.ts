import { describe, expect, it } from "vitest";
import { resolveHitSamples } from "../hitsounds";
import { createBeatmap, createNote } from "../model";

describe("mania hitsounds", () => {
	it("uses the default normal sample for a new note", () => {
		expect(resolveHitSamples(createBeatmap(), createNote(0, 500), "map.osu", {})).toEqual([
			{ fallback: "normal-hitnormal", volume: 0.8, data: undefined },
		]);
	});
	it("inherits the timing sample bank and volume, with independent addition banks", () => {
		const map = createBeatmap();
		map.timing[0] = { ...map.timing[0], sampleSet: 2, sampleIndex: 3, volume: 45 };
		const note = { ...createNote(0, 500), hitSound: 14, sample: "0:3:0:0:" };
		const clap = new Uint8Array([1, 2]);
		const samples = resolveHitSamples(map, note, "folder/map.osu", { "folder/DRUM-hitclap3.OGG": clap });
		expect(samples.map(({ fallback, volume }) => [fallback, volume])).toEqual([
			["soft-hitnormal", 0.45], ["drum-hitwhistle", 0.45], ["drum-hitfinish", 0.45], ["drum-hitclap", 0.45],
		]);
		expect(samples.map(({ data }) => data)).toEqual([undefined, undefined, undefined, clap]);
	});
	it("prioritises an explicit sample and falls back to the correct bank if it is missing", () => {
		const map = createBeatmap();
		const note = { ...createNote(0, 500), hitSound: 8, sample: "2:3:4:70:key.wav" };
		const custom = new Uint8Array([3, 4]);
		expect(resolveHitSamples(map, note, "map.osu", { "key.wav": custom })).toEqual([
			{ fallback: "soft-hitnormal", volume: 0.7, data: custom },
		]);
		expect(resolveHitSamples(map, note, "map.osu", {})).toEqual([
			{ fallback: "soft-hitnormal", volume: 0.7, data: undefined },
		]);
	});
	it("retains zero timing volume and uses the general bank when timing inherits it", () => {
		const map = createBeatmap();
		map.general.SampleSet = "Drum";
		map.timing[0] = { ...map.timing[0], sampleSet: 0, volume: 0 };
		expect(resolveHitSamples(map, createNote(0, 500), "map.osu", {})).toEqual([
			{ fallback: "drum-hitnormal", volume: 0, data: undefined },
		]);
	});
});
