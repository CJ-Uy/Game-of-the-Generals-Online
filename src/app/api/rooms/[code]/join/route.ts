import { addGuest } from "@/lib/game";
import { findRoom, json, makeToken, parseState, publicRoom, saveRoom } from "@/lib/rooms";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
	const body = (await request.json().catch(() => null)) as { loadout?: unknown } | null;
	const { code } = await params;
	const room = await findRoom(code);
	if (!room) return json({ error: "Room not found." }, 404);
	if (room.status !== "waiting" || room.guestToken) return json({ error: "Room already has two commanders." }, 409);

	const state = addGuest(parseState(room), body?.loadout);
	if (!state) return json({ error: "Deploy all 21 pieces before joining." }, 400);

	const guestToken = makeToken();
	const updated = await saveRoom({ ...room, guestToken }, state, "active");
	if (!updated) return json({ error: "Could not join room." }, 409);
	return json({ token: guestToken, room: publicRoom({ ...updated, guestToken }, guestToken) });
}
