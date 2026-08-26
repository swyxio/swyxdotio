<script lang="ts">
	import {
		referenceCatalog,
		toggleExampleField,
		emptyFewShot,
		MAX_FEW_SHOT_EXAMPLES,
		type FewShotSelection,
		type ExampleSelection,
		type ExampleField,
		type ReferenceExample
	} from './draw-creative-examples.js';
	let {
		selection = emptyFewShot(),
		onChange,
		onDemo,
		onSaveImage,
		busy = false
	} = $props<{
		selection?: FewShotSelection;
		onChange: (value: FewShotSelection) => void;
		onDemo?: (example: ReferenceExample) => void;
		onSaveImage?: (example: ReferenceExample) => void;
		busy?: boolean;
	}>();
	let channelId = $state(
		referenceCatalog.channels.find((item) => item.slug === 'latent-space')?.id ??
			referenceCatalog.channels[0]?.id ??
			''
	);
	let collection = $state('latest');
	let query = $state('');
	let error = $state('');
	const channel = $derived(referenceCatalog.channels.find((item) => item.id === channelId));
	const displayed = $derived(
		referenceCatalog.examples
			.filter((item) => {
				const ids = collection === 'top' ? channel?.topIds : channel?.latestIds;
				const inCollection =
					collection === 'selected'
						? selection.examples.some((chosen: ExampleSelection) => chosen.id === item.id)
						: ids?.includes(item.id);
				return (
					inCollection &&
					`${item.title} ${item.thumbnailText ?? ''}`
						.toLowerCase()
						.includes(query.trim().toLowerCase())
				);
			})
			.sort((a, b) => {
				const ids = collection === 'top' ? channel?.topIds : channel?.latestIds;
				return (ids?.indexOf(a.id) ?? 0) - (ids?.indexOf(b.id) ?? 0);
			})
	);
	function toggle(id: string, field: ExampleField, input: HTMLInputElement) {
		try {
			onChange(toggleExampleField(selection, id, field));
			error = '';
		} catch (cause) {
			input.checked = selection.examples.some(
				(item: ExampleSelection) => item.id === id && item.fields.includes(field)
			);
			error = cause instanceof Error ? cause.message : 'Cannot select this example.';
		}
	}
	function setNote(id: string, note: string) {
		onChange({
			...selection,
			examples: selection.examples.map((item: ExampleSelection) =>
				item.id === id ? { ...item, note } : item
			)
		});
	}
</script>

<section class="reference-browser" aria-label="Public thumbnail examples">
	<div class="reference-heading">
		<div>
			<p class="kicker">A REFERENCE SHELF, NOT A BLANK FORM</p>
			<h3>Learn from real videos.</h3>
			<p>
				Choose what each example should teach: title structure, thumbnail wording or visual
				direction. Your new show's facts stay separate.
			</p>
		</div>
		<span class="count">{selection.examples.length} / {MAX_FEW_SHOT_EXAMPLES} selected</span>
	</div>
	<div class="channel-tabs" aria-label="Reference channels">
		{#each referenceCatalog.channels as item}<button
				class:active={channelId === item.id}
				aria-pressed={channelId === item.id}
				onclick={() => {
					channelId = item.id;
					if (collection === 'selected') collection = 'latest';
				}}>{item.name}</button
			>{/each}
	</div>
	<div class="reference-controls">
		<div class="collections" aria-label="Example collection">
			<button
				class:active={collection === 'latest'}
				aria-pressed={collection === 'latest'}
				onclick={() => (collection = 'latest')}>Latest 5</button
			>
			<button
				class:active={collection === 'top'}
				aria-pressed={collection === 'top'}
				onclick={() => (collection = 'top')}>Most viewed 5</button
			>
			<button
				class:active={collection === 'selected'}
				aria-pressed={collection === 'selected'}
				onclick={() => (collection = 'selected')}>Selected ({selection.examples.length})</button
			>
		</div>
		<input
			type="search"
			aria-label="Search reference examples"
			placeholder="Find a title or hook"
			bind:value={query}
		/>
	</div>
	<p class="provenance">
		Snapshot {referenceCatalog.retrievedAt.slice(0, 10)} · Official Videos-tab Latest and Popular lists;
		Shorts and Live tabs excluded. Views do not prove thumbnail performance. {#if channel}<a
				href={channel.url}
				target="_blank"
				rel="noreferrer">View {channel.name} on YouTube ↗</a
			>{/if}
	</p>
	{#if channel?.notes}<details class="scope-note">
			<summary>Channel identity & coverage</summary>
			<p>{referenceCatalog.definition}</p>
			<p>{channel.notes}</p>
		</details>{/if}
	{#if selection.catalogVersion !== referenceCatalog.retrievedAt}<p class="error">
			Your saved examples use an older research snapshot. They have not been silently replaced. <button
				onclick={() => onChange(emptyFewShot())}>Clear selection and review this snapshot</button
			>
		</p>{/if}
	{#if error}<p class="error" role="alert">{error}</p>{/if}
	<div class="example-grid">
		{#each displayed as example (example.id)}
			{@const chosen = selection.examples.find((item: ExampleSelection) => item.id === example.id)}
			<article class:chosen={Boolean(chosen)}>
				<a
					class="thumbnail"
					href={example.url}
					target="_blank"
					rel="noreferrer"
					aria-label={`Watch reference: ${example.title}`}
					><img
						src={example.thumbnailUrl}
						alt={`Reference thumbnail: ${example.title}`}
						loading="lazy"
						referrerpolicy="no-referrer"
					/>{#if example.duration}<span>{example.duration}</span>{/if}</a
				>
				<div class="example-body">
					<h4>{example.title}</h4>
					<p class="metadata">
						{example.viewLabel ??
							(example.viewCount !== undefined
								? `${example.viewCount.toLocaleString()} views`
								: 'Views unavailable')} · {example.publishedLabel ??
							example.publishedAt?.slice(0, 10) ??
							'Publish date unavailable'}
					</p>
					{#if example.thumbnailText}<p class="observed-hook">
							<span>On the thumbnail</span>“{example.thumbnailText}”
						</p>{/if}
					<fieldset>
						<legend>Use as an example for</legend>
						{#each [{ id: 'title', label: 'Title' }, { id: 'hook', label: 'Hook' }, { id: 'visual', label: 'Visual direction' }] as field}<label
								><input
									type="checkbox"
									disabled={busy || (field.id === 'hook' && !example.thumbnailText)}
									checked={chosen?.fields.includes(field.id as ExampleField) ?? false}
									onchange={(event) =>
										toggle(example.id, field.id as ExampleField, event.currentTarget)}
								/>{field.label}</label
							>{/each}
					</fieldset>
					{#if !example.thumbnailText}<small
							>Hook text not transcribed; not inferred from the video title.</small
						>{/if}
					{#if chosen}<label class="note"
							>What should carry over?<input
								aria-label={`Reference note for ${example.title}`}
								maxlength="1000"
								value={chosen.note ?? ''}
								placeholder="E.g. concise question, not this guest or claim"
								oninput={(event) => setNote(example.id, event.currentTarget.value)}
							/></label
						>{/if}
					{#if example.notes}<details>
							<summary>Visual observation</summary>
							<p>{example.notes}</p>
						</details>{/if}
					<div class="example-actions">
						{#if onDemo}<button disabled={busy} onclick={() => onDemo?.(example)}
								>Try as a demo brief</button
							>{/if}{#if onSaveImage}<button disabled={busy} onclick={() => onSaveImage?.(example)}
								>Save image privately</button
							>{/if}
					</div>
				</div>
			</article>
		{:else}<p class="empty">
				{query.trim()
					? 'No matching examples. Try a different title.'
					: collection === 'selected'
						? 'Select examples with the field toggles to build your reference set.'
						: 'This ranking is unavailable in this research snapshot; no substitute ranking was invented.'}
			</p>{/each}
	</div>
	<p class="privacy">
		Public references stay in this shelf until you explicitly save a copy. Selecting examples adds
		text demonstrations to your prompt; it does not upload thumbnail images or grant rights to reuse
		a creator's identity or logos. Visual images must be attached separately within the selected
		model's limits.
	</p>
</section>

<style>
	.reference-browser {
		--ink: #202339;
		--muted: #61677e;
		--line: #dbe0ec;
		color: var(--ink);
		font-family: Arial, sans-serif;
	}
	.reference-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
	}
	.reference-heading h3 {
		font-size: 26px;
		letter-spacing: -0.8px;
		margin: 6px 0 10px;
	}
	.reference-heading p {
		max-width: 740px;
		line-height: 1.5;
		margin: 0 0 15px;
	}
	.kicker {
		font: 700 10px/1.4 monospace !important;
		letter-spacing: 1.2px;
		color: #5361b3;
	}
	.count {
		white-space: nowrap;
		font: 600 12px monospace;
		padding: 8px 10px;
		border: 1px solid var(--line);
		border-radius: 6px;
	}
	.channel-tabs,
	.reference-controls,
	.collections {
		display: flex;
		gap: 7px;
	}
	.channel-tabs {
		overflow-x: auto;
		padding: 8px 0 15px;
	}
	.reference-controls {
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
	}
	.channel-tabs button {
		white-space: nowrap;
	}
	.reference-browser button {
		border: 1px solid var(--line);
		border-radius: 6px;
		background: white;
		color: var(--ink);
		padding: 9px 11px;
		cursor: pointer;
		font-size: 12px;
	}
	.reference-browser button.active {
		background: #283d84;
		color: white;
		border-color: #283d84;
	}
	.reference-browser button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	input[type='search'] {
		padding: 10px;
		border: 1px solid var(--line);
		border-radius: 6px;
		max-width: 100%;
		box-sizing: border-box;
	}
	.provenance,
	.privacy,
	.scope-note {
		font-size: 12px;
		color: var(--muted);
		line-height: 1.5;
	}
	.provenance a {
		color: #334fa4;
	}
	.example-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
		margin: 20px 0;
	}
	.example-grid article {
		border: 1px solid var(--line);
		background: white;
		border-radius: 9px;
		overflow: hidden;
	}
	.example-grid article.chosen {
		border-color: #435fd0;
		box-shadow: 0 0 0 1px #435fd0;
	}
	.thumbnail {
		display: block;
		position: relative;
		background: #e9edf5;
		aspect-ratio: 16/9;
		overflow: hidden;
	}
	.thumbnail img {
		height: 100%;
		width: 100%;
		object-fit: cover;
	}
	.thumbnail span {
		position: absolute;
		right: 6px;
		bottom: 6px;
		background: #121525d9;
		color: white;
		font: 11px monospace;
		padding: 3px;
	}
	.example-body {
		padding: 13px;
	}
	.example-body h4 {
		font-size: 15px;
		line-height: 1.4;
		margin: 0 0 7px;
		overflow-wrap: anywhere;
	}
	.metadata,
	.example-body small {
		font-size: 11px;
		color: var(--muted);
		line-height: 1.4;
	}
	.observed-hook {
		font-size: 14px;
	}
	.observed-hook span {
		display: block;
		font-size: 10px;
		text-transform: uppercase;
		color: var(--muted);
		margin-bottom: 4px;
	}
	.example-body fieldset {
		border: 0;
		margin: 14px 0 6px;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 9px;
	}
	.example-body legend {
		font-size: 11px;
		margin-bottom: 8px;
	}
	.example-body label {
		font-size: 12px;
		display: flex;
		gap: 5px;
		align-items: center;
	}
	.note {
		flex-direction: column;
		align-items: stretch !important;
		margin: 12px 0;
	}
	.note input {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid var(--line);
		border-radius: 5px;
		padding: 9px;
	}
	.example-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 12px;
	}
	.example-actions button {
		font-size: 11px;
		padding: 7px;
	}
	.example-body details {
		font-size: 12px;
		margin-top: 12px;
		line-height: 1.5;
	}
	.empty {
		grid-column: 1/-1;
		padding: 35px;
		background: #f0f3fa;
		border-radius: 8px;
	}
	.error {
		background: #fff0eb;
		padding: 12px;
		color: #8e321f;
	}
	button:focus-visible,
	input:focus-visible,
	a:focus-visible {
		outline: 3px solid #dcae35;
		outline-offset: 3px;
	}
	@media (max-width: 900px) {
		.example-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 580px) {
		.reference-browser button {
			min-height: 44px;
		}
		.example-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.reference-heading {
			display: block;
		}
		.count {
			display: inline-block;
			margin-bottom: 12px;
		}
		.reference-heading h3 {
			font-size: 24px;
		}
		.collections {
			flex-wrap: wrap;
		}
	}
	@media (max-width: 650px), (pointer: coarse) {
		input[type='search'],
		.note input {
			font-size: 16px;
		}
	}
</style>
