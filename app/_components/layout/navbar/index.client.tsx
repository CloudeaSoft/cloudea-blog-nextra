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
import { MenuItem, PageItem } from "nextra/normalize-pages";
import {
	FC,
	ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { PageMapItem } from "nextra";
import { Icon } from "@iconify-icon/react";
import { useAtom } from "jotai";
import { menuAtom } from "@/stores/menu";
import Link from "next/link";

const SCROLL_COMPACT_THRESHOLD = 36;

const classes = {
	link: cn(
		"text-sm contrast-more:text-gray-700 contrast-more:dark:text-gray-100 whitespace-nowrap",
		"text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-gray-200",
		"ring-inset transition-colors",
	),
};

function getNavHref(page: PageItem | MenuItem): string {
	if ("href" in page && page.href) return page.href;
	return page.route || "";
}

function isPathActive(href: string, pathname: string): boolean {
	if (!href || href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}

function isNavItemActive(page: PageItem | MenuItem, pathname: string): boolean {
	if (page.type === "menu") {
		const menu = page as MenuItem;
		const items = (menu.items
			|| {}) as Record<string, { title: string; href?: string }>;
		const childRoutes = Object.fromEntries(
			(menu.children || []).map((route) => [route.name, route]),
		);

		const fromItems = Object.entries(items).some(([key, item]) => {
			const href = item.href || childRoutes[key]?.route || "";
			return isPathActive(href, pathname);
		});
		if (fromItems) return true;

		return isPathActive(getNavHref(page), pathname);
	}

	return isPathActive(getNavHref(page), pathname);
}

export const NavbarShell: FC<{ children: ReactNode }> = ({ children }) => {
	const [compact, setCompact] = useState(false);

	useEffect(() => {
		const update = () => {
			setCompact(window.scrollY > SCROLL_COMPACT_THRESHOLD);
		};
		update();
		window.addEventListener("scroll", update, { passive: true });
		return () => window.removeEventListener("scroll", update);
	}, []);

	return (
		<header
			className="navbar-header"
			data-compact={compact || undefined}
		>
			<nav
				className="navbar-bar"
				data-compact={compact || undefined}
			>
				{children}
			</nav>
		</header>
	);
};

const NavbarMenu: FC<{
	menu: MenuItem;
	children: ReactNode;
	className?: string;
	active?: boolean;
}> = ({ menu, children, className, active }) => {
	const routes = Object.fromEntries(
		(menu.children || []).map((route) => [route.name, route]),
	);
	const items = Object.entries(
		(menu.items as Record<string, { title: string; href?: string }>) || {},
	);

	return (
		<div className="navbar-menu">
			<button
				type="button"
				className={cn(
					classes.link,
					"navbar-link items-center flex gap-1.5 focus:outline-none",
					className,
				)}
				data-active={active || undefined}
				aria-haspopup="menu"
				// Keep open-on-hover: don't focus (and open via :focus-within) on mouse click.
				onMouseDown={(event) => event.preventDefault()}
			>
				<span className="navbar-link__item">
					<span className="navbar-link__label">{children}</span>
				</span>
				<ArrowRightIcon
					height="14"
					className="navbar-link__caret"
				/>
			</button>
			<div className="navbar-menu__dropdown">
				<ul
					className="navbar-menu__panel"
					role="menu"
				>
					{items.map(([key, item]) => (
						<li
							key={key}
							role="none"
						>
							<Anchor
								href={item.href || routes[key]?.route}
								className="navbar-menu__option"
								role="menuitem"
							>
								{item.title}
							</Anchor>
						</li>
					))}
				</ul>
			</div>
		</div>
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
					"navbar-links",
					className,
					"max-lg:hidden",
				)}
			>
				{topLevelNavbarItems.map((page) => {
					const href = getNavHref(page);
					if ("display" in page && page.display === "hidden") return;
					const active = isNavItemActive(page, pathname);

					if (page.type === "menu") {
						return (
							<li key={href || page.name}>
								<NavbarMenu
									menu={page as MenuItem}
									active={active}
								>
									{page.title}
								</NavbarMenu>
							</li>
						);
					}

					return (
						<li key={href || page.name}>
							<Anchor
								href={href}
								className="navbar-link"
								data-active={active || undefined}
								aria-current={active ? "page" : undefined}
							>
								<span className="navbar-link__item">
									<span className="navbar-link__label">{page.title}</span>
								</span>
							</Anchor>
						</li>
					);
				})}
			</ul>

			<div className="max-lg:hidden flex justify-center">
				<Search />
			</div>

			<ul className={cn("flex items-center gap-5 px-5", "max-lg:hidden!")}>
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
					icon={
						menu
							? "line-md:menu-to-close-transition"
							: "line-md:close-to-menu-transition"
					}
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

	// Lock background scroll while the mobile drawer is open. useLayoutEffect
	// avoids a flash of a scrollable body during the open transition, and only
	// runs on the client so SSR markup is unaffected.
	const prevOverflow = useRef<string | null>(null);
	useLayoutEffect(() => {
		if (typeof document === "undefined") return;
		const { body } = document;
		if (menu) {
			prevOverflow.current = body.style.overflow;
			body.style.overflow = "hidden";
		} else if (prevOverflow.current !== null) {
			body.style.overflow = prevOverflow.current;
			prevOverflow.current = null;
		}
		return () => {
			if (prevOverflow.current !== null) {
				body.style.overflow = prevOverflow.current;
				prevOverflow.current = null;
			}
		};
	}, [menu]);

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
				// Match transition-transform's property list (transform, translate,
				// scale, rotate) and add visibility: translate-x-* in Tailwind v4
				// animates the `translate` property, so it must be listed or the
				// drawer teleports instead of sliding. visibility is delayed so the
				// drawer stays focusable during the slide and hides after it.
				"transition-[transform,translate,scale,rotate,visibility]! duration-300 ease-out lg:hidden",
				menu ? "translate-x-0 visible" : "translate-x-full invisible",
			)}
		>
			<div className="mt-16 px-4 flex flex-col h-full justify-between">
				<ul className="flex flex-col justify-center items-start">
					<li className="flex flex-col w-full my-1.5">
						<Search className="lg:w-64 [&>input]:lg:w-64! [&_input]:md:w-full! [&_kbd]:max-lg:hidden" />
					</li>
					{topLevelNavbarItems.map((page) => {
						const href = getNavHref(page);
						if ("display" in page && page.display === "hidden") return;
						if (page.type === "menu") {
							return (
								<li
									key={href || page.name}
									className="flex flex-col w-full my-1.5"
								>
									<MobileNavbarMenu
										menu={page as MenuItem}
										className="py-1.5 px-2 flex flex-row items-center justify-between"
									>
										{page.title}
									</MobileNavbarMenu>
								</li>
							);
						}

						return (
							<li
								key={href || page.name}
								className="flex flex-col w-full my-1.5"
							>
								<Anchor
									href={href}
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
