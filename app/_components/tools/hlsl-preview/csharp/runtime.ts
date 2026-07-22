/** Interleaved vertex: pos.xy, color.rgba, tex.xyz → 9 floats */
export const VERTEX_FLOATS = 9;

export type PrimitiveMode = "triangle-strip" | "triangles";

export type DrawCommand = {
	mode: PrimitiveMode;
	data: Float32Array;
	vertexCount: number;
	textureName: string | null;
};

export class Vector2 {
	x: number;
	y: number;

	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	RotatedBy(radians: number): Vector2 {
		const c = Math.cos(radians);
		const s = Math.sin(radians);
		return new Vector2(this.x * c - this.y * s, this.x * s + this.y * c);
	}

	add(other: Vector2): Vector2 {
		return new Vector2(this.x + other.x, this.y + other.y);
	}

	sub(other: Vector2): Vector2 {
		return new Vector2(this.x - other.x, this.y - other.y);
	}

	mul(scalar: number): Vector2 {
		return new Vector2(this.x * scalar, this.y * scalar);
	}
}

export class Vector3 {
	x: number;
	y: number;
	z: number;

	constructor(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}

export class Color {
	r: number;
	g: number;
	b: number;
	a: number;

	constructor(r = 0, g = 0, b = 0, a = 1) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}

	static get White() {
		return new Color(1, 1, 1, 1);
	}

	static get Black() {
		return new Color(0, 0, 0, 1);
	}

	static get Transparent() {
		return new Color(0, 0, 0, 0);
	}

	static Lerp(a: Color, b: Color, t: number): Color {
		const k = Math.min(1, Math.max(0, t));
		return new Color(
			a.r + (b.r - a.r) * k,
			a.g + (b.g - a.g) * k,
			a.b + (b.b - a.b) * k,
			a.a + (b.a - a.a) * k,
		);
	}

	mul(scalar: number): Color {
		return new Color(this.r * scalar, this.g * scalar, this.b * scalar, this.a * scalar);
	}
}

export class Vertex2D {
	position: Vector2;
	color: Color;
	texCoord: Vector3;

	constructor(position: Vector2, color: Color, texCoord: Vector3) {
		this.position = position;
		this.color = color;
		this.texCoord = texCoord;
	}
}

export class VertexList {
	readonly items: Vertex2D[] = [];

	get Count() {
		return this.items.length;
	}

	Add(a: Vector2 | Vertex2D, color?: Color, texCoord?: Vector3): void {
		if (a instanceof Vertex2D) {
			this.items.push(a);
			return;
		}
		if (!color || !texCoord) {
			throw new Error("VertexList.Add expects (Vertex2D) or (Vector2, Color, Vector3)");
		}
		this.items.push(new Vertex2D(a, color, texCoord));
	}

	ToArray(): Vertex2D[] {
		return this.items.slice();
	}
}

export const MathHelper = {
	TwoPi: Math.PI * 2,
	Pi: Math.PI,
	PiOver2: Math.PI / 2,
};

export const MathF = {
	Sin: Math.sin,
	Cos: Math.cos,
	Abs: Math.abs,
	Sqrt: Math.sqrt,
	Min: Math.min,
	Max: Math.max,
	Floor: Math.floor,
	Ceiling: Math.ceil,
};

export const PrimitiveType = {
	TriangleStrip: "triangle-strip" as const,
	TriangleList: "triangles" as const,
};

export type TextureRef = { name: string };

export class AssetStore {
	private readonly names = new Set<string>();

	has(name: string) {
		return this.names.has(name);
	}

	register(name: string) {
		this.names.add(name);
	}

	unregister(name: string) {
		this.names.delete(name);
	}

	rename(oldName: string, newName: string) {
		if (oldName === newName) return;
		this.names.delete(oldName);
		this.names.add(newName);
	}

	list(): string[] {
		return [...this.names];
	}

	Get(name: string): TextureRef {
		return { name };
	}
}

export class GraphicsDevice {
	Textures: Array<TextureRef | null> = [null];
	readonly commands: DrawCommand[] = [];

	DrawUserPrimitives(
		type: PrimitiveMode,
		vertices: Vertex2D[],
		_offset: number,
		primitiveCount: number,
	): void {
		let vertexCount: number;
		if (type === "triangle-strip") {
			vertexCount = primitiveCount + 2;
		} else {
			vertexCount = primitiveCount * 3;
		}
		vertexCount = Math.min(vertexCount, vertices.length);
		if (vertexCount <= 0) return;

		const data = new Float32Array(vertexCount * VERTEX_FLOATS);
		for (let i = 0; i < vertexCount; i++) {
			const v = vertices[i]!;
			const o = i * VERTEX_FLOATS;
			data[o] = v.position.x;
			data[o + 1] = v.position.y;
			data[o + 2] = v.color.r;
			data[o + 3] = v.color.g;
			data[o + 4] = v.color.b;
			data[o + 5] = v.color.a;
			data[o + 6] = v.texCoord.x;
			data[o + 7] = v.texCoord.y;
			data[o + 8] = v.texCoord.z;
		}

		this.commands.push({
			mode: type,
			data,
			vertexCount,
			textureName: this.Textures[0]?.name ?? null,
		});
	}

	clearCommands() {
		this.commands.length = 0;
	}
}

export type FrameContext = {
	iTime: number;
	iResolution: Vector2;
	iMouse: { x: number; y: number; down: number };
};

export function createRuntime(assets: AssetStore) {
	const graphicsDevice = new GraphicsDevice();
	const Main = {
		graphics: {
			GraphicsDevice: graphicsDevice,
		},
	};
	const Commons = {
		ModAsset: new Proxy(
			{},
			{
				get(_target, prop: string | symbol) {
					if (typeof prop !== "string") return undefined;
					return {
						get Value() {
							return assets.Get(prop);
						},
					};
				},
			},
		),
	};

	/** Uploaded assets: `Textures.MyName` → TextureRef */
	const TexturesBag = new Proxy(
		{},
		{
			get(_target, prop: string | symbol) {
				if (typeof prop !== "string") return undefined;
				return assets.Get(prop);
			},
		},
	);

	return {
		Vector2,
		Vector3,
		Color,
		Vertex2D,
		VertexList,
		List: VertexList,
		MathHelper,
		MathF,
		PrimitiveType,
		Main,
		Commons,
		Textures: TexturesBag,
		Assets: assets,
		graphicsDevice,
		__add(a: unknown, b: unknown) {
			if (a instanceof Vector2 && b instanceof Vector2) return a.add(b);
			if (typeof a === "number" && typeof b === "number") return a + b;
			throw new Error(`Unsupported add: ${typeName(a)} + ${typeName(b)}`);
		},
		__sub(a: unknown, b: unknown) {
			if (a instanceof Vector2 && b instanceof Vector2) return a.sub(b);
			if (typeof a === "number" && typeof b === "number") return a - b;
			throw new Error(`Unsupported sub: ${typeName(a)} - ${typeName(b)}`);
		},
		__mul(a: unknown, b: unknown) {
			if (a instanceof Color && typeof b === "number") return a.mul(b);
			if (typeof a === "number" && b instanceof Color) return b.mul(a);
			if (a instanceof Vector2 && typeof b === "number") return a.mul(b);
			if (typeof a === "number" && b instanceof Vector2) return b.mul(a);
			if (typeof a === "number" && typeof b === "number") return a * b;
			throw new Error(`Unsupported mul: ${typeName(a)} * ${typeName(b)}`);
		},
		__div(a: unknown, b: unknown) {
			if (typeof a === "number" && typeof b === "number") return a / b;
			if (a instanceof Vector2 && typeof b === "number") return a.mul(1 / b);
			throw new Error(`Unsupported div: ${typeName(a)} / ${typeName(b)}`);
		},
	};
}

function typeName(value: unknown): string {
	if (value === null) return "null";
	if (value instanceof Vector2) return "Vector2";
	if (value instanceof Vector3) return "Vector3";
	if (value instanceof Color) return "Color";
	return typeof value;
}

export type Runtime = ReturnType<typeof createRuntime>;
