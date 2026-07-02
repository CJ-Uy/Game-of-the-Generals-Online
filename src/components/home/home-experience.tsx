"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	["✦", "Spy", "x 2"],
	["⚑", "Flag", "x 1"],
];

const rules = [
	["01", "Deploy in secret", "Place your 21 pieces on your three back rows. Your opponent never sees their ranks."],
	["02", "Move one square", "On your turn, move one piece orthogonally. Challenge by moving onto an enemy square."],
	["03", "Trust the arbiter", "The arbiter resolves hidden ranks. You only learn which piece survived."],
	["04", "Win by flag", "Capture the enemy Flag, or move your own Flag to the far edge."],
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

function TutorialModal({ onClose }: { onClose: () => void }) {
	return (
		<Modal title="How To Play" onClose={onClose}>
			<div className="grid gap-3 md:grid-cols-2">
				{rules.map(([num, title, body]) => (
					<Card key={num} className="p-5">
						<CardHeader>
							<div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Rule {num}</div>
							<CardTitle>{title}</CardTitle>
						</CardHeader>
						<CardContent className="mt-3">{body}</CardContent>
					</Card>
				))}
			</div>
			<div className="mt-5 flex flex-wrap gap-2">
				<Badge>Spy beats officers</Badge>
				<Badge>Private beats spy</Badge>
				<Badge>Equal ranks both fall</Badge>
				<Badge>Flag beats only flag</Badge>
			</div>
		</Modal>
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

function SetupModal({ onClose }: { onClose: () => void }) {
	const [mode, setMode] = useState(playModes[0][0]);

	return (
		<Modal title="Set Up Your Board" onClose={onClose}>
			<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
				<div>
					<div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a93a8]">Select mode</div>
					<div className="grid gap-2">
						{playModes.map(([title, body, tag]) => (
							<button
								key={title}
								type="button"
								onClick={() => setMode(title)}
								className={`rounded-[6px] border p-4 text-left transition-colors ${
									mode === title ? "border-[var(--accent)] bg-[#161f31]" : "border-[#2c3a55] bg-[#0b101b]"
								}`}
							>
								<div className="flex items-center justify-between gap-3">
									<div className="font-display text-2xl font-bold uppercase">{title}</div>
									<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">{tag}</span>
								</div>
								<p className="mt-1 text-sm leading-6 text-[#aeb5c4]">{body}</p>
							</button>
						))}
					</div>
					<Button className="mt-5 h-14 w-full text-sm" onClick={onClose}>
						Play {mode}
					</Button>
				</div>

				<div>
					<div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a93a8]">Formation preview</div>
					<div className="grid grid-cols-9 gap-1 rounded-[6px] border border-[#2c3a55] bg-[#0b101b] p-2">
						{Array.from({ length: 27 }).map((_, index) => (
							<div
								key={index}
								className={`aspect-square rounded-[3px] border ${
									index % 5 === 0
										? "border-[var(--accent)] bg-gradient-to-br from-[#c9a85d] to-[#a8894a]"
										: "border-[#2c3a55] bg-[#121b2c]"
								}`}
							/>
						))}
					</div>
					<div className="mt-4 grid grid-cols-5 gap-2">
						{["★★★★★", "✦", "∧", "⚑", "◆◆"].map((glyph) => (
							<div key={glyph} className="flex h-11 items-center justify-center rounded-[4px] border border-[#dabb74] bg-[#c9a85d] text-sm font-bold text-[#0e1420]/75">
								{glyph}
							</div>
						))}
					</div>
				</div>
			</div>
		</Modal>
	);
}

export function HomeExperience() {
	const [modal, setModal] = useState<"tutorial" | "shop" | "setup" | null>(null);

	return (
		<main className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
			<header className="sticky top-0 z-50 flex h-[60px] items-center justify-between gap-4 border-b border-[#1c2740] bg-[#0e1420]/90 px-5 backdrop-blur md:px-12">
				<a href="#" className="flex min-w-0 items-center gap-2.5">
					<span className="text-[var(--accent)]">★</span>
					<span className="truncate font-display text-lg font-bold uppercase tracking-[0.07em] md:text-xl">Game of the Generals</span>
				</a>
				<nav className="flex items-center gap-2 md:gap-4">
					<Button variant="ghost" size="sm" className="hidden md:inline-flex" asChild>
						<a href="#command">About</a>
					</Button>
					<Button variant="ghost" size="sm" onClick={() => setModal("shop")}>
						Shop
					</Button>
					<Button variant="outline" size="sm" className="hidden sm:inline-flex">
						Sign in
					</Button>
					<Button size="sm" onClick={() => setModal("setup")}>
						Play
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
						<Button size="lg" onClick={() => setModal("setup")}>
							Deploy as guest
						</Button>
						<Button variant="outline" size="lg" onClick={() => setModal("tutorial")}>
							Tutorial
						</Button>
					</div>
					<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8fae6e]">
						<span className="h-[7px] w-[7px] rounded-full bg-[#8fae6e] [animation:wr-pulse_1.6s_ease_infinite]" />
						1,204 commanders online · No account needed
					</div>
				</div>
			</section>

			<section id="command" className="border-t border-[#1c2740] bg-[#0b101b]">
				<div className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
					<div className="mb-9 flex flex-wrap items-end justify-between gap-4">
						<div>
							<p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">// Chain of command</p>
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
							<button className="mt-auto pt-6 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]" onClick={() => setModal("setup")}>
								Set up board
							</button>
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
						<Button size="lg" onClick={() => setModal("setup")}>
							Deploy as guest. It&apos;s free
						</Button>
						<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b647a]">No account · No download · 10 minutes a match</p>
					</div>
				</div>
			</footer>

			{modal === "tutorial" ? <TutorialModal onClose={() => setModal(null)} /> : null}
			{modal === "shop" ? <ShopModal onClose={() => setModal(null)} /> : null}
			{modal === "setup" ? <SetupModal onClose={() => setModal(null)} /> : null}
		</main>
	);
}
