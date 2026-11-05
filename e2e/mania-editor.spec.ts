import { expect, test } from "@playwright/test";
import { strToU8, zipSync, unzipSync, strFromU8 } from "fflate";
import { source } from "../app/_components/tools/mania-editor/__tests__/fixture";

test.beforeEach(async ({ page }) => {
	await page.route("**/vercount.one/**", (route) => route.abort());
	await page.goto("/tools/mania-editor");
	await expect(page.getByRole("region", { name: "Mania Studio", exact: true })).toBeVisible();
});

test("automatically imports a dropped osz and confirms replacement of unsaved edits", async ({ page }) => {
	const archive = zipSync({ "test.osu": strToU8(source) });
	const transfer = await page.evaluateHandle((bytes) => {
		const data = new DataTransfer();
		data.items.add(new File([new Uint8Array(bytes)], "test.OSZ", { type: "application/octet-stream" }));
		return data;
	}, Array.from(archive));
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	await field.dispatchEvent("dragover", { dataTransfer: transfer });
	await field.dispatchEvent("drop", { dataTransfer: transfer });
	await expect(page.getByTestId("chart-title")).toHaveText("Artist - Test: song");
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.getByRole("button", { name: "新建难度", exact: true }).click();
	await expect(page.getByTestId("note-count")).toHaveText("0 音符");
	const messages: string[] = [];
	page.once("dialog", async (dialog) => {
		messages.push(dialog.message());
		await dialog.dismiss();
	});
	await field.dispatchEvent("drop", { dataTransfer: transfer });
	expect(messages).toEqual(["当前修改尚未保存到草稿。继续会替换工作区，是否继续？"]);
	await expect(page.getByLabel("选择难度").locator("option")).toHaveCount(2);
	await expect(page.getByTestId("note-count")).toHaveText("0 音符");
	page.once("dialog", (dialog) => dialog.accept());
	await field.dispatchEvent("drop", { dataTransfer: transfer });
	await expect(page.getByLabel("选择难度").locator("option")).toHaveCount(1);
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await transfer.dispose();
});

test("uses Default for initial, added and reset difficulties", async ({ page }) => {
	const selected = page.getByLabel("选择难度").locator("option:checked");
	await expect(selected).toHaveText("Default · 4K");
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	await expect(selected).toHaveText("4K · 4K");
	await page.getByRole("button", { name: "新建难度", exact: true }).click();
	await expect(selected).toHaveText("Default · 4K");
	page.once("dialog", (dialog) => dialog.accept());
	await page.getByRole("button", { name: "新建", exact: true }).click();
	await expect(selected).toHaveText("Default · 4K");
});

test("fills the Tools workspace with the playfield and transport in view", async ({ page }, testInfo) => {
	await expect(page.locator(".mania-header")).toHaveCount(0);
	const editor = (await page.locator(".mania-studio").boundingBox())!;
	const content = (await page.locator(".tool-workspace__main").boundingBox())!;
	const field = (await page.locator(".mania-playfield").boundingBox())!;
	const transport = (await page.locator(".mania-transport").boundingBox())!;
	const footer = (await page.locator(".mania-status").boundingBox())!;
	expect(Math.abs(editor.x - content.x)).toBeLessThan(2);
	expect(Math.abs(editor.width - content.width)).toBeLessThan(2);
	expect(field.height).toBeGreaterThan(editor.height * 0.45);
	expect(field.y + field.height).toBeLessThanOrEqual(transport.y + 2);
	expect(footer.y + footer.height).toBeLessThanOrEqual(page.viewportSize()!.height + 2);
	expect(await page.locator("[data-scroll-root]").evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThan(3);
	if (testInfo.project.name === "desktop-chromium") {
		for (const viewport of [{ width: 1024, height: 600 }, { width: 1920, height: 1080 }]) {
			await page.setViewportSize(viewport);
			await expect.poll(async () => {
				const box = (await page.locator(".mania-status").boundingBox())!;
				return Math.abs(box.y + box.height - viewport.height);
			}).toBeLessThan(3);
			expect((await page.locator(".mania-playfield").boundingBox())!.height).toBeGreaterThan(200);
		}
	}
});

test("restores the regular Tools layout after leaving the editor", async ({ page }, testInfo) => {
	if (testInfo.project.name === "mobile-chromium") await page.getByRole("button", { name: "Open tool navigation" }).click();
	await page.getByRole("link", { name: "HLSL Preview", exact: true }).click();
	await expect(page.getByRole("heading", { name: "HLSL Preview", exact: true })).toBeVisible();
	expect(await page.locator(".tool-workspace__main").evaluate((element) => parseFloat(getComputedStyle(element).paddingTop))).toBeGreaterThan(0);
	await expect(page.locator(".mania-studio")).toHaveCount(0);
});

test("lands wheel scrolling on the grid after an arbitrary seek and uses the selection pointer", async ({ page }) => {
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	await page.getByLabel("当前位置 (ms)").fill("1070");
	await field.hover();
	await page.mouse.wheel(0, 120);
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("1150");
	await page.mouse.wheel(0, -120);
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("1025");
	await page.getByRole("button", { name: "选择 (1)", exact: true }).click();
	await expect(field).toHaveCSS("cursor", "default");
	await page.getByRole("button", { name: "长条 (3)", exact: true }).click();
	await expect(field).toHaveCSS("cursor", "crosshair");
});

test("adjusts snap divisions with Ctrl-wheel on the playfield without seeking or zooming", async ({ page }) => {
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	const snap = page.getByLabel("节拍吸附");
	const range = page.getByLabel("可见时间范围");
	const position = page.getByLabel("当前位置 (ms)");
	await position.fill("1000");
	await field.hover();
	await page.keyboard.down("Control");
	await page.mouse.wheel(0, -120);
	await expect(snap).toHaveValue("6");
	await page.mouse.wheel(0, 120);
	await expect(snap).toHaveValue("4");
	await expect(position).toHaveValue("1000");
	await expect(range).toHaveValue("2500");
	await page.keyboard.up("Control");
	await snap.selectOption("8");
	await field.hover();
	await page.mouse.wheel(0, 120);
	await expect(position).toHaveValue("1063");
	await page.keyboard.down("Control");
	await page.mouse.wheel(0, -120);
	await expect(snap).toHaveValue("12");
	await page.getByRole("group", { name: "时间标尺", exact: true }).hover();
	await page.mouse.wheel(0, -120);
	await expect(range).toHaveValue("2250");
	await expect(snap).toHaveValue("12");
	await expect(position).toHaveValue("1063");
	await page.keyboard.up("Control");
	await expect(snap.locator("option[value='0']")).toHaveCount(0);
	for (const [value, delta] of [["1", 120], ["32", -120]] as const) {
		await snap.selectOption(value);
		await field.hover();
		await page.keyboard.down("Control");
		await page.mouse.wheel(0, delta);
		await page.keyboard.up("Control");
		await expect(snap).toHaveValue(value);
		await expect(position).toHaveValue("1063");
	}
});

test("keeps snap beside view in the bottom bar and navigates on a 1/32 grid", async ({ page }) => {
	const controls = page.getByRole("group", { name: "视野与吸附", exact: true });
	const snap = controls.getByLabel("节拍吸附");
	const view = controls.getByLabel("可见时间范围");
	await expect(snap).toBeVisible();
	const snapBox = (await snap.boundingBox())!;
	const viewBox = (await view.boundingBox())!;
	expect(Math.abs(snapBox.y - viewBox.y)).toBeLessThan(2);
	expect(snapBox.x).toBeGreaterThan(viewBox.x + viewBox.width);
	await expect(page.locator(".mania-toolbox").getByLabel("节拍吸附")).toHaveCount(0);
	await snap.selectOption("16");
	await page.getByLabel("当前位置 (ms)").fill("1000");
	await page.getByRole("application", { name: "Mania 谱面编辑区" }).hover();
	await page.keyboard.down("Control");
	await page.mouse.wheel(0, -120);
	await expect(snap).toHaveValue("32");
	await page.keyboard.up("Control");
	await page.mouse.wheel(0, 120);
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("1016");
});

test("toggles bookmarks with Ctrl+B and adds removes or jumps with compact controls", async ({ page }, testInfo) => {
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	const timeline = page.getByRole("group", { name: "歌曲时间轴" });
	const controls = page.getByRole("group", { name: "书签控制" });
	const previous = controls.getByRole("button", { name: "上一书签", exact: true });
	const next = controls.getByRole("button", { name: "下一书签", exact: true });
	const add = controls.getByRole("button", { name: "添加书签", exact: true });
	const remove = controls.getByRole("button", { name: "删除当前书签", exact: true });
	await expect(previous).toBeDisabled();
	await expect(controls.getByRole("button")).toHaveCount(4);
	await expect(page.getByRole("button", { name: "☆ 切换书签", exact: true })).toHaveCount(0);
	await next.click();
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("1000");
	await expect(add).toBeDisabled();
	await remove.click();
	await expect(timeline.getByRole("button", { name: "书签 1000 ms", exact: true })).toHaveCount(0);
	await field.focus();
	await page.keyboard.press("Control+z");
	await expect(timeline.getByRole("button", { name: "书签 1000 ms", exact: true })).toBeVisible();
	await page.keyboard.press("Control+b");
	await expect(timeline.getByRole("button", { name: "书签 1000 ms", exact: true })).toHaveCount(0);
	await page.keyboard.press("Control+b");
	await expect(timeline.getByRole("button", { name: "书签 1000 ms", exact: true })).toBeVisible();
	await page.getByLabel("当前位置 (ms)").fill("2000");
	await field.focus();
	await page.keyboard.press("Control+b");
	await expect(timeline.getByRole("button", { name: "书签 2000 ms", exact: true })).toBeVisible();
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Control+ArrowRight");
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("3000");
	await expect(next).toBeDisabled();
	await page.keyboard.press("Control+ArrowLeft");
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("2000");
	await previous.click();
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("1000");
	await expect(previous).toBeDisabled();
	await next.click();
	await remove.click();
	await expect(remove).toBeDisabled();
	await add.click();
	await expect(add).toBeDisabled();
	await expect(timeline.getByRole("button", { name: /^书签/ })).toHaveCount(3);
	await page.locator(".mania-transport").screenshot({ path: testInfo.outputPath("mania-bookmark-controls.png") });
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "导出 .osu", exact: true }).click();
	const stream = await (await downloadPromise).createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
	const text = Buffer.concat(chunks).toString("utf8");
	expect(text).toContain("Bookmarks:1000,2000,3000");
	expect(text).toContain("64,192,400,5,2,2:3:4:70:custom.wav");
});

test("zooms only on the top ruler with Ctrl-wheel and removes playfield Alt zoom", async ({ page }, testInfo) => {
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	const ruler = page.getByRole("group", { name: "时间标尺", exact: true });
	const range = page.getByLabel("可见时间范围");
	const position = page.getByLabel("当前位置 (ms)");
	await position.fill("1000");
	await expect(ruler).toBeVisible();
	const rulerBox = (await ruler.boundingBox())!;
	const fieldBox = (await field.boundingBox())!;
	expect(rulerBox.y + rulerBox.height).toBeLessThanOrEqual(fieldBox.y + 1);
	await ruler.hover();
	await page.keyboard.down("Control");
	await page.mouse.wheel(0, -120);
	await expect(range).toHaveValue("2250");
	await expect(position).toHaveValue("1000");
	await page.mouse.wheel(0, 120);
	await expect(range).toHaveValue("2500");
	await expect(position).toHaveValue("1000");
	await page.keyboard.up("Control");
	await field.hover();
	await page.keyboard.down("Alt");
	await page.mouse.wheel(0, 120);
	await expect(position).toHaveValue("1125");
	await expect(range).toHaveValue("2500");
	await page.keyboard.up("Alt");
	await range.selectOption("500");
	await ruler.hover();
	await page.keyboard.down("Control");
	await page.mouse.wheel(0, -120);
	await expect(range).toHaveValue("500");
	await page.keyboard.up("Control");
	await range.selectOption("10000");
	await ruler.hover();
	await page.keyboard.down("Control");
	await page.mouse.wheel(0, 120);
	await expect(range).toHaveValue("10000");
	await page.keyboard.up("Control");
	await page.getByRole("button", { name: "播放", exact: true }).click();
	await ruler.hover();
	await page.keyboard.down("Control");
	await page.mouse.wheel(0, -120);
	await expect(range).toHaveValue("9750");
	await expect(page.getByRole("button", { name: "暂停", exact: true })).toBeVisible();
	await page.keyboard.up("Control");
	await page.getByRole("button", { name: "暂停", exact: true }).click();
	await range.selectOption("2500");
	await position.fill("0");
	await page.locator(".mania-studio").screenshot({ path: testInfo.outputPath("mania-ruler.png") });
});

test("shows a slim left density overview and seeks by clicking and dragging", async ({ page }) => {
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	const overview = page.getByRole("slider", { name: "全曲音符密度总览" });
	await expect(overview).toBeVisible();
	// Locator click waits for layout stability and chooses the actual centre after import.
	await overview.click();
	const rect = (await overview.boundingBox())!;
	const field = (await page.locator(".mania-playfield").boundingBox())!;
	expect(rect.x + rect.width).toBeLessThanOrEqual(field.x);
	expect(rect.width).toBeLessThan(50);
	expect(rect.height).toBeGreaterThan(field.height * 0.8);
	const onePixel = Math.ceil(10000 / rect.height) + 1;
	await expect.poll(async () => Math.abs(Number(await page.getByLabel("当前位置 (ms)").inputValue()) - 5000)).toBeLessThanOrEqual(onePixel);
	await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
	await page.mouse.down();
	await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height * 0.75);
	await page.mouse.up();
	await expect.poll(async () => Math.abs(Number(await page.getByLabel("当前位置 (ms)").inputValue()) - 2500)).toBeLessThanOrEqual(onePixel);
	await expect.poll(async () => Math.abs(Number(await overview.getAttribute("aria-valuenow")) - 2500)).toBeLessThanOrEqual(onePixel);
	await overview.press("Home");
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("0");
	const currentLine = (await page.locator(".mania-overview-position").boundingBox())!;
	expect(currentLine.y).toBeGreaterThan(rect.y + rect.height - 4);
	await overview.press("ArrowUp");
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("25");
	await overview.press("End");
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("10000");
});

test("shows coloured song markers, seeks to them and updates preview time", async ({ page }, testInfo) => {
	const marked = source.replace("Mode: 3", "Mode: 3\nPreviewTime: 1750");
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(marked) });
	const timeline = page.getByRole("group", { name: "歌曲时间轴" });
	for (const [label, time, colour] of [["书签 1000 ms", "1000", "rgb(75, 163, 255)"], ["BPM 定时点 1900 ms", "1900", "rgb(255, 100, 110)"], ["继承定时点 900 ms", "900", "rgb(85, 214, 139)"], ["预览点 1750 ms", "1750", "rgb(255, 213, 79)"]]) {
		const marker = timeline.getByRole("button", { name: label, exact: true });
		await expect(marker).toHaveCSS("color", colour);
		await marker.click();
		await expect(page.getByLabel("当前位置 (ms)")).toHaveValue(time);
	}
	await page.getByRole("button", { name: "谱面设置", exact: true }).click();
	await page.getByLabel("预览时间 (ms)").fill("2400");
	await page.getByRole("button", { name: "应用谱面设置" }).click();
	const close = page.getByRole("button", { name: "关闭属性面板" });
	if (await close.isVisible()) await close.click();
	await expect(timeline.getByRole("button", { name: "预览点 1750 ms", exact: true })).toHaveCount(0);
	await timeline.getByRole("button", { name: "预览点 2400 ms", exact: true }).click();
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("2400");
	await page.getByRole("application", { name: "Mania 谱面编辑区" }).focus();
	await page.keyboard.press("Control+b");
	await expect(timeline.getByRole("button", { name: "书签 2400 ms", exact: true })).toBeVisible();
	await page.getByLabel("当前位置 (ms)").fill("0");
	await page.locator(".mania-studio").screenshot({ path: testInfo.outputPath("mania-navigation.png") });
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "导出 .osu", exact: true }).click();
	const stream = await (await downloadPromise).createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
	const text = Buffer.concat(chunks).toString("utf8");
	expect(text).toContain("PreviewTime:2400");
	expect(text).toContain("Bookmarks:1000,2400,3000");
});

for (const [keys, exportedX] of [[1, 256], [10, 486]]) {
	test(`edits and exports the last lane of a ${keys}K chart`, async ({ page }) => {
		await page.getByRole("button", { name: "谱面设置", exact: true }).click();
		await page.getByLabel("键数", { exact: true }).selectOption(String(keys));
		await page.getByRole("button", { name: "应用谱面设置" }).click();
		const closePanel = page.getByRole("button", { name: "关闭属性面板" });
		if (await closePanel.isVisible()) await closePanel.click();
		const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
		const width = await field.evaluate((element) => element.getBoundingClientRect().width);
		await field.click({ position: { x: width - 16 - (width - 64) / keys / 2, y: 300 } });
		await expect(page.getByTestId("note-count")).toHaveText("1 音符");
		const downloadPromise = page.waitForEvent("download");
		await page.getByRole("button", { name: "导出 .osu", exact: true }).click();
		const stream = await (await downloadPromise).createReadStream();
		const chunks: Buffer[] = [];
		for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
		const text = Buffer.concat(chunks).toString("utf8");
		expect(text).toContain(`CircleSize:${keys}`);
		expect(text.split("[HitObjects]")[1].trim()).toMatch(new RegExp(`^${exportedX},192,`));
	});
}

test("creates a note and hold, supports history and clipboard, and exports real osu data", async ({ page }) => {
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	await page.getByRole("button", { name: "单键 (2)", exact: true }).click();
	const width = await field.evaluate((element) => element.getBoundingClientRect().width);
	await field.click({ position: { x: 48 + (width - 64) / 8, y: 300 } });
	await expect(page.getByTestId("note-count")).toHaveText("1 音符");
	await page.getByRole("button", { name: "长条 (3)", exact: true }).click();
	await field.scrollIntoViewIfNeeded();
	const rect = await field.boundingBox();
	expect(rect).not.toBeNull();
	const laneX = (lane: number) => rect!.x + 48 + (rect!.width - 64) / 4 * (lane + 0.5);
	await page.mouse.move(laneX(1), rect!.y + 330);
	await page.mouse.down();
	await page.mouse.move(laneX(1), rect!.y + 180, { steps: 5 });
	await page.mouse.up();
	await expect(page.getByTestId("note-count")).toHaveText("2 音符");
	await page.getByRole("button", { name: "撤销", exact: true }).click();
	await expect(page.getByTestId("note-count")).toHaveText("1 音符");
	await page.getByRole("button", { name: "重做", exact: true }).click();
	await expect(page.getByTestId("note-count")).toHaveText("2 音符");
	await field.focus();
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Control+c");
	await page.getByLabel("当前位置 (ms)").fill("4000");
	await page.getByLabel("当前位置 (ms)").press("Enter");
	await field.focus();
	await page.keyboard.press("Control+v");
	await expect(page.getByTestId("note-count")).toHaveText("4 音符");
	await page.getByRole("button", { name: "镜像", exact: true }).click();
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "导出 .osu", exact: true }).click();
	const download = await downloadPromise;
	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
	const text = Buffer.concat(chunks).toString("utf8");
	expect(text).toContain("Mode:3");
	expect(text).toContain(",128,");
	expect(text.split("[HitObjects]")[1].trim().split(/\r?\n/)).toHaveLength(4);
});

test("runs copy paste mirror undo redo and delete through editor shortcuts", async ({ page }) => {
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	await field.focus();
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Control+c");
	await page.getByLabel("当前位置 (ms)").fill("4000");
	await field.focus();
	await page.keyboard.press("Control+v");
	await expect(page.getByTestId("note-count")).toHaveText("6 音符");
	await page.getByRole("slider", { name: "全曲音符密度总览" }).focus();
	await page.keyboard.press("Control+h");
	await field.focus();
	await page.keyboard.press("Control+z");
	await page.keyboard.press("Control+y");
	await page.keyboard.press("Control+z");
	await page.keyboard.press("Control+Shift+z");
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Delete");
	await expect(page.getByTestId("note-count")).toHaveText("0 音符");
	await page.keyboard.press("Control+z");
	await expect(page.getByTestId("note-count")).toHaveText("6 音符");
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Backspace");
	await expect(page.getByTestId("note-count")).toHaveText("6 音符");
	// Text controls retain native editing instead of deleting selected objects.
	await field.focus();
	await page.keyboard.press("Control+a");
	await page.getByLabel("当前位置 (ms)").focus();
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Backspace");
	await expect(page.getByTestId("note-count")).toHaveText("6 音符");
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "导出 .osu", exact: true }).click();
	const stream = await (await downloadPromise).createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
	const objects = Buffer.concat(chunks).toString("utf8").split("[HitObjects]")[1];
	expect(objects).toContain("448,192,4000,");
	expect(objects).toContain("64,192,4500,128,");
	expect(objects).toContain("320,192,5900,");
});

test("starts a clean project from the top right and opens help from a round question button", async ({ page }, testInfo) => {
	const archive = zipSync({
		"first.osu": strToU8(source.replace("song.ogg", "song.wav")),
		"second.osu": strToU8(source.replace("song.ogg", "song.wav").replace("Version: 4K", "Version: Another")),
		"song.wav": audioFixture(),
		"sample.wav": audioFixture(),
	});
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "set.osz", mimeType: "application/zip", buffer: Buffer.from(archive) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	await field.focus();
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Control+c");
	await page.keyboard.press("Delete");
	const fresh = page.getByRole("button", { name: "新建", exact: true });
	const actions = await page.locator(".mania-filebar button").allTextContents();
	expect(actions.indexOf("新建")).toBeLessThan(actions.indexOf("保存草稿"));
	await expect(fresh).toBeVisible();
	const buttonBox = (await fresh.boundingBox())!;
	expect(buttonBox.x).toBeGreaterThan(page.viewportSize()!.width / 2);
	expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);
	page.once("dialog", (dialog) => dialog.dismiss());
	await fresh.click();
	await expect(page.getByLabel("选择难度").locator("option")).toHaveCount(2);
	await expect(page.getByTestId("chart-title")).toHaveText("Artist - Test: song");
	await page.getByLabel("节拍吸附").selectOption("8");
	await page.getByLabel("可见时间范围").selectOption("4000");
	await page.getByLabel("播放速度").selectOption("0.5");
	await page.getByLabel("当前位置 (ms)").fill("1000");
	await page.getByRole("button", { name: "播放", exact: true }).click();
	page.once("dialog", (dialog) => dialog.accept());
	await fresh.click();
	await expect(page.getByTestId("chart-title")).toHaveText("Unknown - Untitled");
	await expect(page.getByLabel("选择难度").locator("option")).toHaveCount(1);
	await expect(page.getByTestId("note-count")).toHaveText("0 音符");
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("0");
	await expect(page.getByLabel("节拍吸附")).toHaveValue("4");
	await expect(page.getByLabel("可见时间范围")).toHaveValue("2500");
	await expect(page.getByLabel("播放速度")).toHaveValue("1");
	await expect(page.locator(".mania-clock")).toContainText("无音频");
	await expect(page.getByRole("button", { name: "暂停", exact: true })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "撤销", exact: true })).toBeDisabled();
	await expect(page.getByRole("button", { name: "重做", exact: true })).toBeDisabled();
	await expect(page.getByRole("group", { name: "歌曲时间轴" }).getByRole("button", { name: /^书签/ })).toHaveCount(0);
	await field.focus();
	await page.keyboard.press("Control+z");
	await page.keyboard.press("Control+v");
	await expect(page.getByTestId("note-count")).toHaveText("0 音符");
	await expect(page.getByRole("button", { name: "撤销", exact: true })).toBeDisabled();
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "导出 .osz", exact: true }).click();
	const stream = await (await downloadPromise).createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
	const files = unzipSync(Buffer.concat(chunks));
	expect(Object.keys(files)).toEqual(["Untitled.osu"]);
	expect(strFromU8(files["Untitled.osu"])).toContain("0,500,4,1,0,80,1,0");
	const help = page.getByRole("button", { name: "帮助", exact: true });
	await expect(help).toHaveText("?");
	const helpBox = (await help.boundingBox())!;
	expect(Math.abs(helpBox.width - helpBox.height)).toBeLessThan(1);
	await expect(help).toHaveCSS("border-radius", "50%");
	await help.click();
	await expect(page.getByRole("dialog", { name: "官方帮助" })).toBeVisible();
	await page.getByRole("button", { name: "关闭帮助", exact: true }).click();
	await page.locator(".mania-studio").screenshot({ path: testInfo.outputPath("mania-new-project.png") });
});

test("imports, edits metadata and timing, saves and restores a draft", async ({ page }) => {
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.getByRole("button", { name: "谱面设置", exact: true }).click();
	await page.getByLabel("曲名", { exact: true }).fill("Browser edit");
	await page.getByRole("button", { name: "应用谱面设置" }).click();
	await page.getByRole("button", { name: "定时点", exact: true }).click();
	await page.getByRole("button", { name: "编辑定时点 1", exact: true }).click();
	await page.getByLabel("BPM", { exact: true }).fill("150");
	await page.getByRole("button", { name: "应用定时点" }).click();
	await page.getByRole("button", { name: "保存草稿", exact: true }).click();
	await page.getByRole("dialog", { name: "保存草稿", exact: true }).getByLabel("草稿名称", { exact: true }).fill("浏览器编辑");
	await page.getByRole("button", { name: "保存新草稿", exact: true }).click();
	await expect(page.getByRole("status")).toContainText("草稿已保存");
	await page.reload();
	await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
	await page.getByRole("radio", { name: "选择草稿 浏览器编辑", exact: true }).check();
	await page.getByRole("button", { name: "恢复所选草稿", exact: true }).click();
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await expect(page.getByTestId("chart-title")).toContainText("Browser edit");
	await expect(page.getByTestId("current-bpm")).toContainText("150");
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

function audioFixture() {
	const samples = 8000 * 4;
	const data = Buffer.alloc(44 + samples * 2);
	data.write("RIFF", 0);
	data.writeUInt32LE(data.length - 8, 4);
	data.write("WAVEfmt ", 8);
	data.writeUInt32LE(16, 16);
	data.writeUInt16LE(1, 20);
	data.writeUInt16LE(1, 22);
	data.writeUInt32LE(8000, 24);
	data.writeUInt32LE(16000, 28);
	data.writeUInt16LE(2, 32);
	data.writeUInt16LE(16, 34);
	data.write("data", 36);
	data.writeUInt32LE(samples * 2, 40);
	return data;
}

test("toggles playback with Space after clicking the timeline without a focus ring", async ({ page }) => {
	const timeline = page.getByRole("slider", { name: "播放进度", exact: true });
	await timeline.click();
	await expect(timeline).toBeFocused();
	await page.keyboard.press("Space");
	await expect(page.getByRole("button", { name: "暂停", exact: true })).toBeVisible();
	await expect(timeline).toHaveCSS("outline-style", "none");
	await page.keyboard.press("Space");
	await expect(page.getByRole("button", { name: "播放", exact: true })).toBeVisible();
	await page.keyboard.down("Space");
	await expect(page.getByRole("button", { name: "暂停", exact: true })).toBeVisible();
	await page.keyboard.down("Space");
	await expect(page.getByRole("button", { name: "暂停", exact: true })).toBeVisible();
	await page.keyboard.up("Space");
	await page.keyboard.press("Space");
	await expect(page.getByRole("button", { name: "播放", exact: true })).toBeVisible();
	await page.getByRole("button", { name: "谱面设置", exact: true }).click();
	const title = page.getByLabel("曲名", { exact: true });
	await title.fill("A");
	await title.press("End");
	await title.press("Space");
	await expect(title).toHaveValue("A ");
	await expect(page.getByRole("button", { name: "播放", exact: true })).toBeVisible();
});

for (const sampleType of ["default", "custom", "broken"] as const) {
	test(`plays ${sampleType} key samples and respects the hitsound switch`, async ({ page }) => {
		await page.evaluate(() => {
			const output = { samples: 0, peak: 0 };
			(window as unknown as { keyAudio: typeof output }).keyAudio = output;
			const start = AudioBufferSourceNode.prototype.start;
			AudioBufferSourceNode.prototype.start = function (...args) {
				if (this.buffer) {
					output.samples++;
					for (const value of this.buffer.getChannelData(0)) output.peak = Math.max(output.peak, Math.abs(value));
				}
				return start.apply(this, args);
			};
		});
		const customName = sampleType === "default" ? "" : "key.wav";
		const map = source.slice(0, source.indexOf("[HitObjects]")) + `[HitObjects]\n64,192,200,1,0,0:0:0:0:${customName}\n`;
		const archive = zipSync({
			"key.osu": strToU8(map),
			...(customName ? { "key.wav": sampleType === "custom" ? audioFixture() : strToU8("invalid audio") } : {}),
		});
		await page.getByLabel("导入谱面文件").setInputFiles({ name: "key.osz", mimeType: "application/octet-stream", buffer: Buffer.from(archive) });
		await page.getByRole("button", { name: "播放", exact: true }).click();
		await expect.poll(() => page.evaluate(() => (window as unknown as { keyAudio: { samples: number } }).keyAudio.samples)).toBe(1);
		const peak = await page.evaluate(() => (window as unknown as { keyAudio: { peak: number } }).keyAudio.peak);
		// A deliberately silent custom WAV must override the audible default.
		if (sampleType === "custom") expect(peak).toBe(0);
		else expect(peak).toBeGreaterThan(0.01);
		await page.getByRole("button", { name: "暂停", exact: true }).click();
		await expect(page.locator(".mania-studio").getByRole("alert")).toHaveCount(0);
		const count = await page.evaluate(() => (window as unknown as { keyAudio: { samples: number } }).keyAudio.samples);
		await page.getByRole("checkbox", { name: "音效", exact: true }).uncheck();
		await page.getByLabel("当前位置 (ms)").fill("0");
		await page.getByRole("button", { name: "播放", exact: true }).click();
		await expect.poll(async () => Number(await page.getByLabel("当前位置 (ms)").inputValue())).toBeGreaterThan(500);
		await page.getByRole("button", { name: "暂停", exact: true }).click();
		expect(await page.evaluate(() => (window as unknown as { keyAudio: { samples: number } }).keyAudio.samples)).toBe(count);
	});
}

test("cancels playback while default key sounds are loading", async ({ page }) => {
	let release!: () => void;
	let requested!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const request = new Promise<void>((resolve) => {
		requested = resolve;
	});
	await page.route("**/audio/mania/normal-hitnormal.wav", async (route) => {
		requested();
		await gate;
		await route.continue();
	});
	await page.getByRole("button", { name: "播放", exact: true }).click();
	await request;
	await page.getByRole("button", { name: "暂停", exact: true }).click();
	const response = page.waitForResponse("**/audio/mania/normal-hitnormal.wav");
	release();
	await response;
	await expect(page.getByRole("button", { name: "播放", exact: true })).toBeVisible();
	await expect(page.getByLabel("当前位置 (ms)")).toHaveValue("0");
	await page.getByRole("button", { name: "播放", exact: true }).click();
	await expect.poll(async () => Number(await page.getByLabel("当前位置 (ms)").inputValue())).toBeGreaterThan(200);
	await page.getByRole("button", { name: "暂停", exact: true }).click();
	await expect(page.locator(".mania-studio").getByRole("alert")).toHaveCount(0);
});

test("attaches real audio, plays, seeks and loops without losing the attached file", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await expect(page.getByLabel("载入音频文件")).toBeEnabled();
	await page.getByLabel("载入音频文件").setInputFiles({ name: "song.wav", mimeType: "audio/wav", buffer: audioFixture() });
	await expect(page.getByRole("status")).toContainText("音频已载入");
	await expect(page.locator(".mania-studio").getByRole("alert")).toHaveCount(0);
	await page.getByRole("button", { name: "播放", exact: true }).click();
	await expect.poll(async () => Number(await page.getByLabel("当前位置 (ms)").inputValue())).toBeGreaterThan(250);
	await page.getByRole("button", { name: "暂停", exact: true }).click();
	await page.getByLabel("循环起点 (ms)").fill("500");
	await page.getByLabel("循环终点 (ms)").fill("900");
	await page.getByRole("checkbox", { name: "循环", exact: true }).check();
	await page.getByLabel("播放速度").selectOption("2");
	await page.getByRole("button", { name: "播放", exact: true }).click();
	await expect.poll(async () => Number(await page.getByLabel("当前位置 (ms)").inputValue())).toBeGreaterThanOrEqual(500);
	let samples = 0;
	await expect.poll(async () => {
		const time = Number(await page.getByLabel("当前位置 (ms)").inputValue());
		expect(time).toBeGreaterThanOrEqual(500);
		expect(time).toBeLessThanOrEqual(950);
		return ++samples;
	}, { intervals: [200] }).toBeGreaterThan(5);
	await page.getByRole("button", { name: "暂停", exact: true }).click();
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "导出 .osz", exact: true }).click();
	const stream = await (await downloadPromise).createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
	const files = unzipSync(Buffer.concat(chunks));
	expect(files["song.wav"].length).toBe(audioFixture().length);
	expect(strFromU8(files["test.osu"])).toContain("AudioFilename:song.wav");
	expect(errors).toEqual([]);
});

test("locks canvas edits while a resource import is pending", async ({ page }) => {
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await expect(page.getByLabel("载入音频文件")).toBeEnabled();
	await page.evaluate(() => {
		const read = File.prototype.arrayBuffer;
		File.prototype.arrayBuffer = async function () {
			await new Promise<void>((resolve) => {
				(window as unknown as { releaseFile: () => void }).releaseFile = resolve;
			});
			return read.call(this);
		};
	});
	await page.getByLabel("载入音频文件").setInputFiles({ name: "song.wav", mimeType: "audio/wav", buffer: audioFixture() });
	await expect(page.getByRole("status")).toContainText("正在处理");
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	await field.click({ position: { x: 80, y: 300 }, force: true });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.evaluate(() => (window as unknown as { releaseFile: () => void }).releaseFile());
	await expect(page.getByRole("status")).toContainText("音频已载入");
});

test("stores multiple named drafts and restores or overwrites only the selected entry", async ({ page }, testInfo) => {
	await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
	await expect(page.getByRole("button", { name: "恢复所选草稿", exact: true })).toBeDisabled();
	await page.getByRole("button", { name: "取消", exact: true }).click();
	const archive = zipSync({ "a.osu": strToU8(source.replace("song.ogg", "song.wav")), "b.osu": strToU8(source.replace("song.ogg", "song.wav")), "song.wav": audioFixture() });
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "draft.osz", mimeType: "application/zip", buffer: Buffer.from(archive) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.getByRole("button", { name: "保存草稿", exact: true }).click();
	await page.getByLabel("草稿名称", { exact: true }).fill("练习 A");
	await page.getByRole("button", { name: "保存新草稿", exact: true }).click();
	await expect(page.getByRole("status")).toContainText("草稿已保存");
	await page.getByRole("application", { name: "Mania 谱面编辑区" }).focus();
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Delete");
	await page.keyboard.press("Control+s");
	await page.getByLabel("草稿名称", { exact: true }).fill("练习 B");
	await page.getByRole("button", { name: "保存新草稿", exact: true }).click();
	await expect(page.getByRole("status")).toContainText("练习 B");
	await page.reload();
	await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "恢复草稿", exact: true });
	await expect(dialog.getByRole("radio")).toHaveCount(2);
	await page.getByRole("radio", { name: "选择草稿 练习 A", exact: true }).check();
	await dialog.screenshot({ path: testInfo.outputPath("mania-drafts.png") });
	await page.getByRole("button", { name: "恢复所选草稿", exact: true }).click();
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await expect(page.getByLabel("选择难度").locator("option")).toHaveCount(2);
	await expect(page.locator(".mania-clock")).toContainText("音频已载入");
	// Overwrite A with an empty project; B must retain its original metadata and assets.
	await page.getByRole("button", { name: "新建", exact: true }).click();
	await page.getByRole("button", { name: "保存草稿", exact: true }).click();
	await page.getByRole("radio", { name: "选择草稿 练习 A", exact: true }).check();
	await page.getByRole("button", { name: "覆盖所选草稿", exact: true }).click();
	await expect(page.getByRole("status")).toContainText("草稿已保存");
	await page.reload();
	await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "恢复草稿", exact: true }).getByRole("radio")).toHaveCount(2);
	await page.getByRole("radio", { name: "选择草稿 练习 A", exact: true }).check();
	await page.getByRole("button", { name: "恢复所选草稿", exact: true }).click();
	await expect(page.getByTestId("chart-title")).toHaveText("Unknown - Untitled");
	await page.getByRole("button", { name: "恢复草稿", exact: true }).click();
	await page.getByRole("radio", { name: "选择草稿 练习 B", exact: true }).check();
	await page.getByRole("button", { name: "恢复所选草稿", exact: true }).click();
	await expect(page.getByTestId("chart-title")).toHaveText("Artist - Test: song");
	await expect(page.getByTestId("note-count")).toHaveText("0 音符");
	await expect(page.locator(".mania-clock")).toContainText("音频已载入");
	await expect(page.getByLabel("选择难度").locator("option")).toHaveCount(2);
});

test("imports silent maps, rejects other modes without replacing work, and adds timing at the playhead", async ({ page }) => {
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "silent.osu", mimeType: "text/plain", buffer: Buffer.from(source.replace("AudioFilename: song.ogg\n", "")) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "standard.osu", mimeType: "text/plain", buffer: Buffer.from(source.replace("Mode: 3", "Mode: 0")) });
	await expect(page.locator(".mania-studio").getByRole("alert")).toContainText("仅支持");
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.getByRole("button", { name: "定时点", exact: true }).click();
	await page.getByLabel("当前位置 (ms)").fill("5000");
	await page.getByRole("button", { name: "+ BPM 点", exact: true }).click();
	await expect(page.getByLabel("偏移 (ms)")).toHaveValue("5000");
	await page.getByLabel("BPM", { exact: true }).fill("180");
	await page.getByRole("button", { name: "应用定时点", exact: true }).click();
	await expect(page.getByTestId("current-bpm")).toContainText("180");
});

test("selects the entire default note head and tail without changing timestamps", async ({ page }) => {
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.getByRole("button", { name: "选择 (1)", exact: true }).click();
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	const rect = (await field.boundingBox())!;
	const laneWidth = (rect.width - 64) / 4;
	const noteHeight = (laneWidth - 4) * 42 / 60;
	const x = (lane: number) => 48 + laneWidth * (lane + 0.5);
	const y = (time: number) => rect.height - 44 - time * (rect.height - 64) / 2500;
	await field.click({ position: { x: x(0), y: y(400) - noteHeight / 2 } });
	await page.getByRole("button", { name: "物件", exact: true }).click();
	await expect(page.getByLabel("开始 (ms)")).toHaveValue("400");
	const closePanel = page.getByRole("button", { name: "关闭属性面板" });
	if (await closePanel.isVisible()) await closePanel.click();
	await field.click({ position: { x: x(3), y: y(1400) - noteHeight / 2 } });
	await page.getByRole("button", { name: "物件", exact: true }).click();
	await expect(page.getByLabel("开始 (ms)")).toHaveValue("900");
	await expect(page.getByLabel("结束 (ms)")).toHaveValue("1400");
});

test("drags an existing hold and resizes its tail, with exact exported timestamps", async ({ page }) => {
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "test.osu", mimeType: "text/plain", buffer: Buffer.from(source) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.getByRole("button", { name: "选择 (1)", exact: true }).click();
	const field = page.getByRole("application", { name: "Mania 谱面编辑区" });
	await field.scrollIntoViewIfNeeded();
	const rect = (await field.boundingBox())!;
	const x = (lane: number) => rect.x + 48 + (rect.width - 64) / 4 * (lane + 0.5);
	const y = (time: number) => rect.y + rect.height - 44 - time * (rect.height - 64) / 2500;
	await page.mouse.move(x(3), y(900));
	await page.mouse.down();
	await page.mouse.move(x(2), y(1025), { steps: 4 });
	await page.mouse.up();
	await page.getByRole("button", { name: "物件", exact: true }).click();
	await expect(page.getByLabel("开始 (ms)")).toHaveValue("1025");
	await expect(page.getByLabel("结束 (ms)")).toHaveValue("1525");
	const closePanel = page.getByRole("button", { name: "关闭属性面板" });
	if (await closePanel.isVisible()) await closePanel.click();
	await field.scrollIntoViewIfNeeded();
	const nextRect = (await field.boundingBox())!;
	const dy = nextRect.y - rect.y;
	await page.mouse.move(x(2), y(1525) + dy);
	await page.mouse.down();
	await page.mouse.move(x(2), y(1775) + dy, { steps: 4 });
	await page.mouse.up();
	await page.getByRole("button", { name: "物件", exact: true }).click();
	await expect(page.getByLabel("结束 (ms)")).toHaveValue("1775");
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "导出 .osu", exact: true }).click();
	const stream = await (await downloadPromise).createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
	expect(Buffer.concat(chunks).toString("utf8")).toContain("320,192,1025,128,8,1775:0:0:0:0:");
});

test("switches archive difficulties without losing edits and renders a populated workspace", async ({ page }, testInfo) => {
	const archive = zipSync({
		"歌曲/4k.osu": strToU8(source.replace("song.ogg", "song.wav")),
		"歌曲/7k.osu": strToU8(source.replace("song.ogg", "song.wav").replace("CircleSize:4", "CircleSize:7").replace("Version: 4K", "Version: 7K")),
		"歌曲/song.wav": audioFixture(),
	});
	await page.getByLabel("导入谱面文件").setInputFiles({ name: "set.osz", mimeType: "application/zip", buffer: Buffer.from(archive) });
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.getByRole("application", { name: "Mania 谱面编辑区" }).focus();
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Delete");
	await expect(page.getByTestId("note-count")).toHaveText("0 音符");
	await page.getByLabel("选择难度").selectOption("1");
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.getByLabel("选择难度").selectOption("0");
	await expect(page.getByTestId("note-count")).toHaveText("0 音符");
	await page.getByRole("button", { name: "撤销", exact: true }).click();
	await expect(page.getByTestId("note-count")).toHaveText("3 音符");
	await page.getByRole("region", { name: "Mania Studio", exact: true }).scrollIntoViewIfNeeded();
	await expect(page.locator(".loader-bg")).toHaveCSS("opacity", "0");
	await page.screenshot({ path: testInfo.outputPath("mania-workspace.png"), fullPage: true });
	await page.locator(".mania-playfield").screenshot({ path: testInfo.outputPath("mania-notes.png") });
	await page.evaluate(() => {
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add("dark");
	});
	await page.screenshot({ path: testInfo.outputPath("mania-workspace-dark.png"), fullPage: true });
	await page.locator(".mania-transport").scrollIntoViewIfNeeded();
	await page.screenshot({ path: testInfo.outputPath("mania-transport.png"), fullPage: true });
});
