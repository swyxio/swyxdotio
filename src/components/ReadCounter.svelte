<script>
	import { onMount } from 'svelte';
	import { READ_DEDUPE_MS, READ_SCROLL_FRACTION, READ_VISIBLE_MS } from '$lib/read-counter';

	/** @type {string} */
	export let pageKey;
	export let requireDepth = false;

	/** @type {number | null} */
	let reads = null;

	const formatter = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
	});

	/** @param {'GET' | 'POST'} method @param {AbortSignal} signal */
	async function requestCount(method, signal) {
		const response = await fetch(`/api/reads/${encodeURIComponent(pageKey)}`, {
			method,
			signal,
			credentials: 'same-origin',
			keepalive: method === 'POST',
			headers: method === 'POST' ? { 'x-swyx-read': 'engaged' } : undefined
		});
		if (!response.ok) return false;
		const payload = await response.json();
		if (!Number.isSafeInteger(payload.reads) || payload.reads < 0) return false;
		reads = payload.reads;
		return true;
	}

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
			void requestCount('GET', controller.signal).catch(() => {});
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
				if (await requestCount('POST', controller.signal)) {
					try {
						localStorage.setItem(storageKey, `${Date.now()}`);
					} catch {
						// The counter intentionally does not require persistent client storage.
					}
				}
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

{#if reads !== null}
	<span
		class="read-counter"
		title="Privacy-friendly engaged reads, counted at most once per browser per day"
		>{formatter.format(reads)} {reads === 1 ? 'read' : 'reads'}</span
	>
{/if}

<style>
	.read-counter {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
