"use client";

import {
	MenuItem as _MenuItem,
	Menu,
	MenuButton,
	MenuItems,
} from "@headlessui/react";
import { ArrowRightIcon } from "nextra/icons";
import cn from "clsx";

import { usePathname } from "next/navigation";
import { Anchor, Search } from "nextra/components";
import { normalizePages } from "nextra/normalize-pages";
import { ThemeSwitch } from "./theme-switch";
import { GithubNav } from "./github";
import { MenuItem } from "nextra/normalize-pages";
import { FC, ReactNode } from "react";

const classes = {
	link: cn(
		"text-sm contrast-more:text-gray-700 contrast-more:dark:text-gray-100 whitespace-nowrap",
		"text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-gray-200",
		"ring-inset transition-colors",
	),
};

const NavbarMenu: FC<{
	menu: MenuItem;
	children: ReactNode;
}> = ({ menu, children }) => {
	const routes = Object.fromEntries(
		(menu.children || []).map((route) => [route.name, route]),
	);
	return (
		<Menu>
			<MenuButton
				className={cn(
					classes.link,
					"items-center flex gap-1.5 cursor-pointer focus:outline-none text-[1.1rem]! text-(--default-text-color)! hover:text-(--primary-color)!",
				)}
			>
				{children}
				<ArrowRightIcon
					height="14"
					className="*:origin-center *:transition-transform *:rotate-90"
				/>
			</MenuButton>
			<MenuItems
				transition
				className={cn(
					"focus-visible:nextra-focus",
					"focus:outline-none",
					"nextra-scrollbar motion-reduce:transition-none",
					// From https://headlessui.com/react/menu#adding-transitions
					"origin-top transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0",
					"border border-(--border-color)",
					"z-30 rounded-md py-1 text-sm shadow-lg",
					"backdrop-blur-md bg-(--background-color-transparent-80)",
					// headlessui adds max-height as style, use !important to override
					"max-h-[min(calc(100vh-5rem),256px)]!",
				)}
				anchor={{ to: "bottom", gap: 10, padding: 16 }}
				modal={false}
			>
				{Object.entries(
					(menu.items as Record<string, { title: string; href?: string }>)
					|| {},
				).map(([key, item]) => (
					<_MenuItem
						key={key}
						as={Anchor}
						href={item.href || routes[key]?.route}
						className={({ focus }) =>
							cn(
								"block py-1.5 transition-colors ps-3 pe-9",
								focus
									? "text-gray-900 dark:text-gray-100"
									: "text-gray-600 dark:text-gray-400",
							)}
					>
						{item.title}
					</_MenuItem>
				))}
			</MenuItems>
		</Menu>
	);
};

export const ClientNavbar = ({ pageMap }) => {
	const pathname = usePathname();
	const { topLevelNavbarItems } = normalizePages({
		list: pageMap,
		route: pathname,
	});

	return (
		<>
			<ul className="flex p-5 pt-6 gap-6 items-center text-center">
				{topLevelNavbarItems.map((page) => {
					const route = page.route || ("href" in page ? page.href! : "");
					if ("display" in page && page.display === "hidden") return;
					if (page.type === "menu") {
						return (
							<li key={route}>
								<NavbarMenu
									key={page.name}
									menu={page as MenuItem}
								>
									{" "}
									{page.title}
								</NavbarMenu>
							</li>
						);
					}

					return (
						<li key={route}>
							<Anchor
								href={route.toString()}
								style={{ fontSize: "1.1rem" }}
							>
								{page.title}
							</Anchor>
						</li>
					);
				})}
			</ul>

			<Search />

			<ul className="flex items-center gap-5 p-5">
				<li>
					<ThemeSwitch />
				</li>
				<li>
					<GithubNav />
				</li>
			</ul>
		</>
	);
};
