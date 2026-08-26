import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = source('src/tailwind.css');

function themeTokens(selector) {
	const block = css.slice(css.indexOf(`${selector} {`));
	return Object.fromEntries(
		[...block.slice(0, block.indexOf('}')).matchAll(/--([\w-]+): (#[\da-f]{6});/g)].map((match) => [
			match[1],
			match[2]
		])
	);
}

function luminance(hex) {
	const channels = hex
		.slice(1)
		.match(/../g)
		.map((channel) => parseInt(channel, 16) / 255)
		.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
	return channels.reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrast(a, b) {
	const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (values[0] + 0.05) / (values[1] + 0.05);
}

test('both reading themes have readable normal text and input boundaries', () => {
	for (const theme of [':root', '.dark']) {
		const tokens = themeTokens(theme);
		for (const background of ['page-bg', 'page-surface']) {
			for (const foreground of [
				'page-text',
				'page-muted',
				'page-link',
				'page-accent',
				'page-gold'
			]) {
				const ratio = contrast(tokens[foreground], tokens[background]);
				assert.ok(ratio >= 4.5, `${theme} ${foreground}/${background}: ${ratio.toFixed(2)}:1`);
			}
			const ratio = contrast(tokens['control-border'], tokens[background]);
			assert.ok(ratio >= 3, `${theme} input border/${background}: ${ratio.toFixed(2)}:1`);
		}
	}
});

test('essays use bounded serif prose with intact metadata and content', () => {
	const article = source('src/routes/[slug]/+page.svelte');
	assert.match(css, /--reading-max-width: 40\.5rem/);
	assert.match(css, /\.reading-prose\s*\{[^}]*1\.125rem\/1\.75 var\(--font-reading\)/);
	assert.match(article, /--content: minmax\(0, min\(72ch, var\(--reading-max-width\)\)\)/);
	assert.match(article, /class="article-header"/);
	assert.match(article, /href="\/ideas">← All writing/);
	assert.match(article, /class:has-translations=\{hasTranslations\}/);
	assert.match(article, /\{@html json\.content\}/);
	assert.match(article, /ReadCounter pageKey=\{data\.slug\} requireDepth/);
	assert.match(article, /<SocialMeta \{\.\.\.social\}/);
});

test('mobile live-reader controls live in the footer and open in normal flow', () => {
	const layout = source('src/routes/+layout.svelte');
	const presence = source('src/components/LivePresence.svelte');
	assert.match(layout, /<footer\b[\s\S]*?<LivePresence\b[\s\S]*?<\/footer>/);
	const mobile = presence.slice(presence.lastIndexOf('@media'));
	assert.match(mobile, /\.live-presence\s*\{[^}]*position: relative/);
	assert.match(mobile, /\.presence-panel\s*\{[^}]*position: static/);
	assert.match(mobile, /min-height: 44px/);
	assert.match(presence, /closePresenceOnEscape/);
	assert.match(presence, /closePresenceOutside/);
	assert.match(presence, /event\.defaultPrevented/);
	assert.match(presence, /target\.closest\('dialog\[open\]'\)/);
});

test('mobile navigation uses native modal focus containment and readable controls', () => {
	const nav = source('src/components/Nav.svelte');
	assert.match(nav, /<dialog\b/);
	assert.match(nav, /menuDialog\?\.showModal\(\)/);
	assert.match(nav, /menuCloseButton\?\.focus\(\)/);
	assert.match(nav, /on:close=\{\(\) => \(isMenuOpen = false\)\}/);
	assert.match(nav, /body:has\(\.mobile-menu-layer\[open\]\)/);
	assert.match(nav, /\.drawer-brand\s*\{[^}]*font-family: var\(--font-display\)/);
	assert.match(nav, /min-height: 2\.75rem/);
});

test('local previews do not reuse stale HTML across hot reloads', () => {
	const hooks = source('src/hooks.server.js');
	assert.match(hooks, /const cacheable = !dev &&/);
	assert.match(hooks, /if \(dev\) response\.headers\.set\('Cache-Control', 'no-store'\)/);
});
