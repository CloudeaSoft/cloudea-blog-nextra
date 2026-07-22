"use client";

import { Icon } from "@iconify-icon/react";
import { useRef } from "react";

export type TextureItem = {
	name: string;
	fileName: string;
};

type TexturePanelProps = {
	textures: TextureItem[];
	onAdd: (name: string, file: File, image: HTMLImageElement) => void;
	onRemove: (name: string) => void;
};

function assetNameFromFile(fileName: string): string {
	return fileName.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_");
}

export function TexturePanel({ textures, onAdd, onRemove }: TexturePanelProps) {
	const inputRef = useRef<HTMLInputElement>(null);

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
				File name (without extension) becomes
				{" "}
				<code>Commons.ModAsset.Name.Value</code>
				. Missing textures fall back to white.
			</p>
			{textures.length === 0
				? (
					<p className="hlsl-textures__empty">No textures imported yet.</p>
				)
				: (
					<ul className="hlsl-textures__list">
						{textures.map((item) => (
							<li
								key={item.name}
								className="hlsl-textures__item"
							>
								<code>{item.name}</code>
								<span className="hlsl-textures__file">{item.fileName}</span>
								<button
									type="button"
									className="hlsl-textures__remove"
									aria-label={`Remove ${item.name}`}
									onClick={() => onRemove(item.name)}
								>
									<Icon
										icon="mdi:close"
										width={16}
										height={16}
									/>
								</button>
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
