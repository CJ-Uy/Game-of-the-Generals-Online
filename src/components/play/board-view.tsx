import { COLS, FILES, ROWS, ranks, type PlayerSide, type RankKey } from "@/lib/game";

export const rankByKey = new Map(ranks.map((rank) => [rank.key, rank]));
export const rankIndex = new Map(ranks.map((rank, index) => [rank.key, index]));

export function boardGlyphSize(glyph: string) {
	if (glyph.length >= 4) return "text-[7px] tracking-normal sm:text-[10px]";
	if (glyph.length === 3) return "text-[9px] sm:text-xs";
	return "text-xs sm:text-base";
}

export function CompactGlyph({ glyph }: { glyph: string }) {
	const rows = glyph === "★★★★★" ? ["★★", "★★★"] : glyph === "★★★★" ? ["★★", "★★"] : null;
	return rows ? (
		<span className="flex flex-col items-center justify-center leading-[0.82]">
			{rows.map((row, index) => (
				<span key={index}>{row}</span>
			))}
		</span>
	) : (
		glyph
	);
}

export function boardIndex(col: number, row: number) {
	return row * COLS + col;
}

export function toBoardCell(side: PlayerSide, col: number, row: number) {
	return side === "slate" ? { col: COLS - 1 - col, row: ROWS - 1 - row } : { col, row };
}

export function toViewCell(side: PlayerSide, col: number, row: number) {
	return toBoardCell(side, col, row);
}

export function viewSquare(side: PlayerSide, col: number, row: number) {
	const cell = toBoardCell(side, col, row);
	return `${FILES[cell.col]}${ROWS - cell.row}`;
}

export type LastMove = {
	side: PlayerSide;
	from: { col: number; row: number };
	to: { col: number; row: number };
};

export function parseLastMove(plies: string[]): LastMove | null {
	const match = /^([GS]) ([a-i])([1-8])[-x]([a-i])([1-8])$/.exec(plies.at(-1) ?? "");
	if (!match) return null;
	const [, side, fromFile, fromRank, toFile, toRank] = match;
	return {
		side: side === "G" ? "gold" : "slate",
		from: { col: FILES.indexOf(fromFile), row: ROWS - Number(fromRank) },
		to: { col: FILES.indexOf(toFile), row: ROWS - Number(toRank) },
	};
}

export function CommandChain() {
	return (
		<div>
			<div className="flex items-baseline justify-between gap-2">
				<h2 className="font-display text-xl font-bold uppercase">Command chain</h2>
				<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b647a]">High to low</span>
			</div>
			<div className="mt-3 grid grid-cols-5 gap-1.5">
				{ranks.map((rank) => (
					<div key={rank.key} className="min-w-0 rounded-[4px] border border-[#1c2740] bg-[#0b101b] p-2 text-center">
						<div className={`font-bold leading-none text-[var(--accent)] ${boardGlyphSize(rank.glyph)}`}>
							<CompactGlyph glyph={rank.glyph} />
						</div>
						<div className="mt-1 truncate font-mono text-[7px] uppercase tracking-normal text-[#8a93a8]">{rank.key}</div>
					</div>
				))}
			</div>
			<div className="mt-3 grid gap-1.5 font-mono text-[9px] uppercase leading-4 tracking-[0.08em] text-[#8a93a8]">
				<span>Higher rank beats lower rank.</span>
				<span>Spy beats every officer.</span>
				<span>Private beats Spy.</span>
				<span>Flag loses to all except Flag.</span>
			</div>
		</div>
	);
}

export function rankName(key?: RankKey) {
	return key ? rankByKey.get(key)?.name : undefined;
}
