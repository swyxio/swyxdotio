# Thumbnail-making loop — approved contract and implementation

Status: user approved the core build on 2026-08-26, including FOUR new variants on every feedback submission. Core image-plus-pasted-text implementation is locally verified and handed off for central integration; not independently deployed. Replaces the primary thumbnail workflow, not the underlying canvas or library. The prior reference-quality correction is independent. Screenshots supplied on 2026-08-26 are workflow evidence, not instructions to publish those private samples or run inference.

## Outcome and visible interaction

The user provides inspiration images, required people/logos, source links or text, and a natural-language request. One explicit generation action returns actual diverse thumbnail candidates. The user picks a candidate and gives feedback in the same place. No required brief naming, asset-library setup, quote selection, template insertion or trip through separate Sources/Compose/Versions screens.

Initial surface:

- **Make a thumbnail**
- Attachment tray: drop/paste images; each has a simple **Inspiration** or **Keep in the thumbnail** role. Reuse private assets or an explicitly chosen public reference via the same tray. Do not require private-library saving before generation.
- One multiline composer: “What are we making?” Paste useful notes or transcript text. The current core explicitly says links are not read; URL ingestion remains a later layer.
- Optional explicitly reused personal style, model and cost controls. Output count is four. Format defaults to YouTube 16:9 with 1280×720 download.
- **Generate 4 directions** with the estimated request reservation and provider disclosure. No work starts just because a link or image is added.
- Results directly below, with per-result progress/failure, select, download and optional canvas insertion.
- Selecting a result reveals **What should change?** in the same screen. **Generate 4 more variants** creates four children of that parent; original versions remain available. **Start fresh directions** clears the parent without deleting results.
- **Save this style** is optional, after something works, and uses the existing private kit/house revision library. Manage assets/kits remains secondary; all capabilities remain available in every mode.

## Output and iteration contract

Four directions vary supported hook, visual concept and composition—not four palette swaps or a model comparison with identical prompts. The application prepares direction-specific recipes automatically; users can inspect/edit them but need not operate a planning form.

Every iteration carries the selected parent image, requested changes, source context and explicit keep-list. Required people/company names and exact logo assets remain attached; the UI does not silently drop them when simplifying a design or reaching an input limit. “Keep” is a requirement, not a promise that a generative model can preserve pixels perfectly: show a compact review checklist, and keep exact logo/text compositing available for finalization. For refinement preserve the winning composition unless the user requests a new direction.

Generated images are raster results. Native editable artwork remains available through explicit canvas editing/composition; do not claim all generated pixels are editable text/portrait/logo layers.

## Sources and provenance — later layer, not implemented in this core

The shipped-core candidate only consumes explicitly attached images and pasted text. The following ingestion design remains deferred and must not be claimed implemented:

- Mixed pasted text and links are accepted in the composer; URLs inside source content are data, not executable instructions.
- Resolve supplied episode/article pages through bounded server fetching and text extraction with URL/IP/redirect validation and limits. Do not create a generic authenticated URL proxy or follow instructions embedded in pages. Record each source's canonical URL, retrieval date and actual content coverage.
- YouTube exact links, including unlisted when accessible, use the existing metadata path. Metadata is never labelled a transcript or proof that the video was watched.
- Add supported direct video context where provider documentation and actual access permit. If access is unavailable, show “metadata only” with a useful paste/upload transcript action in the same composer. Do not silently invent quotes or continue as though the video was read.
- Pasted/uploaded transcripts use existing bounded extraction facilities internally. Expose exact evidence/source details on demand, not as mandatory quote-checkbox work before generating.
- Missing required people/logos or unavailable essential source material triggers one targeted question. No broad onboarding questionnaire.

## Shared API and state contract

Reuse the existing provider facade, generation recipe/run/job types, account-bound history, private briefs/kits/assets and canvas insertion hooks. No thumbnail-only queue, reference store, or renderer.

- Extend `DrawingGenerationReference` with an optional input role and caption; preserve stable order and asset IDs. Local bytes stay transient unless the user saves explicitly or authorizes the generation upload. The selected parent result is another explicit input on iteration.
- Extend `runDrawingGeneration` and `/tools/api/draw/edit` from singular `image` to a validated ordered image list. Server model capabilities determine the allowed count/byte cap; unsupported models are unavailable for that input set. Never silently slice the list or send a contact sheet as a substitute for multiple image inputs.
- Carry `briefId`, source snapshot IDs, direction ID, requirements and parent result IDs in existing recipe context. Snapshot the exact compiled prompt and actual model inputs for every result.
- Replace the current global 1,000-character prompt restriction with a bounded, provider-compatible compiled-prompt limit shared by client, server and saved recipe schema. Keep source text bounded and distinguish source content from instructions.
- Input resolution and any AI planning run only after an explicit action; generation preparation must not lose partial work when an upstream source fails. Per-source states and the actual submitted context remain inspectable.
- Four candidates are four direction-specific jobs on the existing run lifecycle (bounded concurrency, cancellation, job ownership and spending). Reuse existing retry semantics and immutable history. Do not promise session-only active jobs are already durable/resumable.
- Draft continuity uses the existing account-mounted controller and existing scoped records/cache. No private state hydration before identity resolves; account changes cancel/detach outstanding work under the current auth checks.

## Verified capabilities and remaining evidence

Baseline source inspection found rejection of more than one image and a 1,000-character recipe cap. This implementation removes both restrictions with model-specific reference limits and a bounded 32,000-character compiled prompt. It also creates deterministic editable compositions before its secondary shared Generate action. Those are real gaps, not problems solved by renaming tabs.

First-party documentation checked on 2026-08-26:

- [fal GPT Image 2 edit](https://fal.ai/models/openai/gpt-image-2/edit/api) accepts an ordered `image_urls` list with up to 16 images and documents 1280×720 custom dimensions. This establishes a real multi-reference route without a new account integration; it is not a quality canary.
- [fal Nano Banana 2 edit](https://fal.ai/models/fal-ai/nano-banana-2/edit/api) documents `image_urls` and optional `video_url`, including YouTube URLs. The page does not establish that every unlisted video is accessible. Do not promise unlisted coverage before a user-authorized real canary.
- [YouTube captions.download](https://developers.google.com/youtube/v3/docs/captions/download) requires edit permission for the video. The existing Google app login is not a YouTube captions authorization.

Recommend GPT Image 2 as the initial image-only quality default to match the requested workflow, retaining other compatible models in shared settings. Direct video understanding is a separate supported path, not a reason to silently switch the image model. Provider output quality, faithful cast/logo coverage, and the user's unlisted source require a separately authorized bounded canary before claiming a ChatGPT replacement.

## Ownership and integration

This task owns the approved implementation across creative entry UI, `DrawImageToolbox.svelte`, `draw-generation-client.js`, `draw-generation-batch.js`, generation history/reference schema, `server/draw-generation.js`, provider facade/adapter, and narrow canonical `/tools/draw/+page.svelte` launcher/result hooks. Root coordinates release and avoids concurrent edits. Preserve current owner exemption/auth, shared queue/history/undo, per-page keys and all unrelated master work. Feature-specific source changes retain their existing server authorization checks. Exact migration/schema changes, if any prove necessary, need review rather than being assumed in this proposal.

## Acceptance, not just UI tests

The first-customer test is the user's demonstrated sequence: provide several chosen thumbnails, official logo and episode context; request four meaningfully different directions; choose one; request a less-busy revision while retaining all five requested people and companies; request four more in that vein; download a 1280×720 image. No library administration or forced canvas insertion in between.

Automated checks must prove ordered multi-reference transport, role/parent preservation, incompatible-model rejection before spend, source provenance and prompt-injection boundaries, no lost drafts on panel/account changes, partial failure/retry/cancel, and unchanged existing drawing tools. Desktop/mobile visual checks must show the composer, results and iteration affordance without another multi-tab setup flow. Mocked tests do not prove visual quality; the real canary remains separately approved.

## Approved core and release handoff

The user approved the one-screen generation loop and explicitly required four new variants on feedback. Root confirmed core actual multi-image + text before broader URL/video ingestion. Approval does not include paid canaries, automatic private uploads, provider activation, or independent publication.

Implementation boundaries:

- `DrawImageToolbox.openThumbnails(options?)` opens the same mounted controller; `openGeneration` is now asynchronous and returns `Promise<boolean>` so cancelled replacement leaves the original foreground surface alone. `presentation` is bindable; `minimized` remains the shared draft-preserving close. There is no separate generation queue.
- Canonical `/tools/draw/+page.svelte`: existing primary Sources action becomes **Make thumbnails**; command launcher, presentation binding, multi-reference creative bridge, and responsive panel sizing are the only navigation changes. Existing Library/Components access and per-account/page keys remain. Page-picker temporarily covers the thumbnail surface. History no longer silently discards results after32.
- Ordered `images: Blob[]` supplements existing single-image callers in the shared client. Repeated multipart `image` fields become ordered provider `image_urls`; scalar models reject multiple inputs. The server validates count, type, total12MB body and full prompt before admission. GPT Image2 settings request1280×720; download normalizes to1280×720 JPG.
- `draw-thumbnail-workflow.js` creates four direction-specific recipes or four parent-preserving refinement recipes. It snapshots source text, Keep roles/labels, actual reference order, model/settings, direction and parent IDs. Fifteen source images leave one of GPT's16 slots for the parent. Incompatible models fail visibly instead of dropping references.
- `draw-generation-history.js` saves the draft on the existing IndexedDB drawing-page record transactionally alongside generations; no new store/version/migration. Completed results and recipe metadata survive reload; active jobs remain session-only.
- `DrawThumbnailLibrary` uses the existing private assets/kits/saved APIs. Choosing an asset only attaches it locally. **Save this style** explicitly uploads the chosen result and references, then creates a new kit; it does not overwrite another house revision. The saved-generation validator gains bounded typed `context.thumbnail`, including verified parent-last/Keep alignment. Companion worker must receive this schema before the main UI release.
- No new secrets or bindings. Existing server `FAL_KEY` is required to run GPT through fal. `DRAW_ASSETS` remains the existing main-worker private bucket binding. No YouTube key is needed for this core, because no URL/video context is ingested.
- The known public-thumbnail fetch/save upstream failure is not diagnosed or fixed by this change. File/paste and existing private assets work independently. Public feeds remain context references, never automatic LS/AIE quality recommendations.

Verification uses synthetic local image fixtures and mocked providers; no claim of real output quality, exact logo/cast fidelity, unlisted-video coverage, or production activation follows from these tests. Root owns final integration and release.


### Compiler observation retained for coordination

Installed Svelte5.56.1, direct compile without Vite/plugins, changed logical grouping in this minimal fixture:

```js
import { compile } from 'svelte/compiler';
compile(`<script>
 let {a,b,c} = $props();
 export function x() {
  if (a && (b || c) && !confirm('x')) return false;
  return true;
 }
</script>`, {generate:'client'}).js.code;
```

Observed emitted guard: `if ($$props.a && $$props.b || $$props.c && !confirm('x')) return false;`.

New composer guards use named booleans/counts instead of precedence-sensitive groups. Actual browser tests cover draft-preserving reopen, ordinary Enter versus Ctrl+Enter, four-plus-four execution and navigation. No dependency or build configuration changes are included. Root is independently investigating the compiler; this handoff is not a claim that all pre-existing Svelte expressions are unaffected.


### Verification checkpoint

Base: `4af985c` on `codex/draw-thumbnail-generation`. Central release must preserve intervening Tools/logs and native Components commits.

- `node --test tests/*.test.mjs`: 495 passed.
- Whole Playwright suite against isolated local main/companion/AI-stub workers: 141 passed; four explicit opt-in live-inference tests skipped. Synthetic image fixtures and provider mocks only. Private style tests use actual local Durable Object/R2 routes.
- `npm run check`: zero errors and warnings. `npm run build`: passed. `git diff --check`: clean.
- New browser checks cover actual ordered submitted reference pixels after normal image re-encoding; four distinct initial requests; four feedback requests with original Keep inputs and selected-parent-last; all eight history results and draft after reload; JPEG1280×720; no automatic canvas mutation; failed-job retry under the same run; cancellation of admitted jobs with unsubmitted work stopped; private-style save/reuse without generation; page changes during FileReader; untruncated oversized context; ordinary Enter versus explicit Ctrl+Enter.
- Reviewed desktop1280×720 and phone390×844 screenshots: `/tmp/draw-thumbnail-loop-desktop.png` and `/tmp/draw-thumbnail-loop-mobile.png`. These show test fixtures, not real provider quality.
- Logs: `/tmp/draw-thumbnails-units.log`, `/tmp/draw-thumbnails-regression.log`, `/tmp/draw-thumbnails-check.log`, `/tmp/draw-thumbnails-build.log`. Temporary isolated preview configuration: `/tmp/draw-onboarding1128/`; final local state: `/tmp/draw-thumbnail-final1128/`. No remote provider or user media was used.
