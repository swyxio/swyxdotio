import companies from '$lib/data/portfolio.json';

// Static page: rendered once at build time.
export const prerender = true;

export function load() {
	return { companies, reviewedAt: '2026-08-26' };
}
