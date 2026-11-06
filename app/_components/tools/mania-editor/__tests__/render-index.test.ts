import { describe, expect, it } from "vitest";
import { parseBeatmap } from "../model";
import { scrollDistance } from "../timing";
import { createScrollPosition, createNoteIndex } from "../render-index";
import { source } from "./fixture";

describe("playback indexes", () => {
	it("matches SV integration before, at and across timing changes in either direction", () => {
		const map = parseBeatmap(source);
		map.timing = [
			{ ...map.timing[1], time: -200, beatLength: -200 },
			...map.timing,
			{ ...map.timing[1], time: 1900, beatLength: -25 },
			{ ...map.timing[1], time: 2500, beatLength: -0.1 },
			{ ...map.timing[1], time: 3000, beatLength: -10000 },
		];
		const position = createScrollPosition(map.timing);
		for (const from of [-500, -200, -100, 0, 899, 900, 1450, 1900, 2500, 3000, 6000]) {
			for (const to of [-500, -200, -100, 0, 900, 1900, 2300, 2500, 3000, 6000]) {
				expect(position(to) - position(from)).toBeCloseTo(scrollDistance(map, from, to), 7);
			}
		}
	});
	it("keeps a long hold visible even when its start is far before the viewport", () => {
		const map = parseBeatmap(source);
		map.notes = [
			{ ...map.notes[0], time: 0, endTime: 50000 },
			{ ...map.notes[0], time: 100, endTime: 100 },
			{ ...map.notes[0], time: 20000, endTime: 20000 },
			{ ...map.notes[0], time: 60000, endTime: 60000 },
		];
		const index = createNoteIndex(map.notes);
		expect(index.firstVisible(19000)).toBe(0);
		expect(index.firstVisible(50000)).toBe(0);
		expect(index.firstVisible(50001)).toBe(3);
		expect(index.firstVisible(60001)).toBe(4);
	});
	it("locates newly crossed notes without replaying a chord at the previous time", () => {
		const map = parseBeatmap(source);
		map.notes = [map.notes[0], { ...map.notes[0], lane: 1 }, ...map.notes.slice(1)];
		const index = createNoteIndex(map.notes);
		expect(index.after(399.99)).toBe(0);
		expect(index.after(400)).toBe(2);
		expect(index.after(900)).toBe(3);
		expect(index.after(5000)).toBe(4);
		expect(index.after(0)).toBe(0);
	});
	it("handles an empty chart", () => {
		const index = createNoteIndex([]);
		expect(index.firstVisible(0)).toBe(0);
		expect(index.after(0)).toBe(0);
		expect(createScrollPosition([])(1000)).toBe(1000);
	});
});
