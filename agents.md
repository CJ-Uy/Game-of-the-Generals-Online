# Agent Notes

## Project

Game of the Generals Online is a Next.js web app deployed through OpenNext on Cloudflare.

Use:

- Tailwind CSS for styling.
- shadcn/ui-style primitives in `src/components/ui`.
- Drizzle for database schema and queries.
- The `design/` folder as reference material, not production code.

## Current Direction

The app should become an online chess-platform-style experience for Game of the Generals:

- landing page
- guest play
- solo practice
- pass-and-play
- private rooms
- later accounts, ads, shop, skins, inventory, and profiles

Keep the first playable loop small. Guest match before account features.

## Design Reference

Read these before touching the home/game UI:

- `design/Home.dc.html`: best reference for the animated home board.
- `design/Game of the Generals.dc.html`: full prototype with routes, setup, game board, AI, shop, themes, and radar canvas.
- `design/Play.dc.html`: lobby and room-code behavior.
- `design/Style Explorations.dc.html`: visual direction.
- `design/support.js`: generated DC runtime. Do not port it.

For home animation, port the logic from `Home.dc.html` into React instead of recreating it from scratch.

## Implementation Rules

- Prefer existing local patterns before adding new helpers.
- Keep game rules in plain TypeScript functions that can be tested without React.
- Keep animation components isolated as client components.
- Do not put server data or database access inside visual components.
- Use CSS transitions for board piece movement unless canvas is clearly needed.
- Use Drizzle migrations/schema for persistent rooms, matches, users, inventories, purchases, and match events.
- Do not add account, shop, ad, or payment systems until the guest game loop works.

## Verification

Before finishing non-trivial UI or game logic changes:

- Run `pnpm exec tsc --noEmit`.
- Run `pnpm build` when route, config, or rendering behavior changed.
- Check the page in a browser when animation or layout changed.

Docs-only changes do not need a build.
