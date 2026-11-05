"use client";
import { useEffect, useRef, useState } from "react";
import type { DraftSummary } from "./storage";

type Props = {
	mode: "save" | "restore";
	drafts: DraftSummary[];
	defaultName: string;
	busy: boolean;
	error: string;
	onClose: () => void;
	onSave: (name: string, id?: string) => void;
	onRestore: (id: string) => void;
};

export function DraftDialog({ mode, drafts, defaultName, busy, error, onClose, onSave, onRestore }: Props) {
	const dialog = useRef<HTMLDialogElement>(null);
	const [selected, setSelected] = useState(mode === "restore" ? drafts[0]?.id || "" : "");
	const [name, setName] = useState(defaultName.slice(0, 80));
	useEffect(() => {
		const element = dialog.current!;
		element.showModal();
		return () => element.close();
	}, []);
	return (
		<dialog
			ref={dialog}
			className="mania-draft-dialog"
			aria-label={mode === "save" ? "保存草稿" : "恢复草稿"}
			aria-busy={busy}
			onKeyDown={(event) => event.stopPropagation()}
			onCancel={(event) => {
				event.preventDefault();
				if (!busy) onClose();
			}}
		>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					if (busy) return;
					if (mode === "save") onSave(name, selected || undefined);
					else if (selected) onRestore(selected);
				}}
			>
				<h2>{mode === "save" ? "保存草稿" : "恢复草稿"}</h2>
				<fieldset disabled={busy}>
					{mode === "save" && (
						<label className="mania-field">
							<span>草稿名称</span>
							<input autoFocus aria-label="草稿名称" value={name} maxLength={80} required onChange={(event) => setName(event.target.value)} />
						</label>
					)}
					<div className="mania-draft-list" role="radiogroup" aria-label="草稿列表">
						{mode === "save" && (
							<label className="mania-draft-row">
								<input
									type="radio"
									name="draft"
									checked={!selected}
									onChange={() => {
										setSelected("");
										setName(defaultName.slice(0, 80));
									}}
								/>
								<span>新草稿</span>
							</label>
						)}
						{drafts.map((draft) => (
							<label className="mania-draft-row" key={draft.id}>
								<input
									type="radio"
									name="draft"
									aria-label={`选择草稿 ${draft.name}`}
									checked={selected === draft.id}
									onChange={() => {
										setSelected(draft.id);
										if (mode === "save") setName(draft.name);
									}}
								/>
								<span>
									<strong>{draft.name}</strong>
									<small>{`${new Date(draft.savedAt).toLocaleString()} · ${draft.chartCount} 个难度`}</small>
								</span>
							</label>
						))}
						{!drafts.length && <p className="mania-muted">还没有保存的草稿。</p>}
					</div>
					{error && <p className="mania-error" role="alert">{error}</p>}
					<footer>
						<button type="button" onClick={onClose}>取消</button>
						<button type="submit" className="mania-primary" disabled={mode === "save" ? !name.trim() : !selected}>
							{mode === "save" ? selected ? "覆盖所选草稿" : "保存新草稿" : "恢复所选草稿"}
						</button>
					</footer>
				</fieldset>
			</form>
		</dialog>
	);
}
