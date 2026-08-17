import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@iconify-icon/react";
import cn from "clsx";
import { FriendsCategories } from "./friends-categories";
import { getFriendCategories } from "./friends";

import "./friends.css";

export const metadata: Metadata = {
	title: "Friends",
	description: "Friend links — blogs and sites I follow and recommend.",
};

const EXCHANGE_EMAIL = "cloudeasoft@qq.com";

export default function FriendsPage() {
	const categories = getFriendCategories();
	const hasLinks = categories.some((category) => category.list.length > 0);

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
						"page-sheet__panel friends-panel p-7.5 border border-solid rounded-[18px] border-(--border-color) shadow-(--cloudea-box-shadow) bg-(--background-color-transparent-80)",
						"max-lg:p-5 max-lg:rounded-none max-lg:shadow-none",
					)}
				>
					<header className="friends-header mb-8">
						<h1 className="text-3xl font-semibold text-(--first-text-color) m-0">
							Friends
						</h1>
						<p className="mt-3 mb-0 text-(--third-text-color) leading-relaxed">
							友链 — blogs and sites worth a visit. Want to exchange links?
							Reach out below.
						</p>
					</header>

					{!hasLinks
						? (
							<p className="friends-empty text-(--third-text-color) text-center py-10 m-0">
								暂无友链 · No friends listed yet
							</p>
						)
						: (
							<FriendsCategories
								categories={categories}
								stabilizeOrder={process.env.VISUAL_REGRESSION === "1"}
							/>
						)}

					<section className="friends-exchange mt-10 pt-8 border-t border-solid border-(--border-color)">
						<h2 className="text-xl font-semibold text-(--first-text-color) m-0 mb-3">
							Exchange
						</h2>
						<p className="m-0 mb-4 text-(--third-text-color) leading-relaxed">
							If your site has original content and is online most of the time,
							feel free to apply. Add this site to your friend links first, then
							leave a comment on the
							{" "}
							<Link
								href="/about#友链交换"
								className="friends-exchange__about text-(--primary-color) no-underline hover:underline"
							>
								About
							</Link>
							{" "}
							page using the YAML template there. Applications without a
							reciprocal link will be skipped. You can also email:
						</p>
						<a
							href={`mailto:${EXCHANGE_EMAIL}?subject=${encodeURIComponent("Friend link exchange")}`}
							className="friends-exchange__mail inline-flex items-center gap-2 text-(--primary-color) no-underline hover:underline"
						>
							<Icon
								icon="lucide:mail"
								width={18}
								height={18}
							/>
							{EXCHANGE_EMAIL}
						</a>
					</section>
				</div>
			</div>
		</div>
	);
}
