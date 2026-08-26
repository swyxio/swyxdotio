/** Shared LS editorial diagram parts. Native geometry stays editable; authentic
 * logos are separate, bundled image layers (never a flattened diagram).
 */
import logos from './draw-assets/logos.json' with { type: 'json' };
import { shape, rect, oval, path, label, group, move } from './draw-illustration.js';

/** @typedef {import('./draw-presets.js').PresetShape} Shape */
export const LS_DIAGRAM = Object.freeze({
	ink: '#211a2b',
	purple: '#a358ff',
	lilac: '#e9d8ff',
	pale: '#f7f1ff',
	violet: '#c790ff',
	pink: '#f5d9ed',
	blue: '#dddafa',
	paper: '#ffffff',
	muted: '#6b6175',
	border: '#a99eb4'
});
const C = LS_DIAGRAM;
export const DRAW_DIAGRAM_LOGOS = logos;

/** @param {number} x @param {number} y @param {number} w @param {number} h @param {string} [fill] @returns {Shape} */
export function diagramBox(x, y, w, h, fill = C.paper) {
	return { ...rect(x, y, w, h, fill), strokeColor: C.ink, strokeWidth: 2.6 };
}
/** @param {number} x @param {number} y @param {string} text @param {number} [size] @param {boolean} [bold] @param {string} [color] @returns {Shape} */
export function diagramText(x, y, text, size = 18, bold = false, color = C.ink) {
	return { ...label(x, y, text, size, color), fontFamily: bold ? 7 : 2 };
}
/** Centered captions use native text alignment, not hand-estimated character widths.
 * @param {number} x @param {number} y @param {number} width @param {string} text @param {number} [size] @param {boolean} [bold] @param {string} [color] */
export function diagramCaption(x, y, width, text, size = 18, bold = false, color = C.ink) {
	return {
		// Excalidraw skeletons treat x as the alignment anchor for centered text.
		...diagramText(x + width / 2, y, text, size, bold, color),
		width,
		textAlign: /** @type {const} */ ('center')
	};
}
/** @param {string} slug @param {number} x @param {number} y @param {number} size @returns {Shape} */
export function diagramLogo(slug, x, y, size) {
	const asset = logos.find((a) => a.slug === slug);
	if (!asset) throw new Error(`Unknown diagram logo: ${slug}`);
	const width = size * Math.min(1, asset.aspectRatio);
	const height = size / Math.max(1, asset.aspectRatio);
	return shape('image', x + (size - width) / 2, y + (size - height) / 2, {
		width,
		height,
		fileId: asset.id,
		scale: [1, 1],
		status: 'saved',
		strokeWidth: 0
	});
}
/** Only referenced, locally bundled files. Both menu and assistant insertions use this.
 * @param {readonly { fileId?: string }[]} shapes
 * @returns {import('@excalidraw/excalidraw/types').BinaryFileData[]} */
export function diagramFiles(shapes) {
	const ids = new Set(shapes.map((s) => s.fileId).filter(Boolean));
	return logos
		.filter((a) => ids.has(a.id))
		.map(
			(a) =>
				/** @type {import('@excalidraw/excalidraw/types').BinaryFileData} */ ({
					id: a.id,
					mimeType: a.mimeType,
					dataURL: a.dataURL,
					created: 0,
					lastRetrieved: 0
				})
		);
}

/** All glyphs share a 64×64 design grid, bold ink and selective LS fills.
 * @param {string} kind @param {number} [x] @param {number} [y] @param {number} [size] @param {string} [fill] @returns {Shape[]} */
export function diagramIcon(kind, x = 0, y = 0, size = 64, fill = C.lilac) {
	const b = (
		/** @type {number} */ x,
		/** @type {number} */ y,
		/** @type {number} */ w,
		/** @type {number} */ h,
		color = fill
	) => diagramBox(x, y, w, h, color);
	const p = (/** @type {Array<[number, number]>} */ pts, color = 'transparent') =>
		path(pts, { backgroundColor: color, strokeColor: C.ink, strokeWidth: 2.6 });
	/** @type {Shape[]} */ let parts = [];
	if (kind === 'database') {
		parts = [
			p(
				[
					[8, 16],
					[8, 49],
					[14, 56],
					[32, 60],
					[50, 56],
					[56, 49],
					[56, 16],
					[8, 16]
				],
				fill
			),
			{ ...oval(8, 6, 48, 20, C.paper), strokeColor: C.ink, strokeWidth: 2.6 },
			{
				...p([
					[8, 33],
					[16, 39],
					[32, 42],
					[48, 39],
					[56, 33]
				]),
				roundness: { type: 2 }
			}
		];
	} else if (kind === 'data-cluster') {
		parts = [
			[3, 0],
			[35, 0],
			[3, 34],
			[35, 34]
		].flatMap(([dx, dy]) => diagramIcon('database', dx, dy, 27, fill));
	} else if (kind === 'document') {
		parts = [
			p(
				[
					[12, 3],
					[39, 3],
					[53, 17],
					[53, 60],
					[12, 60],
					[12, 3]
				],
				fill
			),
			p(
				[
					[39, 3],
					[39, 17],
					[53, 17]
				],
				C.paper
			),
			...[27, 37, 47].map((y) =>
				p([
					[21, y],
					[43, y]
				])
			)
		];
	} else if (kind === 'conversations') {
		parts = [
			[2, 4],
			[34, 4],
			[2, 35],
			[34, 35]
		].flatMap(([dx, dy], i) => [
			p(
				[
					[dx, dy],
					[dx + 25, dy],
					[dx + 25, dy + 19],
					[dx + 10, dy + 19],
					[dx + 5, dy + 25],
					[dx + 5, dy + 19],
					[dx, dy + 19],
					[dx, dy]
				],
				i % 2 ? C.violet : fill
			),
			...(i < 2
				? [
						p([
							[dx + 6, dy + 6],
							[dx + 19, dy + 6]
						]),
						p([
							[dx + 6, dy + 11],
							[dx + 14, dy + 11]
						])
					]
				: [])
		]);
	} else if (kind === 'table') {
		parts = [
			b(5, 6, 54, 52, C.paper),
			b(5, 6, 54, 13, fill),
			...[32, 45].map((y) =>
				p([
					[5, y],
					[59, y]
				])
			),
			...[23, 41].map((x) =>
				p([
					[x, 19],
					[x, 58]
				])
			)
		];
	} else if (kind === 'search') {
		parts = [
			{ ...oval(5, 4, 40, 40, fill), strokeColor: C.ink, strokeWidth: 3 },
			{
				...p([
					[40, 40],
					[59, 59]
				]),
				strokeWidth: 7
			}
		];
	} else if (kind === 'embedding') {
		parts = [
			p([
				[12, 44],
				[32, 21],
				[54, 44]
			]),
			p([
				[32, 21],
				[32, 4]
			]),
			...[
				[12, 44],
				[32, 21],
				[54, 44],
				[32, 4]
			].map(([x, y]) => ({ ...oval(x - 5, y - 5, 10, 10, fill), strokeColor: C.ink }))
		];
	} else if (kind === 'user') {
		parts = [
			b(11, 36, 42, 25, C.violet),
			{ ...oval(20, 9, 24, 28, '#f5cba9'), strokeColor: C.ink },
			p(
				[
					[20, 19],
					[20, 9],
					[28, 3],
					[39, 5],
					[44, 12],
					[39, 20],
					[34, 14],
					[26, 20],
					[20, 19]
				],
				C.ink
			),
			b(5, 42, 54, 20, '#e8e3ed'),
			{ ...oval(29, 49, 6, 6, C.paper), strokeWidth: 1 }
		];
	} else if (kind === 'building') {
		parts = [
			p(
				[
					[8, 59],
					[8, 18],
					[31, 4],
					[54, 18],
					[54, 59],
					[8, 59]
				],
				fill
			),
			b(26, 42, 12, 17, C.paper),
			...[22, 32].flatMap((y) => [b(17, y, 8, 5, C.paper), b(38, y, 8, 5, C.paper)])
		];
	} else if (kind === 'book') {
		parts = [
			p(
				[
					[32, 15],
					[17, 6],
					[4, 8],
					[4, 48],
					[18, 48],
					[32, 58],
					[32, 15]
				],
				fill
			),
			p(
				[
					[32, 15],
					[47, 6],
					[60, 8],
					[60, 48],
					[46, 48],
					[32, 58],
					[32, 15]
				],
				C.violet
			)
		];
	} else if (kind === 'tag') {
		parts = [
			p(
				[
					[4, 32],
					[32, 4],
					[59, 4],
					[59, 31],
					[31, 59],
					[4, 32]
				],
				fill
			),
			{ ...oval(44, 11, 8, 8, C.paper), strokeColor: C.ink }
		];
	} else if (kind === 'lake') {
		parts = [
			p(
				[
					[32, 3],
					[58, 32],
					[32, 60],
					[6, 32],
					[32, 3]
				],
				fill
			),
			p([
				[6, 32],
				[32, 45],
				[58, 32]
			]),
			p([
				[32, 45],
				[32, 60]
			])
		];
	} else if (kind === 'sparkles') {
		parts = [
			p(
				[
					[24, 8],
					[31, 24],
					[46, 30],
					[31, 37],
					[24, 53],
					[18, 37],
					[3, 30],
					[18, 24],
					[24, 8]
				],
				fill
			),
			p(
				[
					[50, 1],
					[54, 10],
					[63, 14],
					[54, 18],
					[50, 27],
					[46, 18],
					[38, 14],
					[46, 10],
					[50, 1]
				],
				C.violet
			)
		];
	} else if (kind === 'context-stack') {
		parts = [C.pink, C.violet, C.lilac].map((c, i) => ({
			...b(3, 5 + i * 18, 58, 18, c),
			roundness: null
		}));
	} else throw new Error(`Unknown diagram icon: ${kind}`);
	const scale = size / 64;
	return group(
		parts.map((s) => ({
			...s,
			x: x + s.x * scale,
			y: y + s.y * scale,
			...(s.width !== undefined ? { width: s.width * scale } : {}),
			...(s.height !== undefined ? { height: s.height * scale } : {}),
			strokeWidth: s.strokeWidth * scale,
			...(s.points
				? {
						points: s.points.map(
							([a, b]) => /** @type {[number,number]} */ ([a * scale, b * scale])
						)
					}
				: {})
		}))
	);
}

/** @param {number} x @param {number} y @param {number} n */
export function diagramStage(x, y, n) {
	return group([
		{ ...oval(x, y, 46, 46, C.ink), strokeColor: C.ink },
		diagramCaption(x, y + 9, 46, String(n), 24, true, C.paper)
	]);
}
/** @param {number} x @param {number} y @param {number} w @param {string} text */
export function diagramPill(x, y, w, text) {
	const r = 21.5;
	/** @type {Array<[number,number]>} */ const outline = [];
	for (let i = 0; i <= 16; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 16;
		outline.push([x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r]);
	}
	for (let i = 0; i <= 16; i++) {
		const a = Math.PI / 2 + (i * Math.PI) / 16;
		outline.push([x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]);
	}
	outline.push(outline[0]);
	return group([
		path(outline, { strokeColor: C.ink, backgroundColor: C.ink, strokeWidth: 1 }),
		diagramCaption(x, y + 8, w, text, 25, true, C.paper)
	]);
}

/** Small previews use the same geometry as insertion, with no remote image service.
 * @param {Shape[]} shapes */
function iconPreview(shapes) {
	const parts = shapes
		.map((s) => {
			const style = `fill="${s.backgroundColor === 'transparent' ? 'none' : s.backgroundColor}" stroke="${s.strokeColor}" stroke-width="${s.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"`;
			if (s.type === 'rectangle')
				return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="3" ${style}/>`;
			if (s.type === 'ellipse')
				return `<ellipse cx="${s.x + (s.width ?? 0) / 2}" cy="${s.y + (s.height ?? 0) / 2}" rx="${(s.width ?? 0) / 2}" ry="${(s.height ?? 0) / 2}" ${style}/>`;
			if (s.points)
				return `<polyline points="${s.points.map(([x, y]) => `${s.x + x},${s.y + y}`).join(' ')}" ${style}/>`;
			return '';
		})
		.join('');
	return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 70 70">${parts}</svg>`)}`;
}
/** @type {Array<[string,string,string]>} */
const icons = [
	['database', 'Database', 'storage cylinder data warehouse index'],
	['data-cluster', 'Data cluster', 'internal databases collection'],
	['document', 'Document', 'memory file page'],
	['conversations', 'Conversations', 'chat history messages'],
	['table', 'Table metadata', 'grid schema rows'],
	['search', 'Similarity search', 'magnifier retrieval vector'],
	['embedding', 'Embedding model', 'network nodes vector'],
	['user', 'User at laptop', 'person query human'],
	['building', 'Company context', 'organization office lookup'],
	['book', 'Knowledge base', 'book documentation wiki'],
	['tag', 'Metadata tag', 'label dataset catalog'],
	['lake', 'Data lake', 'diamond storage'],
	['sparkles', 'Enrichment', 'codex augment metadata'],
	['context-stack', 'Context stack', 'assembled retrieved bundle']
];
/** @type {import('./draw-ui-components.js').DrawUiComponent[]} */
export const DRAW_DIAGRAM_COMPONENTS = [
	...icons.map(([id, title, keywords]) => {
		const create = (x = 0, y = 0) =>
			move([...diagramIcon(id, 0, 0, 96), diagramCaption(-32, 108, 160, title, 17)], x, y);
		return {
			id: `diagram-icon-${id}`,
			title,
			label: title,
			description: 'Native editable pictogram · Latent Space purple and dark ink.',
			category: 'diagram icons',
			keywords: ['icon', 'latent space', ...keywords.split(' ')],
			preview: iconPreview(diagramIcon(id)),
			create,
			createShapes: () => create()
		};
	}),
	...logos.map((asset) => {
		const create = (x = 0, y = 0) =>
			move(
				[
					...(asset.slug === 'ai-engineer' ? [diagramBox(-8, -8, 112, 112, C.ink)] : []),
					diagramLogo(asset.slug, 0, 0, 96),
					diagramCaption(-32, 108, 160, asset.name, 17)
				],
				x,
				y
			);
		return {
			id: `diagram-logo-${asset.slug}`,
			title: `${asset.name} logo`,
			label: `${asset.name} logo`,
			description: 'Bundled logo + editable caption. Original brand colors; no network lookup.',
			category: 'logos',
			keywords: ['logo', 'brand', asset.slug, asset.name],
			preview: asset.dataURL,
			previewBackground: asset.slug === 'ai-engineer' ? C.ink : C.paper,
			create,
			createShapes: () => create()
		};
	})
];
