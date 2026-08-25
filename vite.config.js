// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { sveltekitOG } from '@ethercorps/sveltekit-og/plugin';
import { ssp } from 'sveltekit-search-params/plugin';

/**
 * just-bash's published browser bundle still statically imports node:zlib for
 * optional gzip support. Those commands are unavailable in our browser sandbox;
 * keep its compatibility shim scoped to that exact dependency and worker.
 * @returns {import('vite').Plugin}
 */
function drawingSandboxBrowserCompat() {
	const virtualModule = '\0swyx-draw-agent-browser-zlib';
	return {
		name: 'drawing-sandbox-browser-zlib',
		enforce: 'pre',
		resolveId(source, importer) {
			if (
				source === 'node:zlib' &&
				importer?.replaceAll('\\', '/').includes('/just-bash/dist/bundle/browser.js')
			) {
				return virtualModule;
			}
		},
		load(id) {
			if (id !== virtualModule) return;
			return `export const constants = Object.freeze({ Z_BEST_COMPRESSION: 9, Z_BEST_SPEED: 1, Z_DEFAULT_COMPRESSION: -1 });
export function gunzipSync() { throw new Error('Compressed files are unavailable in the drawing sandbox.'); }
export function gzipSync() { throw new Error('Compressed files are unavailable in the drawing sandbox.'); }`;
		}
	};
}

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
		format: 'es',
		plugins: () => [drawingSandboxBrowserCompat()]
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
