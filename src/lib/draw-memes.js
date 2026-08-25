/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   url: string,
 *   width: number,
 *   height: number,
 *   keywords: string[]
 * }} DrawMemeTemplate
 */

export const IMGFLIP_MEMES_ENDPOINT = 'https://api.imgflip.com/get_memes';

/**
 * Imgflip's 20 highest-ranked templates on August 25, 2026. Keep the image URLs
 * on Imgflip's own CDN: image copyright remains with its respective owner.
 *
 * @type {DrawMemeTemplate[]}
 */
export const DRAW_MEME_TEMPLATES = [
	{
		id: '181913649',
		name: 'Drake Hotline Bling',
		url: 'https://i.imgflip.com/30b1gx.jpg',
		width: 1200,
		height: 1200,
		keywords: ['drake', 'yes no', 'preference', 'approval', 'rejection']
	},
	{
		id: '87743020',
		name: 'Two Buttons',
		url: 'https://i.imgflip.com/1g8my4.jpg',
		width: 600,
		height: 908,
		keywords: ['buttons', 'choice', 'dilemma', 'sweating']
	},
	{
		id: '112126428',
		name: 'Distracted Boyfriend',
		url: 'https://i.imgflip.com/1ur9b0.jpg',
		width: 1200,
		height: 800,
		keywords: ['boyfriend', 'girlfriend', 'distraction', 'temptation']
	},
	{
		id: '222403160',
		name: 'Bernie I Am Once Again Asking For Your Support',
		url: 'https://i.imgflip.com/3oevdk.jpg',
		width: 750,
		height: 750,
		keywords: ['bernie sanders', 'asking', 'request', 'support']
	},
	{
		id: '217743513',
		name: 'UNO Draw 25 Cards',
		url: 'https://i.imgflip.com/3lmzyx.jpg',
		width: 500,
		height: 494,
		keywords: ['uno', 'cards', 'refusal', 'choice']
	},
	{
		id: '124822590',
		name: 'Left Exit 12 Off Ramp',
		url: 'https://i.imgflip.com/22bdq6.jpg',
		width: 804,
		height: 767,
		keywords: ['highway', 'car', 'exit', 'decision', 'swerve']
	},
	{
		id: '252600902',
		name: 'Always Has Been',
		url: 'https://i.imgflip.com/46e43q.png',
		width: 960,
		height: 540,
		keywords: ['astronaut', 'space', 'earth', 'gun', 'realization']
	},
	{
		id: '322841258',
		name: 'Anakin Padme 4 Panel',
		url: 'https://i.imgflip.com/5c7lwq.png',
		width: 768,
		height: 768,
		keywords: ['star wars', 'anakin', 'padme', 'right', 'four panels']
	},
	{
		id: '135256802',
		name: 'Epic Handshake',
		url: 'https://i.imgflip.com/28j0te.jpg',
		width: 900,
		height: 645,
		keywords: ['handshake', 'agreement', 'teamwork', 'alliance']
	},
	{
		id: '131087935',
		name: 'Running Away Balloon',
		url: 'https://i.imgflip.com/261o3j.jpg',
		width: 761,
		height: 1024,
		keywords: ['balloon', 'chase', 'running', 'missed opportunity']
	},
	{
		id: '131940431',
		name: "Gru's Plan",
		url: 'https://i.imgflip.com/26jxvz.jpg',
		width: 700,
		height: 449,
		keywords: ['gru', 'despicable me', 'plan', 'presentation', 'four panels']
	},
	{
		id: '80707627',
		name: 'Sad Pablo Escobar',
		url: 'https://i.imgflip.com/1c1uej.jpg',
		width: 720,
		height: 709,
		keywords: ['pablo', 'escobar', 'waiting', 'lonely', 'narcos']
	},
	{
		id: '4087833',
		name: 'Waiting Skeleton',
		url: 'https://i.imgflip.com/2fm6x.jpg',
		width: 298,
		height: 403,
		keywords: ['skeleton', 'waiting', 'forever', 'bench']
	},
	{
		id: '129242436',
		name: 'Change My Mind',
		url: 'https://i.imgflip.com/24y43o.jpg',
		width: 482,
		height: 361,
		keywords: ['change my mind', 'debate', 'opinion', 'table', 'sign']
	},
	{
		id: '97984',
		name: 'Disaster Girl',
		url: 'https://i.imgflip.com/23ls.jpg',
		width: 500,
		height: 375,
		keywords: ['girl', 'fire', 'burning', 'disaster', 'smirk']
	},
	{
		id: '309868304',
		name: 'Trade Offer',
		url: 'https://i.imgflip.com/54hjww.jpg',
		width: 607,
		height: 794,
		keywords: ['trade', 'offer', 'deal', 'exchange', 'i receive']
	},
	{
		id: '161865971',
		name: 'Marked Safe From',
		url: 'https://i.imgflip.com/2odckz.jpg',
		width: 618,
		height: 499,
		keywords: ['marked safe', 'facebook', 'safe', 'survived']
	},
	{
		id: '224015000',
		name: 'Bernie Sanders Once Again Asking',
		url: 'https://i.imgflip.com/3pdf2w.png',
		width: 926,
		height: 688,
		keywords: ['bernie sanders', 'asking', 'request', 'once again']
	},
	{
		id: '124055727',
		name: "Y'all Got Any More Of That",
		url: 'https://i.imgflip.com/21uy0f.jpg',
		width: 600,
		height: 471,
		keywords: ['dave chappelle', 'got any more', 'more', 'asking']
	},
	{
		id: '101470',
		name: 'Ancient Aliens',
		url: 'https://i.imgflip.com/26am.jpg',
		width: 500,
		height: 437,
		keywords: ['aliens', 'ancient', 'conspiracy', 'history channel']
	}
];

const SEEDED_KEYWORDS = new Map(
	DRAW_MEME_TEMPLATES.map((template) => [template.id, template.keywords])
);

/** @type {Promise<DrawMemeTemplate[]> | undefined} */
let cachedMemeTemplates;

/**
 * @param {unknown} value
 * @returns {DrawMemeTemplate | null}
 */
function normalizeMemeTemplate(value) {
	if (typeof value !== 'object' || value === null) return null;

	/** @type {Record<string, unknown>} */
	const template = /** @type {Record<string, unknown>} */ (value);
	if (
		typeof template.id !== 'string' ||
		typeof template.name !== 'string' ||
		typeof template.url !== 'string' ||
		!Number.isFinite(template.width) ||
		!Number.isFinite(template.height) ||
		Number(template.width) <= 0 ||
		Number(template.height) <= 0
	) {
		return null;
	}

	let imageUrl;
	try {
		imageUrl = new URL(template.url);
	} catch {
		return null;
	}
	if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'i.imgflip.com') return null;

	return {
		id: template.id,
		name: template.name.trim(),
		url: imageUrl.href,
		width: Number(template.width),
		height: Number(template.height),
		keywords: SEEDED_KEYWORDS.get(template.id) ?? []
	};
}

/**
 * Fetch Imgflip's free, public top-template catalog only when needed. Concurrent
 * callers share one request; failed requests remain retryable.
 *
 * @param {{ fetch?: typeof globalThis.fetch, force?: boolean }} [options]
 * @returns {Promise<DrawMemeTemplate[]>}
 */
export function fetchMemeTemplates({
	fetch: fetchImplementation = globalThis.fetch,
	force = false
} = {}) {
	if (cachedMemeTemplates && !force) return cachedMemeTemplates;
	if (typeof fetchImplementation !== 'function') {
		return Promise.reject(new Error('Meme template search is unavailable in this browser.'));
	}

	const request = Promise.resolve()
		.then(() => fetchImplementation(IMGFLIP_MEMES_ENDPOINT))
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(`Meme templates could not be loaded (${response.status}).`);
			}

			const payload = await response.json();
			if (payload?.success !== true || !Array.isArray(payload.data?.memes)) {
				throw new Error(payload?.error_message ?? 'Imgflip returned an invalid meme catalog.');
			}

			const templates = payload.data.memes.map(normalizeMemeTemplate).filter(Boolean);
			if (templates.length === 0) {
				throw new Error('Imgflip returned no usable meme templates.');
			}
			return /** @type {DrawMemeTemplate[]} */ (templates);
		})
		.catch((error) => {
			if (cachedMemeTemplates === request) cachedMemeTemplates = undefined;
			throw error;
		});

	cachedMemeTemplates = request;
	return request;
}

/**
 * Search names and aliases without sending the user's query to any server.
 *
 * @param {string} query
 * @param {DrawMemeTemplate[]} [templates]
 * @returns {DrawMemeTemplate[]}
 */
export function searchMemeTemplates(query, templates = DRAW_MEME_TEMPLATES) {
	const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return templates;

	return templates.filter((template) => {
		const searchableText = `${template.name} ${template.keywords.join(' ')}`.toLocaleLowerCase();
		return terms.every((term) => searchableText.includes(term));
	});
}
