/**
 * Fisher–Yates shuffle. Returns a new array; does not mutate `items`.
 */
export function shuffle<T>(items: readonly T[]): T[] {
	const result = items.slice();
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const tmp = result[i]!;
		result[i] = result[j]!;
		result[j] = tmp;
	}
	return result;
}
