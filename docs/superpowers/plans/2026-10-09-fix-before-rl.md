# Fix Before RL — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the TypeScript engine deterministic, replayable, draw-complete and split into
true and public knowledge, then add a non-cheating heuristic ladder and a seeded benchmark.
These are the gates for all RL work.

**Architecture:** Rules stay in `src/lib/game.ts`, which gains injected `rng`/`now`,
structured move events, outcome kinds and automatic draws. Three new modules sit on top:
`replay.ts` (seeded PRNG, `playGame`, `replayGame`), `knowledge.ts` (`publicView` and the
belief helper) and `bots.ts` (the cheating ladder wrapped as a player, plus the fair ladder).
`scripts/bench.ts` plays seeded matchups and exports replay fixtures for the Python port.

**Tech Stack:** TypeScript (strict), Next.js 16 app untouched apart from one copy line and
one helper swap, Node 24 built-in test runner (`node:test`) through `tsx`.

**Spec:** `docs/bot-ai-roadmap.md` § "Fix Before RL" items 1–6, gating the Oct–Nov 2026 row
of `docs/superpowers/specs/2026-09-26-rl-training-workflow-design.md`.

## Global Constraints

- **Start condition:** do not execute any task until `feat/draw-offers` has merged to `main`.
  Then, in this worktree (`.claude/worktrees/rl-plan`), run `git rebase main` before Task 1.
  Never `git checkout` or `git switch` in the main checkout.
- `feat/draw-offers` adds `drawBy`, `offerDraw()` and `declineDraw()` to `game.ts`; agreed
  draws produce `winner: "draw"`. This plan keeps that code and only adds `kind: "agreed"`
  to its outcome (Task 3). Automatic draw rules (ply cap, repetition) belong to this plan.
- The "TTL cleanup for abandoned game_rooms" work owns `src/lib/rooms.ts` and
  `src/db/schema.ts`. This plan touches neither.
- Indent with tabs, match the existing style in each file.
- No new runtime dependencies. Exactly one new dev dependency: `tsx`.
- One engine for online rooms, the practice room and the simulator. Rules change in
  `game.ts` only.
- `ENGINE_VERSION = 1`. Bump it on any later rule change.
- `MAX_PLIES = 300`. Threefold repetition = the same live-piece positions with the same side
  to move, three times.
- New `RoomState` fields are optional: rooms already stored in D1 predate them.
- Do not change the `plies` display strings (`"G a3xb3"`). `board-view.tsx`,
  `game-room.tsx` and `scripts/check-room-sync.mjs` parse them.
- Fair bots decide from `PublicView` only. Anything reading `RoomState` ranks is labeled a
  cheating benchmark.
- Every commit message ends with the line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisions taken while planning

- **No "no legal move" outcome.** The roadmap asked for one, but a side can never be without
  a legal move. Its at most 21 pieces cannot fill a 72-square board, so some piece borders a
  square that is empty or enemy-held, and both are legal destinations. Task 4 records this
  in a comment instead of adding an unreachable rule. Task 10 corrects the docs that
  mention it.
- **Bot loadout persistence is already done** (`bf0ec2c` stores the live match in
  `sessionStorage`). Task 10 marks it in the roadmap; no code.
- **Test runner: `tsx` + `node:test`.** One dev dependency covers tests and the benchmark
  script, and `tsx` resolves the `@/*` path alias from `tsconfig.json`.
- **Repetition history is stored as numbers, restarted at every capture.** A capture changes
  the set of live pieces for good, so no earlier position can recur. Positions are hashed
  with cyrb53 (53 bits). The Python port can use exact tuples instead; it needs to detect
  the same repetitions, not produce the same hash.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/game.ts` (modify) | Rules: `Rng`, `makeMatchState`, `MoveEvent`, `OutcomeKind`, draw rules, `ENGINE_VERSION` |
| `src/lib/replay.ts` (create) | `mulberry32`, `Player`, `Replay`, `playGame`, `replayGame` |
| `src/lib/knowledge.ts` (create) | `PublicView`, `publicView`, `Belief`, `enemyBelief`, `pieceOdds` |
| `src/lib/bots.ts` (create) | `cheatingBot`, `chooseFairMove`, `fairBot` |
| `src/lib/testing.ts` (create) | Test helpers: `board`, `statesOf`, `shuffleRanks` |
| `src/lib/*.test.ts` (create) | One test file per module above |
| `scripts/bench.ts` (create) | Seeded benchmark and fixture export |
| `src/components/play/local-game-room.tsx` (modify) | Use `makeMatchState` instead of its private copy |
| `src/app/how-to-play/page.tsx` (modify) | One line on automatic draws |
| `package.json`, `.gitignore` (modify) | `tsx`, `test` and `bench` scripts, ignore fixtures |
| Docs (modify) | `CLAUDE.md`, roadmap, RL plan, spec |

---

### Task 1: Test runner

**Files:**
- Modify: `package.json`
- Create: `src/lib/game.test.ts`

**Interfaces:**
- Consumes: `battleLosers` from `src/lib/game.ts` (exists).
- Produces: `pnpm test` runs every `src/**/*.test.ts`; single file:
  `node --import tsx --test src/lib/game.test.ts`.

- [ ] **Step 1: Add the dev dependency**

Run: `pnpm add -D tsx`
Expected: `package.json` gains `"tsx"` under `devDependencies`; lockfile updated.

- [ ] **Step 2: Add the scripts**

In `package.json` `"scripts"`, after `"check:room-sync"`, add:

```json
		"test": "node --import tsx --test \"src/**/*.test.ts\"",
		"bench": "tsx scripts/bench.ts",
```

- [ ] **Step 3: Write characterization tests for the rule that everything else depends on**

Create `src/lib/game.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { battleLosers } from "@/lib/game";

test("battleLosers: higher rank wins, equal ranks both fall", () => {
	assert.deepEqual(battleLosers("G5", "PVT"), ["def"]);
	assert.deepEqual(battleLosers("CPT", "COL"), ["att"]);
	assert.deepEqual(battleLosers("MAJ", "MAJ"), ["att", "def"]);
});

test("battleLosers: Spy beats every officer, loses to a Private; equal Spies both fall", () => {
	assert.deepEqual(battleLosers("SPY", "G5"), ["def"]);
	assert.deepEqual(battleLosers("G5", "SPY"), ["att"]);
	assert.deepEqual(battleLosers("SPY", "PVT"), ["att"]);
	assert.deepEqual(battleLosers("PVT", "SPY"), ["def"]);
	assert.deepEqual(battleLosers("SPY", "SPY"), ["att", "def"]);
});

test("battleLosers: a Flag only beats the Flag it attacks; a defending Flag always falls", () => {
	assert.deepEqual(battleLosers("FLG", "FLG"), ["def"]);
	assert.deepEqual(battleLosers("FLG", "PVT"), ["att"]);
	assert.deepEqual(battleLosers("PVT", "FLG"), ["def"]);
});
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test`
Expected: PASS, 3 tests. They pin current behavior, so they pass on first run.

- [ ] **Step 5: Prove the runner fails on a broken rule**

Temporarily change `["def"]` to `["att"]` in the first assertion, run `pnpm test`.
Expected: FAIL naming `battleLosers: higher rank wins`. Revert the change and re-run: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/game.test.ts
git commit -m "test: add a node:test runner and pin the battle rules" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Seeded RNG and injected clock

**Files:**
- Modify: `src/lib/game.ts` (`makeRandomLoadout`, `makeWaitingState`, `addMessage`,
  `applyMove`, `chooseBotMove`, `sample`; add `Rng`, `makeMatchState`)
- Modify: `src/components/play/local-game-room.tsx`
- Create: `src/lib/replay.ts` (only `mulberry32` for now)
- Test: `src/lib/game.test.ts`

**Interfaces:**
- Produces:
  - `type Rng = () => number` (float in [0, 1)) — `game.ts`
  - `makeRandomLoadout(rng: Rng = Math.random): Record<number, string>`
  - `addMessage(state, who, text, now = Date.now()): RoomState`
  - `makeWaitingState(hostLoadout, hostSide = "gold", hostName?, now = Date.now())`
  - `applyMove(state, side, pieceId, col, row, now = Date.now()): RoomState`
  - `chooseBotMove(state, side, difficulty, rng: Rng = Math.random): LegalMove | null`
  - `makeMatchState(gold: unknown, slate: unknown, now = Date.now()): RoomState | null`
  - `mulberry32(seed: number): Rng` — `replay.ts`

- [ ] **Step 1: Write the failing tests**

Replace the import block of `src/lib/game.test.ts` with:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { battleLosers, chooseBotMove, makeMatchState, makeRandomLoadout, parseLoadout } from "@/lib/game";
import { mulberry32 } from "@/lib/replay";
```

Append:

```ts
test("mulberry32: same seed, same stream, values in [0, 1)", () => {
	const values = Array.from({ length: 1000 }, mulberry32(42));
	assert.deepEqual(values, Array.from({ length: 1000 }, mulberry32(42)));
	assert.ok(values.every((value) => value >= 0 && value < 1));
	assert.notDeepEqual(values.slice(0, 5), Array.from({ length: 5 }, mulberry32(43)));
});

test("makeRandomLoadout deals a legal army and repeats from a seed", () => {
	const loadout = makeRandomLoadout(mulberry32(7));
	assert.deepEqual(loadout, makeRandomLoadout(mulberry32(7)));
	assert.ok(parseLoadout(loadout));
});

test("makeMatchState builds a full board stamped with the injected clock", () => {
	const state = makeMatchState(makeRandomLoadout(mulberry32(1)), makeRandomLoadout(mulberry32(2)), 0);
	assert.ok(state);
	assert.equal(state.pieces.length, 42);
	assert.equal(state.turn, "gold");
	assert.equal(state.messages[0].at, 0);
});

test("chooseBotMove repeats from a seed at every level", () => {
	const state = makeMatchState(makeRandomLoadout(mulberry32(1)), makeRandomLoadout(mulberry32(2)), 0);
	assert.ok(state);
	for (const level of ["Private", "Sergeant", "Captain", "Colonel", "General"]) {
		assert.deepEqual(chooseBotMove(state, "gold", level, mulberry32(9)), chooseBotMove(state, "gold", level, mulberry32(9)));
	}
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test src/lib/game.test.ts`
Expected: FAIL — `@/lib/replay` cannot be found, and `makeMatchState` is not exported.

- [ ] **Step 3: Create `src/lib/replay.ts`**

```ts
import type { Rng } from "@/lib/game";

/**
 * mulberry32: a small seeded generator. The Python port implements the same function, so a
 * seeded game produces identical moves in both languages.
 */
export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
```

- [ ] **Step 4: Inject `rng` and `now` in `src/lib/game.ts`**

After the `Outcome` type, add:

```ts
/** Any function returning a float in [0, 1). `Math.random` in the app; `mulberry32(seed)` in tests and the benchmark. */
export type Rng = () => number;
```

Replace `makeRandomLoadout` with:

```ts
export function makeRandomLoadout(rng: Rng = Math.random): Record<number, string> {
	const cells = Array.from({ length: 27 }, (_, index) => index);
	const pieces = army.map((rank, index) => `${rank}-${index}`);
	for (let i = cells.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[cells[i], cells[j]] = [cells[j], cells[i]];
	}
	for (let i = pieces.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[pieces[i], pieces[j]] = [pieces[j], pieces[i]];
	}
	return Object.fromEntries(pieces.map((piece, index) => [cells[index], piece]));
}
```

In `makeWaitingState`, change the signature to
`export function makeWaitingState(hostLoadout: unknown, hostSide: PlayerSide = "gold", hostName?: string, now = Date.now()): RoomState | null {`
and its message's `at: Date.now()` to `at: now`.

Replace `addMessage` with:

```ts
export function addMessage(state: RoomState, who: RoomMessage["who"], text: string, now = Date.now()): RoomState {
	return {
		...state,
		messages: [...state.messages.slice(-80), { id: state.nextMessageId, who, text: text.slice(0, 200), at: now }],
		nextMessageId: state.nextMessageId + 1,
	};
}
```

After `addGuest`, add (this is the body of `makeState` from `local-game-room.tsx`, moved so
the simulator and the practice room share it):

```ts
/** A match with both armies deployed and Gold to move: the practice room and the simulator. */
export function makeMatchState(gold: unknown, slate: unknown, now = Date.now()): RoomState | null {
	const goldPieces = makeSidePieces("gold", gold);
	const slatePieces = makeSidePieces("slate", slate);
	if (!goldPieces || !slatePieces) return null;
	return {
		pieces: [...goldPieces, ...slatePieces],
		turn: "gold",
		plies: [],
		messages: [{ id: 1, who: "sys", text: "Both armies are deployed. Gold moves first.", at: now }],
		nextMessageId: 2,
		outcome: null,
	};
}
```

In `applyMove`, change the signature to
`export function applyMove(state: RoomState, side: PlayerSide, pieceId: number, col: number, row: number, now = Date.now()): RoomState {`
and its last line to
`return outcome ? addMessage({ ...next, outcome }, "sys", outcome.note, now) : next;`

Replace `chooseBotMove`'s signature and first lines with:

```ts
/**
 * The practice-room ladder. It reads true enemy ranks (`move.target.rank`), so outside the
 * product it is a cheating benchmark, never a baseline. The fair ladder is `chooseFairMove`.
 */
export function chooseBotMove(state: RoomState, side: PlayerSide, difficulty: string, rng: Rng = Math.random): LegalMove | null {
	const moves = legalMoves(state, side);
	if (!moves.length) return null;
	if (difficulty === "Private" || difficulty === "Spy") return sample(moves, rng);
```

Inside it, change `let score = Math.random();` to `let score = rng();`, and the last line to
`return difficulty === "Sergeant" ? sample(scored.slice(0, Math.min(6, scored.length)), rng).move : scored[0].move;`

Replace `sample` with:

```ts
function sample<T>(items: T[], rng: Rng) {
	return items[Math.floor(rng() * items.length)];
}
```

- [ ] **Step 5: Point the practice room at the shared helper**

In `src/components/play/local-game-room.tsx`:
- Delete the whole `function makeState(gold: unknown, slate: unknown): RoomState | null { … }`.
- In the `@/lib/game` import block, remove `makeSidePieces,` and add `makeMatchState,`.
- In `startFresh`, change `setState(makeState(saved.gold, mode === "bot" ? makeRandomLoadout() : saved.slate));`
  to `setState(makeMatchState(saved.gold, mode === "bot" ? makeRandomLoadout() : saved.slate));`

- [ ] **Step 6: Run tests and the type checker**

Run: `pnpm test`
Expected: PASS, 7 tests.
Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game.ts src/lib/replay.ts src/lib/game.test.ts src/components/play/local-game-room.tsx
git commit -m "feat(engine): inject rng and clock so a match can be replayed from a seed" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Structured move events and outcome kinds

**Files:**
- Modify: `src/lib/game.ts`
- Create: `src/lib/testing.ts`
- Test: `src/lib/game.test.ts`

**Interfaces:**
- Consumes: `applyMove(…, now)` from Task 2.
- Produces:
  - `const ENGINE_VERSION = 1`
  - `type OutcomeKind = "flag-captured" | "flag-reached" | "repetition" | "ply-cap" | "resigned" | "agreed"`
  - `type Outcome = { winner: PlayerSide | "draw"; kind: OutcomeKind; note: string }`
  - `type MoveEvent = { side: PlayerSide; attackerId: number; from: { col: number; row: number }; to: { col: number; row: number }; defenderId?: number; loserIds: number[] }`
  - `RoomState.moves?: MoveEvent[]`
  - `board(pieces: [number, PlayerSide, RankKey, number, number][], turn?: PlayerSide): RoomState` — `testing.ts`

- [ ] **Step 1: Create the test helper `src/lib/testing.ts`**

```ts
import type { PlayerSide, RankKey, RoomState } from "@/lib/game";

/** A live match from `[id, owner, rank, col, row]` tuples, for rule tests. Not a full army. */
export function board(pieces: [number, PlayerSide, RankKey, number, number][], turn: PlayerSide = "gold"): RoomState {
	return {
		pieces: pieces.map(([id, owner, rank, col, row]) => ({ id, owner, rank, col, row, alive: true })),
		turn,
		plies: [],
		messages: [],
		nextMessageId: 1,
		outcome: null,
	};
}
```

- [ ] **Step 2: Write the failing tests**

Replace the import block of `src/lib/game.test.ts` with:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMove, battleLosers, chooseBotMove, makeMatchState, makeRandomLoadout, offerDraw, parseLoadout, resign } from "@/lib/game";
import { mulberry32 } from "@/lib/replay";
import { board } from "@/lib/testing";
```

Append:

```ts
test("applyMove records a quiet move as the arbiter saw it", () => {
	const state = board([[0, "gold", "PVT", 4, 5], [1, "gold", "FLG", 0, 7], [21, "slate", "FLG", 8, 0]]);
	const next = applyMove(state, "gold", 0, 4, 4, 0);
	assert.deepEqual(next.moves, [{ side: "gold", attackerId: 0, from: { col: 4, row: 5 }, to: { col: 4, row: 4 }, loserIds: [] }]);
});

test("applyMove records who fell in a clash, never a rank", () => {
	const state = board([[0, "gold", "MAJ", 4, 5], [1, "gold", "FLG", 0, 7], [21, "slate", "CPT", 4, 4], [22, "slate", "FLG", 8, 0]]);
	const next = applyMove(state, "gold", 0, 4, 4, 0);
	assert.deepEqual(next.moves?.at(-1), { side: "gold", attackerId: 0, from: { col: 4, row: 5 }, to: { col: 4, row: 4 }, defenderId: 21, loserIds: [21] });
});

test("every outcome says how the match ended", () => {
	const flagHunt = board([[0, "gold", "PVT", 8, 1], [1, "gold", "FLG", 0, 7], [21, "slate", "FLG", 8, 0]]);
	assert.deepEqual(applyMove(flagHunt, "gold", 0, 8, 0, 0).outcome, { winner: "gold", kind: "flag-captured", note: "Slate flag has fallen." });

	const flagRun = board([[1, "gold", "FLG", 3, 1], [21, "slate", "FLG", 8, 0]]);
	assert.equal(applyMove(flagRun, "gold", 1, 3, 0, 0).outcome?.kind, "flag-reached");
	assert.equal(resign(flagRun, "gold").outcome?.kind, "resigned");
	assert.equal(offerDraw(offerDraw(flagRun, "gold"), "slate").outcome?.kind, "agreed");
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `node --import tsx --test src/lib/game.test.ts`
Expected: FAIL — `next.moves` is `undefined`, and outcomes have no `kind`.

- [ ] **Step 4: Add the types to `src/lib/game.ts`**

After `GUEST_LOADOUT_KEY`, add:

```ts
/** Bump on any rule change. Replays and the Python port refuse a mismatched version. */
export const ENGINE_VERSION = 1;
```

Replace the `Outcome` type with:

```ts
export type OutcomeKind = "flag-captured" | "flag-reached" | "repetition" | "ply-cap" | "resigned" | "agreed";
export type Outcome = { winner: PlayerSide | "draw"; kind: OutcomeKind; note: string };
```

After the `GamePiece` type, add:

```ts
/**
 * One ply as the arbiter saw it: which piece moved where, and which pieces fell. Public
 * information — it never carries a rank. Replays, the clash log and the belief helper all
 * read this one shape.
 */
export type MoveEvent = {
	side: PlayerSide;
	attackerId: number;
	from: { col: number; row: number };
	to: { col: number; row: number };
	defenderId?: number;
	loserIds: number[];
};
```

In `RoomState`, after `plies: string[];`, add:

```ts
	/** Structured twin of `plies`. Optional: rooms stored before it existed lack it. */
	moves?: MoveEvent[];
```

- [ ] **Step 5: Record the event in `applyMove`**

Replace the `const next: RoomState = { … };` block in `applyMove` with (the `drawBy` line
comes from `feat/draw-offers` and stays):

```ts
	const event: MoveEvent = {
		side,
		attackerId: attacker.id,
		from: { col: attacker.col, row: attacker.row },
		to: { col, row },
		...(target ? { defenderId: target.id } : {}),
		loserIds: [...dead],
	};

	const next: RoomState = {
		...state,
		// Play continued, so any open draw offer is stale.
		drawBy: null,
		pieces,
		turn: side === "gold" ? "slate" : "gold",
		plies: [...state.plies, `${side === "gold" ? "G" : "S"} ${square(attacker.col, attacker.row)}${target ? "x" : "-"}${square(col, row)}`],
		moves: [...(state.moves ?? []), event],
	};
```

- [ ] **Step 6: Give every outcome a kind**

In `getOutcome`, replace the four `return` lines with:

```ts
	if (goldFlag && !goldFlag.alive) return { winner: "slate", kind: "flag-captured", note: "Gold flag has fallen." };
	if (slateFlag && !slateFlag.alive) return { winner: "gold", kind: "flag-captured", note: "Slate flag has fallen." };
	if (goldFlag?.alive && goldFlag.row === 0) return { winner: "gold", kind: "flag-reached", note: "Gold flag reached the enemy line." };
	if (slateFlag?.alive && slateFlag.row === ROWS - 1) return { winner: "slate", kind: "flag-reached", note: "Slate flag reached the enemy line." };
```

In `resign`, change the outcome to
`{ winner, kind: "resigned", note: `${label(side)} surrendered.` }`.

In `offerDraw`, change the outcome to
`const outcome: Outcome = { winner: "draw", kind: "agreed", note: "Both commanders agreed to a draw." };`

- [ ] **Step 7: Run tests and the type checker**

Run: `pnpm test`
Expected: PASS, 10 tests.
Run: `pnpm exec tsc --noEmit`
Expected: no errors. If any other file builds an `Outcome` literal, it now fails here: add
the matching `kind`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game.ts src/lib/testing.ts src/lib/game.test.ts
git commit -m "feat(engine): record structured move events and how each match ended" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Automatic draws

**Files:**
- Modify: `src/lib/game.ts`
- Test: `src/lib/game.test.ts`

**Interfaces:**
- Consumes: `MoveEvent`, `OutcomeKind` from Task 3.
- Produces:
  - `const MAX_PLIES = 300`
  - `RoomState.positions?: number[]` — position keys since the last capture, current last
  - `getOutcome(state: RoomState): Outcome | null` (private; now reads the full state)

- [ ] **Step 1: Write the failing tests**

Change the `@/lib/game` import in `src/lib/game.test.ts` to:

```ts
import { MAX_PLIES, applyMove, battleLosers, chooseBotMove, makeMatchState, makeRandomLoadout, offerDraw, parseLoadout, resign, type PlayerSide } from "@/lib/game";
```

Append:

```ts
test("threefold repetition draws on the third occurrence, not before", () => {
	let state = board([[0, "gold", "PVT", 4, 5], [1, "gold", "FLG", 0, 7], [21, "slate", "PVT", 4, 1], [22, "slate", "FLG", 8, 0]]);
	const cycle: [PlayerSide, number, number, number][] = [
		["gold", 0, 4, 4],
		["slate", 21, 4, 2],
		["gold", 0, 4, 5],
		["slate", 21, 4, 1],
	];
	for (let ply = 0; ply < 8; ply++) {
		assert.equal(state.outcome, null, `ended early at ply ${ply}`);
		const [side, id, col, row] = cycle[ply % 4];
		state = applyMove(state, side, id, col, row, 0);
	}
	assert.deepEqual(state.outcome, { winner: "draw", kind: "repetition", note: "Draw: the same position came up three times." });
});

test("the ply cap draws, but a flag result on that same ply still wins", () => {
	const longGame = Array.from({ length: MAX_PLIES - 1 }, () => "G a1-a2");
	const quiet = { ...board([[0, "gold", "PVT", 4, 5], [1, "gold", "FLG", 0, 7], [22, "slate", "FLG", 8, 0]]), plies: longGame };
	assert.equal(applyMove(quiet, "gold", 0, 4, 4, 0).outcome?.kind, "ply-cap");

	const decisive = { ...board([[0, "gold", "PVT", 8, 1], [1, "gold", "FLG", 0, 7], [22, "slate", "FLG", 8, 0]]), plies: longGame };
	assert.equal(applyMove(decisive, "gold", 0, 8, 0, 0).outcome?.kind, "flag-captured");
});

test("a capture restarts the repetition history", () => {
	const state = board([[0, "gold", "MAJ", 4, 5], [1, "gold", "FLG", 0, 7], [21, "slate", "CPT", 4, 4], [22, "slate", "FLG", 8, 0]]);
	assert.equal(applyMove(state, "gold", 0, 4, 4, 0).positions?.length, 1);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test src/lib/game.test.ts`
Expected: FAIL — `MAX_PLIES` is not exported; the repetition loop reaches ply 8 with
`outcome` still `null`.

- [ ] **Step 3: Add the constant, the field and the position key**

After `ENGINE_VERSION`, add:

```ts
/** A match with no result after this many plies is drawn. */
export const MAX_PLIES = 300;
```

In `RoomState`, after `moves?: MoveEvent[];`, add:

```ts
	/**
	 * Position keys since the last capture, current position last. A capture changes the set
	 * of live pieces for good, so nothing before one can recur. Optional for old rooms.
	 */
	positions?: number[];
```

Before `function getOutcome`, add:

```ts
/**
 * Identifies a position for the repetition rule: side to move plus where each live piece
 * stands. Ranks are left out — a piece's rank is fixed for the match, so its id pins it.
 */
function positionKey(state: Pick<RoomState, "pieces" | "turn">): number {
	let text: string = state.turn;
	for (const piece of state.pieces) if (piece.alive) text += `|${piece.id}:${piece.col},${piece.row}`;
	return cyrb53(text);
}

// cyrb53 (bryc, public domain): a fast 53-bit string hash, so the history is one number per ply.
function cyrb53(text: string) {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < text.length; i++) {
		const ch = text.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
```

- [ ] **Step 4: Track positions and judge the full state in `applyMove`**

Replace the `const next: RoomState = { … };` block and the two lines after it with:

```ts
	const turn: PlayerSide = side === "gold" ? "slate" : "gold";
	const next: RoomState = {
		...state,
		// Play continued, so any open draw offer is stale.
		drawBy: null,
		pieces,
		turn,
		plies: [...state.plies, `${side === "gold" ? "G" : "S"} ${square(attacker.col, attacker.row)}${target ? "x" : "-"}${square(col, row)}`],
		moves: [...(state.moves ?? []), event],
		// The first move of a match (or of an old room) records the position it left, too.
		positions: [...(dead.size ? [] : (state.positions ?? [positionKey(state)])), positionKey({ pieces, turn })],
	};

	const outcome = getOutcome(next);
	return outcome ? addMessage({ ...next, outcome }, "sys", outcome.note, now) : next;
```

- [ ] **Step 5: Replace `getOutcome`**

```ts
/**
 * Decisive results first, then draws. There is no "no legal move" result: a side's pieces
 * cannot fill the board, so one of them always borders a square that is empty or held by
 * the enemy, and both are legal destinations.
 */
function getOutcome(state: RoomState): Outcome | null {
	const goldFlag = state.pieces.find((piece) => piece.owner === "gold" && piece.rank === "FLG");
	const slateFlag = state.pieces.find((piece) => piece.owner === "slate" && piece.rank === "FLG");
	if (goldFlag && !goldFlag.alive) return { winner: "slate", kind: "flag-captured", note: "Gold flag has fallen." };
	if (slateFlag && !slateFlag.alive) return { winner: "gold", kind: "flag-captured", note: "Slate flag has fallen." };
	if (goldFlag?.alive && goldFlag.row === 0) return { winner: "gold", kind: "flag-reached", note: "Gold flag reached the enemy line." };
	if (slateFlag?.alive && slateFlag.row === ROWS - 1) return { winner: "slate", kind: "flag-reached", note: "Slate flag reached the enemy line." };

	const seen = state.positions ?? [];
	const current = seen.at(-1);
	if (current !== undefined && seen.filter((key) => key === current).length >= 3) {
		return { winner: "draw", kind: "repetition", note: "Draw: the same position came up three times." };
	}
	if (state.plies.length >= MAX_PLIES) return { winner: "draw", kind: "ply-cap", note: `Draw: ${MAX_PLIES} plies without a result.` };
	return null;
}
```

- [ ] **Step 6: Run tests and the type checker**

Run: `pnpm test`
Expected: PASS, 13 tests.
Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Check the online room still works**

With `pnpm dev` running (and the local D1 migrated, per `CLAUDE.md`), run:
`pnpm check:room-sync`. It targets `http://localhost:3000` unless `GOGO_E2E_BASE_URL` is set.
Expected: passes; it asserts the `plies` string format, which is unchanged. If the dev stack
cannot run here, say so in the commit body instead of skipping silently.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game.ts src/lib/game.test.ts
git commit -m "feat(engine): draw on threefold repetition and after 300 plies" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Replays

**Files:**
- Modify: `src/lib/replay.ts`
- Create: `src/lib/bots.ts`
- Modify: `src/lib/testing.ts` (add `statesOf`)
- Test: `src/lib/replay.test.ts`

**Interfaces:**
- Consumes: `mulberry32` (Task 2), `makeMatchState`, `applyMove`, `MoveEvent`, `Outcome`,
  `ENGINE_VERSION`, `MAX_PLIES` (Tasks 2–4), `chooseBotMove`.
- Produces:
  - `type Player = { name: string; choose(state: RoomState, side: PlayerSide, rng: Rng): { pieceId: number; col: number; row: number } | null }`
  - `type Replay = { engine: number; seed: number; players: Record<PlayerSide, string>; deployments: Record<PlayerSide, Record<number, string>>; moves: MoveEvent[]; outcome: Outcome; plies: number }`
  - `playGame(seed: number, gold: Player, slate: Player): { replay: Replay; state: RoomState }`
  - `replayGame(replay: Replay): RoomState`
  - `cheatingBot(level: string): Player` — `bots.ts`
  - `statesOf(replay: Replay): RoomState[]` — `testing.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/replay.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_PLIES } from "@/lib/game";
import { cheatingBot } from "@/lib/bots";
import { playGame, replayGame } from "@/lib/replay";

test("a seeded match is identical every time", () => {
	const first = playGame(5, cheatingBot("General"), cheatingBot("Sergeant"));
	const second = playGame(5, cheatingBot("General"), cheatingBot("Sergeant"));
	assert.deepEqual(first.replay, second.replay);
});

test("replaying rebuilds the final board, even after a JSON round trip", () => {
	const { replay, state } = playGame(11, cheatingBot("Colonel"), cheatingBot("Private"));
	const rebuilt = replayGame(JSON.parse(JSON.stringify(replay)));
	assert.deepEqual(rebuilt.pieces, state.pieces);
	assert.deepEqual(rebuilt.outcome, state.outcome);
	assert.deepEqual(rebuilt.plies, state.plies);
	assert.equal(rebuilt.turn, state.turn);
});

test("every match ends, within the ply cap", () => {
	for (let seed = 1; seed <= 20; seed++) {
		const { replay } = playGame(seed, cheatingBot("Private"), cheatingBot("Private"));
		assert.ok(replay.outcome);
		assert.ok(replay.plies <= MAX_PLIES);
	}
});

test("a replay from another engine version is refused", () => {
	const { replay } = playGame(3, cheatingBot("Private"), cheatingBot("Private"));
	assert.throws(() => replayGame({ ...replay, engine: replay.engine + 1 }), /engine/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test src/lib/replay.test.ts`
Expected: FAIL — `@/lib/bots` cannot be found; `playGame` is not exported.

- [ ] **Step 3: Complete `src/lib/replay.ts`**

Replace the file with:

```ts
import { ENGINE_VERSION, applyMove, makeMatchState, makeRandomLoadout, type MoveEvent, type Outcome, type PlayerSide, type Rng, type RoomState } from "@/lib/game";

/**
 * mulberry32: a small seeded generator. The Python port implements the same function, so a
 * seeded game produces identical moves in both languages.
 */
export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Chooses moves. `state` is the full truth: a fair player must project it with `publicView` first. */
export type Player = {
	name: string;
	choose(state: RoomState, side: PlayerSide, rng: Rng): { pieceId: number; col: number; row: number } | null;
};

/**
 * Everything needed to replay a match exactly. This is the fixture format the Python port reads.
 *
 * Cross-language contract:
 * - Piece ids come from `makeSidePieces`: gold 0–20, slate 21–41, each side numbered in
 *   ascending zone order of its deployment (JS orders integer object keys numerically).
 * - One `mulberry32(seed)` stream is consumed in this order: gold's deployment, slate's
 *   deployment (both `makeRandomLoadout`), then each `choose` call in turn.
 */
export type Replay = {
	engine: number;
	seed: number;
	players: Record<PlayerSide, string>;
	deployments: Record<PlayerSide, Record<number, string>>;
	moves: MoveEvent[];
	outcome: Outcome;
	plies: number;
};

export function playGame(seed: number, gold: Player, slate: Player): { replay: Replay; state: RoomState } {
	const rng = mulberry32(seed);
	const deployments = { gold: makeRandomLoadout(rng), slate: makeRandomLoadout(rng) };
	let state = makeMatchState(deployments.gold, deployments.slate, 0);
	if (!state) throw new Error("makeRandomLoadout dealt an invalid army.");

	const players = { gold, slate };
	while (!state.outcome) {
		const player = players[state.turn];
		const move = player.choose(state, state.turn, rng);
		if (!move) throw new Error(`${player.name} returned no move.`);
		state = applyMove(state, state.turn, move.pieceId, move.col, move.row, 0);
	}

	const replay: Replay = {
		engine: ENGINE_VERSION,
		seed,
		players: { gold: gold.name, slate: slate.name },
		deployments,
		moves: state.moves ?? [],
		outcome: state.outcome,
		plies: state.plies.length,
	};
	return { replay, state };
}

/** Rebuilds a match from its replay. Throws if the replay does not hold together. */
export function replayGame(replay: Replay): RoomState {
	if (replay.engine !== ENGINE_VERSION) throw new Error(`Replay is for engine ${replay.engine}; this is engine ${ENGINE_VERSION}.`);
	let state = makeMatchState(replay.deployments.gold, replay.deployments.slate, 0);
	if (!state) throw new Error("Replay deployments are invalid.");
	for (const move of replay.moves) state = applyMove(state, move.side, move.attackerId, move.to.col, move.to.row, 0);
	return state;
}
```

- [ ] **Step 4: Create `src/lib/bots.ts`**

```ts
import { chooseBotMove } from "@/lib/game";
import type { Player } from "@/lib/replay";

/** The practice-room ladder as a player. It reads true enemy ranks: a cheating benchmark only. */
export function cheatingBot(level: string): Player {
	return { name: `${level} (cheating)`, choose: (state, side, rng) => chooseBotMove(state, side, level, rng) };
}
```

- [ ] **Step 5: Add `statesOf` to `src/lib/testing.ts`**

Change its import line to:

```ts
import { applyMove, makeMatchState, type PlayerSide, type RankKey, type RoomState } from "@/lib/game";
import type { Replay } from "@/lib/replay";
```

Append:

```ts
/** Every state a replayed match passed through, the deployment included. */
export function statesOf(replay: Replay): RoomState[] {
	let state = makeMatchState(replay.deployments.gold, replay.deployments.slate, 0);
	if (!state) throw new Error("Replay deployments are invalid.");
	const states = [state];
	for (const move of replay.moves) {
		state = applyMove(state, move.side, move.attackerId, move.to.col, move.to.row, 0);
		states.push(state);
	}
	return states;
}
```

- [ ] **Step 6: Run tests and the type checker**

Run: `pnpm test`
Expected: PASS, 17 tests.
Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/replay.ts src/lib/bots.ts src/lib/testing.ts src/lib/replay.test.ts
git commit -m "feat(engine): seeded self-play with replays that rebuild the final board" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Public view (knowledge split)

**Files:**
- Create: `src/lib/knowledge.ts`
- Modify: `src/lib/testing.ts` (add `shuffleRanks`)
- Test: `src/lib/knowledge.test.ts`

**Interfaces:**
- Consumes: `legalMoves`, `MoveEvent`, `Outcome`, `PublicPiece`, `RoomState` (game.ts);
  `playGame`, `mulberry32` (replay.ts); `cheatingBot` (bots.ts); `statesOf`.
- Produces:
  - `type PublicMove = { pieceId: number; col: number; row: number; targetId?: number }`
  - `type PublicView = { side: PlayerSide; turn: PlayerSide; pieces: PublicPiece[]; moves: MoveEvent[]; legal: PublicMove[]; plies: number; outcome: Outcome | null }`
  - `publicView(state: RoomState, side: PlayerSide): PublicView`
  - `shuffleRanks(state: RoomState, side: PlayerSide, rng: Rng): RoomState` — `testing.ts`

- [ ] **Step 1: Add `shuffleRanks` to `src/lib/testing.ts`**

Change the `@/lib/game` import to include `type Rng`:

```ts
import { applyMove, makeMatchState, type PlayerSide, type RankKey, type Rng, type RoomState } from "@/lib/game";
```

Append:

```ts
/** The same match with one side's ranks dealt to different pieces. A fair view of it must not change. */
export function shuffleRanks(state: RoomState, side: PlayerSide, rng: Rng): RoomState {
	const own = state.pieces.filter((piece) => piece.owner === side);
	const dealt = own.map((piece) => piece.rank);
	for (let i = dealt.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[dealt[i], dealt[j]] = [dealt[j], dealt[i]];
	}
	const rankOf = new Map(own.map((piece, index) => [piece.id, dealt[index]]));
	return { ...state, pieces: state.pieces.map((piece) => ({ ...piece, rank: rankOf.get(piece.id) ?? piece.rank })) };
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/knowledge.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { cheatingBot } from "@/lib/bots";
import { publicView } from "@/lib/knowledge";
import { mulberry32, playGame } from "@/lib/replay";
import { shuffleRanks, statesOf } from "@/lib/testing";

test("publicView hides every enemy rank and every legal-move target", () => {
	const { replay } = playGame(4, cheatingBot("General"), cheatingBot("Captain"));
	for (const state of statesOf(replay).filter((s) => !s.outcome)) {
		for (const side of ["gold", "slate"] as const) {
			const view = publicView(state, side);
			assert.ok(view.pieces.filter((piece) => piece.side === "foe").every((piece) => piece.rank === undefined));
			assert.ok(view.legal.every((move) => !("target" in move)));
			if (state.turn !== side) assert.equal(view.legal.length, 0);
		}
	}
});

test("publicView cannot tell the enemy's ranks apart", () => {
	const { replay } = playGame(8, cheatingBot("General"), cheatingBot("General"));
	const rng = mulberry32(1);
	for (const state of statesOf(replay).filter((s) => !s.outcome)) {
		assert.deepEqual(publicView(shuffleRanks(state, "slate", rng), "gold"), publicView(state, "gold"));
	}
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `node --import tsx --test src/lib/knowledge.test.ts`
Expected: FAIL — `@/lib/knowledge` cannot be found.

- [ ] **Step 4: Create `src/lib/knowledge.ts`**

```ts
import { legalMoves, type MoveEvent, type Outcome, type PlayerSide, type PublicPiece, type RoomState } from "@/lib/game";

/** A legal move without its target's rank. `LegalMove.target` is a full `GamePiece` and would leak it. */
export type PublicMove = { pieceId: number; col: number; row: number; targetId?: number };

/**
 * What one side can know: its own ranks, where every enemy piece stands, and the arbiter's
 * log of who fell where. Fair bots and models decide from this alone, never from `RoomState`.
 * Unlike `toPublicRoom`, it never reveals ranks, even after the match ends.
 */
export type PublicView = {
	side: PlayerSide;
	turn: PlayerSide;
	pieces: PublicPiece[];
	moves: MoveEvent[];
	legal: PublicMove[];
	plies: number;
	outcome: Outcome | null;
};

export function publicView(state: RoomState, side: PlayerSide): PublicView {
	return {
		side,
		turn: state.turn,
		pieces: state.pieces.map(({ rank, owner, ...piece }) => ({ ...piece, side: owner === side ? "you" : "foe", rank: owner === side ? rank : undefined })),
		moves: state.moves ?? [],
		legal:
			state.turn === side
				? legalMoves(state, side).map(({ pieceId, col, row, target }) => ({ pieceId, col, row, ...(target ? { targetId: target.id } : {}) }))
				: [],
		plies: state.plies.length,
		outcome: state.outcome,
	};
}
```

- [ ] **Step 5: Run tests and the type checker**

Run: `pnpm test`
Expected: PASS, 19 tests.
Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/knowledge.ts src/lib/knowledge.test.ts src/lib/testing.ts
git commit -m "feat(engine): a public view that carries no enemy rank, by construction" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Belief helper v1

**Files:**
- Modify: `src/lib/knowledge.ts`
- Test: `src/lib/knowledge.test.ts`

**Interfaces:**
- Consumes: `PublicView` (Task 6), `battleLosers`, `ranks`, `RankKey`.
- Produces:
  - `type Belief = { candidates: Map<number, RankKey[]>; pool: Record<RankKey, number> }`
  - `enemyBelief(view: PublicView): Belief`
  - `pieceOdds(belief: Belief, enemyId: number): [RankKey, number][]` — probabilities sum to 1

- [ ] **Step 1: Write the failing tests**

Change the imports of `src/lib/knowledge.test.ts` to:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMove, type PlayerSide, type RankKey } from "@/lib/game";
import { cheatingBot } from "@/lib/bots";
import { enemyBelief, pieceOdds, publicView } from "@/lib/knowledge";
import { mulberry32, playGame } from "@/lib/replay";
import { board, shuffleRanks, statesOf } from "@/lib/testing";
```

Append:

```ts
const FLAGS: [number, PlayerSide, RankKey, number, number][] = [
	[1, "gold", "FLG", 0, 7],
	[22, "slate", "FLG", 8, 0],
];

/** Slate's piece 21 attacks gold's Major; returns what gold can know afterwards. */
function afterAttackOnMyMajor(attacker: RankKey) {
	const state = board([[0, "gold", "MAJ", 4, 4], [21, "slate", attacker, 4, 3], ...FLAGS], "slate");
	return publicView(applyMove(state, "slate", 21, 4, 4, 0), "gold");
}

test("a piece that survived attacking my Major is a Lt. Colonel or above, or a Spy", () => {
	assert.deepEqual(enemyBelief(afterAttackOnMyMajor("COL")).candidates.get(21), ["G5", "G4", "G3", "G2", "G1", "COL", "LTC", "SPY"]);
});

test("a piece that fell attacking my Major is a Captain or below: never a Spy, never the Flag", () => {
	assert.deepEqual(enemyBelief(afterAttackOnMyMajor("SGT")).candidates.get(21), ["CPT", "LT1", "LT2", "SGT", "PVT"]);
});

test("a mutual kill pins the rank and takes it out of the live pool", () => {
	const belief = enemyBelief(afterAttackOnMyMajor("MAJ"));
	assert.deepEqual(belief.candidates.get(21), ["MAJ"]);
	assert.equal(belief.pool.MAJ, 0);
});

test("pieceOdds sums to 1 over the piece's candidates", () => {
	const view = afterAttackOnMyMajor("COL");
	const odds = pieceOdds(enemyBelief(view), 21);
	assert.deepEqual(odds.map(([rank]) => rank), ["G5", "G4", "G3", "G2", "G1", "COL", "LTC", "SPY"]);
	assert.ok(Math.abs(odds.reduce((sum, [, p]) => sum + p, 0) - 1) < 1e-9);
});

test("belief never rules out the truth, and the pool adds up to the live enemy count", () => {
	for (const seed of [2, 6, 10]) {
		const { replay } = playGame(seed, cheatingBot("General"), cheatingBot("Colonel"));
		for (const state of statesOf(replay).filter((s) => !s.outcome)) {
			for (const side of ["gold", "slate"] as const) {
				const belief = enemyBelief(publicView(state, side));
				const foes = state.pieces.filter((piece) => piece.owner !== side);
				for (const foe of foes) assert.ok(belief.candidates.get(foe.id)?.includes(foe.rank), `seed ${seed}: piece ${foe.id} is ${foe.rank}`);
				const pool = Object.values(belief.pool);
				assert.ok(pool.every((count) => count >= 0));
				assert.ok(Math.abs(pool.reduce((sum, count) => sum + count, 0) - foes.filter((piece) => piece.alive).length) < 1e-9);
			}
		}
	}
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test src/lib/knowledge.test.ts`
Expected: FAIL — `enemyBelief` is not exported.

- [ ] **Step 3: Add the belief helper to `src/lib/knowledge.ts`**

Change the import line to:

```ts
import { battleLosers, legalMoves, ranks, type MoveEvent, type Outcome, type PlayerSide, type PublicPiece, type RankKey, type RoomState } from "@/lib/game";
```

Append:

```ts
const RANK_KEYS = ranks.map((rank) => rank.key);

/**
 * Roadmap belief v1. `candidates`: the ranks each enemy piece can still be, in `ranks` order,
 * given every clash it fought. `pool`: the expected count of each rank among live enemy
 * pieces, summing to the live enemy count. Dead pieces do not reveal ranks, so they leave the
 * pool exactly where the arbiter pinned them and in expectation everywhere else.
 */
export type Belief = {
	candidates: Map<number, RankKey[]>;
	pool: Record<RankKey, number>;
};

export function enemyBelief(view: PublicView): Belief {
	const ownRank = new Map(view.pieces.filter((piece) => piece.side === "you").map((piece) => [piece.id, piece.rank as RankKey]));
	const enemies = view.pieces.filter((piece) => piece.side === "foe");
	const candidates = new Map(enemies.map((piece) => [piece.id, [...RANK_KEYS]]));

	for (const move of view.moves) {
		if (move.defenderId === undefined) continue;
		const mine = move.side === view.side;
		const own = ownRank.get(mine ? move.attackerId : move.defenderId);
		const enemyId = mine ? move.defenderId : move.attackerId;
		const before = candidates.get(enemyId);
		if (!own || !before) continue;

		const attackerFell = move.loserIds.includes(move.attackerId);
		const defenderFell = move.loserIds.includes(move.defenderId);
		const fits = before.filter((rank) => {
			const losers = mine ? battleLosers(own, rank) : battleLosers(rank, own);
			return losers.includes("att") === attackerFell && losers.includes("def") === defenderFell;
		});
		if (!fits.length) throw new Error(`Belief: no rank fits enemy piece ${enemyId}.`);
		candidates.set(enemyId, fits);
	}

	// A fallen enemy in a running match was not the Flag: its fall would have ended the match.
	const dead = enemies.filter((piece) => !piece.alive);
	if (!view.outcome) for (const piece of dead) candidates.set(piece.id, candidates.get(piece.id)!.filter((rank) => rank !== "FLG"));

	const known = Object.fromEntries(ranks.map((rank) => [rank.key, rank.count])) as Record<RankKey, number>;
	for (const piece of dead) {
		const options = candidates.get(piece.id)!;
		if (options.length === 1) known[options[0]] -= 1;
	}

	const pool = { ...known };
	for (const piece of dead) {
		const options = candidates.get(piece.id)!;
		if (options.length === 1) continue;
		const weight = options.reduce((sum, rank) => sum + Math.max(known[rank], 0), 0);
		for (const rank of options) pool[rank] -= weight ? Math.max(known[rank], 0) / weight : 1 / options.length;
	}

	const live = enemies.length - dead.length;
	const total = RANK_KEYS.reduce((sum, rank) => sum + Math.max(pool[rank], 0), 0);
	for (const rank of RANK_KEYS) pool[rank] = total ? (Math.max(pool[rank], 0) * live) / total : 0;
	return { candidates, pool };
}

/** Probability of each rank for one enemy piece: the pool, restricted to what that piece can be. */
export function pieceOdds(belief: Belief, enemyId: number): [RankKey, number][] {
	const options = belief.candidates.get(enemyId) ?? [];
	const weights = options.map((rank) => belief.pool[rank]);
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	return options.map((rank, index) => [rank, total ? weights[index] / total : 1 / options.length]);
}
```

- [ ] **Step 4: Run tests and the type checker**

Run: `pnpm test`
Expected: PASS, 24 tests.
Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/knowledge.ts src/lib/knowledge.test.ts
git commit -m "feat(engine): belief v1, what each enemy piece can be from clash outcomes alone" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The fair ladder

**Files:**
- Modify: `src/lib/game.ts` (export `centerScore`)
- Modify: `src/lib/bots.ts`
- Test: `src/lib/bots.test.ts`

**Interfaces:**
- Consumes: `PublicView`, `PublicMove`, `publicView`, `enemyBelief`, `pieceOdds` (Tasks 6–7),
  `battleLosers`, `ROWS`, `Rng`, `Player`.
- Produces:
  - `chooseFairMove(view: PublicView, level: string, rng: Rng): PublicMove | null`
  - `fairBot(level: string): Player` — the "General (fair)" baseline is `fairBot("General")`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/bots.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMove, oppositeSide } from "@/lib/game";
import { chooseFairMove, fairBot } from "@/lib/bots";
import { publicView } from "@/lib/knowledge";
import { mulberry32, playGame } from "@/lib/replay";
import { board, shuffleRanks, statesOf } from "@/lib/testing";

test("fair bots choose the same move whatever the enemy's true ranks are", () => {
	const { replay } = playGame(12, fairBot("General"), fairBot("Sergeant"));
	const rng = mulberry32(3);
	for (const state of statesOf(replay).filter((s) => !s.outcome)) {
		const side = state.turn;
		const twin = shuffleRanks(state, oppositeSide(side), rng);
		for (const level of ["Sergeant", "General"]) {
			assert.deepEqual(chooseFairMove(publicView(twin, side), level, mulberry32(5)), chooseFairMove(publicView(state, side), level, mulberry32(5)));
		}
	}
});

test("the fair General attacks a piece the arbiter proved outranks a Private", () => {
	// Gold's Private falls attacking piece 21, which makes 21 a Sergeant or higher.
	let state = board([
		[0, "gold", "PVT", 4, 5],
		[2, "gold", "G5", 3, 4],
		[1, "gold", "FLG", 0, 7],
		[21, "slate", "COL", 4, 4],
		[22, "slate", "FLG", 8, 0],
		[23, "slate", "PVT", 8, 3],
	]);
	state = applyMove(state, "gold", 0, 4, 4, 0);
	state = applyMove(state, "slate", 23, 8, 4, 0);
	assert.deepEqual(chooseFairMove(publicView(state, "gold"), "General", mulberry32(1)), { pieceId: 2, col: 4, row: 4, targetId: 21 });
});

test("fair self-play finishes and replays", () => {
	const { replay } = playGame(21, fairBot("General"), fairBot("Colonel"));
	assert.ok(replay.outcome);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test src/lib/bots.test.ts`
Expected: FAIL — `chooseFairMove` is not exported.

- [ ] **Step 3: Export `centerScore`**

In `src/lib/game.ts`, change `function centerScore(col: number) {` to
`export function centerScore(col: number) {`.

- [ ] **Step 4: Add the fair ladder to `src/lib/bots.ts`**

Replace the file with:

```ts
import { ROWS, battleLosers, centerScore, chooseBotMove, type Rng } from "@/lib/game";
import { enemyBelief, pieceOdds, publicView, type PublicMove, type PublicView } from "@/lib/knowledge";
import type { Player } from "@/lib/replay";

/** The practice-room ladder as a player. It reads true enemy ranks: a cheating benchmark only. */
export function cheatingBot(level: string): Player {
	return { name: `${level} (cheating)`, choose: (state, side, rng) => chooseBotMove(state, side, level, rng) };
}

/**
 * The heuristic ladder rebuilt on `PublicView`: same tiers and weights as `chooseBotMove`,
 * but every term that read a true enemy rank is an expected value over the belief. It also
 * avoids undoing its own last move (which feeds the repetition draw) and walking its Flag
 * next to an enemy piece. The Python port mirrors this function, rng calls included.
 */
export function chooseFairMove(view: PublicView, level: string, rng: Rng): PublicMove | null {
	const moves = view.legal;
	if (!moves.length) return null;
	if (level === "Private" || level === "Spy") return moves[Math.floor(rng() * moves.length)];

	const belief = enemyBelief(view);
	const byId = new Map(view.pieces.map((piece) => [piece.id, piece]));
	const foes = view.pieces.filter((piece) => piece.side === "foe" && piece.alive);
	const lastOwn = view.moves.findLast((move) => move.side === view.side);

	const scored = moves.map((move) => {
		const rank = byId.get(move.pieceId)?.rank;
		let score = rng();
		if (move.targetId !== undefined && rank) {
			for (const [enemyRank, chance] of pieceOdds(belief, move.targetId)) {
				const losers = battleLosers(rank, enemyRank);
				if (losers.includes("def")) score += 8 * chance;
				if (losers.includes("att")) score -= 6 * chance;
				if (enemyRank === "FLG") score += 100 * chance;
			}
		}
		if (rank === "FLG") {
			score += (view.side === "slate" ? move.row : ROWS - 1 - move.row) * 0.6;
			if (foes.some((foe) => Math.abs(foe.col - move.col) + Math.abs(foe.row - move.row) === 1)) score -= 5;
		}
		if (lastOwn?.attackerId === move.pieceId && lastOwn.from.col === move.col && lastOwn.from.row === move.row) score -= 3;
		if (level === "Sergeant") score += move.targetId !== undefined ? 4 : 0;
		if (level === "Captain") score += rank === "PVT" ? 1.5 : 0;
		if (level === "Colonel" || level === "General") score += centerScore(move.col);
		if (level === "General" && rank === "SPY" && move.targetId !== undefined) score += 3;
		return { move, score };
	});

	scored.sort((a, b) => b.score - a.score);
	return level === "Sergeant" ? scored[Math.floor(rng() * Math.min(6, scored.length))].move : scored[0].move;
}

/** A fair ladder player. `fairBot("General")` is the "General (fair)" baseline. */
export function fairBot(level: string): Player {
	return { name: `${level} (fair)`, choose: (state, side, rng) => chooseFairMove(publicView(state, side), level, rng) };
}
```

`Array.prototype.findLast` needs `lib` es2023 or later; `tsconfig.json` targets es2024 with
`esnext` lib, so it compiles.

- [ ] **Step 5: Run tests and the type checker**

Run: `pnpm test`
Expected: PASS, 27 tests.
Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game.ts src/lib/bots.ts src/lib/bots.test.ts
git commit -m "feat(bots): a fair heuristic ladder that scores attacks by expected value" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Benchmark and fixture export

**Files:**
- Create: `scripts/bench.ts`
- Modify: `.gitignore`
- Modify: `docs/bot-ai-roadmap.md` (results)

**Interfaces:**
- Consumes: `playGame`, `replayGame`, `Player`, `Replay` (replay.ts); `cheatingBot`,
  `fairBot` (bots.ts); `ENGINE_VERSION`.
- Produces:
  - `pnpm bench` prints a markdown results table.
  - `pnpm bench --fixtures <n> --out <path>` writes `<n>` replays as JSON lines for the
    Python conformance tests.

- [ ] **Step 1: Ignore generated fixtures**

Append to `.gitignore`:

```
# generated replay fixtures (pnpm bench --fixtures)
/ml/fixtures/
```

- [ ] **Step 2: Create `scripts/bench.ts`**

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ENGINE_VERSION } from "@/lib/game";
import { cheatingBot, fairBot } from "@/lib/bots";
import { playGame, replayGame, type Player, type Replay } from "@/lib/replay";

/**
 * Seeded bot benchmark. Each matchup plays 100 deployments twice, once with each player as
 * Gold, so Gold's first-move advantage is measured instead of averaged away. Every game is
 * replayed and must reproduce its own result.
 */
const DEALS = 100;
const LEVELS = ["Sergeant", "Captain", "Colonel", "General"];

const MATCHUPS: [Player, Player][] = [
	...LEVELS.map((level): [Player, Player] => [fairBot(level), fairBot("Private")]),
	...LEVELS.map((level): [Player, Player] => [cheatingBot(level), cheatingBot("Private")]),
	[fairBot("General"), cheatingBot("General")],
	[fairBot("General"), fairBot("General")],
	[cheatingBot("General"), cheatingBot("General")],
];

function checked(replay: Replay) {
	const rebuilt = replayGame(replay);
	if (JSON.stringify(rebuilt.outcome) !== JSON.stringify(replay.outcome)) throw new Error(`Seed ${replay.seed} does not replay to its own result.`);
	return replay;
}

function pct(part: number, whole: number) {
	return `${((100 * part) / whole).toFixed(1)}%`;
}

function runMatchup([a, b]: [Player, Player]) {
	let aWinsGold = 0;
	let aWinsSlate = 0;
	let bWins = 0;
	let repetition = 0;
	let plyCap = 0;
	let plies = 0;
	for (let game = 0; game < 2 * DEALS; game++) {
		const aIsGold = game < DEALS;
		const seed = (game % DEALS) + 1;
		const { replay } = playGame(seed, aIsGold ? a : b, aIsGold ? b : a);
		checked(replay);
		const { winner, kind } = replay.outcome;
		const aSide = aIsGold ? "gold" : "slate";
		if (winner === aSide) {
			if (aIsGold) aWinsGold++;
			else aWinsSlate++;
		} else if (winner !== "draw") bWins++;
		if (kind === "repetition") repetition++;
		if (kind === "ply-cap") plyCap++;
		plies += replay.plies;
	}
	return `| ${a.name} vs ${b.name} | ${pct(aWinsGold, DEALS)} | ${pct(aWinsSlate, DEALS)} | ${pct(bWins, 2 * DEALS)} | ${repetition} / ${plyCap} | ${(plies / (2 * DEALS)).toFixed(0)} |`;
}

function writeFixtures(count: number, out: string) {
	mkdirSync(dirname(out), { recursive: true });
	const lines: string[] = [];
	for (let index = 0; index < count; index++) {
		const [a, b] = MATCHUPS[index % MATCHUPS.length];
		const swap = Math.floor(index / MATCHUPS.length) % 2 === 1;
		lines.push(JSON.stringify(checked(playGame(index + 1, swap ? b : a, swap ? a : b).replay)));
	}
	writeFileSync(out, `${lines.join("\n")}\n`);
	console.log(`Wrote ${count} replays (engine ${ENGINE_VERSION}) to ${out}`);
}

const args = process.argv.slice(2);
const fixtures = args.indexOf("--fixtures");
if (fixtures >= 0) {
	const out = args[args.indexOf("--out") + 1];
	if (args.indexOf("--out") < 0 || !out) throw new Error("Usage: pnpm bench --fixtures <n> --out <path>");
	writeFixtures(Number(args[fixtures + 1]), out);
} else {
	console.log(`Engine ${ENGINE_VERSION}, ${DEALS} deals per matchup, each played with both colours.\n`);
	console.log("| Matchup (A vs B) | A wins as Gold | A wins as Slate | B wins | Draws (repetition / ply cap) | Avg plies |");
	console.log("| --- | --- | --- | --- | --- | --- |");
	for (const matchup of MATCHUPS) console.log(runMatchup(matchup));
}
```

- [ ] **Step 3: Run the benchmark**

Run: `pnpm bench`
Expected: a header line and a 13-row table, no thrown error. Every row's win and draw
percentages are plausible: `fairBot("Private")` should lose most games to every other fair
tier. If a fair tier draws by repetition in most games, stop and report it rather than
retuning weights inside this task.

- [ ] **Step 4: Run it twice and compare**

Run: `pnpm bench > bench-a.txt` then `pnpm bench > bench-b.txt`, then
`git diff --no-index bench-a.txt bench-b.txt`.
Expected: no differences (every result reproduces from its seed). Delete both files.

- [ ] **Step 5: Export fixtures**

Run: `pnpm bench --fixtures 10000 --out ml/fixtures/replays-engine1.jsonl`
Expected: `Wrote 10000 replays (engine 1) to ml/fixtures/replays-engine1.jsonl`;
`git status` does not list the file.

- [ ] **Step 6: Record the results**

In `docs/bot-ai-roadmap.md`, add a section at the end:

```markdown
## Benchmark results

Engine 1, commit `<short sha>`, `pnpm bench`, run on <date>.

<paste the table printed in Step 3>

The fair rows are the real baselines. The cheating rows read true enemy ranks and exist
only to show what hidden information costs a bot. "General (fair)" is the behavior-cloning
teacher and the RL promotion baseline.
```

Replace `<short sha>` with `git rev-parse --short HEAD`, `<date>` with today's date, and
paste the table.

- [ ] **Step 7: Commit**

```bash
git add scripts/bench.ts .gitignore docs/bot-ai-roadmap.md
git commit -m "feat(bench): seeded bot benchmark with colours swapped and replay fixtures" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Rules copy and docs

**Files:**
- Modify: `src/app/how-to-play/page.tsx`
- Modify: `CLAUDE.md`
- Modify: `docs/bot-ai-roadmap.md`
- Modify: `docs/rl-implementation-plan.md`
- Modify: `docs/superpowers/specs/2026-09-26-rl-training-workflow-design.md`

**Interfaces:**
- Consumes: everything above. Produces documentation only.

- [ ] **Step 1: Tell players about automatic draws**

In `src/app/how-to-play/page.tsx`, in the "Winning" section, directly after the closing
`</ol>`, add:

```tsx
					<p className="mt-5 max-w-[62ch] text-[15px] leading-7 text-[#c3beb2]">
						A match is drawn if the same position comes up three times, or after 300 moves in total with no
						result.
					</p>
```

If `feat/draw-offers` already added text about agreed draws in this section, put this
sentence next to it rather than in a second paragraph.

- [ ] **Step 2: Update `CLAUDE.md`**

In the "Commands" block, after `pnpm lint`, add:

```bash
pnpm test         # engine tests (node:test via tsx)
pnpm bench        # seeded bot benchmark; --fixtures <n> --out <path> exports replays
```

In the "Layout" block, after `src/lib/coach.ts …`, add:

```
src/lib/replay.ts     # mulberry32, playGame, replayGame: seeded self-play + replay format
src/lib/knowledge.ts  # publicView (no enemy ranks) + enemyBelief (belief v1)
src/lib/bots.ts       # cheatingBot (benchmark only) and the fair ladder (chooseFairMove)
scripts/bench.ts      # benchmark + replay fixtures for the Python port
```

In "Game rules", after "Win by taking the flag or walking your flag to the far edge.", add:
"A match is drawn after 300 plies or on threefold repetition (same live-piece positions,
same side to move); `ENGINE_VERSION` in `game.ts` must be bumped on any rule change."

- [ ] **Step 3: Mark the roadmap**

In `docs/bot-ai-roadmap.md`, under "## Fix Before RL", add as the first line:

```markdown
> Status (engine 1): items 1–6 are implemented — see `src/lib/game.ts`, `replay.ts`,
> `knowledge.ts`, `bots.ts` and `scripts/bench.ts`. Two notes: the "no legal move" outcome
> was dropped because it cannot happen (a side's pieces cannot fill the board, so one always
> borders an empty or enemy square), and the practice room already persists the bot's
> army across reloads (`live-match.ts`).
```

- [ ] **Step 4: Apply the stack change to `docs/rl-implementation-plan.md`**

Make these replacements (spec section 9):

| Old text | New text |
| --- | --- |
| `# RL Implementation Plan — TensorFlow Training, Cloudflare Serving, Difficulty Tiers` | `# RL Implementation Plan — PyTorch Training, Cloudflare Serving, Difficulty Tiers` |
| `## Part 1 — Python + TensorFlow training stack` | `## Part 1 — Python + PyTorch training stack` |
| `pyproject.toml          # uv-managed; tensorflow, numpy, pytest — nothing else to start` | `pyproject.toml          # uv-managed; torch, numpy, matplotlib, pytest` |
| `- Hand-rolled PPO in TF2/Keras (~300 lines: GAE, clipped objective, entropy bonus).` and the next line, `tf-agents is not worth its weight for masked-discrete self-play. Mask by adding −1e9 to` | `- PPO adapted from CleanRL's single-file \`ppo.py\` with invalid-action masking. Mask by adding −1e9 to` |
| `- Primary: Keras → \`tensorflowjs_converter\` graph model with uint8/16 weight quantization` through `sizes; do not ship both.` (four lines) | `- \`torch.onnx.export\` → ONNX, run with onnxruntime-web (wasm) in the browser and in Node for the TS-side gate.` |
| `same TFJS/ONNX runtime)` (wraps from "(Node can load the" on the line before) | `onnxruntime-web runtime)` |
| `Lazy-load the TFJS wasm runtime +` | `Lazy-load the onnxruntime-web wasm runtime +` |
| `the same wasm runtime (TFJS-wasm or onnxruntime-web) inside the Worker.` (keep the rest of that line) | `the same onnxruntime-web wasm runtime inside the Worker.` |
| `- Dual export runtimes — pick TFJS or ONNX after measuring, ship one.` | delete the line |

After the §1.1 code block, add:
"Run lifecycle (queue, pause, resume, checkpoints) and the paper pipeline:
[2026-09-26-rl-training-workflow-design.md](superpowers/specs/2026-09-26-rl-training-workflow-design.md)."

- [ ] **Step 5: Correct the spec**

In `docs/superpowers/specs/2026-09-26-rl-training-workflow-design.md`, in the metric
catalog row "Win type", change
`share of wins by Flag capture, by Flag reaching the far edge, and by the opponent having no legal move; share of draws by ply cap and by repetition`
to
`share of wins by Flag capture and by Flag reaching the far edge; share of draws by ply cap and by repetition`.

- [ ] **Step 6: Verify everything**

Run: `pnpm test` — Expected: PASS, 27 tests.
Run: `pnpm exec tsc --noEmit` — Expected: no errors.
Run: `pnpm lint` — Expected: no new errors.
Run: `pnpm build` — Expected: builds.

- [ ] **Step 7: Commit**

```bash
git add src/app/how-to-play/page.tsx CLAUDE.md docs/bot-ai-roadmap.md docs/rl-implementation-plan.md docs/superpowers/specs/2026-09-26-rl-training-workflow-design.md
git commit -m "docs: record automatic draws, the fair ladder and the PyTorch switch" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Not in this plan

- Switching the practice room from the cheating ladder to the fair one. That changes how
  hard the product's bots feel, so it is a product decision; the benchmark table is the
  evidence for it.
- Belief v2 (per-piece Bayesian updates). Roadmap: only if the benchmark says v1 plateaus.
- The Spy-tier copy mismatch noted in the roadmap.
- Any change to `src/lib/rooms.ts` or `src/db/schema.ts` (owned by the room-cleanup work).
