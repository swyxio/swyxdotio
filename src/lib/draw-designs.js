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
			'Create a Latent Space YouTube thumbnail using the ls-podcast design template. Keep the official logo, near-black background, one huge 2–6 word curiosity hook, acid-lime emphasis, a large real guest photo, a high-contrast claim, any explicitly supplied companies, and empty bottom-right YouTube timestamp zone. Inspect the result and improve spacing.'
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
		description:
			'Big claim + guest. Tight portrait, oversized headline, and one red emphasis band.',
		format: 'youtube',
		brand: 'latent-space',
		accent: '#c8ff47',
		background: '#111019'
	},
	{
		id: 'fde-decision',
		label: 'FDE episode thumbnail',
		description:
			'Comparison + guest. A bright before/after contrast with a large central portrait.',
		format: 'youtube',
		brand: 'latent-space',
		accent: '#b9a1ff',
		background: '#f7f7f4'
	},
	{
		id: 'thumbnail-evidence',
		label: 'Evidence + reaction thumbnail',
		description:
			'A concrete detail beside a guest. Editable sample instructions, a red arrow, and one question.',
		format: 'youtube',
		brand: 'latent-space',
		accent: '#ff293b',
		background: '#121317'
	},
	{
		id: 'aie-speaker',
		label: 'AI Engineer speaker card',
		description:
			'Portrait announcement concept, not an approved AI Engineer video-thumbnail style.',
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
		fontFamily: size >= 60 ? 7 : 2,
		lineHeight: size >= 60 ? 1.05 : 1.25,
		strokeColor: color,
		strokeWidth: 1,
		strokeStyle: 'solid',
		roughness: 0,
		textAlign: options.align ?? 'left',
		...(options.width ? { width: options.width } : {})
	};
}

/** @param {string} headline @param {number} preferredSize */
function fitThumbnailHeadline(
	headline,
	preferredSize,
	availableWidth = 610,
	availableHeight = 380
) {
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

/** Public demo asset, already published in /about/photos. Never a private library photo. */
export const DRAW_DESIGN_DEMO_PHOTO = Object.freeze({
	id: 'draw-public-swyx-headshot',
	url: '/about-photos/headshot-transparent.webp',
	width: 420,
	height: 420
});

/** @typedef {{ fileId: string, width: number, height: number }} DesignPhoto */

/** Center-crop in the native image layer; its original bytes stay available for recropping.
 * @param {number} x @param {number} y @param {number} width @param {number} height @param {DesignPhoto} photo */
function portrait(x, y, width, height, photo) {
	const scale = Math.max(width / photo.width, height / photo.height);
	const cropWidth = width / scale;
	const cropHeight = height / scale;
	return {
		id: id(),
		type: 'image',
		x,
		y,
		width,
		height,
		fileId: photo.fileId,
		status: 'saved',
		scale: [1, 1],
		crop: {
			x: (photo.width - cropWidth) / 2,
			y: (photo.height - cropHeight) / 2,
			width: cropWidth,
			height: cropHeight,
			naturalWidth: photo.width,
			naturalHeight: photo.height
		},
		customData: { designRole: 'guest-photo' }
	};
}

/** @param {number} x @param {number} y @param {number[][]} points @param {string} color @param {number} [width] @param {boolean} [arrow] */
function stroke(x, y, points, color, width = 14, arrow = false) {
	return {
		id: id(),
		type: arrow ? 'arrow' : 'line',
		x,
		y,
		points,
		strokeColor: color,
		strokeWidth: width,
		roughness: 0,
		endArrowhead: arrow ? 'triangle' : null
	};
}

/**
 * Build a native Excalidraw frame with independently editable children. Logo
 * images are attached separately from the official supplied brand asset.
 * @param {string} templateId
 * @param {{ headline?: string, subtitle?: string, name?: string, companies?: string, logoFileId?: string, photo?: DesignPhoto, x?: number, y?: number }} [options]
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
	const companies = options.companies?.trim().slice(0, 100);
	const photo = options.photo ?? { fileId: DRAW_DESIGN_DEMO_PHOTO.id, ...DRAW_DESIGN_DEMO_PHOTO };
	if (
		!Number.isFinite(photo.width) ||
		!Number.isFinite(photo.height) ||
		photo.width <= 0 ||
		photo.height <= 0
	)
		throw new Error('Choose a photo with valid dimensions.');
	if (template.format === 'youtube') {
		if (templateId === 'ls-podcast') {
			// A face at feed scale, a single claim, and one meaningful emphasis color.
			children.push(portrait(ox + 640, oy + 80, 640, 640, photo));
			const fitted = fitThumbnailHeadline(headline || 'CODE IS\nTHE EASY\nPART.', 122, 605, 435);
			const lines = fitted.text.split('\n');
			const lineHeight = fitted.size * 1.05;
			const emphasisY = oy + 130 + (lines.length - 1) * lineHeight;
			children.push(
				rectangle(
					ox + 44,
					emphasisY - 2,
					Math.min(604, (lines.at(-1)?.length ?? 0) * fitted.size * 0.65 + 28),
					lineHeight + 6,
					'#ed1835'
				),
				{
					...text(ox + 54, oy + 130, fitted.text, fitted.size, '#ffffff'),
					customData: { designRole: 'headline' }
				}
			);
		} else if (templateId === 'fde-decision') {
			// Three clear regions: two opposing labels and a real person between them.
			children.push(portrait(ox + 350, oy + 120, 580, 600, photo));
			const fitted = fitThumbnailHeadline(headline || 'WHAT ACTUALLY WORKS?', 76, 1080, 90);
			children.push(
				{
					...text(ox + 44, oy + 35, fitted.text, fitted.size, '#111114'),
					customData: { designRole: 'headline' }
				},
				text(ox + 46, oy + 280, 'MORE', 38, '#77777c'),
				text(ox + 42, oy + 330, 'PROMPTS', 68, '#d72032'),
				text(ox + 951, oy + 280, 'BETTER', 38, '#77777c'),
				text(ox + 935, oy + 330, 'SYSTEMS', 65, '#15834b'),
				stroke(
					ox + 138,
					oy + 465,
					[
						[0, 0],
						[84, 84]
					],
					'#e42b3e',
					20
				),
				stroke(
					ox + 222,
					oy + 465,
					[
						[0, 0],
						[-84, 84]
					],
					'#e42b3e',
					20
				),
				stroke(
					ox + 1030,
					oy + 510,
					[
						[0, 0],
						[30, 30],
						[100, -56]
					],
					'#15834b',
					20
				)
			);
		} else {
			// An explicitly labelled sample document, not a fabricated screenshot or quote.
			const fitted = fitThumbnailHeadline(headline || 'TOO MUCH\nCONTEXT?', 112, 730, 245);
			children.push(
				{
					...text(ox + 44, oy + 50, fitted.text, fitted.size, '#ffffff'),
					customData: { designRole: 'headline' }
				},
				rectangle(ox + 44, oy + 340, 692, 294, '#f5f5f3'),
				{ ...text(ox + 76, oy + 366, 'AGENTS.md', 36, '#16171c'), fontFamily: 3 },
				rectangle(ox + 76, oy + 422, 600, 2, '#d5d5d5'),
				{
					...text(
						ox + 76,
						oy + 450,
						'Keep it short.\nUse the right tools.\nCheck your work.',
						32,
						'#34353a'
					),
					fontFamily: 3
				},
				stroke(
					ox + 672,
					oy + 295,
					[
						[0, 0],
						[25, 55],
						[-28, 102]
					],
					'#ff293b',
					15,
					true
				),
				portrait(ox + 742, oy + 135, 538, 585, photo)
			);
		}
		// The compact identity is constant; the composition does not have to be purple.
		if (options.logoFileId)
			children.push({
				id: id(),
				type: 'image',
				x: ox + 1168,
				y: oy + 26,
				width: 50,
				height: 50,
				fileId: options.logoFileId,
				status: 'saved',
				customData: { designRole: 'brand-logo' }
			});
		if (templateId === 'fde-decision')
			children.push(text(ox + 1222, oy + 43, 'FDE', 16, '#19191d'));
		if (subtitle)
			children.push(
				text(ox + 50, oy + 644, subtitle, 19, templateId === 'fde-decision' ? '#303037' : '#eeeeee')
			);
		if (companies)
			children.push(
				text(
					ox + 50,
					oy + 680,
					companies,
					16,
					templateId === 'fde-decision' ? '#303037' : '#eeeeee'
				)
			);
	} else if (templateId === 'aie-speaker') {
		children.push(
			rectangle(ox, oy, width, 28, template.accent),
			text(ox + 74, oy + 85, 'AI ENGINEER', 29, '#ffffff'),
			text(ox + 75, oy + 130, 'EUROPE', 22, template.accent),
			portrait(ox + 160, oy + 223, 760, 690, photo),
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
