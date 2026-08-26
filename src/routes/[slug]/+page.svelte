<script>
	import { SITE_URL } from '$lib/siteConfig';
	import SocialMeta from '../../components/SocialMeta.svelte';
	import { getArticleSocialMeta } from '$lib/social-meta';
	// import Comments from '../../components/Comments.svelte';

	import Newsletter from '../../components/Newsletter.svelte';
	import Reactions from '../../components/Reactions.svelte';
	import LatestPosts from '../../components/LatestPosts.svelte';
	import { page } from '$app/stores';

	import utterances, { injectScript } from './loadUtterances';
	import WebMentions from '../../components/WebMentions.svelte';
	import ReadCounter from '../../components/ReadCounter.svelte';
	import BookLaunchCallout from '../../components/BookLaunchCallout.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	/** @type {import('$lib/types').ContentItem} */
	$: json = data.json; // warning: if you try to destructure content here, make sure to make it reactive, or your page content will not update when your user navigates

	/** @type {HTMLDivElement | undefined} */
	let commentsEl;
	$: issueNumber = json?.ghMetadata?.issueUrl?.split('/')?.pop();

	$: isCodingCareerLaunch = data.slug === 'launching-coding-career';
	$: socialArticle =
		isCodingCareerLaunch && json.ghMetadata
			? {
					...json,
					ghMetadata: { ...json.ghMetadata, updated_at: new Date('2026-08-18T00:00:00.000Z') }
				}
			: json;
	$: canonical = json.canonical ? json.canonical : SITE_URL + $page.url.pathname;
	$: social = getArticleSocialMeta(socialArticle, canonical);
	$: hasTranslations = /^\s*<blockquote>\s*<p>Translations welcome!/i.test(json.content ?? '');
</script>

<SocialMeta {...social} />

<svelte:head>
	<link rel="alternate" type="text/markdown" href="/{data.slug}.md" />
	{#if json.subtitle}
		<meta property="subtitle" content={json.subtitle} />
	{/if}
</svelte:head>

<article
	class="prose reading-prose swyxcontent mx-auto w-full items-start justify-center dark:prose-invert"
	class:has-translations={hasTranslations}
>
	<header class="article-header">
		<a class="article-back" href="/ideas">← All writing</a>
		<h1>{json.title}</h1>
		{#if json.subtitle}
			<p class="article-deck">{json.subtitle}</p>
		{/if}
		<div class="article-byline">
			<span>by <a href="/about">swyx</a></span>
			{#if isCodingCareerLaunch}
				<a href="https://learninpublic.org/" rel="external"> Open Sourced August 18, 2026 </a>
			{:else if json.ghMetadata?.issueUrl}
				<a href={json.ghMetadata.issueUrl} rel="external noreferrer" target="_blank">
					<time datetime={new Date(json.date).toISOString()}>
						{new Date(json.date).toISOString().slice(0, 10)}
					</time>
				</a>
			{:else}
				<time datetime={new Date(json.date).toISOString()}>
					{new Date(json.date).toISOString().slice(0, 10)}
				</time>
			{/if}
			{#key data.slug}
				<ReadCounter pageKey={data.slug} requireDepth />
			{/key}
		</div>
	</header>
	{#if isCodingCareerLaunch}
		<BookLaunchCallout />
	{/if}

	{#if json.disclosure}
		<p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
			<a
				aria-label="What is my disclosure policy?"
				target="_blank"
				title="What is my disclosure policy?"
				rel="noopener noreferrer"
				href="https://swyx.io/digital-garden-tos/#2-epistemic-disclosure"
				color="blue"
			>
				<span class="relative font-bold"
					>Disclosure<svg
						xmlns="http://www.w3.org/2000/svg"
						width="1em"
						height="1em"
						class="ml-1 inline"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#999"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
						<line x1="12" y1="17" x2="12" y2="17" />
					</svg></span
				></a
			>: {json.disclosure}
		</p>
	{/if}
	{@html json.content}
</article>

<div class="site-shell article-endmatter mb-12">
	{#if json?.tags?.length}
		<p class="article-tags">
			Tagged in:
			{#each json.tags as tag}
				<span class="px-1">
					<a href={`/ideas?filter=hashtag-${tag}`}>#{tag}</a>
				</span>
			{/each}
		</p>
	{/if}
	<div class="plain-section prose max-w-full border-y py-3 dark:prose-invert">
		{#if json.ghMetadata}
			{#if json.ghMetadata.reactions.total_count > 0}
				Reactions: <Reactions
					issueUrl={json.ghMetadata.issueUrl}
					reactions={json.ghMetadata.reactions}
				/>
			{:else}
				<a href={json.ghMetadata.issueUrl}>Leave a reaction </a>
				if you liked this post! 🧡
			{/if}
		{/if}
		{#if json.devToReactions}
			<a href={json.devToUrl} rel="external noreferrer" class="no-underline" target="_blank">
				<span class="ml-2 font-mono text-xs text-gray-700 text-opacity-70 dark:text-gray-300">
					(+{json.devToReactions} on dev.to)
				</span>
			</a>
		{/if}
	</div>
	<div class="mb-8" bind:this={commentsEl} use:utterances={{ number: issueNumber }}>
		Loading comments...
		<!-- svelte-ignore a11y-mouse-events-have-key-events -->
		<button
			class="plain-button my-4"
			on:click={() => commentsEl && injectScript(commentsEl, issueNumber)}
			on:mouseover={() => commentsEl && injectScript(commentsEl, issueNumber)}>Load now</button
		>
		<!-- <Comments ghMetadata={json.ghMetadata} /> -->
	</div>
	<WebMentions
		devto_reactions={json.devToReactions}
		targets={[
			`https://www.swyx.io/${json.slug}`,
			`https://www.swyx.io/writing/${json.slug}`,
			json.devToUrl,
			canonical
		]}
	/>

	<Newsletter />
	<LatestPosts items={data.list} />
</div>

<style>
	/* https://ryanmulligan.dev/blog/layout-breakouts/ */
	.swyxcontent {
		--gap: clamp(1rem, 6vw, 3rem);
		--full: minmax(var(--gap), 1fr);
		--content: minmax(0, min(72ch, var(--reading-max-width)));
		--popout: minmax(0, 2rem);
		--feature: minmax(0, 5rem);

		max-width: none;
		margin-block: 1.75rem 1.5rem;
		display: grid;
		grid-template-columns:
			[full-start] minmax(var(--site-gutter), 1fr)
			[feature-start popout-start content-start]
			minmax(0, min(calc(100% - var(--site-gutter) - var(--site-gutter)), var(--reading-max-width)))
			[content-end popout-end feature-end] minmax(var(--site-gutter), 1fr)
			[full-end];
	}

	.article-header {
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--page-border);
		padding-bottom: 1rem;
	}

	.article-back {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		font: 400 0.76rem/1.4 var(--font-mono);
		text-decoration: none;
	}

	.article-header h1 {
		margin: 0.35rem 0 0.65rem;
		text-wrap: balance;
	}

	.article-deck {
		margin: 0 0 0.9rem;
		color: var(--page-muted);
		font-size: 1.15rem;
		font-style: italic;
		line-height: 1.5;
	}

	.article-byline {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem 1.1rem;
		color: var(--page-muted);
		font: 400 0.78rem/1.6 var(--font-body);
	}

	.article-byline a {
		color: inherit;
		text-decoration: none;
	}

	.article-byline a:hover {
		color: var(--page-link);
		text-decoration: underline;
	}

	.has-translations > :global(blockquote:first-of-type) {
		margin: 0 0 1.5rem;
		border-left: 0;
		padding: 0;
		font: 400 0.875rem/1.6 var(--font-body);
	}

	.has-translations > :global(blockquote:first-of-type p) {
		margin: 0;
	}

	.article-endmatter {
		--site-max-width: var(--reading-max-width);
	}

	.article-tags {
		margin-bottom: 1rem;
		color: var(--page-muted);
		font-size: 0.875rem;
	}

	@media (min-width: 1040px) {
		.swyxcontent {
			grid-template-columns:
				[full-start] var(--full)
				[feature-start] var(--feature)
				[popout-start] var(--popout)
				[content-start] var(--content) [content-end]
				var(--popout) [popout-end]
				var(--feature) [feature-end]
				var(--full) [full-end];
		}
	}

	:global(.swyxcontent > *) {
		grid-column: content;
		min-width: 0;
	}

	article :global(pre) {
		grid-column: feature;
		margin-inline: 0;
	}

	@media (min-width: 1040px) {
		article :global(pre) {
			margin-left: -1rem;
			margin-right: -1rem;
		}
	}

	/* hacky thing because otherwise the summary>pre causes overflow */
	article :global(summary > pre) {
		max-width: 90vw;
	}

	article :global(.popout) {
		grid-column: popout;
	}
	article :global(.feature) {
		grid-column: feature;
	}
	article :global(.full) {
		grid-column: full;
		width: 100%;
	}

	article :global(.admonition) {
		padding: 2rem;
		border-width: 4px;
		border-color: rgb(239 68 68);
	}

	/* fix github codefence diff styling from our chosen prismjs theme */
	article :global(.token.inserted) {
		background: #00ff0044;
	}

	article :global(.token.deleted) {
		background: #ff000d44;
	}
</style>
