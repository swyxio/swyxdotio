import test from 'node:test';
import assert from 'node:assert/strict';
import {
	MAX_SHARE_QUOTE_LENGTH,
	buildSharePayload,
	getEligibleSelection,
	isShareableQuote,
	normalizeShareQuote,
	truncateShareQuote
} from '../src/lib/share-quote.js';

test('normalizes whitespace and rejects short selections', () => {
	assert.equal(normalizeShareQuote('  hello\n\t public   notebook  '), 'hello public notebook');
	assert.equal(isShareableQuote('too short'), false);
	assert.equal(isShareableQuote('twelve chars!'), true);
});

test('caps quotes at a clean word boundary with a single ellipsis', () => {
	const quote = Array.from({ length: 50 }, (_, index) => `thought${index}`).join(' ');
	const result = truncateShareQuote(quote);
	assert.ok(result.length <= MAX_SHARE_QUOTE_LENGTH);
	assert.match(result, /…$/u);
	assert.doesNotMatch(result, /\s…$/u);
});

test('builds canonical native, clipboard, and X payloads', () => {
	const payload = buildSharePayload({
		quote: '  Learn   in public. ',
		title: 'swyx.io',
		url: 'https://www.swyx.io/learn-in-public'
	});
	assert.equal(payload.text, '“Learn in public.”\n\n— swyx.io');
	assert.equal(payload.copyText, `${payload.text}\nhttps://www.swyx.io/learn-in-public`);
	const intent = new URL(payload.xIntent);
	assert.equal(intent.origin, 'https://twitter.com');
	assert.equal(intent.searchParams.get('text'), payload.text);
	assert.equal(intent.searchParams.get('url'), payload.url);
});

test('builds a page-share payload when there is no selected quote', () => {
	const payload = buildSharePayload({ title: 'Ideas', url: 'https://www.swyx.io/ideas' });
	assert.equal(payload.text, 'Ideas');
	assert.equal(payload.copyText, 'Ideas\nhttps://www.swyx.io/ideas');
});

test('accepts only meaningful selections entirely inside main content', () => {
	const main = { contains: (node) => node.inside === true };
	const articleElement = { nodeType: 1, inside: true, closest: () => null };
	const ignoredElement = {
		nodeType: 1,
		inside: true,
		closest: () => ({ tagName: 'TEXTAREA' })
	};
	const rect = { left: 10, top: 20, width: 90, height: 18 };
	const makeSelection = (element) => ({
		isCollapsed: false,
		rangeCount: 1,
		toString: () => 'A meaningful notebook highlight',
		getRangeAt: () => ({
			startContainer: element,
			endContainer: element,
			getBoundingClientRect: () => rect
		})
	});
	const documentRef = { querySelector: () => main };

	assert.deepEqual(getEligibleSelection(makeSelection(articleElement), documentRef), {
		quote: 'A meaningful notebook highlight',
		rect
	});
	assert.equal(getEligibleSelection(makeSelection(ignoredElement), documentRef), null);
	assert.equal(
		getEligibleSelection(makeSelection({ ...articleElement, inside: false }), documentRef),
		null
	);
});
