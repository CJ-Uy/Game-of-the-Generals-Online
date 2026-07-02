import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const gameRooms = sqliteTable("game_rooms", {
	id: text("id").primaryKey(),
	code: text("code").notNull().unique(),
	status: text("status", { enum: ["waiting", "active", "finished"] }).notNull().default("waiting"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const gameMatches = sqliteTable("game_matches", {
	id: text("id").primaryKey(),
	roomId: text("room_id")
		.notNull()
		.references(() => gameRooms.id),
	winner: text("winner", { enum: ["gold", "slate", "draw"] }),
	moveCount: integer("move_count").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
