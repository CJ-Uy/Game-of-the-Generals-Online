CREATE TABLE `game_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`winner` text,
	`move_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `game_rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`host_token` text NOT NULL,
	`guest_token` text,
	`state` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_rooms_code_unique` ON `game_rooms` (`code`);