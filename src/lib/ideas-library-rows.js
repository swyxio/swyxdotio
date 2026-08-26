/**
 * Year headings belong to the rendered rows, not a live lookup in another array.
 * This keeps retained keyed rows valid while search replaces or shrinks the list.
 * @template {{ date: Date | string }} T
 * @param {T[]} items
 * @param {boolean} [showYears]
 * @returns {(T & { yearHeading: number | null })[]}
 */
export function withIdeasYearHeadings(items, showYears = true) {
	/** @type {number | undefined} */
	let previousYear;
	return items.map((item) => {
		const year = new Date(item.date).getFullYear();
		const yearHeading = showYears && year !== previousYear ? year : null;
		previousYear = year;
		return { ...item, yearHeading };
	});
}
