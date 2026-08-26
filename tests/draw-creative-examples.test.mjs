import assert from 'node:assert/strict';
import test from 'node:test';
import {
	referenceCatalog,
	emptyFewShot,
	validateFewShot,
	toggleExampleField,
	fewShotPrompt,
	MAX_FEW_SHOT_EXAMPLES
} from '../src/lib/draw-creative-examples.js';

const observed = referenceCatalog.examples.find((example) => example.thumbnailText);
const noHook = referenceCatalog.examples.find((example) => !example.thumbnailText);
const selected = (examples) => ({ ...emptyFewShot(), examples });
const promptRecords = (prompt) => JSON.parse(prompt.slice(prompt.indexOf('\n') + 1));

test('the seven-channel snapshot resolves every latest/top card to one correctly owned canonical video', () => {
	assert.equal(referenceCatalog.channels.length, 7);
	const byId = new Map(referenceCatalog.examples.map((example) => [example.id, example]));
	assert.equal(
		byId.size,
		referenceCatalog.examples.length,
		'same video must not become duplicate example records'
	);
	assert.equal(
		new Set(referenceCatalog.examples.map((example) => example.videoId)).size,
		byId.size
	);
	const referenced = new Set();
	for (const channel of referenceCatalog.channels) {
		for (const collection of [channel.latestIds, channel.topIds]) {
			assert.equal(collection.length, 5, channel.slug);
			assert.equal(new Set(collection).size, 5, 'one list cannot contain the same video twice');
			for (const id of collection) {
				const example = byId.get(id);
				assert.ok(example, `${channel.slug} references a missing example ${id}`);
				assert.equal(example.channelId, channel.id, 'a card must belong to its researched channel');
				assert.match(example.videoId, /^[A-Za-z0-9_-]{11}$/);
				assert.equal(example.id, `yt-${example.videoId}`);
				assert.equal(example.url, `https://www.youtube.com/watch?v=${example.videoId}`);
				assert.equal(new URL(example.thumbnailUrl).hostname, 'i.ytimg.com');
				assert.ok(example.title.trim());
				assert.ok(Number.isFinite(Date.parse(example.retrievedAt)));
				referenced.add(id);
			}
		}
	}
	assert.equal(
		referenced.size,
		byId.size,
		'no orphan public examples should ship outside the curated collections'
	);
	const matt = referenceCatalog.channels.find((channel) => channel.slug === 'matt-pocock');
	assert.deepEqual(
		matt.latestIds.filter((id) => matt.topIds.includes(id)),
		['yt-M6mYodf0dJM']
	);
	assert.equal(
		referenceCatalog.examples.filter((example) => example.id === 'yt-M6mYodf0dJM').length,
		1
	);
	for (const [slug, id, handle] of [
		['matthew-berman', 'UCawZsQWqfGSbCI5yjkdVkTA', '@matthew_berman'],
		['matt-pocock', 'UCswG6FSbgZjbWtdf_hMLaow', '@mattpocockuk'],
		['theprimeagen', 'UC8ENHE5xdFSwx71u3fDH5Xw', '@ThePrimeagen']
	]) {
		const channel = referenceCatalog.channels.find((item) => item.slug === slug);
		assert.equal(channel.id, id, `do not replace ${slug} with a similarly named channel`);
		assert.equal(channel.handle, handle);
	}
});

test('field toggles are reversible, preserve notes, and never mutate the previous selection', () => {
	assert.ok(observed);
	const initial = selected([
		{ id: observed.id, fields: ['title'], note: 'Compare hierarchy only.' }
	]);
	const original = structuredClone(initial);
	const withHook = toggleExampleField(initial, observed.id, 'hook');
	assert.deepEqual(initial, original);
	assert.deepEqual(withHook.examples[0].fields, ['title', 'hook']);
	assert.equal(withHook.examples[0].note, initial.examples[0].note);
	const hookOnly = toggleExampleField(withHook, observed.id, 'title');
	assert.deepEqual(hookOnly.examples[0].fields, ['hook']);
	assert.deepEqual(toggleExampleField(hookOnly, observed.id, 'hook'), emptyFewShot());
	const full = selected(
		referenceCatalog.examples
			.slice(0, MAX_FEW_SHOT_EXAMPLES)
			.map((example) => ({ id: example.id, fields: ['title'] }))
	);
	assert.throws(
		() => toggleExampleField(full, referenceCatalog.examples[MAX_FEW_SHOT_EXAMPLES].id, 'title'),
		/six/
	);
	assert.equal(
		toggleExampleField(full, full.examples[0].id, 'title').examples.length,
		MAX_FEW_SHOT_EXAMPLES - 1
	);
});

test('unknown IDs, stale snapshots, duplicate roles and excess selections fail without substituting examples', () => {
	assert.deepEqual(validateFewShot(undefined), emptyFewShot());
	for (const value of [
		{ ...emptyFewShot(), catalogVersion: 'old-snapshot' },
		selected([{ id: 'unknown-example', fields: ['title'] }]),
		selected(
			Array.from({ length: 7 }, (_, index) => ({
				id: referenceCatalog.examples[index].id,
				fields: ['title']
			}))
		),
		selected([
			{ id: observed.id, fields: ['title'] },
			{ id: observed.id, fields: ['visual'] }
		]),
		selected([{ id: observed.id, fields: [] }]),
		selected([{ id: observed.id, fields: ['title', 'title'] }]),
		selected([{ id: observed.id, fields: ['facts'] }]),
		selected([{ id: observed.id, fields: ['title'], note: 'x'.repeat(1001) }])
	])
		assert.throws(() => validateFewShot(value));
});

test('a hook without observed wording is unavailable both through toggles and direct selections', () => {
	assert.ok(noHook, 'catalog retains examples with unavailable thumbnail wording honestly');
	assert.throws(() => toggleExampleField(emptyFewShot(), noHook.id, 'hook'), /wording|transcribed/);
	assert.throws(() => validateFewShot(selected([{ id: noHook.id, fields: ['hook'] }])));
});

test('title requests receive only explicitly selected text roles, never visual bytes or example facts as evidence', () => {
	const other = referenceCatalog.examples.find((example) => example.id !== observed.id);
	const selection = selected([
		{ id: observed.id, fields: ['hook', 'visual'], note: 'Large type, no copied episode facts.' },
		{ id: other.id, fields: ['title'] }
	]);
	const prompt = fewShotPrompt(selection, ['title', 'hook']);
	const records = promptRecords(prompt);
	assert.deepEqual(records[0], {
		id: observed.id,
		channel: referenceCatalog.channels.find((channel) => channel.id === observed.channelId).name,
		roles: ['hook'],
		source: observed.url,
		observedThumbnailText: observed.thumbnailText,
		userNote: selection.examples[0].note
	});
	assert.equal(records[1].exampleTitle, other.title);
	assert.equal(records[1].observedThumbnailText, undefined);
	assert.match(prompt, /style demonstrations only; not evidence/);
	assert.match(prompt, /Do not copy names, claims, numbers or quotations/);
	assert.match(prompt, /entries supply text only/);
	assert.equal(prompt.includes(observed.thumbnailUrl), false);
	assert.equal(prompt.includes(other.thumbnailUrl), false);
	assert.equal(/data:image|base64|image_url/.test(prompt), false);
	assert.equal(
		fewShotPrompt(selected([{ id: observed.id, fields: ['visual'] }]), ['title', 'hook']),
		''
	);
});

test('visual selections stay textual comparison notes and never become image attachments', () => {
	const prompt = fewShotPrompt(
		selected([{ id: observed.id, fields: ['visual'], note: 'Compare this portrait scale.' }])
	);
	const [record] = promptRecords(prompt);
	assert.equal(record.visualNote, 'Compare this portrait scale.');
	assert.equal(record.exampleTitle, undefined);
	assert.equal(record.observedThumbnailText, undefined);
	assert.equal(prompt.includes(observed.thumbnailUrl), false);
	assert.match(prompt, /entries supply text only/);
});

test('inline binary notes are rejected before they can become text-provider payloads', () => {
	assert.throws(() =>
		fewShotPrompt(
			selected([{ id: observed.id, fields: ['title'], note: 'data:image/png;base64,AAAA' }]),
			['title', 'hook']
		)
	);
});
