import { describe, expect, it } from "vitest";
import { DEFAULT_FRAGMENT_HLSL, DEFAULT_VERTEX_HLSL } from "../defaults";
import { transpileHlslToGlsl } from "../transpile";

describe("transpileHlslToGlsl", () => {
	it("transpiles default vertex shader with scale uniform", () => {
		const result = transpileHlslToGlsl(DEFAULT_VERTEX_HLSL, "vertex");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.params.map((param) => param.name)).toEqual(["scale"]);
		expect(result.glsl).toContain("#version 300 es");
		expect(result.glsl).toContain("uniform float scale;");
		expect(result.glsl).toContain("in vec2 aPosition");
		expect(result.glsl).toContain("void main()");
		expect(result.glsl).toMatch(/vert\s*\(/);
	});

	it("maps tex2D to texture and injects intensity", () => {
		const result = transpileHlslToGlsl(DEFAULT_FRAGMENT_HLSL, "fragment");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.params.map((param) => param.name)).toEqual(["intensity"]);
		expect(result.glsl).toContain("uniform float intensity;");
		expect(result.glsl).toContain("texture(iChannel0");
		expect(result.glsl).not.toContain("tex2D(");
		expect(result.glsl).toContain("fragColor = frag(");
	});

	it("rejects empty source and missing entry points", () => {
		expect(transpileHlslToGlsl("   ", "vertex").ok).toBe(false);
		const missing = transpileHlslToGlsl("float4 nope() { return 0; }", "vertex");
		expect(missing.ok).toBe(false);
		if (missing.ok) return;
		expect(missing.error).toMatch(/Missing entry point `vert/);
	});

	it("rewrites common HLSL intrinsics", () => {
		const source = `
float4 frag(float4 vColor, float3 vTexCoord)
{
	float t = lerp(0.0, 1.0, frac(iTime));
	float s = saturate(t);
	return float4(s, s, s, 1.0);
}
`;
		const result = transpileHlslToGlsl(source, "fragment");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.glsl).toContain("mix(");
		expect(result.glsl).toContain("fract(");
		expect(result.glsl).toContain("clamp(");
		expect(result.glsl).not.toMatch(/\blerp\s*\(/);
		expect(result.glsl).not.toMatch(/\bsaturate\s*\(/);
	});
});
