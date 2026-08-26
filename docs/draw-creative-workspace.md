# Private creative workspace

This is shared `/tools/draw` functionality (`/draw` redirects here), not a permission-gated mode. Entering a mode or opening this workspace creates no art, uploads no files, and runs no inference. The originating draw task owns the common shell and release.

## Working slice

### Source-first onboarding and few-shot references

The common **Sources & examples** entry opens `show('start')`, not Assets. A new account sees a three-part show brief (source, examples, save/compose) with explicitly applied starter fields. Returning accounts see recent saved shows and their house-kit controls. Opening, closing, changing modes or browsing public examples does not create records, insert artwork, attach images or submit provider jobs. There is no separate onboarding store: existing private briefs/kits determine the first-run presentation, and unsaved drafts stay in the mounted account controller.

`DrawShowBrief.svelte` owns the onboarding/returning layout and `DrawReferenceExamples.svelte` owns the public reference shelf. `draw-creative-examples.js` validates example selections and compiles text demonstrations. Public data is the dated `draw-reference-catalog.json`; evidence, channel disambiguation, all 70 collection slots and refresh instructions are in [the research record](research/draw-channel-references.md). Latest/Popular cover the official Videos tab, not a complete all-time inventory including Shorts/Live. Public image URLs are displayed with no referrer; image bytes are not rehosted in the bundle or automatically saved into anyone's private library.

The initial snapshot has 70 collection slots / 69 unique videos across the seven requested channels; 57 prominent thumbnail headlines were visually transcribed and 12 remain unavailable. Creator title/hook examples are **not** claims about the new episode, transcripts, endorsements, approved AIE style, or the creators' private prompts. Four editable show starters are original suggestions. Each example has explicit Title/Hook/Visual direction toggles, with a six-example cap. **Try as a demo brief** separately previews field replacement; applying preset, demo or imported metadata fields has a local undo action. Saving is always explicit.

Both briefs and immutable kit revisions may include `fewShot:{catalogVersion,examples:[{id,fields,note?}]}`. Choosing an active house copies its pinned text-example selection, not image bytes, into the show. Title requests validate selected public IDs/roles before reserving AI quota and send only selected title/hook demonstrations alongside independently validated episode evidence. Image-composer prompts include text examples and visual observations; the shared provider's one-image limit still applies. Selecting visual references does **not** imply that an image model saw them. Unknown IDs, stale catalog versions and unavailable hook text require review rather than silent substitution. Saved composition prompts remain their exact original snapshots.

`POST /tools/api/draw/creative-source` additionally accepts `{action:'video',video:<URL or 11-character ID>}`. With `YOUTUBE_API_KEY`, it uses fixed `videos.list` to retrieve available metadata. Without the key, fixed YouTube oEmbed can return title/channel/thumbnail only, with explicit missing-field warnings. It never falls back after configured API permission errors, never follows arbitrary redirects, never retrieves captions/audio, and never writes to YouTube. Import responses are staged for user-selected field application; private metadata is only persisted with an explicit brief save. An unlisted URL requires direct lookup and is not discovered from the public channel feed.

Catalog refresh is an explicit offline research command, not a runtime scraper or background monitor. Refreshing the catalog drops visual annotations until reinspection; version mismatches require existing selections to be reviewed. The image model reference-limit upgrade and live creative-quality acceptance remain separate shared-generation work.

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
show(view?: 'start' | 'examples' | 'assets' | 'kits' | 'sources' | 'compose' | 'versions' | 'export'): Promise<void>
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

The onboarding increment changes only the canonical `src/routes/tools/draw/+page.svelte` discovery hooks: one Sources & examples action, the native Library entry, the Create a thumbnail command target and the accepted view union. Existing Assets, Generate, Assistant and Export entries remain. The already-mounted controller, foreground coordination, account scope and per-page storage keys are unchanged.

## Persistence and deployment prerequisites

The onboarding increment is based on `origin/master` at `97b9549`, which already includes the shipped creative workspace, Google auth/logs and canonical route move. All account writes use same-origin checks and `X-Tools-User`; stale sessions return `409 account_changed`. Creative records always use server-derived `creative:google:${user.id}`, including the owner. Owner activity visibility does not expose tenant assets.

- `DRAW_PAGES` remains the existing companion DO binding. Creative SQLite tables are lazily initialized within that account's creative namespace; no new DO class/migration is declared.
- `DRAW_ASSETS` is a dedicated **private** R2 binding (`swyxdotio-draw-assets` in configuration), not a public bucket/domain. The release owner confirmed this binding and private bucket during the prior PR558 release. This increment changes no bucket configuration and verifies storage against local Wrangler. Recheck the active production binding during release; do not reuse public podcast media.
- Optional server-only `YOUTUBE_API_KEY` enables official channel/uploads-playlist lookup and richer exact-video metadata. Without it, channel browsing remains unavailable; exact-video lookup uses limited oEmbed. No account connection is implied. Fixed-thumbnail retrieval and the bundled public catalog do not require this API key.
- Source analysis uses the existing `AI` binding and shared funded-AI reservation policy. No live inference canary or production quota/log verification was performed here.
- The shipped workspace already uses lazy-loaded `fflate` 0.8.3 for campaign ZIPs. This increment adds no dependency or lockfile change.
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

The source-first onboarding checkpoint passed 451 unit tests, 98 drawing browser tests (four explicit live-inference tests skipped), Svelte check with zero errors/warnings, and the production build. Browser tests use isolated local worker names, actual local DO/R2, signed fixture identities and mocked provider responses. Desktop and 390px screenshots were inspected with real public thumbnails loaded. A read-only public-video oEmbed canary returned the expected Latent Space title/channel/thumbnail; no real unlisted episode was supplied, so unlisted behavior has contract tests but no private-video canary. This is local verification, not a deployment or model-quality claim.

Unit tests cover tenant isolation, optimistic concurrency, pending-upload accounting, private response headers, bad formats, account changes, immutable revisions, bounded bodies, source provenance and partial resume, canonical saved metadata, layouts and export privacy. Browser tests exercise actual local DO/R2 with signed localhost fixture identities and mock all AI; verify editable native layers, untouched existing content, exact PNG size/alpha, ZIP contents, undo, guest isolation and 390px layout. Source UI tests use mocked provider responses, not real transcript inference.

Keep live integration claims separate: test fixtures are not real Google OAuth consent; local R2 is not provisioned production R2; a mocked LLM pass is not a model-quality canary. AIE conference-video styling remains unapproved and neutral/user-supplied. LS uses the already-public repository mark, never private skill photos or generated examples.

The release owner fixed the earlier pre-debounce reload race in the shared page before this increment. This feature does not change that synchronization protocol. Onboarding browser tests verify saved brief/example reopening and draft preservation independently of canvas persistence.
