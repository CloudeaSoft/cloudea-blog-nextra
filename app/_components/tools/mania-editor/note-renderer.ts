import { drawDefaultNote, noteBounds, type NoteAppearance } from "./note-skin";

/** Cache the vector skin at the current physical pixel size, separately per lane colour.
 * Long holds reuse the original end caps and stretch only the solid body between them.
 * Very short holds and translucent editing ghosts keep the original vector drawing.
 */
export function createNoteRenderer() {
	let geometry = "";
	const sprites = new Map<string, HTMLCanvasElement>();
	return (ctx: CanvasRenderingContext2D, note: NoteAppearance, ratio: number) => {
		const { height, top } = noteBounds(note.head, note.tail, note.laneWidth);
		const unitPixels = Math.ceil(height * ratio);
		const unit = unitPixels / ratio;
		const hold = note.tail < note.head;
		if (note.ghost || (hold && note.head - note.tail < unit)) {
			drawDefaultNote(ctx, note);
			return;
		}
		const nextGeometry = `${note.laneWidth}:${ratio}`;
		if (geometry !== nextGeometry) {
			sprites.clear();
			geometry = nextGeometry;
		}
		const key = `${note.accent}:${hold}`;
		let sprite = sprites.get(key);
		// Two physical pixels keep antialiased edges inside the cached bitmap.
		const padding = 2 / ratio;
		if (!sprite) {
			sprite = document.createElement("canvas");
			sprite.width = Math.ceil(Math.max(3, note.laneWidth - 4) * ratio) + 4;
			sprite.height = unitPixels * (hold ? 3 : 1) + 4;
			const image = sprite.getContext("2d");
			if (!image) {
				drawDefaultNote(ctx, note);
				return;
			}
			image.scale(ratio, ratio);
			drawDefaultNote(image, {
				...note,
				x: padding,
				head: padding + unit * (hold ? 3 : 1),
				tail: padding + unit,
				selected: false,
				ghost: false,
			});
			sprites.set(key, sprite);
		}
		const x = note.x - padding;
		const width = sprite.width / ratio;
		if (hold) {
			ctx.drawImage(sprite, 0, 0, sprite.width, unitPixels + 2, x, note.tail - unit - padding, width, unit + padding);
			const body = note.head - note.tail - unit;
			if (body > 0) ctx.drawImage(sprite, 0, unitPixels + 2, sprite.width, unitPixels, x, note.tail, width, body);
			ctx.drawImage(sprite, 0, unitPixels * 2 + 2, sprite.width, unitPixels + 2, x, note.head - unit, width, unit + padding);
		} else {
			ctx.drawImage(sprite, x, note.head - unit - padding, width, sprite.height / ratio);
		}
		if (note.selected) {
			ctx.save();
			ctx.strokeStyle = "#80bfff";
			ctx.lineWidth = 1.5;
			ctx.strokeRect(note.x - 2, top - 2, Math.max(3, note.laneWidth - 4) + 4, note.head - top + 4);
			ctx.restore();
		}
	};
}
