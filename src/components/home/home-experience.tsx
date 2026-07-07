"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { WarBoard } from "@/components/home/war-board";

const ranks = [
	["★★★★★", "5-Star General", "x 1"],
	["★★★★", "4-Star General", "x 1"],
	["★★★", "3-Star General", "x 1"],
	["★★", "2-Star General", "x 1"],
	["★", "1-Star General", "x 1"],
	["▲▲▲", "Colonel", "x 1"],
	["▲▲", "Lt. Colonel", "x 1"],
	["▲", "Major", "x 1"],
	["◆◆◆", "Captain", "x 1"],
	["◆◆", "1st Lieutenant", "x 1"],
	["◆", "2nd Lieutenant", "x 1"],
	["∧∧∧", "Sergeant", "x 1"],
	["∧", "Private", "x 6"],
	["◉", "Spy", "x 2"],
	["⚑", "Flag", "x 1"],
];

const playModes = [
	["Solo Drill", "Practice against an AI commander.", "AI"],
	["Pass & Play", "Two players on one device.", "Local"],
	["Private Room", "Share a room code with a friend.", "Online"],
];

const shopItems = [
	["Brass Command Set", "Classic gold pieces with officer-table trim.", "250"],
	["Jade Field Set", "Deep green board and subdued rank markers.", "320"],
	["Crimson Campaign", "Red command accents for aggressive play.", "410"],
];

function Modal({
	title,
	children,
	onClose,
}: {
	title: string;
	children: React.ReactNode;
	onClose: () => void;
}) {
	return (
		<div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#05070c]/80 p-4 backdrop-blur-sm" onClick={onClose}>
			<div
				className="max-h-[88dvh] w-full max-w-3xl overflow-auto rounded-[8px] border border-[#2c3a55] bg-[#0e1420] shadow-[0_30px_100px_rgba(0,0,0,0.65)]"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1c2740] bg-[#0e1420]/95 px-5 py-4">
					<h2 className="font-display text-3xl font-extrabold uppercase tracking-normal text-[#ede8da]">{title}</h2>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Close
					</Button>
				</div>
				<div className="p-5 md:p-7">{children}</div>
			</div>
		</div>
	);
}

export function TutorialModal({ onClose }: { onClose: () => void }) {
	const [step, setStep] = useState(0);
	const steps = [
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
	const current = steps[step];

	return (
		<Modal title="Field Manual" onClose={onClose}>
			<div className="mb-5 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">
				Field manual · {String(step + 1).padStart(2, "0")} / 05
			</div>
			<div className="rounded-[8px] border border-[#1c2740] bg-[#0b101b] p-5">{current.visual}</div>
			<h3 className="mt-5 font-display text-3xl font-bold uppercase text-[#ede8da]">{current.title}</h3>
			<p className="mt-3 text-sm leading-7 text-[#aeb5c4]">{current.body}</p>
			<div className="mt-6 flex items-center justify-between gap-3 border-t border-[#1c2740] pt-5">
				<Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
					Back
				</Button>
				<div className="flex gap-2">
					{steps.map((item, index) => (
						<span
							key={item.title}
							className={`h-2 rounded-full transition-all ${index === step ? "w-6 bg-[var(--accent)]" : "w-2 bg-[#2c3a55]"}`}
						/>
					))}
				</div>
				<Button
					size="sm"
					onClick={() => {
						if (step === steps.length - 1) onClose();
						else setStep((value) => value + 1);
					}}
				>
					{step === steps.length - 1 ? "To the front" : "Next"}
				</Button>
			</div>
		</Modal>
	);
}

function SetupRows() {
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="grid grid-cols-9 gap-1">
				{Array.from({ length: 27 }).map((_, index) => (
					<div
						key={index}
						className={`h-7 w-7 rounded-[4px] border ${
							[2, 7, 11, 15, 21, 25].includes(index)
								? "border-[#2c3a55] bg-[#121b2c]"
								: "border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a]"
						}`}
					/>
				))}
			</div>
			<div className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-[#5b647a]">
				Your three back rows · arrange them any way you like
			</div>
		</div>
	);
}

function MoveDiagram() {
	return (
		<div className="mx-auto grid w-max grid-cols-3 gap-1">
			{["", "↑", "", "←", "∧∧∧", "→", "", "↓", ""].map((label, index) => (
				<div
					key={index}
					className={`flex h-12 w-12 items-center justify-center rounded-[4px] border ${
						label === "∧∧∧"
							? "border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] text-[#0e1420]/75"
							: label
								? "border-[rgba(201,168,93,0.55)] bg-[rgba(201,168,93,0.14)] text-[var(--accent)]"
								: "border-[#1c2740] bg-[#121b2c]"
					}`}
				>
					{label}
				</div>
			))}
		</div>
	);
}

function ArbiterDiagram() {
	return (
		<div className="flex flex-col items-center gap-3">
			<div className="wr-arbiter-live rounded-[4px] border border-[var(--accent)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--accent)]">
				Arbiter
			</div>
			<div className="relative h-20 w-20">
				<div className="absolute inset-0 rounded-[6px] border border-[#2c3a55] bg-gradient-to-br from-[#253352] to-[#1a2338]" />
				<div className="absolute inset-0 flex -translate-x-3 -translate-y-4 -rotate-3 items-center justify-center rounded-[6px] border border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] font-bold text-[#0e1420]/75 shadow-[0_14px_30px_rgba(0,0,0,0.5)]">
					▲▲
				</div>
			</div>
		</div>
	);
}

function RankTrapDiagram() {
	return (
		<div className="grid gap-3">
			{[
				["◉", "kills", "★★★★★", "every officer"],
				["∧", "kills", "◉", "only the private"],
			].map(([left, verb, right, label]) => (
				<div key={label} className="flex items-center justify-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-[6px] border border-[#dabb74] bg-[#c9a85d] font-bold text-[#0e1420]/75">
						{left}
					</div>
					<span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8a93a8]">{verb}</span>
					<div className="flex h-12 w-12 items-center justify-center rounded-[6px] border border-[#2c3a55] bg-[#1a2338] text-[10px] font-bold text-[var(--accent)]">
						{right}
					</div>
					<span className="hidden font-mono text-[10px] uppercase text-[#5b647a] sm:inline">{label}</span>
				</div>
			))}
		</div>
	);
}

function FlagDiagram() {
	return (
		<div className="flex items-center justify-center gap-1">
			{["⚑", "→", "→", "→", "⚑"].map((label, index) => (
				<div
					key={index}
					className={`flex h-11 w-11 items-center justify-center rounded-[5px] border ${
						index === 0
							? "border-[#dabb74] bg-[#c9a85d] text-[#0e1420]/75"
							: index === 4
								? "border-dashed border-[var(--accent)] bg-[rgba(201,168,93,0.1)] text-[var(--accent)]"
								: "border-[#2c3a55] bg-[#121b2c] text-[#44506b]"
					}`}
				>
					{label}
				</div>
			))}
		</div>
	);
}

function ShopModal({ onClose }: { onClose: () => void }) {
	return (
		<Modal title="Shop" onClose={onClose}>
			<div className="grid gap-3 md:grid-cols-3">
				{shopItems.map(([name, body, price]) => (
					<Card key={name} className="overflow-hidden">
						<div className="aspect-[4/3] border-b border-[#1c2740] bg-[radial-gradient(circle_at_30%_20%,rgba(201,168,93,0.26),transparent_34%),linear-gradient(135deg,#1a2338,#0b101b)]" />
						<div className="p-5">
							<CardTitle>{name}</CardTitle>
							<CardContent className="mt-3 p-0">{body}</CardContent>
							<Button className="mt-5 w-full" variant="outline">
								{price} coins
							</Button>
						</div>
					</Card>
				))}
			</div>
		</Modal>
	);
}

export function HomeExperience() {
	const [modal, setModal] = useState<"tutorial" | "shop" | null>(null);

	return (
		<main className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
			<header className="sticky top-0 z-50 flex h-[60px] items-center justify-between gap-4 border-b border-[#1c2740] bg-[#0e1420]/90 px-5 backdrop-blur md:px-12">
				<a href="#" className="flex min-w-0 items-center gap-2.5">
					<span className="text-[var(--accent)]">★</span>
					<span className="font-display text-lg font-bold uppercase tracking-[0.07em] md:hidden">GoG Online</span>
					<span className="hidden truncate font-display text-xl font-bold uppercase tracking-[0.07em] md:inline">Game of the Generals</span>
				</a>
				<nav className="flex items-center gap-2 md:gap-4">
					<Button variant="ghost" size="sm" className="hidden md:inline-flex" asChild>
						<Link href="/about">About</Link>
					</Button>
					<Button variant="ghost" size="sm" onClick={() => setModal("shop")}>
						Shop
					</Button>
					<Button variant="outline" size="sm" className="hidden sm:inline-flex">
						Sign in
					</Button>
					<Button size="sm" asChild>
						<Link href="/play">Play</Link>
					</Button>
				</nav>
			</header>

			<section className="relative flex min-h-[calc(100dvh-60px)] items-center justify-center overflow-hidden border-b border-[#1c2740]">
				<WarBoard />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_72%_64%_at_50%_50%,rgba(14,20,32,0)_32%,#0e1420_84%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_56%_50%_at_50%_47%,rgba(14,20,32,0.78),rgba(14,20,32,0.46)_55%,rgba(14,20,32,0)_82%)]" />

				<div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 px-5 py-20 text-center">
					<div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
						<span className="h-px w-8 bg-[var(--accent)]/60" />
						<span>Salpakan · Filipino strategy classic · Est. 1970</span>
						<span className="h-px w-8 bg-[var(--accent)]/60" />
					</div>
					<h1 className="font-display text-[clamp(54px,8.2vw,130px)] font-extrabold uppercase leading-[0.92] tracking-normal text-[#ede8da] drop-shadow-[0_18px_50px_rgba(0,0,0,0.95)]">
						<span className="mb-2 block text-[0.32em] font-bold tracking-[0.34em] text-[#c7cbd6]">Game of the</span>
						Generals
						<br />
						<span className="text-[var(--accent)]">Online</span>
					</h1>
					<p className="max-w-xl text-[clamp(15px,1.7vw,19px)] leading-8 text-[#d8d2c4] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
						Chess with a poker face. May the best liar win.
					</p>
					<div className="flex flex-wrap justify-center gap-3">
						<Button size="lg" asChild>
							<Link href="/play">Deploy as guest</Link>
						</Button>
						<Button variant="outline" size="lg" onClick={() => setModal("tutorial")}>
							Tutorial
						</Button>
					</div>
				</div>
			</section>

			<section id="command" className="border-t border-[#1c2740] bg-[#0b101b]">
				<div className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
					<div className="mb-9 flex flex-wrap items-end justify-between gap-4">
						<div>
							<p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{"//"} Chain of command</p>
							<h2 className="font-display text-[clamp(36px,5vw,64px)] font-extrabold uppercase leading-none">
								Fifteen ranks. One traitor logic.
							</h2>
						</div>
						<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b647a]">21 pieces per side</p>
					</div>
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
						{ranks.map(([glyph, name, count]) => (
							<Card key={name} className="p-4 transition-colors hover:border-[var(--accent)]">
								<div className="mb-2 text-[15px] leading-none tracking-[2px] text-[var(--accent)]">{glyph}</div>
								<div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#ede8da]">{name}</div>
								<div className="mt-2 font-mono text-[9px] text-[#5b647a]">{count}</div>
							</Card>
						))}
					</div>
					<div className="mt-6 flex flex-wrap gap-2">
						<Badge>The spy kills every officer</Badge>
						<Badge>Only a private kills a spy</Badge>
						<Badge>The flag beats only the other flag</Badge>
					</div>
				</div>
			</section>

			<section id="deploy" className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
				<h2 className="mb-10 font-display text-[clamp(36px,5vw,64px)] font-extrabold uppercase leading-none">Choose your front.</h2>
				<div className="grid gap-4 md:grid-cols-3">
					{playModes.map(([title, body, tag]) => (
						<Card key={title} className="flex min-h-56 flex-col p-6 transition-colors hover:border-[var(--accent)]">
							<div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b647a]">{tag}</div>
							<CardTitle>{title}</CardTitle>
							<CardContent className="mt-3">{body}</CardContent>
							<Link className="mt-auto pt-6 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]" href="/play">
								Set up board
							</Link>
						</Card>
					))}
				</div>
			</section>

			<footer className="border-t border-[#1c2740] bg-[#0b101b]">
				<div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:px-12">
					<h2 className="font-display text-[clamp(44px,7vw,96px)] font-extrabold uppercase leading-[0.95]">
						Your move,
						<br />
						<span className="text-[var(--accent)]">General.</span>
					</h2>
					<div className="flex flex-col gap-3">
						<Button size="lg" asChild>
							<Link href="/play">Deploy as guest. It&apos;s free</Link>
						</Button>
						<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b647a]">No account · No download · 10 minutes a match</p>
					</div>
				</div>
			</footer>

			{modal === "tutorial" ? <TutorialModal onClose={() => setModal(null)} /> : null}
			{modal === "shop" ? <ShopModal onClose={() => setModal(null)} /> : null}
		</main>
	);
}
