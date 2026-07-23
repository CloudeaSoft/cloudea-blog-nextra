import { describe, expect, it } from "vitest";
import { DEFAULT_CSHARP } from "../csharp/defaults";
import { transpileCsharp } from "../csharp/transpile";

describe("transpileCsharp", () => {
	it("transpiles the default demo into callable JS", () => {
		const result = transpileCsharp(DEFAULT_CSHARP);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.js).toContain("function Draw");
		expect(result.js).toContain("function DrawRing");
		expect(result.js).toContain("Assets.Get(\"Ring\")");
		expect(result.js).not.toMatch(/\bTextures\.Ring\b/);
		expect(result.js).not.toMatch(/\bfloat\b/);
		expect(result.js).not.toMatch(/\bvoid\b/);
	});

	it("rewrites Vector2 operators via runtime helpers", () => {
		const source = `
void Draw(float time)
{
    Vector2 a = new Vector2(1f, 2f) + new Vector2(3f, 4f);
    Vector2 b = a * 2f;
    Main.graphics.GraphicsDevice.DrawUserPrimitives(
        PrimitiveType.TriangleList,
        new List<Vertex2D>().ToArray(),
        0,
        0
    );
}
`;
		const result = transpileCsharp(source);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.js).toContain("__add(");
		expect(result.js).toContain("__mul(");
	});

	it("fails on empty input", () => {
		const result = transpileCsharp("   ");
		expect(result.ok).toBe(false);
	});
});
