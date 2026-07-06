import { addMessage, applyMove, resign } from "@/lib/game";
import { findRoom, json, parseState, publicRoom, saveRoom, sideFor } from "@/lib/rooms";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
	const token = new URL(request.url).searchParams.get("token") ?? "";
	const { code } = await params;
	const room = await findRoom(code);
	if (!room) return json({ error: "Room not found." }, 404);

	const payload = publicRoom(room, token);
	return payload ? json(payload) : json({ error: "Invalid room token." }, 401);
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
	const body = (await request.json().catch(() => null)) as
		| { token?: string; action?: "move"; pieceId?: number; col?: number; row?: number; version?: number }
		| { token?: string; action?: "chat"; text?: string }
		| { token?: string; action?: "resign" }
		| null;
	const { code } = await params;
	const room = await findRoom(code);
	if (!room) return json({ error: "Room not found." }, 404);

	const token = body?.token ?? "";
	const side = sideFor(room, token);
	if (!side) return json({ error: "Invalid room token." }, 401);
	if (body?.action === "move" && body.version !== room.version) {
		return json({ error: "Board changed. Synced latest room.", room: publicRoom(room, token) }, 409);
	}

	try {
		const state = parseState(room);
		const next =
			body?.action === "move"
				? applyMove(state, side, Number(body.pieceId), Number(body.col), Number(body.row))
				: body?.action === "chat"
					? addMessage(state, side, String(body.text ?? ""))
					: body?.action === "resign"
						? resign(state, side)
						: null;

		if (!next) return json({ error: "Unknown room action." }, 400);
		const updated = await saveRoom(room, next, next.outcome ? "finished" : room.status);
		if (updated) return json(publicRoom(updated, token));
		const latest = await findRoom(code);
		return json({ error: "Room changed. Synced latest room.", room: latest ? publicRoom(latest, token) : null }, 409);
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : "Move rejected." }, 400);
	}
}
