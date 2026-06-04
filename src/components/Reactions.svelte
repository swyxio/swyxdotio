<script>
	/** @type {import('$lib/types').GHReactions} */
	export let reactions;
	/** @type {string} */
	export let issueUrl;
	/** @typedef {'+1' | '-1' | 'laugh' | 'hooray' | 'confused' | 'heart' | 'rocket' | 'eyes'} ReactionKey */
	/** @type {Record<ReactionKey, string>} */
	let emojiMap = {
		'+1': '👍',
		'-1': '👎',
		laugh: '😆',
		hooray: '🎉',
		confused: '😕',
		heart: '❤️',
		rocket: '🚀',
		eyes: '👀'
	};
	/** @type {ReactionKey[]} */
	const reactionKeys = /** @type {ReactionKey[]} */ (Object.keys(emojiMap));
</script>

<a href={`${issueUrl}#issuecomment-new`} class="no-underline">
	{#each reactionKeys as reaction}
		{#if reactions[reaction] > 0}
			<span class="reaction-button">
				<span class="space-x-1 rounded border-blue-800 p-2">
					<span class="reaction-button-emoji">{emojiMap[reaction]}</span>
					<span class="reaction-button-count">{reactions[reaction]}</span>
				</span>
			</span>
		{/if}
	{/each}
</a>
