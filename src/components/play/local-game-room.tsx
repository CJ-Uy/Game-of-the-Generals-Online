"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
	COLS,
	ROWS,
	addMessage,
	applyMove,
	chooseBotMove,
	makeRandomLoadout,
	makeSidePieces,
	ranks,
	resign,
	square,
	toPublicRoom,
	type PlayerSide,
	type PublicPiece,
	type PublicRoom,
	type RankKey,
	type RoomState,
} from "@/lib/game";

export const LOCAL_MATCH_KEY = "gog:local-match:v1";
export const BOT_MATCH_KEY = "gog:bot-match:v1";

const rankByKey = new Map(ranks.map((rank) => [rank.key, rank]));
const rankIndex = new Map(ranks.map((rank, index) => [rank.key, index]));

function boardGlyphSize(glyph: string) {
	if (glyph.length >= 4) return "text-[7px] tracking-normal sm:text-[10px]";
	if (glyph.length === 3) return "text-[9px] sm:text-xs";
	return "text-xs sm:text-base";
}

function CompactGlyph({ glyph }: { glyph: string }) {
	const rows = glyph === "★★★★★" ? ["★★", "★★★"] : glyph === "★★★★" ? ["★★", "★★"] : null;
	return rows ? (
		<span className="flex flex-col items-center justify-center leading-[0.82]">
			{rows.map((row, index) => (
				<span key={index}>{row}</span>
			))}
		</span>
	) : (
		glyph
	);
}

function makeState(gold: unknown, slate: unknown): RoomState | null {
	const goldPieces = makeSidePieces("gold", gold);
	const slatePieces = makeSidePieces("slate", slate);
	if (!goldPieces || !slatePieces) return null;
	return {
		pieces: [...goldPieces, ...slatePieces],
		turn: "gold",
		plies: [],
		messages: [{ id: 1, who: "sys", text: "Both armies are deployed. Gold moves first.", at: Date.now() }],
		nextMessageId: 2,
		outcome: null,
	};
}

export function LocalGameRoom({ mode }: { mode: "local" | "bot" }) {
	const [state, setState] = useState<RoomState | null>(null);
	const [version, setVersion] = useState(1);
	const [viewSide, setViewSide] = useState<PlayerSide>("gold");
	const [handoff, setHandoff] = useState<PlayerSide | null>(null);
	const [selected, setSelected] = useState<number | null>(null);
	const [tags, setTags] = useState<Record<number, RankKey>>({});
	const [tagTarget, setTagTarget] = useState<number | null>(null);
	const [error, setError] = useState("");
	const [botLevel, setBotLevel] = useState("Sergeant");
	const [botThinking, setBotThinking] = useState(false);
	const touchDrag = useRef<{ pieceId: number; pointerId: number; startX: number; startY: number; dragging: boolean } | null>(null);
	const suppressClick = useRef(false);
	const [draggingPiece, setDraggingPiece] = useState<number | null>(null);

	useEffect(() => {
		try {
			const raw = sessionStorage.getItem(mode === "local" ? LOCAL_MATCH_KEY : BOT_MATCH_KEY);
			if (!raw) return;
			const saved = JSON.parse(raw) as { gold?: unknown; slate?: unknown; difficulty?: string };
			setBotLevel(saved.difficulty ?? "Sergeant");
			setState(makeState(saved.gold, mode === "bot" ? makeRandomLoadout() : saved.slate));
		} catch {
			setState(null);
		}
	}, [mode]);

	const room: PublicRoom | null = useMemo(() => (state ? toPublicRoom(mode === "local" ? "PASS & PLAY" : "BOT", state.outcome ? "finished" : "active", version, viewSide, state) : null), [mode, state, version, viewSide]);
	const pieces = useMemo(() => room?.state.pieces ?? [], [room]);
	const byCell = useMemo(() => {
		const next = new Map<number, PublicPiece>();
		for (const piece of pieces) if (piece.alive) next.set(piece.row * COLS + piece.col, piece);
		return next;
	}, [pieces]);

	const myTurn = !!room && !handoff && !botThinking && !room.state.outcome && room.state.turn === viewSide && (mode === "local" || viewSide === "gold");
	const sel = selected == null ? null : pieces.find((piece) => piece.id === selected && piece.alive);
	const targets = new Set<number>();
	if (sel && myTurn) {
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

	const movePiece = (pieceId: number, col: number, row: number) => {
		if (!state || !myTurn) return;
		try {
			const next = applyMove(state, viewSide, pieceId, col, row);
			setState(next);
			setVersion((current) => current + 1);
			setSelected(null);
			setError("");
			if (mode === "local" && !next.outcome) setHandoff(next.turn);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Move rejected.");
		}
	};

	useEffect(() => {
		if (mode !== "bot" || !state || state.turn !== "slate" || state.outcome) return;
		setBotThinking(true);
		const timer = window.setTimeout(() => {
			const move = chooseBotMove(state, "slate", botLevel);
			if (!move) {
				setState(addMessage(resign(state, "slate"), "sys", "Bot had no legal move."));
			} else {
				setState(applyMove(state, "slate", move.pieceId, move.col, move.row));
			}
			setVersion((current) => current + 1);
			setBotThinking(false);
		}, botLevel === "Spy" ? 280 : 520);
		return () => window.clearTimeout(timer);
	}, [botLevel, mode, state]);

	const onCell = (col: number, row: number) => {
		const cell = byCell.get(row * COLS + col);
		const adjacent = sel && Math.abs(sel.col - col) + Math.abs(sel.row - row) === 1;
		if (sel && adjacent && cell?.side !== "you") return movePiece(sel.id, col, row);
		if (cell?.side === "you") {
			if (myTurn) setSelected(cell.id === selected ? null : cell.id);
			return;
		}
		if (cell?.side === "foe") setTagTarget(cell.id);
		else setSelected(null);
	};

	const startDrag = (event: DragEvent, piece?: PublicPiece) => {
		if (!piece || piece.side !== "you" || !myTurn) {
			event.preventDefault();
			return;
		}
		event.dataTransfer.setData("text/plain", String(piece.id));
		event.dataTransfer.effectAllowed = "move";
		setSelected(piece.id);
	};

	const dropOnCell = (event: DragEvent, col: number, row: number) => {
		event.preventDefault();
		const pieceId = Number(event.dataTransfer.getData("text/plain"));
		const piece = pieces.find((item) => item.id === pieceId && item.alive && item.side === "you");
		const target = byCell.get(row * COLS + col);
		if (!piece || target?.side === "you" || Math.abs(piece.col - col) + Math.abs(piece.row - row) !== 1) return;
		movePiece(pieceId, col, row);
	};

	const beginTouchDrag = (event: PointerEvent<HTMLElement>, piece?: PublicPiece) => {
		if (event.pointerType === "mouse") return;
		if (!piece || piece.side !== "you" || !myTurn) return;
		touchDrag.current = { pieceId: piece.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false };
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const moveTouchDrag = (event: PointerEvent<HTMLElement>) => {
		const drag = touchDrag.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		if (!drag.dragging && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) return;
		drag.dragging = true;
		setSelected(drag.pieceId);
		setDraggingPiece(drag.pieceId);
		event.preventDefault();
	};

	const endTouchDrag = (event: PointerEvent<HTMLElement>) => {
		const drag = touchDrag.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		touchDrag.current = null;
		setDraggingPiece(null);
		if (!drag.dragging) return;

		suppressClick.current = true;
		event.preventDefault();
		const cellEl = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-game-cell]");
		const col = Number(cellEl?.dataset.col);
		const row = Number(cellEl?.dataset.row);
		const piece = pieces.find((item) => item.id === drag.pieceId && item.alive && item.side === "you");
		const target = byCell.get(row * COLS + col);
		if (!piece || !myTurn || !Number.isInteger(col) || !Number.isInteger(row) || target?.side === "you" || Math.abs(piece.col - col) + Math.abs(piece.row - row) !== 1) return;
		movePiece(drag.pieceId, col, row);
	};

	const cancelTouchDrag = (event: PointerEvent<HTMLElement>) => {
		const drag = touchDrag.current;
		if (drag?.pointerId !== event.pointerId) return;
		touchDrag.current = null;
		setDraggingPiece(null);
	};

	const bySeniority = (a: PublicPiece, b: PublicPiece) => (rankIndex.get(a.rank ?? "FLG") ?? 0) - (rankIndex.get(b.rank ?? "FLG") ?? 0);
	const myFallen = pieces.filter((piece) => piece.side === "you" && !piece.alive).sort(bySeniority);
	const foeFallen = pieces.filter((piece) => piece.side === "foe" && !piece.alive);
	const statusText = !room ? "Missing setup" : room.state.outcome ? (room.state.outcome.winner === viewSide ? "Victory" : "Defeat") : botThinking ? "Bot thinking" : myTurn ? "Your move" : mode === "local" ? "Handover" : "Enemy move";

	if (!room) {
		return (
			<main className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)] p-4 text-center text-[var(--foreground)]">
				<Card className="max-w-sm p-6">
					<CardTitle>Match setup missing</CardTitle>
					<p className="mt-3 text-sm leading-6 text-[#8a93a8]">Start from the play screen so both armies can deploy.</p>
					<Button asChild className="mt-5">
						<Link href="/play">Back to play</Link>
					</Button>
				</Card>
			</main>
		);
	}

	return (
		<main className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
			<header className="sticky top-0 z-50 flex h-[60px] items-center justify-between gap-4 border-b border-[#1c2740] bg-[#0e1420]/90 px-5 backdrop-blur md:px-12">
				<Link href="/" className="flex min-w-0 items-center gap-2.5">
					<span className="text-[var(--accent)]">★</span>
					<span className="font-display text-lg font-bold uppercase tracking-[0.07em] md:hidden">GoG Online</span>
					<span className="hidden truncate font-display text-xl font-bold uppercase tracking-[0.07em] md:inline">Game of the Generals</span>
				</Link>
				<div className="flex items-center gap-2">
					<span className="rounded-[4px] border border-[#2c3a55] bg-[#0b101b] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
						{mode === "local" ? "Pass & play" : botLevel}
					</span>
					<Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
						<Link href="/play">New match</Link>
					</Button>
				</div>
			</header>

			<section className="mx-auto grid max-w-[1180px] gap-5 px-4 pb-28 pt-5 lg:px-6 lg:pb-10 xl:grid-cols-[minmax(0,1fr)_320px]">
				<div className="mx-auto w-full max-w-[760px] min-w-0">
					<div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
						<span className={`flex items-center gap-2 ${myTurn ? "text-[#8fae6e]" : "text-[#8a93a8]"}`}>
							<span className={`h-2 w-2 rounded-full ${myTurn ? "bg-[#8fae6e]" : "bg-[var(--accent)]"}`} />
							{statusText}
						</span>
						<span className="text-[#5b647a]">
							{viewSide === "gold" ? "Gold" : "Slate"} · Fallen {myFallen.length} · Taken {foeFallen.length}
						</span>
					</div>
					{error ? <div className="mb-3 rounded-[5px] border border-[#7c3f36] bg-[#2b1716] px-3 py-2 text-sm text-[#d98b73]">{error}</div> : null}

					<div className="rounded-[8px] border border-[#1c2740] bg-[#0b101b] p-2 sm:p-3">
						<div className="mb-2 flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#44506b]">
							<span>Slate line</span>
							<span>drag or tap to move</span>
						</div>
						<div className="grid grid-cols-9 gap-1">
							{Array.from({ length: COLS * ROWS }).map((_, index) => {
								const col = index % COLS;
								const row = Math.floor(index / COLS);
								const piece = byCell.get(index);
								const glyph = piece?.rank ? (rankByKey.get(piece.rank)?.glyph ?? "") : "";

								return (
									<button
										key={index}
										type="button"
										data-game-cell
										data-col={col}
										data-row={row}
										draggable={piece?.side === "you" && myTurn}
										onDragStart={(event) => startDrag(event, piece)}
										onDragOver={(event) => myTurn && event.preventDefault()}
										onDrop={(event) => dropOnCell(event, col, row)}
										onPointerDown={(event) => beginTouchDrag(event, piece)}
										onPointerMove={moveTouchDrag}
										onPointerUp={endTouchDrag}
										onPointerCancel={cancelTouchDrag}
										onClick={() => {
											if (suppressClick.current) {
												suppressClick.current = false;
												return;
											}
											onCell(col, row);
										}}
										aria-label={`${square(col, row)}${piece?.side === "you" ? ` ${piece.rank}` : piece ? " enemy" : ""}`}
										className={`relative aspect-square rounded-[4px] border transition-colors ${
											targets.has(index) ? "border-[rgba(201,168,93,0.55)] bg-[rgba(201,168,93,0.12)]" : "border-[#1c2740] bg-[#121b2c]"
										} ${piece?.side === "you" && myTurn ? "touch-none" : ""}`}
									>
										{piece ? (
											<span
												className={`pointer-events-none mx-auto flex h-[74%] w-[86%] items-center justify-center overflow-hidden rounded-[4px] border font-bold leading-none ${
													piece.side === "you"
														? `border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] text-[#0e1420]/75 ${boardGlyphSize(glyph)} ${
																piece.id === selected || draggingPiece === piece.id ? "ring-2 ring-[var(--accent)]" : ""
															}`
														: "border-[#2c3a55] bg-gradient-to-br from-[#253352] to-[#1a2338]"
												}`}
											>
												{piece.side === "you" ? <CompactGlyph glyph={glyph} /> : null}
											</span>
										) : null}
										{piece?.side === "foe" && tags[piece.id] ? (
											<span className="pointer-events-none absolute -right-1 -top-1 z-[3] rounded-[3px] border border-[var(--accent)] bg-[#0e1420] px-1 py-px font-mono text-[8px] leading-[11px] tracking-normal text-[var(--accent)]">
												{tags[piece.id]}
											</span>
										) : null}
									</button>
								);
							})}
						</div>
						<div className="mt-2 flex items-center justify-between gap-2 px-1 font-mono text-[9px] uppercase tracking-[0.2em]">
							<span className="text-[var(--accent)]/70">Gold line</span>
							<span className="truncate text-[#44506b]">{sel?.rank ? `${rankByKey.get(sel.rank)?.name} - pick a square` : ""}</span>
						</div>
					</div>

					<Card className="mt-4 p-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<CardTitle className="text-xl">Your fallen</CardTitle>
								<p className="mt-3 text-sm text-[#8a93a8]">{myFallen.length ? `${myFallen.length} pieces lost.` : "No casualties yet."}</p>
							</div>
							<div>
								<CardTitle className="text-xl">Enemy captured</CardTitle>
								<p className="mt-3 text-sm text-[#8a93a8]">{foeFallen.length ? `${foeFallen.length} hidden pieces captured.` : "None captured yet."}</p>
							</div>
						</div>
					</Card>
				</div>

				<aside className="hidden xl:block">
					<div className="sticky top-[76px] space-y-4">
						<Card className="p-4">
							<CardTitle className="text-xl">Move log</CardTitle>
							<div className="mt-3 max-h-80 overflow-y-auto font-mono text-[11px] leading-6">
								{room.state.plies.length ? room.state.plies.map((ply, index) => <div key={`${ply}-${index}`}>{index + 1}. {ply}</div>) : <p className="font-body text-xs text-[#5b647a]">No moves yet.</p>}
							</div>
						</Card>
						<Card className="p-4">
							<CardTitle className="text-xl">Bot plan</CardTitle>
							<p className="mt-3 text-sm leading-6 text-[#8a93a8]">
								{mode === "bot"
									? botLevel === "Spy"
										? "Spy randomizes its army and chooses random legal moves."
										: "This bot scores captures, flag pressure, center control, and rank trades."
									: "Pass the device after each move. Enemy ranks stay hidden between turns."}
							</p>
						</Card>
					</div>
				</aside>
			</section>

			{handoff ? (
				<div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#05070c]/90 p-4 backdrop-blur-sm">
					<div className="w-full max-w-sm rounded-[10px] border border-[#2c3a55] bg-[#0e1420] p-7 text-center">
						<div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">Pass device</div>
						<div className="mt-2 font-display text-4xl font-extrabold uppercase">{handoff === "gold" ? "Gold" : "Slate"}</div>
						<Button className="mt-6 w-full" onClick={() => { setViewSide(handoff); setHandoff(null); }}>
							Start turn
						</Button>
					</div>
				</div>
			) : null}

			{tagTarget != null ? (
				<div className="fixed inset-0 z-[80] flex items-end bg-[#05070c]/65 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" onClick={() => setTagTarget(null)}>
					<div className="max-h-[78dvh] w-full overflow-auto rounded-t-[10px] border border-[#2c3a55] bg-[#0e1420] p-4 sm:max-w-xl sm:rounded-[10px]" onClick={(event) => event.stopPropagation()}>
						<div className="mb-4 flex items-center justify-between gap-3">
							<div>
								<div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Tag enemy piece</div>
								<div className="text-sm text-[#8a93a8]">Tags are visible only to you.</div>
							</div>
							<Button variant="ghost" size="sm" onClick={() => setTagTarget(null)}>Close</Button>
						</div>
						<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
							{ranks.map((rank) => (
								<button key={rank.key} type="button" onClick={() => { setTags((current) => ({ ...current, [tagTarget]: rank.key })); setTagTarget(null); }} className="rounded-[5px] border border-[#2c3a55] bg-[#121b2c] p-3 text-left transition-colors hover:border-[var(--accent)]">
									<div className="font-bold leading-none text-[var(--accent)]"><CompactGlyph glyph={rank.glyph} /></div>
									<div className="mt-2 truncate font-mono text-[8px] uppercase tracking-[0.08em] text-[#8a93a8]">{rank.name}</div>
								</button>
							))}
						</div>
					</div>
				</div>
			) : null}

			{room.state.outcome ? (
				<div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#05070c]/80 p-4 backdrop-blur-sm">
					<div className="w-full max-w-md rounded-[10px] border border-[#2c3a55] bg-[#0e1420] p-8 text-center">
						<div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">Battle report</div>
						<div className="mt-2 font-display text-6xl font-extrabold uppercase leading-none">{statusText}</div>
						<p className="mt-3 text-sm leading-6 text-[#8a93a8]">{room.state.outcome.note}</p>
						<Button asChild className="mt-6"><Link href="/play">New match</Link></Button>
					</div>
				</div>
			) : null}
		</main>
	);
}
