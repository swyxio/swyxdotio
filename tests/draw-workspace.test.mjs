import assert from 'node:assert/strict';
import test from 'node:test';

import { orderRecentDrawingPages, searchWorkspaceCommands } from '../src/lib/draw-workspace.js';

test('workspace search ranks labels ahead of category, keyword, and description matches', () => {
	const commands = [
		{ id: 'description', label: 'Outline', description: 'A reusable button component' },
		{ id: 'category', label: 'Primary action', category: 'Button' },
		{ id: 'keyword', label: 'Submit', keywords: ['button', 'form'] },
		{ id: 'prefix', label: 'Button group' },
		{ id: 'exact', label: 'Button' }
	];

	assert.deepEqual(
		searchWorkspaceCommands(commands, 'BUTTON').map(({ id }) => id),
		['exact', 'prefix', 'category', 'keyword', 'description']
	);
});

test('workspace search matches multiple tokens across labels, categories, and keywords', () => {
	const matching = {
		id: 'component',
		label: 'Primary button',
		category: 'UI component',
		keywords: ['action', 'call to action']
	};
	const commands = [matching, { id: 'page', label: 'Button sketches', category: 'Page' }];

	assert.deepEqual(searchWorkspaceCommands(commands, 'action PRIMARY ui'), [matching]);
	assert.deepEqual(searchWorkspaceCommands(commands, 'button missing'), []);
});

test('workspace search supports forgiving subsequences and accent-insensitive matching', () => {
	const commands = [
		{ id: 'dialog', label: 'Confirmation dialog' },
		{ id: 'resume', label: 'Résumé examples' }
	];

	assert.deepEqual(searchWorkspaceCommands(commands, 'cnfrm dlg'), [commands[0]]);
	assert.deepEqual(searchWorkspaceCommands(commands, 'resume'), [commands[1]]);
});

test('an empty workspace search retains the provided useful default order and limit', () => {
	const commands = [
		{ id: 'active', label: 'Current drawing' },
		{ id: 'recent', label: 'Recent drawing' },
		{ id: 'component', label: 'Button' }
	];

	assert.deepEqual(searchWorkspaceCommands(commands, '   ', { limit: 2 }), commands.slice(0, 2));
	assert.deepEqual(searchWorkspaceCommands(commands, 'drawing', { limit: 0 }), []);
});

test('recent drawing pages pin the current page and sort the rest by latest update', () => {
	const pages = [
		{ id: 'older', name: 'Older', updatedAt: '2026-01-01T00:00:00.000Z' },
		{ id: 'current', name: 'Current' },
		{ id: 'newer', name: 'Newer', updatedAt: Date.parse('2026-08-24T00:00:00.000Z') },
		{ id: 'newest', name: 'Newest', updatedAt: '2026-08-25T00:00:00.000Z' }
	];

	assert.deepEqual(
		orderRecentDrawingPages(pages, 'current').map(({ id }) => id),
		['current', 'newest', 'newer', 'older']
	);
	assert.deepEqual(
		pages.map(({ id }) => id),
		['older', 'current', 'newer', 'newest']
	);
});

test('recent drawing pages keep missing or invalid timestamps last without unstable ties', () => {
	const pages = [
		{ id: 'missing' },
		{ id: 'invalid', updatedAt: 'not-a-date' },
		{ id: 'numeric-string', updatedAt: '1735689600000' },
		{ id: 'same-date', updatedAt: '2025-01-01T00:00:00.000Z' }
	];

	assert.deepEqual(
		orderRecentDrawingPages(pages, 'unknown').map(({ id }) => id),
		['numeric-string', 'same-date', 'missing', 'invalid']
	);
});
