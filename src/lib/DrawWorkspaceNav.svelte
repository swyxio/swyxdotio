<script lang="ts">
	import { tick } from 'svelte';
	import { DRAW_STARTING_MODES, type DrawingStartingMode } from '$lib/draw-starting-modes.js';
	type Action = { id: string; label: string; ariaLabel: string; active?: boolean; busy?: boolean };
	let {
		mode,
		actions,
		onMode,
		onAction,
		onStartingPoints,
		menuOpen = $bindable(false),
		libraryOpen = false
	}: {
		mode: DrawingStartingMode;
		actions: Action[];
		onMode: (id: string) => void;
		onAction: (id: string) => void;
		onStartingPoints: () => void;
		menuOpen?: boolean;
		libraryOpen?: boolean;
	} = $props();
	let container: HTMLDivElement;
	let trigger: HTMLButtonElement;
	let modeSelect = $state<HTMLSelectElement>();
	const working = $derived(actions.some((action) => action.busy));
	function close(restoreFocus = false) {
		menuOpen = false;
		if (restoreFocus) trigger?.focus();
	}
	async function toggle() {
		menuOpen = !menuOpen;
		if (menuOpen) {
			await tick();
			modeSelect?.focus();
		}
	}
	function run(id: string) {
		close();
		onAction(id);
	}
	function outside(event: PointerEvent) {
		if (menuOpen && event.target instanceof Node && !container?.contains(event.target)) close();
	}
	function keydown(event: KeyboardEvent) {
		if (menuOpen && event.key === 'Escape') {
			event.preventDefault();
			event.stopImmediatePropagation();
			close(true);
		}
	}
</script>

<svelte:window onpointerdown={outside} onkeydowncapture={keydown} />

<div class="workspace-navigation" class:library-open={libraryOpen} bind:this={container}>
	<div class="workspace-bar" role="group" aria-label="Drawing workspace tools">
		<button
			type="button"
			class="workspace-toggle"
			aria-label="Choose drawing mode and tools"
			aria-expanded={menuOpen}
			aria-controls="drawing-workspace-menu"
			onclick={toggle}
			bind:this={trigger}
		>
			<span>{mode.label}</span><span class="mobile-tools"> · Tools</span>
			{#if working}<span class="working-dot" aria-label="Work in progress"></span>{/if}
			<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
		</button>
		<div class="desktop-actions">
			{#each actions as action (action.id)}
				<button
					type="button"
					aria-label={action.ariaLabel}
					aria-pressed={action.active ?? false}
					class:busy={action.busy}
					onclick={() => run(action.id)}>{action.busy ? `${action.label}…` : action.label}</button
				>
			{/each}
		</div>
	</div>
	{#if menuOpen}
		<section class="workspace-menu" id="drawing-workspace-menu" aria-label="Drawing mode and tools">
			<label for="drawing-starting-mode">Starting experience</label>
			<select
				id="drawing-starting-mode"
				aria-label="Starting experience"
				value={mode.id}
				onchange={(event) => onMode(event.currentTarget.value)}
				bind:this={modeSelect}
			>
				{#each DRAW_STARTING_MODES as choice (choice.id)}<option value={choice.id}
						>{choice.label} — {choice.description}</option
					>{/each}
			</select>
			<p>Changes your starting points, not your drawing. Every tool is available in every mode.</p>
			<div class="mobile-actions">
				{#each actions as action (action.id)}
					<button
						type="button"
						aria-label={action.ariaLabel}
						aria-pressed={action.active ?? false}
						class:busy={action.busy}
						onclick={() => run(action.id)}
						>{action.busy ? `${action.label} working…` : action.label}</button
					>
				{/each}
			</div>
			<button
				type="button"
				class="starting-points"
				onclick={() => {
					close();
					onStartingPoints();
				}}>Browse starting points</button
			>
		</section>
	{/if}
</div>

<style>
	.workspace-navigation {
		position: fixed;
		z-index: 1002;
		top: 72px;
		left: 66px;
		color: #403c4c;
		font-family: system-ui, sans-serif;
	}
	.workspace-bar {
		display: flex;
		align-items: center;
		padding: 3px;
		border: 1px solid #e8e6ee;
		border-radius: 10px;
		background: white;
		box-shadow: 0 3px 12px #2521370a;
	}
	.workspace-bar button {
		height: 36px;
		padding: 0 10px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		font-size: 12px;
		cursor: pointer;
	}
	.workspace-bar button:hover,
	.workspace-bar button[aria-pressed='true'] {
		background: #f0edfa;
		color: #5b4cb1;
	}
	.workspace-toggle {
		display: flex;
		align-items: center;
		gap: 4px;
		font-weight: 650;
	}
	.workspace-toggle svg {
		width: 14px;
		height: 14px;
		margin-left: 4px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.4;
	}
	.desktop-actions {
		display: flex;
		border-left: 1px solid #eeedf2;
		padding-left: 3px;
		margin-left: 3px;
	}
	.mobile-actions,
	.mobile-tools {
		display: none;
	}
	.working-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #6b59bd;
	}
	.workspace-menu {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		width: 320px;
		max-height: calc(100dvh - 165px);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 16px;
		border: 1px solid #e8e6ee;
		border-radius: 12px;
		background: white;
		box-shadow: 0 12px 40px #2521371c;
	}
	.workspace-menu label {
		display: block;
		margin-bottom: 9px;
		font-size: 12px;
		font-weight: 650;
	}
	.workspace-menu select {
		width: 100%;
		min-height: 44px;
		padding: 6px 9px;
		border: 1px solid #ddd9e8;
		border-radius: 8px;
		background: white;
		color: inherit;
		font-size: 12px;
	}
	.workspace-menu p {
		margin: 10px 0 14px;
		font-size: 11px;
		color: #817a8c;
		line-height: 1.55;
	}
	.workspace-menu button {
		min-height: 44px;
		padding: 8px 10px;
		border: 1px solid #e5e1ee;
		border-radius: 8px;
		background: #faf9fc;
		color: #5b4cb1;
		font-size: 12px;
		text-align: left;
		cursor: pointer;
	}
	.starting-points {
		width: 100%;
	}
	.busy::before {
		content: '';
		display: inline-block;
		width: 5px;
		height: 5px;
		margin-right: 5px;
		border-radius: 50%;
		background: currentColor;
	}
	button:focus-visible,
	select:focus-visible {
		outline: 2px solid #8c7ddd;
		outline-offset: 2px;
	}
	@media (max-width: 960px) {
		.library-open {
			display: none;
		}
		.workspace-navigation {
			top: 70px;
			left: auto;
			right: 59px;
		}
		.workspace-bar {
			padding: 0;
		}
		.workspace-bar button {
			height: 44px;
			padding: 0 10px;
		}
		.desktop-actions {
			display: none;
		}
		.mobile-tools {
			display: inline;
			font-size: 11px;
			font-weight: 400;
		}
		.mobile-actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 7px;
			margin: 10px 0;
		}
		.workspace-menu {
			position: fixed;
			top: 122px;
			right: 10px;
			left: 10px;
			width: auto;
			max-height: calc(100dvh - 190px);
		}
	}
</style>
