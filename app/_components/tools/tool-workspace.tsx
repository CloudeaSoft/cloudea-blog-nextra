"use client";

import { Icon } from "@iconify-icon/react";
import cn from "clsx";
import { usePathname } from "next/navigation";
import {
	type ReactNode,
	useEffect,
	useState,
} from "react";
import { TOOLS } from "./registry";
import { ToolSidebar } from "./tool-sidebar";

import "./tool-workspace.css";

const COLLAPSED_STORAGE_KEY = "cloudea-tools-nav-collapsed";

type ToolWorkspaceProps = {
	children: ReactNode;
};

function currentToolTitle(pathname: string): string {
	const match = TOOLS.find(
		(tool) => pathname === tool.href || pathname.startsWith(`${tool.href}/`),
	);
	return match?.title ?? "Tools";
}

export function ToolWorkspace({ children }: ToolWorkspaceProps) {
	const pathname = usePathname();
	const [collapsed, setCollapsed] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);

	useEffect(() => {
		try {
			const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
			if (stored === "1") setCollapsed(true);
		} catch {
			/* ignore quota / private mode */
		}
	}, []);

	useEffect(() => {
		setDrawerOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!drawerOpen) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setDrawerOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [drawerOpen]);

	const toggleCollapsed = () => {
		setCollapsed((prev) => {
			const next = !prev;
			try {
				window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
			} catch {
				/* ignore */
			}
			return next;
		});
	};

	return (
		<div className="tool-workspace">
			{drawerOpen && (
				<button
					type="button"
					className="tool-workspace__backdrop"
					aria-label="Close tool navigation"
					onClick={() => setDrawerOpen(false)}
				/>
			)}

			<aside
				className={cn(
					"tool-workspace__sidebar",
					collapsed && "is-collapsed",
					drawerOpen && "is-open",
				)}
				aria-label="Tool navigation"
			>
				<ToolSidebar
					collapsed={collapsed}
					onToggleCollapse={toggleCollapsed}
					onNavigate={() => setDrawerOpen(false)}
				/>
			</aside>

			<div className="tool-workspace__content">
				<div className="tool-workspace__mobile-bar">
					<button
						type="button"
						className="tool-workspace__menu-btn"
						aria-label="Open tool navigation"
						aria-expanded={drawerOpen}
						onClick={() => setDrawerOpen(true)}
					>
						<Icon icon="mdi:menu" width={20} height={20} />
					</button>
					<span className="tool-workspace__mobile-title">
						{currentToolTitle(pathname)}
					</span>
				</div>

				<div className="tool-workspace__main">{children}</div>
			</div>
		</div>
	);
}
