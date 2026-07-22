import {
	AssetStore,
	createRuntime,
	type DrawCommand,
	type FrameContext,
} from "./runtime";
import { transpileCsharp } from "./transpile";

type CompiledScope = {
	setFrame: (frame: FrameContext) => void;
	draw: (time: number) => void;
};

export type CsharpProgram = {
	assets: AssetStore;
	runFrame: (frame: FrameContext) => DrawCommand[];
};

export function compileCsharp(
	source: string,
	assets: AssetStore,
): { ok: true; program: CsharpProgram } | { ok: false; error: string } {
	const result = transpileCsharp(source);
	if (!result.ok) return result;

	const runtime = createRuntime(assets);
	const keys = Object.keys(runtime) as Array<keyof typeof runtime>;
	const values = keys.map((key) => runtime[key]);

	let scope: CompiledScope;
	try {
		const factory = new Function(
			...keys,
			`"use strict";
let iResolution = new Vector2(1, 1);
let iTime = 0;
let iMouse = { x: 0, y: 0, down: 0 };
${result.js}
return {
  setFrame(frame) {
    iResolution = frame.iResolution;
    iTime = frame.iTime;
    iMouse = frame.iMouse;
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
			runFrame(frame: FrameContext) {
				runtime.graphicsDevice.clearCommands();
				scope.setFrame(frame);
				scope.draw(frame.iTime);
				return runtime.graphicsDevice.commands.slice();
			},
		},
	};
}
