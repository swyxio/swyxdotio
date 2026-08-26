import * as oidc from 'openid-client';
import { SignJWT, jwtVerify } from 'jose';
import {
	createToolsSession,
	googleAuthConfig,
	safeToolsNext,
	toolsSessionCookieName,
	toolsSessionCookieOptions
} from './tools-auth.js';

const ISSUER = 'https://accounts.google.com';
const TRANSACTION_COOKIE = 'swyx_tools_google_oauth';
const TRANSACTION_TTL_SECONDS = 10 * 60;
const encoder = new TextEncoder();
const PRIVATE_HEADERS = {
	'Cache-Control': 'private, no-store',
	'Referrer-Policy': 'no-referrer',
	'X-Robots-Tag': 'noindex, nofollow, noarchive'
};
/** @typedef {Pick<import('@sveltejs/kit').RequestEvent, 'cookies' | 'platform' | 'url' | 'request'>} OAuthEvent */
/** @typedef {{ state: string, verifier: string, nonce: string, next: string }} Transaction */

/** @param {URL} url */
function transactionOptions(url) {
	return {
		...toolsSessionCookieOptions(url.protocol === 'https:'),
		path: '/tools/auth/google',
		maxAge: TRANSACTION_TTL_SECONDS
	};
}
/** @param {string} destination */
function redirectTo(destination) {
	return new Response(null, {
		status: 303,
		headers: { ...PRIVATE_HEADERS, Location: destination }
	});
}
/** @param {OAuthEvent} event */
function clearTransaction(event) {
	event.cookies.delete(TRANSACTION_COOKIE, transactionOptions(event.url));
}
/** @param {NonNullable<ReturnType<typeof googleAuthConfig>>} settings @param {typeof fetch} fetchProvider */
function discover(settings, fetchProvider) {
	return oidc.discovery(new URL(ISSUER), settings.clientId, settings.clientSecret, undefined, {
		[oidc.customFetch]: (url, options) => fetchProvider(url, /** @type {RequestInit} */ (options)),
		timeout: 10,
		execute: [oidc.enableNonRepudiationChecks]
	});
}

/** @param {OAuthEvent} event @param {typeof fetch} [fetchProvider] */
export async function startGoogleSignIn(event, fetchProvider = fetch) {
	const settings = googleAuthConfig(event.platform);
	if (!settings) return redirectTo('/tools?authError=unavailable');
	const next = safeToolsNext(event.url.searchParams.get('next'));
	// Cookies must be set on the registered callback host, not a preview alias.
	if (event.url.origin !== settings.redirectUri.origin) {
		const canonical = new URL('/tools/auth/google', settings.redirectUri);
		canonical.searchParams.set('next', next);
		return redirectTo(canonical.href);
	}
	try {
		const config = await discover(settings, fetchProvider);
		const transaction = {
			state: oidc.randomState(),
			verifier: oidc.randomPKCECodeVerifier(),
			nonce: oidc.randomNonce(),
			next
		};
		const token = await new SignJWT(transaction)
			.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
			.setIssuer('swyx-tools')
			.setAudience('google-oauth')
			.setIssuedAt()
			.setExpirationTime('10m')
			.sign(encoder.encode(settings.sessionSecret));
		event.cookies.set(TRANSACTION_COOKIE, token, transactionOptions(event.url));
		const url = oidc.buildAuthorizationUrl(config, {
			redirect_uri: settings.redirectUri.href,
			scope: 'openid email profile',
			code_challenge: await oidc.calculatePKCECodeChallenge(transaction.verifier),
			code_challenge_method: 'S256',
			state: transaction.state,
			nonce: transaction.nonce,
			prompt: 'select_account'
		});
		return redirectTo(url.href);
	} catch {
		clearTransaction(event);
		return redirectTo('/tools?authError=google');
	}
}

/** @param {OAuthEvent} event @param {typeof fetch} [fetchProvider] */
export async function finishGoogleSignIn(event, fetchProvider = fetch) {
	const settings = googleAuthConfig(event.platform);
	const transactionToken = event.cookies.get(TRANSACTION_COOKIE);
	clearTransaction(event);
	try {
		if (
			!settings ||
			!transactionToken ||
			transactionToken.length > 4096 ||
			event.url.origin !== settings.redirectUri.origin ||
			event.url.pathname !== settings.redirectUri.pathname
		)
			throw new Error('Invalid OAuth callback');
		const { payload } = await jwtVerify(transactionToken, encoder.encode(settings.sessionSecret), {
			algorithms: ['HS256'],
			issuer: 'swyx-tools',
			audience: 'google-oauth',
			typ: 'JWT',
			requiredClaims: ['iat', 'exp'],
			maxTokenAge: TRANSACTION_TTL_SECONDS
		});
		if (
			!['state', 'verifier', 'nonce'].every(
				(key) =>
					typeof payload[key] === 'string' &&
					/^[A-Za-z0-9_-]{32,128}$/.test(/** @type {string} */ (payload[key]))
			)
		)
			throw new Error('Invalid OAuth transaction');
		const transaction = /** @type {Transaction} */ (/** @type {unknown} */ (payload));
		if (
			event.url.searchParams.get('state') !== transaction.state ||
			event.url.searchParams.has('error')
		)
			throw new Error('Invalid OAuth state');
		const config = await discover(settings, fetchProvider);
		const tokens = await oidc.authorizationCodeGrant(config, event.url, {
			expectedState: transaction.state,
			expectedNonce: transaction.nonce,
			pkceCodeVerifier: transaction.verifier,
			idTokenExpected: true
		});
		const claims = tokens.claims();
		if (!claims || claims.email_verified !== true || typeof claims.email !== 'string')
			throw new Error('Unverified Google identity');
		const user = {
			id: claims.sub,
			email: claims.email,
			name: typeof claims.name === 'string' ? claims.name.slice(0, 200) : ''
		};
		event.cookies.set(
			toolsSessionCookieName(),
			await createToolsSession(user, settings.sessionSecret),
			toolsSessionCookieOptions(event.url.protocol === 'https:')
		);
		// No Google access, refresh, or ID tokens are persisted or sent to the browser.
		return redirectTo(safeToolsNext(transaction.next));
	} catch {
		event.cookies.delete(
			toolsSessionCookieName(),
			toolsSessionCookieOptions(event.url.protocol === 'https:')
		);
		return redirectTo('/tools?authError=google');
	}
}
