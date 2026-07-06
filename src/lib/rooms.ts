import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { gameRooms } from "@/db/schema";
import { sideFromToken, toPublicRoom, type PlayerSide, type PublicRoom, type RoomState } from "@/lib/game";

export type RoomRow = typeof gameRooms.$inferSelect;

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
	const side = sideFromToken(row.hostToken, row.guestToken, token);
	return side ? toPublicRoom(row.code, row.status, row.version, side, parseState(row)) : null;
}

export function sideFor(row: RoomRow, token: string): PlayerSide | null {
	return sideFromToken(row.hostToken, row.guestToken, token);
}

export function json(data: unknown, status = 200) {
	return Response.json(data, { status });
}
