import { Pre, withIcons } from "nextra/components";
import type { ComponentProps } from "react";
import {
	normalizeCodeLanguage,
	resolveCodeBlockFilename,
} from "./code-pre-meta";

const PreWithIcons = withIcons(Pre);

export function CodePre(props: ComponentProps<typeof Pre>) {
	const language = props["data-language"];
	const filename = resolveCodeBlockFilename(
		props["data-filename"],
		language,
	);

	return (
		<PreWithIcons
			{...props}
			data-language={normalizeCodeLanguage(language) ?? language}
			data-filename={filename}
		/>
	);
}
