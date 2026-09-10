import { read } from '$app/server';
import { ImageResponse } from '@ethercorps/sveltekit-og';
import portrait from '../../../static/swyx-ski.jpeg?inline';
import fallbackPath from './assets/notebook-fallback.png?url';
import { OG_HEIGHT, OG_WIDTH } from './cards.js';
import { notebookFonts } from './fonts.js';
import { renderNotebookTemplate } from './template.js';

export const OG_CACHE_CONTROL =
	'public, max-age=31536000, s-maxage=31536000, immutable, no-transform';
const MAX_RENDERED_BYTES = 5 * 1024 * 1024;

/** HEAD validates the card without paying for rasterization. */
export function notebookCardHead() {
	return new Response(null, {
		headers: { 'Content-Type': 'image/png', 'Cache-Control': OG_CACHE_CONTROL }
	});
}

/** @param {import('./cards').NotebookCard} card */
export async function renderNotebookCard(card) {
	const started = Date.now();
	let stage = 'fonts';
	try {
		const fonts = await notebookFonts();
		stage = 'render';
		console.log(
			JSON.stringify({
				event: 'og_render',
				stage: 'start',
				kind: card.kind,
				hasImage: !!card.image
			})
		);
		const generated = new ImageResponse(renderNotebookTemplate(card, portrait), {
			width: OG_WIDTH,
			height: OG_HEIGHT,
			format: 'png',
			fonts,
			headers: { 'Cache-Control': OG_CACHE_CONTROL }
		});
		const bytes = await generated.arrayBuffer();
		if (bytes.byteLength > MAX_RENDERED_BYTES) throw new Error('Rendered OG image exceeds 5 MB');
		console.log(
			JSON.stringify({
				event: 'og_render',
				stage: 'complete',
				kind: card.kind,
				durationMs: Date.now() - started,
				bytes: bytes.byteLength
			})
		);
		return new Response(bytes, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': OG_CACHE_CONTROL
			}
		});
	} catch {
		console.error(
			JSON.stringify({
				event: 'og_render',
				stage,
				outcome: 'fallback',
				kind: card.kind,
				durationMs: Date.now() - started
			})
		);
		return new Response(await read(fallbackPath).arrayBuffer(), {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=60, s-maxage=60',
				'X-OG-Fallback': '1'
			}
		});
	}
}
