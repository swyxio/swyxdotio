<script>
	import { onMount, tick } from 'svelte';
	import ToolsGenerationRuns from '$lib/ToolsGenerationRuns.svelte';
	import ToolsGenerationDetail from '$lib/ToolsGenerationDetail.svelte';
	import {
		TOOLS_ACTIVITY_ACTIONS,
		TOOLS_ACTIVITY_TOOLS,
		TOOLS_LOG_FILTER_DEFAULTS
	} from '$lib/tools-activity.js';
	import {
		logFilters,
		logQuery,
		logMoney,
		logTime,
		logStatus,
		mergeLogEntries,
		logRunFilters
	} from '$lib/tools-logs-view.js';
	/** @type {import('./$types').PageData} */
	export let data;
	/** @type {import('$lib/tools-logs-view.js').ToolLogFilters} */
	let filters = { ...TOOLS_LOG_FILTER_DEFAULTS };
	const defaults = /** @type {Record<string, string>} */ (TOOLS_LOG_FILTER_DEFAULTS);
	/** @type {import('$lib/tools-logs-view.js').ToolLogs | null} */
	let logs = null;
	/** @type {import('$lib/tools-logs-view.js').ToolLogEntry | null} */
	let selected = null;
	/** @type {HTMLButtonElement | undefined} */
	let detailClose;
	/** @type {HTMLButtonElement | null} */
	let inspectedButton = null;
	let loading = true;
	let error = '';
	let exportError = '';
	let exporting = '';
	let exportStatus = '';
	let updatedAt = '';
	let searchDraft = '';
	let runDraft = '';
	let accountChanged = false;
	let advancedOpen = false;
	/** @type {'tools'|'models'|'actions'|'accounts'|'adapters'|'modalities'} */
	let breakdown = 'tools';
	/** @type {AbortController | undefined} */
	let pending;
	/** @type {AbortController | undefined} */
	let pendingExport;
	/** @type {Record<string, string>} */
	const filterNames = {
		kind: 'Activity',
		tool: 'Tool',
		status: 'Status',
		source: 'Source',
		model: 'Model',
		action: 'Action',
		account: 'Account',
		q: 'Search',
		day: 'Day',
		opens: 'Opens',
		adapter: 'Provider',
		modality: 'Mode',
		run: 'Run'
	};
	$: total = logs ? logs.summary.aiRequests + logs.summary.toolActions : 0;
	$: maxDaily = Math.max(1, ...(logs?.daily.map((day) => day.aiRequests + day.toolActions) ?? []));
	$: activeFilters = Object.entries(filters).filter(
		([key, value]) => key !== 'days' && key !== 'scope' && value !== defaults[key]
	);
	$: modelOptions = [
		...new Set([
			...(logs?.breakdowns.models.map((row) => row.key) ?? []),
			...(filters.model !== 'all' ? [filters.model] : [])
		])
	];
	$: adapterOptions = [
		...new Set([
			...(logs?.breakdowns.adapters?.map((row) => row.key) ?? []),
			...(filters.adapter !== 'all' ? [filters.adapter] : [])
		])
	];
	$: accountOptions = logs?.breakdowns.accounts ?? [];
	$: breakdownRows = logs?.breakdowns[breakdown] ?? [];

	function cancelExport() {
		pendingExport?.abort();
		pendingExport = undefined;
		exporting = '';
		exportError = '';
		exportStatus = '';
	}

	function leaveChangedAccount() {
		accountChanged = true;
		pending?.abort();
		cancelExport();
		logs = null;
		selected = null;
		location.replace('/tools?next=/tools/logs');
	}

	/** @param {Partial<import('$lib/tools-logs-view.js').ToolLogFilters>} patch */
	function change(patch) {
		filters = { ...filters, ...patch };
		if (filters.scope !== 'all') {
			filters.account = 'all';
			if (breakdown === 'accounts') breakdown = 'tools';
		}
		searchDraft = filters.q;
		runDraft = filters.run === 'all' ? '' : filters.run;
		void refresh();
	}

	function reset() {
		change({ ...TOOLS_LOG_FILTER_DEFAULTS, days: filters.days, scope: filters.scope });
	}

	/** @param {'all'|'ai'|'media'|'failed'|'pending'} view */
	function quickView(view) {
		change({
			kind: view === 'ai' || view === 'media' ? 'ai' : 'all',
			status: view === 'failed' || view === 'pending' ? view : 'all',
			action: view === 'media' ? 'draw.ai.media' : 'all',
			model: 'all'
		});
	}

	/** @param {string} key @param {string} value */
	function filterLabel(key, value) {
		if (key === 'tool')
			return (
				TOOLS_ACTIVITY_TOOLS[/** @type {keyof typeof TOOLS_ACTIVITY_TOOLS} */ (value)] ?? value
			);
		if (key === 'action') return TOOLS_ACTIVITY_ACTIONS[value]?.label ?? value;
		if (key === 'account') {
			const account = accountOptions.find((row) => row.key === value)?.account;
			return account?.name || account?.email || value;
		}
		if (key === 'opens') return 'Hidden';
		return value;
	}

	/** @param {import('$lib/tools-logs-view.js').ToolLogBreakdown} row */
	function breakdownLabel(row) {
		if (breakdown === 'tools')
			return (
				TOOLS_ACTIVITY_TOOLS[/** @type {keyof typeof TOOLS_ACTIVITY_TOOLS} */ (row.key)] ?? row.key
			);
		if (breakdown === 'actions') return TOOLS_ACTIVITY_ACTIONS[row.key]?.label ?? row.key;
		if (breakdown === 'accounts') return row.account?.name || row.account?.email || row.key;
		return row.key;
	}

	/** @param {import('$lib/tools-logs-view.js').ToolLogBreakdown} row */
	function drillDown(row) {
		const key = {
			tools: 'tool',
			models: 'model',
			actions: 'action',
			accounts: 'account',
			adapters: 'adapter',
			modalities: 'modality'
		}[breakdown];
		change({ [key]: row.key });
	}

	/** @param {import('$lib/tools-logs-view.js').ToolLogGenerationRun} run */
	function inspectRun(run) {
		if (filters.scope === 'all' && !run.account?.id) return;
		change(logRunFilters(filters, run));
	}

	/** @param {import('$lib/tools-logs-view.js').ToolLogEntry} entry @param {HTMLButtonElement} button */
	async function inspect(entry, button) {
		selected = entry;
		inspectedButton = button;
		await tick();
		detailClose?.focus();
	}

	function closeDetail() {
		selected = null;
		inspectedButton?.focus();
	}

	/** @param {boolean} [more] */
	async function refresh(more = false) {
		if (accountChanged) return;
		pending?.abort();
		cancelExport();
		const controller = new AbortController();
		pending = controller;
		loading = true;
		error = '';
		const query = logQuery(filters);
		if (more && logs?.nextCursor) {
			query.set('before', logs.nextCursor);
			query.set('snapshot', logs.range.to);
		} else {
			logs = null;
			selected = null;
			const search = query.toString();
			history.replaceState(history.state, '', `/tools/logs${search ? `?${search}` : ''}`);
		}
		try {
			const response = await fetch(`/tools/api/logs?${query}`, {
				headers: { 'X-Tools-User': data.user.id },
				cache: 'no-store',
				signal: controller.signal
			});
			if (controller.signal.aborted) return;
			if (response.status === 401 || response.status === 409) {
				leaveChangedAccount();
				return;
			}
			if (response.status === 403) {
				logs = null;
				selected = null;
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
				entries: more ? mergeLogEntries(logs?.entries ?? [], result.entries) : result.entries
			};
			updatedAt = new Date().toISOString();
		} catch (failure) {
			if (!controller.signal.aborted)
				error = failure instanceof Error ? failure.message : 'Activity is unavailable.';
		} finally {
			if (pending === controller) loading = false;
		}
	}

	/** @param {'csv'|'json'} format */
	async function exportLogs(format) {
		if (!logs || loading || accountChanged) return;
		cancelExport();
		const controller = new AbortController();
		pendingExport = controller;
		exporting = format;
		const query = logQuery(filters);
		query.set('snapshot', logs.range.to);
		query.set('format', format);
		try {
			const response = await fetch(`/tools/api/logs/export?${query}`, {
				headers: { 'X-Tools-User': data.user.id },
				cache: 'no-store',
				signal: controller.signal
			});
			if (controller.signal.aborted) return;
			if (response.status === 401 || response.status === 409) {
				leaveChangedAccount();
				return;
			}
			if (response.status === 403) {
				logs = null;
				selected = null;
				throw new Error(
					'This export is no longer authorized. Return to Your tools and sign in again.'
				);
			}
			if (response.status === 413)
				throw new Error(
					'More than 10,000 records match. Narrow the filters or period, then export again. No partial file was downloaded.'
				);
			if (!response.ok)
				throw new Error('Export is unavailable. No file was downloaded. Try again.');
			const blob = await response.blob();
			if (controller.signal.aborted || accountChanged) return;
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `swyx-tool-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			const countHeader = response.headers.get('X-Export-Count');
			const exportedCount = countHeader === null ? NaN : Number(countHeader);
			exportStatus = `${format.toUpperCase()} downloaded: all ${Number.isSafeInteger(exportedCount) && exportedCount >= 0 ? exportedCount.toLocaleString() : 'matching'} records.`;
		} catch (failure) {
			if (!controller.signal.aborted)
				exportError = failure instanceof Error ? failure.message : 'Export is unavailable.';
		} finally {
			if (pendingExport === controller) exporting = '';
		}
	}

	onMount(() => {
		const restore = () => {
			filters = logFilters(new URLSearchParams(location.search));
			if (!data.user.isOwner) {
				filters.scope = 'mine';
				filters.account = 'all';
			}
			searchDraft = filters.q;
			runDraft = filters.run === 'all' ? '' : filters.run;
			advancedOpen = [
				'source',
				'model',
				'action',
				'account',
				'day',
				'adapter',
				'modality',
				'run'
			].some((key) => filters[/** @type {keyof typeof filters} */ (key)] !== defaults[key]);
			void refresh();
		};
		const switched = (/** @type {StorageEvent} */ event) => {
			if (event.key === 'swyx-tools:account' && event.newValue !== data.user.id)
				leaveChangedAccount();
		};
		const focused = () => {
			if (!exporting) void refresh();
		};
		restore();
		window.addEventListener('popstate', restore);
		window.addEventListener('storage', switched);
		window.addEventListener('focus', focused);
		return () => {
			pending?.abort();
			pendingExport?.abort();
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
		<div>
			<p class="eyebrow">swyx.io / tools / logs</p>
			<h1>Tool logs</h1>
			<p class="intro">Find a request. Spot a pattern. Take the data with you.</p>
		</div>
		<p class="account">
			{data.user.email}<br />{data.user.isOwner ? 'Site owner' : 'Your activity'} · 30-day retention
		</p>
	</header>

	<div class="quick-views" aria-label="Quick views">
		<span class="small muted">Quick views</span>
		<button
			aria-pressed={filters.kind === 'all' && filters.status === 'all'}
			on:click={() => quickView('all')}>All activity</button
		>
		<button
			aria-pressed={filters.kind === 'ai' && filters.status === 'all' && filters.action === 'all'}
			on:click={() => quickView('ai')}>AI only</button
		>
		<button
			aria-pressed={filters.kind === 'ai' &&
				filters.action === 'draw.ai.media' &&
				filters.status === 'all'}
			on:click={() => quickView('media')}>Media</button
		>
		<button aria-pressed={filters.status === 'failed'} on:click={() => quickView('failed')}
			>Failures</button
		>
		<button aria-pressed={filters.status === 'pending'} on:click={() => quickView('pending')}
			>Pending</button
		>
		<label class="check"
			><input
				type="checkbox"
				checked={filters.opens === 'hide'}
				on:change={(event) => change({ opens: event.currentTarget.checked ? 'hide' : 'all' })}
			/> Hide tool opens</label
		>
	</div>
	<form
		class="filters"
		on:submit|preventDefault={() =>
			change({ q: searchDraft.trim(), run: runDraft.trim() || 'all' })}
		aria-label="Filter activity"
	>
		<div class="filter-row">
			{#if data.user.isOwner}<label
					>Accounts<select bind:value={filters.scope} on:change={() => change({})}
						><option value="mine">My activity</option><option value="all">Everyone</option></select
					></label
				>{/if}
			<label
				>Period<select bind:value={filters.days} on:change={() => change({ day: '' })}
					><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option
						value="30">Last 30 days</option
					></select
				></label
			>
			<label
				>Activity<select bind:value={filters.kind} on:change={() => change({})}
					><option value="all">AI + tools</option><option value="ai">AI requests</option><option
						value="tool">Tool actions</option
					></select
				></label
			>
			<label
				>Tool<select bind:value={filters.tool} on:change={() => change({})}
					><option value="all">All tools</option
					>{#each Object.entries(TOOLS_ACTIVITY_TOOLS) as [id, label]}<option value={id}
							>{label}</option
						>{/each}</select
				></label
			>
			<label
				>Status<select bind:value={filters.status} on:change={() => change({})}
					><option value="all">All statuses</option><option value="succeeded">Succeeded</option
					><option value="failed">Failed</option><option value="pending">Pending</option><option
						value="cancelled">Cancelled</option
					></select
				></label
			>
			<button type="button" on:click={() => refresh()} disabled={loading}
				>{loading ? 'Loading…' : 'Refresh'}</button
			>
		</div>
		<div class="search-row">
			<label class="search"
				>Search metadata<input
					type="search"
					bind:value={searchDraft}
					maxlength="100"
					placeholder="Request / run ID, action, model, or tool"
				/></label
			>
			<button type="submit">Search</button>
			<button
				class="text-button"
				type="button"
				aria-expanded={advancedOpen}
				aria-controls="advanced-filters"
				on:click={() => (advancedOpen = !advancedOpen)}
				>{advancedOpen ? 'Fewer filters' : 'More filters'}</button
			>
		</div>
		{#if advancedOpen}
			<div id="advanced-filters" class="filter-row advanced">
				<label
					>Source<select bind:value={filters.source} on:change={() => change({})}
						><option value="all">All sources</option><option value="server">Server-recorded</option
						><option value="browser">Browser-reported</option></select
					></label
				>
				<label
					>Action<select bind:value={filters.action} on:change={() => change({})}
						><option value="all">All actions</option
						>{#each Object.entries(TOOLS_ACTIVITY_ACTIONS) as [id, action]}<option value={id}
								>{action.label}</option
							>{/each}</select
					></label
				>
				<label
					>Model<select bind:value={filters.model} on:change={() => change({})}
						><option value="all">All models</option>{#each modelOptions as model}<option
								value={model}>{model}</option
							>{/each}</select
					></label
				>
				{#if data.user.isOwner && filters.scope === 'all'}<label
						>Account<select bind:value={filters.account} on:change={() => change({})}
							><option value="all">All accounts</option>{#each accountOptions as row}<option
									value={row.key}>{row.account?.email || row.account?.name || row.key}</option
								>{/each}{#if filters.account !== 'all' && !accountOptions.some((row) => row.key === filters.account)}<option
									value={filters.account}>{filters.account}</option
								>{/if}</select
						></label
					>{/if}
				<label
					>Hosting provider<select bind:value={filters.adapter} on:change={() => change({})}
						><option value="all">All providers</option>{#each adapterOptions as adapter}<option
								value={adapter}>{adapter}</option
							>{/each}</select
					></label
				>
				<label
					>Generation mode<select bind:value={filters.modality} on:change={() => change({})}
						><option value="all">All modes</option><option value="text-to-image"
							>Text to image</option
						><option value="image-edit">Image edit</option><option value="image-to-video"
							>Image to video</option
						></select
					></label
				>
				<label
					>Run ID<input
						bind:value={runDraft}
						maxlength="128"
						placeholder="All runs"
						on:change={() => change({ run: runDraft.trim() || 'all' })}
					/></label
				>
				<label
					>Day · UTC<input
						type="date"
						bind:value={filters.day}
						on:change={() => change({})}
					/></label
				>
			</div>
			<p class="small muted">
				Model, provider, and account choices show the top 20 in this view. Search includes request,
				provider-request, run, and client-job IDs; never prompts or account emails.
			</p>
		{/if}
	</form>
	{#if activeFilters.length}
		<div class="filter-chips" aria-label="Applied filters">
			{#each activeFilters as [key, value]}<button
					on:click={() => change({ [key]: defaults[key] })}
					aria-label={`Remove ${filterNames[key]} filter`}
					>{filterNames[key]}: {filterLabel(key, value)} <span aria-hidden="true">×</span></button
				>{/each}
			<button class="text-button" on:click={reset}>Reset filters</button>
		</div>
	{/if}
	{#if error}<p class="error" role="alert">
			{error} <button on:click={() => refresh()}>Try again</button>
		</p>{/if}
	{#if loading && !logs}<p role="status">Loading your activity…</p>{/if}
	{#if exportError}<p class="error" role="alert">{exportError}</p>{/if}
	{#if exportStatus}<p class="small" role="status">{exportStatus}</p>{/if}
	{#if logs}
		<p class="range">
			{filters.scope === 'all'
				? `Everyone’s recorded activity · ${logs.summary.activeAccounts} accounts`
				: 'Your recorded activity'} · {logTime(logs.range.from)} – {logTime(logs.range.to)} UTC
		</p>
		<div class="summary" aria-label="Recorded usage totals">
			<button on:click={() => change({ kind: 'all', status: 'all' })}
				><span>Matching events</span><strong>{total.toLocaleString()}</strong><small
					>Across all matching records</small
				></button
			>
			<button on:click={() => change({ kind: 'ai' })}
				><span>AI requests</span><strong>{logs.summary.aiRequests.toLocaleString()}</strong><small
					>{total
						? `${Math.round((logs.summary.aiRequests / total) * 100)}% of matching events`
						: 'No matching events'}</small
				></button
			>
			<button on:click={() => change({ kind: 'tool' })}
				><span>Tool actions</span><strong>{logs.summary.toolActions.toLocaleString()}</strong><small
					>{filters.opens === 'hide' ? 'Tool opens excluded' : 'Including tool opens'}</small
				></button
			>
			<button on:click={() => change({ status: 'failed' })}
				><span>Recorded failures</span><strong class:failed={logs.summary.failedRequests > 0}
					>{logs.summary.failedRequests.toLocaleString()}</strong
				><small
					>{total
						? `${((logs.summary.failedRequests / total) * 100).toFixed(1)}% of matching events`
						: 'No matching events'}</small
				></button
			>
			<button on:click={() => change({ status: 'pending' })}
				><span>Pending</span><strong>{logs.summary.pendingRequests.toLocaleString()}</strong><small
					>Outcome not confirmed</small
				></button
			>
			<div>
				<span>Estimated reserved</span><strong>{logMoney(logs.summary.estimatedReservedUsd)}</strong
				><small>Not provider billing</small>
			</div>
		</div>
		<p class="small muted estimate-note">
			Reservation estimates, not bills. Actual billed cost and token counts are unavailable.
		</p>
		{#if total > 0}
			<div class="analytics">
				<section class="daily" aria-labelledby="daily-title">
					<div class="section-heading">
						<h2 id="daily-title">Daily activity</h2>
						<span class="small muted">UTC · click a day to filter</span>
					</div>
					<p class="small muted chart-key">
						<i class="key ai"></i> AI requests <i class="key tool"></i> tool actions
						<span>Events / est. reserved</span>
					</p>
					<div class="daily-rows" aria-label="Daily recorded activity">
						{#each logs.daily as day}
							<button
								class="daily-row"
								on:click={() => change({ day: filters.day === day.date ? '' : day.date })}
								aria-pressed={filters.day === day.date}
								aria-label={`Filter ${day.date}: ${day.aiRequests} AI requests, ${day.toolActions} tool actions, ${day.failedRequests} failures, ${logMoney(day.estimatedReservedUsd)} estimated reserved`}
							>
								<time datetime={day.date}>{day.date.slice(5)}</time><span
									class="bar"
									aria-hidden="true"
									><span class="ai" style:width={`${(day.aiRequests / maxDaily) * 100}%`}
									></span><span class="tool" style:width={`${(day.toolActions / maxDaily) * 100}%`}
									></span></span
								><span class="count">{(day.aiRequests + day.toolActions).toLocaleString()}</span
								><span class="money">{logMoney(day.estimatedReservedUsd)}</span>
							</button>
						{/each}
					</div>
				</section>
				<section class="breakdown" aria-labelledby="breakdown-title">
					<div class="section-heading">
						<h2 id="breakdown-title">Breakdown</h2>
						<span class="small muted">Top {logs.breakdownLimit} · all matching records</span>
					</div>
					<div class="breakdown-tabs" aria-label="Breakdown by">
						<button aria-pressed={breakdown === 'tools'} on:click={() => (breakdown = 'tools')}
							>Tools</button
						><button aria-pressed={breakdown === 'models'} on:click={() => (breakdown = 'models')}
							>Models</button
						><button aria-pressed={breakdown === 'actions'} on:click={() => (breakdown = 'actions')}
							>Actions</button
						><button
							aria-pressed={breakdown === 'adapters'}
							on:click={() => (breakdown = 'adapters')}>Providers</button
						><button
							aria-pressed={breakdown === 'modalities'}
							on:click={() => (breakdown = 'modalities')}>Modes</button
						>{#if data.user.isOwner && filters.scope === 'all'}<button
								aria-pressed={breakdown === 'accounts'}
								on:click={() => (breakdown = 'accounts')}>Accounts</button
							>{/if}
					</div>
					{#if breakdown === 'adapters' || breakdown === 'modalities'}<p class="small muted">
							Recorded media metadata only; historical requests without a provider or mode are
							excluded.
						</p>{/if}
					<div class="breakdown-label small muted">
						<span>Click to filter</span><span>Events</span><span>Failed</span><span
							>Est. reserved</span
						>
					</div>
					<div class="breakdown-rows">
						{#each breakdownRows as row}
							<button
								class="breakdown-row"
								on:click={() => drillDown(row)}
								aria-label={`Filter ${breakdownLabel(row)}: ${row.count} events`}
								><span class="breakdown-name"
									>{breakdownLabel(row)}{#if breakdown === 'accounts' && row.account?.email}<small
											>{row.account.email}</small
										>{/if}<span
										class="mini-bar"
										aria-hidden="true"
										style:width={`${(row.count / Math.max(1, total)) * 100}%`}
									></span></span
								><span class="count">{row.count.toLocaleString()}</span><span
									class="count"
									class:failed={row.failedRequests > 0}>{row.failedRequests}</span
								><span class="money">{logMoney(row.estimatedReservedUsd)}</span></button
							>
						{:else}<p class="small muted">
								No {breakdown === 'models' ? 'AI model' : breakdown} records in this view.
							</p>{/each}
					</div>
				</section>
			</div>
		{/if}
		{#if logs.generationRuns?.length || filters.action === 'draw.ai.media' || filters.run !== 'all'}
			<ToolsGenerationRuns
				runs={logs.generationRuns ?? []}
				showAccounts={filters.scope === 'all'}
				limit={logs.breakdownLimit}
				onSelect={inspectRun}
			/>
		{/if}
		<div class="activity-heading">
			<div>
				<h2>Activity</h2>
				<p class="small muted">
					Newest first · {logs.entries.length.toLocaleString()} of {total.toLocaleString()} records loaded
				</p>
			</div>
			<div class="exports">
				<span class="small muted">Export all matching records</span>
				<div>
					<button disabled={loading || !!exporting} on:click={() => exportLogs('csv')}
						>{exporting === 'csv' ? 'Exporting…' : 'Export CSV'}</button
					><button disabled={loading || !!exporting} on:click={() => exportLogs('json')}
						>{exporting === 'json' ? 'Exporting…' : 'Export JSON'}</button
					>{#if exporting}<button on:click={cancelExport}>Cancel export</button>{/if}
				</div>
			</div>
		</div>
		{#if selected}
			<section id="request-detail" class="request-detail" aria-label="Request quick view">
				<div class="section-heading">
					<h3>{TOOLS_ACTIVITY_ACTIONS[selected.action]?.label ?? selected.action}</h3>
					<button bind:this={detailClose} on:click={closeDetail}>Close quick view</button>
				</div>
				<dl>
					<div>
						<dt>Request ID</dt>
						<dd><code>{selected.id}</code></dd>
					</div>
					<div>
						<dt>Recorded at · UTC</dt>
						<dd>{selected.createdAt}</dd>
					</div>
					<div>
						<dt>Status</dt>
						<dd>
							{logStatus(selected.status)}{#if ['reserved', 'submitted'].includes(selected.status)}
								· {selected.status}; no confirmed outcome{/if}
						</dd>
					</div>
					<div>
						<dt>Action</dt>
						<dd>{selected.action}</dd>
					</div>
					<div>
						<dt>Source</dt>
						<dd>
							{selected.source === 'browser' ? 'Browser-reported · best-effort' : 'Server-recorded'}
						</dd>
					</div>
					<div>
						<dt>Model</dt>
						<dd>{selected.model ?? 'Not applicable'}</dd>
					</div>
					<div>
						<dt>Estimated reserved</dt>
						<dd>{logMoney(selected.estimatedReservedUsd)}</dd>
					</div>
					{#if selected.account}<div>
							<dt>Account</dt>
							<dd>{selected.account.email || selected.account.name || selected.account.id}</dd>
						</div>{/if}
				</dl>
				{#if selected.action === 'draw.ai.media'}<ToolsGenerationDetail
						generation={selected.generation}
						requestStatus={selected.status}
					/>{/if}
				<div class="detail-actions">
					<button on:click={() => change({ action: selected?.action ?? 'all' })}
						>Filter this action</button
					>{#if selected.model}<button on:click={() => change({ model: selected?.model ?? 'all' })}
							>Filter this model</button
						>{/if}
				</div>
			</section>
		{/if}
		{#if logs.entries.length === 0}
			<div class="empty">
				<h3>No recorded activity in this view</h3>
				<p>
					Try a broader period or reset the filters. Missing records do not mean zero usage;
					earlier, signed-out, and unconnected activity cannot be reconstructed.
				</p>
				{#if activeFilters.length}<button on:click={reset}>Clear filters</button>{:else}<a
						href="/tools/draw">Open Draw →</a
					>{/if}
			</div>
		{:else}
			<p class="scroll-hint small muted">Scroll for status, source, and cost →</p>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (keyboard users need to scroll the activity table) -->
			<div
				class="table-wrap"
				tabindex="0"
				role="region"
				aria-label="Activity records; scroll horizontally on small screens"
			>
				<table>
					<caption class="sr-only"
						>{filters.scope === 'all' ? 'All accounts’ activity.' : 'Your account’s activity.'} Times
						in UTC; costs are estimates. Select an action for its request details.</caption
					><thead
						><tr
							><th scope="col">Time · UTC</th><th scope="col">Tool / action</th><th scope="col"
								>Status</th
							><th scope="col">Source / model</th>{#if filters.scope === 'all'}<th scope="col"
									>Account</th
								>{/if}<th scope="col" class="money">Est. reserved</th></tr
						></thead
					>
					<tbody
						>{#each logs.entries as entry (entry.kind + ':' + entry.id + ':' + (entry.account?.id ?? data.user.id))}<tr
								class:selected={selected?.id === entry.id &&
									selected?.kind === entry.kind &&
									selected?.account?.id === entry.account?.id}
								><td class="time-cell"
									><time datetime={entry.createdAt} title={entry.createdAt}
										>{logTime(entry.createdAt)}</time
									></td
								><td
									><button
										class="inspect"
										aria-expanded={selected?.id === entry.id &&
											selected?.kind === entry.kind &&
											selected?.account?.id === entry.account?.id}
										aria-controls="request-detail"
										aria-label={`Inspect ${TOOLS_ACTIVITY_ACTIONS[entry.action]?.label ?? entry.action} at ${logTime(entry.createdAt)}`}
										on:click={(event) => inspect(entry, event.currentTarget)}
										>{TOOLS_ACTIVITY_ACTIONS[entry.action]?.label ?? entry.action}<span
											aria-hidden="true">↗</span
										></button
									><small
										>{TOOLS_ACTIVITY_TOOLS[entry.tool] ?? entry.tool} · {entry.kind === 'ai'
											? 'AI'
											: 'tool'}</small
									></td
								><td
									><span
										class="status"
										class:failed={entry.status === 'failed'}
										class:pending={['reserved', 'submitted'].includes(entry.status)}
										title={['reserved', 'submitted'].includes(entry.status)
											? `${entry.status}: outcome not confirmed`
											: entry.status}>{logStatus(entry.status)}</span
									></td
								><td class="source-cell"
									>{entry.source === 'browser'
										? 'Browser-reported'
										: 'Server-recorded'}{#if entry.model}<small class="model">{entry.model}</small
										>{/if}{#if entry.generation}<small
											>{entry.generation.adapter ?? 'Provider unavailable'} · {entry.generation
												.modality ?? 'Mode unavailable'}</small
										>{/if}</td
								>{#if filters.scope === 'all'}<td class="account-cell"
										><strong>{entry.account?.name || 'Google account'}</strong><small
											>{entry.account?.email || entry.account?.id || 'Identity unavailable'}</small
										></td
									>{/if}<td class="money">{logMoney(entry.estimatedReservedUsd)}</td></tr
							>{/each}</tbody
					>
				</table>
			</div>
			{#if logs.nextCursor}<button
					class="load-more"
					on:click={() => refresh(true)}
					disabled={loading}>{loading ? 'Loading…' : 'Load older activity'}</button
				>{/if}
		{/if}
		<p class="small muted">
			Updated {logTime(updatedAt)} UTC. Refresh for new requests and status changes. Exports include all
			matches in this time window, up to 10,000 records; larger exports require narrower filters.
		</p>
	{/if}
	<aside class="coverage">
		<p class="small muted">
			Metadata only · retained 30 days · other apps are <strong>not connected</strong>.
		</p>
		<details>
			<summary>Coverage & metric definitions</summary>
			<p>
				Signed-in swyx.io activity only: AI requests, Draw opens and cloud page changes, local image
				tools, designs, memes, Big text box opens, podcast uploads, and Reclip launches. ChatGPT,
				Claude, Codex, and activity inside external apps are not connected.
			</p>
			<p>
				Browser-reported actions are best-effort, not proof an action happened. Offline activity,
				blocked logging, signed-out use, and raw drawing edits are not fully captured. Missing
				records do not mean zero usage. Pending means a reserved or submitted AI request has no
				confirmed final outcome.
			</p>
			<p>
				Reservations are allowance estimates, not provider bills. Failed AI attempts retain their
				reservation. Actual billed cost, token counts, and provider execution latency are
				unavailable. Media timings are observed server wall time, including queue and polling; not
				GPU execution, cold-start, or warm-idle time. Percentages use all matching recorded events,
				not complete real-world usage.
			</p>
			<p>
				You can view your own records. The site owner can view everyone’s metadata, including
				account name and email. No prompts, images, drawing contents, text-box text, or file names
				are recorded or exported. Exported files can contain account identity when viewing Everyone. <a
					href="/tools/privacy">Privacy details →</a
				>
			</p>
		</details>
	</aside>
</section>

<style>
	.logs {
		max-width: 78rem;
		min-width: 0;
	}
	nav,
	header,
	.section-heading,
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
		margin: 1.75rem 0 1.25rem;
		align-items: end;
	}
	h1 {
		margin: 0.15rem 0;
		font-size: clamp(2rem, 4vw, 3rem);
	}
	h2,
	h3 {
		font-size: 1.05rem;
		margin: 0;
	}
	.eyebrow {
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--page-accent);
		margin: 0;
	}
	.intro {
		margin: 0.35rem 0 0;
		font-size: 0.95rem;
	}
	.account {
		font-size: 0.75rem;
		color: var(--page-muted);
		text-align: right;
		overflow-wrap: anywhere;
	}
	.muted,
	.range {
		color: var(--page-muted);
	}
	.small,
	.range {
		font-size: 0.75rem;
		line-height: 1.5;
	}
	button,
	select,
	input {
		border: 1px solid var(--page-border);
		background: var(--page-bg);
		color: var(--page-text);
		border-radius: 0.25rem;
		font: inherit;
		min-height: 2.35rem;
	}
	button,
	select {
		padding: 0.45rem 0.65rem;
		font-size: 0.8rem;
	}
	button {
		cursor: pointer;
	}
	button:hover {
		border-color: var(--page-accent);
	}
	button:disabled {
		opacity: 0.55;
		cursor: wait;
	}
	button:focus-visible,
	select:focus-visible,
	input:focus-visible,
	.table-wrap:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--page-accent);
		outline-offset: 3px;
	}
	button[aria-pressed='true'] {
		color: var(--page-accent);
		border-color: var(--page-accent);
		background: color-mix(in srgb, var(--page-accent) 6%, var(--page-bg));
	}
	label {
		display: grid;
		gap: 0.25rem;
		font-size: 0.72rem;
		color: var(--page-muted);
		min-width: 0;
	}
	select {
		max-width: 100%;
		width: 100%;
	}
	input {
		padding: 0.45rem 0.65rem;
		min-width: 0;
		font-size: 0.875rem;
	}
	.quick-views,
	.filter-row,
	.search-row,
	.filter-chips,
	.detail-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.quick-views {
		margin-bottom: 0.8rem;
	}
	.quick-views > span {
		margin-right: 0.2rem;
	}
	.quick-views .check {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-left: auto;
		font-size: 0.8rem;
	}
	.check input {
		min-height: 1rem;
		width: 1rem;
		height: 1rem;
		accent-color: var(--page-accent);
	}
	.filters {
		padding: 0.8rem 0;
		border-block: 1px solid var(--page-border);
	}
	.filter-row,
	.search-row {
		align-items: end;
		gap: 0.65rem;
	}
	.filter-row > label {
		flex: 1 1 8rem;
	}
	.search-row {
		margin-top: 0.8rem;
	}
	.search {
		flex: 1 1 16rem;
	}
	.text-button {
		border-color: transparent;
		color: var(--page-accent);
	}
	.advanced {
		margin-top: 0.9rem;
	}
	.advanced > label {
		max-width: 100%;
		flex-basis: 10rem;
	}
	.filter-chips {
		padding-top: 0.65rem;
	}
	.filter-chips button {
		min-height: 1.85rem;
		font-size: 0.72rem;
		padding: 0.3rem 0.5rem;
		max-width: 100%;
		overflow-wrap: anywhere;
		text-align: left;
	}
	.filter-chips span {
		margin-left: 0.3rem;
	}
	.range {
		margin: 0.8rem 0 0.6rem;
	}
	.summary {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		margin: 0.8rem 0 0.5rem;
		gap: 0.65rem;
	}
	.summary > * {
		padding: 0.25rem 0.6rem;
		border: 0;
		border-left: 2px solid var(--page-border);
		border-radius: 0;
		text-align: left;
		min-width: 0;
	}
	.summary > button:hover {
		border-left-color: var(--page-accent);
	}
	.summary span,
	.summary strong,
	.summary small {
		display: block;
	}
	.summary span {
		font-size: 0.72rem;
		color: var(--page-muted);
	}
	.summary strong {
		font-size: 1.7rem;
		font-weight: 500;
		line-height: 1.5;
		font-variant-numeric: tabular-nums;
	}
	.summary small {
		font-size: 0.65rem;
		color: var(--page-muted);
		line-height: 1.35;
	}
	.estimate-note {
		margin: 0.6rem 0 1rem;
	}
	.analytics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		padding: 1rem 0;
		border-block: 1px solid var(--page-border);
	}
	.analytics > section {
		min-width: 0;
	}
	.section-heading {
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
	}
	.chart-key {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin: 0.9rem 0 0.6rem;
	}
	.chart-key > span {
		margin-left: auto;
	}
	.key {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		margin-left: 0.3rem;
	}
	.ai {
		background: #536e83;
	}
	.tool {
		background: #ba8e57;
	}
	.daily-rows,
	.breakdown-rows {
		max-height: 15rem;
		overflow-y: auto;
		padding-right: 0.2rem;
	}
	.daily-row {
		display: grid;
		grid-template-columns: 2.8rem minmax(2rem, 1fr) 2.75rem 4rem;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		border: 0;
		border-radius: 0;
		padding: 0.3rem 0.15rem;
		min-height: 2.3rem;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		text-align: left;
	}
	.daily-row:hover,
	.breakdown-row:hover {
		background: color-mix(in srgb, var(--page-accent) 5%, var(--page-bg));
	}
	.bar {
		display: flex;
		height: 0.5rem;
		background: color-mix(in srgb, var(--page-muted) 8%, transparent);
	}
	.bar span {
		min-width: 0;
	}
	.count,
	.money {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.breakdown-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0.6rem 0;
	}
	.breakdown-tabs button {
		min-height: 1.9rem;
		padding: 0.25rem 0.55rem;
		font-size: 0.75rem;
	}
	.breakdown-label,
	.breakdown-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 2.75rem 2.5rem 5rem;
		gap: 0.5rem;
		align-items: center;
	}
	.breakdown-label {
		font-size: 0.65rem;
		text-align: right;
		padding: 0 0.2rem 0.3rem;
	}
	.breakdown-label > :first-child {
		text-align: left;
	}
	.breakdown-row {
		width: 100%;
		text-align: left;
		border: 0;
		border-radius: 0;
		border-top: 1px solid var(--page-border);
		padding: 0.5rem 0.2rem;
		font-size: 0.75rem;
	}
	.breakdown-name {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.breakdown-name small {
		color: var(--page-muted);
		display: block;
	}
	.mini-bar {
		display: block;
		background: color-mix(in srgb, var(--page-muted) 35%, transparent);
		height: 2px;
		margin-top: 0.35rem;
	}
	.activity-heading {
		margin: 1.2rem 0 0.65rem;
		flex-wrap: wrap;
	}
	.activity-heading p {
		margin: 0.2rem 0 0;
	}
	.exports {
		text-align: right;
	}
	.exports > span {
		display: block;
		margin-bottom: 0.3rem;
	}
	.exports > div {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.exports button {
		min-height: 2rem;
		font-size: 0.75rem;
	}
	.table-wrap {
		overflow-x: auto;
		max-width: 100%;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.75rem;
	}
	th {
		text-align: left;
		color: var(--page-muted);
		font-size: 0.68rem;
		font-weight: 500;
		padding: 0.6rem 0.45rem;
		border-bottom: 1px solid var(--page-border);
	}
	td {
		padding: 0.55rem 0.45rem;
		vertical-align: top;
		border-bottom: 1px solid var(--page-border);
	}
	td small {
		display: block;
		color: var(--page-muted);
		font-size: 0.67rem;
		margin-top: 0.15rem;
	}
	.time-cell {
		white-space: nowrap;
	}
	.inspect {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		text-align: left;
		padding: 0;
		border: 0;
		border-radius: 0;
		min-height: 0;
		font-size: 0.8rem;
		font-weight: 500;
	}
	.inspect:hover {
		text-decoration: underline;
		color: var(--page-accent);
	}
	.inspect > span {
		color: var(--page-muted);
		font-size: 0.7rem;
	}
	.status {
		font-size: 0.7rem;
		white-space: nowrap;
	}
	.failed,
	.error {
		color: #b44030;
	}
	.pending {
		color: #896222;
	}
	.source-cell {
		min-width: 9rem;
		max-width: 17rem;
	}
	.model,
	.account-cell {
		overflow-wrap: anywhere;
	}
	.account-cell {
		min-width: 10rem;
		max-width: 16rem;
	}
	.account-cell strong {
		font-weight: 500;
	}
	tr.selected {
		background: color-mix(in srgb, var(--page-accent) 6%, var(--page-bg));
	}
	.request-detail {
		border: 1px solid var(--page-border);
		padding: 1rem;
		margin: 0.75rem 0;
	}
	.request-detail dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem 1.25rem;
		margin: 1rem 0;
	}
	.request-detail dt {
		font-size: 0.7rem;
		color: var(--page-muted);
	}
	.request-detail dd {
		margin: 0.15rem 0 0;
		font-size: 0.8rem;
		overflow-wrap: anywhere;
	}
	.request-detail code {
		font-size: 0.75rem;
	}
	.detail-actions button {
		font-size: 0.75rem;
		min-height: 2rem;
	}
	.empty {
		padding: 1.5rem 0;
		max-width: 40rem;
	}
	.empty p {
		font-size: 0.85rem;
		color: var(--page-muted);
	}
	.load-more {
		margin-top: 0.75rem;
	}
	.error {
		font-size: 0.85rem;
	}
	.coverage {
		border-top: 1px solid var(--page-border);
		margin-top: 1.25rem;
		padding-top: 0.5rem;
	}
	.coverage summary {
		font-size: 0.8rem;
		cursor: pointer;
	}
	.coverage details p {
		font-size: 0.8rem;
		color: var(--page-muted);
		max-width: 65rem;
	}
	.scroll-hint {
		display: none;
	}
	@media (max-width: 900px) {
		.summary {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 0.9rem;
		}
		.analytics {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
	@media (max-width: 600px) {
		header {
			display: block;
			margin: 1.3rem 0 1rem;
		}
		.account {
			text-align: left;
			margin: 0.7rem 0 0;
		}
		.quick-views {
			gap: 0.4rem;
		}
		.quick-views > span {
			width: 100%;
		}
		.quick-views .check {
			width: 100%;
			margin: 0.3rem 0 0;
		}
		.filters .filter-row {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		input,
		select {
			font-size: 1rem;
			min-height: 2.7rem;
		}
		button {
			min-height: 2.5rem;
		}
		.search-row {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.search-row .text-button {
			grid-column: 1 / -1;
			justify-self: start;
			padding-left: 0;
		}
		.summary {
			gap: 0.65rem 0.3rem;
		}
		.summary > * {
			padding-left: 0.4rem;
		}
		.summary strong {
			font-size: 1.45rem;
		}
		.summary span {
			font-size: 0.67rem;
		}
		.summary small {
			font-size: 0.6rem;
		}
		.section-heading {
			align-items: baseline;
		}
		.breakdown-label,
		.breakdown-row {
			grid-template-columns: minmax(0, 1fr) 2.25rem 2.1rem 4.4rem;
			gap: 0.35rem;
		}
		.daily-row {
			grid-template-columns: 2.5rem minmax(2rem, 1fr) 2rem 3.5rem;
			gap: 0.4rem;
		}
		.exports {
			text-align: left;
			width: 100%;
		}
		.exports button {
			min-height: 2.5rem;
		}
		.scroll-hint {
			display: block;
		}
		table {
			min-width: 42rem;
		}
		.request-detail {
			padding: 0.75rem;
		}
		.request-detail dl {
			grid-template-columns: 1fr;
		}
	}
</style>
