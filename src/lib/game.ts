export const COLS = 9;
export const ROWS = 8;
export const FILES = "abcdefghi";
export const GUEST_LOADOUT_KEY = "gog:guest-loadout:v1";

export const ranks = [
	{ key: "G5", glyph: "★★★★★", name: "5-Star General", count: 1 },
	{ key: "G4", glyph: "★★★★", name: "4-Star General", count: 1 },
	{ key: "G3", glyph: "★★★", name: "3-Star General", count: 1 },
	{ key: "G2", glyph: "★★", name: "2-Star General", count: 1 },
	{ key: "G1", glyph: "★", name: "1-Star General", count: 1 },
	{ key: "COL", glyph: "▲▲▲", name: "Colonel", count: 1 },
	{ key: "LTC", glyph: "▲▲", name: "Lt. Colonel", count: 1 },
	{ key: "MAJ", glyph: "▲", name: "Major", count: 1 },
	{ key: "CPT", glyph: "◆◆◆", name: "Captain", count: 1 },
	{ key: "LT1", glyph: "◆◆", name: "1st Lieutenant", count: 1 },
	{ key: "LT2", glyph: "◆", name: "2nd Lieutenant", count: 1 },
	{ key: "SGT", glyph: "∧∧∧", name: "Sergeant", count: 1 },
	{ key: "PVT", glyph: "∧", name: "Private", count: 6 },
	{ key: "SPY", glyph: "◉", name: "Spy", count: 2 },
	{ key: "FLG", glyph: "⚑", name: "Flag", count: 1 },
] as const;

export type RankKey = (typeof ranks)[number]["key"];
export type PlayerSide = "gold" | "slate";
export type RoomStatus = "waiting" | "active" | "finished";
export type Outcome = { winner: PlayerSide | "draw"; note: string };

export type GamePiece = {
	id: number;
	owner: PlayerSide;
	rank: RankKey;
	col: number;
	row: number;
	alive: boolean;
};

export type RoomMessage = {
	id: number;
	who: PlayerSide | "sys";
	text: string;
	at: number;
};

export type RoomState = {
	hostSide?: PlayerSide;
	pieces: GamePiece[];
	turn: PlayerSide;
	plies: string[];
	messages: RoomMessage[];
	nextMessageId: number;
	outcome: Outcome | null;
};

export type PublicPiece = Omit<GamePiece, "rank" | "owner"> & {
	side: "you" | "foe";
	rank?: RankKey;
};

export type PublicRoom = {
	code: string;
	status: RoomStatus;
	side: PlayerSide;
	version: number;
	state: Omit<RoomState, "pieces"> & { pieces: PublicPiece[] };
};

export type LegalMove = {
	pieceId: number;
	col: number;
	row: number;
	target?: GamePiece;
};

const rankSet = new Set(ranks.map((rank) => rank.key));
const army = ranks.flatMap((rank) => Array.from({ length: rank.count }, () => rank.key));
const rankNumbers: Partial<Record<RankKey, number>> = {
	G5: 15,
	G4: 14,
	G3: 13,
	G2: 12,
	G1: 11,
	COL: 10,
	LTC: 9,
	MAJ: 8,
	CPT: 7,
	LT1: 6,
	LT2: 5,
	SGT: 4,
	PVT: 3,
};

export function makeRandomLoadout(): Record<number, string> {
	const cells = Array.from({ length: 27 }, (_, index) => index);
	const pieces = army.map((rank, index) => `${rank}-${index}`);
	for (let i = cells.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[cells[i], cells[j]] = [cells[j], cells[i]];
	}
	for (let i = pieces.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[pieces[i], pieces[j]] = [pieces[j], pieces[i]];
	}
	return Object.fromEntries(pieces.map((piece, index) => [cells[index], piece]));
}

export function oppositeSide(side: PlayerSide): PlayerSide {
	return side === "gold" ? "slate" : "gold";
}

export function sideFromToken(hostToken: string, guestToken: string | null, token: string, hostSide: PlayerSide = "gold"): PlayerSide | null {
	if (token === hostToken) return hostSide;
	if (guestToken && token === guestToken) return oppositeSide(hostSide);
	return null;
}

export function square(col: number, row: number) {
	return `${FILES[col]}${ROWS - row}`;
}

export function battleLosers(attacker: RankKey, defender: RankKey): ("att" | "def")[] {
	if (attacker === "FLG") return defender === "FLG" ? ["def"] : ["att"];
	if (defender === "FLG") return ["def"];
	if (attacker === defender) return ["att", "def"];
	if (attacker === "SPY") return defender === "PVT" ? ["att"] : ["def"];
	if (defender === "SPY") return attacker === "PVT" ? ["def"] : ["att"];
	return (rankNumbers[attacker] ?? 0) > (rankNumbers[defender] ?? 0) ? ["def"] : ["att"];
}

export function parseLoadout(input: unknown): { rank: RankKey; col: number; row: number }[] | null {
	if (!input || typeof input !== "object" || Array.isArray(input)) return null;

	const counts = new Map<RankKey, number>();
	const pieces: { rank: RankKey; col: number; row: number }[] = [];

	for (const [zoneKey, uid] of Object.entries(input)) {
		const zone = Number(zoneKey);
		const rank = typeof uid === "string" ? uid.split("-")[0] : "";
		if (!Number.isInteger(zone) || zone < 0 || zone >= 27 || !rankSet.has(rank as RankKey)) return null;
		const key = rank as RankKey;
		counts.set(key, (counts.get(key) ?? 0) + 1);
		pieces.push({ rank: key, col: zone % COLS, row: Math.floor(zone / COLS) });
	}

	if (pieces.length !== army.length) return null;
	for (const rank of ranks) if ((counts.get(rank.key) ?? 0) !== rank.count) return null;
	return pieces;
}

export function makeSidePieces(side: PlayerSide, input: unknown, offset = side === "gold" ? 0 : army.length): GamePiece[] | null {
	const loadout = parseLoadout(input);
	if (!loadout) return null;

	return loadout.map((piece, index) => ({
		id: offset + index,
		owner: side,
		rank: piece.rank,
		col: piece.col,
		row: side === "gold" ? 5 + piece.row : 2 - piece.row,
		alive: true,
	}));
}

export function makeWaitingState(hostLoadout: unknown, hostSide: PlayerSide = "gold"): RoomState | null {
	const pieces = makeSidePieces(hostSide, hostLoadout);
	if (!pieces) return null;
	return {
		hostSide,
		pieces,
		turn: "gold",
		plies: [],
		messages: [{ id: 1, who: "sys", text: "Lobby created. Waiting for the second commander.", at: Date.now() }],
		nextMessageId: 2,
		outcome: null,
	};
}

export function addGuest(state: RoomState, guestLoadout: unknown): RoomState | null {
	const guestSide = oppositeSide(state.hostSide ?? "gold");
	if (state.pieces.some((piece) => piece.owner === guestSide)) return null;
	const pieces = makeSidePieces(guestSide, guestLoadout);
	if (!pieces) return null;
	return addMessage({ ...state, pieces: [...state.pieces, ...pieces] }, "sys", "Both armies are deployed. Gold moves first.");
}

export function addMessage(state: RoomState, who: RoomMessage["who"], text: string): RoomState {
	return {
		...state,
		messages: [...state.messages.slice(-80), { id: state.nextMessageId, who, text: text.slice(0, 200), at: Date.now() }],
		nextMessageId: state.nextMessageId + 1,
	};
}

export function applyMove(state: RoomState, side: PlayerSide, pieceId: number, col: number, row: number): RoomState {
	if (state.outcome) throw new Error("Game is finished.");
	if (state.turn !== side) throw new Error("It is not your turn.");
	if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || col >= COLS || row < 0 || row >= ROWS) {
		throw new Error("That square is outside the board.");
	}

	const attacker = state.pieces.find((piece) => piece.id === pieceId && piece.alive);
	if (!attacker || attacker.owner !== side) throw new Error("Choose one of your live pieces.");
	if (Math.abs(attacker.col - col) + Math.abs(attacker.row - row) !== 1) throw new Error("Pieces move one square orthogonally.");

	const target = state.pieces.find((piece) => piece.alive && piece.col === col && piece.row === row);
	if (target?.owner === side) throw new Error("That square is occupied by your own piece.");

	const losers = target ? battleLosers(attacker.rank, target.rank) : [];
	const dead = new Set<number>();
	if (losers.includes("att")) dead.add(attacker.id);
	if (target && losers.includes("def")) dead.add(target.id);

	const pieces = state.pieces.map((piece) => {
		if (dead.has(piece.id)) return { ...piece, alive: false };
		if (piece.id === attacker.id && !dead.has(attacker.id)) return { ...piece, col, row };
		return piece;
	});

	const next: RoomState = {
		...state,
		pieces,
		turn: side === "gold" ? "slate" : "gold",
		plies: [...state.plies, `${side === "gold" ? "G" : "S"} ${square(attacker.col, attacker.row)}${target ? "x" : "-"}${square(col, row)}`],
	};

	const outcome = getOutcome(pieces);
	return outcome ? addMessage({ ...next, outcome }, "sys", outcome.note) : next;
}

export function legalMoves(state: RoomState, side: PlayerSide): LegalMove[] {
	const moves: LegalMove[] = [];
	for (const piece of state.pieces) {
		if (!piece.alive || piece.owner !== side) continue;
		for (const [dc, dr] of [
			[0, 1],
			[1, 0],
			[-1, 0],
			[0, -1],
		]) {
			const col = piece.col + dc;
			const row = piece.row + dr;
			if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
			const target = state.pieces.find((item) => item.alive && item.col === col && item.row === row);
			if (target?.owner === side) continue;
			moves.push({ pieceId: piece.id, col, row, target });
		}
	}
	return moves;
}

export function chooseBotMove(state: RoomState, side: PlayerSide, difficulty: string): LegalMove | null {
	const moves = legalMoves(state, side);
	if (!moves.length) return null;
	if (difficulty === "Private" || difficulty === "Spy") return sample(moves);

	const scored = moves.map((move) => {
		const piece = state.pieces.find((item) => item.id === move.pieceId);
		let score = Math.random();
		if (move.target && piece) {
			const losers = battleLosers(piece.rank, move.target.rank);
			score += losers.includes("def") ? 8 : 0;
			score -= losers.includes("att") ? 6 : 0;
			if (move.target.rank === "FLG") score += 100;
		}
		if (piece?.rank === "FLG") score += side === "slate" ? move.row * 0.6 : (ROWS - 1 - move.row) * 0.6;
		if (difficulty === "Sergeant") score += move.target ? 4 : 0;
		if (difficulty === "Captain") score += piece?.rank === "PVT" ? 1.5 : 0;
		if (difficulty === "Colonel" || difficulty === "General") score += centerScore(move.col);
		if (difficulty === "General" && piece?.rank === "SPY" && move.target) score += 3;
		return { move, score };
	});

	scored.sort((a, b) => b.score - a.score);
	return difficulty === "Sergeant" ? sample(scored.slice(0, Math.min(6, scored.length))).move : scored[0].move;
}

export function resign(state: RoomState, side: PlayerSide): RoomState {
	const winner = side === "gold" ? "slate" : "gold";
	return addMessage({ ...state, outcome: { winner, note: `${label(side)} surrendered.` } }, "sys", `${label(side)} surrendered.`);
}

export function toPublicRoom(code: string, status: RoomStatus, version: number, side: PlayerSide, state: RoomState): PublicRoom {
	return {
		code,
		status,
		side,
		version,
		state: {
			...state,
			pieces: state.pieces.map(({ rank, owner, ...piece }) => ({
				...piece,
				side: owner === side ? "you" : "foe",
				rank: owner === side || state.outcome ? rank : undefined,
			})),
		},
	};
}

function getOutcome(pieces: GamePiece[]): Outcome | null {
	const goldFlag = pieces.find((piece) => piece.owner === "gold" && piece.rank === "FLG");
	const slateFlag = pieces.find((piece) => piece.owner === "slate" && piece.rank === "FLG");
	if (goldFlag && !goldFlag.alive) return { winner: "slate", note: "Gold flag has fallen." };
	if (slateFlag && !slateFlag.alive) return { winner: "gold", note: "Slate flag has fallen." };
	if (goldFlag?.alive && goldFlag.row === 0) return { winner: "gold", note: "Gold flag reached the enemy line." };
	if (slateFlag?.alive && slateFlag.row === ROWS - 1) return { winner: "slate", note: "Slate flag reached the enemy line." };
	return null;
}

function label(side: PlayerSide) {
	return side === "gold" ? "Gold" : "Slate";
}

function sample<T>(items: T[]) {
	return items[Math.floor(Math.random() * items.length)];
}

function centerScore(col: number) {
	return 4 - Math.abs(4 - col);
}
