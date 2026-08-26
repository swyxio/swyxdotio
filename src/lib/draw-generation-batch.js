import {
	getDrawGenerationModel,
	estimateDrawGenerationModelCost,
	resolveDrawGenerationModelSettings,
	getDrawGenerationReferenceLimit,
	MAX_DRAW_GENERATION_PROMPT_LENGTH,
	MAX_DRAW_GENERATION_REQUEST_BYTES
} from './draw-generation-models.js';
import { runDrawingGeneration } from './draw-generation-client.js';
import { prepareDrawingGenerationImage } from './draw-generation-image.js';
import { estimateToolsMediaReservation } from './tools-ai-policy.js';

/** @typedef {import('./draw-generation-history.js').DrawingImageGeneration} Generation */
/** @typedef {{id:string,prompt:string,modelId:string,adapterId:string,modelSettings:Record<string,unknown>,referenceImages:import('./draw-generation-history.js').DrawingGenerationReference[],parentGenerationId?:string,context?:Record<string,unknown>}} DrawingGenerationRecipe */
/** @typedef {{id:string,runId:string,recipe:DrawingGenerationRecipe,status:'pending'|'running'|'completed'|'failed'|'stopped',message:string,requestId?:string,elapsedMs?:number,error?:string,generation?:Generation}} DrawingGenerationJob */
/** @typedef {{id:string,createdAt:number,pageKey:string,limitUsd:number|null,jobs:DrawingGenerationJob[]}} DrawingGenerationRun */

/** A run owns immutable recipe snapshots; tool/mode changes never rewrite them.
 * @param {{pageKey:string,recipes:DrawingGenerationRecipe[],limitUsd:number|null,id?:string}} options
 * @returns {DrawingGenerationRun}
 */
export function createDrawingGenerationRun(options) {
	if (!options.pageKey || !options.recipes.length) throw new Error('Choose at least one model.');
	if (options.limitUsd !== null && (!Number.isFinite(options.limitUsd) || options.limitUsd <= 0))
		throw new Error('Choose a positive run spending limit.');
	const id = options.id ?? crypto.randomUUID();
	const recipes = structuredClone(options.recipes);
	let reserved = 0;
	for (const recipe of recipes) {
		const model = getDrawGenerationModel(recipe.modelId);
		if (!model || model.adapter !== recipe.adapterId)
			throw new Error('The selected model is unavailable.');
		if (
			typeof recipe.prompt !== 'string' ||
			!recipe.prompt.trim() ||
			recipe.prompt.length > MAX_DRAW_GENERATION_PROMPT_LENGTH
		)
			throw new Error('Enter a prompt of at most 32,000 characters.');
		const limit = getDrawGenerationReferenceLimit(model);
		if (
			!Array.isArray(recipe.referenceImages) ||
			recipe.referenceImages.length > limit ||
			(limit > 0 && !recipe.referenceImages.length)
		)
			throw new Error(
				limit === 0
					? 'Text-to-image does not send reference images.'
					: `Attach one to ${limit} reference images for this model.`
			);
		// Validate supported overrides before any paid job is submitted.
		const effective = resolveDrawGenerationModelSettings(model, recipe.modelSettings);
		reserved += estimateToolsMediaReservation(estimateDrawGenerationModelCost(model, effective));
	}
	if (options.limitUsd !== null && reserved > options.limitUsd + 0.000001)
		throw new Error(
			`This batch reserves ~$${reserved.toFixed(3)}, above your $${options.limitUsd.toFixed(2)} run limit.`
		);
	return {
		id,
		createdAt: Date.now(),
		pageKey: options.pageKey,
		limitUsd: options.limitUsd,
		jobs: recipes.map((recipe) => ({
			id: crypto.randomUUID(),
			runId: id,
			recipe,
			status: 'pending',
			message: 'Waiting to submit'
		}))
	};
}

/** Session-only scheduler shared by the composer and future creative workspaces.
 * Server-side admission remains authoritative for concurrency and spending.
 * @param {{run:DrawingGenerationRun,userId?:string,signal:AbortSignal,concurrency?:number,onJob:(job:DrawingGenerationJob)=>void,onResult:(generation:Generation,job:DrawingGenerationJob)=>void|Promise<void>,generate?:typeof runDrawingGeneration,prepare?:typeof prepareDrawingGenerationImage}} options
 */
export async function runDrawingGenerationBatch(options) {
	const {
		run,
		signal,
		onJob,
		onResult,
		generate = runDrawingGeneration,
		prepare = prepareDrawingGenerationImage
	} = options;
	let next = 0;
	let policyBlocked = false;
	const concurrency = Math.min(2, Math.max(1, Math.floor(options.concurrency ?? 2)));
	async function worker() {
		while (next < run.jobs.length && !signal.aborted && !policyBlocked) {
			const job = run.jobs[next++];
			const model = getDrawGenerationModel(job.recipe.modelId);
			if (!model) continue;
			const started = Date.now();
			job.status = 'running';
			job.message = 'Preparing request';
			onJob({ ...job });
			try {
				const prepared = [];
				for (const reference of job.recipe.referenceImages) {
					signal.throwIfAborted();
					prepared.push(
						await prepare({
							dataURL: reference.dataURL,
							prompt: job.recipe.prompt,
							model,
							signal,
							maxUploadBytes: Math.floor(
								MAX_DRAW_GENERATION_REQUEST_BYTES / job.recipe.referenceImages.length
							),
							onProgress: (message) => {
								job.message = message;
								onJob({ ...job });
							}
						})
					);
				}
				const result = await generate({
					userId: options.userId,
					images: prepared.map((image) => image.blob),
					prompt: job.recipe.prompt,
					model: model.id,
					settings: job.recipe.modelSettings,
					runId: run.id,
					runLimitUsd: run.limitUsd,
					clientJobId: job.id,
					signal,
					cancelOnAbort: true,
					onProgress: (progress) => {
						if (progress.requestId) job.requestId = progress.requestId;
						job.elapsedMs = Date.now() - started;
						job.message =
							progress.message ??
							(progress.status === 'UPLOADING'
								? prepared.length
									? `Uploading ${prepared.length} reference${prepared.length === 1 ? '' : 's'}`
									: 'Sending prompt'
								: progress.status === 'IN_QUEUE'
									? `Queued${progress.queuePosition ? ` · ${progress.queuePosition} ahead` : ''}`
									: progress.status === 'CANCEL_REQUESTED'
										? 'Cancellation requested'
										: 'Generating');
						onJob({ ...job });
					}
				});
				signal.throwIfAborted();
				const dataURL = result.video ?? result.image;
				const mimeType = result.video ? 'video/mp4' : dataURL.slice(5, dataURL.indexOf(';'));
				/** @type {Generation} */
				const generation = {
					id: crypto.randomUUID(),
					dataURL,
					mimeType,
					createdAt: Date.now(),
					prompt: job.recipe.prompt,
					modelLabel: model.label,
					modelId: model.id,
					modelProvider: model.provider,
					adapterId: model.adapter,
					modelKind: model.kind,
					modelWorkflow: model.workflow,
					modelSettings: resolveDrawGenerationModelSettings(model, job.recipe.modelSettings),
					referenceImages: structuredClone(job.recipe.referenceImages),
					parentGenerationId: job.recipe.parentGenerationId,
					batchId: run.id,
					runId: run.id,
					jobId: job.id,
					recipeId: job.recipe.id,
					context: structuredClone(job.recipe.context),
					elapsedMs: Date.now() - started,
					estimatedUsd: estimateDrawGenerationModelCost(
						model,
						resolveDrawGenerationModelSettings(model, job.recipe.modelSettings)
					)
				};
				job.generation = generation;
				job.status = 'completed';
				job.elapsedMs = generation.elapsedMs;
				job.message = 'Complete';
				// A result is valid even if its canvas application or persistence later fails.
				try {
					await onResult(generation, job);
				} catch {
					job.message = 'Generated; could not apply or save. Result remains in this queue.';
				}
			} catch (failure) {
				job.elapsedMs = Date.now() - started;
				if (signal.aborted || (failure instanceof Error && failure.name === 'AbortError')) {
					job.status = 'stopped';
					job.message = job.requestId
						? 'Stopped waiting; provider cancellation requested, not confirmed'
						: 'Stopped; submission may be uncertain';
				} else {
					job.status = 'failed';
					job.error = failure instanceof Error ? failure.message : 'Generation failed';
					job.message = job.error;
					const code = /** @type {{code?:string}} */ (failure)?.code;
					if (code === 'content_policy_violation' || code === 'policy_violation')
						policyBlocked = true;
				}
			}
			onJob({ ...job });
		}
	}
	await Promise.all(Array.from({ length: concurrency }, () => worker()));
	for (const job of run.jobs)
		if (job.status === 'pending') {
			job.status = 'stopped';
			job.message = policyBlocked ? 'Not submitted after a policy rejection' : 'Not submitted';
			onJob({ ...job });
		}
	return run;
}
