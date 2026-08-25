// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { sveltekitOG } from '@ethercorps/sveltekit-og/plugin';
import { ssp } from 'sveltekit-search-params/plugin';

/** @type {import('vite').UserConfig & { test: { include: string[] } }} */
const config = {
	plugins: [
		ssp(),
		sveltekit(),
		sveltekitOG(),
		{
			name: 'shared-immutable-worker-assets',
			apply: 'build',
			configResolved(resolved) {
				const output = resolved.worker.rollupOptions.output;
				if (!output || Array.isArray(output)) {
					throw new Error('Expected SvelteKit to configure one worker asset output.');
				}
				output.assetFileNames = '_app/immutable/assets/[name].[hash][extname]';
			}
		}
	],
	build: {
		reportCompressedSize: false
	},
	worker: {
		format: 'es'
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	server: {
		fs: {
			// https://vitejs.dev/config/server-options.html#server-fs-allow
			// allows importing readme for About page
			allow: ['..']
		}
	}
};

export default config;
