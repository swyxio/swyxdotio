<script lang="ts">
	import { DRAW_STARTING_MODES, type DrawingStartingMode } from '$lib/draw-starting-modes.js';
	let {
		mode,
		onMode,
		onCommand,
		onDismiss
	}: {
		mode: DrawingStartingMode;
		onMode: (id: string) => void;
		onCommand: (id: string) => void;
		onDismiss: () => void;
	} = $props();
</script>

<section class="drawing-start" aria-label="Drawing starting points" data-mode={mode.id}>
	<div class="starting-modes" role="group" aria-label="Choose a starting experience">
		{#each DRAW_STARTING_MODES as choice (choice.id)}
			<button type="button" aria-pressed={choice.id === mode.id} onclick={() => onMode(choice.id)}
				>{choice.label}</button
			>
		{/each}
	</div>
	<h1>{mode.heading}</h1>
	<p class="intro">{mode.detail}</p>
	<div class="starter-grid">
		{#each mode.starters as starter (starter.command)}
			<button type="button" class="starter" onclick={() => onCommand(starter.command)}>
				<svg viewBox="0 0 64 42" fill="none" aria-hidden="true">
					{#if starter.symbol === 'comparison'}
						<rect x="4" y="4" width="24" height="34" rx="4" fill="#eff5fa" />
						<rect x="36" y="4" width="24" height="34" rx="4" fill="#eef4ef" />
						<path d="M10 13h12m-12 8h12m-12 8h8m24-16h12m-12 8h12m-12 8h8" />
					{:else if starter.symbol === 'loop'}
						<path d="M17 11h27l5 5m-2 13H20l-5-5M44 11l1 7 7-2M20 29l-1-7-7 2" />
						<rect x="3" y="9" width="16" height="22" rx="4" fill="#eef4ef" />
						<rect x="45" y="17" width="16" height="18" rx="4" fill="#eff5fa" />
					{:else if starter.symbol === 'argument'}
						<path d="m11 30 21-19 21 19M32 11v20" />
						<rect x="22" y="3" width="20" height="12" rx="3" fill="#eff5fa" />
						<rect x="3" y="29" width="16" height="10" rx="2" fill="#eef4ef" />
						<rect x="24" y="29" width="16" height="10" rx="2" fill="white" />
						<rect x="45" y="29" width="16" height="10" rx="2" fill="#fff2e8" />
					{:else if starter.symbol === 'thumbnail'}
						<rect x="3" y="4" width="58" height="34" rx="4" fill="#f3f0ff" />
						<path d="M9 14h22M9 21h17M9 28h12" />
						<circle cx="46" cy="15" r="5" fill="white" />
						<path d="M36 33c0-15 20-15 20 0" />
					{:else if starter.symbol === 'generate'}
						<rect x="3" y="8" width="24" height="29" rx="3" fill="#f3f0ff" />
						<rect x="37" y="8" width="24" height="29" rx="3" fill="#eff5fa" />
						<path d="m12 28 5-7 6 9m23-5 10-10-2 10-7 8M32 2v8m-4-4h8" />
					{:else}
						<path d="M9 12V5h44v29h-8" />
						<rect x="3" y="12" width="44" height="26" rx="3" fill="#eff5fa" />
						<circle cx="13" cy="21" r="3" />
						<path d="m6 34 10-7 7 6 9-12 12 13" />
					{/if}
				</svg>
				<span><strong>{starter.label}</strong><small>{starter.description}</small></span>
			</button>
		{/each}
	</div>
	<div class="start-actions">
		<button type="button" class="secondary-start" onclick={() => onCommand(mode.secondary.command)}
			>{mode.secondary.label} <span aria-hidden="true">→</span></button
		>
		<button type="button" class="blank-start" onclick={onDismiss}>Just draw</button>
	</div>
	<p class="shared-note">Same canvas. All tools in every mode. Nothing runs until you ask.</p>
</section>

<style>
	.drawing-start {
		position: fixed;
		z-index: 3;
		top: clamp(140px, 23vh, 220px);
		left: 50%;
		width: min(704px, calc(100vw - 48px));
		max-height: calc(100dvh - 240px);
		overflow-y: auto;
		overscroll-behavior: contain;
		transform: translateX(-50%);
		padding: 24px;
		border: 1px solid #eeedf3;
		border-radius: 18px;
		background: #fffffff5;
		color: #292833;
		font-family: system-ui, sans-serif;
		box-shadow: 0 12px 42px #2423350a;
	}
	.starting-modes {
		display: inline-flex;
		gap: 4px;
		padding: 3px;
		background: #f3f2f7;
		border-radius: 9px;
	}
	.starting-modes button {
		min-height: 36px;
		padding: 0 12px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: #666273;
		font-size: 12px;
		cursor: pointer;
	}
	.starting-modes button[aria-pressed='true'] {
		background: white;
		color: #4f46a4;
		box-shadow: 0 1px 4px #24233512;
	}
	h1 {
		margin: 22px 0 8px;
		font-size: clamp(23px, 2.4vw, 29px);
		line-height: 1.25;
		letter-spacing: -0.6px;
		font-weight: 650;
	}
	.intro {
		margin: 0 0 20px;
		color: #74707e;
		font-size: 13px;
		line-height: 1.55;
	}
	.starter-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	.starter {
		min-width: 0;
		display: grid;
		align-content: start;
		gap: 15px;
		padding: 16px 13px;
		border: 1px solid #e5e3ed;
		border-radius: 11px;
		background: white;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.starter:hover {
		border-color: #aaa1da;
		background: #faf9ff;
	}
	.starter svg {
		width: 64px;
		height: 42px;
		stroke: #626277;
		stroke-width: 1.3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.starter span {
		display: grid;
		gap: 6px;
	}
	.starter strong {
		font-size: 12px;
		font-weight: 650;
	}
	.starter small {
		font-size: 11px;
		line-height: 1.5;
		color: #74707e;
	}
	.start-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-top: 17px;
	}
	.start-actions button {
		min-height: 40px;
		padding: 6px 9px;
		border: 0;
		border-radius: 7px;
		background: transparent;
		font-size: 12px;
		cursor: pointer;
	}
	.secondary-start {
		color: #5b4bb0;
		text-align: left;
	}
	.blank-start {
		flex: none;
		color: #5f5a6b;
	}
	.start-actions button:hover {
		background: #f3f1fa;
	}
	.shared-note {
		margin: 12px 0 0;
		color: #8a8593;
		font-size: 10px;
		line-height: 1.5;
	}
	button:focus-visible {
		outline: 2px solid #8c7ddd;
		outline-offset: 3px;
	}
	@media (max-width: 600px) {
		.drawing-start {
			top: 202px;
			width: calc(100vw - 24px);
			max-height: calc(100dvh - 276px);
			padding: 17px;
			border-radius: 13px;
		}
		.starting-modes {
			display: flex;
		}
		.starting-modes button {
			flex: 1;
			min-height: 44px;
			padding: 0 6px;
			font-size: 11px;
		}
		h1 {
			margin-top: 18px;
			font-size: 23px;
		}
		.intro {
			margin-bottom: 14px;
			font-size: 12px;
		}
		.starter-grid {
			grid-template-columns: 1fr;
			gap: 7px;
		}
		.starter {
			display: flex;
			align-items: center;
			gap: 13px;
			padding: 11px;
		}
		.starter svg {
			flex: none;
			width: 50px;
			height: 34px;
		}
		.starter span {
			gap: 3px;
		}
		.start-actions {
			margin-top: 10px;
		}
		.start-actions button {
			min-height: 44px;
			font-size: 11px;
		}
	}
</style>
