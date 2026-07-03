# Bot and AI Roadmap

## Adversarial Review

- The first plan was too optimistic about reinforcement learning. Game of the Generals is hidden-information, sparse-reward, and bluff-heavy; naive self-play will learn bad loops before it learns strategy.
- The current game state does not store reveal history separately from full private ranks. A trained bot must not get omniscient state unless it is explicitly an internal benchmark.
- Replays are the real prerequisite. Without deterministic replay, every bot bug and training result is basically a rumor.
- Reward shaping can easily teach cowardice, endless shuffling, or reckless trades. Win rate alone is not enough.
- “General bot” is not a teacher yet. The current heuristic sees true ranks and can overfit to information a player would not have.
- Running model inference in the live app is premature. First prove a tiny offline model beats the heuristic ladder.

## Current Bot Ladder

- Private: random legal move.
- Sergeant: noisy capture preference.
- Captain: capture preference plus light piece-use bias.
- Colonel: capture preference plus center control.
- General: stronger trade scoring and Spy pressure.
- Spy: random deployment and random legal moves every turn.

These bots are smoke-test opponents, not strong AI.

## Fix Before RL

1. Add deterministic replay.
   - Store seed, deployments, actions, reveals, winner, and version.
   - Rebuild the final board from the replay and assert it matches.

2. Split knowledge states.
   - `trueState`: all ranks, server/simulator only.
   - `publicState`: positions, own ranks, revealed enemy ranks, legal moves.
   - Bots and models consume `publicState` by default.

3. Add a tiny bot benchmark.
   - 200 games per matchup.
   - Report win rate, average plies, draw/loop count, illegal move count.
   - No model work until illegal moves are always zero.

4. Improve heuristics without adding dependencies.
   - Remember revealed ranks.
   - Penalize repeated back-and-forth moves.
   - Score Flag safety and progress.
   - Score unknown attacks by expected value, not true rank.

## Reinforcement Learning Plan

1. Build a headless simulator around `src/lib/game.ts`.
   - No React, D1, Workers, or sockets.
   - Deterministic RNG.
   - Same legal-move mask as production.

2. Define observation from `publicState`.
   - Own rank/alive/position.
   - Enemy alive/position/revealed rank or unknown.
   - Turn, ply count, legal move mask, recent move history, revealed clashes.

3. Keep action space boring.
   - Action = `(piece index, direction)`.
   - Mask illegal actions before sampling.
   - Reject any policy that emits illegal moves after masking in tests.

4. Start with offline experiments.
   - Random baseline.
   - Heuristic ladder baseline.
   - Imitation from heuristic games before self-play.
   - Self-play only after replay and benchmarks are stable.

5. Reward carefully.
   - Big: win, lose, capture Flag, lose Flag, Flag reaches back rank.
   - Small: favorable revealed trade, Flag progress, useful reveal.
   - Penalty: repeated no-progress cycles, losing high-value pieces, illegal action before mask.
   - Track reward hacking examples in replay logs.

6. Validate before productizing.
   - Beats General over at least 1,000 seeded games.
   - Does not rely on true hidden ranks.
   - No obvious loop exploit.
   - Median move latency fits the bot turn delay.

7. Ship path.
   - Ship better heuristics first.
   - Add replay export next.
   - Train offline.
   - Add model inference only when it beats the ladder and stays cheap.

## Do Not Build Yet

- Accounts, ranking, or matchmaking for bots.
- Cloud inference plumbing.
- A custom training UI.
- Large model serving in the game Worker.
