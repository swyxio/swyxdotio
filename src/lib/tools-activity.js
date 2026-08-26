/** Small metadata-only vocabulary shared by the dashboard, clients, and durable ledger. */
export const TOOLS_ACTIVITY_TOOLS = Object.freeze({
	draw: 'Draw',
	box: 'Big text box',
	podcast: 'Podcast studio',
	reclip: 'Reclip'
});

/** @type {Record<string, {label: string, tool: 'draw'|'box'|'podcast'|'reclip', source: 'server'|'browser'}>} */
export const TOOLS_ACTIVITY_ACTIONS = Object.freeze({
	'draw.open': { label: 'Opened Draw', tool: 'draw', source: 'browser' },
	'box.open': { label: 'Opened big text box', tool: 'box', source: 'browser' },
	'draw.image.background-remove': {
		label: 'Removed image background',
		tool: 'draw',
		source: 'browser'
	},
	'draw.image.magic-select': { label: 'Selected image region', tool: 'draw', source: 'browser' },
	'draw.image.magic-eraser': { label: 'Erased image region', tool: 'draw', source: 'browser' },
	'draw.image.depth-blur': { label: 'Applied depth blur', tool: 'draw', source: 'browser' },
	'draw.image.vectorize': { label: 'Vectorized image', tool: 'draw', source: 'browser' },
	'draw.design.insert': { label: 'Inserted design', tool: 'draw', source: 'browser' },
	'draw.design.export': { label: 'Exported design', tool: 'draw', source: 'browser' },
	'draw.meme.insert': { label: 'Inserted meme', tool: 'draw', source: 'browser' },
	'draw.page.create': { label: 'Created cloud drawing', tool: 'draw', source: 'server' },
	'draw.page.save': { label: 'Saved cloud drawing', tool: 'draw', source: 'server' },
	'draw.page.delete': { label: 'Deleted cloud drawing', tool: 'draw', source: 'server' },
	'draw.ai.assistant': { label: 'Drawing assistant turn', tool: 'draw', source: 'server' },
	'draw.ai.media': { label: 'Cloud media generation', tool: 'draw', source: 'server' },
	'podcast.open': { label: 'Opened podcast studio', tool: 'podcast', source: 'server' },
	'podcast.upload.start': { label: 'Started podcast upload', tool: 'podcast', source: 'server' },
	'podcast.upload.complete': {
		label: 'Completed podcast upload',
		tool: 'podcast',
		source: 'server'
	},
	'podcast.upload.abort': { label: 'Aborted podcast upload', tool: 'podcast', source: 'server' },
	'podcast.archive.start': { label: 'Started archive upload', tool: 'podcast', source: 'server' },
	'podcast.archive.complete': {
		label: 'Completed archive upload',
		tool: 'podcast',
		source: 'server'
	},
	'podcast.archive.abort': { label: 'Aborted archive upload', tool: 'podcast', source: 'server' },
	'reclip.open': { label: 'Opened Reclip link', tool: 'reclip', source: 'server' }
});

export const TOOLS_ACTIVITY_COVERAGE = Object.freeze({
	server: 'best-effort',
	browser: 'best-effort',
	message:
		'This shows recorded activity, not complete usage. Browser events and tool logs may be missing when offline, blocked, rate limited, or unavailable. AI entries show admitted requests; reserved or submitted entries may have no final outcome. The site owner can inspect activity metadata and account name/email. Actual billed costs and activity inside external apps such as Reclip are unavailable.'
});
export const TOOLS_ACTIVITY_BROWSER_LIMIT = 120;
export const TOOLS_ACTIVITY_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @param {unknown} action @param {'browser'|'server'} [source] */
export function isToolsActivityAction(action, source) {
	return (
		typeof action === 'string' &&
		Object.hasOwn(TOOLS_ACTIVITY_ACTIONS, action) &&
		(!source || TOOLS_ACTIVITY_ACTIONS[action].source === source)
	);
}

/** @param {unknown} value @param {'browser'|'server'} source */
export function validToolsActivityInput(value, source) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const body = /** @type {Record<string, unknown>} */ (value);
	return (
		Object.keys(body).length === 3 &&
		Object.keys(body).every((key) => ['id', 'action', 'status'].includes(key)) &&
		typeof body.id === 'string' &&
		TOOLS_ACTIVITY_ID_PATTERN.test(body.id) &&
		isToolsActivityAction(body.action, source) &&
		!String(body.action).startsWith('draw.ai.') &&
		['succeeded', 'failed', 'cancelled'].includes(/** @type {string} */ (body.status))
	);
}

/** @param {URLSearchParams} params */
export function parseToolsActivityFilters(params) {
	if (
		[...params.keys()].some((key) => !['days', 'kind', 'tool', 'before', 'scope'].includes(key)) ||
		[...new Set(params.keys())].some((key) => params.getAll(key).length !== 1)
	)
		return null;
	const days = params.get('days') ?? '7';
	const kind = params.get('kind') ?? 'all';
	const scope = params.get('scope') ?? 'mine';
	const tool = params.get('tool') ?? 'all';
	const before = params.get('before');
	if (
		!['1', '7', '30'].includes(days) ||
		!['all', 'ai', 'tool'].includes(kind) ||
		!['mine', 'all'].includes(scope) ||
		!['all', ...Object.keys(TOOLS_ACTIVITY_TOOLS)].includes(tool) ||
		(before !== null && (!/^[A-Za-z0-9_-]+$/.test(before) || before.length > 768))
	)
		return null;
	return { days: Number(days), kind, tool, before, scope };
}
