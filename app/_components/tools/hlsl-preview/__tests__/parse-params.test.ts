import { describe, expect, it } from "vitest";
import { parseParamAnnotations, paramsToRecord } from "../parse-params";

describe("parseParamAnnotations", () => {
	it("parses full @param lines", () => {
		const source = `
// @param scale = 1.0 min=0.5 max=2.0 step=0.01
// @param intensity = 0.5 min=0 max=2 step=0.1
float4 frag() { return 0; }
`;
		expect(parseParamAnnotations(source)).toEqual([
			{ name: "scale", value: 1, min: 0.5, max: 2, step: 0.01 },
			{ name: "intensity", value: 0.5, min: 0, max: 2, step: 0.1 },
		]);
	});

	it("applies defaults for missing min/max/step", () => {
		expect(parseParamAnnotations("// @param wink = 1.0")).toEqual([
			{ name: "wink", value: 1, min: 0, max: 1, step: 0.01 },
		]);
	});

	it("skips reserved uniform names", () => {
		const source = `
// @param iTime = 1.0
// @param iResolution = 1.0
// @param ok = 2.0
`;
		expect(parseParamAnnotations(source)).toEqual([
			{ name: "ok", value: 2, min: 0, max: 1, step: 0.01 },
		]);
	});

	it("keeps the last definition when a name repeats", () => {
		const source = `
// @param scale = 1.0 min=0 max=1
// @param scale = 2.0 min=1 max=3 step=0.5
`;
		expect(parseParamAnnotations(source)).toEqual([
			{ name: "scale", value: 2, min: 1, max: 3, step: 0.5 },
		]);
	});

	it("ignores non-comment or malformed lines", () => {
		expect(parseParamAnnotations("@param scale = 1.0")).toEqual([]);
		expect(parseParamAnnotations("// @param = 1.0")).toEqual([]);
		expect(parseParamAnnotations("")).toEqual([]);
	});
});

describe("paramsToRecord", () => {
	it("maps id or name to values", () => {
		expect(
			paramsToRecord([
				{ id: "wink", value: 0.5 },
				{ name: "scale", value: 1.25 },
			]),
		).toEqual({ wink: 0.5, scale: 1.25 });
	});
});
