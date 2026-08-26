/**
 * Curated from the Artificial Analysis image-editing leaderboard and fal's
 * current first-party image-editing recommendations. Prices are provider
 * estimates, not quotes; resolution and provider pricing can change.
 *
 * Last verified: 2026-08-25.
 */
export const MAX_DRAW_FAL_REQUEST_BYTES = 12_000_000;

export const DRAW_FAL_MODELS = /** @type {const} */ ([
	{
		id: 'nano-banana-2',
		label: 'Nano Banana 2',
		provider: 'Google',
		weights: 'closed',
		model: 'fal-ai/nano-banana-2/edit',
		kind: 'image-edit',
		artificialAnalysisRank: 6,
		price: '$0.08',
		priceUsd: 0.08,
		referenceImages: 14,
		workflow: 'Balanced 1K edit',
		description: 'Best balance of quality, speed, and cost',
		badge: 'fal top pick',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/webp', size: '1K' },
		settings: {
			resolution: '1K',
			aspect_ratio: 'auto',
			output_format: 'webp'
		}
	},
	{
		id: 'reve-2-1',
		label: 'Reve 2.1',
		provider: 'Reve',
		weights: 'closed',
		model: 'reve/2.1/edit',
		kind: 'image-edit',
		artificialAnalysisRank: 2,
		price: '$0.25',
		priceUsd: 0.25,
		referenceImages: 1,
		workflow: 'Top-ranked 1 MP edit',
		description: 'Leading prompt adherence, composition, and text rendering',
		badge: 'AA #2',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/webp', size: '1 MP' },
		settings: { aspect_ratio: 'auto', output_format: 'webp' }
	},
	{
		id: 'gpt-image-2',
		label: 'GPT Image 2',
		provider: 'OpenAI',
		weights: 'closed',
		model: 'openai/gpt-image-2/edit',
		kind: 'image-edit',
		artificialAnalysisRank: 3,
		price: '~$0.219',
		priceUsd: 0.219,
		referenceImages: 16,
		workflow: 'High-detail 1.5 MP edit',
		description: 'Highest-ranked available quality and prompt precision',
		badge: 'AA #3',
		input: { maxPixels: 1_572_864, maxEdge: 2048, mimeType: 'image/webp', size: '1.5 MP' },
		settings: { quality: 'high', image_size: 'auto', output_format: 'webp' }
	},
	{
		id: 'grok-imagine-2',
		label: 'Grok Imagine Image 2.0',
		provider: 'xAI',
		weights: 'closed',
		model: 'xai/grok-imagine-image/v2.0/edit',
		kind: 'image-edit',
		artificialAnalysisRank: null,
		price: '~$0.07',
		priceUsd: 0.07,
		referenceImages: 3,
		workflow: 'Grok 2 medium-quality 1K edit',
		description: 'Newest Grok image editor with medium-quality 1K output',
		badge: 'New on fal',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/webp', size: '1K' },
		settings: { resolution: '1k', quality: 'medium', aspect_ratio: 'auto', output_format: 'webp' }
	},
	{
		id: 'seedream-5-pro',
		label: 'Seedream 5.0 Pro',
		provider: 'ByteDance',
		weights: 'closed',
		model: 'bytedance/seedream/v5/pro/edit',
		kind: 'image-edit',
		artificialAnalysisRank: 8,
		price: '$0.0675',
		priceUsd: 0.0675,
		referenceImages: 10,
		workflow: 'Precise product 1K edit',
		description: 'Precise regional changes and sketch-to-render',
		badge: 'New on fal',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '1K' },
		settings: {
			image_size: 'auto_1K',
			output_format: 'jpeg'
		}
	},
	{
		id: 'nano-banana-pro',
		label: 'Nano Banana Pro',
		provider: 'Google',
		weights: 'closed',
		model: 'fal-ai/nano-banana-pro/edit',
		kind: 'image-edit',
		artificialAnalysisRank: 9,
		price: '$0.15',
		priceUsd: 0.15,
		referenceImages: 14,
		workflow: 'Premium 1K edit',
		description: 'Premium reasoning, typography, and final-quality edits',
		badge: 'fal premium pick',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/webp', size: '1K' },
		settings: {
			resolution: '1K',
			aspect_ratio: 'auto',
			output_format: 'webp'
		}
	},
	{
		id: 'ideogram-v4',
		label: 'Ideogram V4',
		provider: 'Ideogram',
		weights: 'closed',
		model: 'ideogram/v4/image-to-image',
		kind: 'image-edit',
		artificialAnalysisRank: null,
		price: '~$0.015',
		priceUsd: 0.015,
		referenceImages: 1,
		workflow: 'Typography-focused 1 MP edit',
		description: 'Balanced image edits with strong typography and composition',
		badge: 'Typography',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '1 MP' },
		settings: {
			image_size: 'auto',
			expansion_model: 'None',
			rendering_speed: 'BALANCED',
			output_format: 'jpeg'
		}
	},
	{
		id: 'hunyuan-3-instruct',
		label: 'HunyuanImage 3.0 Instruct',
		provider: 'Tencent',
		weights: 'open',
		model: 'fal-ai/hunyuan-image/v3/instruct/edit',
		kind: 'image-edit',
		artificialAnalysisRank: 12,
		price: '~$0.09',
		priceUsd: 0.09,
		referenceImages: 3,
		workflow: 'Top open-weight 1 MP edit',
		description: 'Highest-ranked open-weight editor for instruction-following edits',
		badge: 'Open #1',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '1 MP' },
		settings: { image_size: 'auto', output_format: 'jpeg' }
	},
	{
		id: 'hidream-o1',
		label: 'HiDream-O1 Image',
		provider: 'HiDream',
		weights: 'open',
		model: 'fal-ai/hidream-o1-image/edit',
		kind: 'image-edit',
		artificialAnalysisRank: 24,
		price: '~$0.01',
		priceUsd: 0.01,
		referenceImages: null,
		workflow: 'Open-weight value 1 MP edit',
		description: 'Second-ranked open-weight editor at approximately one cent',
		badge: 'Open #2',
		imageInput: 'reference_image_urls',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/webp', size: '1 MP' },
		settings: { output_format: 'webp', keep_original_aspect: true }
	},
	{
		id: 'qwen-image-edit-2511',
		label: 'Qwen Image Edit 2511',
		provider: 'Alibaba',
		weights: 'open',
		model: 'fal-ai/qwen-image-edit-2511',
		kind: 'image-edit',
		artificialAnalysisRank: 34,
		price: '~$0.03',
		priceUsd: 0.03,
		referenceImages: null,
		workflow: 'Qwen open-weight 1 MP edit',
		description: 'Open-weight Qwen editor with accurate text and subject changes',
		badge: 'Open weights',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/webp', size: '1 MP' },
		settings: { output_format: 'webp' }
	},
	{
		id: 'flux-klein-9b',
		label: 'FLUX.2 [klein] 9B',
		provider: 'Black Forest Labs',
		weights: 'open',
		model: 'fal-ai/flux-2/klein/9b/edit',
		kind: 'image-edit',
		artificialAnalysisRank: 33,
		price: '~$0.022',
		priceUsd: 0.022,
		referenceImages: 4,
		workflow: 'Fast open-weight 1 MP edit',
		description: 'Third-ranked open-weight editor with fast four-step inference',
		badge: 'Open #3',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/webp', size: '1 MP' },
		settings: { output_format: 'webp' }
	},
	{
		id: 'flux-2',
		label: 'FLUX.2 [dev]',
		provider: 'Black Forest Labs',
		weights: 'open',
		model: 'fal-ai/flux-2/edit',
		kind: 'image-edit',
		artificialAnalysisRank: 48,
		price: '~$0.024',
		priceUsd: 0.024,
		referenceImages: 4,
		workflow: 'Budget 1 MP edit',
		description: 'Budget-friendly everyday edits at roughly one megapixel',
		badge: 'Best value',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/webp', size: '1 MP' },
		settings: { output_format: 'webp' }
	},
	{
		id: 'flux-klein-9b-generate',
		label: 'FLUX.2 [klein] 9B',
		provider: 'Black Forest Labs',
		weights: 'open',
		model: 'fal-ai/flux-2/klein/9b',
		kind: 'text-to-image',
		artificialAnalysisRank: null,
		price: '~$0.006',
		priceUsd: 0.006,
		referenceImages: 0,
		workflow: 'Fast open-weight text to image',
		description: 'Generate a new image from your prompt without uploading the canvas image',
		badge: 'Text to image',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/webp', size: '1 MP' },
		settings: { image_size: 'square_hd', output_format: 'webp' }
	},
	{
		id: 'grok-imagine-2-generate',
		label: 'Grok Imagine Image 2.0',
		provider: 'xAI',
		weights: 'closed',
		model: 'xai/grok-imagine-image/v2.0/text-to-image',
		kind: 'text-to-image',
		artificialAnalysisRank: null,
		price: '$0.06',
		priceUsd: 0.06,
		referenceImages: 0,
		workflow: 'Grok 2 medium-quality text to image',
		description: 'Generate an original 1K image from text with no image upload',
		badge: 'Text to image',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/webp', size: '1K' },
		settings: { resolution: '1k', quality: 'medium', aspect_ratio: '1:1', output_format: 'webp' }
	},
	{
		id: 'grok-imagine-video',
		label: 'Grok Imagine Video',
		provider: 'xAI',
		weights: 'closed',
		model: 'xai/grok-imagine-video/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: 11,
		arenaRank: 9,
		price: '~$0.252',
		priceUsd: 0.252,
		referenceImages: 1,
		workflow: 'Budget 5-second image to video',
		description: 'Animate the selected image into a five-second 480p video with audio',
		badge: 'Arena #9 · AA #11',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '480p' },
		settings: { duration: 5, resolution: '480p', aspect_ratio: 'auto' }
	},
	{
		id: 'grok-imagine-video-1-5',
		label: 'Grok Imagine Video 1.5',
		provider: 'xAI',
		weights: 'closed',
		model: 'xai/grok-imagine-video/v1.5/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: 4,
		arenaRank: 5,
		price: '~$0.41',
		priceUsd: 0.41,
		referenceImages: 1,
		workflow: 'Premium 5-second image to video',
		description: 'Animate the selected image with the newest Grok video model and native audio',
		badge: 'Arena #5 · AA #4',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '480p' },
		settings: { duration: 5, resolution: '480p' }
	},
	{
		id: 'minimax-h3-video',
		label: 'MiniMax H3',
		provider: 'MiniMax',
		weights: 'open',
		model: 'minimax/h3/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: 2,
		arenaRank: 1,
		price: '~$0.65',
		priceUsd: 0.65,
		referenceImages: 1,
		workflow: 'Open-weight 5-second 2K video',
		description: 'Arena’s top-ranked video model: open weights, native audio, and 2K output',
		badge: 'Arena #1 · AA #2',
		imageInput: 'image_url',
		input: { maxPixels: 2_073_600, maxEdge: 2048, mimeType: 'image/jpeg', size: '2K' },
		settings: { duration: 5, resolution: '2K', prompt_expansion_mode: 'balanced' }
	},
	{
		id: 'seedance-2-5-video',
		label: 'Seedance 2.5',
		provider: 'ByteDance',
		weights: 'closed',
		model: 'bytedance/seedance-2.5/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: null,
		arenaRank: 2,
		price: '~$1.103',
		priceUsd: 1.1025,
		referenceImages: 1,
		workflow: 'Frontier 5-second 480p video',
		description:
			'Arena’s second-ranked video model with synchronized audio and clips up to 30 seconds',
		badge: 'Arena #2 · New on fal',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '480p' },
		settings: { duration: '5', resolution: '480p', aspect_ratio: 'auto', generate_audio: true }
	},
	{
		id: 'seedance-2-video',
		label: 'Seedance 2.0',
		provider: 'ByteDance',
		weights: 'closed',
		model: 'bytedance/seedance-2.0/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: 1,
		arenaRank: 3,
		price: '~$1.512',
		priceUsd: 1.512,
		referenceImages: 1,
		workflow: 'Top-ranked 5-second 720p video',
		description: 'Artificial Analysis’s top-ranked video model with native audio and strong motion',
		badge: 'AA #1 · Arena #3',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '720p' },
		settings: { duration: '5', resolution: '720p', aspect_ratio: 'auto', generate_audio: true }
	},
	{
		id: 'happy-horse-1-1-video',
		label: 'Happy Horse 1.1',
		provider: 'Alibaba',
		weights: 'closed',
		model: 'alibaba/happy-horse/v1.1/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: 5,
		arenaRank: null,
		price: '$0.70',
		priceUsd: 0.7,
		referenceImages: 1,
		workflow: 'Top-five 5-second 720p video',
		description: 'Top-five video quality with synchronized native audio and multilingual lip sync',
		badge: 'AA #5 · Native audio',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '720p' },
		settings: { duration: 5, resolution: '720p' }
	},
	{
		id: 'happy-horse-video',
		label: 'Happy Horse 1.0',
		provider: 'Alibaba',
		weights: 'closed',
		model: 'alibaba/happy-horse/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: 7,
		arenaRank: 7,
		price: '$0.70',
		priceUsd: 0.7,
		referenceImages: 1,
		workflow: 'Cinematic 5-second 720p video',
		description: 'Cinematic animation with native audio, realistic motion, and precise lip sync',
		badge: 'Arena #7 · AA #7',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '720p' },
		settings: { duration: 5, resolution: '720p' }
	},
	{
		id: 'wan-2-7-video',
		label: 'Wan 2.7',
		provider: 'Alibaba',
		weights: 'closed',
		model: 'fal-ai/wan/v2.7/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: 9,
		arenaRank: 8,
		price: '$0.50',
		priceUsd: 0.5,
		referenceImages: 1,
		workflow: 'Value 5-second 720p video',
		description: 'Top-ten motion quality and visual coherence at ten cents per second',
		badge: 'Arena #8 · AA #9',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '720p' },
		settings: { duration: 5, resolution: '720p' }
	},
	{
		id: 'veo-3-1-video',
		label: 'Veo 3.1',
		provider: 'Google',
		weights: 'closed',
		model: 'fal-ai/veo3.1/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: 8,
		arenaRank: 10,
		price: '$1.60',
		priceUsd: 1.6,
		referenceImages: 1,
		workflow: 'Premium 4-second 720p video',
		description: 'Google’s premium cinematic video model with optional synchronized audio',
		badge: 'AA #8 · Arena #10',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '720p' },
		settings: { duration: '4s', resolution: '720p', aspect_ratio: 'auto', generate_audio: true }
	},
	{
		id: 'veo-3-1-fast-video',
		label: 'Veo 3.1 Fast',
		provider: 'Google',
		weights: 'closed',
		model: 'fal-ai/veo3.1/fast/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: 12,
		arenaRank: 12,
		price: '$0.60',
		priceUsd: 0.6,
		referenceImages: 1,
		workflow: 'Fast 4-second 720p video',
		description: 'Faster, lower-cost Veo video generation with optional synchronized audio',
		badge: 'Arena #12 · AA #12',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '720p' },
		settings: { duration: '4s', resolution: '720p', aspect_ratio: 'auto', generate_audio: true }
	},
	{
		id: 'gemini-omni-flash-video',
		label: 'Gemini Omni Flash',
		provider: 'Google',
		weights: 'closed',
		model: 'google/gemini-omni-flash/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: 3,
		arenaRank: 4,
		price: '~$0.65',
		priceUsd: 0.65,
		referenceImages: 1,
		workflow: 'Top-three 5-second video',
		description:
			'Google’s top-three multimodal video model with native audio and realistic physics',
		badge: 'AA #3 · Arena #4',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '720p' },
		settings: { duration: 5, aspect_ratio: '16:9' }
	},
	{
		id: 'flux-3-video',
		label: 'FLUX 3 Video',
		provider: 'Black Forest Labs',
		weights: 'closed',
		model: 'blackforestlabs/flux-3/image-to-video',
		kind: 'image-to-video',
		artificialAnalysisRank: null,
		arenaRank: 6,
		price: '$0.85',
		priceUsd: 0.85,
		referenceImages: 1,
		workflow: 'Frontier 5-second 720p video',
		description: 'Arena’s sixth-ranked video model with controllable framing and native audio',
		badge: 'Arena #6 · New on fal',
		imageInput: 'image_url',
		input: { maxPixels: 1_048_576, maxEdge: 2048, mimeType: 'image/jpeg', size: '720p' },
		settings: { duration: 5, resolution: '720p', aspect_ratio: 'auto', generate_audio: true }
	}
]);

export const DEFAULT_DRAW_FAL_MODEL = DRAW_FAL_MODELS[0];

/**
 * @typedef {{
 *   key: string,
 *   label: string,
 *   type: 'select' | 'boolean' | 'seed',
 *   options?: readonly (string | number)[]
 * }} DrawingFalParameter
 */

/** @param {string} key @param {string} label @param {readonly (string | number)[]} options */
function selectParameter(key, label, options) {
	return /** @type {DrawingFalParameter} */ ({ key, label, type: 'select', options });
}

/** @type {DrawingFalParameter} */
const SEED_PARAMETER = { key: 'seed', label: 'Seed', type: 'seed' };
/** @type {DrawingFalParameter} */
const AUDIO_PARAMETER = { key: 'generate_audio', label: 'Generate audio', type: 'boolean' };
const STANDARD_ASPECTS = ['auto', '16:9', '4:3', '1:1', '3:4', '9:16'];
const STANDARD_FORMATS = ['webp', 'jpeg', 'png'];
const STANDARD_IMAGE_SIZES = [
	'square_hd',
	'square',
	'portrait_4_3',
	'portrait_16_9',
	'landscape_4_3',
	'landscape_16_9'
];
/** @param {number} start @param {number} end @param {'number' | 'string' | 'seconds'} [format] */
function durations(start, end, format = 'number') {
	return Array.from({ length: end - start + 1 }, (_, index) => {
		const seconds = start + index;
		return format === 'number' ? seconds : format === 'seconds' ? `${seconds}s` : String(seconds);
	});
}

/**
 * Explicitly copied from each endpoint's official OpenAPI schema. Safety,
 * arbitrary file URLs, prompts, and billing identifiers are never overridable.
 *
 * @type {Record<string, DrawingFalParameter[]>}
 */
const DRAW_FAL_PARAMETER_ALLOWLIST = {
	'nano-banana-2': [
		selectParameter('resolution', 'Resolution', ['0.5K', '1K', '2K', '4K']),
		selectParameter('aspect_ratio', 'Aspect ratio', STANDARD_ASPECTS),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS),
		SEED_PARAMETER
	],
	'reve-2-1': [
		selectParameter('aspect_ratio', 'Aspect ratio', STANDARD_ASPECTS),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS)
	],
	'gpt-image-2': [
		selectParameter('quality', 'Quality', ['auto', 'low', 'medium', 'high']),
		selectParameter('image_size', 'Image size', ['auto', ...STANDARD_IMAGE_SIZES]),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS)
	],
	'grok-imagine-2': [
		selectParameter('resolution', 'Resolution', ['1k', '2k']),
		selectParameter('quality', 'Quality', ['low', 'medium']),
		selectParameter('aspect_ratio', 'Aspect ratio', STANDARD_ASPECTS),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS)
	],
	'seedream-5-pro': [
		selectParameter('image_size', 'Image size', ['auto_1K', 'auto_2K', ...STANDARD_IMAGE_SIZES]),
		selectParameter('output_format', 'Output format', ['jpeg', 'png'])
	],
	'nano-banana-pro': [
		selectParameter('resolution', 'Resolution', ['1K', '2K', '4K']),
		selectParameter('aspect_ratio', 'Aspect ratio', STANDARD_ASPECTS),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS),
		SEED_PARAMETER
	],
	'ideogram-v4': [
		selectParameter('image_size', 'Image size', ['auto', ...STANDARD_IMAGE_SIZES]),
		selectParameter('rendering_speed', 'Rendering speed', ['TURBO', 'BALANCED', 'QUALITY']),
		selectParameter('output_format', 'Output format', ['jpeg', 'png']),
		SEED_PARAMETER
	],
	'hunyuan-3-instruct': [
		selectParameter('image_size', 'Image size', ['auto', ...STANDARD_IMAGE_SIZES]),
		selectParameter('output_format', 'Output format', ['jpeg', 'png']),
		SEED_PARAMETER
	],
	'hidream-o1': [
		selectParameter('image_size', 'Image size', STANDARD_IMAGE_SIZES),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS),
		SEED_PARAMETER
	],
	'qwen-image-edit-2511': [
		selectParameter('image_size', 'Image size', STANDARD_IMAGE_SIZES),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS),
		SEED_PARAMETER
	],
	'flux-klein-9b': [
		selectParameter('image_size', 'Image size', STANDARD_IMAGE_SIZES),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS),
		SEED_PARAMETER
	],
	'flux-2': [
		selectParameter('image_size', 'Image size', STANDARD_IMAGE_SIZES),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS),
		SEED_PARAMETER
	],
	'flux-klein-9b-generate': [
		selectParameter('image_size', 'Image size', STANDARD_IMAGE_SIZES),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS),
		SEED_PARAMETER
	],
	'grok-imagine-2-generate': [
		selectParameter('resolution', 'Resolution', ['1k', '2k']),
		selectParameter('quality', 'Quality', ['low', 'medium']),
		selectParameter(
			'aspect_ratio',
			'Aspect ratio',
			STANDARD_ASPECTS.filter((ratio) => ratio !== 'auto')
		),
		selectParameter('output_format', 'Output format', STANDARD_FORMATS)
	],
	'grok-imagine-video': [
		selectParameter('duration', 'Duration', durations(1, 15)),
		selectParameter('resolution', 'Resolution', ['480p', '720p']),
		selectParameter('aspect_ratio', 'Aspect ratio', STANDARD_ASPECTS)
	],
	'grok-imagine-video-1-5': [
		selectParameter('duration', 'Duration', durations(1, 15)),
		selectParameter('resolution', 'Resolution', ['480p', '720p', '1080p'])
	],
	'minimax-h3-video': [
		selectParameter('duration', 'Duration', durations(5, 15)),
		selectParameter('resolution', 'Resolution', ['480P', '768P', '2K', '4K']),
		selectParameter('prompt_expansion_mode', 'Prompt expansion', [
			'disabled',
			'fast',
			'balanced',
			'quality'
		]),
		SEED_PARAMETER
	],
	'seedance-2-5-video': [
		selectParameter('duration', 'Duration', durations(4, 30, 'string')),
		selectParameter('resolution', 'Resolution', ['480p', '720p', '1080p']),
		AUDIO_PARAMETER
	],
	'seedance-2-video': [
		selectParameter('duration', 'Duration', durations(4, 15, 'string')),
		selectParameter('resolution', 'Resolution', ['480p', '720p', '1080p', '4k']),
		selectParameter('aspect_ratio', 'Aspect ratio', STANDARD_ASPECTS),
		AUDIO_PARAMETER
	],
	'happy-horse-1-1-video': [
		selectParameter('duration', 'Duration', durations(3, 15)),
		selectParameter('resolution', 'Resolution', ['720p', '1080p']),
		SEED_PARAMETER
	],
	'happy-horse-video': [
		selectParameter('duration', 'Duration', durations(3, 15)),
		selectParameter('resolution', 'Resolution', ['720p', '1080p']),
		SEED_PARAMETER
	],
	'wan-2-7-video': [
		selectParameter('duration', 'Duration', durations(2, 15)),
		selectParameter('resolution', 'Resolution', ['720p', '1080p']),
		SEED_PARAMETER
	],
	'veo-3-1-video': [
		selectParameter('duration', 'Duration', ['4s', '6s', '8s']),
		selectParameter('resolution', 'Resolution', ['720p', '1080p', '4k']),
		selectParameter('aspect_ratio', 'Aspect ratio', ['auto', '16:9', '9:16']),
		AUDIO_PARAMETER,
		SEED_PARAMETER
	],
	'veo-3-1-fast-video': [
		selectParameter('duration', 'Duration', ['4s', '6s', '8s']),
		selectParameter('resolution', 'Resolution', ['720p', '1080p', '4k']),
		selectParameter('aspect_ratio', 'Aspect ratio', ['auto', '16:9', '9:16']),
		AUDIO_PARAMETER,
		SEED_PARAMETER
	],
	'gemini-omni-flash-video': [
		selectParameter('duration', 'Duration', durations(3, 10)),
		selectParameter('aspect_ratio', 'Aspect ratio', ['16:9', '9:16'])
	],
	'flux-3-video': [
		selectParameter('duration', 'Duration', durations(5, 20)),
		selectParameter('resolution', 'Resolution', ['720p', '1080p']),
		selectParameter('aspect_ratio', 'Aspect ratio', STANDARD_ASPECTS),
		AUDIO_PARAMETER
	]
};

/** @param {typeof DRAW_FAL_MODELS[number]} model */
export function getDrawFalModelParameters(model) {
	return DRAW_FAL_PARAMETER_ALLOWLIST[model.id] ?? [];
}

/** @param {string} key @param {unknown} value */
function normalizedParameterValue(key, value) {
	if (key === 'duration' && typeof value !== 'boolean') return String(value).replace(/s$/i, '');
	return typeof value === 'string' ? value.toLowerCase() : String(value);
}

/**
 * Convert shared modality controls into the selected endpoint's exact schema.
 * Unsupported controls and choices are safely ignored for mixed-model batches.
 *
 * @param {typeof DRAW_FAL_MODELS[number]} model
 * @param {Record<string, unknown>} overrides
 */
export function getDrawFalModelOverrides(model, overrides) {
	/** @type {Record<string, string | number | boolean>} */
	const accepted = {};
	for (const parameter of getDrawFalModelParameters(model)) {
		if (!Object.hasOwn(overrides, parameter.key)) continue;
		const requested = overrides[parameter.key];
		if (parameter.type === 'boolean') {
			if (typeof requested === 'boolean') accepted[parameter.key] = requested;
			continue;
		}
		if (parameter.type === 'seed') {
			if (
				typeof requested === 'number' &&
				Number.isSafeInteger(requested) &&
				requested >= 0 &&
				requested <= 2_147_483_647
			) {
				accepted[parameter.key] = requested;
			}
			continue;
		}
		const match = parameter.options?.find(
			(option) =>
				normalizedParameterValue(parameter.key, option) ===
				normalizedParameterValue(parameter.key, requested)
		);
		if (match !== undefined) accepted[parameter.key] = match;
	}
	return accepted;
}

/**
 * Strict server-side validation: no silent coercion, unsupported keys, safety
 * overrides, file URLs, provider credentials, or prototype pollution.
 *
 * @param {typeof DRAW_FAL_MODELS[number]} model
 * @param {unknown} overrides
 */
export function resolveDrawFalModelSettings(model, overrides = {}) {
	if (
		!overrides ||
		typeof overrides !== 'object' ||
		Array.isArray(overrides) ||
		Object.keys(overrides).length > 8
	) {
		throw new Error('The selected model settings are invalid.');
	}
	const requested = /** @type {Record<string, unknown>} */ (overrides);
	const allowed = getDrawFalModelParameters(model);
	for (const [key, value] of Object.entries(requested)) {
		const parameter = allowed.find((entry) => entry.key === key);
		if (!parameter) throw new Error(`This model does not support the ${key} setting.`);
		if (parameter.type === 'boolean' && typeof value !== 'boolean') {
			throw new Error(`The ${parameter.label.toLowerCase()} setting is invalid.`);
		}
		if (
			parameter.type === 'seed' &&
			(typeof value !== 'number' ||
				!Number.isSafeInteger(value) ||
				value < 0 ||
				value > 2_147_483_647)
		) {
			throw new Error('The seed must be an integer from 0 to 2,147,483,647.');
		}
		if (parameter.type === 'select' && !parameter.options?.some((option) => option === value)) {
			throw new Error(
				`The selected ${parameter.label.toLowerCase()} is not available for this model.`
			);
		}
	}
	return { ...model.settings, ...requested };
}

/** @param {typeof DRAW_FAL_MODELS[number]} model @param {Record<string, unknown>} [settings] */
export function estimateDrawFalModelCost(model, settings = model.settings) {
	if (model.kind !== 'image-to-video') {
		if (model.id === 'nano-banana-2') {
			const multipliers = /** @type {Record<string, number>} */ ({
				'0.5K': 0.75,
				'1K': 1,
				'2K': 1.5,
				'4K': 2
			});
			return 0.08 * (multipliers[String(settings.resolution)] ?? 1);
		}
		if (model.id === 'nano-banana-pro') {
			return settings.resolution === '4K' ? 0.3 : 0.15;
		}
		if (model.id === 'gpt-image-2') {
			return (
				/** @type {Record<string, number>} */ ({ low: 0.015, medium: 0.061, high: 0.219 })[
					String(settings.quality)
				] ?? 0.219
			);
		}
		if (model.id === 'grok-imagine-2' || model.id === 'grok-imagine-2-generate') {
			const quality = settings.quality === 'low' ? 'low' : 'medium';
			const resolution = settings.resolution === '2k' ? '2k' : '1k';
			const price = /** @type {Record<string, Record<string, number>>} */ ({
				'1k': { low: 0.04, medium: 0.06 },
				'2k': { low: 0.06, medium: 0.08 }
			})[resolution][quality];
			return price + (model.kind === 'image-edit' ? 0.01 : 0);
		}
		return model.priceUsd;
	}
	const duration = Number.parseInt(String(settings.duration), 10);
	if (model.id === 'gemini-omni-flash-video' && Number.isSafeInteger(duration)) {
		return Math.round(duration * 0.13 * 10_000) / 10_000;
	}
	const resolution = String(settings.resolution).toLowerCase();
	const rates = /** @type {Record<string, Record<string, number>>} */ ({
		'grok-imagine-video': { '480p': 0.05, '720p': 0.07 },
		'grok-imagine-video-1-5': { '480p': 0.08, '720p': 0.14, '1080p': 0.25 },
		'minimax-h3-video': { '480p': 0.05, '768p': 0.08, '2k': 0.13, '4k': 0.16 },
		'seedance-2-5-video': { '480p': 0.2205, '720p': 0.473, '1080p': 1.1372 },
		'seedance-2-video': { '480p': 0.1406, '720p': 0.3024, '1080p': 0.682, '4k': 1.5552 },
		'happy-horse-1-1-video': { '720p': 0.14, '1080p': 0.18 },
		'happy-horse-video': { '720p': 0.14, '1080p': 0.28 },
		'wan-2-7-video': { '720p': 0.1, '1080p': 0.15 },
		'veo-3-1-video': { '720p': 0.2, '1080p': 0.2, '4k': 0.4 },
		'veo-3-1-fast-video': { '720p': 0.1, '1080p': 0.1, '4k': 0.3 },
		'flux-3-video': { '720p': 0.17, '1080p': 0.29 }
	});
	let rate = rates[model.id]?.[resolution];
	if (rate === undefined || !Number.isSafeInteger(duration) || duration < 1) return model.priceUsd;
	if (settings.generate_audio === true) {
		if (model.id === 'veo-3-1-video') rate += 0.2;
		if (model.id === 'veo-3-1-fast-video') rate += 0.05;
	}
	const imageFee =
		model.id === 'grok-imagine-video' ? 0.002 : model.id === 'grok-imagine-video-1-5' ? 0.01 : 0;
	return Math.round((duration * rate + imageFee) * 10_000) / 10_000;
}

/** @param {unknown} id */
export function getDrawFalModel(id) {
	return DRAW_FAL_MODELS.find((model) => model.id === id);
}
