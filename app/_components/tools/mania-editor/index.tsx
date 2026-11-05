"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@iconify-icon/react";
import { type Beatmap, type Chart, type Note, type Project, createBeatmap, newId, parseBeatmap, serializeBeatmap } from "./model";
import { commitHistory, createHistory, editNotes, mirrorNotes, moveNotes, pasteNotes, redoHistory, undoHistory } from "./editing";
import { assetPath, downloadFile, exportArchive, importArchive, MAX_ARCHIVE_BYTES } from "./archive";
import { listDrafts, loadDraft, saveDraft, type DraftSummary } from "./storage";
import { DraftDialog } from "./draft-dialog";
import { snapTime, stepGridTime, timingAt } from "./timing";
import { Playfield, type EditMode } from "./playfield";
import { DensityOverview, SongTimeline } from "./navigation";
import { TimeRuler } from "./time-ruler";
import { MetadataPanel, NotePanel, TimingPanel } from "./panels";
import { usePlayback } from "./use-playback";
import "./mania-editor.css";
const SNAP_DIVISORS = [1, 2, 3, 4, 6, 8, 12, 16, 32];
function displayTime(time: number): string {
	return `${Math.floor(time / 60000).toString().padStart(2, "0")}:${Math.floor(time / 1000 % 60).toString().padStart(2, "0")}.${Math.floor(time % 1000).toString().padStart(3, "0")}`;
}
export function ManiaEditor() {
	const [history, setHistory] = useState(() => createHistory<Chart[]>([{ filename: "Untitled.osu", beatmap: createBeatmap() }]));
	const [assets, setAssets] = useState<Project["assets"]>({});
	const [activeIndex, setActiveIndex] = useState(0);
	const [selected, setSelected] = useState<string[]>([]);
	const [mode, setMode] = useState<EditMode>("note");
	const [preview, setPreview] = useState(false);
	const [inspectorOpen, setInspectorOpen] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
	const [draftMode, setDraftMode] = useState<"save" | "restore" | null>(null);
	const [drafts, setDrafts] = useState<DraftSummary[]>([]);
	const [divisor, setDivisor] = useState(4);
	const [windowMs, setWindowMs] = useState(2500);
	const viewRanges = [...new Set([500, 1000, 1500, 2500, 4000, 6000, 10000, windowMs])].sort((a, b) => a - b);
	const [tab, setTab] = useState<"notes" | "timing" | "metadata">("notes");
	const [status, setStatus] = useState("准备就绪 · 导入谱面，或从空白谱面开始");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [dirty, setDirty] = useState(false);
	const clipboard = useRef<Note[]>([]);
	const charts = history.present;
	const index = Math.min(activeIndex, charts.length - 1);
	const chart = charts[index];
	const map = chart.beatmap;
	const report = useCallback((message: string) => setError(message), []);
	const playback = usePlayback(map, chart.filename, assets, report);
	const currentTiming = timingAt(map, playback.time);
	const selectedNotes = useMemo(() => {
		const ids = new Set(selected);
		return map.notes.filter((n) => ids.has(n.id));
	}, [map.notes, selected]);
	const bookmarks = [...new Set((map.editor.Bookmarks || "").split(",").filter(Boolean).map(Number).filter((at) => Number.isFinite(at) && at >= 0).map(Math.round))].sort((a, b) => a - b);
	const bookmarkTime = Math.round(playback.time);
	const hasBookmark = bookmarks.includes(bookmarkTime);
	const previousBookmark = bookmarks.findLast((at) => at < bookmarkTime);
	const nextBookmark = bookmarks.find((at) => at > bookmarkTime);
	useEffect(() => {
		if (!dirty)
			return;
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);
	const edit = useCallback((next: Beatmap) => {
		setHistory((state) => commitHistory(state, state.present.map((c, i) => i === index ? { ...c, beatmap: next } : c)));
		setDirty(true);
		setError("");
		setStatus("已修改 · 请保存草稿或导出");
	}, [index]);
	function run(work: () => void) {
		try {
			work();
			setError("");
		} catch (cause) {
			report(cause instanceof Error ? cause.message : "操作失败。");
		}
	}
	async function task(work: () => Promise<void>) {
		if (busy)
			return;
		setBusy(true);
		setError("");
		try {
			await work();
		} catch (cause) {
			report(cause instanceof Error ? cause.message : "操作失败。");
		} finally {
			setBusy(false);
		}
	}
	function replace(project: Project) {
		playback.pause();
		setHistory(createHistory(project.charts));
		setAssets(project.assets);
		setActiveIndex(0);
		setSelected([]);
		setDirty(false);
		playback.setLoop({ enabled: false, start: 0, end: 5000 });
		playback.seek(0);
	}
	function canReplace() {
		return !dirty || window.confirm("当前修改尚未保存到草稿。继续会替换工作区，是否继续？");
	}
	function newProject() {
		if (busy || !canReplace()) return;
		replace({ charts: [{ filename: "Untitled.osu", beatmap: createBeatmap() }], assets: {} });
		clipboard.current = [];
		setMode("note");
		setPreview(false);
		setInspectorOpen(false);
		setHelpOpen(false);
		setTab("notes");
		setDivisor(4);
		setWindowMs(2500);
		playback.setRate(1);
		playback.setVolume(0.7);
		playback.setHitsounds(true);
		setError("");
		setStatus("已新建空白谱面");
	}
	async function importFile(file?: File) {
		if (busy || !file || !canReplace())
			return;
		playback.pause();
		await task(async () => {
			if (file.size > MAX_ARCHIVE_BYTES)
				throw new Error("文件超过 128 MB 上限。");
			const project = file.name.toLowerCase().endsWith(".osz")
				? await importArchive(new Uint8Array(await file.arrayBuffer()))
				: { charts: [{ filename: file.name, beatmap: parseBeatmap(await file.text()) }], assets: {} };
			replace(project);
			setStatus(`已导入 ${project.charts.length} 个 mania 难度 · 文件仅保存在此浏览器`);
		});
	}
	async function attachFiles(files: FileList | null, audio: boolean) {
		if (!files?.length)
			return;
		// FileList is live; resetting the input clears it while arrayBuffer is pending.
		const picked = Array.from(files);
		playback.pause();
		await task(async () => {
			const next = { ...assets };
			for (const file of picked) {
				if (file.size > 64 * 1024 * 1024)
					throw new Error("单个资源不能超过 64 MB。");
				const path = assetPath(chart.filename, file.name);
				if (!path)
					throw new Error("资源文件名无效。");
				next[path] = new Uint8Array(await file.arrayBuffer());
			}
			if (Object.values(next).reduce((sum, bytes) => sum + bytes.byteLength, 0) > 256 * 1024 * 1024)
				throw new Error("资源总计不能超过 256 MB。");
			setAssets(next);
			if (audio)
				edit({ ...map, general: { ...map.general, AudioFilename: picked[0].name } });
			setDirty(true);
			setStatus(audio ? "音频已载入" : `已添加 ${picked.length} 个资源文件`);
		});
	}
	function undo() {
		if (!history.past.length) return;
		playback.pause();
		setHistory(undoHistory);
		setSelected([]);
		setDirty(true);
		setError("");
	}
	function redo() {
		if (!history.future.length) return;
		playback.pause();
		setHistory(redoHistory);
		setSelected([]);
		setDirty(true);
		setError("");
	}
	function remove() {
		if (selected.length) {
			edit(editNotes(map, [], selected));
			setSelected([]);
		}
	}
	function copy() {
		clipboard.current = selectedNotes.map((n) => ({ ...n }));
		setStatus(`已复制 ${selectedNotes.length} 个音符（编辑器内剪贴板）`);
	}
	function mirror() {
		if (selectedNotes.length)
			run(() => edit(mirrorNotes(map, selected)));
	}
	function changeBookmark(action: "add" | "remove" | "toggle") {
		const add = action === "add" || (action === "toggle" && !hasBookmark);
		if (add === hasBookmark) return;
		const next = add ? [...bookmarks, bookmarkTime].sort((a, b) => a - b) : bookmarks.filter((at) => at !== bookmarkTime);
		edit({ ...map, editor: { ...map.editor, Bookmarks: next.join(",") } });
	}
	function jumpBookmark(direction: -1 | 1) {
		const target = direction < 0 ? previousBookmark : nextBookmark;
		if (target !== undefined) playback.seek(target);
	}
	function paste() {
		if (!clipboard.current.length) return;
		run(() => {
			const next = pasteNotes(map, clipboard.current, snapTime(map, playback.time, divisor));
			const existing = new Set(map.notes.map((n) => n.id));
			edit(next);
			setSelected(next.notes.filter((n) => !existing.has(n.id)).map((n) => n.id));
		});
	}
	async function openDrafts(mode: "save" | "restore") {
		playback.pause();
		await task(async () => {
			setDrafts(await listDrafts());
			setHelpOpen(false);
			setDraftMode(mode);
		});
	}
	async function save(name: string, id?: string) {
		await task(async () => {
			const draft = await saveDraft({ charts, assets }, name, id);
			setDirty(false);
			setDraftMode(null);
			setStatus(`草稿已保存 · ${draft.name}`);
		});
	}
	async function restore(id: string) {
		if (!canReplace()) return;
		await task(async () => {
			const project = await loadDraft(id);
			if (!project) throw new Error("草稿已不存在，请重新打开列表。");
			replace(project);
			setDraftMode(null);
			setStatus(`已恢复草稿 · ${drafts.find((draft) => draft.id === id)?.name || ""}`);
		});
	}
	function keyDown(event: KeyboardEvent<HTMLElement>) {
		if (event.nativeEvent.isComposing) return;
		if (event.key === "Escape" && (helpOpen || inspectorOpen)) {
			setHelpOpen(false);
			setInspectorOpen(false);
			return;
		}
		const target = event.target as HTMLElement;
		const key = event.key.toLowerCase();
		// Range controls keep their native seeking keys, but Space belongs to the player.
		if (key === " " && !target.closest("input:not([type=range]), textarea, select, [contenteditable=true]")) {
			event.preventDefault();
			if (!busy && !event.repeat) void playback.toggle();
			return;
		}
		if (target.closest("input, textarea, select, [contenteditable=true]"))
			return;
		const mod = event.ctrlKey || event.metaKey;
		if (mod && key === "s") {
			event.preventDefault();
			void openDrafts("save");
			return;
		}
		if (busy)
			return;
		if (mod && key === "b") {
			event.preventDefault();
			if (!playback.playing && !event.repeat) changeBookmark("toggle");
			return;
		}
		if (mod && (key === "arrowleft" || key === "arrowright")) {
			event.preventDefault();
			jumpBookmark(key === "arrowleft" ? -1 : 1);
			return;
		}
		if (playback.playing)
			return;
		if (mod && key === "z") {
			event.preventDefault();
			if (event.shiftKey)
				redo();
			else
				undo();
		} else if (mod && key === "y") {
			event.preventDefault();
			redo();
		} else if (mod && key === "a") {
			event.preventDefault();
			setSelected(map.notes.map((n) => n.id));
		} else if (mod && (key === "c" || key === "x")) {
			event.preventDefault();
			copy();
			if (key === "x")
				remove();
		} else if (mod && key === "v") {
			event.preventDefault();
			paste();
		} else if (mod && key === "h") {
			event.preventDefault();
			mirror();
		} else if (key === "delete") {
			event.preventDefault();
			remove();
		} else if (key === "escape")
			setSelected([]);
		else if (["1", "2", "3"].includes(key)) {
			setPreview(false);
			setMode(({ 1: "select", 2: "note", 3: "hold" } as const)[key as "1"]);
		} else if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
			event.preventDefault();
			const step = currentTiming.beatLength / divisor * (event.shiftKey ? 4 : 1);
			const dt = key === "arrowup" ? step : key === "arrowdown" ? -step : 0;
			if (selected.length)
				run(() => edit(moveNotes(map, selected, dt, key === "arrowleft" ? -1 : key === "arrowright" ? 1 : 0)));
			else
				playback.seek(stepGridTime(map, playback.time, divisor, (["arrowup", "arrowright"].includes(key) ? 1 : -1) * (event.shiftKey ? 4 : 1), playback.end));
		}
	}
	return (
		<section
			className="mania-studio"
			onKeyDown={keyDown}
			onDragOver={(event) => {
				if (!event.dataTransfer.types.includes("Files")) return;
				event.preventDefault();
				event.dataTransfer.dropEffect = busy ? "none" : "copy";
			}}
			onDrop={(event) => {
				if (!event.dataTransfer.types.includes("Files")) return;
				event.preventDefault();
				const file = Array.from(event.dataTransfer.files).find((file) => file.name.toLowerCase().endsWith(".osz"));
				void importFile(file);
			}}
			aria-label="Mania Studio"
			tabIndex={-1}
		>
			<fieldset className="mania-workspace" disabled={busy}>
				<div className="mania-filebar">
					<label className="mania-button mania-primary">
						<Icon icon="mdi:folder-open-outline" width={18} />
						导入谱面
						<input
							aria-label="导入谱面文件"
							type="file"
							accept=".osu,.osz"
							onChange={(e) => {
								void importFile(e.target.files?.[0]);
								e.target.value = "";
							}}
						/>
					</label>
					<label className="mania-button">
						<Icon icon="mdi:music-note-outline" width={17} />
						载入音频
						<input
							aria-label="载入音频文件"
							type="file"
							accept="audio/*,.ogg"
							onChange={(e) => {
								void attachFiles(e.target.files, true);
								e.target.value = "";
							}}
						/>
					</label>
					<label className="mania-button">
						添加采样
						<input
							aria-label="添加采样文件"
							type="file"
							accept="audio/*,.ogg"
							multiple
							onChange={(e) => {
								void attachFiles(e.target.files, false);
								e.target.value = "";
							}}
						/>
					</label>
					<span className="mania-spacer" />
					<button type="button" onClick={newProject}>新建</button>
					<button type="button" onClick={() => void openDrafts("save")}>保存草稿</button>
					<button type="button" onClick={() => void openDrafts("restore")}>恢复草稿</button>
					<button
						type="button"
						onClick={() => run(() => {
							downloadFile(serializeBeatmap(map), chart.filename.split("/").at(-1)!);
							setStatus("已导出当前 .osu · 音频请使用 .osz 打包");
						})}
					>
						导出 .osu
					</button>
					<button
						type="button"
						onClick={() => void task(async () => {
							downloadFile(await exportArchive({ charts, assets }), "mania-studio.osz");
							setStatus("已导出 .osz · 包含所有难度和资源");
						})}
					>
						导出 .osz
					</button>
					<div className="mania-filebar-actions">
						<button type="button" className="mania-help-toggle" aria-label="帮助" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)}>?</button>
					</div>
				</div>
				<div className="mania-chartbar">
					<div className="mania-chart-info">
						<strong data-testid="chart-title">{`${map.metadata.Artist || "Unknown"} - ${map.metadata.Title || "Untitled"}`}</strong>
					</div>
					<label className="mania-difficulty">
						<span>难度</span>
						<select
							aria-label="选择难度"
							value={index}
							onChange={(e) => {
								playback.pause();
								setActiveIndex(Number(e.target.value));
								setSelected([]);
								playback.setLoop({ ...playback.loop, enabled: false });
							}}
						>
							{charts.map((c, i) => (
								<option key={c.filename} value={i}>
									{c.beatmap.metadata.Version || c.filename}
									{" "}
									·
									{" "}
									{c.beatmap.keys}
									K
								</option>
							))}
						</select>
					</label>
					<button
						type="button"
						onClick={() => {
							playback.pause();
							const blank = createBeatmap(map.keys);
							const next: Chart = { filename: assetPath(chart.filename, `difficulty-${newId().slice(0, 8)}.osu`)!, beatmap: { ...blank, metadata: { ...map.metadata, Version: blank.metadata.Version, BeatmapID: "0" }, general: { ...blank.general, AudioFilename: map.general.AudioFilename }, timing: map.timing } };
							setHistory((state) => commitHistory(state, [...state.present, next]));
							setActiveIndex(charts.length);
							setSelected([]);
							setDirty(true);
						}}
					>
						新建难度
					</button>
					<div className="mania-stats">
						<strong>
							{map.keys}
							K
						</strong>
						<span data-testid="note-count">
							{map.notes.length}
							{" "}
							音符
						</span>
						<span data-testid="current-bpm">
							{(60000 / currentTiming.beatLength).toFixed(1)}
							{" "}
							BPM
						</span>
					</div>
					<div className="mania-tabs">
						{([["notes", "物件"], ["timing", "定时点"], ["metadata", "谱面设置"]] as const).map(([value, label]) => (
							<button
								type="button"
								key={value}
								className={tab === value ? "is-active" : ""}
								aria-pressed={tab === value}
								onClick={() => {
									setTab(value);
									setInspectorOpen(true);
								}}
							>
								{label}
							</button>
						))}
					</div>
				</div>
				{error && (
					<div className="mania-error" role="alert">
						{error}
						<button type="button" aria-label="关闭错误" onClick={() => setError("")}>×</button>
					</div>
				)}

				<TimeRuler disabled={busy} map={map} time={playback.time} windowMs={windowMs} divisor={divisor} onZoom={(direction) => setWindowMs((current) => Math.max(500, Math.min(10000, current + direction * 250)))} />
				<div className="mania-body">
					<aside className="mania-toolbox" aria-label="编辑工具箱">
						<div className="mania-toolbar">
							<div className="mania-segment" aria-label="编辑工具">
								{([["select", "选择 (1)", "mdi:cursor-default-outline"], ["note", "单键 (2)", "mdi:rectangle"], ["hold", "长条 (3)", "mdi:arrow-expand-vertical"]] as const).map(([value, label, icon]) => (
									<button
										type="button"
										key={value}
										aria-label={label}
										title={label}
										aria-pressed={mode === value && !preview}
										disabled={playback.playing}
										className={mode === value && !preview ? "is-active" : ""}
										onClick={() => {
											setMode(value);
											setPreview(false);
										}}
									>
										<Icon icon={icon} width={16} />
										<span>{label}</span>
									</button>
								))}
							</div>
							<button
								type="button"
								aria-pressed={preview}
								className={preview ? "is-active" : ""}
								onClick={() => {
									playback.pause();
									setPreview(!preview);
								}}
							>
								{preview ? "返回编辑" : "SV 预览"}
							</button>
						</div>
						<div className="mania-editbar">
							<button type="button" onClick={undo} disabled={!history.past.length || playback.playing} title="Ctrl+Z / Cmd+Z" aria-keyshortcuts="Control+z Meta+z">撤销</button>
							<button type="button" onClick={redo} disabled={!history.future.length || playback.playing} title="Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z" aria-keyshortcuts="Control+y Control+Shift+z Meta+Shift+z">重做</button>
							<button type="button" disabled={!selectedNotes.length} onClick={copy} title="Ctrl+C / Cmd+C" aria-keyshortcuts="Control+c Meta+c">复制</button>
							<button type="button" disabled={playback.playing} onClick={paste} title="Ctrl+V / Cmd+V" aria-keyshortcuts="Control+v Meta+v">粘贴</button>
							<button type="button" disabled={!selectedNotes.length || playback.playing} onClick={mirror} title="Ctrl+H / Cmd+H" aria-keyshortcuts="Control+h Meta+h">镜像</button>
							<button type="button" disabled={!selectedNotes.length || playback.playing} onClick={remove} title="Delete" aria-keyshortcuts="Delete">删除</button>
							<span className="mania-selection-count">
								已选
								{selectedNotes.length}
							</span>
						</div>
					</aside>
					<div className="mania-compose">
						<DensityOverview disabled={busy} map={map} time={playback.time} end={playback.end} windowMs={windowMs} divisor={divisor} onSeek={playback.seek} />
						<div className="mania-stage">
							<Playfield disabled={busy} map={map} time={playback.time} end={playback.end} playing={playback.playing} preview={preview} windowMs={windowMs} divisor={divisor} mode={mode} selected={selected} onSelect={setSelected} onEdit={edit} onSeek={playback.seek} onSnapStep={(direction) => setDivisor((current) => SNAP_DIVISORS[Math.max(0, Math.min(SNAP_DIVISORS.length - 1, SNAP_DIVISORS.indexOf(current) + direction))])} onError={report} />
						</div>
					</div>
					<aside className={inspectorOpen ? "mania-inspector is-open" : "mania-inspector"}>
						<div className="mania-inspector-heading">
							<strong>{tab === "notes" ? "音符属性" : tab === "timing" ? "定时点" : "谱面设置"}</strong>
							<button className="mania-inspector-close" type="button" aria-label="关闭属性面板" onClick={() => setInspectorOpen(false)}>×</button>
						</div>
						<fieldset disabled={playback.playing} className="mania-panel">{tab === "notes" ? <NotePanel map={map} notes={selectedNotes} onEdit={edit} onError={report} /> : tab === "timing" ? <TimingPanel key={chart.filename} map={map} time={playback.time} onEdit={edit} onError={report} /> : <MetadataPanel map={map} onEdit={edit} onError={report} />}</fieldset>

					</aside>
				</div>
				<div className="mania-transport">
					<div className="mania-transport-main">
						<button type="button" className="mania-play" aria-label={playback.playing ? "暂停" : "播放"} onClick={() => void playback.toggle()}>
							<svg width={26} height={26} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path d={playback.playing ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M8 4v16l12-8z"} />
							</svg>
						</button>
						<div className="mania-clock">
							<strong>{displayTime(playback.time)}</strong>
							<span>
								/
								{displayTime(playback.end)}
								{" "}
								·
								{playback.hasAudio ? "音频已载入" : "无音频 · 可静音预览"}
							</span>
						</div>
						<label className="mania-inline">
							速度
							<select aria-label="播放速度" value={playback.rate} onChange={(e) => playback.setRate(Number(e.target.value))}>
								{[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
									<option key={rate} value={rate}>
										{rate}
										×
									</option>
								))}
							</select>
						</label>
						<div className="mania-bookmarks" role="group" aria-label="书签控制">
							<button type="button" aria-label="上一书签" title="上一书签（Ctrl+←）" aria-keyshortcuts="Control+ArrowLeft Meta+ArrowLeft" disabled={previousBookmark === undefined} onClick={() => jumpBookmark(-1)}>◀</button>
							<button type="button" aria-label="添加书签" title="添加当前书签" disabled={playback.playing || hasBookmark} onClick={() => changeBookmark("add")}>+</button>
							<button type="button" aria-label="删除当前书签" title="删除当前书签" disabled={playback.playing || !hasBookmark} onClick={() => changeBookmark("remove")}>−</button>
							<button type="button" aria-label="下一书签" title="下一书签（Ctrl+→）" aria-keyshortcuts="Control+ArrowRight Meta+ArrowRight" disabled={nextBookmark === undefined} onClick={() => jumpBookmark(1)}>▶</button>
						</div>
					</div>
					<SongTimeline disabled={busy} map={map} time={playback.time} end={playback.end} onSeek={playback.seek} />
					<div className="mania-transport-options">
						<label className="mania-inline">
							位置
							<input aria-label="当前位置 (ms)" type="number" min={0} max={playback.end} value={Math.round(playback.time)} onChange={(e) => playback.seek(Number(e.target.value))} />
							ms
						</label>
						<div className="mania-view-controls" role="group" aria-label="视野与吸附">
							<label className="mania-inline">
								视野
								<select aria-label="可见时间范围" value={windowMs} onChange={(e) => setWindowMs(Number(e.target.value))}>
									{viewRanges.map((ms) => (
										<option key={ms} value={ms}>
											{ms / 1000}
											s
										</option>
									))}
								</select>
							</label>
							<label className="mania-inline">
								吸附
								<select aria-label="节拍吸附" value={divisor} onChange={(e) => setDivisor(Number(e.target.value))}>{SNAP_DIVISORS.map((d) => <option key={d} value={d}>{`1/${d}`}</option>)}</select>
							</label>
						</div>
						<label className="mania-check">
							<input type="checkbox" checked={playback.hitsounds} onChange={(e) => playback.setHitsounds(e.target.checked)} />
							音效
						</label>
						<label className="mania-inline">
							音量
							<input aria-label="主音量" type="range" min={0} max={1} step={0.05} value={playback.volume} onChange={(e) => playback.setVolume(Number(e.target.value))} />
						</label>
					</div>
					<div className="mania-loop">
						<label className="mania-check">
							<input
								type="checkbox"
								checked={playback.loop.enabled}
								onChange={(e) => {
									if (e.target.checked && (playback.loop.end <= playback.loop.start || playback.loop.end > (playback.duration || playback.end))) {
										report("循环终点必须晚于起点，且不能超过音频或谱面长度。");
										return;
									}
									playback.setLoop({ ...playback.loop, enabled: e.target.checked });
								}}
							/>
							循环
						</label>
						<input aria-label="循环起点 (ms)" type="number" min={0} value={playback.loop.start} onChange={(e) => playback.setLoop({ ...playback.loop, enabled: false, start: Math.max(0, Number(e.target.value)) })} />
						<span>→</span>
						<input aria-label="循环终点 (ms)" type="number" min={0} value={playback.loop.end} onChange={(e) => playback.setLoop({ ...playback.loop, enabled: false, end: Math.max(0, Number(e.target.value)) })} />
						<span>ms</span>
						<button type="button" onClick={() => playback.setLoop({ ...playback.loop, enabled: false, start: Math.round(playback.time) })}>设为循环起点</button>
						<button type="button" onClick={() => playback.setLoop({ ...playback.loop, enabled: false, end: Math.round(playback.time) })}>设为循环终点</button>
					</div>
				</div>

				<footer className="mania-status">
					<span role="status">{busy ? "正在处理文件…" : status}</span>
					<span>{dirty ? "● 未保存" : "本地工作区"}</span>
				</footer>
			</fieldset>
			{draftMode && (
				<DraftDialog
					key={draftMode}
					mode={draftMode}
					drafts={drafts}
					defaultName={`${map.metadata.Artist || "Unknown"} - ${map.metadata.Title || "Untitled"}`}
					busy={busy}
					error={error}
					onClose={() => {
						setDraftMode(null);
						setError("");
					}}
					onSave={(name, id) => void save(name, id)}
					onRestore={(id) => void restore(id)}
				/>
			)}
			{helpOpen && (
				<div className="mania-help" role="dialog" aria-label="官方帮助">
					<header>
						<strong>官方帮助</strong>
						<button type="button" onClick={() => setHelpOpen(false)} aria-label="关闭帮助">×</button>
					</header>
					<div>
						<p><a href="https://osu.ppy.sh/wiki/zh/Client/Beatmap_editor" target="_blank" rel="noreferrer">osu! 官方谱面编辑器文档</a></p>
						<p><a href="https://osu.ppy.sh/wiki/zh/Client/Keyboard_shortcuts#谱面编辑器" target="_blank" rel="noreferrer">osu! 官方编辑器快捷键</a></p>
					</div>
				</div>
			)}
		</section>
	);
}
