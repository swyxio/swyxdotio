// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { sveltekitOG } from '@ethercorps/sveltekit-og/plugin';
import { ssp } from 'sveltekit-search-params/plugin';

/** @type {import('vite').UserConfig & { test: { include: string[] } }} */
const config = {
	plugins: [ssp(), sveltekit(), sveltekitOG()],
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
