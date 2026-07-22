export type ToolEntry = {
	id: string;
	title: string;
	description: string;
	href: string;
	icon: string;
};

export const TOOLS: ToolEntry[] = [
	{
		id: "hlsl-preview",
		title: "HLSL Preview",
		description:
			"Terraria-like C# mesh generation, HLSL vert/frag subset, local textures, live WebGL2 preview.",
		href: "/tools/hlsl-preview",
		icon: "mdi:cube-outline",
	},
];
