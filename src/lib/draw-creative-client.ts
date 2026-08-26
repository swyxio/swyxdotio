/** Account-bound creative-library client. No cache is read before identity resolves. */
export type CreativeRecord = {
	id: string;
	kind: string;
	revision: number;
	activeRevision?: number;
	data: Record<string, any>;
	createdAt: string;
	updatedAt: string;
};
export type CreativeAsset = {
	id: string;
	name: string;
	role: string;
	mimeType: string;
	size: number;
	revision: number;
	canvasSupport?: string;
};
export type CreativeLibrary = {
	records: Record<string, CreativeRecord[]>;
	assets: CreativeAsset[];
	assetsAvailable: boolean;
	limits?: Record<string, number>;
};

export const CREATIVE_API = '/tools/api/draw/creative';

export class CreativeClient {
	constructor(
		readonly userId: string,
		readonly signal?: AbortSignal
	) {}
	async request(path: string, options: RequestInit = {}) {
		const response = await fetch(`${CREATIVE_API}${path}`, {
			...options,
			credentials: 'same-origin',
			signal: options.signal ?? this.signal,
			headers: { 'X-Tools-User': this.userId, ...options.headers }
		});
		const result = await response.json().catch(() => ({}));
		if (!response.ok) {
			if (result.code === 'account_changed')
				throw new Error('Your account changed. Reload before continuing.');
			throw new Error(result.error ?? result.message ?? 'The creative library is unavailable.');
		}
		return result;
	}
	async library(): Promise<CreativeLibrary> {
		return this.request('/library');
	}
	async save(
		kind: string,
		data: Record<string, any>,
		previous?: CreativeRecord
	): Promise<CreativeRecord> {
		return this.request(`/records/${kind}${previous ? `/${previous.id}` : ''}`, {
			method: previous ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(previous ? { revision: previous.revision, data } : { data })
		});
	}
	async upload(file: Blob, name: string, role: string) {
		const mimeType =
			file.type ||
			(name.toLowerCase().endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream');
		return this.request('/assets', {
			method: 'POST',
			body: file,
			headers: {
				'Content-Type': mimeType,
				'X-Asset-Name': encodeURIComponent(name),
				'X-Asset-Role': role
			}
		});
	}
	async remove(path: string, revision: number) {
		return this.request(path, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ revision })
		});
	}
	async asset(id: string): Promise<Blob> {
		const response = await fetch(`${CREATIVE_API}/assets/${encodeURIComponent(id)}`, {
			credentials: 'same-origin',
			signal: this.signal,
			headers: { 'X-Tools-User': this.userId }
		});
		if (!response.ok) throw new Error('The saved asset is unavailable for this account.');
		return response.blob();
	}
}

export function emptyCreativeLibrary(): CreativeLibrary {
	return {
		records: { kits: [], briefs: [], compositions: [], feedback: [], channels: [], saved: [] },
		assets: [],
		assetsAvailable: false
	};
}

export function newKitDraft() {
	return {
		name: '',
		brand: 'generic',
		prompt: '',
		colors: { background: '#15151d', foreground: '#ffffff', accent: '#c8ff47' },
		fontFamily: 2,
		assetIds: [] as string[],
		referenceIds: [] as string[],
		negativeReferenceIds: [] as string[],
		fontNotes: '',
		rules: [] as string[]
	};
}

export function newBriefDraft() {
	return {
		name: '',
		title: '',
		hook: '',
		hints: '',
		transcript: '',
		sourceUrl: '',
		peopleAssetIds: [] as string[],
		logoAssetIds: [] as string[],
		referenceAssetIds: [] as string[]
	} as Record<string, any>;
}

/** Saved references are not automatically inference attachments. */
export function compileCreativePrompt(
	housePrompt: string,
	brief: Record<string, any>,
	direction: { label: string; description: string },
	feedback = ''
) {
	return [
		housePrompt.trim(),
		`Episode title (context, not a quote): ${brief.title || 'Not supplied'}`,
		`Approved thumbnail headline: ${brief.hook || 'Not supplied'}`,
		`Art direction: ${direction.label}. ${direction.description}`,
		brief.hints ? `Editorial hints: ${brief.hints}` : '',
		feedback ? `Selected feedback for this iteration: ${feedback}` : '',
		'Keep official logos and exact headline typography as separate editable layers. Do not invent people, affiliations, quotes, or statistics. Keep essential content clear of the lower-right duration badge.'
	]
		.filter(Boolean)
		.join('\n\n');
}

export async function creativeSourceRequest(
	userId: string,
	body: Record<string, unknown>,
	signal?: AbortSignal
) {
	const response = await fetch('/tools/api/draw/creative-source', {
		method: 'POST',
		credentials: 'same-origin',
		signal,
		headers: { 'Content-Type': 'application/json', 'X-Tools-User': userId },
		body: JSON.stringify(body)
	});
	const result = await response.json().catch(() => ({}));
	if (!response.ok)
		throw new Error(result.error ?? result.message ?? 'The source could not be processed.');
	return result;
}

/** Fetch alone does not save/attach: caller follows this with an explicit private upload. */
export async function creativeThumbnailReference(
	userId: string,
	videoId: string,
	signal?: AbortSignal
): Promise<Blob> {
	const response = await fetch('/tools/api/draw/creative-source', {
		method: 'POST',
		credentials: 'same-origin',
		signal,
		headers: { 'Content-Type': 'application/json', 'X-Tools-User': userId },
		body: JSON.stringify({ action: 'thumbnail', videoId })
	});
	if (!response.ok) {
		const result = await response.json().catch(() => ({}));
		throw new Error(result.error ?? 'Reference thumbnail is unavailable.');
	}
	return response.blob();
}

export function downloadCreativeBlob(blob: Blob, name: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = name;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
