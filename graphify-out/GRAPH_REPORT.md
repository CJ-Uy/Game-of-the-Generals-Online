# Graph Report - Game-of-the-Generals-Online  (2026-07-07)

## Corpus Check
- 45 files · ~95,351 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 365 nodes · 584 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a129b61b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `scripts` - 11 edges
3. `publicRoom()` - 11 edges
4. `POST()` - 10 edges
5. `cn()` - 10 edges
6. `POST()` - 8 edges
7. `Button()` - 8 edges
8. `applyMove()` - 8 edges
9. `json()` - 8 edges
10. `Part 1 — Python + TensorFlow training stack` - 8 edges

## Surprising Connections (you probably didn't know these)
- `OnlineGameRoom()` --calls--> `parseLastMove()`  [EXTRACTED]
  src/components/play/game-room.tsx → src/components/play/board-view.tsx
- `makeState()` --calls--> `makeSidePieces()`  [EXTRACTED]
  src/components/play/local-game-room.tsx → src/lib/game.ts
- `POST()` --calls--> `addGuest()`  [EXTRACTED]
  src/app/api/rooms/[code]/join/route.ts → src/lib/game.ts
- `POST()` --calls--> `findRoom()`  [EXTRACTED]
  src/app/api/rooms/[code]/join/route.ts → src/lib/rooms.ts
- `POST()` --calls--> `json()`  [EXTRACTED]
  src/app/api/rooms/[code]/join/route.ts → src/lib/rooms.ts

## Import Cycles
- None detected.

## Communities (23 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (41): boot(), collectProps(), compileAttr(), compileTemplate(), contentKey(), createComponentFactory(), createExternalModules(), createHelmetManager() (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (45): GET(), POST(), gameMatches, gameRooms, POST(), addGuest(), addMessage(), applyMove() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (23): disciplines, metadata, pillars, ranks, team, upsets, HomeExperience(), playModes (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (36): dependencies, class-variance-authority, clsx, drizzle-orm, next, @opennextjs/cloudflare, @radix-ui/react-slot, react (+28 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (28): PlayerSide, PublicPiece, PublicRoom, ArbiterChip(), boardGlyphSize(), boardIndex(), CapturedGuessTiles(), CommandChain() (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (16): CandidateMove, Duel, findPieceAt(), GameState, GLYPHS, Mark, newGame(), pad() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (18): 1.1 Layout, 1.2 Engine port + conformance — the load-bearing step, 1.3 Environment, 1.4 Opponents, 1.5 Phase A — behavior cloning first, 1.6 Phase B — PPO self-play, 1.7 Network, Do not build (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (7): Commands, Conventions, Design system (memorize — no config file to look it up in), Game rules (source of truth for logic), Layout, Stack, What this is

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (7): Agent Notes, Current Direction, Design Reference, graphify, Implementation Rules, Project, Verification

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (6): geistMono, geistSans, karla, metadata, plexMono, teko

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (7): Animation Direction, Future Systems, Game of the Generals Online Design, Game UX Principles, Goal, Product Shape, Visual Direction

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (6): Adversarial Review, Bot and AI Roadmap, Current Bot Ladder, Do Not Build Yet, Fix Before RL, Reinforcement Learning Plan

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (6): Deploy, Develop, Getting Started, Learn More, OpenNext Starter, Preview

### Community 14 - "Community 14"
Cohesion: 0.43
Nodes (4): Env, fetch(), roomCodeFromPath(), RoomSync

### Community 15 - "Community 15"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

## Knowledge Gaps
- **144 isolated node(s):** `__filename`, `__dirname`, `compat`, `eslintConfig`, `nextConfig` (+139 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `Community 2` to `Community 4`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Card()` connect `Community 2` to `Community 4`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `CardTitle()` connect `Community 2` to `Community 4`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `compat` to the rest of the system?**
  _144 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06801346801346801 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0942684766214178 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06431372549019608 - nodes in this community are weakly interconnected._