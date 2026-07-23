# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **Next.js + Nextra 4** blog (`cloudea-blog-nextra`) that defaults to static export (GitHub Pages) and can opt into a server build for Cloudflare Workers / API routes. Unit tests use Vitest (`pnpm test`); visual checks use Playwright. Standard scripts live in `package.json` (`dev`, `build`, `build:static`, `build:server`, `start`, `postbuild`). Toolchain: Node 24 + pnpm 11.15.0. The update script runs `pnpm install` on startup.

Non-obvious caveats:

- **A `.env` file is required for `pnpm build` (and correct dev metadata).** Env helpers live in `utils/env.ts` (`getBaseUrl`, `getBasePath`, `getSiteUrl`, `getNextOutput`). With `NEXT_PUBLIC_BASE_URL` unset, `getSiteUrl()` is invalid for `new URL(...)`, so the build fails with `TypeError: Invalid URL` while collecting the `/categories` pages. `.env` is gitignored; create it once from `.env.example` if it is missing.
- **`NEXT_PUBLIC_BASE_PATH` root on Cloudflare:** Workers Builds cannot store an empty env value. Omit `NEXT_PUBLIC_BASE_PATH`, or set it to `/`; `getBasePath()` normalizes unset / blank / `/` to site root. Prefer `utils/env.ts` over reading these vars directly.
- **`NEXT_OUTPUT`:** unset/`export` → `output: "export"` (default, GitHub Pages). Set `NEXT_OUTPUT=server` for a non-export build (Workers + API). `postbuild` Pagefind runs only for export builds. Shortcuts: `pnpm build:static`, `pnpm build:server`.
- **Search does not work under `pnpm dev`.** Nextra 4 search uses Pagefind, which indexes built `.html` files; the dev server shows "Failed to load search index". For static export, run `pnpm build` (Pagefind → `out/_pagefind`) and serve `out/`, e.g. `npx serve out -l 4000`. With `NEXT_OUTPUT=export`, `next start` is not the right preview; serve `out/` instead.
- **Lint:** run `pnpm lint` (`eslint .`). Typecheck with `pnpm typecheck` (`tsc --noEmit`).
