import rawCatalog from './draw-reference-catalog.json' with { type: 'json' };

/** @typedef {'title'|'hook'|'visual'} ExampleField */
/** @typedef {{id:string,fields:ExampleField[],note?:string}} ExampleSelection */
/** @typedef {{catalogVersion:string,examples:ExampleSelection[]}} FewShotSelection */
/** @typedef {{id:string,videoId:string,channelId:string,title:string,url:string,thumbnailUrl:string,publishedAt?:string,publishedLabel?:string,viewCount?:number,viewLabel?:string,duration?:string,sourceUrl:string,retrievedAt:string,thumbnailText?:string,notes?:string}} ReferenceExample */
/** @typedef {{id:string,slug:string,name:string,handle:string,url:string,sourceUrls:string[],latestIds:string[],topIds:string[],coverage:{latest:string,top:string},notes?:string}} ReferenceChannel */
export const referenceCatalog =
	/** @type {{schemaVersion:number,retrievedAt:string,definition:string,channels:ReferenceChannel[],examples:ReferenceExample[]}} */ (
		rawCatalog
	);
export const MAX_FEW_SHOT_EXAMPLES = 6;
export const EXAMPLE_FIELDS = [
	{ id: 'title', label: 'Title examples' },
	{ id: 'hook', label: 'Hook examples' },
	{ id: 'visual', label: 'Visual direction' }
];

/** Original editorial suggestions, not a creator's actual prompts or an approved house kit. */
export const SHOW_PRESETS = [
	{
		id: 'ls',
		name: 'Latent Space episode',
		brand: 'ls',
		channelSlug: 'latent-space',
		nameExample: 'Next Latent Space episode',
		hints:
			'Find one specific tension, decision or surprising consequence. The thumbnail hook should complement the episode title, not repeat it. Preserve every requested guest and company.',
		prompt:
			'Lead with one source-supported curiosity hook, usually 2–6 words. Keep the official Latent Space mark intact and text editable. Use real supplied portraits, one dominant idea, strong mobile hierarchy and a clear lower-right duration zone. Do not invent quotes, identities, company logos or episode claims.'
	},
	{
		id: 'aie',
		name: 'AI Engineer talk',
		brand: 'aie',
		channelSlug: 'ai-engineer',
		nameExample: 'Next AI Engineer talk',
		hints:
			'State the engineering problem and one concrete lesson, tradeoff or outcome. Keep the speaker name and company exact. Use the talk transcript as evidence, not other videos.',
		prompt:
			'Create an editable conference-video thumbnail around one supported technical takeaway. Use supplied event branding, exact speaker/company names and real headshots. Preserve legibility at 320px and the lower-right duration zone. Channel examples are inspiration, not approval of an event-specific house style.'
	},
	{
		id: 'interview',
		name: 'Long-form interview',
		brand: 'generic',
		channelSlug: 'dwarkesh-patel',
		nameExample: 'Next interview',
		hints:
			'Prefer a precise question or tension over a broad topic label. Let the title explain the conversation and the thumbnail carry one complementary reason to click.',
		prompt:
			'Use a restrained portrait-led composition and one specific curiosity gap grounded in the interview. Keep the guest identity exact. Separate quoted evidence from suggested headlines; never imply a generated headline was spoken.'
	},
	{
		id: 'developer',
		name: 'Developer breakdown',
		brand: 'generic',
		channelSlug: 'matt-pocock',
		nameExample: 'Next developer video',
		hints:
			'Start with the developer problem, then a concrete outcome or tradeoff. Prefer recognisable technical terms over unsupported superlatives.',
		prompt:
			'Build a clear before/after, comparison or problem/solution composition. Use one strong headline and at most one supporting visual. Keep text and logos editable and avoid invented product claims.'
	}
];

/** @returns {FewShotSelection} */
export function emptyFewShot() {
	return { catalogVersion: referenceCatalog.retrievedAt, examples: [] };
}

/** Reject unavailable IDs and stale snapshots rather than silently replacing examples. @param {unknown} value @returns {FewShotSelection} */
export function validateFewShot(value) {
	if (value === undefined || value === null) return emptyFewShot();
	const selected = /** @type {FewShotSelection} */ (value);
	if (
		!selected ||
		selected.catalogVersion !== referenceCatalog.retrievedAt ||
		!Array.isArray(selected.examples) ||
		selected.examples.length > MAX_FEW_SHOT_EXAMPLES
	)
		throw new Error(
			'This example set is unavailable or exceeds six examples. Review the current reference library.'
		);
	const ids = new Set();
	for (const item of selected.examples) {
		const example = referenceCatalog.examples.find((example) => example.id === item?.id);
		if (
			!item ||
			ids.has(item.id) ||
			!example ||
			!Array.isArray(item.fields) ||
			!item.fields.length ||
			item.fields.some((field) => !['title', 'hook', 'visual'].includes(field)) ||
			new Set(item.fields).size !== item.fields.length ||
			(item.fields.includes('hook') && !example.thumbnailText) ||
			(item.note !== undefined &&
				(typeof item.note !== 'string' ||
					item.note.length > 1000 ||
					/data:[^\s,;]{0,100}(?:;base64|,)/i.test(item.note)))
		)
			throw new Error('Review the selected examples and their field toggles.');
		ids.add(item.id);
	}
	return selected;
}

/** @param {FewShotSelection|undefined} value @param {string} id @param {ExampleField} field */
export function toggleExampleField(value, id, field) {
	const current = validateFewShot(value);
	const example = referenceCatalog.examples.find((item) => item.id === id);
	if (!example || !['title', 'hook', 'visual'].includes(field))
		throw new Error('Example unavailable.');
	if (field === 'hook' && !example.thumbnailText)
		throw new Error(
			'Thumbnail wording was not transcribed for this example. Use it for title or visual review instead.'
		);
	const before = current.examples.find((item) => item.id === id);
	const fields = before?.fields.includes(field)
		? before.fields.filter((item) => item !== field)
		: [...(before?.fields ?? []), field];
	const examples = current.examples.filter((item) => item.id !== id);
	if (fields.length) examples.push({ id, fields, ...(before?.note ? { note: before.note } : {}) });
	return validateFewShot({ catalogVersion: current.catalogVersion, examples });
}

/** Text examples are never passed off as image attachments or facts about the new show. @param {FewShotSelection|undefined} selection @param {ExampleField[]} [fields] */
export function fewShotPrompt(selection, fields = ['title', 'hook', 'visual']) {
	const selected = validateFewShot(selection);
	const records = selected.examples.flatMap((item) => {
		const roles = item.fields.filter((field) => fields.includes(field));
		if (!roles.length) return [];
		const example = /** @type {ReferenceExample} */ (
			referenceCatalog.examples.find((example) => example.id === item.id)
		);
		const channel = referenceCatalog.channels.find((channel) => channel.id === example.channelId);
		return [
			{
				id: item.id,
				channel: channel?.name,
				roles,
				source: example.url,
				...(roles.includes('title') ? { exampleTitle: example.title } : {}),
				...(roles.includes('hook') && example.thumbnailText
					? { observedThumbnailText: example.thumbnailText }
					: {}),
				...(roles.includes('visual')
					? {
							visualNote:
								item.note ||
								example.notes ||
								'Visual selected for human comparison only; no image is attached to this text request.'
						}
					: {}),
				...(item.note ? { userNote: item.note } : {})
			}
		];
	});
	return records.length
		? `FEW-SHOT EXAMPLES (style demonstrations only; not evidence for this episode). Do not copy names, claims, numbers or quotations into the new show. These entries supply text only; do not assume their thumbnail images were attached. Any image inputs are listed separately.\n${JSON.stringify(records, null, 2)}`
		: '';
}

/** Applying a field preset is explicit and reversible; never copy another show's facts automatically. @param {string} presetId */
export function showPreset(presetId) {
	const preset = SHOW_PRESETS.find((item) => item.id === presetId);
	if (!preset) throw new Error('Choose an available show starter.');
	return preset;
}
