import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fullLoadout } from "./full-loadout.mjs";

// Needs `pnpm dev` running against the migrated local D1 (see CLAUDE.md) — the
// dev server and `wrangler d1 execute --local` share .wrangler/state.
const baseUrl = (process.env.GOGO_E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
// Spawn wrangler's entrypoint with node directly: `npx` is a .cmd on Windows,
// which execFileSync refuses to run, and a shell would mangle the SQL quoting.
const wrangler = join(dirname(createRequire(import.meta.url).resolve("wrangler/package.json")), "bin", "wrangler.js");

// makeCode() never emits I or O, so neither probe can collide with a real room.
const staleCode = "ZZIO";
const freshCode = "ZZOI";
const day = 24 * 60 * 60;

function sql(command) {
	const out = execFileSync(process.execPath, [wrangler, "d1", "execute", "gogo-db", "--local", "--json", "--command", command], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "inherit"],
	});
	const start = out.indexOf("[");
	assert.notEqual(start, -1, `wrangler printed no JSON:\n${out}`);
	return JSON.parse(out.slice(start)).flatMap((result) => result.results ?? []);
}

// updatedAt is drizzle `mode: "timestamp"`, which stores whole seconds.
function probe(code, ageSeconds) {
	const at = `CAST(strftime('%s','now') AS INTEGER) - ${ageSeconds}`;
	return `('${randomUUID()}', '${code}', 'active', 'reaper-check', '{}', 0, ${at}, ${at})`;
}

const columns = "(id, code, status, host_token, state, version, created_at, updated_at)";
sql(`delete from game_rooms where code in ('${staleCode}', '${freshCode}')`);
sql(`insert into game_rooms ${columns} values ${probe(staleCode, 2 * day)}, ${probe(freshCode, 60)}`);

// Creating a room is what triggers the reap.
const response = await fetch(`${baseUrl}/api/rooms`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ loadout: fullLoadout }),
});
const payload = await response.json();
assert.equal(response.status, 200, JSON.stringify(payload));

const survivors = sql(`select code from game_rooms where code in ('${staleCode}', '${freshCode}')`).map((row) => row.code);
assert.ok(!survivors.includes(staleCode), `stale room ${staleCode} survived the reaper`);
assert.ok(survivors.includes(freshCode), `fresh room ${freshCode} was reaped`);

sql(`delete from game_rooms where code in ('${staleCode}', '${freshCode}', '${payload.room.code}')`);
console.log(`room reaper ok: dropped ${staleCode}, kept ${freshCode}`);
