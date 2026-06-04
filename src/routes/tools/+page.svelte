<script>
	/** @type {{ authenticated: boolean, next: string }} */
	export let data;

	let password = '';
	let loginError = '';
	let loggingIn = false;

	/** @param {SubmitEvent} event */
	async function login(event) {
		event.preventDefault();
		loginError = '';
		loggingIn = true;
		try {
			const response = await fetch('/tools/api/session', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});
			if (!response.ok) {
				loginError = response.status === 401 ? 'Incorrect password' : 'Could not unlock tools';
				return;
			}
			location.href = data.next;
		} finally {
			loggingIn = false;
		}
	}
</script>

<svelte:head>
	<title>Personal tools</title>
	<meta name="robots" content="noindex, nofollow, noarchive" />
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<section class="site-shell tools py-8">
	<p class="eyebrow">Private utility</p>
	<h1>Personal tools</h1>

	{#if !data.authenticated}
		<p class="plain-muted">Enter the tools password to continue.</p>
		<form on:submit={login}>
			<label>
				<span>Password</span>
				<input
					name="password"
					type="password"
					autocomplete="current-password"
					required
					bind:value={password}
				/>
			</label>
			{#if loginError}<p class="error">{loginError}</p>{/if}
			<button class="plain-button" type="submit" disabled={loggingIn}
				>{loggingIn ? 'Unlocking...' : 'Unlock tools'}</button
			>
		</form>
	{:else}
		<p class="plain-muted">Small private utilities for maintaining swyx.io.</p>
		<ul class="tool-list">
			<li>
				<a href="/tools/podcast">
					<strong>Podcast studio</strong>
					<span>Upload MP3s and prepend episodes to an R2-backed RSS feed.</span>
				</a>
			</li>
			<li>
				<a href="/tools/reclip">
					<strong>Reclip</strong>
					<span>Open the private self-hosted media downloader.</span>
				</a>
			</li>
		</ul>
	{/if}
</section>

<style>
	.tools {
		max-width: 42rem;
	}

	.eyebrow {
		color: var(--page-accent);
		font-weight: 700;
	}

	label span {
		color: var(--page-accent);
		font-weight: 700;
	}

	form {
		display: grid;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	label {
		display: grid;
		gap: 0.35rem;
	}

	input {
		width: 100%;
		border: 1px solid var(--page-border);
		background: var(--page-bg);
		color: var(--page-text);
		padding: 0.7rem;
	}

	.error {
		color: var(--page-accent);
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

	.tool-list span {
		color: var(--page-muted);
	}
</style>
