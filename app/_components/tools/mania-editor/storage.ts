import { type Project, parseBeatmap, serializeBeatmap } from "./model";

export type DraftSummary = { id: string; name: string; savedAt: string; chartCount: number };
type Draft = { id: string; charts: { filename: string; text: string }[]; assets: Project["assets"] };

function database(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("cloudea-mania-drafts", 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore("drafts", { keyPath: "id" });
			request.result.createObjectStore("summaries", { keyPath: "id" });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
		request.onblocked = () => reject(new Error("草稿数据库被另一个标签页占用。"));
	});
}

export async function listDrafts(): Promise<DraftSummary[]> {
	const db = await database();
	try {
		const summaries = await new Promise<DraftSummary[]>((resolve, reject) => {
			const request = db.transaction("summaries", "readonly").objectStore("summaries").getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		return summaries.sort((a, b) => b.savedAt.localeCompare(a.savedAt) || a.name.localeCompare(b.name));
	} finally {
		db.close();
	}
}

export async function saveDraft(project: Project, name: string, id: string = crypto.randomUUID()): Promise<DraftSummary> {
	const trimmed = name.trim();
	if (!trimmed || trimmed.length > 80) throw new Error("草稿名称需要 1–80 个字符。");
	const summary: DraftSummary = { id, name: trimmed, savedAt: new Date().toISOString(), chartCount: project.charts.length };
	const draft: Draft = { id, charts: project.charts.map((c) => ({ filename: c.filename, text: serializeBeatmap(c.beatmap) })), assets: project.assets };
	const db = await database();
	try {
		// Keep lightweight list metadata and the complete project snapshot atomic.
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(["drafts", "summaries"], "readwrite");
			transaction.objectStore("drafts").put(draft);
			transaction.objectStore("summaries").put(summary);
			transaction.oncomplete = () => resolve();
			transaction.onabort = () => reject(transaction.error || new Error("无法保存草稿。"));
			transaction.onerror = () => reject(transaction.error);
		});
		return summary;
	} finally {
		db.close();
	}
}

export async function loadDraft(id: string): Promise<Project | null> {
	const db = await database();
	try {
		const draft = await new Promise<Draft | undefined>((resolve, reject) => {
			const request = db.transaction("drafts", "readonly").objectStore("drafts").get(id);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		if (!draft) return null;
		if (!Array.isArray(draft.charts) || !draft.charts.length)
			throw new Error("草稿格式无法识别。");
		return { charts: draft.charts.map((c) => ({ filename: c.filename, beatmap: parseBeatmap(c.text) })), assets: draft.assets };
	} finally {
		db.close();
	}
}
