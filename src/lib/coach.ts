import { battleLosers, ranks, type Outcome, type PlayerSide, type PublicPiece, type RankKey } from "@/lib/game";

/**
 * The teaching layer.
 *
 * A new player's problem with Salpakan is never the movement rule — it is one
 * square, orthogonally, and that takes three seconds to learn. The problem is
 * that every piece they meet is blank, and the rank ladder has two inversions
 * (Spy beats officers, Private beats Spy) that make the obvious guess wrong.
 *
 * So this module derives matchups from the real `battleLosers` resolver rather
 * than restating them, and produces one plain-English line at a time. Never a
 * modal, never a wall, never two things at once.
 */

export type CoachLevel = "full" | "hints" | "off";
export const COACH_LEVEL_KEY = "gog:coach-level:v1";

export const rankByKey = new Map(ranks.map((rank) => [rank.key, rank]));
export const rankOrder = new Map(ranks.map((rank, index) => [rank.key, index]));

export type Matchups = {
	beats: RankKey[];
	losesTo: RankKey[];
	trades: RankKey[];
};

/** Derived from the resolver, so this can never drift from the actual rules. */
export function rankMatchups(key: RankKey): Matchups {
	const beats: RankKey[] = [];
	const losesTo: RankKey[] = [];
	const trades: RankKey[] = [];

	for (const other of ranks) {
		const losers = battleLosers(key, other.key);
		const attackerDies = losers.includes("att");
		const defenderDies = losers.includes("def");
		if (attackerDies && defenderDies) trades.push(other.key);
		else if (defenderDies) beats.push(other.key);
		else if (attackerDies) losesTo.push(other.key);
	}

	return { beats, losesTo, trades };
}

/** The one sentence that actually helps, written per rank. */
export const rankNote: Record<RankKey, string> = {
	G5: "Your strongest officer. Only a Spy can take it — and every enemy Private is hunting it.",
	G4: "Beaten only by the 5-Star General and by any Spy.",
	G3: "Solid attacker. Still falls to a Spy like every other officer.",
	G2: "Mid-weight officer. Trade it carefully; you only have one.",
	G1: "The lowest General. Outranks every Colonel and below.",
	COL: "Outranks everything below it, but four Generals sit above.",
	LTC: "Comfortable against Majors and under. Loses to any General.",
	MAJ: "Useful prober. Strong enough to punish careless Lieutenants.",
	CPT: "Middle of the ladder. Good for testing enemy pieces you can afford to lose.",
	LT1: "Beats the 2nd Lieutenant, the Sergeant and Privates. Nothing else.",
	LT2: "Second-weakest officer. Cheap to probe with.",
	SGT: "Beats Privates only. Expendable, and that makes it useful.",
	PVT: "Weakest in a straight fight — but a Private is the only piece that kills a Spy. You have six.",
	SPY: "Kills every officer, from Sergeant to 5-Star General. Any Private kills it.",
	FLG: "Loses every fight it takes part in. Protect it, or walk it to the far row to win.",
};

/** Short label used where a full sentence will not fit. */
export const rankShort: Record<RankKey, string> = {
	G5: "5★ Gen",
	G4: "4★ Gen",
	G3: "3★ Gen",
	G2: "2★ Gen",
	G1: "1★ Gen",
	COL: "Colonel",
	LTC: "Lt. Col",
	MAJ: "Major",
	CPT: "Captain",
	LT1: "1st Lt",
	LT2: "2nd Lt",
	SGT: "Sergeant",
	PVT: "Private",
	SPY: "Spy",
	FLG: "Flag",
};

export function rankName(key?: RankKey) {
	return key ? rankByKey.get(key)?.name : undefined;
}

export function rankGlyph(key?: RankKey) {
	return key ? (rankByKey.get(key)?.glyph ?? "") : "";
}

/* ---------------------------------------------------------------------------
   Coach messages
--------------------------------------------------------------------------- */

export type CoachTone = "neutral" | "warn" | "good" | "arbiter";

export type CoachMessage = {
	id: string;
	text: string;
	tone: CoachTone;
};

export type CoachInput = {
	level: CoachLevel;
	phase: "deploy" | "play" | "over";
	yourTurn: boolean;
	movesPlayed: number;
	/** Rank of the piece the player currently has picked up, if any. */
	selectedRank?: RankKey;
	/** Whether that selection can attack something from where it stands. */
	selectionCanAttack?: boolean;
	/** Set when the previous ply resolved a fight. */
	lastClash?: {
		byYou: boolean;
		yourRank?: RankKey;
		theirRank?: RankKey;
		youLost: boolean;
		theyLost: boolean;
	};
	outcome?: Outcome | null;
	yourSide?: PlayerSide;
	/** Deployment progress, only read in the deploy phase. */
	placed?: number;
	total?: number;
};

const HINT_ONLY = new Set(["clash", "selected", "outcome"]);

export function coachMessage(input: CoachInput): CoachMessage | null {
	if (input.level === "off") return null;

	const message = derive(input);
	if (!message) return null;
	if (input.level === "hints" && !HINT_ONLY.has(message.id.split(":")[0])) return null;
	return message;
}

function derive(input: CoachInput): CoachMessage | null {
	if (input.phase === "over" && input.outcome) {
		const won = input.outcome.winner === input.yourSide;
		const drew = input.outcome.winner === "draw";
		return {
			id: "outcome:end",
			tone: drew ? "neutral" : won ? "good" : "warn",
			text: drew ? "A draw. Neither flag fell." : won ? `You won. ${input.outcome.note}` : `You lost. ${input.outcome.note}`,
		};
	}

	if (input.phase === "deploy") {
		const placed = input.placed ?? 0;
		const total = input.total ?? 21;
		if (placed === 0) {
			return {
				id: "deploy:start",
				tone: "neutral",
				text: "Place your 21 pieces anywhere in your three rows. Not sure? Pick a formation and adjust it.",
			};
		}
		if (placed < total) {
			return {
				id: "deploy:progress",
				tone: "neutral",
				text: `${total - placed} left. Your opponent sees blank tiles — only the positions matter to them, not what you put where.`,
			};
		}
		return {
			id: "deploy:ready",
			tone: "good",
			text: "All 21 deployed. Check your Flag has pieces around it, then start.",
		};
	}

	if (input.lastClash) {
		const { byYou, yourRank, youLost, theyLost } = input.lastClash;
		// The arbiter announces who won, never the rank. Enemy ranks stay hidden
		// until the match ends, so the coach must not name one it cannot see.
		const yours = yourRank ? `your ${rankShort[yourRank]}` : "your piece";

		if (youLost && theyLost) {
			return {
				id: "clash:trade",
				tone: "neutral",
				text: `Equal ranks — both died. You now know exactly which rank they just spent.`,
			};
		}
		if (theyLost) {
			return {
				id: "clash:win",
				tone: "good",
				text: yourRank
					? `Your ${rankShort[yourRank]} won that fight. Their piece was lower — but you still do not know which.`
					: "You won that fight. Their piece was the lower rank.",
			};
		}
		if (youLost) {
			return {
				id: "clash:loss",
				tone: "warn",
				text: byYou
					? `You attacked into something stronger and lost ${yours}. Note that square — whatever sits there outranks it.`
					: `They took ${yours}. Whatever did it is the higher rank. Remember which direction it came from.`,
			};
		}
	}

	if (input.selectedRank) {
		const key = input.selectedRank;
		if (input.selectionCanAttack) {
			return {
				id: "selected:attack",
				tone: "warn",
				text: `That square holds an enemy piece. You do not know its rank — attacking with your ${rankShort[key]} is a gamble.`,
			};
		}
		return { id: "selected:info", tone: "neutral", text: `${rankByKey.get(key)?.name}. ${rankNote[key]}` };
	}

	if (!input.yourTurn) {
		return { id: "turn:waiting", tone: "neutral", text: "Their move. Watch which squares they push toward — that is usually where their strength is." };
	}

	if (input.movesPlayed < 2) {
		return { id: "turn:first", tone: "neutral", text: "Your move. Tap one of your pieces to see where it can go — one square, up, down or sideways." };
	}
	if (input.movesPlayed < 8) {
		return { id: "turn:early", tone: "neutral", text: "Your move. Probing with a cheap piece costs little and tells you a lot." };
	}

	return { id: "turn:your", tone: "neutral", text: "Your move." };
}

/* ---------------------------------------------------------------------------
   What the player has learned so far
--------------------------------------------------------------------------- */

/** Enemy ranks revealed by fights, for the reference panel's "known" column. */
export function revealedEnemyRanks(pieces: PublicPiece[]): RankKey[] {
	const seen = new Set<RankKey>();
	for (const piece of pieces) {
		if (piece.side === "foe" && piece.rank) seen.add(piece.rank);
	}
	return [...seen].sort((a, b) => (rankOrder.get(a) ?? 0) - (rankOrder.get(b) ?? 0));
}

/** How many of each of your ranks are still standing. */
export function remainingByRank(pieces: PublicPiece[], side: "you" | "foe") {
	const counts = new Map<RankKey, number>();
	for (const piece of pieces) {
		if (piece.side !== side || !piece.alive || !piece.rank) continue;
		counts.set(piece.rank, (counts.get(piece.rank) ?? 0) + 1);
	}
	return counts;
}
