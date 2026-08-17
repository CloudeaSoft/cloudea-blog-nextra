"use client";

import { useLayoutEffect, useState, type FC } from "react";
import { Icon } from "@iconify-icon/react";
import type { FriendCategory } from "./friends";

type FriendsCategoriesProps = {
	categories: FriendCategory[];
	/** Keep YAML order (used by visual regression builds). */
	stabilizeOrder?: boolean;
};

/** Fisher–Yates; returns a new array. */
function shuffle<T>(items: readonly T[]): T[] {
	const result = items.slice();
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const tmp = result[i]!;
		result[i] = result[j]!;
		result[j] = tmp;
	}
	return result;
}

/**
 * Renders friend-link categories. Link order within each category is
 * shuffled on the client after mount so every refresh gets a new order
 * (static export cannot randomize per request on the server).
 */
export const FriendsCategories: FC<FriendsCategoriesProps> = ({
	categories,
	stabilizeOrder = false,
}) => {
	const [ordered, setOrdered] = useState(categories);

	useLayoutEffect(() => {
		if (stabilizeOrder) return;
		setOrdered(
			categories.map((category) => ({
				...category,
				list: shuffle(category.list),
			})),
		);
	}, [categories, stabilizeOrder]);

	return (
		<div className="friends-categories">
			{ordered.map((category) => (
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
	);
};
