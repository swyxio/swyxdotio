# swyx's personal site

swyx's personal site, using:

- SvelteKit 2 + Svelte 5
- Tailwind 3 + Tailwind Typography
- `marked` + `shiki` for markdown rendering (replaced mdsvex/remark)
- Cloudflare Workers with Static Assets (hybrid: prerendered static pages + on-demand SSR posts, edge-cached)
- GitHub Issues as CMS

If you want to make a site based on this, see https://github.com/swyxio/swyxkit for a cleaner starter template

## Architecture / rendering

- **Static (prerendered at build):** `/about`, `/portfolio`, `/subscribe`.
- **Dynamic + edge-cached:** `/`, `/ideas`, `/[slug]`, `/rss.xml`, `/sitemap.xml`, and `/api/*`.
  Rendered on demand on Cloudflare Workers and stored in the Cache API via `src/hooks.server.js`
  until `s-maxage` expires, so new posts appear without a rebuild and serving is O(1).
- **Durable content manifest:** the Worker reads the parsed GitHub Issues CMS data from the
  `CONTENT_MANIFEST` KV namespace. GitHub is only queried to bootstrap an empty namespace or
  refresh it after a webhook, so ordinary cache misses do not depend on GitHub availability.
- **Compact ideas list:** `/api/listContent.json` omits article bodies for the default `/ideas`,
  RSS, and sitemap paths. Full-body search remains available through `/api/searchContent.json`,
  which the browser downloads only after a reader uses the search box.
- **Instant publishing:** a GitHub Issues webhook hits `/api/revalidate`, which verifies the
  signature, refreshes the KV manifest, and rolls a KV-backed cache generation. Cache keys also
  include the Worker version, so both publishes and deploys bypass older edge entries.

## Environment variables (Cloudflare Workers)

### What each variable does

| Variable            | Required?   | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GH_TOKEN`          | **Yes**     | A GitHub Personal Access Token used to authenticate calls to the GitHub Issues API (the CMS). Without it, requests are unauthenticated and capped at **60/hr**, which the site blows through quickly and starts failing. With it, the limit is **5000/hr**. Read at runtime via `$env/dynamic/private` (Cloudflare `platform.env`) **and** at build time for the prerendered pages — so it must be set in **both** the runtime secrets and the build environment. |
| `GH_WEBHOOK_SECRET` | Recommended | A shared secret used to verify (HMAC SHA‑256) that incoming requests to `/api/revalidate` actually came from your GitHub webhook. This enables fast publishing: editing an Issue refreshes the KV manifest and rolls the cache generation instead of waiting for the `s-maxage` TTL. If unset, `/api/revalidate` returns 500 and you fall back to TTL-based freshness.                                                                                            |

### Where to get the values

- **`GH_TOKEN`** — GitHub → Settings → Developer settings → **Personal access tokens**. A classic token with `public_repo` (or `repo` for private) scope is sufficient since it only reads Issues.
- **`GH_WEBHOOK_SECRET`** — generate any strong random string, e.g. `openssl rand -hex 32`. You'll paste the same value into the GitHub webhook config (below).

### Set them on Cloudflare Workers

**Option A — Dashboard:** Cloudflare dashboard → **Workers & Pages** → your Worker → **Settings → Variables and Secrets**. Add each runtime value and encrypt secrets. `GH_TOKEN` must also be present in the Git-connected build environment because prerendered pages read it during builds.

**Option B — Wrangler CLI:**

```sh
# runtime secrets (encrypted)
npx wrangler secret put GH_TOKEN
npx wrangler secret put GH_WEBHOOK_SECRET
```

Each command prompts for the value. List them with `npx wrangler secret list`.
`wrangler.toml` declares `GH_TOKEN` as required, so deployments fail clearly instead of publishing a Worker without CMS authentication.
It also declares the `CONTENT_MANIFEST` KV binding. Wrangler creates that namespace on the first
deployment and the Worker fills it on the first uncached content request.

> Local dev reads the same names from a gitignored `.env` file (see `.env.example`).

### Wire up the GitHub webhook (for instant publishing)

In your content repo: **Settings → Webhooks → Add webhook**:

- **Payload URL:** `https://swyxdotio.swyxio.workers.dev/api/revalidate`
- **Content type:** `application/json`
- **Secret:** the same value as `GH_WEBHOOK_SECRET`
- **Events:** "Let me select individual events" → check **Issues** only

On each Issue create/edit, the endpoint verifies the signature, refreshes the durable content
manifest, derives the affected slug, and rolls the cache generation for the relevant pages (`/`,
`/ideas`, `/{slug}`, `/rss.xml`, `/sitemap.xml`, and the list/`api` endpoints).

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (Cloudflare adapter)
- `npm run preview` — preview the build with `wrangler dev`
- `node tests/markdown.test.mjs` — markdown renderer regression checks
- `npm test` — Playwright e2e (requires GH content)

## Live URL

See https://swyx.io

- https://sw-yx.js.org/ old site when learning to code[.](https://sw-yx.js.org/2017/07/20/secret-master-plan)
- You can see previous iterations of the site from 2017 here: https://www.swyx.io/rewrite-2022
- The last version of the 2022 site was preserved at https://github.com/swyxio/swyxdotio2022
- The 2023 site is documented at https://www.swyx.io/rewrite-2023
