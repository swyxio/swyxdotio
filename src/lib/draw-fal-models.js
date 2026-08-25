/**
 * Curated from the Artificial Analysis image-editing leaderboard and fal's
 * current first-party image-editing recommendations. Prices are provider
 * estimates, not quotes; resolution and provider pricing can change.
 *
 * Last verified: 2026-08-25.
 */
export const DRAW_FAL_MODELS = /** @type {const} */ ([
	{
		id: 'nano-banana-2',
		label: 'Nano Banana 2',
		provider: 'Google',
		model: 'fal-ai/nano-banana-2/edit',
		artificialAnalysisRank: 6,
		price: '$0.08',
		description: 'Best balance of quality, speed, and cost',
		badge: 'fal top pick',
		settings: { resolution: '1K', aspect_ratio: 'auto', output_format: 'webp' }
	},
	{
		id: 'gpt-image-2',
		label: 'GPT Image 2',
		provider: 'OpenAI',
		model: 'openai/gpt-image-2/edit',
		artificialAnalysisRank: 3,
		price: '~$0.219',
		description: 'Highest-ranked available quality and prompt precision',
		badge: 'AA #3',
		settings: { quality: 'high', image_size: 'auto', output_format: 'webp' }
	},
	{
		id: 'seedream-5-pro',
		label: 'Seedream 5.0 Pro',
		provider: 'ByteDance',
		model: 'bytedance/seedream/v5/pro/edit',
		artificialAnalysisRank: 8,
		price: '$0.0675',
		description: 'Precise regional changes and sketch-to-render',
		badge: 'New on fal',
		settings: {
			image_size: 'auto_1K',
			output_format: 'jpeg',
			enable_safety_checker: true
		}
	},
	{
		id: 'nano-banana-pro',
		label: 'Nano Banana Pro',
		provider: 'Google',
		model: 'fal-ai/nano-banana-pro/edit',
		artificialAnalysisRank: 9,
		price: '$0.15',
		description: 'Premium reasoning, typography, and final-quality edits',
		badge: 'fal premium pick',
		settings: { resolution: '1K', aspect_ratio: 'auto', output_format: 'webp' }
	},
	{
		id: 'flux-2',
		label: 'FLUX.2 [dev]',
		provider: 'Black Forest Labs',
		model: 'fal-ai/flux-2/edit',
		artificialAnalysisRank: 48,
		price: '~$0.024',
		description: 'Budget-friendly everyday edits at roughly one megapixel',
		badge: 'Best value',
		settings: { output_format: 'webp', enable_safety_checker: true }
	}
]);

export const DEFAULT_DRAW_FAL_MODEL = DRAW_FAL_MODELS[0];

/** @param {unknown} id */
export function getDrawFalModel(id) {
	return DRAW_FAL_MODELS.find((model) => model.id === id);
}
