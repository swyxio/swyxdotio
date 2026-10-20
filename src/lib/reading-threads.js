/** Hand-picked connections between essays, rather than inferred recommendations. */
const READING_THREADS = [
	{
		title: 'Learning in public',
		articles: [
			{ href: '/learn-in-public', title: 'Learn in Public' },
			{ href: '/create-luck', title: 'How to Create Luck' },
			{ href: '/part-time-creator-manifesto', title: 'The Part-Time Creator Manifesto' },
			{ href: '/notice-me', title: 'Getting Senpai To Notice You' }
		]
	},
	{
		title: 'AI engineering',
		articles: [
			{ href: 'https://www.latent.space/p/ai-engineer', title: 'The Rise of the AI Engineer' },
			{ href: '/ai-landscape', title: 'The AI Engineer Landscape' },
			{ href: '/ai-eng-agents', title: 'Engineering AI Agents' },
			{ href: '/cognition', title: 'Cognition: The Devin is in the Details' }
		]
	}
];

/** @param {string} slug */
export function readingThreadFor(slug) {
	const current = `/${slug}`;
	const thread = READING_THREADS.find(({ articles }) =>
		articles.some(({ href }) => href === current)
	);
	return (
		thread && {
			title: thread.title,
			articles: thread.articles.filter(({ href }) => href !== current)
		}
	);
}
