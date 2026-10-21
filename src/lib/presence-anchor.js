// Public content blocks are accompanied by a fingerprint so changed markup
// falls back to the ordinary document position instead of the wrong passage.
const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,figure,img,table,video';
const MEDIA = 'img,video,audio,source,iframe,embed,object,image,use';

function contentRoot() {
	return document.querySelector('article.reading-prose') || document.querySelector('main#skip');
}

/** @param {string} source */
function publicMediaSource(source) {
	try {
		if (!source || source.startsWith('#')) return '';
		const url = new URL(source, location.href);
		if (!['http:', 'https:'].includes(url.protocol)) return '';
		// Query strings and fragments can contain visitor-specific information.
		return `${url.origin}${url.pathname}`;
	} catch {
		return '';
	}
}

/** @param {Element} block @param {Element} root */
function blockFingerprint(block, root) {
	let text;
	if (root.matches('article.reading-prose')) {
		const content = (block.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 512);
		if (content) {
			text = `${block.tagName}:${content}`;
		} else {
			const media = [...(block.matches(MEDIA) ? [block] : []), ...block.querySelectorAll(MEDIA)];
			const sources = media.flatMap((element) =>
				['src', 'srcset', 'poster', 'data', 'href'].flatMap((attribute) => {
					const raw = element.getAttribute(attribute);
					if (!raw || (attribute === 'srcset' && raw.includes('data:'))) return [];
					const values = attribute === 'srcset' ? raw.split(',') : [raw];
					return values.flatMap((value) => {
						const source = publicMediaSource(value.trim().split(/\s+/, 1)[0]);
						return source ? [`${element.tagName}:${attribute}:${source}`] : [];
					});
				})
			);
			// Empty blocks with no public source cannot be matched reliably.
			if (!sources.length) return null;
			text = `${block.tagName}:${sources.join('|')}`;
		}
	} else {
		// A listing can contain the visitor's search query. Identify public page
		// blocks structurally rather than hashing potentially private input.
		const parts = [];
		/** @type {Element | null} */
		let element = block;
		while (element && element !== root) {
			/** @type {HTMLElement | null} */
			const parent = element.parentElement;
			if (!parent) break;
			parts.push(`${element.tagName}:${Array.prototype.indexOf.call(parent.children, element)}`);
			element = parent;
		}
		const link = block.closest('a[href]') || block.querySelector('a[href]');
		const href = link?.getAttribute('href')?.split(/[?#]/, 1)[0] || '';
		// A canonical single-segment path identifies a public post without its query.
		if (/^\/[a-z0-9][a-z0-9_-]*\/?$/i.test(href)) parts.push(href);
		text = parts.join('/');
	}
	let hash = 2166136261;
	for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
	return hash >>> 0;
}

/**
 * Identify the public content block under a viewport point without transmitting any
 * page text. For reading depth, look through overlays and nearby whitespace.
 * @param {number} x @param {number} y @param {boolean} readingDepth
 * @returns {[number, number, number, number] | null}
 */
export function capturePresenceAnchor(x, y, readingDepth) {
	const article = contentRoot();
	if (!article) return null;
	if (readingDepth) {
		const rect = article.getBoundingClientRect();
		x = Math.max(0, Math.min(window.innerWidth - 1, (rect.left + rect.right) / 2));
	}
	let block = null;
	for (const delta of readingDepth ? [0, -20, 20, -40, 40, -80, 80] : [0]) {
		const sampleY = y + delta;
		if (x < 0 || x >= window.innerWidth || sampleY < 0 || sampleY >= window.innerHeight) continue;
		const elements = document.elementsFromPoint(x, sampleY);
		for (const element of readingDepth ? elements : elements.slice(0, 1)) {
			if (!article.contains(element)) continue;
			const candidate = element.closest(BLOCKS);
			if (candidate && article.contains(candidate)) {
				block = candidate;
				break;
			}
		}
		if (block) break;
	}
	if (!block) return null;
	const blocks = article.querySelectorAll(BLOCKS);
	const index = Array.prototype.indexOf.call(blocks, block);
	const rect = block.getBoundingClientRect();
	if (index < 0 || index > 65_535 || rect.width <= 0 || rect.height <= 0) return null;
	const fingerprint = blockFingerprint(block, article);
	if (fingerprint === null) return null;
	const fraction = (/** @type {number} */ value) =>
		Math.round(Math.max(0, Math.min(1, value)) * 10_000);
	return [
		index,
		fraction((x - rect.left) / rect.width),
		fraction((y - rect.top) / rect.height),
		fingerprint
	];
}

/**
 * Resolve a validated anchor in this layout. A changed or ambiguous block
 * produces null and the caller falls back to document depth.
 * @param {[number, number, number, number] | null | undefined} anchor
 */
export function resolvePresenceAnchor(anchor) {
	if (!anchor) return null;
	const article = contentRoot();
	if (!article) return null;
	const blocks = article.querySelectorAll(BLOCKS);
	let block = blocks[anchor[0]];
	if (!block || blockFingerprint(block, article) !== anchor[3]) {
		const matches = Array.from(blocks).filter(
			(candidate) => blockFingerprint(candidate, article) === anchor[3]
		);
		if (matches.length !== 1) return null;
		block = matches[0];
	}
	const rect = block.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) return null;
	return {
		x: rect.left + (rect.width * anchor[1]) / 10_000,
		y: rect.top + (rect.height * anchor[2]) / 10_000
	};
}
