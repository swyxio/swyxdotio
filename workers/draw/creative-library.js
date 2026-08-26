/** Account-local creative metadata. Authentication and binary I/O live in the server boundary. */
export const CREATIVE_RECORD_KINDS = [
	'kits',
	'briefs',
	'compositions',
	'feedback',
	'channels',
	'saved'
];
export const CREATIVE_LIMITS = Object.freeze({
	assetBytes: 8 * 1024 * 1024,
	fontBytes: 2 * 1024 * 1024,
	assetCount: 100,
	storageBytes: 100 * 1024 * 1024,
	metadataBytes: 8 * 1024 * 1024,
	requestBytes: 1_800_000,
	briefBytes: 1_799_000,
	recordBytes: 200_000,
	kitRevisions: 100,
	records: { kits: 25, briefs: 100, compositions: 500, feedback: 1000, channels: 25, saved: 250 }
});
export const CREATIVE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
const bytes = (/** @type {string} */ value) => encoder.encode(value).byteLength;
const object = (/** @type {any} */ value) =>
	value && typeof value === 'object' && !Array.isArray(value);
const text =
	(max = 200, min = 0) =>
	(/** @type {any} */ value) =>
		typeof value === 'string' && value.length >= min && value.length <= max;
const number =
	(min = 0, max = 1_000_000) =>
	(/** @type {any} */ value) =>
		typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const choice = (/** @type {any[]} */ values) => (/** @type {any} */ value) =>
	values.includes(value);
const list =
	(/** @type {(value:any)=>boolean} */ check, max = 100) =>
	(/** @type {any} */ value) =>
		Array.isArray(value) && value.length <= max && value.every(check);
const id = (/** @type {any} */ value) => typeof value === 'string' && CREATIVE_ID.test(value);
const positiveInteger = (/** @type {any} */ value) => Number.isSafeInteger(value) && value > 0;
const optionalId = (/** @type {any} */ value) => value === null || value === '' || id(value);
const color = (/** @type {any} */ value) =>
	typeof value === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value);
const nullable = (/** @type {(value:any)=>boolean} */ check) => (/** @type {any} */ value) =>
	value === null || check(value);
const httpsUrl = (/** @type {any} */ value) => {
	if (typeof value !== 'string' || value.length > 2048) return false;
	if (value === '') return true;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && !url.username && !url.password;
	} catch {
		return false;
	}
};
/** Strict, named-field validation; no arbitrary JSON payloads or client ownership fields. */
const shape =
	(
		/** @type {Record<string,(value:any)=>boolean>} */ fields,
		/** @type {string[]} */ required = []
	) =>
	(/** @type {any} */ value) =>
		Boolean(
			object(value) &&
			required.every((key) => key in value) &&
			Object.entries(value).every(
				([key, field]) => Object.hasOwn(fields, key) && fields[key](field)
			)
		);
const brand = choice(['generic', 'aie', 'ls', 'fde']);
const font = (/** @type {any} */ value) =>
	Number.isInteger(value) && [1, 2, 3, 5, 6, 7, 8].includes(value);
const quote = shape(
	{
		id: text(120, 1),
		text: text(8000, 1),
		segmentId: text(120, 1),
		startOffset: number(),
		endOffset: number(),
		startMs: nullable(number(0, 1e10)),
		endMs: nullable(number(0, 1e10)),
		speaker: nullable(text(200)),
		provenance: choice(['source-exact']),
		reviewRequired: choice([true])
	},
	['id', 'text', 'startOffset', 'endOffset', 'provenance', 'reviewRequired']
);
const title = shape(
	{
		id: text(120, 1),
		title: text(300, 1),
		hook: text(120, 1),
		evidenceIds: list(text(120, 1)),
		provenance: choice(['generated']),
		reviewRequired: choice([true])
	},
	['id', 'title', 'hook', 'evidenceIds', 'provenance', 'reviewRequired']
);
const chunk = shape(
	{
		index: number(),
		startOffset: number(),
		endOffset: number(),
		status: choice(['pending', 'succeeded', 'failed']),
		error: text(2000)
	},
	['index', 'startOffset', 'endOffset', 'status']
);
const recipeAsset = shape(
	{
		id: text(120, 1),
		name: text(200),
		assetId: optionalId,
		width: number(1, 20000),
		height: number(1, 20000),
		role: choice(['brand', 'company'])
	},
	['id']
);
const recipe = shape(
	{
		format: choice(['youtube', 'social', 'square', 'portrait', 'story', 'slide']),
		direction: choice(['editorial', 'portrait-led', 'split', 'headline-led']),
		headline: text(300),
		people: list(recipeAsset, 20),
		logos: list(recipeAsset, 20),
		kit: shape({ brand, background: color, foreground: color, accent: color, fontFamily: font })
	},
	['format', 'direction', 'headline']
);
const generationSettings = (/** @type {any} */ value) =>
	Boolean(
		object(value) &&
		Object.keys(value).length <= 30 &&
		bytes(JSON.stringify(value)) <= 2048 &&
		Object.entries(value).every(
			([key, setting]) =>
				/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key) &&
				(typeof setting === 'boolean' ||
					(typeof setting === 'number' && Number.isFinite(setting)) ||
					(typeof setting === 'string' &&
						setting.length <= 200 &&
						!/data:|https?:\/\//i.test(setting)))
		)
	);
const generation = shape(
	{
		id: text(200, 1),
		prompt: text(40000),
		modelId: text(200),
		adapterId: text(200),
		modelSettings: generationSettings,
		modelEndpoint: text(200),
		modelProvider: text(100),
		modelKind: choice(['image', 'video']),
		modelWorkflow: text(100),
		modelLabel: text(200),
		createdAt: text(40),
		mimeType: choice(['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']),
		recipeId: text(200),
		runId: text(200),
		jobId: text(200),
		batchId: text(200),
		elapsedMs: number(0, 1e10),
		estimatedUsd: number(0, 1e6),
		assetId: optionalId,
		referenceImages: list(
			shape(
				{
					assetId: id,
					mimeType: choice(['image/png', 'image/jpeg', 'image/webp']),
					generationId: text(200, 1)
				},
				['assetId', 'mimeType']
			),
			20
		),
		parentGenerationId: text(200, 1),
		context: shape({
			briefId: optionalId,
			briefRevision: positiveInteger,
			houseKitId: optionalId,
			houseRevision: positiveInteger,
			directionId: text(120),
			feedbackIds: list(id),
			referenceAssetIds: list(id),
			parentResultIds: list(text(200, 1))
		})
	},
	['id', 'prompt', 'modelId']
);
const schemas = {
	kits: shape(
		{
			name: text(120, 1),
			brand,
			prompt: text(30000),
			colors: shape({ background: color, foreground: color, accent: color }),
			fontFamily: font,
			fontNotes: text(4000),
			assetIds: list(id),
			referenceIds: list(id),
			negativeReferenceIds: list(id),
			rules: list(text(1000), 30)
		},
		['name']
	),
	briefs: shape(
		{
			name: text(120, 1),
			kitId: optionalId,
			kitRevision: positiveInteger,
			title: text(500),
			hook: text(300),
			hints: text(20000),
			transcript: text(500000),
			sourceUrl: httpsUrl,
			channelId: optionalId,
			peopleAssetIds: list(id, 20),
			logoAssetIds: list(id, 20),
			referenceAssetIds: list(id),
			analysis: shape({
				quotes: list(quote, 1500),
				titles: list(title, 100),
				chunks: list(chunk, 1000),
				sourceFingerprint: (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value),
				selectedQuoteIds: list(text(120, 1), 80)
			})
		},
		['name']
	),
	compositions: shape(
		{
			name: text(120),
			briefId: id,
			briefRevision: positiveInteger,
			kitId: optionalId,
			kitRevision: positiveInteger,
			direction: choice(['editorial', 'portrait-led', 'split', 'headline-led']),
			headline: text(300),
			prompt: text(40000),
			modelId: text(200),
			settings: shape({
				seed: number(0, 4294967295),
				width: number(1, 10000),
				height: number(1, 10000),
				steps: number(1, 200),
				guidanceScale: number(0, 100),
				aspectRatio: text(20),
				outputFormat: choice(['png', 'jpeg', 'webp'])
			}),
			referenceAssetIds: list(id),
			assetId: optionalId,
			generationAssetId: optionalId,
			parentId: optionalId,
			generationResultId: text(200, 1),
			sourceRecipeId: text(200, 1),
			status: choice(['ready', 'failed', 'queued', 'running', 'cancelled']),
			error: text(2000),
			recipe
		},
		['briefId', 'direction', 'headline']
	),
	feedback: shape(
		{
			compositionId: optionalId,
			generationResultId: text(200, 1),
			text: text(8000),
			rating: choice(['favorite', 'reject', 'neutral']),
			scope: choice(['candidate', 'episode', 'house']),
			tags: list(text(80), 20)
		},
		['text', 'rating', 'scope']
	),
	channels: shape(
		{
			name: text(120, 1),
			channelId: text(100),
			url: httpsUrl,
			kitId: optionalId,
			notes: text(4000),
			references: list(
				shape(
					{
						videoId: text(20, 1),
						title: text(500),
						thumbnailUrl: httpsUrl,
						publishedAt: text(40),
						retrievedAt: text(40),
						note: text(4000)
					},
					['videoId', 'title']
				),
				200
			)
		},
		['name', 'url']
	),
	saved: shape(
		{
			name: text(120, 1),
			kind: choice(['modifier', 'reference', 'generation']),
			text: text(40000),
			assetId: optionalId,
			generation
		},
		['name', 'kind']
	)
};
/** @param {any} data @param {string} kind */
function validData(data, kind) {
	if (!schemas[/** @type {keyof typeof schemas} */ (kind)]?.(data)) return false;
	// Inline binary payloads do not belong in prompts, references, transcripts, or recipes.
	if (/data:[^\s,;]{0,100}(?:;base64|,)/i.test(JSON.stringify(data))) return false;
	if (kind === 'feedback' && !data.compositionId && !data.generationResultId) return false;
	if (
		kind === 'saved' &&
		((data.kind === 'modifier' && !data.text) ||
			(data.kind === 'reference' && !data.assetId) ||
			(data.kind === 'generation' && !data.generation))
	)
		return false;
	if (data.kitRevision && !data.kitId) return false;
	if (
		kind === 'briefs' &&
		data.analysis?.quotes?.some(
			(/** @type {any} */ q) =>
				q.endOffset <= q.startOffset ||
				(data.transcript && data.transcript.slice(q.startOffset, q.endOffset) !== q.text)
		)
	)
		return false;
	return true;
}
/** Read incrementally, rejecting dishonest/missing Content-Length without buffering unbounded bodies. @param {Request} request @param {number} limit */
export async function readCreativeBody(request, limit) {
	if (Number(request.headers.get('content-length')) > limit)
		throw Object.assign(new Error('Request exceeds the storage limit.'), { status: 413 });
	const reader = request.body?.getReader();
	if (!reader) return new Uint8Array();
	const chunks = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > limit) {
				await reader.cancel();
				throw Object.assign(new Error('Request exceeds the storage limit.'), { status: 413 });
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const result = new Uint8Array(size);
	let offset = 0;
	for (const value of chunks) {
		result.set(value, offset);
		offset += value.byteLength;
	}
	return result;
}
const response = (/** @type {any} */ body, status = 200) =>
	Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const missing = () => response({ error: 'Creative record not found.' }, 404);
const conflict = () =>
	response({ code: 'revision_conflict', error: 'This record changed. Reload before saving.' }, 409);
/** @param {any} row */
const record = (row) => ({
	id: row.id,
	kind: row.kind,
	revision: row.revision,
	data: JSON.parse(row.data),
	createdAt: row.created_at,
	updatedAt: row.updated_at,
	...(row.kind === 'kits' ? { activeRevision: row.active_revision } : {})
});
/** @param {any} row */
const asset = (row) => ({
	id: row.id,
	name: row.name,
	mimeType: row.mime_type,
	role: row.role,
	size: row.size,
	status: row.status,
	revision: row.revision,
	createdAt: row.created_at,
	...(row.role === 'font' ? { canvasSupport: 'unavailable' } : {})
});

export class CreativeLibrary {
	/** @param {{exec:(query:string,...values:any[])=>{toArray:()=>any[],one:()=>any}}} sql */
	constructor(sql) {
		this.sql = sql;
		sql.exec(`CREATE TABLE IF NOT EXISTS creative_records (
			kind TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL,
			created_at TEXT NOT NULL, updated_at TEXT NOT NULL, active_revision INTEGER,
			PRIMARY KEY (kind, id)
		);
		CREATE TABLE IF NOT EXISTS creative_house_revisions (
			kit_id TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL,
			PRIMARY KEY (kit_id, revision)
		);
		CREATE TRIGGER IF NOT EXISTS creative_kit_insert AFTER INSERT ON creative_records WHEN NEW.kind = 'kits'
		BEGIN INSERT INTO creative_house_revisions VALUES (NEW.id, NEW.revision, NEW.data, NEW.updated_at); END;
		CREATE TRIGGER IF NOT EXISTS creative_kit_update AFTER UPDATE ON creative_records WHEN NEW.kind = 'kits' AND NEW.active_revision IS OLD.active_revision
		BEGIN INSERT INTO creative_house_revisions VALUES (NEW.id, NEW.revision, NEW.data, NEW.updated_at); END;
		CREATE TRIGGER IF NOT EXISTS creative_kit_delete AFTER DELETE ON creative_records WHEN OLD.kind = 'kits'
		BEGIN DELETE FROM creative_house_revisions WHERE kit_id = OLD.id; END;
		CREATE TABLE IF NOT EXISTS creative_assets (
			id TEXT PRIMARY KEY, name TEXT NOT NULL, mime_type TEXT NOT NULL, role TEXT NOT NULL,
			size INTEGER NOT NULL, status TEXT NOT NULL, revision INTEGER NOT NULL, created_at TEXT NOT NULL
		);`);
	}
	/** @param {string} kind @param {string} id */
	find(kind, id) {
		return this.sql
			.exec('SELECT * FROM creative_records WHERE kind = ? AND id = ?', kind, id)
			.toArray()[0];
	}
	/** @param {string} id */
	findAsset(id) {
		return this.sql.exec('SELECT * FROM creative_assets WHERE id = ?', id).toArray()[0];
	}
	/** @param {string} id @param {number} revision */
	snapshot(id, revision) {
		return this.sql
			.exec(
				'SELECT * FROM creative_house_revisions WHERE kit_id = ? AND revision = ?',
				id,
				revision
			)
			.toArray()[0];
	}
	metadataSize() {
		return (
			this.sql
				.exec('SELECT COALESCE(SUM(length(CAST(data AS BLOB))), 0) AS size FROM creative_records')
				.one().size +
			this.sql
				.exec(
					'SELECT COALESCE(SUM(length(CAST(data AS BLOB))), 0) AS size FROM creative_house_revisions'
				)
				.one().size
		);
	}
	/** @param {string} kind @param {any} data */
	validateReferences(kind, data) {
		const refs = [];
		for (const key of [
			'assetIds',
			'referenceIds',
			'negativeReferenceIds',
			'peopleAssetIds',
			'logoAssetIds',
			'referenceAssetIds'
		])
			refs.push(...(data[key] ?? []));
		for (const key of ['assetId', 'generationAssetId']) if (data[key]) refs.push(data[key]);
		for (const item of [...(data.recipe?.people ?? []), ...(data.recipe?.logos ?? [])])
			if (item.assetId) refs.push(item.assetId);
		for (const item of data.generation?.referenceImages ?? []) refs.push(item.assetId);
		if (data.generation?.assetId) refs.push(data.generation.assetId);
		refs.push(...(data.generation?.context?.referenceAssetIds ?? []));
		if (refs.some((ref) => this.findAsset(ref)?.status !== 'ready'))
			return 'An asset is unavailable in this account.';
		for (const [field, target] of [
			['kitId', 'kits'],
			['channelId', 'channels'],
			['briefId', 'briefs'],
			['parentId', 'compositions'],
			['compositionId', 'compositions']
		])
			if (
				data[field] &&
				!(kind === 'channels' && field === 'channelId') &&
				!this.find(target, data[field])
			)
				return 'A linked record is unavailable in this account.';
		if (data.kitId && data.kitRevision && !this.snapshot(data.kitId, data.kitRevision))
			return 'The chosen house revision is unavailable.';
		const context = data.generation?.context;
		if (context) {
			if (context.briefId && !this.find('briefs', context.briefId))
				return 'The linked brief is unavailable.';
			if (context.houseKitId && !this.find('kits', context.houseKitId))
				return 'The linked kit is unavailable.';
			if (
				context.houseRevision &&
				(!context.houseKitId || !this.snapshot(context.houseKitId, context.houseRevision))
			)
				return 'The chosen house revision is unavailable.';
			if (context.feedbackIds?.some((/** @type {string} */ id) => !this.find('feedback', id)))
				return 'The linked feedback is unavailable.';
		}
		return null;
	}
	/** Account-local references include immutable house versions: deletion cannot quietly break replay. @param {string} id @param {string} [self] */
	isReferenced(id, self) {
		const has = (/** @type {any} */ value) =>
			typeof value === 'string'
				? value === id
				: Array.isArray(value)
					? value.some(has)
					: object(value)
						? Object.values(value).some(has)
						: false;
		return (
			this.sql
				.exec('SELECT id, data FROM creative_records')
				.toArray()
				.some((row) => row.id !== self && has(JSON.parse(row.data))) ||
			this.sql
				.exec('SELECT kit_id AS id, data FROM creative_house_revisions')
				.toArray()
				.some((row) => row.id !== self && has(JSON.parse(row.data)))
		);
	}
	/** @param {Request} request */
	async fetch(request) {
		const path = new URL(request.url).pathname;
		let body;
		if (!['GET', 'HEAD'].includes(request.method)) {
			try {
				body = JSON.parse(
					new TextDecoder().decode(await readCreativeBody(request, CREATIVE_LIMITS.requestBytes))
				);
			} catch (error) {
				const failure = /** @type {Error & {status?:number}} */ (error);
				return response(
					{ error: failure.status === 413 ? failure.message : 'Invalid JSON request.' },
					failure.status === 413 ? 413 : 400
				);
			}
		}
		if (path === '/creative/library' && request.method === 'GET') {
			const records = Object.fromEntries(
				CREATIVE_RECORD_KINDS.map((kind) => [
					kind,
					this.sql
						.exec(
							'SELECT * FROM creative_records WHERE kind = ? ORDER BY updated_at DESC, id',
							kind
						)
						.toArray()
						.map(record)
				])
			);
			const assets = this.sql
				.exec('SELECT * FROM creative_assets ORDER BY created_at DESC, id')
				.toArray()
				.map(asset);
			return response({
				records,
				assets,
				limits: CREATIVE_LIMITS,
				usage: {
					metadataBytes: this.metadataSize(),
					assetBytes: assets.reduce((total, item) => total + item.size, 0),
					assetCount: assets.length
				}
			});
		}
		if (path.startsWith('/creative/_assets/')) return this.assets(path, request.method, body);
		const match = path.match(
			/^\/creative\/records\/(kits|briefs|compositions|feedback|channels|saved)(?:\/([0-9a-f-]+))?(?:\/(revisions|promote)(?:\/(\d+))?)?$/i
		);
		if (!match || (match[2] && !CREATIVE_ID.test(match[2]))) return missing();
		const [, kind, id, action, number] = match;
		const current = id ? this.find(kind, id) : undefined;
		if (id && !current) return missing();
		if (action) {
			if (kind !== 'kits' || !id) return missing();
			if (action === 'revisions' && request.method === 'GET') {
				if (number) {
					const row = this.snapshot(id, Number(number));
					return row
						? response({
								revision: row.revision,
								data: JSON.parse(row.data),
								createdAt: row.created_at
							})
						: missing();
				}
				return response({
					revisions: this.sql
						.exec(
							'SELECT * FROM creative_house_revisions WHERE kit_id = ? ORDER BY revision DESC',
							id
						)
						.toArray()
						.map((row) => ({
							revision: row.revision,
							data: JSON.parse(row.data),
							createdAt: row.created_at
						}))
				});
			}
			if (action !== 'promote' || number || request.method !== 'POST')
				return response({ error: 'Method not allowed.' }, 405);
			if (
				!shape({ revision: positiveInteger, houseRevision: positiveInteger }, [
					'revision',
					'houseRevision'
				])(body)
			)
				return response({ error: 'Provide the current revision and chosen houseRevision.' }, 400);
			if (body.revision !== current.revision) return conflict();
			if (!this.snapshot(id, body.houseRevision)) return missing();
			return this.save(kind, id, JSON.parse(current.data), current, body.houseRevision);
		}
		if (request.method === 'GET')
			return id
				? response(record(current))
				: response({
						records: this.sql
							.exec(
								'SELECT * FROM creative_records WHERE kind = ? ORDER BY updated_at DESC, id',
								kind
							)
							.toArray()
							.map(record)
					});
		if (request.method === 'DELETE' && id) {
			if (!shape({ revision: positiveInteger }, ['revision'])(body))
				return response({ error: 'Provide the current revision.' }, 400);
			if (body.revision !== current.revision) return conflict();
			if (this.isReferenced(id, id))
				return response(
					{ code: 'record_in_use', error: 'Remove linked records before deleting this item.' },
					409
				);
			this.sql.exec('DELETE FROM creative_records WHERE kind = ? AND id = ?', kind, id);
			return response({ ok: true });
		}
		if ((request.method !== 'POST' || id) && (request.method !== 'PUT' || !id))
			return response({ error: 'Method not allowed.' }, 405);
		if (
			!shape(
				{ data: (value) => validData(value, kind), revision: positiveInteger },
				id ? ['data', 'revision'] : ['data']
			)(body)
		)
			return response(
				{ error: 'Invalid creative record. Check its named fields and limits.' },
				400
			);
		if (!id && 'revision' in body)
			return response({ error: 'New records do not accept a revision.' }, 400);
		if (id && body.revision !== current.revision) return conflict();
		const referenceError = this.validateReferences(kind, body.data);
		if (referenceError) return response({ error: referenceError }, 400);
		return this.save(kind, id || crypto.randomUUID(), body.data, current);
	}
	/** All checks and SQL writes are synchronous after body read: another request cannot cross the revision/quota fence. @param {string} kind @param {string} id @param {any} data @param {any} current @param {number} [active] */
	save(kind, id, data, current, active) {
		if (active !== undefined && current?.active_revision === active)
			return response(record(current));
		const isHouseDraft = kind === 'kits' && active === undefined;
		const encoded = JSON.stringify(data);
		const size = bytes(encoded);
		if (
			size > (kind === 'briefs' ? CREATIVE_LIMITS.briefBytes : CREATIVE_LIMITS.recordBytes)
		)
			return response({ error: 'This record exceeds its byte limit.' }, 413);
		if (
			!current &&
			this.sql.exec('SELECT COUNT(*) AS count FROM creative_records WHERE kind = ?', kind).one()
				.count >=
				CREATIVE_LIMITS.records[/** @type {keyof typeof CREATIVE_LIMITS.records} */ (kind)]
		)
			return response(
				{ code: 'quota_exceeded', error: 'This account has reached the record limit.' },
				409
			);
		if (
			isHouseDraft &&
			this.sql
				.exec('SELECT COUNT(*) AS count FROM creative_house_revisions WHERE kit_id = ?', id)
				.one().count >= CREATIVE_LIMITS.kitRevisions
		)
			return response(
				{ code: 'quota_exceeded', error: 'This kit has reached its house revision limit.' },
				409
			);
		if (
			this.metadataSize() - (current ? bytes(current.data) : 0) + size * (isHouseDraft ? 2 : 1) >
			CREATIVE_LIMITS.metadataBytes
		)
			return response(
				{ code: 'quota_exceeded', error: 'This account has reached its metadata storage limit.' },
				409
			);
		const now = new Date().toISOString();
		if (current)
			this.sql.exec(
				'UPDATE creative_records SET revision = ?, data = ?, updated_at = ?, active_revision = ? WHERE kind = ? AND id = ?',
				current.revision + 1,
				encoded,
				now,
				active ?? current.active_revision,
				kind,
				id
			);
		else
			this.sql.exec(
				'INSERT INTO creative_records (kind, id, revision, data, created_at, updated_at, active_revision) VALUES (?, ?, ?, ?, ?, ?, ?)',
				kind,
				id,
				1,
				encoded,
				now,
				now,
				kind === 'kits' ? 1 : null
			);
		return response(record(this.find(kind, id)), current ? 200 : 201);
	}
	/** Internal only; public server boundary never forwards these paths directly. @param {string} path @param {string} method @param {any} body */
	assets(path, method, body) {
		if (path === '/creative/_assets/reserve' && method === 'POST') {
			if (
				!shape(
					{
						id,
						name: text(200, 1),
						mimeType: choice(['image/png', 'image/jpeg', 'image/webp', 'font/woff2']),
						role: choice(['logo', 'portrait', 'reference', 'background', 'font', 'other']),
						size: number(1, CREATIVE_LIMITS.assetBytes)
					},
					['id', 'name', 'mimeType', 'role', 'size']
				)(body)
			)
				return response({ error: 'Invalid asset metadata.' }, 400);
			if (this.findAsset(body.id)) return conflict();
			const usage = this.sql
				.exec('SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS size FROM creative_assets')
				.one();
			if (
				usage.count >= CREATIVE_LIMITS.assetCount ||
				usage.size + body.size > CREATIVE_LIMITS.storageBytes
			)
				return response(
					{
						code: 'quota_exceeded',
						error: 'This account has reached its private asset storage limit.'
					},
					409
				);
			this.sql.exec(
				'INSERT INTO creative_assets VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
				body.id,
				body.name,
				body.mimeType,
				body.role,
				body.size,
				'uploading',
				1,
				new Date().toISOString()
			);
			return response(asset(this.findAsset(body.id)), 201);
		}
		const match = path.match(/^\/creative\/_assets\/([0-9a-f-]+)(?:\/(ready|release|deleting))?$/i);
		if (!match || !CREATIVE_ID.test(match[1])) return missing();
		const [, assetId, action] = match;
		const current = this.findAsset(assetId);
		if (!current) return missing();
		if (!action && method === 'GET') return response(asset(current));
		if (method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
		if (action === 'ready') {
			if (current.status !== 'uploading') return conflict();
			this.sql.exec(
				"UPDATE creative_assets SET status = 'ready', revision = revision + 1 WHERE id = ?",
				assetId
			);
		} else if (action === 'deleting') {
			if (
				!shape({ revision: positiveInteger }, ['revision'])(body) ||
				body.revision !== current.revision
			)
				return conflict();
			if (this.isReferenced(assetId))
				return response(
					{
						code: 'asset_in_use',
						error:
							'This asset is used by a record or house revision. Remove those records before deleting it.'
					},
					409
				);
			this.sql.exec(
				"UPDATE creative_assets SET status = 'deleting', revision = revision + 1 WHERE id = ?",
				assetId
			);
		} else if (action === 'release') {
			if (current.status === 'ready') return conflict();
			this.sql.exec('DELETE FROM creative_assets WHERE id = ?', assetId);
			return response({ ok: true });
		} else return missing();
		return response(asset(this.findAsset(assetId)));
	}
}
