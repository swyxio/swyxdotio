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

/** @param {unknown} error */
function rendererErrorDetails(error) {
	const details = [];
	let current = error;
	for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
		const record =
			/** @type {{ name?: unknown, message?: unknown, code?: unknown, originalError?: unknown }} */ (
				current
			);
		details.push({ name: record.name, message: record.message, code: record.code });
		current = record.originalError;
	}
	return details;
}

/** @param {import('./cards').NotebookCard} card */
export async function renderNotebookCard(card) {
	try {
		const generated = new ImageResponse(renderNotebookTemplate(card, portrait), {
			width: OG_WIDTH,
			height: OG_HEIGHT,
			format: 'png',
			fonts: await notebookFonts(),
			headers: { 'Cache-Control': OG_CACHE_CONTROL }
		});
		const bytes = await generated.arrayBuffer();
		if (bytes.byteLength > MAX_RENDERED_BYTES) throw new Error('Rendered OG image exceeds 5 MB');
		return new Response(bytes, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': OG_CACHE_CONTROL
			}
		});
	} catch (error) {
		console.error('OG image render failed; serving fallback', {
			errors: rendererErrorDetails(error)
		});
		return new Response(await read(fallbackPath).arrayBuffer(), {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': OG_CACHE_CONTROL,
				'X-OG-Fallback': '1'
			}
		});
	}
}
