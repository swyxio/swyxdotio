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
		Ordinary Tools/Draw Google sign-in identifies your workspace using your Google account ID. We
		receive your basic profile and verified email address, and keep a signed, HTTP-only sign-in
		cookie for up to seven days. We do not request access to Gmail, Drive, contacts, or your Google
		password. For this Tools/Draw login flow, Google access tokens are not retained after sign-in.
		This does not describe the separately authorized swyxcal calendar connections below.
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
		Rate-limit errors show when to retry. Generation jobs and results are accessible only to the
		account that created them. Local image-processing tools do not spend cloud quota.
	</p>
	<p>
		Use Draw’s page menu to delete a drawing. For account-data questions or deletion requests, <a
			href="/about">contact swyx</a
		>.
	</p>
	<section id="swyxcal" aria-labelledby="swyxcal-heading">
		<h2 id="swyxcal-heading">swyxcal: separately authorized Google Calendar access</h2>
		<p>
			The separately hosted <a href="https://cal.swyx.io/about">swyxcal</a> scheduler shares this Google
			app’s consent configuration but has its own private, exact-email allowlisted team and storage. Ordinary
			Tools sign-in does not connect calendars. In swyxcal, a member first signs in, then separately authorizes
			a Google calendar account for ongoing scheduling access. Setup is in progress and new bookings are
			paused; this disclosure is not a booking launch or a claim of Google verification.
		</p>
		<p>
			Calendar linking requests <code>calendar.calendarlist.readonly</code> to list calendar
			choices,
			<code>calendar.events.freebusy</code> to check busy time on selected calendars,
			<code>calendar.events.owned</code> to create and manage bookings on the organizer’s owned
			destination, and <code>calendar.events.readonly</code> to check event metadata across selected conflict
			calendars when rescheduling. Missing coverage is unavailable, not free. Public visitors see offered
			times, not private calendar events. An older authorization may retain broader Google permissions
			until separately revoked; updating the app does not revoke it.
		</p>
		<p>
			swyxcal stores encrypted calendar refresh tokens for continued access, with short-lived access
			tokens in server memory. It keeps account/calendar selections, availability, guest name, email
			and time zone, booking and recovery records, and notification status in Cloudflare
			Workers/Durable Object storage. Configured backups are encrypted in private Cloudflare R2.
			These booking records do not use the Tools activity logs’ 30-day expiry.
		</p>
		<p>
			Google processes calendar reads, booking writes, Meet and attendee invitations. Configured
			Cloudflare email sends booking details and a private management link to the guest; hosts’
			Google invitations do not include that private link. Cloudflare also processes hosting and
			security checks. Read the <a href="https://cal.swyx.io/privacy">swyxcal privacy policy</a> for optional
			agent access, data processing, retention and deletion requests, and the distinction between disconnecting
			a live account and revoking Google access. Disconnecting does not automatically erase booking history
			or backups.
		</p>
		<p>
			swyxcal’s use and transfer of Google user data is limited to the scheduling functionality
			described in its policy and the <a
				href="https://developers.google.com/terms/api-services-user-data-policy"
				>Google API Services User Data Policy</a
			>, including Limited Use. Calendar data is not used for the separately described funded AI
			features above, advertising, or training general-purpose AI models. For calendar-data
			questions or requests, contact <a href="mailto:swyx@ai.engineer">swyx@ai.engineer</a>.
		</p>
	</section>
</article>
