<script>
	import { page } from '$app/stores';

	let isDark = false;
	let isMenuOpen = false;
	/** @type {HTMLDialogElement | undefined} */
	let menuDialog;
	/** @type {HTMLButtonElement | undefined} */
	let menuCloseButton;
	const navItems = [
		{ href: '/', label: 'home' },
		{ href: '/ideas', label: 'ideas' },
		{ href: '/podcasts', label: 'podcasts' },
		{ href: '/about', label: 'about' },
		{ href: '/subscribe', label: 'subscribe' }
	];

	if (typeof localStorage !== 'undefined') {
		if (
			localStorage.theme === 'dark' ||
			(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
		) {
			isDark = true;
		}
	}

	function toggleDarkMode() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.theme = isDark ? 'dark' : 'light';
	}

	/** @param {string} href */
	function isActive(href) {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}

	function closeMenu() {
		menuDialog?.close();
	}

	function openMenu() {
		menuDialog?.showModal();
		isMenuOpen = true;
		menuCloseButton?.focus();
	}

	function closeMenuOnDesktop() {
		if (window.innerWidth > 780 && isMenuOpen) closeMenu();
	}

	/** @param {KeyboardEvent} event */
	function closeMenuOnEscape(event) {
		if (!isMenuOpen || event.defaultPrevented || event.key !== 'Escape') return;
		event.preventDefault();
		closeMenu();
	}
</script>

<svelte:window on:resize={closeMenuOnDesktop} on:keydown={closeMenuOnEscape} />

<nav class="site-panel my-2 px-4 py-3">
	<a href="#skip" class="skip-nav">Skip to content</a>
	<div class="nav-bar">
		<a class="brand-link no-underline" href="/">swyx.io</a>

		<div class="nav-actions">
			<div class="nav-links">
				{#each navItems as item}
					<a class:active={isActive(item.href)} href={item.href}>{item.label}</a>
				{/each}
			</div>
			<button
				class="theme-button nav-theme"
				aria-label="Toggle Dark Mode"
				aria-pressed={isDark}
				on:click={toggleDarkMode}
			>
				<span aria-hidden="true">{isDark ? '☼' : '☾'}</span>
				<span class="theme-label">{isDark ? 'light' : 'dark'}</span>
			</button>

			<button
				class="menu-button"
				type="button"
				aria-label="Open navigation menu"
				aria-expanded={isMenuOpen}
				aria-controls="mobile-navigation"
				on:click={openMenu}
			>
				<span aria-hidden="true"></span>
				Menu
			</button>
		</div>
	</div>
</nav>

<dialog
	class="mobile-menu-layer"
	aria-label="Site navigation"
	bind:this={menuDialog}
	on:close={() => (isMenuOpen = false)}
>
	<button
		class="mobile-menu-backdrop"
		tabindex="-1"
		aria-label="Close navigation menu"
		on:click={closeMenu}
	></button>
	<aside id="mobile-navigation" class="mobile-drawer" aria-label="Mobile navigation">
		<div class="drawer-header">
			<a class="drawer-brand" href="/" on:click={closeMenu}>swyx.io</a>
			<button
				class="drawer-close"
				bind:this={menuCloseButton}
				type="button"
				aria-label="Close navigation menu"
				on:click={closeMenu}
			>
				Close
			</button>
		</div>

		<div class="drawer-section">
			<p class="drawer-kicker">Navigate</p>
			{#each navItems as item}
				<a class:active={isActive(item.href)} href={item.href} on:click={closeMenu}>
					<span>{item.label}</span>
					<small>{item.href}</small>
				</a>
			{/each}
		</div>

		<div class="drawer-footer">
			<button
				class="theme-button drawer-theme"
				aria-label="Toggle Dark Mode"
				aria-pressed={isDark}
				on:click={toggleDarkMode}
			>
				Switch to {isDark ? 'light' : 'dark'} mode
			</button>
		</div>
	</aside>
</dialog>

<style>
	nav {
		border: 0;
		border-bottom: 1px solid var(--page-border);
		border-radius: 0;
		background: transparent;
		padding-inline: 0;
		box-shadow: none;
	}

	.skip-nav {
		position: absolute;
		left: -9999px;
	}

	.skip-nav:focus {
		left: 1rem;
		top: 1rem;
		z-index: 100;
		background: var(--page-surface);
		padding: 0.5rem;
	}

	.nav-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.brand-link {
		color: var(--page-accent);
		font-family: var(--font-display);
		font-size: 1.34rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.nav-actions {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		font-family: Georgia, serif;
	}

	.nav-links :global(a),
	.theme-button {
		border: 1px solid transparent;
		border-radius: 0.4rem;
		padding: 0.1rem 0.45rem;
		color: var(--page-muted);
		text-decoration: none;
	}

	.nav-links :global(a.active) {
		border-color: transparent;
		border-bottom-color: var(--page-accent);
		border-radius: 0;
		background: transparent;
		color: var(--page-accent);
		font-weight: 700;
	}

	.nav-links :global(a:hover),
	.theme-button:hover {
		border-color: var(--page-border);
		background: var(--page-row-hover);
		color: var(--page-text);
	}

	.theme-button {
		background: transparent;
		font: inherit;
		cursor: pointer;
	}

	.nav-theme {
		display: inline-flex;
		min-height: 2.2rem;
		align-items: center;
		gap: 0.35rem;
		border-color: var(--page-border);
		color: var(--page-gold);
	}

	.menu-button {
		display: none;
		align-items: center;
		gap: 0.45rem;
		border: 1px solid var(--page-border);
		border-radius: 0.45rem;
		background: var(--page-surface);
		color: var(--page-text);
		font: inherit;
		font-size: 0.875rem;
		font-weight: 700;
		padding: 0.25rem 0.55rem;
	}

	.menu-button span,
	.menu-button span::before,
	.menu-button span::after {
		display: block;
		width: 0.9rem;
		height: 1px;
		background: currentColor;
		content: '';
	}

	.menu-button span {
		position: relative;
	}

	.menu-button span::before,
	.menu-button span::after {
		position: absolute;
		left: 0;
	}

	.menu-button span::before {
		top: -0.28rem;
	}

	.menu-button span::after {
		top: 0.28rem;
	}

	.mobile-menu-layer {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: none;
		width: 100%;
		height: 100dvh;
		max-width: none;
		max-height: none;
		margin: 0;
		border: 0;
		padding: 0;
		background: transparent;
		color: var(--page-text);
	}

	.mobile-menu-layer::backdrop {
		background: rgba(15, 23, 42, 0.48);
		backdrop-filter: blur(5px);
	}

	:global(body:has(.mobile-menu-layer[open])) {
		overflow: hidden;
	}

	.mobile-menu-backdrop {
		position: absolute;
		inset-block: 0;
		left: min(82vw, 22rem);
		right: 0;
		z-index: 0;
		border: 0;
		background: transparent;
		cursor: default;
	}

	.mobile-drawer {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		width: min(82vw, 22rem);
		min-height: 100%;
		height: 100%;
		overflow-y: auto;
		border-right: 1px solid var(--page-border);
		background: var(--page-surface);
		box-shadow: 1rem 0 3rem rgba(0, 0, 0, 0.2);
		animation: drawer-in 180ms ease-out;
	}

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--page-border);
		padding: 1rem;
	}

	.drawer-brand {
		color: var(--page-accent);
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 600;
		text-decoration: none;
	}

	.drawer-close {
		min-height: 2.75rem;
		border: 1px solid var(--page-border);
		border-radius: 0.4rem;
		background: transparent;
		color: var(--page-muted);
		font: inherit;
		font-size: 0.8rem;
		padding: 0.2rem 0.5rem;
	}

	.drawer-section {
		padding: 1rem;
	}

	.drawer-kicker {
		margin: 0 0 0.6rem;
		color: var(--page-muted);
		font-size: 0.76rem;
		font-family: var(--font-mono);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.drawer-section a {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 1rem;
		align-items: baseline;
		min-height: 3rem;
		border-bottom: 1px solid var(--page-border);
		color: var(--page-text);
		padding: 0.65rem 0.7rem;
		text-decoration: none;
	}

	.drawer-section a + a {
		margin-top: 0.15rem;
	}

	.drawer-section a:hover,
	.drawer-section a.active {
		background: var(--page-accent-soft);
		color: var(--page-accent);
	}

	.drawer-section span {
		font-family: var(--font-display);
		font-size: 1.35rem;
		font-weight: 600;
		text-transform: capitalize;
		white-space: nowrap;
	}

	.drawer-section small {
		max-width: 8.8rem;
		overflow: hidden;
		color: var(--page-muted);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.drawer-footer {
		margin-top: auto;
		border-top: 1px solid var(--page-border);
		padding: 1rem;
	}

	.drawer-theme {
		width: 100%;
		min-height: 2.75rem;
		border-color: var(--page-border);
		padding: 0.45rem 0.6rem;
		text-align: left;
	}

	@keyframes drawer-in {
		from {
			transform: translateX(-1rem);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@media (max-width: 780px) {
		nav {
			padding-block: 0.65rem;
		}

		.nav-links {
			display: none;
		}

		.theme-label {
			display: none;
		}

		.nav-theme {
			min-width: 2.75rem;
			min-height: 2.75rem;
			justify-content: center;
			font-size: 1.1rem;
		}

		.menu-button {
			min-height: 2.75rem;
			display: flex;
		}

		.mobile-menu-layer[open] {
			display: flex;
		}
	}
</style>
