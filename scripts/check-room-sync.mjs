import assert from "node:assert/strict";

const baseUrl = (process.env.GOGO_E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const loadout = {
	0: "G5-0",
	1: "G4-0",
	2: "G3-0",
	3: "G2-0",
	4: "G1-0",
	5: "COL-0",
	6: "LTC-0",
	7: "MAJ-0",
	8: "CPT-0",
	9: "LT1-0",
	10: "LT2-0",
	11: "SGT-0",
	12: "PVT-0",
	13: "PVT-1",
	14: "PVT-2",
	15: "PVT-3",
	16: "PVT-4",
	17: "PVT-5",
	18: "SPY-0",
	19: "SPY-1",
	20: "FLG-0",
};

async function api(path, body) {
	const response = await fetch(`${baseUrl}${path}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	const payload = await response.json();
	return { response, payload };
}

const created = await api("/api/rooms", { loadout });
assert.equal(created.response.status, 200, JSON.stringify(created.payload));
assert.match(created.payload.room.code, /^[A-Z]{4}$/);

const code = created.payload.room.code;
const joined = await api(`/api/rooms/${code}/join`, { loadout });
assert.equal(joined.response.status, 200, JSON.stringify(joined.payload));
assert.equal(joined.payload.room.status, "active");
assert.match(created.payload.room.side, /^(gold|slate)$/);

const goldToken = created.payload.room.side === "gold" ? created.payload.token : joined.payload.token;
const firstVersion = joined.payload.room.version;
const moved = await api(`/api/rooms/${code}`, {
	token: goldToken,
	action: "move",
	pieceId: 0,
	col: 0,
	row: 4,
	version: firstVersion,
});
assert.equal(moved.response.status, 200, JSON.stringify(moved.payload));
assert.equal(moved.payload.version, firstVersion + 1);
assert.equal(moved.payload.state.plies.at(-1), "G a3-a4");

const stale = await api(`/api/rooms/${code}`, {
	token: goldToken,
	action: "move",
	pieceId: 0,
	col: 0,
	row: 3,
	version: firstVersion,
});
assert.equal(stale.response.status, 409, JSON.stringify(stale.payload));
assert.equal(stale.payload.room.version, moved.payload.version);
console.log(`room sync ok: ${code}`);
