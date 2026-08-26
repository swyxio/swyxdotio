import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT, decodeJwt, exportJWK, generateKeyPair } from 'jose';
import {
	createToolsSession,
	getToolsSession,
	getToolsUser,
	googleAuthConfig,
	readToolsSession,
	safeToolsNext,
	toolsSessionCookieName,
	toolsSessionCookieOptions
} from '../src/lib/server/tools-auth.js';
import { finishGoogleSignIn, startGoogleSignIn } from '../src/lib/server/tools-google-auth.js';
import {
	clearPersonalToolsSession,
	requirePersonalToolsOwner
} from '../src/lib/personal-tools-auth.js';
import { requirePodcastStudio } from '../src/lib/podcast-admin-route.js';
import { handle } from '../src/hooks.server.js';

const SECRET = 'tools-auth-test-session-secret-at-least-32-bytes';
const IDENTITY = { id: '111111111111111111111', email: 'owner@example.com', name: 'Owner' };
const now = Date.parse('2026-08-25T12:00:00Z');
const env = {
	TOOLS_SESSION_SECRET: SECRET,
	TOOLS_OWNER_GOOGLE_SUB: IDENTITY.id,
	GOOGLE_CLIENT_ID: 'google-client-id',
	GOOGLE_CLIENT_SECRET: 'google-client-secret',
	GOOGLE_REDIRECT_URI: 'https://swyx.io/tools/auth/google/callback'
};

function createEvent(path = '/tools/auth/google?next=/tools/draw', overrides = {}) {
	const values = new Map();
	const operations = [];
	const url = new URL(path, 'https://swyx.io');
	return {
		url,
		request: new Request(url, { headers: { Origin: url.origin } }),
		platform: { env: { ...env, ...overrides } },
		cookies: {
			get: (key) => values.get(key),
			set: (key, value, options) => {
				values.set(key, value);
				operations.push({ action: 'set', key, options });
			},
			delete: (key, options) => {
				values.delete(key);
				operations.push({ action: 'delete', key, options });
			}
		},
		values,
		operations
	};
}

async function provider(claimOverrides = {}, options = {}) {
	const { privateKey, publicKey } = await generateKeyPair('RS256');
	const publicJwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
	const calls = [];
	let expectedNonce;
	const fetchProvider = async (input, init) => {
		const url = String(input);
		calls.push({ url, body: init?.body ? new URLSearchParams(init.body) : null });
		if (url.endsWith('/.well-known/openid-configuration'))
			return Response.json({
				issuer: 'https://accounts.google.com',
				authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
				token_endpoint: 'https://oauth2.googleapis.com/token',
				jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
				response_types_supported: ['code'],
				subject_types_supported: ['public'],
				id_token_signing_alg_values_supported: ['RS256']
			});
		if (url === 'https://www.googleapis.com/oauth2/v3/certs')
			return Response.json({ keys: [publicJwk] });
		if (url === 'https://oauth2.googleapis.com/token') {
			const issued = Math.floor(Date.now() / 1000);
			const signingKey = options.badSignature
				? (await generateKeyPair('RS256')).privateKey
				: privateKey;
			const idToken = await new SignJWT({
				iss: 'https://accounts.google.com',
				aud: env.GOOGLE_CLIENT_ID,
				sub: IDENTITY.id,
				iat: issued,
				exp: issued + 300,
				nonce: expectedNonce,
				email: IDENTITY.email,
				email_verified: true,
				name: IDENTITY.name,
				...claimOverrides
			})
				.setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
				.sign(signingKey);
			return Response.json({
				access_token: 'never-persist-access-token',
				token_type: 'Bearer',
				expires_in: 300,
				id_token: idToken
			});
		}
		throw new Error(`Unexpected provider URL ${url}`);
	};
	return {
		fetchProvider,
		calls,
		setNonce: (nonce) => {
			expectedNonce = nonce;
		}
	};
}

async function startFlow(claimOverrides = {}, options = {}) {
	const event = createEvent();
	const google = await provider(claimOverrides, options);
	const start = await startGoogleSignIn(event, google.fetchProvider);
	const authorize = new URL(start.headers.get('location'));
	google.setNonce(authorize.searchParams.get('nonce'));
	event.url = new URL(env.GOOGLE_REDIRECT_URI);
	event.url.searchParams.set('code', 'test-once-only-authorization-code');
	event.url.searchParams.set('state', authorize.searchParams.get('state'));
	return { event, google, authorize, start };
}

test('signed identity sessions expire after seven days and reject tampering, old shared-password cookies, and rotation', async () => {
	const token = await createToolsSession(IDENTITY, SECRET, now);
	assert.deepEqual(await readToolsSession(token, SECRET, now), IDENTITY);
	assert.equal(await readToolsSession(token, SECRET, now + 7 * 24 * 60 * 60 * 1000), null);
	assert.equal(await readToolsSession(token, `${SECRET}-rotated`, now), null);
	assert.equal(await readToolsSession(`${token}x`, SECRET, now), null);
	assert.equal(await readToolsSession('9999999999.old-password-hmac', SECRET, now), null);
	assert.equal(await readToolsSession(token, SECRET, now - 60_000), null);
	await assert.rejects(() => createToolsSession(IDENTITY, 'short'));
	assert.deepEqual(toolsSessionCookieOptions(true), {
		httpOnly: true,
		path: '/tools',
		sameSite: 'lax',
		secure: true,
		maxAge: 604800
	});
});

test('roles use the current configured Google subject, never email, name, or signed extra role fields', async () => {
	const event = createEvent();
	event.values.set(
		toolsSessionCookieName(),
		await createToolsSession({ ...IDENTITY, isOwner: true }, SECRET)
	);
	assert.equal((await getToolsUser(event)).isOwner, true);
	event.platform.env.TOOLS_OWNER_GOOGLE_SUB = '222222222222222222222';
	assert.equal((await getToolsUser(event)).isOwner, false);
	delete event.platform.env.TOOLS_OWNER_GOOGLE_SUB;
	assert.equal((await getToolsUser(event)).isOwner, false);
	assert.equal((await getToolsSession(event)).googleConfigured, true);
	assert.deepEqual(await getToolsSession(createEvent('/tools', { TOOLS_SESSION_SECRET: '' })), {
		authenticated: false,
		user: null,
		googleConfigured: false
	});
});

test('Google configuration and return targets fail closed, while alternate hosts redirect to the registered host', async () => {
	for (const tool of ['draw', 'box']) {
		assert.equal(safeToolsNext(`/tools/${tool}`), `/tools/${tool}`);
		assert.equal(safeToolsNext(`/${tool}`), `/tools/${tool}`);
	}
	for (const path of [
		'https://evil.example',
		'//evil.example',
		'/tools/auth/google',
		'/tools/api/session',
		'/tools/../evil',
		'/draw?next=evil',
		'/tools/draw?next=evil',
		'/tools/box/../auth/google'
	])
		assert.equal(safeToolsNext(path), '/tools');
	for (const uri of [
		'https://evil.example/tools/auth/google/callback',
		'http://swyx.io/tools/auth/google/callback',
		'https://swyx.io/tools/auth/google/callback?next=evil',
		'https://swyx.io/wrong'
	])
		assert.equal(googleAuthConfig({ env: { ...env, GOOGLE_REDIRECT_URI: uri } }), null);
	assert.ok(
		googleAuthConfig({
			env: { ...env, GOOGLE_REDIRECT_URI: 'http://localhost:4173/tools/auth/google/callback' }
		})
	);
	const event = createEvent('https://preview.workers.dev/tools/auth/google?next=/tools/draw');
	const response = await startGoogleSignIn(event, () => {
		throw new Error('No discovery on alternate hosts');
	});
	assert.equal(
		response.headers.get('location'),
		'https://swyx.io/tools/auth/google?next=%2Ftools%2Fdraw'
	);
	assert.equal(event.values.size, 0);
});

test('Google OIDC flow binds state, nonce, PKCE and verified identity and stores no Google tokens', async () => {
	const { event, google, authorize, start } = await startFlow();
	assert.equal(start.status, 303);
	assert.equal(authorize.searchParams.get('scope'), 'openid email profile');
	assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
	assert.equal(authorize.searchParams.get('access_type'), null);
	assert.equal(authorize.searchParams.get('redirect_uri'), env.GOOGLE_REDIRECT_URI);
	assert.equal(event.operations[0].options.httpOnly, true);
	assert.equal(event.operations[0].options.sameSite, 'lax');
	const transaction = decodeJwt(event.values.get('swyx_tools_google_oauth'));
	const result = await finishGoogleSignIn(event, google.fetchProvider);
	assert.equal(result.headers.get('location'), '/tools/draw');
	assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
	assert.deepEqual(
		await readToolsSession(event.values.get(toolsSessionCookieName()), SECRET),
		IDENTITY
	);
	assert.equal(event.values.has('swyx_tools_google_oauth'), false);
	const exchange = google.calls.find(({ url }) => url.endsWith('/token'));
	assert.equal(exchange.body.get('code_verifier'), transaction.verifier);
	assert.equal(exchange.body.get('redirect_uri'), env.GOOGLE_REDIRECT_URI);
	assert.equal(
		google.calls.some(({ url }) => url.endsWith('/certs')),
		true
	);
	const cookiePayload = decodeJwt(event.values.get(toolsSessionCookieName()));
	assert.deepEqual(Object.keys(cookiePayload).sort(), [
		'aud',
		'email',
		'exp',
		'iat',
		'iss',
		'name',
		'sub'
	]);
});

test('mismatched state, cancellation and missing transactions clear cookies before any token request', async () => {
	for (const failure of ['state', 'cancelled', 'missing']) {
		const { event, google } = await startFlow();
		event.values.set(toolsSessionCookieName(), await createToolsSession(IDENTITY, SECRET));
		if (failure === 'state') event.url.searchParams.set('state', 'untrusted');
		if (failure === 'cancelled') event.url.searchParams.set('error', 'access_denied');
		if (failure === 'missing') event.values.delete('swyx_tools_google_oauth');
		const result = await finishGoogleSignIn(event, google.fetchProvider);
		assert.equal(result.headers.get('location'), '/tools?authError=google');
		assert.equal(event.values.size, 0);
		assert.equal(
			google.calls.some(({ url }) => url.endsWith('/token')),
			false
		);
	}
});

test('ID token signature, issuer, audience, expiry, nonce and email verification are all enforced', async () => {
	for (const [claims, options] of [
		[{ iss: 'https://evil.example' }, {}],
		[{ aud: 'another-client' }, {}],
		[{ exp: 1 }, {}],
		[{ nonce: 'wrong-nonce' }, {}],
		[{ email_verified: false }, {}],
		[{}, { badSignature: true }]
	]) {
		const { event, google } = await startFlow(claims, options);
		const result = await finishGoogleSignIn(event, google.fetchProvider);
		assert.equal(
			result.headers.get('location'),
			'/tools?authError=google',
			JSON.stringify([claims, options])
		);
		assert.equal(event.values.size, 0);
	}
});

test('expired and tampered OAuth transactions never reach Google', async () => {
	for (const tampered of [true, false]) {
		const event = createEvent(env.GOOGLE_REDIRECT_URI);
		let token = await new SignJWT({
			state: 'a'.repeat(43),
			verifier: 'b'.repeat(43),
			nonce: 'c'.repeat(43),
			next: '/tools/draw'
		})
			.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
			.setIssuer('swyx-tools')
			.setAudience('google-oauth')
			.setIssuedAt(1)
			.setExpirationTime(2)
			.sign(new TextEncoder().encode(SECRET));
		if (tampered) token += 'x';
		event.values.set('swyx_tools_google_oauth', token);
		const result = await finishGoogleSignIn(event, () => {
			throw new Error('Should not reach Google');
		});
		assert.equal(result.headers.get('location'), '/tools?authError=google');
		assert.equal(event.values.size, 0);
	}
});

test('owner-only page and publishing guards reject ordinary users and logout rejects cross-origin requests', async () => {
	const event = createEvent('/tools');
	await assert.rejects(() => requirePersonalToolsOwner(event), { status: 303 });
	await assert.rejects(() => requirePodcastStudio(event), { status: 401 });
	event.values.set(
		toolsSessionCookieName(),
		await createToolsSession({ ...IDENTITY, id: 'other-user' }, SECRET)
	);
	await assert.rejects(() => requirePersonalToolsOwner(event), { status: 403 });
	await assert.rejects(() => requirePodcastStudio(event), { status: 403 });
	event.request = new Request(event.url, { headers: { Origin: 'https://evil.example' } });
	assert.throws(() => clearPersonalToolsSession(event), { status: 403 });
	assert.equal(event.values.size, 1);
	event.request = new Request(event.url, { headers: { Origin: event.url.origin } });
	clearPersonalToolsSession(event);
	assert.equal(event.values.size, 0);
	event.values.set(toolsSessionCookieName(), await createToolsSession(IDENTITY, SECRET));
	event.request.headers.set('X-Tools-User', 'previous-user');
	await assert.rejects(() => requirePodcastStudio(event), { status: 409 });
});

test('tools pages, API responses, and auth redirects bypass shared edge cache and set private headers', async () => {
	const original = globalThis.caches;
	let cacheCalls = 0;
	try {
		globalThis.caches = {
			default: {
				match: () => {
					cacheCalls++;
					return undefined;
				},
				put: () => {
					cacheCalls++;
				}
			}
		};
		for (const path of [
			'/tools',
			'/tools/draw',
			'/tools/box',
			'/tools/api/session',
			'/tools/auth/google/callback?code=private'
		]) {
			const event = createEvent(path);
			const result = await handle({
				event,
				resolve: async () =>
					new Response(null, {
						status: 303,
						headers: { Location: '/tools/draw', 'Cache-Control': 's-maxage=3600' }
					})
			});
			assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
			assert.equal(result.headers.get('Referrer-Policy'), 'no-referrer');
			assert.equal(result.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
		}
		assert.equal(cacheCalls, 0);
	} finally {
		globalThis.caches = original;
	}
});
