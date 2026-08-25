/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
	webServer: {
		command:
			'npm run build && npm run preview:draw -- --port 4173 --env-file tests/fixtures/draw.dev.vars',
		port: 4173,
		timeout: 120_000,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'tests'
};

export default config;
