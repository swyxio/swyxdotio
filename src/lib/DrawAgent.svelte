<script>
	import { onMount, tick } from 'svelte';
	import {
		DEFAULT_DRAW_AGENT_BUDGET_USD,
		MAX_DRAW_AGENT_ROUNDS,
		MAX_DRAW_AGENT_TOOL_CALLS
	} from '$lib/draw-agent-tools.js';
	import { DRAW_AGENT_WORKFLOWS } from '$lib/draw-designs.js';

	/**
	 * @typedef {{ role: 'user' | 'assistant' | 'step', content: string, createdAt: number }} AgentMessage
	 * @typedef {{ signal: AbortSignal, onProgress: (message: string) => void, reserveSpending: (amount: number, label: string) => void, getBudget: () => string | undefined, updateBudget: (token: string, spendingUsd: number) => void }} CommandOptions
	 */

	/** @type {{
	 *  authenticated?: boolean,
	 *  canUseCloudAI?: boolean,
	 *  userId?: string,
	 *  pageId: string,
	 *  executeCommand: (args: string[], options: CommandOptions) => Promise<unknown>,
	 *  captureViewport: () => Promise<string | undefined>
	 * }} */
	let {
		authenticated = false,
		canUseCloudAI = false,
		userId,
		pageId,
		executeCommand,
		captureViewport
	} = $props();

	const HISTORY_PREFIX = 'swyx-excalidraw:assistant:';
	const MAX_HISTORY_MESSAGES = 36;
	let open = $state(false);
	let minimized = $state(false);
	let prompt = $state('');
	/** @type {AgentMessage[]} */
	let messages = $state([]);
	let running = $state(false);
	let status = $state('');
	let error = $state('');
	let rounds = $state(0);
	let toolCalls = $state(0);
	let spending = $state(0);
	let spendingCap = $state(DEFAULT_DRAW_AGENT_BUDGET_USD);
	let showWorkflowPicker = $state(false);
	/** @type {string | undefined} */
	let budgetToken;
	/** @type {{ x: number, y: number } | null} */
	let position = $state(null);
	/** @type {HTMLTextAreaElement | undefined} */
	let composer = $state();
	/** @type {HTMLElement | undefined} */
	let transcript = $state();
	/** @type {Worker | undefined} */
	let worker;
	/** @type {AbortController | undefined} */
	let operation;
	/** @type {{ id: string, resolve: (result: any) => void, reject: (error: unknown) => void } | undefined} */
	let pendingExecution;
	/** @type {{ pointerId: number, x: number, y: number, left: number, top: number, width: number } | undefined} */
	let drag;

	$effect(() => {
		if (!pageId || typeof localStorage === 'undefined') return;
		try {
			const stored = JSON.parse(localStorage.getItem(`${HISTORY_PREFIX}${pageId}`) ?? '[]');
			messages = Array.isArray(stored)
				? stored
						.filter(
							(entry) =>
								entry &&
								['user', 'assistant', 'step'].includes(entry.role) &&
								typeof entry.content === 'string' &&
								entry.content.length <= 4_000
						)
						.slice(-MAX_HISTORY_MESSAGES)
				: [];
		} catch {
			messages = [];
		}
	});

	/** @param {AgentMessage['role']} role @param {string} content */
	function appendMessage(role, content) {
		const next = [
			...messages,
			{ role, content: content.slice(0, role === 'step' ? 260 : 4_000), createdAt: Date.now() }
		].slice(-MAX_HISTORY_MESSAGES);
		messages = next;
		if (pageId) {
			try {
				localStorage.setItem(`${HISTORY_PREFIX}${pageId}`, JSON.stringify(next));
			} catch {
				// Keep the conversation usable when browser storage is full or unavailable.
			}
		}
		void tick().then(() => transcript?.scrollTo({ top: transcript.scrollHeight }));
	}

	function showAssistant() {
		open = true;
		minimized = false;
		void tick().then(() => composer?.focus());
	}

	/** @param {number} amount @param {string} label */
	function reserveSpending(amount, label) {
		if (
			!Number.isFinite(amount) ||
			amount < 0 ||
			spending + amount > spendingCap + Number.EPSILON
		) {
			throw new Error(
				`${label} would exceed the $${spendingCap.toFixed(2)} assistant spending cap.`
			);
		}
	}

	/** @param {string} token @param {number} spendingUsd */
	function updateBudget(token, spendingUsd) {
		if (typeof token !== 'string' || !Number.isFinite(spendingUsd) || spendingUsd < 0) {
			throw new Error('The assistant spending authorization is invalid.');
		}
		budgetToken = token;
		spending = spendingUsd;
	}

	/** @param {MessageEvent<any>} event */
	async function handleWorkerMessage({ data }) {
		if (data?.type === 'draw-command') {
			if (!operation || operation.signal.aborted) {
				worker?.postMessage({
					type: 'draw-error',
					id: data.id,
					message: 'The assistant was stopped.'
				});
				return;
			}
			if (toolCalls >= MAX_DRAW_AGENT_TOOL_CALLS) {
				worker?.postMessage({
					type: 'draw-error',
					id: data.id,
					message: `The assistant reached its ${MAX_DRAW_AGENT_TOOL_CALLS}-command limit.`
				});
				return;
			}
			toolCalls += 1;
			const summary = `draw ${(Array.isArray(data.args) ? data.args : []).join(' ')}`;
			status = summary.slice(0, 120);
			appendMessage('step', summary);
			try {
				const result = await executeCommand(data.args, {
					signal: operation.signal,
					onProgress: (message) => {
						status = message;
					},
					reserveSpending,
					getBudget: () => budgetToken,
					updateBudget
				});
				worker?.postMessage({ type: 'draw-result', id: data.id, result });
			} catch (failure) {
				worker?.postMessage({
					type: 'draw-error',
					id: data.id,
					message: failure instanceof Error ? failure.message : 'The drawing command failed.'
				});
			}
			return;
		}
		if (!pendingExecution || data?.id !== pendingExecution.id) return;
		const execution = pendingExecution;
		pendingExecution = undefined;
		if (data.type === 'error') execution.reject(new Error(data.message));
		else execution.resolve({ stdout: data.stdout, stderr: data.stderr, exitCode: data.exitCode });
	}

	/** @param {string} command */
	async function runShell(command) {
		if (!worker) {
			worker = new Worker(new URL('./draw-agent-shell.worker.js', import.meta.url), {
				type: 'module',
				name: 'swyx-draw-agent-sandbox'
			});
			worker.addEventListener('message', handleWorkerMessage);
			worker.addEventListener('error', (event) => {
				pendingExecution?.reject(new Error(event.message || 'The drawing sandbox stopped.'));
				pendingExecution = undefined;
				worker?.terminate();
				worker = undefined;
			});
		}
		return new Promise((resolve, reject) => {
			const id = crypto.randomUUID();
			pendingExecution = { id, resolve, reject };
			worker?.postMessage({ type: 'execute', id, command });
		});
	}

	async function sendMessage() {
		const request = prompt.trim();
		if (!request || running || !canUseCloudAI) return;
		const prior = messages
			.filter((message) => message.role !== 'step')
			.slice(-10)
			.map((message) => ({ role: message.role, content: message.content }));
		prompt = '';
		error = '';
		running = true;
		rounds = 0;
		toolCalls = 0;
		spending = 0;
		budgetToken = undefined;
		operation = new AbortController();
		appendMessage('user', request);
		/** @type {Record<string, unknown>[]} */
		const conversation = [...prior, { role: 'user', content: request }];
		while (conversation[0]?.role !== 'user') conversation.shift();
		try {
			for (let round = 0; round < MAX_DRAW_AGENT_ROUNDS; round++) {
				operation.signal.throwIfAborted();
				rounds = round + 1;
				status = `Reviewing your visible canvas · round ${rounds}/${MAX_DRAW_AGENT_ROUNDS}`;
				let screenshot;
				try {
					screenshot = await captureViewport();
				} catch {
					// Scene-inspection commands remain usable if the browser blocks canvas capture.
				}
				const response = await fetch('/tools/api/draw/agent', {
					method: 'POST',
					credentials: 'same-origin',
					headers: { 'Content-Type': 'application/json', 'X-Tools-User': userId ?? 'guest' },
					body: JSON.stringify({
						messages: conversation,
						...(screenshot ? { screenshot } : {}),
						...(budgetToken ? { budget: budgetToken } : { budgetCap: Number(spendingCap) })
					}),
					signal: operation.signal
				});
				const result = await response.json().catch(() => ({}));
				if (!response.ok)
					throw new Error(result.error ?? 'The drawing assistant could not respond.');
				if (typeof result.budget === 'string') updateBudget(result.budget, result.spendingUsd);
				const calls = Array.isArray(result.toolCalls) ? result.toolCalls : [];
				if (!calls.length) {
					appendMessage('assistant', result.content || 'Done.');
					status = '';
					return;
				}
				conversation.push({
					role: 'assistant',
					content: result.content || null,
					tool_calls: calls
				});
				for (const call of calls) {
					operation.signal.throwIfAborted();
					const args = JSON.parse(call.function.arguments);
					const output = await runShell(args.command);
					conversation.push({
						role: 'tool',
						tool_call_id: call.id,
						content: JSON.stringify(output).slice(0, 12_000)
					});
				}
				await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
			}
			appendMessage(
				'assistant',
				`I completed ${rounds} visual review rounds and ${toolCalls} drawing commands. Ask me to continue if you'd like further changes.`
			);
			status = '';
		} catch (failure) {
			if (failure instanceof Error && failure.name === 'AbortError') status = 'Stopped';
			else {
				error = failure instanceof Error ? failure.message : 'The drawing assistant stopped.';
				status = '';
			}
		} finally {
			running = false;
			operation = undefined;
		}
	}

	function stop() {
		operation?.abort();
		worker?.postMessage({ type: 'abort' });
	}

	function clearConversation() {
		if (running || !messages.length || !confirm('Clear this drawing’s assistant conversation?'))
			return;
		messages = [];
		error = '';
		status = '';
		try {
			localStorage.removeItem(`${HISTORY_PREFIX}${pageId}`);
		} catch {
			// The current conversation is still cleared if browser storage is unavailable.
		}
		void tick().then(() => composer?.focus());
	}

	function retryLastMessage() {
		if (running) return;
		const previous = messages.findLast((message) => message.role === 'user');
		if (!previous) return;
		prompt = previous.content;
		void sendMessage();
	}

	/** @param {string} task */
	function useWorkflow(task) {
		prompt = task;
		showWorkflowPicker = false;
		void tick().then(() => composer?.focus());
	}

	/** @param {PointerEvent} event */
	function beginDrag(event) {
		if (event.button !== 0 && event.pointerType !== 'touch') return;
		if (/** @type {Element} */ (event.target).closest('button')) return;
		const handle = /** @type {HTMLElement} */ (event.currentTarget);
		const panel = handle.closest('.assistant-window');
		if (!(panel instanceof HTMLElement)) return;
		const bounds = panel.getBoundingClientRect();
		drag = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			left: bounds.left,
			top: bounds.top,
			width: bounds.width
		};
		handle.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	/** @param {PointerEvent} event */
	function moveDrag(event) {
		if (!drag || drag.pointerId !== event.pointerId) return;
		position = {
			x: Math.max(
				8,
				Math.min(window.innerWidth - drag.width - 8, drag.left + event.clientX - drag.x)
			),
			y: Math.max(8, Math.min(window.innerHeight - 70, drag.top + event.clientY - drag.y))
		};
	}

	onMount(() => {
		/** @param {KeyboardEvent} event */
		const shortcut = (event) => {
			if (event.key.toLowerCase() === 'j') {
				if ((!event.metaKey && !event.ctrlKey) || event.shiftKey || event.altKey) return;
				event.preventDefault();
				if (open && !minimized) minimized = true;
				else showAssistant();
				return;
			}
			if (event.key === 'Escape' && open && !minimized && !running) {
				minimized = true;
			}
		};
		window.addEventListener('keydown', shortcut, { capture: true });
		return () => {
			window.removeEventListener('keydown', shortcut, { capture: true });
			stop();
			worker?.terminate();
		};
	});
</script>

{#if !open || minimized}
	<button
		type="button"
		class="assistant-launcher"
		class:working={running}
		aria-label="Open drawing assistant"
		title="Drawing assistant (⌘/Ctrl+J)"
		onclick={showAssistant}
	>
		<svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
			<path
				d="M10 2.5 11.8 7.2 16.5 9 11.8 10.8 10 15.5 8.2 10.8 3.5 9 8.2 7.2 10 2.5ZM15.3 12.8l.95 2.5 2.5.95-2.5.95-.95 2.5-.95-2.5-2.5-.95 2.5-.95.95-2.5Z"
				stroke="currentColor"
				stroke-width="1.35"
				stroke-linejoin="round"
			/>
		</svg>
		<span>{running ? 'Agent working…' : 'AI assistant'}</span>
	</button>
{:else}
	<section
		class="assistant-window"
		aria-label="Drawing assistant"
		style:left={position ? `${position.x}px` : undefined}
		style:top={position ? `${position.y}px` : undefined}
		style:right={position ? 'auto' : undefined}
		style:bottom={position ? 'auto' : undefined}
		onpointermove={moveDrag}
		onpointerup={(event) => {
			if (drag?.pointerId === event.pointerId) drag = undefined;
		}}
		onpointercancel={(event) => {
			if (drag?.pointerId === event.pointerId) drag = undefined;
		}}
	>
		<header class="assistant-header" onpointerdown={beginDrag} role="presentation">
			<div>
				<strong>Drawing assistant</strong>
				<span>Sees your visible canvas</span>
			</div>
			<div class="header-actions">
				{#if canUseCloudAI}
					<button
						type="button"
						class="icon-button"
						aria-label="Browse assistant design workflows"
						aria-expanded={showWorkflowPicker}
						title="Suggested design workflows"
						disabled={running}
						onclick={() => (showWorkflowPicker = !showWorkflowPicker)}
					>
						<svg aria-hidden="true" viewBox="0 0 20 20" fill="none"
							><path
								d="M4.5 5.5h11m-11 4.5h11m-11 4.5h7M3 5.5h.01M3 10h.01M3 14.5h.01"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
							/></svg
						>
					</button>
				{/if}
				{#if canUseCloudAI && messages.length}
					<button
						type="button"
						class="icon-button"
						aria-label="Clear assistant conversation"
						title="Clear conversation"
						disabled={running}
						onclick={clearConversation}
					>
						<svg aria-hidden="true" viewBox="0 0 20 20" fill="none"
							><path
								d="M4.5 6h11M8 6V4h4v2m2.5 0-.7 10H6.2L5.5 6m3 3v4m3-4v4"
								stroke="currentColor"
								stroke-width="1.4"
								stroke-linecap="round"
								stroke-linejoin="round"
							/></svg
						>
					</button>
				{/if}
				<button
					type="button"
					class="icon-button"
					aria-label="Minimize drawing assistant"
					title="Minimize (Esc)"
					onclick={() => {
						minimized = true;
					}}
				>
					<svg aria-hidden="true" viewBox="0 0 20 20" fill="none"
						><path
							d="M5 10h10"
							stroke="currentColor"
							stroke-width="1.7"
							stroke-linecap="round"
						/></svg
					>
				</button>
			</div>
		</header>

		{#if !authenticated}
			<div class="assistant-signin">
				<p>Sign in to let your private assistant inspect and edit this drawing.</p>
				<a href="/tools?next=/draw">Sign in to use the assistant</a>
			</div>
		{:else if !canUseCloudAI}
			<div class="assistant-signin">
				<p>
					Cloud AI currently uses the site owner’s paid account and is available only to that
					account. Your drawings and local image tools work independently.
				</p>
			</div>
		{:else}
			<div class="assistant-disclosure">
				Visible canvas screenshots are sent to Cloudflare AI. Image generation may also upload
				selected images to fal.ai.
			</div>
			{#if showWorkflowPicker && messages.length}
				<div class="workflow-picker" aria-label="Suggested design tasks">
					{#each DRAW_AGENT_WORKFLOWS as workflow (workflow.id)}
						<button
							type="button"
							class="workflow-chip"
							aria-label="Try {workflow.label} workflow"
							onclick={() => useWorkflow(workflow.prompt)}>{workflow.label}</button
						>
					{/each}
				</div>
			{/if}
			<div class="assistant-transcript" aria-live="polite" bind:this={transcript}>
				{#if messages.length === 0}
					<div class="assistant-empty">
						<strong>What should we draw?</strong>
						<span
							>I can inspect the canvas, create diagrams, arrange shapes, use templates, edit
							images, and review the result.</span
						>
						<div class="assistant-workflows" aria-label="Suggested design tasks">
							{#each DRAW_AGENT_WORKFLOWS as workflow (workflow.id)}
								<button
									type="button"
									class="workflow-chip"
									aria-label="Try {workflow.label} workflow"
									onclick={() => useWorkflow(workflow.prompt)}>{workflow.label}</button
								>
							{/each}
						</div>
					</div>
				{/if}
				{#each messages as message, index (`${message.createdAt}-${index}`)}
					<div
						class="agent-message"
						class:user={message.role === 'user'}
						class:step={message.role === 'step'}
					>
						{#if message.role === 'step'}<span class="step-marker" aria-hidden="true">›</span>{/if}
						{message.content}
					</div>
				{/each}
			</div>

			{#if status || error}
				<div
					class="assistant-status"
					class:error={Boolean(error)}
					role={error ? 'alert' : 'status'}
				>
					{#if running}<span class="status-spinner" aria-hidden="true"></span>{/if}
					<span>{error || status}</span>
					{#if error && !running}
						<button type="button" class="retry-button" onclick={retryLastMessage}>Retry</button>
					{/if}
				</div>
			{/if}

			<form
				class="assistant-composer"
				onsubmit={(event) => {
					event.preventDefault();
					void sendMessage();
				}}
			>
				<textarea
					bind:this={composer}
					bind:value={prompt}
					aria-label="Message drawing assistant"
					placeholder="Describe what to draw or change…"
					rows="3"
					disabled={running}
					onkeydown={(event) => {
						if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
							event.preventDefault();
							void sendMessage();
						}
					}}
				></textarea>
				<div class="composer-footer">
					<label>
						<select
							aria-label="Assistant spending limit"
							bind:value={spendingCap}
							disabled={running}
						>
							<option value={0.25}>$0.25 max</option>
							<option value={0.5}>$0.50 max</option>
							<option value={1}>$1.00 max</option>
						</select>
					</label>
					{#if spending}<span class="spending">≈${spending.toFixed(4)} used</span>{/if}
					{#if running}
						<button type="button" class="stop-button" onclick={stop}>Stop</button>
					{:else}
						<button
							type="submit"
							class="send-button"
							disabled={!prompt.trim()}
							title="Send (⌘/Ctrl+Enter)">Send</button
						>
					{/if}
				</div>
			</form>
		{/if}
	</section>
{/if}

<style>
	.assistant-launcher,
	.assistant-window {
		position: fixed;
		z-index: 35;
		font-family: system-ui, sans-serif;
	}
	.assistant-launcher {
		right: 22px;
		bottom: 60px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 11px 15px;
		border: 1px solid #deddf3;
		border-radius: 999px;
		background: #fff;
		color: #4f46a4;
		box-shadow: 0 5px 22px #2020351c;
		font-size: 13px;
		font-weight: 650;
		cursor: pointer;
	}
	.assistant-launcher svg,
	.icon-button svg {
		width: 19px;
		height: 19px;
	}
	.assistant-launcher.working {
		border-color: #aaa5f6;
	}
	.assistant-window {
		right: 20px;
		bottom: 80px;
		display: flex;
		flex-direction: column;
		width: min(410px, calc(100vw - 24px));
		height: min(580px, calc(100dvh - 105px));
		overflow: hidden;
		border: 1px solid #e6e5eb;
		border-radius: 17px;
		background: #fff;
		box-shadow: 0 18px 70px #20203525;
		color: #262631;
	}
	.assistant-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 15px 12px;
		border-bottom: 1px solid #f0eff4;
		cursor: grab;
		touch-action: none;
	}
	.assistant-header > div:first-child {
		display: grid;
		gap: 2px;
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 2px;
	}
	.assistant-header strong {
		font-size: 14px;
	}
	.assistant-header span {
		color: #757585;
		font-size: 11px;
	}
	.icon-button {
		display: grid;
		width: 31px;
		height: 31px;
		place-items: center;
		border: 0;
		border-radius: 7px;
		background: transparent;
		color: #5b5b6b;
		cursor: pointer;
	}
	.icon-button:hover {
		background: #f1f0fa;
	}
	.icon-button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.assistant-disclosure {
		padding: 9px 14px;
		border-bottom: 1px solid #f0eff4;
		color: #696978;
		font-size: 10.5px;
		line-height: 1.45;
	}
	.assistant-transcript {
		display: grid;
		flex: 1;
		align-content: start;
		gap: 10px;
		min-height: 0;
		padding: 13px;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.assistant-empty {
		display: grid;
		gap: 7px;
		margin: 24px 4px;
	}
	.assistant-empty strong {
		font-size: 15px;
	}
	.assistant-empty span {
		color: #747482;
		font-size: 12px;
		line-height: 1.55;
	}
	.assistant-workflows {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 7px;
	}
	.workflow-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 10px 13px;
		border-bottom: 1px solid #f0eff4;
	}
	.workflow-chip {
		padding: 6px 8px;
		border: 1px solid #e4e2f1;
		border-radius: 999px;
		background: #faf9ff;
		color: #514885;
		font-size: 10px;
		cursor: pointer;
	}
	.workflow-chip:hover,
	.workflow-chip:focus-visible {
		border-color: #9991e5;
		background: #f0eeff;
	}
	.agent-message {
		max-width: 95%;
		padding: 9px 11px;
		border-radius: 11px;
		background: #f5f5f8;
		font-size: 12px;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.agent-message.user {
		justify-self: end;
		background: #ebe9ff;
		color: #383363;
	}
	.agent-message.step {
		display: flex;
		gap: 6px;
		padding: 4px 2px;
		background: none;
		color: #6b6a7c;
		font-family: ui-monospace, monospace;
		font-size: 10px;
	}
	.step-marker {
		color: #6656dc;
		font-weight: 800;
	}
	.assistant-status {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 30px;
		padding: 5px 14px;
		color: #626174;
		font-size: 11px;
	}
	.assistant-status.error {
		color: #b42337;
	}
	.retry-button {
		margin-left: auto;
		border: 0;
		background: transparent;
		color: #6358c8;
		font-size: 11px;
		font-weight: 650;
		cursor: pointer;
	}
	.status-spinner {
		width: 11px;
		height: 11px;
		border: 1.5px solid #d4d2f4;
		border-top-color: #6357c8;
		border-radius: 50%;
		animation: agent-spin 0.8s linear infinite;
	}
	.assistant-composer {
		display: grid;
		gap: 8px;
		padding: 11px 12px 12px;
		border-top: 1px solid #f0eff4;
	}
	.assistant-composer textarea {
		width: 100%;
		resize: vertical;
		min-height: 61px;
		max-height: 150px;
		padding: 8px 9px;
		border: 1px solid #dfdfe8;
		border-radius: 9px;
		color: inherit;
		font: inherit;
		font-size: 12px;
	}
	.assistant-composer textarea:focus {
		outline: 2px solid #aaa3f0;
		outline-offset: 1px;
	}
	.composer-footer {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.composer-footer select {
		max-width: 111px;
		padding: 5px 4px;
		border: 0;
		background: transparent;
		color: #666575;
		font-size: 10px;
	}
	.spending {
		color: #686776;
		font-size: 10px;
	}
	.send-button,
	.stop-button {
		margin-left: auto;
		padding: 7px 12px;
		border: 0;
		border-radius: 8px;
		background: #6358c8;
		color: #fff;
		font-size: 11px;
		font-weight: 650;
		cursor: pointer;
	}
	.send-button:disabled {
		opacity: 0.48;
		cursor: default;
	}
	.stop-button {
		background: #bd4050;
	}
	.assistant-signin {
		display: grid;
		gap: 13px;
		margin: 48px 20px;
		color: #585867;
		font-size: 13px;
		line-height: 1.55;
	}
	.assistant-signin a {
		justify-self: start;
		padding: 8px 12px;
		border-radius: 8px;
		background: #6358c8;
		color: #fff;
		text-decoration: none;
	}
	@keyframes agent-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 600px) {
		.assistant-launcher {
			right: 12px;
			bottom: 58px;
		}
		.assistant-window {
			right: 12px;
			bottom: 68px;
			height: min(540px, calc(100dvh - 95px));
		}
	}
</style>
