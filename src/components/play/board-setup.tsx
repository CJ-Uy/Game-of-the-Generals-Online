"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { Sheet } from "@/components/ui/sheet";
import { Piece } from "@/components/game/piece";
import { CoachLine, useCoachLevel } from "@/components/game/coach";
import { RankReference } from "@/components/game/rank-reference";
import { IconClear, IconHelp, IconShuffle } from "@/components/ui/icons";
import { COLS, GUEST_LOADOUT_KEY, ranks, type RankKey } from "@/lib/game";
import { formationLoadout, formations } from "@/lib/formations";
import { rankShort } from "@/lib/coach";
import { MAX_CALLSIGN, cleanCallsign, loadCallsign, randomCallsign, saveCallsign } from "@/lib/identity";
import { clearLive, describeLive, type LiveMode } from "@/lib/live-match";
import { BOT_MATCH_KEY, LOCAL_MATCH_KEY } from "@/components/play/local-game-room";
import { cn } from "@/lib/utils";

const ZONE_ROWS = 3;
const ZONE_COUNT = COLS * ZONE_ROWS;

// Bot difficulty as a chain-of-command ladder. Spy is the wildcard: a random tier each match.
const difficulties = [
	{ glyph: "∧", name: "Private", note: "Barely a threat" },
	{ glyph: "∧∧∧", name: "Sergeant", note: "Learning the ropes" },
	{ glyph: "◆◆◆", name: "Captain", note: "Holds the line" },
	{ glyph: "▲▲▲", name: "Colonel", note: "Plays to win" },
	{ glyph: "★★★★★", name: "General", note: "Ruthless and patient" },
	{ glyph: "◉", name: "Spy", note: "Random each match" },
] as const;

const modes = [
	{ value: "room", label: "Create lobby", blurb: "Get a code to send a friend." },
	{ value: "join", label: "Join lobby", blurb: "Enter a code you were sent." },
	{ value: "local", label: "Pass & play", blurb: "Two players, one device." },
	{ value: "bot", label: "Versus bot", blurb: "Practise against the computer." },
] as const;

type Mode = (typeof modes)[number]["value"];

type TrayPiece = { uid: string; key: RankKey; name: string };

function makeTray(): TrayPiece[] {
	return ranks.flatMap((rank) =>
		Array.from({ length: rank.count }, (_, index) => ({
			uid: `${rank.key}-${index}`,
			key: rank.key,
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

export function BoardSetup() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const tray = useMemo(makeTray, []);
	const trayIds = useMemo(() => new Set(tray.map((piece) => piece.uid)), [tray]);
	const { level: coachLevel, setLevel: setCoachLevel } = useCoachLevel();

	const [mode, setMode] = useState<Mode>("room");
	const [difficulty, setDifficulty] = useState("Sergeant");
	const [localStep, setLocalStep] = useState<1 | 2>(1);
	const [joinCode, setJoinCode] = useState("");
	const [placement, setPlacement] = useState<Record<number, string>>({});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [selected, setSelected] = useState<string | null>(null);
	const [showReference, setShowReference] = useState(false);
	const [pickerZone, setPickerZone] = useState<number | null>(null);
	const [draggingUid, setDraggingUid] = useState<string | null>(null);
	const [callsign, setCallsign] = useState("");
	const [resumable, setResumable] = useState<{ mode: LiveMode; moves: number; label: string } | null>(null);

	const loadedLoadout = useRef(false);
	const touchDrag = useRef<{ uid: string; pointerId: number; startX: number; startY: number; dragging: boolean } | null>(null);
	const suppressClick = useRef(false);

	const placed = new Set(Object.values(placement));
	const ready = placed.size === tray.length;
	const reservePieces = tray.filter((piece) => !placed.has(piece.uid));
	const canStart = ready && !busy && (mode !== "join" || joinCode.length === 4);

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

				// Dropping onto an occupied square swaps rather than refusing.
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
		const cells = shuffle(Array.from({ length: ZONE_COUNT }, (_, index) => index));
		animatePlacement(() => {
			setPlacement(Object.fromEntries(shuffle(tray).map((piece, index) => [cells[index], piece.uid])));
		});
		setSelected(null);
		setPickerZone(null);
	};

	const applyFormation = (id: string) => {
		const formation = formations.find((item) => item.id === id);
		if (!formation) return;
		animatePlacement(() => setPlacement(formationLoadout(formation)));
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
		if (uid) recallPiece(uid);
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
		if (touchDrag.current?.pointerId !== event.pointerId) return;
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
				body: JSON.stringify({ loadout: placement, name: callsign }),
			});
			const payload = (await response.json()) as { token?: string; room?: { code: string }; error?: string };
			if (!response.ok || !payload.token || !payload.room) throw new Error(payload.error ?? "Could not start the room.");

			sessionStorage.setItem(`gog:room:${payload.room.code}:token`, payload.token);
			router.push(`/play/${payload.room.code}`);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not start the room.");
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
			setError("Player 1 needs to deploy again.");
			return;
		}
		sessionStorage.setItem(LOCAL_MATCH_KEY, JSON.stringify({ gold: JSON.parse(gold), slate: placement }));
		router.push("/play/local");
	};

	useEffect(() => {
		const invited = (searchParams.get("join") ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
		if (invited.length === 4) {
			setMode("join");
			setJoinCode(invited);
		}
	}, [searchParams]);

	useEffect(() => {
		setCallsign(loadCallsign());
		// Offer the most advanced unfinished match on this device.
		const found = (["bot", "local"] as LiveMode[])
			.map((mode) => {
				const info = describeLive(mode);
				return info ? { mode, ...info } : null;
			})
			.filter((item): item is { mode: LiveMode; moves: number; label: string } => item !== null)
			.sort((a, b) => b.moves - a.moves)[0];
		setResumable(found ?? null);
	}, []);

	useEffect(() => {
		try {
			const saved = localStorage.getItem(GUEST_LOADOUT_KEY);
			if (!saved) return;

			const parsed = JSON.parse(saved) as Record<string, unknown>;
			const next: Record<number, string> = {};
			for (const [zoneKey, uid] of Object.entries(parsed)) {
				const zone = Number(zoneKey);
				if (Number.isInteger(zone) && zone >= 0 && zone < ZONE_COUNT && typeof uid === "string" && trayIds.has(uid)) {
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
		try {
			localStorage.setItem(GUEST_LOADOUT_KEY, JSON.stringify(placement));
		} catch {
			// Storage unavailable — the loadout just will not be remembered.
		}
	}, [placement]);

	const primaryLabel = busy
		? "Contacting HQ…"
		: !ready
			? `${tray.length - placed.size} still to place`
			: mode === "join"
				? "Join the battle"
				: mode === "room"
					? "Create the room"
					: mode === "bot"
						? "Start practice"
						: localStep === 1
							? "Lock in player 1"
							: "Start pass & play";

	return (
		<main className="flex min-h-[100dvh] flex-col bg-[var(--background)] text-[var(--foreground)]">
			<AppHeader>
				<Button variant="ghost" size="sm" aria-label="What beats what" onClick={() => setShowReference(true)}>
					<IconHelp size={16} />
					<span aria-hidden className="ml-1.5 hidden sm:inline">What beats what</span>
				</Button>
				<Button variant="ghost" size="sm" asChild>
					<Link href="/">Home</Link>
				</Button>
			</AppHeader>

			<div className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 md:px-6 lg:pb-12">
				<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
					<h1 className="font-display text-[clamp(38px,8vw,68px)] font-bold uppercase leading-[0.9]">
						{mode === "local" && localStep === 2 ? "Player 2, deploy." : "Position your army."}
					</h1>
					<p className="pb-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
						<span className="tabular-nums text-[var(--foreground)]">{placed.size}</span> of {tray.length} placed
					</p>
				</div>

				<div
					className="mt-3 h-[3px] w-full overflow-hidden bg-[var(--line)]"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={tray.length}
					aria-valuenow={placed.size}
					aria-label="Pieces placed"
				>
					<div
						className={cn("h-full transition-[width] duration-300 ease-out", ready ? "bg-[var(--live)]" : "bg-[var(--accent)]")}
						style={{ width: `${(placed.size / tray.length) * 100}%` }}
					/>
				</div>

				{resumable ? (
					<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border border-[var(--line-strong)] bg-[var(--panel)] px-4 py-3">
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">You have a match in progress</p>
							<p className="mt-0.5 text-xs text-[var(--ink-muted)]">
								{resumable.label} · <span className="tabular-nums">{resumable.moves}</span>{" "}
								{resumable.moves === 1 ? "move" : "moves"} played
							</p>
						</div>
						<div className="flex flex-none gap-2">
							<Button size="sm" asChild>
								<Link href={`/play/${resumable.mode}`}>Resume</Link>
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									clearLive(resumable.mode);
									setResumable(null);
								}}
							>
								Discard
							</Button>
						</div>
					</div>
				) : null}

				<CoachLine
					className="mt-4"
					onChangeLevel={setCoachLevel}
					input={{ level: coachLevel, phase: "deploy", yourTurn: true, movesPlayed: 0, placed: placed.size, total: tray.length }}
				/>

				<section className="mt-5" aria-labelledby="formations-heading">
					<div className="flex items-baseline justify-between gap-3">
						<h2 id="formations-heading" className="font-display text-xl font-semibold uppercase tracking-wide">
							Start from a formation
						</h2>
						<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">Then change anything</span>
					</div>
					<div className="mt-2.5 grid gap-2 sm:grid-cols-3">
						{formations.map((formation) => (
							<button
								key={formation.id}
								type="button"
								onClick={() => applyFormation(formation.id)}
								className="group border border-[var(--line-strong)] bg-[var(--panel)] p-3 text-left transition-colors hover:border-[var(--ink-muted)]"
							>
								<span className="block font-display text-lg font-semibold uppercase leading-none tracking-wide">{formation.name}</span>
								<span className="mt-1.5 block text-xs leading-snug text-[var(--ink-muted)]">{formation.doctrine}</span>
							</button>
						))}
					</div>
				</section>

				<div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_308px] lg:items-start">
					{/* ---- board ---- */}
					<section aria-label="Your deployment zone">
						<div className="flex items-center justify-between px-0.5 pb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
							<span>Front line · facing the enemy</span>
						</div>

						<div className="grid grid-cols-9 gap-1">
							{Array.from({ length: ZONE_COUNT }).map((_, zone) => {
								const piece = pieceById(placement[zone]);
								const frontLine = zone < COLS;

								return (
									<button
										key={zone}
										type="button"
										data-setup-zone={zone}
										aria-label={
											piece ? `${piece.name} on square ${zone + 1}. Activate to recall it.` : `Empty square ${zone + 1}. Activate to place a piece.`
										}
										onClick={() => {
											if (suppressClick.current) {
												suppressClick.current = false;
												return;
											}
											if (piece) {
												placePiece(zone, null);
												return;
											}
											if (selected) {
												placePiece(zone);
												return;
											}
											setPickerZone(zone);
										}}
										onDragOver={(event) => event.preventDefault()}
										onDrop={(event) => dropOnCell(event, zone)}
										className={cn(
											"relative aspect-square border transition-colors",
											frontLine && "border-t-[var(--gold-lo)]/50",
											piece
												? "border-[var(--line-strong)] bg-[var(--board-light)]"
												: selected
													? "border-dashed border-[var(--accent)]/55 bg-[var(--accent)]/8 hover:bg-[var(--accent)]/14"
													: "border-[var(--board-border)] bg-[var(--board-dark)] hover:border-[var(--ink-faint)]",
										)}
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
												className="absolute inset-[7%] touch-none"
											>
												<Piece rank={piece.key} side="you" state={draggingUid === piece.uid ? "hint" : "idle"} />
											</span>
										) : null}
									</button>
								);
							})}
						</div>

						<p className="px-0.5 pt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">Your back row · protect the flag</p>

						<div className="mt-4 hidden gap-2 lg:flex">
							<Button variant="outline" onClick={autoDeploy}>
								<IconShuffle size={15} />
								<span className="ml-1.5">Randomise</span>
							</Button>
							<Button variant="outline" onClick={() => setPlacement({})} disabled={!placed.size}>
								<IconClear size={15} />
								<span className="ml-1.5">Clear</span>
							</Button>
							<Button className="ml-auto" disabled={!canStart} onClick={startMatch}>
								{primaryLabel}
							</Button>
						</div>
					</section>

					{/* ---- reserve + mode ---- */}
					<aside className="space-y-5">
						<section data-reserve-drop onDragOver={(event) => event.preventDefault()} onDrop={recallToReserve} aria-label="Reserve">
							<div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
								<h2 className="font-display text-xl font-semibold uppercase tracking-wide">Reserve</h2>
								<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
									<span className="tabular-nums">{reservePieces.length}</span> left
								</span>
							</div>

							{reservePieces.length ? (
								<>
									<p className="pt-2 text-xs text-[var(--ink-muted)]">Tap a piece, then tap a square. Tap a placed piece to send it back.</p>
									<div className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-9 lg:grid-cols-6">
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
												title={`${piece.name} — ${rankShort[piece.key]}`}
												className={cn(
													"flex touch-none items-center justify-center border p-1 transition-colors",
													selected === piece.uid
														? "border-[var(--accent)] bg-[var(--accent)]/12"
														: draggingUid === piece.uid
															? "border-[var(--accent)] opacity-70"
															: "border-[var(--line-strong)] bg-[var(--panel)] hover:border-[var(--ink-muted)]",
												)}
											>
												<Piece rank={piece.key} side="you" scale="card" />
											</button>
										))}
									</div>
								</>
							) : (
								<p className="pt-3 text-sm text-[var(--live)]">Everything is on the board. Adjust freely, or start the match.</p>
							)}
						</section>

						<section aria-label="Match type">
							<h2 className="border-b border-[var(--line)] pb-2 font-display text-xl font-semibold uppercase tracking-wide">Match type</h2>

							<div className="mt-3 grid grid-cols-2 gap-1.5">
								{modes.map((item) => (
									<button
										key={item.value}
										type="button"
										onClick={() => {
											setMode(item.value);
											setLocalStep(1);
											setError("");
										}}
										aria-pressed={mode === item.value}
										className={cn(
											"border px-2.5 py-2 text-left transition-colors",
											mode === item.value
												? "border-[var(--accent)] bg-[var(--accent)]/10"
												: "border-[var(--line-strong)] bg-[var(--panel)] hover:border-[var(--ink-muted)]",
										)}
									>
										<span className="block text-[13px] font-medium leading-tight">{item.label}</span>
									</button>
								))}
							</div>

							<p className="mt-2.5 text-xs leading-relaxed text-[var(--ink-muted)]">{modes.find((item) => item.value === mode)?.blurb}</p>

							{mode === "room" || mode === "join" ? (
								<div className="mt-3">
									<label htmlFor="callsign" className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
										Your callsign
									</label>
									<div className="mt-1.5 flex gap-1.5">
										<input
											id="callsign"
											value={callsign}
											maxLength={MAX_CALLSIGN}
											autoComplete="off"
											spellCheck={false}
											onChange={(event) => setCallsign(cleanCallsign(event.target.value))}
											onBlur={() => setCallsign(saveCallsign(callsign))}
											className="min-w-0 flex-1 border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2 text-sm outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
											placeholder="Iron Colonel"
										/>
										<Button
											variant="outline"
											size="sm"
											aria-label="Suggest another callsign"
											onClick={() => setCallsign(saveCallsign(randomCallsign()))}
											className="flex-none"
										>
											<IconShuffle size={15} />
										</Button>
									</div>
									<p className="mt-1.5 text-xs text-[var(--ink-faint)]">Shown to your opponent. No account needed.</p>
								</div>
							) : null}

							{mode === "join" && searchParams.get("join") ? (
								<p className="mt-3 border border-[var(--line-strong)] bg-[var(--panel)] p-3 text-xs leading-relaxed text-[var(--ink-muted)]">
									You were invited to room <span className="font-mono text-[var(--foreground)]">{joinCode}</span>. Deploy your
									army, then join.
								</p>
							) : null}

							{mode === "join" ? (
								<div className="mt-3">
									<label htmlFor="join-code" className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
										Room code
									</label>
									<input
										id="join-code"
										value={joinCode}
										autoComplete="off"
										autoCapitalize="characters"
										spellCheck={false}
										onChange={(event) =>
											setJoinCode(
												event.target.value
													.toUpperCase()
													.replace(/[^A-Z]/g, "")
													.slice(0, 4),
											)
										}
										placeholder="XXXX"
										className="mt-1.5 w-full border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2.5 text-center font-mono text-xl uppercase tracking-[0.28em] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
									/>
								</div>
							) : null}

							{mode === "bot" ? (
								<div className="mt-3 grid gap-1">
									{difficulties.map((level) => (
										<button
											key={level.name}
											type="button"
											onClick={() => setDifficulty(level.name)}
											aria-pressed={difficulty === level.name}
											className={cn(
												"flex items-center gap-3 border px-2.5 py-1.5 text-left transition-colors",
												difficulty === level.name
													? "border-[var(--accent)] bg-[var(--accent)]/10"
													: "border-[var(--line-strong)] hover:border-[var(--ink-muted)]",
											)}
										>
											<span className="w-8 shrink-0 text-center text-[12px] leading-none tracking-tight text-[var(--accent)]">{level.glyph}</span>
											<span className="min-w-0">
												<span className="block text-[13px] leading-tight">{level.name}</span>
												<span className="block truncate text-[11px] leading-tight text-[var(--ink-muted)]">{level.note}</span>
											</span>
										</button>
									))}
								</div>
							) : null}

							{mode === "local" ? (
								<p className="mt-3 border border-[var(--line-strong)] bg-[var(--panel)] p-3 text-xs leading-relaxed text-[var(--ink-muted)]">
									{localStep === 1
										? "Player 1 deploys first. Player 2 sets up on the same device afterwards — hand it over when prompted."
										: "Player 2: place your army without letting Player 1 watch."}
								</p>
							) : null}

							{error ? (
								<p role="alert" className="mt-3 border border-[var(--loss)]/50 bg-[var(--loss)]/10 p-2.5 text-xs leading-relaxed text-[#e0a08c]">
									{error}
								</p>
							) : null}
						</section>
					</aside>
				</div>
			</div>

			{/* Sticky action bar keeps the primary action in thumb reach on phones. */}
			<div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--background)]/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
				<div className="mx-auto flex max-w-[1180px] items-center gap-2">
					<Button variant="outline" size="sm" onClick={autoDeploy} aria-label="Randomise deployment" className="shrink-0">
						<IconShuffle size={15} />
					</Button>
					<Button variant="outline" size="sm" onClick={() => setPlacement({})} disabled={!placed.size} aria-label="Clear the board" className="shrink-0">
						<IconClear size={15} />
					</Button>
					<Button size="sm" className="flex-1" disabled={!canStart} onClick={startMatch}>
						{primaryLabel}
					</Button>
				</div>
			</div>

			<Sheet
				open={showReference}
				onClose={() => setShowReference(false)}
				title="What beats what"
				size="lg"
				footer={
					<Button variant="outline" className="w-full" asChild>
						<Link href="/how-to-play">Read the full rules</Link>
					</Button>
				}
			>
				<RankReference />
			</Sheet>

			<Sheet
				open={pickerZone != null}
				onClose={() => setPickerZone(null)}
				title="Choose a piece"
				description={pickerPiece ? `${pickerPiece.name} is on this square.` : "Pick from your reserve."}
				footer={
					pickerPiece ? (
						<Button variant="outline" className="w-full" onClick={() => pickerZone != null && placePiece(pickerZone, null)}>
							Send {pickerPiece.name} back to reserve
						</Button>
					) : undefined
				}
			>
				{reservePieces.length ? (
					<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
						{reservePieces.map((piece) => (
							<button
								key={piece.uid}
								type="button"
								onClick={() => pickerZone != null && placePiece(pickerZone, piece.uid)}
								className="flex flex-col items-center gap-2 border border-[var(--line-strong)] bg-[var(--panel)] p-2.5 transition-colors hover:border-[var(--accent)]"
							>
								<Piece rank={piece.key} side="you" scale="tray" />
								<span className="w-full truncate text-center text-[11px] leading-tight text-[var(--ink-muted)]">{piece.name}</span>
							</button>
						))}
					</div>
				) : (
					<p className="text-sm text-[var(--ink-muted)]">Every piece is deployed. Send one back from the board to change this square.</p>
				)}
			</Sheet>
		</main>
	);
}
