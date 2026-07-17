<script>
	import { onMount } from 'svelte';
	import {
		PRESENCE_ADMISSION_PREFIX,
		PRESENCE_REACTIONS,
		PRESENCE_SHARE_CELEBRATION_EVENT,
		PRESENCE_SHARE_REQUEST_EVENT,
		PRESENCE_VISIBILITY_KEY,
		celebrationFrame,
		countryFlag,
		countryLabel,
		decideAdmission,
		parsePresenceFrame,
		positionFrame,
		reactionFrame,
		reconnectDelay,
		shouldSendPosition
	} from '$lib/presence-client';

	/** @type {string} */
	export let pageKey;
	/** @type {number} */
	export let admissionRate = 1;

	/** @type {Map<string, import('$lib/presence-client').PresencePeer>} */
	let peers = new Map();
	/** @type {WebSocket | null} */
	let socket = null;
	/** @type {string | null} */
	let selfId = null;
	/** @type {Intl.DisplayNames | null} */
	let regionNames = null;
	/** @type {{ x: number, y: number, sentAt: number } | null} */
	let lastPosition = null;
	/** @type {{ x: number, y: number } | null} */
	let localTouch = null;
	let hidden = false;
	let admitted = false;
	let connected = false;
	let panelOpen = false;
	let isMobile = false;
	let reducedMotion = false;
	let stopped = false;
	let clock = Date.now();
	let viewportTick = 0;
	let reconnectAttempt = 0;
	let celebrated = false;
	let destroyed = false;
	/** @type {HTMLElement | null} */
	let pill = null;

	$: peerList = [...peers.values()].filter((peer) => peer.id !== selfId);
	$: readerCount = connected ? peerList.length + 1 : 0;

	/** @param {import('$lib/presence-client').PresencePeer} peer */
	function peerPosition(peer) {
		viewportTick;
		const width = Math.max(document.documentElement.scrollWidth, window.innerWidth);
		const height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
		return {
			x: peer.x * width - window.scrollX,
			y: peer.y * height - window.scrollY
		};
	}

	/** @param {string} country */
	function peerLabel(country) {
		return `${countryLabel(country, regionNames)} reader`;
	}

	/** @param {string} value */
	function send(value) {
		if (
			!hidden &&
			document.visibilityState === 'visible' &&
			socket?.readyState === WebSocket.OPEN
		) {
			socket.send(value);
		}
	}

	/** @param {number} x @param {number} y @param {'d' | 'r' | 't'} mode @param {number} interval @param {number} movement */
	function sendPosition(x, y, mode, interval, movement) {
		const now = Date.now();
		const next = { x, y };
		if (!shouldSendPosition(lastPosition, next, now, interval, movement)) return;
		send(positionFrame(x, y, mode));
		lastPosition = { ...next, sentAt: now };
	}

	function sendReadingDepth() {
		const height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
		const depth = (window.scrollY + window.innerHeight / 2) / height;
		sendPosition(0.985, depth, 'r', 1_000, 0.002);
	}

	/** @param {PointerEvent} event */
	function handlePointerMove(event) {
		if (isMobile || event.pointerType === 'touch') return;
		const width = Math.max(document.documentElement.scrollWidth, window.innerWidth);
		const height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
		sendPosition(
			(event.clientX + window.scrollX) / width,
			(event.clientY + window.scrollY) / height,
			'd',
			250,
			0.01
		);
	}

	/** @param {TouchEvent} event */
	function handleTouch(event) {
		const touch = event.touches[0] || event.changedTouches[0];
		if (!touch) return;
		const width = Math.max(document.documentElement.scrollWidth, window.innerWidth);
		const height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
		localTouch = { x: touch.clientX, y: touch.clientY };
		sendPosition(
			(touch.clientX + window.scrollX) / width,
			(touch.clientY + window.scrollY) / height,
			't',
			250,
			0.01
		);
		window.clearTimeout(handleTouch.fadeTimer);
		handleTouch.fadeTimer = window.setTimeout(() => {
			localTouch = null;
			lastPosition = null;
			sendReadingDepth();
		}, 1_500);
	}
	/** @type {number} */
	handleTouch.fadeTimer = 0;

	/** @param {MessageEvent} event */
	function handleMessage(event) {
		if (typeof event.data !== 'string' || event.data.length > 8_192) return;
		let raw;
		try {
			raw = JSON.parse(event.data);
		} catch {
			return;
		}
		const frame = parsePresenceFrame(raw);
		if (!frame) return;
		if (frame.type === 'welcome') {
			selfId = frame.selfId;
			peers = new Map(frame.peers.map((peer) => [peer.id, peer]));
		} else if (frame.type === 'snapshot') {
			peers = new Map(peers);
			for (const peer of frame.peers) peers.set(peer.id, peer);
		} else if (frame.type === 'join') {
			peers = new Map(peers).set(frame.peer.id, frame.peer);
		} else if (frame.type === 'move') {
			const peer = peers.get(frame.id);
			if (peer)
				peers = new Map(peers).set(frame.id, {
					...peer,
					x: frame.x,
					y: frame.y,
					mode: frame.mode,
					updatedAt: frame.now
				});
		} else if (frame.type === 'reaction') {
			const peer = peers.get(frame.id);
			if (peer)
				peers = new Map(peers).set(frame.id, {
					...peer,
					reaction: frame.reaction,
					reactionAt: frame.now
				});
		} else if (frame.type === 'celebration') {
			const peer = peers.get(frame.id);
			if (peer) peers = new Map(peers).set(frame.id, { ...peer, celebrationAt: frame.now });
		} else if (frame.type === 'leave') {
			peers = new Map(peers);
			peers.delete(frame.id);
		}
	}

	/** @param {boolean} immediate */
	function disconnect(immediate = false) {
		connected = false;
		const current = socket;
		socket = null;
		if (current && current.readyState < WebSocket.CLOSING)
			current.close(1000, immediate ? 'disabled' : 'hidden');
		peers = new Map();
		selfId = null;
	}

	function connect() {
		if (
			destroyed ||
			hidden ||
			stopped ||
			!admitted ||
			document.visibilityState !== 'visible' ||
			socket
		)
			return;
		const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const nextSocket = new WebSocket(
			`${protocol}//${location.host}/api/presence/${encodeURIComponent(pageKey)}`
		);
		socket = nextSocket;
		nextSocket.addEventListener('message', handleMessage);
		nextSocket.addEventListener('open', () => {
			if (socket !== nextSocket) return;
			connected = true;
			reconnectAttempt = 0;
			lastPosition = null;
			if (isMobile) sendReadingDepth();
		});
		nextSocket.addEventListener('close', (event) => {
			if (socket !== nextSocket) return;
			socket = null;
			connected = false;
			peers = new Map();
			if (event.code === 1013 || event.code === 1008) {
				stopped = true;
				return;
			}
			if (hidden || document.visibilityState !== 'visible') return;
			const attempt = reconnectAttempt++;
			if (attempt >= 8) return;
			window.setTimeout(connect, reconnectDelay(attempt));
		});
		nextSocket.addEventListener('error', () => nextSocket.close());
	}

	/** @param {boolean} nextHidden */
	function setHidden(nextHidden) {
		hidden = nextHidden;
		panelOpen = false;
		try {
			if (hidden) localStorage.setItem(PRESENCE_VISIBILITY_KEY, 'yes');
			else localStorage.removeItem(PRESENCE_VISIBILITY_KEY);
		} catch {
			// The in-memory preference still applies when storage is unavailable.
		}
		if (hidden) disconnect(true);
		else {
			stopped = false;
			window.setTimeout(connect, 2_000);
		}
	}

	/** @param {string} reaction */
	function react(reaction) {
		const frame = reactionFrame(reaction);
		if (frame) send(frame);
		panelOpen = false;
	}

	function requestShare() {
		const rect = pill?.getBoundingClientRect();
		window.dispatchEvent(
			new CustomEvent(PRESENCE_SHARE_REQUEST_EVENT, {
				detail: {
					x: rect ? rect.left + rect.width / 2 : window.innerWidth - 24,
					y: rect ? rect.top : window.innerHeight - 52
				}
			})
		);
		panelOpen = false;
	}

	onMount(() => {
		const mobileQuery = matchMedia('(pointer: coarse), (max-width: 700px)');
		const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
		const updateMedia = () => {
			isMobile = mobileQuery.matches;
			reducedMotion = motionQuery.matches;
		};
		updateMedia();
		mobileQuery.addEventListener('change', updateMedia);
		motionQuery.addEventListener('change', updateMedia);
		try {
			regionNames =
				typeof Intl.DisplayNames === 'function'
					? new Intl.DisplayNames([navigator.language], { type: 'region' })
					: null;
			hidden = localStorage.getItem(PRESENCE_VISIBILITY_KEY) === 'yes';
			const admissionKey = `${PRESENCE_ADMISSION_PREFIX}${pageKey}`;
			const stored = sessionStorage.getItem(admissionKey);
			admitted = decideAdmission(admissionRate, stored);
			if (!stored) sessionStorage.setItem(admissionKey, admitted ? 'yes' : 'no');
		} catch {
			admitted = decideAdmission(admissionRate, null);
		}

		let hiddenCloseTimer = 0;
		let connectTimer = 0;
		const scheduleInitialConnect = () => {
			window.clearTimeout(connectTimer);
			if (!hidden && admitted && document.visibilityState === 'visible')
				connectTimer = window.setTimeout(connect, 2_000);
		};
		const handleVisibility = () => {
			if (document.visibilityState === 'hidden') {
				window.clearTimeout(connectTimer);
				hiddenCloseTimer = window.setTimeout(() => disconnect(), 30_000);
			} else {
				window.clearTimeout(hiddenCloseTimer);
				if (!socket && !hidden) scheduleInitialConnect();
			}
		};
		const handleViewport = () => {
			viewportTick += 1;
			if (isMobile) sendReadingDepth();
		};
		const handleCelebration = () => {
			if (celebrated) return;
			celebrated = true;
			send(celebrationFrame());
		};

		scheduleInitialConnect();
		document.addEventListener('visibilitychange', handleVisibility);
		window.addEventListener('pointermove', handlePointerMove, { passive: true });
		window.addEventListener('touchstart', handleTouch, { passive: true });
		window.addEventListener('touchmove', handleTouch, { passive: true });
		window.addEventListener('scroll', handleViewport, { passive: true });
		window.addEventListener('resize', handleViewport);
		window.addEventListener(PRESENCE_SHARE_CELEBRATION_EVENT, handleCelebration);
		const clockTimer = window.setInterval(() => (clock = Date.now()), 250);

		return () => {
			destroyed = true;
			disconnect(true);
			window.clearTimeout(connectTimer);
			window.clearTimeout(hiddenCloseTimer);
			window.clearTimeout(handleTouch.fadeTimer);
			window.clearInterval(clockTimer);
			document.removeEventListener('visibilitychange', handleVisibility);
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('touchstart', handleTouch);
			window.removeEventListener('touchmove', handleTouch);
			window.removeEventListener('scroll', handleViewport);
			window.removeEventListener('resize', handleViewport);
			window.removeEventListener(PRESENCE_SHARE_CELEBRATION_EVENT, handleCelebration);
			mobileQuery.removeEventListener('change', updateMedia);
			motionQuery.removeEventListener('change', updateMedia);
		};
	});
</script>

{#if admitted || hidden}
	<div class:reduced={reducedMotion} class="live-presence" aria-live="polite">
		{#if !hidden}
			<div class="reading-rail" aria-hidden="true"></div>
			{#each peerList as peer (peer.id)}
				{@const position = peerPosition(peer)}
				{@const flag = countryFlag(peer.country)}
				{@const label = peerLabel(peer.country)}
				{#if peer.mode === 'r'}
					<span
						class="rail-marker"
						style={`--presence-y:${Math.min(0.94, Math.max(0.06, peer.y))};--presence-color:${peer.color}`}
						title={label}
						aria-label={label}>{flag}</span
					>
				{:else if position.y < 38 || position.y > innerHeight - 48}
					<span
						class:bottom={position.y > innerHeight - 48}
						class="offscreen-marker"
						style={`--presence-x:${Math.min(innerWidth - 36, Math.max(14, position.x))}px;--presence-color:${peer.color}`}
						title={label}
						aria-label={`${label}, ${position.y < 38 ? 'above' : 'below'} the viewport`}
						>{flag}</span
					>
				{:else}
					<span
						class:temporary={peer.mode === 't' && clock - peer.updatedAt < 1_500}
						class="remote-cursor"
						style={`--presence-x:${position.x}px;--presence-y:${position.y}px;--presence-color:${peer.color}`}
						title={label}
						aria-label={label}
					>
						<svg viewBox="0 0 24 28" aria-hidden="true"
							><path d="M2 2v21l5.3-5.2 3.7 8.1 4-1.9-3.7-7.8h7.4L2 2Z" /></svg
						>
						<span class="country-tag">{flag} {peer.country === 'XX' ? '' : peer.country}</span>
					</span>
				{/if}
				{#if peer.reaction && clock - peer.reactionAt < 1_800}
					<span
						class="peer-reaction"
						style={`--presence-x:${Math.min(innerWidth - 42, Math.max(18, position.x))}px;--presence-y:${Math.min(innerHeight - 44, Math.max(28, position.y))}px`}
						>{peer.reaction}</span
					>
				{/if}
				{#if clock - peer.celebrationAt < 1_400}
					<span
						class="peer-celebration"
						style={`--presence-x:${Math.min(innerWidth - 42, Math.max(18, position.x))}px;--presence-y:${Math.min(innerHeight - 44, Math.max(28, position.y))}px`}
						>✨</span
					>
				{/if}
			{/each}

			{#if localTouch}
				<span
					class="local-touch"
					style={`--presence-x:${localTouch.x}px;--presence-y:${localTouch.y}px`}
					aria-hidden="true">◌</span
				>
			{/if}

			<div
				class="presence-dock"
				bind:this={pill}
				role="group"
				aria-label="Live reader controls"
				on:contextmenu={(event) => {
					event.preventDefault();
					requestShare();
				}}
			>
				{#if panelOpen}
					<div class="presence-panel">
						<div class="reaction-row" aria-label="Wave to live readers">
							{#each PRESENCE_REACTIONS as reaction}
								<button
									type="button"
									on:click={() => react(reaction)}
									aria-label={`Send ${reaction}`}>{reaction}</button
								>
							{/each}
						</div>
						<button type="button" class="text-action" on:click={requestShare}
							>Share this page ✨</button
						>
						<button type="button" class="text-action" on:click={() => setHidden(true)}
							>Hide live readers</button
						>
						<p>Country is approximate and may reflect a VPN.</p>
					</div>
				{/if}
				<button
					type="button"
					class="presence-pill"
					aria-expanded={panelOpen}
					on:click={() => (panelOpen = !panelOpen)}
				>
					<span class:online={connected} class="status-dot"></span>
					{connected ? `${readerCount} here` : 'Live readers'} <span aria-hidden="true">· 👋</span>
				</button>
			</div>
		{:else}
			<button type="button" class="show-presence" on:click={() => setHidden(false)}
				>Show live readers</button
			>
		{/if}
	</div>
{/if}

<style>
	.live-presence {
		position: fixed;
		inset: 0;
		z-index: 70;
		pointer-events: none;
		font: 600 12px/1.2 var(--font-body);
		color: var(--page-text);
	}
	.presence-dock,
	.show-presence {
		position: fixed;
		right: max(12px, env(safe-area-inset-right));
		bottom: max(12px, env(safe-area-inset-bottom));
		pointer-events: auto;
	}
	.presence-pill,
	.show-presence {
		border: 1px solid var(--page-border);
		border-radius: 999px;
		background: color-mix(in srgb, var(--page-surface) 94%, transparent);
		color: var(--page-text);
		box-shadow: 0 8px 24px rgb(15 23 42 / 0.13);
		backdrop-filter: blur(10px);
		cursor: pointer;
		padding: 9px 12px;
	}
	.show-presence {
		color: var(--page-muted);
		font-size: 11px;
	}
	.status-dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		margin-right: 5px;
		border-radius: 50%;
		background: var(--page-muted);
	}
	.status-dot.online {
		background: #16a34a;
		box-shadow: 0 0 0 3px rgb(22 163 74 / 0.14);
	}
	.presence-panel {
		position: absolute;
		right: 0;
		bottom: calc(100% + 8px);
		width: 220px;
		border: 1px solid var(--page-border);
		border-radius: 12px;
		background: var(--page-surface);
		box-shadow: 0 14px 40px rgb(15 23 42 / 0.18);
		padding: 10px;
	}
	.reaction-row {
		display: flex;
		justify-content: space-between;
		gap: 4px;
	}
	.reaction-row button {
		width: 36px;
		height: 34px;
		border: 0;
		border-radius: 8px;
		background: var(--page-section-bg);
		cursor: pointer;
		font-size: 17px;
	}
	.reaction-row button:hover {
		background: var(--page-accent-soft);
	}
	.text-action {
		display: block;
		width: 100%;
		border: 0;
		border-top: 1px solid var(--page-border);
		background: transparent;
		color: var(--page-text);
		cursor: pointer;
		margin-top: 8px;
		padding: 9px 4px 2px;
		text-align: left;
		font: inherit;
	}
	.presence-panel p {
		color: var(--page-muted);
		font-size: 10px;
		font-weight: 400;
		line-height: 1.35;
		margin: 9px 4px 1px;
	}
	.remote-cursor {
		position: fixed;
		left: 0;
		top: 0;
		transform: translate3d(var(--presence-x), var(--presence-y), 0);
		transition: transform 220ms linear;
		pointer-events: none;
	}
	.remote-cursor svg {
		width: 18px;
		height: 21px;
		filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.22));
		fill: var(--presence-color);
		stroke: white;
		stroke-width: 1.5px;
	}
	.country-tag {
		position: absolute;
		left: 14px;
		top: 16px;
		white-space: nowrap;
		border: 1px solid color-mix(in srgb, var(--presence-color) 42%, var(--page-border));
		border-radius: 999px;
		background: var(--page-surface);
		padding: 3px 6px;
		color: var(--page-text);
		box-shadow: 0 2px 8px rgb(15 23 42 / 0.12);
	}
	.reading-rail {
		display: none;
		position: fixed;
		right: 5px;
		top: 8vh;
		bottom: 8vh;
		width: 2px;
		border-radius: 2px;
		background: var(--page-border);
	}
	.rail-marker {
		position: fixed;
		right: 0;
		top: calc(var(--presence-y) * 100vh);
		transform: translateY(-50%);
		width: 24px;
		height: 24px;
		display: grid;
		place-items: center;
		border: 2px solid var(--presence-color);
		border-radius: 50%;
		background: var(--page-surface);
		font-size: 13px;
		box-shadow: 0 2px 8px rgb(15 23 42 / 0.14);
	}
	.offscreen-marker {
		position: fixed;
		left: var(--presence-x);
		top: 6px;
		transform: translateX(-50%);
		border-bottom: 2px solid var(--presence-color);
		border-radius: 8px;
		background: var(--page-surface);
		padding: 2px 5px;
	}
	.offscreen-marker.bottom {
		top: auto;
		bottom: 6px;
		border-top: 2px solid var(--presence-color);
		border-bottom: 0;
	}
	.peer-reaction,
	.peer-celebration,
	.local-touch {
		position: fixed;
		left: var(--presence-x);
		top: var(--presence-y);
		transform: translate(-50%, -125%);
		font-size: 23px;
		animation: presence-pop 1.4s ease-out both;
	}
	.peer-celebration {
		font-size: 20px;
	}
	.local-touch {
		color: var(--page-accent);
		font-size: 30px;
		animation: touch-fade 1.5s ease-out both;
	}
	@keyframes presence-pop {
		from {
			opacity: 0;
			transform: translate(-50%, -70%) scale(0.65);
		}
		20% {
			opacity: 1;
		}
		to {
			opacity: 0;
			transform: translate(-50%, -190%) scale(1.15);
		}
	}
	@keyframes touch-fade {
		from {
			opacity: 0.75;
			transform: translate(-50%, -50%) scale(0.55);
		}
		to {
			opacity: 0;
			transform: translate(-50%, -50%) scale(1.4);
		}
	}
	.reduced .remote-cursor {
		transition: none;
	}
	.reduced .peer-reaction,
	.reduced .peer-celebration,
	.reduced .local-touch {
		animation: none;
		opacity: 1;
	}
	@media (pointer: coarse), (max-width: 700px) {
		.reading-rail {
			display: block;
		}
		.presence-dock,
		.show-presence {
			right: max(10px, env(safe-area-inset-right));
			bottom: max(10px, env(safe-area-inset-bottom));
		}
		.presence-pill {
			padding: 10px 13px;
		}
	}
</style>
