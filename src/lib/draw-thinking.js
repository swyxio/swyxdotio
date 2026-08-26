/** Public editorial references, not a claim that every source illustration is original. */
export const DRAW_ESSAY_REFERENCES = [
	{
		title: 'Why Temporal',
		url: 'https://swyx.io/why-temporal',
		lesson: 'Keep the systems fixed; highlight the responsibility that moved.'
	},
	{
		title: 'Eating the Cloud',
		url: 'https://swyx.io/cloudflare-go',
		lesson: 'Compare equivalent structures and make the ownership boundary explicit.'
	},
	{
		title: 'How to Create Luck',
		url: 'https://swyx.io/create-luck',
		lesson: 'Directly label conceptual axes; whitespace and category color explain the distinction.'
	},
	{
		title: 'The Third Age of JavaScript',
		url: 'https://swyx.io/js-third-age',
		lesson: 'Group a progression into meaningful phases; mark an uncertain future as uncertain.'
	},
	{
		title: 'The Rise of the AI Engineer',
		url: 'https://www.latent.space/p/ai-engineer',
		lesson: 'Use one focal accent and a labeled, permeable boundary; show the consequential change.'
	}
];

export const DRAW_ESSAY_STYLE_GUIDE = `For explanatory diagrams and essay figures, use the visual reasoning of swyx's prominent essays, not a thumbnail aesthetic. References: ${DRAW_ESSAY_REFERENCES.map((reference) => `${reference.title} (${reference.url}): ${reference.lesson}`).join(' ')}
First choose the one thesis and the right topology: parallel comparison, feedback loop, claim/support/objection, conceptual axes, or progression. Prefer a small useful figure over a decorative inventory. For comparisons align equivalent inputs and outputs; for loops show observation and an explicit done/budget/error exit; for arguments separate claims, evidence, inference and counterarguments. Mark missing evidence as unknown. Never invent citations, metrics or certainty; label conceptual charts as illustrative, not measurements.
Use native editable text/shapes and genuinely bound arrows, not a flattened diagram image. For new Latent Space house-style diagrams use dark ink #211a2b, purple #a358ff, lilac #e9d8ff and near-white #f7f1ff, with clean linework (roughness 0), selective flat fills, numbered black stage badges, centered section pills and labeled boundaries. Keep third-party logo colors intact. Browse draw components: diagram-icon-* are native editable pictograms; diagram-logo-* are authentic bundled logo layers with independent captions. Use these instead of inventing brand marks or replacing every concept with a generic rounded card. Logos may be image layers; diagram structure and labels must remain native. Use short direct labels, title 30–42 and main labels 23; 17 only for brief secondary annotations at roughly 1000 units of figure width. Keep 48+ outer padding and 64–96 between main nodes. Color, arrows, ordering and containment must carry meaning. Respect the user's explicit style request instead of forcing these defaults on every drawing.
Start with draw presets when architecture-comparison, agent-tool-loop, or argument-map fits, then replace placeholders with the user's actual content. Do not blindly insert a starter when polishing an existing figure. For essay-ready revision inspect the selected elements, ask if selection is empty, duplicate the figure into open space, and modify only the copies. draw duplicate preserves labels and internal bindings for up to 120 elements; edit in smaller batches. Fit the result, inspect the next viewport screenshot, and correct overlaps, crossings, unreadable labels or ambiguous arrows before claiming it is ready. Keep caveats even when simplifying. Never export or upload automatically.`;

/** Shared workflows: available from every starting experience, never run on entry. */
export const DRAW_THINKING_WORKFLOWS = [
	{
		id: 'notes-to-diagram',
		label: 'Notes → diagram',
		description: 'Turn a paragraph into one editable explanatory figure.',
		prompt:
			'Turn my notes below into one useful, editable essay figure. First identify the single claim and choose a comparison, loop, argument map, or another honest topology. Separate evidence from inference and mark missing support as unknown; never invent numbers or sources. Use the swyx essay-figure style: sparse dark structure, generous whitespace, short direct labels, and one purposeful accent. Preserve existing artwork; use native shapes and bound labeled connectors, not a generated image. Ask for the notes if they are missing.\n\nMy notes: '
	},
	{
		id: 'essay-ready',
		label: 'Make this essay-ready',
		description: 'Polish a copy of the selected diagram; preserve the original.',
		prompt:
			'Make the selected diagram essay-ready. Inspect the selection first; if nothing is selected, ask me to select a figure and do not change anything. Duplicate the selected figure into open space, preserving bound labels/connectors, and edit only the copy. Clarify its one main idea, shorten labels without changing meaning, fix spacing and arrow direction, and make the key relationship stand out with one semantic accent. Use the swyx essay-figure style rather than a thumbnail or marketing artboard. Preserve factual caveats and mark missing evidence. Fit the copy in the viewport and visually review it before finishing. Do not export or upload anything automatically.'
	}
];
