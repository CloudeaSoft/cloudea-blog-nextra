/**
 * Canvas adaptation of osu!lazer's default Argon mania note geometry and palette.
 * Upstream: https://github.com/ppy/osu/tree/master/osu.Game.Rulesets.Mania/Skinning/Argon
 * Copyright (c) 2025 ppy Pty Ltd <contact@ppy.sh>. MIT; see ARGON-LICENSE.txt.
 */
const yellow = "#ffc528";
const orange = "#fc6d01";
const pink = "#d5235a";
const purple = "#cb3cec";
const cyan = "#48c6ff";
const green = "#64c05c";
const special = "#a96aff";

const palettes: Record<number, string[]> = {
	1: [yellow],
	2: [green, cyan],
	3: [green, special, cyan],
	4: [yellow, orange, pink, purple],
	5: [pink, orange, yellow, green, cyan],
	6: [pink, orange, green, cyan, orange, pink],
	7: [pink, orange, pink, special, pink, orange, pink],
	8: [purple, pink, orange, green, cyan, orange, pink, purple],
	9: [purple, pink, orange, yellow, special, yellow, orange, pink, purple],
	10: [purple, pink, orange, yellow, green, cyan, yellow, orange, pink, purple],
};

export function columnAccent(keys: number, lane: number): string {
	return palettes[keys][lane];
}

export function noteBounds(head: number, tail: number, laneWidth: number) {
	const height = Math.max(3, laneWidth - 4) * 42 / 60;
	return { top: tail - height, bottom: head, headTop: head - height, height };
}

function shade(hex: string, amount: number): string {
	const components = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
	const multiplier = amount >= 0 ? 1 + amount : 1 / (1 - amount);
	return `rgb(${components.map((c) => Math.round(Math.min(255, c * multiplier))).join(",")})`;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
	ctx.beginPath();
	ctx.roundRect(x, y, width, height, radius);
	ctx.fill();
}

type NoteAppearance = {
	x: number;
	laneWidth: number;
	head: number;
	tail: number;
	accent: string;
	selected: boolean;
	ghost: boolean;
};

export function drawDefaultNote(ctx: CanvasRenderingContext2D, note: NoteAppearance): void {
	const { x, laneWidth, head, tail, accent, selected, ghost } = note;
	const width = Math.max(3, laneWidth - 4);
	const scale = width / 60;
	const { height, top, headTop } = noteBounds(head, tail, laneWidth);
	const radius = 3.4 * scale;
	const hold = tail < head;
	ctx.save();
	ctx.globalAlpha = ghost ? 0.55 : 1;
	if (hold) {
		ctx.fillStyle = shade(accent, -0.6);
		// The dark body joins both caps at their full width.
		rounded(ctx, x, top, width, head - top, radius);
		const tailGlow = ctx.createLinearGradient(0, tail - height * 0.82, 0, tail - height * 0.41);
		tailGlow.addColorStop(0, `${accent}66`);
		tailGlow.addColorStop(1, `${accent}00`);
		ctx.globalCompositeOperation = "lighter";
		ctx.fillStyle = tailGlow;
		rounded(ctx, x, tail - height * 0.82, width, height * 0.82, radius);
		ctx.globalCompositeOperation = "source-over";
	}
	const shadow = ctx.createLinearGradient(0, headTop, 0, head);
	shadow.addColorStop(0, "#00000000");
	shadow.addColorStop(1, "#000000");
	ctx.fillStyle = shadow;
	rounded(ctx, x, headTop, width, height, radius);
	const face = ctx.createLinearGradient(0, head - height * 0.82, 0, head);
	face.addColorStop(0, shade(accent, 0.1));
	face.addColorStop(1, accent);
	ctx.fillStyle = face;
	rounded(ctx, x, head - height * 0.82, width, height * 0.82, radius);
	ctx.fillStyle = "#ffffff";
	rounded(ctx, x, head - 6.8 * scale, width, 6.8 * scale, radius);
	const centreX = x + width / 2;
	const centreY = head - height / 2 + (hold ? 2 : 4) * scale;
	if (hold) {
		rounded(ctx, centreX - 10 * scale, centreY - 2.5 * scale, 20 * scale, 5 * scale, 2.5 * scale);
	} else {
		// Canvas chevron replaces the upstream font glyph with the same simple shape.
		ctx.beginPath();
		ctx.moveTo(centreX - 8 * scale, centreY - 3 * scale);
		ctx.lineTo(centreX, centreY + 3 * scale);
		ctx.lineTo(centreX + 8 * scale, centreY - 3 * scale);
		ctx.lineWidth = 3.5 * scale;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.strokeStyle = "#ffffff";
		ctx.stroke();
	}
	if (selected) {
		// Selection is an editor overlay: retain the actual skin underneath it.
		ctx.strokeStyle = "#80bfff";
		ctx.lineWidth = 1.5;
		ctx.strokeRect(x - 2, top - 2, width + 4, head - top + 4);
	}
	ctx.restore();
}
