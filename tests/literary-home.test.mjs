import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { FEATURED_ESSAYS } from '../src/lib/featured-essays.js';

test('the featured shelf contains a substantial, uniquely linked essay collection', () => {
	assert.ok(FEATURED_ESSAYS.length >= 8);
	assert.equal(new Set(FEATURED_ESSAYS.map((essay) => essay.href)).size, FEATURED_ESSAYS.length);
	assert.ok(FEATURED_ESSAYS.some((essay) => essay.href === '/learn-in-public'));
	assert.ok(FEATURED_ESSAYS.some((essay) => essay.href.includes('latent.space')));
	assert.ok(FEATURED_ESSAYS.every((essay) => essay.title && essay.description && essay.category));
});

test('the public design keeps the private tools out of featured discovery', () => {
	assert.ok(FEATURED_ESSAYS.every((essay) => !/^\/(?:box|draw)(?:\/|$)/.test(essay.href)));
	const layout = fs.readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
	assert.match(layout, /GNU Terry Pratchett/);
	assert.match(layout, /\$page\.url\.pathname === '\/box' \|\| \$page\.url\.pathname === '\/draw'/);
});

test('the same theme switch is present outside the collapsible navigation links', () => {
	const navigation = fs.readFileSync(
		new URL('../src/components/Nav.svelte', import.meta.url),
		'utf8'
	);
	assert.match(navigation, /class="theme-button nav-theme"/);
	assert.match(navigation, /aria-pressed=\{isDark\}/);
	assert.match(navigation, /@media \(max-width: 780px\)/);
});
