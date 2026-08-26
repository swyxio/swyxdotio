<script>
	import { onMount } from 'svelte';
	import { recordToolActivity } from '$lib/tools-activity-client.js';
	let signedIn = false;
	onMount(() => {
		const abort = new AbortController();
		void fetch('/tools/api/session', { cache: 'no-store', signal: abort.signal })
			.then(async (response) => {
				if (!response.ok) return;
				const session = await response.json();
				if (abort.signal.aborted) return;
				signedIn = Boolean(session.user);
				void recordToolActivity(session.user?.id, 'box.open');
			})
			.catch(() => {});
		return () => abort.abort();
	});
</script>

<svelte:head>
	<title>Big text box · swyx.io</title>
	<meta name="robots" content="noindex, nofollow, noarchive" />
	<meta name="description" content="A distraction-free, oversized text box. Just start typing." />
</svelte:head>

<section class="box" aria-label="Big text box">
	<header>big text box</header>
	<!-- svelte-ignore a11y_autofocus (the dedicated writing canvas should be immediately editable) -->
	<textarea autofocus aria-label="Write anything" spellcheck="false"></textarea>
	<footer>
		<a href="/">swyx.io</a>{#if signedIn}<a class="logging-note" href="/tools/logs"
				>Tool opens are logged · visible to you and swyx · text stays here</a
			>{/if}
	</footer>
</section>

<style>
	.box {
		display: grid;
		min-height: 100dvh;
		grid-template-rows: 2.5rem minmax(0, 1fr) 2.5rem;
		background: var(--page-bg);
	}

	header,
	footer {
		display: grid;
		place-items: center;
		color: var(--page-border);
		font-size: 0.875rem;
	}
	footer {
		display: flex;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0.25rem 0.75rem;
	}
	.logging-note {
		font-size: 0.65rem;
	}

	footer a {
		color: inherit;
		text-decoration: none;
	}

	footer a:hover {
		color: var(--page-muted);
	}

	textarea {
		width: 100%;
		min-height: 0;
		resize: none;
		border: 0;
		outline: 0;
		background: transparent;
		padding: 1rem clamp(1rem, 10vw, 10rem);
		color: var(--page-text);
		font-family: var(--font-body);
		font-size: clamp(2.5rem, 8vw, 5.75rem);
		line-height: 1.2;
		text-align: center;
	}
</style>
