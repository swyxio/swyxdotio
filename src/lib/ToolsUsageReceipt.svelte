<script>
	import { TOOLS_AI_POLICY } from '$lib/tools-ai-policy.js';
	export let signedIn = false;
	/** @type {{assistantTurnsThisHour:number,mediaJobsThisHour:number,estimatedReservedTodayUsd:number}|null} */
	export let usage = null;
	export let unavailable = false;
</script>

<aside class="receipt" aria-label="Usage allowance">
	<p class="receipt-title">Today's allowance</p>
	{#if signedIn}
		<section
			class="counters"
			aria-label="Your AI usage"
			aria-live="polite"
			aria-busy={!usage && !unavailable}
		>
			{#if usage}
				<p>
					<b>{usage.assistantTurnsThisHour} / {TOOLS_AI_POLICY.assistantTurnsPerHour}</b><span
						>assistant turns this hour</span
					>
				</p>
				<p>
					<b>{usage.mediaJobsThisHour} / {TOOLS_AI_POLICY.mediaJobsPerHour}</b><span
						>generations this hour</span
					>
				</p>
				<p>
					<b
						>${usage.estimatedReservedTodayUsd.toFixed(2)} / ${TOOLS_AI_POLICY.userEstimatedDailyUsd.toFixed(
							2
						)}</b
					><span>estimated reserved today</span>
				</p>
			{:else if unavailable}
				<p class="usage-state">Usage is temporarily unavailable. Server limits still apply.</p>
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
	<div class="disclosure">
		<strong>AI is funded by swyx.io, rate limited, and logged.</strong>
		<p>
			Signed-in tool activity is logged too. The site owner can review usage metadata and account
			identity.
		</p>
	</div>
</aside>

<style>
	.receipt {
		container-type: inline-size;
		position: relative;
		padding: 20px 21px 16px;
		border: 1px solid #d2b989;
		border-radius: 2px;
		background: #fcf5e7 url('/assets/tools-cabinet/paper.webp') center / 360px;
		color: #403326;
		box-shadow:
			inset 0 0 18px #b48b4030,
			1px 4px 7px #35291e18;
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
		.receipt {
			background: Canvas;
			color: CanvasText;
			border-color: CanvasText;
			box-shadow: none;
		}
	}
</style>
