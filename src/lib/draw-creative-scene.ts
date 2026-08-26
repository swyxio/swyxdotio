import { CreativeClient, downloadCreativeBlob, type CreativeAsset } from './draw-creative-client';
import {
	buildCreativeArtboard,
	buildBlankArtboard,
	convertCreativeArtboard,
	adaptCreativeArtboard,
	createCanvasTextMeasurer,
	inspectCreativeArtboard
} from './draw-creative-layout.js';
import { exportCreativeSelection, bundleCreativeExports } from './draw-creative-export.js';

type Context = {
	editor: any;
	convertElements: any;
	captureImmediately: any;
	userId?: string;
	pageId: string;
	exportToBlob: any;
	exportToSvg: any;
	focus: (elements: any[]) => void;
	status: (message: string) => void;
};

/** Thin adapter: image loading never commits to an account/page that changed mid-flight. */
export function creativeSceneActions(getContext: () => Context) {
	function initial() {
		const context = getContext();
		if (!context.editor || !context.convertElements || !context.captureImmediately)
			throw new Error('The drawing editor is not ready.');
		return context;
	}
	function assertCurrent(context: Context) {
		const current = getContext();
		if (
			current.userId !== context.userId ||
			current.pageId !== context.pageId ||
			current.editor !== context.editor
		)
			throw new Error('The account or drawing page changed. Nothing was inserted.');
	}
	function placement(context: Context) {
		const live = context.editor.getSceneElements();
		return {
			x: live.length ? Math.max(...live.map((item: any) => item.x + item.width)) + 120 : 0,
			y: live.length ? Math.min(...live.map((item: any) => item.y)) : 0
		};
	}
	async function fileFromBlob(blob: Blob, name: string) {
		if (!blob.type.startsWith('image/'))
			throw new Error('This asset is stored as an original file, not a canvas image.');
		const bitmap = await createImageBitmap(blob);
		const width = bitmap.width;
		const height = bitmap.height;
		bitmap.close();
		const dataURL: string = await new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(new Error('Image could not be read.'));
			reader.readAsDataURL(blob);
		});
		return {
			file: { id: crypto.randomUUID(), mimeType: blob.type, dataURL, created: Date.now() },
			width,
			height,
			name
		};
	}
	async function measurement() {
		await document.fonts.ready;
		const context = document.createElement('canvas').getContext('2d');
		return context ? createCanvasTextMeasurer(context) : undefined;
	}
	function commit(context: Context, artboard: any, files: any[] = []) {
		assertCurrent(context);
		const elements = convertCreativeArtboard(artboard, context.convertElements);
		if (files.length) context.editor.addFiles(files);
		context.editor.updateScene({
			elements: [...context.editor.getSceneElementsIncludingDeleted(), ...elements],
			appState: { selectedElementIds: { [artboard.frameId]: true } },
			captureUpdate: context.captureImmediately
		});
		context.focus(elements);
		const inspected = inspectCreativeArtboard(elements, artboard.frameId);
		const warnings = [...(artboard.warnings ?? []), ...inspected];
		context.status(
			warnings.length
				? warnings.map((warning) => warning.message).join(' ')
				: 'Editable composition inserted.'
		);
	}
	async function insert(recipe: any) {
		const context = initial();
		if (!context.userId) throw new Error('Sign in to load personal composition assets.');
		const client = new CreativeClient(context.userId);
		const files: any[] = [];
		async function resolve(items: any[]) {
			return Promise.all(
				items.map(async (item) => {
					const source = await fileFromBlob(await client.asset(item.assetId), item.name);
					files.push(source.file);
					return { ...item, fileId: source.file.id, width: source.width, height: source.height };
				})
			);
		}
		const [people, logos, measureText] = await Promise.all([
			resolve(recipe.people ?? []),
			resolve(recipe.logos ?? []),
			measurement()
		]);
		const officialMark = ['ls', 'fde'].includes(recipe.kit?.brand);
		for (const [index, logo] of logos.entries())
			logo.role = officialMark || index > 0 ? 'company' : 'brand';
		if (officialMark) {
			const response = await fetch('/assets/latent-space-hex-gradient.png');
			if (!response.ok) throw new Error('The official Latent Space mark could not be loaded.');
			const source = await fileFromBlob(await response.blob(), 'Latent Space');
			files.push(source.file);
			logos.unshift({
				id: 'official-ls',
				name: 'Latent Space',
				fileId: source.file.id,
				width: source.width,
				height: source.height,
				role: 'brand'
			});
		}
		assertCurrent(context);
		commit(
			context,
			buildCreativeArtboard({ ...recipe, people, logos, measureText, ...placement(context) }),
			files
		);
	}
	async function insertAsset(asset: CreativeAsset) {
		const context = initial();
		if (!context.userId) throw new Error('Sign in to load personal assets.');
		const source = await fileFromBlob(
			await new CreativeClient(context.userId).asset(asset.id),
			asset.name
		);
		assertCurrent(context);
		const scale = Math.min(1, 700 / Math.max(source.width, source.height));
		const elements = context.convertElements([
			{
				type: 'image',
				...placement(context),
				width: source.width * scale,
				height: source.height * scale,
				fileId: source.file.id,
				status: 'saved'
			}
		]);
		context.editor.addFiles([source.file]);
		context.editor.updateScene({
			elements: [...context.editor.getSceneElementsIncludingDeleted(), ...elements],
			appState: { selectedElementIds: { [elements[0].id]: true } },
			captureUpdate: context.captureImmediately
		});
		context.focus(elements);
		context.status('Saved asset inserted.');
	}
	function blank() {
		const context = initial();
		commit(context, buildBlankArtboard({ format: 'youtube', ...placement(context) }));
	}
	async function adapt(formats: string[]) {
		const context = initial();
		const ids = context.editor.getAppState().selectedElementIds;
		const original = context.editor.getSceneElementsIncludingDeleted();
		const selected = original.find((element: any) => ids[element.id]);
		const frameId = selected?.type === 'frame' ? selected.id : selected?.frameId;
		if (!frameId) throw new Error('Select a creative artboard before adapting it.');
		const measureText = await measurement();
		assertCurrent(context);
		let { x, y } = placement(context);
		const output: any[] = [];
		const frameIds: string[] = [];
		for (const format of formats) {
			const result = adaptCreativeArtboard({
				elements: original,
				frameId,
				format,
				x,
				y,
				measureText
			});
			const converted = convertCreativeArtboard(result, context.convertElements);
			output.push(...converted);
			frameIds.push(result.frameId);
			x += result.format.width + 100;
		}
		assertCurrent(context);
		context.editor.updateScene({
			elements: [...context.editor.getSceneElementsIncludingDeleted(), ...output],
			appState: { selectedElementIds: Object.fromEntries(frameIds.map((id) => [id, true])) },
			captureUpdate: context.captureImmediately
		});
		context.focus(output);
		context.status(`${formats.length} editable format variants created. Original preserved.`);
	}
	async function download(options: { format: string; transparent: boolean; scope: string }) {
		const context = initial();
		const elements = context.editor.getSceneElements();
		const selectedIds = Object.keys(context.editor.getAppState().selectedElementIds).filter(
			(id) => context.editor.getAppState().selectedElementIds[id]
		);
		const selected = elements.find((element: any) => selectedIds.includes(element.id));
		const frameId = selected?.type === 'frame' ? selected.id : selected?.frameId;
		const common = {
			elements,
			files: context.editor.getFiles(),
			appState: context.editor.getAppState(),
			exportToBlob: context.exportToBlob,
			exportToSvg: context.exportToSvg,
			transparent: options.transparent,
			format: options.format as 'png' | 'jpg' | 'svg'
		};
		if (options.scope === 'campaign') {
			const frames = elements.filter(
				(element: any) => element.type === 'frame' && element.customData?.creative
			);
			if (!frames.length) throw new Error('There are no creative artboards in this page.');
			if (frames.length > 24)
				throw new Error('Choose a page with at most 24 creative artboards for a campaign bundle.');
			const entries = [];
			const manifest: { filename: string; width: number; height: number; frameId: string }[] = [];
			for (let i = 0; i < frames.length; i++) {
				const result = await exportCreativeSelection({
					...common,
					frameId: frames[i].id,
					name: `${String(i + 1).padStart(2, '0')}-${frames[i].name}`
				});
				entries.push({ filename: result.filename, blob: result.blob });
				manifest.push({
					filename: result.filename,
					width: result.width,
					height: result.height,
					frameId: frames[i].id
				});
			}
			entries.push({
				filename: 'manifest.json',
				blob: new Blob([JSON.stringify({ files: manifest }, null, 2)], { type: 'application/json' })
			});
			const { zipSync } = await import('fflate');
			const bundle = await bundleCreativeExports({ entries, zipSync });
			assertCurrent(context);
			downloadCreativeBlob(bundle, 'creative-campaign.zip');
		} else {
			const result = await exportCreativeSelection({
				...common,
				...(options.scope === 'selection' ? { elementIds: selectedIds } : { frameId })
			});
			assertCurrent(context);
			downloadCreativeBlob(result.blob, result.filename);
			context.status(result.warnings.map((item) => item.message).join(' ') || 'Download prepared.');
		}
	}
	async function selectedAsset() {
		const context = initial();
		const selected = context.editor.getAppState().selectedElementIds;
		const images = context.editor
			.getSceneElements()
			.filter((element: any) => selected[element.id] && element.type === 'image');
		if (images.length !== 1) throw new Error('Select exactly one image on the canvas first.');
		const file = context.editor.getFiles()[images[0].fileId];
		if (!file) throw new Error('Selected image bytes are unavailable.');
		const blob = await fetch(file.dataURL).then((response) => response.blob());
		assertCurrent(context);
		return { blob, name: `canvas-image.${blob.type.split('/')[1] ?? 'png'}` };
	}
	return { insert, insertAsset, blank, adapt, download, selectedAsset };
}
