# Private creative workspace

This is shared `/draw` functionality, not a permission-gated mode. Entering a mode or opening this workspace creates no art, uploads no files, and runs no inference. The originating draw task owns the common shell and release.

## Working slice

- Account-private image/font originals, reusable kits, immutable house revisions with explicit promotion, briefs, composition versions, feedback, channels and Experiment's saved modifier/reference/generation records.
- Explicit channel lookup and public-video browsing with `YOUTUBE_API_KEY`; URL-only bookmarks work without it. **Save thumbnail to Assets** fetches only the fixed YouTube JPEG thumbnail path, then explicitly uploads through the same private asset API. Bookmarking, saving, model attachment and canvas insertion remain different actions.
- Pasted TXT/SRT/VTT, up to 500,000 characters: bounded quote extraction, exact source offsets, partial coverage, saved completed chunks, selected-evidence title passes. Unlisted URLs alone cannot supply transcripts; there is no video/audio download, caption OAuth, or publication integration.
- Four native editable compositions, real portraits and exact user-supplied names/logos, measured text fitting, timestamp clearance and 320px review. Creating versions does not change the scene. Text-only fallbacks are visibly different but do not invent a person.
- Native format adaptation preserves the original. PNG/JPG/SVG, original asset downloads, transparent export and a bounded artwork-only campaign ZIP. Licensed WOFF2 originals are stored, not installed as arbitrary Excalidraw fonts.

Generated images, model selection, jobs, retry/cancel, cost accounting and history use Experiment's shared facade/runner. This feature does not introduce a second scheduler. Its four **editable layouts** are deterministic; they are not four paid model outputs. Durable/reopenable provider batches still require shared lifecycle work; saved compositions and house revisions are durable metadata, not resumable provider jobs.

## Shell integration

Mount `DrawCreativeWorkspace` once per resolved Google identity, keyed by that identity (or guest). Do not read private caches or call it before account resolution. On account invalidation, unmount/detach it immediately; its destruction aborts outstanding work. Never pass an owner or client-selected tenant namespace.

Component exports:

```ts
show(view?: 'assets' | 'kits' | 'sources' | 'compose' | 'versions' | 'export'): Promise<void>
close(): void
```

`close()` dismisses the surface, returns focus and preserves drafts; it does not stop an explicit source run. The optional `onOpenChange(open: boolean)` callback coordinates a single foreground surface. Source runs have their own Stop button. A mode switch must not remount this component or reset drafts.

Required callbacks are supplied by `creativeSceneActions(getContext)` in `src/lib/draw-creative-scene.ts`:

| Component prop                         | Scene adapter   |
| -------------------------------------- | --------------- |
| `onInsert(recipe)`                     | `insert`        |
| `onInsertAsset(asset)`                 | `insertAsset`   |
| `onBlank()`                            | `blank`         |
| `onAdapt(formats)`                     | `adapt`         |
| `onExport({format,transparent,scope})` | `download`      |
| `onSaveSelected()`                     | `selectedAsset` |

Context supplies the current editor, `convertElements`, `captureImmediately`, verified `userId`, `pageId`, Excalidraw `exportToBlob`/`exportToSvg`, focus and status callbacks. Async operations recheck editor/account/page before inserting/exporting. Mutations use native immediate capture; insertion and adaptation leave existing elements intact.

Optional `onGenerate({prompt,referenceAssetIds,context})` opens the shared composer **without starting a job**. Resolve only the explicitly selected private asset IDs into transient image inputs. Context carries brief/house revisions, direction and parent composition IDs. The shared composer must expose any first-layer one-reference limit rather than silently dropping references. Do not persist data URLs in metadata records.

The current page patch contains only imports, one component mount, the scene adapter, command `action-open-creative-library` and one native Library entry. Root may replace these discovery entries with common Assets/Compose/Export navigation while retaining the callbacks.

## Persistence and deployment prerequisites

The feature baseline includes auth `cfbfda4`; the combined integration must retain newer auth/logs `0a6e570` and the other draw tasks. All account writes use same-origin checks and `X-Tools-User`; stale sessions return `409 account_changed`. Creative records always use server-derived `creative:google:${user.id}`, including the owner. Owner activity visibility does not expose tenant assets.

- `DRAW_PAGES` remains the existing companion DO binding. Creative SQLite tables are lazily initialized within that account's creative namespace; no new DO class/migration is declared.
- `DRAW_ASSETS` is a dedicated **private** R2 binding (`swyxdotio-draw-assets` in configuration), not a public bucket/domain. It has only been exercised with local Wrangler storage in this task. The release owner must provision/verify it before shipping binary storage. Do not reuse public podcast media.
- Optional server-only `YOUTUBE_API_KEY` enables official channel/uploads-playlist lookup. Missing configuration gives an explicit unavailable state; no account connection is implied. Fixed-thumbnail retrieval does not require this API key.
- Source analysis uses the existing `AI` binding and shared funded-AI reservation policy. No live inference canary or production quota/log verification was performed here.
- Direct dependency added: `fflate` 0.8.3 for campaign ZIPs, lazily loaded. Existing npm lockfile retained.
- Add metadata-only asset/kit/source action names to the centrally owned activity vocabulary if instrumented during integration. Never send prompt text, filenames, private source URLs, transcripts or image contents to generic logs.

No infrastructure was provisioned, no media published and no deployment performed by this feature task.

## API contract

Base `/tools/api/draw/creative`:

- `GET /library` returns `{records:{kits,briefs,compositions,feedback,channels,saved},assets,limits,assetsAvailable}`.
- `POST /records/{kind}` with `{data}`; `PUT /records/{kind}/{id}` with `{revision,data}`. Responses are direct `{id,kind,revision,activeRevision?,data,createdAt,updatedAt}` envelopes.
- `DELETE /records/{kind}/{id}` with `{revision}`; referenced records/assets cannot be deleted. Deletion UI is not in this slice.
- Kit `GET /records/kits/{id}/revisions[/n]`; `POST /records/kits/{id}/promote` with `{revision,houseRevision}`. Draft snapshots are immutable; promotion changes the pointer and envelope revision without mutating old snapshots.
- `POST /assets` with raw bytes, `Content-Type`, `X-Asset-Name: encodeURIComponent(name)` and `X-Asset-Role`. Returns direct `{id,name,mimeType,role,size,status,revision,...}` metadata, **not** `{asset:...}`.
- `GET /assets/{id}` returns authenticated private/no-store bytes; `DELETE` takes `{revision}`. No R2 key/public URL is exposed.
- Strict schema lives in `workers/draw/creative-library.js`. Saved-generation `createdAt` is numeric and `modelKind` uses the shared `text-to-image|image-edit|image-to-video` values. Metadata-only video saves preserve recipes, not output URLs/bytes.

Limits: 100 assets / 100 MiB total, 8 MiB per PNG/JPEG/WebP, 2 MiB per inert WOFF2, 8 MiB metadata, 100 house snapshots per kit. SVG uploads are rejected. Briefs allow 500k characters subject to the UTF-8 byte cap; nothing is silently truncated. Source runs default to 4 chunks, max 8 per explicit click, about 12k characters/chunk; title passes accept up to 80 selected quotes / 32 KiB evidence. Shared user/site quotas may stop a run earlier.

## Verification and known boundaries

Unit tests cover tenant isolation, optimistic concurrency, pending-upload accounting, private response headers, bad formats, account changes, immutable revisions, bounded bodies, source provenance and partial resume, canonical saved metadata, layouts and export privacy. Browser tests exercise actual local DO/R2 with signed localhost fixture identities and mock all AI; verify editable native layers, untouched existing content, exact PNG size/alpha, ZIP contents, undo, guest isolation and 390px layout. Source UI tests use mocked provider responses, not real transcript inference.

Keep live integration claims separate: test fixtures are not real Google OAuth consent; local R2 is not provisioned production R2; a mocked LLM pass is not a model-quality canary. AIE conference-video styling remains unapproved and neutral/user-supplied. LS uses the already-public repository mark, never private skill photos or generated examples.

Observed pre-existing page concern handed to root: reloading before the debounced cloud save can let an older cloud scene replace newer local pending content. Feature browser tests await actual cloud persistence before deliberate reload. This feature has not changed the shared page synchronization protocol.
