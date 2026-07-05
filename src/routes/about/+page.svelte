<script>
	import { SITE_TITLE } from '$lib/siteConfig';
	/** @type {{ html: string }} */
	export let data;
</script>

<svelte:head>
	<title>About | {SITE_TITLE}</title>
</svelte:head>

<article
	class="site-shell site-card prose mb-12 mt-4 hover:prose-a:text-blue-300 prose-ul:list-disc dark:prose-invert md:mt-6"
>
	{@html data.html}
</article>
