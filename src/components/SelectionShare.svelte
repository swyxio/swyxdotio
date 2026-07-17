<script>
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { buildSharePayload, canonicalShareUrl, getEligibleSelection } from '$lib/share-quote';

	let quote = '';
	let anchor = { x: 0, y: 0 };
	let shareOrigin = { x: 0, y: 0 };
	let bubbleVisible = false;
	let menuVisible = false;
	let manualVisible = false;
	let notice = '';
	let coarsePointer = false;
	let reducedMotion = false;
	let nativeShareAvailable = false;
	let celebrated = false;
	/** @type {Array<{ id: number; static?: boolean; dx?: number; dy?: number; color?: string; delay?: number }>} */
	let particles = [];
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let noticeTimer;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let particleTimer;
	let currentUrl = '';

	$: payload = buildSharePayload({
		quote,
		title: typeof document === 'undefined' ? '' : document.title,
		url: typeof document === 'undefined' ? '' : canonicalShareUrl(document)
	});

	function dismiss() {
		bubbleVisible = false;
		menuVisible = false;
		manualVisible = false;
		notice = '';
	}

	/** @param {DOMRect} rect */
	function positionNearRect(rect) {
		const width = 166;
		const x = Math.min(
			window.innerWidth - width / 2 - 10,
			Math.max(width / 2 + 10, rect.left + rect.width / 2)
		);
		const above = rect.top - 14;
		const y = above > 54 ? above : Math.min(window.innerHeight - 54, rect.bottom + 14);
		return { x, y };
	}

	/** @param {{ x: number; y: number }} point */
	function positionMenu(point) {
		const estimatedHeight = Math.min(400, window.innerHeight - 20);
		return {
			x: Math.min(window.innerWidth - 160, Math.max(160, point.x)),
			y: Math.min(Math.max(10, window.innerHeight - estimatedHeight), Math.max(10, point.y + 10))
		};
	}

	function refreshSelection() {
		const eligible = getEligibleSelection(window.getSelection(), document);
		if (!eligible) {
			if (!menuVisible) bubbleVisible = false;
			return;
		}
		quote = eligible.quote;
		anchor = positionNearRect(eligible.rect);
		shareOrigin = anchor;
		bubbleVisible = true;
		menuVisible = false;
		manualVisible = false;
	}

	/** @param {string} message */
	function showNotice(message) {
		notice = message;
		clearTimeout(noticeTimer);
		noticeTimer = setTimeout(() => (notice = ''), 2200);
	}

	function celebrate() {
		if (celebrated) return;
		celebrated = true;
		window.dispatchEvent(new CustomEvent('swyx:share-celebration'));
		if (reducedMotion) {
			particles = [{ id: 0, static: true }];
		} else {
			const colors = ['#c0392b', '#2563eb', '#f59e0b', '#10b981'];
			particles = Array.from({ length: 14 }, (_, id) => {
				const angle = (Math.PI * 2 * id) / 14 - Math.PI / 2;
				const distance = 34 + (id % 4) * 8;
				return {
					id,
					dx: Math.round(Math.cos(angle) * distance),
					dy: Math.round(Math.sin(angle) * distance),
					color: colors[id % colors.length],
					delay: (id % 3) * 25
				};
			});
		}
		clearTimeout(particleTimer);
		particleTimer = setTimeout(() => (particles = []), reducedMotion ? 900 : 760);
	}

	async function nativeShare() {
		if (!navigator.share) {
			menuVisible = true;
			manualVisible = !navigator.clipboard?.writeText;
			return;
		}
		try {
			await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
			celebrate();
			dismiss();
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError')) {
				menuVisible = true;
				manualVisible = true;
				showNotice('Sharing was unavailable — copy it manually.');
			}
		}
	}

	function activateBubble() {
		bubbleVisible = false;
		if (coarsePointer) {
			void nativeShare();
		} else {
			anchor = positionMenu(anchor);
			menuVisible = true;
			manualVisible = !navigator.clipboard?.writeText;
		}
	}

	async function copyShare() {
		try {
			await navigator.clipboard.writeText(payload.copyText);
			celebrate();
			showNotice(quote ? 'Quote and link copied.' : 'Link copied.');
		} catch {
			manualVisible = true;
			showNotice('Select and copy below.');
		}
	}

	function openX() {
		const popup = window.open(payload.xIntent, 'swyx-share-x', 'popup,width=640,height=560');
		if (popup) {
			popup.opener = null;
			celebrate();
			showNotice('X compose opened.');
		} else {
			manualVisible = true;
			showNotice('The compose window was blocked.');
		}
	}

	/** @param {Event} event */
	function openPageShare(event) {
		quote = '';
		const detail =
			/** @type {CustomEvent<{ x?: number; y?: number; rect?: DOMRect }>} */ (event).detail || {};
		const rect = detail.rect;
		shareOrigin = {
			x: Math.min(
				window.innerWidth - 100,
				Math.max(100, detail.x || (rect ? rect.left + rect.width / 2 : window.innerWidth - 120))
			),
			y: Math.min(
				window.innerHeight - 100,
				Math.max(100, detail.y || (rect ? rect.top + rect.height / 2 : window.innerHeight - 140))
			)
		};
		anchor = positionMenu(shareOrigin);
		bubbleVisible = false;
		menuVisible = true;
		manualVisible = !navigator.clipboard?.writeText;
	}

	/** @param {PointerEvent} event */
	function onPointerDown(event) {
		if (event.target instanceof Element && event.target.closest('[data-share-ui]')) return;
		if (bubbleVisible || menuVisible) dismiss();
	}

	/** @param {KeyboardEvent} event */
	function onKeyDown(event) {
		if (event.key === 'Escape') dismiss();
	}

	beforeNavigate(() => dismiss());
	afterNavigate(() => {
		const nextUrl = window.location.href;
		if (currentUrl && currentUrl !== nextUrl) celebrated = false;
		currentUrl = nextUrl;
		dismiss();
	});

	onMount(() => {
		const coarse = window.matchMedia('(pointer: coarse)');
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		const syncPreferences = () => {
			coarsePointer = coarse.matches;
			reducedMotion = motion.matches;
			nativeShareAvailable = typeof navigator.share === 'function';
		};
		syncPreferences();
		coarse.addEventListener('change', syncPreferences);
		motion.addEventListener('change', syncPreferences);
		document.addEventListener('selectionchange', refreshSelection);
		window.addEventListener('pointerdown', onPointerDown, true);
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('resize', dismiss);
		window.addEventListener('scroll', dismiss, true);
		window.addEventListener('swyx:open-share-menu', openPageShare);

		return () => {
			coarse.removeEventListener('change', syncPreferences);
			motion.removeEventListener('change', syncPreferences);
			document.removeEventListener('selectionchange', refreshSelection);
			window.removeEventListener('pointerdown', onPointerDown, true);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('resize', dismiss);
			window.removeEventListener('scroll', dismiss, true);
			window.removeEventListener('swyx:open-share-menu', openPageShare);
			clearTimeout(noticeTimer);
			clearTimeout(particleTimer);
		};
	});
</script>

{#if bubbleVisible}
	<button
		class="share-bubble"
		data-share-ui
		style={`left:${anchor.x}px;top:${anchor.y}px`}
		type="button"
		on:mousedown|preventDefault
		on:click={activateBubble}
		aria-haspopup={coarsePointer ? undefined : 'menu'}
	>
		Share quote <span aria-hidden="true">✨</span>
	</button>
{/if}

{#if menuVisible}
	<div
		class="share-menu"
		data-share-ui
		style={`left:${anchor.x}px;top:${anchor.y}px`}
		role="menu"
		aria-label={quote ? 'Share selected quote' : 'Share this page'}
	>
		<p class="share-menu__eyebrow">{quote ? 'Share this highlight' : 'Share this page'}</p>
		{#if quote}<p class="share-menu__quote">“{quote}”</p>{/if}
		<div class="share-menu__actions">
			{#if nativeShareAvailable}
				<button type="button" role="menuitem" on:click={nativeShare}>System Share</button>
			{/if}
			<button type="button" role="menuitem" on:click={openX}>Post to X</button>
			<button type="button" role="menuitem" on:click={copyShare}
				>{quote ? 'Copy quote + link' : 'Copy link'}</button
			>
		</div>
		{#if manualVisible}
			<label class="share-menu__manual">
				<span>Select and copy</span>
				<textarea
					readonly
					rows="4"
					value={payload.copyText}
					on:focus={(event) => event.currentTarget.select()}
				></textarea>
			</label>
		{/if}
		{#if notice}<p class="share-menu__notice" role="status">{notice}</p>{/if}
	</div>
{/if}

{#if particles.length}
	<div
		class="share-burst"
		aria-hidden="true"
		style={`left:${shareOrigin.x}px;top:${shareOrigin.y}px`}
	>
		{#each particles as particle (particle.id)}
			{#if particle.static}
				<span class="share-burst__static">✨</span>
			{:else}
				<i
					style={`--dx:${particle.dx}px;--dy:${particle.dy}px;--color:${particle.color};--delay:${particle.delay}ms`}
				></i>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.share-bubble,
	.share-menu {
		position: fixed;
		z-index: 70;
		transform: translate(-50%, -100%);
		font-family: ui-sans-serif, system-ui, sans-serif;
	}

	.share-bubble {
		border: 1px solid rgba(31, 41, 55, 0.18);
		border-radius: 999px;
		background: #1f2937;
		color: #f9fafb;
		box-shadow: 0 8px 24px rgba(31, 41, 55, 0.22);
		padding: 0.55rem 0.8rem;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
		cursor: pointer;
	}

	.share-bubble:hover,
	.share-bubble:focus-visible {
		background: #2563eb;
		outline: 3px solid rgba(37, 99, 235, 0.25);
		outline-offset: 2px;
	}

	.share-menu {
		transform: translate(-50%, 0);
		width: min(19rem, calc(100vw - 1.25rem));
		max-height: min(28rem, calc(100vh - 1.25rem));
		overflow: auto;
		border: 1px solid rgba(31, 41, 55, 0.14);
		border-radius: 0.8rem;
		background: #f9fafb;
		color: #1f2937;
		box-shadow: 0 16px 40px rgba(31, 41, 55, 0.2);
		padding: 0.75rem;
	}

	.share-menu__eyebrow {
		margin: 0 0 0.45rem;
		color: #c0392b;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.share-menu__quote {
		display: -webkit-box;
		margin: 0 0 0.65rem;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		font-family: Georgia, serif;
		font-size: 0.83rem;
		line-height: 1.35;
	}

	.share-menu__actions {
		display: grid;
		gap: 0.35rem;
	}

	.share-menu__actions button {
		border: 1px solid rgba(31, 41, 55, 0.14);
		border-radius: 0.5rem;
		background: white;
		color: inherit;
		padding: 0.5rem 0.65rem;
		font-size: 0.76rem;
		font-weight: 650;
		text-align: left;
		cursor: pointer;
	}

	.share-menu__actions button:hover,
	.share-menu__actions button:focus-visible {
		border-color: #2563eb;
		color: #2563eb;
		outline: none;
	}

	.share-menu__manual {
		display: grid;
		gap: 0.3rem;
		margin-top: 0.65rem;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.share-menu__manual textarea {
		width: 100%;
		resize: vertical;
		border: 1px solid rgba(31, 41, 55, 0.18);
		border-radius: 0.45rem;
		background: #f3f4f6;
		padding: 0.45rem;
		font:
			0.68rem/1.35 ui-monospace,
			monospace;
	}

	.share-menu__notice {
		margin: 0.55rem 0 0;
		color: #2563eb;
		font-size: 0.7rem;
	}

	.share-burst {
		position: fixed;
		z-index: 80;
		width: 1px;
		height: 1px;
		pointer-events: none;
	}

	.share-burst i {
		position: absolute;
		width: 7px;
		height: 7px;
		border-radius: 2px;
		background: var(--color);
		animation: share-pop 700ms cubic-bezier(0.2, 0.75, 0.25, 1) var(--delay) both;
	}

	.share-burst__static {
		position: absolute;
		transform: translate(-50%, -50%);
		font-size: 1.35rem;
	}

	@keyframes share-pop {
		0% {
			opacity: 0;
			transform: translate(0, 0) rotate(0deg) scale(0.5);
		}
		20% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(var(--dx), var(--dy)) rotate(180deg) scale(1);
		}
	}

	@media (prefers-color-scheme: dark) {
		.share-menu {
			background: #1f2937;
			color: #f9fafb;
			border-color: rgba(255, 255, 255, 0.15);
		}
		.share-menu__actions button {
			background: #111827;
			border-color: rgba(255, 255, 255, 0.15);
		}
		.share-menu__manual textarea {
			background: #111827;
			color: #f9fafb;
			border-color: rgba(255, 255, 255, 0.15);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.share-burst i {
			animation: none;
		}
	}
</style>
