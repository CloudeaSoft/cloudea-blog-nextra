import { strFromU8, strToU8, unzip, zip } from "fflate";
import { type Project, parseBeatmap, serializeBeatmap } from "./model";
export const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 256 * 1024 * 1024;
export function safePath(path: string): string | null {
	const normalized = path.replaceAll("\\", "/");
	if (!normalized || normalized.startsWith("/") || normalized.includes(":") || [...normalized].some((c) => c.charCodeAt(0) < 32) || normalized.split("/").includes(".."))
		return null;
	return normalized.split("/").filter((part) => part && part !== ".").join("/");
}
export function assetPath(chartFilename: string, filename: string): string | null {
	const safe = safePath(filename);
	if (!safe)
		return null;
	const folder = chartFilename.replaceAll("\\", "/").split("/").slice(0, -1).join("/");
	return safePath(folder ? `${folder}/${safe}` : safe);
}
export function findAsset(assets: Project["assets"], chartFilename: string, filename: string): Uint8Array | undefined {
	const path = assetPath(chartFilename, filename)?.toLowerCase();
	if (!path)
		return;
	const found = Object.keys(assets).find((key) => key.toLowerCase() === path);
	return found ? assets[found] : undefined;
}
export async function importArchive(bytes: Uint8Array): Promise<Project> {
	if (bytes.byteLength > MAX_ARCHIVE_BYTES)
		throw new Error("谱面包超过 128 MB 上限。");
	let total = 0;
	let count = 0;
	let problem = "";
	const raw = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
		unzip(bytes, {
			filter(file) {
				total += file.originalSize;
				count++;
				if (!safePath(file.name))
					problem = "谱面包包含不安全的文件路径。";
				if (total > MAX_EXPANDED_BYTES || file.originalSize > 64 * 1024 * 1024 || count > 5000)
					problem = "谱面包展开后过大（总计 256 MB、单文件 64 MB、5000 文件）。";
				return !problem && !file.name.endsWith("/");
			},
		}, (error, files) => error ? reject(new Error(`无法解压 .osz：${error.message}`)) : resolve(files));
	});
	if (problem)
		throw new Error(problem);
	const assets: Project["assets"] = Object.create(null);
	const charts: Project["charts"] = [];
	for (const [name, data] of Object.entries(raw)) {
		const path = safePath(name)!;
		if (Object.hasOwn(assets, path))
			throw new Error("谱面包有重复文件路径。");
		assets[path] = data;
		if (!path.toLowerCase().endsWith(".osu"))
			continue;
		const text = strFromU8(data);
		// Other rulesets stay in the archive, but aren't offered as editable difficulties.
		const general = text.match(/\[General\]([^]*?)(?=\n\[|$)/)?.[1];
		if (!/^Mode\s*:\s*3\s*$/m.test(general || ""))
			continue;
		try {
			charts.push({ filename: path, beatmap: parseBeatmap(text) });
		} catch (error) {
			throw new Error(`${path}：${error instanceof Error ? error.message : "解析失败"}`, { cause: error });
		}
	}
	if (!charts.length)
		throw new Error("谱面包内没有原生 osu!mania 难度。");
	return { charts, assets };
}
export async function exportArchive(project: Project): Promise<Uint8Array> {
	const files: Record<string, Uint8Array> = Object.assign(Object.create(null), project.assets);
	for (const chart of project.charts)
		files[chart.filename] = strToU8(serializeBeatmap(chart.beatmap));
	return new Promise((resolve, reject) => {
		zip(files, { level: 1 }, (error, result) => error ? reject(error) : resolve(result));
	});
}
export function downloadFile(bytes: Uint8Array | string, filename: string): void {
	const blob = new Blob([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], { type: "application/octet-stream" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 10000);
}
