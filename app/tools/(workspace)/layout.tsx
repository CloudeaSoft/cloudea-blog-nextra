import type { ReactNode } from "react";
import { ToolWorkspace } from "@/app/_components/tools/tool-workspace";

export default function ToolsWorkspaceLayout({
	children,
}: {
	children: ReactNode;
}) {
	return <ToolWorkspace>{children}</ToolWorkspace>;
}
