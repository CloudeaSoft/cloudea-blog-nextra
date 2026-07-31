"use client";

import { Icon } from "@iconify-icon/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PreviewCanvas, type PreviewCanvasHandle } from "./canvas";
import { DEFAULT_CSHARP } from "./csharp/defaults";
import { compileCsharp, type CsharpProgram } from "./csharp/runner";
import { AssetStore } from "./csharp/runtime";
import { DEFAULT_FRAGMENT_HLSL, DEFAULT_VERTEX_HLSL } from "./defaults";
import { CodeEditor } from "./editor";
import { ParamSliderPanel, type DemoParam } from "./param-slider-panel";
import { parseParamAnnotations, paramsToRecord } from "./parse-params";
import {
	fileToDataUrl,
	loadImageFromDataUrl,
	loadSnapshot,
	saveSnapshot,
	WHITE_PIXEL_DATA_URL,
	type SnapshotTexture,
} from "./snapshot";
import { TexturePanel, type TextureItem } from "./texture-panel";
import { transpileHlslToGlsl } from "./transpile";

import "./hlsl-preview.css";

const AUTO_COMPILE_DEBOUNCE_MS = 650;

function paramsFromSource(source: string): DemoParam[] {
	return parseParamAnnotations(source).map((param) => ({
		id: param.name,
		label: param.name,
		value: param.value,
		min: param.min,
		max: param.max,
		step: param.step,
	}));
}

function mergeParsedParams(
	parsed: ReturnType<typeof parseParamAnnotations>,
	previous: DemoParam[],
): DemoParam[] {
	const prevMap = new Map(previous.map((param) => [param.id, param.value]));
	return parsed.map((param) => ({
		id: param.name,
		label: param.name,
		value: prevMap.has(param.name) ? prevMap.get(param.name)! : param.value,
		min: param.min,
		max: param.max,
		step: param.step,
	}));
}

/** Names referenced by DEFAULT_CSHARP — also seeded in the Textures panel. */
const DEFAULT_TEXTURE_NAMES = ["Ring"] as const;

function makeDefaultTextureItems(): SnapshotTexture[] {
	return DEFAULT_TEXTURE_NAMES.map((name) => ({
		id: `default-${name}`,
		name,
		fileName: "(placeholder white)",
		dataUrl: WHITE_PIXEL_DATA_URL,
	}));
}

function updateParam(list: DemoParam[], id: string, value: number): DemoParam[] {
	return list.map((param) => (param.id === id ? { ...param, value } : param));
}

function uniqueTextureName(base: string, existing: string[]): string {
	if (!existing.includes(base)) return base;
	let i = 2;
	while (existing.includes(`${base}_${i}`)) i++;
	return `${base}_${i}`;
}

function toSnapshotTextures(textures: TextureItem[]): SnapshotTexture[] {
	return textures
		.filter((item): item is SnapshotTexture => typeof item.dataUrl === "string")
		.map((item) => ({
			id: item.id,
			name: item.name,
			fileName: item.fileName,
			dataUrl: item.dataUrl,
		}));
}

function formatSavedAt(iso: string): string {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

export function HlslPreviewTool() {
	const [csharpSource, setCsharpSource] = useState(DEFAULT_CSHARP);
	const [vertexSource, setVertexSource] = useState(DEFAULT_VERTEX_HLSL);
	const [fragmentSource, setFragmentSource] = useState(DEFAULT_FRAGMENT_HLSL);
	const [csParams, setCsParams] = useState(() => paramsFromSource(DEFAULT_CSHARP));
	const [vsParams, setVsParams] = useState(() => paramsFromSource(DEFAULT_VERTEX_HLSL));
	const [psParams, setPsParams] = useState(() => paramsFromSource(DEFAULT_FRAGMENT_HLSL));
	const [textures, setTextures] = useState<TextureItem[]>(() => makeDefaultTextureItems());
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState("Ready");
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
	const canvasRef = useRef<PreviewCanvasHandle>(null);
	const assetsRef = useRef(new AssetStore());
	const programRef = useRef<CsharpProgram | null>(null);
	const bootedRef = useRef(false);
	const canvasReadyRef = useRef(false);
	const snapshotReadyRef = useRef(false);
	const autoCompileEnabledRef = useRef(false);
	const csParamsRef = useRef(csParams);
	const vsParamsRef = useRef(vsParams);
	const psParamsRef = useRef(psParams);
	const csharpSourceRef = useRef(csharpSource);
	const vertexSourceRef = useRef(vertexSource);
	const fragmentSourceRef = useRef(fragmentSource);
	const texturesRef = useRef(textures);
	csParamsRef.current = csParams;
	vsParamsRef.current = vsParams;
	psParamsRef.current = psParams;
	csharpSourceRef.current = csharpSource;
	vertexSourceRef.current = vertexSource;
	fragmentSourceRef.current = fragmentSource;
	texturesRef.current = textures;

	const applyTexturesToGpu = useCallback(async (
		items: TextureItem[],
		handle?: PreviewCanvasHandle | null,
	) => {
		const target = handle ?? canvasRef.current;
		if (!target) return;
		// Decode first so we never clear the previous GPU textures before
		// replacements are ready (avoids a visible flash / broken bind).
		const decoded: Array<{ name: string; image: HTMLImageElement }> = [];
		for (const item of items) {
			if (!item.dataUrl) continue;
			try {
				const image = await loadImageFromDataUrl(item.dataUrl);
				decoded.push({ name: item.name, image });
			} catch {
				// Skip undecodable entries; keep previous GPU texture if any.
			}
		}
		for (const name of assetsRef.current.list()) {
			assetsRef.current.unregister(name);
			target.removeTexture(name);
		}
		for (const entry of decoded) {
			assetsRef.current.register(entry.name);
			target.setTexture(entry.name, entry.image);
		}
	}, []);

	const persistSnapshot = useCallback((opts?: { silent?: boolean }) => {
		const result = saveSnapshot({
			csharpSource: csharpSourceRef.current,
			vertexSource: vertexSourceRef.current,
			fragmentSource: fragmentSourceRef.current,
			csParams: csParamsRef.current,
			vsParams: vsParamsRef.current,
			psParams: psParamsRef.current,
			textures: toSnapshotTextures(texturesRef.current),
		});
		if (!result.ok) {
			if (!opts?.silent) {
				setError(`Save failed: ${result.error}`);
				setStatus("Save failed");
			}
			return false;
		}
		setLastSavedAt(result.savedAt);
		if (!opts?.silent) {
			setStatus("Saved");
		}
		return true;
	}, []);

	const applyLiveParams = useCallback((
		nextCs: DemoParam[],
		nextVs: DemoParam[],
		nextPs: DemoParam[],
	) => {
		const csRecord = paramsToRecord(nextCs);
		const shaderRecord = {
			...paramsToRecord(nextVs),
			...paramsToRecord(nextPs),
		};
		programRef.current?.setParams(csRecord);
		canvasRef.current?.setShaderParams(shaderRecord);
	}, []);

	const compile = useCallback((opts?: { autoSave?: boolean }) => {
		const vs = transpileHlslToGlsl(vertexSourceRef.current, "vertex");
		if (!vs.ok) {
			setError(vs.error);
			setStatus("HLSL transpile failed");
			return false;
		}
		const fs = transpileHlslToGlsl(fragmentSourceRef.current, "fragment");
		if (!fs.ok) {
			setError(fs.error);
			setStatus("HLSL transpile failed");
			return false;
		}

		const nextVs = mergeParsedParams(vs.params, vsParamsRef.current);
		const nextPs = mergeParsedParams(fs.params, psParamsRef.current);
		const nextCs = mergeParsedParams(
			parseParamAnnotations(csharpSourceRef.current),
			csParamsRef.current,
		);
		setVsParams(nextVs);
		setPsParams(nextPs);
		setCsParams(nextCs);

		const shaderParams = {
			...paramsToRecord(nextVs),
			...paramsToRecord(nextPs),
		};
		const shaderError = canvasRef.current?.compileShaders({
			vertex: vs.glsl,
			fragment: fs.glsl,
			paramNames: [...vs.params, ...fs.params].map((param) => param.name),
		});
		if (shaderError) {
			setError(shaderError);
			setStatus("Shader compile failed");
			return false;
		}
		canvasRef.current?.setShaderParams(shaderParams);

		const compiled = compileCsharp(
			csharpSourceRef.current,
			assetsRef.current,
			paramsToRecord(nextCs),
		);
		if (!compiled.ok) {
			setError(compiled.error);
			setStatus("C# transpile failed");
			canvasRef.current?.setProgram(null);
			programRef.current = null;
			return false;
		}

		programRef.current = compiled.program;
		canvasRef.current?.setProgram(compiled.program);
		setError(null);
		setStatus("Running");

		if (opts?.autoSave !== false) {
			// Keep refs in sync before snapshot (setState is async).
			csParamsRef.current = nextCs;
			vsParamsRef.current = nextVs;
			psParamsRef.current = nextPs;
			persistSnapshot({ silent: true });
		}
		return true;
	}, [persistSnapshot]);

	const tryBoot = useCallback(() => {
		if (bootedRef.current) return;
		if (!canvasReadyRef.current || !snapshotReadyRef.current) return;
		bootedRef.current = true;
		void applyTexturesToGpu(texturesRef.current, canvasRef.current).then(() => {
			compile({ autoSave: false });
			// Enable after boot so snapshot hydration does not immediately re-save.
			autoCompileEnabledRef.current = true;
		});
	}, [applyTexturesToGpu, compile]);

	const reset = () => {
		const defaults = makeDefaultTextureItems();
		setCsharpSource(DEFAULT_CSHARP);
		setVertexSource(DEFAULT_VERTEX_HLSL);
		setFragmentSource(DEFAULT_FRAGMENT_HLSL);
		setCsParams(paramsFromSource(DEFAULT_CSHARP));
		setVsParams(paramsFromSource(DEFAULT_VERTEX_HLSL));
		setPsParams(paramsFromSource(DEFAULT_FRAGMENT_HLSL));
		setTextures(defaults);
		csharpSourceRef.current = DEFAULT_CSHARP;
		vertexSourceRef.current = DEFAULT_VERTEX_HLSL;
		fragmentSourceRef.current = DEFAULT_FRAGMENT_HLSL;
		csParamsRef.current = paramsFromSource(DEFAULT_CSHARP);
		vsParamsRef.current = paramsFromSource(DEFAULT_VERTEX_HLSL);
		psParamsRef.current = paramsFromSource(DEFAULT_FRAGMENT_HLSL);
		texturesRef.current = defaults;
		void applyTexturesToGpu(defaults).then(() => {
			setError(null);
			compile({ autoSave: true });
		});
	};

	const onCsParamChange = (id: string, value: number) => {
		setCsParams((prev) => {
			const next = updateParam(prev, id, value);
			csParamsRef.current = next;
			applyLiveParams(next, vsParamsRef.current, psParamsRef.current);
			persistSnapshot({ silent: true });
			return next;
		});
	};

	const onVsParamChange = (id: string, value: number) => {
		setVsParams((prev) => {
			const next = updateParam(prev, id, value);
			vsParamsRef.current = next;
			applyLiveParams(csParamsRef.current, next, psParamsRef.current);
			persistSnapshot({ silent: true });
			return next;
		});
	};

	const onPsParamChange = (id: string, value: number) => {
		setPsParams((prev) => {
			const next = updateParam(prev, id, value);
			psParamsRef.current = next;
			applyLiveParams(csParamsRef.current, vsParamsRef.current, next);
			persistSnapshot({ silent: true });
			return next;
		});
	};

	const handleAddTexture = (name: string, file: File, image: HTMLImageElement) => {
		void (async () => {
			const unique = uniqueTextureName(name, texturesRef.current.map((t) => t.name));
			const dataUrl = await fileToDataUrl(file);
			assetsRef.current.register(unique);
			canvasRef.current?.setTexture(unique, image);
			const next: TextureItem[] = [
				...texturesRef.current,
				{ id: crypto.randomUUID(), name: unique, fileName: file.name, dataUrl },
			];
			texturesRef.current = next;
			setTextures(next);
			persistSnapshot({ silent: true });
		})();
	};

	const handleRenameTexture = (id: string, nextName: string): string | null => {
		if (!nextName) return "Name cannot be empty";
		if (!/^[_A-Za-z]\w*$/.test(nextName)) {
			return "Name must be a valid identifier (letters/digits/_)";
		}
		const current = texturesRef.current.find((item) => item.id === id);
		if (!current) return "Texture not found";
		if (current.name === nextName) return null;
		if (texturesRef.current.some((item) => item.id !== id && item.name === nextName)) {
			return `Textures.${nextName} already exists`;
		}
		assetsRef.current.rename(current.name, nextName);
		canvasRef.current?.renameTexture(current.name, nextName);
		const next = texturesRef.current.map((item) =>
			(item.id === id ? { ...item, name: nextName } : item));
		texturesRef.current = next;
		setTextures(next);
		persistSnapshot({ silent: true });
		return null;
	};

	const handleRemoveTexture = (id: string) => {
		const current = texturesRef.current.find((item) => item.id === id);
		if (!current) return;
		assetsRef.current.unregister(current.name);
		canvasRef.current?.removeTexture(current.name);
		const next = texturesRef.current.filter((item) => item.id !== id);
		texturesRef.current = next;
		setTextures(next);
		persistSnapshot({ silent: true });
	};

	const handleFrameError = useCallback((message: string) => {
		if (!message) {
			setError(null);
			setStatus("Running");
			return;
		}
		setError(`C# runtime: ${message}`);
		setStatus("Runtime error");
	}, []);

	const handleSave = useCallback(() => {
		persistSnapshot({ silent: false });
	}, [persistSnapshot]);

	// Restore localStorage after mount (avoids SSR/hydration mismatch).
	useEffect(() => {
		const snap = loadSnapshot();
		if (snap) {
			setCsharpSource(snap.csharpSource);
			setVertexSource(snap.vertexSource);
			setFragmentSource(snap.fragmentSource);
			setCsParams(snap.csParams);
			setVsParams(snap.vsParams);
			setPsParams(snap.psParams);
			setTextures(snap.textures);
			setLastSavedAt(snap.savedAt);
			csharpSourceRef.current = snap.csharpSource;
			vertexSourceRef.current = snap.vertexSource;
			fragmentSourceRef.current = snap.fragmentSource;
			csParamsRef.current = snap.csParams;
			vsParamsRef.current = snap.vsParams;
			psParamsRef.current = snap.psParams;
			texturesRef.current = snap.textures;
		}
		snapshotReadyRef.current = true;
	}, []);

	useEffect(() => {
		tryBoot();
	}, [tryBoot]);

	// Debounced auto-compile: persist only when compile succeeds.
	useEffect(() => {
		if (!autoCompileEnabledRef.current) return;
		const timer = window.setTimeout(() => {
			compile({ autoSave: true });
		}, AUTO_COMPILE_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [csharpSource, vertexSource, fragmentSource, compile]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (!(event.ctrlKey || event.metaKey)) return;
			if (event.key.toLowerCase() !== "s") return;
			event.preventDefault();
			event.stopPropagation();
			handleSave();
		};
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [handleSave]);

	return (
		<div className="hlsl-preview">
			<header className="hlsl-preview__header">
				<div className="hlsl-preview__heading">
					<h1 className="hlsl-preview__title">HLSL Preview</h1>
					<p className="hlsl-preview__desc">
						C# geometry + HLSL VS/PS with
						{" "}
						<code>@param</code>
						{" "}
						sliders. Snapshots save to localStorage (Save / Ctrl+S; auto on
						slider/texture changes and successful compile).
					</p>
				</div>
				<div className="hlsl-preview__actions">
					<button
						type="button"
						className="hlsl-preview__btn hlsl-preview__btn--primary"
						onClick={() => compile({ autoSave: true })}
					>
						<Icon
							icon="mdi:play"
							width={18}
							height={18}
						/>
						Compile & Run
					</button>
					<button
						type="button"
						className="hlsl-preview__btn"
						onClick={handleSave}
						title="Save snapshot (Ctrl+S)"
					>
						<Icon
							icon="mdi:content-save"
							width={18}
							height={18}
						/>
						Save
					</button>
					<button
						type="button"
						className="hlsl-preview__btn"
						onClick={reset}
					>
						<Icon
							icon="mdi:restore"
							width={18}
							height={18}
						/>
						Reset
					</button>
					<span
						className="hlsl-preview__status"
						data-ok={error ? "false" : "true"}
					>
						{status}
						{lastSavedAt ? ` · saved ${formatSavedAt(lastSavedAt)}` : ""}
					</span>
				</div>
			</header>

			<div className="hlsl-preview__preview-row">
				<div className="hlsl-preview__stage">
					<PreviewCanvas
						ref={canvasRef}
						className="hlsl-preview__canvas"
						onReady={() => {
							canvasReadyRef.current = true;
							tryBoot();
						}}
						onFrameError={handleFrameError}
					/>
					{error && (
						<pre className="hlsl-preview__error">{error}</pre>
					)}
				</div>
				<TexturePanel
					textures={textures}
					onAdd={handleAddTexture}
					onRename={handleRenameTexture}
					onRemove={handleRemoveTexture}
				/>
			</div>

			<div className="hlsl-preview__board">
				<div className="hlsl-preview__board-row hlsl-preview__board-row--editors">
					<CodeEditor
						language="csharp"
						label="C# — geometry / Draw(time)"
						value={csharpSource}
						onChange={setCsharpSource}
					/>
					<CodeEditor
						language="hlsl"
						label="VS — vertex shader"
						value={vertexSource}
						onChange={setVertexSource}
					/>
					<CodeEditor
						language="hlsl"
						label="PS — pixel / fragment shader"
						value={fragmentSource}
						onChange={setFragmentSource}
					/>
				</div>
				<div className="hlsl-preview__board-row hlsl-preview__board-row--params">
					<ParamSliderPanel
						title="C# params"
						params={csParams}
						onChange={onCsParamChange}
					/>
					<ParamSliderPanel
						title="VS params"
						params={vsParams}
						onChange={onVsParamChange}
					/>
					<ParamSliderPanel
						title="PS params"
						params={psParams}
						onChange={onPsParamChange}
					/>
				</div>
			</div>

			<details className="hlsl-preview__dialect">
				<summary>Dialect & builtins</summary>
				<ul>
					<li>
						Snapshot: codes + sliders + textures in
						{" "}
						<code>localStorage</code>
						. Manual
						{" "}
						<strong>Save</strong>
						{" "}
						/
						{" "}
						<code>Ctrl+S</code>
						; auto on slider/texture edits and successful compile.
					</li>
					<li>
						Params:
						{" "}
						<code>// @param name = def min=… max=… step=…</code>
						{" "}
						in each editor; Compile scans them into the matching slider column.
					</li>
					<li>
						Textures:
						{" "}
						<code>Textures.XXXX</code>
						{" "}
						—
						{" "}
						<code>GraphicsDevice.Textures[0] = Textures.XXXX;</code>
						.
					</li>
				</ul>
			</details>
		</div>
	);
}
