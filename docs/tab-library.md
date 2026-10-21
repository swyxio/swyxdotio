# Personal tab library

`/tools/tabs` is an owner-only reader. Its separate `TABS_DB` D1 database stores
each capture independently, including saved page text, summaries, decisions,
and notes. The normal Tools Google session and owner subject protect both the
page and every API request; responses are private and are not cached.

The reader offers tap, scroll, and swipe modes. Bookmarks are saved as
follow-ups; a scroll-past decision in scroll mode is saved as archived. Notes
and decisions belong to a specific item in a specific batch and survive reloads.
The archived and follow-up filters make decisions recoverable. Page previews
are optional: some sites block embedding, so an original-page link is also
available.

New captures can be imported as a JSON file with a `tabs` array or as pasted
URLs. Chrome's tab-export extension lives in the private chrometaboverflow
repository. Capture and import do not close browser tabs. New captures contain
titles and URLs, not scraped page text or generated summaries. Common temporary
authentication parameters are redacted before URLs are stored.

The D1 schema is in `migrations/tabs`. To apply an unapplied migration, use
`npx wrangler d1 migrations apply swyxdotio-tabs-private --remote` after
checking the target account. The initial local reader can be exported with
`node scripts/export-tabs-import.mjs http://127.0.0.1:PORT/ /private/path/import.sql`.
That file contains private browsing data: keep it outside the repository, import
it only into the private tabs database, and remove it after verifying the import.
The export script preserves existing items and decisions on retry.
