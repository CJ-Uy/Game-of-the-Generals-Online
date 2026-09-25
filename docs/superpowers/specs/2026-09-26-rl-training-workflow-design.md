# RL Training Workflow and Paper Pipeline — Design

**Date:** 2026-09-26
**Status:** Design approved in brainstorming; implementation plan not yet written
**Extends:** [bot-ai-roadmap.md](../../bot-ai-roadmap.md), [rl-implementation-plan.md](../../rl-implementation-plan.md)

## Goal

Train a Game of the Generals agent on one laptop in free-time sessions (start, pause,
continue, stop) without losing work or reproducibility, and turn the results into a
peer-reviewed paper for the author's CV.

The existing docs plan *what* to train: engine port, environment, behavior cloning, PPO,
export, difficulty tiers. This spec adds the two missing pieces:

1. A **run lifecycle** for PPO training that survives pauses, crashes and reboots, with a
   tested guarantee that resuming produces the same result as never pausing.
2. A **paper pipeline**: experiment matrix, evaluation protocol, behavior analysis,
   generated tables and figures, and rules for AI-assisted writing.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Publication target | IEEE Conference on Games (CoG) 2027, 4-page short paper, plus an arXiv copy | The main games-AI venue: double-anonymous peer review, published in IEEE Xplore. The 2026 short-paper deadline was 2026-05-14; the 2027 date is not announced yet. |
| Paper framing | Environment + baselines + trained agent + one ablation | Credible without lab-scale compute. A September 2026 search found no published RL agent for Game of the Generals, only forum discussions. |
| Research question | Does explicit belief tracking from arbiter outcomes help when ranks are never revealed? | Tests the property that separates GoG from Stratego, where clashes reveal ranks. Either answer is publishable. |
| Session style | Run while away: start by hand, pause with Ctrl+C or a time box | Least code; uses the whole machine. |
| Training stack | PyTorch on native Windows; PPO adapted from CleanRL `ppo.py` with invalid-action masking | TensorFlow 2.11 and later has no GPU support on native Windows (WSL2 only). CleanRL and invalid-action masking are published, citable implementations. |
| Export for later serving | ONNX → onnxruntime-web | Replaces TensorFlow.js; the existing plan already listed ONNX as its alternative. |

Hardware: Intel i9-13900HX (24 cores / 32 threads), 32 GB RAM, NVIDIA RTX 4060 Laptop GPU
(8 GB), Windows 11 Home, Python 3.12, uv.

## Out of scope

Covered by the existing docs and unchanged here, apart from the stack change listed in
section 9: the TypeScript "Fix Before RL" work, the Python engine port and its conformance
tests, the environment, the network architecture, export and serving, difficulty tiers.
A deployment (setup-phase) policy stays out of scope, so deployments stay random.

## 1. Run lifecycle

### Commands

```
uv run train_ppo.py new configs/full.toml configs/no_belief.toml --seeds 1,2,3
uv run train_ppo.py go                    # train the next unfinished run until Ctrl+C
uv run train_ppo.py go --for 3h           # stop at the first iteration boundary that fits in 3 hours
uv run train_ppo.py go --until 07:00      # same, with a clock deadline (tomorrow if already past)
uv run train_ppo.py go --iters 10         # stop after 10 iterations (also used by the resume test)
uv run train_ppo.py go --run 003-full-s2  # train a specific run instead of the next one
uv run train_ppo.py status
uv run train_ppo.py stop 003-full-s2      # end a run early: final evaluation, mark done
```

### Semantics

- **Train:** `new` creates one run directory per (config, seed) and freezes a copy of the
  config inside it. It does not start training; `go` does.
- **Pause:** Ctrl+C or a time box. The current iteration finishes, the checkpoint is saved,
  and the session ends. A second Ctrl+C exits immediately; the checkpoint from the previous
  iteration boundary stays valid, so at most one iteration is lost. Closing the terminal
  window counts as a crash with the same bound.
- **Continue:** `go` again. It picks the lowest-numbered unfinished run, which is the one
  that was paused.
- **Stop:** automatic when a run reaches `total_steps`: the final evaluation runs,
  `final_eval.json` is written, and the run is done. `go` then moves to the next unfinished
  run in the same session if time remains. `stop <run>` ends a paused run early the same
  way and records `"stopped_early": true`, so `paper.py` never mixes it silently with
  full-budget runs. `stop` on a queued run (nothing trained yet) refuses.
- **Discard:** move a broken run's directory into `ml/runs/_abandoned/`. It stays on disk
  for the record; `go`, `status` and `paper.py` ignore directories whose names start with
  `_`.

### Queue order

`new` names run directories `NNN-<config>-s<seed>` and numbers them seed-major: seed 1 of
every config given, then seed 2 of every config, then seed 3. `go` always picks the lowest
number that is not done. If the deadline arrives early, every config has at least one
finished seed.

### Run state

Derived from files, never stored:

| State | Condition |
| --- | --- |
| queued | no `latest.pt` |
| paused | `latest.pt` exists, no `final_eval.json` |
| done | `final_eval.json` exists |
| running | the session lock is held |

A crash therefore cannot leave a run stuck as "running".

`status` prints one row per run: name, state, steps done and `total_steps`, training hours,
the latest milestone win rate against General (fair), and flags for crashed sessions,
commit changes and early stops.

### Session lock

One training session at a time on the machine. `go` takes an exclusive lock on
`ml/runs/.lock` with `msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)` and refuses to start if that
fails. Windows releases the lock when the process exits for any reason, so no PID checks
are needed. Never use `os.kill(pid, 0)` as a liveness check on Windows: any signal other
than Ctrl+C or Ctrl+Break terminates the target process. The lock is Windows-only; add an
`fcntl` branch if training ever moves to Linux, WSL or Colab.

### Ctrl+C with worker processes

On Windows, Ctrl+C reaches every process attached to the console, including environment
workers. Workers call `signal.signal(signal.SIGINT, signal.SIG_IGN)` in their initializer.
Only the main process handles SIGINT: the first one sets a stop flag that is checked at
iteration boundaries; the second raises `KeyboardInterrupt`.

### Iteration length

`steps_per_iter` is chosen so one iteration takes at most about 60 seconds on this machine.
That bounds how long a Ctrl+C pause takes. Time boxes stop at the first boundary where the
next iteration, at the recent average duration, would pass the deadline.

## 2. Checkpoints and resume correctness

### Clean iteration boundary

Each iteration collects games until `steps_per_iter` environment steps are reached, then
lets the games in progress finish without starting new ones. At an iteration boundary no
game is in progress, so a checkpoint never contains environment state, worker state or a
rollout buffer.

### `latest.pt` contents

- model and optimizer (Adam) `state_dict`s
- counters: environment steps, iterations, games played, cumulative training seconds
- RNG states: `random.getstate()`, the numpy `Generator`'s `bit_generator.state`,
  `torch.get_rng_state()`, `torch.cuda.get_rng_state_all()`
- opponent pool: milestone file names and per-opponent win statistics
- git commit, dirty flag, and engine version

Learning-rate and entropy-coefficient schedules are pure functions of the step count, so
they need no saved state.

### Seeds

- Training game *n* draws its deployments and heuristic-bot randomness from
  `numpy.random.SeedSequence([run_seed, n])`, so any training game can be regenerated from
  its index. Policy actions during training are sampled with the saved torch RNG.
- Evaluation game *i* uses `SeedSequence([salt, i])` with a fixed salt per purpose
  (`eval` for milestone and final evaluations, `confirm` for the behavior confirmation set)
  and samples policy actions with its own `torch.Generator`. Evaluation never reads or
  advances the training RNG, so running, skipping or repeating an evaluation cannot change
  training.
- Milestone evaluations reuse the same 200 game seeds, so differences along a learning
  curve come from the policy, not from different games.
- Workers return results in environment-index order, never completion order.

### Atomic saves

Write `latest.pt.tmp`, flush and `os.fsync`, then `os.replace` it onto `latest.pt`. A power
cut during a save leaves the previous checkpoint intact. A save happens at every iteration
boundary (about 12 MB, tens of milliseconds). If a loss is not finite, the session ends
without saving, so the last good checkpoint survives.

### Milestones

At every 5% of `total_steps` (20 per run), a weights-only copy is written to
`checkpoints/m05.pt`, `m10.pt`, … `m100.pt` and kept forever. Milestones serve as the frozen
opponents in the pool, the learning-curve evaluation points, the behavior-over-training
analysis points, and later the difficulty-tier candidates.

### Evaluations catch up

A milestone's evaluation runs right after the milestone is saved. If it is interrupted,
the next `go` first runs every milestone evaluation that has no result yet, then continues
training. A final evaluation interrupted after `total_steps` was reached is caught up the
same way. Evaluations are deterministic, so running them late changes nothing.

### Log

`runs/<run>/log.jsonl`, append-only, one JSON object per line with an `ev` field:

| `ev` | Fields |
| --- | --- |
| `session_start` | time, step, commit, dirty, device |
| `iter` | step, iteration, games, steps per second, policy loss, value loss, entropy, approximate KL, clip fraction, win and draw rate against sampled opponents, mean plies |
| `eval` | step, milestone, opponent, games, wins, draws, losses |
| `session_end` | time, step, reason: `ctrl-c`, `time-box`, `iters`, `budget`, `nan` or `error` |
| `crash_detected` | start time of the previous session, which has no `session_end` |
| `warn` | message, e.g. commit changed or working tree dirty |
| `config_changed` | old and new `total_steps` |

On resume, `iter` and `eval` lines with a step newer than the checkpoint are dropped, so
curves never contain duplicates after a crash.

### Guarantee: resuming equals never pausing

Running `go --iters 2` twice produces bit-identical model and optimizer tensors, and
identical `iter` log lines apart from timing fields, compared with running `go --iters 4`
once. `tests/test_resume.py` checks this on CPU with a tiny config, running each `go` as
a separate process so state held in module globals cannot hide a bug. GPU runs set
`torch.use_deterministic_algorithms(True)`, `torch.backends.cudnn.benchmark = False` and
`CUBLAS_WORKSPACE_CONFIG=:4096:8` before CUDA initializes. The paper states that resume
equivalence was verified on CPU.

### Checks when `go` starts

- Engine version in the code differs from the run's: refuse. The rules changed, so the run
  is invalid.
- Git commit differs from the run's last session, or the working tree is dirty: warn and
  log a `warn` line. `status` flags the run; the paper must mention it or the run is
  repeated.
- `new` stores the frozen config as `config.toml` plus an untouched copy,
  `config.orig.toml`. If `config.toml` now differs from the original in anything other
  than `total_steps`: refuse. A raised `total_steps` is allowed and logged as
  `config_changed`. Raise it for every run in a comparison, never for one run alone.
- Running on battery (`GetSystemPowerStatus` via `ctypes`): refuse unless `--battery`.
- While training, hold `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` via
  `ctypes` so Windows does not sleep; clear it on exit.

### One-time Windows setup (done by the user)

- Power options: set "When I close the lid" to "Do nothing" while plugged in. The
  keep-awake call does not prevent sleep on lid close.
- Windows Update: set active hours around training nights to avoid forced reboots
  mid-session. A reboot still loses at most one iteration.

### Disk

About 1 GB for the six PPO runs: 20 weights-only milestones per run plus gzipped evaluation
replays.

## 3. Experiments and evaluation

### Matrix

| Row | Agent | Training |
| --- | --- | --- |
| Random | uniform legal moves | none |
| General (fair) | non-cheating heuristic top bot (roadmap "Fix Before RL" item 6) | none |
| General (cheating) | reads true ranks; reported as a clearly labeled reference only | none |
| BC | behavior cloning of General (fair) | 3 seeds |
| PPO-full | BC initialization, opponent pool, belief features | 3 seeds |
| PPO-no-belief | PPO-full with the belief planes zeroed | 3 seeds |

Optional if time allows: PPO-mirror (no opponent pool, pure mirror self-play) and
PPO-scratch (no BC initialization), 3 seeds each.

The General (cheating) row against General (fair) measures what hidden information costs
a bot, at no extra cost because both bots exist.

Opponent pool sampling follows the existing plan: about 50% current policy, 30% frozen
milestones, 20% heuristic bots.

### Budget

`total_steps` and `steps_per_iter` count the learning agent's own moves; opponent moves are
excluded. The January trial run's logged steps per second is the throughput measurement.
Every PPO run gets the same `total_steps`: training hours available ÷ number of PPO runs ×
steps per second, minus 20% slack. At about 30 hours a week over February and March, that is roughly
32 hours per run. Equal budgets are what make the ablation valid.

### Protocol

- **Milestone evaluation:** 200 games against General (fair), 100 per color.
- **Final evaluation:** 1,000 games per matchup, 500 per color, against Random,
  General (fair) and General (cheating).
- **Head-to-head:** PPO-full against PPO-no-belief, final checkpoints paired by seed,
  1,000 games per pair.
- **Baselines:** the heuristic bots against each other and against Random, so baseline
  rows and baseline behavior metrics exist.
- Policy actions in every evaluation are sampled at temperature 1.
- **Reporting:** wins, draws and losses per run with 95% Wilson intervals; per config, the
  mean across seeds with each seed's value shown.
- Every evaluation game is saved as a replay (section 4).

## 4. Behavior analysis

### Method

Watching games produces hypotheses; statistics confirm them.

1. Watch games, random ones and outliers (longest, shortest, flag-reach wins), with
   `uv run behaviors.py watch <replay file> <game index>`, which prints the game move by
   move as an ASCII board.
2. Turn a noticed pattern into a per-game metric computed from replays.
3. Compute it over the final-evaluation games for every agent, and compare against the
   baselines, earlier milestones and the ablation.
4. Require the pattern in all three seeds. A pattern in one seed is a quirk of that run.
5. Confirm it on a fresh set of 1,000 games per agent using the `confirm` salt. The
   final-evaluation games are the discovery set; the fresh set is the confirmation set.
6. Pick one clean game to illustrate it.

Rules: the unit of analysis is the game, because moves within a game are not independent.
Intervals are 95% bootstrap intervals over games. Report every metric that was measured,
including those that showed nothing.

### Replay format

One JSON object per game, stored as gzipped JSONL at
`runs/<run>/eval/<m05…m100|final|confirm>.jsonl.gz`. The format is the roadmap's replay
format (seed, both deployments with ranks, structured moves
`{attackerId, from, to, defenderId?, loserIds}`, outcome, ply count, engine version) with
camelCase keys identical to the TypeScript fixtures, plus `gameIndex`, `evalSalt`,
`opponent` and `color`. One reader handles conformance fixtures and evaluation games. Ranks
per move are derived from the deployments, not stored.

Replays contain true ranks and exist for analysis only. They are never fed to an agent;
agents consume `publicState` by construction.

### Metric catalog

| Pattern | Metric, per game and side |
| --- | --- |
| Scouting with low pieces | rank distribution of the attackers in the side's first 10 attacks |
| Bluffing | Spearman correlation between a piece's true rank (the `ranks` order in `game.ts`, 5-Star General highest to Private lowest, Spy and Flag excluded) and the rows it advanced; a weaker correlation than the baselines means pieces act out of character |
| Spy hunting | true-rank distribution of the Spy's attack targets; share of Spy attacks that hit an officer |
| Flag safety | mean distance of the Flag from its own back row; mean number of friendly pieces within Chebyshev distance 2 of the Flag |
| Win type | share of wins by Flag capture, by Flag reaching the far edge, and by the opponent having no legal move; share of draws by ply cap and by repetition |
| Tempo | plies until the first attack; attacks per 100 plies |
| Belief use | attack rate as a function of the target's belief-estimated strength, recomputed offline by replaying the game through the belief helper; compared between PPO-full and PPO-no-belief |
| Stalling | draw rate, repetition triggers, back-and-forth moves (a piece returning to its previous square within its side's next two moves) |

The same metrics computed at each milestone give behavior-over-training curves.

Optional, full paper only: a linear probe on the network's feature map that predicts
"this enemy piece is the Flag" from true labels, compared between PPO-full and
PPO-no-belief, following the probing method of McGrath et al. (PNAS 2022).

## 5. Paper pipeline

### Generated numbers

`ml/paper.py` reads `ml/runs/*/final_eval.json`, `ml/bc/*/final_eval.json`,
`ml/baselines/`, `ml/h2h/`, the `log.jsonl` files and the replays, and writes to `--out`
(default `ml/paper_out/`, gitignored; point it at the paper project's `generated/` folder):

- `results.tex`: main table, agents × opponents, win % with intervals
- `ablation.tex`: PPO-full against PPO-no-belief
- `behaviors.tex`: confirmed metrics with intervals
- `compute.tex`: number of runs, total training hours, hardware, library versions
- `curves.pdf`: win rate against General (fair) over steps, mean and band across seeds
- `behavior_curves.pdf`: selected metrics over milestones

The paper includes these with `\input` and `\includegraphics`. No number is typed by hand.

### Anonymity

The code repository is public (`CJ-Uy/Game-of-the-Generals-Online`) and CoG review is
double-anonymous.

- The LaTeX source lives in Overleaf or a private repository during review.
- Code is linked through an anonymized mirror, for example Anonymous GitHub.
- No studio name, site URL or author names anywhere in the PDF, including its metadata.
- Check the CoG 2027 call for its policy on preprints and public code once it is published.

After acceptance: link the real repository and a Zenodo archive (configs, logs, final
checkpoints, evaluation replays) with a citable DOI.

### AI-assisted writing

Rules as of September 2026:

- **IEEE (CoG proceedings):** AI-generated text, figures, images or code in the article
  must be disclosed in the Acknowledgments, naming the AI system, the sections, and the
  level of use. Editing and grammar help is exempt, but disclosure is recommended; do not
  run AI editing over the reference list. AI cannot be an author. The authors are
  responsible for every word, figure and citation.
- **arXiv (May 2026):** a one-year submission ban for unchecked AI content: nonexistent
  references, leftover chatbot text, placeholder text. Checked, disclosed AI use is allowed.
  (Reported through a secondary source; check arXiv's help pages before submitting.)
- Check the CoG 2027 call and the university's policy.

Division of work:

| Part | AI may | The author must |
| --- | --- | --- |
| Code | write most of it | review it, run the conformance tests, understand every rule |
| Numbers, tables, figures | write the generating scripts | never type a number by hand |
| Rules and environment sections | draft from the docs and code | verify every sentence against the engine |
| Related work | suggest papers and summaries | read every cited paper; take BibTeX from DBLP or the publisher, never from AI |
| Introduction, contributions, interpretation, limitations | edit | write |
| Abstract | polish | write, last |
| LaTeX, grammar, formatting | do all of it | do a final read |
| Pre-submission review | act as a harsh CoG reviewer | decide what to change |

Writing order: generate the results; write the contributions and interpretation; have AI
draft the descriptive sections and verify them; related work; AI reviewer pass; adviser
review; disclosure. Keep a dated AI-use log while writing so the disclosure is accurate.

Disclosure template, adjusted to what actually happened:

> The authors used Claude (Anthropic) to assist in implementing the simulation environment,
> training, and evaluation code, to draft initial versions of Sections II–III, and for
> language editing throughout. The authors reviewed, verified, and revised all AI-assisted
> content and take full responsibility for this paper.

Readiness test: the author can explain and defend every sentence without the AI present.

## 6. Files and dependencies

New:

```
ml/
  gog/runs.py         # run dirs, state, session lock, atomic checkpoints, log.jsonl, keep-awake, battery check
  train_ppo.py        # CLI (new / go / status / stop) + PPO loop adapted from CleanRL ppo.py
  behaviors.py        # metric functions + `watch` ASCII replay printer
  paper.py            # results → .tex tables and .pdf figures
  analysis.ipynb      # exploration only; nothing in the paper depends on it
  configs/full.toml
  configs/no_belief.toml
  tests/test_resume.py
  tests/test_behaviors.py
  runs/  bc/  baselines/  h2h/  paper_out/    # outputs, all gitignored
```

`gog/runs.py` keeps the lifecycle plumbing out of `train_ppo.py`, so the PPO file stays
close to CleanRL's single-file layout and can be compared against it line by line.

From the existing plan, same role: `gog/engine.py`, `gog/public_state.py`, `gog/bots.py`,
`gog/env.py`, `train_bc.py` (writes `ml/bc/s<seed>/bc.pt`), `export.py`. `eval.py` gains
four subcommands: `final <dir>` (called by `train_ppo.py` and used for BC), `baselines`,
`h2h <run> <run>` and `confirm <dir>`; all of them write replays.

Dependencies: `torch` (CUDA 12 wheel for Windows), `numpy`, `matplotlib`, `pytest`, and
Jupyter as a dev dependency. Configs are read with the standard library's `tomllib`.

## 7. Testing

- `tests/test_resume.py`: resume equivalence (section 2). Required.
- `tests/test_behaviors.py`: each metric against a tiny hand-built replay with a known
  answer.
- Python engine conformance against TypeScript replays, as in the existing plan.
- `paper.py` output is checked by reading it.

## 8. Timeline

| When | Work | Gate before moving on |
| --- | --- | --- |
| Oct–Nov 2026 | TypeScript prerequisites: roadmap "Fix Before RL" items 1–6 | replay fixtures and the TS benchmark exist; General (fair) exists and its benchmark results are recorded next to the cheating ladder's |
| Dec 2026 | Python engine port and conformance, environment, `gog/runs.py`, `train_ppo.py` | 100% conformance on ≥ 10,000 games; `test_resume.py` passes |
| Jan 2027 | behavior cloning; a short PPO trial run; set `total_steps`; `new` the six PPO runs | BC scores at least 40% against General (fair) over 1,000 games, draws counting half; the trial run's win rate against General (fair) is higher at its last milestone than at its first |
| Feb–Mar 2027 | training in free-time sessions | all six PPO runs done |
| Early Apr 2027 | baseline, head-to-head and confirmation evaluations; behavior analysis; `paper.py` | tables and figures generated |
| Apr–May 2027 | writing, adviser review, submission | submitted |

Each row is its own implementation plan, written when the previous gate passes. The
October–November and December engine work is specified in the existing docs; this spec's
code starts in December with `gog/runs.py`, which needs no engine and can be unit-tested
alone (lock, run state, atomic saves, log truncation). The resume test waits for the
environment.

The CoG 2027 short-paper deadline is not announced; the 2026 one was 2026-05-14. Stretch:
if all runs finish by early February, target a full paper instead (8 pages; the 2026
deadline was 2026-03-17). Fallbacks: the Philippine Computing Science Congress, or an
AAAI or NeurIPS workshop.

## 9. Changes to existing docs

`docs/rl-implementation-plan.md`:

- Title and Part 1: TensorFlow → PyTorch; `pyproject.toml` lists torch instead of
  tensorflow.
- §1.1 layout: add `gog/runs.py`, `configs/`, `behaviors.py`, `paper.py`,
  `analysis.ipynb`, and the gitignored output folders.
- §1.6: "Hand-rolled PPO in TF2/Keras" becomes PPO adapted from CleanRL `ppo.py` with
  invalid-action masking; link this spec for the run lifecycle.
- Part 2: the primary export becomes `torch.onnx.export` → onnxruntime-web; TensorFlow.js
  is dropped. The golden-move test and the TS-side final gate stay.
- Part 3, options A and B: the TFJS wasm runtime becomes onnxruntime-web (wasm).
- "Do not build": remove "Dual export runtimes", which no longer applies; keep "Training
  dashboards", since `status` and `paper.py` plots cover monitoring.

## Skipped for now

| Skipped | Add when |
| --- | --- |
| In-process pause (the process stays alive) | resuming ever takes more than a few seconds |
| Auto-start when idle | manual starts keep getting forgotten |
| Background, throttled training | training while using the laptop is wanted |
| Parallel runs | measured CPU or GPU utilization during a run is low |
| TensorBoard | live curves are wanted; `SummaryWriter(purge_step=step)` handles resume |
| Cloud training (Colab, Kaggle) | laptop hours run out; checkpoints load anywhere with `map_location="cpu"` |
| Web replay viewer for Python games | the ASCII `watch` is not enough |
| Linear probes | aiming for the full paper |

## Sources

- CoG 2026 call for papers: https://cog2026.org/cfp
- CoG 2026 auxiliary papers call: https://cog2026.org/call-auxiliary
- CoG 2027: https://cog2027.u-aizu.ac.jp/
- IEEE conference submission policies, AI-generated content:
  https://conferences.ieeeauthorcenter.ieee.org/author-ethics/guidelines-and-policies/submission-policies/
- arXiv ban on unchecked AI content (secondary source):
  https://casrai.org/news/arxiv-one-year-ban-unchecked-ai-content
- TensorFlow pip install, native Windows GPU note: https://www.tensorflow.org/install/pip
- Perolat et al., DeepNash, Science 2022: https://www.science.org/doi/10.1126/science.add4679
- Sokota et al., superhuman Stratego, 2025: https://arxiv.org/abs/2511.07312
- Straka and Schmid, Generals.io environment (a different game, same paper shape):
  https://arxiv.org/abs/2507.06825
- Huang et al., CleanRL, JMLR 2022: https://jmlr.org/papers/v23/21-1342.html
- Huang and Ontañón, invalid action masking: https://arxiv.org/abs/2006.14171
- McGrath et al., Acquisition of chess knowledge in AlphaZero, PNAS 2022:
  https://www.pnas.org/doi/10.1073/pnas.2206625119
