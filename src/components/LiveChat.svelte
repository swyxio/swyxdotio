<script>
	import { onMount, tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { PRESENCE_REACTIONS } from '$lib/presence-client';
	import { normalizePresenceNick } from '$lib/presence-contracts';

	/** @type {boolean} */
	export let collapsed = false;
	/** @type {boolean} */
	export let allowSidebar = true;
	/** @type {string} */
	export let nick = '';
	/** @type {import('$lib/presence-client').PresenceSummary} */
	export let presence = {
		pageKey: null,
		hidden: false,
		admitted: false,
		connected: false,
		stopped: false,
		pages: [],
		otherCount: 0
	};
	/** @type {(hidden: boolean) => void} */
	export let onPresenceVisibility = () => {};
	/** @type {(reaction: string) => void} */
	export let onPresenceReaction = () => {};
	/** @type {(event: MouseEvent) => void} */
	export let onPresenceShare = () => {};

	/** @typedef {{ id: string, nick: string, text: string, createdAt: number }} ChatMessage */
	/** @typedef {{ x: number, y: number, width: number, height: number }} Geometry */
	/** @type {ChatMessage[]} */
	let messages = [];
	/** @type {WebSocket | null} */
	let socket = null;
	/** @type {{ requestId: string, nick: string, text: string } | null} */
	let pending = null;
	/** @type {HTMLButtonElement | undefined} */
	let launcher;
	/** @type {HTMLElement | undefined} */
	let panel;
	/** @type {HTMLElement | undefined} */
	let log;
	/** @type {HTMLFormElement | undefined} */
	let form;
	/** @type {HTMLTextAreaElement | undefined} */
	let composer;
	/** @type {HTMLElement | undefined} */
	let readerPanel;
	/** @type {HTMLButtonElement | undefined} */
	let readerToggle;
	let ready = false;
	let status = 'Connecting';
	let error = '';
	let nickSaveTimer = 0;
	let draft = '';
	const quickMessages = [
		{ label: '👋 hey', text: 'Hey everyone! 👋' },
		{ label: '💡 ideas', text: 'What are you working on?' },
		{ label: '❤️ love it', text: 'Love this site! ❤️' }
	];
	let reconnectAttempt = 0;
	let reconnectTimer = 0;
	let expiryTimer = 0;
	let destroyed = false;
	let showReaders = false;
	let unread = 0;
	/** @type {Set<string>} */
	const seenMessageIds = new SvelteSet();
	$: unreadLabel = `${unread} unread ${unread === 1 ? 'message' : 'messages'}`;
	let previousLogScroll = 0;
	let wasAtLogBottom = true;
	$: readerStatus = presence.hidden
		? 'Live readers hidden'
		: !presence.pageKey || !presence.admitted || presence.stopped
			? 'Live readers unavailable'
			: !presence.connected
				? 'Connecting readers…'
				: `${presence.otherCount} other ${presence.otherCount === 1 ? 'reader' : 'readers'} online`;
	const retentionMs = 48 * 60 * 60 * 1000;
	const geometryKey = 'swyx:chat:geometry:v1';
	let wideLayout = false;
	/** @type {Geometry} */
	let geometry = { x: 0, y: 0, width: 0, height: 0 };
	/** @type {Geometry} */
	let preferredGeometry = geometry;
	/** @type {{ pointerId: number, kind: 'move' | 'resize', x: number, y: number, geometry: Geometry } | null} */
	let gesture = null;

	function viewport() {
		const visual = window.visualViewport;
		return {
			x: visual?.offsetLeft ?? 0,
			y: visual?.offsetTop ?? 0,
			width: visual?.width ?? window.innerWidth,
			height: visual?.height ?? window.innerHeight
		};
	}

	/** @param {Geometry} value */
	function clampGeometry(value) {
		const view = viewport();
		const margin = 8;
		const maxWidth = Math.max(1, view.width - margin * 2);
		const maxHeight = Math.max(1, view.height - margin * 2);
		const width = Math.min(maxWidth, Math.max(Math.min(268, maxWidth), value.width));
		const height = Math.min(maxHeight, Math.max(Math.min(340, maxHeight), value.height));
		return {
			x: Math.max(view.x + margin, Math.min(value.x, view.x + view.width - width - margin)),
			y: Math.max(view.y + margin, Math.min(value.y, view.y + view.height - height - margin)),
			width,
			height
		};
	}

	/** @param {boolean} wide */
	function defaultGeometry(wide) {
		const view = viewport();
		const width = wide && allowSidebar ? 268 : 336;
		const height = Math.min(wide && allowSidebar ? 576 : 510, view.height - 16);
		return clampGeometry({ x: view.x + 16, y: view.y + view.height - height - 16, width, height });
	}

	/** @param {boolean} wide */
	function loadGeometry(wide) {
		try {
			const saved = JSON.parse(
				localStorage.getItem(`${geometryKey}:${wide ? 'wide' : 'standard'}`) || 'null'
			);
			if (
				saved &&
				['x', 'y', 'width', 'height'].every((key) =>
					Number.isFinite(/** @type {Record<string, unknown>} */ (saved)[key])
				)
			)
				return saved;
		} catch {
			// Use the default window position when storage is unavailable.
		}
		return defaultGeometry(wide);
	}

	function rememberGeometry() {
		preferredGeometry = { ...geometry };
		try {
			localStorage.setItem(
				`${geometryKey}:${wideLayout ? 'wide' : 'standard'}`,
				JSON.stringify(preferredGeometry)
			);
		} catch {
			// The window remains movable when storage is unavailable.
		}
	}

	function syncViewport() {
		if (gesture) return;
		const wide = matchMedia('(min-width: 1500px)').matches;
		if (wide !== wideLayout) {
			wideLayout = wide;
			preferredGeometry = loadGeometry(wide);
		}
		geometry = clampGeometry(preferredGeometry);
	}

	/** @param {PointerEvent} event @param {'move' | 'resize'} kind */
	function startGesture(event, kind) {
		if (event.button !== 0 || gesture) return;
		const handle = /** @type {HTMLElement} */ (event.currentTarget);
		event.preventDefault();
		handle.setPointerCapture(event.pointerId);
		gesture = { pointerId: event.pointerId, kind, x: event.clientX, y: event.clientY, geometry };
	}

	/** @param {PointerEvent} event */
	function moveGesture(event) {
		if (!gesture || event.pointerId !== gesture.pointerId) return;
		const dx = event.clientX - gesture.x;
		const dy = event.clientY - gesture.y;
		geometry = clampGeometry(
			gesture.kind === 'move'
				? { ...gesture.geometry, x: gesture.geometry.x + dx, y: gesture.geometry.y + dy }
				: {
						...gesture.geometry,
						width: gesture.geometry.width + dx,
						height: gesture.geometry.height + dy
					}
		);
	}

	/** @param {PointerEvent} event */
	function finishGesture(event) {
		if (!gesture || event.pointerId !== gesture.pointerId) return;
		gesture = null;
		if (matchMedia('(min-width: 1500px)').matches === wideLayout) rememberGeometry();
		syncViewport();
	}

	/** @param {KeyboardEvent} event @param {'move' | 'resize'} kind */
	function geometryKeydown(event, kind) {
		const step = event.shiftKey ? 48 : 12;
		const dx = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
		const dy = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
		if (!dx && !dy) return;
		event.preventDefault();
		event.stopPropagation();
		geometry = clampGeometry(
			kind === 'move'
				? { ...geometry, x: geometry.x + dx, y: geometry.y + dy }
				: { ...geometry, width: geometry.width + dx, height: geometry.height + dy }
		);
		rememberGeometry();
	}

	/** @param {unknown} value @returns {value is ChatMessage} */
	function isMessage(value) {
		if (!value || typeof value !== 'object') return false;
		const message = /** @type {Record<string, unknown>} */ (value);
		return (
			typeof message.id === 'string' &&
			typeof message.nick === 'string' &&
			typeof message.text === 'string' &&
			typeof message.createdAt === 'number' &&
			Number.isFinite(message.createdAt)
		);
	}

	/** @param {number} now */
	function expireMessages(now = Date.now()) {
		messages = messages.filter((message) => message.createdAt > now - retentionMs);
		window.clearTimeout(expiryTimer);
		const nextExpiry = Math.min(...messages.map((message) => message.createdAt + retentionMs));
		if (Number.isFinite(nextExpiry)) {
			expiryTimer = window.setTimeout(() => expireMessages(), Math.max(0, nextExpiry - now));
		}
	}

	async function scrollLatest() {
		await tick();
		if (log) log.scrollTop = log.scrollHeight;
	}

	/** @param {MessageEvent} event */
	function receive(event) {
		if (typeof event.data !== 'string' || event.data.length > 600_000) return;
		let frame;
		try {
			frame = JSON.parse(event.data);
		} catch {
			return;
		}
		if (!frame || typeof frame !== 'object') return;
		if (frame.type === 'history' && Array.isArray(frame.messages)) {
			messages = frame.messages.filter(isMessage).slice(-150);
			for (const message of messages) rememberMessage(message.id);
			expireMessages();
			void scrollLatest();
		} else if (frame.type === 'message' && isMessage(frame.message)) {
			if (!messages.some((message) => message.id === frame.message.id)) {
				noteMessage(frame.message.id);
				messages = [...messages, frame.message].slice(-150);
				expireMessages();
				void scrollLatest();
			}
		} else if (frame.type === 'ack' && pending && frame.requestId === pending.requestId) {
			if (draft.trim() === pending.text) draft = '';
			pending = null;
			error = '';
		} else if (frame.type === 'error' && typeof frame.message === 'string') {
			if (!frame.requestId || frame.requestId === pending?.requestId) pending = null;
			error = frame.message;
		}
	}

	/** @param {string} id */
	function rememberMessage(id) {
		seenMessageIds.add(id);
		const oldest = seenMessageIds.values().next().value;
		if (seenMessageIds.size > 512 && oldest) seenMessageIds.delete(oldest);
	}

	/** @param {string} id */
	export function noteMessage(id) {
		if (seenMessageIds.has(id)) return;
		rememberMessage(id);
		if (collapsed || showReaders || document.visibilityState !== 'visible') unread += 1;
	}

	function disconnect() {
		window.clearTimeout(reconnectTimer);
		const current = socket;
		socket = null;
		if (current && current.readyState < WebSocket.CLOSING) current.close(1000, 'closed');
		if (pending) {
			pending = null;
			error = 'Your message may not have sent. Check recent messages before trying again.';
		}
	}

	function connect() {
		if (destroyed || collapsed || socket) return;
		status = reconnectAttempt ? 'Reconnecting' : 'Connecting';
		const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const next = new WebSocket(`${protocol}//${location.host}/api/chat`);
		socket = next;
		next.addEventListener('message', receive);
		next.addEventListener('open', () => {
			if (socket !== next) return;
			status = 'Connected';
			reconnectAttempt = 0;
		});
		next.addEventListener('close', () => {
			if (socket !== next) return;
			socket = null;
			status = 'Offline';
			if (pending) {
				pending = null;
				error = 'Your message may not have sent. Check recent messages before trying again.';
			}
			if (destroyed || collapsed || reconnectAttempt >= 8) return;
			const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt++);
			reconnectTimer = window.setTimeout(connect, delay);
		});
		next.addEventListener('error', () => next.close());
	}

	async function openChat() {
		geometry = clampGeometry(preferredGeometry);
		collapsed = false;
		if (!showReaders && document.visibilityState === 'visible') unread = 0;
		reconnectAttempt = 0;
		connect();
		await tick();
		panel?.focus({ preventScroll: true });
	}

	async function closeChat() {
		collapsed = true;
		disconnect();
		await tick();
		launcher?.focus({ preventScroll: true });
	}

	/** @param {MouseEvent} event */
	function followReaderPage(event) {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		showReaders = false;
		void closeChat();
	}

	/** @param {SubmitEvent} event */
	function sendMessage(event) {
		event.preventDefault();
		const cleanNick = nick.trim();
		const cleanText = draft.trim();
		if (!cleanNick || !cleanText || pending || socket?.readyState !== WebSocket.OPEN) return;
		const requestId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
		pending = { requestId, nick: cleanNick, text: cleanText };
		error = '';
		try {
			localStorage.setItem('swyx:chat:nick:v1', cleanNick);
		} catch {
			// The nickname still applies for this visit.
		}
		socket.send(JSON.stringify({ type: 'message', requestId, nick: cleanNick, text: cleanText }));
	}

	/** @param {KeyboardEvent} event */
	function keydown(event) {
		if (event.key === 'Escape' && !event.isComposing && !event.defaultPrevented) {
			// Let the share menu handle Escape before dismissing the chat behind it.
			if (document.querySelector('[data-share-ui][role="menu"]')) return;
			event.preventDefault();
			event.stopPropagation();
			void closeChat();
		}
	}

	async function toggleReaders() {
		if (!showReaders) {
			previousLogScroll = log?.scrollTop ?? 0;
			wasAtLogBottom = !log || log.scrollHeight - log.clientHeight - log.scrollTop <= 2;
			showReaders = true;
			await tick();
			const firstControl = /** @type {HTMLElement | null | undefined} */ (
				readerPanel?.querySelector('a, button:not([disabled])')
			);
			(firstControl ?? readerPanel)?.focus({ preventScroll: true });
			return;
		}
		showReaders = false;
		if (document.visibilityState === 'visible') unread = 0;
		await tick();
		if (log) log.scrollTop = wasAtLogBottom ? log.scrollHeight : previousLogScroll;
		readerToggle?.focus({ preventScroll: true });
	}

	/** @param {KeyboardEvent} event */
	function composerKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			form?.requestSubmit();
		}
	}

	/** @param {string} text */
	async function quickMessage(text) {
		const separator = draft && !/\s$/.test(draft) ? ' ' : '';
		if (draft.length + separator.length + text.length > 500) return;
		draft += separator + text;
		await tick();
		composer?.focus();
		composer?.setSelectionRange(draft.length, draft.length);
	}

	/** @param {number} timestamp */
	function formatTime(timestamp) {
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function rememberNick() {
		window.clearTimeout(nickSaveTimer);
		nickSaveTimer = window.setTimeout(() => {
			const clean = normalizePresenceNick(nick);
			try {
				if (clean) localStorage.setItem('swyx:chat:nick:v1', clean);
				else if (!nick.trim()) localStorage.removeItem('swyx:chat:nick:v1');
			} catch {
				// The nickname still applies for this visit.
			}
		}, 500);
	}

	onMount(() => {
		wideLayout = matchMedia('(min-width: 1500px)').matches;
		collapsed = !wideLayout || !allowSidebar;
		preferredGeometry = loadGeometry(wideLayout);
		try {
			nick = localStorage.getItem('swyx:chat:nick:v1') || '';
		} catch {
			// Guest nicknames also work without browser storage.
		}
		geometry = clampGeometry(preferredGeometry);
		if (!nick) nick = `reader${Math.floor(1000 + Math.random() * 9000)}`;
		rememberNick();
		ready = true;
		if (!collapsed) connect();
		const onVisibility = () => {
			if (document.visibilityState === 'visible') {
				expireMessages();
				if (!collapsed && !showReaders) unread = 0;
			}
		};
		const onBlur = () => {
			if (!gesture) return;
			gesture = null;
			if (matchMedia('(min-width: 1500px)').matches === wideLayout) rememberGeometry();
			syncViewport();
		};
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('resize', syncViewport);
		window.addEventListener('blur', onBlur);
		window.visualViewport?.addEventListener('resize', syncViewport);
		window.visualViewport?.addEventListener('scroll', syncViewport);
		return () => {
			window.clearTimeout(nickSaveTimer);
			destroyed = true;
			disconnect();
			window.clearTimeout(expiryTimer);
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('resize', syncViewport);
			window.removeEventListener('blur', onBlur);
			window.visualViewport?.removeEventListener('resize', syncViewport);
			window.visualViewport?.removeEventListener('scroll', syncViewport);
		};
	});
</script>

{#if ready}
	{#if collapsed}
		<button
			class="chat-launcher"
			type="button"
			bind:this={launcher}
			aria-label="Open swyx.irc chat"
			aria-describedby="chat-reader-summary"
			aria-expanded={!collapsed}
			aria-controls="live-chat"
			on:click={openChat}
		>
			<span aria-hidden="true">#</span> swyx.irc{#if presence.connected}<span aria-hidden="true">
					· {presence.otherCount} online</span
				>{/if}
			{#if unread}<span class="unread-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span
				>{/if}
			<span id="chat-reader-summary" class="visually-hidden" aria-live="polite"
				>{readerStatus}{unread ? `; ${unreadLabel}` : ''}</span
			>
		</button>
	{/if}
	{#if !collapsed}
		<!-- Escape dismisses the region when focus is inside it. -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<section
			id="live-chat"
			class="chat"
			class:chat-compact={geometry.height < 350}
			style="left: {geometry.x}px; top: {geometry.y}px; width: {geometry.width}px; height: {geometry.height}px"
			aria-labelledby="chat-title"
			tabindex="-1"
			bind:this={panel}
			on:keydown={keydown}
		>
			<span id="chat-window-help" class="visually-hidden"
				>Use arrow keys to move or resize the window; hold Shift for larger steps.</span
			>
			<div class="chat-titlebar">
				<h2 id="chat-title" class="visually-hidden">swyx.irc</h2>
				<button
					type="button"
					class="chat-drag-handle"
					aria-label="Move chat window"
					aria-describedby="chat-window-help"
					title="Drag or use arrow keys to move chat"
					on:pointerdown={(event) => startGesture(event, 'move')}
					on:pointermove={moveGesture}
					on:pointerup={finishGesture}
					on:pointercancel={finishGesture}
					on:lostpointercapture={finishGesture}
					on:keydown={(event) => geometryKeydown(event, 'move')}
				>
					<span class="chat-grip" aria-hidden="true">⠿</span>
					<span class="chat-title-copy" aria-hidden="true">
						<span class="chat-name"><span>#</span> swyx.irc</span>
						<span class="chat-status">
							<span class:online={status === 'Connected'} aria-hidden="true">●</span>
							{status}
						</span>
					</span>
				</button>
				<span class="visually-hidden" aria-live="polite">{status}</span>
				<button type="button" class="chat-close" aria-label="Close chat" on:click={closeChat}
					>×</button
				>
			</div>
			<p class="chat-notice">
				{#if geometry.height < 350}
					Public · unverified names · messages expire after 48h · backups up to 30 days.
				{:else}
					Public · nicknames are unverified and visible with your page<br />Messages disappear after
					48 hours. Backups may persist up to 30 days.
				{/if}
			</p>
			{#if showReaders}
				<div
					id="chat-readers"
					class="chat-readers"
					role="region"
					aria-label="Live readers"
					tabindex="-1"
					bind:this={readerPanel}
				>
					<p class="readers-heading">{readerStatus}</p>
					{#if presence.hidden}
						<p>Live readers and your page are hidden.</p>
						<button type="button" class="reader-action" on:click={() => onPresenceVisibility(false)}
							>Show live readers</button
						>
					{:else if presence.pageKey && presence.admitted}
						{#if presence.connected}
							{#if presence.pages.length}
								<ul class="reader-pages">
									{#each presence.pages as item (item.key)}
										<li>
											<a
												href={resolve(/** @type {`/${string}`} */ (item.path || '/'))}
												on:click={followReaderPage}>{item.title || item.path}</a
											>
											<span>{item.count} {item.count === 1 ? 'reader' : 'readers'}</span>
											{#if item.readers.length}
												<div class="reader-names">
													{item.readers.map((reader) => reader.nick).join(', ')}
												</div>
											{/if}
										</li>
									{/each}
								</ul>
							{:else}
								<p>No other readers are connected right now.</p>
							{/if}
						{/if}
						<p>
							Your nickname and current public page are visible to other readers. Nicknames are
							unverified; counts are connected tabs.
						</p>
						<div class="reader-reactions" aria-label="Wave to readers on this page">
							{#each PRESENCE_REACTIONS as reaction (reaction)}
								<button
									type="button"
									disabled={!presence.connected}
									aria-label={`Send ${reaction}`}
									on:click={() => onPresenceReaction(reaction)}>{reaction}</button
								>
							{/each}
						</div>
						<button type="button" class="reader-action" on:click={onPresenceShare}
							>Share this page ✨</button
						>
						<button type="button" class="reader-action" on:click={() => onPresenceVisibility(true)}
							>Hide live readers</button
						>
						<p>Country is approximate and may reflect a VPN.</p>
					{:else}
						<p>Live readers are unavailable on this page.</p>
					{/if}
				</div>
			{:else}
				{#if !presence.hidden && presence.connected && presence.pages.length}
					<!-- The scrollable list needs keyboard access. -->
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<div class="chat-reading" role="region" aria-label="Readers and their pages" tabindex="0">
						<div class="chat-reading-heading">reading now</div>
						<ul>
							{#each presence.pages as item (item.key)}
								<li>
									<span class="chat-reading-names">
										{#if item.readers.length}
											{item.readers
												.map((reader) => reader.nick)
												.join(', ')}{#if item.count > item.readers.length}, +{item.count -
													item.readers.length} more{/if}
										{:else}
											{item.count} {item.count === 1 ? 'reader' : 'readers'}
										{/if}
									</span>
									<span aria-hidden="true"> → </span>
									{#if item.path}
										<a
											href={resolve(/** @type {`/${string}`} */ (item.path))}
											on:click={followReaderPage}>{item.title || item.path}</a
										>
									{:else}
										<span>{item.title || item.key}</span>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				<div
					class="chat-log"
					role="log"
					aria-label="Recent chat messages"
					aria-live="polite"
					bind:this={log}
				>
					{#if messages.length === 0}
						<p class="chat-empty">No recent messages. Say hello!</p>
					{:else}
						{#each messages as message (message.id)}
							<div class="chat-message">
								<time datetime={new Date(message.createdAt).toISOString()}
									>{formatTime(message.createdAt)}</time
								>
								<span class="chat-nick">&lt;{message.nick}&gt;</span>
								<span class="chat-text">{message.text}</span>
							</div>
						{/each}
					{/if}
				</div>
				<form class="chat-form" bind:this={form} on:submit={sendMessage}>
					<label class="nick-field"
						>nick <input
							aria-label="Nickname (unverified)"
							bind:value={nick}
							on:input={rememberNick}
							maxlength="24"
							required
							autocomplete="nickname"
						/></label
					>
					<div class="quick-messages" role="group" aria-label="Quick messages">
						{#each quickMessages as message (message.label)}
							<button
								type="button"
								aria-label={`Add ${message.text} to message`}
								title={message.text}
								disabled={draft.length +
									(draft && !/\s$/.test(draft) ? 1 : 0) +
									message.text.length >
									500}
								on:click={() => quickMessage(message.text)}>{message.label}</button
							>
						{/each}
					</div>
					<label class="message-field"
						><span class="visually-hidden">Message</span><textarea
							bind:this={composer}
							bind:value={draft}
							on:keydown={composerKeydown}
							maxlength="500"
							required
							rows="2"
							placeholder="Write a message…"
						></textarea></label
					>
					<div class="chat-actions">
						<span>{pending ? 'Sending…' : `${draft.length}/500`}</span>
						<button
							type="submit"
							disabled={status !== 'Connected' || !!pending || !nick.trim() || !draft.trim()}
							>send ↵</button
						>
					</div>
					{#if error}<p class="chat-error" role="status">{error}</p>{/if}
					{#if status === 'Offline'}<button
							type="button"
							class="retry"
							on:click={() => {
								reconnectAttempt = 0;
								connect();
							}}>Retry connection</button
						>{/if}
				</form>
			{/if}
			<div class="chat-window-footer">
				<button
					type="button"
					class="reader-toggle"
					aria-expanded={showReaders}
					aria-controls="chat-readers"
					bind:this={readerToggle}
					on:click={toggleReaders}
				>
					<span class:reader-online={presence.connected} aria-hidden="true">●</span>
					{showReaders ? '← back to chat' : readerStatus}{showReaders && unread
						? ` · ${unreadLabel}`
						: ''}
				</button>
				<button
					type="button"
					class="chat-resize-handle"
					aria-label="Resize chat window"
					aria-describedby="chat-window-help"
					title="Drag or use arrow keys to resize chat"
					on:pointerdown={(event) => startGesture(event, 'resize')}
					on:pointermove={moveGesture}
					on:pointerup={finishGesture}
					on:pointercancel={finishGesture}
					on:lostpointercapture={finishGesture}
					on:keydown={(event) => geometryKeydown(event, 'resize')}
					><span aria-hidden="true">◢</span></button
				>
			</div>
		</section>
	{/if}
{/if}

<style>
	.chat-launcher {
		position: fixed;
		z-index: 60;
		left: max(0.75rem, env(safe-area-inset-left));
		bottom: max(0.75rem, env(safe-area-inset-bottom));
		min-height: 44px;
		border: 1px solid #384c3e;
		border-radius: 5px;
		background: #1d2a22;
		color: #f0f1e9;
		padding: 0.55rem 0.8rem;
		box-shadow: 0 3px 12px rgb(0 0 0 / 0.15);
		font: 600 0.85rem/1.1 var(--font-mono);
		cursor: pointer;
	}
	.chat-launcher span {
		color: #a5d5aa;
	}
	.chat-launcher .unread-badge {
		display: inline-grid;
		place-items: center;
		min-width: 1.3rem;
		min-height: 1.3rem;
		margin-left: 0.25rem;
		border-radius: 999px;
		background: #b8e5bb;
		color: #1d2a22;
		font-size: 0.7rem;
	}
	.chat {
		--chat-muted: #b8c3b3;
		position: fixed;
		z-index: 60;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		min-width: 0;
		min-height: 0;
		margin: 0;
		overflow: hidden;
		border: 1px solid #465a4a;
		border-radius: 6px;
		background: #1c2921;
		color: #f0f1e9;
		box-shadow: 0 8px 28px rgb(0 0 0 / 0.2);
		font: 400 0.9rem/1.5 var(--font-mono);
	}
	.chat:focus {
		outline: none;
	}
	.chat-titlebar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0.4rem;
		border-bottom: 1px solid #465a4a;
	}
	.chat-drag-handle {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		min-height: 44px;
		padding: 0.2rem 0.4rem;
		text-align: left;
		touch-action: none;
		cursor: grab;
	}
	.chat-drag-handle:active {
		cursor: grabbing;
	}
	.chat-grip {
		color: #91aa92;
		font-size: 1.2rem;
	}
	.chat-title-copy,
	.chat-name,
	.chat-status {
		display: block;
	}
	.chat-name {
		color: #e0eedc;
		font: 600 1rem/1.2 var(--font-mono);
	}
	.chat-name span {
		color: #a5d5aa;
	}
	.chat-status {
		margin: 0.2rem 0 0;
		color: var(--chat-muted);
		font: 400 0.75rem/1.2 var(--font-mono);
	}
	.chat-status .online {
		color: #a5d5aa;
	}
	.chat-close {
		min-width: 44px;
		min-height: 44px;
		color: #e0eedc;
		font: 1.5rem/1 var(--font-mono);
		cursor: pointer;
	}
	.chat-notice {
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-bottom: 1px solid #465a4a;
		color: #d1d9cd;
		font: 0.75rem/1.5 var(--font-body);
	}
	.chat-reading {
		flex: 0 1 auto;
		max-height: 5.5rem;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0.4rem 0.8rem;
		border-bottom: 1px solid #465a4a;
		color: #d1d9cd;
		font: 0.72rem/1.45 var(--font-mono);
	}
	.chat-reading-heading {
		color: var(--chat-muted);
		font-weight: 600;
	}
	.chat-reading ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.chat-reading li {
		overflow-wrap: anywhere;
	}
	.chat-reading-names {
		color: #b8e5bb;
	}
	.chat-reading a {
		color: #f0f1e9;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.chat-log {
		flex: 1;
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		padding: 0.6rem 0.8rem;
	}
	.chat-empty {
		margin: 0;
		color: var(--chat-muted);
	}
	.chat-message {
		margin-bottom: 0.55rem;
		overflow-wrap: anywhere;
	}
	.chat-message time {
		color: var(--chat-muted);
		font-size: 0.75rem;
	}
	.chat-nick {
		color: #b8e5bb;
	}
	.chat-text {
		white-space: pre-wrap;
	}
	.chat-form {
		display: grid;
		flex: 0 1 auto;
		gap: 0.45rem;
		min-height: 0;
		overflow-y: auto;
		padding: 0.65rem 0.8rem 0.8rem;
		border-top: 1px solid #465a4a;
	}
	.nick-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--chat-muted);
		font-size: 0.8rem;
	}
	.quick-messages {
		display: flex;
		gap: 0.25rem;
	}
	.quick-messages button {
		flex: 1;
		min-width: 0;
		min-height: 36px;
		border: 1px solid #526a57;
		border-radius: 3px;
		background: #283b2e;
		color: #d1e4cf;
		padding: 0.2rem 0.15rem;
		font: 500 0.7rem/1.15 var(--font-mono);
		cursor: pointer;
	}
	.quick-messages button:hover:not(:disabled) {
		background: #3a5340;
	}
	.quick-messages button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.nick-field input,
	textarea {
		min-width: 0;
		width: 100%;
		border: 1px solid #657869;
		border-radius: 3px;
		background: #101b14;
		color: #f0f1e9;
		padding: 0.4rem 0.5rem;
		font: 400 1rem/1.35 var(--font-mono);
	}
	textarea {
		display: block;
		resize: none;
		max-height: 8rem;
	}
	textarea::placeholder {
		color: #a7b5a7;
	}
	.chat-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		color: var(--chat-muted);
		font-size: 0.75rem;
	}
	.chat-actions button,
	.retry {
		min-height: 44px;
		border: 1px solid #78947a;
		border-radius: 3px;
		background: #b8e5bb;
		color: #132017;
		padding: 0.3rem 0.65rem;
		font: 600 0.8rem/1 var(--font-mono);
		cursor: pointer;
	}
	.chat-actions button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.chat-error {
		margin: 0;
		color: #ffc8b9;
		font: 0.8rem/1.4 var(--font-body);
	}
	.retry {
		justify-self: start;
	}
	.chat-window-footer {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: space-between;
		min-height: 36px;
		border-top: 1px solid #465a4a;
		color: var(--chat-muted);
		font-size: 0.68rem;
	}
	.reader-toggle {
		flex: 1;
		min-width: 0;
		min-height: 44px;
		padding: 0.35rem 0.8rem;
		text-align: left;
		color: #d1e4cf;
		cursor: pointer;
		font: 500 0.72rem/1.25 var(--font-mono);
	}
	.reader-toggle span {
		color: var(--chat-muted);
	}
	.reader-toggle .reader-online {
		color: #a5d5aa;
	}
	.chat-readers {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 0.7rem 0.8rem;
		color: #e0eedc;
		font: 400 0.75rem/1.5 var(--font-mono);
	}
	.chat-readers p {
		margin: 0.45rem 0;
		color: var(--chat-muted);
	}
	.chat-readers .readers-heading {
		margin-top: 0;
		color: #e0eedc;
		font-weight: 600;
	}
	.reader-pages {
		margin: 0.6rem 0;
		padding: 0;
		list-style: none;
	}
	.reader-pages li {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid #465a4a;
	}
	.reader-pages a {
		min-width: 0;
		color: #b8e5bb;
		overflow-wrap: anywhere;
		text-decoration: underline;
	}
	.reader-pages li span {
		flex: none;
		color: var(--chat-muted);
	}
	.reader-names {
		flex-basis: 100%;
		color: #e0eedc;
		overflow-wrap: anywhere;
	}
	.reader-reactions {
		display: flex;
		gap: 0.25rem;
		margin-top: 0.5rem;
	}
	.reader-reactions button {
		flex: 1;
		min-width: 0;
		min-height: 44px;
		border-radius: 4px;
		background: #304539;
		cursor: pointer;
		font-size: 1rem;
	}
	.reader-reactions button:disabled {
		opacity: 0.5;
	}
	.reader-action {
		display: block;
		min-height: 44px;
		color: #b8e5bb;
		cursor: pointer;
		text-align: left;
		font: inherit;
	}
	.chat-resize-handle {
		width: 44px;
		height: 44px;
		color: #b8e5bb;
		font-size: 1rem;
		touch-action: none;
		cursor: nwse-resize;
	}
	.chat-compact .chat-notice {
		padding: 0.3rem 0.8rem;
		font-size: 0.7rem;
		line-height: 1.2;
	}
	.chat-compact .chat-reading {
		max-height: 2.8rem;
		padding: 0.15rem 0.8rem;
	}
	.chat-compact .chat-reading-heading,
	.chat-compact .chat-reading ul,
	.chat-compact .chat-reading li {
		display: inline;
	}
	.chat-compact .chat-reading-heading {
		margin-right: 0.4rem;
	}
	.chat-compact .chat-reading li:not(:last-child)::after {
		content: ' · ';
	}
	.chat-compact .chat-log {
		min-height: 2rem;
		padding: 0.25rem 0.8rem;
	}
	.chat-compact .chat-form {
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
		gap: 0.2rem;
		padding: 0.3rem 0.8rem;
	}
	.chat-compact :is(.chat-error, .retry) {
		grid-column: 1 / -1;
	}
	.chat-compact .nick-field {
		grid-column: 1;
		min-width: 0;
	}
	.chat-compact .quick-messages {
		grid-column: 2 / -1;
	}
	.chat-compact .message-field {
		grid-column: 1 / 3;
	}
	.chat-compact .chat-actions {
		gap: 0.25rem;
	}
	.chat-compact textarea {
		height: 2.4rem;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.chat :is(button, input, textarea):focus-visible,
	.chat-launcher:focus-visible {
		outline: 2px solid #d9f8d7;
		outline-offset: 2px;
	}
	@media (max-width: 1240px) {
		.chat-launcher {
			left: 0;
			right: auto;
			top: 50%;
			bottom: auto;
			width: var(--site-gutter);
			padding: 0.6rem 0;
			border-radius: 0 5px 5px 0;
			box-shadow: none;
			font-size: 0.7rem;
			line-height: 1;
			writing-mode: vertical-rl;
			transform: translateY(-50%);
		}
	}
</style>
