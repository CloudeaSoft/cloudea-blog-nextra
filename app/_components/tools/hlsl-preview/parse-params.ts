export type ParsedParam = {
	name: string;
	value: number;
	min: number;
	max: number;
	step: number;
};

const RESERVED = new Set([
	"iTime",
	"iResolution",
	"iMouse",
	"iChannel0",
	"aPosition",
	"aColor",
	"aTexCoord",
	"vColor",
	"vTexCoord",
	"fragColor",
]);

/**
 * Parse `// @param name = default min=… max=… step=…`
 * Missing min/max/step default to 0 / 1 / 0.01.
 */
export function parseParamAnnotations(source: string): ParsedParam[] {
	const found = new Map<string, ParsedParam>();
	const lineRe
		= /^\s*\/\/\s*@param\s+([A-Za-z_]\w*)\s*=\s*(-?\d*\.?\d+)(?:\s+min\s*=\s*(-?\d*\.?\d+))?(?:\s+max\s*=\s*(-?\d*\.?\d+))?(?:\s+step\s*=\s*(-?\d*\.?\d+))?/gm;

	let match: RegExpExecArray | null;
	while ((match = lineRe.exec(source)) !== null) {
		const name = match[1]!;
		if (RESERVED.has(name)) continue;
		const value = Number(match[2]);
		const min = match[3] !== undefined ? Number(match[3]) : 0;
		const max = match[4] !== undefined ? Number(match[4]) : 1;
		const step = match[5] !== undefined ? Number(match[5]) : 0.01;
		if (![value, min, max, step].every(Number.isFinite)) continue;
		found.set(name, { name, value, min, max, step });
	}

	return [...found.values()];
}

export function paramsToRecord(params: Array<{ name?: string; id?: string; value: number }>): Record<string, number> {
	const out: Record<string, number> = {};
	for (const param of params) {
		const key = param.name ?? param.id;
		if (!key) continue;
		out[key] = param.value;
	}
	return out;
}
