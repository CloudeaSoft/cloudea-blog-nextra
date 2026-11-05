import { describe, expect, it } from "vitest";
import { parseBeatmap } from "../model";
import { editNotes, moveNotes, mirrorNotes, pasteNotes, createHistory, commitHistory, undoHistory, redoHistory } from "../editing";
import { source } from "./fixture";

describe("mania editing", () => {
	it("moves a selected group atomically without mutating the old map", () => {
		const map = parseBeatmap(source);
		const edited = moveNotes(map, [map.notes[0].id, map.notes[2].id], 125, 1);
		expect(edited.notes.map((n) => [n.lane, n.time, n.endTime])).toEqual([[1, 525, 525], [3, 900, 1400], [2, 2425, 2425]]);
		expect(map.notes[0].time).toBe(400);
		expect(() => moveNotes(map, [map.notes[1].id], 0, 1)).toThrow();
	});
	it("rejects duplicate notes and notes inside holds without silently deleting existing notes", () => {
		const map = parseBeatmap(source);
		expect(() => editNotes(map, [{ ...map.notes[0], id: "new", lane: 3, time: 1100, endTime: 1100 }])).toThrow(/重叠|overlap/i);
		expect(() => editNotes(map, [{ ...map.notes[0], id: "new" }])).toThrow(/重叠|overlap/i);
	});
	it("mirrors lanes and pastes holds relative to the earliest selected timestamp", () => {
		const map = parseBeatmap(source);
		expect(mirrorNotes(map, map.notes.map((n) => n.id)).notes.map((n) => n.lane)).toEqual([3, 0, 2]);
		const pasted = pasteNotes(map, map.notes.slice(0, 2), 3000);
		expect(pasted.notes.slice(-2).map((n) => [n.time, n.endTime])).toEqual([[3000, 3000], [3500, 4000]]);
		expect(new Set(pasted.notes.map((n) => n.id)).size).toBe(5);
	});
	it("undoes and redoes edits and discards the redo branch after a new edit", () => {
		const initial = createHistory(1);
		const changed = commitHistory(initial, 2);
		expect(undoHistory(changed).present).toBe(1);
		expect(redoHistory(undoHistory(changed)).present).toBe(2);
		expect(redoHistory(commitHistory(undoHistory(changed), 3)).present).toBe(3);
	});
});
