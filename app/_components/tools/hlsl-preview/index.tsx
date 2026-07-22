"use client";

import { Icon } from "@iconify-icon/react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { PreviewCanvas, type PreviewCanvasHandle } from "./canvas";
import { DEFAULT_CSHARP } from "./csharp/defaults";
import { compileCsharp, type CsharpProgram } from "./csharp/runner";
import { AssetStore } from "./csharp/runtime";
import { DEFAULT_FRAGMENT_HLSL, DEFAULT_VERTEX_HLSL } from "./defaults";
import { CodeEditor } from "./editor";
import { ParamSliderPanel, type DemoParam } from "./param-slider-panel";
import { parseParamAnnotations, paramsToRecord } from "./parse-params";
import { TexturePanel, type TextureItem } from "./texture-panel";
import { transpileHlslToGlsl } from "./transpile";

import "./hlsl-preview.css";

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

function makeDefaultTextureItems(): TextureItem[] {
	return DEFAULT_TEXTURE_NAMES.map((name) => ({
		id: `default-${name}`,
		name,
		fileName: "(placeholder white)",
	}));
}

function createWhiteImage(): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			reject(new Error("2D canvas unavailable"));
			return;
		}
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, 1, 1);
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Failed to create white placeholder"));
		image.src = canvas.toDataURL("image/png");
	});
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
	const canvasRef = useRef<PreviewCanvasHandle>(null);
	const assetsRef = useRef(new AssetStore());
	const programRef = useRef<CsharpProgram | null>(null);
	const defaultsSeededRef = useRef(false);
	const csParamsRef = useRef(csParams);
	const vsParamsRef = useRef(vsParams);
	const psParamsRef = useRef(psParams);
	csParamsRef.current = csParams;
	vsParamsRef.current = vsParams;
	psParamsRef.current = psParams;

	const seedDefaultTextures = useCallback(async (handle?: PreviewCanvasHandle | null) => {
		const target = handle ?? canvasRef.current;
		const white = await createWhiteImage();
		for (const name of DEFAULT_TEXTURE_NAMES) {
			assetsRef.current.register(name);
			target?.setTexture(name, white);
		}
		setTextures(makeDefaultTextureItems());
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

	const compile = useCallback(() => {
		const vs = transpileHlslToGlsl(vertexSource, "vertex");
		if (!vs.ok) {
			setError(vs.error);
			setStatus("HLSL transpile failed");
			return;
		}
		const fs = transpileHlslToGlsl(fragmentSource, "fragment");
		if (!fs.ok) {
			setError(fs.error);
			setStatus("HLSL transpile failed");
			return;
		}

		const nextVs = mergeParsedParams(vs.params, vsParamsRef.current);
		const nextPs = mergeParsedParams(fs.params, psParamsRef.current);
		const nextCs = mergeParsedParams(
			parseParamAnnotations(csharpSource),
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
			return;
		}
		canvasRef.current?.setShaderParams(shaderParams);

		const compiled = compileCsharp(
			csharpSource,
			assetsRef.current,
			paramsToRecord(nextCs),
		);
		if (!compiled.ok) {
			setError(compiled.error);
			setStatus("C# transpile failed");
			canvasRef.current?.setProgram(null);
			programRef.current = null;
			return;
		}

		programRef.current = compiled.program;
		canvasRef.current?.setProgram(compiled.program);
		setError(null);
		setStatus("Running");
	}, [csharpSource, vertexSource, fragmentSource]);

	const reset = () => {
		setCsharpSource(DEFAULT_CSHARP);
		setVertexSource(DEFAULT_VERTEX_HLSL);
		setFragmentSource(DEFAULT_FRAGMENT_HLSL);
		setCsParams(paramsFromSource(DEFAULT_CSHARP));
		setVsParams(paramsFromSource(DEFAULT_VERTEX_HLSL));
		setPsParams(paramsFromSource(DEFAULT_FRAGMENT_HLSL));
		for (const item of textures) {
			assetsRef.current.unregister(item.name);
			canvasRef.current?.removeTexture(item.name);
		}
		void seedDefaultTextures().then(() => {
			setError(null);
			compile();
		});
	};

	const onCsParamChange = (id: string, value: number) => {
		setCsParams((prev) => {
			const next = updateParam(prev, id, value);
			applyLiveParams(next, vsParamsRef.current, psParamsRef.current);
			return next;
		});
	};

	const onVsParamChange = (id: string, value: number) => {
		setVsParams((prev) => {
			const next = updateParam(prev, id, value);
			applyLiveParams(csParamsRef.current, next, psParamsRef.current);
			return next;
		});
	};

	const onPsParamChange = (id: string, value: number) => {
		setPsParams((prev) => {
			const next = updateParam(prev, id, value);
			applyLiveParams(csParamsRef.current, vsParamsRef.current, next);
			return next;
		});
	};

	const handleAddTexture = (name: string, file: File, image: HTMLImageElement) => {
		const unique = uniqueTextureName(name, textures.map((t) => t.name));
		assetsRef.current.register(unique);
		canvasRef.current?.setTexture(unique, image);
		setTextures((prev) => [
			...prev,
			{ id: crypto.randomUUID(), name: unique, fileName: file.name },
		]);
	};

	const handleRenameTexture = (id: string, nextName: string): string | null => {
		if (!nextName) return "Name cannot be empty";
		if (!/^[_A-Za-z]\w*$/.test(nextName)) {
			return "Name must be a valid identifier (letters/digits/_)";
		}
		const current = textures.find((item) => item.id === id);
		if (!current) return "Texture not found";
		if (current.name === nextName) return null;
		if (textures.some((item) => item.id !== id && item.name === nextName)) {
			return `Textures.${nextName} already exists`;
		}
		assetsRef.current.rename(current.name, nextName);
		canvasRef.current?.renameTexture(current.name, nextName);
		setTextures((prev) =>
			prev.map((item) => (item.id === id ? { ...item, name: nextName } : item)));
		return null;
	};

	const handleRemoveTexture = (id: string) => {
		const current = textures.find((item) => item.id === id);
		if (!current) return;
		assetsRef.current.unregister(current.name);
		canvasRef.current?.removeTexture(current.name);
		setTextures((prev) => prev.filter((item) => item.id !== id));
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

	return (
		<div className="hlsl-preview">
			<header className="hlsl-preview__header">
				<div className="hlsl-preview__heading">
					<Link
						href="/tools"
						className="hlsl-preview__back"
					>
						<Icon
							icon="mdi:arrow-left"
							width={18}
							height={18}
						/>
						Tools
					</Link>
					<h1 className="hlsl-preview__title">HLSL Preview</h1>
					<p className="hlsl-preview__desc">
						C# geometry + HLSL VS/PS with
						{" "}
						<code>@param</code>
						{" "}
						sliders. Drag sliders for live tweaks; Compile rescans annotations.
					</p>
				</div>
				<div className="hlsl-preview__actions">
					<button
						type="button"
						className="hlsl-preview__btn hlsl-preview__btn--primary"
						onClick={compile}
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
					</span>
				</div>
			</header>

			<div className="hlsl-preview__preview-row">
				<div className="hlsl-preview__stage">
					<PreviewCanvas
						ref={canvasRef}
						className="hlsl-preview__canvas"
						onReady={() => {
							const boot = async () => {
								if (!defaultsSeededRef.current) {
									defaultsSeededRef.current = true;
									await seedDefaultTextures(canvasRef.current);
								}
								compile();
							};
							void boot();
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

			{/* 2×3 layout demo: editors row + sliders row */}
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
						Layout locked for demo:
						{" "}
						<code>C# | VS | PS</code>
						{" "}
						editors, then
						{" "}
						<code>C# | VS | PS</code>
						{" "}
						slider columns.
					</li>
					<li>
						Params:
						{" "}
						<code>// @param name = def min=… max=… step=…</code>
						{" "}
						in each editor; Compile scans them into the matching slider column.
						Dragging sliders updates live (no recompile).
					</li>
					<li>
						Textures: import images, edit the
						{" "}
						<code>XXXX</code>
						{" "}
						in
						{" "}
						<code>Textures.XXXX</code>
						, copy into C# as
						{" "}
						<code>GraphicsDevice.Textures[0] = Textures.XXXX;</code>
						.
					</li>
				</ul>
			</details>
		</div>
	);
}
