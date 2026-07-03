"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { TutorialModal } from "@/components/home/home-experience";
import { BOT_MATCH_KEY, LOCAL_MATCH_KEY } from "@/components/play/local-game-room";

const COLS = 9;
const ROWS = 3;
const GUEST_LOADOUT_KEY = "gog:guest-loadout:v1";

// Bot difficulty as a chain-of-command ladder. Spy is the wildcard: a random tier each match.
const difficulties = [
	{ glyph: "∧", name: "Private", note: "Barely a threat" },
	{ glyph: "∧∧∧", name: "Sergeant", note: "Learning the ropes" },
	{ glyph: "◆◆◆", name: "Captain", note: "Holds the line" },
	{ glyph: "▲▲▲", name: "Colonel", note: "Plays to win" },
	{ glyph: "★★★★★", name: "General", note: "Ruthless and patient" },
	{ glyph: "✦", name: "Spy", note: "Random each match" },
] as const;

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

type Mode = "bot" | "room" | "join" | "local";

function makeTray() {
	return ranks.flatMap((rank) =>
		Array.from({ length: rank.count }, (_, index) => ({
			uid: `${rank.key}-${index}`,
			key: rank.key,
			glyph: rank.glyph,
			name: rank.name,
		})),
	);
}

function shuffle<T>(items: T[]) {
	const next = [...items];
	for (let i = next.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[next[i], next[j]] = [next[j], next[i]];
	}
	return next;
}

function glyphSize(glyph: string) {
	if (glyph.length >= 4) return "text-[10px] sm:text-xs";
	if (glyph.length === 3) return "text-xs sm:text-sm";
	return "text-base sm:text-lg";
}

function boardGlyphSize(glyph: string) {
	if (glyph.length >= 4) return "text-[7px] tracking-normal sm:text-[10px]";
	if (glyph.length === 3) return "text-[9px] sm:text-xs";
	return "text-xs sm:text-base";
}

function reserveGlyphSize(glyph: string) {
	if (glyph.length >= 4) return "text-[7px] tracking-normal sm:text-[9px] lg:text-xs";
	if (glyph.length === 3) return "text-[9px] sm:text-xs lg:text-sm";
	return "text-xs sm:text-base lg:text-lg";
}

function CompactGlyph({ glyph }: { glyph: string }) {
	const rows = glyph === "★★★★★" ? ["★★", "★★★"] : glyph === "★★★★" ? ["★★", "★★"] : null;

	if (!rows) return glyph;

	// Stack the multi-star generals into rows at every breakpoint so the pips stay legible.
	return (
		<span className="flex flex-col items-center justify-center leading-[0.82]">
			{rows.map((row, index) => (
				<span key={index}>{row}</span>
			))}
		</span>
	);
}

function ShuffleIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
			<path d="M16 3h5v5" />
			<path d="M4 20 21 3" />
			<path d="M21 16v5h-5" />
			<path d="m15 15 6 6" />
			<path d="m4 4 5 5" />
		</svg>
	);
}

export function BoardSetup() {
	const router = useRouter();
	const tray = useMemo(makeTray, []);
	const trayIds = useMemo(() => new Set(tray.map((piece) => piece.uid)), [tray]);
	const [mode, setMode] = useState<Mode>("room");
	const [difficulty, setDifficulty] = useState("Sergeant");
	const [localStep, setLocalStep] = useState<1 | 2>(1);
	const [joinCode, setJoinCode] = useState("");
	const [placement, setPlacement] = useState<Record<number, string>>({});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [selected, setSelected] = useState<string | null>(null);
	const [showTutorial, setShowTutorial] = useState(false);
	const [pickerZone, setPickerZone] = useState<number | null>(null);
	const loadedLoadout = useRef(false);
	const touchDrag = useRef<{ uid: string; pointerId: number; startX: number; startY: number; dragging: boolean } | null>(null);
	const suppressClick = useRef(false);
	const [draggingUid, setDraggingUid] = useState<string | null>(null);
	const placed = new Set(Object.values(placement));
	const ready = placed.size === tray.length;
	const reservePieces = tray.filter((piece) => !placed.has(piece.uid));
	const canStart = ready && !busy;

	const animatePlacement = (update: () => void) => {
		const startViewTransition = (document as Document & { startViewTransition?: (callback: () => void) => void }).startViewTransition;
		if (startViewTransition) startViewTransition.call(document, () => flushSync(update));
		else update();
	};

	const placePiece = (zone: number, uid = selected) => {
		if (!uid) {
			if (placement[zone]) {
				animatePlacement(() => {
					setPlacement((current) => {
						const next = { ...current };
						delete next[zone];
						return next;
					});
				});
			}
			return;
		}

		animatePlacement(() => {
			setPlacement((current) => {
				const source = Object.entries(current).find(([, value]) => value === uid);
				const sourceZone = source ? Number(source[0]) : null;
				const targetUid = current[zone];
				const next = { ...current };

				if (sourceZone != null && sourceZone !== zone) {
					if (targetUid) next[sourceZone] = targetUid;
					else delete next[sourceZone];
				}

				next[zone] = uid;
				return next;
			});
		});
		setSelected(null);
		setPickerZone(null);
	};

	const autoDeploy = () => {
		const cells = shuffle(Array.from({ length: 27 }, (_, index) => index));
		animatePlacement(() => {
			setPlacement(Object.fromEntries(shuffle(tray).map((piece, index) => [cells[index], piece.uid])));
		});
		setSelected(null);
		setPickerZone(null);
	};

	const startDrag = (event: DragEvent, uid: string) => {
		event.dataTransfer.setData("text/plain", uid);
	};

	const dropOnCell = (event: DragEvent, zone: number) => {
		event.preventDefault();
		placePiece(zone, event.dataTransfer.getData("text/plain"));
	};

	const recallToReserve = (event: DragEvent) => {
		event.preventDefault();
		const uid = event.dataTransfer.getData("text/plain");
		if (!uid) return;
		recallPiece(uid);
	};

	const recallPiece = (uid: string) => {
		animatePlacement(() =>
			setPlacement((current) => {
				const entry = Object.entries(current).find(([, value]) => value === uid);
				if (!entry) return current;
				const next = { ...current };
				delete next[Number(entry[0])];
				return next;
			}),
		);
		setSelected(null);
	};

	const beginTouchDrag = (event: PointerEvent<HTMLElement>, uid: string) => {
		if (event.pointerType === "mouse") return;
		touchDrag.current = { uid, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false };
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const moveTouchDrag = (event: PointerEvent<HTMLElement>) => {
		const drag = touchDrag.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		if (!drag.dragging && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) return;
		drag.dragging = true;
		setDraggingUid(drag.uid);
		event.preventDefault();
	};

	const endTouchDrag = (event: PointerEvent<HTMLElement>) => {
		const drag = touchDrag.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		touchDrag.current = null;
		setDraggingUid(null);
		if (!drag.dragging) return;

		suppressClick.current = true;
		event.preventDefault();
		const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
		const zoneEl = target?.closest<HTMLElement>("[data-setup-zone]");
		if (zoneEl) {
			const zone = Number(zoneEl.dataset.setupZone);
			if (Number.isInteger(zone)) placePiece(zone, drag.uid);
			return;
		}
		if (target?.closest("[data-reserve-drop]")) recallPiece(drag.uid);
		else setSelected(null);
	};

	const cancelTouchDrag = (event: PointerEvent<HTMLElement>) => {
		const drag = touchDrag.current;
		if (drag?.pointerId !== event.pointerId) return;
		touchDrag.current = null;
		setDraggingUid(null);
	};

	const pieceById = (uid?: string) => tray.find((piece) => piece.uid === uid);
	const pickerPiece = pickerZone == null ? undefined : pieceById(placement[pickerZone]);

	const startOnline = async () => {
		if (!canStart || (mode !== "room" && mode !== "join")) return;
		setBusy(true);
		setError("");

		const path = mode === "room" ? "/api/rooms" : `/api/rooms/${joinCode}/join`;
		try {
			const response = await fetch(path, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ loadout: placement }),
			});
			const payload = (await response.json()) as { token?: string; room?: { code: string }; error?: string };
			if (!response.ok || !payload.token || !payload.room) throw new Error(payload.error ?? "Could not start room.");

			sessionStorage.setItem(`gog:room:${payload.room.code}:token`, payload.token);
			router.push(`/play/${payload.room.code}`);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not start room.");
		} finally {
			setBusy(false);
		}
	};

	const startMatch = () => {
		if (!canStart) return;
		if (mode === "room" || mode === "join") {
			void startOnline();
			return;
		}
		if (mode === "bot") {
			sessionStorage.setItem(BOT_MATCH_KEY, JSON.stringify({ gold: placement, difficulty }));
			router.push("/play/bot");
			return;
		}
		if (localStep === 1) {
			sessionStorage.setItem(`${LOCAL_MATCH_KEY}:gold`, JSON.stringify(placement));
			setPlacement({});
			setSelected(null);
			setPickerZone(null);
			setLocalStep(2);
			setError("");
			return;
		}
		const gold = sessionStorage.getItem(`${LOCAL_MATCH_KEY}:gold`);
		if (!gold) {
			setLocalStep(1);
			setError("Commander 1 needs to deploy again.");
			return;
		}
		sessionStorage.setItem(LOCAL_MATCH_KEY, JSON.stringify({ gold: JSON.parse(gold), slate: placement }));
		router.push("/play/local");
	};

	useEffect(() => {
		try {
			const saved = localStorage.getItem(GUEST_LOADOUT_KEY);
			if (!saved) return;

			const parsed = JSON.parse(saved) as Record<string, unknown>;
			const next: Record<number, string> = {};
			for (const [zoneKey, uid] of Object.entries(parsed)) {
				const zone = Number(zoneKey);
				if (Number.isInteger(zone) && zone >= 0 && zone < 27 && typeof uid === "string" && trayIds.has(uid)) {
					next[zone] = uid;
				}
			}

			setPlacement(next);
		} catch {
			localStorage.removeItem(GUEST_LOADOUT_KEY);
		} finally {
			loadedLoadout.current = true;
		}
	}, [trayIds]);

	useEffect(() => {
		if (!loadedLoadout.current) return;
		localStorage.setItem(GUEST_LOADOUT_KEY, JSON.stringify(placement));
	}, [placement]);

	return (
		<main className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
			<header className="sticky top-0 z-50 flex h-[60px] items-center justify-between gap-4 border-b border-[#1c2740] bg-[#0e1420]/90 px-5 backdrop-blur md:px-12">
				<Link href="/" className="flex min-w-0 items-center gap-2.5">
					<span className="text-[var(--accent)]">★</span>
					<span className="font-display text-lg font-bold uppercase tracking-[0.07em] md:hidden">GoG Online</span>
					<span className="hidden truncate font-display text-xl font-bold uppercase tracking-[0.07em] md:inline">Game of the Generals</span>
				</Link>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/">Home</Link>
					</Button>
				</div>
			</header>

			<section className="mx-auto grid max-w-[1500px] gap-5 px-4 pb-32 pt-5 lg:px-6 lg:pb-10 xl:grid-cols-[280px_minmax(520px,1fr)_320px] xl:px-8">
				<aside className="order-3 space-y-4 xl:order-1">
					<Card className="p-5">
						<CardTitle>Select mode</CardTitle>
						<div className="mt-4 grid gap-2">
							{[
								["room", "Create lobby", "Generate a room code."],
								["join", "Join lobby", "Enter a code from a friend."],
								["local", "Pass & play", "Two commanders, one device."],
								["bot", "Versus bot", "Practice against a simple commander."],
							].map(([value, title, body]) => (
								<button
									key={value}
									type="button"
									onClick={() => {
										setMode(value as Mode);
										setLocalStep(1);
									}}
									className={`rounded-[6px] border p-3 text-left transition-colors ${
										mode === value ? "border-[var(--accent)] bg-[#161f31]" : "border-[#2c3a55] bg-[#0b101b]"
									}`}
								>
									<div className="font-display text-xl font-bold uppercase">{title}</div>
									<div className="text-xs leading-5 text-[#8a93a8]">{body}</div>
								</button>
							))}
						</div>
					</Card>

					<Card className="p-5">
						<CardTitle>{mode === "bot" ? "Bot difficulty" : "Match options"}</CardTitle>
						<div className="mt-4 space-y-3">
							{mode === "bot" ? (
								<div className="grid gap-1">
									{difficulties.map((level) => (
										<button
											key={level.name}
											type="button"
											onClick={() => setDifficulty(level.name)}
											aria-pressed={difficulty === level.name}
											className={`flex items-center gap-3 rounded-[4px] border px-2.5 py-2 text-left transition-colors ${
												difficulty === level.name
													? "border-[var(--accent)] bg-[rgba(201,168,93,0.1)]"
													: "border-[#2c3a55] hover:border-[rgba(201,168,93,0.5)]"
											}`}
										>
											<span className="w-9 shrink-0 text-center text-[13px] leading-none tracking-[1px] text-[var(--accent)]">{level.glyph}</span>
											<span className="min-w-0">
												<span className="block font-mono text-[11px] uppercase tracking-[0.1em] text-[#ede8da]">{level.name}</span>
												<span className="block truncate text-[11px] leading-4 text-[#8a93a8]">{level.note}</span>
											</span>
										</button>
									))}
								</div>
							) : null}
							{mode === "room" ? (
								<div className="space-y-3">
									<div className="rounded-[6px] border border-dashed border-[rgba(201,168,93,0.45)] p-4 text-center font-mono text-2xl font-semibold tracking-[0.2em] text-[var(--accent)]">
										GG-....
									</div>
									<p className="text-sm leading-6 text-[#8a93a8]">A shareable code appears after you lock deployment.</p>
								</div>
							) : null}
							{mode === "join" ? (
								<input
									value={joinCode}
									onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z-]/g, "").slice(0, 7))}
									placeholder="GG-XXXX"
									className="w-full rounded-[4px] border border-[#2c3a55] bg-[#0b101b] px-3 py-3 text-center font-mono text-lg uppercase tracking-[0.22em] outline-none focus:border-[var(--accent)]"
								/>
							) : null}
							{mode === "local" ? (
								<p className="text-sm leading-6 text-[#8a93a8]">
									{localStep === 1 ? "Commander 2 deploys after Commander 1 locks this board." : "Commander 2: deploy without showing Commander 1."}
								</p>
							) : null}
							{error ? <p className="text-sm leading-6 text-[#d98b73]">{error}</p> : null}
						</div>
					</Card>
				</aside>

				<section className="order-1 min-w-0 xl:order-2">
					<div className="mb-4 flex flex-wrap items-end justify-between gap-3">
						<div>
							<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
								<span>Deployment</span>
								<button
									type="button"
									aria-label="Open field manual"
									title="Open field manual"
									onClick={() => setShowTutorial(true)}
									className="flex h-7 w-7 items-center justify-center rounded-full border border-[#2c3a55] bg-[#0b101b] text-[13px] tracking-normal text-[#8a93a8] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
								>
									i
								</button>
							</div>
							<h1 className="font-display text-[clamp(42px,5.6vw,76px)] font-extrabold uppercase leading-none">Position your army.</h1>
						</div>
						<div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8fae6e]">{placed.size} / 21 placed</div>
					</div>

					<div
						className="mb-4 h-1 w-full overflow-hidden rounded-full bg-[#182034]"
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={tray.length}
						aria-valuenow={placed.size}
						aria-label="Pieces placed"
					>
						<div
							className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
							style={{ width: `${(placed.size / tray.length) * 100}%` }}
						/>
					</div>

					<div className="rounded-[8px] border border-[#1c2740] bg-[#0b101b] p-2 sm:p-3">
						<div className="mb-2 flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#44506b]">
							<span>Front line</span>
							<span>facing the enemy</span>
						</div>
						<div className="grid grid-cols-9 gap-1">
							{Array.from({ length: COLS * ROWS }).map((_, index) => {
								const row = Math.floor(index / COLS);
								const col = index % COLS;
								const zone = row * COLS + col;
								const active = row < ROWS;
								const frontLine = row === 0;
								const piece = active ? pieceById(placement[zone]) : undefined;

								return (
									<button
										key={index}
										type="button"
										disabled={!active}
										data-setup-zone={active ? zone : undefined}
										aria-label={active ? (piece ? `${piece.name} placed, tap to recall` : "Empty square, tap to place a piece") : "Enemy territory"}
										onClick={() => {
											if (suppressClick.current) {
												suppressClick.current = false;
												return;
											}
											if (!active) return;
											if (piece) {
												placePiece(zone, null);
												return;
											}
											if (selected) {
												placePiece(zone);
												return;
											}
											setPickerZone(zone);
											setSelected(null);
										}}
										onDragOver={(event) => active && event.preventDefault()}
										onDrop={(event) => active && dropOnCell(event, zone)}
										className={`aspect-square rounded-[4px] border transition-colors ${frontLine ? "border-t-2 border-t-[rgba(201,168,93,0.4)]" : ""} ${
											active
												? piece
													? "border-[rgba(201,168,93,0.5)] bg-[#121b2c] hover:border-[var(--accent)]"
													: selected
														? "border-[rgba(201,168,93,0.55)] bg-[rgba(201,168,93,0.1)] hover:bg-[rgba(201,168,93,0.16)]"
														: "border-[#2c3a55] bg-[#121b2c] hover:border-[rgba(201,168,93,0.4)]"
												: "border-[#162035] bg-[#090e18]"
										}`}
									>
										{piece ? (
											<span
												draggable
												onDragStart={(event) => startDrag(event, piece.uid)}
												onPointerDown={(event) => beginTouchDrag(event, piece.uid)}
												onPointerMove={moveTouchDrag}
												onPointerUp={endTouchDrag}
												onPointerCancel={cancelTouchDrag}
												style={{ viewTransitionName: `piece-${piece.uid}` } as CSSProperties}
												className={`mx-auto flex h-[74%] w-[86%] touch-none items-center justify-center overflow-hidden rounded-[4px] border border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] font-bold leading-none text-[#0e1420]/75 ${boardGlyphSize(piece.glyph)} ${
													draggingUid === piece.uid ? "opacity-70 ring-2 ring-[var(--accent)]" : ""
												}`}
											>
												<CompactGlyph glyph={piece.glyph} />
											</span>
										) : null}
									</button>
								);
							})}
						</div>
						<div className="mt-2 px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--accent)]/70">
							Your three back rows
						</div>
					</div>

					{/* Desktop actions. Mobile uses the sticky command bar below. */}
					<div className="mt-4 hidden flex-wrap gap-3 xl:flex">
						<Button variant="outline" onClick={autoDeploy} aria-label="Auto-deploy" title="Shuffle every piece onto the board" className="px-4">
							<ShuffleIcon className="h-4 w-4" />
						</Button>
						<Button variant="outline" onClick={() => setPlacement({})}>
							Clear board
						</Button>
						<Button className="ml-auto" disabled={!canStart} onClick={startMatch}>
							{busy
								? "Contacting HQ"
								: ready
									? mode === "join"
										? "Join battle"
										: mode === "room"
											? "Create room"
											: mode === "bot"
												? "Start practice"
												: localStep === 1
													? "Lock commander 1"
													: "Start pass & play"
									: "Place all 21 pieces"}
						</Button>
					</div>
				</section>

				<aside className="order-2 space-y-4 xl:order-3">
					<Card className="p-4 lg:p-5" data-reserve-drop onDragOver={(event) => event.preventDefault()} onDrop={recallToReserve}>
						<div className="flex items-center justify-between gap-3">
							<CardTitle>Reserve</CardTitle>
							<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8fae6e]">{reservePieces.length} left</span>
						</div>
						<CardContent className="mt-2 p-0 text-xs lg:text-sm">Tap an empty square to place. Tap a placed piece to recall it. Drag a piece back here too.</CardContent>
						<div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:mt-4 lg:grid-cols-3 lg:gap-2">
							{reservePieces.map((piece) => (
								<button
									key={piece.uid}
									type="button"
									draggable
									onDragStart={(event) => startDrag(event, piece.uid)}
									onPointerDown={(event) => beginTouchDrag(event, piece.uid)}
									onPointerMove={moveTouchDrag}
									onPointerUp={endTouchDrag}
									onPointerCancel={cancelTouchDrag}
									onClick={() => {
										if (suppressClick.current) {
											suppressClick.current = false;
											return;
										}
										setSelected(selected === piece.uid ? null : piece.uid);
									}}
									aria-pressed={selected === piece.uid}
									aria-label={piece.name}
									className={`flex min-w-0 touch-none flex-col items-center justify-center rounded-[5px] border py-2 transition-colors active:scale-[0.97] lg:items-start lg:p-2 ${
										selected === piece.uid
											? "border-[var(--accent)] bg-[rgba(201,168,93,0.14)]"
											: draggingUid === piece.uid
												? "border-[var(--accent)] bg-[rgba(201,168,93,0.14)] opacity-70"
												: "border-[#2c3a55] bg-[#121b2c] hover:border-[rgba(201,168,93,0.5)]"
									}`}
								>
									<div className={`${reserveGlyphSize(piece.glyph)} font-bold leading-none text-[var(--accent)]`}>
										<CompactGlyph glyph={piece.glyph} />
									</div>
									<div className="mt-1 hidden truncate font-mono text-[8px] uppercase tracking-[0.08em] text-[#8a93a8] lg:block">{piece.name}</div>
								</button>
							))}
						</div>
					</Card>
				</aside>
			</section>
			{/* Sticky command bar. Keeps the primary action reachable on mobile without scrolling. */}
			<div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1c2740] bg-[#0e1420]/95 px-4 py-3 backdrop-blur lg:hidden">
				<div className="mx-auto flex max-w-[1500px] items-center gap-3">
					<div className="shrink-0 font-mono text-[11px] uppercase leading-tight tracking-[0.14em] text-[#8fae6e]">
						{placed.size} / 21
						<span className="block text-[9px] tracking-[0.12em] text-[#5b647a]">placed</span>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={autoDeploy}
						aria-label="Auto-deploy"
						title="Shuffle every piece onto the board"
						className="shrink-0 text-base leading-none"
					>
						<ShuffleIcon className="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" className="shrink-0" onClick={() => setPlacement({})} aria-label="Clear board">
						Clear
					</Button>
					<Button size="sm" className="flex-1" disabled={!canStart} onClick={startMatch}>
						{busy ? "..." : ready ? (mode === "join" ? "Join" : mode === "room" ? "Create" : mode === "bot" ? "Practice" : localStep === 1 ? "Lock P1" : "Start") : `${tray.length - placed.size} left`}
					</Button>
				</div>
			</div>

			{showTutorial ? <TutorialModal onClose={() => setShowTutorial(false)} /> : null}
			{pickerZone != null ? (
				<div className="fixed inset-0 z-[70] flex items-end bg-[#05070c]/65 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" onClick={() => setPickerZone(null)}>
					<div
						className="max-h-[78dvh] w-full overflow-auto rounded-t-[10px] border border-[#2c3a55] bg-[#0e1420] p-4 shadow-[0_-18px_80px_rgba(0,0,0,0.65)] sm:max-w-xl sm:rounded-[10px]"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="mb-4 flex items-center justify-between gap-3">
							<div>
								<div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Place piece</div>
								<div className="text-sm text-[#8a93a8]">
									{pickerPiece ? `${pickerPiece.name} currently holds this square.` : "Choose a reserve piece for this square."}
								</div>
							</div>
							<Button variant="ghost" size="sm" onClick={() => setPickerZone(null)}>
								Close
							</Button>
						</div>

						{pickerPiece ? (
							<Button variant="outline" className="mb-4 w-full" onClick={() => placePiece(pickerZone, null)}>
								Recall current piece
							</Button>
						) : null}

						<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
							{reservePieces.length ? (
								reservePieces.map((piece) => (
									<button
										key={piece.uid}
										type="button"
										onClick={() => placePiece(pickerZone, piece.uid)}
										className="rounded-[5px] border border-[#2c3a55] bg-[#121b2c] p-3 text-left transition-colors active:scale-[0.98] hover:border-[var(--accent)]"
									>
										<div className={`${glyphSize(piece.glyph)} font-bold leading-none text-[var(--accent)]`}>
											<CompactGlyph glyph={piece.glyph} />
										</div>
										<div className="mt-2 truncate font-mono text-[8px] uppercase tracking-[0.08em] text-[#8a93a8]">{piece.name}</div>
									</button>
								))
							) : (
								<div className="col-span-full rounded-[6px] border border-[#2c3a55] bg-[#0b101b] p-4 text-sm text-[#8a93a8]">
									All pieces are deployed. Recall one from the board to change this square.
								</div>
							)}
						</div>
					</div>
				</div>
			) : null}
		</main>
	);
}
