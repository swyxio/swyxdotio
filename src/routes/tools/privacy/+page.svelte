<script>
	import { TOOLS_AI_POLICY } from '$lib/tools-ai-policy.js';
</script>

<svelte:head
	><title>Tools privacy · swyx.io</title><meta name="robots" content="noindex" /></svelte:head
>
<article class="site-shell py-8" style="max-width:44rem">
	<p><a href="/tools">← Your tools</a></p>
	<h1>Tools privacy</h1>
	<p>
		Google sign-in identifies your workspace using your Google account ID. We receive your basic
		profile and verified email address, and keep a signed, HTTP-only sign-in cookie for up to seven
		days. We do not request access to Gmail, Drive, contacts, or your Google password. Google access
		tokens are not retained after sign-in.
	</p>
	<p>
		Signed-in drawings are stored on Cloudflare in an account-specific workspace. Drawing caches,
		libraries, and generation history on this device are separated by account. Signing out removes
		the sign-in cookie; it does not delete saved drawings or device caches.
	</p>
	<p>
		Browser-only tools work without an account. Local image-processing tools run on your device.
		When available, cloud AI features identify the external provider before you use them; selected
		images or canvas screenshots are sent when you invoke those features.
	</p>
	<p>
		swyx.io funds cloud AI for signed-in accounts. Provider credentials stay on the server and are
		never shared. Podcast publishing and the separately hosted Reclip service remain owner-only;
		public podcast feeds remain public.
	</p>
	<h2>Funded AI: limits and logging</h2>
	<p>
		Signed-in tool activity is also recorded: tool opens, cloud drawing page changes, local image
		operations, designs, memes, podcast uploads, and Reclip launches. These are action names,
		timestamps, statuses, and account identifiers—not the text you type, file names, images, or
		drawing contents. Browser records are best-effort and may be missing when offline or blocked.
	</p>
	<p>
		You can review your own records in <a href="/tools/logs">Tool logs</a>. The site owner, swyx,
		can review everyone’s activity metadata, including the Google account name and email associated
		with it. Other users cannot view your logs. Activity records and inactive account-directory
		entries expire after 30 days; this dashboard does not collect usage from external apps.
	</p>
	<p>
		Non-owner accounts are limited to {TOOLS_AI_POLICY.assistantTurnsPerHour} assistant model turns and
		{TOOLS_AI_POLICY.mediaJobsPerHour} media generations per hour. Each account has a ${TOOLS_AI_POLICY.userEstimatedDailyUsd}
		daily estimated-cost allowance, with a ${TOOLS_AI_POLICY.siteEstimatedDailyUsd}
		estimated daily guard shared across the site. These are conservative reservation estimates, not exact
		provider bills. Failed provider attempts still use a reservation. Hourly limits use a rolling one-hour
		window; daily limits reset at midnight UTC. The server-verified site owner is exempt from app usage
		and spending limits, and owner usage does not consume this shared allowance. Owner activity is still
		logged with the same retention and privacy rules.
	</p>
	<p>
		Before making a paid request, the server records an admission and reserves quota. Operational
		logs contain your Google account ID, request/job identifier, model, timestamp, status, and
		estimated reserved cost. These logs are retained for {TOOLS_AI_POLICY.retentionDays} days and then
		deleted. Prompts, uploaded images, screenshots, Google tokens and API keys are not stored in these
		operational logs. Provider processing and your own on-device generation history are separate from
		these logs.
	</p>
	<p>
		Generation logs also link admitted jobs to their batch/run and hosting adapter. They record the
		model maker, media type, requested output/reference counts, dimensions/resolution/video
		duration, catalog cost estimate, and server-observed status/timing, cancellation state, and
		bounded error codes. They do not contain prompts, reference roles or names, custom-weight URLs,
		output URLs, or provider error text. Observed wall time includes queueing and polling; it is not
		GPU execution time. Provider bills, GPU time, cold starts, and idle time are unavailable unless
		separately connected and verified.
	</p>
	<p>
		Rate-limit errors show when to retry. Generation jobs and results are accessible only to the
		account that created them. Local image-processing tools do not spend cloud quota.
	</p>
	<p>
		Use Draw’s page menu to delete a drawing. For account-data questions or deletion requests, <a
			href="/about">contact swyx</a
		>.
	</p>
</article>
