<script>
	import { SITE_TITLE } from '$lib/siteConfig';

	/** @type {string} */
	export let title;
	/** @type {string} */
	export let documentTitle = title;
	/** @type {string} */
	export let description;
	/** @type {string} */
	export let canonical;
	/** @type {string} */
	export let image;
	/** @type {string} */
	export let imageAlt;
	/** @type {'article' | 'website'} */
	export let type = 'website';
	/** @type {string} */
	export let twitterHandle = 'swyx';
	/** @type {Record<string, unknown> | undefined} */
	export let structuredData = undefined;

	$: twitterAccount = twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`;
	$: structuredDataJson = structuredData
		? JSON.stringify(structuredData).replaceAll('<', '\\u003c')
		: undefined;
</script>

<svelte:head>
	<title>{documentTitle}</title>
	<link rel="canonical" href={canonical} />
	<meta name="description" content={description} />

	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_TITLE} />
	<meta property="og:image" content={image} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={imageAlt} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content={twitterAccount} />
	<meta name="twitter:creator" content={twitterAccount} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
	<meta name="twitter:image:alt" content={imageAlt} />

	{#if structuredDataJson}
		{@html `<script type="application/ld+json">${structuredDataJson}</script>`}
	{/if}
</svelte:head>
