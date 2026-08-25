export const DRAW_DESIGN_FORMATS = /** @type {const} */ ([
	{ id: 'youtube', label: 'YouTube thumbnail', width: 1280, height: 720 },
	{ id: 'social', label: 'Social landscape', width: 1200, height: 630 },
	{ id: 'square', label: 'Square post', width: 1080, height: 1080 },
	{ id: 'portrait', label: 'Speaker portrait', width: 1080, height: 1350 },
	{ id: 'story', label: 'Vertical story', width: 1080, height: 1920 },
	{ id: 'slide', label: 'Presentation slide', width: 1920, height: 1080 }
]);

export const DRAW_AGENT_WORKFLOWS = /** @type {const} */ ([
	{
		id: 'ls-thumbnail',
		label: 'Podcast thumbnail',
		prompt:
			'Create a Latent Space YouTube thumbnail using the ls-podcast design template. Keep the official logo, near-black background, one huge 2–6 word curiosity hook, acid-lime emphasis, an editable guest-photo placeholder, company rail, and empty bottom-right YouTube timestamp zone. Inspect the result and improve spacing.'
	},
	{
		id: 'fde-variants',
		label: 'Thumbnail A/B variants',
		prompt:
			'Create an FDE episode thumbnail using the fde-decision design template, then duplicate its artboard into two additional variants. Give each variant a meaningfully different curiosity hook while keeping the brand, guest coverage, company rail, and timestamp-safe lower-right corner. Inspect all three visible designs.'
	},
	{
		id: 'speaker-card',
		label: 'Speaker announcement',
		prompt:
			'Create an AI Engineer conference speaker announcement using the aie-speaker design template. Use a bold orange-and-ink identity, prominent speaker name, editable talk-title placeholder, strong photo region, clear hierarchy, and 1080 × 1350 social-post dimensions.'
	},
	{
		id: 'blog-banner',
		label: 'Article launch banner',
		prompt:
			'Create a compelling article launch banner using the blog-launch design template. Use one oversized editorial hook, a short supporting line, restrained purple accents, an editable visual placeholder, and an exact 1200 × 630 social-sharing artboard.'
	},
	{
		id: 'event-slide',
		label: 'Presentation slide',
		prompt:
			'Create a polished 1920 × 1080 presentation title slide using the keynote-slide design template. Include a dominant editable title, short subtitle, speaker/company line, confident spacing, and a minimal visual accent.'
	},
	{
		id: 'repurpose-square',
		label: 'Resize for social',
		prompt:
			'Inspect the visible design artboards, duplicate the most relevant one, resize the duplicate to the square format, and improve its title, portrait, and branding placement for a 1080 × 1080 social post. Preserve the original.'
	}
]);

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   description: string,
 *   format: typeof DRAW_DESIGN_FORMATS[number]['id'],
 *   brand: 'latent-space' | 'ai-engineer' | 'editorial',
 *   accent: string,
 *   background: string
 * }} DrawDesignTemplate
 */

/** @type {readonly DrawDesignTemplate[]} */
export const DRAW_DESIGN_TEMPLATES = Object.freeze([
	{
		id: 'ls-podcast',
		label: 'Latent Space thumbnail',
		description: 'Official logo, guest portrait, curiosity hook, and timestamp-safe company rail.',
		format: 'youtube',
		brand: 'latent-space',
		accent: '#c8ff47',
		background: '#111019'
	},
	{
		id: 'fde-decision',
		label: 'FDE episode thumbnail',
		description: 'A sharp split-layout debate with LS × FDE branding and editable cast area.',
		format: 'youtube',
		brand: 'latent-space',
		accent: '#b9a1ff',
		background: '#13101d'
	},
	{
		id: 'aie-speaker',
		label: 'AI Engineer speaker card',
		description: 'Portrait-format conference announcement with a bold orange speaker treatment.',
		format: 'portrait',
		brand: 'ai-engineer',
		accent: '#ff6b35',
		background: '#151515'
	},
	{
		id: 'blog-launch',
		label: 'Article launch banner',
		description: 'An editorial social-sharing hero with big type and a product visual.',
		format: 'social',
		brand: 'editorial',
		accent: '#a78bfa',
		background: '#111827'
	},
	{
		id: 'keynote-slide',
		label: 'Conference title slide',
		description: 'A spacious 16:9 presentation slide with a strong title and speaker line.',
		format: 'slide',
		brand: 'ai-engineer',
		accent: '#ff6b35',
		background: '#101114'
	}
]);

/** @param {string} id */
export function getDrawingDesignFormat(id) {
	return DRAW_DESIGN_FORMATS.find((format) => format.id === id);
}

/** @param {string} id */
export function getDrawingDesignTemplate(id) {
	return DRAW_DESIGN_TEMPLATES.find((template) => template.id === id);
}

function id() {
	return `design-${crypto.randomUUID()}`;
}

/** @param {number} x @param {number} y @param {number} width @param {number} height @param {string} color @param {{ stroke?: string, dashed?: boolean, opacity?: number }} [options] */
function rectangle(x, y, width, height, color, options = {}) {
	return {
		id: id(),
		type: 'rectangle',
		x,
		y,
		width,
		height,
		strokeColor: options.stroke ?? color,
		backgroundColor: color,
		fillStyle: 'solid',
		strokeWidth: options.stroke ? 2 : 1,
		strokeStyle: options.dashed ? 'dashed' : 'solid',
		roughness: 0,
		opacity: options.opacity ?? 100,
		roundness: null
	};
}

/** @param {number} x @param {number} y @param {string} content @param {number} size @param {string} color @param {{ width?: number, align?: 'left' | 'center' }} [options] */
function text(x, y, content, size, color, options = {}) {
	return {
		id: id(),
		type: 'text',
		x,
		y,
		text: content,
		fontSize: size,
		fontFamily: 2,
		strokeColor: color,
		strokeWidth: 1,
		strokeStyle: 'solid',
		roughness: 0,
		textAlign: options.align ?? 'left',
		...(options.width ? { width: options.width } : {})
	};
}

/** @param {string} headline @param {number} preferredSize */
function fitThumbnailHeadline(headline, preferredSize) {
	const availableWidth = 700;
	const availableHeight = 225;
	let size = preferredSize;
	let lines = [headline];
	for (let attempt = 0; attempt < 3; attempt++) {
		const charactersPerLine = Math.max(8, Math.floor(availableWidth / (size * 0.58)));
		lines = headline.split('\n').flatMap((paragraph) => {
			/** @type {string[]} */
			const wrapped = [];
			for (const word of paragraph.trim().split(/\s+/)) {
				const previous = wrapped.at(-1);
				if (previous && previous.length + word.length + 1 <= charactersPerLine) {
					wrapped[wrapped.length - 1] = `${previous} ${word}`;
				} else wrapped.push(word);
			}
			return wrapped;
		});
		const longest = Math.max(...lines.map((line) => line.length));
		const fittedSize = Math.min(
			preferredSize,
			Math.floor(availableWidth / (longest * 0.58)),
			Math.floor(availableHeight / (lines.length * 1.25))
		);
		if (fittedSize >= size) break;
		size = fittedSize;
	}
	return { text: lines.join('\n'), size };
}

/** @param {number} x @param {number} y @param {number} width @param {number} height @param {string} accent */
function portraitPlaceholder(x, y, width, height, accent) {
	return [
		rectangle(x, y, width, height, '#211f2c', { stroke: accent, dashed: true }),
		{
			id: id(),
			type: 'ellipse',
			x: x + width / 2 - 46,
			y: y + height * 0.3,
			width: 92,
			height: 92,
			strokeColor: accent,
			backgroundColor: '#302d3c',
			fillStyle: 'solid',
			strokeWidth: 2,
			strokeStyle: 'solid',
			roughness: 0
		},
		text(x + Math.max(22, (width - 190) / 2), y + height * 0.7, 'DROP GUEST PHOTO', 16, '#c2bed0')
	];
}

/**
 * Build a native Excalidraw frame with independently editable children. Logo
 * images are attached separately from the official supplied brand asset.
 * @param {string} templateId
 * @param {{ headline?: string, subtitle?: string, name?: string, companies?: string, logoFileId?: string, x?: number, y?: number }} [options]
 */
export function createDrawingDesign(templateId, options = {}) {
	const template = getDrawingDesignTemplate(templateId);
	if (!template) throw new Error('Choose one of the available design templates.');
	const format = getDrawingDesignFormat(template.format);
	if (!format) throw new Error('The design template has an invalid artboard format.');
	const ox = options.x ?? 0;
	const oy = options.y ?? 0;
	const { width, height } = format;
	/** @type {any[]} */
	let children = [rectangle(ox, oy, width, height, template.background)];
	const headline = options.headline?.trim().slice(0, 120);
	const subtitle = options.subtitle?.trim().slice(0, 140);
	const companies = options.companies?.trim().slice(0, 100) ?? 'COMPANY ONE   ·   COMPANY TWO';
	if (templateId === 'ls-podcast' || templateId === 'fde-decision') {
		const fde = templateId === 'fde-decision';
		const fittedHeadline = fitThumbnailHeadline(
			headline ?? (fde ? 'WHAT CHANGES\nWHEN AI SHIPS?' : 'YOUR SHARPEST\nIDEA HERE'),
			fde ? 76 : 86
		);
		children.push(
			rectangle(ox + 64, oy + 103, 64, 7, template.accent),
			text(ox + 66, oy + 140, fittedHeadline.text, fittedHeadline.size, '#ffffff'),
			text(
				ox + 68,
				oy + 387,
				fde ? 'THE BET THAT MATTERS' : 'THE AI ENGINEER PODCAST',
				22,
				template.accent
			),
			text(ox + 68, oy + 450, subtitle ?? 'One specific idea worth clicking.', 19, '#bcb8c7'),
			...portraitPlaceholder(ox + 790, oy + 135, 400, 440, template.accent),
			rectangle(ox + 64, oy + 614, 926, 2, '#373442'),
			text(ox + 69, oy + 640, companies, 17, '#e3e0ed'),
			text(
				ox + 1030,
				oy + 57,
				fde ? 'LATENT SPACE × FDE' : 'LATENT SPACE',
				fde ? 12 : 15,
				'#ffffff'
			)
		);
		if (options.logoFileId) {
			children.push({
				id: id(),
				type: 'image',
				x: ox + 970,
				y: oy + 38,
				width: 50,
				height: 50,
				fileId: options.logoFileId,
				status: 'saved'
			});
		}
	} else if (templateId === 'aie-speaker') {
		children.push(
			rectangle(ox, oy, width, 28, template.accent),
			text(ox + 74, oy + 85, 'AI ENGINEER', 29, '#ffffff'),
			text(ox + 75, oy + 130, 'EUROPE', 22, template.accent),
			...portraitPlaceholder(ox + 96, oy + 223, 888, 690, template.accent),
			text(ox + 78, oy + 964, headline ?? 'SPEAKER\nNAME', 92, '#ffffff'),
			text(ox + 82, oy + 1190, subtitle ?? 'The talk title goes here', 29, '#d2ced5'),
			rectangle(ox + 80, oy + 1280, 116, 5, template.accent)
		);
	} else if (templateId === 'blog-launch') {
		children.push(
			rectangle(ox + 68, oy + 85, 57, 7, template.accent),
			text(ox + 67, oy + 126, headline ?? 'THE IDEA\nTHAT CHANGES\nEVERYTHING', 68, '#ffffff'),
			text(ox + 70, oy + 421, subtitle ?? 'A new essay from swyx', 23, '#c4b9e9'),
			rectangle(ox + 715, oy + 91, 414, 416, '#1d1730', { stroke: '#504274' }),
			text(ox + 784, oy + 281, 'DROP VISUAL', 22, '#b5a4ef'),
			text(ox + 70, oy + 565, 'SWYX.IO', 17, '#f2efff')
		);
	} else {
		children.push(
			rectangle(ox + 112, oy + 138, 90, 9, template.accent),
			text(ox + 110, oy + 206, headline ?? 'THE NEXT\nWAVE OF AI\nENGINEERING', 130, '#ffffff'),
			text(
				ox + 116,
				oy + 760,
				subtitle ?? 'Speaker name  ·  Company  ·  AI Engineer',
				35,
				'#bfc0c5'
			),
			rectangle(ox + 1470, oy + 251, 270, 270, '#211913', { stroke: template.accent }),
			rectangle(ox + 1525, oy + 306, 160, 160, '#392216', { stroke: template.accent }),
			text(ox + 1265, oy + 965, 'AI ENGINEER CONFERENCE', 24, '#e8e8e8')
		);
	}
	const frameId = id();
	const frame = {
		id: frameId,
		type: 'frame',
		x: ox,
		y: oy,
		width,
		height,
		name: options.name?.trim().slice(0, 100) || template.label,
		children: children.map((element) => element.id)
	};
	return { template, format, frameId, elements: [...children, frame] };
}
