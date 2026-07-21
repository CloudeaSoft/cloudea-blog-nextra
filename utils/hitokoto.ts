const HITOKOTO_URL = "https://v1.hitokoto.cn";

/** Fixed quote used when building for visual regression (stable screenshots). */
const VISUAL_FIXTURE: Hitokoto = {
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
	if (process.env.VISUAL_REGRESSION === "1") {
		return VISUAL_FIXTURE;
	}

	try {
		const response = await fetch(HITOKOTO_URL);
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
