// Never carry temporary authentication credentials into a long-lived library.
const credentialKey =
	/^(access_token|refresh_token|id_token|token|client_secret|password|passwd|authorization|oauth_token|session_id)$/i;

/** @param {string} raw */
export function safeCapturedUrl(raw) {
	try {
		const url = new URL(raw);
		let changed = Boolean(url.username || url.password);
		url.username = '';
		url.password = '';
		const authPath = /oauth|authorize|callback|login|signin/i.test(url.pathname);
		for (const key of [...url.searchParams.keys()]) {
			if (credentialKey.test(key) || (authPath && /^code$/i.test(key))) {
				url.searchParams.set(key, '[redacted]');
				changed = true;
			}
		}
		if (/(?:^|[&#?])(access_token|refresh_token|id_token|token)=/i.test(url.hash.slice(1))) {
			url.hash = '';
			changed = true;
		}
		return changed ? url.href : raw;
	} catch {
		return raw;
	}
}

/** @type {Array<[string, RegExp]>} */
const groupRules = [
	[
		'AI models & research',
		/deepseek|openai|anthropic|claude|gpt-|llm|model|benchmark|inference|training|transformer|arxiv|huggingface|qwen|mistral|gemini/i
	],
	[
		'Agents & developer tools',
		/agent|codex|cursor|devin|coding|github|software|terminal|mcp|cloudflare|worker|forge|vercel|developer|api/i
	],
	['AI Engineer', /ai\.engineer|aie |sessionize|conference|speaker|sponsor|accelevents/i],
	['Latent Space & media', /latent\.space|youtube|substack|podcast|transcript/i],
	['Business & markets', /funding|valuation|market|startup|venture|finance|revenue/i],
	['Science & ideas', /math|science|research|essay|history|quanta/i],
	['Social & discussion', /x\.com|twitter\.com|news\.ycombinator\.com|linkedin\.com|reddit\.com/i],
	[
		'Operations & admin',
		/dashboard|admin|inbox|sheets|docs\.google|console|calendar|settings|account|review/i
	]
];

/** @param {string} text */
export function classifyTab(text) {
	return groupRules.find(([, pattern]) => pattern.test(text))?.[0] || 'Reading pile';
}

/** @param {string} value */
async function hashId(value) {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return [...new Uint8Array(bytes)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 16);
}

/** @param {unknown} input @param {string} capturedAt */
export async function makeCapturedItems(input, capturedAt) {
	if (!Array.isArray(input) || !input.length || input.length > 3000)
		throw new Error('Choose between 1 and 3,000 tabs.');
	const byUrl = new Map();
	for (const tab of input) {
		if (
			!tab ||
			typeof tab.url !== 'string' ||
			!tab.url.trim() ||
			tab.url.length > 8192 ||
			typeof tab.title !== 'string' ||
			tab.title.length > 1000
		)
			throw new Error('Each tab needs a title and a valid URL (up to 8,192 characters).');
		const url = safeCapturedUrl(tab.url.trim());
		let item = byUrl.get(url);
		if (!item) {
			let domain = 'local';
			try {
				domain = new URL(url).hostname.replace(/^www\./, '') || 'local';
			} catch {
				/* Preserve non-web addresses. */
			}
			item = {
				url,
				title: tab.title.trim() || url,
				domain,
				lastOpened: capturedAt,
				duplicateCount: 0,
				tabGroups: [],
				capturedWindowIds: [],
				private: true,
				cacheState: 'missing',
				wordCount: 0,
				summary: null
			};
			byUrl.set(url, item);
		}
		item.duplicateCount++;
		const group =
			typeof tab.tabGroup === 'string'
				? tab.tabGroup
				: typeof tab.group === 'string'
					? tab.group
					: '';
		if (group && !item.tabGroups.includes(group.slice(0, 200)))
			item.tabGroups.push(group.slice(0, 200));
		if (
			(typeof tab.windowId === 'string' || Number.isSafeInteger(tab.windowId)) &&
			String(tab.windowId).length <= 100 &&
			!item.capturedWindowIds.includes(String(tab.windowId))
		)
			item.capturedWindowIds.push(String(tab.windowId));
	}
	const items = await Promise.all(
		[...byUrl.values()].map(async (item) => ({
			...item,
			id: await hashId(item.url),
			group: classifyTab(`${item.title} ${item.url} ${item.tabGroups.join(' ')}`)
		}))
	);
	if (new Set(items.map((item) => item.id)).size !== items.length)
		throw new Error('Could not uniquely identify these tabs.');
	return items;
}
