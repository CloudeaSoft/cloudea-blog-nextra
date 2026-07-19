# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single **Next.js 15 + Nextra 4** static blog (`cloudea-blog-nextra`). There is no backend, database, or automated test suite (a `vitest` dependency exists but there are no test files or `test` script). Standard scripts live in `package.json` (`dev`, `build`, `start`, `postbuild`). Toolchain: Node 22 + pnpm 11.15.0. The update script runs `pnpm install` on startup.

Non-obvious caveats:

- **A `.env` file is required for `pnpm build` (and correct dev metadata).** `app/_components/navbar/stack.tsx` computes `process.env.NEXT_PUBLIC_BASE_URL! + process.env.NEXT_PUBLIC_BASE_PATH` and passes it to `new URL(...)`. With those vars unset the expression evaluates to `NaN`, so the build fails with `TypeError: Invalid URL ... input: 'NaN'` while collecting the `/categories` pages. `.env` is gitignored; create it once from `.env.example` (`NEXT_PUBLIC_BASE_URL="http://localhost:3000"`, `NEXT_PUBLIC_BASE_PATH=""`) if it is missing.
- **Search does not work under `pnpm dev`.** Nextra 4 search uses Pagefind, which indexes built `.html` files; the dev server shows "Failed to load search index". To exercise search, run `pnpm build` (its `postbuild` step runs Pagefind into `out/_pagefind`) and serve the static export from `out/`, e.g. `npx serve out -l 4000`. Note `next.config.ts` sets `output: "export"`, so `next start` is not the right way to preview; serve the `out/` directory with any static server.
- **Lint:** there is no `lint` script; run ESLint directly with `npx eslint .`. As of setup it reports 2 pre-existing errors in `mdx-components.tsx` and 1 warning in `app/_components/sidebar.tsx` (not caused by env setup).
