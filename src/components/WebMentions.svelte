<script>
	// https://github.com/sw-yx/domainblocklist/blob/main/README.md
	let blocklist = [
		'http://gadgetsearcher.com',
		'https://pixallus.com',
		'http://programming.yourworldin90seconds.com',
		'https://programming.nichedomain.news',
		'https://marketingsolution.com.au',
		'https://programming.aplus-review.com',
		'https://digitalapexgroup.com',
		'https://technologynews.biz',
		'https://worldtech.news',
		'https://programming.webcloning.com',
		'https://www.sacramentowebdesigngroup.com',
		'https://htmltreehouse.com',
		'https://1dmx.org',
		'https://websitedesign-usa.com',
		'https://techupd.com',
		'https://fancyhints.com',
		'https://techalertnews.com',
		'https://buzzedly.com',
		'https://dztechno.com',
		'https://graphicdon.com',
		'https://www.newsgosspis.com',
		'http://www.digitasbuzz.in',
		'https://gotutoral.com',
		'https://wpguynews.com',
		'https://www.klobal.net',
		'http://www.webmastersgallery.com',
		'https://pikopong.com',
		'https://keren.link',
		'https://ntdln.com',
		'https://jczh.xyz',
		'https://pazukong.wordpress.com',
		'https://fullstackfeed.com',
		'https://thebrandingstore.net',
		'https://development-tools.net',
		'https://itdirectory.my',
		'https://www.sacramentowebdesigngroup.com',
		'https://engrmks.com.ng',
		'https://www.xspdf.com',
		'http://isokunoffice.club',
		'http://dinezh.com',
		'http://www.makemoneyupdaters.com',
		'http://clicknow.in',
		'http://nexstair.com',
		'http://kovtonyuk.inf.ua',
		'http://postheaven.net',
		'http://www.legendstrivia.co.uk',
		'http://squareblogs.net',
		'http://www.fourthcity.net',
		'http://www.engrmks.com.ng',
		'http://711web.com',
		'http://techupd.com',
		'http://www.67nj.org',
		'http://tipsxd.com',
		'http://www.new.pixel-forge.ca',
		'http://pixallus.com',
		'http://wpnewshub.com',
		'http://tecriter.wordpressarena.com',
		'http://reddits.contractwebsites.com',
		'http://wawas-kingdom.com',
		'http://dztechno.com',
		'http://wpguynews.com',
		'http://www.digitasbuzz.in',
		'http://watchfvsslive.co',
		'http://gotutoral.com',
		'http://techfans.co.uk',
		'http://pikopong.com',
		'http://marketingsolution.com.au',
		'https://reportwire.org',
		'https://www.codeificant.com',
		'https://tipsxd.com',
		'https://wpdesigns.live',
		'https://gigatechnews.com',
		'https://blogs.thebitx.com',
		'https://updatetech.xyz',
		'https://neoweb4u.com',
		'https://www.websjohn.com',
		'https://www.webhostpolice.com',
		    'https://lzomedia.com',
		    'https://jateng.co',
		    'https://news.priviw.com',
		    'https://movilgadget.com',
		    'https://kitdeveloper.ru',
		    '.thats.im',     // 'https://bdbloger.thats.im', 'https://mdsohel.thats.im', 'https://sazelab.thats.im/'
		    '.cu.ma', // 'https://bdbloger.cu.ma', 'https://mdsazel.cu.ma/'
		    'https://reactjsexample.com',
		    'https://dentedreality.com.au',
		    'https://platoblockchain.net',
		    'http://aayugcreation.com',
		    'https://www.67nj.org',
		    'https://wpnewshub.com',
		    'https://codinghindi.in',
		    'https://programmer.chimpymail.com',
		    'https://sayed.work',
		    'https://infos.by',
		    'https://data-science-austria.at',
		    'https://www.techyrack.com'
	];
	let page = 0;
	export let targets;
	export let devto_reactions;
	$: _targets = [...new Set(targets.filter(Boolean))];
	if (!targets) throw new Error('error: no target');
	let counts;
	let mentions = [];
	let fetchState = 'fetching';
	import { onMount } from 'svelte';
	onMount(() => {
		const fetches = _targets.map((target) =>
			fetch(`https://webmention.io/api/count.json?target=${target}/`).then((res) => res.json())
		);
		counts = Promise.all(fetches).then(
			(arr) =>
				arr
					.map((x) => x.type)
					.reduce((acc, cur) => ({
						like: (acc.like || 0) + (cur.like || 0),
						mention: (acc.mention || 0) + (cur.mention || 0),
						reply: (acc.reply || 0) + (cur.reply || 0),
						repost: (acc.repost || 0) + (cur.repost || 0)
					})),
			{}
		);
		// .then(x => console.log({xx: x}) || x)
		getMentions().then((x) => {
			mentions = x;
			fetchState = 'done';
			return fetchMore();
		});
	});
	function filterOutLinks(link) {
		if (link.activity.type === 'like') return false;
		if (blocklist.includes(new URL(link.source).origin)) return false;
		return true;
	}
	function getMentions() {
		const fetches = _targets.map((target) =>
			fetch(
				`https://webmention.io/api/mentions?page=${page}&per-page=20&target=${target}/`
			).then((x) => x.json())
		);
		// remember trailing slash impt
		// maybe want to sort someday
		// `https://webmention.io/api/mentions?page=${page}&per-page=20&sort-by=published&target=${target}`,
		return Promise.all(fetches)
			.then((arr) => arr.map((x) => x.links).flat())
			.then((link) => link.filter(filterOutLinks));
	}
	const fetchMore = () => {
		page += 1;
		getMentions().then((x) => {
			if (x.length) {
				mentions = [...mentions, ...x];
			} else {
				fetchState = 'nomore';
			}
		});
	};
	function cleanString(str) {
		if (str.length > 300) str = str.slice(0, 300);
		const withSlash = _targets[0] + '/'; // todo: figure out proper fix
		const linky = `<a href="${withSlash}">${withSlash}</a>`;
		return str
			.replace(linky, '') // drop self referential <a> tags
			.replace('<script>', '<$cript>'); // sneaky sneaky!
	}
</script>

<div id="WebMentions" class="prose dark:prose-invert">
	<div class="myflexresponsive justify-between">
		<div>
			<span font-family="system" font-size="4" font-weight="bold" class="text-2xl font-bold">
				Webmentions
			</span>
			<a
				aria-label="Clientside Webmentions"
				target="_blank"
				title="What is this?"
				rel="noopener"
				href="http://swyx.io/writing/clientside-webmentions"
				color="blue"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="0.75em"
					height="0.75em"
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
				</svg>
			</a>
		</div>
	</div>
	<div class="WebMentionsContainer mytext">
		<div class="WebMentionsHeader">
			{#await counts}
				<p>loading counts</p>
			{:then data}
				<div>
					{#if data === undefined}
						Loading...
					{:else}
						❤️
						{data.like + data.repost + devto_reactions || 0}
						💬
						{data.mention + data.reply || 0}
					{/if}
				</div>
			{:catch}
				Error loading webmentions, check console
			{/await}
		</div>
		{#if fetchState === 'fetching'}
			<div />
		{:else if mentions.length === 0}
			<div>
				No replies yet.
				<a href="https://twitter.com/intent/tweet/?text=Great%20post%20by%20@swyx%20{_targets[0]}">
					Tweet about this post
				</a>
				and it will show up here!
			</div>
		{:else}
			<ul>
				{#each mentions as link}
					<li
						class="myflexresponsive WebMentionReply border-b border-indigo-200 dark:border-indigo-700"
					>
						{#if link.data.author && link.data.author.photo}
							<div class="Avatar">
								<a
									target="_blank"
									rel="noopener"
									href={link.data.author && link.data.author.url}
									color="blue"
								>
									<img
										width="40"
										height="40"
										alt="avatar of {link.data.author && link.data.author.name}"
										src={link.data.author && link.data.author.photo}
									/>
								</a>
							</div>
						{:else}
							<span class="font-bold">{new URL(link.data.url).host}&nbsp;</span>
						{/if}
						<div>
							{#if link.activity.type === 'repost'}
								{link.data.author && link.data.author.name}
								<a href={link.data.url}>retweeted</a>
							{:else}
								<div font-family="system" color="text" font-weight="bold">
									{link.data.author ? `${link.data.author.name} ` : ' '}
									<a target="_blank" rel="noopener" href={link.data.url} color="blue">
										mentioned this
									</a>
									on
									<span color="tertiary">
										{link.data.published
											? link.data.published.slice(0, 10)
											: link.verified_date.slice(0, 10)}
									</span>
								</div>
								{#if link.data.content}
									<div>
										<p
											class="prose dark:prose-invert italic border-l-2 pl-2 border-teal-500"
											font-family="system"
											color="tertiary"
											font-size="2"
										>
											{@html cleanString(link.data.content)}
										</p>
									</div>
								{/if}
							{/if}
						</div>
					</li>
				{/each}
				{#if fetchState !== 'nomore'}
					<li>
						<button class="FetchMore" on:click={fetchMore}> Fetch More... </button>
					</li>
				{:else}
					<li>
						No further replies found.
						<a
							href="https://twitter.com/intent/tweet/?text=Great%20post%20by%20@swyx%20{_targets[0]}"
						>
							Tweet about this post
						</a>
						and it will show up here!
					</li>
				{/if}
			</ul>
		{/if}
	</div>
</div>

<style>
	#WebMentions {
		margin: 0 auto;
		font-style: italic;
		min-width: 300px;
	}
	#WebMentions ul {
		margin-left: 0;
	}
	.WebMentionsContainer {
		border: 1px dashed var(--link-color);
		padding: 1rem;
		margin-top: 1rem;
	}
	.WebMentionsContainer ul {
		list-style-type: none;
		padding: 0;
	}
	.WebMentionReply {
		margin-top: 16px;
		margin-bottom: 16px;
	}
	.Avatar {
		margin-right: 16px;
		width: 40px;
		flex: 0 0 auto;
		align-self: start;
	}
	.Avatar img {
		width: 40px;
		max-width: 100%;
		height: 40px;
		margin: 0px;
		border-radius: 50%;
	}
	.WebMentionsHeader {
		display: flex;
		justify-content: space-between;
	}
	.FetchMore {
		width: 20ch;
		font-size: 1.5rem;
		background-color: transparent;
		color: var(--link-color);
		border: 0;
		text-align: left;
	}
	svg {
		display: inline;
	}
</style>
