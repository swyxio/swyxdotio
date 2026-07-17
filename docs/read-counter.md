# Read counter

The public read count is deliberately approximate. It combines:

1. a static lifetime estimate for selected older articles, and
2. estimated engaged reads observed after the D1 counter launched.

The API adds these values at response time. Historical estimates are never
inserted into D1, so measured post-launch activity remains independently
auditable and changing a seed does not require a database migration.

## Live reads

The browser waits for 8 visible seconds and, on articles, 25% scroll depth. It
deduplicates in local storage for 24 hours and samples 0.5% of eligible reads.
Each accepted sample adds 200 estimated reads to D1. Obvious bots, cross-origin
requests, and invalid engagement signals are rejected. See
`src/lib/read-counter.js` for the authoritative policy constants.

The displayed total is:

```text
static historical estimate + sampled D1 estimate
```

## Historical backfill

The static table lives in
`src/lib/server/historical-read-estimates.js`. It is server-only and sparse:
unlisted articles and public non-article pages receive no historical seed.

Version 1 was calibrated using public proxies rather than unavailable private
analytics: Hacker News points/comments, DEV reactions/comments, GitHub code
citations, search visibility, known X reach, translations, and durable external
references. It is intended to preserve rough order of magnitude, not reconstruct
precise traffic. The first estimates were judged about 5x too low and all 24
seeds were multiplied by five before being committed.

Notable v1 values include:

- `learn-in-public`: 10,000,000
- `create-luck`: 1,500,000
- `cloudflare-go`: 750,000
- `js-third-age`: 625,000
- `css-100-bytes`: 500,000

The remaining nominated articles range from 100,000 to 375,000. The UI formats
the combined total compactly and prefixes it with `~` to communicate uncertainty.

To revise the backfill, edit the static table, keep values as non-negative safe
integers, update `HISTORICAL_READ_ESTIMATE_VERSION` if the methodology changes,
and update the unit test and this document. Do not seed D1 with these estimates.
