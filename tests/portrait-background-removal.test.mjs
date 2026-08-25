import assert from 'node:assert/strict';
import test from 'node:test';

/** @type {typeof Worker | undefined} */
const originalWorker = globalThis.Worker;

class FakeWorker extends EventTarget {
	static instances = [];

	/** @param {URL} url @param {WorkerOptions} options */
	constructor(url, options) {
		super();
		this.url = url;
		this.options = options;
		this.messages = [];
		this.terminated = false;
		FakeWorker.instances.push(this);
	}

	/** @param {unknown} message */
	postMessage(message) {
		this.messages.push(message);
	}

	terminate() {
		this.terminated = true;
	}

	/** @param {unknown} data */
	emit(data) {
		this.dispatchEvent(new MessageEvent('message', { data }));
	}
}

test.after(() => {
	if (originalWorker === undefined) {
		delete globalThis.Worker;
	} else {
		globalThis.Worker = originalWorker;
	}
});

test('portrait background removal uses a reusable lazy module worker and returns PNG blobs', async () => {
	FakeWorker.instances.length = 0;
	globalThis.Worker = /** @type {typeof Worker} */ (/** @type {unknown} */ (FakeWorker));
	const { removePortraitBackground } =
		await import('../src/lib/portrait-background-removal.js?success');
	assert.equal(FakeWorker.instances.length, 0);

	const input = new Blob(['portrait'], { type: 'image/jpeg' });
	const output = new Blob(['transparent portrait'], { type: 'image/png' });
	const updates = [];
	const pending = removePortraitBackground(input, {
		onProgress: (progress) => updates.push(progress)
	});

	assert.equal(FakeWorker.instances.length, 1);
	const worker = FakeWorker.instances[0];
	assert.equal(worker.options.type, 'module');
	assert.match(worker.url.pathname, /portrait-background-removal\.worker\.js$/);
	const request = worker.messages[0];
	assert.equal(request.image, input);

	worker.emit({
		id: request.id,
		type: 'progress',
		progress: { phase: 'download', percent: 40, message: 'Downloading' }
	});
	worker.emit({ id: request.id, type: 'result', image: output });
	assert.equal(await pending, output);
	assert.deepEqual(updates, [{ phase: 'download', percent: 40, message: 'Downloading' }]);

	const next = removePortraitBackground(input);
	assert.equal(FakeWorker.instances.length, 1);
	const nextRequest = worker.messages[1];
	worker.emit({ id: nextRequest.id, type: 'result', image: output });
	assert.equal(await next, output);
});

test('portrait background removal supports cancellation without uploading the source image', async () => {
	FakeWorker.instances.length = 0;
	globalThis.Worker = /** @type {typeof Worker} */ (/** @type {unknown} */ (FakeWorker));
	const { removePortraitBackground } =
		await import('../src/lib/portrait-background-removal.js?abort');
	const controller = new AbortController();
	const pending = removePortraitBackground(new Blob(['portrait']), { signal: controller.signal });
	const worker = FakeWorker.instances[0];
	const request = worker.messages[0];

	controller.abort();
	await assert.rejects(pending, { name: 'AbortError' });
	assert.deepEqual(worker.messages[1], { type: 'abort', id: request.id });

	await assert.rejects(
		removePortraitBackground(new Blob(['portrait']), { signal: controller.signal }),
		{
			name: 'AbortError'
		}
	);
});

test('portrait background removal reports worker failures and validates inputs', async () => {
	FakeWorker.instances.length = 0;
	globalThis.Worker = /** @type {typeof Worker} */ (/** @type {unknown} */ (FakeWorker));
	const { removePortraitBackground } =
		await import('../src/lib/portrait-background-removal.js?failure');

	await assert.rejects(removePortraitBackground(new Blob()), /selected image is empty/i);
	await assert.rejects(removePortraitBackground(/** @type {any} */ ('not an image')), /image Blob/);

	const pending = removePortraitBackground(new Blob(['portrait']));
	const worker = FakeWorker.instances[0];
	worker.emit({
		id: worker.messages[0].id,
		type: 'error',
		message: 'The portrait model could not be loaded.'
	});
	await assert.rejects(pending, /portrait model could not be loaded/i);
});
