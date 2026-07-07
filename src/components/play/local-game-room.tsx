"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
	ArbiterChip,
	CompactGlyph,
	CommandChain,
	CapturedGuessTiles,
	GuessBadge,
	GuessPicker,
	PieceClashPreview,
	type GuessTag,
	boardGlyphSize,
	boardIndex,
	formatPlyForView,
	parseLastMove,
	rankByKey,
	rankIndex,
	toBoardCell,
	viewSquare,
} from "@/components/play/board-view";
import {
	COLS,
	ROWS,
	addMessage,
	applyMove,
	chooseBotMove,
	makeRandomLoadout,
	makeSidePieces,
	resign,
	toPublicRoom,
	type PlayerSide,
	type PublicPiece,
	type PublicRoom,
	type RoomState,
} from "@/lib/game";

function animateBoard(update: () => void) {
	const viewTransition = (document as Document & { startViewTransition?: (callback: () => void) => void }).startViewTransition;
	if (viewTransition) viewTransition.call(document, () => flushSync(update));
	else update();
}

export const LOCAL_MATCH_KEY = "gog:local-match:v1";
export const BOT_MATCH_KEY = "gog:bot-match:v1";

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
	const [tags, setTags] = useState<Record<number, GuessTag>>({});
	const [tagTarget, setTagTarget] = useState<number | null>(null);
	const [error, setError] = useState("");
	const [botLevel, setBotLevel] = useState("Sergeant");
	const [botThinking, setBotThinking] = useState(false);
	const [arbiterCell, setArbiterCell] = useState<{ col: number; row: number; key: number } | null>(null);
	const [clashPreview, setClashPreview] = useState<{ col: number; row: number; attacker: PublicPiece; defender: PublicPiece } | null>(null);
	const arbiterTimer = useRef<number | null>(null);
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

	useEffect(() => () => {
		if (arbiterTimer.current) window.clearTimeout(arbiterTimer.current);
	}, []);

	const showArbiter = (col: number, row: number, attacker?: PublicPiece, defender?: PublicPiece) => {
		if (arbiterTimer.current) window.clearTimeout(arbiterTimer.current);
		setArbiterCell({ col, row, key: Date.now() });
		setClashPreview(attacker && defender ? { col, row, attacker, defender } : null);
		arbiterTimer.current = window.setTimeout(() => {
			setArbiterCell(null);
			setClashPreview(null);
		}, 850);
	};

	const room: PublicRoom | null = useMemo(() => (state ? toPublicRoom(mode === "local" ? "PASS & PLAY" : "BOT", state.outcome ? "finished" : "active", version, viewSide, state) : null), [mode, state, version, viewSide]);
	const pieces = useMemo(() => room?.state.pieces ?? [], [room]);
	const byCell = useMemo(() => {
		const next = new Map<number, PublicPiece>();
		for (const piece of pieces) if (piece.alive) next.set(piece.row * COLS + piece.col, piece);
		return next;
	}, [pieces]);

	const myTurn = !!room && !handoff && !botThinking && !room.state.outcome && room.state.turn === viewSide && (mode === "local" || viewSide === "gold");
	const sel = selected == null ? null : pieces.find((piece) => piece.id === selected && piece.alive);
	const lastMove = parseLastMove(room?.state.plies ?? []);
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
			const attacker = pieces.find((piece) => piece.id === pieceId && piece.alive && piece.side === "you");
			const defender = pieces.find((piece) => piece.alive && piece.side !== "you" && piece.col === col && piece.row === row);
			if (attacker && defender) showArbiter(col, row, attacker, defender);
			const next = applyMove(state, viewSide, pieceId, col, row);
			animateBoard(() => setState(next));
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
			try {
				const move = chooseBotMove(state, "slate", botLevel);
				if (!move) {
					animateBoard(() => setState(addMessage(resign(state, "slate"), "sys", "Bot had no legal move.")));
				} else {
					const publicPieces = toPublicRoom("BOT", "active", 0, viewSide, state).state.pieces;
					const attacker = publicPieces.find((piece) => piece.id === move.pieceId && piece.alive);
					const defender = publicPieces.find((piece) => piece.alive && piece.col === move.col && piece.row === move.row);
					if (attacker && defender) showArbiter(move.col, move.row, attacker, defender);
					animateBoard(() => setState(applyMove(state, "slate", move.pieceId, move.col, move.row)));
				}
				setVersion((current) => current + 1);
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : "Bot move failed.");
			} finally {
				setBotThinking(false);
			}
		}, botLevel === "Spy" ? 280 : 520);
		return () => window.clearTimeout(timer);
	}, [botLevel, mode, state, viewSide]);

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
	const statusTone = !room ? "border-[#2c3a55] bg-[#0b101b] text-[#8a93a8]" : room.state.outcome ? "border-[var(--accent)] bg-[rgba(201,168,93,0.12)] text-[var(--accent)]" : myTurn ? "border-[#8fae6e] bg-[rgba(143,174,110,0.12)] text-[#8fae6e]" : "border-[#7c3f36] bg-[rgba(124,63,54,0.18)] text-[#d98b73]";

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

			<section className="mx-auto grid max-w-[1360px] gap-5 px-4 pb-28 pt-5 lg:px-6 lg:pb-10 xl:grid-cols-[260px_minmax(0,760px)_300px]">
				<aside className="hidden xl:block">
					<div className="sticky top-[76px]">
						<Card className="p-4">
							<CommandChain activeRank={sel?.rank} />
						</Card>
					</div>
				</aside>
				<div className="mx-auto w-full max-w-[760px] min-w-0">
					<div className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[6px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] ${statusTone}`}>
						<span className="flex items-center gap-2">
							<span className={`h-2 w-2 rounded-full ${myTurn ? "bg-[#8fae6e]" : "bg-[var(--accent)]"}`} />
							{statusText}
						</span>
						<span className="text-[#8a93a8]">
							{room.state.outcome ? room.state.outcome.note : `${viewSide === "gold" ? "Gold" : "Slate"} · Fallen ${myFallen.length} · Taken ${foeFallen.length}`}
						</span>
					</div>
					{error ? <div className="mb-3 rounded-[5px] border border-[#7c3f36] bg-[#2b1716] px-3 py-2 text-sm text-[#d98b73]">{error}</div> : null}

					<div className="rounded-[8px] border border-[#1c2740] bg-[#0b101b] p-2 sm:p-3">
						<div className="mb-2 flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#44506b]">
							<span>{viewSide === "slate" ? "Gold line" : "Slate line"}</span>
							<span>drag or tap to move</span>
						</div>
						<div className="grid grid-cols-[1.25rem_repeat(9,minmax(0,1fr))] gap-1">
							{Array.from({ length: ROWS }).map((_, viewRow) => (
								<Fragment key={viewRow}>
									<div className="flex items-center justify-center font-mono text-[9px] text-[#5b647a]">{viewSquare(viewSide, 0, viewRow).slice(1)}</div>
									{Array.from({ length: COLS }).map((__, viewCol) => {
										const { col, row } = toBoardCell(viewSide, viewCol, viewRow);
										const index = boardIndex(col, row);
										const piece = byCell.get(index);
										const isLastFrom = lastMove?.from.col === col && lastMove.from.row === row;
										const isLastTo = lastMove?.to.col === col && lastMove.to.row === row;
										const lastMine = lastMove?.side === viewSide;
										const isArbiterTo = arbiterCell?.col === col && arbiterCell.row === row;
										const isClashTo = clashPreview?.col === col && clashPreview.row === row;
								const showRank = piece?.side === "you" || !!room.state.outcome;
								const glyph = showRank && piece?.rank ? (rankByKey.get(piece.rank)?.glyph ?? "") : "";

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
											aria-label={`${viewSquare(viewSide, viewCol, viewRow)}${piece?.side === "you" ? ` ${piece.rank}` : piece ? " enemy" : ""}`}
										className={`relative aspect-square rounded-[4px] border transition-colors ${
											targets.has(index)
												? "border-[rgba(201,168,93,0.55)] bg-[rgba(201,168,93,0.12)]"
													: isLastFrom || isLastTo
													? `${lastMine ? "border-[#8fae6e]" : "border-[#d98b73]"} bg-[rgba(143,174,110,0.12)]`
													: (viewCol + viewRow) % 2 === 0
														? "border-[var(--board-border)] bg-[var(--board-light)]"
														: "border-[var(--board-border)] bg-[var(--board-dark)]"
										} ${piece?.side === "you" && myTurn ? "touch-none" : ""}`}
									>
										{isClashTo && clashPreview ? (
											<PieceClashPreview attacker={clashPreview.attacker} defender={clashPreview.defender} />
										) : piece ? (
											<span
												style={{ viewTransitionName: `piece-${piece.id}` } as CSSProperties}
												className={`pointer-events-none mx-auto flex h-[74%] w-[86%] items-center justify-center overflow-hidden rounded-[4px] border font-bold leading-none ${
													piece.side === "you"
														? `border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] text-[#0e1420]/75 ${boardGlyphSize(glyph)} ${
																piece.id === selected || draggingPiece === piece.id ? "ring-2 ring-[var(--accent)]" : ""
															}`
														: showRank
															? `border-[#50658a] bg-gradient-to-br from-[#314a79] to-[#203257] text-[#d8e3f4] ${boardGlyphSize(glyph)}`
															: "border-[#50658a] bg-gradient-to-br from-[#314a79] to-[#203257]"
												}`}
											>
												{showRank && glyph ? <CompactGlyph glyph={glyph} /> : null}
											</span>
										) : null}
										{isArbiterTo ? <ArbiterChip key={arbiterCell?.key} /> : null}
										{piece?.side === "foe" && !isClashTo && !room.state.outcome ? <GuessBadge tag={tags[piece.id]} /> : null}
									</button>
								);
									})}
								</Fragment>
							))}
							<div />
							{Array.from({ length: COLS }).map((_, viewCol) => (
								<div key={viewCol} className="text-center font-mono text-[9px] uppercase text-[#5b647a]">
									{viewSquare(viewSide, viewCol, ROWS - 1)[0]}
								</div>
							))}
						</div>
						<div className="mt-2 flex items-center justify-between gap-2 px-1 font-mono text-[9px] uppercase tracking-[0.2em]">
							<span className="text-[var(--accent)]/70">{viewSide === "slate" ? "Slate line" : "Gold line"}</span>
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
								<CapturedGuessTiles pieces={foeFallen} tags={tags} onTag={setTagTarget} />
							</div>
						</div>
					</Card>
					<Card className="mt-4 p-4 xl:hidden">
						<CommandChain activeRank={sel?.rank} />
					</Card>
				</div>

				<aside className="hidden xl:block">
					<div className="sticky top-[76px] space-y-4">
						<Card className="p-4">
							<CardTitle className="text-xl">Move log</CardTitle>
							<div className="mt-3 max-h-80 overflow-y-auto font-mono text-[11px] leading-6">
								{room.state.plies.length ? [...room.state.plies].reverse().map((ply, index) => <div key={`${ply}-${index}`}>{room.state.plies.length - index}. {formatPlyForView(ply, viewSide)}</div>) : <p className="font-body text-xs text-[#5b647a]">No moves yet.</p>}
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
					<div className="wr-rise max-h-[78dvh] w-full overflow-auto rounded-t-[10px] border border-[#2c3a55] bg-[#0e1420] p-4 sm:max-w-xl sm:rounded-[10px]" onClick={(event) => event.stopPropagation()}>
						<div className="mb-4 flex items-center justify-between gap-3">
							<div>
								<div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Tag enemy piece</div>
								<div className="text-sm text-[#8a93a8]">Tags are visible only to you.</div>
							</div>
							<Button variant="ghost" size="sm" onClick={() => setTagTarget(null)}>Close</Button>
						</div>
						<GuessPicker
							selected={tags[tagTarget]}
							onPick={(tag) => {
								setTags((current) => {
									const next = { ...current };
									if (next[tagTarget] === tag) delete next[tagTarget];
									else next[tagTarget] = tag;
									return next;
								});
								setTagTarget(null);
							}}
						/>
					</div>
				</div>
			) : null}
		</main>
	);
}
