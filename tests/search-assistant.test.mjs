import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchIndex, projectSearchCatalog } from '../src/lib/server/site-search.js';
import {
	createAnswerFilter,
	extractAssistantDelta,
	retrieveAssistantSources,
	readAssistantQuestion,
	handleAssistantSearch,
	ASSISTANT_MODEL,
	ASSISTANT_RESERVATION_MICROS
} from '../src/lib/server/search-assistant.js';
const base = 'https://swyx.io';
const items = [
	{
		title: 'CFP Advice',
		slug: 'cfp-advice',
		category: 'essay',
		content:
			'# Pick a Topic\n\nFind the intersection between your own interests and what the audience wants.\n\n' +
			'Useful conference advice. '.repeat(60)
	},
	{
		title: 'Private conference advice',
		slug: 'private',
		isPrivate: true,
		content: 'Secret advice.'
	}
];
const catalog = createSearchIndex(projectSearchCatalog(items), items);
function request(q = 'conference advice', headers = {}) {
	return new Request(base + '/api/search/ask', {
		method: 'POST',
		headers: {
			origin: base,
			'content-type': 'application/json',
			'cf-connecting-ip': '192.0.2.1',
			...headers
		},
		body: JSON.stringify({ q })
	});
}
function setup(overrides = {}) {
	const calls = [],
		reservations = [];
	const env = {
		AI: {
			async run(...args) {
				calls.push(args);
				return new ReadableStream({
					start(c) {
						c.enqueue(
							new TextEncoder().encode(
								'data: {"response":"Try a conference topic [1]."}\n\ndata: [DONE]\n\n'
							)
						);
						c.close();
					}
				});
			}
		},
		READ_COUNTERS: {},
		SEARCH_ASK_RATE_LIMITER: {
			async limit({ key }) {
				assert.match(key, /^[a-f0-9]{64}$/);
				return { success: true };
			}
		},
		...overrides
	};
	const options = {
		dev: false,
		loadCatalog: async () => catalog,
		async reserveBudget(...args) {
			reservations.push(args);
			return true;
		}
	};
	return { env, options, calls, reservations };
}
test('retrieval uses public full passages and matching heading URLs with bounded UTF-8 context', () => {
	const sources = retrieveAssistantSources(catalog, 'conference advice');
	assert.equal(sources[0].title, 'CFP Advice');
	assert.equal(sources[0].url, '/cfp-advice#pick-a-topic');
	assert.match(sources[0].text, /intersection/);
	assert(sources.every((s) => !s.url.includes('private')));
	assert(sources.reduce((sum, s) => sum + new TextEncoder().encode(s.text).length, 0) <= 5000);
	assert.deepEqual(retrieveAssistantSources(catalog, 'zzzzzzzzzzz'), []);
});
test('answer filter suppresses split reasoning and only emits known citation IDs', () => {
	const filter = createAnswerFilter(2);
	const chunks = [
		'<thi',
		'nk>private reasoning</thi',
		'nk>Useful [',
		'1] and [99',
		'] facts <b>bold</b> [2',
		'].'
	];
	assert.equal(
		chunks.map((x) => filter.push(x)).join('') + filter.push('', true),
		'Useful [1] and  facts bold [2].'
	);
	assert.equal(
		extractAssistantDelta({ choices: [{ delta: { reasoning_content: 'secret' } }] }),
		''
	);
	assert.equal(extractAssistantDelta({ choices: [{ delta: { content: 'public' } }] }), 'public');
	assert.equal(extractAssistantDelta({ response: 'old style' }), 'old style');
});
test('request validation rejects oversized chunked JSON and invalid questions', async () => {
	await assert.rejects(readAssistantQuestion(request('x'.repeat(121))));
	await assert.rejects(readAssistantQuestion(request('   ')));
	await assert.rejects(
		readAssistantQuestion(request('question', { 'content-type': 'text/plain' }))
	);
	const body = new ReadableStream({
		start(c) {
			c.enqueue(new Uint8Array(600));
			c.enqueue(new Uint8Array(600));
			c.close();
		}
	});
	await assert.rejects(
		readAssistantQuestion(
			new Request(base, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body,
				duplex: 'half'
			})
		),
		/body-size/
	);
});
test('same-origin, availability, rate and budget gates stop before inference', async () => {
	for (const condition of ['origin', 'dev', 'limiter', 'rate', 'budget', 'ip']) {
		const { env, options, calls } = setup();
		let req = request();
		if (condition === 'origin') req = request('question', { origin: 'https://evil.example' });
		if (condition === 'dev') options.dev = true;
		if (condition === 'limiter') delete env.SEARCH_ASK_RATE_LIMITER;
		if (condition === 'rate') env.SEARCH_ASK_RATE_LIMITER.limit = async () => ({ success: false });
		if (condition === 'budget') options.reserveBudget = async () => false;
		if (condition === 'ip') req.headers.delete('cf-connecting-ip');
		const response = await handleAssistantSearch(req, new URL(req.url), env, options);
		assert.equal(response.status, condition === 'origin' ? 403 : condition === 'rate' ? 429 : 503);
		assert.equal(calls.length, 0);
	}
});
test('empty retrieval is streamed without paying for inference', async () => {
	const { env, options, calls, reservations } = setup();
	const req = request('zzzzzzzzzzz');
	const response = await handleAssistantSearch(req, new URL(req.url), env, options);
	const text = await response.text();
	assert.match(text, /"sources":\[\]/);
	assert.match(text, /"status":"empty"/);
	assert.equal(calls.length, 0);
	assert.equal(reservations.length, 0);
});
test('one reserved non-thinking model call streams normalized safe tokens and metadata only', async () => {
	const { env, options, calls, reservations } = setup();
	env.AI.run = async (...args) => {
		calls.push(args);
		const frame =
			'data: {"choices":[{"delta":{"reasoning_content":"secret"}}]}\r\n\r\ndata: {"response":"<think>secret</think>Choose a topic ["}\n\ndata: {"choices":[{"delta":{"content":"1]. [80]"}}]}\n\ndata: [DONE]\n\n';
		const bytes = new TextEncoder().encode(frame);
		return new ReadableStream({
			start(c) {
				for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7));
				c.close();
			}
		});
	};
	const req = request();
	const response = await handleAssistantSearch(req, new URL(req.url), env, options);
	const raw = await response.text();
	const events = raw
		.split('\n\n')
		.filter(Boolean)
		.map((frame) => ({
			event: frame.split('\n')[0].slice(7),
			data: JSON.parse(frame.split('\n')[1].slice(6))
		}));
	assert.equal(events[0].event, 'sources');
	assert(!('text' in events[0].data.sources[0]));
	assert.equal(
		events
			.filter((x) => x.event === 'token')
			.map((x) => x.data.text)
			.join(''),
		'Choose a topic [1]. '
	);
	assert.equal(events.at(-1).data.status, 'complete');
	assert.equal(calls.length, 1);
	assert.equal(calls[0][0], ASSISTANT_MODEL);
	assert.equal(calls[0][1].max_tokens, 450);
	assert.equal(calls[0][2].gateway.id, 'swyx-shared');
	assert.match(calls[0][1].messages[1].content, /\/no_think$/);
	assert.equal(reservations[0][1], ASSISTANT_RESERVATION_MICROS);
});
test('slow provider reaches deadline once and cancels late stream without retry', async () => {
	const { env, options, calls, reservations } = setup();
	let cancelled = 0;
	env.AI.run = async (...args) => {
		calls.push(args);
		await new Promise((r) => setTimeout(r, 25));
		return new ReadableStream({
			cancel() {
				cancelled++;
			}
		});
	};
	options.deadlineMs = 5;
	const req = request();
	const response = await handleAssistantSearch(req, new URL(req.url), env, options);
	assert.match(await response.text(), /"status":"timeout"/);
	await new Promise((r) => setTimeout(r, 35));
	assert.equal(calls.length, 1);
	assert.equal(cancelled, 1);
	assert.equal(reservations.length, 1);
});
test('provider DONE closes public stream and cancels an upstream that remains open', async () => {
	const { env, options, calls } = setup();
	let cancelled = 0;
	env.AI.run = async (...args) => {
		calls.push(args);
		return new ReadableStream({
			start(c) {
				c.enqueue(new TextEncoder().encode('data: {"response":"Answer [1]"}\n\ndata: [DONE]\n\n'));
			},
			cancel() {
				cancelled++;
			}
		});
	};
	const req = request();
	const response = await handleAssistantSearch(req, new URL(req.url), env, options);
	assert.match(await response.text(), /"status":"complete"/);
	assert.equal(cancelled, 1);
	assert.equal(calls.length, 1);
});
test('provider failure keeps the reservation and does not retry', async () => {
	const { env, options, calls, reservations } = setup();
	env.AI.run = async (...args) => {
		calls.push(args);
		throw new Error('provider failure');
	};
	const req = request();
	const response = await handleAssistantSearch(req, new URL(req.url), env, options);
	assert.match(await response.text(), /"status":"unavailable"/);
	assert.equal(calls.length, 1);
	assert.equal(reservations.length, 1);
});

test('answers use article prose rather than metadata-only talks and related-link lists', () => {
	const items = [
		{
			title: 'Learn In Public',
			slug: 'learn',
			category: 'essay',
			content:
				'# Practice\n\nCreate something useful as you learn in public. Share small notes and accept corrections.\n\n# Related links\n\nLearn public learn public learn public other link resources.'
		},
		{
			title: 'Learn In Public',
			slug: 'talk',
			category: 'talk',
			instances: [{ video: 'https://youtube.com/example' }],
			description: 'Learn public learn public.'
		}
	];
	const sources = retrieveAssistantSources(
		createSearchIndex(projectSearchCatalog(items), items),
		'How should I learn in public?'
	);
	assert(sources.length);
	assert(sources.every((s) => s.url === '/learn#practice'));
	assert.match(sources[0].text, /accept corrections/);
});

test('specific questions favor passages matching the complete query before partial matches', () => {
	const items = [
		{
			title: 'CFP Advice',
			slug: 'cfp',
			category: 'essay',
			content:
				'# Pick a Topic\n\nPick a topic for your conference talk at the intersection of your interests and what the audience wants.'
		},
		{
			title: 'Conference Talks',
			slug: 'recording',
			category: 'essay',
			content:
				'# During the Talk\n\nThis conference talk is a talk about recording a conference talk. Check your microphone before the talk.'
		}
	];
	const sources = retrieveAssistantSources(
		createSearchIndex(projectSearchCatalog(items), items),
		'How do I pick a topic for my conference talk?'
	);
	assert.equal(sources[0].url, '/cfp#pick-a-topic');
	assert(sources.every((s) => s.title === 'CFP Advice'));
});
