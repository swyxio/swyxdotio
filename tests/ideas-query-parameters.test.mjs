import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { derived, get, readable, writable } from 'svelte/store';
import { IDEAS_QUERY_PARAMETERS, IDEAS_QUERY_OPTIONS } from '../src/lib/ideas-query-parameters.js';

// Run the installed implementation, replacing only its SvelteKit environment.
// This regression depends on its actual batching/debounce behavior, not a mock store.
const querySource = await readFile(
	new URL('./sveltekit-search-params.js', import.meta.resolve('sveltekit-search-params')),
	'utf8'
);

function queryHarness(initialPath) {
	let now = 0;
	let timerId = 0;
	const timers = new Map();
	const window = { location: new URL(initialPath, 'https://swyx.io') };
	const page = writable({ url: window.location });
	const navigations = [];
	const environment = {
		browser: true,
		building: false,
		page_store: page,
		derived,
		get,
		readable,
		writable,
		window,
		URL,
		URLSearchParams,
		structuredClone,
		setTimeout(callback, delay = 0) {
			const id = ++timerId;
			timers.set(id, { at: now + delay, callback });
			return id;
		},
		clearTimeout(id) {
			timers.delete(id);
		},
		async goto(href, options) {
			window.location = new URL(href, window.location);
			navigations.push({ url: window.location, options });
			page.set({ url: window.location });
		}
	};
	const { queryParameters } = runInNewContext(
		`${querySource.replace(/^import\s[\s\S]*?;\n/gm, '').replace(/^export /gm, '')}\n({ queryParameters });`,
		environment,
		{ filename: 'installed-sveltekit-search-params.js' }
	);
	const store = queryParameters(IDEAS_QUERY_PARAMETERS, IDEAS_QUERY_OPTIONS);
	const unsubscribe = store.subscribe(() => {});
	return {
		store,
		navigations,
		unsubscribe,
		url: () => window.location,
		snapshot: () => structuredClone(get(store)),
		async advance(milliseconds) {
			const until = now + milliseconds;
			while (true) {
				const next = [...timers.entries()]
					.filter(([, timer]) => timer.at <= until)
					.sort((a, b) => a[1].at - b[1].at)[0];
				if (!next) break;
				const [id, timer] = next;
				timers.delete(id);
				now = timer.at;
				await timer.callback();
				await Promise.resolve();
			}
			now = until;
		},
		navigate(path) {
			window.location = new URL(path, window.location);
			page.set({ url: window.location });
		}
	};
}

test('rapid empty search then All cannot restore the stale query', async () => {
	for (const eventDelay of [0, 50]) {
		const harness = queryHarness('/ideas?filter=temporal&show=Essay');
		try {
			const typed = get(harness.store);
			typed.filter = '';
			harness.store.set(typed);
			// Zero means both mutations happen before the library's batching timer fires.
			if (eventDelay) await harness.advance(eventDelay);

			const clickedAll = get(harness.store);
			clickedAll.show = [];
			harness.store.set(clickedAll);
			await harness.advance(600);

			assert.equal(harness.url().search, '');
			assert.deepEqual(harness.snapshot(), { filter: '', show: [] });
			assert.equal(harness.navigations.length, 1);
			assert.equal(harness.navigations[0].options.replaceState, true);
		} finally {
			harness.unsubscribe();
		}
	}
});

test('Clear search and filters replaces an already pending edit atomically', async () => {
	const harness = queryHarness('/ideas?filter=temporal&show=Essay');
	try {
		const typed = get(harness.store);
		typed.filter = 'temporal workflow';
		harness.store.set(typed);
		await harness.advance(75);
		harness.store.set({ ...get(harness.store), filter: '', show: [] });
		await harness.advance(600);

		assert.equal(harness.url().search, '');
		assert.deepEqual(harness.snapshot(), { filter: '', show: [] });
		assert.equal(harness.navigations.length, 1);
	} finally {
		harness.unsubscribe();
	}
});

test('combined edits preserve durable params, unrelated URL state, and navigation hydration', async () => {
	const harness = queryHarness('/ideas?utm_source=reader#archive');
	try {
		const typed = get(harness.store);
		typed.filter = 'temporal';
		harness.store.set(typed);
		await harness.advance(100);
		const selected = get(harness.store);
		selected.show = ['Essay', 'Talk'];
		harness.store.set(selected);
		await harness.advance(600);

		assert.equal(harness.url().searchParams.get('filter'), 'temporal');
		assert.equal(harness.url().searchParams.get('show'), 'Essay,Talk');
		assert.equal(harness.url().searchParams.get('utm_source'), 'reader');
		assert.equal(harness.url().hash, '#archive');
		assert.equal(harness.navigations.length, 1);

		harness.navigate('/ideas?filter=learning&show=Note');
		assert.deepEqual(harness.snapshot(), { filter: 'learning', show: ['Note'] });
		harness.navigate('/ideas');
		assert.deepEqual(harness.snapshot(), { filter: '', show: [] });
		await harness.advance(600);
		assert.equal(harness.url().search, '');
	} finally {
		harness.unsubscribe();
	}
});
