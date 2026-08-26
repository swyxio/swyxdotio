import { TOOLS_AI_POLICY } from './tools-ai-policy.js';

/** Browser-safe source utilities. Offsets always address the original UTF-16 string. */
export const MAX_CREATIVE_SOURCE_CHARS = 500_000;
export const CREATIVE_CHUNK_CHARS = 12_000;

/** Exact source identity for persisted resume state; no raw transcript in the fingerprint. @param {string} text @param {string} [sourceUrl] */
export async function creativeSourceFingerprint(text, sourceUrl = '') {
	const bytes = new TextEncoder().encode(JSON.stringify({ text, sourceUrl }));
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** @param {CreativeTranscript} source @param {Array<{index:number,status:string,startOffset:number,endOffset:number}>} completed @param {number} [maxChunks] */
export function planCreativeSourceRun(source, completed = [], maxChunks = 4) {
	if (!Number.isInteger(maxChunks) || maxChunks < 1 || maxChunks > 8)
		throw new Error('Choose one to eight chunks per explicit run.');
	const chunks = chunkCreativeTranscript(source);
	if (chunks.length > 1_000)
		throw new Error(
			'This source has over 1,000 chunks. Split it into explicit source parts; nothing was truncated.'
		);
	const done = new Set(
		completed
			.filter(
				(item) =>
					item.status === 'succeeded' &&
					chunks[item.index]?.startOffset === item.startOffset &&
					chunks[item.index]?.endOffset === item.endOffset
			)
			.map((item) => item.index)
	);
	const pending = chunks.filter((chunk) => !done.has(chunk.index));
	return {
		chunks,
		completed: done.size,
		remaining: pending.length,
		run: pending.slice(0, maxChunks),
		estimatedRunUsd:
			Math.round(
				Math.min(pending.length, maxChunks) * TOOLS_AI_POLICY.assistantReservationUsd * 1_000_000
			) / 1_000_000,
		estimatedRemainingUsd:
			Math.round(pending.length * TOOLS_AI_POLICY.assistantReservationUsd * 1_000_000) / 1_000_000
	};
}

/** @param {CreativeQuote[]} quotes @param {string[]} ids */
export function selectCreativeEvidence(quotes, ids) {
	if (!ids.length || ids.length > 80 || new Set(ids).size !== ids.length)
		throw new Error('Select 1–80 distinct quotes for this title pass.');
	const selected = ids.map((id) => quotes.find((quote) => quote.id === id));
	if (selected.some((quote) => !quote))
		throw new Error('A selected quote no longer belongs to this source.');
	if (new TextEncoder().encode(JSON.stringify(selected)).byteLength > 32_000)
		throw new Error('Selected evidence exceeds 32 KB. Choose fewer quotes; nothing was truncated.');
	return /** @type {CreativeQuote[]} */ (selected);
}

/** @typedef {{id:string,text:string,startOffset:number,endOffset:number,startMs:number|null,endMs:number|null,speaker:string|null}} TranscriptSegment */
/** @typedef {{text:string,format:string,segments:TranscriptSegment[],warnings:string[]}} CreativeTranscript */
/** @typedef {{index:number,startOffset:number,endOffset:number,segments:TranscriptSegment[]}} CreativeChunk */
/** @typedef {{id:string,text:string,segmentId:string,startOffset:number,endOffset:number,startMs:number|null,endMs:number|null,speaker:string|null,provenance:'source-exact',reviewRequired:true}} CreativeQuote */

/** @param {string} value */
function timestampMs(value) {
	const parts = value.replace(',', '.').split(':').map(Number);
	if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
	if (
		parts.length < 2 ||
		parts.length > 3 ||
		parts[parts.length - 1] >= 60 ||
		parts[parts.length - 2] >= 60
	)
		return null;
	return Math.round(parts.reduce((total, part) => total * 60 + part, 0) * 1_000);
}

/**
 * Parse supplied text only: no URL fetch, inferred transcript, diarization or normalization.
 * Subtitle cue text is split at lines so each accepted quote has one exact contiguous span.
 * @param {string} text @param {{format?:string}} [options] @returns {CreativeTranscript}
 */
export function parseCreativeTranscript(text, { format = 'auto' } = {}) {
	if (typeof text !== 'string' || !text.trim())
		throw new Error('Paste or attach a transcript first.');
	if (text.length > MAX_CREATIVE_SOURCE_CHARS)
		throw new Error(
			'Transcript exceeds 500,000 characters. Split it into explicit source parts; nothing was truncated.'
		);
	if (!['auto', 'txt', 'srt', 'vtt'].includes(format)) throw new Error('Choose TXT, SRT or VTT.');
	if (format === 'auto')
		format = /^\uFEFF?WEBVTT\b/.test(text)
			? 'vtt'
			: /^\s*(?:\d+\s*\r?\n)?\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/m.test(text)
				? 'srt'
				: 'txt';
	/** @type {TranscriptSegment[]} */
	const segments = [];
	/** @type {string[]} */
	const warnings = [];
	let startMs = /** @type {number|null} */ (null);
	let endMs = /** @type {number|null} */ (null);
	let speaker = /** @type {string|null} */ (null);
	let inCue = false;
	let ignoredBlock = false;
	const lines = [...text.matchAll(/[^\r\n]+(?:\r\n|\n|\r|$)|(?:\r\n|\n|\r)/g)];
	for (const match of lines) {
		const line = match[0].replace(/[\r\n]+$/, '');
		if (!line.trim()) {
			inCue = false;
			ignoredBlock = false;
			speaker = null;
			continue;
		}
		if (format !== 'txt') {
			if (/^(?:\uFEFF?WEBVTT|NOTE\b|STYLE\b|REGION\b)/.test(line)) {
				ignoredBlock = true;
				continue;
			}
			if (ignoredBlock) continue;
			const timing =
				/^\s*((?:\d{2,}:)?\d{2}:\d{2}[,.]\d{3})\s*-->\s*((?:\d{2,}:)?\d{2}:\d{2}[,.]\d{3})(?:\s.*)?$/.exec(
					line
				);
			if (timing) {
				startMs = timestampMs(timing[1]);
				endMs = timestampMs(timing[2]);
				speaker = null;
				inCue = startMs !== null && endMs !== null && endMs >= startMs;
				if (!inCue)
					throw new Error('Invalid subtitle timestamp; correct the source before analysis.');
				continue;
			}
			if (!inCue) {
				if (line.includes('-->'))
					throw new Error('Invalid subtitle timestamp; correct the source before analysis.');
				continue; // cue identifiers and WebVTT header metadata are not spoken text
			}
		} else {
			startMs = null;
			endMs = null;
			speaker = null;
		}
		let start = match.index + line.search(/\S/);
		let end = match.index + line.trimEnd().length;
		if (format === 'txt') {
			const timePrefix =
				/^(?:\[((?:\d{1,}:)?\d{2}:\d{2}(?:[.,]\d{3})?)\]|((?:\d{1,}:)?\d{2}:\d{2}(?:[.,]\d{3})?))\s+/.exec(
					text.slice(start, end)
				);
			if (timePrefix) {
				startMs = timestampMs(timePrefix[1] ?? timePrefix[2]);
				if (startMs === null)
					throw new Error('Invalid transcript timestamp; correct the source before analysis.');
				start += timePrefix[0].length;
			}
		}
		const content = text.slice(start, end);
		const voice = /^<v(?:\.[^ >]+)*\s+([^>]{1,80})>\s*/.exec(content);
		const label = /^([\p{L}\p{N}][\p{L}\p{N} .'_-]{0,60}):\s+/u.exec(content);
		if (voice) {
			speaker = voice[1];
			start += voice[0].length;
		} else if (label) {
			speaker = label[1];
			start += label[0].length;
		}
		const closingVoice = /\s*<\/v>\s*$/.exec(text.slice(start, end));
		if (closingVoice) end = start + closingVoice.index;
		if (end <= start) continue;
		segments.push({
			id: `s${segments.length}`,
			text: text.slice(start, end),
			startOffset: start,
			endOffset: end,
			startMs,
			endMs,
			speaker
		});
	}
	if (!segments.length) throw new Error('No transcript text found in this source.');
	if (segments.some((segment) => /<[^>]+>/.test(segment.text)))
		warnings.push(
			'Inline subtitle markup is retained to preserve exact source offsets. Review extracted quotations.'
		);
	if (segments.every((segment) => segment.startMs === null))
		warnings.push('Timestamps unavailable in this transcript.');
	warnings.push(
		'Quotes are exact to the supplied transcript, not verified against audio. Speaker labels are supplied, not identity-verified.'
	);
	return { text, format, segments, warnings };
}

/** @param {CreativeTranscript} source @param {{maxChars?:number}} [options] @returns {CreativeChunk[]} */
export function chunkCreativeTranscript(source, { maxChars = CREATIVE_CHUNK_CHARS } = {}) {
	if (!Number.isSafeInteger(maxChars) || maxChars < 256 || maxChars > CREATIVE_CHUNK_CHARS)
		throw new Error('Invalid transcript chunk size.');
	/** @type {CreativeChunk[]} */
	const chunks = [];
	/** @type {TranscriptSegment[]} */
	let pending = [];
	let chars = 0;
	const flush = () => {
		if (!pending.length) return;
		chunks.push({
			index: chunks.length,
			startOffset: pending[0].startOffset,
			endOffset: pending[pending.length - 1].endOffset,
			segments: pending
		});
		pending = [];
		chars = 0;
	};
	for (const segment of source.segments) {
		for (let offset = segment.startOffset; offset < segment.endOffset; ) {
			if (chars >= maxChars || pending.length >= 80) flush();
			let end = Math.min(segment.endOffset, offset + maxChars - chars);
			// Avoid cutting a surrogate pair; no source characters are removed.
			if (end < segment.endOffset && /[\uD800-\uDBFF]/.test(source.text[end - 1])) end--;
			if (end <= offset) {
				flush();
				continue;
			}
			pending.push({
				...segment,
				id: `${segment.id}:${offset}`,
				startOffset: offset,
				endOffset: end,
				text: source.text.slice(offset, end)
			});
			chars += end - offset;
			offset = end;
		}
	}
	flush();
	return chunks;
}

/** Validate exact model quotes and derive all provenance from source, never the model.
 * @param {unknown} value @param {CreativeTranscript} source @param {CreativeChunk[]} chunks
 * @returns {CreativeQuote[]}
 */
export function validateCreativeQuotes(value, source, chunks) {
	if (!Array.isArray(value) || value.length > 80) throw new Error('Invalid quotation list.');
	const segments = new Map(
		chunks.flatMap((chunk) => chunk.segments.map((segment) => [segment.id, segment]))
	);
	const seen = new Set();
	return value.map((quote) => {
		if (
			!quote ||
			typeof quote !== 'object' ||
			typeof quote.segmentId !== 'string' ||
			typeof quote.text !== 'string' ||
			!quote.text.trim() ||
			quote.text.length > 600
		)
			throw new Error('Invalid quotation.');
		const segment = segments.get(quote.segmentId);
		if (!segment) throw new Error('Quotation refers to an unknown source segment.');
		const local = segment.text.indexOf(quote.text);
		if (local < 0 || segment.text.indexOf(quote.text, local + 1) >= 0)
			throw new Error('Quotation is not an unambiguous exact source span.');
		const startOffset = segment.startOffset + local;
		const endOffset = startOffset + quote.text.length;
		if (
			(quote.startOffset !== undefined && quote.startOffset !== startOffset) ||
			(quote.endOffset !== undefined && quote.endOffset !== endOffset) ||
			source.text.slice(startOffset, endOffset) !== quote.text
		)
			throw new Error('Quotation offsets do not match the source.');
		if (quote.speaker !== undefined && quote.speaker !== segment.speaker)
			throw new Error('Quotation speaker does not match the supplied label.');
		const id = `q${startOffset}-${endOffset}`;
		if (seen.has(id)) throw new Error('Duplicate quotation.');
		seen.add(id);
		return {
			id,
			text: quote.text,
			segmentId: segment.id,
			startOffset,
			endOffset,
			startMs: segment.startMs,
			endMs: segment.endMs,
			speaker: segment.speaker,
			provenance: 'source-exact',
			reviewRequired: true
		};
	});
}

/** @param {unknown} value */
export function normalizeYouTubeChannel(value) {
	if (typeof value !== 'string' || value.length > 500)
		throw new Error('Enter a YouTube @handle or channel URL.');
	let input = value.trim();
	if (/^https?:\/\//i.test(input)) {
		const url = new URL(input);
		if (
			url.protocol !== 'https:' ||
			!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) ||
			url.username ||
			url.password ||
			url.port
		)
			throw new Error('Use an HTTPS youtube.com channel URL.');
		const path = decodeURIComponent(url.pathname).replace(/\/$/, '');
		input = path.startsWith('/channel/')
			? path.slice(9)
			: path.slice(1).replace(/\/(?:videos|featured|shorts|streams)$/, '');
	}
	if (/^UC[A-Za-z0-9_-]{22}$/.test(input))
		return { kind: 'id', value: input, url: `https://www.youtube.com/channel/${input}` };
	if (/^@[\p{L}\p{N}_.\-\u00b7]{3,30}$/u.test(input))
		return {
			kind: 'handle',
			value: input,
			url: `https://www.youtube.com/${encodeURIComponent(input).replace('%40', '@')}`
		};
	throw new Error(
		'Use a YouTube @handle or UC channel ID; custom /c/ and /user/ URLs are not supported.'
	);
}

/** Normalize only. An unlisted URL never implies caption or audio access. @param {unknown} value */
export function normalizeYouTubeVideo(value) {
	if (typeof value !== 'string' || value.length > 1_000)
		throw new Error('Enter a YouTube video URL.');
	const url = new URL(value.trim());
	if (url.protocol !== 'https:' || url.username || url.password || url.port)
		throw new Error('Use an HTTPS YouTube video URL.');
	let id;
	if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
	else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname))
		id =
			url.pathname === '/watch'
				? url.searchParams.get('v')
				: /^\/(?:shorts|live|embed)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
	if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Enter a valid YouTube video URL.');
	return {
		videoId: id,
		url: `https://www.youtube.com/watch?v=${id}`,
		status: 'transcript-required',
		message:
			'Paste or attach TXT, SRT or VTT. This URL is source context only; no captions or audio have been retrieved.'
	};
}

/** Explicitly preset options, not fake generated ideas or approved brand templates. @param {string} [hook] */
export function createArtDirections(hook = '') {
	return [
		{
			id: 'portrait-led',
			name: 'Portrait-led',
			composition: 'Real supplied portrait dominates one side; short headline opposite.',
			typography: 'One large editable headline, small exact name.',
			prompt:
				'Use the supplied real portrait without changing identity; create bold separation between portrait and editable headline.'
		},
		{
			id: 'type-led',
			name: 'Type-led',
			composition: 'Oversized editorial type dominates; smaller portrait and quiet logo.',
			typography: 'Two or three short lines with strong scale contrast.',
			prompt:
				'Create a typography-led composition with dramatic editable headline scale and a restrained real portrait.'
		},
		{
			id: 'contrast-led',
			name: 'Contrast-led',
			composition: 'Two distinct zones express an evidenced comparison or tension.',
			typography: 'A short contrast in separate editable text blocks.',
			prompt:
				'Create a split comparison composition only when supported by the brief; do not invent before/after claims.'
		},
		{
			id: 'diagram-led',
			name: 'Diagram-led',
			composition: 'Simple native diagram explains a supported idea alongside the guest.',
			typography: 'Concise headline and minimal editable diagram labels.',
			prompt:
				'Create a simple editable explanatory diagram from supplied facts, with a smaller real portrait and exact labels.'
		}
	].map((direction) => ({
		...direction,
		hook,
		provenance: 'preset',
		reviewRequired: true,
		guardrails:
			'1280×720; editable text, portrait and logo layers; keep lower-right duration-overlay space clear. Use only supplied identities, logos and supported facts. Not an approved AIE brand template.'
	}));
}
