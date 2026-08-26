# About: a personal letter with commentary

## Accepted contract

The final reference is [the user's commentary crop](selected-commentary-reference.webp), elaborating [direction A](selected-letter-reference.webp). The later two-pane exploration was rejected insofar as it moved substantive sections into the sidebar. The sidebar contains personal commentary, not a second navigation system or competing content column.

Retained: warm literary typography, a modest real portrait, "What brings you here?", six intent-based anchors, flowing main-column prose, and aligned italic margin notes. No dashboard cards or sticky chapter navigation. The original four-way exploration and subsequent experiments remain local; their generated UI text is not authoritative biography.

Approved additions: Short/Medium/Long introductions (Short initially), copy controls, reusable third-person bios, and a separately dated `/now`. `/now` describes existing public work and the observed website revision, not invented personal-life updates. January 2025 material is explicitly historical.

## Preserved capabilities

- All six substantive sections stay in the main column. Commentary follows its section below 900px.
- Historical bios and older links remain in a disclosure, with unique anchors and dates.
- All 31 photos remain: four featured World’s Fair photos, four headshots, two initial avatars, and 21 more photos/avatars. Original and social-source links remain available.
- Photo reuse guidance points to the original source/photographer rather than granting blanket permission.
- Existing navigation, themes, footer, social links, privacy boundaries, and private-tools discovery rules are unchanged.
- `/now` has canonical metadata, an OG card, and a public sitemap entry; no private tools are newly exposed.

## Visual comparison and corrections

Captures use DPR 1, the actual shared site shell and real content. Final About captures use Short intro, collapsed historical/media disclosures, and the viewport dimensions below. Files are in `implementation/`, named `final-{theme}-{width}.webp`.

| Viewport | Main copy width | Commentary | First reading heading |
| --- | ---: | --- | ---: |
| 1440 × 900 | 751px / 68ch maximum | 192px right margin | 657px |
| 834 × 1194 | 751px | After related section | 694px |
| 720 × 900 | 680px | After related section | 694px |
| 390 × 844 | 350px | After related section | 772px |

Both light and dark About states were visually inspected at all four sizes; document width equals viewport width. `/now` was inspected in dark at 1440/390, and light at 390/720/834. Mid-page story captures verify commentary alignment and responsive interleaving.

| Delta | Resolution |
| --- | --- |
| Initial phone portrait stacked above the entire opening | Fixed: portrait beside heading, controls/text below, preserving the intimate letter opening. |
| Global image styling put a rectangle behind the decorative bird in dark mode | Fixed: explicit transparent background; recaptured desktop story after correction. |
| Real body text is larger than the generated reference | Intentional: readable 18px prose and full factual elaborations make a longer page. This is not pixel parity with the generated image. |
| Narrow screens cannot sustain a useful commentary rail | Intentional: each note follows its own section, retaining reading order. |
| Mock artwork and icons | Reused the existing approved messenger-bird illustration; real portrait/photos retained. New ImageGen outputs are exploratory references only, not new production artwork. |

`initial-dark-834.webp` records the initial implementation. `story-dark-834.webp` predates the final bird-background correction; `story-dark-1440.webp` records that fix. No material design delta remains open.

## Behavior and verification

- Short/Medium/Long changes the introduction without removing the six content sections.
- Browser clipboard matches Long introduction (1,472 characters) and Standard bio; selecting another version clears previous copy feedback.
- Changing bio length preserves the open historical disclosure.
- The headshots anchor reaches all six uncollapsed headshot/avatar previews; expanded social images loaded successfully.
- No duplicate DOM IDs, including with the historical archive open.
- Mobile menu opens and Escape closes it. Visible native focus styling inspected.
- `/now` navigation, dated content, and historical disclosure verified.
- `pnpm run check`: zero errors and zero warnings.
- `node --test tests/*.test.mjs scripts/podcast-feed.test.mjs`: 493 passing, zero failures before integrating newer unrelated master changes.
- `pnpm run build`: successful Cloudflare adapter build. `git diff --check`: clean.

Limits: full keyboard-only traversal, 200% zoom, no-JavaScript browser mode, and forced clipboard permission denial were not fully exercised. The unsupported permission-testing API was not bypassed. Clipboard failure text and disabled/SSR behavior are covered by source assertions, not claimed as browser denial proof. This is proportional feature QA, not a complete accessibility audit.

## Implementation

`src/lib/about/LetterSection.svelte`, `TextVersions.svelte`, and `copy.js` separate layout, interaction, and copy. `src/routes/about/+page.svelte` composes the letter and preserved galleries; `archive.md` retains historical content. `src/routes/now/` owns the dated note. Shared metadata, OG registry, sitemap, and focused tests include the new page.

Release checkout: `/Users/swyx/.codex/worktrees/swyxdotio-seo-aeo`, branch `codex/swyxdotio-seo-aeo`, targeting the repository's default `master`. Local verification does not imply production activation; release and live checks follow separately.

After integrating current master: 527 tests passed, typecheck remained clean, and the production build succeeded. PR #580 deployed successfully. Live verification then caught a legacy root `_redirects` rule sending `/now` to `/about#now`, which the Vite preview did not apply. Removed that obsolete rule and added a regression assertion; direct production-route checks are required, not only client-side navigation.

## Memory ledger candidates

Before implementing a two-pane design, identify each pane's semantic role: primary content, navigation, or commentary. Check that every substantive section remains in the intended reading column, rather than accepting a superficially similar two-column layout.
