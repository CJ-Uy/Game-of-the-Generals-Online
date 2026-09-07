"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ranks, type PublicPiece, type RankKey } from "@/lib/game";
import { rankMatchups, rankNote, rankShort, remainingByRank, revealedEnemyRanks } from "@/lib/coach";
import { Piece } from "@/components/game/piece";
import { IconChevronDown } from "@/components/ui/icons";

/**
 * "What beats what", one tap away at all times.
 *
 * Presented as a ladder rather than a grid, because the ladder IS the rule —
 * and then the two pieces that break it are pulled out of the ladder, because
 * that break is the only thing a new player actually has to memorise.
 */

const LADDER: RankKey[] = ["G5", "G4", "G3", "G2", "G1", "COL", "LTC", "MAJ", "CPT", "LT1", "LT2", "SGT", "PVT"];

export function RankReference({ pieces }: { pieces?: PublicPiece[] }) {
	const [openRank, setOpenRank] = useState<RankKey | null>(null);
	const yours = pieces ? remainingByRank(pieces, "you") : null;
	const seen = pieces ? revealedEnemyRanks(pieces) : [];

	return (
		<div className="space-y-6">
			<section>
				<h3 className="font-display text-lg font-semibold uppercase tracking-wide text-[var(--foreground)]">The two rules that decide games</h3>
				<div className="mt-2.5 grid gap-2 sm:grid-cols-2">
					<InversionCallout
						attacker="SPY"
						defender="G5"
						line="A Spy kills every officer — Sergeant right up to the 5-Star General."
					/>
					<InversionCallout attacker="PVT" defender="SPY" line="A Private kills the Spy. It is the only piece that can, and you have six." />
				</div>
			</section>

			<section>
				<div className="flex items-baseline justify-between gap-3">
					<h3 className="font-display text-lg font-semibold uppercase tracking-wide">Rank ladder</h3>
					<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">Strongest first</span>
				</div>
				<p className="mt-1.5 text-sm text-[var(--ink-muted)]">
					Higher rank wins. Equal ranks kill each other. Tap a rank for its matchups.
				</p>

				<ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
					{LADDER.map((key) => (
						<RankRow
							key={key}
							rankKey={key}
							open={openRank === key}
							onToggle={() => setOpenRank(openRank === key ? null : key)}
							remaining={yours?.get(key)}
							seenOnEnemy={seen.includes(key)}
							showCounts={Boolean(pieces)}
						/>
					))}
				</ul>
			</section>

			<section>
				<h3 className="font-display text-lg font-semibold uppercase tracking-wide">Outside the ladder</h3>
				<ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
					{(["SPY", "FLG"] as RankKey[]).map((key) => (
						<RankRow
							key={key}
							rankKey={key}
							open={openRank === key}
							onToggle={() => setOpenRank(openRank === key ? null : key)}
							remaining={yours?.get(key)}
							seenOnEnemy={seen.includes(key)}
							showCounts={Boolean(pieces)}
						/>
					))}
				</ul>
			</section>
		</div>
	);
}

function InversionCallout({ attacker, defender, line }: { attacker: RankKey; defender: RankKey; line: string }) {
	return (
		<div className="flex items-center gap-3 border border-[var(--line-strong)] bg-[var(--panel)] p-3">
			<div className="flex flex-none items-center gap-1.5">
				<Piece rank={attacker} side="you" scale="card" />
				<span aria-hidden className="font-mono text-xs text-[var(--live)]">
					&gt;
				</span>
				<Piece rank={defender} side="you" scale="card" />
			</div>
			<p className="text-[13px] leading-snug text-[var(--foreground)]/90">{line}</p>
		</div>
	);
}

function RankRow({
	rankKey,
	open,
	onToggle,
	remaining,
	seenOnEnemy,
	showCounts,
}: {
	rankKey: RankKey;
	open: boolean;
	onToggle: () => void;
	remaining?: number;
	seenOnEnemy: boolean;
	showCounts: boolean;
}) {
	const rank = ranks.find((item) => item.key === rankKey);
	if (!rank) return null;
	const { beats, losesTo, trades } = rankMatchups(rankKey);

	return (
		<li>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-[var(--panel)]"
			>
				<Piece rank={rankKey} side="you" scale="card" className="flex-none" />

				<span className="min-w-0 flex-1">
					<span className="block truncate text-sm font-medium text-[var(--foreground)]">{rank.name}</span>
					<span className="block truncate text-xs text-[var(--ink-muted)]">{rankNote[rankKey]}</span>
				</span>

				<span className="flex flex-none items-center gap-2.5">
					{seenOnEnemy ? (
						<span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--accent)]" title="You have seen this rank on their side">
							Seen
						</span>
					) : null}
					{showCounts ? (
						<span className="font-mono text-xs tabular-nums text-[var(--ink-muted)]" title="Still standing on your side">
							{remaining ?? 0}
							<span className="text-[var(--ink-faint)]">/{rank.count}</span>
						</span>
					) : (
						<span className="font-mono text-xs tabular-nums text-[var(--ink-faint)]">×{rank.count}</span>
					)}
					<IconChevronDown size={15} className={cn("text-[var(--ink-faint)] transition-transform duration-150", open && "rotate-180")} />
				</span>
			</button>

			{open ? (
				<div className="gog-fade-in space-y-2.5 px-1 pb-3.5 sm:pl-[3.25rem]">
					<MatchupRow label="Beats" tone="good" keys={beats} />
					<MatchupRow label="Loses to" tone="bad" keys={losesTo} />
					{trades.length ? <MatchupRow label="Both die" tone="flat" keys={trades} /> : null}
				</div>
			) : null}
		</li>
	);
}

function MatchupRow({ label, keys, tone }: { label: string; keys: RankKey[]; tone: "good" | "bad" | "flat" }) {
	return (
		<div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
			<span
				className={cn(
					"font-mono text-[9px] uppercase tracking-[0.14em] sm:w-[4.5rem] sm:flex-none sm:pt-1",
					tone === "good" && "text-[var(--live)]",
					tone === "bad" && "text-[var(--loss)]",
					tone === "flat" && "text-[var(--ink-faint)]",
				)}
			>
				{label}
			</span>
			{keys.length ? (
				<span className="flex flex-wrap gap-1">
					{keys.map((key) => (
						<span
							key={key}
							className="border border-[var(--line-strong)] bg-[var(--panel)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground)]/85"
						>
							{rankShort[key]}
						</span>
					))}
				</span>
			) : (
				<span className="pt-0.5 text-xs text-[var(--ink-faint)]">Nothing</span>
			)}
		</div>
	);
}
