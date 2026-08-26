<script>
	import { onMount } from 'svelte';
	import { TOOLS_ACTIVITY_ACTIONS, TOOLS_ACTIVITY_TOOLS } from '$lib/tools-activity.js';
	import { logFilters, logMoney, logTime } from '$lib/tools-logs-view.js';
	/** @type {import('./$types').PageData} */
	export let data;
	let days = '7';
	let kind = 'all';
	let tool = 'all';
	let scope = 'mine';
	/** @type {import('$lib/tools-logs-view.js').ToolLogs | null} */
	let logs = null;
	let loading = true;
	let error = '';
	let updatedAt = '';
	let accountChanged = false;
	/** @type {AbortController | undefined} */
	let pending;
	$: maxDaily = Math.max(1, ...(logs?.daily.map((day) => day.aiRequests + day.toolActions) ?? []));

	function leaveChangedAccount() {
		accountChanged = true;
		pending?.abort();
		logs = null;
		location.replace('/tools?next=/tools/logs');
	}

	/** @param {boolean} [more] */
	async function refresh(more = false) {
		if (accountChanged) return;
		pending?.abort();
		const controller = new AbortController();
		pending = controller;
		loading = true;
		error = '';
		const query = new URLSearchParams({ days, kind, tool, scope });
		if (more && logs?.nextCursor) query.set('before', logs.nextCursor);
		else {
			logs = null;
			history.replaceState(history.state, '', `/tools/logs?${query}`);
		}
		try {
			const response = await fetch(`/tools/api/logs?${query}`, {
				headers: { 'X-Tools-User': data.user.id },
				cache: 'no-store',
				signal: controller.signal
			});
			if (response.status === 401 || response.status === 409) {
				leaveChangedAccount();
				return;
			}
			if (response.status === 403) {
				logs = null;
				throw new Error(
					'This activity view is no longer authorized. Return to Your tools and sign in again.'
				);
			}
			if (!response.ok)
				throw new Error(
					more
						? 'Older activity is unavailable. Previously loaded records are still shown.'
						: 'Activity is unavailable. No totals can be shown for this request.'
				);
			const result = await response.json();
			if (controller.signal.aborted) return;
			logs = {
				...result,
				entries: more ? [...(logs?.entries ?? []), ...result.entries] : result.entries
			};
			updatedAt = new Date().toISOString();
		} catch (failure) {
			if (!controller.signal.aborted)
				error = failure instanceof Error ? failure.message : 'Activity is unavailable.';
		} finally {
			if (pending === controller) loading = false;
		}
	}

	onMount(() => {
		const restore = () => {
			({ days, kind, tool, scope } = logFilters(new URLSearchParams(location.search)));
			if (!data.user.isOwner) scope = 'mine';
			void refresh();
		};
		const switched = (/** @type {StorageEvent} */ event) => {
			if (event.key === 'swyx-tools:account' && event.newValue !== data.user.id)
				leaveChangedAccount();
		};
		const focused = () => void refresh();
		restore();
		window.addEventListener('popstate', restore);
		window.addEventListener('storage', switched);
		window.addEventListener('focus', focused);
		return () => {
			pending?.abort();
			window.removeEventListener('popstate', restore);
			window.removeEventListener('storage', switched);
			window.removeEventListener('focus', focused);
		};
	});
</script>

<svelte:head>
	<title>Tool logs · swyx.io</title>
	<meta name="robots" content="noindex, nofollow, noarchive" />
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<section class="site-shell logs py-8">
	<nav aria-label="Tools">
		<a href="/tools">← Your tools</a><a href="/tools/privacy">Privacy & limits</a>
	</nav>
	<header>
		<p class="eyebrow">swyx.io / tools / logs</p>
		<h1>Tool logs</h1>
		<p class="intro">Your AI requests and tool activity, together.</p>
		<p class="account">
			Signed in as <strong>{data.user.email}</strong>{#if data.user.isOwner}
				· site owner{/if} · last 30 days retained
		</p>
	</header>
	<form class="filters" on:submit|preventDefault={() => refresh()} aria-label="Filter activity">
		{#if data.user.isOwner}<label
				>Accounts<select bind:value={scope} on:change={() => refresh()}
					><option value="mine">My activity</option><option value="all">Everyone</option></select
				></label
			>{/if}
		<label
			>Period<select bind:value={days} on:change={() => refresh()}
				><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option
					value="30">Last 30 days</option
				></select
			></label
		>
		<label
			>Activity<select bind:value={kind} on:change={() => refresh()}
				><option value="all">AI + tools</option><option value="ai">AI requests</option><option
					value="tool">Tool actions</option
				></select
			></label
		>
		<label
			>Tool<select bind:value={tool} on:change={() => refresh()}
				><option value="all">All tools</option
				>{#each Object.entries(TOOLS_ACTIVITY_TOOLS) as [id, label]}<option value={id}
						>{label}</option
					>{/each}</select
			></label
		>
		<button type="submit" disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
	</form>
	{#if error}<p class="error" role="alert">
			{error} <button on:click={() => refresh()}>Try again</button>
		</p>{/if}
	{#if loading && !logs}<p role="status">Loading your activity…</p>{/if}
	{#if logs}
		<p class="range">
			{scope === 'all'
				? `Everyone’s recorded activity · ${logs.summary.activeAccounts} accounts`
				: 'Your recorded activity'} · {logTime(logs.range.from)} – {logTime(logs.range.to)} UTC · totals
			across all matching records
		</p>
		<dl class="summary" aria-label="Recorded usage totals">
			<div>
				<dt>AI requests</dt>
				<dd>{logs.summary.aiRequests.toLocaleString()}</dd>
			</div>
			<div>
				<dt>Tool actions</dt>
				<dd>{logs.summary.toolActions.toLocaleString()}</dd>
			</div>
			<div>
				<dt>Estimated reserved</dt>
				<dd>{logMoney(logs.summary.estimatedReservedUsd)}</dd>
			</div>
			<div>
				<dt>Recorded failures</dt>
				<dd>{logs.summary.failedRequests.toLocaleString()}</dd>
			</div>
		</dl>
		<p class="muted small">
			Reservations are allowance estimates, not provider bills. Failed AI attempts retain their
			reservation. Billed cost and provider token totals are not available here.
		</p>
		{#if logs.summary.aiRequests + logs.summary.toolActions > 0}
			<details class="daily" open>
				<summary
					>Daily activity <span class="muted"
						>· UTC · <i class="key ai"></i> AI <i class="key tool"></i> tools</span
					></summary
				>
				<div class="daily-rows" aria-label="Daily recorded activity">
					{#each logs.daily as day}
						<div class="daily-row">
							<time datetime={day.date}>{day.date.slice(5)}</time>
							<div
								class="bar"
								role="img"
								aria-label={`${day.date}: ${day.aiRequests} AI requests, ${day.toolActions} tool actions, ${logMoney(day.estimatedReservedUsd)} estimated reserved`}
							>
								<span class="ai" style:width={`${(day.aiRequests / maxDaily) * 100}%`}></span><span
									class="tool"
									style:width={`${(day.toolActions / maxDaily) * 100}%`}
								></span>
							</div>
							<span class="count"
								>{day.aiRequests + day.toolActions} <span class="muted">events</span></span
							><span class="money">{logMoney(day.estimatedReservedUsd)}</span>
						</div>
					{/each}
				</div>
			</details>
		{/if}
		<div class="activity-heading">
			<h2>Activity</h2>
			<span class="muted small">Newest first · {logs.entries.length} records loaded</span>
		</div>
		{#if logs.entries.length === 0}
			<div class="empty">
				<h3>No recorded activity in this view</h3>
				<p>
					Use a tool while signed in, then refresh. Try another filter if you expected records.
					Earlier, signed-out, or unconnected usage cannot be reconstructed.
				</p>
				<a href="/tools/draw">Open Draw →</a>
			</div>
		{:else}
			<p class="scroll-hint muted small">Scroll the table horizontally to see every column →</p>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (keyboard users need to scroll the activity table) -->
			<div
				class="table-wrap"
				tabindex="0"
				role="region"
				aria-label="Activity records; scroll horizontally on small screens"
			>
				<table>
					<caption class="sr-only"
						>{scope === 'all' ? 'All accounts’ activity.' : 'Your account’s activity.'} Times in UTC;
						costs are estimates.</caption
					>
					<thead
						><tr
							><th scope="col">Time · UTC</th>{#if scope === 'all'}<th scope="col">Account</th
								>{/if}<th scope="col">Tool / action</th><th scope="col">Status</th><th scope="col"
								>Source / model</th
							><th scope="col" class="money">Est. reserved</th></tr
						></thead
					>
					<tbody
						>{#each logs.entries as entry (entry.kind + ':' + entry.id + ':' + (entry.account?.id ?? data.user.id))}
							<tr
								><td
									><time datetime={entry.createdAt} title={entry.createdAt}
										>{logTime(entry.createdAt)}</time
									></td
								>{#if scope === 'all'}<td class="account-cell"
										><strong>{entry.account?.name || 'Google account'}</strong><small
											>{entry.account?.email || entry.account?.id || 'Identity unavailable'}</small
										></td
									>{/if}<td
									><strong
										>{TOOLS_ACTIVITY_ACTIONS[entry.action]?.label ??
											(entry.kind === 'ai'
												? entry.action === 'draw.ai.assistant'
													? 'Assistant turn'
													: 'Media generation'
												: entry.action)}</strong
									><small>{TOOLS_ACTIVITY_TOOLS[entry.tool] ?? entry.tool}</small>
									<details class="record-id">
										<summary>Request ID</summary><code>{entry.id}</code>
									</details></td
								><td
									><span
										class:failed={entry.status === 'failed'}
										class:pending={entry.status === 'reserved' || entry.status === 'submitted'}
										>{entry.status === 'reserved' || entry.status === 'submitted'
											? 'Pending / not confirmed'
											: entry.status}</span
									></td
								><td
									><span>{entry.source === 'browser' ? 'Browser-reported' : 'Server-recorded'}</span
									>{#if entry.model}<small class="model">{entry.model}</small>{/if}</td
								><td class="money">{logMoney(entry.estimatedReservedUsd)}</td></tr
							>
						{/each}</tbody
					>
				</table>
			</div>
			{#if logs.nextCursor}<button
					class="load-more"
					on:click={() => refresh(true)}
					disabled={loading}>{loading ? 'Loading…' : 'Load older activity'}</button
				>{/if}
		{/if}
		<p class="muted small">
			Updated {logTime(updatedAt)} UTC. Refresh to see new requests and status changes.
		</p>
	{/if}
	<aside class="coverage">
		<h2>What’s captured</h2>
		<p>
			Signed-in swyx.io activity only. AI records come from the server’s quota ledger. Tool records
			cover Draw opens, cloud page changes, local image tools, designs, memes, Big text box opens,
			podcast uploads, and the Reclip launch.
		</p>
		<p>
			Browser-reported actions are best-effort, not proof that an action happened. Offline activity,
			blocked or rate-limited logging, signed-out use, raw drawing edits, and actions inside
			external Reclip are not fully captured. Missing records do not mean zero usage.
		</p>
		<p>
			Other apps—including ChatGPT, Claude, and Codex—are <strong>not connected</strong>. This is
			not your entire Google account or provider billing history.
		</p>
		<p>
			You can view your own activity. The site owner, swyx, can view everyone’s usage metadata,
			including account name and email. Other users cannot see your logs. No prompts, images,
			drawing contents, text-box text, or file names are recorded. Records expire after 30 days. <a
				href="/tools/privacy">Privacy details →</a
			>
		</p>
	</aside>
</section>

<style>
	.logs {
		max-width: 72rem;
	}
	nav,
	.activity-heading {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
	}
	nav {
		font-size: 0.875rem;
	}
	header {
		margin: 2rem 0 1.5rem;
	}
	h1 {
		margin: 0.3rem 0;
	}
	h2 {
		font-size: 1.1rem;
		margin: 0;
	}
	.eyebrow {
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--page-accent);
	}
	.intro {
		margin: 0.5rem 0;
	}
	.account,
	.muted,
	.range {
		color: var(--page-muted);
	}
	.account {
		font-size: 0.85rem;
		overflow-wrap: anywhere;
	}
	.filters {
		display: flex;
		align-items: end;
		flex-wrap: wrap;
		gap: 0.75rem;
		padding: 1rem 0;
		border-block: 1px solid var(--page-border);
	}
	label {
		display: grid;
		gap: 0.3rem;
		font-size: 0.75rem;
		color: var(--page-muted);
	}
	select,
	button {
		border: 1px solid var(--page-border);
		padding: 0.5rem 0.75rem;
		background: var(--page-bg);
		color: var(--page-text);
		border-radius: 0.25rem;
		font: inherit;
		min-height: 2.5rem;
	}
	select {
		font-size: 0.875rem;
	}
	button {
		cursor: pointer;
		font-size: 0.875rem;
	}
	button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	button:focus-visible,
	select:focus-visible,
	.table-wrap:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: 3px;
	}
	.range,
	.small {
		font-size: 0.75rem;
		line-height: 1.5;
	}
	.range {
		margin: 1rem 0 0.5rem;
	}
	.summary {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin: 1rem 0;
	}
	.summary div {
		border-left: 2px solid var(--page-border);
		padding-left: 0.75rem;
	}
	dt {
		font-size: 0.75rem;
		color: var(--page-muted);
	}
	dd {
		font-size: 1.6rem;
		font-variant-numeric: tabular-nums;
		margin: 0;
	}
	.daily {
		padding: 1rem 0;
		margin: 1.5rem 0;
		border-block: 1px solid var(--page-border);
	}
	.daily summary {
		cursor: pointer;
		font-size: 0.85rem;
	}
	.daily-rows {
		display: grid;
		gap: 0.45rem;
		margin-top: 1rem;
		max-height: 17rem;
		overflow-y: auto;
		padding-right: 0.5rem;
	}
	.daily-row {
		display: grid;
		grid-template-columns: 3.25rem 1fr 5.5rem 4rem;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}
	.bar {
		display: flex;
		height: 0.5rem;
	}
	.bar span {
		min-width: 0;
	}
	.ai {
		background: #536e83;
	}
	.tool {
		background: #ba8e57;
	}
	.key {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		margin-left: 0.5rem;
	}
	.count,
	.money {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.activity-heading {
		margin: 1.5rem 0 0.75rem;
	}
	.table-wrap {
		overflow-x: auto;
	}
	.scroll-hint {
		display: none;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.8rem;
	}
	th {
		font-size: 0.7rem;
		color: var(--page-muted);
		font-weight: 500;
		text-align: left;
		white-space: nowrap;
	}
	th,
	td {
		padding: 0.75rem 0.5rem;
		border-bottom: 1px solid var(--page-border);
		vertical-align: top;
	}
	td:first-child {
		white-space: nowrap;
	}
	td strong {
		display: block;
		font-weight: 500;
	}
	td small {
		display: block;
		color: var(--page-muted);
		font-size: 0.7rem;
	}
	.model {
		overflow-wrap: anywhere;
		min-width: 8rem;
		max-width: 17rem;
	}
	.account-cell {
		min-width: 9rem;
		max-width: 14rem;
		overflow-wrap: anywhere;
	}
	.record-id {
		font-size: 0.65rem;
		color: var(--page-muted);
	}
	.record-id summary {
		cursor: pointer;
	}
	.record-id code {
		overflow-wrap: anywhere;
		display: block;
		max-width: 12rem;
	}
	.failed,
	.error {
		color: #a12b22;
	}
	.pending {
		color: #85591e;
	}
	.load-more {
		margin: 1rem 0 0.5rem;
	}
	.empty {
		padding: 1.5rem;
		border: 1px dashed var(--page-border);
	}
	.empty h3 {
		font-size: 1rem;
		margin-top: 0;
	}
	.empty p {
		font-size: 0.875rem;
		color: var(--page-muted);
		max-width: 40rem;
	}
	.coverage {
		margin-top: 2.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--page-border);
		max-width: 52rem;
	}
	.coverage p {
		font-size: 0.8rem;
		line-height: 1.6;
		color: var(--page-muted);
	}
	@media (max-width: 600px) {
		.scroll-hint {
			display: block;
		}
		.summary {
			grid-template-columns: repeat(2, 1fr);
		}
		.filters label {
			flex: 1 1 40%;
		}
		.filters select {
			width: 100%;
		}
		.daily-row {
			grid-template-columns: 2.5rem 1fr 3rem 3rem;
			gap: 0.4rem;
		}
		.count .muted {
			display: none;
		}
		.activity-heading {
			align-items: start;
		}
	}
</style>
