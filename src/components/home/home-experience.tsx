"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { SiteHeader } from "@/components/app-header";
import { IconArrowRight, IconArrowUp } from "@/components/ui/icons";
import { WarBoard } from "@/components/home/war-board";
import { SiteFooter } from "@/components/site-footer";
import { ranks as rankTable, type RankKey } from "@/lib/game";
import { formations } from "@/lib/formations";
import { Piece } from "@/components/game/piece";
import { cn } from "@/lib/utils";

// Strongest first: on this section the order itself is the rule.
const ladder = rankTable.map((rank) => ({ key: rank.key, name: rank.name, count: rank.count }));

// The same three ways in as the footer, and each one lands on the setup screen
// with that match type already chosen.
const playModes = [
	{ title: "Vs computer", body: "Practise against the computer. Five difficulty levels and a wildcard, no waiting.", tag: "Solo", href: "/play?mode=bot" },
	{ title: "Pass & play", body: "Two commanders, one device. The screen hides each army before it is handed over.", tag: "Same screen", href: "/play?mode=local" },
	{ title: "Private room", body: "Get a four-letter code and an invite link, and send it to whoever you want to beat.", tag: "Online", href: "/play?mode=room" },
];

// Cosmetics only, and nothing that touches rating, clock or information.
const shopItems: { name: string; body: string; rarity: string; board: [string, string]; piece: string }[] = [
	{ name: "Brass Command Set", body: "Classic gold pieces with officer-table trim.", rarity: "Common", board: ["#202936", "#121923"], piece: "linear-gradient(150deg,#c9a85d,#a8894a)" },
	{ name: "Jade Field Set", body: "Deep green board and subdued rank markers.", rarity: "Rare", board: ["#1b3a33", "#112822"], piece: "linear-gradient(150deg,#b9c4a4,#8d9a79)" },
	{ name: "Crimson Campaign", body: "Red command accents for aggressive play.", rarity: "Legendary", board: ["#2a1f26", "#1a1318"], piece: "linear-gradient(150deg,#c4654d,#93412f)" },
];

function Inversion({ attacker, defender, text }: { attacker: RankKey; defender: RankKey; text: string }) {
	return (
		<p className="flex items-center gap-3 text-[15px] leading-6 text-[var(--foreground)]">
			<span className="flex flex-none items-center gap-1.5">
				<Piece rank={attacker} side="you" scale="card" />
				<span aria-hidden className="font-mono text-xs text-[var(--live)]">&gt;</span>
				<Piece rank={defender} side="you" scale="card" />
			</span>
			{text}
		</p>
	);
}

const tutorialSteps: { title: string; body: string; visual: ReactNode }[] = [
	{
		title: "Deploy in secret",
		body: "Each side fields 21 pieces across 15 ranks. Place them anywhere on your three back rows. Your opponent sees only the backs of your pieces, and you see only theirs.",
		visual: <SetupRows />,
	},
	{
		title: "One square at a time",
		body: "Every piece moves exactly one square forward, backward, or sideways. No jumps, no charges, no diagonals. Turns strictly alternate.",
		visual: <MoveDiagram />,
	},
	{
		title: "Judged in silence",
		body: "Move onto an occupied enemy square to challenge it. The arbiter compares hidden ranks and removes the loser. Equal ranks both fall.",
		visual: <ArbiterDiagram />,
	},
	{
		title: "The food chain has traps",
		body: "Higher rank wins most battles. The Spy kills every officer, but the Private is the only piece that can kill a Spy.",
		visual: <RankTrapDiagram />,
	},
	{
		title: "It all ends with the flag",
		body: "Capture the enemy Flag, or move your own Flag to the far edge. The Flag beats only the other Flag, so guard it with lies.",
		visual: <FlagDiagram />,
	},
];

export function TutorialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
	const [step, setStep] = useState(0);
	const last = tutorialSteps.length - 1;
	const current = tutorialSteps[step];

	// Start from the top every time it opens, and let the arrow keys page it.
	useEffect(() => {
		if (!open) return;
		setStep(0);
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "ArrowRight") setStep((value) => Math.min(last, value + 1));
			if (event.key === "ArrowLeft") setStep((value) => Math.max(0, value - 1));
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, last]);

	return (
		<Sheet
			open={open}
			onClose={onClose}
			title="Field manual"
			description={`Step ${step + 1} of ${tutorialSteps.length} · five rules, one minute`}
			size="lg"
			footer={
				<div className="flex items-center justify-between gap-3">
					<Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
						Back
					</Button>
					<div className="flex gap-1.5">
						{tutorialSteps.map((item, index) => (
							<button
								key={item.title}
								type="button"
								aria-current={index === step ? "step" : undefined}
								aria-label={`Step ${index + 1}: ${item.title}`}
								onClick={() => setStep(index)}
								className="flex h-6 items-center"
							>
								<span
									className={cn(
										"block h-1.5 rounded-full transition-all duration-200",
										index === step ? "w-6 bg-[var(--foreground)]" : "w-1.5 bg-[var(--line-strong)] hover:bg-[var(--ink-faint)]",
									)}
								/>
							</button>
						))}
					</div>
					{step === last ? (
						<Button size="sm" asChild>
							<Link href="/play?mode=bot">Try it on the computer</Link>
						</Button>
					) : (
						<Button size="sm" onClick={() => setStep((value) => value + 1)}>
							Next
						</Button>
					)}
				</div>
			}
		>
			<div className="flex min-h-[184px] items-center justify-center border border-[var(--line)] bg-[var(--panel)] p-5">{current.visual}</div>
			<h3 key={current.title} className="gog-say mt-5 font-display text-3xl font-bold uppercase leading-none">
				{current.title}
			</h3>
			<p className="mt-3 max-w-[60ch] text-[15px] leading-7 text-[var(--ink-muted)]">{current.body}</p>
		</Sheet>
	);
}

function SetupRows() {
	// A real starting formation, not a drawing of one.
	const rows = formations[0].rows;
	return (
		<div className="flex flex-col items-center gap-3">
			<div className="grid grid-cols-9 gap-1">
				{rows.flat().map((rank, index) => (
					<div key={index} className="h-7 w-7 border border-[var(--board-border)] bg-[var(--board-dark)] sm:h-9 sm:w-9">
						{rank ? <Piece rank={rank} side="you" /> : null}
					</div>
				))}
			</div>
			<p className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">Your three rows · any arrangement</p>
		</div>
	);
}

function MoveDiagram() {
	const arrows: Record<number, string> = { 1: "", 3: "-rotate-90", 5: "rotate-90", 7: "rotate-180" };
	return (
		<div className="grid grid-cols-3 gap-1">
			{Array.from({ length: 9 }).map((_, index) => (
				<div
					key={index}
					className={cn(
						"flex h-12 w-12 items-center justify-center border",
						index in arrows ? "border-[var(--line-strong)] bg-[var(--board-light)] text-[var(--foreground)]" : "border-[var(--board-border)] bg-[var(--board-dark)]",
					)}
				>
					{index === 4 ? <Piece rank="SGT" side="you" scale="tray" /> : null}
					{index in arrows ? <IconArrowUp size={18} className={arrows[index]} /> : null}
				</div>
			))}
		</div>
	);
}

function ArbiterDiagram() {
	return (
		<div className="flex flex-col items-center gap-3">
			<span className="wr-arbiter-live border border-[var(--accent)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">
				Arbiter
			</span>
			<div className="relative h-16 w-16">
				<Piece side="foe" className="absolute inset-0 h-full w-full" />
				<span className="absolute inset-0 -translate-x-3 -translate-y-3 -rotate-3 shadow-[var(--e2)]">
					<Piece rank="LTC" side="you" />
				</span>
			</div>
		</div>
	);
}

function RankTrapDiagram() {
	return (
		<div className="grid gap-3">
			{(
				[
					["SPY", "G5", "kills every officer"],
					["PVT", "SPY", "is the only piece that kills a Spy"],
				] as const
			).map(([left, right, label]) => (
				<div key={label} className="flex items-center gap-3">
					<Piece rank={left} side="you" scale="tray" />
					<span aria-hidden className="font-mono text-sm text-[var(--live)]">&gt;</span>
					<Piece rank={right} side="you" scale="tray" />
					<span className="hidden max-w-[16ch] text-sm leading-snug text-[var(--ink-muted)] sm:inline">{label}</span>
				</div>
			))}
		</div>
	);
}

function FlagDiagram() {
	return (
		<div className="flex items-center justify-center gap-1.5">
			<Piece rank="FLG" side="you" scale="tray" />
			{[0, 1, 2].map((index) => (
				<span key={index} className="flex h-11 w-9 items-center justify-center text-[var(--ink-faint)]">
					<IconArrowRight size={16} />
				</span>
			))}
			<span className="flex h-11 w-11 items-center justify-center border border-dashed border-[var(--ink-muted)] font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
				Edge
			</span>
		</div>
	);
}

function SetPreview({ board, piece }: { board: [string, string]; piece: string }) {
	return (
		<div aria-hidden className="grid aspect-[4/3] grid-cols-5 grid-rows-4 gap-[3px] border-b border-[var(--line)] bg-[var(--bg-sunken)] p-3">
			{Array.from({ length: 20 }).map((_, index) => {
				const row = Math.floor(index / 5);
				const light = (row + (index % 5)) % 2 === 0;
				return (
					<span key={index} className="relative" style={{ background: light ? board[0] : board[1] }}>
						{row >= 2 && index % 5 !== 2 ? <span className="absolute inset-[14%]" style={{ background: piece }} /> : null}
						{row === 0 && index % 2 === 1 ? <span className="absolute inset-[14%] bg-[var(--slate-piece)]" /> : null}
					</span>
				);
			})}
		</div>
	);
}

function ShopSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
	return (
		<Sheet open={open} onClose={onClose} title="Board sets" description="Previews of what is being made. Nothing is for sale yet." size="lg">
			<p className="max-w-prose text-[15px] leading-7 text-[var(--ink-muted)]">
				When they arrive they will only ever change how the game looks. No set will touch a rating, a clock, or what
				you can see of your opponent&apos;s army.
			</p>

			<ul className="mt-5 grid gap-3 sm:grid-cols-3">
				{shopItems.map((item) => (
					<li key={item.name} className="overflow-hidden border border-[var(--line)] bg-[var(--panel)]">
						<SetPreview board={item.board} piece={item.piece} />
						<div className="p-4">
							<h3 className="font-display text-xl font-semibold uppercase leading-tight">{item.name}</h3>
							<p className="mt-1.5 text-sm leading-6 text-[var(--ink-muted)]">{item.body}</p>
							<p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">{item.rarity} · in progress</p>
						</div>
					</li>
				))}
			</ul>

			<p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-[var(--ink-muted)]">
				Every mode is free and needs no account. That is not changing.
			</p>
		</Sheet>
	);
}

export function HomeExperience() {
	const [modal, setModal] = useState<"tutorial" | "shop" | null>(null);

	return (
		<main className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
			<SiteHeader>
				<Button variant="ghost" size="sm" className="px-2.5 sm:px-3" onClick={() => setModal("shop")}>
					Shop
				</Button>
			</SiteHeader>

			<section className="relative flex min-h-[min(calc(100dvh-56px),700px)] items-center sm:min-h-[calc(100dvh-56px)] justify-center overflow-hidden border-b border-[var(--line)]">
				<WarBoard />
				{/* Scrims and copy let clicks fall through, so the live board stays playable around the title. */}
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_64%_at_50%_50%,rgba(14,20,32,0)_32%,#0e1420_84%)]" />
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_56%_50%_at_50%_47%,rgba(14,20,32,0.78),rgba(14,20,32,0.46)_55%,rgba(14,20,32,0)_82%)]" />
				{/* Phones stack the board directly under the buttons; darken that band so labels stay legible. */}
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(14,20,32,0.05)_25%,rgba(14,20,32,0.7)_58%,rgba(14,20,32,0.92)_80%)] sm:hidden" />

				<div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-5 pb-16 pt-12 text-center">
					<div className="pointer-events-auto flex flex-col items-center gap-6">
						<h1 className="font-display text-[clamp(54px,8.2vw,130px)] font-extrabold uppercase leading-[0.92] text-[var(--foreground)] drop-shadow-[0_18px_50px_rgba(0,0,0,0.95)]">
							<span className="mb-2 block text-[0.32em] font-bold tracking-[0.34em] text-[#c7cbd6]">Game of the</span>
							Generals
							<br />
							<span className="text-[var(--accent)]">Online</span>
						</h1>
						<p className="max-w-md text-balance text-[clamp(15px,1.7vw,19px)] leading-7 text-[#d8d2c4] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:leading-8">
							Salpakan, the Filipino strategy classic. Chess with a poker face — may the best liar win.
						</p>
						<div className="flex w-full max-w-[22rem] flex-col gap-2.5 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
							<Button size="lg" asChild>
								<Link href="/play">Deploy as guest</Link>
							</Button>
							<div className="grid grid-cols-2 gap-2.5 sm:flex">
								<Button variant="outline" size="lg" className="px-3 sm:px-7" onClick={() => setModal("tutorial")}>
									Quick tutorial
								</Button>
								<Button variant="outline" size="lg" className="px-3 sm:px-7" asChild>
									<Link href="/how-to-play">Full rules</Link>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section id="command" className="border-t border-[var(--line)] bg-[var(--panel)]">
				<div className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
					<div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
						<h2 className="max-w-[16ch] text-balance font-display text-[clamp(36px,5vw,64px)] font-extrabold uppercase leading-[0.92]">
							Fifteen ranks. Two break the order.
						</h2>
						<p className="pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">21 pieces per side</p>
					</div>

					{/* Two columns even on a phone: fifteen full-width rows was a screen and a half of scrolling. */}
					<ol className="mt-10 grid grid-cols-2 gap-x-4 border-t border-[var(--line-strong)] sm:gap-x-10 lg:grid-cols-3">
						{ladder.map((rank, index) => (
							<li key={rank.key} className="flex min-w-0 items-center gap-2.5 border-b border-[var(--line)] py-2.5 sm:gap-3">
								<span className="hidden w-5 flex-none font-mono text-[10px] tabular-nums text-[var(--ink-faint)] sm:block">
									{String(index + 1).padStart(2, "0")}
								</span>
								<Piece rank={rank.key} side="you" scale="card" className="flex-none" />
								<span className="min-w-0 flex-1 truncate text-[13px] text-[var(--foreground)] sm:text-sm">{rank.name}</span>
								<span className="flex-none font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">×{rank.count}</span>
							</li>
						))}
					</ol>

					<div className="mt-10 grid gap-x-10 gap-y-5 sm:grid-cols-2">
						<p className="max-w-[46ch] text-[15px] leading-7 text-[#c3beb2]">
							Higher rank wins. Equal ranks kill each other. Everything above obeys that — and then two pieces
							refuse to.
						</p>
						<div className="space-y-3">
							<Inversion attacker="SPY" defender="G5" text="A Spy kills every officer, up to the 5-Star General." />
							<Inversion attacker="PVT" defender="SPY" text="A Private kills the Spy. Nothing else can, and you hold six." />
						</div>
					</div>
				</div>
			</section>

			<section id="deploy" className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
				<h2 className="font-display text-[clamp(36px,5vw,64px)] font-extrabold uppercase leading-none">Choose your front.</h2>
				<ul className="mt-10 border-t border-[var(--line-strong)]">
					{playModes.map((mode) => (
						<li key={mode.title} className="border-b border-[var(--line)]">
							<Link
								href={mode.href}
								className="group flex items-center gap-4 py-6 transition-colors hover:bg-[var(--panel)] md:gap-8 md:px-3"
							>
								<span className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-baseline md:gap-8">
									<span className="font-display text-[clamp(26px,3.2vw,38px)] font-bold uppercase leading-none md:w-[12.5ch] md:flex-none md:whitespace-nowrap">
										{mode.title}
									</span>
									<span className="flex-1 text-[15px] leading-7 text-[#c3beb2]">{mode.body}</span>
									<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)] md:w-28 md:flex-none md:whitespace-nowrap md:text-right">
										{mode.tag}
									</span>
								</span>
								<span className="flex h-10 w-10 flex-none items-center justify-center border border-[var(--line-strong)] text-[var(--ink-muted)] transition-colors group-hover:border-[var(--ink-muted)] group-hover:text-[var(--foreground)]">
									<IconArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
								</span>
							</Link>
						</li>
					))}
				</ul>
			</section>

			<section className="border-t border-[var(--line)] bg-[var(--panel)]">
				<div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:px-12">
					<h2 className="font-display text-[clamp(44px,7vw,96px)] font-extrabold uppercase leading-[0.95]">
						Your move,
						<br />
						<span className="text-[var(--accent)]">General.</span>
					</h2>
					<div className="flex w-full flex-col gap-3 sm:w-auto">
						<Button size="lg" asChild>
							<Link href="/play">Deploy as guest. It&apos;s free</Link>
						</Button>
						<p className="text-balance font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">No account · No download · 10 minutes a match</p>
					</div>
				</div>
			</section>

			<TutorialModal open={modal === "tutorial"} onClose={() => setModal(null)} />
			<ShopSheet open={modal === "shop"} onClose={() => setModal(null)} />
			<SiteFooter />
		</main>
	);
}
