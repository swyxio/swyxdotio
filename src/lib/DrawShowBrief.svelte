<script lang="ts">
	import {
		SHOW_PRESETS,
		referenceCatalog,
		type FewShotSelection,
		type ExampleSelection
	} from './draw-creative-examples.js';
	let {
		draft,
		firstRun,
		briefs,
		kits,
		busy = false,
		signedIn = false,
		currentBriefId = '',
		fewShot,
		promptPreview = '',
		onPatch,
		onContinue,
		onNew,
		onPreset,
		onImport,
		onExamples,
		onSources,
		onKit,
		onUseKit,
		onSave,
		onCompose
	} = $props<{
		draft: Record<string, any>;
		firstRun: boolean;
		briefs: any[];
		kits: any[];
		busy?: boolean;
		signedIn?: boolean;
		currentBriefId?: string;
		fewShot: FewShotSelection;
		promptPreview?: string;
		onPatch: (fields: Record<string, any>) => void;
		onContinue: (record: any) => void;
		onNew: () => void;
		onPreset: (id: string, fields: string[]) => void;
		onImport: () => void;
		onExamples: () => void;
		onSources: () => void;
		onKit: () => void;
		onUseKit: (id: string) => void;
		onSave: () => void;
		onCompose: () => void;
	}>();
	let starter = $state('ls');
	let presetFields = $state(['hints', 'house']);
	let kitChoice = $state('');
	const selectedPreset = $derived(SHOW_PRESETS.find((preset) => preset.id === starter));
	const starterExamples = $derived.by(() => {
		const channel = referenceCatalog.channels.find(
			(channel) => channel.slug === selectedPreset?.channelSlug
		);
		return (channel?.latestIds ?? [])
			.slice(0, 2)
			.map((id) => referenceCatalog.examples.find((example) => example.id === id))
			.filter((example) => Boolean(example));
	});
	const selectedExamples = $derived(
		fewShot.examples.map((selected: ExampleSelection) => ({
			selected,
			example: referenceCatalog.examples.find((example) => example.id === selected.id)
		}))
	);
	function toggleField(field: string) {
		presetFields = presetFields.includes(field)
			? presetFields.filter((value) => value !== field)
			: [...presetFields, field];
	}
</script>

<section class="show-start" aria-label="Show brief onboarding">
	<header class="start-heading">
		<div>
			<p class="eyebrow">{firstRun ? 'YOUR FIRST SHOW' : 'YOUR SHOW WORKSPACE'}</p>
			<h3>{firstRun ? 'Start with the show.' : 'What are we making next?'}</h3>
			<p>
				{firstRun
					? 'Bring the upcoming episode and pick examples you like. Build your first brief before managing files.'
					: 'Continue a brief, start the next episode, or refine the house style. Your saved work stays separate from public inspiration.'}
			</p>
		</div>
		<div class="start-actions">
			<button class="quiet" disabled={busy} onclick={onExamples}>Browse examples</button><button
				class="quiet"
				disabled={busy}
				onclick={onNew}>+ New show</button
			>
		</div>
	</header>
	{#if briefs.length}<section class="returning" aria-label="Continue a saved show">
			<div class="section-label"><strong>Continue a show</strong><span>Saved privately</span></div>
			<div class="recent-shows">
				{#each briefs.slice(0, 4) as record}<button
						disabled={busy}
						class:current={record.id === currentBriefId}
						onclick={() => onContinue(record)}
						><strong>{record.data.name}</strong><span
							>{record.data.title || 'Title not chosen yet'}</span
						></button
					>{/each}
			</div>
		</section>{/if}
	<div class="brief-layout">
		<div class="brief-main">
			<section class="step">
				<div class="step-title">
					<span>1</span>
					<div>
						<h4>Bring the next episode</h4>
						<p>An unlisted link, a transcript, or a rough idea all work.</p>
					</div>
				</div>
				<label
					>Upcoming video URL
					<div class="url-field">
						<input
							aria-label="Upcoming video URL"
							disabled={busy}
							value={draft.sourceUrl}
							oninput={(event) => onPatch({ sourceUrl: event.currentTarget.value })}
							placeholder="Paste the unlisted YouTube link"
						/><button disabled={busy || !signedIn || !draft.sourceUrl.trim()} onclick={onImport}
							>{busy ? 'Working…' : 'Import metadata'}</button
						>
					</div></label
				>
				<p class="helper">
					Imports only on click. Without a configured API key, YouTube may provide just the title,
					channel and thumbnail. Captions are not retrieved.
				</p>
				<label
					>Show / brief name<input
						aria-label="Show / brief name"
						maxlength="120"
						disabled={busy}
						value={draft.name}
						oninput={(event) => onPatch({ name: event.currentTarget.value })}
						placeholder="Give this episode a working name"
					/></label
				>
				<label
					>Episode title<input
						aria-label="Episode title"
						maxlength="500"
						disabled={busy}
						value={draft.title}
						oninput={(event) => onPatch({ title: event.currentTarget.value })}
						placeholder="What is the conversation or talk about?"
					/></label
				>
				<label
					>Thumbnail hook<input
						aria-label="Show thumbnail hook"
						maxlength="300"
						disabled={busy}
						value={draft.hook}
						oninput={(event) => onPatch({ hook: event.currentTarget.value })}
						placeholder="One supported reason to click"
					/></label
				>
				<label
					>Editorial hints<textarea
						aria-label="Editorial hints"
						maxlength="2000"
						rows="3"
						disabled={busy}
						value={draft.hints}
						oninput={(event) => onPatch({ hints: event.currentTarget.value })}
						placeholder="Audience, exact guest names, tension, claims to avoid…"
					></textarea></label
				>
				{#if draft.description}<details>
						<summary>Imported video description · context, not verified quotes</summary><label
							>Video description<textarea
								aria-label="Imported video description"
								rows="4"
								maxlength="20000"
								value={draft.description}
								oninput={(event) => onPatch({ description: event.currentTarget.value })}
							></textarea></label
						>
					</details>{/if}
				<div class="source-actions">
					<button disabled={busy} onclick={onSources}
						>{draft.transcript
							? 'Review transcript & quotes'
							: 'Add transcript & extract quotes'}</button
					><span
						>{draft.transcript
							? `${draft.transcript.length.toLocaleString()} characters in this draft`
							: 'Or start with a manual title and hook; no AI is required.'}</span
					>
				</div>
			</section>
			<section class="step">
				<div class="step-title">
					<span>2</span>
					<div>
						<h4>Show what good looks like</h4>
						<p>Choose up to six examples and decide what to learn from each.</p>
					</div>
				</div>
				{#if selectedExamples.length}<div class="chosen-examples">
						{#each selectedExamples as { selected, example }}<article>
								{#if example}<img
										src={example.thumbnailUrl}
										alt="Selected public reference"
										loading="lazy"
										referrerpolicy="no-referrer"
									/>
									<div>
										<strong>{example.title}</strong><span>{selected.fields.join(' · ')}</span>
									</div>{:else}<span>Saved example unavailable; review the reference shelf.</span
									>{/if}
							</article>{/each}
					</div>{:else}<div class="reference-invitation">
						<strong>Seven channels. Real examples.</strong>
						<p>
							Dwarkesh Patel · Matthew Berman · Matt Pocock · AI Engineer · Latent Space · Theo ·
							ThePrimeagen
						</p>
						<span>Latest five + most-viewed five per channel, with dated coverage.</span>
					</div>{/if}
				<button class="primary" disabled={busy} onclick={onExamples}
					>{selectedExamples.length ? 'Review selected examples' : 'Choose reference examples'} →</button
				>
				<p class="helper">
					Field toggles add explicit text demonstrations, not another show's facts. Thumbnail images
					are not sent automatically.
				</p>
			</section>
			<section class="step">
				<div class="step-title">
					<span>3</span>
					<div>
						<h4>Save, then make versions</h4>
						<p>Saving a brief never inserts artwork or starts generation.</p>
					</div>
				</div>
				<div class="next-actions">
					<button
						disabled={busy || !signedIn || !(draft.name.trim() || draft.title.trim())}
						onclick={onSave}>Save show brief</button
					><button class="primary" disabled={busy} onclick={onCompose}
						>Compose editable versions →</button
					>
				</div>
				<details class="prompt-review">
					<summary>What will be sent to the shared prompt?</summary>
					<p>
						Only an explicit AI action sends a request. These are text demonstrations; no reference
						image bytes are attached here.
					</p>
					<pre>{promptPreview ||
							'Select examples or add a title and hook to preview your prompt.'}</pre>
				</details>
			</section>
		</div>
		<aside class="house-panel">
			<div class="starter-references">
				<p class="eyebrow">START WITH EXAMPLES</p>
				{#each starterExamples as example}{#if example}<button disabled={busy} onclick={onExamples}
							><img
								src={example.thumbnailUrl}
								alt={`Public example: ${example.title}`}
								loading="lazy"
								referrerpolicy="no-referrer"
							/><span>{example.thumbnailText ?? example.title}</span></button
						>{/if}{/each}
				<p class="helper">
					Public inspiration · not selected or attached. Browse all seven channels to choose your
					own.
				</p>
			</div>
			<p class="eyebrow">REUSABLE DEFAULTS</p>
			<h4>{firstRun ? 'Give yourself a starting point.' : 'Keep the house. Change the show.'}</h4>
			<p>
				Original editorial suggestions—not the creators' private prompts or an approved AIE event
				style.
			</p>
			<label
				>Show starter<select aria-label="Show starter" bind:value={starter}
					>{#each SHOW_PRESETS as preset}<option value={preset.id}>{preset.name}</option
						>{/each}</select
				></label
			>
			{#if selectedPreset}<details open>
					<summary>Preview starter fields</summary>
					<p>{selectedPreset.hints}</p>
				</details>{/if}
			<fieldset>
				<legend>Fill only these fields</legend
				>{#each [{ id: 'name', label: 'Working name' }, { id: 'hints', label: 'Editorial hints' }, { id: 'house', label: 'House-prompt draft' }] as field}<label
						class="check"
						><input
							type="checkbox"
							checked={presetFields.includes(field.id)}
							onchange={() => toggleField(field.id)}
						/>{field.label}</label
					>{/each}
			</fieldset>
			<button
				disabled={busy || !presetFields.length}
				onclick={() => onPreset(starter, presetFields)}>Apply selected starter fields</button
			>
			<p class="helper">
				Existing values are replaced only when you apply. You can undo the field change. A house
				draft must be saved separately.
			</p>
			<hr />
			{#if kits.length}<label
					>Saved house kit<select aria-label="Saved house kit" bind:value={kitChoice}
						><option value="">Choose a house kit</option>{#each kits as record}<option
								value={record.id}>{record.data.name} · house v{record.activeRevision}</option
							>{/each}</select
					></label
				><button disabled={busy || !kitChoice} onclick={() => onUseKit(kitChoice)}
					>Use active house revision</button
				>{/if}
			<button class="quiet" disabled={busy} onclick={onKit}
				>{kits.length ? 'Review / update house style' : 'Review & save your house kit'}</button
			>
			<p class="helper">
				Logos and real headshots come next in Compose. You do not need to organize an asset library
				before starting.
			</p>
		</aside>
	</div>
</section>

<style>
	.show-start {
		--ink: #202339;
		--muted: #656b80;
		--line: #dbe0ec;
		--blue: #283d84;
		color: var(--ink);
		font-family: Arial, sans-serif;
	}
	.start-heading {
		display: flex;
		justify-content: space-between;
		gap: 30px;
		align-items: flex-start;
		margin-bottom: 25px;
	}
	.start-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.starter-references {
		margin-bottom: 24px;
	}
	.starter-references button {
		padding: 0 !important;
		overflow: hidden;
		text-align: left;
		margin-bottom: 10px;
	}
	.starter-references img {
		display: block;
		width: 100%;
		aspect-ratio: 16/9;
		object-fit: cover;
	}
	.starter-references span {
		display: block;
		padding: 9px;
		font-size: 11px;
		line-height: 1.4;
	}
	.eyebrow {
		font: 700 10px/1.4 monospace;
		letter-spacing: 1.4px;
		color: #5361b3;
		margin: 0 0 8px;
	}
	.start-heading h3 {
		font-size: 34px;
		letter-spacing: -1.2px;
		margin: 0 0 12px;
		line-height: 1.1;
	}
	.start-heading p:not(.eyebrow) {
		color: var(--muted);
		line-height: 1.5;
		max-width: 690px;
		font-size: 14px;
		margin: 0;
	}
	.show-start button {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 11px 13px;
		background: white;
		color: var(--ink);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}
	.show-start button.primary {
		background: var(--blue);
		border-color: var(--blue);
		color: white;
	}
	.show-start button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.quiet {
		white-space: nowrap;
	}
	.brief-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 270px;
		gap: 28px;
		align-items: start;
	}
	.brief-main {
		min-width: 0;
	}
	.step {
		background: white;
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 22px;
		margin-bottom: 20px;
	}
	.step-title {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 22px;
	}
	.step-title > span {
		width: 25px;
		height: 25px;
		display: grid;
		place-items: center;
		background: #ecf0fc;
		border-radius: 50%;
		font: 700 12px monospace;
		color: var(--blue);
		flex-shrink: 0;
	}
	.step h4,
	.house-panel h4 {
		font-size: 18px;
		letter-spacing: -0.35px;
		margin: 1px 0 8px;
	}
	.step-title p,
	.house-panel > p:not(.eyebrow) {
		font-size: 12px;
		line-height: 1.5;
		color: var(--muted);
		margin: 0;
	}
	.show-start label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		margin: 15px 0;
	}
	.show-start input:not([type='checkbox']),
	.show-start textarea,
	.show-start select {
		display: block;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: white;
		color: var(--ink);
		padding: 11px;
		font:
			14px/1.4 Arial,
			sans-serif;
		margin-top: 7px;
	}
	.show-start textarea {
		resize: vertical;
	}
	.url-field {
		display: flex;
		gap: 8px;
		margin-top: 7px;
	}
	.url-field input {
		margin: 0 !important;
	}
	.url-field button {
		white-space: nowrap;
		background: #edf1fc;
	}
	.helper {
		font-size: 11px;
		color: var(--muted);
		line-height: 1.5;
	}
	.source-actions {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}
	.source-actions span {
		font-size: 11px;
		color: var(--muted);
	}
	.house-panel {
		padding: 20px;
		background: #edf1fa;
		border: 1px solid var(--line);
		border-radius: 9px;
	}
	.house-panel details {
		font-size: 12px;
		line-height: 1.6;
		margin: 16px 0;
	}
	.house-panel button {
		width: 100%;
	}
	.house-panel fieldset {
		border: 0;
		padding: 0;
		margin: 15px 0;
	}
	.house-panel legend {
		font-size: 11px;
		color: var(--muted);
	}
	.house-panel label.check {
		display: flex;
		gap: 7px;
		align-items: center;
		font-weight: 400;
		margin: 10px 0;
	}
	.house-panel hr {
		border: 0;
		border-top: 1px solid #d4dceb;
		margin: 24px 0;
	}
	.returning {
		margin-bottom: 28px;
	}
	.section-label {
		display: flex;
		gap: 15px;
		margin-bottom: 10px;
		font-size: 12px;
	}
	.section-label span {
		color: var(--muted);
	}
	.recent-shows {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
	}
	.recent-shows button {
		text-align: left;
		min-width: 0;
	}
	.recent-shows strong,
	.recent-shows span {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.recent-shows span {
		font-size: 11px;
		color: var(--muted);
		margin-top: 7px;
	}
	.recent-shows .current {
		border-color: #435fd0;
		box-shadow: 0 0 0 1px #435fd0;
	}
	.reference-invitation {
		padding: 18px;
		border: 1px dashed #a4b3d8;
		background: #f6f8fd;
		border-radius: 7px;
		margin-bottom: 14px;
	}
	.reference-invitation strong {
		font-size: 16px;
	}
	.reference-invitation p {
		font-size: 13px;
		line-height: 1.7;
	}
	.reference-invitation span {
		font-size: 11px;
		color: var(--muted);
	}
	.chosen-examples {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
		margin-bottom: 18px;
	}
	.chosen-examples article {
		display: flex;
		gap: 10px;
		align-items: center;
		border: 1px solid var(--line);
		border-radius: 6px;
		overflow: hidden;
		background: #f9fbff;
	}
	.chosen-examples img {
		width: 85px;
		aspect-ratio: 16/9;
		object-fit: cover;
	}
	.chosen-examples strong {
		font-size: 11px;
		display: block;
		line-height: 1.4;
	}
	.chosen-examples span {
		display: block;
		font-size: 10px;
		color: #596988;
		margin: 5px 0;
	}
	.next-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.prompt-review {
		margin-top: 20px;
		font-size: 12px;
	}
	.prompt-review pre {
		max-height: 300px;
		overflow: auto;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		background: #f3f5fa;
		padding: 14px;
		font-size: 11px;
		line-height: 1.5;
	}
	button:focus-visible,
	input:focus-visible,
	textarea:focus-visible,
	select:focus-visible {
		outline: 3px solid #dcae35;
		outline-offset: 3px;
	}
	@media (max-width: 950px) {
		.brief-layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.house-panel {
			max-width: none;
		}
		.recent-shows {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 580px) {
		.start-actions {
			margin-top: 14px;
		}
		.show-start button {
			min-height: 44px;
		}
		.start-heading {
			display: block;
		}
		.start-heading h3 {
			font-size: 28px;
		}
		.step {
			padding: 16px;
		}
		.url-field {
			display: block;
		}
		.url-field button {
			margin-top: 8px;
		}
		.chosen-examples {
			grid-template-columns: minmax(0, 1fr);
		}
		.recent-shows {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 650px), (pointer: coarse) {
		.show-start input:not([type='checkbox']),
		.show-start textarea,
		.show-start select {
			font-size: 16px;
		}
	}
</style>
