<script>
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getPageSocialMeta } from '$lib/social-meta';
	/** @type {{ html: string }} */
	export let data;
	const social = getPageSocialMeta('about');
</script>

<SocialMeta {...social} />

<article
	class="site-shell site-card prose mb-12 mt-4 hover:prose-a:text-blue-300 prose-ul:list-disc dark:prose-invert md:mt-6"
>
	{@html data.html}
</article>
