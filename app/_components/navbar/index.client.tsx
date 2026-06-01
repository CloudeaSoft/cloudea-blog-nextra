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
import { Anchor, Button, Search } from "nextra/components";
import { normalizePages } from "nextra/normalize-pages";
import { ThemeSwitch } from "./theme-switch";
import { GithubNav } from "./github";
import { MenuItem } from "nextra/normalize-pages";
import { FC, ReactNode, useEffect } from "react";
import type { PageMapItem } from "nextra";
import { Icon } from "@iconify-icon/react";
import { useAtom } from "jotai";
import { menuAtom } from "../../../stores/menu";
import Link from "next/link";

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
	className?: string;
}> = ({ menu, children, className }) => {
	const routes = Object.fromEntries(
		(menu.children || []).map((route) => [route.name, route]),
	);
	return (
		<Menu>
			<MenuButton
				className={cn(
					classes.link,
					"items-center flex gap-1.5 cursor-pointer focus:outline-none text-[1.1rem]! text-(--default-text-color)! hover:text-(--primary-color)!",
					className,
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

export const ClientNavbar = ({
	pageMap,
	className,
}: {
	pageMap: PageMapItem[];
	className?: string;
}) => {
	const pathname = usePathname();
	const { topLevelNavbarItems } = normalizePages({
		list: pageMap,
		route: pathname,
	});

	const [menu, setMenu] = useAtom(menuAtom);
	const toggleMenu = () => setMenu((prev) => !prev);

	return (
		<>
			<ul
				className={cn(
					"flex p-5 pt-6 gap-6 items-center text-center",
					className,
					"max-lg:hidden",
				)}
			>
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

			<div className="max-lg:hidden flex justify-center">
				<Search />
			</div>

			<ul className={cn("flex items-center gap-5 p-5", "max-lg:hidden!")}>
				<li>
					<ThemeSwitch />
				</li>
				<li>
					<GithubNav />
				</li>
			</ul>

			<Button
				aria-label="Menu"
				className={cn("nextra-hamburger lg:hidden mr-5")}
				onClick={toggleMenu}
			>
				<Icon
					icon={menu ? "lucide:list-x" : "lucide:list"}
					height={24}
				/>
			</Button>
		</>
	);
};

const MobileNavbarMenu: FC<{
	menu: MenuItem;
	children: ReactNode;
	className?: string;
}> = ({ menu, children, className }) => {
	const routes = Object.fromEntries(
		(menu.children || []).map((route) => [route.name, route]),
	);
	return (
		<Menu>
			<MenuButton
				className={cn(
					classes.link,
					"items-center flex gap-1.5 cursor-pointer focus:outline-none text-[1.1rem]! text-(--default-text-color)! hover:text-(--primary-color)!",
					className,
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
					"z-30 rounded-md py-1 text-[1.1rem]!",
					// headlessui adds max-height as style, use !important to override
					"max-h-[min(calc(100vh-5rem),256px)]!",
				)}
				anchor={false}
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

export const MobileNavbar = ({
	links,
	pageMap,
}: {
	links: {
		name: string;
		icon: string;
		link: string;
		count: number;
	}[];
	pageMap: PageMapItem[];
}) => {
	const [menu, setMenu] = useAtom(menuAtom);

	const pathname = usePathname();
	const { topLevelNavbarItems } = normalizePages({
		list: pageMap,
		route: pathname,
	});

	useEffect(() => {
		if (menu) {
			setMenu(false);
		}
	}, [pathname]);

	return (
		<div
			className={cn(
				"fixed top-0 right-0 h-dvh w-full z-50 flex flex-col",
				"bg-(--background-color)",
				"transition-transform! duration-300 ease-out",
				menu ? "translate-x-0" : "translate-x-full",
				"max-lg:visible",
				"invisible",
			)}
		>
			<div className="mt-16 px-4 flex flex-col h-full justify-between">
				<ul className="flex flex-col justify-center items-start">
					<li className="flex flex-col w-full my-1.5">
						<Search className="lg:w-64 [&>input]:lg:w-64! [&_input]:md:w-full! [&_kbd]:max-lg:hidden" />
					</li>
					{topLevelNavbarItems.map((page) => {
						const route = page.route || ("href" in page ? page.href! : "");
						if ("display" in page && page.display === "hidden") return;
						if (page.type === "menu") {
							return (
								<li
									key={route}
									className="flex flex-col w-full my-1.5"
								>
									<MobileNavbarMenu
										key={page.name}
										menu={page as MenuItem}
										className="py-1.5 px-2 flex flex-row items-center justify-between"
									>
										{" "}
										{page.title}
									</MobileNavbarMenu>
								</li>
							);
						}

						return (
							<li
								key={route}
								className="flex flex-col w-full my-1.5"
							>
								<Anchor
									href={route.toString()}
									style={{ fontSize: "1.1rem" }}
									className="py-1.5 px-2 flex flex-row items-center justify-between"
								>
									{page.title}
								</Anchor>
							</li>
						);
					})}
				</ul>

				<div className="flex flex-col justify-center">
					<div className="sidebar-links grid grid-cols-3 gap-2 p-3 border-t border-(--border-color)">
						{links.map((linkItem) => (
							<Link
								key={linkItem.link}
								href={linkItem.link}
								className="flex flex-col items-center justify-center gap-1"
							>
								<Icon
									icon={linkItem.icon}
									width={18}
								/>
								<span className="text-xs">{linkItem.name}</span>
								<div className="font-bold text-[1.1rem]">{linkItem.count}</div>
							</Link>
						))}
					</div>
					<ul className={cn("flex items-center gap-5 p-5 justify-around")}>
						<li>
							<ThemeSwitch />
						</li>
						<li>
							<GithubNav />
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
};
