# Shared /draw workspace integration

The user approved central implementation after approving the three feature tracks. This record supersedes the planning-only gates in the original [modes brief](./draw-workspace-modes-brief.md).

## Central ownership and decisions

One `/draw` route, one native Excalidraw editor, one command catalog, one Generate controller, and one private creative library. The starting experiences are **Thinking**, **Thumbnails**, and **Experiment**. Every capability remains available in every mode; modes are not document types, permissions, separate controllers, or scene metadata.

The originating task owns mode defaults, welcome UI, navigation/panel coordination, cross-track integration, save recovery, and the combined release. Children stopped shared-page changes and delivered isolated checkpoints. The subsequent `/tools` visual redesign remains separately owned; do not replace its work with this branch's snapshots. The Thinking task's later provider checkpoint `2fa0d4a` is also integrated: server-only Cloudflare/OpenAI/DeepSeek/Featherless selection, sanitized availability, and one scrollable assistant body with a fixed composer. Provider activation still requires configuration; no new paid canary ran.

| Track             | Integrated checkpoint                                                  | Shared entry points                                                                                                            |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Thinking          | `96a91c2`, export tests `8dd80c4`, bounded live-response fix `664b69d` | `architecture-comparison`, `agent-tool-loop`, `argument-map`; assistant draft workflows `notes-to-diagram`, `essay-ready`      |
| Experiment        | Complete branch through `de6cf8d` (not tip-only)                       | `openGenerationComposer(options?)`, one mounted `DrawImageToolbox`, shared recipes/runs/jobs/results and private Saved library |
| Thumbnails        | `80ebbe1`, after Experiment's copies of `59c2c79` and `8efaa27`        | `DrawCreativeWorkspace.show(view)`, `close()`, `onOpenChange`; `creativeSceneActions`                                          |
| Auth and activity | Production master `3781d11` / PR555                                    | Verified Google identity, account-scoped data, all-signed-in funded AI with bounded usage, metadata-only logs                  |

Root reconciles the latest `origin/master` before release, including independent podcast and `/tools` work. No competing auth migration, asset database, queue, quota ledger, or provider client was introduced.

## Starting defaults

- Thinking shows three native starters and a draft-only rough-notes assistant action. Insertion requires an explicit click and is one native undo.
- Thumbnails shows the shared Compose flow, the existing Latent Space starter, and Assets. Merely entering this mode creates no artboard and attaches no private references.
- A genuinely new blank Experiment page opens the same idle prompt-first Generate composer. Returning to a drawing or reopening a draft does not reset models/settings or launch inference.
- The compact common navigation exposes Templates, Assets, Generate, Assistant, and Export everywhere. Phones use one Tools menu; native Library hides conflicting page/navigation overlays while open.
- Mode preference uses the verified account's existing browser-storage namespace. It is not cloud scene data. `Just draw` is always available; starter suggestions can be reopened deliberately from the mode menu.
- Loading, unavailable identity/restoration, deleted/undo-cleared scenes, and an empty viewport over nonempty artwork do not masquerade as new blank pages.

## Panel and generation contracts

Controllers stay mounted when changing mode, selecting another tool, or opening Library. Only the foreground surface changes. Desktop media/assistant windows start on the right; phones use a bounded bottom panel with a single scrolling surface. Existing drag, minimize, keyboard submission, draft protection, and native shortcuts remain.

Background job controls reserve their own space instead of covering the active composer. Custom mobile form controls are at least 16px; opening the assistant/model picker on touch or narrow screens does not autofocus a text field. Explicit Rename and keyboard shortcuts still focus deliberately, and pinch zoom is not disabled. Browser tests verify these contracts; physical iPhone keyboard/focus-zoom behavior is not claimed as tested.

The shell binds the assistant's `open`, `minimized`, and `running` presentation state and uses its `showAssistant()` / `stop()` methods. Generate exposes `openGeneration()`, `openHistory()`, and `cancelGeneration()`. Running work remains visible and cancellable when covered/minimized. Opening the same composer never starts another job.

Thumbnail versions open this shared composer with their exact saved prompt/context. Only explicitly selected reference IDs are resolved through authenticated private asset reads. The first generation layer supports **one reference**; multiple-reference requests show an honest inline error, without silently dropping inputs or sending anything to a provider. Opening a version is not Generate.

Native output insertion stays explicit, dimension-aware, selection-aware, and undoable. Image decoding is guarded against page/account changes. Mode and panel changes do not cancel a batch; page changes remain blocked until generation/insertion is finished or cancelled.

## Persistence, privacy, and limits

- The cloud drawing limit remains **1,800,000 bytes**. Original dimensions and useful image compression are handled before insertion; videos and generation histories are not embedded in cloud scene JSON.
- Signed-in edits are journaled locally by account/page before the cloud debounce, including edits during a cloud outage. Reload prefers an unsynced journal to older cloud content. PUTs are serialized and only acknowledgement of the exact revision clears that journal.
- Oversized drawings stay recoverable locally but are never falsely reported as cloud-saved. Corrupt/unavailable recovery data fails visibly without overwriting it with a blank scene. A failed destination-cache write leaves the source canvas/page in place. Explicit page deletion clears only that page's recovery data after server success.
- Generate's existing IndexedDB history remains bounded to 32 entries per account/page. Active jobs are **session-only**; no reload-resume guarantee is claimed. Saved video recipes are metadata, not archived clips; provider URLs can expire.
- Reusable assets, brand/house revisions, briefs, source evidence, and Saved recipes use the single authenticated creative API. Binary assets live in private R2; the companion Durable Object stores typed metadata only.
- Google/FAL/provider credentials stay server-side. Activity telemetry remains bounded action/status metadata, not prompts, references, transcripts, or generated assets. Owner-wide logs grant no tenant asset access. Public defaults contain generic examples, never personal library contents.
- The local build/prerender proxy disables remote bindings; the normal browser test preview uses `--local`. Paid canaries are separate, explicit opt-ins.

## Verification and release

Run focused Node suites and `npm run check`, then a production build before browser tests. The browser suite exercises real Excalidraw/native undo, same-origin local Workers/DO/R2, and fake local identities; provider inference is mocked. Do not run a build while tests consume its static assets, and do not reuse another worktree's Worker preview.

Central browser checks cover mode/default isolation, draft/model preservation, responsive Library coordination, in-session progress/cancel, pending-save reload/offline recovery, exact deletion cleanup, and cache-failure page ownership. Existing drawing/background-removal/components/pages/design/assistant/creative/generation/log suites remain required. Final totals and deployment evidence are recorded after the final combined run, not inferred from child results.

Deployment requires the **main Worker only** to bind private `DRAW_ASSETS` to `swyxdotio-draw-assets`. Do not enable an R2 public development URL/custom domain. Deploy the compatible drawing companion before the main Worker, preserving the existing `DrawingPages` namespace and retention hooks. No new Durable Object migration is required. Existing Google/FAL secrets must remain unchanged. Public YouTube channel lookup optionally needs server-only `YOUTUBE_API_KEY`; saving a URL does not.

Current central release status: local integration/verification in progress; not pushed, merged, or deployed. The earlier Google-auth production cutover is complete, but current root CLI checks report Wrangler authentication unavailable and GitHub's saved token invalid. Reauthentication, private-bucket provisioning, final combined tests, and live source/version/binding/browser verification are required before claiming this Draw release is live.

## Explicit limits

- The Thinking task's approved paid evaluation was **partial**, not three successful examples: architecture was useful; delivery remained semantically generic; rough notes failed. See [live evaluation](./draw-thinking-live-evaluation.md). Native starters and mocked tool execution passing do not prove agent aesthetic quality.
- No new AIE conference-video house style is approved. Existing templates and neutral editable layouts do not imply one.
- Uploaded font originals are retained assets, not arbitrary custom fonts rendered by native Excalidraw.
- Multi-reference mixing, first/last-frame video composition, durable provider job resume, and a full video editor remain later layers.
- Root makes no paid fal/provider calls as part of consolidation or release verification.
