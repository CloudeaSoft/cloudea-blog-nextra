# Mania Studio

Open Tools → Mania Studio (`/tools/mania-editor`). This tool runs entirely in the browser and works in the static export.

The editor fills the available Tools workspace: a compact file/menu strip at the top, composition tools on the left, a centred vertical playfield, an independently scrolling inspector on the right, and a fixed song timeline/transport at the bottom. On narrow screens, the inspector opens from the note/timing/settings tabs and can be dismissed with its close button or Escape. Help opens on demand. There is no introductory title block or outer card margin.

## Workflow

The top-right **新建** action starts an empty 4K project, stopping playback and clearing all current difficulties, audio/sample assets, bookmarks, selection, clipboard and undo/redo history. View/playback controls return to their defaults. Unsaved changes require confirmation; cancelling leaves the workspace intact. Previously saved drafts remain available through **恢复草稿**. The round **?** button opens help.

1. Import a native mania `.osu` or a `.osz` archive. Archives retain other rulesets and non-editor resources for export. A standalone `.osu` needs its audio loaded separately.
2. Choose a difficulty, or create an empty difficulty. Set key count, metadata, HP and OD in **谱面设置**. Set BPM/offset, meter and SV in **定时点**.
3. Choose **单键** and click the playfield, or **长条** and drag. **选择** supports box selection, Shift-click, moving selected notes, and dragging a hold's tail. Right-click deletes a note. Overlapping edits fail atomically.
4. Wheel over the playfield to step onto the next/previous grid line (Shift moves four divisions), including after arbitrary seeks and across BPM changes. Click or drag the slim left density overview to navigate the full song: time increases from bottom to top, and its highlighted window follows the current view. Arrow Up advances and Arrow Down goes back. Playback follows the media clock; the silent preview uses the performance clock. Editing uses a linear time axis, while **SV 预览** applies timing-point scroll multipliers. Playback rate and loop points are available below the playfield.
5. **保存草稿** (or Ctrl/Cmd+S) opens a named-draft dialog. Enter a name and save a new draft, or select an existing entry to overwrite only that draft. **恢复草稿** lists saved names, dates and difficulty counts; select one and restore. Each draft stores every difficulty and asset in IndexedDB. Export the current `.osu` or complete `.osz` separately. Drafts are not synced or uploaded; no legacy single-draft migration is provided.

Keyboard shortcuts work inside the workspace (including when the overview has focus) and do not intercept input fields: Space, 1/2/3, Ctrl/Cmd+A/C/X/V/H/Z/Y/Shift+Z/S, Delete, arrows, Shift+arrows. Ctrl+C copies, Ctrl+V pastes at the playhead, Ctrl+H mirrors selected objects, Ctrl+Z undoes, Ctrl+Y or Ctrl+Shift+Z redoes, and only Delete deletes the selection. Backspace retains its normal text-editing behaviour and does not delete beatmap objects. Buttons expose their bindings in hover titles and accessibility attributes. Clipboard operations use an editor-local clipboard. History retains the latest 50 edits across difficulties.

Space also controls playback when the timeline or volume slider has focus; holding it down does not repeatedly toggle playback. Text/number fields and select controls retain their native keyboard input. Editor focus outlines are hidden.

The horizontal time ruler above the editor displays beat divisions and timestamps for the current view. Hold **Ctrl** and wheel **inside this ruler** to zoom: wheel up shows less time (larger spacing), wheel down shows more. Each step adjusts the visible range by 0.25 seconds, bounded to 0.5–10 seconds. The ruler, range selector and overview window update together. Zooming is available during playback and never seeks; wheel navigation over the playfield retains grid snapping. There is no Alt-wheel zoom binding.

Hold **Ctrl** and wheel **inside the central playfield** to change the snap division instead: up selects a finer grid and down a coarser grid, through the same options as the snap selector (1/1, 1/2, 1/3, 1/4, 1/6, 1/8, 1/12, 1/16, 1/32). Snap and view controls sit together in the bottom bar. The ends clamp without wrapping. This does not seek or zoom; changing the division cancels any pending pointer edit so a gesture cannot mix two grids.

The bottom song timeline follows stable's marker colours: blue bookmarks below the axis, red BPM and green inherited timing points above it, a long yellow preview tick, and a white playhead. Click markers to seek exactly to their timestamps. **谱面设置 → 预览时间 (ms)** edits the yellow preview point (`-1` leaves it unset); bookmarks and preview time persist in drafts and exported files.

**Ctrl/Cmd+B** toggles the bookmark at the current millisecond (adds when absent, removes when present). The compact **◀ + − ▶** controls jump to the previous bookmark, add/remove at the current position, and jump to the next bookmark. Ctrl/Cmd+Left/Right also jumps between bookmarks without moving selected objects. Jumping stops at the first/last bookmark without wrapping; duplicate additions are disabled. All bookmark edits support undo/redo and export. Bookmark locations are shown only on the song timeline, with no separate text list.

## Compatibility

- Native `Mode:3`, 1–10K, selected in **谱面设置 → 键数**; multi-stage maps appear as contiguous columns. Other key counts are rejected on import and export.
- Notes and holds, BPM changes, inherited SV, meter, sample sets/index/volume, custom sample filenames, Kiai flags, metadata and bookmarks.
- Notes use the default osu!lazer **Argon** visual specification: its 1–10K column palettes, rounded gradient heads with a white leading edge and chevron, and dark hold bodies with separate head/tail caps. The Canvas adaptation uses the same 42:60 height/width proportion; selection adds an outline without replacing the skin colours. See `ARGON-LICENSE.txt` for the upstream MIT notice.
- Existing unknown `.osu` sections and general/difficulty fields are retained, including events. Storyboards, videos and custom skins are preserved in archives but not rendered or edited.
- Archive samples are used when available. Missing samples use original synthesized tones, not osu! game assets. This is an editing preview, not a scoring or gameplay implementation.
- Maximum imported archive: 128 MiB compressed, 256 MiB expanded, 64 MiB per file, 5000 entries. Maximum beatmap text: 16 million characters; maximum imported notes: 100,000. Invalid modes, timing and holds are rejected with errors.
- File roundtrips and exact format examples are tested. Native osu! client import is a separate manual compatibility check.

## Implementation and validation

`model.ts` handles `.osu` data; `timing.ts` handles grid/SV; `editing.ts` contains immutable operations/history; `archive.ts` handles bounded ZIP IO; `storage.ts` handles drafts. React UI, transport and canvas are isolated in their own modules.

Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, then `pnpm exec playwright test e2e/mania-editor.spec.ts`. Playwright uses the built `out/` site unless a local server already occupies port 4173.

References: [osu format](https://osu.ppy.sh/wiki/en/Client/File_formats/osu_(file_format)), [osu!lazer mania editor](https://github.com/ppy/osu/tree/master/osu.Game.Rulesets.Mania/Edit), [default Argon notes](https://github.com/ppy/osu/tree/master/osu.Game.Rulesets.Mania/Skinning/Argon), [beatmap-viewer-web](https://github.com/FukutoTojido/beatmap-viewer-web). The editor/format implementation is original; `note-skin.ts` adapts the upstream Argon visual specification under MIT. No game texture or sound assets are bundled.
