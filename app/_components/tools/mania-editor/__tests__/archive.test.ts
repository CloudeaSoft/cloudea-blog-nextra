import { describe, expect, it } from "vitest";
import { strFromU8, strToU8, zipSync, unzipSync } from "fflate";
import { importArchive, exportArchive, findAsset, safePath } from "../archive";
import { source } from "./fixture";

describe("mania archives", () => {
	it("imports only mania difficulties and retains audio and other rulesets when exporting", async () => {
		const original = zipSync({
			"歌曲/map.osu": strToU8(source),
			"standard.osu": strToU8(source.replace("Mode: 3", "Mode: 0")),
			"歌曲/song.ogg": new Uint8Array([1, 2, 3]),
			"story.osb": strToU8("// untouched storyboard"),
		});
		const project = await importArchive(original);
		expect(project.charts).toHaveLength(1);
		expect(findAsset(project.assets, "歌曲/map.osu", "song.ogg")).toEqual(new Uint8Array([1, 2, 3]));
		project.charts[0].beatmap.metadata.Title = "Edited";
		const exported = unzipSync(await exportArchive(project));
		expect(strFromU8(exported["歌曲/map.osu"])).toContain("Title:Edited");
		expect(strFromU8(exported["standard.osu"])).toContain("Mode: 0");
		expect(strFromU8(exported["story.osb"])).toBe("// untouched storyboard");
		expect((await importArchive(await exportArchive(project))).charts[0].beatmap.notes).toHaveLength(3);
	});
	it("resolves relative Windows paths and case-insensitive assets", () => {
		expect(findAsset({ "set/Audio/Song.ogg": new Uint8Array([9]) }, "set/map.osu", "Audio\\song.ogg")).toEqual(new Uint8Array([9]));
		expect(safePath("../secret")).toBeNull();
		expect(safePath("C:\\secret")).toBeNull();
	});
	it("rejects corrupt archives and archives with no mania difficulty", async () => {
		await expect(importArchive(new Uint8Array([1, 2, 3]))).rejects.toThrow();
		await expect(importArchive(zipSync({ "std.osu": strToU8(source.replace("Mode: 3", "Mode: 0")) }))).rejects.toThrow(/mania/i);
	});
	it("rejects unsafe archive paths instead of exporting them later", async () => {
		await expect(importArchive(zipSync({ "../map.osu": strToU8(source) }))).rejects.toThrow(/路径/);
	});

	it("rejects an excessive declared expanded size before allocating its contents", async () => {
		const archive = zipSync({ "map.osu": strToU8(source) });
		const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
		// ZIP central-directory uncompressed-size field: simulate a bomb without allocating one.
		let patched = false;
		for (let i = 0; i < archive.length - 24; i++) {
			if (view.getUint32(i, true) === 0x02014b50) {
				view.setUint32(i + 24, 300 * 1024 * 1024, true);
				patched = true;
				break;
			}
		}
		expect(patched).toBe(true);
		await expect(importArchive(archive)).rejects.toThrow(/展开后过大/);
	});
});
