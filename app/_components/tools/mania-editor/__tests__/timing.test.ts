import { describe, expect, it } from "vitest";
import { parseBeatmap } from "../model";
import { snapTime, timingAt, scrollDistance, stepGridTime } from "../timing";
import { source } from "./fixture";

describe("mania timing", () => {
	const map = () => parseBeatmap(source);
	it("snaps against red lines, including a negative initial offset and BPM changes", () => {
		expect(snapTime(map(), 1070, 4)).toBe(1025);
		expect(snapTime(map(), 2060, 4)).toBe(2100);
		expect(snapTime(map(), 0, 4)).toBe(25);
	});
	it("applies inherited SV and resets it at the next red line", () => {
		expect(timingAt(map(), 1000)).toMatchObject({ beatLength: 500, sv: 2 });
		expect(timingAt(map(), 2000)).toMatchObject({ beatLength: 400, sv: 1 });
		expect(scrollDistance(map(), 400, 2400)).toBe(3000);
		expect(scrollDistance(map(), 2400, 400)).toBe(-3000);
	});
	it("scrolls from an arbitrary pause position onto the next grid in either direction", () => {
		expect(stepGridTime(map(), 1070, 4, 1)).toBe(1150);
		expect(stepGridTime(map(), 1070, 4, -1)).toBe(1025);
		expect(stepGridTime(map(), 1025, 4, 1)).toBe(1150);
		expect(stepGridTime(map(), 0, 4, 1)).toBe(25);
		expect(stepGridTime(map(), 0, 4, -1)).toBe(0);
	});
	it("walks across a BPM reset rather than extending the previous grid", () => {
		const changed = map();
		changed.timing[2].time = 1870;
		expect(stepGridTime(changed, 1800, 4, 1)).toBe(1870);
		expect(stepGridTime(changed, 1870, 4, -1)).toBe(1775);
		expect(stepGridTime(changed, 1900, 4, -1)).toBe(1870);
		expect(stepGridTime(changed, 1800, 4, 4)).toBe(2170);
		expect(stepGridTime(changed, 9970, 4, 1, 10000)).toBe(9970);
	});
	it("avoids rounded fractional-beat drift for fractional and whole beat divisions", () => {
		const changed = map();
		changed.timing = [{ ...changed.timing[0], time: 0, beatLength: 60000 / 180 }];
		expect(stepGridTime(changed, 83, 4, 1)).toBe(167);
		expect(stepGridTime(changed, 167, 4, -1)).toBe(83);
		expect(stepGridTime(changed, 1070, 1, 1)).toBe(1333);
	});
});
