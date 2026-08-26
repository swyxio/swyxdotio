import assert from 'node:assert/strict';
import test from 'node:test';
import { loadOnScroll } from '../src/lib/load-on-scroll.js';

function setObserver(t, value) {
	const original = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
	Object.defineProperty(globalThis, 'IntersectionObserver', {
		configurable: true,
		writable: true,
		value
	});
	t.after(() => {
		if (original) Object.defineProperty(globalThis, 'IntersectionObserver', original);
		else delete globalThis.IntersectionObserver;
	});
}

function observerHarness(t) {
	const observers = [];
	setObserver(
		t,
		class {
			constructor(callback, options) {
				this.callback = callback;
				this.options = options;
				this.disconnected = false;
				observers.push(this);
			}
			observe(node) {
				this.node = node;
			}
			disconnect() {
				this.disconnected = true;
			}
			intersect(isIntersecting) {
				this.callback([{ isIntersecting }]);
			}
		}
	);
	return observers;
}

test('a visible boundary loads once, before the reader reaches the end', (t) => {
	const observers = observerHarness(t);
	const node = {};
	let loads = 0;
	const action = loadOnScroll(node, () => loads++);
	const observer = observers[0];
	assert.equal(observer.node, node);
	assert.equal(observer.options.rootMargin, '600px 0px');
	observer.intersect(false);
	assert.equal(loads, 0);
	observer.intersect(true);
	observer.intersect(true);
	assert.equal(loads, 1);
	assert.equal(observer.disconnected, true);
	action.destroy();
});

test('the next batch can load while its replacement boundary is still visible', (t) => {
	const observers = observerHarness(t);
	let loads = 0;
	const first = loadOnScroll({}, () => loads++);
	observers[0].intersect(true);
	first.destroy();
	const next = loadOnScroll({}, () => loads++);
	observers[1].intersect(true);
	assert.equal(loads, 2);
	next.destroy();
});

test('changing filters or leaving the page cancels stale observations', (t) => {
	const observers = observerHarness(t);
	let loads = 0;
	const action = loadOnScroll({}, () => loads++);
	action.destroy();
	observers[0].intersect(true);
	assert.equal(loads, 0);
	assert.equal(observers[0].disconnected, true);
});

test('manual loading stays available without an intersection observer', (t) => {
	setObserver(t, undefined);
	assert.equal(
		loadOnScroll({}, () => assert.fail('should not auto-load')),
		undefined
	);
});
