<script context="module">
	import {
		SITE_URL,
		REPO_URL,
		SITE_TITLE,
		SITE_DESCRIPTION,
		DEFAULT_OG_IMAGE,
		MY_TWITTER
	} from '$lib/siteConfig';
	export const prerender = true; // index page is most visited, lets prerender
	export async function load({ params, fetch }) {
		const blogposts = await fetch(`/api/listBlogposts.json`);
		if (blogposts.status > 400) {
			console.error('render error for ' + `/api/listBlogposts.json`);
			return {
				status: blogposts.status,
				error: await blogposts.text()
			};
		} else {
			return {
				props: {
					blogposts: await blogposts.json()
					// speaking: await speaking.json()
				},
				maxage: 3600 // 1 hour
			};
		}
	}
</script>

<script>
	import Newsletter from '../components/Newsletter.svelte';
	import FeatureCard from '../components/FeatureCard.svelte';
	import FeaturedWriting from '../components/FeaturedWriting.svx';
	import FeaturedSpeaking from '../components/FeaturedSpeaking.svx';
	export let blogposts; // ,speaking;
	$: list = blogposts.list.slice(0, 10);
</script>

<svelte:head>
	<title>{SITE_TITLE}</title>
	<link rel="canonical" href={SITE_URL} />
	<link rel="alternate" type="application/rss+xml" href={SITE_URL + '/api/rss.xml'} />
	<meta property="og:url" content={SITE_URL} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={SITE_TITLE} />
	<meta name="Description" content={SITE_DESCRIPTION} />
	<meta property="og:description" content={SITE_DESCRIPTION} />
	<meta property="og:image" content={DEFAULT_OG_IMAGE} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:creator" content={MY_TWITTER} />
	<meta name="twitter:title" content={SITE_TITLE} />
	<meta name="twitter:description" content={SITE_DESCRIPTION} />
	<meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
</svelte:head>

<div
	class="mx-auto flex max-w-2xl flex-col items-start justify-center border-gray-200 px-4 dark:border-gray-700 sm:px-8"
>
	<div class="flex flex-col-reverse items-start sm:flex-row">
		<div class="flex flex-col pr-8 mb-16 ">
			<h1 class="mb-3 text-3xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
				Shawn
				<span
					class="relative ml-2 inline-block before:absolute before:-inset-1 before:block before:-skew-y-3 before:bg-red-500"
				>
					<span class="relative skew-y-3 text-yellow-400">@swyx</span>
				</span>
				Wang
			</h1>
			<h2 class="mb-4 text-gray-700 dark:text-gray-200">
				Writer, Speaker, Developer Advocate. I help devtools cross the chasm (React + TypeScript,
				Svelte, Netlify, now <a sveltekit:prefetch href="/why-temporal"
				>Temporal</a>) and help developers <a sveltekit:prefetch href="/LIP"
					>Learn in Public</a
				>!
			</h2>
				<a  class="text-gray-600 dark:text-gray-400" sveltekit:prefetch href="/about">More on About page</a>
		</div>
		<img
				class="w-[80px] rounded-full sm:w-[176px] relative mb-8 sm:mb-0 mr-auto bg-cyan-300 bg-opacity-25"
				src="/swyx-ski.jpeg" alt="swyx at Niseko" 
		
			/>
	</div>

	<!-- <section class="mb-16 w-full">
		<pre>{JSON.stringify(speaking, null, 2)}</pre>
	</section> -->
	<section class="mb-8 w-full">
		<h3 class="mb-6 text-2xl font-bold tracking-tight text-black dark:text-white md:text-4xl">
			Latest Posts
		</h3>
		<ul class="text-white">
			{#each list as item}
				<li class="text-black dark:text-white">
					{new Date(item.date).toISOString().slice(0, 10)}
					<a sveltekit:prefetch href={item.slug}>{item.title}</a>
				</li>
			{/each}
		</ul>
		<a
			class="mt-8 flex h-6 rounded-lg leading-7 text-gray-600 
			 transition-all dark:text-gray-400 dark:hover:text-gray-200"
			href="/ideas"
			>See all posts<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="ml-1 h-6 w-6"
				><path
					stroke="currentColor"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M17.5 12h-15m11.667-4l3.333 4-3.333-4zm3.333 4l-3.333 4 3.333-4z"
				/></svg
			></a
		>
	</section>
	<Newsletter />
	<section class="mb-8 w-full">
		<h3 class="mb-6 text-2xl font-bold tracking-tight text-black dark:text-white md:text-4xl">
			Most Popular Posts
		</h3>
		<div class="flex flex-col gap-6 md:flex-row mb-8">
			<FeatureCard title="Learn in Public" href="/learn-in-public" date={'Jun 2018'} />
			<FeatureCard
				title="The Third Age of JavaScript"
				href="/js-third-age"
				date={'May 2020'}
			/>
			<FeatureCard title="Eating the Cloud from Outside In" href="/cloudflare-go" date={'Oct 2021'} />
		</div>
		<FeaturedWriting />
	</section>
	<section class="mb-8 w-full">
		<h3 class="mb-6 text-2xl font-bold tracking-tight text-black dark:text-white md:text-4xl">
			Most Popular Talks
		</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<iframe
			class="object-contain"
			src="https://www.youtube.com/embed/KJP1E-Y-xyo"
			title="video123"
			name="video123"
			allow="accelerometer; autoplay; encrypted-media; gyroscope;
			picture-in-picture"
			frameBorder="0"
			webkitallowfullscreen="true"
			mozallowfullscreen="true"
			width="300"
			height="200"
			allowFullScreen
			aria-hidden="true"></iframe>
			<iframe
			class="object-contain"
			src="https://www.youtube.com/embed/D-Sj6jo4o1I"
			title="video123"
			name="video123"
			allow="accelerometer; autoplay; encrypted-media; gyroscope;
			picture-in-picture"
			frameBorder="0"
			webkitallowfullscreen="true"
			mozallowfullscreen="true"
			width="300"
			height="200"
			allowFullScreen
			aria-hidden="true"></iframe>
			<iframe
			class="object-contain"
			src="https://www.youtube.com/embed/GWCcZ6fnpn4"
			title="video123"
			name="video123"
			allow="accelerometer; autoplay; encrypted-media; gyroscope;
			picture-in-picture"
			frameBorder="0"
			webkitallowfullscreen="true"
			mozallowfullscreen="true"
			width="300"
			height="200"
			allowFullScreen
			aria-hidden="true"></iframe>
			<iframe
			class="object-contain"
			src="https://www.youtube.com/embed/nyFHR0dDZo0"
			title="video123"
			name="video123"
			allow="accelerometer; autoplay; encrypted-media; gyroscope;
			picture-in-picture"
			frameBorder="0"
			webkitallowfullscreen="true"
			mozallowfullscreen="true"
			width="300"
			height="200"
			allowFullScreen
			aria-hidden="true"></iframe>
		</div>
		<FeaturedSpeaking />
	</section>
</div>
