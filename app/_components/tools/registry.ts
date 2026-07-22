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
			"Edit vertex & fragment HLSL (subset), transpile to GLSL, and preview on a WebGL2 canvas.",
		href: "/tools/hlsl-preview",
		icon: "mdi:cube-outline",
	},
];
