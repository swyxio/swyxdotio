/**
 * Observe one page boundary. The next batch mounts a fresh boundary, so a
 * sentinel that remains visible can load again without duplicate requests.
 * @param {HTMLElement} node
 * @param {() => void} loadMore
 */
export function loadOnScroll(node, loadMore) {
	if (typeof IntersectionObserver === 'undefined') return;
	let active = true;
	const observer = new IntersectionObserver(
		(entries) => {
			if (!active || !entries.some((entry) => entry.isIntersecting)) return;
			active = false;
			observer.disconnect();
			loadMore();
		},
		{ rootMargin: '600px 0px' }
	);
	observer.observe(node);
	return {
		destroy() {
			active = false;
			observer.disconnect();
		}
	};
}
