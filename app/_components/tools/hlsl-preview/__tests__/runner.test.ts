import { describe, expect, it } from "vitest";
import { DEFAULT_CSHARP } from "../csharp/defaults";
import { compileCsharp } from "../csharp/runner";
import { AssetStore, Vector2 } from "../csharp/runtime";

describe("compileCsharp", () => {
	it("compiles defaults and emits a ring draw command", () => {
		const assets = new AssetStore();
		assets.register("Ring");
		const compiled = compileCsharp(DEFAULT_CSHARP, assets, { wink: 1 });
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) return;

		const commands = compiled.program.runFrame({
			iTime: 0.25,
			iResolution: new Vector2(800, 600),
			iMouse: { x: 0, y: 0, down: 0 },
		});

		expect(commands.length).toBe(1);
		expect(commands[0]!.mode).toBe("triangle-strip");
		expect(commands[0]!.textureName).toBe("Ring");
		expect(commands[0]!.vertexCount).toBeGreaterThan(100);
		expect(commands[0]!.data.length).toBe(commands[0]!.vertexCount * 9);
	});

	it("updates wink live via setParams", () => {
		const assets = new AssetStore();
		assets.register("Ring");
		const compiled = compileCsharp(DEFAULT_CSHARP, assets, { wink: 1 });
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) return;

		compiled.program.setParams({ wink: 0 });
		const commands = compiled.program.runFrame({
			iTime: 0,
			iResolution: new Vector2(400, 400),
			iMouse: { x: 0, y: 0, down: 0 },
		});
		expect(commands.length).toBe(1);
		// Color channels should be zeroed when wink is 0.
		const data = commands[0]!.data;
		expect(data[2]).toBe(0);
		expect(data[3]).toBe(0);
		expect(data[4]).toBe(0);
		expect(data[5]).toBe(0);
	});

	it("returns a transpile error for invalid source", () => {
		const result = compileCsharp("this is not csharp {{{", new AssetStore());
		expect(result.ok).toBe(false);
	});
});
