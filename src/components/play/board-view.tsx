"use client";

import { useState } from "react";
import { COLS, FILES, ROWS, ranks, type PlayerSide, type PublicPiece, type RankKey } from "@/lib/game";

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

type GuessModifier = "<" | ">";
export type GuessTag = RankKey | `${GuessModifier}${RankKey}`;

function guessParts(tag?: GuessTag): { modifier: GuessModifier | ""; key?: RankKey; glyph: string } {
	if (!tag) return { modifier: "", glyph: "" };
	const modifier = tag[0] === "<" || tag[0] === ">" ? tag[0] : "";
	const key = (modifier ? tag.slice(1) : tag) as RankKey;
	return { modifier, key, glyph: rankByKey.get(key)?.glyph ?? key };
}

export function guessGlyph(tag?: GuessTag) {
	const { modifier, glyph } = guessParts(tag);
	return `${modifier}${glyph}`;
}

export function GuessBadge({ tag }: { tag?: GuessTag }) {
	if (!tag) return null;
	const { modifier, glyph } = guessParts(tag);
	return (
		<span className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
			<span className="flex min-h-6 min-w-7 items-center justify-center gap-0.5 rounded-[4px] border border-[rgba(201,168,93,0.75)] bg-[#07100b]/88 px-1.5 py-0.5 font-bold leading-none text-[var(--accent)] shadow-[0_4px_14px_rgba(0,0,0,0.45)]">
				{modifier ? <span className="text-[10px] sm:text-xs">{modifier}</span> : null}
				<span className={boardGlyphSize(glyph)}>
					<CompactGlyph glyph={glyph} />
				</span>
			</span>
		</span>
	);
}

export function GuessPicker({ onPick, selected }: { onPick: (tag: GuessTag) => void; selected?: GuessTag }) {
	const [modifier, setModifier] = useState<GuessModifier | "">("");

	return (
		<>
			<div className="mb-3 grid grid-cols-3 gap-2">
				{[
					["", "Exact"],
					["<", "<"],
					[">", ">"],
				].map(([value, label]) => (
					<button
						key={value || "exact"}
						type="button"
						onClick={() => setModifier(value as GuessModifier | "")}
						className={`rounded-[4px] border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
							modifier === value ? "border-[var(--accent)] bg-[rgba(201,168,93,0.12)] text-[var(--accent)]" : "border-[#2c3a55] bg-[#121b2c] text-[#8a93a8] hover:border-[rgba(201,168,93,0.5)]"
						}`}
					>
						{label}
					</button>
				))}
			</div>
			<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
				{ranks.map((rank) => {
					const tag = `${modifier}${rank.key}` as GuessTag;
					const active = selected === tag;
					return (
						<button
							key={rank.key}
							type="button"
							onClick={() => onPick(tag)}
							className={`rounded-[5px] border p-3 text-left transition-colors active:scale-[0.98] hover:border-[var(--accent)] ${
								active ? "border-[var(--accent)] bg-[rgba(201,168,93,0.14)]" : "border-[#2c3a55] bg-[#121b2c]"
							}`}
						>
							<div className="flex items-center gap-1 font-bold leading-none text-[var(--accent)]">
								{modifier ? <span className="text-xs">{modifier}</span> : null}
								<span className={boardGlyphSize(rank.glyph)}>
									<CompactGlyph glyph={rank.glyph} />
								</span>
							</div>
							<div className="mt-2 truncate font-mono text-[8px] uppercase tracking-[0.08em] text-[#8a93a8]">{rank.name}</div>
						</button>
					);
				})}
			</div>
		</>
	);
}

export function PieceClashPreview({ attacker, defender }: { attacker: PublicPiece; defender: PublicPiece }) {
	return (
		<span className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
			<PieceFace piece={defender} />
			<span className="absolute inset-0 flex items-center justify-center [transform:translate(-18%,-22%)_rotate(-4deg)]">
				<PieceFace piece={attacker} raised />
			</span>
		</span>
	);
}

function PieceFace({ piece, raised = false }: { piece: PublicPiece; raised?: boolean }) {
	const glyph = piece.rank ? (rankByKey.get(piece.rank)?.glyph ?? "") : "";
	return (
		<span
			className={`flex h-[74%] w-[86%] items-center justify-center overflow-hidden rounded-[4px] border font-bold leading-none shadow-[0_14px_30px_rgba(0,0,0,0.5)] ${
				piece.side === "you"
					? `border-[#dabb74] bg-gradient-to-br from-[#c9a85d] to-[#a8894a] text-[#0e1420]/75 ${boardGlyphSize(glyph)}`
					: "border-[#50658a] bg-gradient-to-br from-[#314a79] to-[#203257]"
			} ${raised ? "ring-2 ring-[rgba(201,168,93,0.75)]" : ""}`}
		>
			{piece.side === "you" ? <CompactGlyph glyph={glyph} /> : null}
		</span>
	);
}

export function ArbiterChip() {
	return (
		<span className="wr-arbiter-chip pointer-events-none absolute inset-x-1 bottom-1 z-[4] overflow-hidden rounded-[3px] border border-[rgba(201,168,93,0.45)] bg-[#0e1420]/90 py-0.5 text-center font-mono text-[7px] uppercase tracking-[0.12em] text-[var(--accent)]">
			Arbiter
		</span>
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

export function formatPlyForView(ply: string, side: PlayerSide) {
	const match = /^([GS]) ([a-i])([1-8])([-x])([a-i])([1-8])$/.exec(ply);
	if (!match) return ply;
	const [, player, fromFile, fromRank, action, toFile, toRank] = match;
	const from = toViewCell(side, FILES.indexOf(fromFile), ROWS - Number(fromRank));
	const to = toViewCell(side, FILES.indexOf(toFile), ROWS - Number(toRank));
	return `${player} ${FILES[from.col]}${ROWS - from.row}${action}${FILES[to.col]}${ROWS - to.row}`;
}

export function CommandChain({ activeRank }: { activeRank?: RankKey } = {}) {
	const commandRanks = [
		rankByKey.get("SPY"),
		...ranks.filter((rank) => rank.key !== "SPY" && rank.key !== "FLG"),
	].filter((rank): rank is (typeof ranks)[number] => Boolean(rank));

	return (
		<div>
			<div className="flex items-baseline justify-between gap-2">
				<h2 className="font-display text-xl font-bold uppercase">Command chain</h2>
				<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b647a]">Count shown</span>
			</div>
			<div className="mt-3 space-y-1.5">
				{commandRanks.map((rank, index) => {
					const active = activeRank === rank.key;
					return (
					<div key={rank.key} aria-current={active ? "true" : undefined} className={`grid grid-cols-[2.5rem_1fr_1.5rem] items-center gap-2 rounded-[4px] border px-2 py-1.5 transition-colors ${active ? "border-[var(--accent)] bg-[rgba(201,168,93,0.14)] shadow-[0_0_0_1px_rgba(201,168,93,0.2)]" : "border-[#1c2740] bg-[#0b101b]"}`}>
						<div className={`flex h-8 items-center justify-center rounded-[4px] border border-[#dabb74]/60 bg-gradient-to-br from-[#c9a85d] to-[#a8894a] font-bold leading-none text-[#0e1420]/75 ${boardGlyphSize(rank.glyph)}`}>
							<CompactGlyph glyph={rank.glyph} />
						</div>
						<div className="min-w-0">
							<div className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-[#ede8da]">{rank.name}</div>
							<div className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#5b647a]">
								{rank.key === "SPY" ? "Killed by Private" : rank.key === "PVT" ? `x${rank.count} · Can kill Spy` : `x${rank.count}`}
							</div>
						</div>
						<div className="text-center font-mono text-xs text-[#5b647a]">{index < commandRanks.length - 1 ? "↓" : ""}</div>
					</div>
					);
				})}
			</div>
			<div className={`mt-2 grid grid-cols-[2.5rem_1fr] items-center gap-2 rounded-[4px] border px-2 py-1.5 transition-colors ${activeRank === "FLG" ? "border-[var(--accent)] bg-[rgba(201,168,93,0.14)] shadow-[0_0_0_1px_rgba(201,168,93,0.2)]" : "border-[#1c2740] bg-[#0b101b]"}`}>
				<div className="flex h-8 items-center justify-center rounded-[4px] border border-[#dabb74]/60 bg-gradient-to-br from-[#c9a85d] to-[#a8894a] font-bold leading-none text-[#0e1420]/75">
					<CompactGlyph glyph={rankByKey.get("FLG")?.glyph ?? ""} />
				</div>
				<div className="font-mono text-[8px] uppercase leading-4 tracking-[0.08em] text-[#8a93a8]">
					Flag x1 loses to attackers. Reach back line or attack enemy Flag to win.
				</div>
			</div>
		</div>
	);
}

export function CapturedGuessTiles({
	pieces,
	tags,
	onTag,
}: {
	pieces: PublicPiece[];
	tags: Record<number, GuessTag>;
	onTag: (pieceId: number) => void;
}) {
	if (!pieces.length) return <p className="text-xs text-[#5b647a]">None captured yet.</p>;
	return (
		<div className="mt-3 flex flex-wrap gap-1.5">
			{pieces.map((piece) => (
				<button
					key={piece.id}
					type="button"
					onClick={() => onTag(piece.id)}
					className="relative flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#2c3a55] bg-gradient-to-br from-[#253352] to-[#1a2338] transition-transform active:scale-[0.96] hover:border-[var(--accent)]"
					aria-label="Tag captured enemy piece"
				>
					<GuessBadge tag={tags[piece.id]} />
				</button>
			))}
		</div>
	);
}

export function rankName(key?: RankKey) {
	return key ? rankByKey.get(key)?.name : undefined;
}
