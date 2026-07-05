<script>
	import { page } from '$app/stores';
	$: isActive = $page.url.pathname === $$props.href;
	export let href;
</script>

<a class="inline-block" class:active={isActive} {href}><slot /> </a>

<style>
	a.active {
		border-color: color-mix(in srgb, var(--page-accent) 45%, var(--page-border));
		background: var(--page-accent-soft);
		color: var(--page-accent);
		font-weight: 700;
	}
</style>
