# Essay diagram references for `/draw`

Researched 2026-08-25. Scope: public-source visual research and recommendations only; no application edits or inference runs in this research track.

## Selection and evidence

These are representative prominent essays, **not a measured popularity ranking**. The live [Ideas page](https://swyx.io/ideas) lists *How to Create Luck*, *The Third Age of JS*, *Eating the Cloud*, and *Why Temporal* under “Popular posts.” The live [homepage](https://swyx.io/) features *The Rise of the AI Engineer*, published on swyx's Latent.Space. Each figure below was downloaded from its public article image URL to `/tmp/draw-essay-references/` and visually inspected. No images were added to the repository. [Learn in Public](https://swyx.io/learn-in-public) is prominent, but the inspected article has no inline diagram; do not invent a visual reference for it.

The transferable aesthetic is an **explanatory sketch with a thesis**, not a single brand template. Some figures are hand-drawn; others use clean rectangles and mixed typography. A figure's appearance in an essay is evidence of editorial use, not proof swyx originated every component or borrowed image.

## Five useful references

### 1. Temporal: make the architectural change visible

[Essay](https://swyx.io/why-temporal) · [simple A→B→C](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/vbkxrbfs1qroe2xdxr6u.png) · [duplicated retries/state](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/rckh4r82ipdl4pgbnt7d.png) · [extracted orchestration](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4k8vcafyzeiusfwj6m5d.png)

Observed: light-gray field; medium-gray, unoutlined rectangular systems; strong black arrows; monospaced-looking labels beneath; green appears on the newly added responsibility. The same three systems persist across a sequence. Their repeated clocks/state move into one shared orchestrator, making the argument understandable without paragraphs inside boxes.

Transfer: retain comparable node placement across alternatives; highlight what moved or changed. Show failure/retry ownership, not just a happy-path chain. Gray is context, accent is the mechanism. Avoid mimicking the exact systems or suggesting the 2021 article describes current product capabilities.

### 2. Eating the Cloud: compare like with like, show the boundary

[Essay](https://swyx.io/cloudflare-go) · [integrated/modular comparison](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/7258tf9irknumz5db2vg.png)

Observed: two hub-and-spoke structures, handwritten short labels, clear central divider, orange enclosure on the integrated side, distinct colored nodes on the modular side. Containment carries meaning. The adjacent prose challenges a too-clean separation between interoperating systems; the figure is part of an argument, not an exhaustive architecture inventory.

Transfer: two equal comparison areas, parallel structure, explicitly named ownership/trust boundary, and one sentence of caveat when the boundary is permeable. The essay's game-board collage is not the default style for technical figures. Treat the comparison as an editorial reference, not an assertion of original illustration authorship.

### 3. How to Create Luck: turn a list into a useful distinction

[Essay](https://swyx.io/create-luck) · [four-kind matrix](https://dev-to-uploads.s3.amazonaws.com/i/5ycsicfgoxsvxoyys5ip.png) · [habits/strategy map](https://dev-to-uploads.s3.amazonaws.com/i/poue5zg9homy1eo4ml05.png)

Observed: very pale blue background, bold black handwritten axes/title, ample empty space, directly labeled concepts, a few category colors and mnemonic emoji. One figure classifies with a dashed 2×2; the next intentionally becomes a continuous two-axis map. These are conceptual positions, not measured data points.

Transfer: ask which two dimensions explain the disagreement; label both axis directions clearly. Use 2×2 only for genuinely categorical distinctions. Mark a conceptual map as illustrative and never fabricate numeric measurements. Emoji are optional mnemonic aids, not required decoration.

### 4. The Third Age of JavaScript: give a progression structure

[Essay](https://swyx.io/js-third-age) · [timeline figure](https://dev-to-uploads.s3.amazonaws.com/i/rlixanixq8pyrpg9ivrv.png)

Observed: pale-blue field, blue horizontal direction arrow, black bracketed eras, prominent monospaced-looking period labels, smaller handwritten event labels. Color groups related events. The uncertain future endpoint is explicitly a question. Brackets summarize the thesis while detailed events support it.

Transfer: show 3–5 meaningful phases with short dates/labels, then a few supporting examples. A qualitative progression must not imply quantitatively accurate spacing. Preserve future uncertainty instead of turning a prediction into a fact. Do not force the comparison or argument starter into a timeline.

### 5. The Rise of the AI Engineer: a small visual can carry a big claim

[Essay](https://www.latent.space/p/ai-engineer) · [API-line spectrum](https://substack-post-media.s3.amazonaws.com/public/images/a81555af-0b76-4a61-9b53-595e3d47580a_1005x317.png) · [reordered workflow](https://substack-post-media.s3.amazonaws.com/public/images/6035ddd2-418d-421d-aebd-6893c32bb6dd_1579x266.png) · [code-core/LLM-core slide](https://substack-post-media.s3.amazonaws.com/public/images/55d13fad-b282-4d9c-9258-d63a507ee002_2736x1494.jpeg)

Observed: the spectrum uses white space, black structure, one blue focal role, a dotted API boundary, plain role names, and handwritten annotations. The paired workflow preserves the same three concepts but changes their order; short conditions sit over arrows. The architecture slide makes core/shell containment explicit. These are mixed typographic styles, not universally handwritten cards.

Transfer: show the one consequential difference; use compact edge conditions and meaningful containment. The article explicitly clarifies that the API line is permeable and that product-specific data/evals belong to AI engineering too. Do not copy an oversimplified boundary without its caveat. Do not reproduce the third-party market-map montage as a swyx style reference.

## Recommended shared agent guidance

Apply when making explanatory diagrams or when the user requests this essay aesthetic; do not force it on thumbnail/image work. Respect an explicit user style request and existing scene styling.

> Create an editable explanatory figure with one clear thesis. First choose the relationship: parallel comparison, causal/agent flow, argument with support and objection, conceptual axes, or progression. Use a short title that states the point, a few concrete nodes, directly labeled relationships, and generous whitespace. Prefer dark neutral structure with one semantic accent; use a second accent only for a meaningful contrast, warning, or counterargument. Keep fills pale or transparent and linework lightly hand-drawn. Use readable labels; mix a clear heading with handwritten annotations when useful. Boundaries, arrows, containment, ordering, and color must each mean something. For comparisons keep equivalent concepts aligned; for agent loops show observation, termination, and failure/budget limits; for arguments distinguish claims, evidence, inference, objections, and missing support. Do not invent evidence, citations, metrics, or certainty. Keep the original artwork intact when making an essay-ready revision. Inspect the resulting scene, fix overlaps/crossings/cutoff labels, and ensure the figure still explains its point at article width. Use native shapes/text, not a raster of a diagram.

Concrete implementation suggestions, **not measured source design tokens**:

- Reuse the existing preset palette: dark `#10243b`, blue `#155f9b`, green `#346b4e`, warning/objection `#e14d2a`; pale fills already exist. Default to one accent, not every available color.
- Existing font sizes `38/30/23/17` give enough hierarchy; do not use footnote-sized text to squeeze in prose. At a roughly 1,000-unit-wide figure, use 23+ for main labels and 17 only for brief secondary text. Verify at actual article width.
- Keep roughly 32–48 units between labels and unrelated edges, 64–96 between main nodes, and 48+ around the outside. Prefer clean solid pale fills over dense hatching where many boxes appear. These are starting constraints, not a new layout engine.
- Existing hand-drawn font `5` and native rectangle/ellipse/text/arrow support are sufficient. Do not add a font dependency, a brand lock, a renderer, or mandatory external images.

## The three native examples that should prove it

| Starter | Useful example | Visual/semantic proof |
| --- | --- | --- |
| Compare two architectures | Fixed pipeline vs tool-using agent, both answering the same request | Same input/output aligned; pipeline sequence vs explicit control loop; blue identifies where the model decides; short tradeoff/caveat, no universal winner or fabricated benchmark |
| Agent/tool loop | Request → decide → tool → observation → decide, with a separate final answer | Return edge is unmistakable; terminal branch says “done”; failure/budget/approval stop is visible; tool execution is not confused with a model response |
| Claim/evidence/objection | “Public notes improve learning” with a proposed retrieval/revision mechanism | Claim ≠ evidence; a labeled support gap remains a gap; objection “publishing can distract” has a real connection; no invented study or claim that this is swyx's exact argument |

These are generic public starting examples inspired by explanatory techniques, not copies of personal assets. Insert only on an explicit starter click. Agent prompts should be reviewable and must obey the shared account/paid-AI boundary.

## What counts as verification

1. Render all three native examples and inspect at desktop/article width plus mobile fit-to-scene. All labels remain readable, no accidental node/label overlap, connections are unambiguous, and each example tells its intended story.
2. Unit tests can prove shape/editability, node/edge presence, stable semantic labels, explicit uncertainty/stop conditions, and preservation of the original on revision. They cannot prove aesthetic usefulness alone.
3. Run the actual agent with the approved shared provider only when authorized; capture the prompt and resulting native scene and visually review the three jobs above. Until that happens, report “agent guidance and native examples verified,” **not** “live agent quality verified.” A mock response or static preset is not a model-quality test.
4. For essay-ready revision, compare before/after: wording condensed without changing the claim; originals preserved; improvements visible at export size; gaps/counterarguments retained rather than removed for prettiness.

All functions must remain reachable in every starting experience; style guidance is not a mode-specific capability or permission boundary.
