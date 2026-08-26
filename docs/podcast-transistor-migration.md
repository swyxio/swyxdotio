# Transistor Podcast Migration

This runbook moves the Transistor-hosted podcast backlog into the
`swyxdotio-podcast-media` Cloudflare R2 bucket while keeping podcast feed URLs
under `swyx.io`.

The website blog feed remains separate at:

```text
https://swyx.io/rss.xml
```

## Shows

| Transistor show        | Archived episodes | New canonical feed                                     |
| ---------------------- | -----------------: | ------------------------------------------------------ |
| `learn-in-podcast`     |                540 | `https://swyx.io/podcast/learn-in-podcast/rss.xml`     |
| `the-temporal-podcast` |                 25 | `https://swyx.io/podcast/the-temporal-podcast/rss.xml` |
| `career-chats`         |                 18 | `https://swyx.io/podcast/career-chats/rss.xml`         |

The Transistor dashboard also reported 6 draft-filter rows for
`learn-in-podcast`. Their reviewed migration state is captured in
`.podcast-migration/drafts/manifest.json`: one draft was published to the new
feed, three unpublished MP3s were preserved under unlinked checksum-addressed R2
paths, one metadata-only draft had no downloadable audio, and one row was
already present in the migrated archive feed.

The August 25 audit matched all 582 currently published Transistor episode
titles to the archive. The 583rd archive episode is the Chainsmokers draft
published directly on swyx.io. Channel website links should point to
`https://swyx.io/podcasts#<slug>`; RSS self-links and feed redirects continue to
use `https://swyx.io/podcast/<slug>/rss.xml`.

## Offline backup and legacy website cutover

The original ignored `.podcast-migration` staging directory is not guaranteed to
survive checkout cleanup. Keep a full offline backup outside the repository.
Given a **complete** Cloudflare R2 List Objects JSON response, the backup script
downloads the podcast bucket snapshot without changing remote objects:

```sh
node scripts/backup-podcast-r2.mjs /path/to/r2-objects.json /path/to/offline-backup
```

Downloads are streamed with three concurrent requests. Each object is checked
against its recorded byte length, single-part ETag/MD5 where applicable, and
the SHA-256 prefix in checksum-addressed filenames. The script records full
SHA-256s in `manifest.json` and `SHA256SUMS`. Reruns hash and verify completed
files before skipping them. Ctrl-C stops the process; rerun the same command to
resume. Keep the directory private because it includes unpublished drafts and
administrative metadata. This backs up the current R2 inventory, not the
missing original Transistor staging manifests or analytics exports.

The dedicated `wrangler.podcast-redirects.toml` deploy target restores
`mixtape.swyx.io` as a Cloudflare Custom Domain and sends all legacy website
paths to the Mixtape archive. It does not redeploy the main website:

```sh
npx wrangler deploy --config wrangler.podcast-redirects.toml
```

Code, deployment, and live DNS/HTTP verification are separate steps. The
Transistor-owned `temporal.transistor.fm` and `careerchats.transistor.fm`
hostnames cannot be configured in our Cloudflare zone; their website redirect
behavior must be configured in Transistor or arranged with Transistor support.
Do not substitute a JavaScript redirect for a durable provider-level 301 after
account cancellation. Website redirects are separate from the three existing
RSS redirects.

Before repairing existing R2 feed objects, snapshot each current XML and ETag.
Run `ensureCanonicalFeedLinks` and verify every episode item is unchanged; do
not re-upload a historical replacement feed over newer studio publications.
Publish with an ETag condition, then read back the canonical RSS URL and verify
both its website link and unchanged episode/GUID/media inventory.

## Cloudflare Storage

The Worker has an R2 binding named `PODCAST_MEDIA` for:

```text
swyxdotio-podcast-media
```

The bucket public custom domain is:

```text
https://media.swyx.io
```

MP3, artwork, transcript, and chapter URLs in the replacement feeds should use
this direct R2 custom domain. Do not put podcast media into `static/` or proxy
large MP3 responses through SvelteKit.

## Local Staging

Migration scripts write resumable local state under:

```text
.podcast-migration/
```

This directory is ignored by Git. Keep it until the cutover is fully verified;
it is the local archive, hash manifest, and retry checkpoint.

Run the full archive transfer with:

```sh
npm run podcast:migrate -- \
  --source https://feeds.transistor.fm/learn-in-podcast --slug learn-in-podcast \
  --source https://feeds.transistor.fm/the-temporal-podcast --slug the-temporal-podcast \
  --source https://feeds.transistor.fm/career-chats --slug career-chats

npm run podcast:validate -- \
  --slug learn-in-podcast \
  --slug the-temporal-podcast \
  --slug career-chats

npm run podcast:upload -- \
  --bucket swyxdotio-podcast-media \
  --slug learn-in-podcast \
  --slug the-temporal-podcast \
  --slug career-chats
```

Freeze publishing in Transistor before the final cutover pass, then repeat
`podcast:migrate` with `--refresh-feed --refresh-assets` and rerun validation.
This catches any episode, metadata, or same-URL media edits made during the
initial archive transfer.

The uploader verifies remote object byte lengths against `media.swyx.io`,
resumes matching objects, and publishes each `feeds/<slug>.xml` object only
after all media objects for that show are present. Objects larger than 250 MB
automatically use the private podcast studio's authenticated multipart Worker
API because Wrangler's single-object CLI path rejects larger uploads.

## Wrangler Authentication

Wrangler should use the local OAuth login for deploys, R2 commands, and Worker
secret updates. Do not keep `CF_API_TOKEN` or `CLOUDFLARE_API_TOKEN` in `.env`
or `.dev.vars`; those environment variables override OAuth and stale tokens can
silently remove required permissions.

```sh
unset CF_API_TOKEN CLOUDFLARE_API_TOKEN
npx wrangler whoami
npx wrangler r2 bucket list
```

## Cancellation Gate

Do not cancel Transistor until all of these are true:

1. All 583 published episodes, channel artwork files, episode images,
   transcripts, and chapter files exist in R2.
2. Every downloaded enclosure has a non-zero size and SHA-256 hash in the local
   migration manifest.
3. Replacement RSS feeds preserve item counts and GUID sets.
4. `media.swyx.io` serves artwork and MP3 files, including byte-range requests.
5. The three canonical `swyx.io/podcast/.../rss.xml` routes serve valid RSS.
6. The site subscribe links no longer point at Transistor.
7. Transistor's old feed URLs return permanent redirects to the matching new
   `swyx.io` feeds.
8. The 6 mixtape draft-filter rows have been reviewed and exported, published,
   or confirmed as already migrated.
9. Transistor analytics exports have been downloaded for any historical data
   worth retaining.
10. A final `podcast:migrate -- --refresh-feed --refresh-assets ...` pass
    completed after publishing was frozen in Transistor.

## Transistor Redirects And Cancellation

Configure each show separately in Transistor:

1. Open the show's `Settings` tab.
2. Find the `RSS Feed` section.
3. Paste the matching `https://swyx.io/podcast/<slug>/rss.xml` URL into
   `Permanent Redirect (301)`.
4. Save changes.
5. Verify the old `https://feeds.transistor.fm/<slug>` URL returns a permanent
   redirect to the matching new feed.

Transistor documents that these feed redirects remain active after account
cancellation. Transistor also deletes podcasts at the end of the current
billing period after cancellation, so keep the local staging archive until the
new feeds and redirects have been stable in podcast clients.

Before cancellation, use each show's `Analytics` tab to export any historical
stats worth retaining.

The June 3, 2026 cancellation archive is stored locally under
`.podcast-migration/analytics/`. Each show has a listener-trends CSV and a
30-day normalized episode-comparison CSV. `SHA256SUMS` records the retained
files' checksums so the local export can be verified after Transistor deletes
the account data.

## Worker Publication

The canonical `swyx.io/podcast/.../rss.xml` routes require the Worker deployment
that includes the `PODCAST_MEDIA` R2 binding:

```sh
npm run build
CF_API_TOKEN= CLOUDFLARE_API_TOKEN= npx wrangler deploy --dry-run
CF_API_TOKEN= CLOUDFLARE_API_TOKEN= npx wrangler deploy
```

## Live Verification

```sh
for slug in learn-in-podcast the-temporal-podcast career-chats; do
  curl --fail --silent --show-error \
    "https://swyx.io/podcast/$slug/rss.xml" >"/tmp/$slug.xml"
done

curl --fail --silent --show-error --head \
  https://media.swyx.io/<object-key>

curl --fail --silent --show-error \
  --range 0-1023 \
  https://media.swyx.io/<object-key> >/tmp/podcast-range.bin

curl --head https://feeds.transistor.fm/learn-in-podcast
curl --head https://feeds.transistor.fm/the-temporal-podcast
curl --head https://feeds.transistor.fm/career-chats
```
