import {
	AssetStore,
	createRuntime,
	type DrawCommand,
	type FrameContext,
} from "./runtime";
import { parseParamAnnotations } from "../parse-params";
import { transpileCsharp } from "./transpile";

type CompiledScope = {
	setFrame: (frame: FrameContext) => void;
	setParams: (params: Record<string, number>) => void;
	draw: (time: number) => void;
};

export type CsharpProgram = {
	assets: AssetStore;
	paramNames: string[];
	setParams: (params: Record<string, number>) => void;
	runFrame: (frame: FrameContext) => DrawCommand[];
};

export function compileCsharp(
	source: string,
	assets: AssetStore,
	initialParams: Record<string, number> = {},
): { ok: true; program: CsharpProgram } | { ok: false; error: string } {
	const parsed = parseParamAnnotations(source);
	const result = transpileCsharp(source);
	if (!result.ok) return result;

	const runtime = createRuntime(assets);
	const keys = Object.keys(runtime) as Array<keyof typeof runtime>;
	const values = keys.map((key) => runtime[key]);

	const paramDecls = parsed
		.map((param) => {
			const start = initialParams[param.name] ?? param.value;
			return `let ${param.name} = ${start};`;
		})
		.join("\n");

	const paramAssigns = parsed
		.map((param) => {
			return `if (Object.prototype.hasOwnProperty.call(params, "${param.name}")) ${param.name} = params["${param.name}"];`;
		})
		.join("\n    ");

	let scope: CompiledScope;
	try {
		const factory = new Function(
			...keys,
			`"use strict";
let iResolution = new Vector2(1, 1);
let iTime = 0;
let iMouse = { x: 0, y: 0, down: 0 };
${paramDecls}
${result.js}
return {
  setFrame(frame) {
    iResolution = frame.iResolution;
    iTime = frame.iTime;
    iMouse = frame.iMouse;
  },
  setParams(params) {
    ${paramAssigns}
  },
  draw(time) {
    iTime = time;
    if (typeof Draw === "function") {
      Draw(time);
      return;
    }
    if (typeof DrawRing === "function") {
      DrawRing(new Vector2(iResolution.x * 0.5, iResolution.y * 0.5), time, 1.0);
      return;
    }
    throw new Error("Missing Draw(time) entry point");
  }
};`,
		) as (...args: unknown[]) => CompiledScope;

		scope = factory(...values);
		scope.setParams(initialParams);
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}

	return {
		ok: true,
		program: {
			assets,
			paramNames: parsed.map((param) => param.name),
			setParams(params) {
				scope.setParams(params);
			},
			runFrame(frame: FrameContext) {
				runtime.graphicsDevice.clearCommands();
				scope.setFrame(frame);
				scope.draw(frame.iTime);
				return runtime.graphicsDevice.commands.slice();
			},
		},
	};
}
