export type Friend = {
	name: string;
	url: string;
	description: string;
	avatar?: string;
};

/**
 * Friend links (友链). Add entries here to show them on `/friends`.
 */
export const friends: Friend[] = [
	// {
	// 	name: "Example",
	// 	url: "https://example.com",
	// 	description: "A short blurb about this site.",
	// 	avatar: "https://example.com/avatar.png",
	// },
];
