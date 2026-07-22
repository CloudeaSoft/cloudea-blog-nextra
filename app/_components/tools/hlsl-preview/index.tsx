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
import { TexturePanel, type TextureItem } from "./texture-panel";
import { transpileHlslToGlsl } from "./transpile";

import "./hlsl-preview.css";

export function HlslPreviewTool() {
	const [csharpSource, setCsharpSource] = useState(DEFAULT_CSHARP);
	const [vertexSource, setVertexSource] = useState(DEFAULT_VERTEX_HLSL);
	const [fragmentSource, setFragmentSource] = useState(DEFAULT_FRAGMENT_HLSL);
	const [textures, setTextures] = useState<TextureItem[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState("Ready");
	const canvasRef = useRef<PreviewCanvasHandle>(null);
	const assetsRef = useRef(new AssetStore());
	const programRef = useRef<CsharpProgram | null>(null);

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

		const shaderError = canvasRef.current?.compileShaders({
			vertex: vs.glsl,
			fragment: fs.glsl,
		});
		if (shaderError) {
			setError(shaderError);
			setStatus("Shader compile failed");
			return;
		}

		const compiled = compileCsharp(csharpSource, assetsRef.current);
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
		setError(null);
		window.setTimeout(() => compile(), 0);
	};

	const handleAddTexture = (name: string, file: File, image: HTMLImageElement) => {
		assetsRef.current.register(name);
		canvasRef.current?.setTexture(name, image);
		setTextures((prev) => {
			const rest = prev.filter((item) => item.name !== name);
			return [...rest, { name, fileName: file.name }];
		});
	};

	const handleRemoveTexture = (name: string) => {
		assetsRef.current.unregister(name);
		canvasRef.current?.removeTexture(name);
		setTextures((prev) => prev.filter((item) => item.name !== name));
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
						C# geometry (Terraria-like
						{" "}
						<code>DrawUserPrimitives</code>
						) + HLSL vert/frag subset + local textures → WebGL2.
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

			<div className="hlsl-preview__workspace">
				<div className="hlsl-preview__editors">
					<CodeEditor
						language="csharp"
						label="C# geometry — void Draw(float time) / DrawUserPrimitives"
						value={csharpSource}
						onChange={setCsharpSource}
					/>
					<div className="hlsl-preview__hlsl-pair">
						<CodeEditor
							language="hlsl"
							label="HLSL vertex — vert(position, color, texCoord, out vColor, out vTexCoord)"
							value={vertexSource}
							onChange={setVertexSource}
						/>
						<CodeEditor
							language="hlsl"
							label="HLSL fragment — frag(vColor, vTexCoord)"
							value={fragmentSource}
							onChange={setFragmentSource}
						/>
					</div>
				</div>
				<div className="hlsl-preview__side">
					<div className="hlsl-preview__stage">
						<PreviewCanvas
							ref={canvasRef}
							className="hlsl-preview__canvas"
							onReady={compile}
							onFrameError={handleFrameError}
						/>
						{error && (
							<pre className="hlsl-preview__error">{error}</pre>
						)}
					</div>
					<TexturePanel
						textures={textures}
						onAdd={handleAddTexture}
						onRemove={handleRemoveTexture}
					/>
				</div>
			</div>

			<details className="hlsl-preview__dialect">
				<summary>Dialect & builtins</summary>
				<ul>
					<li>
						C# entry:
						{" "}
						<code>Draw(time)</code>
						. Helpers like
						{" "}
						<code>DrawRing</code>
						{" "}
						are supported. Subset only — not a full C# / CLR runtime.
					</li>
					<li>
						Geometry API:
						{" "}
						<code>Vector2</code>
						,
						{" "}
						<code>Color</code>
						,
						{" "}
						<code>Vertex2D</code>
						,
						{" "}
						<code>List&lt;Vertex2D&gt;</code>
						,
						{" "}
						<code>PrimitiveType.TriangleStrip</code>
						,
						{" "}
						<code>DrawUserPrimitives</code>
						.
					</li>
					<li>
						Textures:
						{" "}
						<code>Commons.ModAsset.Name.Value</code>
						{" "}
						maps to an imported image named
						{" "}
						<code>Name</code>
						. Bound as
						{" "}
						<code>iChannel0</code>
						{" "}
						in HLSL (
						<code>tex2D(iChannel0, uv)</code>
						).
					</li>
					<li>
						HLSL mesh attributes: pixel-space
						{" "}
						<code>position</code>
						,
						{" "}
						<code>color</code>
						,
						{" "}
						<code>texCoord</code>
						. Uniforms:
						{" "}
						<code>iTime</code>
						,
						{" "}
						<code>iResolution</code>
						,
						{" "}
						<code>iMouse</code>
						.
					</li>
				</ul>
			</details>
		</div>
	);
}
