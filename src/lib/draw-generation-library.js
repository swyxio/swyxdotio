/** Saved items use the shared creative library. This module never creates another asset store. */
const API = '/tools/api/draw/creative';
/** @typedef {import('./draw-generation-history.js').DrawingImageGeneration} Generation */
/** @typedef {{id:string,revision:number,name:string,createdAt:number,kind:'modifier'|'reference'|'generation',text?:string,assetId?:string,mimeType?:string,generation?:Record<string,any>}} DrawingGenerationLibraryEntry */

/** @param {string|undefined} userId @param {string} path @param {RequestInit} [options] @param {typeof fetch} [fetcher] */
async function request(userId, path, options = {}, fetcher = fetch) {
	if (!userId) throw new Error('Sign in to use your private saved library.');
	const response = await fetcher(`${API}${path}`, {
		...options,
		credentials: 'same-origin',
		cache: 'no-store',
		headers: { 'X-Tools-User': userId, ...options.headers }
	});
	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new Error(body.error ?? 'The private saved library is unavailable.');
	}
	return response;
}

/** @param {string|undefined} userId @param {typeof fetch} [fetcher] @returns {Promise<DrawingGenerationLibraryEntry[]>} */
export async function loadDrawingGenerationLibrary(userId, fetcher = fetch) {
	if (!userId) return [];
	const data = await (await request(userId, '/library', {}, fetcher)).json();
	return (data.records?.saved ?? []).map((/** @type {any} */ record) => ({
		...record.data,
		id: record.id,
		revision: record.revision,
		createdAt: record.createdAt
	}));
}

/** @param {Blob} blob @returns {Promise<string>} */
function asDataURL(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error('Could not read saved reference.'));
		reader.readAsDataURL(blob);
	});
}

/** Upload only on an explicit Save action, with no provider call. @param {string} userId @param {string} dataURL @param {string} name @param {typeof fetch} fetcher */
async function saveImage(userId, dataURL, name, fetcher) {
	if (!/^data:image\/(png|jpeg|webp|avif|gif);base64,/.test(dataURL))
		throw new Error('Save a raster image reference, not a remote URL or video.');
	let blob = await (await fetch(dataURL)).blob();
	if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) {
		const bitmap = await createImageBitmap(blob);
		try {
			const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Image conversion is unavailable.');
			ctx.drawImage(bitmap, 0, 0);
			blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.94 });
		} finally {
			bitmap.close();
		}
	}
	const asset = await (
		await request(
			userId,
			'/assets',
			{
				method: 'POST',
				headers: {
					'Content-Type': blob.type,
					'X-Asset-Name': encodeURIComponent(name),
					'X-Asset-Role': 'reference'
				},
				body: blob
			},
			fetcher
		)
	).json();
	if (typeof asset.id !== 'string') throw new Error('The image upload did not return an asset ID.');
	return { assetId: asset.id, mimeType: blob.type };
}

/** @param {string|undefined} userId @param {{kind:'modifier'|'reference'|'generation',name:string,text?:string,reference?:{dataURL:string,mimeType:string},generation?:Generation}} input @param {typeof fetch} [fetcher] */
export async function saveDrawingGenerationLibraryEntry(userId, input, fetcher = fetch) {
	if (!userId) throw new Error('Sign in to save to your private library.');
	const snapshot = structuredClone(input);
	/** @type {Record<string,any>} */
	const data = { kind: snapshot.kind, name: snapshot.name.trim().slice(0, 120) };
	if (snapshot.kind === 'modifier') data.text = snapshot.text;
	else if (snapshot.kind === 'reference' && snapshot.reference)
		data.assetId = (
			await saveImage(userId, snapshot.reference.dataURL, data.name, fetcher)
		).assetId;
	else if (snapshot.kind === 'generation' && snapshot.generation) {
		const { dataURL, referenceImages } = snapshot.generation;
		const fields = [
			'id',
			'prompt',
			'modelId',
			'adapterId',
			'modelSettings',
			'modelProvider',
			'modelKind',
			'modelWorkflow',
			'modelLabel',
			'createdAt',
			'mimeType',
			'recipeId',
			'runId',
			'jobId',
			'batchId',
			'elapsedMs',
			'estimatedUsd',
			'reportedUsd',
			'qualityNote',
			'width',
			'height',
			'parentGenerationId',
			'context'
		];
		const metadata = Object.fromEntries(
			fields.flatMap((key) => {
				const value = /** @type {Record<string,any>} */ (snapshot.generation)[key];
				return value === undefined ? [] : [[key, value]];
			})
		);
		const output = snapshot.generation.mimeType.startsWith('video/')
			? {}
			: { assetId: (await saveImage(userId, dataURL, data.name, fetcher)).assetId };
		const references = [];
		for (const reference of referenceImages ?? [])
			references.push({
				...(reference.assetId
					? { assetId: reference.assetId, mimeType: reference.mimeType }
					: await saveImage(userId, reference.dataURL, `${data.name} reference`, fetcher)),
				...(reference.generationId ? { generationId: reference.generationId } : {}),
				...(reference.role ? { role: reference.role } : {}),
				...(reference.label ? { label: reference.label } : {})
			});
		data.generation = { ...metadata, ...output, referenceImages: references };
	} else throw new Error('Choose an item to save.');
	const record = await (
		await request(
			userId,
			'/records/saved',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ data })
			},
			fetcher
		)
	).json();
	return /** @type {DrawingGenerationLibraryEntry} */ ({
		...record.data,
		id: record.id,
		revision: record.revision,
		createdAt: record.createdAt
	});
}

/** @param {string|undefined} userId @param {DrawingGenerationLibraryEntry} entry @param {typeof fetch} [fetcher] */
export async function removeDrawingGenerationLibraryEntry(userId, entry, fetcher = fetch) {
	await request(
		userId,
		`/records/saved/${encodeURIComponent(entry.id)}`,
		{
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ revision: entry.revision })
		},
		fetcher
	);
}

/** @param {string|undefined} userId @param {{assetId?:string,mimeType?:string,generationId?:string,role?:string,label?:string}} reference @param {typeof fetch} [fetcher] */
export async function readDrawingLibraryReference(userId, reference, fetcher = fetch) {
	if (!reference.assetId) throw new Error('The saved reference has no asset.');
	const blob = await (
		await request(userId, `/assets/${encodeURIComponent(reference.assetId)}`, {}, fetcher)
	).blob();
	return {
		dataURL: await asDataURL(blob),
		mimeType: blob.type,
		assetId: reference.assetId,
		...(reference.generationId ? { generationId: reference.generationId } : {}),
		...(reference.role ? { role: reference.role } : {}),
		...(reference.label ? { label: reference.label } : {})
	};
}

/** Loading saved bytes is explicit; ordinary library listing never fetches media. @param {string|undefined} userId @param {DrawingGenerationLibraryEntry} entry */
export async function readDrawingLibraryGeneration(userId, entry) {
	const generation = entry.generation;
	if (!generation) throw new Error('The saved recipe is unavailable.');
	// Remix needs references, not a download of the saved output. Video outputs are not persisted.
	const output = { dataURL: '', mimeType: generation.mimeType };
	const referenceImages = [];
	for (const reference of generation.referenceImages ?? [])
		referenceImages.push(await readDrawingLibraryReference(userId, reference));
	return /** @type {Generation} */ ({ ...generation, ...output, referenceImages });
}
