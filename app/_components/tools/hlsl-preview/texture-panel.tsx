"use client";

import { Icon } from "@iconify-icon/react";
import { useRef, useState } from "react";

export type TextureItem = {
	id: string;
	/** Identifier after `Textures.` — editable */
	name: string;
	fileName: string;
};

type TexturePanelProps = {
	textures: TextureItem[];
	onAdd: (name: string, file: File, image: HTMLImageElement) => void;
	onRename: (id: string, nextName: string) => string | null;
	onRemove: (id: string) => void;
};

function assetNameFromFile(fileName: string): string {
	const base = fileName.replace(/\.[^.]+$/, "").replace(/[^\w]+/g, "_");
	return base.replace(/^(\d)/, "_$1") || "Texture";
}

function textureRef(name: string): string {
	return `Textures.${name}`;
}

export function TexturePanel({
	textures,
	onAdd,
	onRename,
	onRemove,
}: TexturePanelProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [renameError, setRenameError] = useState<string | null>(null);

	const handleFiles = async (files: FileList | null) => {
		if (!files) return;
		for (const file of Array.from(files)) {
			if (!file.type.startsWith("image/")) continue;
			const name = assetNameFromFile(file.name);
			const url = URL.createObjectURL(file);
			try {
				const image = await loadImage(url);
				onAdd(name, file, image);
			} finally {
				URL.revokeObjectURL(url);
			}
		}
		if (inputRef.current) inputRef.current.value = "";
	};

	const handleCopy = async (name: string, id: string) => {
		const text = textureRef(name);
		try {
			await navigator.clipboard.writeText(text);
			setCopiedId(id);
			window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1200);
		} catch {
			setRenameError("Copy failed — clipboard unavailable");
		}
	};

	const handleNameChange = (id: string, raw: string) => {
		const cleaned = raw.replace(/[^\w]/g, "");
		const err = onRename(id, cleaned);
		setRenameError(err);
	};

	return (
		<div className="hlsl-textures">
			<div className="hlsl-textures__header">
				<span className="hlsl-textures__title">Textures</span>
				<button
					type="button"
					className="hlsl-preview__btn"
					onClick={() => inputRef.current?.click()}
				>
					<Icon
						icon="mdi:upload"
						width={16}
						height={16}
					/>
					Import
				</button>
				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					multiple
					hidden
					onChange={(event) => void handleFiles(event.target.files)}
				/>
			</div>
			<p className="hlsl-textures__hint">
				Use
				{" "}
				<code>Textures.Name</code>
				{" "}
				in C# (e.g.
				{" "}
				<code>GraphicsDevice.Textures[0] = Textures.RingSoft;</code>
				). Missing textures fall back to white.
			</p>
			{renameError && (
				<p className="hlsl-textures__error">{renameError}</p>
			)}
			{textures.length === 0
				? (
					<p className="hlsl-textures__empty">No textures imported yet.</p>
				)
				: (
					<ul className="hlsl-textures__list">
						{textures.map((item) => (
							<li
								key={item.id}
								className="hlsl-textures__item"
							>
								<div className="hlsl-textures__name-row">
									<span className="hlsl-textures__prefix">Textures.</span>
									<input
										className="hlsl-textures__name-input"
										value={item.name}
										spellCheck={false}
										aria-label={`Texture name for ${item.fileName}`}
										onChange={(event) =>
											handleNameChange(item.id, event.target.value)}
									/>
									<button
										type="button"
										className="hlsl-textures__icon-btn"
										aria-label={`Copy Textures.${item.name}`}
										title="Copy Textures.Name"
										onClick={() => void handleCopy(item.name, item.id)}
									>
										<Icon
											icon={copiedId === item.id ? "mdi:check" : "mdi:content-copy"}
											width={16}
											height={16}
										/>
									</button>
									<button
										type="button"
										className="hlsl-textures__icon-btn hlsl-textures__icon-btn--danger"
										aria-label={`Remove Textures.${item.name}`}
										onClick={() => onRemove(item.id)}
									>
										<Icon
											icon="mdi:close"
											width={16}
											height={16}
										/>
									</button>
								</div>
								<span className="hlsl-textures__file">{item.fileName}</span>
							</li>
						))}
					</ul>
				)}
		</div>
	);
}

function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Failed to decode image"));
		image.src = url;
	});
}
