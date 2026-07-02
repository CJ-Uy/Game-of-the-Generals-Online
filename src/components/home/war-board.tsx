"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";

const COLS = 9;
const ROWS = 8;

const GLYPHS = {
	G5: "★★★★★",
	G4: "★★★★",
	G3: "★★★",
	G2: "★★",
	G1: "★",
	COL: "▲▲▲",
	LTC: "▲▲",
	MAJ: "▲",
	CPT: "◆◆◆",
	LT1: "◆◆",
	LT2: "◆",
	SGT: "∧∧∧",
	PVT: "∧",
	SPY: "✦",
	FLG: "⚑",
} as const;

const RANK_NUM = {
	G5: 15,
	G4: 14,
	G3: 13,
	G2: 12,
	G1: 11,
	COL: 10,
	LTC: 9,
	MAJ: 8,
	CPT: 7,
	LT1: 6,
	LT2: 5,
	SGT: 4,
	PVT: 3,
} as const;

const RANKS = [
	"G5",
	"G4",
	"G3",
	"G2",
	"G1",
	"COL",
	"LTC",
	"MAJ",
	"CPT",
	"LT1",
	"LT2",
	"SGT",
	"PVT",
	"PVT",
	"PVT",
	"PVT",
	"PVT",
	"PVT",
	"SPY",
	"SPY",
	"FLG",
] as const;

type Rank = (typeof RANKS)[number];
type Side = "gold" | "slate";
type Duel = { col: number; row: number; phase: "landing" | "arbiter" };
type Mark = "★" | "✦" | "∧" | "⚑";

type Piece = {
	id: number;
	side: Side;
	rank: Rank;
	col: number;
	row: number;
	alive: boolean;
	stack: boolean;
};

type GameState = {
	war: number;
	pieces: Piece[];
	turn: Side;
	duel: Duel | null;
	fallen: number;
	move: number;
	banner: string | null;
	marks: Record<number, Mark>;
	picker: number | null;
};

type CandidateMove = {
	piece: Piece;
	col: number;
	row: number;
	occupant?: Piece;
	weight: number;
};

function rng(seed: number) {
	let value = seed;
	return () => {
		value += 0x6d2b79f5;
		let t = value;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle<T>(items: readonly T[], random = Math.random) {
	const next = [...items];
	for (let i = next.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[next[i], next[j]] = [next[j], next[i]];
	}
	return next;
}

function newGame(war: number): GameState {
	const random = rng(war * 9973);
	const pieces: Piece[] = [];

	function deal(side: Side, rows: number[], idBase: number) {
		const ranks = shuffle(RANKS, random);
		const cells = shuffle(
			rows.flatMap((row) => Array.from({ length: COLS }, (_, col) => ({ col, row }))),
			random,
		);

		ranks.forEach((rank, index) => {
			pieces.push({
				id: idBase + index,
				side,
				rank,
				col: cells[index].col,
				row: cells[index].row,
				alive: true,
				stack: false,
			});
		});
	}

	deal("gold", [5, 6, 7], 0);
	deal("slate", [0, 1, 2], 21);

	return {
		war,
		pieces,
		turn: "gold",
		duel: null,
		fallen: 0,
		move: 0,
		banner: null,
		marks: {},
		picker: null,
	};
}

function resolveBattle(attacker: Piece, defender: Piece) {
	if (attacker.rank === "FLG") return defender.rank === "FLG" ? [defender.id] : [attacker.id];
	if (defender.rank === "FLG") return [defender.id];
	if (attacker.rank === defender.rank) return [attacker.id, defender.id];
	if (attacker.rank === "SPY") return defender.rank === "PVT" ? [attacker.id] : [defender.id];
	if (defender.rank === "SPY") return attacker.rank === "PVT" ? [defender.id] : [attacker.id];

	return RANK_NUM[attacker.rank as keyof typeof RANK_NUM] > RANK_NUM[defender.rank as keyof typeof RANK_NUM]
		? [defender.id]
		: [attacker.id];
}

function findPieceAt(pieces: Piece[], col: number, row: number) {
	return pieces.find((piece) => piece.alive && piece.col === col && piece.row === row);
}

function pickMove(game: GameState): CandidateMove | null {
	const side = game.turn;
	const mine = game.pieces.filter((piece) => piece.alive && piece.side === side);
	const foes = game.pieces.filter((piece) => piece.alive && piece.side !== side);
	if (game.move > 140 || mine.length < 5 || foes.length < 5) return null;

	const fwd = side === "gold" ? -1 : 1;
	const moves: CandidateMove[] = [];

	for (const piece of mine) {
		for (const [dc, dr] of [
			[0, fwd],
			[1, 0],
			[-1, 0],
			[0, -fwd],
		]) {
			const col = piece.col + dc;
			const row = piece.row + dr;
			if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;

			const occupant = findPieceAt(game.pieces, col, row);
			if (occupant?.side === side) continue;
			if (piece.rank === "FLG" && occupant && occupant.rank !== "FLG") continue;

			let weight = occupant ? 26 : dr === fwd ? 6 : dc !== 0 ? 3 : 1;
			if (piece.rank === "FLG" && !occupant) weight = 0.2;
			moves.push({ piece, col, row, occupant, weight });
		}
	}

	if (!moves.length) return null;

	let roll = Math.random() * moves.reduce((total, move) => total + move.weight, 0);
	for (const move of moves) {
		roll -= move.weight;
		if (roll <= 0) return move;
	}

	return moves[moves.length - 1];
}

function nextSide(side: Side): Side {
	return side === "gold" ? "slate" : "gold";
}

function pad(value: number, length: number) {
	return String(value).padStart(length, "0");
}

export function WarBoard() {
	const [game, setGame] = useState(() => newGame(1));
	const gameRef = useRef(game);
	const timers = useRef<number[]>([]);
	const tick = useRef<number | null>(null);

	useEffect(() => {
		gameRef.current = game;
	}, [game]);

	const after = useCallback((ms: number, fn: () => void) => {
		const id = window.setTimeout(fn, ms);
		timers.current.push(id);
	}, []);

	const endWar = useCallback(
		(how: "flag" | "flagHome" | "ceasefire") => {
			const banner =
				how === "flag"
					? "FLAG TAKEN - THE WAR IS OVER"
					: how === "flagHome"
						? "FLAG THROUGH - THE WAR IS OVER"
						: "CEASEFIRE - BOTH SIDES REGROUP";

			setGame((state) => ({ ...state, banner, duel: null }));
			after(2400, () => {
				setGame((state) => newGame(state.war + 1));
			});
		},
		[after],
	);

	const challenge = useCallback(
		(move: CandidateMove, side: Side) => {
			if (!move.occupant) return;

			const attackerId = move.piece.id;
			const defenderId = move.occupant.id;

			setGame((state) => ({
				...state,
				duel: { col: move.col, row: move.row, phase: "landing" },
				pieces: state.pieces.map((piece) =>
					piece.id === attackerId ? { ...piece, col: move.col, row: move.row, stack: true } : piece,
				),
			}));

			after(1000, () => {
				setGame((state) =>
					state.duel ? { ...state, duel: { ...state.duel, phase: "arbiter" } } : state,
				);
			});

			after(2600, () => {
				const state = gameRef.current;
				const attacker = state.pieces.find((piece) => piece.id === attackerId);
				const defender = state.pieces.find((piece) => piece.id === defenderId);
				if (!attacker || !defender || !state.duel) return;

				const losers = resolveBattle(attacker, defender);
				const flagTaken =
					(defender.rank === "FLG" && losers.includes(defender.id)) ||
					(attacker.rank === "FLG" && losers.includes(attacker.id));

				setGame((current) => ({
					...current,
					duel: null,
					fallen: current.fallen + losers.length,
					move: current.move + 1,
					turn: nextSide(side),
					pieces: current.pieces.map((piece) => {
						if (losers.includes(piece.id)) return { ...piece, alive: false, stack: false };
						if (piece.id === attackerId) return { ...piece, stack: false };
						return piece;
					}),
				}));

				if (flagTaken) after(1100, () => endWar("flag"));
			});
		},
		[after, endWar],
	);

	const step = useCallback(() => {
		const state = gameRef.current;
		if (state.duel || state.banner) return;

		const move = pickMove(state);
		if (!move) {
			endWar("ceasefire");
			return;
		}

		if (move.occupant) {
			challenge(move, state.turn);
			return;
		}

		setGame((current) => ({
			...current,
			move: current.move + 1,
			turn: nextSide(state.turn),
			picker: null,
			pieces: current.pieces.map((piece) =>
				piece.id === move.piece.id ? { ...piece, col: move.col, row: move.row } : piece,
			),
		}));

		if (move.piece.rank === "FLG" && (state.turn === "gold" ? move.row === 0 : move.row === ROWS - 1)) {
			after(700, () => endWar("flagHome"));
		}
	}, [after, challenge, endWar]);

	useEffect(() => {
		function schedule() {
			tick.current = window.setTimeout(() => {
				step();
				schedule();
			}, 1500);
		}

		schedule();

		return () => {
			if (tick.current) window.clearTimeout(tick.current);
			timers.current.forEach(window.clearTimeout);
			timers.current = [];
		};
	}, [step]);

	const togglePicker = (event: MouseEvent, id: number) => {
		event.stopPropagation();
		setGame((state) => ({ ...state, picker: state.picker === id ? null : id }));
	};

	const setMark = (mark: Mark | null) => {
		setGame((state) => {
			if (state.picker == null) return state;
			const marks = { ...state.marks };
			if (mark) marks[state.picker] = mark;
			else delete marks[state.picker];
			return { ...state, marks, picker: null };
		});
	};

	const cellWidth = 100 / COLS;
	const rowHeight = 100 / ROWS;
	const hotCell = game.duel ? game.duel.row * COLS + game.duel.col : null;
	const pickedPiece = game.picker == null ? null : game.pieces.find((piece) => piece.id === game.picker && piece.alive);

	const tickerLeft =
		game.banner ??
		`WAR Nº ${pad(game.war, 2)} · MOVE ${pad(game.move, 3)} · ${
			game.duel ? "ARBITER DELIBERATING" : `${game.turn.toUpperCase()} TO MOVE`
		} · CASUALTIES ${pad(game.fallen, 2)}`;

	return (
		<div className="absolute inset-0" onClick={() => setGame((state) => ({ ...state, picker: null }))}>
			<div
				className="absolute left-1/2 top-1/2 w-[min(94vw,1100px)] [perspective:1700px]"
				style={{ transform: "translate(-50%, -52%) perspective(1700px) rotateX(30deg) rotateZ(-5deg)" }}
			>
				<div className="relative aspect-[9/8]">
					<div className="absolute inset-0 grid grid-cols-9 grid-rows-8 gap-[3px]">
						{Array.from({ length: COLS * ROWS }).map((_, index) => {
							const hot = index === hotCell;
							return (
								<div
									key={index}
									className="rounded-[4px] border transition-colors duration-500"
									style={{
										background: hot ? "rgba(201,168,93,0.2)" : "rgba(28,39,64,0.38)",
										borderColor: hot ? "rgba(201,168,93,0.7)" : "rgba(28,39,64,0.9)",
									}}
								/>
							);
						})}
					</div>

					{game.pieces.map((piece) => {
						const glyph = piece.side === "gold" ? GLYPHS[piece.rank] : "";
						const mark = game.marks[piece.id];
						const isPicked = game.picker === piece.id;

						return (
							<button
								key={piece.id}
								type="button"
								aria-label={piece.side === "slate" ? "Mark suspected enemy piece" : `${piece.rank} piece`}
								onClick={(event) => {
									if (piece.side === "slate" && piece.alive) togglePicker(event, piece.id);
								}}
								className="absolute flex items-center justify-center border font-bold"
								style={
									{
										left: `calc(${piece.col * cellWidth}% + 6px)`,
										top: `calc(${piece.row * rowHeight}% + 6px)`,
										width: `calc(${cellWidth}% - 12px)`,
										height: `calc(${rowHeight}% - 12px)`,
										borderRadius: 6,
										fontSize: glyph.length >= 4 ? 12 : glyph.length === 3 ? 14 : 19,
										letterSpacing: 1,
										cursor: piece.side === "slate" && piece.alive ? "pointer" : "default",
										background:
											piece.side === "gold"
												? "linear-gradient(160deg, #c9a85d, #a8894a)"
												: "linear-gradient(160deg, #253352, #1a2338)",
										color: piece.side === "gold" ? "rgba(14,20,32,0.7)" : "rgba(201,168,93,0.35)",
										borderColor: piece.side === "gold" ? "#dabb74" : isPicked ? "#c9a85d" : "#2c3a55",
										boxShadow: piece.stack
											? "0 0 0 2px rgba(201,168,93,0.85), 0 22px 40px rgba(0,0,0,0.65)"
											: "0 10px 22px rgba(0,0,0,0.5)",
										opacity: piece.alive ? 1 : 0,
										transform: piece.stack ? "translate(-7%, -12%) rotate(-3deg)" : piece.alive ? "none" : "scale(0.55)",
										transition:
											"left 0.85s cubic-bezier(0.6,0,0.2,1), top 0.85s cubic-bezier(0.6,0,0.2,1), opacity 0.7s ease, transform 0.7s ease, box-shadow 0.3s ease, border-color 0.2s ease",
										zIndex: piece.stack ? 5 : 2,
									} satisfies CSSProperties
								}
							>
								{glyph}
								{mark ? (
									<span className="absolute -right-2 -top-2 z-[4] flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[var(--accent)] bg-[#0e1420] text-[11px] font-normal tracking-normal text-[var(--accent)]">
										{mark}
									</span>
								) : null}
							</button>
						);
					})}

					{game.duel?.phase === "arbiter" ? (
						<div
							className="wr-arbiter-live absolute z-[7] whitespace-nowrap rounded-[4px] border border-[var(--accent)] bg-[#0e1420] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)] shadow-[0_12px_34px_rgba(0,0,0,0.65)]"
							style={{
								left: `calc(${(game.duel.col + 0.5) * cellWidth}%)`,
								top: `calc(${game.duel.row * rowHeight}% - 34px)`,
								transform: "translateX(-50%)",
							}}
						>
							Arbiter
						</div>
					) : null}

					{pickedPiece ? (
						<div
							className="absolute z-[8] flex gap-1 rounded-[6px] border border-[#2c3a55] bg-[#0e1420] p-1 shadow-[0_14px_34px_rgba(0,0,0,0.6)]"
							onClick={(event) => event.stopPropagation()}
							style={{
								left: `calc(${(pickedPiece.col + 0.5) * cellWidth}%)`,
								top: `calc(${(pickedPiece.row + 1) * rowHeight}% + 2px)`,
								transform:
									pickedPiece.col < 2
										? "translateX(-20%)"
										: pickedPiece.col > 6
											? "translateX(-80%)"
											: "translateX(-50%)",
							}}
						>
							{[
								["★", "★"],
								["✦", "✦"],
								["∧", "∧"],
								["⚑", "⚑"],
								["✕", null],
							].map(([label, value]) => (
								<button
									key={label}
									type="button"
									className="flex h-[30px] w-[30px] items-center justify-center rounded-[4px] border border-[#2c3a55] bg-[#121b2c] text-[13px] text-[var(--accent)] transition-colors hover:border-[var(--accent)]"
									onClick={() => setMark(value as Mark | null)}
								>
									{label}
								</button>
							))}
						</div>
					) : null}
				</div>
			</div>

			<div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap justify-between gap-2 px-5 py-3 font-mono text-[9.5px] uppercase tracking-[0.22em] md:px-12">
				<span style={{ color: game.banner ? "#c9a85d" : "#5b647a" }}>{tickerLeft}</span>
				<span className="text-[#44506b]">Click an enemy piece to log a suspicion</span>
			</div>
		</div>
	);
}
