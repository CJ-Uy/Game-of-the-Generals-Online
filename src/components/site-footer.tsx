import Link from "next/link";

/**
 * One footer for the public pages. Every route was previously a dead end —
 * /about and /how-to-play had no way back to each other, and nothing pointed
 * at the rules from anywhere except the hero.
 */

const NAV: { heading: string; links: { href: string; label: string }[] }[] = [
	{
		heading: "Play",
		links: [
			{ href: "/play", label: "Start a match" },
			{ href: "/play", label: "Play the computer" },
			{ href: "/play", label: "Pass and play" },
		],
	},
	{
		heading: "Learn",
		links: [
			{ href: "/how-to-play", label: "How to play" },
			{ href: "/how-to-play#what-beats-what", label: "What beats what" },
		],
	},
	{
		heading: "Studio",
		links: [
			{ href: "/about", label: "About the game" },
			{ href: "/about#studio", label: "Aligway Studios" },
		],
	},
];

export function SiteFooter() {
	return (
		<footer className="border-t border-[var(--line)] bg-[var(--panel)]">
			<div className="mx-auto max-w-6xl px-5 py-14 md:px-12">
				<div className="grid gap-10 sm:grid-cols-3">
					{NAV.map((group) => (
						<nav key={group.heading} aria-label={group.heading}>
							<h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">{group.heading}</h2>
							<ul className="mt-3 space-y-2">
								{group.links.map((link) => (
									<li key={link.label}>
										<Link href={link.href} className="text-[15px] text-[var(--ink-muted)] transition-colors hover:text-[var(--foreground)]">
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</nav>
					))}
				</div>

				<div className="mt-12 flex flex-col gap-2 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-baseline sm:justify-between">
					<p className="font-display text-2xl font-semibold uppercase tracking-wide">Game of the Generals</p>
					<p className="text-sm text-[var(--ink-faint)]">
						Salpakan, invented in the Philippines in 1970. Free to play, no account.
					</p>
				</div>
			</div>
		</footer>
	);
}
