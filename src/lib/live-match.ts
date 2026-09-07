import type { PlayerSide, RoomState } from "@/lib/game";

/**
 * A match in progress on this device.
 *
 * The `*_MATCH_KEY` entries hold the *starting* loadouts; these hold the live
 * board, so a refresh resumes instead of dealing a new game. Kept out of the
 * room component so the setup screen can offer to resume without importing it.
 */

export type LiveMode = "local" | "bot";

export const LIVE_KEY: Record<LiveMode, string> = {
	local: "gog:local-live:v1",
	bot: "gog:bot-live:v1",
};

export type LiveSnapshot = {
	state: RoomState;
	viewSide: PlayerSide;
	handoff: PlayerSide | null;
	botLevel: string;
};

/** Returns a snapshot only if it is structurally sound; a half-written one is discarded. */
export function readLive(mode: LiveMode): LiveSnapshot | null {
	try {
		const raw = sessionStorage.getItem(LIVE_KEY[mode]);
		if (!raw) return null;

		const saved = JSON.parse(raw) as Partial<LiveSnapshot>;
		const pieces = saved.state?.pieces;
		if (!Array.isArray(pieces) || pieces.length === 0 || !saved.state?.turn) return null;

		return {
			state: saved.state,
			viewSide: saved.viewSide === "slate" ? "slate" : "gold",
			handoff: saved.handoff === "gold" || saved.handoff === "slate" ? saved.handoff : null,
			botLevel: typeof saved.botLevel === "string" ? saved.botLevel : "Sergeant",
		};
	} catch {
		return null;
	}
}

export function writeLive(mode: LiveMode, snapshot: LiveSnapshot) {
	try {
		sessionStorage.setItem(LIVE_KEY[mode], JSON.stringify(snapshot));
	} catch {
		// Storage full or blocked: the match just will not survive a refresh.
	}
}

export function clearLive(mode: LiveMode) {
	try {
		sessionStorage.removeItem(LIVE_KEY[mode]);
	} catch {
		// Non-fatal.
	}
}

/** A short description of an unfinished match, for the resume prompt. */
export function describeLive(mode: LiveMode): { moves: number; label: string } | null {
	const live = readLive(mode);
	if (!live || live.state.outcome) return null;
	return {
		moves: live.state.plies.length,
		label: mode === "bot" ? `Versus the ${live.botLevel} bot` : "Pass and play",
	};
}
