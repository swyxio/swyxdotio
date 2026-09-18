# Universal notebook search — 2026-09-18

The shared header now exposes a field that fills available desktop space, with a dedicated 44px mobile search button. One controller lazy-loads the native modal dialog. `/` and Cmd/Ctrl+K open it outside editing, composition, and other dialogs. Suggestions support arrows, Enter, touch links, Escape, backdrop dismissal, and focus restoration.

Common destinations derive from the existing page social registry, including Now, and appear before catalog initialization. Catalog requests start at two characters with 150ms debounce, cancellation, and response revision guards. Failure shows explicitly labeled common pages regardless of the query; those links are not catalog matches and remain labeled as pages. Enter on an unselected failed search opens complete results rather than silently choosing a fallback.

The existing application Worker serves `/api/search`, using `listAllContent`, its KV manifest lifecycle, and the already-installed uFuzzy. Concurrent loads share a promise; a bounded metadata index is reused while projections are unchanged. Every request consults the existing content loader, so publication/cache generations and finite manifest expiry retain their current behavior. No new infrastructure or dependencies were added. Bodies, transcripts, raw records, and private items are excluded. Local legacy canonicals are resolved through the existing `_redirects` table; talk recordings and podcast destinations open directly.

`/search?q=...` exposes complete ranked results with content type, year, topic, and pagination in the URL. Its GET form works without JavaScript. Bound inputs preserve pre-hydration edits; navigation snapshots prevent an earlier results response overwriting a newer draft. The archive's own search/filter remains intact; `/` now consistently opens universal search.

## Verified behavior

- Unit tests: public projections, unsafe URLs, duplicate destinations, exact/prefix/typo/diacritic/Chinese searches, combined facets, stable vocabulary, pagination, bounds, index reuse and refresh, legacy canonical exceptions.
- Browser: instant common links/autofocus; exact CFP Advice; arrow selection; Enter to `/cfp-advice`; Enter on a talk to its actual YouTube recording; All results; content=article + year=2020; history back/forward; literal slash in input; Cmd+K; Escape restores the header trigger. Independent review also verified slash and the unchanged Cardo/Newsreader article, anchors and floating TOC.
- Held hydration scripts in Chrome: `new draft before hydration` survived client initialization. Held a SvelteKit results data request: `newer draft while navigating` survived the older `learn` response. Results reflect the submitted query while the edited draft remains available for the next submission.
- Injected API 503: a query without seed matches (`cfp`) exposed all seven common pages with an explicit fallback message. Clean IAB QA logged no console warnings/errors; injected failures were intentional and cleared afterward.
- Chrome CDP touch emulation at 390px CSS width: horizontal swipe x280→80 at y155 moved chips scrollLeft 0→45.33 and revealed Podcasts. Tap x325/y152 selected Podcasts and focused input. Vertical swipe x200/y600→270 moved results scrollTop 0→409.33. A new query reset scrollTop to 0. Touch emulation uses unscaled CSS coordinates even with stored browser zoom.
- Light/dark dialog screenshots: narrow phone, regular phone, reduced height, landscape, desktop; earlier tablet QA also passed. Input survived every resize. All search controls have 44px minimum targets; input is 48px/16px. Native modal focus containment and body scroll locking follow the site's existing modal approach.

## Measurements and limitations

See [performance.json](performance.json) and [responsive-metrics.json](responsive-metrics.json).

The shared initial JavaScript import closure grew by **2,869 bytes raw / 1,172 bytes gzip**. The dialog's incremental lazy closure is **8,998 bytes raw / 4,255 bytes gzip**. These compare identical dependency runtimes against merged typography source `ce1b287`; sums exclude page-specific chunks, CSS, and fonts. The initial closure excludes the dialog.

The first observed local catalog load took 4,494ms plus 2.45ms indexing/ranking. Subsequent local requests measured **58–89ms client wall time**, with **56–62ms loader time and 0.57–1.27ms indexing/ranking**. These are Vite/Worker-platform local-manifest measurements, not production cold-isolate or mobile radio latency. The 150ms debounce is separate.

The IAB's stored 0.67 zoom yields approximately requested CSS dimensions, sometimes rounded by one pixel (e.g. requested320×568, reported319×569). Raw scrollWidth is retained in the metrics; no element extended beyond the viewport and no overflow exceeded that rounding pixel. Native Chrome at exact320×568 independently showed no page overflow. The fixed mobile slot reserves44px and does not overlap navigation. Temporary viewport, touch and request-interception overrides were cleared.

Responsive browser and touch emulation approximate keyboard constraints. Native iOS/Android keyboard behavior and physical-device thumb ergonomics remain untested.

Final production build, svelte-check, and 16 focused search/reading/content/sitemap tests passed. Screenshots preserve the warm light palette, gold dark accent, and Cardo/Newsreader/Inter treatment.
