<script lang="ts">
	import { buildCreativeArtboard } from './draw-creative-layout.js';
	import { CREATIVE_API } from './draw-creative-client';
	let { recipe, safeZone = false } = $props<{ recipe: any; safeZone?: boolean }>();
	const preview = $derived.by(() => {
		try {
			if (!recipe) return null;
			const officialMark = ['ls', 'fde'].includes(recipe.kit?.brand);
			const logos = (recipe.logos ?? []).map((asset: any, index: number) => ({
				...asset,
				role: officialMark || index > 0 ? 'company' : 'brand',
				fileId: asset.assetId
			}));
			if (['ls', 'fde'].includes(recipe.kit?.brand))
				logos.unshift({
					id: 'official-ls',
					name: 'Latent Space',
					fileId: 'official-ls',
					width: 144,
					height: 144,
					role: 'brand'
				});
			return buildCreativeArtboard({
				...recipe,
				people: (recipe.people ?? []).map((asset: any) => ({ ...asset, fileId: asset.assetId })),
				logos
			});
		} catch {
			return null;
		}
	});
</script>

{#if preview}
	<svg
		viewBox={`0 0 ${preview.format.width} ${preview.format.height}`}
		role="img"
		aria-label={`Editable ${recipe.direction} composition preview: ${recipe.headline}`}
	>
		{#each preview.elements as element}
			{#if element.type === 'rectangle'}<rect
					x={element.x}
					y={element.y}
					width={element.width}
					height={element.height}
					fill={element.backgroundColor}
				/>
			{:else if element.type === 'image'}<image
					href={element.fileId === 'official-ls'
						? '/assets/latent-space-hex-gradient.png'
						: `${CREATIVE_API}/assets/${element.fileId}`}
					x={element.x}
					y={element.y}
					width={element.width}
					height={element.height}
					preserveAspectRatio="xMidYMid meet"
				/>
			{:else if element.type === 'text'}<text
					x={element.x}
					y={element.y + element.fontSize * 0.86}
					fill={element.strokeColor}
					font-size={element.fontSize}
					font-family={element.fontFamily === 3 ? 'monospace' : 'Arial, sans-serif'}
					>{#each element.text.split('\n') as line, i}<tspan
							x={element.x}
							dy={i ? element.fontSize * (element.lineHeight ?? 1.2) : 0}>{line}</tspan
						>{/each}</text
				>{/if}
		{/each}
		{#if safeZone}<rect
				x={(preview.format.width * 1050) / 1280}
				y={(preview.format.height * 620) / 720}
				width={(preview.format.width * 230) / 1280}
				height={(preview.format.height * 100) / 720}
				fill="#fb9a52"
				opacity=".42"
				stroke="#ffba6c"
				stroke-width="3"
			/>{/if}
	</svg>
{:else}<div class="unavailable">
		Preview unavailable. The saved recipe has not been changed.
	</div>{/if}

<style>
	svg {
		display: block;
		width: 100%;
		height: auto;
		background: #e7e2ed;
		border-radius: 4px;
	}
	.unavailable {
		padding: 20px;
		background: #eee8f5;
		color: #62516f;
		font-size: 12px;
	}
</style>
