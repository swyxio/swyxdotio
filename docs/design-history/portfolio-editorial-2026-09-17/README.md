# Portfolio editorial redesign · September 17, 2026

## Direction and designer critique

The user delegated implementation and iterative critique, then specifically liked B’s popup. This release combines A’s editorial table with B’s company dossier as a native desktop dialog and phone bottom sheet. Generated images are exploratory references only; their invented company facts, dates, logos, and funding claims were not copied. The existing public catalog is unchanged.

The original page gave the introduction and five large filter fields more weight than the companies. Funding, sources, and original tiers competed with the valuations. The corrected composition prioritizes the company name, readable product summary, and aligned dated valuation. Further evidence is available through native round disclosures, Detailed mode, and the company popup.

## Visual contract

- Keep the existing cream paper, serif display face, semantic dark theme, site navigation, and footer.
- Compact view and valuation high–low are the initial state; unknown marks remain last in both directions.
- Search and sorting stay visible. Category, original tier, and status live in a reversible Filters panel.
- Company names are clearly focusable detail buttons. Their popup preserves website access and contains the complete description, personal note, exit destination, valuation qualifiers, rumors, funding rounds, leads, and public sources.
- Desktop uses four aligned columns. Tablet retains the table; split desktop and phones recompose rows without horizontal overflow.
- Keep all 61 entries, individual backing, closed status, celebrated exit marks, source provenance, and editorial/advising boundaries.

## Comparison and correction round

Matched captures: same public catalog, high–low sorting, Compact mode, collapsed histories, light theme. Chrome CSS viewport sizes are recorded below. Desktop browser zoom affected pointer coordinates under device emulation; normal browser geometry was used for mouse interaction checks. Phone screenshots and keyboard interactions were validated under exact device metrics. Physical device touch and software keyboard behavior remain unverified.

| Viewport | Original first row / row height | Final first row / row height | Overflow |
| --- | --- | --- | --- |
| Desktop 1440 × 900 | 595 / 90 px | 346 / 92 px | None |
| Phone 390 × 844 | 834 / 308 px | 366 / 161 px | None |
| Tablet 834 × 1194 | 737 / 90 px | 334 / 92 px | None |
| Split desktop 720 × 900 | 757 / 111 px | 289 / 161 px | None |

Round one still spent too much space on About, a redundant portfolio heading, and a separate date line. Phone funding disclosures also forced blank space between the name and description. The correction shortened the visible intro, aligned About beside the desktop summary, removed the redundant visible heading, moved the date into metadata, and moved phone funding to the category/status row. Descriptions increased to 16 px; single-round grammar was corrected.

| Reference delta | Status | Implementation decision |
| --- | --- | --- |
| A’s low preamble and editorial comparison | Fixed | First company is above the fold at every required width. |
| B’s company dossier popup | Fixed | Native modal with visible close, Escape, focus containment/restoration, independent scrolling, and phone bottom sheet. |
| Reference filter popover | Intentional | Inline disclosure with native selects avoids nested overlays and retains immediate filtering. |
| Separate category and tier columns | Intentional | Combined metadata column gives product descriptions more width. |
| B’s permanent desktop detail rail | Intentional | Popup preserves full-width valuation comparison until details are requested. |
| Generated factual details/artwork | Intentional | Use verified catalog and existing logos; no production raster asset is needed for this direction. |
| Physical device touch/keyboard proof | Open | Browser emulation does not establish physical-device behavior. |

## Validation and implementation details

`+page.svelte` owns filtering, sorting, density, and selected company. `PortfolioCompanyDetails.svelte` owns native dialog presentation and waits for Svelte’s DOM flush before opening. `PortfolioFundingHistory.svelte` retains native details and verified lead links, with a short compact summary. No dependencies, provider bindings, data schema, or public portfolio data changed.

The 12 catalog tests and two focused portfolio presentation tests pass. Svelte check has zero errors and warnings; the production Cloudflare build succeeds. Browser checks exercised normal mouse activation, keyboard opening/closing and restored focus, both valuation directions, unknown marks last, exited filtering, reset, zero/one search results, Detailed history expansion, and dark-theme popup rendering. Coarse-pointer phone layout has no horizontal overflow, but automated touch activation under the browser’s unusual zoom geometry was inconclusive.

The broader About/portfolio source test file has two pre-existing failures concerning About photo markup; About source is untouched. Its obsolete portfolio assertion forbidding all `<details>` was updated to permit the user-requested progressive disclosure. Local read/presence APIs return unavailable because local production bindings are absent; this does not establish production behavior.

## Evidence

- `reference-a-editorial.png`, `reference-b-dossier.png`: selected exploratory compositions.
- `before-{desktop,phone,tablet,split}.png`: original live page at matched sizes.
- `round1-{desktop,phone}.png`: first implementation before critique corrections.
- `final-{desktop,phone,tablet,split}.png`: corrected directory.
- `popup-{desktop,phone}.png`: company detail presentation.
- `popup-dark.png`: normal-browser dark-theme check, not a matched-size comparison.

No new generalized miss-ledger lesson was added. This pass confirms the existing fold, real-copy, responsive recomposition, and matched-capture lessons.
