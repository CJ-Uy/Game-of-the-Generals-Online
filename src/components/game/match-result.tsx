"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Piece } from "@/components/game/piece";
import { rankShort } from "@/lib/coach";
import { cn } from "@/lib/utils";
import type { Outcome, PlayerSide, PublicPiece } from "@/lib/game";

/**
 * The thirty seconds after a match.
 *
 * Verdict, then what it cost both sides, then what to do next. The revealed
 * army is the emotional payload of this game specifically — it is the only
 * moment a player learns what they were actually up against — so it gets the
 * room rather than a thumbnail.
 */
export function MatchResult({
	outcome,
	side,
	pieces,
	onReplay,
	onRematch,
	rematchLabel = "Play again",
	rematchDisabled,
	rematchNote,
	className,
}: {
	outcome: Outcome;
	side: PlayerSide;
	pieces: PublicPiece[];
	onReplay?: () => void;
	onRematch?: () => void;
	rematchLabel?: string;
	rematchDisabled?: boolean;
	/** One line under the actions explaining what a rematch will do. */
	rematchNote?: string;
	className?: string;
}) {
	const won = outcome.winner === side;
	const drew = outcome.winner === "draw";
	const verdict = drew ? "Draw" : won ? "Victory" : "Defeat";

	const theirArmy = pieces.filter((piece) => piece.side === "foe");
	const theirLost = theirArmy.filter((piece) => !piece.alive).length;
	const yourLost = pieces.filter((piece) => piece.side === "you" && !piece.alive).length;

	return (
		<div className={cn("space-y-5", className)}>
			<div>
				<p
					className={cn(
						"font-display text-[clamp(44px,12vw,76px)] font-bold uppercase leading-[0.85]",
						drew ? "text-[var(--foreground)]" : won ? "text-[var(--accent)]" : "text-[var(--loss)]",
					)}
				>
					{verdict}
				</p>
				<p className="mt-1 text-sm text-[var(--ink-muted)]">{outcome.note}</p>
			</div>

			<dl className="flex divide-x divide-[var(--line)] border-y border-[var(--line)]">
				<div className="flex-1 py-2.5 pr-4">
					<dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">You lost</dt>
					<dd className="font-display text-2xl leading-none tabular-nums">{yourLost}</dd>
				</div>
				<div className="flex-1 py-2.5 pl-4">
					<dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">They lost</dt>
					<dd className="font-display text-2xl leading-none tabular-nums">{theirLost}</dd>
				</div>
			</dl>

			<section>
				<h3 className="font-display text-lg font-semibold uppercase tracking-wide">What they were holding</h3>
				<p className="mt-1 text-xs text-[var(--ink-muted)]">Faded pieces were captured during the match.</p>
				<ul className="mt-3 flex flex-wrap gap-1.5">
					{theirArmy.map((piece) => (
						<li key={piece.id} className="flex flex-col items-center gap-1">
							<Piece rank={piece.rank} side="foe" scale="card" state={piece.alive ? "idle" : "fallen"} />
							<span className={cn("font-mono text-[8px] uppercase tracking-wide", piece.alive ? "text-[var(--ink-muted)]" : "text-[var(--ink-faint)]")}>
								{piece.rank ? rankShort[piece.rank] : "?"}
							</span>
						</li>
					))}
				</ul>
			</section>

			<div className="flex flex-wrap gap-2">
				{onRematch ? (
					<Button onClick={onRematch} disabled={rematchDisabled}>
						{rematchLabel}
					</Button>
				) : null}
				<Button variant="outline" asChild>
					<Link href="/play">New match</Link>
				</Button>
				{onReplay ? (
					<Button variant="ghost" onClick={onReplay}>
						Step through the match
					</Button>
				) : null}
			</div>

			{rematchNote ? <p className="text-xs text-[var(--ink-muted)]">{rematchNote}</p> : null}
		</div>
	);
}
