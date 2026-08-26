<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import {
		CreativeClient,
		CREATIVE_API,
		emptyCreativeLibrary,
		newKitDraft,
		newBriefDraft,
		compileCreativePrompt,
		creativeSourceRequest,
		creativeThumbnailReference,
		downloadCreativeBlob,
		type CreativeRecord,
		type CreativeAsset
	} from './draw-creative-client';
	import { CREATIVE_DIRECTIONS, CREATIVE_FORMATS } from './draw-creative-layout.js';
	import DrawCreativePreview from './DrawCreativePreview.svelte';
	import DrawShowBrief from './DrawShowBrief.svelte';
	import DrawReferenceExamples from './DrawReferenceExamples.svelte';
	import {
		emptyFewShot,
		fewShotPrompt,
		referenceCatalog,
		showPreset,
		type FewShotSelection,
		type ReferenceExample
	} from './draw-creative-examples.js';
	import {
		parseCreativeTranscript,
		planCreativeSourceRun,
		creativeSourceFingerprint,
		selectCreativeEvidence,
		normalizeYouTubeChannel,
		type CreativeQuote
	} from './draw-creative-sources.js';
	import { TOOLS_AI_POLICY } from './tools-ai-policy.js';

	type View =
		| 'start'
		| 'examples'
		| 'assets'
		| 'kits'
		| 'sources'
		| 'compose'
		| 'versions'
		| 'export';
	let {
		user,
		onInsert,
		onInsertAsset,
		onBlank,
		onAdapt,
		onExport,
		onSaveSelected,
		onGenerate,
		onOpenChange
	} = $props<{
		user: { id: string; email: string } | null;
		onInsert: (recipe: any) => Promise<void>;
		onInsertAsset: (asset: CreativeAsset) => Promise<void>;
		onBlank: () => void;
		onAdapt: (formats: string[]) => Promise<void>;
		onExport: (options: { format: string; transparent: boolean; scope: string }) => Promise<void>;
		onSaveSelected: () => Promise<{ blob: Blob; name: string }>;
		onOpenChange?: (open: boolean) => void;
		onGenerate?: (request: {
			prompt: string;
			referenceAssetIds: string[];
			context: Record<string, unknown>;
		}) => void | Promise<void>;
	}>();
	let open = $state(false);
	let view = $state<View>('start');
	let library = $state(emptyCreativeLibrary());
	let loading = $state(false);
	let loaded = $state(false);
	let error = $state('');
	let status = $state('');
	let busy = $state(false);
	let operation = $state<AbortController | null>(null);
	const lifetime = new AbortController();
	let dialog: HTMLDialogElement;
	let content: HTMLElement;
	let returnFocus: HTMLElement | null = null;
	let kit = $state(newKitDraft());
	let kitId = $state('');
	let composeKitId = $state('');
	let kitRevisions = $state<any[]>([]);
	let brief = $state(newBriefDraft());
	let briefId = $state('');
	let exampleTarget = $state<'brief' | 'house'>('brief');
	let importPreview = $state<any>(null);
	let importFields = $state<string[]>(['name', 'title', 'description']);
	let demoPreview = $state<ReferenceExample | null>(null);
	let demoFields = $state<string[]>(['name', 'title', 'hook']);
	let fieldUndo = $state<{
		brief: Record<string, any>;
		kit: Record<string, any>;
		kitId: string;
	} | null>(null);
	let housePrompt = $state('');
	const firstRun = $derived(!library.records.briefs.length && !library.records.kits.length);
	const briefFewShot = $derived(brief.fewShot ?? emptyFewShot());
	const titleExamplePreview = $derived.by(() => {
		try {
			return fewShotPrompt(briefFewShot, ['title', 'hook']);
		} catch (cause) {
			return cause instanceof Error ? cause.message : 'Review unavailable examples.';
		}
	});
	const promptPreview = $derived.by(() => {
		try {
			return compileCreativePrompt(housePrompt, brief, CREATIVE_DIRECTIONS[0], feedbackText);
		} catch (cause) {
			return cause instanceof Error ? cause.message : 'Review unavailable examples.';
		}
	});
	let selectedCompositionId = $state('');
	let versionBriefId = $state('');
	let feedbackText = $state('');
	let feedbackScope = $state('candidate');
	let feedbackRating = $state('neutral');
	let assetRole = $state('reference');
	let assetQuery = $state('');
	let channelInput = $state('');
	let channelId = $state('');
	let channelVideos = $state<any[]>([]);
	let nextVideoPage = $state('');
	type SourceChunk = {
		index: number;
		startOffset: number;
		endOffset: number;
		status: 'pending' | 'succeeded' | 'failed';
		error?: string;
	};
	let sourceQuotes = $state<CreativeQuote[]>([]);
	let sourceTitles = $state<any[]>([]);
	let sourceChunks = $state<SourceChunk[]>([]);
	let selectedQuoteIds = $state<string[]>([]);
	let maxSourceChunks = $state(4);
	let sourceFingerprint = $state('');
	let sourceTextVersion = $state('');
	let sourceUrlVersion = $state('');
	const sourcePlan = $derived.by(() => {
		if (!brief.transcript.trim()) return { plan: null, error: '' };
		try {
			return {
				plan: planCreativeSourceRun(
					parseCreativeTranscript(brief.transcript),
					sourceChunks,
					maxSourceChunks
				),
				error: ''
			};
		} catch (cause) {
			return {
				plan: null,
				error: cause instanceof Error ? cause.message : 'Cannot read this transcript.'
			};
		}
	});
	const evidenceSelection = $derived.by(() => {
		try {
			return { quotes: selectCreativeEvidence(sourceQuotes, selectedQuoteIds), error: '' };
		} catch (cause) {
			return {
				quotes: [],
				error: cause instanceof Error ? cause.message : 'Invalid evidence selection.'
			};
		}
	});
	const processedChunks = $derived(
		sourceChunks.filter((chunk) => chunk.status === 'succeeded').map((chunk) => chunk.index)
	);
	const totalChunks = $derived(sourcePlan.plan?.chunks.length ?? 0);
	let parentCompositionId = $state('');
	let variants = $state(4);
	let selectedFormats = $state<string[]>(['youtube', 'social', 'square']);
	let transparent = $state(false);
	let exportFormat = $state('png');
	let exportScope = $state('artboard');
	const tabs: { id: View; label: string }[] = [
		{ id: 'start', label: 'Show brief' },
		{ id: 'examples', label: 'Examples' },
		{ id: 'sources', label: 'Sources' },
		{ id: 'compose', label: 'Compose' },
		{ id: 'versions', label: 'Versions' },
		{ id: 'kits', label: 'Brand kits' },
		{ id: 'assets', label: 'Assets' },
		{ id: 'export', label: 'Export' }
	];
	const compositions = $derived(
		(library.records.compositions ?? []).filter(
			(item) => !versionBriefId || item.data.briefId === versionBriefId
		)
	);
	const selectedComposition = $derived(
		compositions.find((item) => item.id === selectedCompositionId)
	);
	const selectedKit = $derived(library.records.kits.find((item) => item.id === kitId));
	const selectedBrief = $derived(library.records.briefs.find((item) => item.id === briefId));
	const visibleAssets = $derived(
		library.assets.filter((asset) =>
			`${asset.name} ${asset.role}`.toLowerCase().includes(assetQuery.toLowerCase())
		)
	);
	const imageAssets = $derived(
		library.assets.filter((asset) => asset.mimeType.startsWith('image/'))
	);
	const notes = $derived(
		(library.records.feedback ?? []).filter(
			(note) => note.data.compositionId === selectedCompositionId
		)
	);
	const selectedChannel = $derived(library.records.channels.find((item) => item.id === channelId));
	$effect(() => {
		if (sourceTextVersion === brief.transcript && sourceUrlVersion === brief.sourceUrl) return;
		operation?.abort();
		sourceQuotes = [];
		sourceTitles = [];
		sourceChunks = [];
		selectedQuoteIds = [];
		sourceFingerprint = '';
		delete brief.analysis;
		sourceTextVersion = brief.transcript;
		sourceUrlVersion = brief.sourceUrl;
	});
	const client = () => {
		if (!user) throw new Error('Sign in to save and reuse your own assets and briefs.');
		return new CreativeClient(user.id, lifetime.signal);
	};

	export async function show(section: View = 'start') {
		if (!open)
			returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		view = section;
		open = true;
		onOpenChange?.(true);
		await tick();
		if (!open || lifetime.signal.aborted) return;
		dialog?.showModal();
		if (user && !loaded) await refresh();
	}
	export function close() {
		if (!open) return;
		dialog?.close();
		open = false;
		onOpenChange?.(false);
		returnFocus?.focus();
	}
	$effect(() => {
		// A different section starts at its heading; drafts and operations remain untouched.
		void view;
		content?.scrollTo({ top: 0 });
	});
	onDestroy(() => {
		operation?.abort();
		lifetime.abort();
	});

	async function refresh() {
		loading = true;
		error = '';
		try {
			library = await client().library();
			loaded = true;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Library unavailable.';
		} finally {
			loading = false;
		}
	}
	async function perform(work: () => Promise<void>) {
		if (busy) return;
		busy = true;
		error = '';
		status = '';
		try {
			await work();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'This action could not be completed.';
		} finally {
			busy = false;
		}
	}
	function replaceRecord(record: CreativeRecord) {
		const items = library.records[record.kind] ?? [];
		library.records[record.kind] = [record, ...items.filter((item) => item.id !== record.id)];
	}
	function toggle(values: string[], id: string) {
		return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
	}
	function patchBrief(fields: Record<string, any>) {
		if ('sourceUrl' in fields && fields.sourceUrl !== brief.sourceUrl) {
			importPreview = null;
			delete brief.videoMetadata;
		}
		Object.assign(brief, fields);
	}
	function applyFields(fields: Record<string, any>, kitFields: Record<string, any> = {}) {
		fieldUndo = {
			brief: Object.fromEntries(
				Object.keys(fields).map((key) => [key, $state.snapshot(brief[key])])
			),
			kit: Object.fromEntries(
				Object.keys(kitFields).map((key) => [key, $state.snapshot((kit as any)[key])])
			),
			kitId
		};
		Object.assign(brief, fields);
		Object.assign(kit, kitFields);
		status =
			'Selected fields filled in this draft. Nothing was saved, inserted or sent to a model.';
	}
	function undoFields() {
		if (!fieldUndo) return;
		Object.assign(brief, fieldUndo.brief);
		Object.assign(kit, fieldUndo.kit);
		kitId = fieldUndo.kitId;
		fieldUndo = null;
		status = 'Field changes undone.';
	}
	function applyStarter(id: string, fields: string[]) {
		const preset = showPreset(id);
		const patch: Record<string, any> = {};
		if (fields.includes('name')) patch.name = preset.nameExample;
		if (fields.includes('hints')) patch.hints = preset.hints;
		const kitPatch = fields.includes('house')
			? {
					name: preset.name,
					brand: preset.brand,
					prompt: preset.prompt,
					fewShot: $state.snapshot(briefFewShot)
				}
			: {};
		// Applying starter text never edits an existing saved kit. Review/save explicitly.
		applyFields(patch, kitPatch);
		if (fields.includes('house')) {
			kitId = '';
			kitRevisions = [];
		}
	}
	async function importMetadata() {
		if (!user) return;
		const owner = user.id;
		const url = brief.sourceUrl;
		const result = await creativeSourceRequest(
			owner,
			{ action: 'video', video: url },
			lifetime.signal
		);
		if (lifetime.signal.aborted || user?.id !== owner || brief.sourceUrl !== url) return;
		importPreview = result;
		status =
			'Metadata retrieved. Review and apply only the fields you want; no transcript or image was imported.';
	}
	function applyMetadata() {
		if (!importPreview) return;
		const video = importPreview.video;
		const fields: Record<string, any> = {};
		if (importFields.includes('name')) fields.name = video.title.slice(0, 120);
		if (importFields.includes('title')) fields.title = video.title;
		if (importFields.includes('description') && video.description !== undefined)
			fields.description = video.description;
		if (!Object.keys(fields).length) return;
		fields.videoMetadata = {
			...video,
			provenance: importPreview.provenance,
			retrievedAt: importPreview.retrievedAt
		};
		fields.sourceUrl = video.url;
		applyFields(fields);
		importPreview = null;
	}
	function applyDemo() {
		if (!demoPreview) return;
		const fields: Record<string, any> = {};
		if (demoFields.includes('name')) fields.name = `Demo · ${demoPreview.title}`.slice(0, 120);
		if (demoFields.includes('title')) fields.title = demoPreview.title;
		if (demoFields.includes('hook') && demoPreview.thumbnailText)
			fields.hook = demoPreview.thumbnailText;
		applyFields(fields);
		demoPreview = null;
		view = 'start';
	}
	function updateExamples(selection: FewShotSelection) {
		if (exampleTarget === 'house') kit.fewShot = selection;
		else brief.fewShot = selection;
		status = `${selection.examples.length} examples selected for the ${exampleTarget === 'house' ? 'house draft' : 'show draft'}. Save to retain them. No images attached.`;
	}
	async function restoreHousePrompt() {
		housePrompt = '';
		if (!brief.kitId || !brief.kitRevision) return;
		const id = briefId,
			key = brief.kitId,
			revision = brief.kitRevision;
		try {
			const snapshot = await client().request(`/records/kits/${key}/revisions/${revision}`);
			if (
				!lifetime.signal.aborted &&
				briefId === id &&
				brief.kitId === key &&
				brief.kitRevision === revision
			)
				housePrompt = snapshot.data.prompt ?? '';
		} catch {
			if (briefId === id)
				error =
					'The pinned house prompt could not be loaded. Reload the library before generating.';
		}
	}
	async function saveKit() {
		const record = await client().save('kits', $state.snapshot(kit), selectedKit);
		replaceRecord(record);
		kitId = record.id;
		status = `House revision ${record.revision} saved${record.activeRevision === record.revision ? ' and active' : ' as a draft. Promote it to use by default'}.`;
		await loadKitHistory();
	}
	async function loadKitHistory() {
		if (!kitId) {
			kitRevisions = [];
			return;
		}
		const result = await client().request(`/records/kits/${kitId}/revisions`);
		kitRevisions = result.revisions;
	}
	async function chooseKit(record: CreativeRecord) {
		kitId = record.id;
		kit = $state.snapshot(record.data) as ReturnType<typeof newKitDraft>;
		await loadKitHistory();
	}
	async function promote(revision: number) {
		if (!selectedKit) return;
		const result = await client().request(`/records/kits/${kitId}/promote`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ revision: selectedKit.revision, houseRevision: revision })
		});
		replaceRecord(result);
		status = `House revision ${revision} is now the default. Existing briefs are unchanged.`;
	}
	async function saveBrief() {
		const data = $state.snapshot(brief);
		if (!data.name.trim()) data.name = (data.title || 'Untitled thumbnail brief').slice(0, 120);
		const record = await client().save('briefs', data, selectedBrief);
		replaceRecord(record);
		briefId = record.id;
		brief.name = record.data.name;
		status = 'Brief saved privately.';
		return record;
	}
	function chooseBrief(record: CreativeRecord) {
		operation?.abort();
		briefId = record.id;
		brief = { ...newBriefDraft(), ...$state.snapshot(record.data) };
		sourceQuotes = brief.analysis?.quotes ?? [];
		sourceTitles = brief.analysis?.titles ?? [];
		sourceChunks = brief.analysis?.chunks ?? [];
		selectedQuoteIds = brief.analysis?.selectedQuoteIds ?? [];
		sourceFingerprint = brief.analysis?.sourceFingerprint ?? '';
		sourceTextVersion = brief.transcript;
		sourceUrlVersion = brief.sourceUrl;
		channelId = brief.channelId ?? '';
		composeKitId = brief.kitId ?? '';
		channelVideos = [];
		nextVideoPage = '';
		parentCompositionId = '';
		selectedCompositionId = '';
		fieldUndo = null;
		importPreview = null;
		demoPreview = null;
		void restoreHousePrompt();
	}
	function newSourceBrief() {
		operation?.abort();
		briefId = '';
		brief = newBriefDraft();
		housePrompt = '';
		fieldUndo = null;
		importPreview = null;
		demoPreview = null;
		sourceQuotes = [];
		sourceTitles = [];
		sourceChunks = [];
		selectedQuoteIds = [];
		sourceFingerprint = '';
		sourceTextVersion = '';
		sourceUrlVersion = '';
		parentCompositionId = '';
		channelId = '';
		composeKitId = '';
		channelVideos = [];
		nextVideoPage = '';
	}
	async function attachKit() {
		if (!selectedKit) return;
		await pinKit(selectedKit);
	}
	async function pinKit(record: CreativeRecord) {
		const snapshot = await client().request(
			`/records/kits/${record.id}/revisions/${record.activeRevision}`
		);
		if (lifetime.signal.aborted) return;
		brief.kitId = record.id;
		brief.kitRevision = record.activeRevision;
		brief.fewShot = snapshot.data.fewShot ?? emptyFewShot();
		housePrompt = snapshot.data.prompt ?? '';
		composeKitId = record.id;
		status = `Brief pinned to ${record.data.name}, house revision ${record.activeRevision}. Assets are not automatically attached.`;
	}
	async function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		await perform(async () => {
			await client().upload(file, file.name, assetRole);
			await refresh();
			status = 'Asset saved privately. Choose Insert or Attach when you want to use it.';
		});
		input.value = '';
	}
	async function saveSelectedAsset() {
		const selected = await onSaveSelected();
		await client().upload(selected.blob, selected.name, assetRole);
		await refresh();
		status = 'Selected image saved to your assets.';
	}
	async function downloadAsset(asset: CreativeAsset) {
		downloadCreativeBlob(await client().asset(asset.id), asset.name);
	}
	async function readSourceFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (file.size > 2_000_000) {
			error = 'Choose a transcript under 2 MB and 500,000 characters; nothing was truncated.';
			return;
		}
		try {
			const text = await file.text();
			if (lifetime.signal.aborted) return;
			parseCreativeTranscript(text);
			brief.transcript = text;
			status = 'Transcript loaded into the draft. Save or Analyze explicitly.';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Transcript could not be read.';
		}
		input.value = '';
	}
	function assertSourceRun(controller: AbortController, owner: string, text: string, url: string) {
		if (
			controller.signal.aborted ||
			lifetime.signal.aborted ||
			user?.id !== owner ||
			text !== brief.transcript ||
			url !== brief.sourceUrl
		)
			throw new DOMException(
				'Stopped. Completed chunks remain saved; reload to confirm any in-flight save.',
				'AbortError'
			);
	}
	function assertSourceSaveCapacity(data: Record<string, any>, reserveBytes = 0) {
		const limit = library.limits?.briefBytes ?? 1_799_000;
		if (new TextEncoder().encode(JSON.stringify(data)).byteLength + reserveBytes > limit)
			throw new Error(
				'This brief is near its private storage limit. Split the source into explicit brief parts before another AI request; nothing was truncated.'
			);
	}
	async function persistSourceAnalysis(
		controller: AbortController,
		owner: string,
		text: string,
		url: string,
		fingerprint: string,
		chunks: SourceChunk[],
		quotes: CreativeQuote[],
		titles: any[]
	) {
		assertSourceRun(controller, owner, text, url);
		const data = $state.snapshot(brief);
		if (!data.name.trim()) data.name = (data.title || 'Untitled thumbnail brief').slice(0, 120);
		data.analysis = {
			sourceFingerprint: fingerprint,
			quotes,
			titles,
			chunks,
			selectedQuoteIds: selectedQuoteIds.filter((id) => quotes.some((quote) => quote.id === id))
		};
		assertSourceSaveCapacity(data);
		const record = await new CreativeClient(
			owner,
			AbortSignal.any([controller.signal, lifetime.signal])
		).save('briefs', data, selectedBrief);
		assertSourceRun(controller, owner, text, url);
		replaceRecord(record);
		briefId = record.id;
		brief.name = record.data.name;
		brief.analysis = record.data.analysis;
		sourceFingerprint = fingerprint;
		sourceChunks = chunks;
		sourceQuotes = quotes;
		sourceTitles = titles;
	}
	async function analyzeSource() {
		if (!user) return;
		const controller = new AbortController();
		operation = controller;
		const owner = user.id,
			text = brief.transcript,
			url = brief.sourceUrl,
			hints = brief.hints;
		try {
			const fingerprint = await creativeSourceFingerprint(text, url);
			assertSourceRun(controller, owner, text, url);
			const sameSource = sourceFingerprint === fingerprint;
			const plan = planCreativeSourceRun(
				parseCreativeTranscript(text),
				sameSource ? sourceChunks : [],
				maxSourceChunks
			);
			const metadata: SourceChunk[] = plan.chunks.map((chunk) => ({
				index: chunk.index,
				startOffset: chunk.startOffset,
				endOffset: chunk.endOffset,
				status: sameSource && processedChunks.includes(chunk.index) ? 'succeeded' : 'pending'
			}));
			await persistSourceAnalysis(
				controller,
				owner,
				text,
				url,
				fingerprint,
				metadata,
				sameSource ? sourceQuotes : [],
				sameSource ? sourceTitles : []
			);
			for (const chunk of plan.run) {
				assertSourceRun(controller, owner, text, url);
				assertSourceSaveCapacity($state.snapshot(brief), 24_000);
				status = `Extracting chunk ${chunk.index + 1} of ${plan.chunks.length} · this run capped at ${plan.run.length} requests…`;
				try {
					const result = await creativeSourceRequest(
						owner,
						{
							action: 'analyze',
							sourceText: text,
							hints,
							sourceUrl: url || undefined,
							chunkIndex: chunk.index
						},
						AbortSignal.any([controller.signal, lifetime.signal])
					);
					assertSourceRun(controller, owner, text, url);
					if (
						result.chunkIndex !== chunk.index ||
						result.coverage?.totalChunks !== plan.chunks.length ||
						!Array.isArray(result.quotes)
					)
						throw new Error(
							'Source service returned incompatible coverage. Existing results are unchanged.'
						);
					const quotes = [...sourceQuotes, ...result.quotes];
					const next = sourceChunks.map((item) =>
						item.index === chunk.index ? { ...item, status: 'succeeded' as const } : item
					);
					await persistSourceAnalysis(
						controller,
						owner,
						text,
						url,
						fingerprint,
						next,
						quotes,
						sourceTitles
					);
				} catch (cause) {
					assertSourceRun(controller, owner, text, url);
					const message =
						cause instanceof Error ? cause.message : 'This chunk could not be completed.';
					const next = sourceChunks.map((item) =>
						item.index === chunk.index
							? { ...item, status: 'failed' as const, error: message.slice(0, 2000) }
							: item
					);
					await persistSourceAnalysis(
						controller,
						owner,
						text,
						url,
						fingerprint,
						next,
						sourceQuotes,
						sourceTitles
					);
					throw cause;
				}
			}
			status = `Evidence saved: ${sourceChunks.filter((item) => item.status === 'succeeded').length}/${plan.chunks.length} chunks. ${plan.remaining > plan.run.length ? 'Run the next bounded batch to continue. ' : ''}Review and select quotes for titles.`;
		} catch (cause) {
			if (cause instanceof DOMException && cause.name === 'AbortError') status = cause.message;
			else throw cause;
		} finally {
			if (operation === controller) operation = null;
		}
	}
	async function createTitles() {
		if (!user) return;
		const evidence = selectCreativeEvidence(sourceQuotes, selectedQuoteIds);
		if (sourceTitles.length > 92)
			throw new Error(
				'This brief already has many saved title versions. Start a separate brief before another title pass.'
			);
		const controller = new AbortController();
		operation = controller;
		const owner = user.id,
			text = brief.transcript,
			url = brief.sourceUrl;
		try {
			const fingerprint = await creativeSourceFingerprint(text, url);
			assertSourceRun(controller, owner, text, url);
			if (fingerprint !== sourceFingerprint)
				throw new Error(
					'This source changed. Extract and review its quotes before drafting titles.'
				);
			status = 'Drafting title and hook options from your selected evidence only…';
			assertSourceSaveCapacity($state.snapshot(brief), 24_000);
			const result = await creativeSourceRequest(
				owner,
				{
					action: 'titles',
					sourceText: text,
					fewShot: $state.snapshot(briefFewShot),
					hints: brief.hints,
					evidence,
					sourceUrl: url || undefined
				},
				AbortSignal.any([controller.signal, lifetime.signal])
			);
			assertSourceRun(controller, owner, text, url);
			if (!Array.isArray(result.titles) || result.coverage?.status !== 'evidence-only')
				throw new Error('Invalid title response; earlier options are unchanged.');
			const batch = crypto.randomUUID();
			await persistSourceAnalysis(
				controller,
				owner,
				text,
				url,
				fingerprint,
				sourceChunks,
				sourceQuotes,
				[
					...result.titles.map((title: any) => ({ ...title, id: `${batch}:${title.id}` })),
					...sourceTitles
				]
			);
			status =
				'New title options saved above earlier versions. Generated copy needs review; selected quotes are not full-source coverage.';
		} catch (cause) {
			if (cause instanceof DOMException && cause.name === 'AbortError') status = cause.message;
			else throw cause;
		} finally {
			if (operation === controller) operation = null;
		}
	}
	function selectQuote(id: string) {
		const next = toggle(selectedQuoteIds, id);
		try {
			if (next.length) selectCreativeEvidence(sourceQuotes, next);
			selectedQuoteIds = next;
			if (brief.analysis) brief.analysis.selectedQuoteIds = next;
			error = '';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Choose fewer quotations.';
		}
	}
	function timestampLabel(ms: number | null) {
		if (ms === null) return 'time unavailable';
		const seconds = Math.floor(ms / 1000);
		return `${Math.floor(seconds / 3600)
			.toString()
			.padStart(2, '0')}:${Math.floor((seconds / 60) % 60)
			.toString()
			.padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
	}
	function changeChannel() {
		operation?.abort();
		channelVideos = [];
		nextVideoPage = '';
	}
	async function addChannel(lookup = true) {
		if (!user) return;
		const owner = user.id,
			normalized = normalizeYouTubeChannel(channelInput);
		const controller = new AbortController();
		operation = controller;
		try {
			const source = lookup
				? (
						await creativeSourceRequest(
							owner,
							{ action: 'channel', channel: channelInput },
							AbortSignal.any([controller.signal, lifetime.signal])
						)
					).channel
				: {
						id: normalized.kind === 'id' ? normalized.value : undefined,
						title: normalized.value,
						url: normalized.url
					};
			if (controller.signal.aborted || lifetime.signal.aborted || user?.id !== owner) return;
			if (!source?.title || !source.url)
				throw new Error('Channel metadata unavailable; no channel was saved.');
			const existing = library.records.channels.find(
				(item) => item.data.url === source.url || (source.id && item.data.channelId === source.id)
			);
			const record = await new CreativeClient(
				owner,
				AbortSignal.any([controller.signal, lifetime.signal])
			).save(
				'channels',
				{
					...(existing?.data ?? {}),
					...(source.id ? { channelId: source.id } : {}),
					name: source.title,
					url: source.url,
					references: existing?.data.references ?? []
				},
				existing
			);
			if (controller.signal.aborted || lifetime.signal.aborted || user?.id !== owner) return;
			replaceRecord(record);
			channelId = record.id;
			channelVideos = [];
			nextVideoPage = '';
			status = lookup
				? 'Public channel saved. No YouTube account was connected.'
				: 'Channel URL saved without lookup. No reference metadata or media was fetched.';
		} finally {
			if (operation === controller) operation = null;
		}
	}
	async function browseVideos(more = false) {
		if (!user) return;
		const channel = library.records.channels.find((item) => item.id === channelId);
		if (!channel) return;
		const owner = user.id,
			controller = new AbortController();
		operation = controller;
		const active = () =>
			!controller.signal.aborted &&
			!lifetime.signal.aborted &&
			user?.id === owner &&
			channelId === channel.id;
		try {
			let resolved = channel.data.channelId;
			if (!resolved) {
				const result = await creativeSourceRequest(
					owner,
					{ action: 'channel', channel: channel.data.url },
					AbortSignal.any([controller.signal, lifetime.signal])
				);
				if (!active()) return;
				resolved = result.channel?.id;
				if (!resolved) throw new Error('Channel could not be resolved.');
			}
			const result = await creativeSourceRequest(
				owner,
				{
					action: 'videos',
					channelId: resolved,
					...(more && nextVideoPage ? { pageToken: nextVideoPage } : {})
				},
				AbortSignal.any([controller.signal, lifetime.signal])
			);
			if (!active()) return;
			if (!Array.isArray(result.videos) || result.channel?.id !== resolved)
				throw new Error('Video reference page is unavailable. Previous references are unchanged.');
			channelVideos = [
				...new Map(
					[...(more ? channelVideos : []), ...result.videos].map((video) => [video.id, video])
				).values()
			];
			nextVideoPage = result.nextPageToken ?? '';
			status = `${channelVideos.length} public video references loaded${nextVideoPage ? ' · more pages available' : ' · end of this public listing'}. This does not include inaccessible videos.`;
		} finally {
			if (operation === controller) operation = null;
		}
	}
	async function saveVideoReference(video: any) {
		const channel = library.records.channels.find((item) => item.id === channelId);
		if (!channel) return;
		if (!channelVideos.some((item) => item.id === video.id && item.channelId === video.channelId))
			throw new Error('Browse this channel again before saving that reference.');
		const reference = {
			videoId: video.id,
			title: video.title,
			...(video.thumbnailUrl ? { thumbnailUrl: video.thumbnailUrl } : {}),
			...(video.publishedAt ? { publishedAt: video.publishedAt } : {}),
			retrievedAt: video.retrievedAt,
			note: ''
		};
		const refs = channel.data.references ?? [];
		const owner = user?.id;
		const record = await client().save(
			'channels',
			{
				...channel.data,
				channelId: video.channelId,
				references: [...refs.filter((item: any) => item.videoId !== reference.videoId), reference]
			},
			channel
		);
		if (lifetime.signal.aborted || user?.id !== owner) return;
		replaceRecord(record);
		status =
			'Reference bookmarked. It is not attached to a model or copied into your asset library.';
	}
	async function imageInputs(ids: string[], role?: string) {
		return Promise.all(
			ids.map(async (id) => {
				const asset = library.assets.find((item) => item.id === id);
				if (!asset) throw new Error('An attached asset is unavailable.');
				const bitmap = await createImageBitmap(await client().asset(id));
				const item = {
					id,
					assetId: id,
					name: asset.name,
					width: bitmap.width,
					height: bitmap.height,
					...(role ? { role } : {})
				};
				bitmap.close();
				return item;
			})
		);
	}
	async function saveThumbnailReference(videoId: string, title: string) {
		if (!user) return;
		const owner = user.id;
		const bytes = await creativeThumbnailReference(owner, videoId, lifetime.signal);
		if (lifetime.signal.aborted || user?.id !== owner) return;
		await new CreativeClient(owner, lifetime.signal).upload(
			bytes,
			`${title.slice(0, 100)}-${videoId}.jpg`,
			'reference'
		);
		await refresh();
		status =
			'Thumbnail saved to your private Assets. Select it in Compose or a house revision to use it; no model received it.';
	}
	async function createCompositions() {
		if (!brief.hook.trim()) throw new Error('Enter a headline hook before making compositions.');
		const saved = await saveBrief();
		const house = brief.kitId
			? await client().request(`/records/kits/${brief.kitId}/revisions/${brief.kitRevision}`)
			: null;
		const houseData = house?.data ?? newKitDraft();
		const people = (await imageInputs(brief.peopleAssetIds ?? [])).map((person) => ({
			...person,
			name: brief.peopleNames?.find((item: any) => item.assetId === person.assetId)?.name ?? ''
		}));
		const logos = await imageInputs(brief.logoAssetIds ?? [], 'brand');
		for (let i = 0; i < variants; i++) {
			const direction = CREATIVE_DIRECTIONS[i % CREATIVE_DIRECTIONS.length];
			const recipe = {
				format: 'youtube',
				direction: direction.id,
				headline: brief.hook,
				people,
				logos,
				kit: { brand: houseData.brand, ...houseData.colors, fontFamily: houseData.fontFamily }
			};
			const data = {
				name: `${brief.name.slice(0, 90)} · ${direction.label}`,
				briefId: saved.id,
				briefRevision: saved.revision,
				kitId: brief.kitId,
				kitRevision: brief.kitRevision,
				direction: direction.id,
				headline: brief.hook,
				prompt: compileCreativePrompt(houseData.prompt ?? '', brief, direction, feedbackText),
				referenceAssetIds: [...(brief.referenceAssetIds ?? [])],
				...(parentCompositionId ? { parentId: parentCompositionId } : {}),
				status: 'ready',
				recipe
			};
			const record = await client().save('compositions', data);
			replaceRecord(record);
			if (i === 0) selectedCompositionId = record.id;
		}
		view = 'versions';
		versionBriefId = saved.id;
		status = `${variants} editable layouts saved. No image generation ran; the canvas is unchanged.`;
	}
	async function saveFeedback() {
		if (!selectedComposition) return;
		const record = await client().save('feedback', {
			compositionId: selectedComposition.id,
			text: feedbackText,
			rating: feedbackRating,
			scope: feedbackScope
		});
		replaceRecord(record);
		status = 'Feedback saved. House defaults have not changed.';
	}
	function branch() {
		if (!selectedComposition) return;
		const composition = selectedComposition;
		const source = library.records.briefs.find((record) => record.id === composition.data.briefId);
		if (source && source.id !== briefId) chooseBrief(source);
		parentCompositionId = composition.id;
		brief.hook = composition.data.headline;
		brief.kitId = composition.data.kitId;
		brief.kitRevision = composition.data.kitRevision;
		view = 'compose';
		status =
			'Branching from the selected version. Edit the hook, hints, or selected feedback, then create new layouts.';
	}
	function scan(delta: number) {
		if (!compositions.length) return;
		const i = compositions.findIndex((item) => item.id === selectedCompositionId);
		selectedCompositionId =
			compositions[(i + delta + compositions.length) % compositions.length].id;
	}
	function keyboard(event: KeyboardEvent) {
		if (
			!open ||
			view !== 'versions' ||
			(event.target as HTMLElement)?.matches('input,textarea,select')
		)
			return;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			scan(event.key === 'ArrowLeft' ? -1 : 1);
		}
	}
</script>

<svelte:window onkeydown={keyboard} />
<dialog
	bind:this={dialog}
	class="creative-workspace"
	aria-label="Creative workspace"
	oncancel={(event) => {
		event.preventDefault();
		close();
	}}
	onclick={(event) => {
		if (event.target === dialog) close();
	}}
>
	<div class="workspace-shell">
		<header>
			<div>
				<span class="eyebrow">THUMBNAIL WORKSPACE</span>
				<h2>Shows & examples</h2>
			</div>
			<button class="close" aria-label="Close creative workspace" onclick={close}>×</button>
		</header>
		<div class="identity">
			<span>{user ? user.email : 'Guest · canvas tools remain available'}</span><span
				>Private assets · editable artwork</span
			>
		</div>
		<nav aria-label="Creative workspace sections">
			{#each tabs as tab}<button
					class:active={view === tab.id}
					aria-current={view === tab.id ? 'page' : undefined}
					onclick={() => {
						view = tab.id;
						if (tab.id === 'examples') exampleTarget = 'brief';
					}}>{tab.label}</button
				>{/each}
		</nav>
		{#if busy || status}<div class="progress" role="status">
				<span>{status || 'Saving…'}</span>{#if operation}<button
						onclick={() => {
							operation?.abort();
							status = 'Stopped. Completed source chunks remain saved.';
						}}>Stop</button
					>{/if}
			</div>{/if}
		{#if error}<div class="notice error" role="alert">
				{error} <button disabled={busy} onclick={() => void refresh()}>Reload library</button>
			</div>{/if}
		<main bind:this={content}>
			{#if fieldUndo}<div class="notice field-change">
					Draft fields updated. <button disabled={busy} onclick={undoFields}
						>Undo field changes</button
					>
				</div>{/if}
			{#if importPreview}<section
					class="notice import-review"
					aria-label="Review imported video metadata"
				>
					<h3>Review this video's metadata</h3>
					<strong>{importPreview.video.title}</strong>
					<p>
						{importPreview.video.channelTitle ?? 'Channel unavailable'} · {importPreview.provenance} ·
						{importPreview.retrievedAt?.slice(0, 10)}
					</p>
					{#each importPreview.warnings ?? [] as warning}<p>{warning}</p>{/each}
					<fieldset>
						<legend>Fill only these fields</legend
						>{#each [{ id: 'name', label: 'Brief name' }, { id: 'title', label: 'Episode title' }, { id: 'description', label: 'Video description' }] as field}<label
								class="check"
								><input
									type="checkbox"
									disabled={field.id === 'description' &&
										importPreview.video.description === undefined}
									checked={importFields.includes(field.id)}
									onchange={() => (importFields = toggle(importFields, field.id))}
								/>{field.label}</label
							>{/each}
					</fieldset>
					{#if importPreview.video.description}<details>
							<summary>Video description</summary>
							<pre>{importPreview.video.description}</pre>
						</details>{/if}<button onclick={applyMetadata}>Apply selected metadata fields</button
					><button onclick={() => (importPreview = null)}>Keep my draft unchanged</button>
				</section>{/if}
			{#if demoPreview}<section class="notice import-review" aria-label="Review demo field changes">
					<h3>Try this reference as a demo</h3>
					<p>
						This copies another video's content into selected fields for exploration. It is not a
						claim about your next episode.
					</p>
					<strong>{demoPreview.title}</strong>
					<fieldset>
						<legend>Fill only these fields</legend
						>{#each [{ id: 'name', label: 'Demo name' }, { id: 'title', label: 'Example title' }, { id: 'hook', label: 'Observed thumbnail hook' }] as field}<label
								class="check"
								><input
									type="checkbox"
									disabled={field.id === 'hook' && !demoPreview.thumbnailText}
									checked={demoFields.includes(field.id)}
									onchange={() => (demoFields = toggle(demoFields, field.id))}
								/>{field.label}</label
							>{/each}
					</fieldset>
					<button onclick={applyDemo}>Apply selected demo fields</button><button
						onclick={() => (demoPreview = null)}>Cancel demo</button
					>
				</section>{/if}
			{#if !user && !['start', 'examples', 'export'].includes(view)}
				<div class="empty">
					<h3>Your own assets. Your own house style.</h3>
					<p>
						Sign in to keep brand kits, sources, and versions across visits. You can still use the
						drawing canvas and create an editable blank artboard.
					</p>
					<div class="actions">
						<a class="primary" href="/tools?next=/tools/draw">Sign in with Google</a><button
							onclick={() => {
								onBlank();
								close();
							}}>Create blank 1280 × 720</button
						>
					</div>
				</div>
			{:else if loading}<p class="empty">Loading your private library…</p>
			{:else if view === 'start'}
				{#if !user}<p class="notice">
						Explore public examples and draft fields here. <a href="/tools?next=/tools/draw"
							>Sign in</a
						> to import metadata and save your own show; guest drafts are not automatically uploaded.
					</p>{/if}
				<DrawShowBrief
					signedIn={Boolean(user)}
					draft={brief}
					{firstRun}
					briefs={library.records.briefs}
					kits={library.records.kits}
					{busy}
					currentBriefId={briefId}
					fewShot={briefFewShot}
					{promptPreview}
					onPatch={patchBrief}
					onContinue={chooseBrief}
					onNew={newSourceBrief}
					onPreset={applyStarter}
					onImport={() => void perform(importMetadata)}
					onExamples={() => {
						exampleTarget = 'brief';
						view = 'examples';
					}}
					onSources={() => (view = 'sources')}
					onKit={() => (view = 'kits')}
					onUseKit={(id) =>
						void perform(async () => {
							const record = library.records.kits.find((item) => item.id === id);
							if (record) await pinKit(record);
						})}
					onSave={() =>
						void perform(async () => {
							await saveBrief();
						})}
					onCompose={() => (view = 'compose')}
				/>
			{:else if view === 'examples'}
				<div class="actions">
					<button onclick={() => (view = exampleTarget === 'house' ? 'kits' : 'start')}
						>← Back to {exampleTarget === 'house' ? 'house draft' : 'show brief'}</button
					><span
						>Editing examples for: {exampleTarget === 'house'
							? 'house-prompt draft'
							: 'current show draft'}</span
					>
				</div>
				<DrawReferenceExamples
					selection={exampleTarget === 'house' ? kit.fewShot : briefFewShot}
					{busy}
					onChange={updateExamples}
					onDemo={(example) => {
						demoPreview = example;
						content?.scrollTo({ top: 0 });
					}}
					onSaveImage={user && library.assetsAvailable
						? (example) =>
								void perform(() => saveThumbnailReference(example.videoId, example.title))
						: undefined}
				/>
			{:else if view === 'assets'}
				<section class="section-head">
					<div>
						<h3>Assets you can use again.</h3>
						<p>Saving, inserting, and attaching to a model are separate actions.</p>
					</div>
					<input
						aria-label="Search personal assets"
						placeholder="Search assets…"
						bind:value={assetQuery}
					/>
				</section>
				{#if !library.assetsAvailable}<p class="notice">
						Private binary storage is not configured yet. Brand-kit text and briefs can still be
						saved.
					</p>{/if}
				<div class="actions">
					<select aria-label="Asset role" bind:value={assetRole}
						>{#each ['logo', 'portrait', 'reference', 'background', 'font', 'other'] as role}<option
								value={role}>{role}</option
							>{/each}</select
					><label class="file-button"
						>Save asset<input
							type="file"
							accept="image/png,image/jpeg,image/webp,.woff2"
							disabled={busy || !library.assetsAvailable}
							onchange={upload}
						/></label
					><button
						disabled={busy || !library.assetsAvailable}
						onclick={() => void perform(saveSelectedAsset)}>Save selected canvas image</button
					>
				</div>
				<p class="small">
					PNG, JPG, WebP; licensed WOFF2 files are stored as originals, not automatically installed
					as canvas fonts.
				</p>
				<div class="asset-grid">
					{#each visibleAssets as asset (asset.id)}<article>
							<div class="asset-preview">
								{#if asset.mimeType.startsWith('image/')}<img
										src={`${CREATIVE_API}/assets/${asset.id}`}
										alt={asset.name}
										loading="lazy"
									/>{:else}<span>Aa<br /><small>Font original</small></span>{/if}
							</div>
							<strong>{asset.name}</strong><span class="small"
								>{asset.role} · {Math.ceil(asset.size / 1024)} KB</span
							>
							<div class="actions">
								<button
									disabled={busy || !asset.mimeType.startsWith('image/')}
									onclick={() =>
										void perform(async () => {
											await onInsertAsset(asset);
											close();
										})}>Insert</button
								><button disabled={busy} onclick={() => void perform(() => downloadAsset(asset))}
									>Original</button
								>
							</div>
						</article>{:else}<p class="empty">
							No saved assets yet. Add a logo, real headshot, or visual reference.
						</p>{/each}
				</div>
			{:else if view === 'kits'}
				<div class="split">
					<aside>
						<button
							onclick={() => {
								kitId = '';
								kit = newKitDraft();
								kitRevisions = [];
							}}>+ New brand kit</button
						>{#each library.records.kits as record}<button
								class:selected={kitId === record.id}
								onclick={() => void perform(() => chooseKit(record))}
								><strong>{record.data.name}</strong><small
									>House v{record.activeRevision} · latest v{record.revision}</small
								></button
							>{/each}
					</aside>
					<section class="form">
						<h3>Brand kit & house prompt</h3>
						<label
							>Kit name<input
								bind:value={kit.name}
								placeholder="AIE World’s Fair / Latent Space / Your brand"
							/></label
						>
						<div class="field-row">
							<label
								>Brand<select bind:value={kit.brand}
									><option value="generic">Custom / neutral</option><option value="aie"
										>AI Engineer (your supplied style)</option
									><option value="ls">Latent Space</option><option value="fde">LS × FDE</option
									></select
								></label
							><label
								>Canvas font<select bind:value={kit.fontFamily}
									><option value={2}>Normal</option><option value={1}>Hand-drawn</option><option
										value={3}>Monospace</option
									></select
								></label
							>
						</div>
						<div class="colors">
							{#each ['background', 'foreground', 'accent'] as color}<label
									>{color}<input
										type="color"
										bind:value={kit.colors[color as keyof typeof kit.colors]}
									/></label
								>{/each}
						</div>
						<label
							>House prompt<textarea
								rows="7"
								bind:value={kit.prompt}
								placeholder="Editorial voice, composition preferences, what to preserve, what to avoid…"
							></textarea></label
						><label
							>Font preferences / licensing notes<textarea
								rows="2"
								bind:value={kit.fontNotes}
								placeholder="Preferred family and supplied licensed font asset. Unsupported fonts are not silently substituted."
							></textarea></label
						>
						<fieldset>
							<legend>Reusable assets (not automatically inserted)</legend
							>{#each library.assets as asset}<label class="check"
									><input
										type="checkbox"
										checked={kit.assetIds.includes(asset.id)}
										onchange={() => (kit.assetIds = toggle(kit.assetIds, asset.id))}
									/>{asset.name}</label
								>{/each}
						</fieldset>
						<fieldset>
							<legend>House visual references (not automatically sent)</legend
							>{#each imageAssets as asset}<label class="check"
									><input
										type="checkbox"
										checked={kit.referenceIds.includes(asset.id)}
										onchange={() => (kit.referenceIds = toggle(kit.referenceIds, asset.id))}
									/>{asset.name}</label
								>{/each}
						</fieldset>
						<div class="notice">
							<strong
								>{kit.fewShot?.examples.length ?? 0} curated few-shot examples in this house draft</strong
							>
							<p>
								Saved with the revision. Using the active house copies these text-example selections
								into the show; no images are automatically attached.
							</p>
							<button
								onclick={() => {
									exampleTarget = 'house';
									view = 'examples';
								}}>Choose house examples</button
							>
						</div>
						<div class="actions">
							<button
								class="primary"
								disabled={busy || !kit.name.trim()}
								onclick={() => void perform(saveKit)}
								>{kitId ? 'Save house revision draft' : 'Save new kit'}</button
							>{#if selectedKit}<button disabled={busy} onclick={() => void perform(attachKit)}
									>Use active house for this brief</button
								>{/if}
						</div>
						{#if kitRevisions.length}<h4>House history</h4>
							<p class="small">
								Promotion affects new runs, not existing compositions. Review a revision before
								promoting it.
							</p>
							{#each kitRevisions as revision}<details>
									<summary
										>Revision {revision.revision}{selectedKit?.activeRevision === revision.revision
											? ' · active'
											: ''}</summary
									>
									<pre>{revision.data.prompt}</pre>
									<p class="small">
										{revision.data.referenceIds?.length ?? 0} visual references · {revision.data
											.brand}
									</p>
									<button
										disabled={busy || selectedKit?.activeRevision === revision.revision}
										onclick={() => void perform(() => promote(revision.revision))}
										>Use revision {revision.revision} as house default</button
									>
								</details>{/each}{/if}
					</section>
				</div>
			{:else if view === 'sources' || view === 'compose'}
				<div class="split">
					<aside>
						<button disabled={busy} onclick={newSourceBrief}>+ New thumbnail brief</button
						>{#each library.records.briefs as record}<button
								disabled={busy}
								class:selected={briefId === record.id}
								onclick={() => chooseBrief(record)}
								><strong>{record.data.name}</strong><small
									>{record.data.title || 'No title yet'}</small
								></button
							>{/each}
					</aside>
					<section class="form">
						<h3>{view === 'sources' ? 'Start from the source.' : 'Compose, then explore.'}</h3>
						<label
							>Brief name<input
								disabled={busy}
								maxlength="120"
								bind:value={brief.name}
								placeholder="Episode or conference talk"
							/></label
						><label
							>Video / episode title<input
								disabled={busy}
								bind:value={brief.title}
								placeholder="The descriptive title"
							/></label
						><label
							>Thumbnail hook<input
								disabled={busy}
								bind:value={brief.hook}
								placeholder="A short, supported reason to click"
							/></label
						><label
							>Hints & constraints<textarea
								disabled={busy}
								maxlength="2000"
								rows="3"
								bind:value={brief.hints}
								placeholder="Audience, tension, exact guest names, essential companies, topics to avoid…"
							></textarea></label
						>
						{#if view === 'sources'}
							<label
								>Source video URL (including unlisted)<input
									disabled={busy}
									bind:value={brief.sourceUrl}
									placeholder="https://www.youtube.com/watch?v=…"
								/></label
							>
							<p class="small">
								A video link is context only. Paste or attach TXT, SRT or VTT; no captions, video or
								audio are retrieved. Changing the source clears its extraction results from this
								draft.
							</p>
							<label
								>Transcript<textarea
									disabled={busy}
									class="transcript"
									rows="8"
									bind:value={brief.transcript}
									placeholder="Paste a long transcript, SRT, or VTT…"
								></textarea></label
							><label class="file-button"
								>Load transcript file<input
									disabled={busy}
									type="file"
									accept=".txt,.srt,.vtt"
									onchange={readSourceFile}
								/></label
							>
							{#if sourcePlan.error}<p class="notice" role="alert">{sourcePlan.error}</p>{/if}
							<p class="notice">
								Extraction sends only the current transcript chunk and hints to the shared AI
								service. Titles send your selected exact quotes and hints. Each request reserves ${TOOLS_AI_POLICY.assistantReservationUsd.toFixed(
									2
								)} against shared funded AI limits; this is not actual provider billing. No images are
								generated. Stop prevents further requests; an in-flight request may still use quota.
							</p>
							<label
								>Maximum chunks this run<select disabled={busy} bind:value={maxSourceChunks}
									>{#each [1, 2, 4, 8] as count}<option value={count}>{count} chunks</option
										>{/each}</select
								></label
							>
							{#if sourcePlan.plan}<p class="small">
									{sourcePlan.plan.remaining} chunks remaining. This click: up to {sourcePlan.plan
										.run.length} requests · ${sourcePlan.plan.estimatedRunUsd.toFixed(2)} reserved. All
									remaining chunks: ${sourcePlan.plan.estimatedRemainingUsd.toFixed(2)}; titles are
									a separate ${TOOLS_AI_POLICY.assistantReservationUsd.toFixed(2)} request. Quota limits
									can pause the run.
								</p>{/if}
							<div class="actions">
								<button
									disabled={busy || !sourcePlan.plan?.run.length}
									onclick={() => void perform(analyzeSource)}
									>{processedChunks.length ? 'Run next evidence batch' : 'Extract quotes'}</button
								><button
									disabled={busy || !evidenceSelection.quotes.length}
									onclick={() => void perform(createTitles)}
									>Suggest titles from selected quotes</button
								>
							</div>
							{#if briefFewShot.examples.length}<details>
									<summary
										>{briefFewShot.examples.length} selected examples · title-prompt preview</summary
									>
									<p>
										Only title/hook demonstrations are included in this text request. They are not
										evidence about this episode; images are not attached.
									</p>
									<pre>{titleExamplePreview}</pre>
									<button
										onclick={() => {
											exampleTarget = 'brief';
											view = 'examples';
										}}>Change examples</button
									>
								</details>{/if}
							{#if totalChunks}<p>
									Coverage: {processedChunks.length}/{totalChunks} chunks · {processedChunks.length <
									totalChunks
										? 'partial'
										: 'complete extraction; not audio verification'}
								</p>{:else}<p class="small">
									Coverage unavailable until a readable transcript is supplied.
								</p>{/if}
							{#each sourceChunks.filter((chunk) => chunk.status === 'failed') as chunk}<p
									class="notice"
								>
									Chunk {chunk.index + 1} failed: {chunk.error}. The next batch retries it; earlier
									chunks remain saved.
								</p>{/each}
							{#if sourceQuotes.length}<p class="small">
									{selectedQuoteIds.length} selected for titles · maximum 80 quotes / 32 KB. Selection
									is saved with the brief. Exact text does not establish the truth of a claim.
								</p>{/if}
							{#if selectedQuoteIds.length && evidenceSelection.error}<p class="notice">
									{evidenceSelection.error}
								</p>{/if}
							{#each sourceQuotes as quote (quote.id)}<div>
									<label class="check"
										><input
											type="checkbox"
											disabled={busy}
											checked={selectedQuoteIds.includes(quote.id)}
											onchange={() => selectQuote(quote.id)}
										/>Use quote {quote.id} for titles</label
									>
									<details>
										<summary>{quote.text}</summary>
										<p class="small">
											Transcript-exact; not audio-verified. {quote.speaker
												? `Supplied speaker: ${quote.speaker}.`
												: 'Speaker unavailable.'} Cue: {timestampLabel(
												quote.startMs
											)}{quote.endMs === null ? '' : `–${timestampLabel(quote.endMs)}`} · exact character
											span {quote.startOffset}–{quote.endOffset}.
										</p>
										<pre>{brief.transcript.slice(
												Math.max(0, quote.startOffset - 120),
												quote.endOffset + 120
											)}</pre>
									</details>
								</div>{/each}
							{#each sourceTitles as option (option.id)}<article class="title-option">
									<strong>{option.title}</strong>
									<p>Thumbnail: {option.hook}</p>
									<p class="small">
										Generated copy · review against evidence: {option.evidenceIds.join(', ')}. Not a
										spoken quote.
									</p>
									<button
										disabled={busy}
										onclick={() => {
											brief.title = option.title;
											brief.hook = option.hook;
											view = 'compose';
										}}>Use this pair</button
									>
								</article>{/each}
							<details class="channels">
								<summary>Saved channel references</summary><label
									>YouTube channel<input
										disabled={busy}
										bind:value={channelInput}
										placeholder="@handle or channel URL"
									/></label
								>
								<div class="actions">
									<button
										disabled={busy || !channelInput.trim()}
										onclick={() => void perform(() => addChannel(true))}
										>Look up & save channel</button
									><button
										disabled={busy || !channelInput.trim()}
										onclick={() => void perform(() => addChannel(false))}
										>Save URL only · no lookup</button
									>
								</div>
								<select
									disabled={busy}
									aria-label="Saved channel"
									bind:value={channelId}
									onchange={changeChannel}
									><option value="">Choose a saved channel</option
									>{#each library.records.channels as channel}<option value={channel.id}
											>{channel.data.name}</option
										>{/each}</select
								>
								<div class="actions">
									<button
										disabled={busy || !channelId}
										onclick={() => void perform(() => browseVideos())}>Browse past videos</button
									><button
										disabled={busy || !channelId}
										onclick={() => {
											brief.channelId = channelId;
											status =
												'Channel selected for this draft. Save the brief to retain the link.';
										}}>Use channel for this brief</button
									>
								</div>
								<p class="small">
									Public reference browsing does not attach thumbnails to a model or connect a
									YouTube account. Save only references you have rights to reuse. “Save thumbnail to
									Assets” uploads the image into your private library; it does not send it to a
									model.
								</p>
								{#if selectedChannel?.data.references?.length}<details>
										<summary
											>{selectedChannel.data.references.length} saved reference bookmarks</summary
										>{#each selectedChannel.data.references as reference}<p>
												<a
													href={`https://www.youtube.com/watch?v=${reference.videoId}`}
													target="_blank"
													rel="noreferrer">{reference.title}</a
												><small>
													· metadata saved {reference.retrievedAt ??
														'at an unavailable date'}</small
												>
												<button
													disabled={busy || !library.assetsAvailable}
													onclick={() =>
														void perform(() =>
															saveThumbnailReference(reference.videoId, reference.title)
														)}>Save thumbnail to Assets</button
												>
											</p>{/each}
									</details>{/if}
								<div class="channel-grid">
									{#each channelVideos as video (video.id)}<article>
											{#if video.thumbnailUrl}<img
													src={video.thumbnailUrl}
													alt=""
													loading="lazy"
													referrerpolicy="no-referrer"
												/>{/if}<strong>{video.title}</strong><button
												disabled={busy}
												onclick={() => void perform(() => saveVideoReference(video))}
												>Save reference bookmark</button
											>
											<button
												disabled={busy || !library.assetsAvailable}
												onclick={() =>
													void perform(() => saveThumbnailReference(video.id, video.title))}
												>Save thumbnail to Assets</button
											>
										</article>{/each}
								</div>
								{#if nextVideoPage}<button
										disabled={busy}
										onclick={() => void perform(() => browseVideos(true))}>Load more videos</button
									>{/if}
							</details>
						{:else}
							<div class="actions">
								<select aria-label="House brand kit" bind:value={composeKitId}
									><option value="">No kit / neutral</option
									>{#each library.records.kits as record}<option value={record.id}
											>{record.data.name} · house v{record.activeRevision}</option
										>{/each}</select
								><button
									disabled={busy || !composeKitId}
									onclick={() => {
										const record = library.records.kits.find((item) => item.id === composeKitId);
										if (record) void perform(() => pinKit(record));
									}}>Pin house revision</button
								>
							</div>
							<p class="small">
								{brief.kitId
									? `Pinned house revision ${brief.kitRevision}`
									: 'Neutral composition. No approved AIE video style is assumed.'}
							</p>
							{#each [{ key: 'peopleAssetIds', label: 'Real people / headshots' }, { key: 'logoAssetIds', label: 'Exact logos' }, { key: 'referenceAssetIds', label: 'References selected for a future model run' }] as group}<fieldset
								>
									<legend>{group.label}</legend>{#each imageAssets as asset}<label class="check"
											><input
												type="checkbox"
												checked={(brief[group.key] ?? []).includes(asset.id)}
												onchange={() =>
													(brief[group.key] = toggle(brief[group.key] ?? [], asset.id))}
											/>{asset.name}</label
										>{:else}<p class="small">Save your images in Assets first.</p>{/each}
								</fieldset>{/each}
							{#each brief.peopleAssetIds ?? [] as assetId}<label
									>Exact display name · {library.assets.find((asset) => asset.id === assetId)?.name}
									<input
										maxlength="120"
										value={brief.peopleNames?.find((item: any) => item.assetId === assetId)?.name ??
											''}
										placeholder="Name as credited; blank omits the name layer"
										oninput={(event) => {
											brief.peopleNames = [
												...(brief.peopleNames ?? []).filter(
													(item: any) => item.assetId !== assetId
												),
												{ assetId, name: event.currentTarget.value }
											];
										}}
									/>
								</label>{/each}
							<label
								>Feedback to apply to this branch<textarea
									rows="2"
									bind:value={feedbackText}
									placeholder="Only this selected feedback is included in the next prompt."
								></textarea></label
							>
							<div class="direction-grid">
								{#each CREATIVE_DIRECTIONS as direction}<div>
										<strong>{direction.label}</strong>
										<p>{direction.description}</p>
									</div>{/each}
							</div>
							{#if !brief.peopleAssetIds?.length}<p class="small">
									Attach real portraits for the portrait-led and split layouts. Without portraits
									these use a text-only fallback; no faces are invented.
								</p>{/if}
							<div class="actions">
								<button
									class="primary"
									disabled={busy || !brief.hook.trim()}
									onclick={() => void perform(createCompositions)}
									>Create 4 editable layouts · no AI cost</button
								><button
									onclick={() => {
										onBlank();
										close();
									}}>Blank 1280 × 720</button
								>
							</div>
						{/if}
						<div class="actions">
							<button
								disabled={busy}
								onclick={() =>
									void perform(async () => {
										await saveBrief();
									})}>Save brief</button
							><button onclick={() => (view = view === 'sources' ? 'compose' : 'sources')}
								>{view === 'sources' ? 'Compose →' : '← Sources'}</button
							>
						</div>
					</section>
				</div>
			{:else if view === 'versions'}
				<section class="section-head">
					<div>
						<h3>Keep what works. Try another direction.</h3>
						<p>
							Saved compositions are independent versions. Nothing enters the canvas until Insert.
						</p>
					</div>
					<select aria-label="Filter versions by brief" bind:value={versionBriefId}
						><option value="">All briefs</option>{#each library.records.briefs as record}<option
								value={record.id}>{record.data.name}</option
							>{/each}</select
					>
				</section>
				<div class="version-grid">
					{#each compositions as item (item.id)}<button
							class:chosen={selectedCompositionId === item.id}
							onclick={() => {
								selectedCompositionId = item.id;
								feedbackText = '';
							}}
							aria-label={`Inspect ${item.data.name}`}
							><DrawCreativePreview recipe={item.data.recipe} /><strong>{item.data.name}</strong
							><small
								>{item.data.direction} · {item.data.kitRevision
									? `house v${item.data.kitRevision}`
									: 'neutral'}</small
							></button
						>{:else}<p class="empty">
							Create editable layouts from a brief, then compare and branch here.
						</p>{/each}
				</div>
				{#if selectedComposition}<section class="version-detail">
						<div class="actions">
							<button onclick={() => scan(-1)}>← Previous</button><button onclick={() => scan(1)}
								>Next →</button
							><button
								class="primary"
								disabled={busy}
								onclick={() =>
									void perform(async () => {
										await onInsert(selectedComposition.data.recipe);
										close();
									})}>Insert editable composition</button
							><button disabled={busy} onclick={branch}>Branch from this</button>
						</div>
						<div class="review">
							<DrawCreativePreview recipe={selectedComposition.data.recipe} safeZone={true} />
						</div>
						<p class="small">
							320 × 180 approximate review · check the actual native font after insertion. The
							shaded corner is the duration-badge exclusion zone, not exported artwork.
						</p>
						<details>
							<summary>Exact saved prompt</summary>
							<pre>{selectedComposition.data.prompt}</pre>
						</details>
						{#if onGenerate}<button
								disabled={busy}
								onclick={() =>
									void perform(async () => {
										await onGenerate?.({
											prompt: selectedComposition.data.prompt,
											referenceAssetIds: selectedComposition.data.referenceAssetIds ?? [],
											context: {
												briefId: selectedComposition.data.briefId,
												briefRevision: selectedComposition.data.briefRevision,
												houseKitId: selectedComposition.data.kitId,
												houseRevision: selectedComposition.data.kitRevision,
												directionId: selectedComposition.data.direction,
												parentResultIds: [selectedComposition.id]
											}
										});
									})}>Open in shared Generate</button
							>{/if}
						<label
							>Feedback<textarea
								rows="3"
								bind:value={feedbackText}
								placeholder="What should change? What should stay?"
							></textarea></label
						>
						<div class="actions">
							<select aria-label="Feedback rating" bind:value={feedbackRating}
								><option value="neutral">Note</option><option value="favorite">Favorite</option
								><option value="reject">Reject</option></select
							><select aria-label="Feedback scope" bind:value={feedbackScope}
								><option value="candidate">This composition</option><option value="episode"
									>This episode</option
								><option value="house">Propose for house</option></select
							><button disabled={busy} onclick={() => void perform(saveFeedback)}
								>Save feedback</button
							>
						</div>
						{#each notes as note}<blockquote>
								{note.data.text || note.data.rating}<small
									>{note.data.rating} · {note.data.scope}</small
								>
							</blockquote>{/each}
						<p class="small">
							Feedback never silently changes the house. Edit and promote a house revision in Brand
							kits.
						</p>
					</section>{/if}
			{:else if view === 'export'}
				<section class="form">
					<h3>One composition, more places.</h3>
					<p>
						Select a creative artboard on the canvas, then create editable format variants. The
						source stays intact.
					</p>
					<fieldset>
						<legend>Format variants</legend>{#each CREATIVE_FORMATS as format}<label class="check"
								><input
									type="checkbox"
									checked={selectedFormats.includes(format.id)}
									onchange={() => (selectedFormats = toggle(selectedFormats, format.id))}
								/>{format.label} · {format.width} × {format.height}</label
							>{/each}
					</fieldset>
					<button
						disabled={busy || !selectedFormats.length}
						onclick={() =>
							void perform(async () => {
								await onAdapt(selectedFormats);
								close();
							})}>Create format variants</button
					>
					<hr />
					<h3>Download only what you choose.</h3>
					<label
						>Scope<select bind:value={exportScope}
							><option value="artboard">Selected artboard</option><option value="selection"
								>Selected elements</option
							><option value="campaign">All creative artboards · ZIP</option></select
						></label
					><label
						>Format<select bind:value={exportFormat}
							><option value="png">PNG</option><option value="jpg">JPG</option><option value="svg"
								>SVG</option
							></select
						></label
					><label class="check"
						><input
							type="checkbox"
							bind:checked={transparent}
							disabled={exportFormat === 'jpg'}
						/>Transparent background (PNG / SVG)</label
					>
					<p class="small">
						Campaign bundles contain artwork and a file manifest, not your private prompts,
						references, or font originals. Existing generated clips remain downloadable from shared
						generation history.
					</p>
					<button
						class="primary"
						disabled={busy}
						onclick={() =>
							void perform(async () => {
								await onExport({
									format: exportFormat,
									transparent: exportFormat !== 'jpg' && transparent,
									scope: exportScope
								});
								status = 'Download prepared.';
							})}>Download</button
					>
				</section>
			{/if}
		</main>
		<footer>
			<span
				>{busy
					? 'Work continues if you close this panel.'
					: 'Same tools in every starting mode.'}</span
			><button onclick={close}>Back to canvas</button>
		</footer>
	</div>
</dialog>

<style>
	.creative-workspace {
		padding: 0;
		border: 1px solid #d8d6e2;
		border-radius: 16px;
		width: min(1160px, calc(100vw - 40px));
		max-width: none;
		height: min(850px, calc(100dvh - 40px));
		max-height: none;
		color: #282635;
		background: #faf9fc;
		box-shadow: 0 22px 100px #16132240;
		font:
			14px/1.5 Arial,
			sans-serif;
	}
	.creative-workspace::backdrop {
		background: #17142670;
		backdrop-filter: blur(2px);
	}
	.workspace-shell {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px 28px 14px;
		background: white;
	}
	h2 {
		font-size: 28px;
		letter-spacing: -1px;
		margin: 2px 0;
	}
	h3 {
		font-size: 20px;
		letter-spacing: -0.4px;
		margin: 0 0 8px;
	}
	h4 {
		margin-bottom: 4px;
	}
	.eyebrow {
		font: 11px/1.4 monospace;
		color: #756592;
		letter-spacing: 1.5px;
	}
	.identity {
		display: flex;
		justify-content: space-between;
		padding: 8px 28px;
		border-block: 1px solid #eceaf0;
		color: #666174;
		font-size: 12px;
		background: #fff;
	}
	nav {
		display: flex;
		gap: 4px;
		padding: 10px 24px;
		border-bottom: 1px solid #e3dfeb;
		overflow-x: auto;
		flex-shrink: 0;
	}
	button,
	a.primary,
	.file-button {
		border: 1px solid #ddd8e7;
		background: #fff;
		color: #343040;
		padding: 9px 13px;
		border-radius: 7px;
		font: inherit;
		text-decoration: none;
		cursor: pointer;
		white-space: normal;
	}
	button:hover,
	a.primary:hover,
	.file-button:hover {
		background: #f1edf8;
	}
	button:focus-visible,
	a:focus-visible,
	input:focus-visible,
	textarea:focus-visible,
	select:focus-visible,
	summary:focus-visible {
		outline: 3px solid #a08acb;
		outline-offset: 2px;
	}
	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.primary,
	button.primary {
		background: #62508a;
		color: white;
		border-color: #62508a;
	}
	.close {
		font-size: 26px;
		line-height: 1;
		border: 0;
	}
	nav button {
		background: transparent;
		border: 0;
		white-space: nowrap;
	}
	nav .active {
		background: #e8e1f3;
		color: #4b356e;
		font-weight: bold;
	}
	main {
		padding: 24px 28px;
		overflow: auto;
		flex: 1;
		min-height: 0;
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 24px;
		background: #fff;
		border-top: 1px solid #e3dfeb;
		font-size: 12px;
		color: #6e6779;
	}
	.progress,
	.notice {
		margin: 0;
		padding: 10px 24px;
		background: #f0ecf7;
		color: #554471;
	}
	.progress {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}
	.error {
		background: #fff0ed;
		color: #882d29;
	}
	.notice {
		border-radius: 8px;
		margin: 12px 0;
		padding: 12px 16px;
	}
	p {
		color: #6b6578;
		margin: 6px 0 16px;
	}
	.small,
	small {
		font-size: 12px;
		color: #726b7d;
	}
	.section-head {
		display: flex;
		gap: 16px;
		justify-content: space-between;
		align-items: start;
		margin-bottom: 20px;
	}
	.section-head input {
		max-width: 240px;
	}
	.actions {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
		margin: 12px 0;
	}
	.form {
		max-width: 740px;
		width: 100%;
	}
	.form label {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin-bottom: 14px;
		font-weight: 600;
	}
	.form .check {
		font-weight: normal;
		flex-direction: row;
		align-items: center;
		margin: 6px 0;
	}
	input,
	textarea,
	select {
		box-sizing: border-box;
		border: 1px solid #d5cfdf;
		border-radius: 6px;
		background: #fff;
		color: #292333;
		padding: 10px;
		font: inherit;
		min-width: 0;
	}
	input:not([type='checkbox']):not([type='color']),
	textarea {
		width: 100%;
	}
	textarea {
		resize: vertical;
	}
	input[type='color'] {
		height: 40px;
		width: 100%;
		padding: 4px;
	}
	input[type='checkbox'] {
		accent-color: #62508a;
	}
	.field-row,
	.colors {
		display: flex;
		gap: 16px;
	}
	.field-row > * {
		flex: 1;
	}
	.colors > label {
		flex: 1;
		text-transform: capitalize;
	}
	.file-button {
		position: relative;
		display: inline-flex !important;
		overflow: hidden;
		margin: 0 !important;
		font-weight: normal !important;
	}
	.file-button input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
	.file-button:has(input:disabled) {
		opacity: 0.45;
		pointer-events: none;
	}
	.split {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: 28px;
	}
	.split aside {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 8px;
	}
	.split aside button {
		text-align: left;
		white-space: normal;
	}
	.split aside small {
		display: block;
		font-size: 11px;
		margin-top: 4px;
		overflow-wrap: anywhere;
	}
	.split aside .selected {
		background: #ece6f6;
		border-color: #aa98c5;
	}
	fieldset {
		border: 1px solid #ded7e8;
		border-radius: 8px;
		padding: 12px 16px;
		margin: 16px 0;
	}
	legend {
		color: #756a85;
		font-size: 12px;
		padding: 0 5px;
	}
	.empty {
		padding: 42px 18px;
		max-width: 560px;
		color: #766f80;
	}
	.asset-grid,
	.version-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
	}
	.asset-grid article {
		padding: 12px;
		border: 1px solid #dfdae7;
		border-radius: 10px;
		background: white;
		min-width: 0;
	}
	.asset-grid strong,
	.asset-grid .small {
		display: block;
		overflow-wrap: anywhere;
	}
	.asset-preview {
		height: 140px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: repeating-conic-gradient(#f7f5fa 0% 25%, #e8e3ef 0% 50%) 50%/16px 16px;
		border-radius: 7px;
		margin-bottom: 10px;
	}
	.asset-preview img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}
	.asset-preview > span {
		text-align: center;
		font-size: 32px;
	}
	.version-grid > button {
		padding: 8px;
		text-align: left;
		min-width: 0;
		overflow: hidden;
	}
	.version-grid strong,
	.version-grid small {
		display: block;
		margin-top: 6px;
		overflow-wrap: anywhere;
	}
	.version-grid .chosen {
		border: 2px solid #8565b2;
		background: #f1eaf9;
		padding: 7px;
	}
	.version-detail {
		margin-top: 20px;
		border-top: 1px solid #dcd6e5;
		padding-top: 12px;
	}
	.version-detail label {
		display: block;
	}
	.version-detail textarea {
		display: block;
		margin-top: 8px;
	}
	.review {
		width: 320px;
		max-width: 100%;
		margin-top: 16px;
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		background: #f1eef6;
		padding: 12px;
		border-radius: 6px;
		font: 12px/1.6 monospace;
	}
	details {
		margin: 10px 0;
		border: 1px solid #e1dbe9;
		border-radius: 6px;
		padding: 10px;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	blockquote {
		border-left: 3px solid #b39dcf;
		padding: 8px 14px;
		margin: 10px 0;
		background: #f2eef8;
	}
	blockquote small {
		display: block;
	}
	.direction-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin: 20px 0;
	}
	.direction-grid > div {
		border-left: 3px solid #baabcf;
		padding: 8px 12px;
		background: #f1edf6;
	}
	.direction-grid p {
		font-size: 12px;
		margin: 4px 0;
	}
	.title-option {
		padding: 16px;
		border: 1px solid #ddd7e6;
		border-radius: 8px;
		margin: 12px 0;
		background: white;
	}
	.channel-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 14px;
	}
	.channel-grid img {
		width: 100%;
		aspect-ratio: 16/9;
		object-fit: contain;
	}
	.channel-grid strong {
		display: block;
		font-size: 12px;
	}
	.channels select {
		max-width: 100%;
		margin: 12px 0;
	}
	.transcript {
		font: 12px/1.6 monospace;
	}
	hr {
		border: 0;
		border-top: 1px solid #ded7e8;
		margin: 24px 0;
	}
	@media (max-width: 650px), (pointer: coarse) {
		.creative-workspace :is(input, textarea, select) {
			font-size: 16px;
		}
	}
	@media (max-width: 650px) {
		.creative-workspace {
			width: calc(100vw - 12px);
			height: calc(100dvh - 12px);
			border-radius: 12px;
		}
		header {
			padding: 18px 16px 12px;
		}
		h2 {
			font-size: 23px;
		}
		.identity {
			padding: 6px 16px;
		}
		.identity span:last-child {
			display: none;
		}
		nav {
			padding: 8px;
		}
		main {
			padding: 18px 14px;
		}
		.split {
			grid-template-columns: 1fr;
			gap: 18px;
		}
		.split aside {
			flex-direction: row;
			overflow-x: auto;
			padding-bottom: 8px;
		}
		.split aside button {
			min-width: 130px;
		}
		.section-head {
			display: block;
		}
		.section-head input {
			max-width: none;
		}
		.asset-grid,
		.version-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 10px;
		}
		.asset-preview {
			height: 110px;
		}
		.direction-grid {
			grid-template-columns: 1fr;
		}
		.field-row {
			flex-wrap: wrap;
		}
		.field-row > * {
			min-width: 140px;
		}
		footer {
			padding: 8px 12px;
		}
		footer span {
			max-width: 55%;
		}
		.progress {
			padding: 8px 14px;
		}
		.version-grid strong {
			font-size: 12px;
		}
	}
	@media (max-width: 360px) {
		.asset-grid,
		.version-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
