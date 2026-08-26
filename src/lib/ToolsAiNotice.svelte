<script>
	import { TOOLS_AI_POLICY } from '$lib/tools-ai-policy.js';
</script>

<aside class="ai-notice" aria-label="Funded AI usage notice">
	<strong>AI is funded by swyx.io, rate limited, and logged.</strong>
	<span>
		{TOOLS_AI_POLICY.assistantTurnsPerHour} assistant turns and
		{TOOLS_AI_POLICY.mediaJobsPerHour} generations per hour per account; ${TOOLS_AI_POLICY.userEstimatedDailyUsd}/day
		estimated allowance. Account, model, time, status, and estimated-cost logs are kept for
		{TOOLS_AI_POLICY.retentionDays} days—not prompts or images.
		<a href="/tools/privacy">Details</a>
	</span>
</aside>

<style>
	.ai-notice {
		display: grid;
		gap: 0.3rem;
		padding: 0.75rem;
		margin: 0.75rem 0;
		border: 1px solid #d5d0c5;
		border-radius: 0.4rem;
		font-size: 0.75rem;
		line-height: 1.45;
	}
	.ai-notice strong {
		font-weight: 600;
	}
	.ai-notice a {
		text-decoration: underline;
	}
</style>
