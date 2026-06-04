<script>
	import { page } from '$app/stores';
	$: isActive = $page.url.pathname === $$props.href;
	export let href;
</script>

<a class="inline-block" class:font-semibold={isActive} {href}><slot /> </a>
