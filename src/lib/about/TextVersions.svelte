<script>
	import { onMount } from 'svelte';
	/** @type {string} */
	export let id;
	/** @type {string} */
	export let label;
	/** @type {{label: string, paragraphs: string[]}[]} */
	export let versions;
	let selected = 0;
	let ready = false;
	let copying = false;
	let status = '';
	let request = 0;
	onMount(() => {
		ready = true;
	});
	$: current = versions[selected];

	/** @param {number} index */
	function select(index) {
		selected = index;
		request += 1;
		copying = false;
		status = '';
	}

	async function copy() {
		const attempt = ++request;
		const selectedLabel = current.label;
		copying = true;
		status = '';
		try {
			await navigator.clipboard.writeText(current.paragraphs.join('\n\n'));
			if (attempt === request) status = `${selectedLabel} ${label.toLowerCase()} copied.`;
		} catch {
			if (attempt === request)
				status = 'Couldn’t copy automatically. You can select and copy the text below.';
		} finally {
			if (attempt === request) copying = false;
		}
	}
</script>

<div class="text-versions" data-versions={id}>
	<div class="version-toolbar">
		<div class="version-options" role="group" aria-label={`${label} length`}>
			<span aria-hidden="true">{label}:</span>
			{#each versions as version, index}
				<button
					type="button"
					aria-pressed={selected === index}
					aria-controls={`${id}-text`}
					disabled={!ready}
					on:click={() => select(index)}>{version.label}</button
				>
			{/each}
		</div>
		<button class="copy-button" type="button" on:click={copy} disabled={!ready || copying}
			>{copying ? 'Copying…' : `Copy ${label.toLowerCase()}`}</button
		>
	</div>
	<p class="copy-status" role="status" aria-live="polite" hidden={!status}>{status}</p>
	<div id={`${id}-text`} class="version-text">
		{#each current.paragraphs as paragraph}<p>{paragraph}</p>{/each}
	</div>
	<noscript
		><p class="no-script">
			The short version is shown here. The full story is available below.
		</p></noscript
	>
</div>

<style>
	.version-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		column-gap: 1rem;
		row-gap: 0;
		margin-bottom: 0.65rem;
		font: 0.9rem/1.4 var(--font-reading);
	}
	.version-options {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.version-options > span {
		color: var(--page-muted);
		margin-right: 0.2rem;
	}
	button {
		min-height: 44px;
		padding: 0.4rem 0.5rem;
		background: transparent;
		color: var(--page-muted);
		border: 0;
		border-bottom: 1px solid transparent;
		cursor: pointer;
	}
	button[aria-pressed='true'] {
		border-bottom-color: var(--page-link);
		color: var(--page-link);
	}
	button:hover {
		color: var(--page-link);
	}
	button:focus-visible {
		outline: 2px solid var(--page-link);
		outline-offset: 3px;
	}
	button:disabled {
		cursor: default;
		opacity: 0.6;
	}
	.copy-button {
		color: var(--page-link);
		white-space: nowrap;
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	.version-text {
		font: 400 1.125rem/1.65 var(--font-reading);
		color: var(--page-text);
	}
	.version-text p {
		margin: 0 0 1em;
	}
	.version-text p:last-child {
		margin-bottom: 0;
	}
	.copy-status,
	.no-script {
		margin: 0 0 0.75rem;
		font: 0.875rem/1.5 var(--font-body);
		color: var(--page-muted);
	}
	@media (max-width: 480px) {
		.version-toolbar {
			display: flex;
			gap: 0.3rem;
			font-size: 0.85rem;
		}
		.copy-button {
			padding-left: 0;
		}
		.version-options {
			gap: 0;
		}
	}
</style>
