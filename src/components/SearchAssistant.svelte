<script lang="ts">
	import { onDestroy } from 'svelte';
	export let query = '';
	type Source = { id: number; title: string; url: string; section: string };
	let answer = '',
		sources: Source[] = [],
		status = '',
		busy = false;
	let controller: AbortController | undefined;
	let activeQuery = '';
	function stop() {
		controller?.abort();
		controller = undefined;
		busy = false;
	}
	onDestroy(stop);
	$: if (activeQuery && query.trim() !== activeQuery) {
		stop();
		answer = '';
		sources = [];
		status = '';
		activeQuery = '';
	}
	async function ask() {
		stop();
		const request = new AbortController();
		controller = request;
		activeQuery = query.trim();
		answer = '';
		sources = [];
		busy = true;
		status = 'Finding passages…';
		try {
			const response = await fetch('/api/search/ask', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ q: activeQuery }),
				signal: request.signal
			});
			if (!response.ok || !response.body)
				throw new Error(
					response.status === 429
						? 'Please wait a minute before asking again.'
						: 'Answers are temporarily unavailable. The search results below still work.'
				);
			const reader = response.body.getReader(),
				decoder = new TextDecoder();
			let buffer = '',
				finished = false;
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (controller !== request) return;
				buffer += decoder.decode(value, { stream: true });
				let boundary;
				while ((boundary = buffer.indexOf('\n\n')) >= 0) {
					const frame = buffer.slice(0, boundary);
					buffer = buffer.slice(boundary + 2);
					const event = frame.match(/^event: (.+)$/m)?.[1],
						raw = frame.match(/^data: (.+)$/m)?.[1];
					if (!raw) continue;
					const data = JSON.parse(raw);
					if (event === 'sources') {
						sources = data.sources;
						status = 'Reading the notebook…';
					}
					if (event === 'token') {
						answer += data.text;
						status = 'Writing an answer…';
					}
					if (event === 'done') {
						finished = true;
						status =
							data.status === 'complete'
								? 'Answer ready. Check the linked passages for context.'
								: data.status === 'empty'
									? 'No matching passages found. Try a more specific question.'
									: data.status === 'timeout'
										? 'The answer took too long. You can try again.'
										: 'Answers are temporarily unavailable. The search results below still work.';
					}
				}
			}
			if (!finished) throw new Error('The answer was interrupted. You can try again.');
		} catch (error) {
			if (controller === request && !request.signal.aborted)
				status = error instanceof Error ? error.message : 'Unable to answer right now.';
		} finally {
			if (controller === request) {
				busy = false;
				controller = undefined;
			}
		}
	}
</script>

<section class="assistant" aria-label="Ask the notebook" aria-busy={busy}>
	<div class="ask-row">
		<div>
			<h2>Ask the notebook</h2>
			<p>A short answer from swyx’s writing, with sources.</p>
		</div>
		{#if busy}<button
				on:click={() => {
					stop();
					status = 'Stopped. You can ask again.';
				}}>Stop</button
			>{:else}<button disabled={!query.trim()} on:click={ask}
				>{answer ? 'Ask again' : 'Ask a question'} <span aria-hidden="true">↗</span></button
			>{/if}
	</div>
	{#if status}<p class="status" role="status">{status}</p>{/if}
	{#if answer}<div class="answer">{answer}</div>{/if}
	{#if sources.length}<ol class="sources" aria-label="Answer sources">
			{#each sources as source}<li>
					<a href={source.url}
						>[{source.id}] {source.title}{#if source.section}<span> · {source.section}</span>{/if}</a
					>
				</li>{/each}
		</ol>{/if}
</section>

<style>
	.assistant {
		margin-top: 24px;
		padding: 20px;
		border: 1px solid var(--page-border);
		border-radius: 12px;
		background: var(--page-surface);
	}
	.ask-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 25px;
		font-weight: 400;
	}
	p {
		margin: 5px 0 0;
		font-size: 13px;
		opacity: 0.75;
	}
	button {
		flex-shrink: 0;
		padding: 10px 14px;
		border: 1px solid currentColor;
		border-radius: 7px;
		color: var(--page-accent);
		background: transparent;
		font: inherit;
		font-size: 13px;
		cursor: pointer;
		min-height: 44px;
	}
	button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 4px;
	}
	.status {
		margin-top: 14px;
	}
	.answer {
		margin-top: 16px;
		font-family: var(--font-reading);
		font-size: 20px;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.sources {
		margin: 16px 0 0;
		padding-left: 22px;
		font-size: 13px;
		line-height: 1.7;
	}
	.sources li {
		padding-left: 3px;
	}
	a {
		color: inherit;
		text-decoration-color: var(--page-accent);
		text-underline-offset: 3px;
	}
	a span {
		opacity: 0.7;
	}
	@media (max-width: 520px) {
		.ask-row {
			align-items: flex-start;
			flex-direction: column;
			gap: 12px;
		}
		.assistant {
			padding: 16px;
		}
	}
</style>
