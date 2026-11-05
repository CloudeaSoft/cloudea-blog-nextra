import { describe, expect, it } from "vitest";
import { noteBounds } from "../note-skin";

describe("default note hit regions", () => {
	it("includes the full displayed head above the timestamp, not only the old thin bar", () => {
		expect(noteBounds(300, 300, 64)).toEqual({ top: 258, bottom: 300, headTop: 258, height: 42 });
	});
	it("extends a hold hit region through the tail cap and scales with narrow columns", () => {
		expect(noteBounds(300, 100, 34)).toEqual({ top: 79, bottom: 300, headTop: 279, height: 21 });
	});
});
