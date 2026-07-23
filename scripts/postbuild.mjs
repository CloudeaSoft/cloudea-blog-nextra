/**
 * Run Pagefind only for static exports.
 * Keep NEXT_OUTPUT semantics in sync with getNextOutput() in utils/env.ts.
 */
import { spawnSync } from "node:child_process";

const raw = (process.env.NEXT_OUTPUT ?? "export").trim().toLowerCase();
const isExport = !raw || raw === "export";

if (!isExport) {
	console.log(`skip pagefind: NEXT_OUTPUT=${raw || "(empty)"} (not export)`);
	process.exit(0);
}

const result = spawnSync(
	"pagefind",
	["--site", ".next/server/app", "--output-path", "out/_pagefind"],
	{ stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
