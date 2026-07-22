"use client";

import Editor, { loader, type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useMounted } from "nextra/hooks";
import {
	CSHARP_GEOM_LANGUAGE_ID,
	GEOM_THEME_DARK,
	GEOM_THEME_LIGHT,
	registerCsharpLanguage,
} from "./register-csharp";
import { registerHlslLanguage } from "./register-hlsl";

if (typeof window !== "undefined") {
	loader.config({
		paths: {
			vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.56.0/min/vs",
		},
	});
}

type CodeEditorProps = {
	value: string;
	onChange: (value: string) => void;
	label: string;
	language: "hlsl" | "csharp";
};

export function CodeEditor({ value, onChange, label, language }: CodeEditorProps) {
	const { resolvedTheme } = useTheme();
	const mounted = useMounted();
	const theme
		= mounted && resolvedTheme === "dark" ? GEOM_THEME_DARK : GEOM_THEME_LIGHT;
	const monacoLanguage = language === "csharp" ? CSHARP_GEOM_LANGUAGE_ID : "hlsl";

	const handleMount: OnMount = (editor, monaco) => {
		registerCsharpLanguage(monaco);
		registerHlslLanguage(monaco);
		monaco.editor.setTheme(theme);
		const model = editor.getModel();
		if (model) {
			monaco.editor.setModelLanguage(model, monacoLanguage);
		}
		// Page-level capture handler owns Save; keep Monaco from swallowing Ctrl/Cmd+S.
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {});
	};

	return (
		<div className="hlsl-editor">
			<div className="hlsl-editor__label">{label}</div>
			<div className="hlsl-editor__frame">
				<Editor
					height="100%"
					language={monacoLanguage}
					theme={theme}
					value={value}
					onChange={(next) => onChange(next ?? "")}
					beforeMount={(monaco) => {
						registerCsharpLanguage(monaco);
						registerHlslLanguage(monaco);
					}}
					onMount={handleMount}
					options={{
						fontSize: 13,
						fontFamily:
							"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
						minimap: { enabled: false },
						scrollBeyondLastLine: false,
						automaticLayout: true,
						tabSize: 4,
						wordWrap: "on",
						renderLineHighlight: "line",
						padding: { top: 8, bottom: 8 },
					}}
					loading={<div className="hlsl-editor__loading">Loading editor…</div>}
				/>
			</div>
		</div>
	);
}

/** @deprecated use CodeEditor */
export const HlslEditor = CodeEditor;
