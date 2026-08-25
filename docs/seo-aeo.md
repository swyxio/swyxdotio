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

## Crawler contract

- `/robots.txt` permits `search=yes` and `ai-input=yes`. It intentionally does not assert a model
  training preference.
- `/sitemap.xml` lists public canonical pages using the exact sitemap-protocol XML namespace.
- `/llms.txt` always returns the complete public discovery index as `text/plain`.
- `/llms.md` always returns the same discovery index as `text/markdown`.
- `/llms` serves HTML to browsers and plain text or Markdown to clients that negotiate those types.
- `/{article-slug}.md` serves the original published article Markdown with source attribution.
- Private posts and externally canonical posts are excluded from AI discovery and Markdown output.
- Public discovery files carry `Content-Signal: search=yes, ai-input=yes` and remain edge-cacheable.

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
