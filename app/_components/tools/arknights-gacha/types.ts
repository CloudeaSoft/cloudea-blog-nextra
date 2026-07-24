export type GachaAuth = {
	uid: string;
	cookie: string;
	accountToken: string;
	roleToken: string;
};

export type GachaCategory = {
	id: string;
	name: string;
	/** Display label with newlines collapsed to spaces. */
	label: string;
};

export type GachaRecord = {
	poolId: string;
	poolName: string;
	charId: string;
	charName: string;
	/** Official rarity (0–5). Display stars = rarity + 1. */
	rarity: number;
	isNew: boolean;
	gachaTs: string;
	pos: number;
	/** Parsed millisecond timestamp from `gachaTs`. */
	gachaAt: Date;
};

export type GachaApiEnvelope<T> = {
	code: number;
	data: T;
	msg: string;
};

export type RawGachaCategory = {
	id: string;
	name: string;
};

export type RawGachaRecord = {
	poolId: string;
	poolName: string;
	charId: string;
	charName: string;
	rarity: number;
	isNew: boolean;
	gachaTs: string;
	pos: number;
};

export type RawGachaHistoryPage = {
	list: RawGachaRecord[];
	hasMore: boolean;
};

export type GachaHistoryPage = {
	list: GachaRecord[];
	hasMore: boolean;
};

export class GachaApiError extends Error {
	readonly code: number | null;
	readonly status: number | null;

	constructor(
		message: string,
		options?: { code?: number | null; status?: number | null; cause?: unknown },
	) {
		super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
		this.name = "GachaApiError";
		this.code = options?.code ?? null;
		this.status = options?.status ?? null;
	}
}
