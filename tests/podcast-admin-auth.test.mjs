import assert from 'node:assert/strict';
import test from 'node:test';

import {
	createPodcastStudioSession,
	isPodcastStudioSessionValid,
	podcastStudioCookieName,
	podcastStudioCookieOptions,
	secretsMatch
} from '../src/lib/podcast-admin-auth.js';

const now = Date.parse('2026-06-03T12:00:00.000Z');

test('podcast studio sessions are valid until their seven-day expiry', async () => {
	const session = await createPodcastStudioSession('session-secret', now);
	assert.equal(await isPodcastStudioSessionValid(session, 'session-secret', now), true);
	assert.equal(
		await isPodcastStudioSessionValid(session, 'session-secret', now + 7 * 24 * 60 * 60 * 1000),
		false
	);
});

test('podcast studio sessions are invalid after secret rotation or tampering', async () => {
	const session = await createPodcastStudioSession('session-secret', now);
	assert.equal(await isPodcastStudioSessionValid(session, 'rotated-secret', now), false);
	assert.equal(await isPodcastStudioSessionValid(`${session}0`, 'session-secret', now), false);
	assert.equal(await isPodcastStudioSessionValid('invalid', 'session-secret', now), false);
});

test('podcast studio cookie remains narrowly scoped and private', () => {
	assert.equal(podcastStudioCookieName(), 'swyx_podcast_studio');
	assert.deepEqual(podcastStudioCookieOptions(true), {
		httpOnly: true,
		path: '/tools',
		sameSite: 'strict',
		secure: true,
		maxAge: 7 * 24 * 60 * 60
	});
});

test('secret comparison rejects missing and mismatched values', () => {
	assert.equal(secretsMatch('password', 'password'), true);
	assert.equal(secretsMatch('password', 'passw0rd'), false);
	assert.equal(secretsMatch('', ''), false);
	assert.equal(secretsMatch(null, 'password'), false);
});
