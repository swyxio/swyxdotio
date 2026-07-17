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

	/** @type {import('./$types').PageData} */
	export let data;

	/** @type {import('$lib/types').ContentItem} */
	$: json = data.json; // warning: if you try to destructure content here, make sure to make it reactive, or your page content will not update when your user navigates

	/** @type {HTMLDivElement | undefined} */
	let commentsEl;
	$: issueNumber = json?.ghMetadata?.issueUrl?.split('/')?.pop();

	$: canonical = json.canonical ? json.canonical : SITE_URL + $page.url.pathname;
	$: social = getArticleSocialMeta(json, canonical);
</script>

<SocialMeta {...social} />

<svelte:head>
	{#if json.subtitle}
		<meta property="subtitle" content={json.subtitle} />
	{/if}
</svelte:head>

<article
	class="prose swyxcontent mx-auto mt-8 w-full max-w-none items-start justify-center dark:prose-invert"
>
	<h1 class="mb-4 text-3xl font-bold">
		{json.title}
	</h1>
	{#if json.subtitle}
		<p class="mb-4 italic tracking-tight text-black dark:text-white md:text-xl">
			{json.subtitle}
		</p>
	{/if}
	<div class="plain-muted mt-2 flex w-full flex-wrap justify-between gap-x-4 text-sm">
		<span>swyx</span>
		<span class="flex items-center gap-2">
			<ReadCounter pageKey={data.slug} requireDepth />
			<span aria-hidden="true">·</span>
			<a
				href={json.ghMetadata?.issueUrl ?? '#'}
				rel="external noreferrer"
				class="no-underline"
				target="_blank"
			>
				{new Date(json.date).toISOString().slice(0, 10)}
			</a>
		</span>
	</div>
	<hr class="plain-rule mb-8 mt-2" />

	{#if json.disclosure}
		<p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
			<a
				aria-label="What is my disclosure policy?"
				target="_blank"
				title="What is my disclosure policy?"
				rel="noopener noreferrer"
				href="https://www.swyx.io/digital-garden-tos/#2-epistemic-disclosure"
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

<div class="site-shell mb-12 max-w-2xl">
	{#if json?.tags?.length}
		<p class="!text-slate-400 flex-auto mb-4 italic">
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
		--content: minmax(0, 56rem);
		--popout: minmax(0, 2rem);
		--feature: minmax(0, 5rem);

		display: grid;
		grid-template-columns:
			[full-start] var(--site-gutter)
			[feature-start popout-start content-start] minmax(0, 1fr)
			[content-end popout-end feature-end] var(--site-gutter)
			[full-end];
	}

	@media (min-width: 768px) {
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

	@media (min-width: 768px) {
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
