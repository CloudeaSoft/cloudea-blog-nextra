"use client";

import { Icon } from "@iconify-icon/react";
import cn from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOOLS } from "./registry";

type ToolSidebarProps = {
	collapsed: boolean;
	onToggleCollapse: () => void;
	onNavigate?: () => void;
};

function isActivePath(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function ToolSidebar({
	collapsed,
	onToggleCollapse,
	onNavigate,
}: ToolSidebarProps) {
	const pathname = usePathname();

	return (
		<div className="tool-sidebar">
			<div className="tool-sidebar__header">
				<span className="tool-sidebar__label">Tools</span>
				<button
					type="button"
					className="tool-sidebar__collapse"
					onClick={onToggleCollapse}
					aria-label={
						collapsed
							? "Expand tool navigation"
							: "Collapse tool navigation"
					}
					title={collapsed ? "Expand" : "Collapse"}
				>
					<Icon
						icon={
							collapsed
								? "mdi:chevron-right"
								: "mdi:chevron-left"
						}
						width={18}
						height={18}
					/>
				</button>
			</div>

			<ul className="tool-sidebar__nav">
				<li>
					<Link
						href="/tools"
						className={cn(
							"tool-sidebar__link",
							pathname === "/tools" && "is-active",
						)}
						title="All Tools"
						onClick={onNavigate}
					>
						<span className="tool-sidebar__icon" aria-hidden>
							<Icon icon="mdi:view-grid-outline" width={20} height={20} />
						</span>
						<span className="tool-sidebar__text">All Tools</span>
					</Link>
				</li>
				{TOOLS.map((tool) => {
					const active = isActivePath(pathname, tool.href);
					return (
						<li key={tool.id}>
							<Link
								href={tool.href}
								className={cn("tool-sidebar__link", active && "is-active")}
								title={tool.title}
								aria-current={active ? "page" : undefined}
								onClick={onNavigate}
							>
								<span className="tool-sidebar__icon" aria-hidden>
									<Icon icon={tool.icon} width={20} height={20} />
								</span>
								<span className="tool-sidebar__text">{tool.title}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
