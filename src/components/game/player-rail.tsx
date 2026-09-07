"use client";

import { cn } from "@/lib/utils";
import type { PlayerSide, PublicPiece } from "@/lib/game";
import { Piece } from "@/components/game/piece";

/**
 * The frame around the board.
 *
 * A bare board never tells you whose move it is; every clocked two-player game
 * resolves this the same way, with an opponent rail above and a mirrored player
 * rail below. Turn ownership is carried by which rail is lit, not by a sentence
 * somewhere else on the page.
 *
 * There is deliberately no clock here: the room state has no timer, and a fake
 * one would be worse than none. The right-hand slot is where it will go.
 */
export function PlayerRail({
	name,
	side,
	you,
	active,
	waiting,
	fallen,
	revealFallen,
	trailing,
	className,
}: {
	name: string;
	side: PlayerSide;
	you?: boolean;
	active?: boolean;
	waiting?: boolean;
	fallen: PublicPiece[];
	/** Enemy casualties stay blank until the match ends, like every other enemy tile. */
	revealFallen?: boolean;
	trailing?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-3 border bg-[var(--panel)] px-3 py-2 transition-colors",
				active ? "border-[var(--accent)]" : "border-[var(--line)]",
				className,
			)}
		>
			<span
				aria-hidden
				className={cn(
					"flex h-8 w-8 flex-none items-center justify-center border text-[11px] font-bold",
					side === "gold"
						? "border-[var(--gold-lo)] bg-[linear-gradient(150deg,var(--accent),var(--gold-lo))] text-[#0e1420]/80"
						: "border-[var(--slate-piece-hi)] bg-[var(--slate-piece)] text-[var(--foreground)]/80",
				)}
			>
				{side === "gold" ? "G" : "S"}
			</span>

			<span className="min-w-0 flex-1">
				<span className="flex items-baseline gap-2">
					<span className="truncate text-sm font-bold leading-tight">{name}</span>
					{active ? (
						<span className="flex-none font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--accent)]">
							{you ? "Your move" : "Thinking"}
						</span>
					) : null}
					{waiting ? <span className="flex-none font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">Not here yet</span> : null}
				</span>

				<span className="mt-1 flex h-[13px] items-center gap-[3px]">
					{fallen.length ? (
						fallen.map((piece) => (
							<Piece
								key={piece.id}
								rank={revealFallen ? piece.rank : undefined}
								side={you ? "you" : "foe"}
								scale="chip"
								state="fallen"
								className="flex-none"
							/>
						))
					) : (
						<span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">No losses</span>
					)}
				</span>
			</span>

			{trailing ? <span className="flex-none">{trailing}</span> : null}
		</div>
	);
}
