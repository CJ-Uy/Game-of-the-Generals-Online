import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { RankReference } from "@/components/game/rank-reference";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
	title: "How to play",
	description:
		"The rules of Salpakan in five minutes: hidden ranks, one square a turn, an arbiter who only announces the winner, and the two pieces that break the chain of command.",
};

// The page is long; these are the stops a returning player actually looks for.
const SECTIONS = [
	["short-version", "The short version"],
	["taking-a-turn", "Taking a turn"],
	["winning", "Winning"],
	["what-beats-what", "What beats what"],
	["bluffing", "Bluffing"],
] as const;

const FACTS = [
	["21 pieces each", "Fifteen ranks, arranged however you like across your own three rows."],
	["Nothing is visible", "You see the backs of their pieces and they see the backs of yours. Positions are public; ranks are not."],
	["One square a turn", "Up, down or sideways. No diagonals, no jumps, no double moves."],
	["The arbiter never explains", "When two pieces meet you are told who survived — never what the other piece was."],
];

export default function HowToPlayPage() {
	return (
		<main className="flex min-h-[100dvh] flex-col bg-[var(--background)] text-[var(--foreground)]">
			<SiteHeader current="rules" />

			<div className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-5 pb-24 pt-10 md:px-8 lg:grid-cols-[minmax(0,1fr)_12rem] lg:pt-12">
			<article className="min-w-0 max-w-3xl">
				<h1 className="font-display text-[clamp(44px,9vw,86px)] font-extrabold uppercase leading-[0.88]">
					How to play
				</h1>
				<p className="mt-4 max-w-[62ch] text-[17px] leading-7 text-[#c9c3b4] sm:leading-8">
					Game of the Generals — <em className="not-italic text-[var(--foreground)]">Salpakan</em> — was invented in
					the Philippines in 1970. It looks like a chess variant and plays like poker: the board is fully visible, and
					almost nothing on it is known.
				</p>

				<nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 lg:hidden">
					{SECTIONS.map(([id, label]) => (
						<a
							key={id}
							href={`#${id}`}
							className="border border-[var(--line-strong)] px-3 py-2 text-sm text-[var(--ink-muted)] transition-colors hover:border-[var(--ink-muted)] hover:text-[var(--foreground)]"
						>
							{label}
						</a>
					))}
				</nav>

				<section id="short-version" className="mt-14 scroll-mt-20">
					<h2 className="font-display text-[clamp(28px,4vw,42px)] font-bold uppercase leading-none">The short version</h2>
					<dl className="mt-6 border-t border-[var(--line-strong)]">
						{FACTS.map(([term, detail]) => (
							<div key={term} className="grid gap-1 border-b border-[var(--line)] py-4 sm:grid-cols-[13rem_1fr] sm:gap-6">
								<dt className="font-display text-xl font-semibold uppercase leading-tight tracking-wide">{term}</dt>
								<dd className="text-[15px] leading-7 text-[var(--ink-muted)]">{detail}</dd>
							</div>
						))}
					</dl>
				</section>

				<section id="taking-a-turn" className="mt-14 scroll-mt-20">
					<h2 className="font-display text-[clamp(28px,4vw,42px)] font-bold uppercase leading-none">Taking a turn</h2>
					<p className="mt-4 max-w-[62ch] text-[15px] leading-7 text-[#c3beb2]">
						Move one piece one square. If the square is empty you simply move there. If it holds one of their pieces,
						moving onto it is an attack — and this is the whole game, because you are guessing.
					</p>

					<div className="mt-6 space-y-3 border-y border-[var(--line)] py-5">
						<Outcome result="win" text="Your piece outranks theirs. Theirs is removed and yours takes the square." />
						<Outcome result="lose" text="Theirs outranks yours. Yours is removed and theirs holds the square." />
						<Outcome result="both" text="The ranks are equal. Both pieces are removed and the square is left empty." />
					</div>

					<p className="mt-5 max-w-[62ch] text-[15px] leading-7 text-[#c3beb2]">
						You are never told which rank beat you. All you learn is that something on that square is stronger than
						the piece you just spent — which is exactly as much as a real arbiter would tell you across a table.
					</p>
				</section>

				<section id="winning" className="mt-14 scroll-mt-20">
					<h2 className="font-display text-[clamp(28px,4vw,42px)] font-bold uppercase leading-none">Winning</h2>
					<p className="mt-4 max-w-[62ch] text-[15px] leading-7 text-[#c3beb2]">There are three ways a match ends.</p>
					<ol className="mt-5 space-y-4 border-t border-[var(--line-strong)] pt-5">
						<Way n={1} title="Capture their Flag">
							Move any piece onto their Flag. The Flag loses every fight it is ever in, so it wins nothing — it only
							has to survive.
						</Way>
						<Way n={2} title="Walk your Flag home">
							Get your own Flag to the far row. Risky and slow, and it announces itself the moment they notice.
						</Way>
						<Way n={3} title="Your opponent resigns">
							Available from the match menu at any time, and confirmed before it happens.
						</Way>
					</ol>
				</section>

				<section id="what-beats-what" className="mt-14 scroll-mt-20">
					<h2 className="font-display text-[clamp(28px,4vw,42px)] font-bold uppercase leading-none">What beats what</h2>
					<p className="mt-4 max-w-[62ch] text-[15px] leading-7 text-[#c3beb2]">
						Higher rank wins — with two exceptions that decide most games. This is the same reference you can open
						from inside a match.
					</p>
					<div className="mt-7">
						<RankReference />
					</div>
				</section>

				<section id="bluffing" className="mt-14 scroll-mt-20">
					<h2 className="font-display text-[clamp(28px,4vw,42px)] font-bold uppercase leading-none">
						Why it is not really about rank
					</h2>
					<div className="mt-4 max-w-[62ch] space-y-4 text-[15px] leading-7 text-[#c3beb2]">
						<p>
							Because ranks are hidden, a piece is worth whatever your opponent believes it is. A Private walked
							boldly up the board reads as a General. A General held back reads as a Flag guard.
						</p>
						<p>
							Every fight you take also teaches them something. Winning with a Colonel tells them you hold at least a
							Colonel and where it is. Sometimes losing a cheap piece on purpose is the cheapest question you can ask.
						</p>
						<p className="text-[var(--foreground)]">
							Good players lose pieces deliberately. That is the game underneath the game.
						</p>
					</div>
				</section>

				<section className="mt-16 border-t border-[var(--line-strong)] pt-8">
					<h2 className="font-display text-[clamp(30px,5vw,52px)] font-extrabold uppercase leading-none">
						Twenty-one pieces. One flag.
					</h2>
					<p className="mt-3 text-[15px] text-[var(--ink-muted)]">
						No account, no download. Play the computer first if you want the guide switched on.
					</p>
					<div className="mt-6 flex flex-wrap gap-3">
						<Button size="lg" asChild>
							<Link href="/play">Play now</Link>
						</Button>
						<Button variant="outline" size="lg" asChild>
							<Link href="/about">About the game</Link>
						</Button>
					</div>
				</section>
			</article>

			<aside className="hidden lg:block">
				<nav aria-label="On this page" className="sticky top-24">
					<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">On this page</p>
					<ul className="mt-3 border-l border-[var(--line)]">
						{SECTIONS.map(([id, label]) => (
							<li key={id}>
								<a
									href={`#${id}`}
									className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-[var(--ink-muted)] transition-colors hover:border-[var(--ink-muted)] hover:text-[var(--foreground)]"
								>
									{label}
								</a>
							</li>
						))}
					</ul>
					<Button variant="outline" size="sm" asChild className="mt-6 w-full">
						<Link href="/play?mode=bot">Practise on the computer</Link>
					</Button>
				</nav>
			</aside>
			</div>

			<SiteFooter />
		</main>
	);
}

function Outcome({ result, text }: { result: "win" | "lose" | "both"; text: string }) {
	const tone =
		result === "win" ? "text-[var(--live)]" : result === "lose" ? "text-[var(--loss)]" : "text-[var(--ink-faint)]";
	const label = result === "win" ? "You win" : result === "lose" ? "You lose" : "Both fall";

	return (
		<p className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
			<span className={`font-mono text-[10px] uppercase tracking-[0.16em] sm:pt-1 ${tone}`}>{label}</span>
			<span className="text-[15px] leading-7 text-[#c3beb2]">{text}</span>
		</p>
	);
}

function Way({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
	return (
		<li className="grid gap-1.5 sm:grid-cols-[2rem_1fr] sm:gap-4">
			<span className="font-mono text-[11px] tabular-nums text-[var(--ink-faint)] sm:pt-1.5">{String(n).padStart(2, "0")}</span>
			<span>
				<span className="block font-display text-2xl font-semibold uppercase leading-tight tracking-wide">{title}</span>
				<span className="mt-1 block max-w-[58ch] text-[15px] leading-7 text-[var(--ink-muted)]">{children}</span>
			</span>
		</li>
	);
}
