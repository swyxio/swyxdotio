import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

export default [
	{ ignores: ['.svelte-kit/**', '.wrangler/**', 'build/**', 'static/**', 'test-results/**'] },
	js.configs.recommended,
	...svelte.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.serviceworker
			}
		}
	},
	{
		files: ['workers/**/*.js'],
		languageOptions: { globals: { WebSocketPair: 'readonly' } }
	},
	{
		files: ['**/*.ts'],
		languageOptions: { parser: tsParser },
		rules: { 'no-undef': 'off' }
	},
	{
		files: ['**/*.svelte'],
		languageOptions: { parserOptions: { parser: tsParser, svelteConfig } }
	},
	prettier
];
