import assert from 'node:assert/strict';
import test from 'node:test';
import {
	parseCreativeTranscript,
	chunkCreativeTranscript,
	validateCreativeQuotes,
	normalizeYouTubeChannel,
	normalizeYouTubeVideo,
	createArtDirections,
	creativeSourceFingerprint,
	planCreativeSourceRun,
	selectCreativeEvidence,
	MAX_CREATIVE_SOURCE_CHARS
} from '../src/lib/draw-creative-sources.js';
import {
	runCreativeSource,
	CREATIVE_SOURCE_MODEL,
	MAX_CREATIVE_REQUEST_BYTES
} from '../src/lib/server/draw-creative-sources.js';
import { createToolsSession } from '../src/lib/server/tools-auth.js';
import { createTestAiLedger } from './helpers/tools-ai-ledger.mjs';
import {
	referenceCatalog,
	emptyFewShot,
	fewShotPrompt
} from '../src/lib/draw-creative-examples.js';

const SECRET = 'creative-source-test-secret-never-production';
const USER = { id: 'member-google-sub', email: 'member@example.com', name: 'Test Member' };
const CHANNEL = 'UC' + 'a'.repeat(22);
const PLAYLIST = 'UU' + 'a'.repeat(22);
const VIDEO = 'dQw4w9WgXcQ';
const SOURCE =
	'Alice: Reliable agents need explicit checkpoints.\nBob: Small workflows are easier to inspect.';

test('thumbnail retrieval uses a fixed YouTube image path with private bounded bytes and no AI or persistence', async () => {
	const calls = [];
	const jpeg = new Uint8Array([255, 216, 255, 224, 0, 0, 255, 217]);
	const response = await runCreativeSource(await event({ action: 'thumbnail', videoId: VIDEO }), {
		fetcher: async (url, options) => {
			calls.push(String(url));
			assert.equal(options.redirect, 'error');
			return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
		}
	});
	assert.equal(response.status, 200);
	assert.deepEqual(calls, [`https://i.ytimg.com/vi/${VIDEO}/hqdefault.jpg`]);
	assert.equal(response.headers.get('cache-control'), 'private, no-store');
	assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
	for (const body of [
		{ action: 'thumbnail', videoId: '../secret' },
		{ action: 'thumbnail', videoId: VIDEO, url: 'https://private.example' }
	]) {
		assert.equal(
			(
				await runCreativeSource(await event(body), {
					fetcher: async () => {
						throw new Error('Must not fetch');
					}
				})
			).status,
			422
		);
	}
});

test('thumbnail failures, mismatched sessions and unsafe MIME do not return provider content', async () => {
	const body = { action: 'thumbnail', videoId: VIDEO };
	for (const options of [{ authenticated: false }, { expectedUser: 'stale-account' }]) {
		assert.ok(
			[401, 409].includes(
				(
					await runCreativeSource(await event(body, options), {
						fetcher: async () => {
							assert.fail('Unauthorized fetch');
						}
					})
				).status
			)
		);
	}
	for (const provider of [
		new Response('<svg>private</svg>', { headers: { 'Content-Type': 'image/svg+xml' } }),
		new Response('unavailable', { status: 404 }),
		new Response('too large', {
			headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(3 * 1024 * 1024) }
		})
	]) {
		const response = await runCreativeSource(await event(body), { fetcher: async () => provider });
		assert.equal(response.status, 503);
		assert.equal(
			(await response.json()).error,
			'This thumbnail is unavailable. Nothing was saved or attached.'
		);
	}
});

async function event(body, options = {}) {
	const url = new URL('https://swyx.io/tools/api/draw/creative-source');
	const ledger = options.ledger ?? createTestAiLedger();
	const token =
		options.authenticated === false ? undefined : await createToolsSession(USER, SECRET);
	return {
		url,
		request: new Request(url, {
			method: 'POST',
			signal: options.signal,
			headers: {
				Origin: options.origin ?? url.origin,
				'Content-Type': options.contentType ?? 'application/json',
				'X-Tools-User': options.expectedUser ?? USER.id,
				...(options.contentLength ? { 'Content-Length': options.contentLength } : {})
			},
			body: JSON.stringify(body)
		}),
		cookies: { get: () => token },
		platform: {
			env: {
				TOOLS_SESSION_SECRET: SECRET,
				TOOLS_OWNER_GOOGLE_SUB: 'different-owner',
				DRAW_PAGES: options.noLedger ? undefined : ledger.namespace,
				AI: options.ai,
				YOUTUBE_API_KEY: options.youtubeKey
			}
		}
	};
}

function quoteOutput(text = SOURCE) {
	const source = parseCreativeTranscript(text);
	const segment = chunkCreativeTranscript(source)[0].segments[0];
	return { response: { quotes: [{ segmentId: segment.id, text: segment.text }] } };
}

test('TXT spans retain original CRLF, Unicode and explicit speaker labels; no fabricated timestamps', () => {
	const input = '  Alice: Ship 🦉 carefully.\r\nBob: Keep the original.';
	const source = parseCreativeTranscript(input);
	assert.equal(source.text, input);
	assert.deepEqual(
		source.segments.map((s) => s.speaker),
		['Alice', 'Bob']
	);
	for (const segment of source.segments) {
		assert.equal(input.slice(segment.startOffset, segment.endOffset), segment.text);
		assert.equal(segment.startMs, null);
	}
	assert.equal(source.segments[0].text, 'Ship 🦉 carefully.');
});

test('SRT and VTT preserve exact offsets and cue-level timestamps, including voice labels', () => {
	const srt =
		'1\r\n00:00:02,500 --> 00:00:04,000\r\nAlice: Check every quote.\r\n\r\n2\r\n00:00:04,000 --> 00:00:06,000\r\nKeep the evidence.';
	const source = parseCreativeTranscript(srt);
	assert.equal(source.format, 'srt');
	assert.equal(source.segments.length, 2);
	assert.equal(source.segments[0].startMs, 2500);
	assert.equal(source.segments[0].endMs, 4000);
	assert.equal(source.segments[1].speaker, null);
	const vtt =
		'WEBVTT\n\nNOTE ignored reference\nNot spoken\n\ncue-1\n00:02.500 --> 00:04.000 align:start\n<v Jane Smith>Use the real source.</v>\n';
	const parsed = parseCreativeTranscript(vtt);
	assert.equal(parsed.segments.length, 1);
	assert.equal(parsed.segments[0].speaker, 'Jane Smith');
	assert.equal(parsed.segments[0].text, 'Use the real source.');
	assert.equal(
		vtt.slice(parsed.segments[0].startOffset, parsed.segments[0].endOffset),
		'Use the real source.'
	);
	assert.equal(parsed.segments[0].startMs, 2500);
});

test('plain text timestamps with and without speaker labels remain source-backed', () => {
	const text = '[00:01:02] Alice: Keep exact quotes.\n00:02:00 The next observation.';
	const source = parseCreativeTranscript(text);
	assert.deepEqual(
		source.segments.map(({ startMs, speaker }) => ({ startMs, speaker })),
		[
			{ startMs: 62_000, speaker: 'Alice' },
			{ startMs: 120_000, speaker: null }
		]
	);
	assert.ok(
		source.segments.every(
			(segment) => text.slice(segment.startOffset, segment.endOffset) === segment.text
		)
	);
	assert.ok(source.segments.every((segment) => segment.endMs === null));
});

test('malformed timestamps and oversized sources fail explicitly instead of truncating', () => {
	assert.throws(
		() => parseCreativeTranscript('1\n00:99:02,500 --> 00:00:04,000\nOops'),
		/timestamp/
	);
	assert.throws(
		() => parseCreativeTranscript('x'.repeat(MAX_CREATIVE_SOURCE_CHARS + 1)),
		/nothing was truncated/
	);
	assert.throws(() => parseCreativeTranscript(''), /transcript/);
});

test('chunking covers every segment character once, including long lines and surrogate boundaries', () => {
	const text =
		'🦉'.repeat(10_000) + '\n' + Array.from({ length: 160 }, (_, i) => `Line ${i}.`).join('\n');
	const source = parseCreativeTranscript(text);
	const chunks = chunkCreativeTranscript(source, { maxChars: 257 });
	assert.ok(chunks.length > 70);
	assert.equal(
		chunks
			.flatMap((c) => c.segments)
			.map((s) => s.text)
			.join(''),
		source.segments.map((s) => s.text).join('')
	);
	chunks.forEach((chunk, index) => {
		assert.equal(chunk.index, index);
		assert.ok(chunk.segments.length <= 80);
		assert.ok(chunk.segments.reduce((n, s) => n + s.text.length, 0) <= 257);
		chunk.segments.forEach((s) => {
			assert.equal(text.slice(s.startOffset, s.endOffset), s.text);
			assert.ok(!/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(s.text));
		});
	});
});

test('quotes reject invented, ambiguous, mismatched-offset and forged-speaker text', () => {
	const source = parseCreativeTranscript(SOURCE);
	const chunks = chunkCreativeTranscript(source);
	const segment = chunks[0].segments[0];
	const raw = { segmentId: segment.id, text: 'explicit checkpoints' };
	const [quote] = validateCreativeQuotes([raw], source, chunks);
	assert.equal(quote.provenance, 'source-exact');
	assert.equal(quote.speaker, 'Alice');
	assert.equal(quote.reviewRequired, true);
	assert.equal(SOURCE.slice(quote.startOffset, quote.endOffset), quote.text);
	assert.throws(
		() => validateCreativeQuotes([{ ...raw, text: 'invented' }], source, chunks),
		/exact source span/
	);
	assert.throws(
		() => validateCreativeQuotes([{ ...raw, startOffset: 0 }], source, chunks),
		/offsets/
	);
	assert.throws(
		() => validateCreativeQuotes([{ ...raw, speaker: 'Famous CEO' }], source, chunks),
		/speaker/
	);
	const repeated = parseCreativeTranscript('word word');
	const repeatedChunks = chunkCreativeTranscript(repeated);
	assert.throws(
		() =>
			validateCreativeQuotes(
				[{ segmentId: repeatedChunks[0].segments[0].id, text: 'word' }],
				repeated,
				repeatedChunks
			),
		/unambiguous/
	);
});

test('channel and unlisted-video normalization rejects arbitrary hosts, userinfo, paths and credentials', () => {
	assert.equal(normalizeYouTubeChannel('@LatentSpace').kind, 'handle');
	assert.equal(
		normalizeYouTubeChannel(`https://www.youtube.com/channel/${CHANNEL}`).value,
		CHANNEL
	);
	assert.equal(
		normalizeYouTubeChannel('https://youtube.com/@LatentSpace/videos').value,
		'@LatentSpace'
	);
	for (const url of [
		'https://youtube.com.evil/@handle',
		'https://evil@youtube.com/@handle',
		'http://youtube.com/@handle',
		'https://youtube.com/c/name',
		'https://youtube.com/@name/../../admin'
	])
		assert.throws(() => normalizeYouTubeChannel(url));
	assert.deepEqual(
		normalizeYouTubeVideo(`https://youtu.be/${VIDEO}?si=secret`).url,
		`https://www.youtube.com/watch?v=${VIDEO}`
	);
	assert.equal(
		normalizeYouTubeVideo(`https://youtube.com/watch?v=${VIDEO}`).status,
		'transcript-required'
	);
	for (const url of [
		'file:///etc/passwd',
		'https://localhost/private',
		'https://youtube.com.evil/watch?v=' + VIDEO
	])
		assert.throws(() => normalizeYouTubeVideo(url));
});

test('four art directions are diverse labeled presets, never fake AI or approved brand output', () => {
	const directions = createArtDirections('Inspect the evidence');
	assert.equal(new Set(directions.map((d) => d.composition)).size, 4);
	assert.ok(
		directions.every(
			(d) =>
				d.provenance === 'preset' &&
				d.hook === 'Inspect the evidence' &&
				d.guardrails.includes('Not an approved AIE')
		)
	);
});

test('bounded source preflight defaults to four requests, resumes verified successful chunks, and estimates all remaining work', () => {
	const source = parseCreativeTranscript('A'.repeat(70_000));
	const first = planCreativeSourceRun(source);
	assert.equal(first.run.length, 4);
	assert.equal(first.chunks.length, 6);
	assert.equal(first.estimatedRunUsd, 0.2);
	assert.equal(first.estimatedRemainingUsd, 0.3);
	const metadata = first.run.map((chunk) => ({ ...chunk, status: 'succeeded' }));
	metadata[2].status = 'failed';
	metadata[1].startOffset = 10; // stale resume metadata does not count as coverage
	const resume = planCreativeSourceRun(source, metadata, 2);
	assert.deepEqual(
		resume.run.map((chunk) => chunk.index),
		[1, 2]
	);
	assert.equal(resume.completed, 2);
	assert.equal(resume.estimatedRunUsd, 0.1);
	assert.throws(() => planCreativeSourceRun(source, [], 9), /one to eight/);
});

test('source fingerprint changes with exact text or video URL and never exposes source content', async () => {
	const fingerprint = await creativeSourceFingerprint(SOURCE);
	assert.match(fingerprint, /^[a-f0-9]{64}$/);
	assert.equal(fingerprint, await creativeSourceFingerprint(SOURCE));
	assert.notEqual(fingerprint, await creativeSourceFingerprint(SOURCE + ' '));
	assert.notEqual(
		fingerprint,
		await creativeSourceFingerprint(SOURCE, `https://youtu.be/${VIDEO}`)
	);
});

test('title evidence selection is explicit, distinct, bounded, and rejects unavailable IDs', () => {
	const source = parseCreativeTranscript(SOURCE);
	const quotes = validateCreativeQuotes(
		quoteOutput().response.quotes,
		source,
		chunkCreativeTranscript(source)
	);
	assert.deepEqual(selectCreativeEvidence(quotes, [quotes[0].id]), quotes);
	assert.throws(() => selectCreativeEvidence(quotes, []), /1–80/);
	assert.throws(() => selectCreativeEvidence(quotes, [quotes[0].id, quotes[0].id]), /distinct/);
	assert.throws(() => selectCreativeEvidence(quotes, ['missing']), /no longer/);
	const large = Array.from({ length: 80 }, (_, i) => ({
		...quotes[0],
		id: `q${i}`,
		text: 'a'.repeat(600)
	}));
	assert.throws(
		() =>
			selectCreativeEvidence(
				large,
				large.map((quote) => quote.id)
			),
		/32 KB/
	);
});

test('source API checks session, stale account and origin before provider or usage calls', async () => {
	const body = { action: 'analyze', sourceText: SOURCE, chunkIndex: 0 };
	assert.equal((await runCreativeSource(await event(body, { authenticated: false }))).status, 401);
	assert.equal(
		(await runCreativeSource(await event(body, { expectedUser: 'old-account' }))).status,
		409
	);
	await assert.rejects(
		() => event(body, { origin: 'https://evil.example' }).then((e) => runCreativeSource(e)),
		(e) => e.status === 403
	);
	assert.equal(
		(await runCreativeSource(await event(body, { contentType: 'text/plain' }))).status,
		415
	);
	assert.equal(
		(
			await runCreativeSource(
				await event(body, { contentLength: String(MAX_CREATIVE_REQUEST_BYTES + 1) })
			)
		).status,
		413
	);
});

test('normal members use native JSON schema, exact evidence and metadata-only durable quota', async () => {
	const calls = [];
	const ledger = createTestAiLedger();
	const response = await runCreativeSource(
		await event(
			{ action: 'analyze', sourceText: SOURCE, chunkIndex: 0, hints: 'Find a useful tension.' },
			{
				ledger,
				ai: {
					run: async (...args) => {
						calls.push(args);
						return quoteOutput();
					}
				}
			}
		)
	);
	assert.equal(response.status, 200);
	assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
	const result = await response.json();
	assert.equal(result.quotes[0].speaker, 'Alice');
	assert.equal(result.coverage.status, 'complete');
	assert.equal(calls[0][0], CREATIVE_SOURCE_MODEL);
	assert.equal(calls[0][1].response_format.type, 'json_schema');
	assert.equal(calls[0][1].response_format.json_schema.additionalProperties, false);
	assert.equal(calls[0][1].tools, undefined);
	assert.match(calls[0][1].messages[0].content, /untrusted source data/);
	assert.deepEqual(
		ledger.calls.map((c) => c.path),
		['/ai/admit', '/ai/finish']
	);
	assert.equal(ledger.calls[0].body.userId, USER.id);
	assert.equal(ledger.calls[1].body.status, 'succeeded');
	assert.ok(!JSON.stringify(ledger.calls).includes('checkpoints'));
	assert.equal(result.costBasis, 'reservation');
});

test('source API rejects an oversized streamed body without a Content-Length before inference', async () => {
	let calls = 0;
	const requestEvent = await event(
		{ action: 'analyze', sourceText: 'x'.repeat(MAX_CREATIVE_REQUEST_BYTES), chunkIndex: 0 },
		{
			ai: {
				run: async () => {
					calls++;
					return quoteOutput();
				}
			}
		}
	);
	assert.equal(requestEvent.request.headers.has('content-length'), false);
	const response = await runCreativeSource(requestEvent);
	assert.equal(response.status, 413);
	assert.equal(calls, 0);
});

test('bounded chunk output reports partial coverage; later chunk contains the source tail', async () => {
	const text = 'a'.repeat(12_100);
	const source = parseCreativeTranscript(text);
	const chunks = chunkCreativeTranscript(source);
	let sent;
	const response = await runCreativeSource(
		await event(
			{ action: 'analyze', sourceText: text, chunkIndex: 1 },
			{
				ai: {
					run: async (_, input) => {
						sent = JSON.parse(input.messages[1].content);
						return { response: { quotes: [] } };
					}
				}
			}
		)
	);
	const result = await response.json();
	assert.equal(result.coverage.status, 'partial');
	assert.equal(result.coverage.totalChunks, 2);
	assert.equal(sent.segments[0].text, chunks[1].segments[0].text);
	assert.equal(sent.segments[0].text.length, 100);
});

test('forged model evidence, extra keys and truncation settle failure without publishing partial output', async () => {
	for (const output of [
		{ response: { quotes: [{ segmentId: 's0:7', text: 'Invented claim' }] } },
		{ response: { quotes: [], unexpected: 'secret' } },
		{ choices: [{ finish_reason: 'length', message: { content: '{"quotes":[]}' } }] }
	]) {
		const ledger = createTestAiLedger();
		const response = await runCreativeSource(
			await event(
				{ action: 'analyze', sourceText: SOURCE, chunkIndex: 0 },
				{ ledger, ai: { run: async () => output } }
			)
		);
		assert.equal(response.status, 502);
		assert.equal(ledger.calls.at(-1).body.status, 'failed');
		assert.equal((await response.json()).quotes, undefined);
	}
});

test('missing ledger/provider and quota rejection never call AI; request cancellation before submit is honored', async () => {
	let runs = 0;
	const ai = {
		run: async () => {
			runs++;
			return quoteOutput();
		}
	};
	const body = { action: 'analyze', sourceText: SOURCE, chunkIndex: 0 };
	assert.equal((await runCreativeSource(await event(body, { noLedger: true, ai }))).status, 503);
	assert.equal((await runCreativeSource(await event(body))).status, 503);
	const rejected = await event(body, { ai });
	rejected.platform.env.DRAW_PAGES = {
		idFromName: (n) => n,
		get: () => ({
			fetch: async () => new Response(JSON.stringify({ error: 'Limit reached' }), { status: 429 })
		})
	};
	assert.equal((await runCreativeSource(rejected)).status, 429);
	assert.equal(runs, 0);
	const cancelled = await event(body, { ai });
	const controller = new AbortController();
	controller.abort();
	cancelled.request = new Request(cancelled.request, { signal: controller.signal });
	assert.equal((await runCreativeSource(cancelled)).status, 409);
	assert.equal(runs, 0);
});

test('titles cite validated evidence, remain generated and cannot cite missing quotes', async () => {
	const source = parseCreativeTranscript(SOURCE);
	const chunks = chunkCreativeTranscript(source);
	const evidence = validateCreativeQuotes(quoteOutput().response.quotes, source, chunks);
	const title = {
		title: 'Building agents with explicit checkpoints',
		hook: 'Inspect Every Step',
		evidenceIds: [evidence[0].id]
	};
	const body = { action: 'titles', sourceText: SOURCE, evidence };
	const response = await runCreativeSource(
		await event(body, { ai: { run: async () => ({ response: { titles: [title] } }) } })
	);
	assert.equal(response.status, 200);
	const result = await response.json();
	assert.equal(result.titles[0].provenance, 'generated');
	assert.equal(result.coverage.status, 'evidence-only');
	assert.equal(result.directions.length, 4);
	const forged = await runCreativeSource(
		await event(body, {
			ai: {
				run: async () => ({ response: { titles: [{ ...title, evidenceIds: ['nonexistent'] }] } })
			}
		})
	);
	assert.equal(forged.status, 502);
});

test('video URL alone produces transcript-required status without downloading or inference', async () => {
	let runs = 0;
	const response = await runCreativeSource(
		await event(
			{ action: 'analyze', sourceUrl: `https://youtu.be/${VIDEO}`, chunkIndex: 0 },
			{
				ai: {
					run: () => {
						runs++;
					}
				}
			}
		),
		{
			fetcher: () => {
				throw new Error('Unexpected network');
			}
		}
	);
	assert.equal(response.status, 422);
	assert.equal((await response.json()).code, 'transcript_required');
	assert.equal(runs, 0);
});

test('unconfigured public YouTube lookup is honest and does not require paid AI', async () => {
	const response = await runCreativeSource(
		await event({ action: 'channel', channel: '@LatentSpace' }),
		{
			fetcher: () => {
				throw new Error('Unexpected network');
			}
		}
	);
	assert.equal(response.status, 503);
	assert.equal((await response.json()).code, 'youtube_not_configured');
});

test('channel resolver uses official forHandle parameter and keeps provider key private', async () => {
	const calls = [];
	const ledger = createTestAiLedger();
	const response = await runCreativeSource(
		await event(
			{ action: 'channel', channel: 'https://youtube.com/@LatentSpace' },
			{ youtubeKey: 'private-youtube-key', ledger }
		),
		{
			fetcher: async (url) => {
				calls.push(new URL(url));
				return Response.json({
					items: [
						{
							id: CHANNEL,
							snippet: {
								title: 'A channel',
								thumbnails: { high: { url: 'https://evil.example/tracker' } }
							},
							contentDetails: { relatedPlaylists: { uploads: PLAYLIST } }
						}
					]
				});
			}
		}
	);
	assert.equal(response.status, 200);
	assert.equal(calls[0].hostname, 'www.googleapis.com');
	assert.equal(calls[0].searchParams.get('forHandle'), '@LatentSpace');
	const text = await response.text();
	assert.ok(!text.includes('private-youtube-key'));
	assert.ok(!text.includes('evil.example'));
	assert.equal(ledger.calls.length, 0);
});

test('video pagination resolves uploads server-side, returns 24-page references and strips private videos', async () => {
	const calls = [];
	const response = await runCreativeSource(
		await event(
			{ action: 'videos', channelId: CHANNEL, pageToken: 'NEXT_page' },
			{ youtubeKey: 'key' }
		),
		{
			fetcher: async (url) => {
				calls.push(new URL(url));
				return calls.length === 1
					? Response.json({
							items: [
								{
									id: CHANNEL,
									snippet: { title: 'A channel' },
									contentDetails: { relatedPlaylists: { uploads: PLAYLIST } }
								}
							]
						})
					: Response.json({
							items: [
								{
									snippet: {
										title: 'A real title',
										thumbnails: { high: { url: `https://i.ytimg.com/vi/${VIDEO}/hqdefault.jpg` } }
									},
									contentDetails: { videoId: VIDEO, videoPublishedAt: '2026-08-25T00:00:00Z' }
								},
								{ snippet: { title: 'Private video' }, contentDetails: { videoId: 'aaaaaaaaaaa' } }
							],
							nextPageToken: 'MORE'
						});
			}
		}
	);
	assert.equal(response.status, 200);
	assert.equal(calls[1].searchParams.get('playlistId'), PLAYLIST);
	assert.equal(calls[1].searchParams.get('maxResults'), '24');
	assert.equal(calls[1].searchParams.get('pageToken'), 'NEXT_page');
	const result = await response.json();
	assert.equal(result.videos.length, 1);
	assert.equal(result.nextPageToken, 'MORE');
	assert.equal(result.coverage.status, 'partial');
	assert.match(result.notice, /check rights/);
});

test('YouTube provider failures stay unavailable, never empty success or leaked keys', async () => {
	for (const fetcher of [
		async () => new Response('private secret', { status: 403 }),
		async () => {
			throw new Error('key=private-key');
		}
	]) {
		const response = await runCreativeSource(
			await event({ action: 'channel', channel: '@LatentSpace' }, { youtubeKey: 'private-key' }),
			{ fetcher }
		);
		assert.equal(response.status, 503);
		const raw = await response.text();
		assert.ok(!raw.includes('private-key'));
		assert.equal(JSON.parse(raw).videos, undefined);
	}
});

test('exact video URL or ID resolves official metadata without AI, discovery, media retrieval or persistence', async () => {
	for (const input of [
		VIDEO,
		`https://youtu.be/${VIDEO}?si=private-share-token`,
		`https://www.youtube.com/watch?v=${VIDEO}&t=30`
	]) {
		const calls = [];
		const ledger = createTestAiLedger();
		const response = await runCreativeSource(
			await event({ action: 'video', video: input }, { youtubeKey: 'private-api-key', ledger }),
			{
				fetcher: async (url, options) => {
					calls.push(new URL(url));
					assert.equal(options.redirect, 'error');
					return Response.json({
						items: [
							{
								id: VIDEO,
								snippet: {
									title: 'Unlisted episode',
									description: 'Exact supplied video description.',
									channelId: CHANNEL,
									channelTitle: 'Channel',
									publishedAt: '2026-08-25T12:00:00Z',
									thumbnails: { high: { url: `https://i.ytimg.com/vi/${VIDEO}/hqdefault.jpg` } }
								},
								contentDetails: { duration: 'PT1H2M3S' },
								status: { privacyStatus: 'unlisted', uploadStatus: 'processed' },
								privateField: 'provider-private'
							}
						]
					});
				}
			}
		);
		assert.equal(response.status, 200);
		const result = await response.json();
		assert.deepEqual(result.video, {
			id: VIDEO,
			url: `https://www.youtube.com/watch?v=${VIDEO}`,
			title: 'Unlisted episode',
			description: 'Exact supplied video description.',
			channelId: CHANNEL,
			channelTitle: 'Channel',
			publishedAt: '2026-08-25T12:00:00Z',
			thumbnailUrl: `https://i.ytimg.com/vi/${VIDEO}/hqdefault.jpg`,
			duration: 'PT1H2M3S',
			privacyStatus: 'unlisted'
		});
		assert.equal(result.provenance, 'youtube-data-api');
		assert.ok(Number.isFinite(Date.parse(result.retrievedAt)));
		assert.deepEqual(result.warnings, []);
		assert.equal(response.headers.get('cache-control'), 'private, no-store');
		assert.equal(calls.length, 1);
		assert.equal(
			calls[0].origin + calls[0].pathname,
			'https://www.googleapis.com/youtube/v3/videos'
		);
		assert.equal(calls[0].searchParams.get('id'), VIDEO);
		assert.equal(calls[0].searchParams.get('part'), 'snippet,contentDetails,status');
		assert.equal(calls[0].searchParams.has('maxResults'), false);
		assert.deepEqual(ledger.calls, []);
		for (const secret of [
			'private-api-key',
			'private-share-token',
			'provider-private',
			'uploadStatus'
		])
			assert.equal(JSON.stringify(result).includes(secret), false);
	}
});

test('missing optional video metadata is omitted with honest warnings, never defaulted or inferred', async () => {
	const response = await runCreativeSource(
		await event({ action: 'video', video: VIDEO }, { youtubeKey: 'key' }),
		{
			fetcher: async () =>
				Response.json({
					items: [
						{
							id: VIDEO,
							snippet: {
								title: 'Title only',
								thumbnails: { high: { url: 'https://evil.example/private-tracker' } }
							},
							contentDetails: { duration: 'unknown' }
						}
					]
				})
		}
	);
	assert.equal(response.status, 200);
	const result = await response.json();
	assert.deepEqual(result.video, {
		id: VIDEO,
		url: `https://www.youtube.com/watch?v=${VIDEO}`,
		title: 'Title only'
	});
	assert.equal(result.warnings.length, 7);
	assert.ok(result.warnings.some((warning) => warning.includes('Description')));
	assert.ok(result.warnings.some((warning) => warning.includes('Duration')));
	assert.ok(result.warnings.some((warning) => warning.includes('not inferred')));
	assert.equal(JSON.stringify(result).includes('evil.example'), false);
});

test('video lookup rejects authentication/account/origin errors and unsafe inputs before the provider', async () => {
	let calls = 0;
	const fetcher = async () => {
		calls++;
		throw new Error('Must not reach provider');
	};
	const body = { action: 'video', video: VIDEO };
	assert.equal(
		(
			await runCreativeSource(await event(body, { authenticated: false, youtubeKey: 'key' }), {
				fetcher
			})
		).status,
		401
	);
	assert.equal(
		(
			await runCreativeSource(
				await event(body, { expectedUser: 'other-account', youtubeKey: 'key' }),
				{ fetcher }
			)
		).status,
		409
	);
	await assert.rejects(
		() =>
			event(body, { origin: 'https://evil.example', youtubeKey: 'key' }).then((request) =>
				runCreativeSource(request, { fetcher })
			),
		(error) => error.status === 403
	);
	for (const video of [
		'https://evil.example/watch?v=' + VIDEO,
		'https://youtube.com.evil.example/watch?v=' + VIDEO,
		'http://youtube.com/watch?v=' + VIDEO,
		'https://user:secret@youtube.com/watch?v=' + VIDEO,
		'https://youtube.com:8443/watch?v=' + VIDEO,
		'https://youtube.com/@LatentSpace',
		VIDEO + ',aaaaaaaaaaa',
		'../secret',
		'',
		null
	]) {
		assert.equal(
			(
				await runCreativeSource(await event({ action: 'video', video }, { youtubeKey: 'key' }), {
					fetcher
				})
			).status,
			422
		);
	}
	assert.equal(
		(
			await runCreativeSource(
				await event({ ...body, userId: 'other-account' }, { youtubeKey: 'key' }),
				{ fetcher }
			)
		).status,
		422
	);
	assert.equal(calls, 0);
});

test('configured video lookup unavailable items and provider failures do not leak sources or keys', async () => {
	const body = { action: 'video', video: VIDEO };
	for (const [provider, status, code] of [
		[async () => Response.json({ items: [] }), 404, 'video_unavailable'],
		[
			async () =>
				Response.json({ items: [{ id: 'aaaaaaaaaaa', snippet: { title: 'Wrong video' } }] }),
			502,
			'invalid_video_metadata'
		],
		[
			async () => Response.json({ items: [{ id: VIDEO, snippet: { title: '' } }] }),
			502,
			'invalid_video_metadata'
		],
		[async () => Response.json({ items: {} }), 502, 'invalid_video_metadata'],
		[
			async () => new Response('private-api-key private-source', { status: 403 }),
			503,
			'youtube_unavailable'
		],
		[
			async () => {
				throw new Error('private-api-key private-source');
			},
			503,
			'youtube_unavailable'
		],
		[async () => new Response('x'.repeat(1_000_001)), 503, 'youtube_unavailable']
	]) {
		const response = await runCreativeSource(await event(body, { youtubeKey: 'private-api-key' }), {
			fetcher: provider
		});
		assert.equal(response.status, status);
		const result = await response.json();
		assert.equal(result.code, code);
		assert.equal(result.video, undefined);
		assert.equal(JSON.stringify(result).includes('private-api-key'), false);
		assert.equal(JSON.stringify(result).includes('private-source'), false);
		assert.equal(JSON.stringify(result).includes(VIDEO), false);
	}
});

const oembedResult = () => ({
	type: 'video',
	provider_name: 'YouTube',
	provider_url: 'https://www.youtube.com/',
	title: 'Prepublish episode',
	author_name: 'Latent Space',
	author_url: 'https://www.youtube.com/@LatentSpace',
	thumbnail_url: `https://i.ytimg.com/vi/${VIDEO}/hqdefault.jpg`,
	html: '<iframe src="https://private.example/never-load"></iframe>',
	description: 'Not an oEmbed field',
	duration: 'PT10M',
	privacyStatus: 'unlisted'
});

for (const [lookup, youtubeKey, endpoint] of [
	['Data API', 'configured-test-key', 'https://www.googleapis.com/youtube/v3/videos'],
	['oEmbed', undefined, 'https://www.youtube.com/oembed']
]) {
	test(`${lookup} video imports reject pre-aborted requests before any downstream call`, async () => {
		const controller = new AbortController();
		controller.abort(new Error('private-source-cancellation-reason'));
		const ledger = createTestAiLedger();
		let calls = 0;
		const response = await runCreativeSource(
			await event(
				{ action: 'video', video: VIDEO },
				{ youtubeKey, ledger, signal: controller.signal }
			),
			{
				fetcher: async () => {
					calls++;
					assert.fail('A cancelled import must not reach YouTube');
				}
			}
		);
		assert.equal(response.status, 409);
		assert.equal((await response.json()).code, 'metadata_cancelled');
		assert.equal(calls, 0);
		assert.deepEqual(ledger.calls, []);
	});

	test(
		`${lookup} video imports propagate in-flight fetch cancellation without fallback or private errors`,
		{ timeout: 2000 },
		async () => {
			const controller = new AbortController();
			const ledger = createTestAiLedger();
			let calls = 0;
			let downstreamSignal;
			const response = await runCreativeSource(
				await event(
					{ action: 'video', video: VIDEO },
					{ youtubeKey, ledger, signal: controller.signal }
				),
				{
					fetcher: async (url, options) => {
						calls++;
						assert.equal(new URL(url).origin + new URL(url).pathname, endpoint);
						assert.equal(options.redirect, 'error');
						downstreamSignal = options.signal;
						return new Promise((_resolve, reject) => {
							options.signal.addEventListener('abort', () => reject(options.signal.reason), {
								once: true
							});
							controller.abort(new Error('private-source-cancellation-reason'));
						});
					}
				}
			);
			assert.equal(response.status, 409);
			const raw = await response.text();
			assert.equal(JSON.parse(raw).code, 'metadata_cancelled');
			assert.equal(raw.includes('private-source-cancellation-reason'), false);
			assert.equal(raw.includes(VIDEO), false);
			assert.equal(raw.includes('configured-test-key'), false);
			assert.equal(calls, 1);
			assert.equal(downstreamSignal.aborted, true);
			assert.deepEqual(ledger.calls, []);
		}
	);

	test(
		`${lookup} video imports cancel a partially-read response body and accept no metadata`,
		{ timeout: 2000 },
		async () => {
			const controller = new AbortController();
			const ledger = createTestAiLedger();
			let calls = 0;
			let pulls = 0;
			let cancellations = 0;
			let downstreamSignal;
			const response = await runCreativeSource(
				await event(
					{ action: 'video', video: VIDEO },
					{ youtubeKey, ledger, signal: controller.signal }
				),
				{
					fetcher: async (url, options) => {
						calls++;
						assert.equal(new URL(url).origin + new URL(url).pathname, endpoint);
						downstreamSignal = options.signal;
						return new Response(
							new ReadableStream({
								pull(stream) {
									pulls++;
									if (pulls === 1) stream.enqueue(new TextEncoder().encode('{"partial":"'));
									else
										queueMicrotask(() =>
											controller.abort(new Error('private-body-cancellation-reason'))
										);
								},
								cancel() {
									cancellations++;
								}
							}),
							{ headers: { 'Content-Type': 'application/json' } }
						);
					}
				}
			);
			assert.equal(response.status, 409);
			const result = await response.json();
			assert.equal(result.code, 'metadata_cancelled');
			assert.equal(result.video, undefined);
			assert.equal(JSON.stringify(result).includes('private-body-cancellation-reason'), false);
			assert.equal(calls, 1);
			assert.ok(pulls >= 2, 'cancellation occurs after body reading begins');
			assert.equal(
				cancellations,
				1,
				'the response stream is cancelled, not left reading in the background'
			);
			assert.equal(downstreamSignal.aborted, true);
			assert.deepEqual(ledger.calls, []);
		}
	);
}

test('no-key video lookup uses fixed official oEmbed and returns explicitly limited metadata', async () => {
	const calls = [];
	const ledger = createTestAiLedger();
	const response = await runCreativeSource(
		await event(
			{ action: 'video', video: `https://youtu.be/${VIDEO}?si=private-token` },
			{ ledger }
		),
		{
			fetcher: async (url, options) => {
				calls.push(new URL(url));
				assert.equal(options.redirect, 'error');
				assert.ok(options.signal instanceof AbortSignal);
				return Response.json(oembedResult());
			}
		}
	);
	assert.equal(response.status, 200);
	const result = await response.json();
	assert.deepEqual(result.video, {
		id: VIDEO,
		url: `https://www.youtube.com/watch?v=${VIDEO}`,
		title: 'Prepublish episode',
		channelTitle: 'Latent Space',
		thumbnailUrl: `https://i.ytimg.com/vi/${VIDEO}/hqdefault.jpg`
	});
	assert.equal(result.provenance, 'youtube-oembed');
	assert.deepEqual(result.warnings, [
		'Only title/channel/thumbnail available; description, duration and privacy were not retrieved.'
	]);
	assert.equal(response.headers.get('cache-control'), 'private, no-store');
	assert.equal(calls.length, 1);
	assert.equal(calls[0].origin + calls[0].pathname, 'https://www.youtube.com/oembed');
	assert.equal(calls[0].searchParams.get('format'), 'json');
	assert.equal(calls[0].searchParams.get('url'), `https://www.youtube.com/watch?v=${VIDEO}`);
	assert.equal(calls[0].searchParams.has('key'), false);
	assert.equal(JSON.stringify(result).includes('private.example'), false);
	assert.equal(JSON.stringify(result).includes('private-token'), false);
	assert.deepEqual(ledger.calls, []);
});

test('oEmbed does not follow redirects, expose private failures, accept unsafe identity URLs or unbounded bodies', async () => {
	for (const [provider, expected] of [
		[() => new Response('private-details', { status: 401 }), 404],
		[() => new Response('private-details', { status: 403 }), 404],
		[() => new Response('private-details', { status: 404 }), 404],
		[
			() => new Response(null, { status: 302, headers: { Location: 'https://private.example' } }),
			503
		],
		[() => new Response('x'.repeat(64_001)), 503],
		[
			() =>
				Response.json({
					...oembedResult(),
					author_url: 'https://youtube.com.evil.example/@author'
				}),
			502
		],
		[() => Response.json({ ...oembedResult(), provider_url: 'https://private.example' }), 502],
		[() => Response.json({ ...oembedResult(), title: '' }), 502],
		[
			() => {
				throw new Error('private-details');
			},
			503
		]
	]) {
		let calls = 0;
		const response = await runCreativeSource(await event({ action: 'video', video: VIDEO }), {
			fetcher: async (_url, options) => {
				calls++;
				assert.equal(options.redirect, 'error');
				return provider();
			}
		});
		assert.equal(response.status, expected);
		const raw = await response.text();
		assert.equal(raw.includes('private-details'), false);
		assert.equal(raw.includes('private.example'), false);
		assert.equal(raw.includes(VIDEO), false);
		assert.equal(calls, 1);
	}
	const badThumbnail = await runCreativeSource(await event({ action: 'video', video: VIDEO }), {
		fetcher: async () =>
			Response.json({ ...oembedResult(), thumbnail_url: 'https://i.ytimg.com:8443/private-image' })
	});
	const result = await badThumbnail.json();
	assert.equal(result.video.thumbnailUrl, undefined);
	assert.ok(result.warnings.includes('Thumbnail is unavailable.'));
});

test('a configured Data API denial never triggers oEmbed or hides authorization errors', async () => {
	let calls = 0;
	const response = await runCreativeSource(
		await event({ action: 'video', video: VIDEO }, { youtubeKey: 'configured-key' }),
		{
			fetcher: async (url) => {
				calls++;
				assert.equal(new URL(url).hostname, 'www.googleapis.com');
				return new Response('restricted', { status: 403 });
			}
		}
	);
	assert.equal(response.status, 503);
	assert.equal((await response.json()).code, 'youtube_unavailable');
	assert.equal(calls, 1);
});

test('title generation receives exact selected few-shot text separately from source evidence and metadata-only usage', async () => {
	const example = referenceCatalog.examples.find((item) => item.thumbnailText);
	const visualOnly = referenceCatalog.examples.find((item) => item.id !== example.id);
	const fewShot = {
		...emptyFewShot(),
		examples: [
			{ id: example.id, fields: ['title', 'hook'], note: 'Use the tension, not the facts.' },
			{ id: visualOnly.id, fields: ['visual'] }
		]
	};
	const source = parseCreativeTranscript(SOURCE);
	const evidence = validateCreativeQuotes(
		quoteOutput().response.quotes,
		source,
		chunkCreativeTranscript(source)
	);
	const ledger = createTestAiLedger();
	let captured;
	const response = await runCreativeSource(
		await event(
			{ action: 'titles', sourceText: SOURCE, evidence, fewShot },
			{
				ledger,
				ai: {
					run: async (_, input) => {
						captured = input;
						return {
							response: {
								titles: [
									{
										title: 'Reliable agents need checkpoints',
										hook: 'Inspect Every Step',
										evidenceIds: [evidence[0].id]
									}
								]
							}
						};
					}
				}
			}
		)
	);
	assert.equal(response.status, 200);
	const payload = JSON.parse(captured.messages[1].content);
	assert.equal(payload.styleExamples, fewShotPrompt(fewShot, ['title', 'hook']));
	assert.ok(payload.styleExamples.includes(example.title));
	assert.ok(payload.styleExamples.includes(example.thumbnailText));
	assert.equal(payload.styleExamples.includes(visualOnly.title), false);
	assert.deepEqual(payload.evidence, evidence);
	assert.match(captured.messages[0].content, /Do not cite examples as evidence/);
	assert.equal(JSON.stringify(captured).includes(example.thumbnailUrl), false);
	assert.equal(/data:image|image_url/.test(JSON.stringify(captured)), false);
	assert.equal(JSON.stringify(ledger.calls).includes(example.title), false);
	assert.equal(JSON.stringify(ledger.calls).includes('Use the tension'), false);
});

test('example IDs cannot replace source evidence IDs in model-generated titles', async () => {
	const example = referenceCatalog.examples[0];
	const source = parseCreativeTranscript(SOURCE);
	const evidence = validateCreativeQuotes(
		quoteOutput().response.quotes,
		source,
		chunkCreativeTranscript(source)
	);
	const ledger = createTestAiLedger();
	const response = await runCreativeSource(
		await event(
			{
				action: 'titles',
				sourceText: SOURCE,
				evidence,
				fewShot: { ...emptyFewShot(), examples: [{ id: example.id, fields: ['title'] }] }
			},
			{
				ledger,
				ai: {
					run: async () => ({
						response: {
							titles: [
								{
									title: 'Unsupported borrowed title',
									hook: 'Not Source Evidence',
									evidenceIds: [example.id]
								}
							]
						}
					})
				}
			}
		)
	);
	assert.equal(response.status, 502);
	assert.equal((await response.json()).titles, undefined);
	assert.equal(ledger.calls.at(-1).body.status, 'failed');
});

test('unavailable, stale and excessive few-shot selections are rejected before quota admission or AI', async () => {
	const source = parseCreativeTranscript(SOURCE);
	const evidence = validateCreativeQuotes(
		quoteOutput().response.quotes,
		source,
		chunkCreativeTranscript(source)
	);
	for (const fewShot of [
		{ ...emptyFewShot(), examples: [{ id: 'missing-example', fields: ['title'] }] },
		{ ...emptyFewShot(), catalogVersion: 'stale-catalog' },
		{
			...emptyFewShot(),
			examples: referenceCatalog.examples
				.slice(0, 7)
				.map((example) => ({ id: example.id, fields: ['title'] }))
		}
	]) {
		const ledger = createTestAiLedger();
		let runs = 0;
		const response = await runCreativeSource(
			await event(
				{ action: 'titles', sourceText: SOURCE, evidence, fewShot },
				{
					ledger,
					ai: {
						run: async () => {
							runs++;
							assert.fail('Invalid selection reached provider');
						}
					}
				}
			)
		);
		assert.equal(response.status, 422);
		assert.deepEqual(ledger.calls, []);
		assert.equal(runs, 0);
	}
});
