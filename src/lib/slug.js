export function isBlogSlug(slug) {
	return /^[a-z0-9][a-z0-9-]*$/.test(slug);
}
