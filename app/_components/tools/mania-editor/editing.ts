import { type Beatmap, type Note, newId, validateNote } from "./model";
/** Replace existing ids or append new ones. Reject a whole gesture on collision. */
export function editNotes(map: Beatmap, changes: Note[], remove: string[] = []): Beatmap {
	const removed = new Set([...remove, ...changes.map((n) => n.id)]);
	const changed = new Set(changes.map((n) => n.id));
	const notes = [...map.notes.filter((n) => !removed.has(n.id)), ...changes].sort((a, b) => a.time - b.time || a.lane - b.lane);
	const lanes: Note[][] = Array.from({ length: map.keys }, () => []);
	for (const note of notes) {
		validateNote(note, map.keys);
		// Only reject collisions involving edited objects, so old stacked maps remain editable.
		const active = lanes[note.lane].filter((n) => n.endTime >= note.time);
		for (const previous of active) {
			if ((changed.has(note.id) || changed.has(previous.id)) && (previous.time === note.time || previous.endTime > note.time)) {
				throw new Error("同一列的音符不能重叠；此次操作未应用。");
			}
		}
		lanes[note.lane] = [...active, note];
	}
	return { ...map, notes };
}
export function moveNotes(map: Beatmap, ids: string[], deltaTime: number, deltaLane: number): Beatmap {
	const selected = new Set(ids);
	return editNotes(map, map.notes.filter((n) => selected.has(n.id)).map((n) => ({ ...n, time: Math.round(n.time + deltaTime), endTime: Math.round(n.endTime + deltaTime), lane: n.lane + deltaLane })));
}
export function mirrorNotes(map: Beatmap, ids: string[]): Beatmap {
	const selected = new Set(ids);
	return editNotes(map, map.notes.filter((n) => selected.has(n.id)).map((n) => ({ ...n, lane: map.keys - n.lane - 1 })));
}
export function pasteNotes(map: Beatmap, clipboard: Note[], at: number): Beatmap {
	if (!clipboard.length)
		return map;
	const first = Math.min(...clipboard.map((n) => n.time));
	return editNotes(map, clipboard.map((n) => ({ ...n, id: newId(), time: Math.round(n.time - first + at), endTime: Math.round(n.endTime - first + at) })));
}
export type History<T> = {
	past: T[];
	present: T;
	future: T[];
};
export function createHistory<T>(present: T): History<T> {
	return { past: [], present, future: [] };
}
export function commitHistory<T>(state: History<T>, present: T): History<T> {
	if (present === state.present)
		return state;
	return { past: [...state.past.slice(-49), state.present], present, future: [] };
}
export function undoHistory<T>(state: History<T>): History<T> {
	if (!state.past.length)
		return state;
	return { past: state.past.slice(0, -1), present: state.past.at(-1)!, future: [state.present, ...state.future] };
}
export function redoHistory<T>(state: History<T>): History<T> {
	if (!state.future.length)
		return state;
	return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) };
}
