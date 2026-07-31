import type { Metadata } from "next";
import { HlslPreviewTool } from "@/app/_components/tools/hlsl-preview";

export const metadata: Metadata = {
	title: "HLSL Preview",
	description:
		"Generate meshes in C#, shade with HLSL, import textures, and preview with WebGL2.",
};

export default function HlslPreviewPage() {
	return (
		<div data-pagefind-body>
			<HlslPreviewTool />
		</div>
	);
}
