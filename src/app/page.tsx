import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
	["Rule 01", "Everything is hidden", "Your 21 pieces face away from your opponent. Arrange fifteen ranks however you like on your three back rows."],
	["Rule 02", "The arbiter decides", "Move onto an enemy square to challenge. The result is private. You learn only who survived."],
	["Rule 03", "Take the flag", "Capture the enemy Flag, or march your own to the far edge, and the war is over."],
];

const playModes = [
	["01", "Solo Drill", "Three commanders to outwit, from instinct to cold calculation.", "Choose difficulty"],
	["02", "Pass & Play", "Two commanders, one device. The screen goes dark between turns.", "Start local duel"],
	["03", "Private Room", "Share a four-letter code and face a friend across any distance.", "Create a room"],
];

const pieces = [
	["gold", "★★★★★", 1, 5],
	["gold", "✦", 2, 6],
	["gold", "∧", 3, 5],
	["gold", "⚑", 4, 6],
	["gold", "▲▲", 5, 5],
	["gold", "◆", 6, 6],
	["slate", "", 1, 1],
	["slate", "?", 2, 2],
	["slate", "", 4, 1],
	["slate", "", 6, 2],
	["slate", "", 7, 1],
];

function BoardPreview() {
	return (
		<div className="absolute left-1/2 top-1/2 w-[min(94vw,1100px)] -translate-x-1/2 -translate-y-[52%] rotate-[-5deg] [perspective:1700px]">
			<div className="relative aspect-[9/8] rotate-x-[30deg]">
				<div className="absolute inset-0 grid grid-cols-9 grid-rows-8 gap-[3px]">
					{Array.from({ length: 72 }).map((_, index) => (
						<div
							key={index}
							className="rounded-[4px] border border-[#1c2740]/80 bg-[#121b2c]/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.015)]"
						/>
					))}
				</div>
				{pieces.map(([side, glyph, col, row], index) => (
					<div
						key={`${side}-${index}`}
						className={`absolute flex items-center justify-center rounded-[6px] border font-bold shadow-[0_10px_22px_rgba(0,0,0,0.5)] ${
							side === "gold"
								? "border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] text-[#0e1420]/70"
								: "border-[#2c3a55] bg-gradient-to-br from-[#253352] to-[#1a2338] text-[#c9a85d]/35"
						}`}
						style={{
							left: `calc(${Number(col) * (100 / 9)}% + 6px)`,
							top: `calc(${Number(row) * (100 / 8)}% + 6px)`,
							width: `calc(${100 / 9}% - 12px)`,
							height: `calc(${100 / 8}% - 12px)`,
							fontSize: String(glyph).length > 3 ? 12 : 18,
							letterSpacing: 1,
						}}
					>
						{glyph}
					</div>
				))}
				<div className="absolute left-[39%] top-[35%] rounded-[4px] border border-[var(--accent)] bg-[#0e1420] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)] shadow-[0_12px_34px_rgba(0,0,0,0.65)]">
					Arbiter
				</div>
			</div>
		</div>
	);
}

export default function Home() {
	return (
		<main className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
			<header className="sticky top-0 z-50 flex h-[60px] items-center justify-between gap-4 border-b border-[#1c2740] bg-[#0e1420]/90 px-5 backdrop-blur md:px-12">
				<a href="#" className="flex items-center gap-2.5">
					<span className="text-[var(--accent)]">★</span>
					<span className="font-display text-xl font-bold uppercase tracking-[0.07em]">Game of the Generals</span>
				</a>
				<nav className="hidden items-center gap-6 md:flex">
					<Button asChild variant="ghost" size="sm">
						<a href="#briefing">Tutorial</a>
					</Button>
					<Button asChild variant="ghost" size="sm">
						<a href="#command">About</a>
					</Button>
					<Button asChild variant="outline" size="sm">
						<a href="#deploy">Sign in</a>
					</Button>
					<Button asChild size="sm">
						<a href="#deploy">Play now</a>
					</Button>
				</nav>
			</header>

			<section className="relative flex min-h-[calc(100dvh-60px)] items-center justify-center overflow-hidden border-b border-[#1c2740]">
				<BoardPreview />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_72%_64%_at_50%_50%,rgba(14,20,32,0)_32%,#0e1420_84%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_56%_50%_at_50%_47%,rgba(14,20,32,0.78),rgba(14,20,32,0.46)_55%,rgba(14,20,32,0)_82%)]" />

				<div
					className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-5 py-20 text-center"
					style={{ zIndex: 30 }}
				>
					<div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
						<span className="h-px w-8 bg-[var(--accent)]/60" />
						<span>Salpakan · Filipino strategy classic · Est. 1970</span>
						<span className="h-px w-8 bg-[var(--accent)]/60" />
					</div>
					<h1
						className="font-display text-[clamp(56px,8.2vw,130px)] font-extrabold uppercase leading-[0.92] tracking-normal drop-shadow-[0_18px_50px_rgba(0,0,0,0.95)]"
						style={{ color: "#ede8da" }}
					>
						<span className="mb-2 block text-[0.32em] font-bold tracking-[0.34em] text-[#c7cbd6]">Game of the</span>
						Generals
						<br />
						<span className="text-[var(--accent)]">Online</span>
					</h1>
					<p className="max-w-xl text-[clamp(15px,1.7vw,19px)] leading-8 text-[#d8d2c4] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
						Chess with a poker face. May the best liar win.
					</p>
					<div className="flex flex-wrap justify-center gap-3">
						<Button asChild size="lg">
							<a href="#deploy">Deploy as guest</a>
						</Button>
						<Button asChild variant="outline" size="lg">
							<a href="#briefing">Tutorial</a>
						</Button>
					</div>
					<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8fae6e]">
						<span className="h-[7px] w-[7px] rounded-full bg-[#8fae6e] [animation:wr-pulse_1.6s_ease_infinite]" />
						1,204 commanders online · No account needed
					</div>
				</div>

				<div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap justify-between gap-2 px-5 py-3 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#44506b] md:px-12">
					<span>War no. 02 · Move 017 · Gold to move · Casualties 05</span>
					<span>Click an enemy piece to log a suspicion</span>
				</div>
			</section>

			<section id="briefing" className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
				<p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">// Mission briefing</p>
				<h2 className="mb-10 font-display text-[clamp(36px,5vw,64px)] font-extrabold uppercase leading-none">
					Three rules. A lifetime of paranoia.
				</h2>
				<div className="grid gap-4 md:grid-cols-3">
					{rules.map(([rule, title, body]) => (
						<Card key={rule} className="p-6">
							<CardHeader>
								<div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b647a]">{rule}</div>
								<CardTitle>{title}</CardTitle>
							</CardHeader>
							<CardContent className="mt-3">{body}</CardContent>
						</Card>
					))}
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
				<p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">// Ways to play</p>
				<h2 className="mb-10 font-display text-[clamp(36px,5vw,64px)] font-extrabold uppercase leading-none">Choose your front.</h2>
				<div className="grid gap-4 md:grid-cols-3">
					{playModes.map(([num, title, body, action]) => (
						<Card key={title} className="flex min-h-56 flex-col p-6 transition-colors hover:border-[var(--accent)]">
							<div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b647a]">{num}</div>
							<CardTitle>{title}</CardTitle>
							<CardContent className="mt-3">{body}</CardContent>
							<a className="mt-auto pt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]" href="#">
								{action}
							</a>
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
						<Button asChild size="lg">
							<a href="#deploy">Deploy as guest. It&apos;s free</a>
						</Button>
						<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b647a]">No account · No download · 10 minutes a match</p>
					</div>
				</div>
			</footer>
		</main>
	);
}
