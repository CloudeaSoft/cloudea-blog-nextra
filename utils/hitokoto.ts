const HITOKOTO_URL: string = "https://v1.hitokoto.cn";

export const GetHitokoto = async (): Promise<Hitokoto> => {
	try {
		const response = await fetch(HITOKOTO_URL);
		const data = await response.json();

		if (data && typeof data === "object" && (data as Hitokoto).hitokoto) {
			return data;
		}

		throw new Error("Hitokoto is inavailable for unknown reason.");
	} catch (ex) {
		console.warn(ex.message);
		return null;
	}
};
