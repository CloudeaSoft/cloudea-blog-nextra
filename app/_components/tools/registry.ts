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
	{
		id: "arknights-gacha",
		title: "Arknights Gacha History",
		description:
			"Pull official gacha categories and history with your account tokens, then browse raw records.",
		href: "/tools/arknights-gacha",
		icon: "mdi:cards-outline",
	},
];
