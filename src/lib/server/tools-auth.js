import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_ISSUER = 'swyx-tools';
const SESSION_AUDIENCE = 'tools-session';
const CALLBACK_PATH = '/tools/auth/google/callback';

/** @typedef {{ id: string, email: string, name: string }} ToolsIdentity */
/** @typedef {ToolsIdentity & { isOwner: boolean }} ToolsUser */
/** @typedef {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform'>} ToolsSessionEvent */

/** @param {unknown} secret */
export function validToolsSessionSecret(secret) {
	return typeof secret === 'string' && encoder.encode(secret).byteLength >= 32;
}

/** @param {unknown} user @returns {user is ToolsIdentity} */
function validIdentity(user) {
	if (!user || typeof user !== 'object') return false;
	const value = /** @type {ToolsIdentity} */ (user);
	return (
		typeof value.id === 'string' &&
		/^[A-Za-z0-9_-]{1,255}$/.test(value.id) &&
		typeof value.email === 'string' &&
		value.email.length <= 320 &&
		/^[^\s@]+@[^\s@]+$/.test(value.email) &&
		typeof value.name === 'string' &&
		value.name.length <= 200
	);
}

/** @param {ToolsIdentity} user @param {string} secret @param {number} [now] */
export async function createToolsSession(user, secret, now = Date.now()) {
	if (!validIdentity(user) || !validToolsSessionSecret(secret))
		throw new Error('Invalid tools session configuration');
	return new SignJWT({ email: user.email, name: user.name })
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuer(SESSION_ISSUER)
		.setAudience(SESSION_AUDIENCE)
		.setSubject(user.id)
		.setIssuedAt(Math.floor(now / 1000))
		.setExpirationTime(Math.floor(now / 1000) + SESSION_TTL_SECONDS)
		.sign(encoder.encode(secret));
}

/** @param {unknown} token @param {unknown} secret @param {number} [now] @returns {Promise<ToolsIdentity | null>} */
export async function readToolsSession(token, secret, now = Date.now()) {
	if (typeof token !== 'string' || token.length > 4096 || !validToolsSessionSecret(secret))
		return null;
	try {
		const { payload } = await jwtVerify(token, encoder.encode(/** @type {string} */ (secret)), {
			algorithms: ['HS256'],
			issuer: SESSION_ISSUER,
			audience: SESSION_AUDIENCE,
			typ: 'JWT',
			requiredClaims: ['sub', 'iat', 'exp'],
			maxTokenAge: SESSION_TTL_SECONDS,
			currentDate: new Date(now)
		});
		const user = { id: payload.sub, email: payload.email, name: payload.name };
		return validIdentity(user) ? user : null;
	} catch {
		return null;
	}
}

export function toolsSessionCookieName() {
	return 'swyx_tools_session';
}

/** @param {boolean} secure @returns {Parameters<import('@sveltejs/kit').Cookies['set']>[2]} */
export function toolsSessionCookieOptions(secure) {
	return { httpOnly: true, path: '/tools', sameSite: 'lax', secure, maxAge: SESSION_TTL_SECONDS };
}

/** Owner privilege is evaluated against current configuration, never a cookie role or email. @param {ToolsSessionEvent} event @returns {Promise<ToolsUser | null>} */
export async function getToolsUser(event) {
	const user = await readToolsSession(
		event.cookies.get(toolsSessionCookieName()),
		event.platform?.env?.TOOLS_SESSION_SECRET
	);
	if (!user) return null;
	const owner = event.platform?.env?.TOOLS_OWNER_GOOGLE_SUB;
	return { ...user, isOwner: Boolean(owner && user.id === owner) };
}

/** @param {App.Platform | undefined} platform */
export function googleAuthConfig(platform) {
	const env = platform?.env;
	if (
		!env?.GOOGLE_CLIENT_ID ||
		!env.GOOGLE_CLIENT_SECRET ||
		!validToolsSessionSecret(env.TOOLS_SESSION_SECRET)
	)
		return null;
	try {
		const redirectUri = new URL(env.GOOGLE_REDIRECT_URI ?? `https://swyx.io${CALLBACK_PATH}`);
		const canonical = redirectUri.origin === 'https://swyx.io';
		const local =
			redirectUri.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirectUri.hostname);
		if (
			(!canonical && !local) ||
			redirectUri.pathname !== CALLBACK_PATH ||
			redirectUri.search ||
			redirectUri.hash ||
			redirectUri.username ||
			redirectUri.password
		)
			return null;
		return {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			sessionSecret: /** @type {string} */ (env.TOOLS_SESSION_SECRET),
			redirectUri
		};
	} catch {
		return null;
	}
}

/** @param {ToolsSessionEvent} event */
export async function getToolsSession(event) {
	const user = await getToolsUser(event);
	return {
		authenticated: Boolean(user),
		user,
		googleConfigured: Boolean(googleAuthConfig(event.platform))
	};
}

/** A small allowlist avoids open redirects, auth loops, and API destinations. @param {unknown} value */
export function safeToolsNext(value) {
	if (value === '/draw' || value === '/box') return `/tools${value}`;
	return typeof value === 'string' &&
		[
			'/tools',
			'/tools/draw',
			'/tools/box',
			'/tools/podcast',
			'/tools/reclip',
			'/tools/logs'
		].includes(value)
		? value
		: '/tools';
}
