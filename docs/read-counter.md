# Read counter

The public read count is deliberately approximate. It combines:

1. a static lifetime estimate for older articles, and
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
`src/lib/server/historical-read-estimates.js`. It is server-only. Public
non-article pages and articles published in 2026 receive no historical seed.

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

The remaining nominated articles range from 100,000 to 375,000.

Version 2 expanded the static table to 426 of the 432 public articles present in
the GitHub content manifest on July 17, 2026. The six 2026 articles intentionally
start from the live counter. The additional cohort backfill contributes
8,971,500 reads, bringing the complete static estimate to 25,921,500 reads.

The cohort estimates use publication year and the article's existing category:

| Published | Essay or tutorial |   Note |  Other |
| --------- | ----------------: | -----: | -----: |
| 2017–2019 |            50,000 | 25,000 | 10,000 |
| 2020      |            30,000 | 15,000 |  7,500 |
| 2021–2022 |            20,000 | 10,000 |  5,000 |
| 2023–2024 |            10,000 |  5,000 |  3,000 |
| 2025      |             5,000 |  3,000 |  1,000 |
| 2026      |                 0 |      0 |      0 |

The cohort pass deliberately excludes two misleading or unavailable sources:

- Netlify only exposed June 17–July 17, 2026, after the site had moved away from
  Netlify. That residual traffic is not representative of the historical site.
- Google Search Console ownership was first configured for `swyx.io` under
  `shawnthe1@gmail.com` on July 17, 2026. Its reports were still processing and
  supplied no historical data for this backfill. Future data can calibrate the
  estimates without being mistaken for recovered 2017–2026 measurements.

Social and launch-event modeling was also intentionally excluded from the
cohort pass. The UI formats the combined total compactly and prefixes it with
`~` to communicate uncertainty.

The residual Netlify calibration evidence is committed under
`docs/analytics/netlify-2026-06-17-to-2026-07-17/`. Netlify exposed charts and
tables but no CSV download control, so the accessible dashboard values were
transcribed into small CSVs before Analytics was disabled again. They are
evidence of the available window, not inputs to the lifetime backfill.

To revise the backfill, edit the static table, keep values as non-negative safe
integers, update `HISTORICAL_READ_ESTIMATE_VERSION` if the methodology changes,
and update the unit test and this document. Do not seed D1 with these estimates.

## Anomaly protection

Cloudflare's automatic network and application-layer DDoS mitigation remains
the first line of defense and is enabled independently of this application.
The read endpoint adds narrow application controls for the signal Cloudflare
cannot classify semantically:

- only same-origin `POST /api/reads/*` engagement signals can increment D1;
- verified bots, recognizable crawler user agents, and prefetch/prerender
  requests are rejected;
- Cloudflare Workers rate-limit bindings cap each edge IP at 3 signals/minute
  and each analytics session at 1 signal/minute; and
- identifiers are used only as ephemeral limiter keys and are never stored in
  D1 or sent to the calibration report.

The limiters are intentionally approximate and colo-local. Their purpose is to
bound abuse cheaply before the sampled D1 write, not to produce precise counts.
Cloudflare's managed DDoS protections should remain enabled; no custom rule is
needed for ordinary variance.

## Monthly calibration

`workers/read-calibration/index.js` runs as the separately deployed
`swyxdotio-read-calibration` Worker at 08:15 UTC on the third day of each month.
Its first run stores a D1 baseline. Later runs compare the D1 weighted-read and
sample deltas with GA4's server-side `engaged_read` events, sampled sessions,
users, and unfiltered site page views. Each run stores a Markdown report in
`read_calibration_reports`.

The report includes a site-wide correction factor for the reporting window.
It is diagnostic only: the job never edits `HISTORICAL_READ_ESTIMATES`, so a
brief traffic spike cannot continuously rewrite old post totals. Human review
can use several monthly reports to justify a later versioned static backfill.

Alerts are deliberately sparse. A webhook fires only after at least 20 D1
samples and either a greater-than-2x D1/GA delivery mismatch or a
greater-than-5x month-over-month discontinuity. Missing credentials and Worker
exceptions remain visible in Cloudflare logs.

Operational commands:

```sh
npx wrangler d1 migrations apply swyxdotio-read-counters --remote
npx wrangler deploy -c wrangler.calibration.toml
npx wrangler d1 execute swyxdotio-read-counters --remote --command \
  "SELECT captured_at, period_start, period_end, status, correction_factor FROM read_calibration_reports ORDER BY captured_at DESC LIMIT 3"
```

The monthly Worker requires the `GOOGLE_SERVICE_ACCOUNT_JSON` secret and GA4
Viewer access for that service-account email. The optional
`CALIBRATION_ALERT_WEBHOOK_URL` secret enables major-discontinuity alerts.

### Calibration interpretation and known limits

- The first run is only a D1 baseline. It does not request a Google OAuth token
  or call the Analytics Data API. Confirm the service-account path from the
  first comparison report or a dedicated read-only smoke test; the existence of
  a baseline row is not proof that GA credentials work.
- At the 0.5% sample rate, the 20-sample alert threshold needs roughly 4,000
  eligible engaged reads in one reporting window. Lower-traffic windows remain
  `insufficient_data`, so the absence of an alert is not evidence of delivery
  parity.
- The stored `correction_factor` currently divides the D1 weighted delta by GA
  sampled sessions multiplied by the same weight. Applying that ratio back to
  the GA estimate algebraically reproduces the D1 delta. Treat it only as a
  session-alignment diagnostic; it is not independent evidence for changing
  `HISTORICAL_READ_ESTIMATES`.
- D1 deltas use exact Worker capture timestamps while GA reports use inclusive
  calendar dates. The property timezone and the 08:15 UTC cron can therefore
  create boundary differences. Compare multi-month trends rather than treating
  one window as audited reconciliation.
- The current job clamps negative D1 deltas to zero. A reset, restoration, or
  counter loss can therefore resemble a quiet month. Review cumulative D1
  totals alongside every report before accepting its status.
- Measurement Protocol success means Google accepted the HTTP request, not
  necessarily that every event passed semantic validation. Use GA DebugView or
  the Measurement Protocol validation endpoint when changing the payload.
