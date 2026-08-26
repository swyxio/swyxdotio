<script>
	import { logDuration, logEstimateMoney } from '$lib/tools-logs-view.js';
	/** @type {import('$lib/tools-logs-view.js').ToolLogGeneration | undefined} */
	export let generation;
	/** @type {string} */
	export let requestStatus;
	/** @param {unknown} value */
	function known(value) {
		return value === null || value === undefined || value === '' ? 'Unavailable' : String(value);
	}
	/** @param {string|null|undefined} value */
	function timestamp(value) {
		return value || 'Unavailable';
	}
</script>

<section class="generation-detail" aria-label="Generation metadata">
	<h4>Generation metadata</h4>
	{#if !generation}<p>
			No generation metadata was recorded for this request. Historical settings and timings are
			unavailable.
		</p>{/if}
	<dl>
		<div>
			<dt>Hosting provider / adapter</dt>
			<dd>{known(generation?.adapter)}</dd>
		</div>
		<div>
			<dt>Model maker</dt>
			<dd>{known(generation?.modelMaker)}</dd>
		</div>
		<div>
			<dt>Generation mode</dt>
			<dd>{known(generation?.modality)}</dd>
		</div>
		<div>
			<dt>Provider status · last observed</dt>
			<dd>{known(generation?.providerStatus)}</dd>
		</div>
		<div>
			<dt>Run ID</dt>
			<dd><code>{known(generation?.runId)}</code></dd>
		</div>
		<div>
			<dt>Client job ID</dt>
			<dd><code>{known(generation?.clientJobId)}</code></dd>
		</div>
		<div>
			<dt>Provider request ID</dt>
			<dd><code>{known(generation?.providerRequestId)}</code></dd>
		</div>
		<div>
			<dt>Catalog cost estimate · not billed</dt>
			<dd>
				{generation?.estimatedCostUsd === null || generation?.estimatedCostUsd === undefined
					? 'Unavailable'
					: logEstimateMoney(generation.estimatedCostUsd)}
			</dd>
		</div>
		<div>
			<dt>Observed elapsed wall time</dt>
			<dd>{logDuration(generation?.observedElapsedMs)}</dd>
		</div>
		<div>
			<dt>Observed queue wait</dt>
			<dd>{logDuration(generation?.observedQueueMs)}</dd>
		</div>
		<div>
			<dt>Requested outputs</dt>
			<dd>{known(generation?.requestedOutputs)}</dd>
		</div>
		<div>
			<dt>Reference count</dt>
			<dd>{known(generation?.referenceCount)}</dd>
		</div>
		<div>
			<dt>Width × height · px</dt>
			<dd>
				{generation?.width !== null &&
				generation?.width !== undefined &&
				generation?.height !== null &&
				generation?.height !== undefined
					? `${generation.width} × ${generation.height}`
					: 'Unavailable'}
			</dd>
		</div>
		<div>
			<dt>Resolution</dt>
			<dd>{known(generation?.resolution)}</dd>
		</div>
		<div>
			<dt>Requested duration · seconds</dt>
			<dd>{known(generation?.durationSeconds)}</dd>
		</div>
		<div>
			<dt>Cancellation</dt>
			<dd>
				{generation?.cancellation === 'requested'
					? 'Requested · not confirmed'
					: generation?.cancellation === 'confirmed'
						? 'Confirmed'
						: generation?.cancellation === 'unsupported'
							? 'Unsupported by this adapter'
							: 'No cancellation recorded'}
			</dd>
		</div>
		<div>
			<dt>Last recorded error code</dt>
			<dd><code>{known(generation?.errorCode)}</code></dd>
		</div>
	</dl>
	<details>
		<summary>Observation timestamps · UTC</summary>
		<dl>
			<div>
				<dt>Submitted</dt>
				<dd>{timestamp(generation?.submittedAt)}</dd>
			</div>
			<div>
				<dt>Start observed</dt>
				<dd>{timestamp(generation?.startedObservedAt)}</dd>
			</div>
			<div>
				<dt>Finish observed</dt>
				<dd>{timestamp(generation?.finishedObservedAt)}</dd>
			</div>
			<div>
				<dt>Last observed</dt>
				<dd>{timestamp(generation?.lastObservedAt)}</dd>
			</div>
			<div>
				<dt>Cancellation requested</dt>
				<dd>{timestamp(generation?.cancellationRequestedAt)}</dd>
			</div>
		</dl>
	</details>
	<p>
		Timings are server-observed wall time, including queue and polling delay—not GPU execution time.
		Catalog estimates and budget reservations are separate; actual billed cost, cold-start time, and
		warm-idle cost are unavailable.
	</p>
	{#if requestStatus === 'failed'}<p>
			A failed request can include an uncertain submission. It does not establish a
			provider-confirmed failure; check the provider status and error code above.
		</p>{/if}
</section>

<style>
	.generation-detail {
		border-top: 1px solid var(--page-border);
		padding-top: 0.8rem;
		margin-bottom: 1rem;
	}
	h4 {
		font-size: 0.9rem;
		margin: 0 0 0.6rem;
	}
	dl {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.7rem 1rem;
		margin: 0.75rem 0;
	}
	dt {
		font-size: 0.68rem;
		color: var(--page-muted);
	}
	dd {
		margin: 0.15rem 0 0;
		font-size: 0.78rem;
		overflow-wrap: anywhere;
	}
	code {
		font-size: 0.72rem;
	}
	p {
		color: var(--page-muted);
		font-size: 0.73rem;
		line-height: 1.5;
		margin: 0.7rem 0;
	}
	summary {
		cursor: pointer;
		font-size: 0.75rem;
	}
	summary:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: 3px;
	}
	@media (max-width: 800px) {
		dl {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 500px) {
		dl {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
