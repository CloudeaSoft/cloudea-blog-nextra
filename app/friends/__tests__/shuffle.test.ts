import { describe, expect, it, vi, afterEach } from "vitest";
import { shuffle } from "../shuffle";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("shuffle", () => {
	it("returns a new array and leaves the input unchanged", () => {
		const input = [1, 2, 3, 4];
		const result = shuffle(input);
		expect(result).not.toBe(input);
		expect(input).toEqual([1, 2, 3, 4]);
		expect(result).toHaveLength(input.length);
		expect(result.toSorted()).toEqual(input.toSorted());
	});

	it("handles empty and single-element arrays", () => {
		expect(shuffle([])).toEqual([]);
		expect(shuffle(["only"])).toEqual(["only"]);
	});

	it("uses Math.random to permute elements (Fisher–Yates)", () => {
		// Force each swap to take j = 0 so [1,2,3,4] → [2,3,4,1]
		vi.spyOn(Math, "random").mockReturnValue(0);
		expect(shuffle([1, 2, 3, 4])).toEqual([2, 3, 4, 1]);
	});
});
