import type { Metadata } from "next";
import cn from "clsx";
import { ArknightsGachaTool } from "@/app/_components/tools/arknights-gacha";

export const metadata: Metadata = {
	title: "Arknights Gacha History",
	description:
		"Fetch and browse Arknights official gacha history via authenticated API proxy.",
};

export default function ArknightsGachaPage() {
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
					<ArknightsGachaTool />
				</div>
			</div>
		</div>
	);
}
