import type { Metadata } from "next";
import { Callout } from "nextra/components";
import cn from "clsx";
import { Comments } from "@/app/_components/mdx/comments";
import { FriendsCategories } from "./friends-categories";
import { getFriendCategories } from "./friends";

import "./friends.css";

export const metadata: Metadata = {
	title: "Friends",
	description: "Friend links — blogs and sites I follow and recommend.",
};

const SITE_YAML = `name: 清露茶坊
link: https://blog.cloudea.work
description: 雨落生烟，云过留露
avatar: https://blog.cloudea.work/images/avatar.jpg`;

const APPLY_YAML = `name: 你的站点名
link: https://your.site
description: 一句话简介
avatar: https://your.site/avatar.png`;

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

					<section
						id="exchange"
						className="friends-exchange mt-10 pt-8 border-t border-solid border-(--border-color)"
					>
						<h2 className="text-xl font-semibold text-(--first-text-color) m-0 mb-3">
							Exchange
						</h2>
						<p className="m-0 mb-4 text-(--third-text-color) leading-relaxed">
							If your site has original content and is online most of the time,
							feel free to apply.
						</p>
						<Callout type="important">
							请先将本站加入你的友链，确认可以访问后，再在下方评论区按格式留言。未先添加本站的申请不会处理。
						</Callout>
						<h3 className="friends-exchange__subtitle">
							本站信息
						</h3>
						<p className="friends-exchange__hint">
							把下面这段 YAML 加到你的友链列表里：
						</p>
						<pre className="friends-yaml">
							<code>{SITE_YAML}</code>
						</pre>
						<h3 className="friends-exchange__subtitle">
							申请留言格式
						</h3>
						<p className="friends-exchange__hint">
							添加完成后，在下方评论中粘贴并填写你的站点信息（字段与
							{" "}
							<code>friends.yml</code>
							{" "}
							一致）：
						</p>
						<pre className="friends-yaml">
							<code>{APPLY_YAML}</code>
						</pre>
						<Comments />
					</section>
				</div>
			</div>
		</div>
	);
}
