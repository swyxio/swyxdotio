import { createToolsSession, toolsSessionCookieName } from '../../src/lib/server/tools-auth.js';

export const TEST_TOOLS_OWNER = {
	id: '111111111111111111111',
	email: 'owner@example.com',
	name: 'Test owner'
};
export const TEST_TOOLS_MEMBER = {
	id: '222222222222222222222',
	email: 'member@example.com',
	name: 'Test member'
};
const TEST_SECRET = 'draw-test-session-secret-at-least-32-characters';

/** Test-only signed identities. Never mint cookies for a remote environment. */
/** @param {import('@playwright/test').Page} page @param {typeof TEST_TOOLS_OWNER} [user] */
export async function authenticateTools(page, user = TEST_TOOLS_OWNER) {
	const url = new URL(page.url());
	if (!['localhost', '127.0.0.1'].includes(url.hostname))
		throw new Error('Test identities are localhost-only');
	await page.context().addCookies([
		{
			name: toolsSessionCookieName(),
			value: await createToolsSession(user, TEST_SECRET),
			domain: url.hostname,
			path: '/tools',
			httpOnly: true,
			secure: false,
			sameSite: 'Lax'
		}
	]);
	return url.origin;
}
