# D refinement after side-by-side comparison

User request: “fix up obvious things.” This is a correction of the selected D
direction, not a new design selection or feature request.

## Corrected

- Smaller desktop heading without the forced two-line measure.
- Restored the pen cup, compass, books and letterpress-block still-life next to
  the desktop cabinet. It is decorative, never a sixth tool or control.
- Real generated brass cup pulls for the three ordinary tools; deeper wooden
  fronts and shorter paper faces. Owner-only labels remain readable HTML.
- Generated deckled paper for the allowance receipt and rules, with nine-slice
  rendering so corners and edges are not flattened into an accordion shape.
- Quieter, unboxed footer on `/tools` only. Its complete links and credits remain.

The account menu, actual usage states, policy disclosure, direct links, Google
auth, owner permissions, caches and telemetry are unchanged. The compact mobile
cabinet does not download the desktop still-life. Dark mode retains physical
paper and wood against the existing navy shell.

## Assets

The three additional built-in ImageGen assets are documented in
`asset-prompts.json` and stored as WebP in `static/assets/tools-cabinet/`:
`desk-still-life.webp` (95,168 bytes), `brass-pull.webp` (20,376 bytes), and
`paper-sheet.webp` (41,312 bytes). Alpha is preserved. The existing five tool
illustrations are reused; no new runtime dependencies are added.

## Comparison and correction

Matched owner captures use the same fixture and 1440×900, 834×1194, 720×900 and
390×844 viewports as the first release, DPR1 and reduced motion. Initial follow-up
captures are prefixed `first-`; corrected captures are prefixed `final-`.

The first follow-up comparison caught an undersized still-life and visibly
stretched paper edges. The correction enlarges the illustration behind the
cabinet's left edge and uses nine-slice paper edges. Mobile task position is
preserved rather than adding the desktop ornament above its tools.

Still intentional: all labels remain HTML; the owner and signed-out states are
not shown simultaneously; no decorative extra drawer is introduced; desktop
props are omitted on tablet/phone to protect tool reachability. The existing
global navigation's 200%-text issue remains outside this visual correction.

No new memory-ledger candidates; no skill or memory files edited.

## Verification

- Production build and `npm run check` pass (0 errors/warnings).
- Full browser suite: 69 passed, 3 live-model tests skipped. No paid requests.
- Existing viewport tests now guard against a wrapped desktop heading and the
  phone tools slipping below 420px.
- Corrected Draw top: desktop428px, tablet462px, split459px, phone383px.
- Zero document overflow at the four standard viewports and 320px. Expanded
  account/policy, both themes, guest/member, errors and forced colors captured.
- The reference and first release remain in the parent history; the desktop
  illustration and material detail are no longer classified as optional omissions.
