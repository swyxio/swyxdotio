# Shared article and semantic search

The header dialog, /search, and /ideas search use one server engine and one public projection. The initial snapshot has 635 public destinations and 4,741 passages, represented by 4,722 unique vectors. Browsing /ideas retains its chronological metadata list; searching no longer downloads article bodies into the browser.

## Retrieval and destinations

Orama BM25 indexes title, section heading, full article passages, topics, and path. Title/heading/topic/body/path boosts are 10/4/3/1/1. Unicode text and accents remain searchable. Typo tolerance runs only when exact lexical retrieval is empty and the query has at most three meaningful words. Function words do not dominate natural questions or highlighted excerpts. If a longer question has no strict lexical match, BM25 permits partial keyword matches so semantic cold starts and outages do not misleadingly look like an empty library.

Passages span up to 210 words with 30 words of overlap. Heading IDs use a per-parse GitHub slugger shared with the article renderer; duplicate and nested headings retain valid destinations. Results deduplicate by document, show escaped highlighted excerpts, and link to the matching section when a local section is available. External sources retain their canonical destination.

Cloudflare BGE small (CLS pooling, 384 dimensions) supplies semantic vectors. Normalized int8 quantization retains >0.99 similarity in the precision regression. Cosine candidates above 0.6 and BM25 results combine through reciprocal rank fusion (constant 60). Exact and prefix title matches stay first; date only breaks relevance ties. Source facets count the query with other filters applied, independently of the selected source, and sort by match count.

## Storage, freshness, and budget

Existing READ_COUNTERS D1 stores only vectors, content hashes, and the monthly reservation ledger. A gzip-compressed vector snapshot in CONTENT_MANIFEST KV makes cold semantic reads smaller and avoids transferring thousands of rows through D1. Snapshot publication always reads D1; lagging snapshots check missing hashes against D1 before repeating inference. Query vectors use hash-addressed CONTENT_MANIFEST KV entries with a 30-day TTL; raw query text is not persisted in these caches. Each request intersects vectors with its current public corpus and body hashes, preventing old or private content from returning through stale vectors. Missing vectors warm in one bounded batch of 32 inputs off the response path. `pnpm search:index` performs an authenticated, budgeted backfill; repeating it with this snapshot indexes zero new inputs.

The user authorized $10/month for search embeddings, with BM25 fallback. Each input reserves 20 micro-USD before inference in an atomic conditional D1 upsert. The UTC monthly ledger cannot exceed 10,000,000 micro-USD. Reservations include failed or timed-out calls and are not refunded. At the verified model price of $0.0202/million input tokens and 512-token maximum, the maximum per-input charge is 10.3424 micro-USD, below the reservation. The ledger is conservative, not a Cloudflare invoice or a cap on unrelated account services. Model pricing should be rechecked before changing models or raising the allowance.

Semantic retrieval has a 900 ms deadline. Its budgeted background work remains attached to waitUntil so a late result can populate the query cache; the response uses BM25 when inference, index, or budget is unavailable. Local Vite previews deliberately disable inference so a local ledger cannot bypass the production cap. The backfill command uses the actual remote database and the same reservation function.

## Validation

- Forty-two focused checks cover public projection/privacy, body-only retrieval, duplicates and concurrent heading rendering, Unicode/typos, source facets, stale bodies, hybrid deduplication, atomic cap/UTC rollover, provider failure, compressed cache validation/current-body filtering, archive URL state, and production asset invariants.
- Svelte check: zero errors/warnings. Production build succeeds using pinned package-lock dependencies.
- Real model calls retrieve CFP Advice / Pick a Topic for “how do I choose a topic for my conference presentation”; the hybrid URL is /cfp-advice#pick-a-topic. Cached semantic evaluation measured 40–48 ms in the operator probe; REST cold-loading is slower and correctly falls back at the deadline.
- Desktop/mobile light and dark screenshots show the archive, dialog, excerpts and source facets. Actual CSS width 390 px has no horizontal document overflow; full-result facets use two columns and dialog options exceed 44 px. Keyboard opening, focus, and result selection are verified. Native mobile pointer emulation had inconsistent coordinate mapping; physical phone keyboards/touch are not certified by this pass.
- Production migration readback verifies both search tables and the model index in the configured remote D1. Initial reservations were approximately $0.096; this is a conservative ceiling, not measured billing.

Official model pricing: https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/
