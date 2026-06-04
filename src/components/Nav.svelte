<script>
	import NavLink from './NavLink.svelte';

	let isDark = false;
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
</script>

<nav class="py-5">
	<a href="#skip" class="skip-nav">Skip to content</a>
	<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
		<a class="text-lg font-bold no-underline" href="/">swyx.io</a>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
			<NavLink href="/">home</NavLink>
			<NavLink href="/ideas">ideas</NavLink>
			<NavLink href="/podcasts">podcasts</NavLink>
			<NavLink href="/about">about</NavLink>
			<NavLink href="/subscribe">subscribe</NavLink>
			<a href="/rss.xml" data-sveltekit-reload>rss</a>
			<button class="plain-button" aria-label="Toggle Dark Mode" on:click={toggleDarkMode}>
				{isDark ? 'light' : 'dark'}
			</button>
		</div>
	</div>
</nav>

<style>
	.skip-nav {
		position: absolute;
		left: -9999px;
	}

	.skip-nav:focus {
		left: 1rem;
		top: 1rem;
		z-index: 100;
		background: var(--page-bg);
		padding: 0.5rem;
	}
</style>
