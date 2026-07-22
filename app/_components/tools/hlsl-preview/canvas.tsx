"use client";

import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";

export type ShaderProgramSource = {
	vertex: string;
	fragment: string;
};

export type PreviewCanvasHandle = {
	compile: (source: ShaderProgramSource) => string | null;
};

type PreviewCanvasProps = {
	className?: string;
	onReady?: () => void;
};

const QUAD_VERTS = new Float32Array([
	// position xyz, uv
	-1, -1, 0, 0, 0,
	1, -1, 0, 1, 0,
	-1, 1, 0, 0, 1,
	-1, 1, 0, 0, 1,
	1, -1, 0, 1, 0,
	1, 1, 0, 1, 1,
]);

function createShader(
	gl: WebGL2RenderingContext,
	type: number,
	source: string,
): { shader: WebGLShader | null; log: string } {
	const shader = gl.createShader(type);
	if (!shader) return { shader: null, log: "Failed to create shader" };
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	const log = gl.getShaderInfoLog(shader) ?? "";
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return { shader: null, log: log || "Shader compile failed" };
	}
	return { shader, log };
}

export const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(
	function PreviewCanvas({ className, onReady }, ref) {
		const canvasRef = useRef<HTMLCanvasElement>(null);
		const glRef = useRef<WebGL2RenderingContext | null>(null);
		const programRef = useRef<WebGLProgram | null>(null);
		const vaoRef = useRef<WebGLVertexArrayObject | null>(null);
		const onReadyRef = useRef(onReady);
		onReadyRef.current = onReady;
		const uniformsRef = useRef<{
			iTime: WebGLUniformLocation | null;
			iResolution: WebGLUniformLocation | null;
			iMouse: WebGLUniformLocation | null;
		}>({ iTime: null, iResolution: null, iMouse: null });
		const mouseRef = useRef({ x: 0, y: 0, down: 0 });
		const startRef = useRef(performance.now());
		const rafRef = useRef(0);

		useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const gl = canvas.getContext("webgl2", {
				antialias: true,
				alpha: false,
			});
			if (!gl) {
				onReadyRef.current?.();
				return;
			}
			glRef.current = gl;

			const buffer = gl.createBuffer();
			const vao = gl.createVertexArray();
			vaoRef.current = vao;
			gl.bindVertexArray(vao);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTS, gl.STATIC_DRAW);

			const stride = 5 * 4;
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
			gl.enableVertexAttribArray(1);
			gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 3 * 4);
			gl.bindVertexArray(null);

			const onMove = (event: PointerEvent) => {
				const rect = canvas.getBoundingClientRect();
				mouseRef.current.x = event.clientX - rect.left;
				mouseRef.current.y = rect.height - (event.clientY - rect.top);
			};
			const onDown = (event: PointerEvent) => {
				mouseRef.current.down = 1;
				onMove(event);
			};
			const onUp = () => {
				mouseRef.current.down = 0;
			};

			canvas.addEventListener("pointermove", onMove);
			canvas.addEventListener("pointerdown", onDown);
			window.addEventListener("pointerup", onUp);

			const resize = () => {
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
				const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
				if (canvas.width !== width || canvas.height !== height) {
					canvas.width = width;
					canvas.height = height;
				}
			};

			const frame = () => {
				resize();
				const program = programRef.current;
				if (program) {
					gl.viewport(0, 0, canvas.width, canvas.height);
					gl.useProgram(program);
					const t = (performance.now() - startRef.current) / 1000;
					gl.uniform1f(uniformsRef.current.iTime, t);
					gl.uniform2f(
						uniformsRef.current.iResolution,
						canvas.width,
						canvas.height,
					);
					gl.uniform4f(
						uniformsRef.current.iMouse,
						mouseRef.current.x * (window.devicePixelRatio || 1),
						mouseRef.current.y * (window.devicePixelRatio || 1),
						mouseRef.current.down,
						0,
					);
					gl.bindVertexArray(vao);
					gl.drawArrays(gl.TRIANGLES, 0, 6);
					gl.bindVertexArray(null);
				} else {
					gl.viewport(0, 0, canvas.width, canvas.height);
					gl.clearColor(0.08, 0.09, 0.11, 1);
					gl.clear(gl.COLOR_BUFFER_BIT);
				}
				rafRef.current = requestAnimationFrame(frame);
			};
			rafRef.current = requestAnimationFrame(frame);
			onReadyRef.current?.();

			return () => {
				cancelAnimationFrame(rafRef.current);
				canvas.removeEventListener("pointermove", onMove);
				canvas.removeEventListener("pointerdown", onDown);
				window.removeEventListener("pointerup", onUp);
				if (programRef.current) gl.deleteProgram(programRef.current);
				if (vao) gl.deleteVertexArray(vao);
				if (buffer) gl.deleteBuffer(buffer);
				glRef.current = null;
				programRef.current = null;
			};
		}, []);

		useImperativeHandle(ref, () => ({
			compile(source: ShaderProgramSource) {
				const gl = glRef.current;
				if (!gl) return "WebGL2 is not available in this browser";

				const vs = createShader(gl, gl.VERTEX_SHADER, source.vertex);
				if (!vs.shader) {
					return `Vertex compile error:\n${vs.log}`;
				}
				const fs = createShader(gl, gl.FRAGMENT_SHADER, source.fragment);
				if (!fs.shader) {
					gl.deleteShader(vs.shader);
					return `Fragment compile error:\n${fs.log}`;
				}

				const program = gl.createProgram();
				if (!program) {
					gl.deleteShader(vs.shader);
					gl.deleteShader(fs.shader);
					return "Failed to create program";
				}
				gl.attachShader(program, vs.shader);
				gl.attachShader(program, fs.shader);
				gl.bindAttribLocation(program, 0, "aPosition");
				gl.bindAttribLocation(program, 1, "aUv");
				gl.linkProgram(program);
				gl.deleteShader(vs.shader);
				gl.deleteShader(fs.shader);

				const linkLog = gl.getProgramInfoLog(program) ?? "";
				if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
					gl.deleteProgram(program);
					return `Program link error:\n${linkLog || "Link failed"}`;
				}

				if (programRef.current) gl.deleteProgram(programRef.current);
				programRef.current = program;
				uniformsRef.current = {
					iTime: gl.getUniformLocation(program, "iTime"),
					iResolution: gl.getUniformLocation(program, "iResolution"),
					iMouse: gl.getUniformLocation(program, "iMouse"),
				};
				startRef.current = performance.now();
				return null;
			},
		}));

		return (
			<canvas
				ref={canvasRef}
				className={className}
				aria-label="HLSL shader preview"
			/>
		);
	},
);
