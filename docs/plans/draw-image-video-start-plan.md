# /draw experimentation — simplified plan

**Approved for the first implementation layer.** Keep the AI-native Canva/Figma direction, build it in working layers, and keep providers replaceable. Source inspected at `7d5aced`; the [shared brief](/Users/swyx/.codex/worktrees/3c03/swyxdotio/docs/plans/draw-workspace-modes-brief.md) still governs. User approved implementation after this plan; no paid calls or deployment are authorized. The implementation checkpoint below supersedes earlier browser-only saved-library assumptions. The roadmap below incorporates the user's ten requested directions without making them ten separate systems.

## 1. The experience

One **Generate** panel in the existing Excalidraw app. Experiment opens it on a fresh empty canvas; every other mode can open the same panel. Modes change starting content and initial UI selection only—not tools, models, permissions, billing, or existing work.

Three starters, all generic and text-only:

| Job | First action | Result |
| --- | --- | --- |
| Try an editorial illustration across models | Write a prompt; optionally select several models | Compare labeled results, then add the preferred image or a variation board to the canvas |
| Improve lighting on an image | Attach one reference or use a selected image | Preview a new result, or explicitly edit the selected canvas image |
| Animate a product still | Attach/use one image; choose an image-to-video model | Play/download the clip outside the canvas |

A starter fills a draft, never runs it. No personal examples or automatic reference attachment.

**Desktop:** keep the canvas and native toolbar, with one compact draggable/minimizable Generate panel on the right. **Mobile:** the same panel becomes a bounded bottom sheet with one scrolling body; no automatic keyboard, Library, or assistant opening.

```text
Generate                         [−]
[Describe what you want…           ]
Reference: none  [Attach] [Use selected]
[Models ▾]       [Supported settings]
Destination · upload/privacy notice
Estimated cost · funding/access state
[Generate]
Preview / Compare · Recent / Saved
```

Initial choices: AI prompt active; text-to-image workflow; blank prompt; no reference; model picker closed with text-to-image first when opened. Use one low-cost text-to-image default from the shared catalog, not a provider/model ID embedded in the mode. Keep current supported model settings; no preselected batch or video model. Library and assistant stay closed. **Start drawing** dismisses the panel without clearing its draft.

## 2. Build only the missing shared pieces

**Reuse:** existing model search, open/closed grouping, All/None, batch selection, model-specific settings and estimates, editable presets, queue/progress/cancel, local image tools, history, and native undo. No redesign of these.

**Defaults-only work:** welcome text, starter ordering, and one-time panel opening through the originating task's common mode layer.

**Necessary shared feature:** remove the selected-image requirement from generation. Both the page's `activeImageToolId` gate and the toolbox's unconditional `selectedImage()` call currently block an empty canvas, although prompt-only transport already exists. Make the reference optional—no dummy image.

Keep reference and output destination separate:

- **Prompt only:** send no image. Preview/history first; explicit **Add to canvas** creates one undoable image.
- **Attached reference:** file/paste stays in the composer, outside scene sync, until explicit submission. Preview/history first; add when wanted.
- **Selected-image edit:** retain existing direct replacement and native undo, clearly labeled before submission. Preserve the original and completed variants in bounded history.
- **Image-to-video:** preview/history and explicit download; no video bytes in the canvas.

History remains reachable without a selection. Previewing or restoring a recipe does not generate; adding/replacing artwork is explicit. Keep one panel instance and its draft/job state alive when minimized or switching modes.

## 3. A thin provider facade

```text
Generate UI + shared catalog
          ↓
Shared generation facade / existing app API
  authorization, budget, job ownership
          ↓
Provider adapter
  fal today; another adapter when needed
```

Use a small interface, not a plugin framework:

| Shared contract | Adapter responsibility |
| --- | --- |
| Model descriptor: stable key, workflow, supported references/settings, estimate, disclosure | Supply existing model definitions and provider-specific limits/pricing rules; declare multiple-reference and first/last-frame support only when verified |
| `submit(request)` → job handle | Translate prompt/reference/settings into the provider request |
| `status(job)` → queued/running/completed/failed + outputs | Translate polling, progress, errors, and image/video results |
| `cancel(job)` → confirmed/requested/unsupported | Report what the provider actually supports; never invent cancellation certainty |

The UI consumes descriptors and normalized results. Provider-specific settings remain available through the existing controls; do not flatten every model into a lowest-common-denominator parameter set. Distinguish the **hosting adapter** from the **model maker**—a Google model served through fal still uses the fal adapter.

Keep credentials, endpoint mapping, provider job IDs, upload transport, safety-policy translation, and media-host validation inside the server adapter. The shared server boundary enforces account access/budget/job ownership before invoking it. Jobs stay bound to their original adapter and account; model changes cannot reroute an existing job. Browser-side reference preparation uses descriptor limits, not fal-specific conditionals.

Wrap/refactor the existing fal implementation into the first adapter. Keep one app API, queue UI and history format; don't add a second endpoint or orchestration system just for this change. History records adapter/model identity and effective settings so a later provider can use the same workflow. One frozen recipe, batch of jobs, and set of results feed both comparison and remix. No automatic provider fallback or retry that could spend twice or bypass policy. A fake adapter in tests proves the boundary without integrating another service now.

## 4. Rules that must survive simplification

| Situation | Behavior |
| --- | --- |
| Loading or failed restore | Do not mistake it for an empty page or overwrite recoverable work |
| Existing scene, selection, draft or in-flight job | Mode switches preserve them; no forced panel defaults, viewport/style changes, or history reset |
| Empty scene | Apply defaults once; welcome is UI, not exported/saved artwork or assistant screenshot content |
| Missing reference / multiple selected images | Explain the prerequisite; never silently pick or upload an image |
| Anonymous / signed-in / quota-limited | Same public UI. All signed-in users may request funded AI within server-enforced account/site limits; guests can compose and use local tools |
| Account change | Isolate outgoing drafts/history/jobs; reject stale results entering another account. Auth task owns this boundary |
| Running / failed / canceled | Visible progress and Cancel; retain completed results and draft. Snapshot source, target, page and account. Changed/deleted targets cannot be overwritten; retain output for recovery |
| Page navigation during a job | Small MVP: finish or explicitly cancel before switching pages; no background job system |

Nothing runs, uploads, downloads a model, or fetches old video media on mode entry. Submission is explicit and shows total estimate, funding source, reference destination and output destination. Estimates are not spending caps. Cancel may not stop/refund provider work already running.

History is currently page-keyed browser IndexedDB, capped at **32 entries** by the page—not unlimited cloud storage. Show storage failures. Preserve saved recipes, without promising byte-identical reproduction. Videos stay outside the **1.8 MB cloud scene**; provider URLs may expire. Local processing does not imply that an inserted canvas result stays off cloud sync.

Provider content/privacy rules belong to each adapter plus shared product policy, not to Experiment mode. Keep safeguards enabled and expose restrictions accurately. The earlier documentation check found that fal prohibits sexually explicit content and its CDN links default to public-by-link; those are **fal constraints, not assumptions about future providers**. Do not promise private sensitive-media handling until its storage/access rules are explicitly approved and verified. [fal policy](https://fal.ai/legal/acceptable-use-policy), [media access](https://fal.ai/docs/documentation/model-apis/file-access-controls).

## 5. Touchpoints and ownership

- [Page host](/Users/swyx/.codex/worktrees/6639/swyxdotio/src/routes/draw/+page.svelte) + [toolbox](/Users/swyx/.codex/worktrees/6639/swyxdotio/src/lib/DrawImageToolbox.svelte): shared launcher, optional reference, preserved state and output handoff. Originating task owns the common mode registry/switcher; no separate mode implementation here.
- Existing [catalog](/Users/swyx/.codex/worktrees/6639/swyxdotio/src/lib/draw-fal-models.js), [preparation](/Users/swyx/.codex/worktrees/6639/swyxdotio/src/lib/draw-generation-image.js), [queue](/Users/swyx/.codex/worktrees/6639/swyxdotio/src/lib/draw-generation-client.js), and [server](/Users/swyx/.codex/worktrees/6639/swyxdotio/src/lib/server/draw-generation.js): separate reusable facade from fal details; reuse working internals.
- [Scene helpers](/Users/swyx/.codex/worktrees/6639/swyxdotio/src/lib/draw-image-scene.js) + [history](/Users/swyx/.codex/worktrees/6639/swyxdotio/src/lib/draw-generation-history.js): undoable insertion, size checks, provider-neutral recipes.
- **Upgrade tools to Google auth** owns tenancy and owner-funded AI. Consume its landed contract; do not design auth migrations here. [Assistant](/Users/swyx/.codex/worktrees/6639/swyxdotio/src/lib/DrawAgent.svelte) uses the same access/disclosure rules and stays opt-in; expanded agent commands are not required for this start.

## 6. Product roadmap: three working layers

### First: generate → compare → remix

Build on the empty-canvas composer and adapter boundary above:

| Suggestions | Small implementation |
| --- | --- |
| **1 + 10. Variation boards / model arena** | One comparison view, not two features. An explicit **Generate variations** action runs selected models concurrently within provider limits and the approved budget. Show labeled cards as results finish. **Add comparison board** automatically arranges successful image outputs and labels into a native grid in one undoable insertion. Record provider/model, elapsed time, estimated versus reported cost, and optional personal quality notes. |
| **3. Prompt remix** | **Remix** copies a previous recipe into the same composer: prompt, references, model, supported seed/settings. It creates a child result on explicit generation; it never rewrites the original. |
| **4. Persistent modifier/reference library** | **Saved** uses the shared private account library for named prompt modifiers, recipe snapshots and explicit reference/image uploads. Keep it separate from the 32-entry device-history cap; show quota failures. Appending a modifier copies its text into the draft. Video saves keep recipes only, not clips or expiring URLs. No unlimited retention promise. |
| **7. Cost guardrails** | Reuse estimates; add an explicit per-run spending authorization and configurable confirmation threshold. Reserve budget server-side before concurrent submissions; retries and later agent steps share the same budget. Distinguish an estimated-cost cap from a guaranteed billing ceiling; unknown/unbounded costs require review, not unattended spending. |
| **9. Generation queue** | Extend the existing queue into one panel-independent job list: progress, cancel, retry failed items explicitly, and completed outputs survive tool/mode switching. Reload-resumable execution is a separate durability decision. |

Comparison uses the same prompt and source references, but displays effective per-model settings and any resized inputs. A shared seed does not make different models equivalent. Quality notes are personal judgments, not invented benchmark scores; latency is measured end-to-end, not mislabeled as pure inference time. Video comparisons stay in the preview panel, outside native scene storage.

### Next: better reference control and video

**5. Reference mixing:** attach several selected canvas images, reorder them, and assign composition/identity/style/product intent. Enforce endpoint limits. If a provider only supports ordered references plus prompt instructions, label those roles as guidance—not a guaranteed native control.

**2. First/last-frame video:** two explicit image slots, **Swap**, motion prompt, compatible model, estimate, Generate. Never silently discard the last frame. This is endpoint-specific capability, not something all “image-to-video” models inherit.

**Grok verification:** current xAI docs describe starting-image and multi-reference workflows, not a first/last-frame pair; Vercel's Grok 1.5 integration explicitly says ending-frame input is ignored. Keep the requested workflow, but mark Grok support unverified pending an actual supporting endpoint. Multi-reference guidance or extending a clip is not equivalent to ending-frame conditioning. [xAI video workflows](https://docs.x.ai/developers/model-capabilities/video/generation), [Vercel Grok 1.5 API](https://vercel.com/ai-gateway/models/grok-imagine-video-1.5/api).

**6. Model recommendations:** start with explainable catalog rules: compatible references/workflow first, then user preference for cost, speed or quality. Use dated curated guidance or measured observations; unknown stays unknown. Suggest, never silently change the model or hide the full catalog. No recommendation agent is needed.

### Then: agent-driven iteration

**8. “Make five stronger thumbnails”:** the assistant uses the same recipes, jobs, boards and budget—not a separate pipeline. User approves reference/screenshot access, batch size, maximum rounds and spending limit; the assistant generates, critiques and proposes improvements with a visible Stop. Count critique-model costs too. Keep every round and label agent judgments; human chooses the final output. No automatic publication.

These are shared capabilities in all three modes. Implement each layer only after the previous one works end to end. Durable video media, sharing, BYOK/credits and a video timeline remain separate product decisions; the shared private image/reference library was subsequently approved.

## 7. Verify before expanding

Extend existing drawing, image-tools, scene, queue and server tests with mocked providers: empty-canvas generation; reference-free requests; all tools/models reachable in all modes; zero automatic spend; preserved drafts/jobs/scene on switching; tenant and stale-target isolation; progress/cancel/errors; history limits; video exclusion; native undo/redo. Test the facade against fal fixtures and a fake second adapter. Add focused checks as layers land: concurrent budget reservations, one-step board undo, immutable remix lineage, saved-library reload/quota behavior, and rejection of unsupported reference roles/last frames rather than silently dropping them.

Visually check desktop and phone layouts, keyboard/focus, Escape/outside dismissal, accessible cancel/cost/privacy labels, and unobstructed native Library/canvas controls. No real inference is needed for these checks.

**Recommendation for approval:** keep all ten directions in the roadmap; start with the shared composer/adapter and the first-layer comparison/remix/library/queue/budget loop. The shared bounded private library and explicit board insertion keep that first release bounded. Reference/video controls follow, then bounded agent iteration. Names and default-mode persistence still belong to the common mode-layer decision. The user subsequently approved this first implementation layer.

## Implementation checkpoint (2026-08-25)

- **One shared composer:** `DrawImageToolbox.openGeneration({prompt?,modelIds?,referenceImages?,context?})`. No options preserves the current draft; explicit starter replacement confirms first. More than one reference is rejected. `minimized` is bindable. Page launcher `openGenerationComposer` and command `action-generate-media` are the shell hooks; final right-side/bottom-sheet positioning belongs to the parent task.
- **One lifecycle:** `createDrawingGenerationRun` and `runDrawingGenerationBatch` in `draw-generation-batch.js` export recipe/run/job types. IDs are independent UUIDs; `batchId === runId`; retry keeps the run/cap but allocates fresh job IDs. Native result insertion and labels share one undo. Concurrency is at most two; selected replacement runs serially.
- **Facade:** application consumers use `draw-generation-models`, `draw-generation-client`, and `draw-generation-image`. HTTP auth, account-bound job ownership, and durable reservation stay outside the provider adapter. Only fal is installed; fake second-adapter tests prove dispatch without adding a speculative provider or inference.
- **Persistence:** recent history remains browser IndexedDB, account/page keyed, capped at 32. The active queue is session-only; reload does not resume it. Navigation is blocked while generating or inserting results. Run authorization metadata is server-side, not a durable result scheduler. Private saved items use the thumbnail-owned creative library and DRAW_ASSETS binding, not a second database. Save explicitly uploads images; listing never fetches binaries. Video Save retains a recipe, not a clip or expiring provider URL. Local video history may contain expiring links; clips stay outside cloud scene data.
- **Permissions:** auth/logs checkpoints cfbfda4 + 0a6e570 are integrated. All signed-in accounts may use funded AI subject to server quotas; guests can compose and use local tools. Trusted profile admission and metadata-only recordToolActivity calls remain. No owner-only generation gate or mode-specific privileges.
- **Shared schema:** creative storage checkpoints 59c2c79 + 8efaa27 provide canonical numeric timestamps, model kinds, and immutable reference pointers. Context accepts briefId/revision, houseKitId/revision, directionId, feedbackIds, referenceAssetIds, parentResultIds. No separate scheduler or binary store. BYOK, sharing, durable runs, multi-reference/first-last-frame controls and agent iteration remain follow-ups.
- **Release:** no master merge/push or deployment. Root reconciles the shell, Thinking, Thumbnail and Google-auth cutover after auth readiness is explicitly confirmed.
- **Verification:** 319 Node tests; 69 browser tests (real local inference excluded); `npm run check` with zero errors/warnings; production build passed. Browser coverage includes empty-canvas no-spend, preview/remix without mutation, same-run retry, queue cancel/minimize, decode-time page navigation guard, private saved modifier/reference recipe reload, two-model board rendering and single Undo, guest desktop/phone layouts, existing local tools, assistant and account/log privacy. Fixture-only outputs; no paid inference. Screenshots: `/tmp/draw-experiment-1440.png`, `/tmp/draw-experiment-390.png`, `/tmp/draw-experiment-board.png`.
