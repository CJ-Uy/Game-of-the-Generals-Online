"use client";

import { useMemo, useState, type CSSProperties, type DragEvent } from "react";
import Link from "next/link";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { TutorialModal } from "@/components/home/home-experience";

const COLS = 9;
const ROWS = 8;

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

type Piece = {
	uid: string;
	key: string;
	glyph: string;
	name: string;
};

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

function randomCode() {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
	return `GG-${Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")}`;
}

function glyphSize(glyph: string) {
	if (glyph.length >= 4) return "text-[10px] sm:text-xs";
	if (glyph.length === 3) return "text-xs sm:text-sm";
	return "text-base sm:text-lg";
}

export function BoardSetup() {
	const tray = useMemo(makeTray, []);
	const [mode, setMode] = useState<Mode>("bot");
	const [difficulty, setDifficulty] = useState("Normal");
	const [roomCode, setRoomCode] = useState("");
	const [joinCode, setJoinCode] = useState("");
	const [placement, setPlacement] = useState<Record<number, string>>({});
	const [selected, setSelected] = useState<string | null>(null);
	const [showTutorial, setShowTutorial] = useState(false);
	const [pickerZone, setPickerZone] = useState<number | null>(null);
	const placed = new Set(Object.values(placement));
	const ready = placed.size === tray.length;
	const reservePieces = tray.filter((piece) => !placed.has(piece.uid));

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

	const pieceById = (uid?: string) => tray.find((piece) => piece.uid === uid);
	const pickerPiece = pickerZone == null ? undefined : pieceById(placement[pickerZone]);

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

			<section className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 lg:grid-cols-[280px_minmax(520px,1fr)_320px] lg:px-6 xl:px-8">
				<aside className="order-2 space-y-4 lg:order-1">
					<Card className="p-5">
						<CardTitle>Select mode</CardTitle>
						<div className="mt-4 grid gap-2">
							{[
								["bot", "Versus bot", "Pick a commander difficulty."],
								["room", "Create lobby", "Generate a room code."],
								["join", "Join lobby", "Enter a code from a friend."],
								["local", "Pass & play", "Two commanders, one device."],
							].map(([value, title, body]) => (
								<button
									key={value}
									type="button"
									onClick={() => setMode(value as Mode)}
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
						<CardTitle>Match options</CardTitle>
						<div className="mt-4 space-y-3">
							{mode === "bot" ? (
								<div className="grid gap-2">
									{["Easy", "Normal", "Hard"].map((level) => (
										<button
											key={level}
											type="button"
											onClick={() => setDifficulty(level)}
											className={`rounded-[4px] border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] ${
												difficulty === level ? "border-[var(--accent)] text-[var(--accent)]" : "border-[#2c3a55] text-[#8a93a8]"
											}`}
										>
											{level}
										</button>
									))}
								</div>
							) : null}
							{mode === "room" ? (
								<div className="space-y-3">
									<div className="rounded-[6px] border border-dashed border-[rgba(201,168,93,0.45)] p-4 text-center font-mono text-2xl font-semibold tracking-[0.2em] text-[var(--accent)]">
										{roomCode || "GG-...."}
									</div>
									<Button variant="outline" className="w-full" onClick={() => setRoomCode(randomCode())}>
										Generate code
									</Button>
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
							{mode === "local" ? <p className="text-sm leading-6 text-[#8a93a8]">Commander 2 will deploy after Commander 1 locks this board.</p> : null}
						</div>
					</Card>
				</aside>

				<section className="order-1 min-w-0 lg:order-2">
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

					<div className="rounded-[8px] border border-[#1c2740] bg-[#0b101b] p-2 sm:p-3">
						<div className="grid grid-cols-9 gap-1">
							{Array.from({ length: COLS * ROWS }).map((_, index) => {
								const row = Math.floor(index / COLS);
								const col = index % COLS;
								const zone = (row - 5) * COLS + col;
								const active = row >= 5;
								const piece = active ? pieceById(placement[zone]) : undefined;

								return (
									<button
										key={index}
										type="button"
										disabled={!active}
										onClick={() => {
											if (!active) return;
											setPickerZone(zone);
											setSelected(null);
										}}
										onDragOver={(event) => active && event.preventDefault()}
										onDrop={(event) => active && dropOnCell(event, zone)}
										className={`aspect-square rounded-[4px] border transition-colors ${
											active
												? piece
													? "border-[rgba(201,168,93,0.5)] bg-[#121b2c]"
													: selected
														? "border-[rgba(201,168,93,0.55)] bg-[rgba(201,168,93,0.08)]"
														: "border-[#2c3a55] bg-[#121b2c]"
												: "border-[#162035] bg-[#090e18]"
										}`}
									>
										{piece ? (
											<span
												draggable
												onDragStart={(event) => startDrag(event, piece.uid)}
												style={{ viewTransitionName: `piece-${piece.uid}` } as CSSProperties}
												className={`mx-auto flex h-[74%] w-[82%] items-center justify-center rounded-[4px] border border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] font-bold text-[#0e1420]/75 ${glyphSize(piece.glyph)}`}
											>
												{piece.glyph}
											</span>
										) : null}
									</button>
								);
							})}
						</div>
					</div>

					<div className="mt-4 flex flex-wrap gap-3">
						<Button variant="outline" size="sm" onClick={autoDeploy} aria-label="Shuffle deployment" title="Shuffle deployment">
							⇄
						</Button>
						<Button variant="outline" onClick={() => setPlacement({})}>
							Clear board
						</Button>
						<Button disabled={!ready}>
							Ready for battle
						</Button>
					</div>
				</section>

				<aside className="order-3 space-y-4">
					<Card className="p-5">
						<CardTitle>Reserve</CardTitle>
						<CardContent className="mt-3 p-0">Tap a square to choose a reserve piece. Drag placed pieces to move or swap.</CardContent>
						<div className="mt-4 grid grid-cols-3 gap-2">
							{reservePieces.map((piece) => (
								<button
									key={piece.uid}
									type="button"
									draggable
									onDragStart={(event) => startDrag(event, piece.uid)}
									onClick={() => setSelected(selected === piece.uid ? null : piece.uid)}
									className={`rounded-[5px] border p-2 transition-colors ${
										selected === piece.uid ? "border-[var(--accent)] bg-[rgba(201,168,93,0.14)]" : "border-[#2c3a55] bg-[#121b2c]"
									}`}
								>
									<div className={`${glyphSize(piece.glyph)} font-bold leading-none text-[var(--accent)]`}>{piece.glyph}</div>
									<div className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.08em] text-[#8a93a8]">{piece.name}</div>
								</button>
							))}
						</div>
					</Card>

					<Card className="p-5">
						<CardTitle>Loadout</CardTitle>
						<div className="mt-4 grid gap-2 text-sm text-[#aeb5c4]">
							<div className="flex justify-between gap-4">
								<span>Board set</span>
								<span className="text-[var(--accent)]">Brass Command</span>
							</div>
							<div className="flex justify-between gap-4">
								<span>Piece skin</span>
								<span className="text-[var(--accent)]">Standard Issue</span>
							</div>
							<div className="flex justify-between gap-4">
								<span>Mode</span>
								<span className="text-[var(--accent)]">{mode === "bot" ? `Bot · ${difficulty}` : mode}</span>
							</div>
						</div>
					</Card>
				</aside>
			</section>
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
										<div className={`${glyphSize(piece.glyph)} font-bold leading-none text-[var(--accent)]`}>{piece.glyph}</div>
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
