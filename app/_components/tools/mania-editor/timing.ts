import type { Beatmap } from "./model";
export function timingAt(map: Beatmap, time: number) {
	const first = map.timing.find((p) => p.uninherited)!;
	let beatLength = first.beatLength;
	let offset = first.time;
	let sv = 1;
	let sampleSet = ({ Normal: 1, Soft: 2, Drum: 3 }[map.general.SampleSet] || 1);
	let sampleIndex = 0;
	let volume = 100;
	for (const point of map.timing) {
		if (point.time > time)
			break;
		if (point.uninherited) {
			beatLength = point.beatLength;
			offset = point.time;
			sv = 1;
		} else
			sv = Math.max(0.1, Math.min(10, -100 / point.beatLength));
		sampleSet = point.sampleSet || ({ Normal: 1, Soft: 2, Drum: 3 }[map.general.SampleSet] || 1);
		sampleIndex = point.sampleIndex;
		volume = point.volume;
	}
	return { beatLength, offset, sv, sampleSet, sampleIndex, volume };
}
export function snapTime(map: Beatmap, time: number, divisor: number): number {
	const { offset, beatLength } = timingAt(map, time);
	const step = beatLength / divisor;
	return Math.max(0, Math.round(offset + Math.round((time - offset) / step) * step));
}
/** Move between actual grid lines, including red-line resets and integer-ms rounding. */
export function stepGridTime(map: Beatmap, time: number, divisor: number, steps: number, maxTime = Infinity): number {
	const reds = map.timing.filter((p) => p.uninherited);
	const forward = steps > 0;
	let cursor = time;
	for (let count = 0; count < Math.abs(steps); count++) {
		let next = forward ? Infinity : -Infinity;
		for (let i = 0; i < reds.length; i++) {
			const point = reds[i];
			const start = Math.max(0, i === 0 ? 0 : point.time);
			const end = reds[i + 1]?.time ?? Infinity;
			const step = Math.max(1, point.beatLength / divisor);
			let tick = forward
				? Math.max(Math.ceil((start - point.time) / step), Math.floor((cursor - point.time) / step))
				: Math.ceil((Math.min(cursor, end, maxTime + 0.001) - point.time) / step) - 1;
			let raw = point.time + tick * step;
			while (forward ? Math.round(raw) <= cursor : Math.round(raw) >= cursor) {
				tick += forward ? 1 : -1;
				raw = point.time + tick * step;
			}
			const at = Math.round(raw);
			if (raw < start || raw >= end || at > maxTime || at < 0) continue;
			next = forward ? Math.min(next, at) : Math.max(next, at);
		}
		if (!Number.isFinite(next))
			return forward && Number.isFinite(maxTime) ? stepGridTime(map, maxTime + 0.001, divisor, -1, maxTime) : 0;
		cursor = next;
	}
	return cursor;
}
export function scrollDistance(map: Beatmap, from: number, to: number): number {
	if (to < from)
		return -scrollDistance(map, to, from);
	let cursor = from;
	let sv = timingAt(map, from).sv;
	let distance = 0;
	for (const point of map.timing) {
		if (point.time <= from)
			continue;
		if (point.time >= to)
			break;
		distance += (point.time - cursor) * sv;
		cursor = point.time;
		sv = point.uninherited ? 1 : Math.max(0.1, Math.min(10, -100 / point.beatLength));
	}
	return distance + (to - cursor) * sv;
}
export function beatLines(map: Beatmap, from: number, to: number, divisor: number): {
	time: number;
	major: boolean;
	bar: boolean;
}[] {
	const reds = map.timing.filter((p) => p.uninherited);
	const lines: {
		time: number;
		major: boolean;
		bar: boolean;
	}[] = [];
	for (let i = 0; i < reds.length; i++) {
		const p = reds[i];
		const start = Math.max(from, i === 0 ? 0 : p.time);
		const end = Math.min(to, reds[i + 1]?.time ?? to);
		const step = p.beatLength / divisor;
		for (let tick = Math.ceil((start - p.time) / step); p.time + tick * step < end && lines.length < 1000; tick++) {
			lines.push({ time: p.time + tick * step, major: tick % divisor === 0, bar: tick % (divisor * p.meter) === 0 });
		}
	}
	return lines;
}
