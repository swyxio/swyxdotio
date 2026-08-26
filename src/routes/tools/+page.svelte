<script>
	import { onMount } from 'svelte';
	/** @type {import('./$types').PageData} */
	export let data;
	let signingOut = false;
	let error = '';
	onMount(() => {
		try {
			localStorage.setItem('swyx-tools:account', data.user?.id ?? 'guest');
		} catch {}
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
<section class="site-shell tools py-8">
	<p class="eyebrow">swyx.io / tools</p>
	<h1>Your tools. Your workspace.</h1>
	{#if data.authError}<p class="error" role="alert">{data.authError}</p>{/if}
	{#if error}<p class="error" role="alert">{error}</p>{/if}
	{#if data.user}
		<div class="account">
			<div><strong>{data.user.name || data.user.email}</strong><span>{data.user.email}</span></div>
			<button class="plain-button" on:click={logout} disabled={signingOut}
				>{signingOut ? 'Signing out…' : 'Sign out'}</button
			>
		</div>
		<p class="plain-muted">
			Your drawings sync to your Google account’s workspace. Other accounts have their own.
		</p>
		{#if data.next !== '/tools'}<a class="plain-button continue" href={data.next}
				>Continue to your tool →</a
			>{/if}
	{:else}
		<p class="plain-muted">
			Sign in to save and sync your drawings across devices. Everyone gets a separate workspace.
		</p>
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
		<p class="privacy">
			Basic profile and email only. No access to Gmail or Drive. <a href="/tools/privacy">Privacy</a
			>
		</p>
	{/if}
	<ul class="tool-list">
		<li>
			<a href="/draw"
				><strong>Draw</strong><span>A multipage whiteboard with your own drawings and library.</span
				></a
			>
		</li>
		<li>
			<a href="/box"
				><strong>Big text box</strong><span
					>A distraction-free text box. No account or server storage.</span
				></a
			>
		</li>
		{#if data.user?.isOwner}
			<li>
				<a href="/tools/podcast"
					><strong>Podcast studio <small>Site owner</small></strong><span
						>Publish episodes to your existing swyx.io feeds.</span
					></a
				>
			</li>
			<li>
				<a href="/tools/reclip"
					><strong>Reclip <small>Site owner</small></strong><span
						>Open the separately hosted media downloader.</span
					></a
				>
			</li>
		{/if}
	</ul>
</section>

<style>
	.tools {
		max-width: 44rem;
	}
	.eyebrow {
		color: var(--page-accent);
		font-weight: 700;
	}
	.account {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border: 1px solid var(--page-border);
		padding: 1rem;
		margin: 1.5rem 0;
	}
	.account span {
		display: block;
		font-size: 0.875rem;
		color: var(--page-muted);
		overflow-wrap: anywhere;
	}
	.google-signin {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		border: 1px solid #747775;
		border-radius: 0.3rem;
		color: #1f1f1f;
		background: #fff;
		font-weight: 600;
		text-decoration: none;
		margin-top: 0.75rem;
	}
	.google-signin:hover {
		background: #f2f2f2;
	}
	.google-signin:focus-visible {
		outline: 3px solid var(--page-accent);
		outline-offset: 3px;
	}
	.privacy {
		font-size: 0.85rem;
		color: var(--page-muted);
	}
	.error {
		color: var(--page-accent);
	}
	.continue {
		display: inline-block;
		margin-top: 0.75rem;
	}
	.tool-list {
		display: grid;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding: 0;
		list-style: none;
	}
	.tool-list a {
		display: grid;
		gap: 0.25rem;
		border: 1px solid var(--page-border);
		padding: 1rem;
		text-decoration: none;
	}
	.tool-list span,
	small {
		color: var(--page-muted);
	}
	small {
		font-size: 0.75rem;
		font-weight: 400;
		margin-left: 0.5rem;
	}
</style>
