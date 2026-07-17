<script>
	import { onMount } from 'svelte';
	import {
		READ_COUNT_VISIBILITY_KEY,
		READ_DEDUPE_MS,
		READ_SAMPLE_WEIGHT,
		READ_SCROLL_FRACTION,
		READ_VISIBLE_MS,
		readCountsAreHidden,
		shouldSampleRead
	} from '$lib/read-counter';

	/** @type {string} */
	export let pageKey;
	export let requireDepth = false;

	/** @type {number | null} */
	let reads = null;
	let countsHidden = false;
	const ANALYTICS_CLIENT_KEY = 'swyx:analytics:client:v2';
	const ANALYTICS_SESSION_KEY = 'swyx:analytics:session:v1';
	const ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
	const READ_COUNT_KEY_PREFIX = 'swyx:read-count:';
	const READ_COUNT_VISIBILITY_EVENT = 'swyx:read-count-visibility';

	const formatter = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
	});

	/** @param {'GET' | 'POST'} method @param {AbortSignal} signal */
	async function requestCount(method, signal) {
		const analytics = method === 'POST' ? getAnalyticsContext() : null;
		const response = await fetch(`/api/reads/${encodeURIComponent(pageKey)}`, {
			method,
			signal,
			credentials: 'same-origin',
			keepalive: method === 'POST',
			headers:
				method === 'POST'
					? {
							'content-type': 'application/json',
							'x-swyx-read': 'engaged',
							'x-swyx-sample-weight': `${READ_SAMPLE_WEIGHT}`
						}
					: undefined,
			body: method === 'POST' ? JSON.stringify(analytics) : undefined
		});
		if (!response.ok) return false;
		const payload = await response.json();
		if (!Number.isSafeInteger(payload.reads) || payload.reads < 0) return false;
		reads = payload.reads;
		try {
			localStorage.setItem(`${READ_COUNT_KEY_PREFIX}${pageKey}`, `${reads}`);
		} catch {
			// Cached display values are optional.
		}
		return true;
	}

	function getAnalyticsContext() {
		const globalPrivacyControl = /** @type {Navigator & { globalPrivacyControl?: boolean }} */ (
			navigator
		).globalPrivacyControl;
		const doNotTrack = navigator.doNotTrack?.toLowerCase();
		if (globalPrivacyControl || doNotTrack === '1' || doNotTrack === 'yes') return null;
		try {
			let clientId = localStorage.getItem(ANALYTICS_CLIENT_KEY);
			if (!clientId) {
				const random = crypto.getRandomValues(new Uint32Array(1))[0];
				clientId = `${random}.${Math.floor(Date.now() / 1000)}`;
				localStorage.setItem(ANALYTICS_CLIENT_KEY, clientId);
			}
			const now = Date.now();
			const storedSession = JSON.parse(localStorage.getItem(ANALYTICS_SESSION_KEY) || 'null');
			const sessionId =
				storedSession && now - Number(storedSession.lastSeenMs) < ANALYTICS_SESSION_TIMEOUT_MS
					? `${storedSession.id}`
					: `${Math.floor(now / 1000)}`;
			localStorage.setItem(
				ANALYTICS_SESSION_KEY,
				JSON.stringify({ id: sessionId, lastSeenMs: now })
			);
			return {
				clientId,
				sessionId,
				engagementTimeMs: READ_VISIBLE_MS
			};
		} catch {
			return null;
		}
	}

	function toggleReadCountVisibility() {
		countsHidden = !countsHidden;
		try {
			if (countsHidden) localStorage.setItem(READ_COUNT_VISIBILITY_KEY, 'hidden');
			else localStorage.removeItem(READ_COUNT_VISIBILITY_KEY);
		} catch {
			// The preference still applies to this page when storage is unavailable.
		}
		window.dispatchEvent(
			new CustomEvent(READ_COUNT_VISIBILITY_EVENT, { detail: { hidden: countsHidden } })
		);
	}

	onMount(() => {
		function readPreference() {
			try {
				countsHidden = readCountsAreHidden(localStorage.getItem(READ_COUNT_VISIBILITY_KEY));
			} catch {
				countsHidden = false;
			}
		}

		/** @param {StorageEvent} event */
		function handleStorage(event) {
			if (event.key === READ_COUNT_VISIBILITY_KEY) readPreference();
		}

		/** @param {Event} event */
		function handlePreferenceEvent(event) {
			const detail = /** @type {CustomEvent<{ hidden?: unknown }>} */ (event).detail;
			countsHidden = detail?.hidden === true;
		}

		readPreference();
		window.addEventListener('storage', handleStorage);
		window.addEventListener(READ_COUNT_VISIBILITY_EVENT, handlePreferenceEvent);
		return () => {
			window.removeEventListener('storage', handleStorage);
			window.removeEventListener(READ_COUNT_VISIBILITY_EVENT, handlePreferenceEvent);
		};
	});

	onMount(() => {
		const controller = new AbortController();
		const storageKey = `swyx:read:${pageKey}`;
		let storedAt = 0;
		try {
			storedAt = Number(localStorage.getItem(storageKey) || 0);
		} catch {
			// Storage can be unavailable in privacy modes; counting still works.
		}

		if (Date.now() - storedAt < READ_DEDUPE_MS) {
			try {
				const storedCount = Number(localStorage.getItem(`${READ_COUNT_KEY_PREFIX}${pageKey}`));
				if (Number.isSafeInteger(storedCount) && storedCount >= 0) reads = storedCount;
				else void requestCount('GET', controller.signal).catch(() => {});
			} catch {
				void requestCount('GET', controller.signal).catch(() => {});
			}
			return () => controller.abort();
		}

		let visibleMs = 0;
		let depthReached = !requireDepth;
		let recording = false;

		function updateDepth() {
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			depthReached = scrollable <= 600 || window.scrollY / scrollable >= READ_SCROLL_FRACTION;
		}

		async function recordIfEngaged() {
			if (recording || visibleMs < READ_VISIBLE_MS || !depthReached) return;
			recording = true;
			try {
				localStorage.setItem(storageKey, `${Date.now()}`);
			} catch {
				// Sampling does not depend on storage being available.
			}
			try {
				await requestCount(shouldSampleRead(Math.random()) ? 'POST' : 'GET', controller.signal);
			} catch {
				// Counting must never affect reading the page.
			}
		}

		if (requireDepth) {
			updateDepth();
			window.addEventListener('scroll', updateDepth, { passive: true });
			window.addEventListener('resize', updateDepth);
		}

		const timer = window.setInterval(() => {
			if (document.visibilityState === 'visible') visibleMs += 1000;
			void recordIfEngaged();
		}, 1000);

		return () => {
			controller.abort();
			window.clearInterval(timer);
			window.removeEventListener('scroll', updateDepth);
			window.removeEventListener('resize', updateDepth);
		};
	});
</script>

{#if countsHidden}
	<button
		type="button"
		class="read-counter-toggle"
		aria-label="Show approximate view count"
		on:click={toggleReadCountVisibility}>Show view count</button
	>
{:else if reads !== null}
	<span class="read-counter-control">
		<span
			class="read-counter"
			title="Approximate lifetime reads: historical estimate plus engaged reads from a 0.5% sample"
			>~{formatter.format(reads)} {reads === 1 ? 'read' : 'reads'}</span
		>
		<button
			type="button"
			class="read-counter-toggle"
			aria-label="Hide view counts"
			on:click={toggleReadCountVisibility}>hide</button
		>
	</span>
{/if}

<style>
	.read-counter-control {
		display: inline-flex;
		align-items: baseline;
		gap: 0.35rem;
	}

	.read-counter {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.read-counter-toggle {
		margin: 0;
		border: 0;
		padding: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		line-height: inherit;
		text-decoration: underline;
		text-underline-offset: 0.15em;
		opacity: 0.7;
		cursor: pointer;
	}

	.read-counter-toggle:hover,
	.read-counter-toggle:focus-visible {
		opacity: 1;
	}
</style>
