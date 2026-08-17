import type { Metadata } from "next";
import { Icon } from "@iconify-icon/react";
import Link from "next/link";
import cn from "clsx";
import { TOOLS } from "@/app/_components/tools/registry";

import "./tools.css";

export const metadata: Metadata = {
	title: "Tools",
	description: "Small browser tools — shader preview and more.",
};

export default function ToolsPage() {
	return (
		<div
			data-pagefind-body
			className={cn(
				"page-sheet pt-10 mb-7.5 flex justify-center",
				"max-lg:pt-0 max-lg:mb-0",
			)}
		>
			<div
				className={cn(
					"page-sheet__body max-w-250 relative w-[80%]",
					"max-lg:w-full",
				)}
			>
				<div
					className={cn(
						"page-sheet__panel tools-panel p-7.5 border border-solid rounded-[18px] border-(--border-color) shadow-(--cloudea-box-shadow) bg-(--background-color-transparent-80)",
						"max-lg:p-5 max-lg:rounded-none max-lg:shadow-none",
					)}
				>
					<header className="tools-header mb-8">
						<h1 className="text-3xl font-semibold text-(--first-text-color) m-0">
							Tools
						</h1>
						<p className="mt-3 mb-0 text-(--third-text-color) leading-relaxed">
							Browser utilities for experiments and learning. Everything runs
							client-side on this static site.
						</p>
					</header>

					<ul className="tools-grid list-none p-0 m-0">
						{TOOLS.map((tool) => (
							<li
								key={tool.id}
								className="tool-card"
							>
								<Link
									href={tool.href}
									className="tool-card__hit"
								>
									{tool.title}
								</Link>
								<div
									className="tool-card__icon"
									aria-hidden
								>
									<Icon
										icon={tool.icon}
										width={28}
										height={28}
									/>
								</div>
								<div className="tool-card__body">
									<div className="tool-card__name">{tool.title}</div>
									<div className="tool-card__desc">{tool.description}</div>
								</div>
								<Icon
									icon="mdi:chevron-right"
									width={18}
									height={18}
									className="tool-card__chevron"
									aria-hidden
								/>
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}
