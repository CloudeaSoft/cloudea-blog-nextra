import type { Metadata } from "next";
import cn from "clsx";
import { HlslPreviewTool } from "@/app/_components/tools/hlsl-preview";

export const metadata: Metadata = {
	title: "HLSL Preview",
	description:
		"Generate meshes in C#, shade with HLSL, import textures, and preview with WebGL2.",
};

export default function HlslPreviewPage() {
	return (
		<div
			data-pagefind-body
			className={cn(
				"pt-10 mb-7.5 flex justify-center",
				"max-lg:pt-0 max-lg:mb-0",
			)}
		>
			<div className={cn("max-w-380 relative w-[96%] h-full", "max-lg:w-full")}>
				<div
					className={cn(
						"p-6 border border-solid rounded-[18px] border-(--border-color) shadow-(--cloudea-box-shadow) bg-(--background-color-transparent-80)",
						"max-lg:p-4 max-lg:rounded-none",
					)}
				>
					<HlslPreviewTool />
				</div>
			</div>
		</div>
	);
}
