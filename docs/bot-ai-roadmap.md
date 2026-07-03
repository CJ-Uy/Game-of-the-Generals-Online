# Bot and AI Roadmap

## Adversarial Review

- Reinforcement-learning optimism is the failure mode here. Game of the Generals is hidden-information, sparse-reward, and bluff-heavy; naive self-play will learn bad loops before it learns strategy.
- Ranks are never revealed in this game — not even after a clash. `toPublicRoom` strips all enemy ranks and plies only record `G a3xb3`. The only information a player gets is *which piece died where*. Any plan built on "revealed ranks" is describing a different game; everything below uses clash outcomes and inferred beliefs instead.
- The code today has no draw rule, bots that read true enemy ranks, and no replay. "Fix Before RL" exists because of those three facts.
- Reward shaping can easily teach cowardice, endless shuffling, or reckless trades. Win rate alone is not enough.
- Running model inference in the live app is premature. First prove a tiny offline model beats the heuristic ladder.

## Current Bot Ladder

- Private: random legal move.
- Sergeant: noisy capture preference.
- Captain: capture preference plus light piece-use bias.
- Colonel: capture preference plus center control.
- General: capture scoring plus center control and a Spy-attack bonus — the trade scoring itself is identical to the tiers below.
- Spy: random legal moves every turn. Note: both copy sites oversell it — the setup screen says "Random each match" (a wildcard tier) and the bot panel says it "randomizes its army" (every tier does); the code just plays random moves. Implement the wildcard or fix the copy.

Every difficulty deploys randomly (`makeRandomLoadout` in `local-game-room`) — Spy differs only in move choice. All tiers above Private/Spy read true enemy ranks today. The practice room also regenerates the bot's loadout on reload instead of persisting it, so mid-game state is unrecoverable.

These bots are smoke-test opponents, not strong AI.

## Fix Before RL

1. Pin the rules.
   - Add a draw rule: ply cap (e.g. 300) and threefold repetition of position + side to move. Repetition needs position keys — hash pieces + side and store that history as part of this change; the display `plies` strings cannot answer repetition. Applies to product and simulator identically.
   - Add a no-legal-move outcome (the practice room improvises a resignation today). The terminal helper must take the full `RoomState`, not just pieces — `getOutcome(pieces)` cannot see whose turn it is or whether they have moves.
   - Flag-reach is locked to the implemented rule: immediate win on reaching the far edge (`getOutcome`). No variants unless the app grows explicit rulesets.

2. Add deterministic replay.
   - `applyMove` records only display strings (`"G a3xb3"`); emit structured move events first — `{ attackerId, from, to, defenderId?, loserIds }` — or replay has nothing to replay.
   - Store seed, both deployments, structured moves, outcome, ply count, and a rules/engine version. Where: sessionStorage for the practice room, JSON files for the benchmark — D1 only if replays ever become a product feature. Persist the bot's generated loadout at match creation (the practice room currently regenerates it on reload).
   - Inject two dependencies into game/simulator paths: `rng` (`Math.random()` in `chooseBotMove`/`sample`/`makeRandomLoadout`) and `now` (`Date.now()` in `addMessage`, `makeWaitingState`, and the practice room's initial messages). Leave `rooms.ts` randomness alone — it is not replay state (tokens are crypto-backed; room codes use `Math.random`, which is fine for a 4-letter code).
   - Rebuild the final board from the replay and assert it matches (ignoring message timestamps).

3. Split knowledge states.
   - `trueState`: all ranks, server/simulator only.
   - `publicState`: positions, own ranks, legal moves, and the clash-outcome log. No enemy ranks, ever.
   - The clash log is not a second format: it is the structured move log filtered to `defenderId != null` — belief updates need to follow a specific piece across the game. One record shape, two views.
   - Watch the types: `LegalMove.target` is a full `GamePiece` including rank. `publicState` needs a sanitized move type (target id/side only) or the split leaks through the API.
   - Bots and models consume `publicState` by default. Any bot reading `trueState` is explicitly labeled a cheating benchmark.

4. Track what the opponent can be — staged, cheapest first.
   - v1: a distribution over the ranks that can still sit on *live* enemy pieces. Careful — dead enemy pieces do not reveal their ranks, so "21 minus dead" is wrong; marginalize over unknown dead instead of pretending they left the bag. The exclusions that do real work: mutual deaths confirm exact ranks; a capture that does **not** end the game proves that piece was not the Flag; a piece that attacked and survived is not a Flag; my own piece's fate in a clash bounds the enemy rank via `battleLosers`. Score unknown attacks by expected value against this. Still small; still removes the cheating.
   - v2 (only if the benchmark says v1 plateaus): per-piece rank distributions updated from the clash log. Get the rules right — equal ranks kill both, and equality is checked before the Spy rule, so equal Spies die together; otherwise Spy beats every non-Private piece; a defending Flag dies to any attacker; a Flag kills only by attacking the enemy Flag. Worked example: a piece that survived attacking my Major is Lt. Colonel or above, or a Spy; if it died and my Major survived, it is anything that loses attacking a Major — Captain or below, or a Flag, but never a Spy; if both died, it was the enemy Major. Derive the sets from `battleLosers` and unit-test them.
   - Either version lives in one `publicState` helper so heuristics and the RL observation share it.

5. Add a tiny bot benchmark.
   - Prerequisite nobody wrote down: the repo has no test runner — no test script, no framework. Pick one dev dependency for engine tests and the benchmark (vitest, or tsx + `node:test`) and stop there. Nothing new ships to the Worker.
   - 200 games per matchup, colors swapped halfway — gold moves first and that advantage must be measured, not averaged away.
   - Report win rate per color, average plies, draw count, repetition-rule triggers.
   - No model work until the benchmark runs clean and every result is reproducible from its seed.

6. Improve heuristics — no new runtime dependencies (the test/bench dev dependency above is the only addition).
   - Replace true-rank scoring with pool expected value (item 4 v1).
   - Penalize repeated back-and-forth moves.
   - Score Flag safety and progress.
   - Re-run the benchmark: the fixed (non-cheating) ladder is the real baseline; expect it to be weaker than the cheating one and record both.

## Reinforcement Learning Plan

Detailed training/serving/difficulty implementation: [rl-implementation-plan.md](rl-implementation-plan.md).

1. Build a headless simulator around `src/lib/game.ts`.
   - No React, D1, Workers, or sockets. Chat is UI baggage in sim state, but it cannot just be deleted: `applyMove` calls `addMessage` on terminal moves. Split pure move resolution from message decoration first, then the simulator uses the pure half.
   - Injected RNG, same legal-move mask and rules (including draw rule) as production.
   - Cheap perf pass only if needed: `legalMoves` does a linear scan per square; an occupancy grid is the known fix if millions of sim games are slow.

2. Define observation from `publicState`.
   - Own rank/alive/position.
   - Enemy alive/position + belief output (not "revealed rank" — reveals do not exist).
   - Turn, ply count, legal move mask, recent move history, clash-outcome log.
   - Scope the first model to post-deployment play: deployments come from `makeRandomLoadout` (or a human library later). A deployment policy is its own project — setup matters in Salpakan, but not before the move policy works.

3. Keep action space boring.
   - Action = `(piece index, direction)` — 21 × 4 = 84 actions.
   - Piece index is the engine's side-local index — `piece.id % 21`, i.e. position in the initialized `RoomState.pieces` order — not UI placement order. Raw `GamePiece.id`s are offset by 21 for slate and must not leak into the action encoding.
   - Mask illegal actions before sampling.
   - Reject any policy that emits illegal moves after masking in tests.

4. Start with offline experiments.
   - Random baseline, then the fixed heuristic ladder baseline.
   - Imitation from the *fixed* (publicState-only) heuristics — imitating the cheating bots teaches moves conditioned on information the student can never see.
   - Self-play only after replay and benchmarks are stable.

5. Reward carefully.
   - Big: win, lose, capture Flag, lose Flag, own Flag reaches the enemy far edge.
   - Draw (ply cap / repetition): small negative — stalling must not be a safe harbor.
   - Small: favorable trade confirmed by clash outcome, Flag progress.
   - Penalty: repeated no-progress cycles, losing high-value pieces.
   - Do not reward "information gained" — belief-entropy bonuses pay the agent to throw pieces at unknowns. If scouting matters, the win signal will teach it.
   - Track reward hacking examples in replay logs.

6. Validate before productizing.
   - Beats the fixed General over at least 1,000 seeded games, colors swapped — by a margin the sample can resolve (1,000 games ≈ ±3% at 95%), not 51%.
   - Consumes only `publicState` — verified by construction, not by trust.
   - No obvious loop exploit; draw rate below an agreed ceiling.
   - Median move latency fits the bot turn delay (~500 ms in the practice room today).

7. Ship path — each step is the test harness for the next.
   - Draw rule + terminal states.
   - Structured moves, rng/now injection, replay assert.
   - Knowledge split, test runner, benchmark.
   - Non-cheating heuristics, proven better via the benchmark.
   - Train offline.
   - Add model inference only when it beats the ladder and stays cheap.

## Do Not Build Yet

- Accounts, ranking, or matchmaking for bots.
- Server-side bots in live rooms — `saveRoom` bumps `version` without a compare, so concurrent bot writes would race player moves. Needs optimistic concurrency first.
- Cloud inference plumbing.
- A custom training UI.
- Large model serving in the game Worker.
