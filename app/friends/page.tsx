import type { Metadata } from "next";
import { Icon } from "@iconify-icon/react";
import cn from "clsx";
import { getImageUrl } from "@/utils/get-resources-url";
import { getFriendCategories } from "./friends";

import "./friends.css";

export const metadata: Metadata = {
	title: "Friends",
	description: "Friend links — blogs and sites I follow and recommend.",
};

const EXCHANGE_EMAIL = "cloudeasoft@qq.com";

/** Site info for link exchange — avatar is hosted on this domain. */
const SITE_FRIEND_LINK = {
	title: "Cloudea's Blog",
	description: "清露茶坊",
	website: "https://blog.cloudea.work/",
	image: "https://blog.cloudea.work/images/avatar.jpg",
} as const;

export default function FriendsPage() {
	const categories = getFriendCategories();
	const hasLinks = categories.some((category) => category.list.length > 0);

	return (
		<div
			data-pagefind-body
			className={cn(
				"pt-10 mb-7.5 flex justify-center",
				"max-lg:pt-0 max-lg:mb-0",
			)}
		>
			<div className={cn("max-w-250 relative w-[80%] h-full", "max-lg:w-full")}>
				<div
					className={cn(
						"friends-panel p-7.5 border border-solid rounded-[18px] border-(--border-color) shadow-(--cloudea-box-shadow) bg-(--background-color-transparent-80)",
						"max-lg:p-5 max-lg:rounded-none",
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
							<div className="friends-categories">
								{categories.map((category) => (
									<section
										key={category.links_category}
										className="friends-category"
									>
										<h2 className="friends-category__title">
											{category.links_category}
										</h2>
										{category.list.length === 0
											? (
												<p className="friends-category__empty m-0 text-(--third-text-color)">
													暂无
												</p>
											)
											: (
												<ul className="friends-grid list-none p-0 m-0">
													{category.list.map((friend) => (
														<li
															key={`${friend.name}-${friend.link}`}
															className="friend-card"
														>
															{/* Stretched hit-target: keeps text out of global `a:hover` styles */}
															<a
																href={friend.link}
																target="_blank"
																rel="noopener noreferrer"
																className="friend-card__hit"
															>
																{friend.name}
															</a>
															<div
																className="friend-card__avatar"
																aria-hidden
															>
																{friend.avatar
																	? (
																		<img
																			src={friend.avatar}
																			alt=""
																			width={44}
																			height={44}
																			loading="lazy"
																			referrerPolicy="no-referrer"
																		/>
																	)
																	: (
																		<Icon
																			icon="mdi:account-circle-outline"
																			width={32}
																			height={32}
																		/>
																	)}
															</div>
															<div className="friend-card__body">
																<div className="friend-card__name">
																	{friend.name}
																</div>
																{friend.description && (
																	<div className="friend-card__desc">
																		{friend.description}
																	</div>
																)}
															</div>
															<Icon
																icon="line-md:external-link"
																width={16}
																height={16}
																className="friend-card__external"
																aria-hidden
															/>
														</li>
													))}
												</ul>
											)}
									</section>
								))}
							</div>
						)}

					<section className="friends-exchange mt-10 pt-8 border-t border-solid border-(--border-color)">
						<h2 className="text-xl font-semibold text-(--first-text-color) m-0 mb-3">
							Exchange
						</h2>
						<p className="m-0 mb-4 text-(--third-text-color) leading-relaxed">
							If your site has original content and is online most of the time,
							feel free to apply. Please include your site name, URL, a short
							description, and an avatar if you have one.
						</p>

						<div
							className="friends-exchange__site"
							data-testid="friends-exchange-site"
						>
							<div className="friends-exchange__site-heading">
								<img
									src={getImageUrl("avatar.jpg")}
									alt=""
									width={44}
									height={44}
									loading="lazy"
									className="friends-exchange__site-avatar"
								/>
								<div className="min-w-0">
									<p className="friends-exchange__site-label m-0">
										本站信息 · This site
									</p>
									<p className="friends-exchange__site-title m-0">
										{SITE_FRIEND_LINK.title}
									</p>
								</div>
							</div>
							<dl className="friends-exchange__site-fields m-0">
								<div>
									<dt>Title</dt>
									<dd>{SITE_FRIEND_LINK.title}</dd>
								</div>
								<div>
									<dt>Description</dt>
									<dd>{SITE_FRIEND_LINK.description}</dd>
								</div>
								<div>
									<dt>Website</dt>
									<dd>
										<a
											href={SITE_FRIEND_LINK.website}
											target="_blank"
											rel="noopener noreferrer"
										>
											{SITE_FRIEND_LINK.website}
										</a>
									</dd>
								</div>
								<div>
									<dt>Avatar</dt>
									<dd>
										<a
											href={SITE_FRIEND_LINK.image}
											target="_blank"
											rel="noopener noreferrer"
										>
											{SITE_FRIEND_LINK.image}
										</a>
									</dd>
								</div>
							</dl>
						</div>

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
