# The useful things cabinet

**Follow-up:** after comparing the first release with D, the user requested the
obvious visual gaps be fixed. See [the refinement](refinement/README.md) for the
restored still-life, drawer hardware, heading and paper treatment. The original
release history below is retained; its omitted desktop artwork was visual drift,
not a satisfactory interpretation of “keep the rest simple.”

## Approved design

The user chose **D — Curiosity Cabinet**, explicitly asking to keep the rest simple.
The other explored directions were A (restrained Tool Shelf), B (Draw-first
Workbench with account rail), and C (dense Control Panel). D was selected for its
illustrated walnut-and-brass cabinet, warm paper, and tangible instruments.

Retained: five peer tool drawers for the owner, three for other visitors, a
pinned allowance receipt, serif labels, and a compact account disclosure.
Drawers are ordinary direct links, not a new drawer-opening workflow. Full
policy details expand underneath; funding, rate limits, logging, and owner
review remain visible above the tools. No new product capabilities were added.

The existing site header, footer, fonts and theme switch remain unchanged.
The account menu retains email, immutable Google identity, workspace explanation,
role and signout. Google login, safe next-tool continuation, OAuth error/unavailable
states, account-switch storage events, quotas, privacy and server permissions
remain intact. The shared AI notice and every auth/storage/ledger module are unchanged.

## Artwork and intentional adaptations

`reference-d.webp` retains the selected ImageGen desktop/phone board. The board
is a composition reference, not a screenshot of working code. Its simultaneous
signed-in and signed-out panels were alternative-state studies. The production
page displays only the actual state. Invented tool descriptions were rejected.

Seven new production assets were generated with the built-in ImageGen tool:
five transparent instrument illustrations plus walnut and paper textures. The
prompts are in `asset-prompts.json`. Optimized WebP copies live in
`static/assets/tools-cabinet/`; originals remain in the generation archive.
Raster detail is decorative; all labels, usage amounts and controls are HTML.
The seven assets total 191,846 bytes. They are used only by the Tools hub.

Intentional differences from the reference:

- The wide desktop cabinet has five drawers. Tablet/split uses three primary
  drawers plus two shallow owner drawers, without an empty compartment.
- Phone uses stacked direct-link drawers and omits the decorative subtitle and
  flourish to keep the first tool reachable. Account controls are restored on phone.
- Ornamental desk clutter and the mock's extra notes drawer are omitted to honor
  “keep the rest simple,” not replaced with invented tools.
- Dark mode retains physical warm paper and wood on the existing navy site shell.
- Accurate logging/owner-review copy is longer than the mock; it stays visible.
- Existing full header/footer are retained instead of the mock's abbreviated shell.

## Visual comparison and corrections

Captures use Chromium, DPR 1, reduced motion, the existing site shell and fixture
identities. Owner baseline/final captures use 1 assistant turn, 0 generations,
and $0.05 estimated reservation. Edge-state captures use zero fixture usage.
These values are not production usage. Expanded menu captures deliberately use
a long fixture name. Generated board dimensions differ from actual viewport
captures; comparison is structural, not a claim of pixel parity.

| Viewport           | Draw before | First implementation | Corrected |
| ------------------ | ----------: | -------------------: | --------: |
| Desktop 1440 × 900 |       747px |                441px |     441px |
| Tablet 834 × 1194  |       746px |                471px |     471px |
| Split 720 × 900    |       739px |                467px |     467px |
| Phone 390 × 844    |       869px |                518px |     383px |

Before, Tool logs preceded Draw; the original first-tool measurement was
approximately 622px desktop / 719px phone. The table compares Draw consistently.

### Delta ledger

- **Fixed, first correction:** phone preamble pushed Draw to 518px. Removed
  decorative mobile copy, reduced the heading, and recomposed receipt counters.
  Draw starts at 383px with three primary tools visible in the first screen.
- **Fixed, first correction:** tablet/split grid left a large empty compartment.
  The owner tools now fill a shallow lower row; all five remain direct links.
- **Fixed, first correction:** initially flat cream faces lacked the reference's
  paper material. Added a generated, compressed paper texture (924 bytes).
- **Fixed, second correction:** enlarged text could collide with owner badges.
  The badge clearance now scales with text; receipt counters recompose when narrow.
- **Intentional:** desktop composition is less cluttered and more restrained than
  the reference, while retaining the dominant wooden cabinet and generated objects.

Matched desktop/tablet/split/phone captures and intermediate captures are retained
in `captures/`, together with measurement metadata. Additional states include
guest/member/owner, both themes, expanded identity and policy, unavailable usage,
OAuth error, long names, missing artwork, narrow 320px, forced colors and enlarged
text. Account keyboard open, Escape/focus return, outside dismissal, signout
pending/error/success, usage loading/error/recovery, and tenant changes are covered
by browser tests. A missing image leaves the HTML link and label usable.

At normal text sizes all four matched viewports and 320px phone have zero document
overflow. The 200%-text stress capture exposes overflow in the unchanged global
navigation; this is not a full-site accessibility repair. Cabinet text and receipt
controls are separately checked for containment and reachability. No new
animations, persistence, paid requests or third-party calls were added.

## Verification

Verification commands and release identities are recorded in `verification.md`.
The selected reference and before/first/final captures are design evidence, not
production proof. Release verification must independently establish source,
Worker activation and live host behavior.

## Memory ledger candidates

None. The discovered preamble, tablet-grid and text-scaling issues are already
covered by the skill's existing miss ledger; no skill or memory files were edited.
