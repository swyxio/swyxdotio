/** @typedef {'thinking' | 'thumbnails' | 'experiment'} DrawingStartingModeId */
/** @typedef {{ command: string, label: string, description: string, symbol: string }} DrawingStarter */
/** @typedef {{ id: DrawingStartingModeId, label: string, description: string, heading: string, detail: string, section: 'presets' | 'designs', starters: DrawingStarter[], secondary: { command: string, label: string } }} DrawingStartingMode */

/** Presentation defaults only. Commands, permissions, and documents are shared by every mode. */
export const DRAW_STARTING_MODES = Object.freeze(
	/** @type {DrawingStartingMode[]} */ ([
		{
			id: 'thinking',
			label: 'Thinking',
			description: 'Diagrams & essay figures',
			heading: 'Make an idea clear.',
			detail: 'Start with an editable diagram, turn rough notes into a figure, or just draw.',
			section: 'presets',
			starters: [
				{
					command: 'preset-architecture-comparison',
					label: 'Compare architectures',
					description: 'Two approaches, the same question.',
					symbol: 'comparison'
				},
				{
					command: 'preset-agent-tool-loop',
					label: 'Map an agent loop',
					description: 'Tools, feedback, and a clear exit.',
					symbol: 'loop'
				},
				{
					command: 'preset-argument-map',
					label: 'Build an argument',
					description: 'Claims, evidence, and objections.',
					symbol: 'argument'
				}
			],
			secondary: { command: 'workflow-notes-to-diagram', label: 'Start from rough notes' }
		},
		{
			id: 'thumbnails',
			label: 'Thumbnails',
			description: 'AI Engineer & Latent Space',
			heading: 'Give your next video a strong first frame.',
			detail: 'Compose with real assets, editable type, and reusable brand kits.',
			section: 'designs',
			starters: [
				{
					command: 'action-compose-thumbnail',
					label: 'Create a thumbnail',
					description: 'Choose a kit, headline, and layout.',
					symbol: 'thumbnail'
				},
				{
					command: 'design-ls-podcast',
					label: 'Latent Space starter',
					description: 'An editable 1280 × 720 canvas.',
					symbol: 'thumbnail'
				},
				{
					command: 'action-open-creative-library',
					label: 'Your assets & kits',
					description: 'Keep references and brand assets together.',
					symbol: 'assets'
				}
			],
			secondary: { command: 'action-browse-designs', label: 'Browse all design templates' }
		},
		{
			id: 'experiment',
			label: 'Experiment',
			description: 'Image & video models',
			heading: 'One idea. Many possibilities.',
			detail: 'Generate from a prompt, add references, and compare results on the same canvas.',
			section: 'designs',
			starters: [
				{
					command: 'action-generate-media',
					label: 'Open Generate',
					description: 'Choose models and review cost before running.',
					symbol: 'generate'
				},
				{
					command: 'action-import-image',
					label: 'Add a reference image',
					description: 'Start with an image from your device.',
					symbol: 'assets'
				},
				{
					command: 'action-open-creative-library',
					label: 'Saved assets',
					description: 'Reuse your private reference library.',
					symbol: 'assets'
				}
			],
			secondary: { command: 'action-generation-history', label: 'Open generation history' }
		}
	])
);

/** @param {unknown} value @returns {DrawingStartingMode} */
export function getDrawingStartingMode(value) {
	return DRAW_STARTING_MODES.find((mode) => mode.id === value) ?? DRAW_STARTING_MODES[0];
}

/** Use the verified account's existing namespace, never a global cross-account preference. */
export function drawingStartingModeKey(/** @type {string} */ drawingStorageKey) {
	return `${drawingStorageKey}:starting-mode`;
}

/** An undo-cleared or unverified scene is not a new blank page. */
export function isNewBlankDrawing(/** @type {unknown} */ scene) {
	if (scene === undefined || scene === null) return true;
	return (
		typeof scene === 'object' &&
		'elements' in scene &&
		Array.isArray(scene.elements) &&
		scene.elements.length === 0
	);
}

/** @param {{ ready: boolean, restoreFailed: boolean, blank: boolean, dismissed: boolean, surfaceOpen: boolean }} state */
export function shouldShowDrawingStart(state) {
	return (
		state.ready && !state.restoreFailed && state.blank && !state.dismissed && !state.surfaceOpen
	);
}
