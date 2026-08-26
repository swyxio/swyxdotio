# /draw workspace modes: shared planning brief

> Historical planning brief. The user subsequently approved all three tracks and explicitly authorized the originating task to decide and implement the central layer. The old planning-only and pending-auth gates below are retained as history, not current restrictions. See [the current integration record](./draw-shared-integration-plan.md) for actual ownership, contracts, verification, and release status. The implemented names are Thinking, Thumbnails, and Experiment.

Status: shared mode foundation remains planning-only. Track-specific approvals are recorded below; approval in one task does not authorize another track or the shared foundation.

Source baseline inspected: `7d5aced` on `origin/master`. Stable auth/logging checkpoint `0a6e570` (following `cfbfda4`) is committed locally but not on remote master at the latest consolidation check. Recheck source before implementation. See [shared integration plan](./draw-shared-integration-plan.md) for current ownership, overlaps, and release dependencies.

## User decision

Keep one Excalidraw application with three useful starting experiences:

1. Diagramming and systems thinking for thoughtful essay writing.
2. Thumbnails for AI Engineer conference videos and Latent Space podcasts.
3. Image/video model experimentation, including privacy-sensitive adult experimentation within applicable provider rules.

**Every mode exposes the same functionality. A mode changes only the empty-page experience and the initial active UI selections.** It is not a feature gate, document type, permission tier, or separate editor. The names Thinking, Studio, and Lab are working labels, not a naming decision.

These are default experiences available to all users, not Swyx-only pages populated with his personal data.

## Shared contract for all three plans

- Use the same `/draw` route, Excalidraw scene format, pages, command catalog, agent tools, model catalog, image tools, history, and export capabilities.
- Change welcome copy, starter suggestions, template ordering, suggested assistant requests, and the initial panel/tab selection. All other tabs, commands, and workflows remain reachable without switching modes.
- Keep authorization independent of mode. Anonymous, signed-in, owner, and other entitled users retain the same rights whichever mode they choose. A mode must not grant access to another person's data or server-funded inference.
- Opening or switching a mode never inserts sample artwork, rewrites styles, resizes an existing image, resets prompts/model settings, clears selection/history, starts inference, downloads models, or uploads anything. Creating an artboard or inserting a starter is a separate explicit action with native undo.
- Welcome/empty-state UI is presentation, not scene content: it is not exported, cloud-synced as drawing elements, or captured as artwork by the assistant.
- Existing and restored drawings open intact. Treat restored data, loading, empty pages, an empty viewport of a nonempty scene, and failures as distinct states. Do not show an empty-page welcome just because the user panned away from their drawing.
- Apply initial UI defaults deliberately on entry; do not continuously force the active tab and fight subsequent user choices. Preserve in-flight jobs and drafts when changing the starting experience.
- Keep ordinary blank Excalidraw immediately available. Do not force a questionnaire, login, or template selection before drawing.
- Retain the current compact, draggable/minimizable panels, one scrolling container per interaction surface, Escape/outside dismissal, and both Cmd/Ctrl shortcuts. Avoid opening several overlapping panels automatically on phones.
- New capabilities discovered during a plan belong to the common application and must be reachable from every mode. Mark them as shared dependencies or later proposals, not mode-exclusive features.
- Public starters must use safe, generic examples and cleared public brand assets. Personal headshots, prompts, generations, reference images, private libraries, and brand kits must never become everyone's defaults.
- Default costs are zero: no cloud jobs, preloaded large models, publication, or uploads on page entry. Any paid action remains explicit and accurately disclosed.

## Current implementation to reuse

| Area                   | Existing entry points and evidence                                                                                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor and UI state    | `src/routes/draw/+page.svelte`: Svelte host for React Excalidraw, page state, native Library integration, selection and tool panels. `workspaceSection` currently starts at `presets`.                                                                                                                        |
| Discovery              | `src/lib/draw-workspace.js`: searchable commands and recent-page ordering. The page's `workspaceCommands` already includes template/component/meme discovery, image import, new/duplicate pages, and existing pages.                                                                                          |
| Diagramming            | `src/lib/draw-presets.js`, `draw-ui-components.js`, `draw-library.js`, and `draw-libraries/`: native editable presets and architecture libraries. Existing presets include comparison cards, quadrants, curves, funnel, Venn, and flywheel.                                                                   |
| Design assets          | `src/lib/draw-designs.js`: native editable artboards, formats, templates, and assistant workflow suggestions. YouTube 1280 x 720, social, square, portrait, story, and slide formats already exist.                                                                                                           |
| Branding gap           | Latent Space and FDE thumbnail templates exist. AI Engineer currently has a portrait speaker card and a keynote slide; neither is an approved conference-video thumbnail template. Ground a new proposal in the user's actual AIE references.                                                                 |
| Media workflows        | `src/lib/DrawImageToolbox.svelte`, `draw-fal-models.js`, `draw-fal-image.js`, `draw-fal-queue.js`, and `server/draw-fal.js`: model search, grouped multi-selection, model-specific parameters, prompt presets, queue progress/cancel, resizing, estimates, and authenticated proxy.                           |
| Empty-canvas media gap | The image toolbox currently renders only when an image is selected or processing. Text-to-image is in that toolbox even though it does not need a reference. Plan a shared generation entry point that can start from an empty canvas; do not require a dummy image or make that capability exclusive to Lab. |
| Local image tools      | Background removal, Magic Select, Magic Eraser, Depth Blur, and SVG vectorization already exist and remain available from every mode.                                                                                                                                                                         |
| History                | `src/lib/draw-generation-history.js` and page integration: IndexedDB history with original references, prompt, model/workflow/settings, and parent lineage. It is currently page-keyed and capped at 32 entries by the page; do not describe it as an unlimited cloud asset library.                          |
| Agent                  | `src/lib/DrawAgent.svelte`, `draw-agent-tools.js`, `draw-agent-shell.worker.js`, and `server/draw-agent.js`: shared tool commands, bounded sandbox and budgets, visible-viewport screenshots, native scene edits, and iterative visual review.                                                                |
| Storage                | Native undo, local persistence, and Cloudflare drawing sync already work. The inspected scene limit is 1,800,000 bytes. Videos are outside the Excalidraw scene; do not embed bulky histories or video files into cloud scenes.                                                                               |

Inspect these paths in your own worktree before relying on exact interfaces. Existing tests include `tests/draw.spec.js`, `draw-pages.spec.js`, `draw-designs.spec.js`, `draw-image-tools.spec.js`, `draw-agent.spec.js`, and focused `draw-*.test.mjs` suites.

## Concurrent authentication/tenancy work

The active Codex task **Upgrade tools to Google auth** (`01a03c36-6319-7cd3-96de-f825b83d263d`) is replacing shared-password access with Google identity and account-scoped cloud/browser data. The user subsequently approved **funded AI for all signed-in users**, with per-account/site quotas and disclosed usage logging. The earlier owner-only AI assumption is superseded. Podcast publishing and other separately scoped administrative actions are not opened by this AI permission change.

The user also approved `/tools/logs`, with the owner able to inspect everyone's activity metadata and other users limited to their own. This is not approval to reveal private prompts, reference images, generated assets, source transcripts, or unlisted-video URLs. Logging and generation history are different data domains.

Implementation worktree: `/Users/swyx/.codex/worktrees/swyxdotio-google-auth`. Stable checkpoint `0a6e570c0254d431c05d4f9d49cb23719d813f21` adds activity logging to `cfbfda4`, which includes `b526c4c` Google auth/tenant isolation and funded-AI quotas/usage. Commit existence and ancestry were verified by the originating task. Real owner consent and validated owner identity are still pending; no merge/deploy is authorized by this handoff. Mode and feature tasks consume this boundary and do not implement competing auth migrations, quota ledgers, or identity adapters. Mode choice never changes entitlement. BYOK, user-funded credits, public asset sharing, and cross-account content access remain separate decisions.

## Three independent planning tracks

### Diagramming and essay thinking

Plan an immediately usable default for architecture, agent/data-flow diagrams, comparisons, argument maps, and explanatory figures. Favor a small set of high-value starters and the existing architecture library. Use actual tasks such as outlining an agent system, contrasting two technical approaches, or turning rough essay notes into a diagram. Separate the initial UI/defaults slice from later notes panels, Mermaid conversion, or new layout engines. No new writing application is assumed.

### AI Engineer and Latent Space thumbnails

Plan separate AIE conference-video and LS podcast starter treatments inside the same mode. Use the user's real brand/template guidance, not generic invented branding. Cover talk/episode inputs, real reference headshots, editable headline/logo/portrait layers, 16:9 format, timestamp clearance, small-size preview, variants, and export. Show exactly what is already reusable and what is a missing asset or proposed capability. Preserve the distinction between conference-video thumbnails and speaker-announcement cards. Publishing and YouTube account integrations are not part of the defaults slice.

### Image/video experimentation

Plan a prompt-first empty-state and shared generation entry point, reference attachment, easy switching between modalities, multi-model comparison, transparent cost and parameters, queue/result handoff, reproducible history, and local-versus-upload disclosure. Account for provider-dependent adult-content support and private-by-default sensitive assets without explicit public examples or safeguards bypasses. Separate baseline defaults from larger features such as durable cloud media storage, first/last-frame workflows, or a video editor. Do not call paid endpoints for research or examples.

## Shared foundation proposal to approve once

Use a small mode-preset registry and one shared empty-state/switcher integration. Each preset would reference existing action/template/command IDs and initial UI selections. Do not create three routers, duplicated editors, tool registries, auth systems, or media pipelines.

No implementation names or schemas are fixed yet. The common foundation will have a single owner after the three plans are reviewed; each planner should propose its preset and list the hooks it needs rather than independently refactoring `+page.svelte`.

Keep these decisions explicit for manual approval:

- Final names, default mode, and how a returning user reopens a prior drawing.
- Where the mode switch and new-page choices appear on desktop and mobile.
- Preference persistence: account/browser versus per-page; whether an optional URL parameter selects a starting experience. Do not put mode into the scene format without a demonstrated need.
- Whether a chosen starter action creates an artboard immediately; merely entering Studio does not create one.
- How the shared empty-canvas media composer coexists with selected-image editing and the native Library.
- Which small defaults-only changes ship first and which proposed capabilities are deferred.

## Required deliverable from each planning task

Produce a concise, source-grounded plan, optionally as one Markdown planning artifact in that task's own worktree. No application implementation.

1. The desired first 30 seconds, with three realistic user jobs.
2. A desktop and narrow-screen wireframe or clear layout description, including the initially active UI and how to reach the other workflows without changing modes.
3. A small MVP split into reuse, required new work, and deferred ideas. Separate defaults-only work from shared feature additions.
4. Exact code touchpoints, shared-foundation/auth dependencies, and proposed ownership boundaries.
5. Behavior for empty/existing drawings, selected/unselected images, anonymous/signed-in/entitled users, account changes, and loading/error/in-flight states.
6. A focused test plan: mode switching never changes scene/history; each authorized capability remains reachable in all three modes; no entry-triggered network inference; keyboard/mobile and native undo still work.
7. Material choices requiring the user's approval, each with a recommendation and tradeoff; don't re-ask the shared contract or invent unnecessary decisions.

End with **Awaiting your approval; no build started.** The user will approve each plan manually in its own task. Planning approval must not be inferred from this brief, the general merge/deploy preference, or work on another mode. Do not implement, install packages, commit/push, merge, deploy, provision services, publish, or spend during this stage.

## Coordination record

This brief is a local planning artifact in the originating task and is intentionally uncommitted. New planning worktrees should read it by its absolute path; do not assume it exists on `master`.

- Diagramming/essay task: `01a03c45-0d08-7932-9e33-b5e295e7cecf`; worktree `/Users/swyx/.codex/worktrees/df10/swyxdotio`.
- Thumbnail task: `01a03c45-6a88-7012-b92a-084227785c1a`; worktree `/Users/swyx/.codex/worktrees/1128/swyxdotio`.
- Image/video experimentation task: `01a03c45-d60c-7352-b73d-16aa2fbbe878`; worktree `/Users/swyx/.codex/worktrees/6639/swyxdotio`.

All three were created as separate user-owned planning tasks from the saved Git project, with isolated worktrees and no model override. Their prompts repeat the shared contract and explicit manual-approval gate. Task creation is not plan approval or build authorization.

### Thinking scope approved in its own task

The diagramming task reported the user's approval to implement this bounded shared-capability slice:

- Three native editable starters: two-architecture comparison, agent/tool loop, and argument map.
- Rough notes to diagram and make-selection-essay-ready actions through the existing assistant.
- Source-grounded visual treatments informed by Swyx's essays.

Implementation owner: `01a03c45-0d08-7932-9e33-b5e295e7cecf`, branch `codex/draw-thinking-start`, worktree `/Users/swyx/.codex/worktrees/df10/swyxdotio`. This records the reported approval and implementation start, not a completion or deployment claim.

The shared mode registry, switcher, preference persistence, and common empty-state layer remain owned by the originating task and are not approved for implementation by this handoff. Auth and tenancy remain owned by the Google-auth task. Other track approvals are recorded separately below.

Integration boundaries for Thinking: add starters/workflows to the existing shared discovery and assistant surfaces, keep any route/UI entry edits narrow, and make these actions reachable in every eventual mode. Do not add a Thinking-only feature gate or new permission path. Supply stable action/template IDs, exact entry hooks, touched files, and native undo/selection tests with the completed handoff. Recheck and integrate the latest `origin/master` before release because authentication work overlaps the route and assistant components.

### Experimentation scope approved in its own task

The user approved the simplified first working layer in task `01a03c45-d60c-7352-b73d-16aa2fbbe878`: shared optional-reference composer and provider facade, bounded comparison boards, remix, saved modifiers/references, panel-independent in-session queue, and cost controls. Reference mixing, first/last-frame video, and expanded agent iteration remain later layers.

Implementation: branch `codex/draw-experimentation` in `/Users/swyx/.codex/worktrees/6639/swyxdotio`, based on committed auth checkpoint `cfbfda4`. The task owns the structural `DrawImageToolbox.svelte` work and its generation-domain modules, but preserves auth's narrow instrumentation updates. It will supply shared Generate/History entry hooks, not a private mode switcher. This is work in progress, not a completion claim.

### Thumbnail scope approved in its own task

The user approved the expanded plan in task `01a03c45-6a88-7012-b92a-084227785c1a`: per-user assets/brand kits, versioned house prompts/reference bundles, saved channel references, transcript/quote/title extraction, diverse candidates and feedback, editable native layout/typography, multi-format adaptation, and exports.

Implementation: branch `codex/draw-thumbnail-workflow` in `/Users/swyx/.codex/worktrees/1128/swyxdotio`, now based on auth checkpoint `cfbfda4`. This exceeds the original defaults-only proposal. Its assets/prompt/version and batch needs overlap Experiment and must use common records/services as described in the shared integration plan. It does not own a second composer, provider pipeline, mode registry, or auth system. This is work in progress, not a completion claim.
