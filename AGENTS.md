# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single **Next.js 15 + Nextra 4** static blog (`cloudea-blog-nextra`). There is no backend, database, or automated test suite (a `vitest` dependency exists but there are no test files or `test` script). Standard scripts live in `package.json` (`dev`, `build`, `start`, `postbuild`). Toolchain: Node 24 + pnpm 11.15.0. The update script runs `pnpm install` on startup.

Non-obvious caveats:

- **A `.env` file is required for `pnpm build` (and correct dev metadata).** `app/_components/layout/navbar/stack.tsx` builds a home URL from `NEXT_PUBLIC_BASE_URL` + normalized `NEXT_PUBLIC_BASE_PATH` and passes it to `new URL(...)`. With `NEXT_PUBLIC_BASE_URL` unset the expression is invalid, so the build fails with `TypeError: Invalid URL` while collecting the `/categories` pages. `.env` is gitignored; create it once from `.env.example` (`NEXT_PUBLIC_BASE_URL="http://localhost:3000"`, `NEXT_PUBLIC_BASE_PATH=""`) if it is missing.
- **`NEXT_PUBLIC_BASE_PATH` root on Cloudflare:** Workers Builds cannot store an empty env value. Omit `NEXT_PUBLIC_BASE_PATH`, or set it to `/`; `utils/base-path.ts` normalizes unset / blank / `/` to site root.
- **Search does not work under `pnpm dev`.** Nextra 4 search uses Pagefind, which indexes built `.html` files; the dev server shows "Failed to load search index". To exercise search, run `pnpm build` (its `postbuild` step runs Pagefind into `out/_pagefind`) and serve the static export from `out/`, e.g. `npx serve out -l 4000`. Note `next.config.ts` sets `output: "export"`, so `next start` is not the right way to preview; serve the `out/` directory with any static server.
- **Lint:** run `pnpm lint` (`eslint .`). Typecheck with `pnpm typecheck` (`tsc --noEmit`).
