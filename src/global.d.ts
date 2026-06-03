/// <reference types="@sveltejs/kit" />
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	// interface Error {}
	// interface Locals {}
	// interface PageData {}
	interface Platform {
		env?: {
			GH_TOKEN?: string;
			GH_WEBHOOK_SECRET?: string;
			CF_VERSION_METADATA?: {
				id: string;
				tag?: string;
				timestamp: string;
			};
			CONTENT_MANIFEST?: {
				get(key: string): Promise<string | null>;
				put(key: string, value: string): Promise<void>;
			};
		};
		context?: {
			waitUntil(promise: Promise<unknown>): void;
		};
		caches?: CacheStorage & { default: Cache };
	}
}
