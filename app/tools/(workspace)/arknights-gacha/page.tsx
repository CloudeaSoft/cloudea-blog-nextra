import type { Metadata } from "next";
import { ArknightsGachaTool } from "@/app/_components/tools/arknights-gacha";

export const metadata: Metadata = {
	title: "Arknights Gacha History",
	description:
		"Fetch and browse Arknights official gacha history via authenticated API proxy.",
};

export default function ArknightsGachaPage() {
	return (
		<div data-pagefind-body>
			<ArknightsGachaTool />
		</div>
	);
}
