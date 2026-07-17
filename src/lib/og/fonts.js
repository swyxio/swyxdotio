import { read } from '$app/server';
import { CustomFont, resolveFonts } from '@ethercorps/sveltekit-og/fonts';
import newsreaderPath from './assets/fonts/Newsreader-Semibold-static.ttf?url';
import notoSansPath from './assets/fonts/NotoSans-Regular-static.ttf?url';
import caveatPath from './assets/fonts/Caveat-Semibold-static.ttf?url';

let fontPromise;

export function notebookFonts() {
	fontPromise ??= resolveFonts([
		new CustomFont('Newsreader', () => read(newsreaderPath).arrayBuffer(), { weight: 600 }),
		new CustomFont('Noto Sans', () => read(notoSansPath).arrayBuffer(), { weight: 400 }),
		new CustomFont('Caveat', () => read(caveatPath).arrayBuffer(), { weight: 600 })
	]);
	return fontPromise;
}
