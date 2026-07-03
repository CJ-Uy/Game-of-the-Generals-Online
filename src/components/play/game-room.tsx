"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { LocalGameRoom } from "@/components/play/local-game-room";
import { COLS, ROWS, ranks, square, type PublicPiece, type PublicRoom, type RankKey, type RoomMessage } from "@/lib/game";

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

function TagBadge({ tag }: { tag?: RankKey }) {
	if (!tag) return null;
	return (
		<span className="pointer-events-none absolute -right-1 -top-1 z-[3] rounded-[3px] border border-[var(--accent)] bg-[#0e1420] px-1 py-px font-mono text-[8px] leading-[11px] tracking-normal text-[var(--accent)]">
			{tag}
		</span>
	);
}

function MoveLog({ plies }: { plies: string[] }) {
	return (
		<div className="max-h-44 overflow-y-auto font-mono text-[11px] leading-6">
			{plies.length ? (
				plies.map((ply, index) => (
					<div key={`${ply}-${index}`} className={`grid grid-cols-[2.2em_1fr] px-1 ${index % 2 ? "" : "bg-[#0b101b]"}`}>
						<span className="text-[#5b647a]">{index + 1}</span>
						<span className="text-[#ede8da]">{ply}</span>
					</div>
				))
			) : (
				<p className="px-1 font-body text-xs text-[#5b647a]">No moves yet.</p>
			)}
		</div>
	);
}

function ChatPanel({
	messages,
	side,
	draft,
	onDraft,
	onSend,
	onSurrender,
	disabled,
}: {
	messages: RoomMessage[];
	side: PublicRoom["side"];
	draft: string;
	onDraft: (value: string) => void;
	onSend: () => void;
	onSurrender: () => void;
	disabled: boolean;
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
						<div key={message.id} className={`flex ${message.who === side ? "justify-end" : "justify-start"}`}>
							<div
								className={`max-w-[85%] rounded-[6px] border px-2.5 py-1.5 text-sm leading-5 ${
									message.who === side
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
			<Button variant="outline" size="sm" className="mt-3 w-full" onClick={onSurrender} disabled={disabled}>
				Surrender
			</Button>
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
					placeholder="Message the enemy..."
					maxLength={200}
					className="min-w-0 flex-1 rounded-[4px] border border-[#2c3a55] bg-[#0b101b] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
				/>
				<Button size="sm" type="submit" disabled={disabled || !draft.trim()}>
					Send
				</Button>
			</form>
		</div>
	);
}

export function GameRoom({ gameId }: { gameId: string }) {
	if (gameId === "local" || gameId === "bot") return <LocalGameRoom mode={gameId} />;
	return <OnlineGameRoom gameId={gameId} />;
}

function OnlineGameRoom({ gameId }: { gameId: string }) {
	const code = gameId.toUpperCase();
	const [token, setToken] = useState("");
	const [room, setRoom] = useState<PublicRoom | null>(null);
	const [error, setError] = useState("");
	const [selected, setSelected] = useState<number | null>(null);
	const [tags, setTags] = useState<Record<number, RankKey>>({});
	const [tagTarget, setTagTarget] = useState<number | null>(null);
	const [draft, setDraft] = useState("");
	const [chatOpen, setChatOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [live, setLive] = useState(false);
	const touchDrag = useRef<{ pieceId: number; pointerId: number; startX: number; startY: number; dragging: boolean } | null>(null);
	const suppressClick = useRef(false);
	const [draggingPiece, setDraggingPiece] = useState<number | null>(null);

	useEffect(() => {
		setToken(sessionStorage.getItem(`gog:room:${code}:token`) ?? "");
	}, [code]);

	const load = useCallback(async () => {
		if (!token) return;
		const response = await fetch(`/api/rooms/${code}?token=${token}`, { cache: "no-store" });
		const payload = (await response.json()) as PublicRoom | { error?: string };
		if (!response.ok) {
			setError("error" in payload ? (payload.error ?? "Could not load room.") : "Could not load room.");
			return;
		}
		setRoom(payload as PublicRoom);
		setError("");
	}, [code, token]);

	useEffect(() => {
		void load();
		const timer = window.setInterval(() => void load(), live ? 10000 : 1400);
		return () => window.clearInterval(timer);
	}, [load, live]);

	useEffect(() => {
		if (!token || window.location.hostname !== "gogo.cjuy.dev") return;
		let socket: WebSocket | null = null;
		let reconnect = 0;
		let closed = false;

		const connect = () => {
			const url = new URL(`/rooms/${encodeURIComponent(code)}`, "https://sync.gogo.cjuy.dev");
			url.protocol = window.location.protocol === "http:" ? "ws:" : "wss:";
			url.searchParams.set("token", token);
			socket = new WebSocket(url);
			socket.onopen = () => setLive(true);
			socket.onmessage = (event) => {
				if (event.data !== "pong") void load();
			};
			socket.onclose = () => {
				setLive(false);
				if (!closed) reconnect = window.setTimeout(connect, 1800);
			};
			socket.onerror = () => socket?.close();
		};

		connect();
		return () => {
			closed = true;
			setLive(false);
			window.clearTimeout(reconnect);
			socket?.close();
		};
	}, [code, load, token]);

	const act = async (body: Record<string, unknown>) => {
		if (!token || busy) return;
		setBusy(true);
		try {
			const response = await fetch(`/api/rooms/${code}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token, ...body }),
			});
			const payload = (await response.json()) as PublicRoom | { error?: string };
			if (!response.ok) throw new Error("error" in payload ? payload.error : "Action failed.");
			setRoom(payload as PublicRoom);
			setSelected(null);
			setError("");
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Action failed.");
		} finally {
			setBusy(false);
		}
	};

	const sendDraft = () => {
		const text = draft.trim();
		if (!text) return;
		setDraft("");
		void act({ action: "chat", text });
	};

	const pieces = useMemo(() => room?.state.pieces ?? [], [room]);
	const byCell = useMemo(() => {
		const next = new Map<number, PublicPiece>();
		for (const piece of pieces) if (piece.alive) next.set(piece.row * COLS + piece.col, piece);
		return next;
	}, [pieces]);

	const myTurn = room?.status === "active" && !room.state.outcome && room.state.turn === room.side;
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

	const onCell = (col: number, row: number) => {
		if (!room || busy) return;
		const cell = byCell.get(row * COLS + col);
		const adjacent = sel && Math.abs(sel.col - col) + Math.abs(sel.row - row) === 1;
		if (sel && adjacent && myTurn && cell?.side !== "you") {
			void act({ action: "move", pieceId: sel.id, col, row });
			return;
		}
		if (cell?.side === "you") {
			if (myTurn) setSelected(cell.id === selected ? null : cell.id);
			return;
		}
		if (cell?.side === "foe") setTagTarget(cell.id);
		else setSelected(null);
	};

	const startDrag = (event: DragEvent, piece?: PublicPiece) => {
		if (!piece || piece.side !== "you" || !myTurn || busy) {
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
		if (!piece || !myTurn || target?.side === "you" || Math.abs(piece.col - col) + Math.abs(piece.row - row) !== 1) return;
		void act({ action: "move", pieceId, col, row });
	};

	const beginTouchDrag = (event: PointerEvent<HTMLElement>, piece?: PublicPiece) => {
		if (event.pointerType === "mouse") return;
		if (!piece || piece.side !== "you" || !myTurn || busy) return;
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
		void act({ action: "move", pieceId: drag.pieceId, col, row });
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
	const statusText = !room
		? "Loading room"
		: room.status === "waiting"
			? "Waiting for opponent"
			: room.state.outcome
				? room.state.outcome.winner === room.side
					? "Victory"
					: room.state.outcome.winner === "draw"
						? "Draw"
						: "Defeat"
				: myTurn
					? "Your move"
					: "Enemy move";

	if (!token) {
		return (
			<main className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)] p-4 text-center text-[var(--foreground)]">
				<Card className="max-w-sm p-6">
					<CardTitle>Room token missing</CardTitle>
					<p className="mt-3 text-sm leading-6 text-[#8a93a8]">Create or join the lobby from this browser before opening the room.</p>
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
						{code}
					</span>
					<Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
						<Link href="/play">New room</Link>
					</Button>
				</div>
			</header>

			<section className="mx-auto grid max-w-[1280px] gap-5 px-4 pb-28 pt-5 lg:px-6 lg:pb-10 xl:grid-cols-[minmax(0,1fr)_340px]">
				<div className="mx-auto w-full max-w-[760px] min-w-0">
					<div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
						<span className={`flex items-center gap-2 ${myTurn ? "text-[#8fae6e]" : "text-[#8a93a8]"}`}>
							<span className={`h-2 w-2 rounded-full ${myTurn ? "bg-[#8fae6e]" : "bg-[var(--accent)]"}`} />
							{statusText}
						</span>
						<span className="text-[#5b647a]">
							{live ? "Live" : "Sync"} · {room?.side === "gold" ? "Gold" : "Slate"} · Fallen {myFallen.length} · Taken {foeFallen.length}
						</span>
					</div>
					{error ? <div className="mb-3 rounded-[5px] border border-[#7c3f36] bg-[#2b1716] px-3 py-2 text-sm text-[#d98b73]">{error}</div> : null}

					<div className="rounded-[8px] border border-[#1c2740] bg-[#0b101b] p-2 sm:p-3">
						<div className="mb-2 flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#44506b]">
							<span>Slate line</span>
							<span>tap an enemy piece to tag it</span>
						</div>
						<div className="grid grid-cols-9 gap-1">
							{Array.from({ length: COLS * ROWS }).map((_, index) => {
								const col = index % COLS;
								const row = Math.floor(index / COLS);
								const piece = byCell.get(index);
								const isTarget = targets.has(index);
								const isSelected = piece != null && piece.id === selected;
								const glyph = piece?.rank ? (rankByKey.get(piece.rank)?.glyph ?? "") : "";

								return (
									<button
										key={index}
										type="button"
										data-game-cell
										data-col={col}
										data-row={row}
										draggable={piece?.side === "you" && myTurn && !busy}
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
											isTarget
												? "border-[rgba(201,168,93,0.55)] bg-[rgba(201,168,93,0.12)]"
												: "border-[#1c2740] bg-[#121b2c]"
										} ${piece?.side === "you" && myTurn ? "touch-none" : ""}`}
									>
										{piece ? (
											<span
												className={`pointer-events-none mx-auto flex h-[74%] w-[86%] items-center justify-center overflow-hidden rounded-[4px] border font-bold leading-none ${
													piece.side === "you"
														? `border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] text-[#0e1420]/75 ${boardGlyphSize(glyph)} ${
																isSelected || draggingPiece === piece.id ? "ring-2 ring-[var(--accent)]" : ""
															}`
														: "border-[#2c3a55] bg-gradient-to-br from-[#253352] to-[#1a2338]"
												}`}
											>
												{piece.side === "you" ? <CompactGlyph glyph={glyph} /> : null}
											</span>
										) : null}
										{piece?.side === "foe" ? <TagBadge tag={tags[piece.id]} /> : null}
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
								<div className="mt-3 flex flex-wrap gap-1.5">
									{myFallen.length ? (
										myFallen.map((piece) => {
											const glyph = piece.rank ? (rankByKey.get(piece.rank)?.glyph ?? "") : "";
											return (
												<span
													key={piece.id}
													className={`flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#dabb74]/60 bg-gradient-to-br from-[#c9a85d] to-[#a8894a] font-bold leading-none text-[#0e1420]/75 opacity-60 ${boardGlyphSize(glyph)}`}
												>
													<CompactGlyph glyph={glyph} />
												</span>
											);
										})
									) : (
										<p className="text-xs text-[#5b647a]">No casualties yet.</p>
									)}
								</div>
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
							<div className="flex items-baseline justify-between gap-2">
								<CardTitle className="text-xl">Move log</CardTitle>
								<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b647a]">x clash</span>
							</div>
							<div className="mt-3">
								<MoveLog plies={room?.state.plies ?? []} />
							</div>
						</Card>
						<Card className="flex h-[min(52dvh,560px)] flex-col p-4">
							<CardTitle className="mb-3 text-xl">Comms</CardTitle>
							<ChatPanel
								messages={room?.state.messages ?? []}
								side={room?.side ?? "gold"}
								draft={draft}
								onDraft={setDraft}
								onSend={sendDraft}
								onSurrender={() => void act({ action: "resign" })}
								disabled={busy || !!room?.state.outcome}
							/>
						</Card>
					</div>
				</aside>
			</section>

			<div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1c2740] bg-[#0e1420]/95 px-4 py-3 backdrop-blur xl:hidden">
				<div className="mx-auto flex max-w-[1280px] items-center gap-3">
					<div className="min-w-0 flex-1 font-mono text-[11px] uppercase leading-tight tracking-[0.14em] text-[#8fae6e]">
						{statusText}
						<span className="block text-[9px] tracking-[0.12em] text-[#5b647a]">
							Fallen {myFallen.length} · Taken {foeFallen.length}
						</span>
					</div>
					<Button variant="outline" size="sm" className="relative shrink-0" onClick={() => setChatOpen(true)}>
						Comms
					</Button>
				</div>
			</div>

			{chatOpen ? (
				<div className="fixed inset-0 z-[70] flex items-end bg-[#05070c]/65 backdrop-blur-sm xl:hidden" onClick={() => setChatOpen(false)}>
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
						<ChatPanel
							messages={room?.state.messages ?? []}
							side={room?.side ?? "gold"}
							draft={draft}
							onDraft={setDraft}
							onSend={sendDraft}
							onSurrender={() => void act({ action: "resign" })}
							disabled={busy || !!room?.state.outcome}
						/>
					</div>
				</div>
			) : null}

			{tagTarget != null ? (
				<div className="fixed inset-0 z-[80] flex items-end bg-[#05070c]/65 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" onClick={() => setTagTarget(null)}>
					<div
						className="max-h-[78dvh] w-full overflow-auto rounded-t-[10px] border border-[#2c3a55] bg-[#0e1420] p-4 shadow-[0_-18px_80px_rgba(0,0,0,0.65)] sm:max-w-xl sm:rounded-[10px]"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="mb-4 flex items-center justify-between gap-3">
							<div>
								<div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Tag enemy piece</div>
								<div className="text-sm text-[#8a93a8]">Tags are visible only to you.</div>
							</div>
							<Button variant="ghost" size="sm" onClick={() => setTagTarget(null)}>
								Close
							</Button>
						</div>

						<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
							{ranks.map((rank) => (
								<button
									key={rank.key}
									type="button"
									onClick={() => {
										setTags((current) => ({ ...current, [tagTarget]: rank.key }));
										setTagTarget(null);
									}}
									className="rounded-[5px] border border-[#2c3a55] bg-[#121b2c] p-3 text-left transition-colors active:scale-[0.98] hover:border-[var(--accent)]"
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

			{room?.state.outcome ? (
				<div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#05070c]/80 p-4 backdrop-blur-sm">
					<div className="wr-rise w-full max-w-md rounded-[10px] border border-[#2c3a55] bg-[#0e1420] p-8 text-center shadow-[0_18px_80px_rgba(0,0,0,0.65)]">
						<div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">Battle report</div>
						<div className="mt-2 font-display text-6xl font-extrabold uppercase leading-none">{statusText}</div>
						<p className="mt-3 text-sm leading-6 text-[#8a93a8]">{room.state.outcome.note}</p>
						<Button asChild className="mt-6">
							<Link href="/play">New room</Link>
						</Button>
					</div>
				</div>
			) : null}
		</main>
	);
}
