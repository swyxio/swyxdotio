import GithubSlugger from 'github-slugger';

/** Each parse owns its slugger: concurrent article renders must not share IDs.
 * @returns {import('marked').MarkedExtension}
 */
export function headingIds() {
	const slugger = new GithubSlugger();
	return {
		renderer: {
			heading(text, level, raw) {
				const id = slugger.slug(
					raw
						.toLowerCase()
						.trim()
						.replace(/<[!\/a-z].*?>/gi, '')
				);
				return `<h${level} id="${id}">${text}</h${level}>\n`;
			}
		}
	};
}
