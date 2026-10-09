import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { ranks, type RankKey } from "@/lib/game";
import { Piece } from "@/components/game/piece";
import { SiteHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
	title: "About",
	description:
		"The story of Salpakan, the Filipino strategy classic, and Aligway Studios, the crew building it for the web.",
};

const upsets: { rank: RankKey; title: string; body: string }[] = [
	{
		rank: "SPY",
		title: "The spy outranks every general",
		body: "A Spy quietly removes any officer it touches, from a Sergeant to a five-star General. Rank means nothing to it.",
	},
	{
		rank: "PVT",
		title: "But a private kills the spy",
		body: "The lowest piece on the board is the only one a Spy fears. Six of them are hunting, and none of them are marked.",
	},
	{
		rank: "FLG",
		title: "The flag beats only the flag",
		body: "Your Flag loses to everything except the enemy Flag. Everyone knows where it should be. Nobody knows where it is.",
	},
];

const pillars = [
	{
		label: "Deploy in the dark",
		body: "Each side arranges 21 pieces across its three back rows. You see the faces of your own army; your opponent sees only blank backs, exactly as you see theirs.",
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

const yourLine: RankKey[] = ["G5", "SPY", "FLG", "PVT", "LTC", "LT2"];

// A real slice of the game in the real materials: your faces, their blank backs.
function MiniBoard() {
	return (
		<div className="mx-auto w-full max-w-[420px] border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--e3)]">
			<div className="mb-2 flex items-center justify-between px-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
				<span>Enemy line</span>
				<span>Ranks hidden</span>
			</div>
			<div className="grid grid-cols-6 gap-1.5">
				{Array.from({ length: 18 }).map((_, index) => (
					<div key={index} className="aspect-square">
						<Piece side="foe" />
					</div>
				))}
			</div>
			<div className="my-2.5 border-t border-dashed border-[var(--line-strong)]" />
			<div className="grid grid-cols-6 gap-1.5">
				{yourLine.map((rank) => (
					<div key={rank} className="aspect-square">
						<Piece rank={rank} side="you" />
					</div>
				))}
			</div>
			<div className="mt-2 px-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">Your line</div>
		</div>
	);
}

export default function AboutPage() {
	return (
		<main className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
			<SiteHeader current="about" />

			{/* Hero: asymmetric split. Statement left, real game materials right. */}
			<section className="relative overflow-hidden border-b border-[var(--line)]">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_75%_20%,rgba(201,168,93,0.08),transparent_60%)]" />
				<div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:px-12 md:py-28">
					<div>
						<h1 className="wr-rise font-display text-[clamp(44px,7vw,92px)] font-extrabold uppercase leading-[0.92]" style={{ animationDelay: "0.06s" }}>
							Every piece
							<br />
							is a <span className="text-[var(--accent)]">lie.</span>
						</h1>
						<p className="wr-rise mt-6 max-w-md text-[clamp(15px,1.7vw,18px)] leading-7 text-[#d8d2c4] md:leading-8" style={{ animationDelay: "0.12s" }}>
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
			<section className="border-b border-[var(--line)] bg-[var(--panel)]">
				<div className="mx-auto max-w-3xl px-5 py-20 md:px-12 md:py-28">
					<h2 className="text-balance font-display text-[clamp(32px,4.4vw,54px)] font-extrabold uppercase leading-[1.02]">
						Born on a table in the Philippines.
					</h2>
					<div className="mt-8 max-w-[65ch] space-y-5 text-[15px] leading-8 text-[#aeb5c4]">
						<p>
							Game of the Generals, known at home as <span className="text-[var(--foreground)]">Salpakan</span>, was invented in 1970 by Sofronio H. Pascual. He borrowed the ranks of the armed forces and hid them behind a simple idea: what if you knew where an army stood, but never what it was made of?
						</p>
						<p>
							The result plays nothing like chess, where both sides see everything. Here the information itself is the battlefield. A five-star General and a lowly Private look identical to your opponent, so a Private can march forward like a threat, and a General can hide in the back like a coward. Bluff is not a tactic here. It is the whole game.
						</p>
						<p>
							Half a century later it is still played across kitchen tables, classrooms, and barracks. This is that game, dealt onto a browser tab, with a neutral arbiter that never leaks a rank.
						</p>
					</div>
					<figure className="mt-10 border-t border-[var(--line-strong)] pt-5">
						<blockquote className="font-display text-3xl font-bold uppercase leading-[1.05] text-[var(--foreground)]">
							&ldquo;Chess with a poker face.&rdquo;
						</blockquote>
						<figcaption className="mt-2.5 text-sm text-[var(--ink-muted)]">How players have described it for fifty years.</figcaption>
					</figure>
				</div>
			</section>

			{/* How it plays: asymmetric pillars. One tall feature, two stacked. */}
			<section className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
				<h2 className="mb-10 max-w-2xl text-balance font-display text-[clamp(32px,4.6vw,58px)] font-extrabold uppercase leading-none">
					Three rules run the whole battle.
				</h2>
				<ol className="grid gap-4 md:grid-cols-2">
					{pillars.map((pillar, index) => (
						<li key={pillar.label} className={index === 0 ? "md:row-span-2" : undefined}>
							<Card className="flex h-full flex-col justify-between p-6 md:p-7">
								<div>
									<p className="border-b border-[var(--line)] pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
										Rule <span className="tabular-nums text-[var(--ink-muted)]">{index + 1}</span> of 3
									</p>
									<CardTitle className="mt-5">{pillar.label}</CardTitle>
									<CardContent className="mt-3 leading-7">{pillar.body}</CardContent>
								</div>
								{index === 0 ? (
									<div aria-hidden className="mt-8 grid max-w-[22rem] grid-cols-6 gap-1">
										{Array.from({ length: 12 }).map((_, cell) => (
											<div key={cell} className="aspect-square">
												<Piece side={cell < 6 ? "foe" : "you"} />
											</div>
										))}
									</div>
								) : null}
							</Card>
						</li>
					))}
				</ol>
			</section>

			{/* Chain of command: the ladder as a grid of real pieces, then the three upsets. */}
			<section className="border-y border-[var(--line)] bg-[var(--panel)]">
				<div className="mx-auto max-w-6xl px-5 py-20 md:px-12 md:py-28">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<h2 className="max-w-2xl text-balance font-display text-[clamp(32px,4.6vw,58px)] font-extrabold uppercase leading-none">
							Fifteen ranks. Three that break the rules.
						</h2>
						<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Highest to lowest</p>
					</div>

					{/* Wraps instead of scrolling sideways: a hidden horizontal scrollbar cut the ladder off at the 2nd Lieutenant. */}
					<ol className="mt-9 grid grid-cols-3 gap-2 sm:grid-cols-5">
						{ranks.map((rank) => (
							<li
								key={rank.key}
								className="flex flex-col items-center gap-2 border border-[var(--line)] bg-[var(--panel-raised)] px-2 py-3.5 text-center"
							>
								<Piece rank={rank.key} side="you" scale="tray" />
								<span className="text-[12px] leading-tight text-[var(--ink-muted)]">{rank.name}</span>
							</li>
						))}
					</ol>

					<div className="mt-4 grid gap-4 md:grid-cols-3">
						{upsets.map((upset) => (
							<div key={upset.title} className="border border-[var(--line)] bg-[var(--background)] p-6">
								<Piece rank={upset.rank} side="you" scale="tray" />
								<h3 className="mt-4 font-display text-2xl font-bold uppercase leading-tight">{upset.title}</h3>
								<p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">{upset.body}</p>
							</div>
						))}
					</div>

					<p className="mt-8 max-w-xl text-sm leading-7 text-[var(--ink-muted)]">
						Take the enemy Flag, or walk your own Flag to the far edge. Do it before your opponent figures out which of your pieces was bluffing.
						The full rules are on the <Link href="/how-to-play" className="text-[var(--foreground)] underline decoration-[var(--line-strong)] underline-offset-4 hover:decoration-[var(--ink-muted)]">how to play</Link> page.
					</p>
				</div>
			</section>

			{/* Aligway Studios: studio identity, disciplines, and the crew. */}
			<section id="studio" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-20 md:px-12 md:py-28">
				<div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-start">
					<div>
						<h2 className="font-display text-[clamp(38px,6vw,84px)] font-extrabold uppercase leading-[0.92]">
							Aligway
							<br />
							Studios
						</h2>
						<p className="mt-6 max-w-md text-[15px] leading-8 text-[#aeb5c4]">
							A small studio putting Filipino games on the web, built to be played the way they were meant to be played. We started with the one every commander at home already knows.
						</p>
						<ul className="mt-8 flex flex-wrap gap-2">
							{team.map((member) => (
								<li key={member.name}>
									<a
										href={member.href}
										target="_blank"
										rel="noreferrer"
										className="group flex items-center gap-3 border border-[var(--line)] bg-[var(--panel-raised)] p-3 pr-5 transition-colors hover:border-[var(--ink-muted)]"
									>
										<span className="flex h-11 w-11 items-center justify-center border border-[var(--line-strong)] bg-[var(--panel)] font-display text-lg font-bold text-[var(--foreground)]">
											{member.initials}
										</span>
										<span>
											<span className="block font-display text-lg font-bold uppercase leading-none text-[var(--foreground)]">{member.name}</span>
											<span className="mt-1 block text-xs text-[var(--ink-muted)]">{member.role}</span>
										</span>
									</a>
								</li>
							))}
						</ul>
					</div>

					<ul className="grid gap-3">
						{disciplines.map(([title, body]) => (
							<li key={title} className="border-t border-[var(--line)] pt-5 first:border-t-0 first:pt-0">
								<h3 className="font-display text-2xl font-bold uppercase leading-none">{title}</h3>
								<p className="mt-2 text-sm leading-7 text-[var(--ink-muted)]">{body}</p>
							</li>
						))}
					</ul>
				</div>
			</section>

			<section className="border-t border-[var(--line)] bg-[var(--panel)]">
				<div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:px-12">
					<h2 className="font-display text-[clamp(40px,7vw,88px)] font-extrabold uppercase leading-[0.95]">
						Your move,
						<br />
						<span className="text-[var(--accent)]">General.</span>
					</h2>
					<div className="flex w-full flex-col gap-3 sm:w-auto">
						<Button size="lg" asChild>
							<Link href="/play">Deploy as guest. It&apos;s free</Link>
						</Button>
						<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Built by Aligway Studios · No account · No download</p>
					</div>
				</div>
			</section>
			<SiteFooter />
		</main>
	);
}
