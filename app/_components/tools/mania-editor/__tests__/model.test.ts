import { describe, expect, it } from "vitest";
import { createBeatmap, createNote, parseBeatmap, serializeBeatmap } from "../model";
import { source } from "./fixture";

describe("mania format", () => {
	it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])("roundtrips every lane of a %iK chart", (keys) => {
		const map = createBeatmap(keys);
		const lanes = Array.from({ length: keys }, (_, lane) => lane);
		map.notes = lanes.map((lane) => createNote(lane, 1000));
		const restored = parseBeatmap(serializeBeatmap(map));
		expect(restored.keys).toBe(keys);
		expect(restored.metadata.Version).toBe("Default");
		expect(restored.notes.map((note) => note.lane)).toEqual(lanes);
	});
	it.each([0, 11, 18, 4.5])("rejects unsupported key count %s on import and export", (keys) => {
		expect(() => parseBeatmap(source.replace("CircleSize:4", `CircleSize:${keys}`))).toThrow(/键数/);
		const map = createBeatmap();
		map.keys = keys;
		expect(() => serializeBeatmap(map)).toThrow(/键数/);
	});
	it("allows a silent chart to render and export when AudioFilename is absent", () => {
		const map = parseBeatmap(source.replace("AudioFilename: song.ogg\n", ""));
		expect(map.general.AudioFilename).toBe("");
		expect(serializeBeatmap(map)).toContain("AudioFilename:");
	});
	it("decodes columns, holds, samples and colon-containing metadata", () => {
		const map = parseBeatmap(source);
		expect(map.keys).toBe(4);
		expect(map.metadata.Title).toBe("Test: song");
		expect(map.notes.map(({ lane, time, endTime }) => [lane, time, endTime])).toEqual([[0, 400, 400], [3, 900, 1400], [1, 2300, 2300]]);
		expect(map.notes[0].sample).toBe("2:3:4:70:custom.wav");
	});
	it("exports editable objects without losing other sections or combo flags", () => {
		const map = parseBeatmap(source);
		map.notes[0].time = 500;
		map.notes[0].endTime = 500;
		const text = serializeBeatmap(map);
		expect(text).toContain("64,192,500,5,2,2:3:4:70:custom.wav");
		expect(text).toContain("2,10000,12000");
		expect(text).toContain("Keep this untouched");
		expect(text).toContain("Combo1 : 255,120,80");
		expect(parseBeatmap(text).notes[1].endTime).toBe(1400);
		expect(parseBeatmap(text).timing[1].beatLength).toBe(-50);
	});
	it.each([
		[source.replace("Mode: 3", "Mode: 0"), /mania/i],
		[source.replace("CircleSize:4", "CircleSize:0"), /键|key/i],
		[source.replace("128,8,1400", "128,8,800"), /长条|hold/i],
		[source.replace("400,5,2", "NaN,5,2"), /时间|time/i],
		[source.replace("-100,500", "-100,0"), /BPM|节拍/i],
	])("rejects unsupported or malformed charts", (text, message) => {
		expect(() => parseBeatmap(text)).toThrow(message);
	});
});
