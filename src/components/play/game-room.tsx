"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { LocalGameRoom } from "@/components/play/local-game-room";
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
	cellLabel,
	formatPlyForView,
	parseLastMove,
	rankByKey,
	rankIndex,
	toBoardCell,
	viewSquare,
} from "@/components/play/board-view";
import { AppHeader } from "@/components/app-header";
import { Sheet } from "@/components/ui/sheet";
import { MoveDot, Piece } from "@/components/game/piece";
import { PlayerRail } from "@/components/game/player-rail";
import { MatchResult } from "@/components/game/match-result";
import { MatchMenu } from "@/components/game/match-menu";
import { CoachLine, useCoachLevel } from "@/components/game/coach";
import { useBoardKeys } from "@/components/game/use-board-keys";
import { RankReference } from "@/components/game/rank-reference";
import { IconCopy, IconHelp, IconMenu, IconSpinner } from "@/components/ui/icons";
import { COLS, FILES, ROWS, battleLosers, oppositeSide, square, type PlayerSide, type PublicPiece, type PublicRoom, type RoomMessage } from "@/lib/game";

/**
 * Reads the last ply plus the board to work out what just happened in a fight.
 *
 * The server never sends enemy ranks mid-match, so this can only report the
 * shape of the clash — who died — never what the enemy piece was. That is the
 * same information a player gets at a real table from the arbiter.
 */
function readLastClash(plies: string[], side: PlayerSide, byCell: Map<number, PublicPiece>) {
	const ply = plies.at(-1);
	if (!ply?.includes("x")) return undefined;

	const move = parseLastMove(plies);
	if (!move) return undefined;

	const byYou = move.side === side;
	const survivor = byCell.get(move.to.row * COLS + move.to.col);

	// An empty contested square means equal ranks and both pieces died.
	if (!survivor) return { byYou, youLost: true, theyLost: true };

	const yoursSurvived = survivor.side === "you";
	return { byYou, yourRank: yoursSurvived ? survivor.rank : undefined, youLost: !yoursSurvived, theyLost: yoursSurvived };
}

const QUICK_LINES = ["Good luck", "Nice move", "Take your time", "Good game", "Rematch?", "Sorry"];

function RoomNotice({
	code,
	title,
	body,
	action,
}: {
	code: string;
	title: string;
	body: string;
	action: { href: string; label: string };
}) {
	return (
		<main className="flex min-h-[100dvh] flex-col bg-[var(--background)] text-[var(--foreground)]">
			<AppHeader />
			<div className="flex flex-1 items-center px-5 py-16">
				<div className="mx-auto w-full max-w-md">
					<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Room {code}</p>
					<h1 className="mt-2 font-display text-[clamp(32px,7vw,52px)] font-bold uppercase leading-[0.95]">{title}</h1>
					<p className="mt-3 text-[15px] leading-7 text-[var(--ink-muted)]">{body}</p>
					<Button asChild className="mt-6">
						<Link href={action.href}>{action.label}</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}

function animateBoard(update: () => void) {
	const viewTransition = (document as Document & { startViewTransition?: (callback: () => void) => void }).startViewTransition;
	if (viewTransition) viewTransition.call(document, () => flushSync(update));
	else update();
}

function MoveLog({ plies, side }: { plies: string[]; side: PublicRoom["side"] }) {
	return (
		<div className="max-h-44 overflow-y-auto font-mono text-[11px] leading-6">
			{plies.length ? (
				plies.map((ply, index) => (
					<div key={`${ply}-${index}`} className={`grid grid-cols-[2.2em_1fr] px-1 ${index % 2 ? "" : "bg-[#0b101b]"}`}>
						<span className="text-[#5b647a]">{plies.length - index}</span>
						<span className="text-[#ede8da]">{formatPlyForView(ply, side)}</span>
					</div>
				))
			) : (
				<p className="px-1 font-body text-xs text-[#5b647a]">No moves yet.</p>
			)}
		</div>
	);
}


type ReplayFrame = { label: string; pieces: PublicPiece[] };

function clonePieces(pieces: PublicPiece[]) {
	return pieces.map((piece) => ({ ...piece }));
}

function ownerOf(piece: PublicPiece, viewerSide: PlayerSide): PlayerSide {
	return piece.side === "you" ? viewerSide : oppositeSide(viewerSide);
}

function parseReplayPly(ply: string) {
	const match = /^([GS]) ([a-i])([1-8])([-x])([a-i])([1-8])$/.exec(ply);
	if (!match) return null;
	const [, player, fromFile, fromRank, action, toFile, toRank] = match;
	return {
		side: player === "G" ? "gold" as const : "slate" as const,
		capture: action === "x",
		from: { col: FILES.indexOf(fromFile), row: ROWS - Number(fromRank) },
		to: { col: FILES.indexOf(toFile), row: ROWS - Number(toRank) },
	};
}

function undoReplayCapture(pieces: PublicPiece[], viewerSide: PlayerSide, side: PlayerSide, from: { col: number; row: number }, to: { col: number; row: number }) {
	const attackers = pieces.filter((piece) => ownerOf(piece, viewerSide) === side && piece.rank);
	const defenders = pieces.filter((piece) => ownerOf(piece, viewerSide) !== side && piece.rank && piece.col === to.col && piece.row === to.row);

	for (const attacker of attackers) {
		for (const defender of defenders) {
			const losers = battleLosers(attacker.rank!, defender.rank!);
			const attackerAlive = !losers.includes("att");
			const defenderAlive = !losers.includes("def");
			const attackerMatches = attackerAlive
				? attacker.alive && attacker.col === to.col && attacker.row === to.row
				: !attacker.alive && attacker.col === from.col && attacker.row === from.row;
			const defenderMatches = defenderAlive ? defender.alive : !defender.alive;
			if (!attackerMatches || !defenderMatches) continue;

			attacker.alive = true;
			attacker.col = from.col;
			attacker.row = from.row;
			defender.alive = true;
			defender.col = to.col;
			defender.row = to.row;
			return;
		}
	}
}

function buildReplayFrames(room: PublicRoom | null): ReplayFrame[] {
	if (!room?.state.outcome || room.state.pieces.some((piece) => !piece.rank)) return [];
	const pieces = clonePieces(room.state.pieces);
	const frames: ReplayFrame[] = [{ label: `Final (${room.state.plies.length})`, pieces: clonePieces(pieces) }];

	for (let index = room.state.plies.length - 1; index >= 0; index--) {
		const ply = parseReplayPly(room.state.plies[index]);
		if (!ply) continue;
		if (ply.capture) {
			undoReplayCapture(pieces, room.side, ply.side, ply.from, ply.to);
		} else {
			const mover = pieces.find((piece) => piece.alive && ownerOf(piece, room.side) === ply.side && piece.col === ply.to.col && piece.row === ply.to.row);
			if (mover) {
				mover.col = ply.from.col;
				mover.row = ply.from.row;
			}
		}
		frames.push({ label: index === 0 ? "Setup" : `After ${index}`, pieces: clonePieces(pieces) });
	}

	return frames.reverse();
}
function ChatPanel({
	messages,
	side,
	draft,
	onDraft,
	onSend,
	onQuickSend,
	disabled,
}: {
	messages: RoomMessage[];
	side: PublicRoom["side"];
	draft: string;
	onDraft: (value: string) => void;
	onSend: () => void;
	onQuickSend: (text: string) => void;
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
			<div className="mt-3 flex flex-wrap gap-1.5">
				{QUICK_LINES.map((line) => (
					<button
						key={line}
						type="button"
						disabled={disabled}
						onClick={() => onQuickSend(line)}
						className="border border-[var(--line-strong)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--foreground)]/85 transition-colors hover:border-[var(--ink-muted)] disabled:opacity-40"
					>
						{line}
					</button>
				))}
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
	const [tags, setTags] = useState<Record<number, GuessTag>>({});
	const [tagTarget, setTagTarget] = useState<number | null>(null);
	const [draft, setDraft] = useState("");
	const [mobilePanel, setMobilePanel] = useState<"ranks" | "taken" | "log" | "comms" | null>(null);
	const [busy, setBusy] = useState(false);
	const [syncState, setSyncState] = useState<"polling" | "live" | "reconnecting">("polling");
	const [replayStep, setReplayStep] = useState<number | null>(null);
	const [pendingMove, setPendingMove] = useState<{ pieceId: number; col: number; row: number; capture: boolean } | null>(null);
	const [arbiterCell, setArbiterCell] = useState<{ col: number; row: number; key: number } | null>(null);
	const [clashPreview, setClashPreview] = useState<{ col: number; row: number; attacker: PublicPiece; defender: PublicPiece } | null>(null);
	const arbiterTimer = useRef<number | null>(null);
	const touchDrag = useRef<{ pieceId: number; pointerId: number; startX: number; startY: number; dragging: boolean } | null>(null);
	const suppressClick = useRef(false);
	const [draggingPiece, setDraggingPiece] = useState<number | null>(null);
	const [showReference, setShowReference] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [resultOpen, setResultOpen] = useState(false);
	const [codeCopied, setCodeCopied] = useState(false);
	const { level: coachLevel, setLevel: setCoachLevel } = useCoachLevel();

	useEffect(() => {
		setToken(sessionStorage.getItem(`gog:room:${code}:token`) ?? "");
	}, [code]);

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
		const timer = window.setInterval(() => void load(), syncState === "live" ? 10000 : 1400);
		return () => window.clearInterval(timer);
	}, [load, syncState]);

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
			socket.onopen = () => setSyncState("live");
			socket.onmessage = (event) => {
				if (event.data !== "pong") void load();
			};
			socket.onclose = () => {
				setSyncState("reconnecting");
				if (!closed) reconnect = window.setTimeout(connect, 1800);
			};
			socket.onerror = () => socket?.close();
		};

		connect();
		return () => {
			closed = true;
			setSyncState("polling");
			window.clearTimeout(reconnect);
			socket?.close();
		};
	}, [code, load, token]);

	const optimisticMove = (pieceId: number, col: number, row: number) => {
		const movingPiece = room?.state.pieces.find((item) => item.id === pieceId && item.alive && item.side === "you");
		const movingTarget = room?.state.pieces.find((item) => item.alive && item.col === col && item.row === row);
		if (movingPiece) setPendingMove({ pieceId, col, row, capture: !!movingTarget });
		if (movingPiece && movingTarget) showArbiter(col, row, movingPiece, movingTarget);
		animateBoard(() => setRoom((current) => {
			if (!current || current.state.outcome) return current;
			const piece = current.state.pieces.find((item) => item.id === pieceId && item.alive && item.side === "you");
			const target = current.state.pieces.find((item) => item.alive && item.col === col && item.row === row);
			if (!piece) return current;
			if (target) return current;
			return {
				...current,
				state: {
					...current.state,
					turn: current.side === "gold" ? "slate" : "gold",
					plies: [...current.state.plies, `${current.side === "gold" ? "G" : "S"} ${square(piece.col, piece.row)}-${square(col, row)}`],
					pieces: current.state.pieces.map((item) => (item.id === pieceId ? { ...item, col, row } : item)),
				},
			};
		}));
	};

	const act = async (body: Record<string, unknown>) => {
		if (!token || busy) return;
		if (body.action === "move") optimisticMove(Number(body.pieceId), Number(body.col), Number(body.row));
		setBusy(true);
		try {
			const response = await fetch(`/api/rooms/${code}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token, version: room?.version, ...body }),
			});
			const payload = (await response.json()) as PublicRoom | { error?: string; room?: PublicRoom | null };
			if (!response.ok) {
				if ("room" in payload && payload.room) animateBoard(() => setRoom(payload.room ?? null));
				throw new Error("error" in payload ? payload.error : "Action failed.");
			}
			animateBoard(() => setRoom(payload as PublicRoom));
			setPendingMove(null);
			setReplayStep(null);
			setSelected(null);
			setError("");
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Action failed.");
			void load();
		} finally {
			setPendingMove(null);
			setBusy(false);
		}
	};

	const sendText = (text: string) => {
		const clean = text.trim();
		if (!clean) return;
		void act({ action: "chat", text: clean });
	};

	const sendDraft = () => {
		if (!draft.trim()) return;
		const text = draft;
		setDraft("");
		sendText(text);
	};

	const pieces = useMemo(() => room?.state.pieces ?? [], [room]);
	const replayFrames = useMemo(() => buildReplayFrames(room), [room]);
	const replayFrame = replayStep == null ? null : replayFrames[replayStep] ?? null;
	const replayActive = replayFrame != null;
	const boardPieces = replayFrame?.pieces ?? pieces;
	const byCell = useMemo(() => {
		const next = new Map<number, PublicPiece>();
		for (const piece of boardPieces) if (piece.alive) next.set(piece.row * COLS + piece.col, piece);
		return next;
	}, [boardPieces]);

	const myTurn = room?.status === "active" && !room.state.outcome && room.state.turn === room.side;
	const sel = selected == null ? null : boardPieces.find((piece) => piece.id === selected && piece.alive);
	const activePlies = replayActive ? (room?.state.plies.slice(0, replayStep ?? 0) ?? []) : (room?.state.plies ?? []);
	const lastMove = parseLastMove(activePlies);
	const pendingPiece = pendingMove == null ? null : boardPieces.find((piece) => piece.id === pendingMove.pieceId);
	const onBoardKeys = useBoardKeys(COLS, ROWS);
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
	const myFallen = boardPieces.filter((piece) => piece.side === "you" && !piece.alive).sort(bySeniority);
	const foeFallen = boardPieces.filter((piece) => piece.side === "foe" && !piece.alive);
	const revealFoe = !!room?.state.outcome || replayActive;
	const outcome = room?.state.outcome ?? null;
	const names = room?.state.names ?? {};
	const foeName = (room ? names[oppositeSide(room.side)] : "") || "Opponent";
	const myName = (room ? names[room.side] : "") || "You";

	const lastClash = useMemo(
		() => (replayActive || !room ? undefined : readLastClash(room.state.plies, room.side, byCell)),
		[byCell, replayActive, room],
	);

	// Surface the result once, when it lands. Reopening is a deliberate tap.
	useEffect(() => {
		if (outcome) setResultOpen(true);
	}, [outcome]);

	// A rematch resets the board in place, so clear anything tied to the old match.
	const rematchPending = room?.state.rematchBy ?? null;
	const theyWantRematch = !!rematchPending && rematchPending !== room?.side;
	const youWantRematch = !!rematchPending && rematchPending === room?.side;

	useEffect(() => {
		if (room?.status === "active" && !outcome) {
			setResultOpen(false);
			setReplayStep(null);
			setSelected(null);
			setTags({});
		}
	}, [room?.status, outcome]);

	const copyCode = () => {
		void navigator.clipboard
			?.writeText(code)
			.then(() => {
				setCodeCopied(true);
				window.setTimeout(() => setCodeCopied(false), 1600);
			})
			.catch(() => undefined);
	};
	const syncLabel = syncState === "live" ? "Live" : syncState === "reconnecting" ? "Reconnecting" : "Polling";

	if (!token) {
		return (
			<RoomNotice
				code={code}
				title="This browser is not in that room"
				body="A room is tied to the browser that created or joined it, so there is nothing to restore here. If a friend sent you the code, join it from the play screen."
				action={{ href: "/play", label: "Go to the play screen" }}
			/>
		);
	}

	// A room that cannot be loaded at all is a state, not an inline error over
	// an empty board. Once a room IS loaded, failures stay inline and the last
	// known position keeps rendering — never blank a live match.
	if (error && !room) {
		return (
			<RoomNotice
				code={code}
				title="That room is gone"
				body={`${error} Rooms disappear once both players leave, so the code may simply have expired.`}
				action={{ href: "/play", label: "Start a new match" }}
			/>
		);
	}

	if (!room) {
		return (
			<main className="flex min-h-[100dvh] flex-col bg-[var(--background)] text-[var(--foreground)]">
				<AppHeader />
				<div className="flex flex-1 items-center justify-center gap-3 p-6 text-[var(--ink-muted)]">
					<IconSpinner size={18} />
					<p className="font-mono text-[11px] uppercase tracking-[0.16em]">Opening room {code}</p>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
			<AppHeader>
				<button
					type="button"
					onClick={copyCode}
					title="Copy the room code"
					className="flex items-center gap-1.5 border border-[var(--line-strong)] bg-[var(--panel)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition-colors hover:border-[var(--ink-muted)]"
				>
					{code}
					<IconCopy size={13} className="text-[var(--ink-muted)]" />
					<span className="sr-only">{codeCopied ? "Room code copied" : "Copy room code"}</span>
				</button>
				{codeCopied ? (
					<span aria-hidden className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--live)]">
						Copied
					</span>
				) : null}
				<Button variant="ghost" size="sm" aria-label="What beats what" onClick={() => setShowReference(true)}>
					<IconHelp size={16} />
					<span aria-hidden className="ml-1.5 hidden sm:inline">Ranks</span>
				</Button>
				<Button variant="ghost" size="sm" aria-label="Match menu" onClick={() => setMenuOpen(true)}>
					<IconMenu size={16} />
				</Button>
			</AppHeader>

			<section className="mx-auto grid max-w-[1400px] gap-4 px-2 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 lg:px-6 lg:pb-10 xl:grid-cols-[260px_minmax(0,760px)_340px] xl:gap-5">
				<aside className="hidden xl:block">
					<div className="sticky top-[76px]">
						<Card className="p-4">
							<CommandChain activeRank={sel?.rank} />
						</Card>
					</div>
				</aside>
				<div className="mx-auto w-full max-w-[760px] min-w-0">
					<PlayerRail
						name={foeName}
						side={oppositeSide(room?.side ?? "gold")}
						active={room?.status === "active" && !outcome && !myTurn}
						waiting={room?.status === "waiting"}
						fallen={foeFallen}
						revealFallen={revealFoe}
						trailing={
							<span
								className={`font-mono text-[9px] uppercase tracking-[0.14em] ${syncState === "live" ? "text-[var(--live)]" : syncState === "reconnecting" ? "text-[var(--warn)]" : "text-[var(--ink-faint)]"}`}
								title={`Connection: ${syncLabel}`}
							>
								{syncLabel}
							</span>
						}
					/>

					<CoachLine
						className="border-t-0"
						onChangeLevel={setCoachLevel}
						input={{
							level: coachLevel,
							phase: outcome ? "over" : "play",
							yourTurn: !!myTurn,
							movesPlayed: room?.state.plies.length ?? 0,
							selectedRank: sel?.side === "you" ? sel.rank : undefined,
							selectionCanAttack: !!sel && [...targets].some((index) => byCell.get(index)?.side === "foe"),
							lastClash,
							outcome,
							yourSide: room?.side,
						}}
					/>

					{syncState === "reconnecting" ? (
						<div className="mt-3 flex items-center gap-2.5 border border-[var(--warn)]/45 bg-[var(--warn)]/10 px-3 py-2">
							<IconSpinner size={15} className="flex-none text-[var(--warn)]" />
							<p className="text-sm text-[#e5c08a]">Lost the live connection. Still showing the last known position and retrying.</p>
						</div>
					) : null}

					{error ? (
						<div role="alert" className="mt-3 border border-[var(--loss)]/50 bg-[var(--loss)]/10 px-3 py-2 text-sm text-[#e0a08c]">
							{error}
						</div>
					) : null}

					{outcome ? (
						<div className="mt-3 border border-[var(--line)] bg-[var(--panel)] p-3">
							<div className="flex flex-wrap items-center gap-2">
								<Button size="sm" onClick={() => setResultOpen(true)}>
									See result
								</Button>
								<Button variant="outline" size="sm" disabled={!replayFrames.length} onClick={() => animateBoard(() => setReplayStep((step) => (step == null ? 0 : null)))}>
									{replayActive ? "Exit replay" : "Replay"}
								</Button>
								{replayActive ? <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a93a8]">{replayFrame.label}</span> : null}
							</div>
							{replayActive ? (
								<div className="mt-3 flex items-center gap-2">
									<Button variant="ghost" size="sm" onClick={() => animateBoard(() => setReplayStep((step) => Math.max(0, (step ?? 0) - 1)))}>
										Prev
									</Button>
									<input
										className="min-w-0 flex-1 accent-[#c9a85d]"
										type="range"
										min={0}
										max={Math.max(0, replayFrames.length - 1)}
										value={replayStep ?? 0}
										onChange={(event) => animateBoard(() => setReplayStep(Number(event.target.value)))}
									/>
									<Button variant="ghost" size="sm" onClick={() => animateBoard(() => setReplayStep((step) => Math.min(replayFrames.length - 1, (step ?? 0) + 1)))}>
										Next
									</Button>
								</div>
							) : null}
						</div>
					) : null}

					<div className="rounded-[8px] border border-[#1c2740] bg-[#0b101b] p-1.5 sm:p-3">
						<div className="mb-2 flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#44506b]">
							<span>{room?.side === "slate" ? "Gold line" : "Slate line"}</span>
							<span>tap an enemy piece to tag it</span>
						</div>
						<div onKeyDown={onBoardKeys} className="relative grid grid-cols-[1.25rem_repeat(9,minmax(0,1fr))] gap-1">
							{room?.status === "waiting" ? (
								<div className="pointer-events-none absolute left-6 right-0 top-[10%] z-20 flex justify-center px-2">
									<div className="pointer-events-auto max-w-[19rem] border border-[var(--line-strong)] bg-[var(--background)]/96 p-4 text-center shadow-[var(--e3)]">
										<p className="text-sm text-[var(--ink-muted)]">Send this code to whoever you want to play.</p>
										<button
											type="button"
											onClick={copyCode}
											className="mt-2.5 w-full border border-[var(--line-strong)] bg-[var(--panel)] py-2.5 font-mono text-3xl font-semibold tracking-[0.24em] text-[var(--foreground)] transition-colors hover:border-[var(--accent)]"
										>
											{code}
										</button>
										<p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
											{codeCopied ? "Copied to clipboard" : "Tap to copy · waiting for them to join"}
										</p>
									</div>
								</div>
							) : null}
							{Array.from({ length: ROWS }).map((_, viewRow) => (
								<Fragment key={viewRow}>
									<div className="flex items-center justify-center font-mono text-[9px] text-[#5b647a]">{viewSquare(room?.side ?? "gold", 0, viewRow).slice(1)}</div>
									{Array.from({ length: COLS }).map((__, viewCol) => {
										const { col, row } = toBoardCell(room?.side ?? "gold", viewCol, viewRow);
										const index = boardIndex(col, row);
										const piece = byCell.get(index);
										const isTarget = targets.has(index);
										const isLastFrom = lastMove?.from.col === col && lastMove.from.row === row;
										const isLastTo = lastMove?.to.col === col && lastMove.to.row === row;
										const lastMine = lastMove?.side === room?.side;
										const isPendingFrom = pendingPiece?.col === col && pendingPiece.row === row;
										const isPendingTo = pendingMove?.col === col && pendingMove.row === row;
										const isArbiterTo = arbiterCell?.col === col && arbiterCell.row === row;
										const isClashTo = clashPreview?.col === col && clashPreview.row === row;
										const isSelected = piece != null && piece.id === selected;
										const showRank = piece?.side === "you" || revealFoe;

								return (
									<button
										key={index}
										type="button"
										data-game-cell
											data-view-col={viewCol}
											data-view-row={viewRow}
											tabIndex={viewCol === 0 && viewRow === 0 ? 0 : -1}
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
											aria-label={cellLabel(viewSquare(room?.side ?? "gold", viewCol, viewRow), piece, showRank, isTarget)}
										className={`relative aspect-square rounded-[4px] border transition-colors ${
											isTarget
												? "border-[rgba(201,168,93,0.55)] bg-[rgba(201,168,93,0.12)]"
													: isPendingFrom || isPendingTo
														? "border-[var(--accent)] bg-[rgba(201,168,93,0.16)]"
													: isLastFrom || isLastTo
														? `${lastMine ? "border-[#8fae6e]" : "border-[#d98b73]"} bg-[rgba(143,174,110,0.12)]`
														: (viewCol + viewRow) % 2 === 0
														? "border-[var(--board-border)] bg-[var(--board-light)]"
															: "border-[var(--board-border)] bg-[var(--board-dark)]"
										} ${piece?.side === "you" && myTurn ? "touch-none" : ""} ${isArbiterTo ? "gog-clash" : ""}`}
									>
										{isClashTo && clashPreview ? (
											<PieceClashPreview attacker={clashPreview.attacker} defender={clashPreview.defender} />
										) : piece ? (
											<span
												style={{ viewTransitionName: `piece-${piece.id}` } as CSSProperties}
												className="pointer-events-none absolute inset-[7%]"
											>
												<Piece
													rank={showRank ? piece.rank : undefined}
													side={piece.side}
													state={isSelected || draggingPiece === piece.id ? "selected" : "idle"}
												/>
											</span>
										) : null}
										{isTarget && !isClashTo ? <MoveDot capture={piece?.side === "foe"} /> : null}
										{(pendingMove?.capture && isPendingTo) || isArbiterTo ? <ArbiterChip key={arbiterCell?.key} /> : null}
										{piece?.side === "foe" && !isClashTo && !revealFoe ? <GuessBadge tag={tags[piece.id]} /> : null}
									</button>
								);
									})}
								</Fragment>
							))}
							<div />
							{Array.from({ length: COLS }).map((_, viewCol) => (
								<div key={viewCol} className="text-center font-mono text-[9px] uppercase text-[#5b647a]">
									{viewSquare(room?.side ?? "gold", viewCol, ROWS - 1)[0]}
								</div>
							))}
						</div>
					</div>

					<PlayerRail
						className="mt-2"
						name={myName}
						side={room?.side ?? "gold"}
						you
						active={!!myTurn}
						fallen={myFallen}
						revealFallen
						trailing={
							sel?.rank ? (
								<span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--accent)]">
									{rankByKey.get(sel.rank)?.name} · pick a square
								</span>
							) : null
						}
					/>

					<Card className="mt-4 hidden p-4 sm:block">
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
								<CapturedGuessTiles pieces={foeFallen} tags={tags} onTag={setTagTarget} />
							</div>
						</div>
					</Card>
					<Card className="hidden">
						<CommandChain activeRank={sel?.rank} />
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
								<MoveLog plies={[...(room?.state.plies ?? [])].reverse()} side={room?.side ?? "gold"} />
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
								onQuickSend={sendText}
								disabled={busy || !!room?.state.outcome}
							/>
						</Card>
					</div>
				</aside>
			</section>

			<div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1c2740] bg-[#0e1420]/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur xl:hidden">
				{/* The rails already carry turn and casualties; this bar is navigation only. */}
				<div className="mx-auto grid max-w-[1280px] grid-cols-4 items-center gap-2">
					<Button variant="outline" size="sm" className="w-full px-1" onClick={() => setMobilePanel("ranks")}>
						Ranks
					</Button>
					<Button variant="outline" size="sm" className="w-full px-1" onClick={() => setMobilePanel("taken")}>
						Taken
					</Button>
					<Button variant="outline" size="sm" className="w-full px-1" onClick={() => setMobilePanel("log")}>
						Log
					</Button>
					<Button variant="outline" size="sm" className="relative w-full px-1" onClick={() => setMobilePanel("comms")}>
						Chat
					</Button>
				</div>
			</div>

			{mobilePanel ? (
				<div className="fixed inset-0 z-[70] flex items-end bg-[#05070c]/65 backdrop-blur-sm xl:hidden" onClick={() => setMobilePanel(null)}>
					<div
						className="flex max-h-[78dvh] min-h-[44dvh] w-full flex-col rounded-t-[10px] border border-[#2c3a55] bg-[#0e1420] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-18px_80px_rgba(0,0,0,0.65)]"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="mb-3 flex items-center justify-between gap-3">
							<CardTitle className="text-xl">{mobilePanel === "ranks" ? "Ranks" : mobilePanel === "taken" ? "Captured" : mobilePanel === "log" ? "Move log" : "Comms"}</CardTitle>
							<Button variant="ghost" size="sm" onClick={() => setMobilePanel(null)}>
								Close
							</Button>
						</div>
						{mobilePanel === "ranks" ? <div className="overflow-y-auto pr-1"><CommandChain activeRank={sel?.rank} /></div> : null}
						{mobilePanel === "taken" ? (
							<div className="grid gap-5 overflow-y-auto">
								<div>
									<CardTitle className="text-xl">Your fallen</CardTitle>
									<div className="mt-3 flex flex-wrap gap-1.5">
										{myFallen.length ? (
											myFallen.map((piece) => {
												const glyph = piece.rank ? (rankByKey.get(piece.rank)?.glyph ?? "") : "";
												return (
													<span key={piece.id} className={`flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#dabb74]/60 bg-gradient-to-br from-[#c9a85d] to-[#a8894a] font-bold leading-none text-[#0e1420]/75 opacity-60 ${boardGlyphSize(glyph)}`}>
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
									<CapturedGuessTiles pieces={foeFallen} tags={tags} onTag={setTagTarget} />
								</div>
							</div>
						) : null}
						{mobilePanel === "log" ? <MoveLog plies={[...(room?.state.plies ?? [])].reverse()} side={room?.side ?? "gold"} /> : null}
						{mobilePanel === "comms" ? (
							<ChatPanel
								messages={room?.state.messages ?? []}
								side={room?.side ?? "gold"}
								draft={draft}
								onDraft={setDraft}
								onSend={sendDraft}
								onQuickSend={sendText}
								disabled={busy || !!room?.state.outcome}
							/>
						) : null}
					</div>
				</div>
			) : null}

			{tagTarget != null ? (
				<div className="fixed inset-0 z-[80] flex items-end bg-[#05070c]/65 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" onClick={() => setTagTarget(null)}>
					<div
						className="wr-rise max-h-[78dvh] w-full overflow-auto rounded-t-[10px] border border-[#2c3a55] bg-[#0e1420] p-4 shadow-[0_-18px_80px_rgba(0,0,0,0.65)] sm:max-w-xl sm:rounded-[10px]"
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

			<Sheet open={showReference} onClose={() => setShowReference(false)} title="What beats what" size="lg">
				<RankReference pieces={pieces} />
			</Sheet>

			<MatchMenu
				open={menuOpen}
				onClose={() => setMenuOpen(false)}
				onResign={() => void act({ action: "resign" })}
				canResign={room?.status === "active" && !outcome}
				coachLevel={coachLevel}
				onCoachLevel={setCoachLevel}
				roomCode={code}
				onCopyCode={copyCode}
				codeCopied={codeCopied}
			/>

			<Sheet
				open={resultOpen && !!outcome}
				onClose={() => setResultOpen(false)}
				title="Match over"
				size="md"
			>
				{outcome && room ? (
					<MatchResult
						outcome={outcome}
						side={room.side}
						pieces={pieces}
						onRematch={() => void act({ action: "rematch" })}
						rematchLabel={theyWantRematch ? "Accept rematch" : youWantRematch ? "Waiting for them…" : "Offer a rematch"}
						rematchDisabled={youWantRematch}
						rematchNote={
							theyWantRematch
								? `${foeName} wants to play again. Sides will swap.`
								: youWantRematch
									? "Offer sent. The match restarts when they accept."
									: "Same room, same armies, swapped sides."
						}
						onReplay={() => {
							setResultOpen(false);
							animateBoard(() => setReplayStep(0));
						}}
					/>
				) : null}
			</Sheet>
		</main>
	);
}
