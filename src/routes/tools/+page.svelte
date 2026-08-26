<script>
	import { onMount } from 'svelte';
	import ToolsCabinet from '$lib/ToolsCabinet.svelte';
	import ToolsUsageReceipt from '$lib/ToolsUsageReceipt.svelte';
	import ToolsAiNotice from '$lib/ToolsAiNotice.svelte';
	import { TOOLS_AI_POLICY } from '$lib/tools-ai-policy.js';
	/** @type {import('./$types').PageData} */
	export let data;
	/** @type {HTMLDetailsElement | undefined} */
	let accountMenu;
	let signingOut = false;
	/** @param {KeyboardEvent} event */
	function closeAccountOnEscape(event) {
		if (event.key === 'Escape' && accountMenu?.open) {
			event.preventDefault();
			accountMenu.open = false;
			accountMenu.querySelector('summary')?.focus();
		}
	}
	/** @param {PointerEvent | FocusEvent} event */
	function closeAccountOutside(event) {
		const target =
			event.type === 'focusout' ? /** @type {FocusEvent} */ (event).relatedTarget : event.target;
		if (accountMenu?.open && target instanceof Node && !accountMenu.contains(target))
			accountMenu.open = false;
	}
	let error = '';
	/** @type {{assistantTurnsThisHour:number,mediaJobsThisHour:number,estimatedReservedTodayUsd:number}|null} */
	let aiUsage = null;
	let usageUnavailable = false;
	onMount(() => {
		try {
			localStorage.setItem('swyx-tools:account', data.user?.id ?? 'guest');
		} catch {}
		const abort = new AbortController();
		if (data.user) {
			void fetch('/tools/api/ai/usage', {
				cache: 'no-store',
				headers: { 'X-Tools-User': data.user.id },
				signal: abort.signal
			})
				.then(async (response) => {
					if (!response.ok) throw new Error('Usage unavailable');
					const result = await response.json();
					aiUsage = result.usage;
				})
				.catch(() => {
					if (!abort.signal.aborted) usageUnavailable = true;
				});
		}
		return () => abort.abort();
	});
	async function logout() {
		signingOut = true;
		error = '';
		try {
			const response = await fetch('/tools/api/session', { method: 'DELETE' });
			if (!response.ok) throw new Error('Could not sign out. Please try again.');
			try {
				localStorage.setItem('swyx-tools:account', 'guest');
			} catch {}
			location.assign('/tools');
		} catch (failure) {
			error = failure instanceof Error ? failure.message : 'Could not sign out.';
			signingOut = false;
		}
	}
</script>

<svelte:head>
	<title>Your tools · swyx.io</title>
	<meta name="robots" content="noindex, nofollow, noarchive" />
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<svelte:window on:keydown={closeAccountOnEscape} on:pointerdown={closeAccountOutside} />

<section class="site-shell tools">
	<div class="topline">
		<p class="eyebrow">swyx.io / tools</p>
		{#if data.user}
			<details class="account-menu" bind:this={accountMenu} on:focusout={closeAccountOutside}>
				<summary
					><span class="account-name">{data.user.name || data.user.email}</span><span
						class="account-role"
						>{data.user.isDevelopment
							? 'Local development'
							: data.user.isOwner
								? 'Site owner'
								: 'Personal account'}</span
					><span class="chevron" aria-hidden="true">⌄</span></summary
				>
				<div class="account-panel">
					<strong>{data.user.name || data.user.email}</strong>
					<p>{data.user.email}</p>
					<p class="sync-note">
						{#if data.user.isDevelopment}
							Synthetic local account. Uses a separate workspace, not your Google account's data.
						{:else}
							Your drawings sync to your Google account’s workspace. Other accounts have their own.
						{/if}
					</p>
					<details class="account-identity">
						<summary>Account identity</summary>
						<p>
							{data.user.isDevelopment ? 'Development' : 'Google account'} ID:
							<code>{data.user.id}</code>
						</p>
						<p>
							{data.user.isOwner ? 'Site owner' : 'Personal account'} · permissions are checked on the
							server.
						</p>
					</details>
					{#if data.user.isDevelopment}
						<p>To test sign-in, restart with <code>TOOLS_DEV_AUTH=off npm run dev</code>.</p>
					{:else}<button class="plain-button signout" on:click={logout} disabled={signingOut}
							>{signingOut ? 'Signing out…' : 'Sign out'}</button
						>{/if}
				</div>
			</details>
		{/if}
	</div>
	{#if data.authError}<p class="error" role="alert">{data.authError}</p>{/if}
	{#if error}<p class="error" role="alert">{error}</p>{/if}
	{#if data.user?.isDevelopment}
		<p class="sync-note" role="status">
			Local development account active. No Google login needed. Storage bindings and AI providers
			still need local configuration.
		</p>
	{/if}
	<div class="workshop-intro">
		<div class="intro-copy">
			<h1>The useful things cabinet.</h1>
			<div class="ornament" aria-hidden="true"><span>❧</span></div>
			<p class="intro-description">
				A few tools for thinking, making, and keeping record.<br class="desktop-break" /> Pick one and
				get to work.
			</p>
			{#if data.user && data.next !== '/tools'}
				<a class="continue" href={data.next}>Continue to your tool →</a>
			{/if}
		</div>
		<ToolsUsageReceipt
			signedIn={!!data.user}
			isOwner={!!data.user?.isOwner}
			usage={aiUsage}
			unavailable={usageUnavailable}
		/>
	</div>
	{#if !data.user}
		<div class="signin-strip">
			{#if data.googleConfigured}
				<a
					class="google-signin"
					href="/tools/auth/google?next={encodeURIComponent(data.next)}"
					data-sveltekit-reload
				>
					<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"
						><path
							fill="#4285F4"
							d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.18v5.14h6.61c3.87-3.56 6.08-8.82 6.08-14.82Z"
						/><path
							fill="#34A853"
							d="M24 44c5.52 0 10.15-1.83 13.53-4.95l-6.61-5.14c-1.84 1.24-4.19 1.99-6.92 1.99-5.32 0-9.84-3.59-11.45-8.43H5.73v5.3A20 20 0 0 0 24 44Z"
						/><path
							fill="#FBBC05"
							d="M12.55 27.47a12 12 0 0 1 0-6.94v-5.3H5.73a20 20 0 0 0 0 17.54l6.82-5.3Z"
						/><path
							fill="#EA4335"
							d="M24 12.1c3.01 0 5.69 1.04 7.82 3.1l5.87-5.87A19.66 19.66 0 0 0 24 4 20 20 0 0 0 5.73 15.23l6.82 5.3C14.16 15.69 18.68 12.1 24 12.1Z"
						/></svg
					>
					Sign in with Google
				</a>
			{:else}<p role="status">
					Google sign-in is being configured. Browser-only tools still work below.
				</p>{/if}
			<div class="signin-copy">
				<p>Sign in to save and sync your drawings. Everyone gets a separate workspace.</p>
				<p class="privacy">
					Basic profile and email only. No access to Gmail or Drive. <a href="/tools/privacy"
						>Privacy</a
					>
				</p>
			</div>
		</div>
	{/if}
	<div class="workshop-scene"><ToolsCabinet isOwner={!!data.user?.isOwner} /></div>
	{#if !data.user?.isOwner}<details class="workshop-rules">
			<summary
				><span>The rules of the workshop</span><span class="rules-hint"
					>{TOOLS_AI_POLICY.retentionDays}-day metadata logs · no prompts or images in logs</span
				></summary
			>
			<ToolsAiNotice />
			<p>
				The daily estimated allowance is ${TOOLS_AI_POLICY.userEstimatedDailyUsd} per account, with a
				${TOOLS_AI_POLICY.siteEstimatedDailyUsd}
				site-wide guard. Daily limits reset at midnight UTC. Reservations are conservative estimates,
				not provider invoices.
			</p>
			<p><a href="/tools/privacy">Privacy and full details →</a></p>
		</details>{/if}
</section>

<style>
	.tools {
		--site-max-width: 1160px;
		padding-block: 1.2rem 0.5rem;
	}
	.topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 48px;
		margin-bottom: 1.25rem;
	}
	.eyebrow {
		margin: 0;
		color: var(--page-gold);
		font: 600 0.72rem var(--font-mono);
		letter-spacing: 0.08em;
		white-space: nowrap;
	}
	.account-menu {
		padding: 0;
		border: 1px solid var(--page-border);
		border-radius: 4px;
		position: relative;
		max-width: min(19rem, 65%);
		background: var(--page-surface);
		z-index: 3;
	}
	.account-menu > summary {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 14px;
		padding: 7px 12px;
		min-height: 44px;
		align-items: center;
		list-style: none;
		column-gap: 12px;
	}
	.account-menu > summary::-webkit-details-marker {
		display: none;
	}
	.account-name {
		grid-column: 1;
		font-size: 0.8rem;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.account-role {
		grid-column: 1;
		font-size: 0.65rem;
		color: var(--page-muted);
	}
	.chevron {
		grid-column: 2;
		grid-row: 1 / 3;
	}
	.account-menu[open] .chevron {
		transform: rotate(180deg);
	}
	.account-panel {
		position: absolute;
		right: -1px;
		top: calc(100% + 7px);
		width: min(310px, calc(100vw - 40px));
		max-height: min(70vh, 480px);
		overflow-y: auto;
		padding: 18px;
		border: 1px solid var(--page-border);
		background: var(--page-surface);
		color: var(--page-text);
		border-radius: 4px;
		box-shadow: 0 8px 22px #231b1933;
		overflow-wrap: anywhere;
	}
	.account-panel > strong {
		font-size: 0.9rem;
	}
	.account-panel p {
		margin: 4px 0;
		font-size: 0.78rem;
		color: var(--page-muted);
	}
	.account-panel .sync-note {
		margin: 12px 0;
	}
	.account-identity {
		margin: 12px 0;
		padding: 9px 0;
		border-inline: 0;
		font-size: 0.78rem;
	}
	.account-identity summary {
		min-height: 28px;
		padding-block: 4px;
	}
	.signout {
		min-height: 44px;
		font-size: 0.8rem;
		width: 100%;
		text-align: left;
	}
	.signout:disabled {
		cursor: wait;
		opacity: 0.65;
	}
	.workshop-intro {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 320px;
		align-items: start;
		gap: 36px;
		margin-bottom: 24px;
	}
	.intro-copy h1 {
		font-size: clamp(2rem, 3.1vw, 2.7rem);
		max-width: none;
		line-height: 1.05;
		margin: 0;
		letter-spacing: -0.025em;
	}
	.ornament {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--page-gold);
		max-width: 360px;
		margin: 18px 0;
	}
	.ornament::before,
	.ornament::after {
		content: '';
		height: 1px;
		flex: 1;
		background: var(--page-gold);
		opacity: 0.65;
	}
	.ornament span {
		font-size: 1.15rem;
		line-height: 1;
	}
	.intro-description {
		font-size: 0.9rem;
		color: var(--page-muted);
		margin: 0;
		line-height: 1.65;
	}
	.continue {
		display: inline-block;
		margin-top: 12px;
		min-height: 44px;
		padding-block: 10px;
		font-size: 0.85rem;
	}
	.signin-strip {
		display: flex;
		align-items: center;
		gap: 24px;
		margin: 0 0 22px;
		padding: 15px 18px;
		border: 1px solid var(--page-border);
		background: var(--page-surface);
	}
	.signin-copy {
		min-width: 0;
	}
	.signin-copy p {
		margin: 0;
		font-size: 0.8rem;
	}
	.signin-copy .privacy {
		margin-top: 5px;
		font-size: 0.7rem;
		color: var(--page-muted);
	}
	.google-signin {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border: 1px solid #747775;
		border-radius: 0.3rem;
		color: #1f1f1f;
		background: #fff;
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
	}
	.google-signin:hover {
		background: #f2f2f2;
	}
	.error {
		color: var(--page-accent);
		border-left: 3px solid currentColor;
		padding: 8px 12px;
		margin-bottom: 16px;
	}
	.workshop-rules {
		position: relative;
		isolation: isolate;
		border: 0;
		background: transparent;
		color: #403326;
		margin-top: 22px;
		padding: 14px 24px;
	}
	.workshop-rules > summary {
		min-height: 44px;
		padding-block: 6px;
	}
	.workshop-rules > summary > span:first-child {
		font-family: var(--font-display);
		font-size: 1.2rem;
	}
	.rules-hint {
		color: #65513e;
		font-size: 0.72rem;
		margin-left: 14px;
	}
	.workshop-rules > p {
		font-size: 0.8rem;
		margin: 10px 0;
		color: #65513e;
	}
	.tools :is(a, button, summary):focus-visible {
		outline: 3px solid var(--page-accent);
		outline-offset: 3px;
	}
	@media (max-width: 900px) {
		.workshop-intro {
			grid-template-columns: minmax(0, 1fr) 290px;
			gap: 28px;
		}
		.intro-copy h1 {
			font-size: 2rem;
		}
		.desktop-break {
			display: none;
		}
		.signin-strip {
			gap: 16px;
		}
		.rules-hint {
			display: block;
			margin: 4px 0 0 16px;
		}
	}
	@media (max-width: 600px) {
		.tools {
			padding-top: 12px;
		}
		.topline {
			margin-bottom: 12px;
			gap: 8px;
		}
		.eyebrow {
			font-size: 0.6rem;
		}
		.account-menu > summary {
			padding: 5px 9px;
		}
		.workshop-intro {
			grid-template-columns: minmax(0, 1fr);
			gap: 18px;
			margin-bottom: 17px;
		}
		.intro-copy h1 {
			font-size: 1.68rem;
			max-width: none;
		}
		.ornament {
			display: none;
		}
		.intro-description {
			display: none;
		}
		.signin-strip {
			align-items: flex-start;
			flex-direction: column;
			padding: 13px;
			gap: 11px;
			margin-bottom: 17px;
		}
		.workshop-rules {
			padding-inline: 12px;
			margin-top: 17px;
		}
		.rules-hint {
			font-size: 0.67rem;
			line-height: 1.6;
		}
	}
	.workshop-scene {
		position: relative;
	}
	.workshop-rules::before {
		content: '';
		position: absolute;
		z-index: -1;
		inset: -5px;
		border-image: url('/assets/tools-cabinet/paper-sheet.webp') 60 fill / 18px / 0 stretch;
		pointer-events: none;
	}
	.workshop-rules::after {
		content: '';
		position: absolute;
		left: 13px;
		top: -9px;
		width: 9px;
		height: 27px;
		border: 2px solid #8d784a;
		border-radius: 5px;
		transform: rotate(-10deg);
		box-shadow: 1px 1px 1px #35291e33;
		pointer-events: none;
	}
	.workshop-rules :global(:focus-visible) {
		outline: 3px solid #87432f;
		outline-offset: 3px;
	}
	.workshop-rules :global(a) {
		color: #87432f;
	}
	.workshop-rules :global(.ai-notice) {
		color: #403326;
	}
	@media (min-width: 1050px) {
		.workshop-scene {
			padding-left: 165px;
		}
		.workshop-scene::before {
			content: '';
			position: absolute;
			pointer-events: none;
			bottom: -4px;
			left: -15px;
			width: 225px;
			height: 340px;
			background: url('/assets/tools-cabinet/desk-still-life.webp') left bottom / contain no-repeat;
		}
		.intro-description {
			max-width: 52ch;
		}
		.workshop-rules {
			max-width: 700px;
			margin-top: 20px;
		}
	}
	@media (forced-colors: active) {
		.workshop-scene::before,
		.workshop-rules::before,
		.workshop-rules::after {
			display: none;
		}
		.workshop-rules {
			background: Canvas;
			color: CanvasText;
			border: 1px solid CanvasText;
		}
		.workshop-rules :global(a),
		.workshop-rules :global(.ai-notice),
		.workshop-rules > p,
		.rules-hint {
			color: CanvasText;
		}
	}
	:global(.site-main:has(.tools) + footer.literary-footer) {
		width: min(calc(100% - var(--site-gutter) - var(--site-gutter)), 1160px);
		max-width: 1160px;
		border: 0;
		border-top: 1px solid var(--page-border);
		border-radius: 0;
		background: transparent;
		box-shadow: none;
		padding-inline: 0;
	}
</style>
