/**
 * Guest identity.
 *
 * No sign-in: a callsign lives in localStorage and travels with the room
 * payload. It exists so the rails can say "Iron Colonel" instead of
 * "Opponent" — which is most of the difference between a demo and a game —
 * without asking anyone to make an account.
 */

export const CALLSIGN_KEY = "gog:callsign:v1";
export const MAX_CALLSIGN = 18;

const ADJECTIVES = [
	"Iron",
	"Quiet",
	"Swift",
	"Steady",
	"Hidden",
	"Patient",
	"Restless",
	"Blunt",
	"Careful",
	"Bold",
	"Silent",
	"Stubborn",
];

const NOUNS = ["Colonel", "Sergeant", "Major", "Captain", "General", "Scout", "Sentry", "Marshal", "Adjutant", "Lieutenant"];

/**
 * Trims to something safe to render and to store. Runs on both sides: the
 * client for the input field, the server because a room payload is a trust
 * boundary and nothing stops a hand-rolled POST.
 */
export function cleanCallsign(input: unknown): string {
	if (typeof input !== "string") return "";
	return input
		.replace(/[\p{C}]/gu, "") // control chars, including zero-width and direction overrides
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, MAX_CALLSIGN);
}

export function randomCallsign(): string {
	const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];
	return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}

/** Reads the stored callsign, minting and persisting one on first run. */
export function loadCallsign(): string {
	try {
		const stored = cleanCallsign(window.localStorage.getItem(CALLSIGN_KEY));
		if (stored) return stored;
		const minted = randomCallsign();
		window.localStorage.setItem(CALLSIGN_KEY, minted);
		return minted;
	} catch {
		// Blocked storage: a per-session name is still better than "Opponent".
		return randomCallsign();
	}
}

export function saveCallsign(name: string): string {
	const clean = cleanCallsign(name) || randomCallsign();
	try {
		window.localStorage.setItem(CALLSIGN_KEY, clean);
	} catch {
		// Non-fatal; the name just will not survive a reload.
	}
	return clean;
}
