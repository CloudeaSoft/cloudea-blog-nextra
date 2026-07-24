# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **Next.js + Nextra 4** blog (`cloudea-blog-nextra`) that defaults to static export (GitHub Pages) and can opt into a server build for Cloudflare Workers / API routes. Unit tests use Vitest (`pnpm test`); visual checks use Playwright. Standard scripts live in `package.json` (`dev`, `build`, `build:static`, `build:server`, `start`, `postbuild`). Toolchain: Node 24 + pnpm 11.15.0. The update script runs `pnpm install` on startup.

Non-obvious caveats:

- **Env helpers** live in `utils/env.ts` (`getBaseUrl`, `getBasePath`, `getHomeHref`, `getSiteUrl`, `getNextOutput`, `getBlogBackendUrl`, …). Navbar home uses `getHomeHref()` (relative), so a missing `NEXT_PUBLIC_BASE_URL` no longer breaks `pnpm build`. A local `.env` from `.env.example` is still recommended for absolute URLs / metadata. Cloudflare: set Build Variables (not only runtime vars) when you need them.
- **Arknights Worker proxy:** source is `scripts/cloudflare-worker.mjs`, config `wrangler.jsonc`. Same script for local / debug / prod. `pnpm worker:dev` → `http://127.0.0.1:8787`; `pnpm worker:deploy:dev` → `blog-backend-dev`; `pnpm worker:deploy` → `blog-backend`. Point the site at it with `NEXT_PUBLIC_BLOG_BACKEND_URL` (origin only; paths `/arknights-service` etc. are appended in `utils/env.ts`). Unset keeps production.
- **`NEXT_PUBLIC_BASE_PATH` root on Cloudflare:** Workers Builds cannot store an empty env value. Omit `NEXT_PUBLIC_BASE_PATH`, or set it to `/`; `getBasePath()` normalizes unset / blank / `/` to site root. Prefer `utils/env.ts` over reading these vars directly.
- **`NEXT_OUTPUT`:** unset/`export` → `output: "export"` (default, GitHub Pages). Set `NEXT_OUTPUT=server` for a non-export build (Workers + API). `postbuild` Pagefind runs only for export builds. Shortcuts: `pnpm build:static`, `pnpm build:server`. Keep the same `NEXT_OUTPUT` for `next start` as for the build (config is re-read at start).
- **Search does not work under `pnpm dev`.** Nextra 4 search uses Pagefind, which indexes built `.html` files; the dev server shows "Failed to load search index". For static export, run `pnpm build` / `pnpm build:static` (Pagefind → `out/_pagefind`) and serve `out/`, e.g. `npx serve out -l 4000`. Do not use `next start` with an export build.
- **Lint:** run `pnpm lint` (`eslint .`). Typecheck with `pnpm typecheck` (`tsc --noEmit`).
