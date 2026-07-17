/**
 * Satori's raw-HTML adapter renders entities literally, so visible text uses
 * harmless Unicode angle marks instead of conventional HTML entities.
 * @param {unknown} value
 */
function safeText(value) {
	return `${value ?? ''}`.replaceAll('<', '‹').replaceAll('>', '›');
}

/** @param {unknown} value */
function safeAttribute(value) {
	return `${value ?? ''}`.replace(/["<>]/g, '');
}

/** @param {string} style @param {string} children */
function div(style, children = '') {
	return `<div style="${style.includes('display:') ? '' : 'display:flex;'}${style}">${children}</div>`;
}

/** @param {string} src @param {string} style @param {string} alt */
function image(src, style, alt = '') {
	return `<img src="${safeAttribute(src)}" alt="${safeAttribute(alt)}" style="${style}" />`;
}

const FLEX = 'display:flex;';
const FONT_BODY = "font-family:'Noto Sans';";
const FONT_TITLE = "font-family:'Newsreader';font-weight:600;";
const FONT_NOTE = "font-family:'Caveat';font-weight:600;";

/** @param {import('./cards').NotebookCard} card */
function variantDetail(card) {
	if (card.kind === 'audio') {
		return div(
			`${FLEX}align-items:center;height:82px;margin-top:28px;`,
			[18, 32, 50, 72, 42, 64, 28, 54, 38, 22]
				.map(
					(height) =>
						`<span style="display:block;width:9px;height:${height}px;margin-right:12px;background:#2563EB;border-radius:6px"></span>`
				)
				.join('')
		);
	}
	if (card.kind === 'collection') {
		return div(
			`${FLEX}margin-top:28px;`,
			['ESSAYS', 'NOTES', 'TALKS']
				.map(
					(label) =>
						`<span style="display:block;margin-right:12px;padding:9px 14px;border:1px solid #B8C0CC;color:#566273;font-size:17px;letter-spacing:.12em">${label}</span>`
				)
				.join('')
		);
	}
	if (card.kind === 'portfolio') {
		return div(
			`${FLEX}margin-top:28px;`,
			`<span style="display:block;margin-right:12px;padding:9px 14px;border:1px solid #B8C0CC;border-bottom:5px solid #C0392B;color:#566273;font-size:17px;letter-spacing:.12em">ADVISOR</span><span style="display:block;padding:9px 14px;border:1px solid #B8C0CC;color:#566273;font-size:17px;letter-spacing:.12em">INVESTOR</span>`
		);
	}
	if (card.kind === 'newsletter') {
		return div(
			`${FLEX}align-items:center;margin-top:28px;color:#566273;font-size:22px;`,
			`<span style="display:block;margin-right:12px;color:#2563EB;${FONT_TITLE}font-size:40px">@</span>one thoughtful dispatch at a time`
		);
	}
	return '';
}

/**
 * Raw HTML keeps the Satori tree deterministic. Svelte's injected-CSS output
 * inserts null sibling nodes which Satori v0.10 misclassifies as non-flex divs.
 * @param {import('./cards').NotebookCard} card
 * @param {string} portrait
 */
export function renderNotebookTemplate(card, portrait) {
	const hasArticleImage = card.kind === 'article' && !!card.image;
	const effectiveTitleSize = hasArticleImage ? Math.min(card.titleSize, 48) : card.titleSize;
	const portraitMarkup =
		card.kind === 'identity'
			? image(
					portrait,
					'width:124px;height:124px;margin-bottom:24px;border:5px solid #FFF;border-radius:999px;box-shadow:0 0 0 2px #CFD5DE;object-fit:cover'
				)
			: '';
	const description = card.description
		? `<p style="display:block;max-width:780px;margin:24px 0 0;color:#566273;font-size:27px;line-height:1.35">${safeText(card.description)}</p>`
		: '';
	const copy = div(
		`${FLEX}flex:${hasArticleImage ? 'none' : '1'};width:${hasArticleImage ? '62%' : 'auto'};flex-direction:column;justify-content:center;min-width:0;padding-right:26px;`,
		`${portraitMarkup}<h1 style="display:block;max-height:${Math.ceil(effectiveTitleSize * 2.95)}px;margin:0;overflow:hidden;${FONT_TITLE}font-size:${effectiveTitleSize}px;line-height:.98;letter-spacing:-.035em">${safeText(card.title)}</h1>${description}${variantDetail(card)}`
	);
	const imageWindow = hasArticleImage
		? div(
				`${FLEX}width:38%;height:390px;padding:10px;background:#FFF;border:2px solid #CFD5DE;box-shadow:7px 8px 0 rgba(37,99,235,.12);transform:rotate(1deg);`,
				image(card.image ?? '', 'width:100%;height:100%;object-fit:cover', card.imageAlt ?? '')
			)
		: '';
	const body = div(
		`${FLEX}flex:1;align-items:center;width:100%;padding:24px 0 15px;`,
		`${copy}${imageWindow}`
	);
	const smallPortrait =
		card.kind === 'article' && !card.image
			? image(
					portrait,
					'width:52px;height:52px;margin-right:14px;border:2px solid #FFF;border-radius:999px;box-shadow:0 0 0 1px #B7BEC9;object-fit:cover'
				)
			: '';
	const signature = div(
		`${FLEX}align-items:center;`,
		`${smallPortrait}${div(`${FONT_TITLE}margin-right:4px;color:#C0392B;font-size:54px;line-height:.8;`, '[')}${div(`${FONT_NOTE}color:#C0392B;font-size:31px;`, safeText(card.annotation))}`
	);
	const footer = div(
		`${FLEX}align-items:flex-end;justify-content:space-between;min-height:65px;`,
		`${signature}${card.date ? div('color:#697386;font-size:21px;letter-spacing:.04em;', safeText(card.date)) : ''}`
	);
	const top = div(
		`${FLEX}align-items:center;justify-content:space-between;font-size:22px;text-transform:uppercase;letter-spacing:.16em;`,
		`${div('flex-shrink:0;color:#2563EB;font-weight:600;', safeText(card.label))}${div('flex-shrink:0;color:#697386;text-transform:none;letter-spacing:.05em;', 'swyx.io')}`
	);
	const paper = div(
		`${FLEX}position:relative;flex-direction:column;width:100%;height:100%;padding:45px 52px 36px 78px;background:#F9FAFB;border:2px solid #D9DDE4;box-shadow:0 10px 30px rgba(31,41,55,.08);overflow:hidden;`,
		`${div('position:absolute;left:48px;top:0;width:2px;height:100%;background:rgba(192,57,43,.28);')}${top}${body}${footer}${div('position:absolute;right:-34px;bottom:-34px;width:85px;height:85px;border-top:3px solid #2563EB;transform:rotate(-45deg);')}`
	);
	return div(
		`${FLEX}width:100%;height:100%;padding:30px;background:#F3F4F6;color:#1F2937;${FONT_BODY}`,
		paper
	);
}
