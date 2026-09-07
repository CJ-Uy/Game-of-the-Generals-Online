import { COLS, ranks, type RankKey } from "@/lib/game";

/**
 * Starter formations.
 *
 * Placing 21 pieces into 27 squares is the single hardest thing we ask of a
 * first-time player, and it happens before they have played a move. A named
 * formation with one line of reasoning turns that into a two-tap decision they
 * can still edit — and gives an experienced player a sane baseline to deviate
 * from.
 *
 * Rows run enemy-side first: row 0 is your front line, row 2 is your back row.
 * `makeSidePieces` mirrors this per side, so the same table works for both.
 */

export type Formation = {
	id: string;
	name: string;
	doctrine: string;
	/** 3 rows × 9 columns; "" is an empty square. */
	rows: (RankKey | "")[][];
};

export const formations: Formation[] = [
	{
		id: "balanced",
		name: "Balanced line",
		doctrine: "Cheap pieces forward, officers in the middle, Flag centred and screened. Hard to punish if you are still learning.",
		rows: [
			["PVT", "PVT", "LT2", "SGT", "CPT", "LT1", "PVT", "PVT", ""],
			["", "MAJ", "LTC", "G1", "G3", "G2", "COL", "SPY", ""],
			["", "PVT", "SPY", "G4", "FLG", "G5", "PVT", "", ""],
		],
	},
	{
		id: "left-hook",
		name: "Left hook",
		doctrine: "Generals massed on the left files with the Flag tucked far right. Wins fast against a passive opponent, ugly if they read it.",
		rows: [
			["SGT", "LT2", "LT1", "PVT", "PVT", "", "PVT", "PVT", ""],
			["G3", "G2", "COL", "CPT", "MAJ", "", "SPY", "", "PVT"],
			["G5", "G4", "G1", "LTC", "SPY", "", "", "PVT", "FLG"],
		],
	},
	{
		id: "deep-flag",
		name: "Deep flag",
		doctrine: "A wall of Privates across the front — the pieces that kill Spies — with every General held back. Slow, safe, very hard to rush.",
		rows: [
			["PVT", "PVT", "PVT", "PVT", "PVT", "PVT", "SGT", "LT2", ""],
			["", "LT1", "CPT", "MAJ", "LTC", "COL", "SPY", "SPY", ""],
			["", "", "G1", "G2", "FLG", "G3", "G4", "G5", ""],
		],
	},
];

/**
 * Turns a formation table into the `{ zone: "RANK-n" }` shape the API expects.
 *
 * The index must be per-rank, not a global serial: the setup screen's tray is
 * keyed `PVT-0` … `PVT-5`, and a uid outside that range would place a piece the
 * tray cannot look up.
 */
export function formationLoadout(formation: Formation): Record<number, string> {
	const loadout: Record<number, string> = {};
	const used = new Map<RankKey, number>();

	formation.rows.forEach((row, rowIndex) => {
		row.forEach((rank, colIndex) => {
			if (!rank) return;
			const index = used.get(rank) ?? 0;
			used.set(rank, index + 1);
			loadout[rowIndex * COLS + colIndex] = `${rank}-${index}`;
		});
	});

	return loadout;
}

/** Guards against a typo in the tables above shipping as an unplayable army. */
export function validateFormation(formation: Formation): string | null {
	const counts = new Map<RankKey, number>();
	let total = 0;

	for (const row of formation.rows) {
		if (row.length !== COLS) return `${formation.name}: a row has ${row.length} squares, expected ${COLS}.`;
		for (const rank of row) {
			if (!rank) continue;
			counts.set(rank, (counts.get(rank) ?? 0) + 1);
			total += 1;
		}
	}

	for (const rank of ranks) {
		const found = counts.get(rank.key) ?? 0;
		if (found !== rank.count) return `${formation.name}: ${found}× ${rank.name}, expected ${rank.count}.`;
	}

	const expected = ranks.reduce((sum, rank) => sum + rank.count, 0);
	if (total !== expected) return `${formation.name}: ${total} pieces, expected ${expected}.`;
	return null;
}

// ponytail: dev-only assertion instead of a test file. A miscounted table would
// otherwise ship as an army the server silently rejects at deploy time.
if (process.env.NODE_ENV !== "production") {
	for (const formation of formations) {
		const problem = validateFormation(formation);
		if (problem) console.error(`[formations] ${problem}`);
	}
}
