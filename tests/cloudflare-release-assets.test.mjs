import assert from 'node:assert/strict';
import test from 'node:test';

import config from '../vite.config.js';

test('production builds share identical immutable browser and worker assets', () => {
	const plugin = config.plugins.find(({ name }) => name === 'shared-immutable-worker-assets');
	assert.ok(plugin);
	assert.equal(plugin.apply, 'build');

	const output = {
		entryFileNames: '_app/immutable/workers/[name]-[hash].js',
		chunkFileNames: '_app/immutable/workers/chunks/[hash].js',
		assetFileNames: '_app/immutable/workers/assets/[name]-[hash][extname]'
	};

	plugin.configResolved({ worker: { rollupOptions: { output } } });

	assert.equal(output.assetFileNames, '_app/immutable/assets/[name].[hash][extname]');
	assert.equal(output.entryFileNames, '_app/immutable/workers/[name]-[hash].js');
	assert.equal(output.chunkFileNames, '_app/immutable/workers/chunks/[hash].js');
});

test('production builds reject an unsupported worker output contract', () => {
	const plugin = config.plugins.find(({ name }) => name === 'shared-immutable-worker-assets');

	assert.throws(
		() => plugin.configResolved({ worker: { rollupOptions: {} } }),
		/Expected SvelteKit to configure one worker asset output/
	);
	assert.throws(
		() => plugin.configResolved({ worker: { rollupOptions: { output: [] } } }),
		/Expected SvelteKit to configure one worker asset output/
	);
});

test('production builds skip gzip calculations used only for terminal reports', () => {
	assert.equal(config.build.reportCompressedSize, false);
});
