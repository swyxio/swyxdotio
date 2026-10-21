<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';

	type Status = 'unread' | 'read' | 'followup' | 'archived';
	type UndoEntry = { batchId: string; itemId: string; status: Status; appliedStatus: Status };
	type Batch = { id: string; name: string; capturedAt?: string | null; count?: number };
	type Item = {
		id: string;
		url: string;
		title: string;
		domain?: string;
		group?: string;
		status: Status;
		note: string;
		duplicateCount?: number;
		tabGroups?: string[];
		capturedWindowIds?: string[];
		summary?: string | null;
		summarySource?: string | null;
		summaryMethod?: string | null;
		summaryCoverage?: string | null;
		summaryPreview?: boolean;
		cacheState?: string;
		wordCount?: number;
		lastOpened?: string | null;
	};
	type Page = {
		text?: string;
		summary?: string | null;
		summarySource?: string | null;
		summaryMethod?: string | null;
		summaryCoverage?: string | null;
		summaryPreview?: boolean;
		sourceNote?: string;
		sourceTruncated?: boolean;
	};
	type TabInput = {
		url: string;
		title: string;
		windowId?: string;
		group?: string;
		tabGroup?: string;
	};
	const statuses = [
		{ value: 'unread', label: 'Unread' },
		{ value: 'followup', label: 'Follow up' },
		{ value: 'read', label: 'Read' },
		{ value: 'archived', label: 'Archived' },
		{ value: 'all', label: 'All statuses' }
	];

	export let data: { user: { id: string; email?: string; name?: string } };

	let batches: Batch[] = [];
	let batchId = '';
	let items: Item[] = [];
	let selectedId = '';
	let page: Page = {};
	let note = '';
	let savedNote = '';
	let noteTimer: ReturnType<typeof setTimeout> | undefined;
	let notePromise: Promise<boolean> | null = null;
	let noteSaving = false;
	let noteError = '';
	let loading = true;
	let batchListFailed = false;
	let itemLoading = false;
	let itemUnavailable = false;
	let busy = false;
	let error = '';
	let message = '';
	let query = '';
	let topic = '';
	let topicEditId = '';
	let topicDraft = '';
	let topicExpected = '';
	let topicSaving = false;
	let topicError = '';
	let statusFilter = 'unread';
	let windowFilter = 'all';
	let filtersOpen = false;
	let itemRequest = 0;
	let importText = '';
	let importName = '';
	let importFile: File | null = null;
	let fileInput: HTMLInputElement;
	let batchOptions: HTMLDivElement;
	let importing = false;
	let undo: UndoEntry | null = null;
	let undoHistory: UndoEntry[] = [];
	let touchStart: { x: number; y: number; id: number } | null = null;
	let mode: 'tap' | 'scroll' | 'swipe' = 'tap';
	let expandedId = '';
	let previewId = '';
	let feedIds: string[] = [];
	let feedLimit = 40;
	let feedKey = '';
	let feedPending = new Set<string>();
	let feedErrorId = '';
	let feedWrites: Promise<void> = Promise.resolve();
	let activeFeedId = '';
	let seenInFeed = new Set<string>();
	let visibleInFeed = new Set<string>();
	let scrollIntentUntil = 0;
	let lastScrollY = 0;
	let touchY: number | null = null;
	let feedFrame = 0;

	$: selected = items.find((item) => item.id === selectedId);
	$: topics = [...new Set(items.map((item) => item.group || 'Reading pile'))].sort();
	$: topicOptions = [...new Set([...topics, ...(topic ? [topic] : [])])].sort();
	$: windows = [...new Set(items.flatMap((item) => item.capturedWindowIds || []))];
	$: filtered = items.filter((item) => matches(item, query, topic, statusFilter, windowFilter));
	$: nextFeedKey = JSON.stringify([batchId, query, topic, statusFilter, windowFilter]);
	$: if (feedKey !== nextFeedKey) resetFeed(nextFeedKey, filtered);
	$: feedById = new Map(items.map((item) => [item.id, item]));
	$: feedItems = feedIds.map((id) => feedById.get(id)).filter((item): item is Item => !!item);
	$: renderedFeed = feedItems.slice(0, feedLimit);
	$: unreadCount = items.filter((item) => item.status === 'unread').length;
	$: summaryDetails = page.summary ? page : selected;
	$: currentSummary = summaryDetails?.summary || '';
	$: summarySource = summaryDetails?.summarySource || '';
	$: summaryCoverage = summaryDetails?.summaryCoverage || '';
	$: summaryMethod = summaryDetails?.summaryMethod || '';
	$: summaryPreview = summaryDetails?.summaryPreview || false;

	function matches(
		item: Item,
		search: string,
		selectedTopic: string,
		selectedStatus: string,
		selectedWindow: string
	) {
		const term = search.trim().toLowerCase();
		const itemTopic = item.group || 'Reading pile';
		const itemWindows = item.capturedWindowIds || [];
		if (selectedTopic && itemTopic !== selectedTopic) return false;
		if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
		if (selectedWindow !== 'all' && !itemWindows.includes(selectedWindow)) return false;
		return (
			!term ||
			`${item.title} ${item.url} ${item.domain || ''} ${item.group || ''}`
				.toLowerCase()
				.includes(term)
		);
	}

	function errorText(value: unknown): string {
		return value instanceof Error ? value.message : 'Something went wrong. Please try again.';
	}

	class ApiError extends Error {
		statusCode: number;
		constructor(message: string, statusCode: number) {
			super(message);
			this.statusCode = statusCode;
		}
	}

	async function api<T>(
		path: string,
		options: { method?: string; body?: string; headers?: Record<string, string> } = {}
	): Promise<T> {
		const headers = new Headers(options.headers);
		headers.set('X-Tools-User', data.user.id);
		if (options.body) headers.set('Content-Type', 'application/json');
		const response = await fetch(path, {
			...options,
			headers,
			cache: 'no-store',
			credentials: 'same-origin'
		});
		const body = await response.json().catch(() => ({}));
		if (!response.ok)
			throw new ApiError(
				body?.error || body?.message || `Request failed (${response.status}).`,
				response.status
			);
		return body as T;
	}

	function itemPath(batch: string, id: string) {
		return `/tools/tabs/api/batches/${encodeURIComponent(batch)}/items/${encodeURIComponent(id)}`;
	}

	function resetScrollIntent() {
		scrollIntentUntil = 0;
		seenInFeed = new Set();
		if (feedFrame) cancelAnimationFrame(feedFrame);
		feedFrame = 0;
		if (typeof window !== 'undefined') {
			lastScrollY = window.scrollY;
			void tick().then(snapshotVisibleFeedItems);
		}
	}

	function resetFeed(key: string, current: Item[]) {
		feedKey = key;
		feedIds = current.map((item) => item.id);
		feedLimit = 40;
		activeFeedId = '';
		expandedId = '';
		previewId = '';
		resetScrollIntent();
	}

	async function setMode(next: typeof mode) {
		if (next === mode || busy || feedPending.size || topicEditId || !(await saveNote())) return;
		resetScrollIntent();
		mode = next;
		expandedId = '';
		previewId = '';
		resetFeed(nextFeedKey, filtered);
		try {
			localStorage.setItem('tab-library-mode', next);
		} catch {
			// The current session still works when browser storage is unavailable.
		}
	}

	function rememberDecision(batch: string, itemId: string, status: Status, appliedStatus: Status) {
		undoHistory = [...undoHistory, { batchId: batch, itemId, status, appliedStatus }];
		undo = undoHistory[undoHistory.length - 1];
	}

	function queueFeedDecision(id: string, status: Status, automatic = false) {
		const item = items.find((entry) => entry.id === id);
		if (!item || topicEditId || feedPending.has(id) || (automatic && item.status !== 'unread'))
			return;
		const batch = batchId;
		feedPending = new Set([...feedPending, id]);
		void tick().then(snapshotVisibleFeedItems);
		feedWrites = feedWrites.then(async () => {
			try {
				const current = items.find((entry) => entry.id === id);
				if (!current || batch !== batchId || (automatic && current.status !== 'unread')) return;
				const previous = current.status;
				const saved = await api<{ status: Status; note: string }>(itemPath(batch, id), {
					method: 'PATCH',
					body: JSON.stringify({ status, ...(automatic ? { expectedStatus: 'unread' } : {}) })
				});
				if (batch !== batchId) return;
				if (feedErrorId === id) {
					feedErrorId = '';
					error = '';
				}
				items = items.map((entry) =>
					entry.id === id ? { ...entry, status: saved.status || status } : entry
				);
				if (previous !== status) rememberDecision(batch, id, previous, saved.status || status);
				message =
					status === 'followup'
						? 'Saved for follow-up.'
						: status === 'archived'
							? 'Archived.'
							: 'Returned to unread.';
			} catch (caught) {
				// Another device may have decided this item. Reload without overwriting it.
				if (automatic) {
					try {
						const latest = await api<{ status?: Status }>(itemPath(batch, id));
						if (latest.status && batch === batchId)
							items = items.map((entry) =>
								entry.id === id ? { ...entry, status: latest.status || entry.status } : entry
							);
					} catch {
						// The original save error is the useful one to show.
					}
				}
				feedErrorId = id;
				error = `Could not save “${item.title || item.url}”: ${errorText(caught)}. Use its action button to retry.`;
			} finally {
				feedPending = new Set([...feedPending].filter((entry) => entry !== id));
				void tick().then(snapshotVisibleFeedItems);
			}
		});
	}

	function snapshotVisibleFeedItems() {
		const visibleItems: string[] = [];
		let active = '';
		for (const element of document.querySelectorAll<HTMLElement>('[data-feed-item]')) {
			const rect = element.getBoundingClientRect();
			const id = element.dataset.feedItem;
			const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
			const sufficientlyVisible = visible >= Math.min(120, rect.height / 2);
			if (
				mode === 'scroll' &&
				!active &&
				id &&
				visible > 0 &&
				(sufficientlyVisible || id === activeFeedId) &&
				feedById.get(id)?.status === 'unread' &&
				!feedPending.has(id)
			)
				active = id;
			if (id && visible > 0 && (sufficientlyVisible || id === activeFeedId)) visibleItems.push(id);
		}
		activeFeedId = active;
		visibleInFeed = new Set(visibleItems);
	}

	function loadMoreWhenVisible(element: HTMLElement) {
		if (typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting))
					feedLimit = Math.min(feedLimit + 40, feedItems.length);
			},
			{ rootMargin: '500px 0px' }
		);
		observer.observe(element);
		return { destroy: () => observer.disconnect() };
	}

	function armScroll() {
		if (mode !== 'scroll' || busy || topicEditId) return;
		// Wheel/touch events may arrive after compositor scrolling has moved the page.
		// Use the last viewport snapshot, not just the geometry in this event.
		seenInFeed = new Set([...seenInFeed, ...visibleInFeed]);
		scrollIntentUntil = performance.now() + 2000;
	}

	function wheelScroll(event: WheelEvent) {
		if (event.deltaY > 0) armScroll();
		else resetScrollIntent();
	}

	function startTouchScroll(event: TouchEvent) {
		touchY = event.touches[0]?.clientY ?? null;
		if (mode === 'scroll') {
			snapshotVisibleFeedItems();
			lastScrollY = window.scrollY;
		}
	}

	function moveTouchScroll(event: TouchEvent) {
		const y = event.touches[0]?.clientY;
		if (y == null || touchY == null) return;
		if (touchY - y > 2) armScroll();
		else if (y - touchY > 2) resetScrollIntent();
		touchY = y;
	}

	function keyboardScroll(event: KeyboardEvent) {
		if (
			event.target instanceof Element &&
			event.target.closest('input, textarea, select, button, a, [contenteditable]')
		)
			return;
		if (['ArrowDown', 'PageDown', ' ', 'End'].includes(event.key)) armScroll();
		else if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) resetScrollIntent();
	}

	function onScroll() {
		if (feedFrame) cancelAnimationFrame(feedFrame);
		feedFrame = requestAnimationFrame(() => {
			feedFrame = 0;
			const nowY = window.scrollY;
			const movingDown = nowY > lastScrollY;
			if (nowY < lastScrollY) {
				scrollIntentUntil = 0;
				seenInFeed = new Set();
			}
			const armed =
				mode === 'scroll' && !busy && !topicEditId && performance.now() <= scrollIntentUntil;
			if (armed && movingDown) {
				for (const element of document.querySelectorAll<HTMLElement>('[data-feed-item]')) {
					const id = element.dataset.feedItem;
					if (id && seenInFeed.has(id) && element.getBoundingClientRect().bottom <= 0) {
						seenInFeed = new Set([...seenInFeed].filter((seen) => seen !== id));
						queueFeedDecision(id, 'archived', true);
					}
				}
			}
			lastScrollY = nowY;
			snapshotVisibleFeedItems();
			if (armed && movingDown) seenInFeed = new Set([...seenInFeed, ...visibleInFeed]);
		});
	}

	async function showFeedItem(id: string) {
		resetScrollIntent();
		if (expandedId === id) {
			if (safeLink(items.find((item) => item.id === id)?.url || '')) previewId = id;
			return;
		}
		await openItem(id);
		if (selectedId === id) {
			expandedId = id;
			previewId = '';
		}
	}

	function scheduleNote() {
		noteError = '';
		clearTimeout(noteTimer);
		noteTimer = setTimeout(() => void saveNote(), 700);
	}

	async function saveNote(): Promise<boolean> {
		clearTimeout(noteTimer);
		if (notePromise) return notePromise;
		if (!selectedId || note === savedNote) return true;
		const id = selectedId;
		const batch = batchId;
		noteSaving = true;
		noteError = '';
		notePromise = (async () => {
			try {
				while (note !== savedNote && id === selectedId && batch === batchId) {
					const snapshot = note;
					await api<{ status: Status; note: string }>(itemPath(batch, id), {
						method: 'PATCH',
						body: JSON.stringify({ note: snapshot })
					});
					savedNote = snapshot;
					items = items.map((item) => (item.id === id ? { ...item, note: snapshot } : item));
				}
				return true;
			} catch (caught) {
				noteError = `Note not saved: ${errorText(caught)}`;
				return false;
			} finally {
				noteSaving = false;
				notePromise = null;
			}
		})();
		return notePromise;
	}

	async function startTopicEdit(item: Item) {
		if (busy || feedPending.size || topicEditId) return;
		busy = true;
		if (!(await saveNote())) {
			busy = false;
			return;
		}
		resetScrollIntent();
		topicEditId = item.id;
		topicDraft = topicExpected = item.group || 'Reading pile';
		topicError = '';
		busy = false;
		void tick().then(() => document.getElementById(`topic-edit-${item.id}`)?.focus());
	}

	function finishTopicEdit() {
		const item = items.find((entry) => entry.id === topicEditId);
		if (item && !matches(item, query, topic, statusFilter, windowFilter))
			feedIds = feedIds.filter((id) => id !== item.id);
		topicEditId = '';
		topicDraft = topicExpected = '';
		topicError = '';
		resetScrollIntent();
	}

	async function saveTopic() {
		if (!topicEditId || topicSaving || busy || feedPending.size) return;
		const proposed = topicDraft.trim();
		if (
			!proposed ||
			proposed.length > 100 ||
			[...proposed].some((character) => {
				const code = character.charCodeAt(0);
				return code < 32 || (code >= 127 && code <= 159);
			})
		) {
			topicError = 'Enter a topic of up to 100 characters without control characters.';
			return;
		}
		if (proposed === topicExpected) {
			finishTopicEdit();
			return;
		}
		const id = topicEditId;
		const batch = batchId;
		topicSaving = true;
		busy = true;
		topicError = '';
		resetScrollIntent();
		try {
			const saved = await api<{ topic: string }>(itemPath(batch, id), {
				method: 'PATCH',
				body: JSON.stringify({ topic: proposed, expectedTopic: topicExpected })
			});
			if (batch !== batchId || id !== topicEditId) return;
			items = items.map((entry) => (entry.id === id ? { ...entry, group: saved.topic } : entry));
			message = 'Topic saved.';
			finishTopicEdit();
		} catch (caught) {
			if (caught instanceof ApiError && caught.statusCode === 409) {
				try {
					const latest = await api<{ item: Item }>(itemPath(batch, id));
					if (!latest.item) throw new Error('Page unavailable.');
					if (batch !== batchId || id !== topicEditId) return;
					topicExpected = latest.item.group || 'Reading pile';
					items = items.map((entry) =>
						entry.id === id ? { ...entry, group: topicExpected } : entry
					);
					topicError = `This topic changed on another device to “${topicExpected}”. Your edit is still here. Save again to use it, or cancel.`;
				} catch {
					topicError =
						'This topic changed on another device, but the latest value could not be loaded. Try saving again or cancel.';
				}
			} else {
				topicError = `Topic not saved: ${errorText(caught)}`;
			}
		} finally {
			topicSaving = false;
			busy = false;
			resetScrollIntent();
		}
	}

	async function openItem(id: string) {
		if (busy || (mode === 'swipe' && topicEditId) || id === selectedId) return;
		busy = true;
		if (!(await saveNote())) {
			busy = false;
			return;
		}
		await loadItem(id);
		busy = false;
	}

	async function loadItem(id: string) {
		const item = items.find((entry) => entry.id === id);
		if (!item) return;
		const request = ++itemRequest;
		previewId = '';
		selectedId = id;
		page = {};
		itemUnavailable = false;
		note = item.note || '';
		savedNote = note;
		noteError = '';
		itemLoading = true;
		try {
			const result = await api<{ item?: Item; page?: Page; status?: Status; note?: string }>(
				itemPath(batchId, id)
			);
			if (request !== itemRequest) return;
			page = result.page || {};
			const loadedNote = typeof result.note === 'string' ? result.note : item.note || '';
			note = savedNote = loadedNote;
			items = items.map((entry) =>
				entry.id === id
					? {
							...entry,
							...(result.item || {}),
							status: result.status || entry.status,
							note: loadedNote
						}
					: entry
			);
		} catch (caught) {
			if (request === itemRequest) {
				itemUnavailable = true;
				error = `Could not load page: ${errorText(caught)}`;
			}
		} finally {
			if (request === itemRequest) itemLoading = false;
		}
	}

	async function switchBatch(id: string) {
		if (busy || feedPending.size || topicEditId || !id) return;
		resetScrollIntent();
		busy = true;
		error = '';
		if (!(await saveNote())) {
			busy = false;
			return;
		}
		try {
			const result = await api<{ batch: Batch; items: Item[] }>(
				`/tools/tabs/api/batches/${encodeURIComponent(id)}`
			);
			batchId = id;
			items = result.items.map((item) => ({
				...item,
				status: item.status || 'unread',
				note: item.note || ''
			}));
			topic = '';
			query = '';
			statusFilter = 'unread';
			windowFilter = 'all';
			undo = null;
			undoHistory = [];
			feedErrorId = '';
			selectedId = '';
			page = {};
			note = savedNote = '';
			await tick();
			const activeBatch = batchOptions?.querySelector<HTMLElement>('[aria-pressed="true"]');
			if (activeBatch && batchOptions.scrollHeight > batchOptions.clientHeight) {
				batchOptions.scrollTop +=
					activeBatch.getBoundingClientRect().top - batchOptions.getBoundingClientRect().top;
			}
			const first = items.find((item) => item.status === 'unread');
			if (first) await loadItem(first.id);
		} catch (caught) {
			error = `Could not load batch: ${errorText(caught)}`;
		} finally {
			busy = false;
			loading = false;
		}
	}

	async function chooseStatus(status: Status) {
		if (!selected || busy || itemLoading || topicEditId) return;
		busy = true;
		error = '';
		message = '';
		const id = selected.id;
		const previous = selected.status;
		const before = items.filter((item) => matches(item, query, topic, statusFilter, windowFilter));
		const index = before.findIndex((item) => item.id === id);
		if (!(await saveNote())) {
			busy = false;
			return;
		}
		try {
			const saved = await api<{ status: Status; note: string }>(itemPath(batchId, id), {
				method: 'PATCH',
				body: JSON.stringify({ status })
			});
			items = items.map((item) =>
				item.id === id ? { ...item, status: saved.status || status } : item
			);
			if (previous !== status) rememberDecision(batchId, id, previous, saved.status || status);
			message =
				status === 'followup'
					? 'Saved for follow-up.'
					: status === 'archived'
						? 'Archived.'
						: status === 'read'
							? 'Marked as read.'
							: 'Marked unread.';
			const remaining = items
				.filter((item) => matches(item, query, topic, statusFilter, windowFilter))
				.filter((item) => item.id !== id);
			const nextId =
				index < 0
					? remaining[0]?.id
					: before.slice(index + 1).find((item) => remaining.some((entry) => entry.id === item.id))
							?.id || remaining[0]?.id;
			if (nextId) await loadItem(nextId);
			else {
				selectedId = '';
				page = {};
				note = savedNote = '';
			}
		} catch (caught) {
			error = `Could not save decision: ${errorText(caught)}`;
		} finally {
			busy = false;
		}
	}

	async function undoDecision() {
		if (!undo || busy || feedPending.size || topicEditId || undo.batchId !== batchId) return;
		resetScrollIntent();
		busy = true;
		error = '';
		if (!(await saveNote())) {
			busy = false;
			return;
		}
		const entry = undo;
		try {
			const saved = await api<{ status: Status; note: string }>(itemPath(batchId, entry.itemId), {
				method: 'PATCH',
				body: JSON.stringify({ status: entry.status, expectedStatus: entry.appliedStatus })
			});
			items = items.map((item) =>
				item.id === entry.itemId ? { ...item, status: saved.status || entry.status } : item
			);
			undoHistory = undoHistory.slice(0, -1);
			undo = undoHistory[undoHistory.length - 1] || null;
			message = 'Decision undone.';
			if (mode === 'swipe') await loadItem(entry.itemId);
			else if (mode === 'scroll') {
				await tick();
				const restored = [...document.querySelectorAll<HTMLElement>('[data-feed-item]')].find(
					(element) => element.dataset.feedItem === entry.itemId
				);
				restored?.scrollIntoView({ block: 'center', behavior: 'instant' });
				resetScrollIntent();
				await tick();
				if (restored && entry.status === 'unread') activeFeedId = entry.itemId;
			}
		} catch (caught) {
			error = `Could not undo: ${errorText(caught)}`;
		} finally {
			busy = false;
		}
	}

	function swipeStart(event: PointerEvent) {
		if (
			mode !== 'swipe' ||
			event.pointerType !== 'touch' ||
			busy ||
			itemLoading ||
			topicEditId ||
			!(event.target instanceof Element)
		)
			return;
		if (event.target.closest('button, a, textarea, input, select, details')) return;
		touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
	}

	function swipeEnd(event: PointerEvent) {
		if (!touchStart || event.pointerId !== touchStart.id) return;
		const dx = event.clientX - touchStart.x;
		const dy = event.clientY - touchStart.y;
		touchStart = null;
		if (Math.abs(dx) >= 75 && Math.abs(dx) > Math.abs(dy) * 1.5)
			void chooseStatus(dx < 0 ? 'archived' : 'followup');
	}

	function safeLink(raw: string): string | null {
		try {
			const url = new URL(raw);
			return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
		} catch {
			return null;
		}
	}

	function formatDate(value?: string | null): string {
		return value && Number.isFinite(Date.parse(value))
			? new Date(value).toLocaleDateString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				})
			: '';
	}

	function sourceLabel(): string {
		const base =
			summarySource === 'page-text'
				? 'Based on saved page text'
				: summarySource === 'title-only'
					? 'Based on title only'
					: 'Source not recorded';
		const coverage =
			(
				{
					partial: 'Partial',
					'post-only': 'Post only',
					'local-extract': 'Local extract'
				} as Record<string, string>
			)[summaryCoverage] || summaryCoverage;
		return [summaryPreview ? 'Preview' : '', base, coverage, summaryMethod]
			.filter(Boolean)
			.join(' · ');
	}

	function parseTabs(value: unknown): TabInput[] {
		const source = Array.isArray(value)
			? value
			: value && typeof value === 'object'
				? 'tabs' in value
					? value.tabs
					: 'items' in value
						? value.items
						: null
				: null;
		if (!Array.isArray(source))
			throw new Error('JSON must be an array or contain a tabs or items array.');
		return source.map((entry: unknown) => {
			if (typeof entry === 'string') return { url: entry.trim(), title: entry.trim() };
			if (!entry || typeof entry !== 'object' || !('url' in entry) || typeof entry.url !== 'string')
				throw new Error('Each tab needs a URL.');
			const tab = entry as {
				url: string;
				title?: unknown;
				windowId?: unknown;
				group?: unknown;
				tabGroup?: unknown;
			};
			const group = typeof tab.group === 'string' ? tab.group : undefined;
			const tabGroup = typeof tab.tabGroup === 'string' ? tab.tabGroup : undefined;
			return {
				url: tab.url.trim(),
				title:
					typeof tab.title === 'string' && tab.title.trim() ? tab.title.trim() : tab.url.trim(),
				...(tab.windowId != null ? { windowId: String(tab.windowId) } : {}),
				...(group ? { group } : {}),
				...(tabGroup ? { tabGroup } : {})
			};
		});
	}

	async function importBatch() {
		if (busy || importing || topicEditId) return;
		error = '';
		message = '';
		importing = true;
		try {
			if (!(await saveNote())) return;
			let tabs: TabInput[];
			if (importFile) {
				if (importFile.size > 2_000_000) throw new Error('The file must be 2 MB or smaller.');
				tabs = parseTabs(JSON.parse(await importFile.text()));
			} else {
				const raw = importText.trim();
				if (raw.startsWith('[') || raw.startsWith('{')) tabs = parseTabs(JSON.parse(raw));
				else
					tabs = raw
						.split(/\r?\n/)
						.map((url) => url.trim())
						.filter(Boolean)
						.map((url) => ({ url, title: url }));
			}
			if (!tabs.length || tabs.some((tab) => !tab.url)) throw new Error('Add at least one URL.');
			if (tabs.length > 3_000) throw new Error('A batch can contain at most 3,000 tabs.');
			const payload = JSON.stringify({
				name: importName.trim() || `Capture ${new Date().toLocaleDateString()}`,
				tabs
			});
			if (new TextEncoder().encode(payload).length > 2_000_000)
				throw new Error('The batch must be 2 MB or smaller.');
			const result = await api<{ batch: Batch }>('/tools/tabs/api/batches', {
				method: 'POST',
				body: payload
			});
			batchListFailed = false;
			// A failed refresh must not make a successful import look unsuccessful.
			try {
				const list = await api<{ batches: Batch[] }>('/tools/tabs/api/batches');
				batches = list.batches;
			} catch {
				batches = [result.batch, ...batches];
			}
			importText = '';
			importName = '';
			importFile = null;
			if (fileInput) fileInput.value = '';
			await switchBatch(result.batch.id);
			message = 'New batch saved.';
		} catch (caught) {
			error = `Could not import: ${errorText(caught)}`;
		} finally {
			importing = false;
		}
	}

	beforeNavigate(({ cancel }) => {
		if (
			note !== savedNote ||
			noteSaving ||
			feedPending.size ||
			topicSaving ||
			(topicEditId && topicDraft.trim() !== topicExpected)
		) {
			cancel();
			if (topicSaving || (topicEditId && topicDraft.trim() !== topicExpected))
				topicError = 'Save or cancel your topic edit before leaving this page.';
			else if (feedPending.size) error = 'Wait for your decisions to finish saving before leaving.';
			else noteError = 'Save your note before leaving this page.';
			void saveNote();
		}
	});

	function beforeUnload(event: BeforeUnloadEvent) {
		if (
			note !== savedNote ||
			noteSaving ||
			feedPending.size ||
			topicSaving ||
			(topicEditId && topicDraft.trim() !== topicExpected)
		) {
			event.preventDefault();
			event.returnValue = '';
		}
	}

	onMount(() => {
		const desktop = window.matchMedia('(min-width: 761px)');
		filtersOpen = desktop.matches;
		function handleViewportChange(event: MediaQueryListEvent) {
			resetScrollIntent();
			filtersOpen = event.matches;
		}
		desktop.addEventListener('change', handleViewportChange);
		try {
			const savedMode = localStorage.getItem('tab-library-mode');
			if (savedMode === 'tap' || savedMode === 'scroll' || savedMode === 'swipe') mode = savedMode;
		} catch {
			// A stored preference is optional.
		}
		void (async () => {
			try {
				const result = await api<{ batches: Batch[] }>('/tools/tabs/api/batches');
				batches = result.batches;
				const requested = new URLSearchParams(location.search).get('batch');
				const initial = batches.find((batch) => batch.id === requested) || batches[0];
				if (initial) await switchBatch(initial.id);
				else loading = false;
			} catch (caught) {
				batchListFailed = true;
				error = `Could not load your batches: ${errorText(caught)}`;
				loading = false;
			}
		})();
		return () => {
			desktop.removeEventListener('change', handleViewportChange);
			clearTimeout(noteTimer);
			if (feedFrame) cancelAnimationFrame(feedFrame);
		};
	});
</script>

<svelte:head>
	<title>Tab Library · swyx tools</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>
<svelte:window
	on:resize={resetScrollIntent}
	on:beforeunload={beforeUnload}
	on:wheel|passive={wheelScroll}
	on:touchstart|passive={startTouchScroll}
	on:touchmove|passive={moveTouchScroll}
	on:keydown={keyboardScroll}
	on:scroll={onScroll}
/>

<div class="library-shell">
	<aside class="library-sidebar" aria-label="Library controls">
		<header class="library-header">
			<div class="header-links">
				<a class="back" href={resolve('/tools')}>← Your tools</a>
				<a class="account" href={resolve('/tools')}
					>{data.user.name || data.user.email || 'Account'} <span>↗</span></a
				>
			</div>
			<h1>Tab Library</h1>
			<p class="intro">Saved pages from your reading across the web.</p>
		</header>

		<div class="toolbar">
			<div class="picker-group batch-picker">
				<span class="picker-label" id="batch-label"
					>Batch {#if batches.length > 3}<span class="picker-hint" aria-hidden="true"
							>· scroll for more</span
						>{/if}</span
				>
				{#if batches.length}
					<div
						class="picker-options batch-options"
						class:has-many={batches.length > 3}
						bind:this={batchOptions}
						role="group"
						aria-labelledby="batch-label"
					>
						{#each batches as batch (batch.id)}
							<button
								type="button"
								aria-pressed={batchId === batch.id}
								disabled={busy || loading || feedPending.size > 0 || !!topicEditId}
								on:click={() => void switchBatch(batch.id)}
								><span>{batch.name}</span>{#if batch.count != null}<span class="picker-count"
										>{batch.count}</span
									>{/if}</button
							>
						{/each}
					</div>
				{:else}
					<p class="picker-empty">
						{loading
							? 'Loading batches…'
							: batchListFailed
								? 'Batches unavailable'
								: 'No batches yet'}
					</p>
				{/if}
			</div>
			<details class="filters" bind:open={filtersOpen}>
				<summary>
					Filters <span class="filter-selection"
						>· {statuses.find((status) => status.value === statusFilter)?.label}{topic
							? ` · ${topic}`
							: ''}</span
					>
					<span aria-hidden="true">{filtersOpen ? '−' : '+'}</span>
				</summary>
				<div class="filter-fields">
					<label
						>Find a page<input
							type="search"
							placeholder="Search titles, URLs, topics"
							disabled={feedPending.size > 0 || note !== savedNote || noteSaving || !!topicEditId}
							bind:value={query}
						/></label
					>
					<div class="picker-group">
						<span class="picker-label" id="topic-label">Topic</span>
						<div class="picker-options" role="group" aria-labelledby="topic-label">
							<button
								type="button"
								aria-pressed={!topic}
								disabled={feedPending.size > 0 || note !== savedNote || noteSaving || !!topicEditId}
								on:click={() => (topic = '')}>All topics</button
							>
							{#each topicOptions as name (name)}
								<button
									type="button"
									aria-pressed={topic === name}
									disabled={feedPending.size > 0 ||
										note !== savedNote ||
										noteSaving ||
										!!topicEditId}
									on:click={() => (topic = name)}>{name}</button
								>
							{/each}
						</div>
					</div>
					<div class="picker-group">
						<span class="picker-label" id="status-label">Status</span>
						<div class="picker-options" role="group" aria-labelledby="status-label">
							{#each statuses as status (status.value)}
								<button
									type="button"
									aria-pressed={statusFilter === status.value}
									disabled={feedPending.size > 0 ||
										note !== savedNote ||
										noteSaving ||
										!!topicEditId}
									on:click={() => (statusFilter = status.value)}>{status.label}</button
								>
							{/each}
						</div>
					</div>
					{#if windows.length}
						<div class="picker-group">
							<span class="picker-label" id="window-label"
								>Captured window {#if windows.length >= 8}<span
										class="picker-hint"
										aria-hidden="true">· scroll for more</span
									>{/if}</span
							>
							<div
								class="picker-options window-options"
								role="group"
								aria-labelledby="window-label"
							>
								<button
									type="button"
									aria-pressed={windowFilter === 'all'}
									disabled={feedPending.size > 0 ||
										note !== savedNote ||
										noteSaving ||
										!!topicEditId}
									on:click={() => (windowFilter = 'all')}>All windows</button
								>
								{#each windows as windowId, index (windowId)}
									<button
										type="button"
										aria-pressed={windowFilter === windowId}
										disabled={feedPending.size > 0 ||
											note !== savedNote ||
											noteSaving ||
											!!topicEditId}
										on:click={() => (windowFilter = windowId)}>Window {index + 1}</button
									>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</details>
		</div>

		<details class="import-panel">
			<summary>＋ Add a batch</summary>
			<div class="import-body">
				<p>
					Paste URLs, one per line, or import a Chrome capture JSON file. Each import becomes a
					separate batch.
				</p>
				<p>
					<a
						href="https://github.com/swyxio/chrometaboverflow/tree/main/extension"
						target="_blank"
						rel="noopener noreferrer">Set up the Chrome exporter ↗</a
					> to download a snapshot. It never closes tabs.
				</p>
				<label
					>Batch name <input
						type="text"
						maxlength="120"
						placeholder="e.g. October reading"
						bind:value={importName}
					/></label
				>
				<label
					>URLs or capture JSON <textarea
						rows="4"
						placeholder="https://example.com/article"
						bind:value={importText}
					></textarea></label
				>
				<label
					>Or choose a JSON file <input
						bind:this={fileInput}
						type="file"
						accept="application/json,.json"
						on:change={(event) => (importFile = event.currentTarget.files?.[0] || null)}
					/></label
				>
				<p class="hint">
					A file takes precedence over pasted text. This saves the batch; it does not close browser
					tabs.
				</p>
				<button
					class="primary"
					disabled={importing || busy || feedPending.size > 0 || !!topicEditId}
					on:click={importBatch}>{importing ? 'Saving…' : 'Save new batch'}</button
				>
			</div>
		</details>
	</aside>

	<section class="library-main" aria-label="Review pages">
		{#if error}<div class="alert" role="alert">
				{error} <button aria-label="Dismiss error" on:click={() => (error = '')}>×</button>
			</div>{/if}
		{#if message && mode === 'swipe'}<div class="notice" role="status">
				{message}{#if undo}<button disabled={busy || !!topicEditId} on:click={undoDecision}
						>Undo</button
					>{/if}
			</div>{/if}

		{#if loading}<div class="empty">
				<span class="empty-icon">◌</span>
				<h2>Loading your library…</h2>
			</div>
		{:else if !batches.length && batchListFailed}<div class="empty">
				<span class="empty-icon">!</span>
				<h2>Library unavailable.</h2>
				<p>Refresh the page to try loading your batches again.</p>
			</div>
		{:else if !batches.length}<div class="empty">
				<span class="empty-icon">✳</span>
				<h2>Room to think.</h2>
				<p>Add a batch to start your reading pile.</p>
			</div>
		{:else}
			<div class="feed-controls">
				<div class="mode-bar">
					<div class="mode-switch" role="group" aria-label="Review mode">
						{#each ['tap', 'scroll', 'swipe'] as option (option)}
							<button
								type="button"
								aria-pressed={mode === option}
								disabled={busy || feedPending.size > 0 || !!topicEditId}
								on:click={() => void setMode(option as typeof mode)}
								>{option.charAt(0).toUpperCase() + option.slice(1)}</button
							>
						{/each}
					</div>
					<p>
						{mode === 'scroll'
							? 'The highlighted page is current. Scroll past it to archive; undo to bring it back.'
							: mode === 'tap'
								? 'Browse your feed and bookmark pages to follow up.'
								: 'Swipe left to archive, right to follow up.'}
					</p>
				</div>
				<div class="queue-head">
					<div>
						<span class="eyebrow">YOUR QUEUE</span>
						<p>
							<strong>{mode === 'swipe' ? filtered.length : feedItems.length}</strong>
							{(mode === 'swipe' ? filtered.length : feedItems.length) === 1 ? 'page' : 'pages'} in this
							view
							<span>·</span>
							{unreadCount} unread in batch
						</p>
					</div>
					{#if mode === 'swipe'}<span class="swipe-hint">← Archive &nbsp; · &nbsp; Follow up →</span
						>{/if}
				</div>
			</div>
			{#if mode !== 'swipe'}
				<div class="feed" aria-label="Pages in this view">
					{#each renderedFeed as item (item.id)}
						<article
							class="feed-item"
							class:expanded={expandedId === item.id}
							class:current={mode === 'scroll' && activeFeedId === item.id}
							aria-current={mode === 'scroll' && activeFeedId === item.id ? 'true' : undefined}
							data-feed-item={item.id}
						>
							<span class="feed-source-mark" aria-hidden="true"
								>{(item.domain || 'S').slice(0, 1).toUpperCase()}</span
							>
							<div class="feed-entry">
								<div class="feed-meta">
									<span>{item.domain || 'Saved page'} · {item.group || 'Reading pile'}</span><span
										>{feedPending.has(item.id)
											? 'Saving…'
											: item.status === 'followup'
												? 'Follow up'
												: item.status === 'archived'
													? 'Archived'
													: item.status === 'read'
														? 'Read'
														: mode === 'scroll' && activeFeedId === item.id
															? 'Current'
															: 'Unread'}</span
									>
								</div>
								<button
									class="feed-title"
									type="button"
									on:click={() => void showFeedItem(item.id)}
									disabled={busy}>{item.title || item.url}</button
								>
								<p class="feed-url">{item.url}</p>
								{#if item.summary && expandedId !== item.id}<p class="feed-excerpt">
										{item.summary}
									</p>{/if}
								{#if expandedId === item.id && selectedId === item.id}
									<section class="feed-content" aria-label="Saved content">
										{#if itemLoading}<p class="card-loading">Loading saved content…</p>
										{:else}
											{#if currentSummary}<div class="summary">
													<h3>{summaryPreview ? 'Summary preview' : 'Summary'}</h3>
													<p class="provenance">{sourceLabel()}</p>
													<p class="summary-text">{currentSummary}</p>
												</div>
											{:else}<div class="no-summary">
													{itemUnavailable
														? 'Saved content could not be loaded. Please try again.'
														: page.text
															? 'Saved page text is available below.'
															: 'Title and URL saved. No page text or summary is available.'}
												</div>{/if}
											{#if page.sourceNote || page.sourceTruncated}<p class="provenance">
													{page.sourceNote || ''}{page.sourceTruncated
														? ' · Saved page text was truncated.'
														: ''}
												</p>{/if}
											{#if page.text}<details class="page-text">
													<summary>Read saved page text</summary>
													<div>{page.text}</div>
												</details>{/if}
											<label class="note-label" for="feed-note-{item.id}"
												>Your note <span
													>{noteSaving
														? 'Saving…'
														: note !== savedNote
															? 'Unsaved'
															: note
																? 'Saved'
																: 'Optional'}</span
												></label
											>
											<textarea
												id="feed-note-{item.id}"
												maxlength="10000"
												rows="3"
												placeholder="What do you want to remember?"
												disabled={busy || !!topicEditId}
												bind:value={note}
												on:input={scheduleNote}
											></textarea>
											{#if noteError}<div class="note-error" role="alert">
													{noteError} <button on:click={() => void saveNote()}>Retry save</button>
													<button
														on:click={() => {
															note = savedNote;
															noteError = '';
														}}>Discard unsaved edit</button
													>
												</div>{/if}
										{/if}
										{#if safeLink(item.url)}
											<div class="preview-actions">
												{#if previewId !== item.id}<button
														type="button"
														on:click={() => {
															resetScrollIntent();
															previewId = item.id;
														}}>Preview original</button
													>{:else}<button
														type="button"
														on:click={() => {
															resetScrollIntent();
															previewId = '';
														}}>Close preview</button
													>{/if}
												<a
													href={safeLink(item.url) || undefined}
													target="_blank"
													rel="external noopener noreferrer">Open original ↗</a
												>
											</div>
											{#if previewId === item.id}<p class="hint">
													Some sites block previews. Use Open original if this page does not load.
												</p>
												<iframe
													title="Original page preview"
													src={safeLink(item.url) || undefined}
													sandbox="allow-scripts"
													referrerpolicy="no-referrer"
												></iframe>{/if}
										{/if}
									</section>
								{/if}
								<div class="feed-actions">
									<button
										type="button"
										disabled={busy || feedPending.has(item.id) || !!topicEditId}
										on:click={() => {
											resetScrollIntent();
											queueFeedDecision(
												item.id,
												item.status === 'followup' ? 'unread' : 'followup'
											);
										}}
										aria-label={item.status === 'followup'
											? 'Remove bookmark'
											: 'Bookmark for follow-up'}
										aria-pressed={item.status === 'followup'}
										>{item.status === 'followup' ? '★ Bookmarked' : '☆ Bookmark'}</button
									>
									<button
										type="button"
										disabled={busy || feedPending.has(item.id) || !!topicEditId}
										on:click={() => {
											resetScrollIntent();
											queueFeedDecision(
												item.id,
												item.status === 'archived' ? 'unread' : 'archived'
											);
										}}>{item.status === 'archived' ? 'Return to unread' : 'Archive'}</button
									>
									<button
										type="button"
										disabled={busy || feedPending.size > 0 || !!topicEditId}
										aria-label={`Edit topic for ${item.title || item.url}`}
										on:click={() => startTopicEdit(item)}>Edit topic</button
									>
								</div>
								{#if topicEditId === item.id}
									<form class="topic-editor" on:submit|preventDefault={() => void saveTopic()}>
										<label for="topic-edit-{item.id}">Topic</label>
										<input
											id="topic-edit-{item.id}"
											bind:value={topicDraft}
											maxlength="100"
											disabled={topicSaving}
											on:input={() => (topicError = '')}
										/>
										<span class="topic-editor-hint"
											>Choose an existing topic or type a new one.</span
										>
										{#if item.tabGroups?.length || item.capturedWindowIds?.length}
											<p class="topic-editor-hint topic-context">
												{#if item.tabGroups?.length}Chrome groups: {item.tabGroups.join(', ')}{/if}
												{#if item.tabGroups?.length && item.capturedWindowIds?.length}
													·
												{/if}
												{#if item.capturedWindowIds?.length}Captured in {item.capturedWindowIds
														.map((id) => `Window ${windows.indexOf(id) + 1}`)
														.join(', ')}{/if}
											</p>
										{/if}
										<div class="picker-options" role="group" aria-label="Existing topics">
											{#each topics as name (name)}
												<button
													type="button"
													disabled={topicSaving}
													aria-pressed={topicDraft.trim() === name}
													on:click={() => {
														topicDraft = name;
														topicError = '';
													}}>{name}</button
												>
											{/each}
										</div>
										{#if topicError}<p class="topic-error" role="alert">{topicError}</p>{/if}
										<div class="topic-editor-actions">
											<button class="primary" type="submit" disabled={topicSaving}
												>{topicSaving ? 'Saving…' : 'Save topic'}</button
											>
											<button type="button" disabled={topicSaving} on:click={finishTopicEdit}
												>Cancel</button
											>
										</div>
									</form>
								{/if}
							</div>
						</article>
					{/each}
					{#if renderedFeed.length < feedItems.length}
						<div class="feed-more" use:loadMoreWhenVisible>
							<button type="button" on:click={() => (feedLimit += 40)}>Show more pages</button>
						</div>
					{/if}
					{#if !feedItems.length}<div class="empty">
							<span class="empty-icon">✓</span>
							<h2>Nothing in this view.</h2>
							<p>Try another topic or status, or add a batch.</p>
						</div>{/if}
				</div>
				{#if error || message || feedPending.size}<div class="feed-feedback" role="status">
						<span
							>{error ||
								(feedPending.size
									? `Saving ${feedPending.size} ${feedPending.size === 1 ? 'decision' : 'decisions'}…`
									: message)}</span
						>{#if undo}<button
								disabled={busy || feedPending.size > 0 || !!topicEditId}
								on:click={undoDecision}
								>Undo{undoHistory.length > 1 ? ` (${undoHistory.length})` : ''}</button
							>{:else if !feedPending.size}<button
								on:click={() => {
									error = '';
									message = '';
								}}>Dismiss</button
							>{/if}
					</div>{/if}
			{:else}
				<div class="review-layout">
					<aside class="queue" aria-label="Pages in this view">
						{#each filtered as item (item.id)}<button
								class:active={item.id === selectedId}
								on:click={() => openItem(item.id)}
								disabled={busy || !!topicEditId}
								><span>{item.domain || 'Saved page'} · {item.group || 'Reading pile'}</span><strong
									>{item.title || item.url}</strong
								><span class="queue-url">{item.url}</span><small
									>{item.status === 'followup'
										? 'Follow up'
										: item.status === 'read'
											? 'Read'
											: item.status === 'archived'
												? 'Archived'
												: 'Unread'}</small
								></button
							>{/each}
						{#if !filtered.length}<p class="queue-empty">No pages match these filters.</p>{/if}
					</aside>
					{#if selected}
						<!-- Pointer swipes are optional: equivalent labelled buttons are below. -->
						<article
							class="card"
							on:pointerdown={swipeStart}
							on:pointerup={swipeEnd}
							on:pointercancel={() => (touchStart = null)}
						>
							<div class="card-top">
								<span class="topic-pill">{selected.group || 'Reading pile'}</span><span
									>{selected.status === 'followup'
										? 'Follow up'
										: selected.status === 'read'
											? 'Read'
											: selected.status === 'archived'
												? 'Archived'
												: 'Unread'}</span
								>
							</div>
							{#if topicEditId !== selected.id}
								<button
									class="edit-topic"
									type="button"
									disabled={busy || feedPending.size > 0 || !!topicEditId}
									aria-label={`Edit topic for ${selected.title || selected.url}`}
									on:click={() => startTopicEdit(selected)}>Edit topic</button
								>
							{:else}
								<form class="topic-editor" on:submit|preventDefault={() => void saveTopic()}>
									<label for="topic-edit-{selected.id}">Topic</label>
									<input
										id="topic-edit-{selected.id}"
										bind:value={topicDraft}
										maxlength="100"
										disabled={topicSaving}
										on:input={() => (topicError = '')}
									/>
									<span class="topic-editor-hint">Choose an existing topic or type a new one.</span>
									<div class="picker-options" role="group" aria-label="Existing topics">
										{#each topics as name (name)}
											<button
												type="button"
												disabled={topicSaving}
												aria-pressed={topicDraft.trim() === name}
												on:click={() => {
													topicDraft = name;
													topicError = '';
												}}>{name}</button
											>
										{/each}
									</div>
									{#if topicError}<p class="topic-error" role="alert">{topicError}</p>{/if}
									<div class="topic-editor-actions">
										<button class="primary" type="submit" disabled={topicSaving}
											>{topicSaving ? 'Saving…' : 'Save topic'}</button
										>
										<button type="button" disabled={topicSaving} on:click={finishTopicEdit}
											>Cancel</button
										>
									</div>
								</form>
							{/if}
							<p class="domain">
								{selected.domain || 'Saved page'}{selected.lastOpened
									? ` · ${formatDate(selected.lastOpened)}`
									: ''}
							</p>
							<h2>{selected.title || selected.url}</h2>
							{#if safeLink(selected.url)}<a
									class="source"
									href={safeLink(selected.url) || undefined}
									target="_blank"
									rel="external noopener noreferrer">Open original ↗</a
								>{:else}<p class="source">Non-web address saved</p>{/if}
							<p class="source-detail">{selected.url}</p>
							{#if safeLink(selected.url)}
								<div class="preview-actions">
									{#if previewId !== selected.id}
										<button type="button" on:click={() => (previewId = selectedId)}
											>Preview original</button
										>
									{:else}
										<button type="button" on:click={() => (previewId = '')}>Close preview</button>
									{/if}
								</div>
								{#if previewId === selected.id}
									<p class="hint">
										Some sites block previews. Use Open original if this page does not load.
									</p>
									<iframe
										class="original-preview"
										title="Original page preview"
										src={safeLink(selected.url) || undefined}
										sandbox="allow-scripts"
										referrerpolicy="no-referrer"
									></iframe>
								{/if}
							{/if}
							{#if !filtered.some((item) => item.id === selectedId)}
								<div class="filter-alert">
									This page is outside the current filters.
									{#if filtered.length}<button
											disabled={busy}
											on:click={() => openItem(filtered[0].id)}>Review first matching page →</button
										>{/if}
								</div>
							{/if}
							{#if selected.tabGroups?.length}<p class="hint">
									Chrome groups: {selected.tabGroups.join(', ')}
								</p>{/if}
							{#if selected.capturedWindowIds?.length}<p class="hint">
									Captured in {selected.capturedWindowIds
										.map((id) => `Window ${windows.indexOf(id) + 1}`)
										.join(', ')}
								</p>{/if}
							{#if selected.duplicateCount && selected.duplicateCount > 1}<p class="hint">
									{selected.duplicateCount} copies captured in this batch
								</p>{/if}
							{#if itemLoading}<p class="card-loading">Loading saved content…</p>
							{:else}
								{#if currentSummary}<section class="summary">
										<h3>{summaryPreview ? 'Summary preview' : 'Summary'}</h3>
										<p class="provenance">{sourceLabel()}</p>
										<p class="summary-text">{currentSummary}</p>
									</section>
								{:else}<div class="no-summary">
										{itemUnavailable
											? 'Saved content could not be loaded. Please try again.'
											: page.text
												? 'Saved page text is available below.'
												: 'Title and URL saved. No page text or summary is available.'}
									</div>{/if}
								{#if page.sourceNote || page.sourceTruncated}<p class="provenance">
										{page.sourceNote || ''}{page.sourceTruncated
											? ' · Saved page text was truncated.'
											: ''}
									</p>{/if}
								{#if page.text}<details class="page-text">
										<summary>Read saved page text</summary>
										<div>{page.text}</div>
									</details>{/if}
								<label class="note-label" for="note"
									>Your note <span
										>{noteSaving
											? 'Saving…'
											: note !== savedNote
												? 'Unsaved'
												: note
													? 'Saved'
													: 'Optional'}</span
									></label
								>
								<textarea
									id="note"
									maxlength="10000"
									rows="3"
									placeholder="What do you want to remember?"
									disabled={busy || !!topicEditId}
									bind:value={note}
									on:input={scheduleNote}
								></textarea>
								{#if noteError}<div class="note-error" role="alert">
										{noteError} <button on:click={() => void saveNote()}>Retry save</button>
										<button
											on:click={() => {
												note = savedNote;
												noteError = '';
											}}>Discard unsaved edit</button
										>
									</div>{/if}
							{/if}
							<div class="decisions">
								<button
									class="decision read"
									disabled={busy || itemLoading || !!topicEditId}
									on:click={() => chooseStatus('archived')}><span>←</span> Archive</button
								><button
									class="decision follow"
									disabled={busy || itemLoading || !!topicEditId}
									on:click={() => chooseStatus('followup')}>Follow up <span>→</span></button
								>
							</div>
							{#if selected.status !== 'unread'}<button
									class="return-unread"
									disabled={busy || itemLoading || !!topicEditId}
									on:click={() => chooseStatus('unread')}>Return to unread</button
								>{/if}
						</article>
					{:else}<div class="empty card">
							<span class="empty-icon">✓</span>
							<h2>{filtered.length ? 'Pick a page.' : 'Nothing in this view.'}</h2>
							<p>
								{filtered.length
									? 'Choose a page from the list to continue.'
									: 'Try another topic or status, or add a batch.'}
							</p>
							{#if filtered.length}<button class="primary" on:click={() => openItem(filtered[0].id)}
									>Start reviewing</button
								>{/if}
						</div>{/if}
				</div>
			{/if}
		{/if}
	</section>
</div>

<style>
	.library-shell {
		--ink: var(--page-text);
		--muted: var(--page-muted);
		--line: var(--page-border);
		--accent: var(--page-accent);
		display: grid;
		grid-template-columns: 16.5rem minmax(0, 1fr);
		width: min(calc(100% - 2 * var(--site-gutter)), 1160px);
		min-height: 68vh;
		margin: 0 auto;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--page-surface);
		color: var(--ink);
		font-family: var(--font-body);
	}
	.library-sidebar {
		min-width: 0;
		padding: 1.25rem;
		border-right: 1px solid var(--line);
		background: var(--page-bg);
		border-radius: 12px 0 0 12px;
	}
	.library-main {
		min-width: 0;
		padding: 1.5rem 1.75rem 2rem;
	}
	.header-links {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.85rem;
	}
	.back,
	.account {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 700;
		text-decoration: none;
	}
	.back {
		white-space: nowrap;
	}
	.account {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.library-header h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 600;
		letter-spacing: -0.035em;
		line-height: 1.05;
	}
	.intro {
		margin: 0.45rem 0 1.25rem;
		color: var(--muted);
		font-size: 0.9rem;
		line-height: 1.4;
	}
	.toolbar,
	.filter-fields {
		display: grid;
		gap: 0.8rem;
	}
	.picker-group {
		display: grid;
		gap: 0.3rem;
		min-width: 0;
	}
	.picker-label {
		color: var(--ink);
		font-size: 0.83rem;
		font-weight: 700;
	}
	.picker-hint {
		color: var(--muted);
		font-weight: 400;
	}
	.picker-empty {
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.picker-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		min-width: 0;
	}
	.picker-options button {
		min-height: 44px;
		max-width: 100%;
		padding: 0.45rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--page-surface);
		color: var(--ink);
		font: 600 0.85rem/1.25 var(--font-body);
		text-align: left;
		overflow-wrap: anywhere;
		cursor: pointer;
	}
	.picker-options button[aria-pressed='true'] {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--page-surface);
	}
	.batch-options {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-auto-rows: max-content;
	}
	.batch-options.has-many,
	.window-options {
		max-height: 13rem;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.batch-options button {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}
	.picker-count {
		font-size: 0.78rem;
		opacity: 0.75;
		white-space: nowrap;
	}
	.toolbar label,
	.import-body label {
		display: grid;
		gap: 0.3rem;
		color: var(--ink);
		font-size: 0.83rem;
		font-weight: 700;
	}
	.filters {
		margin: 0;
		padding: 0;
		border: 0;
	}
	.filters > summary {
		display: none;
	}
	.toolbar input,
	.import-body input,
	.import-body textarea,
	.feed-content textarea,
	.card textarea {
		width: 100%;
		min-width: 0;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--page-surface);
		color: var(--ink);
		font: 400 1rem/1.4 var(--font-body);
	}
	.toolbar input,
	.import-body input {
		min-height: 44px;
		padding: 0.55rem 0.65rem;
	}
	.import-body textarea,
	.feed-content textarea,
	.card textarea {
		min-height: 84px;
		padding: 0.7rem;
		resize: vertical;
	}
	button:focus-visible,
	input:focus-visible,
	textarea:focus-visible,
	summary:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.import-panel {
		margin: 1rem 0 0;
		padding: 0;
		border: 0;
	}
	.import-panel > summary {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--accent);
		border-radius: 7px;
		background: var(--accent);
		color: var(--page-surface);
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		list-style: none;
	}
	.import-panel > summary::-webkit-details-marker,
	.filters > summary::-webkit-details-marker {
		display: none;
	}
	.import-body {
		display: grid;
		gap: 0.8rem;
		margin-top: 0.75rem;
		font-size: 0.88rem;
		line-height: 1.45;
	}
	.import-body p {
		margin: 0;
	}
	.hint {
		color: var(--muted);
		font-size: 0.85rem;
		line-height: 1.45;
	}
	.primary {
		justify-self: start;
		min-height: 44px;
		padding: 0.6rem 0.9rem;
		border: 0;
		border-radius: 7px;
		background: var(--accent);
		color: var(--page-surface);
		font-weight: 700;
		cursor: pointer;
	}
	.alert,
	.notice {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 0 1rem;
		padding: 0.75rem 1rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--page-accent-soft);
		color: var(--ink);
		font-size: 0.9rem;
	}
	.alert button,
	.notice button,
	.note-error button {
		min-height: 44px;
		padding: 0 0.3rem;
		border: 0;
		background: none;
		color: var(--accent);
		font-weight: 700;
		text-decoration: underline;
		cursor: pointer;
	}
	.feed-controls {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.5rem 1rem;
		align-items: center;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--line);
	}
	.mode-bar {
		display: contents;
	}
	.mode-switch {
		display: inline-flex;
		justify-self: start;
		padding: 0.2rem;
		border-radius: 8px;
		background: var(--page-section-bg);
	}
	.mode-switch button {
		min-width: 5rem;
		min-height: 44px;
		padding: 0.5rem 0.85rem;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--ink);
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
	}
	.mode-switch button[aria-pressed='true'] {
		background: var(--page-accent-soft);
		color: var(--accent);
	}
	.mode-bar p {
		grid-column: 1 / -1;
		grid-row: 2;
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
		line-height: 1.4;
	}
	.queue-head {
		grid-column: 2;
		grid-row: 1;
		text-align: right;
	}
	.queue-head p {
		margin: 0;
		color: var(--muted);
		font-size: 0.85rem;
	}
	.queue-head p strong {
		color: var(--ink);
	}
	.queue-head p span {
		padding: 0 0.2rem;
	}
	.queue-head .eyebrow {
		display: none;
	}
	.swipe-hint {
		color: var(--muted);
		font-size: 0.8rem;
	}
	.feed {
		min-width: 0;
	}
	.feed-item {
		display: grid;
		grid-template-columns: 2rem minmax(0, 1fr);
		gap: 0.8rem;
		min-width: 0;
		padding: 1rem 0;
		border-bottom: 1px solid var(--line);
	}
	.feed-item.expanded {
		margin-inline: -0.65rem;
		padding-inline: 0.65rem;
		border-radius: 8px;
		background: var(--page-row-hover);
	}
	.feed-item.current {
		border-radius: 2px;
		background: var(--page-accent-soft);
		outline: 6px solid var(--page-accent-soft);
	}
	.feed-source-mark {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 5px;
		background: var(--accent);
		color: var(--page-surface);
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 600;
	}
	.feed-entry {
		min-width: 0;
	}
	.feed-meta {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		color: var(--muted);
		font-size: 0.83rem;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}
	.feed-meta span:last-child {
		flex: none;
		color: var(--accent);
		font-weight: 600;
	}
	.feed-title {
		display: block;
		width: 100%;
		min-height: 44px;
		padding: 0.1rem 0;
		border: 0;
		background: none;
		color: var(--ink);
		font: 600 clamp(1.25rem, 2vw, 1.5rem)/1.17 var(--font-display);
		letter-spacing: -0.02em;
		text-align: left;
		overflow-wrap: anywhere;
		cursor: pointer;
	}
	.feed-title:hover {
		color: var(--accent);
	}
	.feed-url {
		margin: 0.2rem 0 0.3rem;
		color: var(--muted);
		font-size: 0.8rem;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}
	.feed-excerpt {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
		margin: 0.15rem 0 0;
		color: var(--muted);
		font-size: 1rem;
		line-height: 1.45;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.feed-actions,
	.preview-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.55rem;
	}
	.feed-actions button,
	.preview-actions button,
	.preview-actions a,
	.feed-more button,
	.feed-feedback button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0.55rem 0.8rem;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--page-surface);
		color: var(--ink);
		font-size: 0.9rem;
		font-weight: 650;
		text-decoration: none;
		cursor: pointer;
	}
	.feed-actions button {
		padding-inline: 0.5rem;
		border-color: transparent;
		background: transparent;
	}
	.feed-actions button[aria-pressed='true'] {
		background: var(--accent);
		color: var(--page-surface);
	}
	.feed-actions button:hover,
	.preview-actions button:hover,
	.preview-actions a:hover {
		border-color: var(--accent);
	}
	.feed-content {
		margin-top: 0.8rem;
		padding-top: 0.8rem;
		border-top: 1px solid var(--line);
	}
	.feed-content iframe,
	.original-preview {
		width: 100%;
		height: min(65dvh, 650px);
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--page-surface);
	}
	.feed-more {
		padding: 1rem 0;
		text-align: center;
	}
	.feed-feedback {
		position: fixed;
		left: 50%;
		bottom: max(0.75rem, env(safe-area-inset-bottom));
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: min(34rem, calc(100% - 2rem));
		transform: translateX(-50%);
		padding: 0.55rem 0.8rem;
		border-radius: 8px;
		background: var(--ink);
		color: var(--page-surface);
		box-shadow: 0 4px 18px #0003;
		font-size: 0.9rem;
	}
	.review-layout {
		display: grid;
		grid-template-columns: minmax(180px, 230px) minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
		margin-top: 1rem;
	}
	.queue {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
		max-height: 75vh;
		overflow: auto;
	}
	.queue button {
		display: grid;
		gap: 0.25rem;
		min-width: 0;
		min-height: 44px;
		padding: 0.75rem;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--page-surface);
		color: var(--ink);
		text-align: left;
		cursor: pointer;
	}
	.queue button.active {
		background: var(--page-accent-soft);
		border-color: var(--accent);
	}
	.queue button span,
	.queue button small {
		overflow: hidden;
		color: var(--muted);
		font-size: 0.78rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.queue button strong {
		font-size: 0.95rem;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
	.queue button .queue-url {
		overflow: visible;
		line-height: 1.35;
		text-overflow: clip;
		white-space: normal;
		overflow-wrap: anywhere;
	}
	.queue-empty {
		padding: 1rem;
		color: var(--muted);
	}
	.card {
		padding: clamp(1rem, 3vw, 1.75rem);
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--page-surface);
		touch-action: pan-y;
	}
	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		color: var(--muted);
		font-size: 0.83rem;
		font-weight: 700;
	}
	.topic-pill {
		color: var(--accent);
	}
	.edit-topic {
		min-height: 44px;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--accent);
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
	}
	.topic-editor {
		display: grid;
		gap: 0.45rem;
		margin: 0.65rem 0;
		padding: 0.8rem;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--page-bg);
	}
	.topic-editor label {
		font-size: 0.85rem;
		font-weight: 700;
	}
	.topic-editor input {
		width: 100%;
		min-width: 0;
		min-height: 44px;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--page-surface);
		color: var(--ink);
		font: 400 1rem/1.4 var(--font-body);
	}
	.topic-editor-hint {
		color: var(--muted);
		font-size: 0.8rem;
	}
	.topic-context {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.topic-error {
		margin: 0;
		color: var(--accent);
		font-size: 0.85rem;
	}
	.topic-editor-actions {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}
	.topic-editor-actions > button:not(.primary) {
		min-height: 44px;
		padding: 0.55rem 0.8rem;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--page-surface);
		color: var(--ink);
		font-weight: 700;
		cursor: pointer;
	}
	.domain {
		margin: 1rem 0 0.3rem;
		color: var(--muted);
		font-size: 0.85rem;
	}
	.card h2 {
		margin: 0.25rem 0 0.9rem;
		font-family: var(--font-display);
		font-size: clamp(1.75rem, 3vw, 2.4rem);
		font-weight: 600;
		line-height: 1.1;
		letter-spacing: -0.035em;
		overflow-wrap: anywhere;
	}
	.source {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--accent);
		font-weight: 700;
	}
	.source-detail {
		margin-top: 0.35rem;
		color: var(--muted);
		font-size: 0.8rem;
		overflow-wrap: anywhere;
	}
	.filter-alert {
		margin-top: 1rem;
		padding: 0.8rem;
		border-radius: 7px;
		background: var(--page-accent-soft);
		font-size: 0.9rem;
	}
	.filter-alert button {
		display: block;
		min-height: 44px;
		border: 0;
		background: none;
		color: var(--accent);
		font-weight: 700;
		text-decoration: underline;
		cursor: pointer;
	}
	.summary {
		margin: 0.8rem 0;
	}
	.summary h3 {
		margin: 0 0 0.3rem;
		font-size: 0.9rem;
		font-weight: 700;
	}
	.provenance {
		margin: 0.3rem 0 0.7rem;
		color: var(--muted);
		font-size: 0.8rem;
	}
	.summary-text {
		margin: 0;
		font-size: 1rem;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.no-summary {
		margin: 1rem 0;
		color: var(--muted);
		font-size: 0.95rem;
	}
	.page-text {
		margin: 1rem 0;
		padding: 0.6rem 0;
		border: 0;
		border-block: 1px solid var(--line);
	}
	.page-text summary {
		min-height: 44px;
		padding-top: 0.55rem;
		color: var(--accent);
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
	}
	.page-text div {
		max-height: 400px;
		overflow: auto;
		padding: 0.5rem 0;
		font-size: 1rem;
		line-height: 1.55;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.note-label {
		display: flex;
		justify-content: space-between;
		margin: 1rem 0 0.4rem;
		font-size: 0.9rem;
		font-weight: 700;
	}
	.note-label span {
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 400;
	}
	.note-error {
		margin-top: 0.5rem;
		color: var(--accent);
		font-size: 0.85rem;
	}
	.card-loading {
		margin: 1rem 0;
		color: var(--muted);
	}
	.decisions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.7rem;
		margin-top: 1.35rem;
	}
	.decision {
		min-height: 44px;
		padding: 0.75rem;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: var(--page-surface);
		color: var(--ink);
		font-weight: 700;
		cursor: pointer;
	}
	.decision.follow {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--page-surface);
	}
	.decision span {
		padding: 0 0.2rem;
		font-size: 1.1rem;
	}
	.decision:hover:not(:disabled) {
		filter: brightness(0.95);
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.return-unread {
		display: block;
		min-height: 44px;
		margin: 0.4rem auto 0;
		border: 0;
		background: none;
		color: var(--accent);
		font-size: 0.85rem;
		text-decoration: underline;
		cursor: pointer;
	}
	.empty {
		padding: 4rem 1rem;
		color: var(--muted);
		text-align: center;
	}
	.empty h2 {
		color: var(--ink);
		font-family: var(--font-display);
		font-size: 1.6rem;
	}
	.empty p {
		font-size: 1rem;
	}
	.empty-icon {
		color: var(--accent);
		font-size: 2rem;
	}
	.empty .primary {
		margin: 1rem auto 0;
	}
	@media (max-width: 1020px) and (min-width: 761px) {
		.library-shell {
			grid-template-columns: 14rem minmax(0, 1fr);
		}
		.library-sidebar {
			padding: 1rem;
		}
		.library-main {
			padding-inline: 1.25rem;
		}
		.review-layout {
			display: flex;
			flex-direction: column-reverse;
		}
		.review-layout > * {
			width: 100%;
		}
		.queue {
			max-height: 240px;
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 760px) {
		.library-shell {
			display: block;
			border-radius: 10px;
		}
		.library-sidebar {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 0.35rem 0.75rem;
			padding: 0.85rem 1rem 0.45rem;
			border-right: 0;
			border-bottom: 1px solid var(--line);
			border-radius: 10px 10px 0 0;
		}
		.library-header {
			grid-column: 1 / -1;
		}
		.header-links {
			margin-bottom: 0.35rem;
		}
		.library-header h1 {
			font-size: 1.8rem;
		}
		.intro {
			display: none;
		}
		.toolbar {
			display: contents;
		}
		.batch-picker {
			grid-column: 1 / -1;
		}
		.batch-options {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.batch-options.has-many {
			max-height: 6.5rem;
		}
		.filters {
			grid-column: 1;
		}
		.filters > summary {
			display: flex;
			align-items: center;
			gap: 0.4rem;
			min-height: 44px;
			color: var(--accent);
			font-size: 0.9rem;
			font-weight: 700;
			cursor: pointer;
			list-style: none;
		}
		.filter-selection {
			overflow: hidden;
			color: var(--muted);
			font-weight: 400;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.filters[open] {
			grid-column: 1 / -1;
		}
		.filter-fields {
			grid-template-columns: 1fr;
			gap: 0.65rem;
			padding-bottom: 0.4rem;
		}
		.import-panel {
			grid-column: 2;
			align-self: start;
			margin: 0;
		}
		.import-panel[open] {
			grid-column: 1 / -1;
		}
		.import-panel > summary {
			padding: 0.4rem 0.65rem;
		}
		.library-main {
			padding: 0.9rem 1rem 1.5rem;
		}
		.feed-controls {
			grid-template-columns: 1fr;
			gap: 0.45rem;
			padding-bottom: 0.7rem;
		}
		.mode-switch {
			width: 100%;
		}
		.mode-switch button {
			flex: 1;
			min-width: 0;
		}
		.mode-bar p {
			grid-column: 1;
			grid-row: 2;
			font-size: 0.85rem;
		}
		.queue-head {
			grid-column: 1;
			grid-row: 3;
			text-align: left;
		}
		.queue-head p {
			font-size: 0.8rem;
		}
		.swipe-hint {
			display: none;
		}
		.feed-item {
			grid-template-columns: 1.75rem minmax(0, 1fr);
			gap: 0.65rem;
			padding: 0.8rem 0;
		}
		.feed-source-mark {
			width: 1.75rem;
			height: 1.75rem;
			font-size: 1rem;
		}
		.feed-title {
			font-size: 1.25rem;
		}
		.feed-excerpt {
			-webkit-line-clamp: 3;
			line-clamp: 3;
			font-size: 1rem;
		}
		.feed-actions {
			gap: 0.25rem;
		}
		.review-layout {
			display: flex;
			flex-direction: column-reverse;
		}
		.review-layout > * {
			width: 100%;
		}
		.queue {
			max-height: 240px;
			grid-template-columns: 1fr 1fr;
		}
		.card {
			padding: 1rem;
		}
	}
	@media (max-width: 400px) {
		.queue {
			grid-template-columns: 1fr;
		}
		.account {
			max-width: 48%;
		}
	}
</style>
