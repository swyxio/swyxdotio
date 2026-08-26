# Ink and pastel: first native illustration study

## Full-diagram preset expansion (26 August)

Following approval to update presets, added eight complete native **reconstructions**, rather than claiming pixel-exact clones: `bytebytego-harness`, `bytebytego-inference-engines`, `bytebytego-api-testing`, `bytebytego-kafka`, `bytebytego-cicd`, `bytebytego-memory`, `bytebytego-git-history`, `bytebytego-data-agent`.

Each is explicitly inserted from the existing Presets tab or shared command registry, beside any existing artwork, with the entire insertion selected. Native arrows bind to native nodes; glyphs, labels, fills and containers remain editable. No inference or source-image request is required. The original twelve starters and every mode retain access. Source attribution is a separate gallery link and a linked text element that travels with the scene.

`draw-reference-presets.js` holds builders and source metadata; `draw-presets.js` appends them to the shared registry. The narrow route addition provides search, actual native-render previews and one-click insertion. Static previews are local WebP exports of our native scenes, not reference screenshots. Insertion uses Excalidraw's native restore normalization. No new engine, dependency, document type, auth rule or provider configuration.

Coverage: [the saved inventory](../research/draw-bytebytego-inventory.md) contains 296 distinct Alex activity IDs plus eleven company entries, reaching one-year-old material with gaps. Older-feed timeouts prevented proving an all-time endpoint. Eight selected diagrams were closely inspected, including source screenshots and browser-delivered assets. Do not describe this as scanning every historical post.

Fidelity limits: static diagrams, simplified original glyphs, native sans-serif type, rewritten captions and some compressed subgraphs; no trademark logos, original raster artwork, animation or exact brand typography. The Git reconstruction is a light-paper variant of the dark source. Model rankings, numerical benchmarks and dated model-version claims are not imported as facts. These are usable editable studies, not ByteByteGo-endorsed originals.

Verification: all eight native renders inspected, PNG/SVG and `.excalidraw` artifacts retained outside git. Corrected the CDC sequence and Git replay-label wrapping during visual review. Browser checks cover each preset's bindings, insertion, native one-step undo/redo and reload, plus actual mode switching on 390px screens, preservation of old artwork, command-palette access and zero inference requests. Nodes/text retain exact geometry; native history may recompute bound-arrow endpoints against rounded shapes, so tests verify those connections instead of falsely asserting pixel-identical arrow coordinates. Existing illustration sampler tests still require exact unbound geometry.

26 August 2026. Local visual prototype, based on current master `12bc3f7`. The separate provider/model-picker checkpoint `f7f55d8` and its secrets remain untouched. No inference or production changes.

## Close-up observations

Captured the [harness graphic](https://www.linkedin.com/feed/update/urn:li:activity:7498043434084196353/) and [inference-engine comparison](https://www.linkedin.com/feed/update/urn:li:activity:7495506067385106432/) in authenticated Chrome. Inspected the document stack, cylinder, queue tiles, numbered containers and connector treatment, as well as the larger browser-delivered source images during the preceding review.

- Icons use smooth dark silhouette strokes, with thinner internal detail. They are not the scratchier, double-line style of the existing wireframe kit.
- Flat lavender, teal and cream fills carry color. Small white highlight strokes and a second offset layer suggest depth without gradients or realistic lighting.
- Shapes within icons are simple but deliberately composed: a folded corner, elliptical cylinder cap, repeated inset queue tiles. Merely changing a rectangle's color does not reproduce this.
- Diagram connectors and container outlines are lighter than icon silhouettes. Number badges and clear sans-serif labels establish a separate hierarchy.

## Small implemented pieces

| ID                      | Native construction                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `illustration-document` | Folded closed paper outline, separate lavender backing sheet, fine detail lines and editable label.             |
| `illustration-database` | Elliptical top, closed cylinder body, two curved separator strokes, highlight and backing layer.                |
| `illustration-queue`    | Repeated teal request tiles, independent outline/backing tray, filled direction arrows and editable label.      |
| `illustration-callout`  | Pale panel, offset backing, number badge, editable title and caption.                                           |
| `illustration-sampler`  | One explicitly inserted demonstration combining those parts and two line weights. Never inserted automatically. |

Original constructions, not copied reference icon files. Each icon/callout has its own group; ungroup exposes individual editable native objects. No image files or external asset dependency.

## Drawing tools

Four new presets in **Library → Components**, also exposed through the shared command palette and assistant `draw commands run` surface:

- `brush-illustration-ink`: fine opaque freehand ink.
- `brush-illustration-marker`: broad translucent teal marker.
- `brush-illustration-pastel`: a smooth outlined rectangle with flat lavender fill.
- `brush-illustration-connector`: a thin solid arrow.

These are useful presets for Excalidraw's native drawing tools, **not a new pressure-sensitive brush engine**. They clear selection and change only the next stroke's defaults, never recolor existing artwork. Switching from marker to a shape resets opacity and width. All modes retain all tools.

## Integration

- `src/lib/draw-illustration.js`: original shape builders, the small catalog and shared brush application.
- `src/lib/draw-ui-components.js`: native component catalog integration; existing wireframe styles remain unchanged.
- `src/routes/tools/draw/+page.svelte`: Library tool buttons and shared command registration. Native component conversion now runs Excalidraw's own `restoreElements` normalization before insertion so line bounds and arrow origins do not jump on reload. Native undo history retains deleted elements.
- Extended existing component unit tests and browser drawing tests, rather than adding another test suite.

The prototype uses the existing `/tools/draw` route, account boundary, shared shell, storage and exports. No provider, credential, deployment or auth edits.

## What this study does not establish

This demonstrates the attainable flat-color icon vocabulary. It does not yet reproduce the reference's entire illustrated language, animated icons, hand-ink taper/pressure controls, or dense full-page composition. Native sans-serif text is also not a complete editorial typography system. Next visual work should be another small comparison—such as a lock or user/server pair—before adding a large catalog or custom brush renderer.

## Second pass: broader marks and structure

The follow-up studies the [API-testing headline band](https://www.linkedin.com/feed/update/urn:li:activity:7492969330666729490/) and [watermark explainer's section tabs, token tiles and state bar](https://www.linkedin.com/feed/update/urn:li:activity:7496229648171839489/). Another Chrome screenshot was captured. Broad title marks are opaque filled regions; thin connecting lines still provide contrast rather than making every stroke heavy.

Added native `illustration-line-weights`, `illustration-marker-title`, `illustration-section-frame`, `illustration-feedback-path`, `illustration-token-strip`, and `illustration-outcome-bar` pieces, plus `illustration-marks-sampler`. Shape builders live in `draw-illustration-marks.js` and reuse the first study's primitives. The outcome bar is explicitly qualitative, with no invented numerical score. The feedback card is an editable visual stencil, not a new automatic routing or graph-layout tool.

Added `brush-illustration-bold-ink`, `brush-illustration-title-marker`, and `brush-illustration-flow-arrow` (filled triangle head). They use the same new-strokes-only handler. The original fine connector resets the head and weight when switching back. The Library now has seven presets total.

Kept brushes after the initial component commands so the palette's bounded default results still expose components. Palette hover selection now responds to real pointer movement: a stationary cursor over newly filtered results must not steal the keyboard's highlighted choice.

## Verification

- 235 drawing unit tests passed.
- Ten focused browser checks passed: both native samplers' insertion/grouping, undo/redo, unchanged geometry after reload, PNG/SVG exports, actual marker/pastel/bold-ink/filled-arrow drawing without modifying original elements, access from all three modes at 390px, and existing component/palette/responsive behavior.
- Svelte check: zero errors/warnings. Production build passed.
- Captured real Chrome screenshots and inspected the native PNG export. A local comparison sheet places enlarged reference details beside the native rebuilds; no reference images ship in the application.
- No inference, key activation, push, merge or deploy. This checkpoint is a visual prototype for review.
