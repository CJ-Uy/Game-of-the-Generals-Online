export {};

declare global {
	interface CloudflareEnv {
		GOGO_DB: D1Database;
		GOGO_CACHE?: KVNamespace;
		GOGO_ASSETS?: R2Bucket;
		ROOM_SYNC?: Fetcher;
	}
}
