<script>
	import { onMount, tick } from 'svelte';

	/** @type {boolean} */
	export let collapsed = false;
	/** @type {boolean} */
	export let allowSidebar = true;

	/** @typedef {{ id: string, nick: string, text: string, createdAt: number }} ChatMessage */
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
	let ready = false;
	let wide = false;
	let status = 'Connecting';
	let error = '';
	let nick = '';
	let draft = '';
	let reconnectAttempt = 0;
	let reconnectTimer = 0;
	let expiryTimer = 0;
	let returnScroll = 0;
	let hasReturnScroll = false;
	let destroyed = false;
	const retentionMs = 48 * 60 * 60 * 1000;

	$: docked = wide && allowSidebar;

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
			expireMessages();
			void scrollLatest();
		} else if (frame.type === 'message' && isMessage(frame.message)) {
			if (!messages.some((message) => message.id === frame.message.id)) {
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
		if (!collapsed) {
			panel?.scrollIntoView({ block: 'start' });
			return;
		}
		returnScroll = window.scrollY;
		hasReturnScroll = !docked;
		collapsed = false;
		reconnectAttempt = 0;
		connect();
		await tick();
		if (!docked) panel?.scrollIntoView({ block: 'start' });
		panel?.focus({ preventScroll: true });
	}

	async function closeChat() {
		collapsed = true;
		disconnect();
		await tick();
		if (hasReturnScroll && !docked) window.scrollTo({ top: returnScroll, behavior: 'instant' });
		hasReturnScroll = false;
		launcher?.focus({ preventScroll: true });
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
		if (event.key === 'Escape' && !collapsed && !event.defaultPrevented) {
			event.preventDefault();
			void closeChat();
		}
	}

	/** @param {KeyboardEvent} event */
	function composerKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			form?.requestSubmit();
		}
	}

	/** @param {number} timestamp */
	function formatTime(timestamp) {
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	onMount(() => {
		const query = matchMedia('(min-width: 1500px)');
		const updateWide = () => (wide = query.matches);
		updateWide();
		query.addEventListener('change', updateWide);
		collapsed = !query.matches || !allowSidebar;
		try {
			nick = localStorage.getItem('swyx:chat:nick:v1') || '';
		} catch {
			// Guest nicknames also work without browser storage.
		}
		if (!nick) nick = `reader${Math.floor(1000 + Math.random() * 9000)}`;
		ready = true;
		if (!collapsed) connect();
		const onVisibility = () => {
			if (document.visibilityState === 'visible') expireMessages();
		};
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			destroyed = true;
			disconnect();
			window.clearTimeout(expiryTimer);
			document.removeEventListener('visibilitychange', onVisibility);
			query.removeEventListener('change', updateWide);
		};
	});
</script>

<svelte:window on:keydown={keydown} />

{#if ready}
	{#if collapsed || !docked}
		<button
			class="chat-launcher"
			type="button"
			bind:this={launcher}
			aria-expanded={!collapsed}
			aria-controls="live-chat"
			on:click={openChat}
			><span aria-hidden="true">#</span> {collapsed ? 'chat' : 'back to chat'}</button
		>
	{/if}
	{#if !collapsed}
		<section
			id="live-chat"
			class:chat-docked={docked}
			class="chat"
			aria-labelledby="chat-title"
			tabindex="-1"
			bind:this={panel}
		>
			<div class="chat-titlebar">
				<div>
					<h2 id="chat-title"><span aria-hidden="true">#</span> swyx</h2>
					<p class="chat-status">
						<span class:online={status === 'Connected'} aria-hidden="true">●</span>
						{status}
					</p>
				</div>
				<button type="button" class="chat-close" aria-label="Close chat" on:click={closeChat}
					>×</button
				>
			</div>
			<p class="chat-notice">
				Public · nicknames are unverified<br />Messages disappear after 48 hours. Backups may
				persist up to 30 days.
			</p>
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
						maxlength="24"
						required
						autocomplete="nickname"
					/></label
				>
				<label class="message-field"
					><span class="visually-hidden">Message</span><textarea
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
	.chat {
		--chat-muted: #b8c3b3;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		width: min(calc(100% - 2 * var(--site-gutter)), 42.5rem);
		height: min(34rem, 75dvh);
		min-height: 22rem;
		margin: 2rem auto;
		border: 1px solid #465a4a;
		border-radius: 6px;
		background: #1c2921;
		color: #f0f1e9;
		font: 400 0.9rem/1.5 var(--font-mono);
		scroll-margin-top: 1rem;
	}
	.chat:focus {
		outline: none;
	}
	.chat-titlebar {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 0.7rem 0.8rem 0.55rem;
		border-bottom: 1px solid #465a4a;
	}
	.chat-titlebar h2 {
		margin: 0;
		color: #e0eedc;
		font: 600 1rem/1.2 var(--font-mono);
	}
	.chat-titlebar h2 span {
		color: #a5d5aa;
	}
	.chat-status {
		margin: 0.25rem 0 0;
		color: var(--chat-muted);
		font-size: 0.75rem;
	}
	.chat-status .online {
		color: #a5d5aa;
	}
	.chat-close {
		min-width: 44px;
		min-height: 44px;
		margin: -0.4rem -0.5rem 0 0;
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
	.chat-log {
		flex: 1;
		min-height: 4rem;
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
		gap: 0.45rem;
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
		resize: vertical;
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
		min-height: 36px;
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
	@media (min-width: 1500px) {
		.chat-docked {
			position: fixed;
			z-index: 40;
			left: 1rem;
			bottom: 1rem;
			width: 268px;
			height: min(36rem, calc(100dvh - 2rem));
			margin: 0;
			box-shadow: 0 8px 28px rgb(0 0 0 / 0.15);
		}
	}
</style>
