"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

const COLS = 9;
const ROWS = 8;
const FILES = "abcdefghi";
const GUEST_LOADOUT_KEY = "gog:guest-loadout:v1";

const ranks = [
	{ key: "G5", glyph: "★★★★★", name: "5-Star General", count: 1 },
	{ key: "G4", glyph: "★★★★", name: "4-Star General", count: 1 },
	{ key: "G3", glyph: "★★★", name: "3-Star General", count: 1 },
	{ key: "G2", glyph: "★★", name: "2-Star General", count: 1 },
	{ key: "G1", glyph: "★", name: "1-Star General", count: 1 },
	{ key: "COL", glyph: "▲▲▲", name: "Colonel", count: 1 },
	{ key: "LTC", glyph: "▲▲", name: "Lt. Colonel", count: 1 },
	{ key: "MAJ", glyph: "▲", name: "Major", count: 1 },
	{ key: "CPT", glyph: "◆◆◆", name: "Captain", count: 1 },
	{ key: "LT1", glyph: "◆◆", name: "1st Lieutenant", count: 1 },
	{ key: "LT2", glyph: "◆", name: "2nd Lieutenant", count: 1 },
	{ key: "SGT", glyph: "∧∧∧", name: "Sergeant", count: 1 },
	{ key: "PVT", glyph: "∧", name: "Private", count: 6 },
	{ key: "SPY", glyph: "✦", name: "Spy", count: 2 },
	{ key: "FLG", glyph: "⚑", name: "Flag", count: 1 },
] as const;

type RankKey = (typeof ranks)[number]["key"];
type Side = "you" | "foe";
type Outcome = "victory" | "defeat" | "draw";

type GamePiece = {
	id: number;
	side: Side;
	rank: RankKey;
	col: number;
	row: number;
	alive: boolean;
};

type Msg = { id: number; who: Side | "sys"; text: string };

const rankByKey = new Map(ranks.map((rank) => [rank.key, rank]));
const rankIndex = new Map(ranks.map((rank, index) => [rank.key, index]));
const ARMY: RankKey[] = ranks.flatMap((rank) => Array.from({ length: rank.count }, () => rank.key));

const RANK_NUM: Partial<Record<RankKey, number>> = {
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
};

function battleLosers(att: RankKey, def: RankKey): ("att" | "def")[] {
	if (att === "FLG") return def === "FLG" ? ["def"] : ["att"];
	if (def === "FLG") return ["def"];
	if (att === def) return ["att", "def"];
	if (att === "SPY") return def === "PVT" ? ["att"] : ["def"];
	if (def === "SPY") return att === "PVT" ? ["def"] : ["att"];
	return (RANK_NUM[att] ?? 0) > (RANK_NUM[def] ?? 0) ? ["def"] : ["att"];
}

function shuffle<T>(items: readonly T[]) {
	const next = [...items];
	for (let i = next.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[next[i], next[j]] = [next[j], next[i]];
	}
	return next;
}

function randomDeploy(rows: number[]) {
	const cells = shuffle(rows.flatMap((row) => Array.from({ length: COLS }, (_, col) => ({ col, row }))));
	return shuffle(ARMY).map((key, index) => ({ key, ...cells[index] }));
}

// Reuse the loadout saved on the setup screen so your deployment carries into battle.
function savedDeploy() {
	try {
		const raw = localStorage.getItem(GUEST_LOADOUT_KEY);
		if (!raw) return null;
		const entries = Object.entries(JSON.parse(raw) as Record<string, string>);
		if (entries.length !== ARMY.length) return null;
		const placed = entries.map(([zone, uid]) => {
			const index = Number(zone);
			return { key: String(uid).split("-")[0] as RankKey, col: index % COLS, row: 5 + Math.floor(index / COLS) };
		});
		const valid = placed.every(
			(piece) => rankByKey.has(piece.key) && piece.col >= 0 && piece.col < COLS && piece.row >= 5 && piece.row < ROWS,
		);
		return valid ? placed : null;
	} catch {
		return null;
	}
}

function makePieces(): GamePiece[] {
	const mine = savedDeploy() ?? randomDeploy([5, 6, 7]);
	const theirs = randomDeploy([0, 1, 2]);
	return [
		...mine.map((piece, index) => ({ id: index, side: "you" as Side, rank: piece.key, col: piece.col, row: piece.row, alive: true })),
		...theirs.map((piece, index) => ({
			id: ARMY.length + index,
			side: "foe" as Side,
			rank: piece.key,
			col: piece.col,
			row: piece.row,
			alive: true,
		})),
	];
}

// ponytail: weighted random opponent, real AI when multiplayer lands.
function pickFoeMove(pieces: GamePiece[]) {
	const moves: { piece: GamePiece; col: number; row: number; target?: GamePiece; weight: number }[] = [];

	for (const piece of pieces) {
		if (!piece.alive || piece.side !== "foe") continue;
		for (const [dc, dr] of [
			[0, 1],
			[1, 0],
			[-1, 0],
			[0, -1],
		]) {
			const col = piece.col + dc;
			const row = piece.row + dr;
			if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;

			const target = pieces.find((other) => other.alive && other.col === col && other.row === row);
			if (target?.side === "foe") continue;
			if (piece.rank === "FLG" && target) continue;

			let weight = target ? 24 : dr === 1 ? 6 : dc !== 0 ? 3 : 1;
			if (piece.rank === "FLG") weight = 0.2;
			moves.push({ piece, col, row, target, weight });
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

function square(col: number, row: number) {
	return `${FILES[col]}${ROWS - row}`;
}

function boardGlyphSize(glyph: string) {
	if (glyph.length >= 4) return "text-[7px] tracking-normal sm:text-[10px]";
	if (glyph.length === 3) return "text-[9px] sm:text-xs";
	return "text-xs sm:text-base";
}

function CompactGlyph({ glyph }: { glyph: string }) {
	const rows = glyph === "★★★★★" ? ["★★", "★★★"] : glyph === "★★★★" ? ["★★", "★★"] : null;

	if (!rows) return glyph;

	return (
		<span className="flex flex-col items-center justify-center leading-[0.82]">
			{rows.map((row, index) => (
				<span key={index}>{row}</span>
			))}
		</span>
	);
}

function TagBadge({ tag }: { tag?: RankKey }) {
	if (!tag) return null;
	return (
		<span className="pointer-events-none absolute -right-1 -top-1 z-[3] rounded-[3px] border border-[var(--accent)] bg-[#0e1420] px-1 py-px font-mono text-[8px] font-normal leading-[11px] tracking-normal text-[var(--accent)]">
			{tag}
		</span>
	);
}

function MoveLog({ plies, compact }: { plies: string[]; compact?: boolean }) {
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = listRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [plies.length]);

	const turns: { you?: string; foe?: string }[] = [];
	plies.forEach((ply, index) => {
		if (index % 2 === 0) turns.push({ you: ply });
		else turns[turns.length - 1].foe = ply;
	});

	return (
		<div ref={listRef} className={`overflow-y-auto font-mono text-[11px] leading-6 ${compact ? "max-h-32" : "max-h-44"}`}>
			{turns.length ? (
				turns.map((turn, index) => (
					<div key={index} className={`grid grid-cols-[2.2em_1fr_1fr] px-1 ${index % 2 ? "" : "bg-[#0b101b]"}`}>
						<span className="text-[#5b647a]">{index + 1}</span>
						<span className="text-[#ede8da]">{turn.you}</span>
						<span className="text-[#8a93a8]">{turn.foe}</span>
					</div>
				))
			) : (
				<p className="px-1 font-body text-xs text-[#5b647a]">No moves yet. You have the first move.</p>
			)}
		</div>
	);
}

function ChatPanel({
	messages,
	draft,
	onDraft,
	onSend,
	onDraw,
	drawDisabled,
	onSurrender,
	surrenderDisabled,
}: {
	messages: Msg[];
	draft: string;
	onDraft: (value: string) => void;
	onSend: () => void;
	onDraw: () => void;
	drawDisabled: boolean;
	onSurrender: () => void;
	surrenderDisabled: boolean;
}) {
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = listRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages.length]);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
				{messages.map((message) =>
					message.who === "sys" ? (
						<div key={message.id} className="px-2 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b647a]">
							{message.text}
						</div>
					) : (
						<div key={message.id} className={`flex ${message.who === "you" ? "justify-end" : "justify-start"}`}>
							<div
								className={`max-w-[85%] rounded-[6px] border px-2.5 py-1.5 text-sm leading-5 ${
									message.who === "you"
										? "border-[rgba(201,168,93,0.4)] bg-[rgba(201,168,93,0.1)] text-[#ede8da]"
										: "border-[#2c3a55] bg-[#121b2c] text-[#c7cbd6]"
								}`}
							>
								{message.text}
							</div>
						</div>
					),
				)}
			</div>
			<div className="mt-3 flex gap-2">
				<Button variant="outline" size="sm" className="flex-1" onClick={onDraw} disabled={drawDisabled}>
					Offer draw
				</Button>
				<Button variant="outline" size="sm" className="flex-1" onClick={onSurrender} disabled={surrenderDisabled}>
					Surrender
				</Button>
			</div>
			<form
				className="mt-2 flex gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					onSend();
				}}
			>
				<input
					value={draft}
					onChange={(event) => onDraft(event.target.value)}
					placeholder="Message the enemy…"
					maxLength={200}
					className="min-w-0 flex-1 rounded-[4px] border border-[#2c3a55] bg-[#0b101b] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
				/>
				<Button size="sm" type="submit" disabled={!draft.trim()}>
					Send
				</Button>
			</form>
		</div>
	);
}

export function GameRoom({ gameId }: { gameId: string }) {
	const [pieces, setPieces] = useState<GamePiece[] | null>(null);
	const [turn, setTurn] = useState<Side>("you");
	const [selected, setSelected] = useState<number | null>(null);
	const [lastMove, setLastMove] = useState<number[]>([]);
	const [plies, setPlies] = useState<string[]>([]);
	const [tags, setTags] = useState<Record<number, RankKey>>({});
	const [tagTarget, setTagTarget] = useState<number | null>(null);
	const [messages, setMessages] = useState<Msg[]>([]);
	const [draft, setDraft] = useState("");
	const [chatOpen, setChatOpen] = useState(false);
	const [seen, setSeen] = useState(0);
	const [drawPending, setDrawPending] = useState(false);
	const [confirmSurrender, setConfirmSurrender] = useState(false);
	const [outcome, setOutcome] = useState<{ kind: Outcome; note: string } | null>(null);

	const piecesRef = useRef<GamePiece[]>([]);
	const outcomeRef = useRef(outcome);
	const msgId = useRef(0);
	const timers = useRef<number[]>([]);

	useEffect(() => {
		piecesRef.current = pieces ?? [];
	}, [pieces]);

	useEffect(() => {
		outcomeRef.current = outcome;
	}, [outcome]);

	useEffect(() => {
		if (chatOpen) setSeen(messages.length);
	}, [chatOpen, messages.length]);

	const after = useCallback((ms: number, fn: () => void) => {
		timers.current.push(window.setTimeout(fn, ms));
	}, []);

	const addMsg = useCallback((who: Msg["who"], text: string) => {
		setMessages((current) => [...current, { id: ++msgId.current, who, text }]);
	}, []);

	const reset = useCallback(() => {
		setPieces(makePieces());
		setTurn("you");
		setSelected(null);
		setLastMove([]);
		setPlies([]);
		setTags({});
		setTagTarget(null);
		setDrawPending(false);
		setConfirmSurrender(false);
		setOutcome(null);
		msgId.current = 0;
		setMessages([
			{ id: ++msgId.current, who: "sys", text: `Battle joined — room ${gameId}` },
			{ id: ++msgId.current, who: "foe", text: "Good luck, commander." },
		]);
		setSeen(0);
	}, [gameId]);

	useEffect(() => {
		reset();
		const pending = timers.current;
		return () => pending.forEach(window.clearTimeout);
	}, [reset]);

	const endGame = useCallback(
		(kind: Outcome, note: string) => {
			setOutcome({ kind, note });
			setSelected(null);
			addMsg("sys", note);
		},
		[addMsg],
	);

	const checkOutcome = useCallback((all: GamePiece[]) => {
		const myFlag = all.find((piece) => piece.side === "you" && piece.rank === "FLG");
		const foeFlag = all.find((piece) => piece.side === "foe" && piece.rank === "FLG");
		if (foeFlag && !foeFlag.alive) return { kind: "victory" as Outcome, note: "The enemy flag has fallen." };
		if (myFlag && !myFlag.alive) return { kind: "defeat" as Outcome, note: "Your flag has fallen." };
		if (myFlag?.alive && myFlag.row === 0) return { kind: "victory" as Outcome, note: "Your flag reached the enemy line." };
		if (foeFlag?.alive && foeFlag.row === ROWS - 1) return { kind: "defeat" as Outcome, note: "The enemy flag reached your line." };
		return null;
	}, []);

	// Moves one piece, resolving a clash if the square is held. Returns the notation ply.
	const applyMove = useCallback(
		(attacker: GamePiece, col: number, row: number, target: GamePiece | undefined) => {
			const sq = square(col, row);
			let ply = attacker.side === "you" ? `${attacker.rank} ${sq}` : sq;

			if (!target) {
				setPieces((current) =>
					(current ?? []).map((piece) => (piece.id === attacker.id ? { ...piece, col, row } : piece)),
				);
			} else {
				const losers = battleLosers(attacker.rank, target.rank);
				const dead = new Set<number>();
				if (losers.includes("att")) dead.add(attacker.id);
				if (losers.includes("def")) dead.add(target.id);

				ply = attacker.side === "you" ? `${attacker.rank}×${sq}` : `×${sq}`;
				if (dead.size === 2) ply += "‡";
				else if (dead.has(attacker.id)) ply += "†";

				const myLoss = [attacker, target].find((piece) => dead.has(piece.id) && piece.side === "you");
				if (dead.size === 2) addMsg("sys", `Clash at ${sq} — both pieces fell.`);
				else if (myLoss) addMsg("sys", `Clash at ${sq} — your ${rankByKey.get(myLoss.rank)?.name} fell.`);
				else addMsg("sys", `Clash at ${sq} — the enemy piece fell.`);

				setPieces((current) =>
					(current ?? []).map((piece) => {
						if (dead.has(piece.id)) return { ...piece, alive: false };
						if (piece.id === attacker.id) return { ...piece, col, row };
						return piece;
					}),
				);
			}

			setPlies((current) => [...current, ply]);
			setLastMove([attacker.row * COLS + attacker.col, row * COLS + col]);
		},
		[addMsg],
	);

	const foeAct = useCallback(() => {
		if (outcomeRef.current) return;
		const move = pickFoeMove(piecesRef.current);
		if (move) {
			applyMove(move.piece, move.col, move.row, move.target);
			// piecesRef lags one render; recompute deaths locally for the outcome check.
			const losers = move.target ? battleLosers(move.piece.rank, move.target.rank) : [];
			const next = piecesRef.current.map((piece) => {
				if (move.target && losers.includes("def") && piece.id === move.target.id) return { ...piece, alive: false };
				if (losers.includes("att") && piece.id === move.piece.id) return { ...piece, alive: false };
				if (piece.id === move.piece.id) return { ...piece, col: move.col, row: move.row };
				return piece;
			});
			const result = checkOutcome(next);
			if (result) {
				endGame(result.kind, result.note);
				return;
			}
		}
		setTurn("you");
	}, [applyMove, checkOutcome, endGame]);

	const commitMyMove = useCallback(
		(attacker: GamePiece, col: number, row: number, target: GamePiece | undefined) => {
			applyMove(attacker, col, row, target);
			setSelected(null);

			const losers = target ? battleLosers(attacker.rank, target.rank) : [];
			const next = piecesRef.current.map((piece) => {
				if (target && losers.includes("def") && piece.id === target.id) return { ...piece, alive: false };
				if (losers.includes("att") && piece.id === attacker.id) return { ...piece, alive: false };
				if (piece.id === attacker.id && !losers.includes("att")) return { ...piece, col, row };
				return piece;
			});
			const result = checkOutcome(next);
			if (result) {
				endGame(result.kind, result.note);
				return;
			}

			setTurn("foe");
			after(750, foeAct);
		},
		[after, applyMove, checkOutcome, endGame, foeAct],
	);

	const onCell = (col: number, row: number) => {
		if (!pieces || outcome) return;
		const cell = pieces.find((piece) => piece.alive && piece.col === col && piece.row === row);
		const sel = selected == null ? null : pieces.find((piece) => piece.id === selected && piece.alive);
		const adjacent = sel && Math.abs(sel.col - col) + Math.abs(sel.row - row) === 1;

		if (sel && adjacent && turn === "you" && cell?.side !== "you") {
			commitMyMove(sel, col, row, cell);
			return;
		}
		if (cell?.side === "you") {
			if (turn === "you") setSelected(cell.id === selected ? null : cell.id);
			return;
		}
		if (cell?.side === "foe") {
			setTagTarget(cell.id);
			return;
		}
		setSelected(null);
	};

	const offerDraw = () => {
		if (drawPending || outcome) return;
		setDrawPending(true);
		addMsg("sys", "You offered a draw.");
		after(1600, () => {
			if (outcomeRef.current) return;
			if (Math.random() < 0.25) {
				addMsg("foe", "Agreed. We withdraw.");
				endGame("draw", "Both commanders agreed to withdraw.");
			} else {
				addMsg("foe", "No. We fight on.");
				setDrawPending(false);
			}
		});
	};

	const sendDraft = () => {
		const text = draft.trim();
		if (!text) return;
		addMsg("you", text);
		setDraft("");
	};

	if (!pieces) {
		return (
			<main className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
				<p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#8a93a8]">Preparing battlefield…</p>
			</main>
		);
	}

	const byCell = new Map<number, GamePiece>();
	for (const piece of pieces) if (piece.alive) byCell.set(piece.row * COLS + piece.col, piece);

	const sel = selected == null ? null : pieces.find((piece) => piece.id === selected && piece.alive);
	const targets = new Set<number>();
	if (sel && turn === "you" && !outcome) {
		for (const [dc, dr] of [
			[0, 1],
			[1, 0],
			[-1, 0],
			[0, -1],
		]) {
			const col = sel.col + dc;
			const row = sel.row + dr;
			if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
			if (byCell.get(row * COLS + col)?.side === "you") continue;
			targets.add(row * COLS + col);
		}
	}

	const bySeniority = (a: GamePiece, b: GamePiece) => (rankIndex.get(a.rank) ?? 0) - (rankIndex.get(b.rank) ?? 0);
	const myFallen = pieces.filter((piece) => piece.side === "you" && !piece.alive).sort(bySeniority);
	const foeFallen = pieces.filter((piece) => piece.side === "foe" && !piece.alive);
	const unread = !chatOpen && messages.length > seen;
	const statusText = outcome ? "Battle over" : turn === "you" ? "Your move" : "Enemy thinking…";

	const chatPanel = (
		<ChatPanel
			messages={messages}
			draft={draft}
			onDraft={setDraft}
			onSend={sendDraft}
			onDraw={offerDraw}
			drawDisabled={drawPending || !!outcome}
			onSurrender={() => setConfirmSurrender(true)}
			surrenderDisabled={!!outcome}
		/>
	);

	return (
		<main className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
			<header className="sticky top-0 z-50 flex h-[60px] items-center justify-between gap-4 border-b border-[#1c2740] bg-[#0e1420]/90 px-5 backdrop-blur md:px-12">
				<Link href="/" className="flex min-w-0 items-center gap-2.5">
					<span className="text-[var(--accent)]">★</span>
					<span className="font-display text-lg font-bold uppercase tracking-[0.07em] md:hidden">GoG Online</span>
					<span className="hidden truncate font-display text-xl font-bold uppercase tracking-[0.07em] md:inline">Game of the Generals</span>
				</Link>
				<div className="flex items-center gap-2">
					<span className="max-w-[140px] truncate rounded-[4px] border border-[#2c3a55] bg-[#0b101b] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] sm:max-w-none">
						{gameId}
					</span>
					<Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
						<Link href="/">Home</Link>
					</Button>
				</div>
			</header>

			<section className="mx-auto grid max-w-[1280px] gap-5 px-4 pb-28 pt-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-6 lg:pb-10">
				<div className="mx-auto w-full max-w-[760px] min-w-0">
					<div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
						<span className={`flex items-center gap-2 ${turn === "you" && !outcome ? "text-[#8fae6e]" : "text-[#8a93a8]"}`}>
							<span
								className={`h-2 w-2 rounded-full ${
									outcome ? "bg-[#5b647a]" : turn === "you" ? "bg-[#8fae6e]" : "animate-pulse bg-[var(--accent)]"
								}`}
							/>
							{statusText}
						</span>
						<span className="text-[#5b647a]">
							Fallen {myFallen.length} · Taken {foeFallen.length}
						</span>
					</div>

					<div className="rounded-[8px] border border-[#1c2740] bg-[#0b101b] p-2 sm:p-3">
						<div className="mb-2 flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#44506b]">
							<span>Enemy line</span>
							<span>tap an enemy piece to tag it</span>
						</div>
						<div className="grid grid-cols-9 gap-1">
							{Array.from({ length: COLS * ROWS }).map((_, index) => {
								const col = index % COLS;
								const row = Math.floor(index / COLS);
								const piece = byCell.get(index);
								const isTarget = targets.has(index);
								const isSelected = piece != null && piece.id === selected;
								const sq = square(col, row);
								const label =
									piece?.side === "you"
										? `${rankByKey.get(piece.rank)?.name} at ${sq}`
										: piece?.side === "foe"
											? `Enemy piece at ${sq} — tap to tag your guess`
											: `${sq}${isTarget ? " — move here" : ""}`;

								return (
									<button
										key={index}
										type="button"
										onClick={() => onCell(col, row)}
										aria-label={label}
										className={`relative aspect-square rounded-[4px] border transition-colors ${
											isTarget
												? "border-[rgba(201,168,93,0.55)] bg-[rgba(201,168,93,0.12)]"
												: lastMove.includes(index)
													? "border-[rgba(201,168,93,0.35)] bg-[#121b2c]"
													: "border-[#1c2740] bg-[#121b2c]"
										}`}
									>
										{piece ? (
											<span
												className={`pointer-events-none mx-auto flex h-[74%] w-[86%] items-center justify-center overflow-hidden rounded-[4px] border font-bold leading-none ${
													piece.side === "you"
														? `border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] text-[#0e1420]/75 ${boardGlyphSize(
																rankByKey.get(piece.rank)?.glyph ?? "",
															)} ${isSelected ? "ring-2 ring-[var(--accent)]" : ""}`
														: "border-[#2c3a55] bg-gradient-to-br from-[#253352] to-[#1a2338]"
												}`}
											>
												{piece.side === "you" ? <CompactGlyph glyph={rankByKey.get(piece.rank)?.glyph ?? ""} /> : null}
											</span>
										) : null}
										{piece?.side === "foe" ? <TagBadge tag={tags[piece.id]} /> : null}
									</button>
								);
							})}
						</div>
						<div className="mt-2 flex items-center justify-between gap-2 px-1 font-mono text-[9px] uppercase tracking-[0.2em]">
							<span className="text-[var(--accent)]/70">Your line</span>
							<span className="truncate text-[#44506b]">
								{sel ? `${rankByKey.get(sel.rank)?.name} — pick a square` : ""}
							</span>
						</div>
					</div>

					<Card className="mt-4 p-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<div className="flex items-baseline justify-between gap-2">
									<CardTitle className="text-xl">Your fallen</CardTitle>
									<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8fae6e]">{myFallen.length}</span>
								</div>
								<div className="mt-3 flex flex-wrap gap-1.5">
									{myFallen.length ? (
										myFallen.map((piece) => (
											<span
												key={piece.id}
												title={rankByKey.get(piece.rank)?.name}
												className={`flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#dabb74]/60 bg-gradient-to-br from-[#c9a85d] to-[#a8894a] font-bold leading-none text-[#0e1420]/75 opacity-60 ${boardGlyphSize(
													rankByKey.get(piece.rank)?.glyph ?? "",
												)}`}
											>
												<CompactGlyph glyph={rankByKey.get(piece.rank)?.glyph ?? ""} />
											</span>
										))
									) : (
										<p className="text-xs text-[#5b647a]">No casualties yet.</p>
									)}
								</div>
							</div>
							<div>
								<div className="flex items-baseline justify-between gap-2">
									<CardTitle className="text-xl">Enemy captured</CardTitle>
									<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8fae6e]">{foeFallen.length}</span>
								</div>
								<div className="mt-3 flex flex-wrap gap-1.5">
									{foeFallen.length ? (
										foeFallen.map((piece) => (
											<button
												key={piece.id}
												type="button"
												onClick={() => setTagTarget(piece.id)}
												aria-label="Captured enemy piece — tag your guess"
												className="relative flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#2c3a55] bg-gradient-to-br from-[#253352] to-[#1a2338] transition-colors hover:border-[var(--accent)]"
											>
												<TagBadge tag={tags[piece.id]} />
											</button>
										))
									) : (
										<p className="text-xs text-[#5b647a]">None captured yet. Tap one to tag your guess.</p>
									)}
								</div>
							</div>
						</div>
					</Card>

					<Card className="mt-4 p-4 lg:hidden">
						<div className="flex items-baseline justify-between gap-2">
							<CardTitle className="text-xl">Move log</CardTitle>
							<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b647a]">× clash · † lost · ‡ both</span>
						</div>
						<div className="mt-3">
							<MoveLog plies={plies} compact />
						</div>
					</Card>
				</div>

				<aside className="hidden lg:block">
					<div className="sticky top-[76px] space-y-4">
						<Card className="p-4">
							<div className="flex items-baseline justify-between gap-2">
								<CardTitle className="text-xl">Move log</CardTitle>
								<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b647a]">× clash · † lost · ‡ both</span>
							</div>
							<div className="mt-3">
								<MoveLog plies={plies} />
							</div>
						</Card>
						<Card className="flex h-[min(52dvh,560px)] flex-col p-4">
							<CardTitle className="mb-3 text-xl">Comms</CardTitle>
							{chatPanel}
						</Card>
					</div>
				</aside>
			</section>

			{/* Sticky command bar keeps status and comms reachable on mobile. */}
			<div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1c2740] bg-[#0e1420]/95 px-4 py-3 backdrop-blur lg:hidden">
				<div className="mx-auto flex max-w-[1280px] items-center gap-3">
					<div className="min-w-0 flex-1 font-mono text-[11px] uppercase leading-tight tracking-[0.14em] text-[#8fae6e]">
						{statusText}
						<span className="block text-[9px] tracking-[0.12em] text-[#5b647a]">
							Fallen {myFallen.length} · Taken {foeFallen.length}
						</span>
					</div>
					<Button variant="outline" size="sm" className="relative shrink-0" onClick={() => setChatOpen(true)}>
						Comms
						{unread ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" /> : null}
					</Button>
				</div>
			</div>

			{chatOpen ? (
				<div className="fixed inset-0 z-[70] flex items-end bg-[#05070c]/65 backdrop-blur-sm lg:hidden" onClick={() => setChatOpen(false)}>
					<div
						className="flex max-h-[75dvh] min-h-[55dvh] w-full flex-col rounded-t-[10px] border border-[#2c3a55] bg-[#0e1420] p-4 shadow-[0_-18px_80px_rgba(0,0,0,0.65)]"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="mb-3 flex items-center justify-between gap-3">
							<CardTitle className="text-xl">Comms</CardTitle>
							<Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}>
								Close
							</Button>
						</div>
						{chatPanel}
					</div>
				</div>
			) : null}

			{tagTarget != null ? (
				<div
					className="fixed inset-0 z-[80] flex items-end bg-[#05070c]/65 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
					onClick={() => setTagTarget(null)}
				>
					<div
						className="max-h-[78dvh] w-full overflow-auto rounded-t-[10px] border border-[#2c3a55] bg-[#0e1420] p-4 shadow-[0_-18px_80px_rgba(0,0,0,0.65)] sm:max-w-xl sm:rounded-[10px]"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="mb-4 flex items-center justify-between gap-3">
							<div>
								<div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Tag enemy piece</div>
								<div className="text-sm text-[#8a93a8]">Log your guess. Tags are visible only to you.</div>
							</div>
							<Button variant="ghost" size="sm" onClick={() => setTagTarget(null)}>
								Close
							</Button>
						</div>

						{tags[tagTarget] ? (
							<Button
								variant="outline"
								className="mb-4 w-full"
								onClick={() => {
									setTags((current) => {
										const next = { ...current };
										delete next[tagTarget];
										return next;
									});
									setTagTarget(null);
								}}
							>
								Remove tag ({tags[tagTarget]})
							</Button>
						) : null}

						<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
							{ranks.map((rank) => (
								<button
									key={rank.key}
									type="button"
									onClick={() => {
										setTags((current) => ({ ...current, [tagTarget]: rank.key }));
										setTagTarget(null);
									}}
									className={`rounded-[5px] border p-3 text-left transition-colors active:scale-[0.98] hover:border-[var(--accent)] ${
										tags[tagTarget] === rank.key ? "border-[var(--accent)] bg-[rgba(201,168,93,0.14)]" : "border-[#2c3a55] bg-[#121b2c]"
									}`}
								>
									<div className={`font-bold leading-none text-[var(--accent)] ${rank.glyph.length >= 4 ? "text-[10px]" : rank.glyph.length === 3 ? "text-xs" : "text-base"}`}>
										<CompactGlyph glyph={rank.glyph} />
									</div>
									<div className="mt-2 truncate font-mono text-[8px] uppercase tracking-[0.08em] text-[#8a93a8]">{rank.name}</div>
								</button>
							))}
						</div>
					</div>
				</div>
			) : null}

			{confirmSurrender ? (
				<div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#05070c]/70 p-4 backdrop-blur-sm" onClick={() => setConfirmSurrender(false)}>
					<div
						className="w-full max-w-sm rounded-[10px] border border-[#2c3a55] bg-[#0e1420] p-6 text-center shadow-[0_18px_80px_rgba(0,0,0,0.65)]"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="font-display text-3xl font-extrabold uppercase leading-none">Strike your colors?</div>
						<p className="mt-2 text-sm leading-6 text-[#8a93a8]">This ends the battle as a defeat.</p>
						<div className="mt-5 flex gap-2">
							<Button variant="outline" className="flex-1" onClick={() => setConfirmSurrender(false)}>
								Keep fighting
							</Button>
							<Button
								className="flex-1"
								onClick={() => {
									setConfirmSurrender(false);
									setChatOpen(false);
									endGame("defeat", "You struck your colors.");
								}}
							>
								Surrender
							</Button>
						</div>
					</div>
				</div>
			) : null}

			{outcome ? (
				<div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#05070c]/80 p-4 backdrop-blur-sm">
					<div className="wr-rise w-full max-w-md rounded-[10px] border border-[#2c3a55] bg-[#0e1420] p-8 text-center shadow-[0_18px_80px_rgba(0,0,0,0.65)]">
						<div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">Battle report</div>
						<div className="mt-2 font-display text-6xl font-extrabold uppercase leading-none">{outcome.kind}</div>
						<p className="mt-3 text-sm leading-6 text-[#8a93a8]">{outcome.note}</p>
						<div className="mt-6 grid gap-2">
							<Button onClick={reset}>Rematch</Button>
							<Button variant="outline" asChild>
								<Link href="/play">New setup</Link>
							</Button>
							<Button variant="ghost" asChild>
								<Link href="/">Return home</Link>
							</Button>
						</div>
					</div>
				</div>
			) : null}
		</main>
	);
}
