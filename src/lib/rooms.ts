import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { gameRooms } from "@/db/schema";
import { sideFromToken, toPublicRoom, type PlayerSide, type PublicRoom, type RoomState } from "@/lib/game";

export type RoomRow = typeof gameRooms.$inferSelect;
type RoomDb = Awaited<ReturnType<typeof getRoomBindings>>["db"];

export async function getRoomBindings() {
	const { env } = await getCloudflareContext({ async: true });
	return { env, db: drizzle(env.GOGO_DB) };
}

export function makeCode() {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
	return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function makeToken() {
	const bytes = new Uint8Array(18);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function parseState(row: RoomRow): RoomState {
	return row.state as RoomState;
}

export async function findRoom(code: string) {
	const { db } = await getRoomBindings();
	const [room] = await db.select().from(gameRooms).where(eq(gameRooms.code, code.toUpperCase())).limit(1);
	return room ?? null;
}

export async function saveRoom(row: RoomRow, state: RoomState, status = row.status) {
	const { env, db } = await getRoomBindings();
	const [updated] = await db
		.update(gameRooms)
		.set({ guestToken: row.guestToken, state, status, version: row.version + 1, updatedAt: new Date() })
		.where(and(eq(gameRooms.id, row.id), eq(gameRooms.version, row.version)))
		.returning();
	if (updated) {
		await env.ROOM_SYNC?.fetch(`https://room-sync/internal/rooms/${encodeURIComponent(updated.code)}/broadcast`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ version: updated.version }),
		}).catch(() => undefined);
	}
	return updated ?? null;
}

export function publicRoom(row: RoomRow, token: string): PublicRoom | null {
	const state = parseState(row);
	const side = sideFromToken(row.hostToken, row.guestToken, token, state.hostSide ?? "gold");
	return side ? toPublicRoom(row.code, row.status, row.version, side, state) : null;
}

export function sideFor(row: RoomRow, token: string): PlayerSide | null {
	const state = parseState(row);
	return sideFromToken(row.hostToken, row.guestToken, token, state.hostSide ?? "gold");
}

// Every move, chat, join, resign and rematch bumps updatedAt, so this is total
// inactivity, not match age: a slow correspondence game survives, an abandoned
// room does not. Without it, every room ever opened lives in D1 forever.
export const staleRoomMs = 24 * 60 * 60 * 1000;

// ponytail: reaped on the room-create path instead of a Cron Trigger, because
// rooms can only pile up while rooms are being created, and because the only
// worker with a hand-written entrypoint (gogo-room-sync) ships on `pnpm
// deploy:sync`, not on push, so a cron there would silently never deploy.
// Move it to a cron if rooms ever need reaping without traffic.
export async function reapStaleRooms(db: RoomDb, now = Date.now()) {
	const reaped = await db
		.delete(gameRooms)
		.where(lt(gameRooms.updatedAt, new Date(now - staleRoomMs)))
		.returning({ code: gameRooms.code });
	return reaped.length;
}

export function json(data: unknown, status = 200) {
	return Response.json(data, { status });
}
