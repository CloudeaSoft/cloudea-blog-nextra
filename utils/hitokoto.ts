const HITOKOTO_URL = "https://v1.hitokoto.cn";

/** Fixed quote used when building for visual regression (stable screenshots). */
export const VISUAL_FIXTURE: Hitokoto = {
	id: 0,
	uuid: "visual-regression-fixture",
	hitokoto: "意思が希望を生んで、希望が夢を育てて、夢が世界を変えるんだ",
	type: "a",
	from: "visual-regression",
	creator: "fixture",
	reviewer: 0,
	commit_from: "fixture",
	created_at: "0",
	length: 0,
};

export const GetHitokoto = async (): Promise<Hitokoto | null> => {
	try {
		const response = await fetch(HITOKOTO_URL, {
			// Fresh quote on every client load (static export cannot re-fetch on the server).
			cache: "no-store",
		});
		const data = await response.json();

		if (data && typeof data === "object" && (data as Hitokoto).hitokoto) {
			return data;
		}

		throw new Error("Hitokoto is inavailable for unknown reason.");
	} catch (ex) {
		console.warn(ex instanceof Error ? ex.message : ex);
		return null;
	}
};
