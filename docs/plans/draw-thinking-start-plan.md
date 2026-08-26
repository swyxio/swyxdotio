# /draw: diagramming and essay-thinking start

**Status: proposed; manual approval required. No build started.**

## Recommendation

Use **Thinking** as the working label, with the visible heading **“Make an idea clear.”** Offer three starters and an equally immediate **Blank canvas** action. Keep the native Excalidraw toolbar, Library, pages, command palette, assistant, and image tools. Neither Library nor assistant opens automatically.

This is an entry experience, not a writing app or a new document type. Everyone gets the same public starters; the same authorized user retains every function in every mode. For the first slice, add no diagram templates, notebook, layout engine, model dependency, or inference-on-entry.

### Inspection and limits

- Read the [shared planning brief](/Users/swyx/.codex/worktrees/3c03/swyxdotio/docs/plans/draw-workspace-modes-brief.md) from its originating worktree, without modifying it.
- This isolated checkout is `/Users/swyx/.codex/worktrees/df10/swyxdotio`, initially clean, with detached HEAD at `7d5acedf257a04a7b9a3ed17eb149ad8ca3b5b6f`. Its local `origin/master` reference matches. **No later changes exist in this checkout.** Remote freshness, the auth task's unmerged work, and production were not verified.
- Inspected the requested source and existing unit/Playwright coverage. Excalidraw is locked to `0.18.1`. No dependencies were installed, application tests executed, app server started, or browser/runtime result claimed. The Playwright configuration starts a build, so it was deliberately not run.
- Applied the personal `app-ux-paradigms` and `mobile-webapp-ux` skills to focus, dismissal, shortcuts, touch layout, and draft preservation. Existing native Library integration remains the organizing pattern.

## 1. Three jobs and the first 30 seconds

These are usability targets for later validation, not measured completion times. The target is a meaningful start, not a finished technical figure in 30 seconds.

| Job | First 5 seconds | Next 5–20 seconds | Useful state by 30 seconds |
| --- | --- | --- | --- |
| **Compare a retrieval-first assistant with a tool-using agent for a support workflow.** | Choose **Compare choices**. Its subtitle explicitly says “Insert 3 editable comparison cards.” | Rename A/B to the two architectures; remove the unused third column, or use it for a hybrid. Start with the same criteria: context source, actions, failure handling. | Two named options and at least one explicit trade-off. The MVP does **not** pretend the current three-column preset is a two-architecture diagram. |
| **Explain an agent/tool loop to an engineering teammate.** | Choose **Sketch a system** → **Open architecture Library**. | Insert an existing User or Application server symbol, then use native rectangles/arrows for Agent → Tool → Observation → Agent. Add an Answer/Stop exit. Generic DB, Message Q, and Pipeline items are available for data flows. | A named system node and a first directed connection; the intended loop and exit are clear. These are reusable symbols, not a prebuilt agent-loop template. |
| **Turn rough essay notes about human review into a figure.** | Choose **Explain an argument**. The row offers **Prepare assistant request** and **Draw it yourself**. | Entitled user: review the unsent suggested prompt, add their claim/evidence/caveat, then explicitly Send. Manual user: begin three labeled native shapes with a supporting or qualifying arrow. | Either an editable argument skeleton begun manually, or a deliberately submitted assistant request with visible progress/Stop. A generated answer within 30 seconds is not promised. |

### Small starter set

Only these three rows appear in the welcome center. No gallery, questionnaire, carousel, personalized content, or sample scene.

| Starter | Explicit action and reuse | What it must not imply |
| --- | --- | --- |
| Compare choices | Execute existing command `preset-comparison-cards` through `insertPreset`. Public Option A/B/C text remains editable. | No automatic insertion on entry; no hidden removal of the third option; no AI required. |
| Sketch a system | Open the **native Library tab** inside `DefaultSidebar`, not the UI Components category. Show the short hint “Nodes → labeled arrows → feedback or exit.” | No synthetic search results or promise that the 42 library items are already searchable through the command palette. |
| Explain an argument | Prepare an unsent assistant request; alternative **Draw it yourself** dismisses the welcome and explicitly selects the native text tool, inserting nothing. Show “Claim → support → caveat; label the relationship.” | Not a prose notebook; not an automatic generation; manual drawing must remain usable without sign-in. |

Keep all nine presets available in Presets. If a recommended order is desired, lead with `comparison-cards`, `decision-matrix`, `flywheel`, then retain the rest in their existing order. Reorder a view of the catalog, never mutate/filter the shared catalog or the user's Library. Existing curves/scatterplots are illustrative frameworks, not evidence-backed quantitative charts.

### Suggested assistant requests

These are three short, shared workflow suggestions, shown first in Thinking but discoverable in every mode. Clicking prepares text only. Copy must disclose that Send can use paid AI and send canvas/context; it must not call the assistant a free local tool.

1. **Compare two architectures:** “Help me compare a retrieval-first assistant and a tool-using agent for a support workflow. Use two editable lanes with the same input and output; distinguish retrieval from actions. Label assumptions and trade-offs, not invented benchmark numbers. Preserve unrelated artwork.”
2. **Draw an agent/tool loop:** “Draw an editable agent → tool → observation → agent loop, with a user input, an answer/stop exit, and labeled arrows. Keep it small enough to inspect in the visible canvas. Preserve unrelated artwork.”
3. **Explain my argument:** “Turn my notes into one explanatory figure. Separate the claim, supporting reasons/evidence, and a counterargument or caveat; do not invent evidence. Ask for missing notes before drawing. Use native editable shapes and label relationships. My notes: [paste here].”

The assistant can already inspect, add/update shapes, align/distribute, group, layer, and create bound labeled connectors. Use those tools. A prompt asks for good behavior; it is not a new deterministic argument parser or a security boundary. Missing/placeholder notes should produce a clarification, not fabricated essay content.

For essay figures, favor one claim per figure, short labels, visible arrow direction, a caveat where needed, and text distinctions rather than color alone. User-authored source labels can remain ordinary scene text. Use native export after editing; do not create an artboard merely by entering Thinking or imply that a slide/banner template is required.

## 2. Initial layouts

Wireframes describe proposed placement, not a rendered or visually tested build. The common foundation owner reconciles the shared shell once all three plans are approved.

### Desktop, approximately 1440 × 900

```text
┌──────────────── existing native Excalidraw toolbar ─────────────────┐
│ [Page 1 ▾] [Thinking ▾]                        [Search] [Templates] │
│                                                                    │
│                    Make an idea clear                              │
│              Sketch a system, comparison, or argument.             │
│                                                                    │
│                    [ Blank canvas ]                                │
│              [ Compare choices                                  ]  │
│                Insert 3 editable comparison cards                  │
│              [ Sketch a system / Open architecture Library      ]  │
│                Nodes → labeled arrows → feedback or exit           │
│              Explain an argument                                   │
│              [ Prepare assistant request ] [ Draw it yourself ]    │
│                                                                    │
│               All templates · Search all commands                  │
│                                                                    │
│ Native zoom / undo / menu                       [AI assistant]      │
└────────────────────────────────────────────────────────────────────┘
```

- Keep the existing native toolbar and import/export menu unobstructed. Put the compact **Thinking ▾** control beside the page control in the app's utility row, not over a native tool. **Search** is a shared pointer-accessible command-palette trigger, also available after welcome dismissal.
- Initial workspace category: `presets`; Library closed; assistant closed; no image panel unless existing selection/processing requires it. No automatic keyboard focus or account prompt.
- **Blank canvas** just dismisses the welcome and returns focus to the editor. It does not reset the scene, switch page, change drawing style, or create an artboard. Choosing a native tool/drawing also dismisses the welcome.
- On **Sketch a system**, open the existing Library, keeping its native items and custom Workspace tab available. On **All templates**, open Workspace/Presets with **Presets / Design / Components / Memes** intact. Never open both Library and assistant for one starter.
- Prefer Excalidraw's customizable `WelcomeScreen` child for the center rather than a second competing overlay system. Its documented lifecycle already hides it when a tool is chosen or an element is created. The shared owner must add account/restore gating around that lifecycle. [Official WelcomeScreen documentation](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/welcome-screen)

### Phone, reference 390 × 844; also verify 320 px width

```text
┌──────────── native tool controls ───────────┐
│ [Page 1 ▾]                   [Templates]   │
│                                            │
│ Make an idea clear        [Thinking ▾]     │
│ [ Blank canvas                         ]   │
│ [ Compare choices                      ]   │
│   Insert 3 editable cards                  │
│ [ Open architecture Library            ]   │
│   Sketch a system or data flow             │
│ Explain an argument                        │
│ [ Prepare assistant request            ]   │
│ [ Draw it yourself                     ]   │
│ [ Search all commands                  ]   │
│                                            │
│        unobstructed drawing space          │
│                            [AI assistant]  │
│ native canvas controls                     │
└────────────────────────────────────────────┘
```

- One-column center, short subtitles, no decorative previews. New touch targets are at least 44 px high. No initial soft keyboard, expanded drawer, or assistant overlay.
- On mobile, the mode selector is in the welcome heading initially and remains available in the existing **Pages menu** after dismissal. The menu also exposes **Search commands** and **Starting experience**; New page remains a single action, not a forced choice wizard.
- Opening one surface hides the welcome and dismisses lightweight menus. Reuse the native responsive Library; use the existing movable/minimizable assistant. One scrolling body per surface, with close/back and relevant action visible within `dvh`/keyboard-safe bounds.
- Never unmount an active job or discard a draft to make the phone less crowded. Switching surfaces may minimize a panel while retaining a visible working indicator and a reachable Stop. Native outside-dismiss behavior applies to transient UI; dismissing must not mean canceling work. [Official Sidebar documentation](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/sidebar)

### Other workflows without changing mode

| Need while still in Thinking | Reachable route |
| --- | --- |
| Thumbnail/artboard, format, duplicate, export | Templates → **Design** or existing `design-*` / `action-browse-designs` command; selected-artboard toolbar remains unchanged. |
| UI mockup or meme | Templates → **Components / Memes**, or palette search. |
| Import/reference image | Native image tool/paste or `action-import-image`; selecting it reveals the existing shared image toolbox. |
| Background removal, Magic Select/Eraser, Depth Blur, Vectorize | Selected-image toolbox; all options remain available under the same capability rules. |
| Text-to-image or video from a blank canvas | **Generate media** in the shared command catalog/launcher once the separately approved shared composer exists. Never require switching to Lab or inserting a dummy image. This is an existing baseline gap, not delivered by defaults alone. |
| Models, parameters, comparisons, generations/history | Same shared media surface, with the same catalogs/queue/history and account rules as other modes. Videos remain outside scene elements. |
| Assistant and all suggestions | Existing launcher / Cmd/Ctrl+J; **All workflows** retains thumbnail and media suggestions, not just the three Thinking suggestions. |
| Open, duplicate, rename, delete pages; ordinary canvas editing/export | Existing Pages/native editor UI; page commands remain searchable. |

## 3. Scope: defaults, reuse, and distinct additions

### A. Defaults-only MVP — recommended first slice

Supply the Thinking entry to the one common mode registry: heading/copy, three starter references, preferred preset ordering, three assistant suggestion references, and initial `presets` selection with panels closed. Do not add a mode field to scenes/pages, a new route, a tool filter, model defaults, or an auth condition keyed on mode.

This slice depends on shared UI wiring below. “Defaults-only” describes the product behavior, not a claim that the baseline already has a mode switcher or a public assistant-opening API.

### B. Reuse without redesign

| Existing capability | Inspected evidence and limits |
| --- | --- |
| Search and recent pages | `searchWorkspaceCommands` retains caller order for an empty query; matches labels/categories/keywords. Current default result limit is 24. `orderRecentDrawingPages` puts the active page first. |
| Nine editable presets | Comparison cards, quadrants, scatterplot, curves, staircase, funnel, Venn, flywheel. No built-in argument-map or agent-loop preset. The flywheel's learning-in-public labels are not an agent loop. |
| Architecture Library | Three attributed bundled packs, 42 items: User/Server, application server, DBs/cache, Message Q, Pipeline, etc. `prepareDrawingLibrary` preserves personal items and intentionally removed defaults. Do not reseed on mode change. |
| UI components | Native editable wireframing primitives and blocks, not architecture or argument semantics. Keep available without promoting them as the main Thinking entry. |
| Assistant | Existing viewport screenshots, native scene tools, signed budget flow, Stop/minimize, page-keyed transcript. Suggestions currently prepare text without sending, but `useWorkflow` overwrites a nonempty prompt: the new hook must protect drafts. |
| Designs/media/history | Existing shared catalogs and workflows. Image panel currently requires a selected/processing image. Generation history is local IndexedDB, page-keyed, capped at 32 entries by the page—not an unlimited cloud library. |

### C. Required shared wiring/correctness, not separate Thinking systems

1. One registry, empty-state eligibility, selector, pointer Search entry, and lifecycle owner. This task proposes content and behavior only; the originating task owns integration.
2. A UI-only **Open architecture Library** action and assistant **open/prepare draft** hook; reuse existing palette execution and `showAssistant`/`useWorkflow` behavior with draft protection. Expose the same actions everywhere.
3. Shared assistant suggestion ordering, with **All workflows** access; retain existing six design workflows. No new tool interpreter or model route.
4. Focus/topmost-Escape handling for the touched surfaces. Current assistant's global Escape handler can react even when a higher palette is open; the shared integration must avoid closing two surfaces with one key.
5. **Preset undo verification/correction:** `insertPreset` currently omits the explicit `captureUpdate` used by `insertUiComponent` and agent edits. Existing preset tests prove insertion/persistence, not one-step undo. Require a real undo/redo test and an immediate capture in that shared insertion path as needed; do not call it already verified. Excalidraw documents `CaptureUpdateAction.IMMEDIATELY` for immediate undoable local updates. [Official API documentation](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api#captureupdate)

### D. Optional new shared features — separate approval, not prerequisites

| Proposal | Value and trade-off | Recommendation |
| --- | --- | --- |
| Two-lane architecture comparison preset | Removes the third-column cleanup; adds content/testing, not a new layout engine. | First candidate after defaults, only if the existing card start proves too awkward. |
| Agent/tool-loop and claim/support/caveat presets | Better immediate manual starts, especially for users without paid AI. Can use the existing native preset machinery and enter all modes' catalogs. | Most useful next content slice; explicitly separate from the defaults-only approval. |
| Searchable architecture items | Palette search for “queue,” “database,” etc.; requires public item metadata and insert bindings that do not expose private libraries. | Defer; native Library access is sufficient for MVP. |
| Prose notebook | Persistent structured notes alongside figures; introduces storage, account, draft, and document-navigation responsibilities. | Defer. Ordinary text elements and the existing assistant composer cover the first loop. |
| General layout engine | Automatic graph layout beyond existing align/distribute/connect commands; adds graph semantics and edit round-trip questions. | Defer until real complex-graph jobs require it. |
| Mermaid conversion | Useful text-to-diagram import, but a separate import UX with preview/errors/undo and no promise of round-trip synchronization. | Defer. The lockfile already contains `@excalidraw/mermaid-to-excalidraw` 2.2.2 transitively; evaluate supported existing integration before proposing another parser/dependency. No integration was verified here. |
| Shared empty-canvas media composer | Resolves a real discovery gap for text-to-image/video. | Coordinate with media plan; independent shared feature, not a hidden Thinking dependency. All-mode reachability becomes a release gate when it lands. |

## 4. Exact touchpoints and integration ownership

Names for new hooks/registry fields below are proposals, not competing schemas to implement independently.

| Source anchor | Proposed responsibility |
| --- | --- |
| [draw/+page.svelte:74](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:74), `workspaceSection`; [command construction:248](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:248) | Common owner initializes presentation once and adds Library/assistant/Search discovery actions to the existing command list. No mode-filtered command list. |
| [page restoration:434](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:434), [switchPage:507](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:507), [saveScene:1477](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:1477) | Consume resolved account/page state and actual nondeleted scene count for welcome eligibility. Never invoke these page mutation/restoration paths just to switch modes. Auth owner owns any storage correction. |
| [insertPreset:1153](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:1153), [openWorkspaceSection:1210](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:1210) | Reuse insertion; verify/correct one-step undo. Add explicit native Library opening beside existing Workspace opening. Use the native sidebar API, not DOM-click simulation or library reseeding. |
| [React mount:1548](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:1548), `DrawingEditor`, `DefaultSidebar` | Common owner composes one welcome child; bridge updated presentation state into React without recreating editor/root or changing editor key. Existing sidebar tabs stay mounted normally. |
| [DrawAgent integration:1720](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:1720), [page UI:1875](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:1875), [workspace UI:2036](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/routes/draw/+page.svelte:2036), responsive rules at 3077 | Shared selector/Search placement, starter dismissal, compact responsive layout. Keep the agent and image toolbox independent of mode identity. |
| [draw-workspace.js](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/lib/draw-workspace.js:1) | Reuse search/order utilities. Common owner may colocate the small registry or choose one adjacent module; no requirement for a generic plugin/registry framework. |
| [draw-presets.js:485](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/lib/draw-presets.js:485) | Reuse `comparison-cards`; no content edit for MVP. Optional native presets belong here only with separate approval. |
| [draw-library.js:17](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/lib/draw-library.js:17), `prepareDrawingLibrary`; [draw-ui-components.js:532](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/lib/draw-ui-components.js:532) | No planned MVP edits. Preserve catalog contents, attribution, and user deletions. |
| [DrawAgent.svelte:21](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/lib/DrawAgent.svelte:21), `showAssistant` at 92, `useWorkflow` at 306, shortcuts at 350, empty suggestions at 490 | Common open/prepare hook and ordered shared suggestions; protect prompt and transcript. Consume future capability props instead of extending `authenticated` assumptions. |
| [draw-designs.js:10](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/lib/draw-designs.js:10) | Existing workflow catalog is design-oriented. Common owner composes Thinking suggestions with its six entries; do not delete/rename thumbnail prompts independently. |
| [draw-agent-tools.js:235](/Users/swyx/.codex/worktrees/df10/swyxdotio/src/lib/draw-agent-tools.js:235), commands at 686, viewport capture at 738 | Reuse unchanged tools and visible-canvas capture. No mode-specific tool permissions, screenshot exporter, or layout subsystem. |

### Shared hook contract

- **Presentation input:** selected starting experience, resolved account/restore phase, active page identity, whether any nondeleted scene elements exist, and session-local welcome dismissal. No artwork in preset metadata; no private assets in shared examples.
- **Presentation output:** welcome copy/action references, preferred suggestion IDs/order, initial Workspace category. Does not include allowed tools, model choices, page ID, auth flags, or scene data.
- **Explicit action dispatcher:** existing preset command; open native Library; open Workspace category; open assistant/prepare request; dismiss welcome; open palette. No starter dispatch runs inside mount or mode-change effects.
- **Assistant draft hook:** consume each user action once; if draft empty and no run active, fill and focus. If nonempty, show an inline choice to **Append suggestion**, **Replace draft**, or **Keep draft**; default to keeping it. Never silently overwrite. While running, retain the current run and show a non-destructive “finish or stop this request first” state.
- **Media hook:** reference the future shared generation action only when that feature is actually present. Do not ship a dead button or advertise a nonfunctional workflow. This cannot be solved by mapping Generate to Lab.
- **State lifecycle:** default once after readiness, not an effect that forces tabs every render. Changing mode updates presentation only. On nonempty pages, leave all current panels/tabs unchanged; on an untouched empty page, suggestions may change but user-chosen panels/drafts still win.

## 5. Scene, account, loading, and keyboard behavior

| State/action | Required behavior |
| --- | --- |
| New or restored empty page, resolved successfully | Show welcome only if not dismissed for this page during the session and no draft/job is being resumed. Blank drawing is immediately available. No template insert, API generation, model download, asset upload, or style change. |
| Nonempty scene, including image-only, frame-only, or distant/offscreen content | No welcome. Count actual nondeleted scene elements, not visible elements or screenshot pixels. Retain viewport/zoom, selection, files, scene IDs, pending save, and undo/redo. |
| Draw, choose tool, dismiss, undo/delete back to empty | Do not pop the welcome back up mid-edit. Session-local dismissal stays set. **Show starters** is explicit and available in the starting-experience control for an empty page. |
| Mode change on any page | No page creation/switch, `resetScene`, `history.clear`, editor remount, style/model reset, file upload, default-library reseeding, or generation-history change. No mode preference serialized into the drawing. |
| Selected image / no selected image | Preserve selected-image editing and processing exactly. Without a selection, generation uses the separately approved shared composer; local image tools explain their image requirement. Mode is never the prerequisite. |
| Anonymous | Manual drawing, local presets/Library, import/export and available local tools work. Generic assistant examples are visible, but paid send stays behind the shared authorization UI; **Draw it yourself** never requires login. |
| Signed in, not entitled to paid AI | Account sync follows the auth contract; being signed in is not paid authorization. Same starters, no owner allowance exposed. Explain the missing capability rather than suggesting mode switching. |
| Entitled user | Same UI plus explicitly authorized assistant/media actions; retain cost/upload disclosures, spending cap, progress and Stop. Mode does not expand permissions. |
| Account identity unknown/changing | Hide previous account's titles, scene, transcript, media history, and preferences while the auth owner resolves the new scope. Do not seed a new account from the previous one or show blank success during uncertainty. |
| Account changes during work | Auth owner handles safe save/quarantine/cancel and rejects stale callbacks. Mode layer discards stale presentation events, never replays a previous account's prompt/job, and never promises cross-account continuation. Same-account mode changes, unlike account changes, preserve work. |
| Restoring or switching page | Show restrained loading/status, not the empty welcome. Eligibility starts only after the selected account/page has resolved. Mode selection can affect later copy, not race restoration or select a different drawing. |
| Restore failure / missing scene / storage failure | Show recovery and honest save status, not “new empty drawing.” Retry or explicitly start a separate blank page without replacing the unresolved scene. A confirmed browser-only empty page is valid; an unavailable cloud page is not proof of emptiness. |
| Assistant/model failure or in-flight job | Keep draft/history/error/progress and explicit Retry/Stop. Opening a suggestion or switching modes never retries, aborts, or launches another job. Hiding/minimizing is not canceling. |

**Auth boundary:** the separate task **Upgrade tools to Google auth** (`01a03c36-6319-7cd3-96de-f825b83d263d`) owns identity, tenant-scoped browser/cloud data, and paid-AI/publishing permissions. This plan needs its resolved scope/capabilities and lifecycle hooks; exact interfaces are intentionally not invented. No BYOK, credits, sharing, or auth/storage migration is included.

The baseline still uses `toolsAuthenticated`, unscoped local keys, and a `loadInitialPage` path that can POST a first page and PUT an old local scene. Those are **not** approved future account semantics or evidence of a zero-upload entry path. Coordinate the restoration/no-auto-upload contract with the auth/common owners before build integration. Mode entry itself must introduce no writes/uploads; ordinary authorized restoration reads and previously pending user saves are distinct from mode-triggered work.

**Keyboard/focus:** preserve Cmd/Ctrl+K for palette, arrows/Enter to select, Cmd/Ctrl+J for assistant, Cmd/Ctrl+Enter for explicit Send, and multiline Enter for newline. No mode-switch shortcut is needed. Escape closes only the topmost transient surface and restores focus to its trigger; on welcome it dismisses without clearing the scene. Clicking native canvas/tools must remain possible. Menus close on outside click; an active operation/draft must survive dismissal. Test mouse, touch, keyboard-only and soft-keyboard layouts. Check visible focus and accessible labels; do not steal focus during restoration or mode change.

**Viewport disclosure:** the screenshot helper samples only the rendered static canvas, so welcome/menus must remain DOM UI and never be rasterized into scene content. However, agent commands can inspect scene data beyond that screenshot. “Sees your visible canvas” is a framing description, not a promise that offscreen elements are inaccessible. Preserve existing shared authorization/data disclosure; do not turn viewport position into a privacy boundary.

## 6. Focused acceptance plan — after build approval

Extend existing tests/fixtures; do not start a separate exhaustive testing framework. Use the auth task's account fixtures, not a new password-login path. All inference is mocked; default tests fail on unexpected provider/model-download traffic.

| Test and existing home | Proof required |
| --- | --- |
| Registry/discovery contract — [draw-workspace.test.mjs](/Users/swyx/.codex/worktrees/df10/swyxdotio/tests/draw-workspace.test.mjs) | For the **same account/capabilities**, all three modes resolve the same command, preset, design, component, model, and agent-tool IDs; only welcome/ranking differs. Every starter reference resolves. Search reaches items beyond the first 24; recent-page order is not mode-dependent. |
| Safe empty state — [draw.spec.js](/Users/swyx/.codex/worktrees/df10/swyxdotio/tests/draw.spec.js), [draw-pages.spec.js](/Users/swyx/.codex/worktrees/df10/swyxdotio/tests/draw-pages.spec.js) | Delay restoration, resolve empty/nonempty, reject it, and pan a nonempty scene offscreen. Welcome appears only for resolved empty scenes. Blank creates no elements/page/artboard. Delete/undo back to empty does not reopen dismissed welcome. |
| Mode invariance — same suites | Seed shapes + image/files + selection/viewport, establish an undo then redo opportunity, set assistant/media drafts/model parameters and history. Cycle modes and compare scene payload, active page, selection, viewport, drafts, library/history and IDs. Undo/redo still affects the original edit, not the mode switch. No editor remount or extra cloud scene save caused by mode selection. |
| Explicit starter semantics — [draw.spec.js](/Users/swyx/.codex/worktrees/df10/swyxdotio/tests/draw.spec.js), [draw-presets.test.mjs](/Users/swyx/.codex/worktrees/df10/swyxdotio/tests/draw-presets.test.mjs) | Entry inserts nothing. Clicking Compare inserts exactly one existing three-card preset with fresh IDs and keeps prior artwork. One native Undo removes only it; Redo restores it. Opening Library inserts nothing; deliberate item insertion remains editable/undoable. Preserve existing catalog tests. |
| Cross-mode functional reachability — existing draw/design/image suites | Parameterize one route-through test over **Thinking/Studio/Lab**, never switching mode within the test: open each Workspace tab/native Library, search/insert a preset and component, create a design, import/select an image, reach every local image action, all model groups/settings/history, assistant/workflows, page operations and native export. Assert current mode unchanged after each route. An entitled fixture reaches authorized controls; unauthorized fixtures get identical restrictions in all modes. |
| Assistant draft and viewport safety — [draw-agent.spec.js](/Users/swyx/.codex/worktrees/df10/swyxdotio/tests/draw-agent.spec.js), [draw-agent-tools.test.mjs](/Users/swyx/.codex/worktrees/df10/swyxdotio/tests/draw-agent-tools.test.mjs), [draw-designs.spec.js](/Users/swyx/.codex/worktrees/df10/swyxdotio/tests/draw-designs.spec.js) | Click each suggestion: zero requests until explicit Send. Keep/append/replace respects a nonempty draft. Mode change during a delayed mocked run preserves transcript, operation and reachable Stop. Both new and existing six design workflows remain discoverable. Capture excludes welcome UI; existing visible/offscreen inspection and bound-connector tests stay valid. |
| No entry-triggered inference — draw/agent/image suites | Spy on assistant, fal generation/queue creation, uploads and local-model fetches/workers during entry, mode selection, welcome dismissal, Library opening and prompt preparation. Expect zero new dispatches. Allow required same-account session/scene reads and attributable preexisting jobs; do not incorrectly require zero total network traffic. |
| Accounts/restoration — auth-owned fixtures plus [draw-pages.spec.js](/Users/swyx/.codex/worktrees/df10/swyxdotio/tests/draw-pages.spec.js) | Anonymous, signed-in/nonentitled, entitled and A→B account transitions: same manual starters, no paid authorization via mode, no stale account scene/title/draft/history/default upload, no replay of A's pending prompt. Unknown identity/load failures never render successful empty state. |
| Desktop/mobile/keyboard — [draw.spec.js](/Users/swyx/.codex/worktrees/df10/swyxdotio/tests/draw.spec.js) and focused existing responsive tests | At desktop, 390×844 and 320 px: blank and primary starters reachable, native toolbar unobstructed, no horizontal overflow or overlapping initial panels, 44 px new touch targets, long page names contained. Test both Meta/Control chords, topmost Escape/focus return, pointer palette entry, and soft-keyboard access to Send/Stop. Inspect screenshots after implementation; do not infer visual quality from DOM tests alone. |

When the shared empty-canvas composer lands, add its all-three-modes empty-scene invocation to the reachability test, including text-to-image with no reference and video remaining outside the scene. Do not mark that requirement satisfied merely because the selected-image path works. Existing library personal-item/deletion and image geometry/native-undo tests should remain unchanged except for shared auth fixtures.

Verification order after approval: focused pure unit tests; shared auth-adjusted browser smoke and inference-mocked flows; desktop/phone screenshot inspection. Broad live-model tests, publication and paid inference remain outside this planning approval.

## 7. Material choices for approval

| Choice | Recommendation | Trade-off / alternative |
| --- | --- | --- |
| Name and first entry | **Thinking**, explained by “Diagrams & essay figures”; recommend it as the new-user default. Reopen the current account's last resolved page before showing any welcome. | “Diagram” is more literal but undersells argument/essay work. Final naming/default is reconciled once across the three plans. |
| Initial panels and selector | Panels closed; three welcome rows + Blank. Desktop compact selector beside Pages; mobile selector in welcome and Pages menu. | Auto-open Presets improves catalog exposure but consumes canvas/phone space. |
| MVP content | Reuse three-column comparison and architecture Library; offer an unsent argument request plus a manual blank path. | Requires manual cleanup and is less instant for argument maps. Approve new native presets separately if that friction is unacceptable. |
| Preference persistence / URLs | **Session-only for MVP**, shared between pages in that active account session; no scene field or URL parameter. Defaults reset on account change; returning drawing restoration remains account-owned. | A tenant-scoped remembered preference and a shareable entry URL are useful later, but need their own precedence/persistence decision after auth lands. |
| Writing/layout additions | Defer notebook, general graph layout, Mermaid UI, architecture search, and special essay artboards. | Less automation initially; keeps the first version within the existing editor and tests. |

Approval here selects this experience's scope and recommendations only. It does not authorize an independent common-layer refactor, auth work, paid calls, or immediate build. The originating task reconciles one registry/empty-state/switcher after all three plans are approved. This task stops at this single Markdown artifact.

Awaiting your approval; no build started.
