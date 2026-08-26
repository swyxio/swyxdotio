# Ink and pastel: first native illustration study

26 August 2026. Local visual prototype, based on current master `12bc3f7`. The separate provider/model-picker checkpoint `f7f55d8` and its secrets remain untouched. No inference or production changes.

## Close-up observations

Captured the [harness graphic](https://www.linkedin.com/feed/update/urn:li:activity:7498043434084196353/) and [inference-engine comparison](https://www.linkedin.com/feed/update/urn:li:activity:7495506067385106432/) in authenticated Chrome. Inspected the document stack, cylinder, queue tiles, numbered containers and connector treatment, as well as the larger browser-delivered source images during the preceding review.

- Icons use smooth dark silhouette strokes, with thinner internal detail. They are not the scratchier, double-line style of the existing wireframe kit.
- Flat lavender, teal and cream fills carry color. Small white highlight strokes and a second offset layer suggest depth without gradients or realistic lighting.
- Shapes within icons are simple but deliberately composed: a folded corner, elliptical cylinder cap, repeated inset queue tiles. Merely changing a rectangle's color does not reproduce this.
- Diagram connectors and container outlines are lighter than icon silhouettes. Number badges and clear sans-serif labels establish a separate hierarchy.

## Small implemented pieces

| ID | Native construction |
| --- | --- |
| `illustration-document` | Folded closed paper outline, separate lavender backing sheet, fine detail lines and editable label. |
| `illustration-database` | Elliptical top, closed cylinder body, two curved separator strokes, highlight and backing layer. |
| `illustration-queue` | Repeated teal request tiles, independent outline/backing tray, filled direction arrows and editable label. |
| `illustration-callout` | Pale panel, offset backing, number badge, editable title and caption. |
| `illustration-sampler` | One explicitly inserted demonstration combining those parts and two line weights. Never inserted automatically. |

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

## Verification

- 234 drawing unit tests passed.
- Nine focused browser checks passed: native insertion/grouping, undo/redo, unchanged geometry after reload, PNG/SVG exports, marker-to-shape switching without modifying original elements, access from all three modes at 390px, and existing component/palette/responsive behavior.
- Svelte check: zero errors/warnings. Production build passed.
- Captured real Chrome screenshots and inspected the native PNG export. A local comparison sheet places enlarged reference details beside the native rebuilds; no reference images ship in the application.
- No inference, key activation, push, merge or deploy. This checkpoint is a visual prototype for review.
