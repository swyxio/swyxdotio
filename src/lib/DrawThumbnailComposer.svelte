<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { canAutofocusDrawingInput } from './draw-focus.js';
	import type { DrawingImageGeneration as Generation } from './draw-generation-history.js';
	import type { DrawingGenerationRun } from './draw-generation-batch.js';
	import type { DrawingGenerationModel } from './draw-generation-models.js';
	import type { ThumbnailReference } from './draw-thumbnail-workflow.js';
	import { formatDrawGenerationCost } from './draw-generation-models.js';
	import {
		DEFAULT_THUMBNAIL_MODEL_ID,
		MAX_THUMBNAIL_REFERENCES,
		MAX_THUMBNAIL_LABEL_LENGTH,
		validateThumbnailInput
	} from './draw-thumbnail-workflow.js';

	type Action = () => void | Promise<void>;
	type ResultAction = (generation: Generation) => void | Promise<void>;
	interface Props {
		contextText?: string;
		feedbackText?: string;
		references?: ThumbnailReference[];
		parentGeneration?: Generation | null;
		results?: Generation[];
		run?: DrawingGenerationRun | null;
		busy?: boolean;
		error?: string;
		modelId?: string;
		models?: DrawingGenerationModel[];
		limitUsd?: number | null;
		estimatedUsd?: number | null;
		canGenerate?: boolean;
		authenticated?: boolean;
		isOwner?: boolean;
		configured?: boolean;
		onContext: (text: string) => void;
		onFeedback: (text: string) => void;
		onReferences: (references: ThumbnailReference[]) => void;
		onModel: (id: string) => void;
		onLimit: (limit: number | null) => void;
		onGenerate: Action;
		onSelectResult: (generation: Generation | null) => void;
		onDownload: ResultAction;
		onInsert?: ResultAction;
		onSaveStyle?: ResultAction;
		onBrowseLibrary?: Action;
		onClose: Action;
		onCancel?: Action;
		onRetry?: Action;
	}
	let {
		contextText = '',
		feedbackText = '',
		references = [],
		parentGeneration = null,
		results = [],
		run = null,
		busy = false,
		error = '',
		modelId = DEFAULT_THUMBNAIL_MODEL_ID,
		models = [],
		limitUsd = null,
		estimatedUsd = null,
		canGenerate = false,
		authenticated = false,
		isOwner = false,
		configured = true,
		onContext,
		onFeedback,
		onReferences,
		onModel,
		onLimit,
		onGenerate,
		onSelectResult,
		onDownload,
		onInsert,
		onSaveStyle,
		onBrowseLibrary,
		onClose,
		onCancel,
		onRetry
	}: Props = $props();
	let fileInput: HTMLInputElement;
	let feedbackInput = $state<HTMLTextAreaElement>();
	async function chooseResult(generation: Generation) {
		onSelectResult(generation);
		await tick();
		if (parentGeneration?.id === generation.id) {
			feedbackInput?.scrollIntoView({ block: 'center' });
			if (canAutofocusDrawingInput()) feedbackInput?.focus({ preventScroll: true });
		}
	}
	let reading = $state(false);
	let attachmentError = $state('');
	let disposed = false;
	onDestroy(() => {
		disposed = true;
	});
	const model = $derived(models.find((item) => item.id === modelId));
	const validationError = $derived.by(() => {
		try {
			validateThumbnailInput({ contextText, feedbackText, references, parentGeneration, modelId });
			return '';
		} catch (cause) {
			return cause instanceof Error ? cause.message : 'Review the context and attached images.';
		}
	});
	const completed = $derived(run?.jobs.filter((job) => job.status === 'completed').length ?? 0);
	const failed = $derived(run?.jobs.filter((job) => job.status === 'failed').length ?? 0);
	const keep = $derived(references.filter((reference) => reference.role === 'keep'));
	const hasDraftInput = $derived(contextText || references.length || parentGeneration);
	const generationDisabled = $derived(
		busy || reading || !canGenerate || !authenticated || !configured || !!validationError
	);

	function resultLabel(generation: Generation) {
		const thumbnail = generation.context?.thumbnail as { label?: string } | undefined;
		return thumbnail?.label || 'Thumbnail';
	}
	function updateReference(index: number, patch: Partial<ThumbnailReference>) {
		onReferences(
			references.map((reference, position) =>
				position === index ? { ...reference, ...patch } : reference
			)
		);
	}
	async function addFiles(files: File[]) {
		if (!files.length || busy || reading) return;
		attachmentError = '';
		if (references.length + files.length > MAX_THUMBNAIL_REFERENCES) {
			attachmentError = 'Attach up to 15 images. No images from this selection were added.';
			return;
		}
		if (
			files.some(
				(file) => !/^image\/(png|jpeg|webp|avif|gif)$/.test(file.type) || file.size > 16_000_000
			)
		) {
			attachmentError =
				'Choose PNG, JPEG, WebP, AVIF or GIF files under 16 MB each. No images from this selection were added.';
			return;
		}
		reading = true;
		try {
			const additions = await Promise.all(
				files.map(
					(file) =>
						new Promise<ThumbnailReference>((resolve, reject) => {
							const reader = new FileReader();
							reader.onload = () =>
								resolve({
									dataURL: String(reader.result),
									mimeType: file.type,
									role: 'inspiration',
									label: ''
								});
							reader.onerror = () =>
								reject(new Error(`Could not read ${file.name}. Try attaching it again.`));
							reader.readAsDataURL(file);
						})
				)
			);
			if (references.length + additions.length > MAX_THUMBNAIL_REFERENCES)
				throw new Error(
					'The reference tray changed while reading. Keep at most 15 images and try again.'
				);
			if (disposed) return;
			onReferences([...references, ...additions]);
		} catch (cause) {
			attachmentError =
				cause instanceof Error ? cause.message : 'Could not read the selected images.';
		} finally {
			reading = false;
			if (fileInput) fileInput.value = '';
		}
	}
	function pasteImages(event: ClipboardEvent) {
		const files = Array.from(event.clipboardData?.files ?? []);
		if (!files.length) return;
		event.preventDefault();
		event.stopPropagation();
		void addFiles(files);
	}
	function dropImages(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		void addFiles(Array.from(event.dataTransfer?.files ?? []));
	}
	function composerKeydown(event: KeyboardEvent) {
		const modifierPressed = event.metaKey || event.ctrlKey;
		if (event.key !== 'Enter' || !modifierPressed || event.isComposing || event.repeat) return;
		event.preventDefault();
		event.stopPropagation();
		if (!generationDisabled) void onGenerate();
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions (Scopes Cmd/Ctrl+Enter from native form controls without adding an extra tab stop.) -->
<section
	class="thumbnail-composer"
	aria-label="Thumbnail composer"
	onkeydown={composerKeydown}
	onpaste={pasteImages}
	ondrop={dropImages}
	ondragover={(event) => event.preventDefault()}
>
	<header class="composer-header">
		<div>
			<h2>Make a thumbnail</h2>
			<p>Four directions. Pick one. Make it yours.</p>
		</div>
		<button class="close" aria-label="Close thumbnail composer" onclick={onClose}>×</button>
	</header>
	<div class="input-grid">
		<div class="context-panel">
			<label for="thumbnail-context">What are we making?</label>
			<textarea
				id="thumbnail-context"
				aria-label="Thumbnail context"
				rows="7"
				value={contextText}
				disabled={busy}
				oninput={(event) => onContext(event.currentTarget.value)}
				placeholder="Tell us about the episode, talk, or idea. Paste notes or a transcript. Name the people and companies that must appear."
			></textarea>
			<p class="helper">
				Links are not read here. Paste the useful context; adding a link or image does not start
				generation.
			</p>
		</div>
		<div class="attachments-panel">
			<div class="section-title">
				<strong>Images to work with</strong><span
					>{references.length} / {MAX_THUMBNAIL_REFERENCES}</span
				>
			</div>
			<p class="helper">
				Drop or paste images anywhere here. Mark required faces and logos as <strong>Keep</strong>;
				label exact names.
			</p>
			<input
				class="file-input"
				type="file"
				accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
				multiple
				bind:this={fileInput}
				onchange={(event) => void addFiles(Array.from(event.currentTarget.files ?? []))}
				aria-label="Attach thumbnail images"
			/>
			<div class="attachment-actions">
				<button disabled={busy || reading} onclick={() => fileInput.click()}
					>{reading ? 'Reading images…' : '+ Attach images'}</button
				>{#if onBrowseLibrary}<button disabled={busy || reading} onclick={onBrowseLibrary}
						>Use saved images</button
					>{/if}
			</div>
			{#if !references.length}<p class="empty-attachments">
					Start with a headshot, an official logo, or a thumbnail you like. Nothing is attached
					automatically.
				</p>{/if}
			<div class="reference-tray">
				{#each references as reference, index}
					<div class="reference-card">
						<img
							src={reference.dataURL}
							alt={reference.label || `Attached reference ${index + 1}`}
						/>
						<div class="reference-fields">
							<select
								aria-label={`Role for reference ${index + 1}`}
								value={reference.role ?? 'inspiration'}
								disabled={busy || reading}
								onchange={(event) =>
									updateReference(index, {
										role: event.currentTarget.value as 'inspiration' | 'keep'
									})}
								><option value="inspiration">Inspiration</option><option value="keep"
									>Keep in the thumbnail</option
								></select
							>
							<input
								aria-label={`Label for reference ${index + 1}`}
								placeholder="Exact person / company name"
								maxlength={MAX_THUMBNAIL_LABEL_LENGTH}
								value={reference.label ?? ''}
								disabled={busy || reading}
								oninput={(event) => updateReference(index, { label: event.currentTarget.value })}
							/>
						</div>
						<button
							class="remove"
							aria-label={`Remove reference ${index + 1}`}
							disabled={busy || reading}
							onclick={() => onReferences(references.filter((_, position) => position !== index))}
							>×</button
						>
					</div>
				{/each}
			</div>
		</div>
	</div>
	{#if attachmentError}<p class="error" role="alert">{attachmentError}</p>{/if}
	{#if parentGeneration}
		<section class="feedback-panel" aria-label="Revise selected thumbnail">
			<img class="selected-parent" src={parentGeneration.dataURL} alt="Selected parent thumbnail" />
			<div class="feedback-content">
				<div class="section-title">
					<strong>Build on {resultLabel(parentGeneration)}</strong><button
						disabled={busy}
						onclick={() => onSelectResult(null)}>Start fresh directions</button
					>
				</div>
				<label for="thumbnail-feedback">What should change?</label>
				<textarea
					id="thumbnail-feedback"
					bind:this={feedbackInput}
					aria-label="Thumbnail feedback"
					rows="3"
					value={feedbackText}
					disabled={busy}
					oninput={(event) => onFeedback(event.currentTarget.value)}
					placeholder="Less busy. Keep all five people and the logos. Make the headline easier to read."
				></textarea>
				<p class="helper">
					Creates four new variants from this image. Keeps its composition unless you ask to change
					it. Earlier versions stay below.
				</p>
				{#if onSaveStyle}<button
						class="quiet"
						disabled={busy}
						onclick={() => onSaveStyle?.(parentGeneration!)}>Save this style</button
					>{/if}
			</div>
		</section>
	{/if}
	{#if keep.length}<p class="keep-check">
			<strong>Keep-list:</strong>
			{keep
				.map((reference, index) => reference.label || `Unlabelled required image ${index + 1}`)
				.join(' · ')}<span
				>Review every face, logo and spelling in the results. Generative edits cannot guarantee
				exact preservation.</span
			>
		</p>{/if}
	<details class="advanced">
		<summary>Model & cost</summary>
		<div class="advanced-grid">
			<label
				>Image model<select
					aria-label="Thumbnail model"
					value={modelId}
					disabled={busy}
					onchange={(event) => onModel(event.currentTarget.value)}
					>{#each models as item}<option value={item.id}
							>{item.label}{item.kind === 'text-to-image' ? ' · text-to-image' : ''}</option
						>{/each}</select
				></label
			>
			{#if !isOwner}<label
					>Run spending limit (USD)<input
						aria-label="Thumbnail run spending limit"
						type="number"
						min="0.01"
						step="0.01"
						placeholder="Account limit"
						value={limitUsd ?? ''}
						disabled={busy}
						oninput={(event) =>
							onLimit(event.currentTarget.value === '' ? null : event.currentTarget.valueAsNumber)}
					/></label
				>{/if}
		</div>
		<p class="helper">
			16:9 composition · 1280×720 download. {model?.disclosure ??
				'Submitted prompts and reference images go to the selected generation provider.'} Four variants
			are four billed requests; an estimate is not a final provider bill.
		</p>
	</details>
	{#if error}<p class="error" role="alert">{error}</p>{/if}
	{#if !authenticated}<p class="access-note">
			<a href="/tools?next=/tools/draw">Sign in</a> to generate. You can prepare context and images first.
		</p>{:else if !configured}<p class="access-note">
			Image generation is unavailable on this server. Your draft is still here.
		</p>{:else if !canGenerate && !busy}<p class="access-note">
			Generation is not currently authorized for this account. Your draft is still here.
		</p>{/if}
	<div class="generate-row">
		<button class="primary" disabled={generationDisabled} onclick={onGenerate}
			>{busy
				? 'Making thumbnails…'
				: parentGeneration
					? 'Generate 4 more variants'
					: 'Generate 4 thumbnails'}</button
		>
		<div>
			<span
				>{estimatedUsd === null
					? 'Cost estimate unavailable'
					: `Run reservation ≈ ${formatDrawGenerationCost(estimatedUsd)}`}</span
			>
			<p class="helper">
				Generate sends the context and attached images{parentGeneration
					? ', including the selected parent,'
					: ''} to {model?.transportLabel ?? 'the provider'}.
			</p>
		</div>
		{#if busy && onCancel}<button onclick={onCancel}>Stop generation</button>{/if}
	</div>
	{#if validationError && hasDraftInput}<p class="validation">
			{validationError}
		</p>{/if}
	{#if run}
		<section class="run-progress" aria-label="Thumbnail generation progress">
			<div class="section-title">
				<strong>{completed} of {run.jobs.length} ready</strong
				>{#if failed && !busy && onRetry}<button onclick={onRetry}>Retry failed</button>{/if}
			</div>
			<progress
				value={completed}
				max={run.jobs.length || 4}
				aria-label="Completed thumbnail variants"
			></progress>
			<ul>
				{#each run.jobs.filter((job) => job.status !== 'completed') as job}<li
						class:failed={job.status === 'failed'}
					>
						<strong
							>{(job.recipe.context?.thumbnail as { label?: string } | undefined)?.label ??
								'Thumbnail'}</strong
						><span>{job.error || job.message}</span>
					</li>{/each}
			</ul>
		</section>
	{/if}
	{#if results.length}
		<section class="results" aria-label="Thumbnail results">
			<div class="section-title">
				<h3>Pick your next direction</h3>
				<span>{results.length} image{results.length === 1 ? '' : 's'}</span>
			</div>
			<p class="helper">
				Select an image, add feedback above, and generate four more. Downloads are images; use the
				canvas for final editing.
			</p>
			<div class="result-grid">
				{#each results as generation (generation.id)}<article
						class:selected={parentGeneration?.id === generation.id}
					>
						<button
							class="result-image"
							aria-label={`Use ${resultLabel(generation)} for feedback`}
							aria-pressed={parentGeneration?.id === generation.id}
							disabled={busy}
							onclick={() => void chooseResult(generation)}
							><img
								src={generation.dataURL}
								alt={`${resultLabel(generation)} generated thumbnail`}
							/></button
						>
						<div class="result-caption">
							<strong>{resultLabel(generation)}</strong><span>{generation.modelLabel}</span>
						</div>
						<div class="result-actions">
							<button
								class="select-result"
								disabled={busy}
								onclick={() => void chooseResult(generation)}
								>{parentGeneration?.id === generation.id
									? 'Selected for feedback'
									: 'Use for feedback'}</button
							><button onclick={() => onDownload(generation)}>Download</button>{#if onInsert}<button
									disabled={busy}
									onclick={() => onInsert?.(generation)}>Insert on canvas</button
								>{/if}
						</div>
						<details class="recipe">
							<summary>Prompt & inputs</summary>
							<p>
								{generation.referenceImages?.length ?? 0} images sent{generation.parentGenerationId
									? ' · Refined from a saved parent'
									: ''}
							</p>
							<pre>{generation.prompt}</pre>
						</details>
					</article>{/each}
			</div>
		</section>
	{/if}
</section>

<style>
	.thumbnail-composer {
		--ink: #19243b;
		--muted: #586579;
		--line: #d9e1ed;
		--blue: #245add;
		--tint: #edf3ff;
		color: var(--ink);
		font:
			14px/1.45 Arial,
			sans-serif;
		width: 100%;
		min-width: 0;
		padding: 20px;
		box-sizing: border-box;
	}
	.thumbnail-composer * {
		box-sizing: border-box;
	}
	.composer-header,
	.section-title,
	.generate-row,
	.result-caption {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.composer-header {
		position: sticky;
		top: -20px;
		z-index: 3;
		background: #fff;
		padding-block: 8px;
		margin-bottom: 22px;
		align-items: flex-start;
	}
	h2 {
		margin: 0;
		font:
			600 29px/1.15 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.7px;
	}
	h3 {
		margin: 0;
		font-size: 18px;
	}
	p {
		margin: 6px 0 0;
	}
	.composer-header p,
	.section-title > span,
	.result-caption > span {
		color: var(--muted);
	}
	button,
	input,
	textarea,
	select {
		font: inherit;
	}
	button {
		min-height: 44px;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 9px 12px;
		background: #fff;
		color: var(--ink);
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		border-color: var(--blue);
		background: var(--tint);
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	button:focus-visible,
	input:focus-visible,
	textarea:focus-visible,
	select:focus-visible,
	summary:focus-visible {
		outline: 3px solid #91b2ff;
		outline-offset: 2px;
	}
	.close,
	.remove {
		min-width: 44px;
		padding: 6px;
		font-size: 24px;
		line-height: 1;
	}
	.close {
		border-color: transparent;
	}
	.input-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: 20px;
	}
	label {
		display: block;
		font-weight: 600;
		margin-bottom: 6px;
	}
	input,
	textarea,
	select {
		display: block;
		width: 100%;
		min-width: 0;
		min-height: 44px;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: #fff;
		color: var(--ink);
		padding: 10px;
		font-size: 16px;
	}
	textarea {
		resize: vertical;
		line-height: 1.5;
	}
	.helper {
		color: var(--muted);
		font-size: 12px;
		line-height: 1.5;
	}
	.attachment-actions,
	.result-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 12px;
	}
	.file-input {
		display: none;
	}
	.empty-attachments {
		padding: 18px 12px;
		border: 1px dashed #a9b9cf;
		border-radius: 8px;
		color: var(--muted);
		margin-top: 12px;
	}
	.reference-tray {
		display: grid;
		gap: 10px;
		margin-top: 12px;
	}
	.reference-card {
		display: grid;
		grid-template-columns: 70px minmax(0, 1fr) 44px;
		align-items: center;
		gap: 8px;
		padding: 8px;
		background: #f6f8fc;
		border: 1px solid var(--line);
		border-radius: 9px;
	}
	.reference-card img {
		display: block;
		width: 70px;
		height: 80px;
		object-fit: contain;
		background: #e7ecf3;
		border-radius: 5px;
	}
	.reference-fields {
		display: grid;
		gap: 6px;
	}
	.reference-fields select,
	.reference-fields input {
		padding: 8px;
	}
	.feedback-panel {
		display: grid;
		grid-template-columns: minmax(120px, 0.4fr) minmax(0, 1fr);
		gap: 16px;
		padding: 16px;
		margin-top: 20px;
		background: var(--tint);
		border: 1px solid #b9cdf7;
		border-radius: 10px;
	}
	.selected-parent {
		width: 100%;
		aspect-ratio: 16/9;
		object-fit: contain;
		background: #e1e8f4;
		border-radius: 6px;
	}
	.feedback-content label {
		margin-top: 12px;
	}
	.quiet {
		margin-top: 8px;
	}
	.keep-check {
		margin: 14px 0;
		padding: 12px;
		background: #f5f7fb;
		border-left: 3px solid var(--blue);
		overflow-wrap: anywhere;
	}
	.keep-check span {
		display: block;
		font-size: 12px;
		color: var(--muted);
		margin-top: 5px;
	}
	.advanced {
		margin: 18px 0;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
		padding: 6px 0;
	}
	summary {
		cursor: pointer;
		padding: 12px 0;
		min-height: 44px;
	}
	.advanced-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		padding: 8px 0;
	}
	.advanced > .helper {
		padding-bottom: 12px;
	}
	.generate-row {
		position: sticky;
		bottom: -20px;
		z-index: 2;
		background: #fff;
		padding-block: 12px;
		border-top: 1px solid var(--line);
		justify-content: flex-start;
		flex-wrap: wrap;
		margin-top: 16px;
	}
	.generate-row > div {
		flex: 1;
		min-width: 180px;
		font-size: 13px;
	}
	.primary {
		background: var(--blue);
		color: white;
		border-color: var(--blue);
		font-weight: 700;
		padding-inline: 22px;
	}
	.primary:hover:not(:disabled) {
		background: #1647be;
		color: white;
	}
	.error,
	.validation,
	.access-note {
		margin: 12px 0;
		padding: 10px 12px;
		border-radius: 7px;
		background: #fff3ec;
		color: #82380e;
		overflow-wrap: anywhere;
	}
	.access-note a {
		color: inherit;
		font-weight: 700;
	}
	.run-progress {
		margin: 22px 0;
		padding: 14px;
		border: 1px solid var(--line);
		border-radius: 9px;
	}
	progress {
		display: block;
		width: 100%;
		height: 7px;
		margin: 12px 0;
		accent-color: var(--blue);
	}
	.run-progress ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.run-progress li {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 5px 12px;
		padding: 6px 0;
		font-size: 12px;
	}
	.run-progress li span {
		color: var(--muted);
		overflow-wrap: anywhere;
	}
	.run-progress li.failed span {
		color: #9d3814;
	}
	.results {
		border-top: 1px solid var(--line);
		margin-top: 24px;
		padding-top: 20px;
	}
	.result-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		margin-top: 16px;
	}
	.result-grid article {
		min-width: 0;
		border: 1px solid var(--line);
		border-radius: 10px;
		overflow: hidden;
	}
	.result-grid article.selected {
		border: 2px solid var(--blue);
		box-shadow: 0 0 0 3px var(--tint);
	}
	.result-image {
		display: block;
		padding: 0;
		border: 0;
		border-radius: 0;
		width: 100%;
		background: #eef1f6;
	}
	.result-image img {
		display: block;
		width: 100%;
		aspect-ratio: 16/9;
		object-fit: contain;
	}
	.result-caption {
		padding: 12px 12px 0;
		align-items: baseline;
		flex-wrap: wrap;
	}
	.result-caption span {
		font-size: 12px;
	}
	.result-actions {
		padding: 0 12px 12px;
	}
	.select-result {
		color: var(--blue);
	}
	.recipe {
		padding: 0 12px;
		font-size: 12px;
		border-top: 1px solid var(--line);
	}
	.recipe pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font:
			11px/1.55 ui-monospace,
			monospace;
	}
	@media (max-width: 700px) {
		.thumbnail-composer {
			padding: 14px;
		}
		.input-grid,
		.advanced-grid,
		.feedback-panel {
			grid-template-columns: 1fr;
		}
		.composer-header {
			top: -12px;
			margin-bottom: 18px;
		}
		.selected-parent {
			max-width: 260px;
		}
		.feedback-content .section-title {
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.result-grid {
			grid-template-columns: 1fr;
		}
		.generate-row {
			bottom: -12px;
		}
		#thumbnail-context {
			height: 150px;
		}
		.generate-row .primary {
			width: 100%;
		}
	}
</style>
