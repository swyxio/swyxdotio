# Thumbnail starting experience for `/draw`

**Status: approved for implementation by the user. Feature work is being verified in `codex/draw-thumbnail-workflow`; the originating task owns shared-shell integration and release.**

## Implementation checkpoint

The first feature slice implements account-owned asset/kit/house-revision storage, source-backed transcript/title requests, channel metadata lookup, editable composition recipes and versions, feedback, native layout/adaptation helpers, and selected/campaign export. It consumes the auth team's verified-ID contract; no personal defaults or owner bypass.

Shared image generation, batch execution/durability, and the global mode/shell are owned by the experimentation/originating tasks and must be integrated once rather than duplicated here. Binary assets require the dedicated private `DRAW_ASSETS` binding; channel browsing requires `YOUTUBE_API_KEY`. Neither missing configuration is represented as working production behavior. Uploaded font originals can be stored, but exact arbitrary-font canvas rendering remains unsupported. Video URLs require supplied transcript text; automatic captions/audio extraction is not implemented.

The evidence and approval discussion below records the earlier planning stage; it is not a claim that all planned capabilities have shipped.

Implementation handoff: see [the current integration and operator contract](../draw-creative-workspace.md). The feature branch contains storage checkpoints `59c2c79` and `8efaa27`; the final UI/source/layout slice follows them. Verified locally: 196 unit tests, 14 browser tests, a clean Svelte check and production build. Browser providers were mocked; local signed fixtures and Wrangler DO/R2 do not prove production OAuth/storage/inference. The originating task is integrating the newer live-auth checkpoint `3781d114` and Experiment's stable facade/runner `de6cf8d`; this branch does not independently deploy those changes.

**Updated product scope:** retain all six pillars—**reusable brand kits, an editable thumbnail generator, automatic layout, editable typography, one-click multi-format adaptation, and export workflows**—and connect them to saved channel references, transcript/title extraction, versioned feedback, and diverse art-direction batches. These are shared capabilities, not six new modes. The narrow starting experience remains the first layer, not the whole destination.

## Recommendation

Offer two clearly different starts, **AIE conference talk** and **Latent Space episode**, within one **Thumbnails** starting experience. Keep the existing Excalidraw editor and native Design library. Build toward a reusable loop: **saved brand kit + channel references → episode source and hints → quotes/titles → diverse art directions → candidate batches → feedback → improved house prompt/reference set → editable artwork and export**. Publication remains out of scope.

For the first working increment, reuse the LS template and add one small **shared blank-artboard action** so AIE users can explicitly create 1280 × 720 without being given a fictitious approved brand design. This increment alone no longer satisfies the requested product. **Per-user assets, saved channel references, persistent feedback and prompt versions, long-source editorial extraction, and diverse generation batches are now required planned capabilities**, delivered in the sequence below rather than left as speculative ideas. A branded AIE video template still waits for approved references. Keep FDE as an explicit LS series option, not the default branding for every podcast.

All three workspace modes retain every capability. The mode preset only supplies recommendations, welcome content, and initial UI selections to the originating task's common foundation; the expanded workflow is shared application functionality. No separate editor, mode-specific tool list, permission system, or document format. This revision expands the **plan**, not authorization to build, upload assets, connect accounts, or run paid jobs.

## 1. Planning-stage evidence and scope

- Inspected clean, detached worktree `/Users/swyx/.codex/worktrees/1128/swyxdotio` at `7d5acedf257a04a7b9a3ed17eb149ad8ca3b5b6f`. Read the intentionally uncommitted [shared brief](/Users/swyx/.codex/worktrees/3c03/swyxdotio/docs/plans/draw-workspace-modes-brief.md) by absolute path. Read-only `git ls-remote` found remote `master` at the same commit; no later remote changes observed during this review. The repository's default branch is `master`, not `main`.
- Inspected source, existing browser tests, retained brand images, and personal thumbnail guidance. No authenticated external app access, media upload, inference, dependency install, app build, commit, push, merge, deployment, or provisioning. Only this planning file is written.
- Ran five existing dependency-free unit suites: **36 passed**. Browser tests were read, not run; no claim of live UI or production verification.
- Auth task **Upgrade tools to Google auth** (`01a03c36-6319-7cd3-96de-f825b83d263d`) owns identity, account-scoped storage, and paid-AI entitlements. Its changes are not present in this inspected baseline. Recheck its landed interface before implementation; do not edit its worktree or implement parallel migrations.
- Revision after user feedback: rechecked HEAD/remote `master`, still `7d5aced`; expanded only this document. Consulted the [media workflow guidance](/Users/swyx/.codex/skills/media-heavy-workflows/SKILL.md), its [candidate/reference lessons](/Users/swyx/.codex/skills/media-heavy-workflows/references/media-studio-lessons.md), and [long-running pipeline guidance](/Users/swyx/.codex/skills/live-ai-pipelines/SKILL.md). Checked current official YouTube API documentation; no channel data, video, transcript, or private account was accessed for this revision. The 36-test result above is from the initial planning pass, not validation of these unbuilt capabilities.

### What exists, and what does not

| Observed capability | Actual contract / limit |
| --- | --- |
| `ls-podcast`, `fde-decision` | Native 1280 × 720 frames; independent text, shapes, and official-logo image. Guest area is illustrative placeholder shapes, **not a working drop/replacement slot**. |
| `aie-speaker`, `keynote-slide` | 1080 × 1350 speaker announcement and 1920 × 1080 slide. Neither is an approved conference-video thumbnail. Do not resize/relabel either and claim it is one. |
| Image import and cleanup | Native file import/paste; selected-image background removal, Magic Select, Magic Eraser, Depth Blur, Vectorize. Portrait-fast removal is the existing default; execution is explicit and may first download weights. Local processing is distinct from subsequent cloud scene sync. |
| Artboard editing | Native frame children remain editable; `insertDesign` appends beside existing content and captures native undo. No dedicated thumbnail brief, semantic layer panel, or guided portrait placement exists. |
| Variants and resizing | `duplicateDesign` copies editable frame children to the right. `resizeDesign` proportionally fits contents and expands the background; it is **not editorial re-layout**. Duplicate before resizing to preserve the original. |
| Export | Selected artboard PNG/JPG/SVG, exact bounds, no padding, JPG quality 0.92. UI uses 1×; assistant command supports 1×/2×. No current thumbnail byte-budget validator or mobile-preview comparison UI. SVG is an editable interchange option, not a YouTube upload format. |
| Discovery and assistant | Shared command palette, native Library tabs, six suggested assistant workflows, bounded native editing and viewport inspection. Workflow chips populate a draft; Send runs the assistant. Existing chip selection replaces a draft, so the new welcome must not call it automatically. |
| Generation and history | Model picker, parameters, queue/cancel, parent/reference history exist. Toolbox mounts for a selected/processing image, so empty-canvas generation/history discovery needs the **shared** entry point identified in the brief. History is IndexedDB/page-keyed and capped at 32 by the page, not a cloud asset library. |
| Storage | Current cloud scene limit is 1,800,000 bytes. Export file size and scene size are different constraints. Existing boot code can create the first cloud page and copy a prior local scene; auth/storage owner must reconcile that behavior, not the mode preset. |

## 2. Three user jobs and the first 30 seconds

Timings are interaction goals with supplied assets ready, not promises of completed design or model download. No login or questionnaire is required to draw.

### Job 1 — Package an AIE conference talk faithfully

**“I have a talk title, a real speaker headshot, and an exact speaker/company name. Give me a video-sized canvas without confusing it with a speaker announcement.”**

| Time | User action and result |
| --- | --- |
| 0–5s | See **AIE conference talk** alongside LS. Copy says: “Video template not available yet. Start at 1280 × 720 and use your event assets.” No inferred orange brand system, country, year, speaker, or logo. |
| 5–10s | Click **Create blank 1280 × 720**. This explicit shared action creates one native frame with a neutral white background, selects/fits it, and is one undo step. It does not change global drawing styles. |
| 10–30s | Use **Import image** or paste the supplied headshot; place it with native controls. Add the exact speaker name and a short hook with native text. Keep the full talk title as source context, not mandatory thumbnail copy. Optional background cleanup requires its own click. |

The first useful result is the correct-size editable working composition. Until the AIE kit is approved, user-supplied logos and colors are imported/applied manually, not borrowed from LS or the speaker-card template. Saved personal assets become reusable through E1 below; they need not be re-uploaded for every talk. A source-backed hook can complement a descriptive title with a consequence or tension; unsupported numbers, affiliations, claims, and quotations are never filled in. No automatic search for a person's photo.

### Job 2 — Make an LS podcast thumbnail with a recognizable guest

**“I have an episode title and guest photo. I want a short curiosity hook, the real LS mark, and text I can still edit.”**

| Time | User action and result |
| --- | --- |
| 0–5s | See **Latent Space episode** with **Insert LS template**. FDE is a secondary **LS × FDE** option, explicitly selected only for that series. |
| 5–10s | Click Insert. Existing `ls-podcast` creates its editable 1280 × 720 artboard and loads the already-public LS logo. No people or episode facts are preloaded. |
| 10–30s | Replace the headline text with a supplied 2–6-word hook; import the real guest image. Manually remove placeholder artwork and position the photo. Exact company names can be plain text; official company marks are added only from supplied/cleared files. |

Current placeholder placement is manual; do not advertise drag-to-replace until the shared placement feature exists. Keep names, hook, portrait, and each logo independently editable. Native image layers remain raster assets internally; they are not editable face/vector reconstructions.

The assistant is optional: **Draft a hook** opens an unsent generic request asking for the title, one supported takeaway, and exact requested cast/company coverage. It does not insert personal prompts, fill missing episode facts, or run on click. If a draft already exists, offer “Keep draft” or “Replace with suggestion” rather than overwriting it. Sending requires the separate AI entitlement and cost disclosure.

### Job 3 — Compare two editorial directions and export a finished file

**“I already have an AIE or LS composition. Let me try another hook without damaging the first, check it small, and download the winner.”**

| Time | User action and result |
| --- | --- |
| 0–5s | Restored page opens intact, not into onboarding. Select its frame; existing dimensions, Duplicate, PNG/JPG/SVG controls appear. |
| 5–15s | Click **Duplicate**, then edit the duplicate's hook and arrangement. Keep all requested people/companies. Different words/composition—not a palette swap—make it a meaningful alternative. |
| 15–30s | Use existing canvas zoom/pan to inspect both. For baseline manual small-size QA, inspect a 1280 × 720 frame at 25% zoom (320 × 180 CSS pixels); do not resize the artwork. Select the intended frame and download JPG. |

Later in the same session, check the exported file and finish corrections before delivery. A dedicated **Review at mobile size** comparison surface is proposed separately below; it is not already implemented. There is no prediction of click-through rate and no YouTube A/B experiment submission.

### The same jobs once the required reusable workflow is available

The tables above describe the small manual increment. The expanded first 30 seconds should make saved work useful immediately, without auto-starting retrieval or inference:

| Job | 0–10 seconds | 10–30 seconds |
| --- | --- | --- |
| AIE talk from a long source | Explicitly choose **New thumbnail brief**, select a personal AIE kit/channel, paste transcript or unlisted URL and editorial hints. Existing canvas stays unchanged. | Inspect source-access status and selected house revision/references; explicitly start **Extract quotes & titles** after its cost/upload disclosure. Show source coverage and partial validated results as they arrive; do not promise a long transcript completes within 30 seconds. |
| LS episode with a reusable look | Select a personal LS or FDE kit and saved channel; see saved logos/reference examples and recent episode briefs. Start a new brief, not a copied prior episode's facts. | Attach real guest assets from **My assets**, choose the source-backed hook/title pair, then request **4 art directions**. Review direction cards before explicitly rendering images. |
| Iterate and improve the house style | Reopen an episode's contact sheet at the previous selection, compare candidates with arrow keys or mobile swipe/buttons, and read saved feedback. | Mark a favorite, enter “larger face / less literal / change the metaphor,” and choose **4 more like this** or **4 new directions** with a visible estimate. **Update house defaults** separately previews a prompt/reference diff; it does not silently promote feedback. |

Saving a channel, selecting a kit, opening history, or switching modes does not attach assets to inference, fetch all past videos, create an artboard, or render a batch. Each operation has an explicit action.

## 3. Initial layouts and exact defaults

### Desktop: native sidebar, not another floating studio

```text
┌ Page / save state     [Thumbnails ▾]    [Search ⌘/Ctrl K] ┐
│                   native drawing toolbar               │
│                                                        │
│   Empty Excalidraw canvas        Library | Workspace     │
│   ready to draw                 Presets [Design]        │
│                                 Components | Memes     │
│                                 Make a video thumbnail │
│                                 AIE conference talk    │
│                                 [Create blank 1280×720]│
│                                 LS episode             │
│                                 [Insert LS template]   │
│                                 [LS × FDE]             │
│                                 [All designs]          │
│                                 [Draw without starter] │
│ Zoom / undo                     Assistant launcher     │
└────────────────────────────────────────────────────────┘
```

The shared empty-state renderer supplies starter content inside the existing Design sidebar on a confirmed-empty desktop page. It is UI only, not inserted artwork. Other designs stay below recommendations; all other tabs remain visible. All designs, native Library items, tools, models, history, and export remain available without changing modes.

### Narrow screen: no automatically opened sidebar or keyboard

```text
┌ Page / save     [Thumbnails ▾] [Search] ┐
│          native drawing tools         │
│                                       │
│       Make a video thumbnail          │
│  AIE talk  [Create blank 1280×720]     │
│  LS episode [Insert LS template]      │
│  [LS × FDE] [All designs]             │
│  [Draw without starter]               │
│                                       │
│ Zoom / undo  Templates   AI / More    │
└───────────────────────────────────────┘
```

This compact shared empty-state is DOM outside canvas drawing content. Canvas outside the card stays usable. **All designs** opens the existing Library/Design surface; one scrolling surface at a time. Insertion closes the narrow Library through the existing fit behavior and reveals the artwork. Selecting a portrait shows the compact/minimizable image toolbox; don't open assistant, library, and image tools together. Keep a clear way to return to the parent artboard for export without deleting or deselecting by mode change.

| Initial setting | Exact recommendation |
| --- | --- |
| Mode label | “Thumbnails” in this proposal; global naming/default decision stays with origin. Never a new route or scene type. |
| Fresh empty desktop | `workspaceSection = 'designs'`; native `openSidebar = { name: 'default', tab: 'workspace' }` once, after restoration succeeds. Reuse current 650px narrow-layout boundary. |
| Fresh empty mobile, <650px | `workspaceSection = 'designs'` ready for next opening; sidebar closed; compact welcome card; no focus/soft keyboard. |
| Brand/start selection | Neither brand preselected. AIE and LS are equal first-level choices; FDE nested/secondary to LS. Clicking a clearly labeled **Create/Insert** is the only mutation. Browsing a brand changes recommendations only. |
| Default design ordering | LS, FDE, then remaining existing templates; AIE card calls the new blank-artboard command until an approved video kit exists. Speaker card/slide keep their accurate labels, not promoted as video starters. |
| Artboard/default export | Suggest 1280 × 720 only for an explicit creation action. Existing PNG/JPG/SVG controls remain unchanged; copy recommends JPG 1×. Never coerce the dimensions or export settings of an existing frame. |
| Image tools/models | No selected image; image action stays `null` unless already set. No new model/prompt/parameter overrides. Existing portrait-fast default remains; previously chosen cleanup mode wins. No weight preload or generation. |
| Assistant, history, review | Closed initially; launchers remain available. Suggested requests are display-only until chosen. No history restore, prompt reset, review render, or AI run on entry. |
| Native canvas | Preserve native tool, styles, zoom, geometry, selection, library, undo/redo, and drafts. No colored canvas background merely because LS is recommended. |
| Mode switching | Apply recommendations once per deliberate entry, not a reactive enforcement loop. On a nonempty page or active edit/job, do not auto-open a sidebar or move focus; update starting preference/recommendations only. Subsequent manual tab choice wins. |

**Draw without starter** dismisses welcome and focuses the canvas; it does not clear it. Escape dismisses the frontmost dismissible UI, not a generation job. Cmd/Ctrl shortcuts continue to work. Reopen recommendations through Templates/Design or the shared starting-experience menu. Undoing an insertion back to empty must not reopen a modal or steal focus.

## 4. Grounded brand and editorial requirements

### Latent Space / FDE

Planning references read: [director](/Users/swyx/.codex/skills/latent-space-thumbnail-director/SKILL.md), [editorial preferences](/Users/swyx/.codex/skills/latent-space-thumbnail-director/references/preferences.md), [resource index](/Users/swyx/.codex/skills/latent-space-thumbnail-director/references/resource-index.md), [examples](/Users/swyx/.codex/skills/latent-space-thumbnail-director/references/example-index.md), [retained LS template](/Users/swyx/.codex/skills/artifact-template-latent-space-youtube-thumbnail/SKILL.md), and [retained FDE template](/Users/swyx/.codex/skills/artifact-template-latent-space-fde-thumbnail/SKILL.md), including both template manifests. Viewed both retained composition images, the official-logo files, and a corrected safe example. These are **planning references, not permission to bundle private photos, prompts, or generated examples**.

- Preserve the official purple-gradient LS hex proportions, orientation, internal linework, and alpha. Use a compact upper-right placement with padding; do not hallucinate/redraw the mark. Generic LS uses LS branding; FDE adds its lockup only when requested. This resolves the director's FDE-oriented guidance against the separate generic LS template.
- Near-black/deep violet, large white type, one lime or lavender emphasis, recognizable real faces, one dominant idea, generous negative space. Start with one guest; multi-person episodes must preserve every requested guest exactly once and no unrequested host. Use separate image layers, not a flattened whole-thumbnail raster.
- Two to six words is a preference, not a validator that destroys longer user copy. Complement the episode title with a supported tension, consequence, or question. Preserve exact user spelling, names, and company labels. Do not shrink a long title into unreadability or silently truncate supplied copy; current template options have character caps that need visible feedback if a future form exposes them.
- Prefer no explanatory subcopy by default. The current LS/FDE templates contain generic subtitle/tagline/company placeholders; recommended later template polish removes optional filler from **new insertions only**, not existing scenes. Do not copy episode facts, cast, “skills series,” company rails, or claims from retained examples.
- Supplied official company wordmarks are independent image layers. If unavailable, use exact plain names or ask; never invent a logo. For panel/FDE work preserve requested company coverage, with the rail ending before timestamp clearance. Do not add two fake companies to imply episode facts.
- Separate dark clothing from the background with manual positioning/background contrast first. Any generative relighting or wardrobe edits are optional separately authorized actions, never part of starter insertion.
- At 1280 × 720, the personal guidance reserves approximately **x=1050–1279, y=620–719** for the duration badge. Treat this as an editorial exclusion zone, not an official fixed YouTube specification. Background can continue through it; no essential face, name, logo, or hook should intersect it. Scale the zone with the frame.
- No Tachyon font was found in the inspected repo/skill asset sets. Do not claim the current native font matches it. Preserve font files/preferences in personal kits when supplied and licensed; making them render reliably as editable text is an explicit E4 integration requirement, not a reason to flatten text or silently substitute another font.

**Existing templates are skeletons, not finished mobile-verified artwork.** Their company rail is 17px and FDE lockup text is 12px at 1280 × 720—roughly 4.25px and 3px at the proposed mobile check size. Users must enlarge/rearrange required small copy before delivery; C should improve these new-insertion defaults without dropping coverage. The raw retained FDE reference also places company content close to the right edge; prefer the director's later safe-zone guidance and corrected example over copying that placement literally.

**Asset provenance check:** repo `static/assets/latent-space-hex-gradient.png` is a 144 × 144 alpha PNG; retained canonical logo is 1130 × 1130 with alpha. They have different byte hashes; the two personal skills share the same canonical bytes. Both were visually inspected, but a byte-identical/provenance match between the repo derivative and canonical is not established. Reuse the already-public repo asset initially; verify its authorized derivative status and appearance at 1×/2× before replacing it. Do not blindly ship the private canonical asset or sample images.

### AI Engineer

**Missing:** approved conference-video examples, event-specific logo/lockup variants, documented color/type rules, public redistribution clearance, and intended treatment of speaker/company/event identity. No AIE logo/font asset was found in the relevant static-asset search. The existing source's orange/ink portrait card is evidence of that card only, not an approved video style.

Before a public AIE video kit, request **2–3 representative approved talk thumbnails**, official event/logo files, exact event edition naming, font availability/license, and one approved speaker photo/source to validate the workflow. Ask which elements are mandatory at mobile size. These examples can guide layout without becoming public starter payloads.

Until supplied, use a neutral 16:9 artboard and explicit user imports. A future AIE template should have native hook/name/event text and independent portrait/company/event-logo layers, with safe-zone and readability checks. Its palette, positioning, density, and whether the full talk title belongs on the artwork remain unapproved—not invented here.

### Output convention and established-product references

Keep the requested **1280 × 720** working default. Current [YouTube thumbnail guidance](https://support.google.com/youtube/answer/72431?hl=en) now recommends larger 3840 × 2160 video thumbnails, accepts JPG/PNG, and distinguishes upload-size limits by device. Thus 1280 × 720 is this product's chosen baseline, not a claim of YouTube's latest maximum/recommendation. A conservative under-2-MB JPG remains useful for mobile video handoff; the current exporter does not guarantee that cap. These are episode/video thumbnails, **not** the separate square podcast-playlist artwork.

Adopt the familiar explicit duplicate-and-review pattern documented in [Canva's page controls](https://www.canva.com/help/manage-pages/): preserve originals, duplicate for alternatives, inspect a thumbnail/grid view. Here the variant unit is an Excalidraw **artboard**, not a separate page or a new project. This is a design inference from that established pattern, not a proposal to reproduce Canva's editor.

## 5. Small MVP, shared additions, and deferred work

| Slice | Scope and exit condition |
| --- | --- |
| **A. Defaults-only integration** | Shared mode preset, welcome placements, accurate AIE/LS/FDE labels, Design-first ordering, no automatic scene mutations, contextual links to existing import/duplicate/export. Reuse existing LS/FDE insertion unchanged. This slice alone is useful for LS; do not claim it delivers an AIE branded kit. |
| **B. Smallest shared addition recommended with A** | Add **Create blank artboard → YouTube 1280 × 720**, with one native frame/background transaction and normal undo. Expose through all modes' commands/Design UI and the assistant tool boundary. This makes the neutral AIE path real rather than asking users to draw an approximate frame. No new rendering engine or dependency. |
| **C. Brand readiness / next small shared polish** | AIE assets and approved video template; LS provenance check and optional-filler cleanup for new insertions. Add visible errors for failed template asset loading. Template insertions must be atomic and page/account-bound even when the logo fetch is slow. Do not overwrite edits made during loading. |
| **D. Shared usability enablers** | (1) Explicit portrait-slot replace/fit/reposition using native image/frame operations; preserve identity/aspect ratio and one undo transaction. (2) Review selected frames at 320 × 180, with optional timestamp overlay and side-by-side alternatives on desktop, stacked/switchable alternatives on mobile; no scene writes. (3) Export byte-size preflight and optional user-requested compression, keeping editable scene and original dimensions intact. These support the required E2/E4/E5 workflow and are not mode-exclusive features. |
| **Common-foundation dependency, not a second media pipeline** | Shared unselected-canvas Generate and History entry points, one model catalog/queue, contextual selected-image editing, reachable from all modes. New shared commands for those launchers and selected-frame actions should reference existing handlers. This planner does not independently refactor the toolbox. |
| **E1. Required: personal reusable foundation** | Account-owned assets and brand kits; saved channels; versioned house prompt/reference bundles; episode briefs; user-controlled reuse. Reuse works across pages and visits, not just in the 32-entry local history. |
| **E2. Required: repeatable generation and feedback** | Diverse direction cards, bounded candidate batches, persistent contact sheets, explicit insertion, saved feedback, branching/replay, house-revision promotion and rollback. Include D's mobile-size review in this slice. |
| **E3. Required: source and reference ingestion** | Channel reference browsing/selection; long transcript + hints extraction into evidenced quotes/title-hook pairs; unlisted-URL resolution with explicit authorized transcript/source-media paths. Start with pasted/uploaded transcripts so this workflow works before optional caption OAuth. |
| **E4. Required: layout, typography, adaptation** | Reuse align/distribute/group/layer actions; add overlap-aware layout, editable headline treatments, grids, measured text fitting, supported kit-font application, and intelligent multi-format composition variants. Baseline native composition/layout support is a dependency of E2; advanced adaptation follows as a working layer. |
| **E5. Required: export workflow** | Individual assets, transparent PNG, SVG, complete artboards, existing generated/user-owned clips, and selected campaign bundles. No new video timeline or automatic publication. |
| **Still deferred** | Whole-conference batch processing, quantitative performance analytics, automatic continual learning, arbitrary font-system fork or new rendering engine, video cutting/transcoding. |
| **Still out of scope** | YouTube uploads/publication, real YouTube A/B-test management, auto-publishing, billing/BYOK, cross-account sharing, general-purpose video editor, full channel-management suite, auth migrations. Saving a channel and narrowly authorized source retrieval are now in scope for planning; publication scopes/actions are not. |

A portrait replacement action would need a deliberate target and framing preview; cancel leaves the old image untouched. Do not infer that pasted images replace a nearby placeholder. A review overlay must stay outside scene data, exported images, cloud artwork, and assistant artwork screenshots. Export validation must not disable general PNG/SVG or impose thumbnail rules on unrelated frames.

## 5a. Required reusable workflow

### Personal assets and brand kits

**My assets** stores logos, licensed font files, headshots, transparent cutouts, backgrounds, reference thumbnails, and other user-supplied assets. Add via explicit file upload or **Save selected image to My assets**; name, tag, search, preview, and reuse across episode briefs/pages. Font records include family, weight/style, source/license and canvas/export support status; storage does not imply render support or redistribution rights. Validate allowed asset types and reject unsafe files; do not treat arbitrary SVG/font content as trusted application code. Keep original and derived cutout as related assets, not destructive overwrites. Show storage/upload status and quotas before an upload; never imply cloud storage is unlimited.

**My brand kits** group those assets with palette/type notes, exact brand/company names, layout rules, a house prompt, and chosen positive/negative references. A user may maintain separate AIE event editions, LS, and FDE kits. “Use kit” selects defaults for the current brief; it does not restyle existing art. “Insert asset” adds a native image with undo; “Attach as model reference” is a different action. Assets support multiple roles: brand mark for deterministic composition, identity reference, style reference, composition reference, or example to avoid.

Public starter kits remain read-only, curated, and free of private content. **Save a personal copy** creates an explicitly user-owned kit. Personal kit changes never modify public defaults. Auth owner supplies stable account identity and authorization; selecting the same brand/channel as another user grants no access to that user's assets. Signed-in users can use storage only within their storage entitlement; AI remains independently gated. Anonymous local editing remains available with an honest “Sign in to save across visits/devices” boundary and no implicit adoption of anonymous files.

Recommended durable shape: small account-owned metadata records plus private object storage for binary assets, transcripts, and selected/generated images. Do not put a gallery of base64 originals into the Excalidraw scene or use the current 32-entry cache as the canonical library. Existing repository object storage is podcast-specific; do not reuse its public delivery policy for personal assets. Reconcile the actual storage/runtime choice with the auth owner before implementation; no new bindings or migrations are authorized by this plan.

### Save channels and curate past-video references

**Add channel** accepts a handle, channel URL, or channel ID. Resolve and display channel identity for confirmation, then save its immutable channel ID and a link to the selected personal kit. A channel is a source, not an account identity or proof of ownership. Multiple saved channels are useful; no automatic sign-in to YouTube is required just to save one.

**Browse past videos** explicitly loads an initial page (recommend 24 items) with thumbnail, exact title, publish date, source link, and retrieval time. Load more on request; filter the retrieved set honestly rather than calling it full-channel search. Channel uploads are discoverable through `channels.list`/its uploads playlist followed by paginated `playlistItems.list`; handles can resolve with `forHandle`. Preserve canonical video IDs and report partial coverage or quota/auth errors. [Channel lookup](https://developers.google.com/youtube/v3/docs/channels/list), [uploads discovery](https://developers.google.com/youtube/v3/sample_requests).

For each video: **Save reference**, label what to learn (“portrait scale,” “headline hierarchy,” “avoid this density”), and choose whether it belongs to this episode or a proposed house reference revision. Saved, selected for a run, and actually sent to a model are three visibly distinct states. Old title/guest/company facts are never imported as facts about the new episode. Do not rank thumbnails as “proven winners” from view counts or user favorites.

Platform/rights gate: a displayed YouTube reference is not automatically licensed for indefinite copying, derivative generation, or provider upload. API-derived caches require applicable refresh/deletion handling; removed/private items become unavailable, not silently replaced. Direct reuse as generation input needs a supported, policy-compliant route and cleared rights. A user's original thumbnail/source files are the preferred durable generation assets. Before shipping API-derived conditioning, explicitly review YouTube's restrictions on stored and derived API data; a user checkbox alone cannot override platform terms. Until that route is established, reference browsing and user-written style notes can work while model attachment asks for an eligible original file. This is a delivery dependency, not a promise that API thumbnails can already be fed to any model. [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies).

### House prompt + reference revisions + persistent feedback

Keep **House v1, v2, …** as immutable bundles of prompt text, brand/editorial rules, and positive/negative reference asset versions. One explicit active revision per personal kit. Exact prompt and reference edits can be made directly; feedback can also propose a diff. **Save draft** and **Use as house default** are separate. Show changes, let the user edit/approve, and support rollback. Existing projects/batches stay pinned to their original house revision; a new house default affects future briefs/runs only, unless the user explicitly upgrades an existing brief.

Feedback is saved against the exact candidate/direction/recipe: favorite, reject, optional comparison preference, tags, and free text. Examples of useful tags: face too small, copy too dense, weak hook, identity wrong, good contrast. Scope each note to **this candidate**, **this episode**, or **propose for house**. No silent training, cross-user learning, or automatic rule promotion from a thumbs-down. Let users select which feedback to apply to the next run, so every rejected draft does not become an ever-growing prompt.

Every candidate records its parent(s), source/brief revision, chosen title-hook pair, house revision, compiled prompt, selected and actually transmitted reference versions, model/endpoint/settings, seed when supported, batch/direction ID, timestamps, and known cost/status. **Branch from this**, **Edit prompt and rerun**, and **Use latest house revision** are explicit actions. Rerun creates a new version, never replaces the old one; identical recipes are reproducible inputs, not a promise of pixel-identical provider output. Sensitive prompts/reference bytes remain private; deletion/rights revocation may make an old recipe non-replayable, which must be shown instead of retaining revoked data forever.

### Long transcript or unlisted video + hints → quotes and titles

The brief accepts pasted text, TXT/SRT/VTT, or a YouTube URL, plus optional hints: target audience, desired tension, topics to emphasize, exact speaker names, and terms to avoid. Preserve source and hint inputs separately. Transcript text and channel metadata are untrusted content, not instructions that can modify system rules or authorization.

For an unlisted URL, store it privately and check supported access only after **Load source**. Do not index it into public channel suggestions or expose its URL in analytics/logs/shared defaults. URL playback access does not establish caption-download permission: `captions.list` returns track metadata, not transcript text; `captions.download` requires edit permission and a qualifying OAuth scope. App Google login or `youtube.readonly` alone is not that grant. Offer a separately consented, server-read-only caption connection only if the user has suitable access; otherwise request a pasted/exported transcript or user-owned source media for explicitly authorized transcription. Never bypass private-video access or silently rip YouTube audio. [Caption listing](https://developers.google.com/youtube/v3/docs/captions/list), [caption download](https://developers.google.com/youtube/v3/docs/captions/download).

Pipeline: **validate source → segment with stable offsets/timestamps → extract candidate evidence per chunk → deduplicate/select themes → propose title + thumbnail-hook pairs → human review**. No silent truncation to the opening portion of a long transcript. Persist completed chunks and show coverage (processed/total chunks or source duration where available); partial results are labeled partial. Failed chunks can retry without redoing paid completed work. A transcription stage has its own upload/model/cost disclosure, and ASR output is marked machine-generated.

Quote cards contain verbatim source text, surrounding context, speaker if supported, and a source span/link (time range for timed sources; line/character span otherwise). Distinguish **transcript-exact** from **audio-verified**; never fabricate timings for untimed text or present corrected ASR guesses as verbatim quotes. Clicking a card reveals the supporting passage. Generated paraphrases and titles are labeled separately and never put in quotation marks as though spoken.

Recommend an initial result of up to **8 title–hook pairs** across different supported angles, each linked to evidence and accompanied by a short rationale. Hints guide selection but cannot establish an unsupported factual claim. Users edit, save, and choose a pair; nothing changes the canvas or a published video's title until an explicit insertion/edit action. Title extraction and image generation are independently runnable and priced; missing video access does not block work from a supplied transcript.

### Diverse art directions, fast batches, and scanning versions

Default request: **4 directions × 1 candidate each**, with one explicitly selected capable model. Start with editable direction cards showing hook, composition, focal subject, visual metaphor, reference roles, and invariants. Requesting AI-written direction cards is itself an explicit entitled operation; users may also author them manually. Rendering the cards into images is a second explicit batch action. More models or repetitions multiply the visible total, never hide a Cartesian-product spend.

Direction variety must change at least two substantive axes—e.g. portrait-led consequence, two-sided tradeoff, one explanatory technical metaphor, or a sparse conceptual scene—not just colors/seeds. These are composition mechanisms, not invented AIE brand approvals. Preserve exact identity/cast coverage, official logos, source-backed claims, and timestamp-safe space. Users may pin invariants and choose **4 more like this** (local exploration) versus **4 new directions** (broader exploration). Offer editable counts/quick batches such as 4 or 8 and a visible hard total spend cap; large batches remain possible within entitlement, provider capacity, and user-confirmed limits.

Show the **effective prompt and actual reference attachments per model** before Run. A saved kit may contain 20 assets; that does not mean all 20 are sent. The inspected queue currently sends at most one `image` field and the toolbox uses the selected source image, despite catalog reference-capability labels. Multi-reference requests need real shared transport/provider-schema work. Reject an incompatible request or ask the user to choose a supported model/subset; do not silently ignore references, synthesize a collage, or claim prompt-only generation used a real headshot. Logos and exact text should normally be composited as native layers, not regenerated inside a bitmap.

Results go to a **persistent candidate contact sheet**, not automatic replacement of the selected canvas image. Keep existing direct image-edit/undo semantics for explicit edits; add a shared candidate-result destination for these batches. Insert a chosen candidate as a new artboard or replace a specifically selected layer with undo. If a result is a flattened generated composition, label it as such; do not promise editable text/portraits hidden inside it. Prefer generated background/motif layers plus real portrait, official-logo, and native text layers for the editable final composition.

Desktop: dense equal-scale grid, direction/batch/house-version filters, favorites, selected image details, left/right keyboard scanning, pinned comparison of 2–4 candidates, and a 320 × 180 check. Mobile: one candidate/detail surface, explicit previous/next controls plus optional swipe, count/status, feedback, and a sticky **More variants / Insert** action row. “Scan versions” preserves current selection and scroll position while new results stream in; do not auto-select each arrival. Keep failed/cancelled slots visible rather than silently reducing the batch count.

Batch state is durable, with per-item submitted/provider-job IDs, status, result, retry lineage, and remaining budget. Reopening resumes observation of already-submitted work, not submission. **Stop batch** stops new admission and attempts cancellation where supported; keep valid results and report potentially incurred charges. Network ambiguity must reconcile provider job state before resubmission. **Retry failed** only addresses failed items under a new explicit authorization. This exceeds the current browser-driven loop and requires a shared server-owned batch lifecycle; choose its execution primitive during infrastructure reconciliation, not by assuming a browser tab can provide durability.

### Shared UI and data boundaries

Add shared workspace destinations **Assets**, **Sources**, **Prompts**, and **Versions** through the common foundation, reachable in all modes. Keep the existing Design/Presets/Components/Memes/native Library; avoid expanding the initial screen into a multi-panel studio. On empty Thumbnails entry, add secondary **My kits**, **Saved channels**, and **Resume brief** links only after account scope is resolved. Merely showing those links never imports their contents into the scene or model request.

On deliberate **New thumbnail brief** or **Resume brief**, use one expanded workspace surface:

```text
Desktop: Kit/channel + episode | Source → Titles → Directions → Versions
         main: source cards or equal-scale candidates
         details: prompt revision, attached refs, feedback, explicit actions
         canvas remains behind; Insert returns to selected editable artwork

Mobile:  Kit / episode ▾   [Source] [Titles] [Directions] [Versions]
         one active pane; inspect/compare without stacked modal panels
         selected count · job progress · Cancel / Generate / Insert
```

Proposed logical records (not a migration): **Kit/HouseRevision**, **AssetVersion**, **Channel/Reference**, **EpisodeBrief/SourceRevision**, **Run/Batch/Candidate**, and **Feedback**. Every private record and object access is authorized by stable account identity; episode ownership is independent of the currently active Excalidraw page. References to scenes/artboards link the two without changing the Excalidraw file format. Reuse the same generation/history services across modes, with durable records beyond the small local cache. Deleting an asset/connection explains affected references and honors applicable deletion rules; no invisible backup of revoked private content for reproducibility.

### Delivery order and completion bar

1. **A+B, then E1:** retain a working canvas; save/reuse an asset and kit across account-scoped visits. Saving a channel identity works even before its browser is added.
2. **E2:** manually supplied episode brief → four genuinely different candidate directions → render/compare → feedback → branch → explicitly promote a new house revision → insert/export. Persistent versions and mobile review are part of this slice, not an optional future log.
3. **E3:** add channel browse/curation and long-transcript evidenced extraction. Unlisted URL is supported as a source identifier with honest access states; complete automatic captions only through a verified allowed connection. User-supplied transcripts/source files keep the pipeline usable when that connection is unavailable.
4. **E4 + E5:** complete intelligent campaign adaptation and exports on top of those saved recipes. The native typography/layout primitives required to make E2 compositions editable land with E2, not after a raster-only generator.

These are required slices of the revised product, not permission to stop after A+B and call the whole request done. Keep publication, full video editing, cross-account sharing, and unattended recurring channel sync outside this scope.

## 5b. Preserve the six creative-workflow pillars

### Editable composition generator

Combine a real guest headshot, the chosen title/hook pair, exact logos, kit rules, and one art direction into a **native composition recipe**: background/motif, portrait(s), headline, supporting identity text, logos, and frame. Render multiple candidate previews from those recipes. Different compositions can have different hierarchy, positions, line breaks, and metaphors while keeping required identities and marks fixed. A preview bitmap is a cache, not the only saved deliverable: **Insert composition** materializes editable text/shapes and independently replaceable image layers in the canvas with one undo step. Keep AI-generated image layers separate from deterministic brand/text composition. A raw generated whole-thumbnail image can still be used, but is explicitly labeled flattened and does not satisfy the editable-composition output by itself.

### Automatic layout and editable typography

Add shared **Align**, **Distribute**, **Grid**, **Resolve overlaps**, **Fit headline**, and **Headline treatments** actions for a selected group/artboard. The assistant already has `draw align`, `draw distribute`, grouping and layering; expose/reuse those handlers rather than creating competing algorithms. Native library, diagram components, and other modes can use the same layout actions.

For new layout operations, preview changes to the selected scope; preserve IDs, groups/bindings, locked elements, aspect ratio, and essential brand/safe zones. Model intentional overlap explicitly (a portrait over its background is not a collision). If constraints cannot be satisfied—too many logos, oversized copy, fixed locked objects—show the unresolved conflict; don't delete content or move unrelated artwork. Apply in one undo transaction. Grid supports candidate artboards or selected objects, not only thumbnails.

Headline treatments propose native-text alternatives: emphatic two-line break, condensed stack when the chosen font supports it, or a highlighted key phrase using separately editable grouped text elements. Keep exact supplied copy unless the user explicitly chooses a rewrite. Measure with loaded font metrics, fit within the intended box, preserve hierarchy and minimum readable sizes, and flag overflow instead of ellipsis/truncation or unreadably small text. Editing the words re-runs layout only on explicit Fit/apply, not continuously fighting manual adjustments.

Font integration needs a focused capability check against the actual pinned Excalidraw package: supported family IDs, text measurement, font loading, serialization, and PNG/SVG export must agree. Current official docs expose `FONT_FAMILY`; that is not proof of arbitrary uploaded-font support. Do not implement a global CSS replacement that changes every document's typography. Store unavailable font preferences, mark them “not yet supported in canvas,” and offer an explicit supported choice while resolving integration; exact licensed brand-font rendering remains an open delivery decision if a supported extension is unavailable. Never rasterize editable text to conceal this limitation. [Excalidraw font constants](https://github.com/excalidraw/excalidraw/blob/master/dev-docs/docs/%40excalidraw/excalidraw/api/constants.mdx).

### One-click multi-format adaptation

**Create format variants** has remembered target selections and creates editable copies; it never overwrites the source. Preset dimensions below reuse current product formats, not claims of the latest platform requirements:

| Destination | Initial product preset | What adaptation must do |
| --- | --- | --- |
| YouTube video | 1280 × 720 | Thumbnail hierarchy and lower-right duration clearance. |
| LinkedIn landscape | 1200 × 630 | Reflow headline/portrait/logo layout into the shorter frame. |
| Instagram | 1080 × 1080; optional 1080 × 1920 story | Stack/rebalance subjects and text; preserve required coverage and explicit safe margins. |
| Presentation | 1920 × 1080 | Use a readable presentation composition, not only enlarged thumbnail pixels. |
| Website | 1200 × 630 plus explicit custom dimensions | Preserve the selected crop/focal point and accommodate the intended banner layout. |

Use a small set of declared per-format layout constraints/compositions, measured text, and user-adjustable focal points. Fit portraits without stretching; preview any crop that could cut essential features. The existing proportional `resizeDesign` remains a valid simple resize action, clearly labeled; **Adapt** is new shared work. One click may create several chosen formats after targets are set; generated missing imagery or rewritten copy requires an additional explicit AI action, not hidden paid work during resizing. Each result records the source composition/recipe revision and remains independently editable.

### Export selected assets or a campaign bundle

One shared **Export** surface chooses scope (selected asset(s), artboard(s), or selected campaign variants), format, resolution, and background handling. Preserve fast existing PNG/JPG/SVG buttons. Add transparent PNG for isolated cutouts/logos/native compositions where applicable; JPG cannot retain alpha. Exclude an explicitly identified artboard background from an export-only copy when requested—`exportBackground: false` alone cannot remove a background rectangle already in the scene. Never alter the live scene just to export. Use the existing Excalidraw exporters and verify actual outputs. [Export utilities](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export).

Provide **Download original asset** and **Export selection** as distinct choices. SVG may contain raster image layers and needs font-availability disclosure; it is not automatically a fully vector recreation. Video export initially downloads an existing generated/user-owned clip as-is. The current UI's provider video link is not proof of durable storage or successful downloaded bytes; expired media needs a clear unavailable/recoverable state. No timeline, trimming, or extracting arbitrary YouTube clips is implied.

**Download campaign bundle** packages only chosen formats/artboards/assets into a ZIP with stable descriptive filenames and a small manifest of sizes/formats/source-version IDs. Show contents before export. Do not include private prompts, reference photos, original media, or font binaries by default; those need an explicit eligible inclusion choice. Validate file count, dimensions, alpha, playable clips, and archive paths; make partial failures visible rather than silently calling a partial archive complete. Large exports need progress and Cancel without losing the chosen set. No upload or publication occurs.

## 6. Code touchpoints and ownership boundaries

All paths below refer to the inspected worktree; names for **new** hooks are proposals, not APIs already implemented.

| File / owner | Reuse or proposed hook |
| --- | --- |
| [draw page](/Users/swyx/.codex/worktrees/1128/swyxdotio/src/routes/draw/+page.svelte:71) — **origin/common-foundation owner** | Single integration for mode registry, empty-state readiness, and switcher. Reuse `workspaceSection`, `openWorkspaceSection`, native `DefaultSidebar` workspace tab, `mountWorkspacePanel`. Preserve `saveScene` selection tracking and `focusDesignArtboard` narrow behavior. Do not duplicate these per mode. |
| [design definitions](/Users/swyx/.codex/worktrees/1128/swyxdotio/src/lib/draw-designs.js:1) — future thumbnail/shared-design owner | `DRAW_DESIGN_FORMATS`, templates, workflows, `createDrawingDesign`, `fitThumbnailHeadline`, `portraitPlaceholder`. Add generic blank-frame creation only after B approval; approved AIE template and LS copy changes are C. Keep current native scene format. |
| [page design handlers](/Users/swyx/.codex/worktrees/1128/swyxdotio/src/routes/draw/+page.svelte:878) — shared-design owner, coordinated with origin | `loadOfficialBrandLogo`, `insertDesign`, `duplicateDesign`, `resizeDesign`, `exportDesign`. Shared commands should delegate here. Async insertion must validate originating page/account and recompute append position against current scene on commit; stage files so failure adds no partial design. |
| [command search](/Users/swyx/.codex/worktrees/1128/swyxdotio/src/lib/draw-workspace.js:56) and page `workspaceCommands` — foundation owner | Reuse `action-import-image`, `action-browse-designs`, `design-ls-podcast`, `design-fde-decision`, and existing page actions. Proposed shared blank-artboard, open-history/generate, and frame-action commands supplement—not replace—the catalog. Existing generic `thumbnail/youtube` keywords on every design should not cause speaker cards to be recommended as video templates. |
| [assistant](/Users/swyx/.codex/worktrees/1128/swyxdotio/src/lib/DrawAgent.svelte:305), [tools](/Users/swyx/.codex/worktrees/1128/swyxdotio/src/lib/draw-agent-tools.js:33), [server instructions](/Users/swyx/.codex/worktrees/1128/swyxdotio/src/lib/server/draw-agent.js:35) — shared-agent owner | Suggestion ordering/unsent drafts; preserve existing conversation and budget. Update “closest template” guidance so AIE video work does not silently become a portrait card or LS design. Add approved shared actions to both tool help and execution validation; no permission logic from mode. |
| [image toolbox](/Users/swyx/.codex/worktrees/1128/swyxdotio/src/lib/DrawImageToolbox.svelte:24), [image replacement](/Users/swyx/.codex/worktrees/1128/swyxdotio/src/lib/draw-image-scene.js:177) — common media owner | Keep one processing/controller/draft source and existing geometry-preserving image replacement. Mode must not remount/cancel it. Proposed photo placement can reuse native image handling, but is not the same operation as background-removal replacement. |
| [history](/Users/swyx/.codex/worktrees/1128/swyxdotio/src/lib/draw-generation-history.js:1), page persistence and auth props — **Google-auth owner** | Consume its final account/capability and storage-readiness boundary. Do not create a second identity adapter, reuse legacy password checks, or migrate localStorage/IndexedDB here. |
| [public LS asset](/Users/swyx/.codex/worktrees/1128/swyxdotio/static/assets/latent-space-hex-gradient.png) — brand approval | Existing public asset only. New public assets require explicit clearance; personal skill directories never become automatic app asset catalogs. |

Additional shared work for the expanded requirements (module names illustrative, no files created):

| Boundary | Implementation responsibility after approval |
| --- | --- |
| Kit/asset/source metadata and private objects | A small typed repository/service for personal kits, house revisions, asset versions, channels, and episode briefs, consuming the auth owner's identity/storage contract. Every read/write/download rechecks ownership server-side. Asset credentials and private URLs do not enter public bundles. |
| Source ingestion / quote-title pipeline | Dedicated server boundary for public channel reads and optional authorized caption access, plus resumable transcript extraction with source-span validation. Validate URL hosts/redirects and reject internal/private network targets; don't fetch arbitrary user-supplied URLs as a generic server proxy. Preserve manual transcript input when channel/API configuration is unavailable. |
| Prompt compiler / composition recipe | Shared deterministic rendering of house revision + source-backed brief + chosen direction + selected feedback + supported reference attachments. Return a user-visible effective prompt and native composition recipe. Imported source text cannot override authorization. |
| Durable batches / versions / feedback | Reuse `draw-fal-models.js`, `draw-fal-image.js`, `draw-fal-queue.js` and server authorization/provider adapters; extend actual multi-reference transport where supported. Add shared candidate destination and persisted server job state. Replace the local cache as the canonical store for new durable workflows in coordination with auth; do not implement a separate thumbnail-only queue or migrate legacy histories in this planning track. |
| Layout / typography / adaptation / exports | Extend `draw-designs.js`, common agent handlers, `resizeDesign` and `exportDesign` through focused shared modules when warranted. Reuse native Excalidraw serialization/export; separate deterministic layout from AI suggestions. New campaign packaging is not a publication endpoint. |

The existing page remains the host, not the location for all new persistence, ingestion, job, layout, and export logic. Shared foundation owns navigation and mode integration; auth owns identity/scoping; bounded feature modules own the remaining behavior. Final runtime/storage choices must be reconciled before code or infrastructure changes.

**Preset payload requested from the foundation:** label/copy; AIE/LS recommendation groups; references to shared action/template IDs; desktop/mobile initial panel selection; unsent suggested-request IDs. No callbacks that insert art, no `allowedTools` list, no model whitelist, account identifiers, private paths, or embedded asset bytes. Persist no mode field in the scene. Recommend in-memory preference for MVP; optional later account/browser preference belongs to auth/foundation, not per-page data. Leave URL parameter naming and global default selection to origin reconciliation.

## 7. State, authorization, and failure behavior

| State | Required behavior |
| --- | --- |
| Restoring/loading/unknown | No empty welcome until the account/page scene has positively loaded and contains zero nondeleted elements. Show loading or recovery status, not fabricated emptiness. An empty frame still counts as content. |
| Nonempty/offscreen content | No welcome overlay or autofocus. Panning to empty space does not qualify. Existing frame/image/selection, viewport, styles, drafts, undo/redo, and history remain unchanged by mode entry. |
| Explicit starter into existing page | Append a new frame outside live bounds; never replace the scene. One undo removes only that insertion. Explicit insertion may select/focus the new frame, unlike mode switching. |
| Image selected | Existing image tools stay available and preserve active action/draft/models. Selecting a logo does not infer that it is a portrait or automatically run removal. Parent-frame actions remain reachable through native frame selection/shared command. |
| No image selected | Templates, native tools, diagrams, import, and shared Generate/History launchers stay reachable. Image-dependent actions explain “Select an image” rather than inventing a dummy image or demanding a mode switch. History recipe restoration is explicit, never a mode side effect. |
| Anonymous | Public cleared starters, native editing, local cleanup, duplicate, and local export available. “On this device” is honest storage status. AI/cloud controls show the same capability reason as in every mode; no automatic login. |
| Signed in, not AI-entitled | Account storage only as granted by auth owner; sign-in is not owner/paid permission. No private Swyx photos, prompts, examples, or allowance. Public starter availability stays unchanged. |
| AI-entitled | Same tools plus authorized operations; show prompt/reference upload disclosure and estimate/budget before explicit Run/Send. Opening a mode, workflow list, or template never starts inference. |
| Account changes/sign-out | Wait for auth owner's scope transition; no previous account's brand assets/history/drafts flash in the next scope. Async jobs/results remain bound to origin account/page and must not write into the new account. No implicit local-to-cloud adoption. Preserve recoverable prior work within its proper scope rather than copying or deleting it here. |
| In-flight work, mode switch | Don't unmount operation controllers, discard drafts, resubmit generation, or hide Cancel/progress. Foreground panel changes must leave a compact operation indicator reachable. Cancel behavior and possible already-incurred cost remain the shared queue's contract. |
| Logo/reference load fails | Show a recoverable inline error; keep the original scene intact and allow retry or explicit neutral artboard. Never substitute a invented mark or silently insert a half-branded template. File chooser cancel changes nothing. |
| Cleanup/generation/export fails | Keep original image/artboard, visible error, and retry/cancel where applicable. Never auto-fall back from local processing to paid inference. Export failure is not a successful download. |
| Local/cloud/history storage fails | Distinguish unsaved/local-only from synced. Scene limit does not justify silently shrinking originals or deleting history. Missing history is unavailable, not “no generations.” Local export remains available when possible. |

**Authorization boundary:** public starter kits are curated assets with public-use clearance; a user's supplied photos/logos and saved kits belong only to that user's authorized scope. Merely picking AIE or LS does not add someone to an organization or grant owner rights. No thumbnails-specific auth tables, sharing grants, storage migrations, or privileged inference routes.

Expanded workflow invariants: library **Save**, model **Attach**, canvas **Insert**, house **Promote**, and provider **Generate** are distinct actions. Account switch must detach old-scope UI immediately and keep any result scoped to its original account/episode, regardless of active page/mode. Missing captions, expired reference media, deleted assets, unsupported fonts, partial extraction, and failed candidate slots are explicit unavailable/partial states. Saving feedback never runs inference or changes the active house prompt. Unlisted source URLs, transcripts, and private references are excluded from generic telemetry and public galleries.

## 8. Focused verification after approval

Extend natural existing suites; no new test file is needed for assertions already covered there.

| Suite / check | Required additions or retained evidence |
| --- | --- |
| [draw tests](/Users/swyx/.codex/worktrees/1128/swyxdotio/tests/draw.spec.js) + [workspace tests](/Users/swyx/.codex/worktrees/1128/swyxdotio/tests/draw-workspace.test.mjs) | Across all three modes, same full command/model/tool inventory and authorization outcomes; only suggestion order/default UI changes. Repeated switching preserves scene elements/files, selection, geometry, undo/redo, history, prompts/model settings; no page creation/scene save caused solely by mode switch. Actual readiness, deleted-only scenes, offscreen content, and restore failures covered. |
| [design unit tests](/Users/swyx/.codex/worktrees/1128/swyxdotio/tests/draw-designs.test.mjs) | Blank action creates exactly one 1280 × 720 frame/background with unique IDs and editable children. Approved template inventory accurately separates video/speaker/slide; no personal sample values. Extend safe-zone check to **rendered bounding-box intersection**, not just element origins (current test misses long text extending into the zone). |
| [design browser tests](/Users/swyx/.codex/worktrees/1128/swyxdotio/tests/draw-designs.spec.js) | Explicit insert/duplicate/resize each undo cleanly without changing original work; real photo stays separate from text/logo; exact PNG/JPG dimensions and filenames; SVG retained. Failed/slow logo fetch, scene edits during fetch, page/account switch before completion, double-click insertion tested. |
| [image tests](/Users/swyx/.codex/worktrees/1128/swyxdotio/tests/draw-image-tools.spec.js) + [image-scene tests](/Users/swyx/.codex/worktrees/1128/swyxdotio/tests/draw-image-scene.test.mjs) | Selected image mode-switch preserves toolbox action/draft/model settings and identity/geometry; existing progress/cancel survives. Portrait photo operations don't flatten other layers. Keep current local-tool failure, native undo, scene-size, and geometry checks. |
| [assistant tests](/Users/swyx/.codex/worktrees/1128/swyxdotio/tests/draw-agent.spec.js) + [tool tests](/Users/swyx/.codex/worktrees/1128/swyxdotio/tests/draw-agent-tools.test.mjs) | Suggestion click sends nothing and never overwrites an existing draft without confirmation. AI entitlement independent of mode. All shared design commands discoverable; AIE request does not select portrait/slide incorrectly. Mock inference; do not spend for UI verification. |
| [page tests](/Users/swyx/.codex/worktrees/1128/swyxdotio/tests/draw-pages.spec.js), coordinated with auth owner | Replace password fixtures using its final test session contract; test anonymous/member/AI-entitled and account switching. Never treat Google sign-in alone as paid approval. No migration assertions invented in the mode track. |
| Network assertions | On entry, repeated switching, and welcome dismissal: zero inference submissions, media upload, model-weight downloads, private reference fetches, or mode-triggered page writes. Normal first-party JS/static UI/auth/scene reads are not falsely banned. Explicit template insertion may read a public logo and the authorized edited scene may subsequently sync. |

**Visual pass:** inspect desktop 1440 × 900 and phone 390 × 844 plus 320px width, with mouse and touch/keyboard. Verify no toolbar overlap, nested scroll traps, stretched preview, forced mobile keyboard, or inaccessible export/Cancel. Escape/outside dismiss and focus return work; Cmd/Ctrl-K and native undo work on both key conventions. Use cleared fixtures, not private guest photos.

For each AIE-neutral, LS, and explicitly selected FDE example, inspect the actual exported image at full size and approximately 320 × 180: exact copy, recognizable supplied people, complete requested company coverage, logo aspect/alpha, dark-clothing separation, no portrait/headline collisions, lower-right clearance. Compare variants at equal scale. Placeholder text/figures must not remain in an intended final delivery. At least one long hook, long company name, portrait-oriented photo, two-person composition, and offline/asset-failure case. If D is approved, verify review guides never appear in export, serialized scenes, or assistant artwork capture.

### Expanded workflow acceptance tests

- **Assets/tenancy:** save logo/font/cutout and reuse across visits/pages; same channel name in two accounts never joins their data. Verify private object ownership and signed-link expiry, unsupported/unsafe-file errors, delete dependencies, and separation of public starter versus personal copy. Asset selection alone sends no provider request.
- **Channel/source access:** canonical channel/video identity, pagination and partial coverage, duplicates, quota failure, changed/private/deleted videos, unlisted-link privacy, caption access unavailable, explicit supplied-transcript path, cache expiry/deletion, and rejection of non-YouTube/internal-network URLs. No unexpected OAuth scope expansion or video downloading.
- **Quotes/titles:** a long fixture exceeding a single request context, interrupted chunks/resume, coverage, source-span match for every quoted string, no invented timestamp/speaker, ASR uncertainty, paraphrase versus verbatim labels, and unsupported user hints. Prompt-injection text in sources cannot trigger actions or overwrite house rules.
- **Prompt/feedback versions:** edit/replay old recipe; favorite/reject with scoped notes; explicit house diff/promotion/rollback; old candidate snapshots unchanged after house edits. Privacy deletion makes dependent recipes honestly non-replayable. Model mismatch or reference-count overflow cannot silently drop attachments.
- **Diverse generation:** four declared directions differ in composition/hook mechanism, not only color; exact requested cast/brand constraints survive. Test approved batch totals, stop admission, provider cancellation, partial failures, budget cap, uncertain submit/reconnect, and failed-only retry without duplicate charges. Closing/reopening or changing modes cannot auto-submit again. Candidate results never mutate artwork until Insert/Replace.
- **Editable composition/layout:** after insertion, edit headline and replace portrait/logo independently. Align/distribute/grid stay in selection scope; intentional overlaps, locked items, extreme aspect ratios, multiple logos, and unsatisfiable layouts behave predictably. Undo restores original IDs/geometry/text. Validate metrics after font loading; missing fonts and text overflow are visible, never silently rasterized/truncated.
- **Adapt/export:** create YouTube/LinkedIn/Instagram/slide/website variants while source is unchanged; inspect meaningful re-layout rather than proportional shrink. Verify exact sizes, unclipped essential faces/text, alpha on transparent PNG, SVG text/font behavior, original-asset byte identity, clip availability/playback, ZIP names/count/manifest, no unintended private attachments, and honest partial failure/cancel state.
- **Visual workflow:** 1440px desktop contact sheet and 390/320px phone panes, large version sets, keyboard arrows/focus, optional swipes plus explicit controls, stable selection during arrivals, readable feedback and cost, visible Cancel, single-scroll surfaces. Test Assets/Sources/Prompts/Versions and every layout/export action from all three modes under the same entitlement matrix.

New cohesive feature modules may warrant their own focused tests; extend existing draw/image/design/agent suites where they already own the behavior. All automated provider/caption paths use fixtures/mocks until a separate live run is explicitly authorized. These checks are planned, not performed.

**Checks performed in this planning turn:**

```text
node --test tests/draw-designs.test.mjs tests/draw-workspace.test.mjs \
  tests/draw-image-scene.test.mjs tests/draw-agent-tools.test.mjs \
  tests/draw-fal-queue.test.mjs
36 passed; 0 failed. Queue tests use mocks, not paid jobs.
```

Do not run the default Playwright web-server command during this plan: it invokes a build. No browser screenshots of the proposed application state exist yet; layouts above are wireframes, not implementation evidence.

## 9. Material decisions for approval

| Decision | Recommendation and tradeoff |
| --- | --- |
| Delivery scope/order | All six creative pillars and E1–E5 are requested planned scope. Recommend incremental delivery: working A+B canvas → E1 reusable assets/house revisions → E2 editable candidate loop with basic layout/typography → E3 source ingestion → completed E4 adaptation/E5 exports. Do not call A+B the complete feature. Each slice stays working and independently verifiable. |
| AIE brand readiness | Approve neutral AIE start now; provide 2–3 approved video references/cleared logo assets before C's branded kit. Waiting for the kit would improve brand consistency but delay the first useful entry experience. |
| LS treatment | Generic LS by default; FDE explicit. Reuse current public asset/template initially, then approve sparse-copy/provenance polish. This avoids falsely treating the richer retained raster style as already reproduced by editable native layers. |
| House learning | Explicit immutable prompt/reference revisions with previewed promotion and rollback. Feedback is saved immediately but only affects a run/house when selected. Slightly more deliberate than automatic learning, but prevents accidental style drift and preserves replay. |
| Generation defaults | Start with four substantively different directions and one candidate/model per direction; support more/targeted batches with visible total and hard budget cap. Separate direction drafting from rendering, and candidate generation from canvas insertion. |
| Channel and unlisted access | Save channels without implying ownership; add read-only reference browsing. Prefer user-owned original assets/transcripts for durable generation inputs. Automatic caption retrieval requires separate verified permission; API-derived conditioning and retention need a supported platform-compliant route before shipping. |
| Fonts and adaptation | Require editable typography and real re-layout; do not silently flatten or substitute. Store supplied licensed font assets now in E1, verify actual font integration before promising exact custom-font rendering. If it requires an editor fork, surface that decision rather than introducing one implicitly. |
| Campaign export boundary | Include assets, transparent PNG/SVG, artboards, existing clips, and selected ZIP bundles. Exclude unchosen private prompts/references/fonts and YouTube publishing. Downloading clips does not add a timeline/editor. |
| Shared foundation contribution | Recommend “Thumbnails,” desktop Design sidebar/mobile compact welcome, no preselected brand, memory-only preference initially. Origin reconciles names, global default, switcher position, persistence/URL policy, and common Generate/History entry with the other plans once all are approved. |

The user's additions establish desired product scope, not build authorization. Approval must still select the implementation sequence after shared-foundation/auth reconciliation. It does not authorize public/private cross-account asset reuse, paid live inference, account connection, infrastructure provisioning, or publication during this planning task.

Implementation was subsequently approved. The shared release still requires the originating task's integration and the auth owner's explicit cutover readiness.
