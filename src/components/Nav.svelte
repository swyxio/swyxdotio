<script>
	import { page } from '$app/stores';

	let isDark = false;
	let isMenuOpen = false;
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
		isMenuOpen = false;
	}

	/** @param {KeyboardEvent} event */
	function closeOnEscape(event) {
		if (event.key === 'Escape') closeMenu();
	}
</script>

<svelte:window on:keydown={closeOnEscape} />

<nav class="site-panel my-2 px-4 py-3">
	<a href="#skip" class="skip-nav">Skip to content</a>
	<div class="nav-bar">
		<a class="brand-link no-underline" href="/">swyx.io</a>

		<div class="nav-links">
			{#each navItems as item}
				<a class:active={isActive(item.href)} href={item.href}>{item.label}</a>
			{/each}
			<a href="/rss.xml" data-sveltekit-reload>rss</a>
			<button class="theme-button" aria-label="Toggle Dark Mode" on:click={toggleDarkMode}>
				{isDark ? 'light' : 'dark'}
			</button>
		</div>

		<button
			class="menu-button"
			type="button"
			aria-label="Open navigation menu"
			aria-expanded={isMenuOpen}
			aria-controls="mobile-navigation"
			on:click={() => (isMenuOpen = true)}
		>
			<span aria-hidden="true"></span>
			Menu
		</button>
	</div>
</nav>

{#if isMenuOpen}
	<div class="mobile-menu-layer" role="presentation">
		<button class="mobile-menu-backdrop" aria-label="Close navigation menu" on:click={closeMenu}
		></button>
		<aside id="mobile-navigation" class="mobile-drawer" aria-label="Mobile navigation">
			<div class="drawer-header">
				<a class="drawer-brand" href="/" on:click={closeMenu}>swyx.io</a>
				<button
					class="drawer-close"
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
				<a href="/rss.xml" data-sveltekit-reload on:click={closeMenu}>
					<span>rss</span>
					<small>/rss.xml</small>
				</a>
			</div>

			<div class="drawer-footer">
				<button
					class="theme-button drawer-theme"
					aria-label="Toggle Dark Mode"
					on:click={toggleDarkMode}
				>
					Switch to {isDark ? 'light' : 'dark'} mode
				</button>
			</div>
		</aside>
	</div>
{/if}

<style>
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
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
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
		border-color: color-mix(in srgb, var(--page-accent) 45%, var(--page-border));
		background: var(--page-accent-soft);
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
	}

	.mobile-menu-backdrop {
		position: absolute;
		inset-block: 0;
		left: min(82vw, 22rem);
		right: 0;
		z-index: 0;
		border: 0;
		background: rgba(15, 23, 42, 0.48);
		backdrop-filter: blur(5px);
		cursor: default;
	}

	.mobile-drawer {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		width: min(82vw, 22rem);
		min-height: 100%;
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
		font-weight: 800;
		text-decoration: none;
	}

	.drawer-close {
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
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.drawer-section a {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 1rem;
		align-items: baseline;
		border-radius: 0.55rem;
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
		font-size: 1rem;
		font-weight: 750;
		text-transform: capitalize;
	}

	.drawer-section small {
		color: var(--page-muted);
		font-family: var(--font-mono);
		font-size: 0.72rem;
	}

	.drawer-footer {
		margin-top: auto;
		border-top: 1px solid var(--page-border);
		padding: 1rem;
	}

	.drawer-theme {
		width: 100%;
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

	@media (max-width: 640px) {
		nav {
			padding-block: 0.65rem;
		}

		.nav-links {
			display: none;
		}

		.menu-button,
		.mobile-menu-layer {
			display: flex;
		}
	}
</style>
