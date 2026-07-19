# Cloudea's Blog

A personal blog built with [Next.js](https://nextjs.org) and [Nextra](https://nextra.site), statically exported and deployed to GitHub Pages.

## Prerequisites

- Node.js 22
- pnpm 11.15.0

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

## License

[GPL-3.0-only](./LICENSE) © CloudeaSoft
