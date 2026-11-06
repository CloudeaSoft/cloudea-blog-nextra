// Run against a production build served on port 4173; pass a label for A/B output.
// This measures CPU/draw time, not a promise of high-refresh display performance.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const label = process.argv[2] || "current";
const stress = process.argv[3] !== "typical";
const sampleMs = Math.max(1000, Number(process.argv[4]) || 4000);
const profiling = process.env.MANIA_PROFILE === "1";
const tracing = process.env.MANIA_PROFILE === "trace";
const output = "playwright/.cache/mania-performance";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
	const browserSession = await browser.newBrowserCDPSession();
	const { gpu } = await browserSession.send("SystemInfo.getInfo");
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
	const idleFrameMs = await page.evaluate(() => new Promise((resolve) => {
		const gaps = [];
		let previous;
		function tick(now) {
			if (previous !== undefined) gaps.push(now - previous);
			previous = now;
			if (gaps.length < 60) return requestAnimationFrame(tick);
			resolve(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length);
		}
		requestAnimationFrame(tick);
	}));
	await page.route("**/vercount.one/**", (route) => route.abort());
	await page.goto("http://127.0.0.1:4173/tools/mania-editor");
	await page.getByRole("region", { name: "Mania Studio", exact: true }).waitFor();
	const timing = Array.from({ length: stress ? 2500 : 100 }, (_, i) => `${i * (stress ? 200 : 5000)},${i % 10 === 0 ? 400 : [-100, -50, -200][i % 3]},4,1,0,70,${i % 10 === 0 ? 1 : 0},0`);
	const spacing = stress ? 25 : 100;
	const notes = Array.from({ length: stress ? 20000 : 5000 }, (_, i) => `${64 + i % 4 * 128},192,${i * spacing},${i % 9 === 0 ? `128,0,${i * spacing + 800}:` : "1,0,"}0:0:0:0:`);
	const source = `osu file format v14\n[General]\nMode:3\n[Metadata]\nTitle:Performance fixture\nArtist:Benchmark\nCreator:Local\nVersion:Stress\n[Difficulty]\nCircleSize:4\n[TimingPoints]\n${timing.join("\n")}\n[HitObjects]\n${notes.join("\n")}\n`;
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "stress.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	await page.getByLabel("音效", { exact: true }).uncheck();
	await page.getByLabel("可见时间范围").selectOption(stress ? "10000" : "2500");
	const cdp = await page.context().newCDPSession(page);
	await cdp.send("Performance.enable");
	const results = [];
	for (const mode of ["compose", "preview"]) {
		if (mode === "preview") await page.getByRole("button", { name: "SV 预览", exact: true }).click();
		await page.getByLabel("当前位置 (ms)", { exact: true }).fill("300000");
		await page.locator(".mania-playfield").screenshot({ path: `${output}/${label}-${mode}.png` });
		await page.getByRole("button", { name: "播放", exact: true }).click();
		await page.waitForTimeout(1000);
		if (profiling) {
			await cdp.send("Profiler.enable");
			await cdp.send("Profiler.start");
		}
		if (tracing) await cdp.send("Tracing.start", { categories: "-*,devtools.timeline", transferMode: "ReturnAsStream" });
		const before = await cdp.send("Performance.getMetrics");
		const sample = await page.evaluate((duration) => new Promise((resolve) => {
			const gaps = [];
			const draws = [];
			let resizes = 0;
			let clockUpdates = 0;
			const observer = new MutationObserver(() => clockUpdates++);
			observer.observe(document.querySelector(".mania-clock strong"), { childList: true, characterData: true, subtree: true });
			const prototype = HTMLCanvasElement.prototype;
			const width = Object.getOwnPropertyDescriptor(prototype, "width");
			Object.defineProperty(prototype, "width", {
				...width,
				set(value) {
					resizes++;
					width.set.call(this, value);
				},
			});
			const ctx = document.querySelector(".mania-playfield").getContext("2d");
			const fillRect = ctx.fillRect;
			const fillText = ctx.fillText;
			let drawStart = 0;
			ctx.fillRect = function (...args) {
				if (args[0] === 0 && args[1] === 0 && this.fillStyle === "#10141f") drawStart = performance.now();
				return fillRect.apply(this, args);
			};
			ctx.fillText = function (...args) {
				const result = fillText.apply(this, args);
				if (args[0] === "COMPOSE / TIME" || args[0] === "PREVIEW / SV") draws.push(performance.now() - drawStart);
				return result;
			};
			const start = performance.now();
			let previous;
			function tick(now) {
				if (previous !== undefined) gaps.push(now - previous);
				previous = now;
				if (now - start < duration) return requestAnimationFrame(tick);
				observer.disconnect();
				Object.defineProperty(prototype, "width", width);
				ctx.fillRect = fillRect;
				ctx.fillText = fillText;
				const summarize = (values) => {
					values.sort((a, b) => a - b);
					return { count: values.length, mean: values.reduce((sum, value) => sum + value, 0) / values.length, p95: values[Math.floor(values.length * 0.95)], p99: values[Math.floor(values.length * 0.99)], max: values.at(-1) };
				};
				resolve({ frameMs: summarize(gaps), drawMs: summarize(draws), resizes, clockUpdates });
			}
			requestAnimationFrame(tick);
		}), sampleMs);
		const after = await cdp.send("Performance.getMetrics");
		const metric = (values, name) => values.metrics.find((entry) => entry.name === name).value;
		const costs = Object.fromEntries(["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"].map((name) => [name, (metric(after, name) - metric(before, name)) * 1000]));
		results.push({ mode, ...sample, costs });
		if (tracing) {
			const complete = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
			await cdp.send("Tracing.end");
			const { stream } = await complete;
			let trace = "";
			while (true) {
				const chunk = await cdp.send("IO.read", { handle: stream });
				trace += chunk.data;
				if (chunk.eof) break;
			}
			await cdp.send("IO.close", { handle: stream });
			await writeFile(`${output}/${label}-${mode}.trace.json`, trace);
		}
		if (profiling) {
			const { profile } = await cdp.send("Profiler.stop");
			await writeFile(`${output}/${label}-${mode}.cpuprofile`, JSON.stringify(profile));
		}
		await page.getByRole("button", { name: "暂停", exact: true }).click();
	}
	const report = { label, scenario: stress ? "stress" : "typical", sampleMs, graphics: gpu.featureStatus, idleFrameMs, results };
	await writeFile(`${output}/${label}.json`, JSON.stringify(report, null, 2));
	console.log(JSON.stringify(report, null, 2));
} finally {
	await browser.close();
}
