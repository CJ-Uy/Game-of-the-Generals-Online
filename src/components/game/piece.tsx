import { cn } from "@/lib/utils";
import { rankByKey } from "@/lib/coach";
import type { RankKey } from "@/lib/game";

/**
 * The canonical piece face. Previously duplicated across home-experience,
 * war-board and board-setup; those should all render through this.
 *
 * Treated as a DISPLAY, not an object: flat faces, no bevel, no ring, no
 * drop shadow. The rank notation is already dense enough to read without
 * competing with material.
 *
 * The enemy face carries no glyph, no silhouette and no size cue. Every
 * enemy tile must render byte-identical whether it hides a Flag or a
 * 5-Star General, or the entire bluff economy leaks through the UI.
 */

export type PieceState = "idle" | "selected" | "fallen" | "hint";
export type PieceScale = "board" | "tray" | "card" | "chip";

const SCALE: Record<PieceScale, { box: string; radius: string }> = {
	board: { box: "h-full w-full", radius: "rounded-[3px]" },
	tray: { box: "h-11 w-11", radius: "rounded-[4px]" },
	card: { box: "h-8 w-9", radius: "rounded-[3px]" },
	chip: { box: "h-5 w-4", radius: "rounded-[2px]" },
};

/** Star ranks wrap to two rows so a 5-star does not shrink to noise. */
export function RankGlyph({ glyph, className }: { glyph: string; className?: string }) {
	const rows = glyph === "★★★★★" ? ["★★", "★★★"] : glyph === "★★★★" ? ["★★", "★★"] : null;
	if (!rows) return <span className={className}>{glyph}</span>;
	return (
		<span className={cn("flex flex-col items-center justify-center leading-[0.8]", className)}>
			{/* Index keys: the split is a fixed two-row layout, and 4★ produces two identical halves. */}
			{rows.map((row, index) => (
				<span key={index}>{row}</span>
			))}
		</span>
	);
}

export function glyphTextSize(glyph: string, scale: PieceScale) {
	if (scale === "chip") return "text-[6px] tracking-tighter";
	if (scale === "card") return glyph.length >= 4 ? "text-[8px] tracking-tighter" : glyph.length === 3 ? "text-[10px]" : "text-sm";
	if (scale === "tray") return glyph.length >= 4 ? "text-[9px] tracking-tighter" : glyph.length === 3 ? "text-xs" : "text-base";
	// board
	if (glyph.length >= 4) return "text-[7px] tracking-tighter sm:text-[10px]";
	if (glyph.length === 3) return "text-[9px] sm:text-xs";
	return "text-xs sm:text-base";
}

export function Piece({
	rank,
	side,
	state = "idle",
	scale = "board",
	className,
}: {
	rank?: RankKey;
	side: "you" | "foe";
	state?: PieceState;
	scale?: PieceScale;
	className?: string;
}) {
	const glyph = rank ? (rankByKey.get(rank)?.glyph ?? "") : "";
	const { box, radius } = SCALE[scale];
	const known = side === "you" || Boolean(rank);

	return (
		<span
			className={cn(
				"flex select-none items-center justify-center border font-bold leading-none transition-[box-shadow,opacity] duration-150",
				box,
				radius,
				side === "you"
					? "border-[var(--gold-lo)] bg-[linear-gradient(150deg,var(--accent),var(--gold-lo))] text-[#0e1420]/78"
					: known
						? "border-[var(--gold-lo)]/70 bg-[var(--slate-piece)] text-[var(--accent)]"
						: "border-[var(--slate-piece-hi)] bg-[var(--slate-piece)]",
				state === "selected" && "shadow-[inset_0_0_0_2px_var(--accent)]",
				state === "hint" && "opacity-70",
				state === "fallen" && "opacity-35 saturate-[0.2]",
				className,
			)}
		>
			{known && glyph ? <RankGlyph glyph={glyph} className={glyphTextSize(glyph, scale)} /> : null}
		</span>
	);
}

/** An empty square that is a legal destination for the piece in hand. */
export function MoveDot({ capture = false }: { capture?: boolean }) {
	if (capture) {
		return <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_0_2px_var(--loss)]" />;
	}
	return (
		<span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
			<span className="h-1/4 w-1/4 rounded-full bg-[var(--accent)]/55" />
		</span>
	);
}
