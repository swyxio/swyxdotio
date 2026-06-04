# Netlify to Cloudflare DNS Cutover

This site moved its production web traffic from Netlify to the `swyxdotio`
Cloudflare Worker on 2026-06-03.

The canonical site URL is intentionally the short apex domain:

```text
https://swyx.io
```

`www.swyx.io` exists only as a redirect to `swyx.io`. Redirects preserve the
path and query string.

## Production setup

Cloudflare Worker Custom Domains attach both web hostnames to the `swyxdotio`
Worker:

| Hostname      | Target Worker | Proxy status |
| ------------- | ------------- | ------------ |
| `swyx.io`     | `swyxdotio`   | Proxied      |
| `www.swyx.io` | `swyxdotio`   | Proxied      |

These appear in the DNS table as read-only `Worker` records. They are managed
through the Worker's Custom Domains settings rather than as manually edited
`A`, `AAAA`, or `CNAME` records.

Podcast audio is stored separately from the Worker static-assets bundle:

| Hostname        | Target R2 bucket             | Purpose                 |
| --------------- | ---------------------------- | ----------------------- |
| `media.swyx.io` | `swyxdotio-podcast-media`    | Podcast artwork and MP3 |

The Worker serves the canonical podcast RSS URLs from small XML objects in the
same bucket:

```text
https://swyx.io/podcast/learn-in-podcast/rss.xml
https://swyx.io/podcast/the-temporal-podcast/rss.xml
https://swyx.io/podcast/career-chats/rss.xml
```

Three Cloudflare Redirect Rules enforce HTTPS and the canonical hostname:

| Incoming request        | Redirect target     |
| ----------------------- | ------------------- |
| `https://www.swyx.io/*` | `https://swyx.io/*` |
| `http://www.swyx.io/*`  | `https://swyx.io/*` |
| `http://swyx.io/*`      | `https://swyx.io/*` |

The cutover removed the previous Netlify web-origin records only. Mail, TXT,
and other non-web DNS records were left unchanged.

## Verification

Use these checks after domain, DNS, or redirect changes:

```sh
curl -I https://swyx.io/
curl -I https://www.swyx.io/why-temporal?cutover=1
curl -I http://www.swyx.io/api-economy?source=www
curl -I http://swyx.io/why-temporal?source=apex

for route in \
  / \
  /ideas \
  /api/listContent.json \
  /api/latestPosts.json \
  /api/searchContent.json \
  /rss.xml \
  /podcast/learn-in-podcast/rss.xml \
  /podcast/the-temporal-podcast/rss.xml \
  /podcast/career-chats/rss.xml \
  /sitemap.xml \
  /why-temporal \
  /api/ideas/why-temporal.json \
  /api-economy \
  /api/ideas/api-economy.json
do
  curl --fail --silent --show-error --output /dev/null \
    --write-out "$route %{http_code}\n" "https://swyx.io$route"
done

openssl s_client -connect swyx.io:443 -servername swyx.io </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName

openssl s_client -connect www.swyx.io:443 -servername www.swyx.io </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

Expected behavior:

- The apex HTTPS routes return `200`.
- `www` redirects to the matching apex URL with `301`.
- Plain HTTP redirects to HTTPS with `301`.
- The certificate covers both `swyx.io` and `www.swyx.io`.
- `/ideas`, `/why-temporal`, and `/api-economy` render complete content in a
  browser.

## Rollback

To move web traffic back to the previous Netlify origin:

1. Disable the three redirect rules listed above.
2. Detach both Worker Custom Domains from `swyxdotio`.
3. Restore the previous proxied Netlify web-origin records:

| Hostname      | Type   | Value                     |
| ------------- | ------ | ------------------------- |
| `swyx.io`     | `A`    | `98.84.224.111`           |
| `swyx.io`     | `A`    | `18.208.88.157`           |
| `swyx.io`     | `AAAA` | `2600:1f18:16e:df01::258` |
| `swyx.io`     | `AAAA` | `2600:1f18:16e:df01::259` |
| `www.swyx.io` | `A`    | `18.208.88.157`           |
| `www.swyx.io` | `A`    | `98.84.224.111`           |
| `www.swyx.io` | `AAAA` | `2600:1f18:16e:df01::259` |
| `www.swyx.io` | `AAAA` | `2600:1f18:16e:df01::258` |

The rollback values are historical public DNS records. Confirm that the
Netlify deployment still exists before using them.

## References

- [Cloudflare Worker Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare Worker routing](https://developers.cloudflare.com/workers/configuration/routing/)
- [Cloudflare Redirect Rules](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/)
