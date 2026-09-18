# Reading and utility fonts

Cardo (normal 400/700, italic 400) and Inter (normal variable 400–700) are self-hosted WOFF2 files obtained from the official Google Fonts CSS distribution on 2026-09-18. `src/lib/reading-fonts.css` preserves the distribution’s Unicode ranges so each browser requests only the subsets used by the page.

Upstream family pages: https://fonts.google.com/specimen/Cardo and https://fonts.google.com/specimen/Inter.

Distribution request: https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&family=Inter:wght@400..700&display=swap (Chrome user agent).

`Cardo-OFL.txt` and `Inter-OFL.txt` are the upstream SIL Open Font License files from https://github.com/google/fonts/tree/main/ofl/cardo and https://github.com/google/fonts/tree/main/ofl/inter.
