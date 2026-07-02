# CLAUDE.md

Guidance for Claude Code working in this repo.

## What this is

**Game of the Generals Online** — a web version of *Salpakan*, the Filipino
strategy board game (2 players, 21 hidden pieces each, ranks battle on contact,
capture the flag). Marketing/landing site + an interactive board-setup screen.
Built by **Aligway Studios**.

## Stack

- **Next.js 16** (App Router, React 19, Turbopack) — TypeScript, strict.
- **Tailwind CSS v4** — CSS-first config via `@import "tailwindcss"` and
  `@theme inline` in `src/app/globals.css`. There is **no `tailwind.config`**.
- **shadcn-style UI primitives** in `src/components/ui/` (CVA + `cn()` merge).
- **Drizzle ORM** targeting Cloudflare **D1** (SQLite) — schema in
  `src/db/schema.ts`. Not yet wired to any route.
- **Deploy:** Cloudflare Workers via `@opennextjs/cloudflare` (`wrangler`).
- **Package manager:** pnpm (lockfile present).

## Commands

```bash
pnpm dev          # local dev (next dev)
pnpm build        # next build
pnpm lint         # eslint (next lint)
pnpm preview      # opennext build + local cloudflare preview
pnpm deploy       # opennext build + deploy to cloudflare
pnpm cf-typegen   # regenerate cloudflare-env.d.ts from wrangler
```

## Layout

```
src/app/
  layout.tsx          # fonts (Geist, Teko=display, IBM Plex Mono, Karla=body), metadata
  page.tsx            # → HomeExperience
  globals.css         # theme vars, keyframes, .wr-* board transforms
  play/page.tsx       # → BoardSetup
src/components/
  home/home-experience.tsx  # landing: hero, ranks, modes, tutorial modal, shop modal
  home/war-board.tsx        # self-playing AI board demo behind the hero (client sim)
  play/board-setup.tsx      # drag/tap piece placement, mode select, localStorage loadout
  ui/{button,card,badge}.tsx
src/db/schema.ts      # game_rooms, game_matches (Drizzle, unused so far)
src/lib/utils.ts      # cn()
design/               # exported HTML design mocks (reference only, not built)
```

## Design system (memorize — no config file to look it up in)

Colors are **hardcoded hex** in `className`s. Keep using these exact values:

| Token | Value | Use |
|---|---|---|
| background | `#0e1420` | page bg (`var(--background)`) |
| foreground | `#ede8da` | primary text (`var(--foreground)`) |
| accent | `#c9a85d` (hover `#dabb74`) | gold — CTAs, highlights (`var(--accent)`) |
| panel | `#0b101b` / `#121b2c` | cards, insets |
| border | `#1c2740` / `#2c3a55` | hairlines |
| muted text | `#8a93a8` / `#5b647a` | labels, captions |
| online-green | `#8fae6e` | live/status dots |

Type: `font-display` (Teko) for uppercase headlines, `font-mono`
(IBM Plex Mono) for labels/tickers with wide `tracking`, `font-body` (Karla)
for prose. Gold "pieces" = `bg-gradient-to-br from-[#c9a85d] to-[#a8894a]`
with `text-[#0e1420]/75`.

## Conventions

- Interactive screens are client components (`"use client"`); keep server
  components server-side where possible.
- Reuse `Button`/`Card`/`Badge` variants before adding new primitives.
- Board math: 9 cols. Player zone = 3 rows; a piece's `zone` index is
  `(row - 5) * 9 + col` in `board-setup`. Full board is 9×8 in `war-board`.
- Respect `prefers-reduced-motion` (already honored globally in `globals.css`).
- Ranks/glyphs are duplicated in `home-experience`, `war-board`, and
  `board-setup` — if you change one, check the others.

## Game rules (source of truth for logic)

15 ranks, 21 pieces/side: 5 Generals (5★→1★), Colonel, Lt.Col, Major,
Captain, 1st/2nd Lt, Sergeant, 6 Privates, 2 Spies, 1 Flag. Higher rank wins;
**Spy beats every officer but loses to Private**; **Flag beats only the other
Flag**; equal ranks both die. Win by taking the flag or walking your flag to
the far edge. Battle resolution lives in `war-board.tsx::resolveBattle`.
