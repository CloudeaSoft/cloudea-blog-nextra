import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const commentsCss = readFileSync(resolve(dir, "../comments.css"), "utf8");
const commentsTsx = readFileSync(resolve(dir, "../comments.tsx"), "utf8");
const themeScss = readFileSync(
	resolve(dir, "../../layout/theme.scss"),
	"utf8",
);

/** Pull `--name: value` declarations from the first `{...}` after `selector`. */
function customProperties(
	css: string,
	selector: string,
): Record<string, string> {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
	if (!match?.[1]) {
		throw new Error(`No rule found for ${selector}`);
	}

	const props: Record<string, string> = {};
	for (const line of match[1].split(";")) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("--")) continue;
		const colon = trimmed.indexOf(":");
		if (colon === -1) continue;
		props[trimmed.slice(0, colon).trim()] = trimmed.slice(colon + 1).trim();
	}
	return props;
}

describe("Waline comment theme", () => {
	it("loads the override stylesheet from the comments component", () => {
		expect(commentsTsx).toContain("import \"./comments.css\"");
	});

	it("maps Waline accents onto site theme tokens", () => {
		const props = customProperties(commentsCss, ".waline-comments");

		expect(props["--waline-theme-color"]).toBe("var(--primary-color)");
		expect(props["--waline-active-color"]).toBe("var(--selection-color)");
		expect(props["--waline-badge-color"]).toBe("var(--primary-color)");
		expect(props["--waline-color"]).toBe("var(--default-text-color)");
		expect(props["--waline-bg-color"]).toBe("var(--background-color)");
		expect(props["--waline-border-color"]).toBe("var(--border-color)");
		expect(props["--waline-white"]).toBe("#fff");
	});

	it("keeps the mapped tokens defined on the site theme", () => {
		expect(themeScss).toMatch(/--primary-color:\s*#a31f34/);
		expect(themeScss).toMatch(/--selection-color:\s*#be243c/);
	});
});
