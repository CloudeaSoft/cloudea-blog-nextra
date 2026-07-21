import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export type FriendLink = {
	name: string;
	link: string;
	description?: string;
	avatar?: string;
};

export type FriendCategory = {
	links_category: string;
	list: FriendLink[];
};

/**
 * Load friend-link categories from `friends.yml` (build-time / server).
 */
export function getFriendCategories(): FriendCategory[] {
	const filePath = path.join(process.cwd(), "app/friends/friends.yml");
	const raw = fs.readFileSync(filePath, "utf8");
	const data = parse(raw) as unknown;

	if (!Array.isArray(data)) {
		throw new Error("friends.yml must be a YAML list of categories");
	}

	return data.map((entry, index) => {
		if (!entry || typeof entry !== "object") {
			throw new Error(`friends.yml: invalid category at index ${index}`);
		}
		const category = entry as Record<string, unknown>;
		const title = category.links_category;
		const list = category.list;

		if (typeof title !== "string" || !title.trim()) {
			throw new Error(
				`friends.yml: category at index ${index} needs a non-empty links_category`,
			);
		}
		if (!Array.isArray(list)) {
			throw new Error(
				`friends.yml: category "${title}" needs a list of links`,
			);
		}

		return {
			links_category: title.trim(),
			list: list.map((item, linkIndex) => {
				if (!item || typeof item !== "object") {
					throw new Error(
						`friends.yml: invalid link under "${title}" at index ${linkIndex}`,
					);
				}
				const link = item as Record<string, unknown>;
				if (typeof link.name !== "string" || !link.name.trim()) {
					throw new Error(
						`friends.yml: link under "${title}" at index ${linkIndex} needs a name`,
					);
				}
				if (typeof link.link !== "string" || !link.link.trim()) {
					throw new Error(
						`friends.yml: link "${link.name}" under "${title}" needs a link URL`,
					);
				}
				return {
					name: link.name.trim(),
					link: link.link.trim(),
					description:
						typeof link.description === "string"
							? link.description.trim()
							: undefined,
					avatar:
						typeof link.avatar === "string" ? link.avatar.trim() : undefined,
				};
			}),
		};
	});
}
