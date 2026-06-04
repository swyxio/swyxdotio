<script>
	/** @typedef {{ slug: string, label: string, summary: string }} PodcastShow */
	/** @typedef {{ authenticated: boolean, defaultPublishDate: string, shows: PodcastShow[] }} PodcastStudioData */
	/** @typedef {{ loginError?: string } | null | undefined} PodcastStudioForm */
	/** @typedef {{ slug: string, episodeId: string, objectKey: string, uploadId: string, partBytes: number }} PodcastUploadStart */
	/** @typedef {{ title: string, mediaUrl: string }} PodcastUploadResult */

	/** @type {PodcastStudioData} */
	export let data;
	/** @type {PodcastStudioForm} */
	export let form;

	let slug = data.shows[0].slug;
	let title = '';
	let description = '';
	let publishedAt = data.defaultPublishDate;
	let duration = '';
	/** @type {File | null} */
	let mp3 = null;
	let status = '';
	let error = '';
	let password = '';
	let loginError = form?.loginError ?? '';
	let loggingIn = false;
	let uploading = false;
	/** @type {PodcastUploadResult | null} */
	let result = null;

	/**
	 * @param {unknown} body
	 * @returns {string}
	 */
	function apiErrorMessage(body) {
		if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
			return body.message;
		}
		return 'Podcast upload failed';
	}

	/**
	 * @template T
	 * @param {string} path
	 * @param {RequestInit} options
	 * @returns {Promise<T>}
	 */
	async function api(path, options) {
		const response = await fetch(`${location.pathname}/api/uploads${path}`, options);
		const text = await response.text();
		/** @type {unknown} */
		let body;
		try {
			body = JSON.parse(text);
		} catch {
			body = { message: text };
		}
		if (!response.ok) throw new Error(apiErrorMessage(body));
		return /** @type {T} */ (body);
	}

	/**
	 * @param {SubmitEvent} event
	 */
	async function login(event) {
		event.preventDefault();
		loginError = '';
		loggingIn = true;
		try {
			const response = await fetch('/tools/api/session', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});
			if (!response.ok) {
				loginError = response.status === 401 ? 'Incorrect password' : 'Could not unlock tools';
				return;
			}
			location.reload();
		} finally {
			loggingIn = false;
		}
	}

	async function logout() {
		await fetch('/tools/api/session', {
			method: 'DELETE',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' }
		});
		location.reload();
	}

	async function upload() {
		if (!mp3) return;
		uploading = true;
		error = '';
		result = null;
		/** @type {PodcastUploadStart | undefined} */
		let started;
		try {
			status = 'Starting multipart upload...';
			const currentUpload = /** @type {PodcastUploadStart} */ (
				await api('', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ slug, filename: mp3.name })
				})
			);
			started = currentUpload;
			/** @type {R2UploadedPart[]} */
			const parts = [];
			const count = Math.ceil(mp3.size / currentUpload.partBytes);
			for (let index = 0; index < count; index += 1) {
				status = `Uploading part ${index + 1} of ${count}...`;
				const params = new URLSearchParams({
					slug,
					episodeId: currentUpload.episodeId,
					objectKey: currentUpload.objectKey,
					uploadId: currentUpload.uploadId,
					partNumber: String(index + 1)
				});
				parts.push(
					await api(`/part?${params}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/octet-stream' },
						body: mp3.slice(index * currentUpload.partBytes, (index + 1) * currentUpload.partBytes)
					})
				);
			}
			status = 'Completing upload and updating feed...';
			result = await api('/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					slug,
					episodeId: currentUpload.episodeId,
					objectKey: currentUpload.objectKey,
					uploadId: currentUpload.uploadId,
					parts,
					title,
					description,
					publishedAt,
					duration,
					size: mp3.size
				})
			});
			status = 'Published.';
		} catch (uploadError) {
			if (started) {
				await api('/abort', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(started)
				}).catch(() => {});
			}
			error = uploadError instanceof Error ? uploadError.message : 'Podcast upload failed';
			status = '';
		} finally {
			uploading = false;
		}
	}
</script>

<svelte:head>
	<title>Podcast studio</title>
	<meta name="robots" content="noindex, nofollow, noarchive" />
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<section class="site-shell studio py-8">
	<p><a href="../">Personal tools</a> / Podcast studio</p>
	<h1>Podcast studio</h1>

	{#if !data.authenticated}
		<p class="plain-muted">Enter the tools password to continue.</p>
		<form on:submit={login}>
			<label>
				<span>Password</span>
				<input
					name="password"
					type="password"
					autocomplete="current-password"
					required
					bind:value={password}
				/>
			</label>
			{#if loginError}<p class="error">{loginError}</p>{/if}
			<button class="plain-button" type="submit" disabled={loggingIn}
				>{loggingIn ? 'Unlocking...' : 'Unlock tools'}</button
			>
		</form>
	{:else}
		<p class="plain-muted">
			Upload a new MP3 and prepend it to an existing R2-backed feed. Initial archive feeds must
			already be uploaded.
		</p>
		<form on:submit|preventDefault={upload}>
			<label>
				<span>Show</span>
				<select bind:value={slug} required>
					{#each data.shows as show}
						<option value={show.slug}>{show.label}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Episode title</span>
				<input bind:value={title} autocomplete="off" required maxlength="240" />
			</label>
			<label>
				<span>Description</span>
				<textarea bind:value={description} rows="7" required maxlength="8000"></textarea>
			</label>
			<div class="form-grid">
				<label>
					<span>Publish date</span>
					<input bind:value={publishedAt} type="date" required />
				</label>
				<label>
					<span>Duration <small>(optional)</small></span>
					<input bind:value={duration} placeholder="01:23:45" pattern="(?:\d+:)?[0-5]?\d:[0-5]\d" />
				</label>
			</div>
			<label>
				<span>MP3 file</span>
				<input
					type="file"
					accept=".mp3,audio/mpeg"
					required
					on:change={(event) => (mp3 = event.currentTarget.files?.[0] ?? null)}
				/>
			</label>
			{#if status}<p>{status}</p>{/if}
			{#if error}<p class="error">{error}</p>{/if}
			{#if result}
				<p class="success">
					Published <strong>{result.title}</strong>. <a href={result.mediaUrl}>Open MP3</a>.
				</p>
			{/if}
			<button class="plain-button" type="submit" disabled={uploading}
				>{uploading ? 'Uploading...' : 'Upload and publish'}</button
			>
		</form>
		<button class="logout" type="button" on:click={logout}>Lock tools</button>
	{/if}
</section>

<style>
	.studio {
		max-width: 42rem;
	}

	label span {
		color: var(--page-accent);
		font-weight: 700;
	}

	form {
		display: grid;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	label {
		display: grid;
		gap: 0.35rem;
	}

	input,
	select,
	textarea {
		width: 100%;
		border: 1px solid var(--page-border);
		background: var(--page-bg);
		color: var(--page-text);
		padding: 0.7rem;
	}

	textarea {
		resize: vertical;
	}

	.form-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	}

	.error {
		color: var(--page-accent);
	}

	.success {
		border-left: 3px solid var(--page-accent);
		padding-left: 0.75rem;
	}

	.logout {
		margin-top: 2rem;
		color: var(--page-link);
		text-decoration: underline;
	}
</style>
