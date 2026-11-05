export type Note = {
	id: string;
	lane: number;
	time: number;
	endTime: number;
	type: number;
	hitSound: number;
	sample: string;
};
export type TimingPoint = {
	id: string;
	time: number;
	beatLength: number;
	meter: number;
	sampleSet: number;
	sampleIndex: number;
	volume: number;
	uninherited: boolean;
	effects: number;
};
export type Beatmap = {
	format: number;
	keys: number;
	general: Record<string, string>;
	editor: Record<string, string>;
	metadata: Record<string, string>;
	difficulty: Record<string, string>;
	sections: Record<string, string[]>;
	notes: Note[];
	timing: TimingPoint[];
};
export type Chart = {
	filename: string;
	beatmap: Beatmap;
};
export type Project = {
	charts: Chart[];
	assets: Record<string, Uint8Array>;
};
export const MAX_TIME = 86400000;
export const SUPPORTED_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function validateKeyCount(keys: number): void {
	if (!SUPPORTED_KEYS.includes(keys)) throw new Error("键数必须为 1–10。");
}
export function newId(): string {
	return crypto.randomUUID();
}
function numeric(value: string | undefined, label: string, fallback?: number): number {
	const result = value === undefined || value.trim() === "" ? fallback : Number(value);
	if (result === undefined || !Number.isFinite(result))
		throw new Error(`${label}必须是有效数字。`);
	return result;
}
function pairs(lines: string[] = []): Record<string, string> {
	const result: Record<string, string> = Object.create(null);
	for (const line of lines) {
		if (line.trimStart().startsWith("//"))
			continue;
		const colon = line.indexOf(":");
		if (colon >= 0)
			result[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
	}
	return result;
}
export function validateTiming(points: TimingPoint[]): void {
	if (!points.some((p) => p.uninherited))
		throw new Error("至少需要一个 BPM 定时点。");
	for (const p of points) {
		if (!Number.isFinite(p.time) || Math.abs(p.time) > MAX_TIME)
			throw new Error("定时点时间超出范围。");
		if (!Number.isFinite(p.beatLength) || (p.uninherited ? p.beatLength < 1 || p.beatLength > 600000 : p.beatLength >= 0))
			throw new Error("BPM / 节拍长度无效。");
		if (![p.meter, p.sampleSet, p.sampleIndex, p.volume, p.effects].every(Number.isInteger)
			|| p.meter < 1 || p.meter > 32 || p.sampleSet < 0 || p.sampleSet > 3
			|| p.sampleIndex < 0 || p.volume < 0 || p.volume > 100 || p.effects < 0)
			throw new Error("定时点的拍号、采样或音量无效。");
	}
}
export function validateNote(note: Note, keys: number): void {
	if (!Number.isInteger(note.lane) || note.lane < 0 || note.lane >= keys)
		throw new Error("音符超出键位范围。");
	if (!Number.isFinite(note.time) || note.time < 0 || note.time > MAX_TIME)
		throw new Error("音符时间无效。");
	if (!Number.isFinite(note.endTime) || note.endTime < note.time || note.endTime > MAX_TIME
		|| ((note.type & 128) !== 0 && note.endTime <= note.time))
		throw new Error("长条结束时间必须晚于开始时间。");
	if (!Number.isInteger(note.hitSound) || note.hitSound < 0 || note.hitSound > 15)
		throw new Error("音效标记无效。");
	if (/[\r\n,]/.test(note.sample))
		throw new Error("采样文件名不能含逗号或换行。");
	const sample = note.sample.split(":");
	for (let i = 0; i < 4; i++) {
		const n = Number(sample[i] || 0);
		if (!Number.isInteger(n) || n < 0 || (i < 2 && n > 3) || (i === 3 && n > 100))
			throw new Error("采样设置无效。");
	}
}
export function parseBeatmap(text: string): Beatmap {
	if (text.length > 16000000)
		throw new Error("谱面文本过大（上限 16 MB）。");
	const header = text.replace(/^\uFEFF/, "").match(/^osu file format v(\d+)/);
	if (!header)
		throw new Error("这不是有效的 .osu 文件。");
	const sections: Record<string, string[]> = Object.create(null);
	let section = "";
	for (const line of text.split(/\r?\n/).slice(1)) {
		const match = line.trim().match(/^\[([^\]]+)\]$/);
		if (match) {
			section = match[1];
			sections[section] ??= [];
		} else if (section)
			sections[section].push(line);
	}
	const general = pairs(sections.General);
	general.AudioFilename ??= "";
	if (general.Mode !== "3")
		throw new Error("仅支持原生 osu!mania 谱面（Mode: 3）。");
	const difficulty = pairs(sections.Difficulty);
	const keys = numeric(difficulty.CircleSize, "键数");
	validateKeyCount(keys);
	const dataLines = (name: string) => (sections[name] || []).filter((l) => l.trim() && !l.trimStart().startsWith("//"));
	const timing = dataLines("TimingPoints").map((line, index): TimingPoint => {
		const p = line.split(",");
		return {
			id: `timing-${index}`, time: numeric(p[0], "定时点时间"), beatLength: numeric(p[1], "BPM"),
			meter: numeric(p[2], "拍号", 4), sampleSet: numeric(p[3], "采样集", 0), sampleIndex: numeric(p[4], "采样编号", 0),
			volume: numeric(p[5], "音量", 100), uninherited: p[6] !== "0", effects: numeric(p[7], "效果", 0),
		};
	}).sort((a, b) => a.time - b.time);
	validateTiming(timing);
	const lines = dataLines("HitObjects");
	if (lines.length > 100000)
		throw new Error("音符超过 100,000 个。");
	const notes = lines.map((line, index): Note => {
		const p = line.split(",");
		const type = numeric(p[3], "音符类型");
		if (!Number.isInteger(type) || (!(type & 1) && !(type & 128)) || (type & 10))
			throw new Error("谱面包含非 mania 音符。");
		const x = numeric(p[0], "音符列");
		const time = numeric(p[2], "音符时间");
		const hold = (type & 128) !== 0;
		const colon = (p[5] || "").indexOf(":");
		const note: Note = {
			id: `note-${index}`, lane: Math.max(0, Math.min(keys - 1, Math.floor(x * keys / 512))), time,
			endTime: hold ? numeric(colon < 0 ? p[5] : p[5].slice(0, colon), "长条结束时间") : time,
			type, hitSound: numeric(p[4], "音效", 0), sample: (hold ? (colon < 0 ? "" : p[5].slice(colon + 1)) : p[5]) || "0:0:0:0:",
		};
		validateNote(note, keys);
		return note;
	}).sort((a, b) => a.time - b.time || a.lane - b.lane);
	return { format: Number(header[1]), keys, general, editor: pairs(sections.Editor), metadata: pairs(sections.Metadata), difficulty, sections, notes, timing };
}
export function serializeBeatmap(map: Beatmap): string {
	validateKeyCount(map.keys);
	validateTiming(map.timing);
	const output = { ...map.sections };
	for (const [name, values] of Object.entries({ General: { ...map.general, Mode: "3" }, Editor: map.editor, Metadata: map.metadata, Difficulty: { ...map.difficulty, CircleSize: String(map.keys) } })) {
		output[name] = Object.entries(values).map(([key, value]) => {
			if (/[\r\n]/.test(value))
				throw new Error("谱面字段不能包含换行。");
			return `${key}:${value}`;
		});
	}
	output.TimingPoints = [...map.timing].sort((a, b) => a.time - b.time).map((p) => [p.time, p.beatLength, p.meter, p.sampleSet, p.sampleIndex, p.volume, Number(p.uninherited), p.effects].join(","));
	output.HitObjects = [...map.notes].sort((a, b) => a.time - b.time || a.lane - b.lane).map((note) => {
		validateNote(note, map.keys);
		const hold = note.endTime > note.time;
		const type = (note.type & ~(1 | 128)) | (hold ? 128 : 1);
		return [Math.floor((note.lane + 0.5) * 512 / map.keys), 192, Math.round(note.time), type, note.hitSound, `${hold ? `${Math.round(note.endTime)}:` : ""}${note.sample}`].join(",");
	});
	return `osu file format v${map.format}\r\n\r\n${Object.entries(output).map(([name, lines]) => `[${name}]\r\n${lines.join("\r\n").trimEnd()}`).join("\r\n\r\n")}\r\n`;
}
export function createBeatmap(keys = 4): Beatmap {
	return parseBeatmap(`osu file format v14\n[General]\nAudioFilename:\nMode:3\nSampleSet:Normal\n[Editor]\nBeatDivisor:4\n[Metadata]\nTitle:Untitled\nArtist:Unknown\nCreator:Mapper\nVersion:Default\nBeatmapID:0\nBeatmapSetID:-1\n[Difficulty]\nCircleSize:${keys}\nHPDrainRate:5\nOverallDifficulty:8\nSliderMultiplier:1.4\nSliderTickRate:1\n[Events]\n[TimingPoints]\n0,500,4,1,0,80,1,0\n[HitObjects]\n`);
}
export function createNote(lane: number, time: number, endTime = time): Note {
	return { id: newId(), lane, time: Math.round(time), endTime: Math.round(endTime), type: endTime > time ? 128 : 1, hitSound: 0, sample: "0:0:0:0:" };
}
