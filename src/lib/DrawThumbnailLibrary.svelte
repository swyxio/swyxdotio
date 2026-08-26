<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		CreativeClient,
		emptyCreativeLibrary,
		newKitDraft,
		creativeThumbnailReference
	} from './draw-creative-client';
	import { saveDrawingGenerationLibraryEntry } from './draw-generation-library.js';
	import { referenceCatalog } from './draw-creative-examples.js';
	import type {
		DrawingGenerationReference,
		DrawingImageGeneration
	} from './draw-generation-history.js';
	let {
		userId,
		pageKey,
		busy = false,
		saveResult = null,
		onReference,
		onStyle,
		onClose
	} = $props<{
		userId?: string;
		pageKey: string;
		busy?: boolean;
		saveResult?: DrawingImageGeneration | null;
		onReference: (reference: DrawingGenerationReference) => void;
		onStyle: (text: string, refs: DrawingGenerationReference[]) => void;
		onClose: () => void;
	}>();
	let library = $state(emptyCreativeLibrary()),
		error = $state(''),
		status = $state(''),
		loading = $state(false);
	let channelId = $state(referenceCatalog.channels[0].id),
		collection = $state('top');
	let styleName = $state(''),
		stylePrompt = $state(
			'Keep the selected reference’s visual hierarchy and composition. Use the new episode context for all wording, people and claims.'
		);
	const lifetime = new AbortController();
	onDestroy(() => lifetime.abort());
	const channel = $derived(referenceCatalog.channels.find((item) => item.id === channelId));
	const examples = $derived(
		(collection === 'top' ? channel?.topIds : channel?.latestIds)
			?.map((id) => referenceCatalog.examples.find((item) => item.id === id))
			.filter(Boolean) ?? []
	);
	$effect(() => {
		const owner = userId,
			key = pageKey;
		let cancelled = false;
		if (owner)
			new CreativeClient(owner, lifetime.signal)
				.library()
				.then((value) => {
					if (!cancelled && owner === userId && key === pageKey) library = value;
				})
				.catch(() => {
					if (!cancelled)
						error = 'Private library could not be loaded. You can still attach files directly.';
				});
		return () => {
			cancelled = true;
		};
	});
	async function dataURL(blob: Blob) {
		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(new Error('Image could not be read.'));
			reader.readAsDataURL(blob);
		});
	}
	async function perform(work: (client: CreativeClient) => Promise<void>) {
		if (loading || busy) return;
		error = '';
		status = '';
		loading = true;
		try {
			if (!userId) throw new Error('Sign in to reuse private assets or attach a public reference.');
			await work(new CreativeClient(userId, lifetime.signal));
		} catch (cause) {
			if (!lifetime.signal.aborted)
				error = cause instanceof Error ? cause.message : 'Could not use this item.';
		} finally {
			loading = false;
		}
	}
	async function loadAsset(
		client: CreativeClient,
		id: string,
		role: DrawingGenerationReference['role'] = 'inspiration'
	): Promise<DrawingGenerationReference> {
		const asset = library.assets.find((item) => item.id === id),
			blob = await client.asset(id);
		if (!blob.type.startsWith('image/')) throw new Error('Choose an image, not a font.');
		return {
			dataURL: await dataURL(blob),
			mimeType: blob.type,
			assetId: id,
			role,
			label: asset?.name ?? 'Saved reference'
		};
	}
	async function attachAsset(id: string) {
		await perform(async (client) => {
			const asset = library.assets.find((item) => item.id === id);
			const ref = await loadAsset(
				client,
				id,
				['logo', 'portrait'].includes(asset?.role ?? '') ? 'keep' : 'inspiration'
			);
			if (lifetime.signal.aborted) return;
			onReference(ref);
			status = 'Attached to this draft. Nothing sent to a model.';
		});
	}
	async function attachExample(videoId: string, title: string) {
		await perform(async (client) => {
			const blob = await creativeThumbnailReference(client.userId, videoId, lifetime.signal);
			const image = await dataURL(blob);
			if (lifetime.signal.aborted) return;
			onReference({
				dataURL: image,
				mimeType: blob.type,
				role: 'inspiration',
				label: title.slice(0, 160)
			});
			status = 'Public image attached to this draft; not saved or generated.';
		});
	}
	async function useKit(record: any) {
		await perform(async (client) => {
			const snapshot = await client.request(
				`/records/kits/${record.id}/revisions/${record.activeRevision}`
			);
			const kit = snapshot.data;
			const ids = [...new Set<string>([...(kit.referenceIds ?? []), ...(kit.assetIds ?? [])])];
			const refs = [];
			for (const id of ids)
				refs.push(await loadAsset(client, id, kit.assetIds?.includes(id) ? 'keep' : 'inspiration'));
			if (lifetime.signal.aborted) return;
			onStyle(kit.prompt ?? '', refs);
			status = 'Active saved style attached. Review before generating.';
		});
	}
	async function saveStyle() {
		await perform(async (client) => {
			if (!saveResult || !styleName.trim() || !stylePrompt.trim())
				throw new Error('Name the style and describe what should carry over.');
			const saved = await saveDrawingGenerationLibraryEntry(
				client.userId,
				{
					kind: 'generation',
					name: styleName,
					generation: $state.snapshot(saveResult)
				},
				(url, options) => fetch(url, { ...options, signal: lifetime.signal })
			);
			const outputId = saved.generation?.assetId;
			if (!outputId) throw new Error('Saved recipe has no reference image.');
			const keepIds = (saved.generation?.referenceImages ?? [])
				.filter((ref: any) => ref.role === 'keep')
				.map((ref: any) => ref.assetId);
			await client.save('kits', {
				...newKitDraft(),
				name: styleName.trim(),
				prompt: stylePrompt.trim(),
				referenceIds: [outputId],
				assetIds: keepIds
			});
			if (lifetime.signal.aborted) return;
			library = await client.library();
			status = 'Reusable style saved privately. Existing house styles were not changed.';
		});
	}
</script>

<section class="thumbnail-library" aria-label="Thumbnail references and saved styles">
	<header>
		<h3>{saveResult ? 'Save a reusable style' : 'Add references'}</h3>
		<button onclick={onClose}>Done</button>
	</header>
	{#if error}<p role="alert">{error}</p>{/if}{#if status}<p role="status">{status}</p>{/if}
	{#if saveResult}
		<p>
			Save uploads this result and its references to your private library. Describe the reusable
			style—not the episode’s facts.
		</p>
		<label
			>Style name<input
				aria-label="Thumbnail style name"
				maxlength="120"
				bind:value={styleName}
			/></label
		>
		<label
			>What should carry over?<textarea
				aria-label="Reusable thumbnail style"
				maxlength="4000"
				rows="3"
				bind:value={stylePrompt}
			></textarea></label
		>
		<button disabled={busy || loading || !userId} onclick={() => void saveStyle()}
			>{loading ? 'Saving…' : 'Save style privately'}</button
		>
	{:else}
		<details open>
			<summary>Your assets & styles</summary>
			{#if !userId}<p>
					Sign in to use saved assets. Dropping files into the composer does not require a library.
				</p>{/if}
			<div class="private-list">
				{#each library.assets.filter( (asset) => asset.mimeType.startsWith('image/') ) as asset}<button
						disabled={busy || loading}
						onclick={() => void attachAsset(asset.id)}>{asset.name} · Attach</button
					>{/each}
				{#each library.records.kits ?? [] as kit}<button
						disabled={busy || loading}
						onclick={() => void useKit(kit)}>{kit.data.name} · Use style</button
					>{/each}
			</div>
			{#if userId && !library.assets.length && !library.records.kits?.length}<p>
					No saved items yet. Start by attaching files; save a style after you like a result.
				</p>{/if}
		</details>
		<details>
			<summary>Browse public references</summary>
			<p>
				Dated references, not quality rankings. Recent AI Engineer and Latent Space uploads are
				context only.
			</p>
			<div class="filters">
				<label
					>Channel<select bind:value={channelId}
						>{#each referenceCatalog.channels as item}<option value={item.id}>{item.name}</option
							>{/each}</select
					></label
				><label
					>Collection<select bind:value={collection}
						><option value="top">Most viewed 5</option><option value="latest">Latest 5</option
						></select
					></label
				>
			</div>
			<div class="public-grid">
				{#each examples as example}{#if example}<article>
							<img
								src={example.thumbnailUrl}
								alt={example.title}
								loading="lazy"
								referrerpolicy="no-referrer"
							/>
							<p>{example.title}</p>
							<button
								disabled={busy || loading || !userId}
								onclick={() => void attachExample(example.videoId, example.title)}
								>Attach inspiration image</button
							>
						</article>{/if}{/each}
			</div>
			<p>
				Attachment retrieves image bytes, not a private save or model submission. Snapshot {referenceCatalog.retrievedAt.slice(
					0,
					10
				)}.
			</p>
		</details>
	{/if}
</section>

<style>
	.thumbnail-library {
		margin-top: 20px;
		border-top: 1px solid #d8ddea;
		padding-top: 16px;
		font:
			14px/1.5 Arial,
			sans-serif;
		color: #202339;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	h3 {
		margin: 0;
		font:
			600 18px/1.4 Arial,
			sans-serif;
	}
	p {
		max-width: 75ch;
	}
	label {
		display: grid;
		gap: 6px;
		margin: 10px 0;
	}
	input,
	textarea,
	select {
		font:
			16px/1.4 Arial,
			sans-serif;
		width: 100%;
		box-sizing: border-box;
		padding: 10px;
		border: 1px solid #cdd4e2;
		border-radius: 7px;
	}
	button {
		min-height: 44px;
		padding: 9px 12px;
		border: 1px solid #cdd4e2;
		border-radius: 7px;
		background: white;
		color: #24223a;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	summary {
		cursor: pointer;
		padding: 12px 0;
		font-weight: 600;
	}
	button:focus-visible,
	input:focus-visible,
	textarea:focus-visible,
	select:focus-visible {
		outline: 2px solid #7657cf;
		outline-offset: 2px;
	}
	.private-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.filters {
		display: flex;
		gap: 12px;
	}
	.filters label {
		flex: 1;
		min-width: 0;
	}
	.public-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
	}
	.public-grid img {
		width: 100%;
		aspect-ratio: 16/9;
		object-fit: cover;
	}
	.public-grid article {
		border: 1px solid #e0e3ec;
		border-radius: 7px;
		overflow: hidden;
		padding: 8px;
	}
	.public-grid p {
		font-size: 12px;
	}
	[role='alert'] {
		color: #a02d32;
	}
	[role='status'] {
		color: #355b47;
	}
	@media (max-width: 650px) {
		.public-grid {
			grid-template-columns: 1fr;
		}
		.filters {
			display: block;
		}
	}
</style>
