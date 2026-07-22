"use client";

import Editor, { loader, type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useMounted } from "nextra/hooks";
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
	const theme = mounted && resolvedTheme === "dark" ? "vs-dark" : "light";

	const handleMount: OnMount = (_editor, monaco) => {
		if (language === "hlsl") {
			registerHlslLanguage(monaco);
		}
	};

	return (
		<div className="hlsl-editor">
			<div className="hlsl-editor__label">{label}</div>
			<div className="hlsl-editor__frame">
				<Editor
					height="100%"
					language={language === "csharp" ? "csharp" : "hlsl"}
					theme={theme}
					value={value}
					onChange={(next) => onChange(next ?? "")}
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
