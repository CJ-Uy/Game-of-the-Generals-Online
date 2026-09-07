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

# First run only: the local D1 starts empty, so every online-room request
# fails with "no such table: game_rooms" until the migration is applied.
npx wrangler d1 execute gogo-db --local --file drizzle/0000_bouncy_matthew_murdock.sql
```

## Layout

```
src/app/
  layout.tsx          # fonts (Geist, Teko=display, IBM Plex Mono, Karla=body), metadata
  page.tsx            # → HomeExperience
  globals.css         # theme vars, keyframes, .wr-* board transforms
  play/page.tsx       # → BoardSetup
src/components/
  app-header.tsx            # shared in-app header (mark + slot for actions)
  home/home-experience.tsx  # landing: hero, ranks, modes, tutorial modal, shop modal
  home/war-board.tsx        # self-playing AI board demo behind the hero (client sim)
  game/piece.tsx            # canonical piece face + MoveDot (use this, don't re-roll)
  game/coach.tsx            # CoachLine band + useCoachLevel (full | hints | off)
  game/rank-reference.tsx   # "what beats what" ladder, derived from battleLosers
  game/player-rail.tsx      # opponent / player rail around the board
  game/match-result.tsx     # post-match verdict + revealed enemy army
  play/board-setup.tsx      # drag/tap placement, formations, mode select
  ui/{button,card,badge,sheet,icons}.tsx
src/lib/coach.ts      # rank matchups + the one-line coach engine
src/lib/formations.ts # starter deployments (dev-time self-validating)
src/db/schema.ts      # game_rooms, game_matches (Drizzle, unused so far)
src/lib/utils.ts      # cn()
design/               # exported HTML design mocks (reference only, not built)
```

## Design system (memorize — no config file to look it up in)

Tokens live in `src/app/globals.css`. **Prefer `var(--token)` over raw hex**
in new code; older screens still carry hardcoded values.

| Token | Value | Use |
|---|---|---|
| `--background` | `#0e1420` | page bg |
| `--foreground` | `#ede8da` | primary text |
| `--accent` | `#c9a85d` (hi `#dabb74`, lo `#a8894a`) | gold — armies + arbiter only |
| `--panel` / `--panel-raised` | `#0b101b` / `#121b2c` | insets, panels |
| `--line` / `--line-strong` | `#1c2740` / `#2c3a55` | hairlines |
| `--ink-muted` / `--ink-faint` | `#8a93a8` / `#5b647a` | labels, captions |
| `--slate-piece` / `--slate-piece-hi` | `#5f759e` / `#8298bf` | enemy piece face |
| `--live` | `#8fae6e` | live/status/confirm |
| `--loss` | `#a8503c` | defeat, destructive |
| `--warn` | `#c9873d` | caution, reconnecting |

**The one colour rule: gold belongs to the armies and the arbiter.** Buttons,
labels, borders and structure use the ink and slate scales, so the board stays
the only saturated thing on screen and an arbiter verdict reads as an event.
Don't add gold-filled CTAs or gold section accents.

Two hard constraints:

- **An enemy tile must render identically regardless of the rank it hides** —
  no glyph, no silhouette, no size cue. Any hint leaks the bluff economy.
- **Enemy pieces must stay ≥3:1 against both board squares.** Hidden
  information means you can't read their *rank*, not that you can't see them.

Type: `font-display` (Teko) for uppercase headlines, `font-mono`
(IBM Plex Mono) for **data only** — clocks, ratings, codes, coordinates, counts
— and `font-body` (Karla) for prose. Rank glyphs (★★★, ▲▲, ◉, ⚑) stay as text;
everything else an interface needs to say is a drawn icon from `ui/icons.tsx`.

## Conventions

- Interactive screens are client components (`"use client"`); keep server
  components server-side where possible.
- Reuse `Button`/`Card`/`Badge` variants before adding new primitives.
- Board math: 9 cols. Player zone = 3 rows; a piece's `zone` index is
  `(row - 5) * 9 + col` in `board-setup`. Full board is 9×8 in `war-board`.
- Respect `prefers-reduced-motion` (already honored globally in `globals.css`).
- `src/lib/game.ts::ranks` is the single source for ranks, glyphs and counts;
  `battleLosers` is the single source for who wins a fight. Every screen and
  `war-board`'s demo sim now derive from those — don't re-declare either.
- Render pieces through `components/game/piece.tsx`. Don't hand-roll a piece
  face — hand-rolling is how the rank tables fragmented in the first place.
- New-player guidance goes through `lib/coach.ts`, one line at a time. Never a
  modal, never two hints at once. Matchups are *derived* from `battleLosers`,
  so they cannot drift from the rules.

## Game rules (source of truth for logic)

15 ranks, 21 pieces/side: 5 Generals (5★→1★), Colonel, Lt.Col, Major,
Captain, 1st/2nd Lt, Sergeant, 6 Privates, 2 Spies, 1 Flag. Higher rank wins;
**Spy beats every officer but loses to Private**; **Flag beats only the other
Flag**; equal ranks both die. Win by taking the flag or walking your flag to
the far edge. Battle resolution lives in `src/lib/game.ts::battleLosers`;
`war-board`'s demo sim and the rank reference both call it rather than
restating the rules.
