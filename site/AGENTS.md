# AGENTS.md

> Kept from the Base44 export so agent conventions survive the move. The
> sections below describe the full Base44 TanStack Start template. This
> repository is a local recreation and deliberately omits the Base44
> platform-managed files — see README.md for exactly which, and why.

## Project Context

This is a Base44 app repository built with **TanStack Start** (React 19, plain JavaScript — no TypeScript): file-based routes, server functions and server routes, server-side rendering by default. Treat it as user-owned application code, keep changes focused on the user's request, and preserve the conventions below.

Start with `README.md` for local setup and the publish workflow.

## Key Files

- `src/routes/__root.jsx`: the HTML document (`<html>`, `<head>` via `HeadContent`, `<Scripts />`) and the providers. There is **no `index.html`**.
- `src/routes/*.jsx`: one page per file (`index.jsx` → `/`). `src/routeTree.gen.ts` is generated on every dev/build run — never edit or commit it.
- `src/components/ui/`: shadcn/ui kit (JSX). `src/index.css` + `tailwind.config.js`: design tokens.
- `vite.config.js`: plugin order matters and must not be reordered.

## Working Notes

- `npm run dev` runs the TanStack dev server (Vite).
- `npm run build` emits `dist/client` (static assets) and `dist/server`. Never commit either.
- Server and first client render must match: read `window`, `document` and browser storage only in effects and handlers (never in render or a `useState` initializer), and format dates and numbers with an explicit locale and time zone.
- Write JavaScript/JSX only — no `.ts`/`.tsx` files and no type annotations (the generated `src/routeTree.gen.ts` is the sole exception and is never hand-edited).
