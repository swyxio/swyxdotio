# Search and AI answer-engine discovery

## Production baseline: August 25, 2026

The authenticated Cloudflare dashboard showed that swyx.io is **not blocking search or AI
crawlers**: Block AI Bots, Bot Fight Mode, and AI Labyrinth were disabled. The existing
`robots.txt` allowed all paths. The live 415-URL sitemap declared the invalid
`https://www.sitemaps.org/schemas/sitemap/0.9` XML namespace instead of the protocol-required
`http://www.sitemaps.org/schemas/sitemap/0.9` namespace.

Verified crawler traffic over the preceding 24 hours included:

| Crawler          | Successful | Unsuccessful |
| ---------------- | ---------: | -----------: |
| Googlebot        |      1,420 |           35 |
| BingBot          |        360 |          100 |
| Claude-User      |        222 |            4 |
| ChatGPT-User     |        129 |            3 |
| PerplexityBot    |         33 |            5 |
| GPTBot           |         21 |            1 |
| OAI-SearchBot    |         12 |            1 |
| Claude-SearchBot |          1 |            1 |

Cloudflare labels any unsuccessful response together; these counts do not establish WAF blocks.
Investigate exact paths and HTTP statuses before interpreting them. The zone-wide report also
included missing `robots.txt` files on separately operated `overgrid.swyx.io`, `media.swyx.io`,
and `strata.swyx.io`; those are outside this site's Worker.

## Google Search Console baseline: August 25, 2026

For July 17 through August 23, the domain property reported 1,994 search clicks, 245,000
impressions, 0.8% click-through rate, and average position 10.4. It had 508 indexed pages and 1,256
non-indexed pages. Its indexing report was last updated August 20, so these categories are not a
real-time production-health report:

| Exclusion reason                          | Pages |
| ----------------------------------------- | ----: |
| Page with redirect                        |   646 |
| Alternate page with proper canonical tag  |   210 |
| Crawled, currently not indexed            |   141 |
| Historical server error (5xx)             |   119 |
| Not found (404)                           |    80 |
| Duplicate without user-selected canonical |    33 |
| Soft 404                                  |    12 |
| Discovered, currently not indexed         |    12 |
| Google selected another canonical         |     2 |
| Other 4xx                                 |     1 |

Sampled server-error examples were last crawled in March through May and now resolve successfully;
several formerly required three to five redirects. Duplicate and soft-404 samples predominantly
used legacy `www` URLs, trailing slashes, or invalid plural archive filters such as `show=Talks`.

Google has exactly one submitted sitemap: `https://www.swyx.io/sitemap.xml`, submitted July 17 and
last read August 23. It reports 415 discovered pages, but redirects to the canonical apex host.
Submitting `https://swyx.io/sitemap.xml` would align the submitted sitemap with the site's actual
canonical host; this is an external Search Console mutation and requires explicit user approval.

The top ten queries included `swyx` (250 clicks / 1,362 impressions), `shawn wang` (86 / 870), and
`learn in public` (28 / 161). Low-intent `yt5s` and `yt5s rip` queries contributed 18,477 combined
impressions but only 37 clicks. Segment branded, high-intent non-branded, and irrelevant discovery
before treating the property-wide 0.8% click-through rate as one optimization target.

## Crawler contract

- `/robots.txt` permits `search=yes` and `ai-input=yes`. It intentionally does not assert a model
  training preference.
- `/sitemap.xml` lists public canonical pages using the exact sitemap-protocol XML namespace and
  without trailing-slash redirect targets.
- `/llms.txt` always returns the complete public discovery index as `text/plain`.
- `/llms.md` always returns the same discovery index as `text/markdown`.
- `/llms` serves HTML to browsers and plain text or Markdown to clients that negotiate those types.
- `/{article-slug}.md` serves the original published article Markdown with source attribution.
- Private posts and externally canonical posts are excluded from AI discovery and Markdown output.
- Personal `/box` and `/draw` tools are omitted from the sitemap and AI index and prohibit indexing
  with `noindex, nofollow, noarchive` in both HTML and `X-Robots-Tag`; they remain directly usable.
- Public discovery files carry `Content-Signal: search=yes, ai-input=yes` and remain edge-cacheable.
- Legacy URL aliases permanently redirect with HTTP 301, and archive filters use valid singular
  category names.

Cloudflare's automatic Markdown for Agents feature requires a Pro, Business, or Enterprise plan.
Native article Markdown routes provide the useful output on the existing Free plan without a paid
upgrade.

## Operational guardrails

Do not enable Cloudflare-managed `robots.txt` without first inspecting its generated directives:
Cloudflare prepends crawler-specific blocks and defaults to a training-restriction policy. Keep AI
Search and user-requested AI Agent retrieval allowed. Before Cloudflare's September 15, 2026 policy
change, explicitly review Security Settings > Configure AI bot policies and confirm Search and Agent
remain allowed; choose any training policy separately.

Inspect AI Crawl Control > Security for verified per-crawler successes and unsuccessful responses,
and AI Crawl Control > Signals for robots availability and content signals. A user-agent spoof
returning HTTP 200 does not prove that Cloudflare would allow the real verified crawler.

References:

- https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/
- https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/
- https://developers.cloudflare.com/ai-crawl-control/reference/bots/
- https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
