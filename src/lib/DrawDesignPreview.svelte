<script lang="ts">
	import { createDrawingDesign, DRAW_DESIGN_DEMO_PHOTO } from './draw-designs.js';
	let {
		templateId,
		photoUrl = DRAW_DESIGN_DEMO_PHOTO.url
	}: { templateId: string; photoUrl?: string } = $props();
	const design = $derived(createDrawingDesign(templateId, { logoFileId: 'preview-logo' }));
	const markerId = $props.id();
</script>

<!-- Render the native design definition, including the same public demo photo. -->
<svg
	viewBox={`0 0 ${design.format.width} ${design.format.height}`}
	role="img"
	aria-label={`${design.template.label} editable layout preview`}
>
	<defs
		><marker
			id={markerId}
			viewBox="0 0 10 10"
			refX="9"
			refY="5"
			markerWidth="3"
			markerHeight="3"
			orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ff293b" /></marker
		></defs
	>
	{#each design.elements as element}
		{#if element.type === 'rectangle'}
			<rect
				x={element.x}
				y={element.y}
				width={element.width}
				height={element.height}
				fill={element.backgroundColor}
				stroke={element.strokeColor}
				stroke-width={element.strokeWidth}
			/>
		{:else if element.type === 'text'}
			<text
				x={element.x}
				y={element.y + element.fontSize * 0.9}
				fill={element.strokeColor}
				font-size={element.fontSize}
				font-family={element.fontFamily === 7
					? 'Lilita One'
					: element.fontFamily === 3
						? 'Cascadia, monospace'
						: 'Helvetica, Arial, sans-serif'}
			>
				{#each element.text.split('\n') as line, index}<tspan
						x={element.x}
						dy={index ? element.fontSize * element.lineHeight : 0}>{line}</tspan
					>{/each}
			</text>
		{:else if element.type === 'image'}
			<image
				href={element.fileId === 'preview-logo'
					? '/assets/latent-space-hex-gradient.png'
					: photoUrl}
				x={element.x}
				y={element.y}
				width={element.width}
				height={element.height}
				preserveAspectRatio="xMidYMid slice"
			/>
		{:else if element.type === 'line' || element.type === 'arrow'}
			<polyline
				points={element.points
					.map(([x, y]: number[]) => `${element.x + x},${element.y + y}`)
					.join(' ')}
				fill="none"
				stroke={element.strokeColor}
				stroke-width={element.strokeWidth}
				stroke-linecap="round"
				stroke-linejoin="round"
				marker-end={element.type === 'arrow' ? `url(#${markerId})` : undefined}
			/>
		{/if}
	{/each}
</svg>

<style>
	svg {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 5px;
	}
</style>
