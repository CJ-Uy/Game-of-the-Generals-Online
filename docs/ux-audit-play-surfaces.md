# UX audit: play surfaces

Scope: `/play` (army setup), `/play/bot`, `/play/local`, `/play/[code]` (online room), and the
sheets they open. Walked at 1440×900 and 390×844 (touch), September–October 2026. These
surfaces belong to the gameplay workstream, so this is a findings list rather than a diff.
Each item names the file, the problem as a player meets it, and the smallest fix that holds.

The site shell already shipped on `feat/ux-polish` changes three things these screens inherit:

- `Button size="sm"` is 40px tall on touch screens (`pointer-coarse:h-10`).
- `Button variant="outline"` no longer turns gold on hover, and its fill is near-opaque.
- Footer and landing links now deep-link with `?mode=bot|local|room|join` (see P0-1).

Mobbin references are cited inline; open them for the pattern, not the styling.

---

## P0 — broken or misleading

### 1. Landing and footer pick a mode the setup screen ignores
`src/components/play/board-setup.tsx` only reads `?join=CODE`. A player who clicks
"Vs computer" lands on setup with **Create lobby** selected and the primary button reading
"Create the room". Read `?mode=` alongside `?join=`:

```ts
const MODES = new Set(["room", "join", "local", "bot"]);
const asked = searchParams.get("mode");
if (asked && MODES.has(asked)) setMode(asked as Mode);
```

While there: the default mode should be `bot`, not `room`. A first visitor has no friend
waiting; the bot is the only mode that works alone, and the coach copy on `/how-to-play`
already tells people to start there. Remembering the last mode in `localStorage` is a nice
follow-up, not a requirement.

### 2. Setup on a phone puts three paragraphs between the player and the board
On 390px the order is title → coach → three formation cards (~560px) → board → reserve →
match type. The board starts below the fold, and the reserve the player taps from is a full
screen away from the squares they tap into.

Reorder for mobile: title + progress → board → reserve → formations → match type. Collapse
formations to a row of three chips (`Balanced · Left hook · Deep flag`) with the doctrine of
the last-applied one on a single line under it. Desktop keeps the cards if wanted, but
chips work there too and lift the board ~150px.

Pattern: inventory directly under the playfield with the primary action pinned below —
[Tolan placement tray](https://mobbin.com/screens/4d60b4e5-806c-456c-bddd-68fdb13a12a9),
[Premier League team builder](https://mobbin.com/screens/6e9ad774-96bb-4ef4-b48c-92dac0bd4712).

### 3. Local and bot matches never comment on a fight
`local-game-room.tsx` builds the `CoachLine` input without `lastClash`, so the bot and
pass-and-play screens stay silent after every battle — the moment the coach exists for.
`readLastClash` lives in `game-room.tsx`; move it to `board-view.tsx` and pass it in both
rooms.

### 4. Three hand-rolled overlays skip the shared dialog
The tag picker, the mobile panel ("Ranks / Taken / Log / Chat") and the old home modal were
`fixed inset-0` divs: no Escape, no focus trap, background still in the tab order. Home now
uses `Sheet`; the two in `game-room.tsx` and `local-game-room.tsx` should too.
`<Sheet title=… size="md">` is a drop-in.

---

## P1 — friction on every match

### 5. The desktop board does not fit the screen
At 1440×900 the match column is 1028px tall; the player's own rail ("You · Your move") is
below the fold, so whose turn it is lives off-screen. Every online board game sizes the board
by viewport *height*. Add to `globals.css` and put `board-fit` on the centre column:

```css
@media (min-width: 1024px) {
	.board-fit {
		max-width: max(440px, min(760px, calc((100dvh - 268px) * 1.06)));
	}
}
```

268px is header + both rails + coach line + board frame; retune if those change.

### 6. Two different rank references, three ways to open them
Header `?` opens `RankReference` (counts, matchups, the two inversions). The left rail and
the mobile "Ranks" button show `CommandChain` (hand-rolled faces, 9px mono, `↓` arrows,
"COUNT SHOWN"). Drop `CommandChain`, render `RankReference pieces={pieces}` in both places,
and give it an `activeRank` prop that highlights and expands the selected piece's row —
that turns "what beats what" into an answer at the moment of attacking. Remove the header
button on match screens; the bottom bar and the xl rail already cover it.

`CommandChain`, `PieceFace` (inside `PieceClashPreview`) and the "Your fallen" tiles also
re-implement the piece face that `components/game/piece.tsx` owns.

### 7. Mobile match toolbar is four identical text boxes
`RANKS / TAKEN / LOG / INFO` (or `CHAT`) as equal outline buttons. Native game toolbars use
icon + short label, and badge what changed:
[Google Arts & Culture puzzle](https://mobbin.com/screens/6bdb2388-7e2c-4117-9c21-b6f9fbdff354),
[Duolingo chess](https://mobbin.com/screens/0c9656e8-e6f0-4372-bf78-6e0cbe3e3c9d).

- Icons: `IconHelp` (ranks), `IconLog` (moves), `IconChat` (chat) exist in `ui/icons.tsx`;
  captured pieces needs one drawn icon.
- Online only: an unread dot on Chat — count opponent messages with `id` above the last one
  seen when the panel was open.
- Replace "Info" (static bot-plan text) with "Captured"; delete the "Bot plan" card.

### 8. Header chip truncates the title on phones
`BOT · SERGEANT` in the header pushes the wordmark to "GOG ONLI…". The top rail already says
"Bot · Sergeant". Hide the chip below `sm`.

### 9. The verdict is easy to miss
After the arbiter beat the defeated piece just disappears; with the coach off nothing says
what happened. Duolingo floats the result on the square
([+9 on capture](https://mobbin.com/screens/0c9656e8-e6f0-4372-bf78-6e0cbe3e3c9d)). Show a
short label on `lastMove.to` for ~1.4s — **Won** (`--live`), **Lost** (`--loss`),
**Both fell** (ink) — from the viewer's side only, never naming the enemy rank. End the
animation visible and remove it on a timer so reduced-motion users still read it:

```css
@keyframes gog-verdict {
	from { opacity: 0; transform: translateY(6px) scale(0.92); }
	to { opacity: 1; transform: translateY(0) scale(1); }
}
.gog-verdict { animation: gog-verdict 260ms var(--ease-out) both; }
```

### 10. Reserve: 21 tiles for 15 ranks, and selection drops after every placement
Six identical Private tiles and two Spies. Group by rank with a count badge (dim at zero),
15 tiles total. After placing one, keep that rank selected while more remain — placing six
Privates becomes seven taps instead of twelve.

Also: tapping a placed piece currently sends it straight back to reserve, so rearranging on
touch means recall + re-place. `placePiece` already swaps when the uid is on the board; make
a tap on a placed piece *select* it, a tap on another square move/swap it, and a second tap
on the same piece return it. Say so in the reserve hint line.

---

## P2 — polish

### 11. Tag picker copy
- Modifiers `EXACT / < / >` → **Is / Below / Above**.
- Rank names truncate at 8px mono ("5-STAR GENERA…"); use `rankShort` ("5★ Gen").
- Tapping the active tag again clears it — invisible. Add a "Clear mark" footer button
  when a tag exists.
- "TAG ENEMY PIECE" gold eyebrow → the sheet title; gold stays with armies and the arbiter.

### 12. Difficulty list
Six full-width rows on mobile (~300px). A 3×2 grid of glyph + name, with the selected
level's note on one line beneath, is the same choice in a third of the space —
[Abode difficulty control](https://mobbin.com/screens/a327db81-ca41-4554-8bca-302a0679926f),
[Opal difficulty sheet](https://mobbin.com/screens/3444f079-5e84-4286-9434-89756fcc2f0d).

### 13. Mode names drift
Setup: "Create lobby / Join lobby / Pass & play / Versus bot". Landing and footer now say
"Vs computer / Pass & play / Private room / Join a room". Use the second set on setup too.
Mode-first pickers worth borrowing from:
[Deezer "Pick your mode"](https://mobbin.com/screens/c72f4bf4-114c-4c01-821e-829a727ecbdb),
[Tempo challenge modes](https://mobbin.com/screens/4192498d-46db-41fb-9732-b2b24103c72c)
(join-with-a-code as its own quieter row).

### 14. Waiting room
The code card on the board works. Two upgrades from invite patterns:
- Show the link itself in a copyable field, with **Copy link** and **Share** as separate
  buttons (Share only when `navigator.share` exists) —
  [Life Reset invite](https://mobbin.com/screens/0d3486f5-2c69-47e8-b990-5066794a847d),
  [Alan share + copy](https://mobbin.com/screens/5b39e1cc-eb52-4e41-b434-3ee9374bb40a).
- A small pulsing dot beside "Waiting for them to join" so the screen reads as live, not
  stalled — [PlayStation party](https://mobbin.com/screens/f534b202-e467-4127-adc7-95e342550b0d).

### 15. Match result: actions scroll away on phones
`MatchResult` puts Rematch / New match after the revealed army; on 390px they are below the
sheet fold. Pass them as the `Sheet` `footer` so they stay pinned, and keep the army in the
body — [Quizlet results](https://mobbin.com/screens/914f0481-4918-4b49-a99c-122998a9774d),
[Deezer results](https://mobbin.com/screens/03f4524c-58f4-43e8-8863-58b2cd9e6a97).

### 16. Duplicated casualty card
Under the board, "Your fallen / Enemy captured" repeats the rail chips and shows from `sm`
to `xl` alongside the toolbar's "Taken" panel. Show it only in the xl right column.

### 17. Handoff screen eyebrow
"PLAYER 2 HAS FINISHED" above the heading is a kicker; fold it into the body sentence.

---

## Verified but fine

- Legal-move dots, last-move tint and the clash flood read clearly on both sizes.
- Enemy plates clear 3:1 against both squares and render identically for every rank.
- Pass-and-play cover hides the board fully before handover.
- Keyboard: arrow navigation across the board works; one tab stop holds the grid.
