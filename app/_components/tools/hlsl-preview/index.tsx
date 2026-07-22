"use client";

import { Icon } from "@iconify-icon/react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { PreviewCanvas, type PreviewCanvasHandle } from "./canvas";
import { DEFAULT_FRAGMENT_HLSL, DEFAULT_VERTEX_HLSL } from "./defaults";
import { HlslEditor } from "./editor";
import { transpileHlslToGlsl } from "./transpile";

import "./hlsl-preview.css";

export function HlslPreviewTool() {
	const [vertexSource, setVertexSource] = useState(DEFAULT_VERTEX_HLSL);
	const [fragmentSource, setFragmentSource] = useState(DEFAULT_FRAGMENT_HLSL);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState("Ready");
	const canvasRef = useRef<PreviewCanvasHandle>(null);

	const compile = useCallback(() => {
		const vs = transpileHlslToGlsl(vertexSource, "vertex");
		if (!vs.ok) {
			setError(vs.error);
			setStatus("Transpile failed");
			return;
		}
		const fs = transpileHlslToGlsl(fragmentSource, "fragment");
		if (!fs.ok) {
			setError(fs.error);
			setStatus("Transpile failed");
			return;
		}

		const compileError = canvasRef.current?.compile({
			vertex: vs.glsl,
			fragment: fs.glsl,
		});
		if (compileError) {
			setError(compileError);
			setStatus("Compile failed");
			return;
		}

		setError(null);
		setStatus("Running");
	}, [vertexSource, fragmentSource]);

	const reset = () => {
		setVertexSource(DEFAULT_VERTEX_HLSL);
		setFragmentSource(DEFAULT_FRAGMENT_HLSL);
		setError(null);
		window.setTimeout(() => {
			const vs = transpileHlslToGlsl(DEFAULT_VERTEX_HLSL, "vertex");
			const fs = transpileHlslToGlsl(DEFAULT_FRAGMENT_HLSL, "fragment");
			if (!vs.ok || !fs.ok) return;
			const compileError = canvasRef.current?.compile({
				vertex: vs.glsl,
				fragment: fs.glsl,
			});
			if (compileError) {
				setError(compileError);
				setStatus("Compile failed");
				return;
			}
			setStatus("Running");
		}, 0);
	};

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
						Dual HLSL editors (vertex + fragment), subset transpile to GLSL ES
						3.00, live WebGL2 preview. Not a full DXC / Unity ShaderLab runtime.
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
					<HlslEditor
						label="Vertex — float4 vert(float3 position, float2 uv, out float2 vUv)"
						value={vertexSource}
						onChange={setVertexSource}
					/>
					<HlslEditor
						label="Fragment — float4 frag(float2 vUv, float2 fragCoord)"
						value={fragmentSource}
						onChange={setFragmentSource}
					/>
				</div>
				<div className="hlsl-preview__stage">
					<PreviewCanvas
						ref={canvasRef}
						className="hlsl-preview__canvas"
						onReady={compile}
					/>
					{error && (
						<pre className="hlsl-preview__error">{error}</pre>
					)}
				</div>
			</div>

			<details className="hlsl-preview__dialect">
				<summary>Dialect & builtins</summary>
				<ul>
					<li>
						Entry points must be named
						{" "}
						<code>vert</code>
						{" "}
						and
						{" "}
						<code>frag</code>
						{" "}
						with the signatures shown above the editors.
					</li>
					<li>
						Types:
						{" "}
						<code>float2/3/4</code>
						, matrices,
						{" "}
						<code>int</code>
						,
						{" "}
						<code>uint</code>
						,
						{" "}
						<code>half</code>
						.
					</li>
					<li>
						Intrinsics:
						{" "}
						<code>lerp</code>
						,
						{" "}
						<code>saturate</code>
						,
						{" "}
						<code>frac</code>
						,
						{" "}
						<code>mul</code>
						,
						{" "}
						<code>tex2D</code>
						,
						{" "}
						<code>ddx</code>
						/
						<code>ddy</code>
						, …
					</li>
					<li>
						Uniforms:
						{" "}
						<code>iTime</code>
						{" "}
						(s),
						{" "}
						<code>iResolution</code>
						{" "}
						(px),
						{" "}
						<code>iMouse</code>
						{" "}
						(xy + down).
					</li>
					<li>
						Mesh: fullscreen quad; attributes
						{" "}
						<code>position</code>
						{" "}
						(clip xy) and
						{" "}
						<code>uv</code>
						.
					</li>
				</ul>
			</details>
		</div>
	);
}
