/// <reference types="@sveltejs/kit" />
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
interface R2Bucket {
	get(key: string): Promise<R2ObjectBody | null>;
	head(key: string): Promise<R2Object | null>;
	put(
		key: string,
		value: ArrayBuffer | string,
		options?: {
			httpMetadata?: {
				contentType?: string;
				cacheControl?: string;
			};
			customMetadata?: Record<string, string>;
			onlyIf?: {
				etagMatches?: string;
			};
		}
	): Promise<R2Object | null>;
	createMultipartUpload(
		key: string,
		options?: {
			httpMetadata?: {
				contentType?: string;
				cacheControl?: string;
			};
			customMetadata?: Record<string, string>;
		}
	): Promise<R2MultipartUpload>;
	resumeMultipartUpload(key: string, uploadId: string): R2MultipartUpload;
}

interface R2Object {
	etag: string;
	httpEtag?: string;
	size?: number;
}

interface R2ObjectBody extends R2Object {
	body: ReadableStream;
	text(): Promise<string>;
	writeHttpMetadata(headers: Headers): void;
}

interface R2UploadedPart {
	partNumber: number;
	etag: string;
}

interface R2MultipartUpload {
	key: string;
	uploadId: string;
	uploadPart(partNumber: number, value: ArrayBuffer): Promise<R2UploadedPart>;
	complete(parts: R2UploadedPart[]): Promise<R2Object>;
	abort(): Promise<void>;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = Record<string, unknown>>(): Promise<T | null>;
	all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface RateLimit {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface DurableObjectId {}

interface DurableObjectStub {
	fetch(request: Request): Promise<Response>;
}

interface DurableObjectNamespace {
	idFromName(name: string): DurableObjectId;
	get(id: DurableObjectId): DurableObjectStub;
}

declare namespace App {
	// interface Error {}
	// interface Locals {}
	// interface PageData {}
	interface Platform {
		env?: {
			GA4_MEASUREMENT_ID?: string;
			GA4_API_SECRET?: string;
			GH_TOKEN?: string;
			GH_WEBHOOK_SECRET?: string;
			PODCAST_ADMIN_PASSWORD?: string;
			PODCAST_ADMIN_SESSION_SECRET?: string;
			RECLIP_URL?: string;
			CF_VERSION_METADATA?: {
				id: string;
				tag?: string;
				timestamp: string;
			};
			CONTENT_MANIFEST?: {
				get(key: string): Promise<string | null>;
				put(key: string, value: string): Promise<void>;
			};
			READ_COUNTERS?: D1Database;
			READ_IP_RATE_LIMITER?: RateLimit;
			READ_SESSION_RATE_LIMITER?: RateLimit;
			PRESENCE_ROOMS?: DurableObjectNamespace;
			PRESENCE_ENABLED?: string;
			PUBLIC_PRESENCE_ADMISSION_RATE?: string;
			PODCAST_MEDIA?: R2Bucket;
		};
		context?: {
			waitUntil(promise: Promise<unknown>): void;
		};
		caches?: CacheStorage & { default: Cache };
	}
}
