"use client";

import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";
import type { CsharpProgram } from "./csharp/runner";
import { VERTEX_FLOATS, Vector2, type DrawCommand } from "./csharp/runtime";

export type ShaderProgramSource = {
	vertex: string;
	fragment: string;
	/** VS+PS @param names to bind as float uniforms */
	paramNames?: string[];
};

export type PreviewCanvasHandle = {
	compileShaders: (source: ShaderProgramSource) => string | null;
	setProgram: (program: CsharpProgram | null) => void;
	setShaderParams: (params: Record<string, number>) => void;
	setTexture: (name: string, image: HTMLImageElement | ImageBitmap | null) => void;
	renameTexture: (oldName: string, newName: string) => void;
	removeTexture: (name: string) => void;
};

type PreviewCanvasProps = {
	className?: string;
	onReady?: () => void;
	onFrameError?: (message: string) => void;
};

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

function createWhiteTexture(gl: WebGL2RenderingContext): WebGLTexture {
	const texture = gl.createTexture()!;
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		1,
		1,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		new Uint8Array([255, 255, 255, 255]),
	);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	return texture;
}

export const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(
	function PreviewCanvas({ className, onReady, onFrameError }, ref) {
		const canvasRef = useRef<HTMLCanvasElement>(null);
		const glRef = useRef<WebGL2RenderingContext | null>(null);
		const programRef = useRef<WebGLProgram | null>(null);
		const vaoRef = useRef<WebGLVertexArrayObject | null>(null);
		const bufferRef = useRef<WebGLBuffer | null>(null);
		const whiteTexRef = useRef<WebGLTexture | null>(null);
		const texturesRef = useRef(new Map<string, WebGLTexture>());
		const csharpRef = useRef<CsharpProgram | null>(null);
		const shaderParamsRef = useRef<Record<string, number>>({});
		const paramLocsRef = useRef(new Map<string, WebGLUniformLocation | null>());
		const onReadyRef = useRef(onReady);
		const onFrameErrorRef = useRef(onFrameError);
		onReadyRef.current = onReady;
		onFrameErrorRef.current = onFrameError;

		const uniformsRef = useRef<{
			iTime: WebGLUniformLocation | null;
			iResolution: WebGLUniformLocation | null;
			iMouse: WebGLUniformLocation | null;
			iChannel0: WebGLUniformLocation | null;
		}>({ iTime: null, iResolution: null, iMouse: null, iChannel0: null });
		const mouseRef = useRef({ x: 0, y: 0, down: 0 });
		const startRef = useRef(performance.now());
		const rafRef = useRef(0);
		const lastErrorRef = useRef<string | null>(null);

		useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const gl = canvas.getContext("webgl2", {
				antialias: true,
				alpha: false,
				premultipliedAlpha: false,
			});
			if (!gl) {
				onReadyRef.current?.();
				return;
			}
			glRef.current = gl;
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

			const buffer = gl.createBuffer();
			const vao = gl.createVertexArray();
			bufferRef.current = buffer;
			vaoRef.current = vao;
			whiteTexRef.current = createWhiteTexture(gl);

			gl.bindVertexArray(vao);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			const stride = VERTEX_FLOATS * 4;
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
			gl.enableVertexAttribArray(1);
			gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 2 * 4);
			gl.enableVertexAttribArray(2);
			gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 6 * 4);
			gl.bindVertexArray(null);

			const onMove = (event: PointerEvent) => {
				const rect = canvas.getBoundingClientRect();
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				mouseRef.current.x = (event.clientX - rect.left) * dpr;
				mouseRef.current.y = (rect.height - (event.clientY - rect.top)) * dpr;
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

			const applyShaderParams = () => {
				for (const [name, loc] of paramLocsRef.current) {
					if (!loc) continue;
					const value = shaderParamsRef.current[name];
					if (typeof value === "number") gl.uniform1f(loc, value);
				}
			};

			const drawCommands = (commands: DrawCommand[]) => {
				const program = programRef.current;
				if (!program || !buffer || !vao) return;
				gl.useProgram(program);
				gl.bindVertexArray(vao);
				for (const command of commands) {
					gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
					gl.bufferData(gl.ARRAY_BUFFER, command.data, gl.DYNAMIC_DRAW);

					const tex
						= (command.textureName
							? texturesRef.current.get(command.textureName)
							: null)
						?? whiteTexRef.current;
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, tex);
					gl.uniform1i(uniformsRef.current.iChannel0, 0);

					const mode
						= command.mode === "triangle-strip" ? gl.TRIANGLE_STRIP : gl.TRIANGLES;
					gl.drawArrays(mode, 0, command.vertexCount);
				}
				gl.bindVertexArray(null);
			};

			const frame = () => {
				resize();
				gl.viewport(0, 0, canvas.width, canvas.height);
				gl.clearColor(0.06, 0.07, 0.09, 1);
				gl.clear(gl.COLOR_BUFFER_BIT);

				const program = programRef.current;
				const csharp = csharpRef.current;
				if (program && csharp) {
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
						mouseRef.current.x,
						mouseRef.current.y,
						mouseRef.current.down,
						0,
					);
					applyShaderParams();
					try {
						const commands = csharp.runFrame({
							iTime: t,
							iResolution: new Vector2(canvas.width, canvas.height),
							iMouse: { ...mouseRef.current },
						});
						drawCommands(commands);
						if (lastErrorRef.current) {
							lastErrorRef.current = null;
							onFrameErrorRef.current?.("");
						}
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						if (lastErrorRef.current !== message) {
							lastErrorRef.current = message;
							onFrameErrorRef.current?.(message);
						}
					}
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
				if (whiteTexRef.current) gl.deleteTexture(whiteTexRef.current);
				for (const tex of texturesRef.current.values()) gl.deleteTexture(tex);
				texturesRef.current.clear();
				glRef.current = null;
				programRef.current = null;
			};
		}, []);

		useImperativeHandle(ref, () => ({
			compileShaders(source: ShaderProgramSource) {
				const gl = glRef.current;
				if (!gl) return "WebGL2 is not available in this browser";

				const vs = createShader(gl, gl.VERTEX_SHADER, source.vertex);
				if (!vs.shader) return `Vertex compile error:\n${vs.log}`;
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
				gl.bindAttribLocation(program, 1, "aColor");
				gl.bindAttribLocation(program, 2, "aTexCoord");
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
					iChannel0: gl.getUniformLocation(program, "iChannel0"),
				};

				const locs = new Map<string, WebGLUniformLocation | null>();
				for (const name of source.paramNames ?? []) {
					locs.set(name, gl.getUniformLocation(program, name));
				}
				paramLocsRef.current = locs;
				startRef.current = performance.now();
				return null;
			},
			setProgram(program) {
				csharpRef.current = program;
				startRef.current = performance.now();
			},
			setShaderParams(params) {
				shaderParamsRef.current = { ...shaderParamsRef.current, ...params };
			},
			setTexture(name, image) {
				const gl = glRef.current;
				if (!gl || !image) return;
				let texture = texturesRef.current.get(name);
				if (!texture) {
					texture = gl.createTexture()!;
					texturesRef.current.set(name, texture);
				}
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			},
			renameTexture(oldName, newName) {
				if (oldName === newName) return;
				const texture = texturesRef.current.get(oldName);
				if (!texture) return;
				texturesRef.current.delete(oldName);
				const existing = texturesRef.current.get(newName);
				if (existing && existing !== texture) {
					const gl = glRef.current;
					if (gl) gl.deleteTexture(existing);
				}
				texturesRef.current.set(newName, texture);
			},
			removeTexture(name) {
				const gl = glRef.current;
				const texture = texturesRef.current.get(name);
				if (gl && texture) gl.deleteTexture(texture);
				texturesRef.current.delete(name);
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
