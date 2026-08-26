<script>
	import {
		loadDrawingGenerationLibrary,
		saveDrawingGenerationLibraryEntry,
		removeDrawingGenerationLibraryEntry,
		readDrawingLibraryReference,
		readDrawingLibraryGeneration
	} from '$lib/draw-generation-library.js';
	/** @typedef {import('$lib/draw-generation-history.js').DrawingImageGeneration} Generation */
	/** @typedef {import('$lib/draw-generation-library.js').DrawingGenerationLibraryEntry} LibraryEntry */
	/** @type {{storageKey:string, userId?:string, prompt:string, reference?:{dataURL:string,mimeType:string}|null, generation?:Generation, onModifier:(text:string)=>void, onReference:(reference:{dataURL:string,mimeType:string})=>void, onRemix:(generation:Generation)=>void}} */
	let {
		storageKey,
		userId,
		prompt,
		reference = null,
		generation,
		onModifier,
		onReference,
		onRemix
	} = $props();
	let entries = $state(/** @type {LibraryEntry[]} */ ([]));
	let name = $state('');
	let error = $state('');
	let status = $state('');
	let loading = $state(true);
	let saving = $state(false);
	$effect(() => {
		const key = storageKey;
		const account = userId;
		let cancelled = false;
		loading = true;
		entries = [];
		error = '';
		status = '';
		loadDrawingGenerationLibrary(userId)
			.then((saved) => {
				if (!cancelled) entries = saved;
			})
			.catch(() => {
				if (!cancelled) error = 'Saved library unavailable on this device.';
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});
		return () => {
			cancelled = true;
		};
	});
	/** @param {'modifier'|'reference'|'generation'} kind */
	async function save(kind) {
		if (saving || loading || !userId) return;
		saving = true;
		error = '';
		const key = storageKey;
		const account = userId;
		try {
			const saved = await saveDrawingGenerationLibraryEntry(userId, {
				kind,
				name:
					name.trim() ||
					(kind === 'modifier'
						? prompt.slice(0, 40)
						: kind === 'reference'
							? 'Reference'
							: generation?.modelLabel || 'Generation'),
				text: prompt.trim(),
				reference: reference ? $state.snapshot(reference) : undefined,
				generation: generation ? $state.snapshot(generation) : undefined
			});
			if (key !== storageKey || account !== userId) return;
			entries = [...entries, saved];
			name = '';
			status = 'Saved to your private library';
		} catch (failure) {
			error = failure instanceof Error ? failure.message : 'Could not save.';
		} finally {
			saving = false;
		}
	}
	/** @param {LibraryEntry} entry */
	async function use(entry) {
		error = '';
		const account = userId;
		const key = storageKey;
		try {
			if (entry.kind === 'modifier') onModifier(entry.text ?? '');
			else if (entry.kind === 'reference') {
				const reference = await readDrawingLibraryReference(account, entry);
				if (account === userId && key === storageKey) onReference(reference);
			} else {
				const generation = await readDrawingLibraryGeneration(account, entry);
				if (account === userId && key === storageKey) onRemix(generation);
			}
		} catch (failure) {
			error = failure instanceof Error ? failure.message : 'Could not open saved item.';
		}
	}
	/** @param {LibraryEntry} entry */
	async function remove(entry) {
		if (
			saving ||
			!confirm(
				`Remove “${entry.name}” from Saved? Uploaded assets, canvas, recent history, downloads, and provider copies remain.`
			)
		)
			return;
		saving = true;
		try {
			await removeDrawingGenerationLibraryEntry(userId, entry);
			entries = entries.filter((item) => item.id !== entry.id);
		} catch (failure) {
			error = failure instanceof Error ? failure.message : 'Could not remove saved item.';
		} finally {
			saving = false;
		}
	}
</script>

<details class="saved-library">
	<summary>Saved modifiers & references <span>{entries.length}</span></summary>
	{#if !userId}<p>Sign in to use the private saved library.</p>{/if}
	<p>
		Save uploads selected references/results to your private account library. Recent history stays
		on this device. Video Save keeps the recipe only, not the clip. Private asset limits apply.
	</p>
	<label
		>Name <input
			aria-label="Saved item name"
			maxlength="120"
			bind:value={name}
			placeholder="e.g. Editorial lighting"
		/></label
	>
	<div class="actions">
		<button
			type="button"
			disabled={!userId || loading || saving || !prompt.trim()}
			onclick={() => save('modifier')}>Save prompt modifier</button
		>
		<button
			type="button"
			disabled={!userId || loading || saving || !reference}
			onclick={() => save('reference')}>Save reference</button
		>
		<button
			type="button"
			disabled={!userId || loading || saving || !generation?.modelId}
			onclick={() => save('generation')}>Save generation</button
		>
	</div>
	{#if loading}<p>Loading saved items…</p>{/if}
	{#if error}<p role="alert">{error}</p>{:else if status}<p role="status">{status}</p>{/if}
	<ul>
		{#each entries as entry (entry.id)}
			<li>
				<div><strong>{entry.name}</strong><small>{entry.kind}</small></div>
				<button type="button" disabled={saving} onclick={() => use(entry)}
					>{entry.kind === 'modifier'
						? 'Append'
						: entry.kind === 'reference'
							? 'Attach'
							: 'Remix'}</button
				>
				<button
					type="button"
					disabled={saving}
					aria-label={`Remove saved ${entry.name}`}
					onclick={() => remove(entry)}>×</button
				>
			</li>
		{/each}
	</ul>
</details>

<style>
	.saved-library {
		margin-top: 12px;
		border-top: 1px solid #e5e7eb;
		padding-top: 10px;
		font-size: 12px;
	}
	summary {
		cursor: pointer;
		font-weight: 650;
	}
	summary span {
		color: #6b7280;
		margin-left: 6px;
	}
	p,
	small {
		color: #64748b;
		font-size: 11px;
		line-height: 1.5;
	}
	label {
		display: grid;
		gap: 4px;
	}
	input {
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 5px;
		padding: 6px;
	}
	.actions {
		display: flex;
		gap: 5px;
		flex-wrap: wrap;
		margin-top: 6px;
	}
	button {
		border: 1px solid #cbd5e1;
		border-radius: 5px;
		padding: 5px 7px;
		background: white;
		font-size: 11px;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	button:focus-visible,
	input:focus-visible {
		outline: 2px solid #6366f1;
		outline-offset: 2px;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 8px 0 0;
	}
	li {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 0;
		border-top: 1px solid #f1f5f9;
	}
	li div {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	small {
		display: block;
	}
</style>
