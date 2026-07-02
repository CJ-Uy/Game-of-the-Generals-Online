# Game of the Generals Online Design

## Goal

Build a fast, readable online Game of the Generals web app: familiar like an online chess platform, but tuned for hidden information, bluffing, and the private arbiter.

The first experience should let someone land on the site, understand the game quickly, and start playing as a guest. Accounts, ads, shop items, skins, and progression can come later without changing the core match flow.

## Product Shape

- Home screen: tactical war-room landing page with a living board behind the title.
- Guest play first: no account required for the first match.
- Core modes: solo drill, pass-and-play, and private room.
- Later modes: ranked matchmaking, profiles, friends, saved matches, cosmetics, ads, and shop.
- Monetization should stay cosmetic or convenience-based. Do not sell match advantage.

## Visual Direction

Use the `design/` exports as the main visual reference.

- Primary mood: war room, officer table, tactical board.
- Palette: deep navy-black base, brass/gold accent, parchment text, radar green only for live/status signals.
- Typography: condensed display headlines, clean readable body text, mono labels for system/status text.
- UI density: closer to chess platforms and strategy dashboards than marketing sites.
- Avoid oversized decorative cards. Use full-width sections, compact panels, and clear game controls.

## Animation Direction

The home screen should eventually use the real design logic, not a decorative loop.

`design/Home.dc.html` contains the reference animation:

- Generates a randomized 9x8 board.
- Deals 21 hidden pieces per side.
- Runs legal one-square moves.
- Resolves challenges by Game of the Generals rules.
- Shows an arbiter phase before casualties disappear.
- Resets after a flag win or stalemate.

The production version should port that logic into a small React client component. Do not use `design/support.js`; it is only the generated design runtime.

`design/Game of the Generals.dc.html` contains a separate canvas radar animation for the larger prototype. Port that later only if the landing page needs the extra atmosphere.

## Game UX Principles

- Make legal moves obvious.
- Keep hidden information hidden.
- Reveal only what the real game reveals.
- Treat the arbiter as a first-class interaction: challenges need a clear suspense beat.
- Make pass-and-play privacy explicit before handing the screen to the other player.
- Keep game actions fast; no decorative animation should delay input longer than necessary.

## Future Systems

- Accounts: optional at first, then used for profiles, match history, rating, cosmetics, and purchases.
- Shop: skins, boards, emotes, titles, profile frames, and seasonal bundles.
- Ads: only around non-match surfaces or between games. Never interrupt a live match.
- Persistence: Drizzle schema should grow around rooms, matches, players, inventories, purchases, and match events.
