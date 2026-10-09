import assert from "node:assert/strict";
import { fullLoadout } from "./full-loadout.mjs";

const baseUrl = (process.env.GOGO_E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function api(path, body) {
	const response = await fetch(`${baseUrl}${path}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	const payload = await response.json();
	return { response, payload };
}

const created = await api("/api/rooms", { loadout: fullLoadout });
assert.equal(created.response.status, 200, JSON.stringify(created.payload));
assert.match(created.payload.room.code, /^[A-Z]{4}$/);

const code = created.payload.room.code;
const joined = await api(`/api/rooms/${code}/join`, { loadout: fullLoadout });
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
