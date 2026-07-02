import { DurableObject } from "cloudflare:workers";

type Env = {
	ROOM_SYNC: DurableObjectNamespace;
	GOGO_DB: D1Database;
};

function roomCodeFromPath(pathname: string) {
	const match = /^\/(?:internal\/)?rooms\/([^/]+)(?:\/broadcast)?$/.exec(pathname);
	return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}

export class RoomSync extends DurableObject<Env> {
	private sockets = new Set<WebSocket>();

	async fetch(request: Request) {
		const url = new URL(request.url);
		const code = roomCodeFromPath(url.pathname);
		if (!code) return new Response("Not found", { status: 404 });

		if (url.pathname.endsWith("/broadcast")) return this.broadcast(code, request);
		if (request.headers.get("Upgrade") !== "websocket") return Response.json({ ok: true });

		const token = url.searchParams.get("token") ?? "";
		const room = await this.env.GOGO_DB.prepare("select host_token, guest_token from game_rooms where code = ?").bind(code).first<{
			host_token: string;
			guest_token: string | null;
		}>();
		if (!room || (token !== room.host_token && token !== room.guest_token)) return new Response("Unauthorized", { status: 401 });

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
		server.accept();
		this.sockets.add(server);
		server.addEventListener("message", (event) => {
			if (event.data === "ping") server.send("pong");
		});
		server.addEventListener("close", () => this.sockets.delete(server));
		server.addEventListener("error", () => this.sockets.delete(server));
		server.send(JSON.stringify({ type: "room.ready", code }));

		return new Response(null, { status: 101, webSocket: client } as ResponseInit & { webSocket: WebSocket });
	}

	private async broadcast(code: string, request: Request) {
		const payload = (await request.json().catch(() => ({}))) as { version?: number };
		const message = JSON.stringify({ type: "room.updated", code, version: payload.version, at: Date.now() });
		let sent = 0;

		for (const socket of [...this.sockets]) {
			try {
				socket.send(message);
				sent++;
			} catch {
				this.sockets.delete(socket);
			}
		}

		return Response.json({ ok: true, sent });
	}
}

export default {
	async fetch(request: Request, env: Env) {
		const code = roomCodeFromPath(new URL(request.url).pathname);
		if (!code) return new Response("Not found", { status: 404 });
		return env.ROOM_SYNC.get(env.ROOM_SYNC.idFromName(code)).fetch(request);
	},
};
