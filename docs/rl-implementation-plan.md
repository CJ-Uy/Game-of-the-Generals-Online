# RL Implementation Plan — TensorFlow Training, Cloudflare Serving, Difficulty Tiers

Executes the "Train offline" and "model inference" steps of [bot-ai-roadmap.md](bot-ai-roadmap.md).
Everything in that roadmap's "Fix Before RL" section is a hard prerequisite — it defines the
replay format, `publicState`, the belief helper, and the benchmark this plan trains and
validates against. Do not start Part 1 until the TS side emits replay fixtures.

## Part 1 — Python + TensorFlow training stack

### 1.1 Layout

```
ml/
  pyproject.toml          # uv-managed; tensorflow, numpy, pytest — nothing else to start
  gog/engine.py           # rules port of src/lib/game.ts
  gog/public_state.py     # publicState projection + belief helper port
  gog/bots.py             # heuristic ladder port (opponents)
  gog/env.py              # RL environment
  train_bc.py             # Phase A: behavior cloning
  train_ppo.py            # Phase B: PPO self-play
  eval.py                 # benchmark protocol (mirrors the TS benchmark)
  export.py               # TFJS/ONNX export + golden-move fixtures
  tests/                  # conformance + unit tests
```

Training artifacts (checkpoints, replays, TensorBoard logs) are gitignored; only released
model artifacts leave `ml/`.

### 1.2 Engine port + conformance — the load-bearing step

Two engines exist the moment Python enters: rule drift between them means training on a
different game and every result is garbage, silently. The defense:

- Port `game.ts` rules exactly: `battleLosers`, `applyMove`, `legalMoves`, the terminal
  helper (flag events, draw rule, no-legal-move) — roughly 300 lines.
- **Conformance fixtures:** the TS benchmark runner exports replays in the roadmap format
  (seed, both deployments, structured moves `{attackerId, from, to, defenderId?, loserIds}`,
  outcome, ply count, engine version). Python replays every fixture and asserts identical
  final board and outcome. Target: 100% pass on ≥10,000 games before any training.
- **Shared PRNG:** both sides implement the same seeded generator (e.g. mulberry32) so
  seeded bot-vs-bot games produce identical move sequences in both languages — that is the
  strongest cheap equivalence test available.
- Replays carry a rules/engine version; Python refuses mismatched fixtures. Bump the
  version on any rule change and regenerate.

### 1.3 Environment

Gym-style API without the gym dependency:

- `reset(seed, gold_loadout, slate_loadout) -> obs, mask`
- `step(action) -> obs, reward, done, info`
- **Action space:** `Discrete(84)` = side-local piece index (`id % 21`) × 4 directions in
  one pinned order. Canonicalize perspective: flip the board so the current player always
  moves "up" — the net learns one orientation, not two. The flip must be one
  encode/decode function pair (obs in, action out) with round-trip tests: flipping the
  observation but not un-flipping the action index is a silent bug that still produces
  legal moves.
- **Observation (9×8 planes, exact channel list frozen in one shared constant):**
  own pieces as 15 rank planes, enemy-alive plane, enemy known-not-Flag plane, belief
  summary planes from the ported helper (expected-rank-value; P(Flag) once belief v2
  exists), last-k move planes, plus scalars (ply / ply-cap, side).
- **Reward:** exactly the roadmap's section 5 — terminal ±1, small negative for draws,
  small shaping for confirmed favorable trades and Flag progress, no information bonuses.
  All shaping coefficients live in one config dataclass so experiments are diffable.

### 1.4 Opponents

Port the heuristic ladder (`chooseBotMove` is ~25 lines) plus the fixed pool-EV heuristics
from the roadmap. These are the environment opponents and the benchmark baselines. Seeded
cross-language games (see 1.2) keep the ports honest.

### 1.5 Phase A — behavior cloning first

- Generate 100k–500k games of fixed-General/ladder mixtures (Python engine, proven
  identical, so generation is local and fast).
- Train the policy net supervised: cross-entropy on the chosen move with illegal actions
  masked.
- **Gate:** the BC net roughly matches fixed-General strength on the benchmark. This
  validates observation encoding, masking, and the net wiring for a few cents of compute
  before RL can waste weeks hiding the same bugs.

### 1.6 Phase B — PPO self-play

- Hand-rolled PPO in TF2/Keras (~300 lines: GAE, clipped objective, entropy bonus).
  tf-agents is not worth its weight for masked-discrete self-play. Mask by adding −1e9 to
  illegal logits before softmax.
- **Opponent pool, not mirror self-play:** sample opponents ~50% current policy, ~30%
  frozen past checkpoints, ~20% heuristics. Pure mirror self-play collapses into loops in
  bluff games; the pool is the standard, boring fix.
- Vectorized env batch via numpy; the board is tiny — measure before optimizing further.
- **Eval:** `eval.py` mirrors the TS benchmark protocol (200 games/matchup, colors swapped,
  seeded). Promotion gate is the roadmap's: ≥1,000 seeded games vs fixed General, colors
  swapped, winning by more than the ±3% the sample resolves.
- **Reward-hacking watch:** auto-save replays of outlier games (longest, draw-heavy,
  repetition-triggering) for human review, per the roadmap.

### 1.7 Network

Small conv net: 3–5 conv layers (64 filters) on the 9×8 planes → policy head (84 logits)
+ value head. Target under 1M parameters — a few MB fp32, ~1MB quantized, sub-millisecond
CPU inference. That budget is what makes every serving option below viable; resist growing
it without a benchmark reason.

## Part 2 — Export

- Primary: Keras → `tensorflowjs_converter` graph model with uint8/16 weight quantization
  (training is TF, so TFJS is the path of least resistance). Alternative kept warm:
  `tf2onnx` → ONNX for `onnxruntime-web`. Pick one runtime after measuring both bundle
  sizes; do not ship both.
- A model artifact = weights + a metadata JSON: observation channel list, engine version,
  and the difficulty calibration table (Part 4). Artifacts live in the existing `GOGO_ASSETS`
  R2 bucket and/or Next static assets.
- **Golden-move test:** a fixed set of positions with expected policy outputs, asserted in
  Python and in the exported runtime. Catches export/quantization drift the way replay
  fixtures catch rule drift.
- **Final gate runs in TS, not Python:** the last validation before shipping is the
  exported artifact playing the real TS ladder through the TS benchmark (Node can load the
  same TFJS/ONNX runtime). Python-side eval proves the policy; only a TS-side run proves
  the shipped thing.

## Part 3 — Serving on Cloudflare

Three options, one decision rule: **A now, B when server-authoritative bot rooms exist,
C probably never.**

### Option A — browser inference (ship first)

Practice-mode bots already run client-side (`local-game-room.tsx`), so this is a drop-in:

- Add an async `chooseModelMove` beside `chooseBotMove`. Lazy-load the TFJS wasm runtime +
  weights (~1MB) when a model tier is selected; HTTP-cache both.
- **Trap:** the practice room holds the *full* `RoomState` (it simulates locally). The model
  must be fed the `publicState` projection, never the raw state — same helper the heuristics
  use, by construction.
- Zero server cost, no cold-start beyond first download, works offline. This is the only
  serving work needed until live-room bots exist.

### Option B — Worker inference (when live-room bots land)

- Home: the existing `gogo-room-sync` worker / `RoomSync` Durable Object — compute the bot
  reply inside the DO on each player move. Roadmap prerequisite stands: optimistic
  concurrency on `saveRoom` first.
- Runtime: the same wasm runtime (TFJS-wasm or onnxruntime-web) inside the Worker. Wasm +
  weights count against the Worker bundle budget (order of 3MB free / 10MB paid, gzipped —
  verify current limits at deploy time); or load weights from R2 on isolate start and cache
  in memory.
- De-risk before committing: a one-day spike that initializes the chosen runtime under
  workerd (miniflare) and runs one forward pass. Wasm runtimes assume browser APIs often
  enough that this is worth proving before Option B is planned around.
- CPU: a sub-ms forward pass is nothing on the paid plan (30s default). The free plan's
  10ms/request is tight once wasm init amortization is counted — assume paid.

### Option C — Cloudflare Containers (only if the model outgrows wasm)

- Shape: a `Container`-extending DO class in a worker; Dockerfile on `python:slim` running
  FastAPI + **onnxruntime** (not full TensorFlow — 10× smaller image) serving `POST /move`
  (publicState JSON in, action out). `instance_type: "lite"` (256 MiB) is plenty;
  `sleepAfter: "10m"`; `getRandom()` for stateless load-balancing.
- Costs: 2–3s cold start after idle vs the ~500ms bot-turn delay — first move after idle
  needs a "thinking" state, or a kept-warm instance (which then bills continuously).
  Containers is beta: no SLA, API may change — keep it off the critical path.
- Honest assessment: an 84-action board-game net should never need this. It exists in the
  plan so the upgrade path is named, not because it is expected.

### Non-option — Workers AI

Catalog models plus LoRA adapters only; it cannot host a custom TF/ONNX net. Not applicable.

## Part 4 — Difficulty tiers from one training run

Four knobs, combined per tier:

1. **Temperature** τ on policy logits — τ→0 plays the argmax (strongest), higher τ plays
   weaker and more erratically.
2. **ε-mixing** — with probability ε, play a uniform-random legal move (or a heuristic
   move) instead of sampling the model.
3. **Checkpoint ladder** — mid-training checkpoints are genuinely weaker but *coherent*
   opponents; noise-based weakening feels drunk, an early checkpoint feels like a worse
   player. Costs one artifact per tier that uses it.
4. **Belief handicap** — zero the belief planes for low tiers; the bot keeps tactics but
   "forgets" inference.

**Calibration:** sweep (checkpoint, τ, ε) on the benchmark vs the fixed General and pick
configs hitting target win rates — e.g. keep the existing heuristic ladder (Private→General)
as the lower tiers and add model tiers above it at ≈60%, ≈75%, ≈90% vs fixed General.
The chosen table ships inside the model metadata JSON:

```json
{ "tiers": { "model-1": { "checkpoint": "ck_040", "temperature": 1.2, "epsilon": 0.10 },
             "model-2": { "checkpoint": "final",  "temperature": 0.7, "epsilon": 0.03 },
             "model-3": { "checkpoint": "final",  "temperature": 0.0, "epsilon": 0.0 } } }
```

Tier keys are deliberately not `G1`–`G5` — those are already `RankKey` values in `game.ts`,
and reusing them for difficulties invites confusion in every switch statement that touches
both. Display names can still be thematic; the keys stay distinct.

UI difficulty select maps straight to a tier key; every tier uses the same async move
function. Re-run calibration on every model or engine version bump — the benchmark makes
it cheap.

## Sequencing and gates

| Step | Gate to pass before the next |
| --- | --- |
| Roadmap "Fix Before RL" lands (TS) | replay fixtures + benchmark exist |
| Python engine + belief port | 100% conformance on ≥10k fixtures; seeded cross-language games identical |
| Env + behavior cloning | BC ≈ fixed-General on benchmark |
| PPO self-play | beats fixed General: 1,000 seeded games, colors swapped, > ±3% margin |
| Export | golden-move parity in exported runtime |
| Browser serving + calibration | model tiers live in practice mode |
| Worker/DO serving | only with server-authoritative bot rooms + saveRoom concurrency |
| Containers | only if a future model exceeds the Worker wasm budget |

## Do not build

- GPU cluster or cloud training pipelines — this net trains on one machine.
- Training dashboards — TensorBoard exists.
- A Python server in production while Option A/B suffice.
- A deployment (setup-phase) policy — out of scope per the roadmap.
- Dual export runtimes — pick TFJS or ONNX after measuring, ship one.
