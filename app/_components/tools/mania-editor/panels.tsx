"use client";
import { memo, useState, type FormEvent, type ReactNode } from "react";
import { type Beatmap, type Note, type TimingPoint, newId, validateTiming, validateKeyCount, SUPPORTED_KEYS } from "./model";
import { editNotes } from "./editing";
type PanelProps = {
	map: Beatmap;
	onEdit: (map: Beatmap) => void;
	onError: (message: string) => void;
};
function Field({ label, children }: {
	label: string;
	children: ReactNode;
}) {
	return (
		<label className="mania-field">
			<span>{label}</span>
			{children}
		</label>
	);
}
function attempt(onError: PanelProps["onError"], work: () => void) {
	try {
		work();
	} catch (error) {
		onError(error instanceof Error ? error.message : "修改失败。");
	}
}
const number = (form: FormData, key: string) => Number(form.get(key));
const text = (form: FormData, key: string) => String(form.get(key) || "");
export function MetadataPanel({ map, onEdit, onError }: PanelProps) {
	const fields = [["Title", "曲名"], ["TitleUnicode", "曲名（原文）"], ["Artist", "艺术家"], ["ArtistUnicode", "艺术家（原文）"], ["Creator", "谱师"], ["Version", "难度名称"], ["Source", "来源"], ["Tags", "标签"]];
	return (
		<form
			key={JSON.stringify([map.metadata, map.difficulty, map.general])}
			className="mania-form"
			onSubmit={(event) => {
				event.preventDefault();
				const form = new FormData(event.currentTarget);
				attempt(onError, () => {
					const keys = number(form, "keys");
					validateKeyCount(keys);
					if (map.notes.some((n) => n.lane >= keys))
						throw new Error("现有音符超出新键数，请先移动或删除这些音符。");
					onEdit({ ...map, keys, metadata: { ...map.metadata, ...Object.fromEntries(fields.map(([key]) => [key, text(form, key)])) }, general: { ...map.general, AudioFilename: text(form, "audio"), PreviewTime: text(form, "previewTime") }, difficulty: { ...map.difficulty, CircleSize: String(keys), HPDrainRate: text(form, "hp"), OverallDifficulty: text(form, "od") } });
				});
			}}
		>
			{fields.map(([key, label]) => <Field key={key} label={label}><input name={key} defaultValue={map.metadata[key] || ""} required={["Title", "Artist", "Creator", "Version"].includes(key)} maxLength={500} /></Field>)}
			<Field label="键数">
				<select name="keys" aria-label="键数" defaultValue={map.keys}>
					{SUPPORTED_KEYS.map((keys) => (
						<option key={keys} value={keys}>
							{keys}
							K
						</option>
					))}
				</select>
			</Field>
			<div className="mania-pair">
				<Field label="HP"><input name="hp" type="number" min={0} max={10} step={0.1} defaultValue={map.difficulty.HPDrainRate || "5"} required /></Field>
				<Field label="OD"><input name="od" type="number" min={0} max={10} step={0.1} defaultValue={map.difficulty.OverallDifficulty || "8"} required /></Field>
			</div>
			<Field label="音频文件名"><input name="audio" defaultValue={map.general.AudioFilename || ""} /></Field>
			<Field label="预览时间 (ms)"><input name="previewTime" type="number" min={-1} max={86400000} step={1} defaultValue={map.general.PreviewTime ?? "-1"} required /></Field>
			<p className="mania-muted">预览点显示为时间轴上的黄线；-1 表示未设置。</p>
			<button className="mania-primary" type="submit">应用谱面设置</button>
		</form>
	);
}
export function TimingPanel({ map, time, onEdit, onError }: PanelProps & {
	time: number;
}) {
	const [id, setId] = useState<string | null>(null);
	const selected = map.timing.find((p) => p.id === id);
	const [kind, setKind] = useState<"bpm" | "sv">("bpm");
	const [newPointRevision, setNewPointRevision] = useState(0);
	const point = selected || { id: "new", time: Math.round(time), beatLength: kind === "bpm" ? 500 : -100, meter: 4, sampleSet: 0, sampleIndex: 0, volume: 80, uninherited: kind === "bpm", effects: 0 };
	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		attempt(onError, () => {
			const next: TimingPoint = {
				id: selected?.id || newId(), time: number(form, "time"), beatLength: point.uninherited ? 60000 / number(form, "bpm") : -100 / number(form, "sv"),
				meter: number(form, "meter"), sampleSet: number(form, "sampleSet"), sampleIndex: number(form, "sampleIndex"), volume: number(form, "volume"),
				uninherited: point.uninherited, effects: (point.effects & ~1) | Number(form.get("kiai") === "on"),
			};
			const timing = [...map.timing.filter((p) => p.id !== next.id), next].sort((a, b) => a.time - b.time || Number(b.uninherited) - Number(a.uninherited));
			validateTiming(timing);
			onEdit({ ...map, timing });
			setId(next.id);
		});
	};
	return (
		<div className="mania-form">
			<p className="mania-muted">红点设置 BPM 和节拍起点；绿点设置 SV 与音量。变 BPM 会重置 SV。</p>
			<div className="mania-timing-list" aria-label="定时点列表">
				{map.timing.map((p, i) => (
					<button type="button" key={p.id} aria-label={`编辑定时点 ${i + 1}`} className={p.id === id ? "is-active" : ""} onClick={() => setId(p.id)}>
						<span className={p.uninherited ? "mania-dot is-red" : "mania-dot"} />
						<span>
							{Math.round(p.time)}
							{" "}
							ms
						</span>
						<strong>{p.uninherited ? `${(60000 / p.beatLength).toFixed(1)} BPM` : `${(-100 / p.beatLength).toFixed(2)}× SV`}</strong>
					</button>
				))}
			</div>
			<div className="mania-pair">
				<button
					type="button"
					onClick={() => {
						setId(null);
						setKind("bpm");
						setNewPointRevision((revision) => revision + 1);
					}}
				>
					+ BPM 点
				</button>
				<button
					type="button"
					onClick={() => {
						setId(null);
						setKind("sv");
						setNewPointRevision((revision) => revision + 1);
					}}
				>
					+ SV 点
				</button>
			</div>
			<form key={`${point.id}-${JSON.stringify(selected)}-${kind}-${newPointRevision}`} className="mania-form" onSubmit={submit}>
				<h3>
					{selected ? "编辑" : "新增"}
					{point.uninherited ? " BPM" : " SV"}
					{" "}
					定时点
				</h3>
				<Field label="偏移 (ms)"><input type="number" name="time" step="any" min={-86400000} max={86400000} defaultValue={point.time} required /></Field>
				{point.uninherited ? <Field label="BPM"><input type="number" name="bpm" min={0.1} max={60000} step="any" defaultValue={60000 / point.beatLength} required /></Field> : <Field label="SV 倍率"><input type="number" name="sv" min={0.1} max={10} step="any" defaultValue={-100 / point.beatLength} required /></Field>}
				<div className="mania-pair">
					<Field label="每小节拍数"><input type="number" name="meter" min={1} max={32} defaultValue={point.meter} required /></Field>
					<Field label="音量 (%)"><input type="number" name="volume" min={0} max={100} defaultValue={point.volume} required /></Field>
				</div>
				<Field label="采样集">
					<select name="sampleSet" defaultValue={point.sampleSet}>
						<option value={0}>默认</option>
						<option value={1}>Normal</option>
						<option value={2}>Soft</option>
						<option value={3}>Drum</option>
					</select>
				</Field>
				<Field label="采样编号"><input type="number" name="sampleIndex" min={0} defaultValue={point.sampleIndex} required /></Field>
				<label className="mania-check">
					<input name="kiai" type="checkbox" defaultChecked={!!(point.effects & 1)} />
					Kiai
				</label>
				<button className="mania-primary" type="submit">应用定时点</button>
				{selected && (
					<button
						type="button"
						className="mania-danger"
						onClick={() => attempt(onError, () => {
							const timing = map.timing.filter((p) => p.id !== selected.id);
							validateTiming(timing);
							onEdit({ ...map, timing });
							setId(null);
						})}
					>
						删除此定时点
					</button>
				)}
			</form>
		</div>
	);
}
export const NotePanel = memo(function NotePanel({ map, notes, onEdit, onError }: PanelProps & {
	notes: Note[];
}) {
	const first = notes[0];
	const sample = (first?.sample || "0:0:0:0:").split(":");
	return (
		<div className="mania-form">
			{notes.length > 0 && <h3>{`已选 ${notes.length} 个音符`}</h3>}
			{!notes.length
				? <p className="mania-muted">选择音符查看属性。使用单键或长条工具在轨道上绘制；选择工具可框选、拖动音符，拖动长条尾部调整时值。</p>
				: (
					<form
						className="mania-form"
						key={JSON.stringify(notes)}
						onSubmit={(event) => {
							event.preventDefault();
							const form = new FormData(event.currentTarget);
							attempt(onError, () => {
								const sampleText = [text(form, "normal"), text(form, "addition"), text(form, "index"), text(form, "volume"), text(form, "file")].join(":");
								const hitSound = [2, 4, 8].reduce((bits, bit) => bits | (form.get(`sound${bit}`) ? bit : 0), 0);
								const changes = notes.map((n) => {
									const time = notes.length === 1 ? number(form, "time") : n.time;
									const endTime = notes.length === 1 ? number(form, "end") : n.endTime;
									return { ...n, lane: notes.length === 1 ? number(form, "lane") - 1 : n.lane, time, endTime, type: (n.type & ~(1 | 128)) | (endTime > time ? 128 : 1), hitSound, sample: sampleText };
								});
								onEdit(editNotes(map, changes));
							});
						}}
					>
						{notes.length === 1 && (
							<>
								<Field label="列"><input type="number" name="lane" min={1} max={map.keys} defaultValue={first.lane + 1} required /></Field>
								<Field label="开始 (ms)"><input type="number" name="time" min={0} max={86400000} defaultValue={first.time} required /></Field>
								<Field label="结束 (ms)"><input type="number" name="end" min={0} max={86400000} defaultValue={first.endTime} required /></Field>
								<p className="mania-muted">开始与结束相同为单键，结束较晚为长条。</p>
							</>
						)}
						<h4>
							音效
							{notes.length > 1 ? "（应用到所有选中音符）" : ""}
						</h4>
						<div className="mania-sounds">
							{[[2, "Whistle"], [4, "Finish"], [8, "Clap"]].map(([bit, label]) => (
								<label className="mania-check" key={bit}>
									<input type="checkbox" name={`sound${bit}`} defaultChecked={!!(first.hitSound & Number(bit))} />
									{label}
								</label>
							))}
						</div>
						{[["normal", "主采样集", sample[0]], ["addition", "附加采样集", sample[1]]].map(([name, label, value]) => (
							<Field key={name} label={label}>
								<select name={name} defaultValue={value || "0"}>
									<option value={0}>继承</option>
									<option value={1}>Normal</option>
									<option value={2}>Soft</option>
									<option value={3}>Drum</option>
								</select>
							</Field>
						))}
						<div className="mania-pair">
							<Field label="采样编号"><input name="index" type="number" min={0} defaultValue={sample[2] || 0} required /></Field>
							<Field label="音量 (0=继承)"><input name="volume" type="number" min={0} max={100} defaultValue={sample[3] || 0} required /></Field>
						</div>
						<Field label="自定义采样文件"><input name="file" defaultValue={sample.slice(4).join(":")} placeholder="sample.wav" /></Field>
						<button className="mania-primary" type="submit">应用音符属性</button>
					</form>
				)}
			<p className="mania-muted">优先播放谱面包内的采样；缺失采样使用合成提示音，不包含 osu! 默认皮肤音效。</p>
		</div>
	);
});
