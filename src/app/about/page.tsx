import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
	title: "About · Game of the Generals Online",
	description:
		"The story of Salpakan, the Filipino strategy classic, and Aligway Studios, the crew building it for the web.",
};

// High rank to low. The order is the food chain the whole game hangs on.
const ranks = [
	["★★★★★", "5-Star General"],
	["★★★★", "4-Star General"],
	["★★★", "3-Star General"],
	["★★", "2-Star General"],
	["★", "1-Star General"],
	["▲▲▲", "Colonel"],
	["▲▲", "Lt. Colonel"],
	["▲", "Major"],
	["◆◆◆", "Captain"],
	["◆◆", "1st Lieutenant"],
	["◆", "2nd Lieutenant"],
	["∧∧∧", "Sergeant"],
	["∧", "Private"],
	["✦", "Spy"],
	["⚑", "Flag"],
];

const upsets = [
	{
		glyph: "✦",
		title: "The spy outranks every general",
		body: "A Spy quietly removes any officer it touches, from a Sergeant to a five-star General. Rank means nothing to it.",
	},
	{
		glyph: "∧",
		title: "But a private kills the spy",
		body: "The lowest piece on the board is the only one a Spy fears. Six of them are hunting, and none of them are marked.",
	},
	{
		glyph: "⚑",
		title: "The flag beats only the flag",
		body: "Your Flag loses to everything except the enemy Flag. Everyone knows where it should be. Nobody knows where it is.",
	},
];

const pillars = [
	{
		label: "Deploy in the dark",
		body: "Each side arranges 21 pieces across three back rows. You see the faces of your army. Your opponent sees only the backs of theirs, and you see only the backs of yours in their eyes.",
	},
	{
		label: "One square, one turn",
		body: "Every piece moves a single square up, down, or sideways. No jumps, no diagonals, no charges. The whole war is fought one careful step at a time.",
	},
	{
		label: "Judged in silence",
		body: "Move onto an enemy piece to challenge it. A neutral arbiter compares the hidden ranks and removes the loser. Neither player is told what the fallen piece was.",
	},
];

const disciplines = [
	["Live board games", "Turn logic, matchmaking, and rooms built to sync two commanders in real time."],
	["Rules engines", "The rank food chain, the arbiter, and win conditions modeled so the game is always fair and never guesses."],
	["Interfaces with a point of view", "A war-room look that treats a browser tab like an officer's table, not a settings menu."],
];

// The crew. Add teammates here and the roster below renders them automatically.
const team = [
	{
		initials: "CJ",
		name: "CJ Uy",
		role: "Founder, engineering and design",
		href: "https://github.com/CJ-Uy",
	},
];

function AboutHeader() {
	return (
		<header className="sticky top-0 z-50 flex h-[60px] items-center justify-between gap-4 border-b border-[#1c2740] bg-[#0e1420]/90 px-5 backdrop-blur md:px-12">
			<Link href="/" className="flex min-w-0 items-center gap-2.5">
				<span className="text-[var(--accent)]">★</span>
				<span className="font-display text-lg font-bold uppercase tracking-[0.07em] md:hidden">GoG Online</span>
				<span className="hidden truncate font-display text-xl font-bold uppercase tracking-[0.07em] md:inline">Game of the Generals</span>
			</Link>
			<nav className="flex items-center gap-2 md:gap-4">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/">Home</Link>
				</Button>
				<Button size="sm" asChild>
					<Link href="/play">Play</Link>
				</Button>
			</nav>
		</header>
	);
}

// A real slice of the game: your gold pieces, the enemy's hidden backs. Not a screenshot, the actual materials.
function MiniBoard() {
	const enemyBacks = Array.from({ length: 18 });
	const yourRow = ["★★★★★", "✦", "⚑", "∧", "▲▲", "◆"];

	return (
		<div className="mx-auto w-full max-w-[420px] rounded-[8px] border border-[#1c2740] bg-[#0b101b] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
			<div className="mb-2 flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#44506b]">
				<span>Enemy line</span>
				<span>hidden</span>
			</div>
			<div className="grid grid-cols-6 gap-1.5">
				{enemyBacks.map((_, index) => (
					<div key={index} className="aspect-square rounded-[4px] border border-[#253352] bg-gradient-to-br from-[#253352] to-[#1a2338]" />
				))}
			</div>
			<div className="my-2 border-t border-dashed border-[rgba(201,168,93,0.4)]" />
			<div className="grid grid-cols-6 gap-1.5">
				{yourRow.map((glyph, index) => (
					<div
						key={index}
						className={`flex aspect-square items-center justify-center rounded-[4px] border border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] font-bold leading-none text-[#0e1420]/75 ${
							glyph.length >= 4 ? "text-[8px]" : glyph.length >= 2 ? "text-[10px]" : "text-sm"
						}`}
					>
						{glyph}
					</div>
				))}
			</div>
			<div className="mt-2 px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--accent)]/70">Your line</div>
		</div>
	);
}

export default function AboutPage() {
	return (
		<main className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
			<AboutHeader />

			{/* Hero: asymmetric split. Statement left, real game materials right. */}
			<section className="relative overflow-hidden border-b border-[#1c2740]">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_75%_20%,rgba(201,168,93,0.1),transparent_60%)]" />
				<div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.1fr_0.9fr] md:px-12 md:py-28">
					<div>
						<p className="wr-rise mb-5 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
							Salpakan · Filipino strategy classic · Est. 1970
						</p>
						<h1 className="wr-rise font-display text-[clamp(44px,7vw,92px)] font-extrabold uppercase leading-[0.92] tracking-normal" style={{ animationDelay: "0.06s" }}>
							Every piece
							<br />
							is a <span className="text-[var(--accent)]">lie.</span>
						</h1>
						<p className="wr-rise mt-6 max-w-md text-[clamp(15px,1.7vw,18px)] leading-8 text-[#d8d2c4]" style={{ animationDelay: "0.12s" }}>
							Two armies. Forty-two hidden ranks. The board tells you where the pieces are, never what they are. Win by reading the enemy before they read you.
						</p>
						<div className="wr-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.18s" }}>
							<Button size="lg" asChild>
								<Link href="/play">Take command</Link>
							</Button>
							<Button variant="outline" size="lg" asChild>
								<Link href="#studio">Meet Aligway</Link>
							</Button>
						</div>
					</div>
					<div className="wr-rise" style={{ animationDelay: "0.1s" }}>
						<MiniBoard />
					</div>
				</div>
			</section>

			{/* Origin: editorial column. Different layout family from the split hero. */}
			<section className="border-b border-[#1c2740] bg-[#0b101b]">
				<div className="mx-auto max-w-3xl px-5 py-20 md:px-12 md:py-28">
					<h2 className="font-display text-[clamp(32px,4.4vw,54px)] font-extrabold uppercase leading-[1.02]">
						Born on a table in the Philippines.
					</h2>
					<div className="mt-8 space-y-5 text-[15px] leading-8 text-[#aeb5c4]">
						<p>
							Game of the Generals, known at home as <span className="text-[#ede8da]">Salpakan</span>, was invented in 1970 by Sofronio H. Pascual. He borrowed the ranks of the armed forces and hid them behind a simple idea: what if you knew where an army stood, but never what it was made of?
						</p>
						<p>
							The result plays nothing like chess, where both sides see everything. Here the information itself is the battlefield. A five-star General and a lowly Private look identical to your opponent, so a Private can march forward like a threat, and a General can hide in the back like a coward. Bluff is not a tactic here. It is the whole game.
						</p>
						<p>
							Half a century later it is still played across kitchen tables, classrooms, and barracks. This is that game, dealt onto a browser tab, with a neutral arbiter that never leaks a rank.
						</p>
					</div>
					<div className="mt-10 border-l-2 border-[var(--accent)] pl-5">
						<p className="font-display text-2xl font-bold uppercase leading-tight text-[#ede8da]">
							&ldquo;Chess with a poker face.&rdquo;
						</p>
						<p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b647a]">How players have described it for fifty years</p>
					</div>
				</div>
			</section>

			{/* How it plays: asymmetric pillars. One tall feature, two stacked. */}
			<section className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
				<p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">// How the war works</p>
				<h2 className="mb-10 max-w-2xl font-display text-[clamp(32px,4.6vw,58px)] font-extrabold uppercase leading-none">
					Three rules run the whole battle.
				</h2>
				<div className="grid gap-4 md:grid-cols-3">
					<Card className="flex flex-col justify-between p-7 md:row-span-2 md:min-h-[22rem]">
						<div>
							<div className="font-display text-6xl font-extrabold leading-none text-[var(--accent)]">01</div>
							<CardTitle className="mt-5">{pillars[0].label}</CardTitle>
							<CardContent className="mt-4 leading-7">{pillars[0].body}</CardContent>
						</div>
						<div className="mt-8 grid grid-cols-6 gap-1">
							{Array.from({ length: 12 }).map((_, index) => (
								<div
									key={index}
									className={`aspect-square rounded-[3px] ${index < 6 ? "bg-gradient-to-br from-[#c9a85d] to-[#a8894a]" : "border border-[#253352] bg-[#1a2338]"}`}
								/>
							))}
						</div>
					</Card>
					<Card className="p-7">
						<div className="font-display text-4xl font-extrabold leading-none text-[var(--accent)]">02</div>
						<CardTitle className="mt-4">{pillars[1].label}</CardTitle>
						<CardContent className="mt-3 leading-7">{pillars[1].body}</CardContent>
					</Card>
					<Card className="p-7">
						<div className="font-display text-4xl font-extrabold leading-none text-[var(--accent)]">03</div>
						<CardTitle className="mt-4">{pillars[2].label}</CardTitle>
						<CardContent className="mt-3 leading-7">{pillars[2].body}</CardContent>
					</Card>
				</div>
			</section>

			{/* Chain of command: horizontal rank ladder + the three upsets. New layout family. */}
			<section className="border-y border-[#1c2740] bg-[#0b101b]">
				<div className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<h2 className="max-w-2xl font-display text-[clamp(32px,4.6vw,58px)] font-extrabold uppercase leading-none">
							Fifteen ranks. Three that break the rules.
						</h2>
						<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b647a]">Highest to lowest</p>
					</div>

					<div className="wr-no-scrollbar mt-9 flex gap-2 overflow-x-auto pb-2">
						{ranks.map(([glyph, name]) => (
							<div
								key={name}
								className="flex min-w-[92px] flex-1 shrink-0 flex-col items-center gap-2 rounded-[6px] border border-[#1c2740] bg-[#121b2c] px-2 py-4 text-center"
							>
								<span className="text-[15px] leading-none tracking-[2px] text-[var(--accent)]">{glyph}</span>
								<span className="font-mono text-[9px] uppercase leading-tight tracking-[0.08em] text-[#8a93a8]">{name}</span>
							</div>
						))}
					</div>

					<div className="mt-4 grid gap-4 md:grid-cols-3">
						{upsets.map((upset) => (
							<div key={upset.title} className="rounded-[8px] border border-[#1c2740] bg-[#0e1420] p-6">
								<div className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] text-lg font-bold text-[#0e1420]/75">
									{upset.glyph}
								</div>
								<h3 className="mt-4 font-display text-2xl font-bold uppercase leading-tight text-[#ede8da]">{upset.title}</h3>
								<p className="mt-3 text-sm leading-7 text-[#8a93a8]">{upset.body}</p>
							</div>
						))}
					</div>

					<p className="mt-8 max-w-xl text-sm leading-7 text-[#8a93a8]">
						Take the enemy Flag, or walk your own Flag to the far edge and hold it for one turn. Do it before your opponent figures out which of your pieces was bluffing.
					</p>
				</div>
			</section>

			{/* Aligway Studios: studio identity, disciplines, and the crew. */}
			<section id="studio" className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
				<div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-start">
					<div>
						<p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">The makers</p>
						<h2 className="font-display text-[clamp(38px,6vw,84px)] font-extrabold uppercase leading-[0.92]">
							Aligway
							<br />
							<span className="text-[var(--accent)]">Studios</span>
						</h2>
						<p className="mt-6 max-w-md text-[15px] leading-8 text-[#aeb5c4]">
							A small studio putting Filipino games on the web, built to be played the way they were meant to be played. We started with the one every commander at home already knows.
						</p>
						<div className="mt-8 flex flex-wrap gap-2">
							{team.map((member) => (
								<a
									key={member.name}
									href={member.href}
									target="_blank"
									rel="noreferrer"
									className="group flex items-center gap-3 rounded-[8px] border border-[#1c2740] bg-[#121b2c] p-3 pr-5 transition-colors hover:border-[var(--accent)]"
								>
									<span className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] font-display text-lg font-bold text-[#0e1420]/80">
										{member.initials}
									</span>
									<span>
										<span className="block font-display text-lg font-bold uppercase leading-none text-[#ede8da] group-hover:text-[var(--accent)]">
											{member.name}
										</span>
										<span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a93a8]">{member.role}</span>
									</span>
								</a>
							))}
						</div>
					</div>

					<div className="grid gap-3">
						{disciplines.map(([title, body]) => (
							<div key={title} className="flex gap-5 border-t border-[#1c2740] pt-5 first:border-t-0 first:pt-0">
								<span className="mt-1 text-[var(--accent)]">★</span>
								<div>
									<h3 className="font-display text-2xl font-bold uppercase leading-none text-[#ede8da]">{title}</h3>
									<p className="mt-2 text-sm leading-7 text-[#8a93a8]">{body}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA + footer. */}
			<footer className="border-t border-[#1c2740] bg-[#0b101b]">
				<div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:px-12">
					<h2 className="font-display text-[clamp(40px,7vw,88px)] font-extrabold uppercase leading-[0.95]">
						Your move,
						<br />
						<span className="text-[var(--accent)]">General.</span>
					</h2>
					<div className="flex flex-col gap-3">
						<Button size="lg" asChild>
							<Link href="/play">Deploy as guest. It&apos;s free</Link>
						</Button>
						<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b647a]">
							Built by Aligway Studios · No account · No download
						</p>
					</div>
				</div>
			</footer>
		</main>
	);
}
