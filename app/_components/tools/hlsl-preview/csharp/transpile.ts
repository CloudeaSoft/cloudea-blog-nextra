type Token =
	| { kind: "num"; value: string }
	| { kind: "id"; value: string }
	| { kind: "str"; value: string }
	| { kind: "op"; value: string }
	| { kind: "punc"; value: string }
	| { kind: "kw"; value: string };

const KEYWORDS = new Set([
	"break",
	"case",
	"continue",
	"default",
	"do",
	"else",
	"false",
	"for",
	"function",
	"if",
	"let",
	"new",
	"null",
	"return",
	"switch",
	"true",
	"typeof",
	"while",
]);

function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < source.length) {
		const ch = source[i]!;

		if (/\s/.test(ch)) {
			i++;
			continue;
		}

		if (ch === "/" && source[i + 1] === "/") {
			while (i < source.length && source[i] !== "\n") i++;
			continue;
		}
		if (ch === "/" && source[i + 1] === "*") {
			i += 2;
			while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
			i += 2;
			continue;
		}

		if (ch === "\"" || ch === "'") {
			const quote = ch;
			let value = ch;
			i++;
			while (i < source.length) {
				const c = source[i]!;
				value += c;
				i++;
				if (c === "\\") {
					if (i < source.length) {
						value += source[i];
						i++;
					}
					continue;
				}
				if (c === quote) break;
			}
			tokens.push({ kind: "str", value });
			continue;
		}

		if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(source[i + 1] ?? ""))) {
			let value = "";
			while (i < source.length && /[0-9_]/.test(source[i]!)) {
				value += source[i];
				i++;
			}
			if (source[i] === ".") {
				value += ".";
				i++;
				while (i < source.length && /[0-9_]/.test(source[i]!)) {
					value += source[i];
					i++;
				}
			}
			if (source[i] === "e" || source[i] === "E") {
				value += source[i];
				i++;
				if (source[i] === "+" || source[i] === "-") {
					value += source[i];
					i++;
				}
				while (i < source.length && /[0-9]/.test(source[i]!)) {
					value += source[i];
					i++;
				}
			}
			if (source[i] === "f" || source[i] === "F" || source[i] === "d" || source[i] === "D") {
				i++;
			}
			tokens.push({ kind: "num", value: value.replace(/_/g, "") });
			continue;
		}

		if (/[A-Za-z_]/.test(ch)) {
			let value = "";
			while (i < source.length && /[A-Za-z0-9_]/.test(source[i]!)) {
				value += source[i];
				i++;
			}
			tokens.push({
				kind: KEYWORDS.has(value) ? "kw" : "id",
				value,
			});
			continue;
		}

		const three = source.slice(i, i + 3);
		if (three === "===" || three === "!==") {
			tokens.push({ kind: "op", value: three });
			i += 3;
			continue;
		}

		const two = source.slice(i, i + 2);
		if (
			two === "=="
			|| two === "!="
			|| two === "<="
			|| two === ">="
			|| two === "&&"
			|| two === "||"
			|| two === "++"
			|| two === "--"
			|| two === "+="
			|| two === "-="
			|| two === "*="
			|| two === "/="
			|| two === "=>"
		) {
			tokens.push({ kind: "op", value: two });
			i += 2;
			continue;
		}

		if ("(){}[],.;?:".includes(ch)) {
			tokens.push({ kind: "punc", value: ch });
			i++;
			continue;
		}

		if ("+-*/%<>=!&|^~".includes(ch)) {
			tokens.push({ kind: "op", value: ch });
			i++;
			continue;
		}

		throw new Error(`Unexpected character \`${ch}\``);
	}

	return tokens;
}

function tokenText(token: Token): string {
	return token.value;
}

function rewriteOperators(tokens: Token[]): string {
	let i = 0;

	const peek = () => tokens[i];
	const next = () => tokens[i++];

	function parsePrimary(): string {
		const token = peek();
		if (!token) throw new Error("Unexpected end of expression");

		if (token.kind === "op" && (token.value === "+" || token.value === "-" || token.value === "!")) {
			next();
			return `${token.value}${parsePrimary()}`;
		}

		if (token.kind === "op" && (token.value === "++" || token.value === "--")) {
			next();
			return `${token.value}${parsePrimary()}`;
		}

		if (token.kind === "punc" && token.value === "(") {
			next();
			const inner = parseExpression(0);
			const close = next();
			if (!close || close.kind !== "punc" || close.value !== ")") {
				throw new Error("Expected `)`");
			}
			return `(${inner})`;
		}

		if (token.kind === "kw" && token.value === "new") {
			next();
			let out = "new";
			const typeTok = next();
			if (!typeTok || (typeTok.kind !== "id" && typeTok.kind !== "kw")) {
				throw new Error("Expected type after `new`");
			}
			out += ` ${typeTok.value}`;
			// Skip generic args List<Vertex2D>
			if (peek()?.kind === "op" && peek()?.value === "<") {
				next();
				let depth = 1;
				while (i < tokens.length && depth > 0) {
					const t = next()!;
					if (t.kind === "op" && t.value === "<") depth++;
					if (t.kind === "op" && t.value === ">") depth--;
				}
			}
			if (peek()?.kind === "punc" && peek()?.value === "(") {
				out += parseCallArgs();
			} else if (peek()?.kind === "punc" && peek()?.value === "[") {
				// new List[] — uncommon; treat as error-ish empty
				out += "()";
			}
			return parsePostfix(out);
		}

		if (
			token.kind === "num"
			|| token.kind === "str"
			|| token.kind === "id"
			|| (token.kind === "kw" && (token.value === "true" || token.value === "false" || token.value === "null"))
		) {
			next();
			return parsePostfix(tokenText(token));
		}

		throw new Error(`Unexpected token in expression: ${token.value}`);
	}

	function parseCallArgs(): string {
		const open = next();
		if (!open || open.value !== "(") throw new Error("Expected `(`");
		if (peek()?.kind === "punc" && peek()?.value === ")") {
			next();
			return "()";
		}
		const args: string[] = [];
		while (true) {
			args.push(parseExpression(0));
			const sep = peek();
			if (sep?.kind === "punc" && sep.value === ",") {
				next();
				continue;
			}
			break;
		}
		const close = next();
		if (!close || close.value !== ")") throw new Error("Expected `)`");
		return `(${args.join(", ")})`;
	}

	function parsePostfix(left: string): string {
		let out = left;
		while (true) {
			const token = peek();
			if (!token) return out;

			if (token.kind === "punc" && token.value === "(") {
				out += parseCallArgs();
				continue;
			}
			if (token.kind === "punc" && token.value === ".") {
				next();
				const prop = next();
				if (!prop || (prop.kind !== "id" && prop.kind !== "kw")) {
					throw new Error("Expected property name");
				}
				out += `.${prop.value}`;
				continue;
			}
			if (token.kind === "punc" && token.value === "[") {
				next();
				const index = parseExpression(0);
				const close = next();
				if (!close || close.value !== "]") throw new Error("Expected `]`");
				out += `[${index}]`;
				continue;
			}
			if (token.kind === "op" && (token.value === "++" || token.value === "--")) {
				next();
				out += token.value;
				continue;
			}
			return out;
		}
	}

	function precedence(op: string): number {
		const table: Record<string, number> = {
			"*": 40,
			"/": 40,
			"%": 40,
			"+": 30,
			"-": 30,
			"<": 20,
			">": 20,
			"<=": 20,
			">=": 20,
			"==": 15,
			"!=": 15,
			"===": 15,
			"!==": 15,
			"&&": 10,
			"||": 5,
		};
		return table[op] ?? -1;
	}

	function wrapBinary(op: string, left: string, right: string): string {
		if (op === "+") return `__add(${left}, ${right})`;
		if (op === "-") return `__sub(${left}, ${right})`;
		if (op === "*") return `__mul(${left}, ${right})`;
		if (op === "/") return `__div(${left}, ${right})`;
		return `(${left} ${op} ${right})`;
	}

	function parseExpression(minPrec: number): string {
		let left = parsePrimary();

		while (true) {
			const token = peek();
			if (!token || token.kind !== "op") break;
			const prec = precedence(token.value);
			if (prec < minPrec) break;
			const op = token.value;
			next();

			if (op.endsWith("=") && op !== "==" && op !== "!=" && op !== "<=" && op !== ">=" && op !== "===" && op !== "!==") {
				// assignment ops shouldn't appear via precedence path often
				const right = parseExpression(prec);
				left = `${left} ${op} ${right}`;
				continue;
			}

			const right = parseExpression(prec + 1);
			left = wrapBinary(op, left, right);
		}

		// ternary
		if (peek()?.kind === "punc" && peek()?.value === "?") {
			next();
			const a = parseExpression(0);
			const colon = next();
			if (!colon || colon.value !== ":") throw new Error("Expected `:` in ternary");
			const b = parseExpression(0);
			left = `(${left} ? ${a} : ${b})`;
		}

		return left;
	}

	function parseBlockish(): string {
		const parts: string[] = [];

		while (i < tokens.length) {
			const token = peek();
			if (!token) break;

			if (token.kind === "punc" && token.value === "}") {
				break;
			}

			if (token.kind === "kw" && token.value === "function") {
				next();
				const name = next();
				if (!name || name.kind !== "id") throw new Error("Expected function name");
				let header = `function ${name.value}`;
				if (peek()?.kind === "punc" && peek()?.value === "(") {
					header += parseParamList();
				}
				const open = next();
				if (!open || open.value !== "{") throw new Error("Expected `{`");
				const body = parseBlockish();
				const close = next();
				if (!close || close.value !== "}") throw new Error("Expected `}`");
				parts.push(`${header} {\n${body}\n}`);
				continue;
			}

			if (token.kind === "kw" && (token.value === "if" || token.value === "while")) {
				const kw = next()!.value;
				const open = next();
				if (!open || open.value !== "(") throw new Error(`Expected \`(\` after ${kw}`);
				const cond = parseExpression(0);
				const close = next();
				if (!close || close.value !== ")") throw new Error(`Expected \`)\` after ${kw}`);
				parts.push(`${kw} (${cond}) ${parseStatementOrBlock()}`);
				if (kw === "if" && peek()?.kind === "kw" && peek()?.value === "else") {
					next();
					parts[parts.length - 1] += ` else ${parseStatementOrBlock()}`;
				}
				continue;
			}

			if (token.kind === "kw" && token.value === "for") {
				next();
				const open = next();
				if (!open || open.value !== "(") throw new Error("Expected `(` after for");
				const init = parseForPart();
				const semi1 = next();
				if (!semi1 || semi1.value !== ";") throw new Error("Expected `;` in for");
				const cond = peek()?.kind === "punc" && peek()?.value === ";"
					? ""
					: parseExpression(0);
				const semi2 = next();
				if (!semi2 || semi2.value !== ";") throw new Error("Expected `;` in for");
				const step = peek()?.kind === "punc" && peek()?.value === ")"
					? ""
					: parseExpression(0);
				const close = next();
				if (!close || close.value !== ")") throw new Error("Expected `)` after for");
				parts.push(`for (${init}; ${cond}; ${step}) ${parseStatementOrBlock()}`);
				continue;
			}

			if (token.kind === "kw" && token.value === "return") {
				next();
				if (peek()?.kind === "punc" && peek()?.value === ";") {
					next();
					parts.push("return;");
					continue;
				}
				const expr = parseExpression(0);
				if (peek()?.kind === "punc" && peek()?.value === ";") next();
				parts.push(`return ${expr};`);
				continue;
			}

			if (token.kind === "kw" && (token.value === "break" || token.value === "continue")) {
				next();
				if (peek()?.kind === "punc" && peek()?.value === ";") next();
				parts.push(`${token.value};`);
				continue;
			}

			if (token.kind === "kw" && token.value === "let") {
				next();
				const name = next();
				if (!name || name.kind !== "id") throw new Error("Expected identifier after let");
				let stmt = `let ${name.value}`;
				if (peek()?.kind === "op" && peek()?.value === "=") {
					next();
					stmt += ` = ${parseExpression(0)}`;
				}
				if (peek()?.kind === "punc" && peek()?.value === ";") next();
				parts.push(`${stmt};`);
				continue;
			}

			// assignment or expression statement
			const expr = parseExpression(0);
			if (peek()?.kind === "op" && peek()?.value === "=") {
				next();
				const right = parseExpression(0);
				if (peek()?.kind === "punc" && peek()?.value === ";") next();
				parts.push(`${expr} = ${right};`);
				continue;
			}
			if (peek()?.kind === "op" && (peek()?.value === "+=" || peek()?.value === "-=" || peek()?.value === "*=" || peek()?.value === "/=")) {
				const op = next()!.value;
				const right = parseExpression(0);
				if (peek()?.kind === "punc" && peek()?.value === ";") next();
				parts.push(`${expr} ${op} ${right};`);
				continue;
			}
			if (peek()?.kind === "punc" && peek()?.value === ";") next();
			parts.push(`${expr};`);
		}

		return parts.join("\n");
	}

	function parseParamList(): string {
		const open = next();
		if (!open || open.value !== "(") throw new Error("Expected `(`");
		if (peek()?.kind === "punc" && peek()?.value === ")") {
			next();
			return "()";
		}
		const names: string[] = [];
		while (true) {
			const name = next();
			if (!name || name.kind !== "id") throw new Error("Expected parameter name");
			names.push(name.value);
			if (peek()?.kind === "punc" && peek()?.value === ",") {
				next();
				continue;
			}
			break;
		}
		const close = next();
		if (!close || close.value !== ")") throw new Error("Expected `)`");
		return `(${names.join(", ")})`;
	}

	function parseForPart(): string {
		if (peek()?.kind === "punc" && peek()?.value === ";") return "";
		if (peek()?.kind === "kw" && peek()?.value === "let") {
			next();
			const name = next();
			if (!name || name.kind !== "id") throw new Error("Expected identifier");
			if (peek()?.kind === "op" && peek()?.value === "=") {
				next();
				return `let ${name.value} = ${parseExpression(0)}`;
			}
			return `let ${name.value}`;
		}
		const left = parseExpression(0);
		if (peek()?.kind === "op" && peek()?.value === "=") {
			next();
			return `${left} = ${parseExpression(0)}`;
		}
		return left;
	}

	function parseStatementOrBlock(): string {
		if (peek()?.kind === "punc" && peek()?.value === "{") {
			next();
			const body = parseBlockish();
			const close = next();
			if (!close || close.value !== "}") throw new Error("Expected `}`");
			return `{\n${body}\n}`;
		}
		// single statement
		const start = i;
		const before = parseBlockishLimited(1);
		if (i === start) throw new Error("Expected statement");
		return before;
	}

	function parseBlockishLimited(maxStmts: number): string {
		const saved = parseBlockish;
		// reuse by temporarily slicing — simpler: parse one statement manually
		void saved;
		const parts: string[] = [];
		const limit = maxStmts;
		let count = 0;
		const end = tokens.length;
		void end;
		while (i < tokens.length && count < limit) {
			const snapshot = i;
			try {
				// delegate to one iteration by calling a mini version
				const token = peek();
				if (!token || (token.kind === "punc" && token.value === "}")) break;
				// Fall back: parse expression statement / let / return via recursive approach
				// Use a nested block parser for one statement by wrapping
				if (token.kind === "kw" && token.value === "let") {
					next();
					const name = next();
					if (!name || name.kind !== "id") throw new Error("Expected identifier");
					let stmt = `let ${name.value}`;
					if (peek()?.kind === "op" && peek()?.value === "=") {
						next();
						stmt += ` = ${parseExpression(0)}`;
					}
					if (peek()?.kind === "punc" && peek()?.value === ";") next();
					parts.push(`${stmt};`);
					count++;
					continue;
				}
				if (token.kind === "kw" && token.value === "return") {
					next();
					const expr = parseExpression(0);
					if (peek()?.kind === "punc" && peek()?.value === ";") next();
					parts.push(`return ${expr};`);
					count++;
					continue;
				}
				const expr = parseExpression(0);
				if (peek()?.kind === "op" && peek()?.value === "=") {
					next();
					const right = parseExpression(0);
					if (peek()?.kind === "punc" && peek()?.value === ";") next();
					parts.push(`${expr} = ${right};`);
					count++;
					continue;
				}
				if (peek()?.kind === "punc" && peek()?.value === ";") next();
				parts.push(`${expr};`);
				count++;
			} catch (error) {
				i = snapshot;
				throw error;
			}
		}
		return parts.join("\n");
	}

	return parseBlockish();
}

function preprocessCsharp(source: string): string {
	let out = source;

	// Collection expression / empty list
	out = out.replace(
		/\b(?:List\s*<\s*Vertex2D\s*>|var)\s+(\w+)\s*=\s*\[\s*\]\s*;/g,
		"let $1 = new VertexList();",
	);
	out = out.replace(
		/\bList\s*<\s*Vertex2D\s*>\s+(\w+)\s*=\s*new\s+List\s*<\s*Vertex2D\s*>\s*\(\s*\)\s*;/g,
		"let $1 = new VertexList();",
	);
	out = out.replace(/\b(\w+)\s*=\s*\[\s*\]\s*;/g, "$1 = new VertexList();");

	// ModAsset sugar + Textures.Name asset refs
	out = out.replace(/\bCommons\.ModAsset\.(\w+)\.Value\b/g, "Assets.Get(\"$1\")");
	out = out.replace(/\bTextures\.(\w+)\b/g, "Assets.Get(\"$1\")");

	// Access modifiers + return types on methods
	out = out.replace(
		/\b(?:public|private|protected|internal|static)\s+/g,
		"",
	);
	out = out.replace(
		/\b(?:void|float|int|bool|double|string|Color|Vector2|Vector3|Vertex2D)\s+(\w+)\s*\(/g,
		"function $1(",
	);

	// Typed locals: float x = ...; Color c = ...; int i = ...;
	out = out.replace(
		/\b(?:float|int|bool|double|string|var|Color|Vector2|Vector3|Vertex2D|List\s*<\s*Vertex2D\s*>)\s+(\w+)\s*=/g,
		"let $1 =",
	);

	// for (int i = ...)
	out = out.replace(/\bfor\s*\(\s*(?:int|float|var)\s+/g, "for (let ");

	// Strip remaining generic debris List<Vertex2D>
	out = out.replace(/\bList\s*<\s*Vertex2D\s*>/g, "VertexList");

	// Parameter type stripping: (Vector2 drawCenter, float timeValue, float wink)
	out = out.replace(
		/\(\s*((?:(?:float|int|bool|double|string|Color|Vector2|Vector3|Vertex2D|VertexList)\s+\w+\s*,\s*)*(?:float|int|bool|double|string|Color|Vector2|Vector3|Vertex2D|VertexList)\s+\w+)\s*\)/g,
		(_m, inner: string) => {
			const names = inner
				.split(",")
				.map((part) => part.trim().split(/\s+/).pop())
				.join(", ");
			return `(${names})`;
		},
	);

	return out;
}

export type CsharpTranspileResult =
	| { ok: true; js: string }
	| { ok: false; error: string };

/**
 * Transpile a Terraria-like C# geometry subset to executable JS.
 * Requires entry point `Draw(time)` (or host will call DrawRing if present).
 */
export function transpileCsharp(source: string): CsharpTranspileResult {
	try {
		const pre = preprocessCsharp(source);
		const tokens = tokenize(pre);
		const js = rewriteOperators(tokens);
		if (!/\bfunction\s+Draw\s*\(/.test(js) && !/\bfunction\s+DrawRing\s*\(/.test(js)) {
			return {
				ok: false,
				error: "Missing entry point `Draw(time)` (or `DrawRing` helper).",
			};
		}
		return { ok: true, js };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
