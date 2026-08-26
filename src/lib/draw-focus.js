/** Opening a touch/narrow panel should not summon the keyboard or focus-zoom it. */
export function canAutofocusDrawingInput() {
	return !window.matchMedia('(pointer: coarse), (max-width: 650px)').matches;
}

/** @param {HTMLElement | undefined} container */
export function blurDrawingInput(container) {
	const active = document.activeElement;
	if (
		active instanceof HTMLElement &&
		container?.contains(active) &&
		active.matches('input, textarea, select')
	)
		active.blur();
}
