// A single queryParameters store gives both controls one pending URL write.
export const IDEAS_QUERY_PARAMETERS = {
	filter: {
		/** @param {string} value */
		encode: (value) => value || undefined,
		/** @param {string | null} value */
		decode: (value) => value ?? '',
		defaultValue: ''
	},
	show: {
		/** @param {string[] | null} values */
		encode: (values) => (values?.length ? values.join(',') : undefined),
		/** @param {string | null} value */
		decode: (value) => value?.split(',').filter(Boolean) ?? [],
		defaultValue: /** @type {string[]} */ ([])
	}
};

export const IDEAS_QUERY_OPTIONS = {
	debounceHistory: 500,
	pushHistory: false,
	showDefaults: false
};
