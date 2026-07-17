import { error } from '@sveltejs/kit';
import { getPageCard } from '$lib/og/cards.js';
import { renderNotebookCard } from '$lib/og/render.js';

export const prerender = false;

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	const card = getPageCard(params.key);
	if (!card) throw error(404, 'Unknown OG page');
	return renderNotebookCard(card);
}
