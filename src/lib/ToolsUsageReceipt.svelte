<script>
	import { TOOLS_AI_POLICY } from '$lib/tools-ai-policy.js';
	export let signedIn = false;
	export let isOwner = false;
	/** @type {{assistantTurnsToday:number,mediaJobsToday:number,estimatedReservedTodayUsd:number}|null} */
	export let usage = null;
	export let unavailable = false;
</script>

<aside class="receipt" aria-label={isOwner ? 'Usage summary' : 'Usage allowance'}>
	<p class="receipt-title">
		{signedIn ? "Today's usage" : "Today's allowance"}<span class="day-zone">UTC</span>
	</p>
	{#if signedIn}
		<section
			class="counters"
			aria-label="Your AI usage"
			aria-live="polite"
			aria-busy={!usage && !unavailable}
		>
			{#if usage}
				<p><b>{usage.assistantTurnsToday}</b><span>assistant turns today</span></p>
				<p><b>{usage.mediaJobsToday}</b><span>generations today</span></p>
				<p>
					<b
						>${usage.estimatedReservedTodayUsd.toFixed(2)}{isOwner
							? ''
							: ` / $${TOOLS_AI_POLICY.userEstimatedDailyUsd.toFixed(2)}`}</b
					><span>estimated reserved today</span>
				</p>
			{:else if unavailable}
				<p class="usage-state">
					Usage is temporarily unavailable.{#if !isOwner}
						Server limits still apply.{/if}
				</p>
			{:else}
				<p class="usage-state">Loading your usage…</p>
			{/if}
		</section>
	{:else}
		<p class="guest-allowance">
			Sign in for funded AI.<br />{TOOLS_AI_POLICY.assistantTurnsPerHour} assistant turns · {TOOLS_AI_POLICY.mediaJobsPerHour}
			generations / hour<br />${TOOLS_AI_POLICY.userEstimatedDailyUsd} estimated daily allowance
		</p>
	{/if}
	<a class="logs-link" href="/tools/logs"
		>Tool logs &amp; analytics <span aria-hidden="true">→</span></a
	>
	{#if !isOwner}<div class="disclosure">
			<strong>AI is funded by swyx.io, rate limited, and logged.</strong>
			<p>
				Signed-in tool activity is logged too. The site owner can review usage metadata and account
				identity.
			</p>
		</div>{/if}
</aside>

<style>
	.logs-link {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		margin-top: 8px;
		border-top: 1px solid #baa47b;
		color: #87432f;
		font-size: 0.78rem;
		text-underline-offset: 3px;
	}
	.logs-link:focus-visible {
		outline: 3px solid #87432f;
		outline-offset: 3px;
	}

	.receipt {
		container-type: inline-size;
		position: relative;
		padding: 20px 21px 16px;
		isolation: isolate;
		border: 1px solid transparent;
		background: transparent;
		color: #403326;
		box-shadow: none;
	}
	.receipt::after {
		content: '';
		position: absolute;
		z-index: -1;
		inset: -6px;
		border-image: url('/assets/tools-cabinet/paper-sheet.webp') 60 fill / 18px / 0 stretch;
		pointer-events: none;
	}
	.receipt::before {
		content: '';
		position: absolute;
		top: -6px;
		left: calc(50% - 6px);
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: #bb9a57;
		border: 2px ridge #d6b77a;
		box-shadow: 0 2px 2px #34281944;
	}
	.day-zone {
		float: right;
		color: #65513e;
		font-size: 0.65rem;
		font-weight: 400;
	}
	.receipt-title {
		font: 600 0.83rem var(--font-mono);
		letter-spacing: 0.025em;
		margin: 0 0 12px;
	}
	.counters {
		min-height: 76px;
	}
	.counters p {
		display: flex;
		align-items: baseline;
		gap: 10px;
		justify-content: space-between;
		margin: 4px 0;
		font-size: 0.7rem;
		line-height: 1.5;
	}
	.counters b {
		flex-shrink: 0;
		font: 500 0.76rem var(--font-mono);
	}
	.counters span {
		text-align: right;
	}
	.counters .usage-state {
		display: block;
		font-size: 0.78rem;
	}
	.guest-allowance {
		font-size: 0.75rem;
		line-height: 1.7;
	}
	.disclosure {
		border-top: 1px dashed #baa47b;
		margin-top: 10px;
		padding-top: 10px;
		font-size: 0.68rem;
		line-height: 1.6;
	}
	.disclosure strong {
		font-weight: 600;
	}
	.disclosure p {
		margin: 4px 0 0;
	}
	@media (max-width: 600px) {
		.receipt {
			padding: 11px 14px;
		}
		.receipt-title {
			margin-bottom: 7px;
			font-size: 0.75rem;
		}
		.counters {
			min-height: 48px;
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 8px;
		}
		.counters p {
			display: block;
			margin: 1px 0;
			font-size: 0.6rem;
			line-height: 1.4;
		}
		.counters span {
			display: block;
			text-align: left;
			margin-top: 4px;
		}
		.counters b {
			font-size: 0.68rem;
		}
		.counters .usage-state {
			grid-column: 1 / -1;
			font-size: 0.75rem;
		}
		.disclosure {
			margin-top: 7px;
			padding-top: 7px;
			font-size: 0.65rem;
		}
	}
	@container (max-width: 18rem) {
		.counters {
			display: block;
		}
		.counters p {
			display: flex;
		}
		.counters span {
			margin-top: 0;
		}
		.counters .usage-state {
			display: block;
		}
	}
	@media (forced-colors: active) {
		.receipt::after {
			display: none;
		}
		.receipt {
			background: Canvas;
			color: CanvasText;
			border-color: CanvasText;
			box-shadow: none;
		}
	}
</style>
