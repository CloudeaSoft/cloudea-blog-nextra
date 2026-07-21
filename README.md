# Cloudea's Blog

A personal blog built with [Next.js](https://nextjs.org) and [Nextra](https://nextra.site), statically exported and deployed to GitHub Pages.

## Prerequisites

- Node.js 24
- pnpm 11.15.0

TypeScript 7 (`tsc`) runs side-by-side with the TypeScript 6 API (`tsc6`) so tooling like typescript-eslint keeps working. Use `pnpm typecheck` for TS 7 and `pnpm typecheck:tsc6` for the 6.x checker.

## Getting Started

```bash
pnpm install
cp .env.example .env   # Windows: copy .env.example .env
pnpm dev
```

Open http://localhost:3000.

> Search is unavailable under `pnpm dev` (Pagefind only indexes built output). To preview search, run `pnpm build` then serve the `out/` directory, e.g. `npx serve out -l 4000`.

## Build

```bash
pnpm build   # static export into out/ (requires .env)
```

## Visual regression tests

Style and navbar motion changes are guarded by Playwright baselines (desktop + mobile).

```bash
pnpm build:visual          # build with stable hitokoto fixture
pnpm test:visual           # compare against committed baselines
pnpm test:visual:update    # refresh baselines after intentional UI changes
```

- Page screenshots: `e2e/visual.spec.ts` (+ `e2e/visual.spec.ts-snapshots/`)
- Navbar compact / mobile drawer slide / hamburger icon: `e2e/navbar.spec.ts` (+ `e2e/navbar.spec.ts-snapshots/`)
- TOC flush-under-navbar + empty TOC visibility: `e2e/toc.spec.ts`

Commit updated snapshots when a visual or motion change is intentional; CI fails when screenshots or transition contracts drift.

## License

[GPL-3.0-only](./LICENSE) © CloudeaSoft
