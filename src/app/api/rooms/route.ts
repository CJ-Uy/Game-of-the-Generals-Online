import { gameRooms } from "@/db/schema";
import { makeCode, makeToken, getRoomBindings, json, publicRoom } from "@/lib/rooms";
import { makeWaitingState } from "@/lib/game";

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as { loadout?: unknown } | null;
	const state = makeWaitingState(body?.loadout);
	if (!state) return json({ error: "Deploy all 21 pieces before creating a room." }, 400);

	const { db } = await getRoomBindings();
	const hostToken = makeToken();
	const now = new Date();

	for (let attempt = 0; attempt < 5; attempt++) {
		const code = makeCode();
		try {
			const [room] = await db
				.insert(gameRooms)
				.values({ id: crypto.randomUUID(), code, hostToken, state, createdAt: now, updatedAt: now })
				.returning();
			return json({ token: hostToken, room: publicRoom(room, hostToken) });
		} catch (error) {
			if (!String(error).toLowerCase().includes("unique")) {
				return json({ error: error instanceof Error ? error.message : "Could not create room." }, 500);
			}
			// ponytail: retry handles rare room-code collisions; widen codes if rooms get busy.
		}
	}

	return json({ error: "Could not create a unique room code." }, 500);
}
