export type ShaderStage = "vertex" | "fragment";

export type TranspileResult =
	| { ok: true; glsl: string }
	| { ok: false; error: string };

const TYPE_REPLACEMENTS: Array<[RegExp, string]> = [
	[/\bfloat4x4\b/g, "mat4"],
	[/\bfloat3x3\b/g, "mat3"],
	[/\bfloat2x2\b/g, "mat2"],
	[/\bfloat4\b/g, "vec4"],
	[/\bfloat3\b/g, "vec3"],
	[/\bfloat2\b/g, "vec2"],
	[/\bint4\b/g, "ivec4"],
	[/\bint3\b/g, "ivec3"],
	[/\bint2\b/g, "ivec2"],
	[/\buint4\b/g, "uvec4"],
	[/\buint3\b/g, "uvec3"],
	[/\buint2\b/g, "uvec2"],
	[/\bhalf4\b/g, "vec4"],
	[/\bhalf3\b/g, "vec3"],
	[/\bhalf2\b/g, "vec2"],
	[/\bhalf\b/g, "float"],
	[/\buint\b/g, "uint"],
];

const INTRINSIC_REPLACEMENTS: Array<[RegExp, string]> = [
	[/\blerp\s*\(/g, "mix("],
	[/\bfrac\s*\(/g, "fract("],
	[/\brsqrt\s*\(/g, "inversesqrt("],
	[/\bddx\s*\(/g, "dFdx("],
	[/\bddy\s*\(/g, "dFdy("],
	[/\batan2\s*\(/g, "atan("],
	[/\btex2D\s*\(/g, "texture("],
	[/\btex2Dlod\s*\(/g, "textureLod("],
];

function stripSemantics(source: string): string {
	return source.replace(
		/\s*:\s*(SV_[A-Za-z0-9_]+|POSITION|NORMAL|TANGENT|BINORMAL|COLOR[0-9]*|TEXCOORD[0-9]*|PSIZE|FOG|DEPTH|BLENDWEIGHT|BLENDINDICES)\b/gi,
		"",
	);
}

function replaceSaturate(source: string): string {
	const token = "saturate";
	let result = "";
	let i = 0;
	while (i < source.length) {
		if (
			source.startsWith(token, i)
			&& (i === 0 || !/\w/.test(source[i - 1]!))
			&& !/\w/.test(source[i + token.length] ?? "")
		) {
			let j = i + token.length;
			while (j < source.length && /\s/.test(source[j]!)) j++;
			if (source[j] !== "(") {
				result += source[i];
				i++;
				continue;
			}
			let depth = 0;
			const start = j;
			for (; j < source.length; j++) {
				const ch = source[j]!;
				if (ch === "(") depth++;
				else if (ch === ")") {
					depth--;
					if (depth === 0) {
						j++;
						break;
					}
				}
			}
			const inner = source.slice(start + 1, j - 1);
			result += `clamp(${inner}, 0.0, 1.0)`;
			i = j;
			continue;
		}
		result += source[i];
		i++;
	}
	return result;
}

function replaceMul(source: string): string {
	const token = "mul";
	let result = "";
	let i = 0;
	while (i < source.length) {
		if (
			source.startsWith(token, i)
			&& (i === 0 || !/\w/.test(source[i - 1]!))
			&& !/\w/.test(source[i + token.length] ?? "")
		) {
			let j = i + token.length;
			while (j < source.length && /\s/.test(source[j]!)) j++;
			if (source[j] !== "(") {
				result += source[i];
				i++;
				continue;
			}
			let depth = 0;
			const start = j;
			let comma = -1;
			for (; j < source.length; j++) {
				const ch = source[j]!;
				if (ch === "(") depth++;
				else if (ch === ")") {
					depth--;
					if (depth === 0) {
						j++;
						break;
					}
				} else if (ch === "," && depth === 1 && comma < 0) {
					comma = j;
				}
			}
			if (comma < 0) {
				result += source.slice(i, j);
				i = j;
				continue;
			}
			const a = source.slice(start + 1, comma).trim();
			const b = source.slice(comma + 1, j - 1).trim();
			result += `(${a} * ${b})`;
			i = j;
			continue;
		}
		result += source[i];
		i++;
	}
	return result;
}

function applyReplacements(source: string): string {
	let out = stripSemantics(source);
	out = replaceSaturate(out);
	out = replaceMul(out);
	for (const [pattern, replacement] of INTRINSIC_REPLACEMENTS) {
		out = out.replace(pattern, replacement);
	}
	for (const [pattern, replacement] of TYPE_REPLACEMENTS) {
		out = out.replace(pattern, replacement);
	}
	return out;
}

const VERTEX_PREAMBLE = `#version 300 es
precision highp float;

in vec2 aPosition;
in vec4 aColor;
in vec3 aTexCoord;
out vec4 vColor;
out vec3 vTexCoord;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

`;

const FRAGMENT_PREAMBLE = `#version 300 es
precision highp float;

in vec4 vColor;
in vec3 vTexCoord;
out vec4 fragColor;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

`;

const VERTEX_MAIN = `
void main() {
  gl_Position = vert(aPosition, aColor, aTexCoord, vColor, vTexCoord);
}
`;

const FRAGMENT_MAIN = `
void main() {
  fragColor = frag(vColor, vTexCoord);
}
`;

function ensureEntryPoint(source: string, stage: ShaderStage): string | null {
	const name = stage === "vertex" ? "vert" : "frag";
	const pattern = new RegExp(`\\b${name}\\s*\\(`);
	if (!pattern.test(source)) {
		return `Missing entry point \`${name}(...)\`. See the dialect note below the editors.`;
	}
	return null;
}

/**
 * Transpile a constrained HLSL subset to GLSL ES 3.00 for custom meshes.
 *
 * Vertex: `float4 vert(float2 position, float4 color, float3 texCoord, out float4 vColor, out float3 vTexCoord)`
 * Fragment: `float4 frag(float4 vColor, float3 vTexCoord)`
 */
export function transpileHlslToGlsl(
	source: string,
	stage: ShaderStage,
): TranspileResult {
	const trimmed = source.trim();
	if (!trimmed) {
		return { ok: false, error: `${stage} shader is empty` };
	}

	const entryError = ensureEntryPoint(trimmed, stage);
	if (entryError) {
		return { ok: false, error: entryError };
	}

	const body = applyReplacements(trimmed);
	const preamble = stage === "vertex" ? VERTEX_PREAMBLE : FRAGMENT_PREAMBLE;
	const epilogue = stage === "vertex" ? VERTEX_MAIN : FRAGMENT_MAIN;

	return {
		ok: true,
		glsl: `${preamble}${body}\n${epilogue}`,
	};
}
