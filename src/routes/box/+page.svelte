<svelte:head>
	<title>Big text box · swyx.io</title>
	<link rel="canonical" href="https://swyx.io/box" />
	<meta name="description" content="A distraction-free, oversized text box. Just start typing." />
</svelte:head>

<section class="box" aria-label="Big text box">
	<header>big text box</header>
	<!-- svelte-ignore a11y_autofocus (the dedicated writing canvas should be immediately editable) -->
	<textarea autofocus aria-label="Write anything" spellcheck="false"></textarea>
	<footer><a href="/">swyx.io</a></footer>
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
