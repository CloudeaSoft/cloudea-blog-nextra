import type { Note, TimingPoint } from "./model";

/** First item strictly greater than a value in an ascending array. */
function upperBound(values: readonly number[], value: number): number {
	let low = 0;
	let high = values.length;
	while (low < high) {
		const mid = (low + high) >>> 1;
		if (values[mid] <= value) low = mid + 1;
		else high = mid;
	}
	return low;
}

/** Integrate SV once per timing edit; each position lookup is O(log timing points). */
export function createScrollPosition(timing: readonly TimingPoint[]): (time: number) => number {
	const times: number[] = [];
	const positions: number[] = [];
	const speeds: number[] = [];
	let time = timing[0]?.time ?? 0;
	let position = time;
	let speed = 1;
	for (const point of timing) {
		position += (point.time - time) * speed;
		time = point.time;
		speed = point.uninherited ? 1 : Math.max(0.1, Math.min(10, -100 / point.beatLength));
		times.push(time);
		positions.push(position);
		speeds.push(speed);
	}
	return (at) => {
		const index = upperBound(times, at) - 1;
		return index < 0 ? at : positions[index] + (at - times[index]) * speeds[index];
	};
}

/** Notes are sorted by start time. Prefix ends retain holds crossing the viewport. */
export function createNoteIndex(notes: readonly Note[]) {
	const times = notes.map((note) => note.time);
	let lastEnd = -Infinity;
	const ends = notes.map((note) => (lastEnd = Math.max(lastEnd, note.endTime)));
	return {
		after: (time: number) => upperBound(times, time),
		firstVisible: (time: number) => {
			let low = 0;
			let high = ends.length;
			while (low < high) {
				const mid = (low + high) >>> 1;
				if (ends[mid] < time) low = mid + 1;
				else high = mid;
			}
			return low;
		},
	};
}
