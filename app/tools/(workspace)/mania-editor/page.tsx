import type { Metadata } from "next";
import { ManiaEditor } from "@/app/_components/tools/mania-editor";

export const metadata: Metadata = {
	title: "Mania Studio",
	description: "Preview and edit osu!mania beatmaps in your browser. Import .osu/.osz, compose notes and holds, adjust timing, and export locally.",
};

export default function ManiaEditorPage() {
	return <div className="mania-page" data-pagefind-body><ManiaEditor /></div>;
}
