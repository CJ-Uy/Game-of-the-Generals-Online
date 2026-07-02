# Bot and AI Roadmap

## Current Bot Ladder

- Private: chooses any legal move at random.
- Sergeant: prefers captures, but still makes noisy moves.
- Captain: prefers captures and uses low-value pieces more actively.
- Colonel: adds center control to the capture scoring.
- General: adds stronger trade scoring and Spy pressure.
- Spy: random deployment and random legal moves every turn.

The current bots are intentionally light. They are useful for testing the full game loop, not for strong play.

## Near-Term Bot Ideas

1. Add memory for revealed enemy ranks.
2. Score pieces by risk, not only immediate capture result.
3. Push the Flag only after nearby defenders are cleared.
4. Let Spy bots choose a random ladder personality per match, then add a pure chaos toggle.
5. Add a debug panel that shows why the bot picked a move.

## Reinforcement Learning Plan

1. Make a headless simulator.
   - Reuse `src/lib/game.ts`.
   - No React, no D1, no Cloudflare.
   - Input: two policies and two deployments.
   - Output: winner, move list, captures, reveal history, and final board.

2. Define the observation.
   - Own pieces: rank, alive, position.
   - Enemy pieces: position, alive, revealed rank when known, unknown otherwise.
   - Turn, ply count, legal moves, prior clashes, and Flag progress.

3. Define the action space.
   - A legal move is `(pieceId, destination)`.
   - Mask illegal moves before sampling.
   - Keep the mask deterministic so training cannot learn invalid actions.

4. Start with imitation and self-play baselines.
   - Random bot for a floor.
   - Heuristic General bot for the first teacher.
   - Self-play only after the simulator is fast and deterministic.

5. Reward shaping.
   - Win: large positive.
   - Loss: large negative.
   - Capture Flag: large positive.
   - Lose Flag: large negative.
   - Good trade: small positive.
   - Bad trade: small negative.
   - Reaching enemy back rank with Flag: large positive.
   - Repeating harmless moves: small negative.

6. Training stack.
   - First choice: Python + PyTorch for experiments.
   - Keep model export separate from the web app.
   - Later, run inference through a tiny API or a Workers AI-compatible model if it fits latency and cost.

7. Validation.
   - Track win rate versus Random, Sergeant, Captain, and General.
   - Track average game length.
   - Track illegal move rate, which should be zero.
   - Track exploit loops where both bots repeat moves.

8. Product path.
   - Ship heuristic bots first.
   - Add a saved replay format.
   - Use replays as RL training data.
   - Add trained AI only as an optional mode once it beats the heuristic ladder consistently.
