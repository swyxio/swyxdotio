# Private Tools and Podcast Studio

The Worker exposes an unindexed tools landing page at:

```text
https://swyx.io/tools
```

The podcast studio is the first tool:

```text
https://swyx.io/tools/podcast
```

The tools area requires `PODCAST_ADMIN_PASSWORD`. A successful login sets an
HttpOnly, SameSite=Strict signed cookie scoped to `/tools` for seven days, so
the podcast studio and future private utilities can share one gate. The signing
key is an independent Worker secret. The pages opt out of indexing and referrer
sharing. Mutations reject missing or cross-origin `Origin` headers.

Configure both Worker secrets before deploying:

```sh
CF_API_TOKEN= CLOUDFLARE_API_TOKEN= npx wrangler secret put PODCAST_ADMIN_PASSWORD
CF_API_TOKEN= CLOUDFLARE_API_TOKEN= npx wrangler secret put PODCAST_ADMIN_SESSION_SECRET
CF_API_TOKEN= CLOUDFLARE_API_TOKEN= npx wrangler secret put RECLIP_URL
```

Generate values with:

```sh
openssl rand -hex 16
openssl rand -base64 24
```

Keep the local development copies in the ignored `.dev.vars` file. The archive
uploader reads `PODCAST_ADMIN_PASSWORD` from that same file when it needs the
Worker multipart fallback for oversized objects.

## Publishing behavior

The studio:

1. Uploads an MP3 to the `swyxdotio-podcast-media` R2 bucket in 10 MB multipart chunks.
   Failed browser-side uploads abort their incomplete multipart upload.
2. Writes a private per-episode JSON record under `admin/episodes/<show>/<id>.json`.
3. Snapshots the previous feed XML under `feed-history/<show>/`.
4. Prepends an RSS `<item>` to `feeds/<show>.xml` using an ETag-conditional write.
5. Marks the JSON record as `published`, or retains it as `failed` for recovery.

The browser uploads one chunk at a time, so large files do not have to fit in a
single Worker request or isolate memory allocation.

Do not use the studio until the Transistor archive migration has uploaded its
base feeds. The archive uploader writes complete replacement XML files, so an
archive upload performed after a studio publish would overwrite that new item.

## Adding tools

Add future utilities below `/tools/<tool-name>` and reuse the shared tools gate.
`/tools/reclip` validates the shared session and redirects to `RECLIP_URL`.

The previous token-bearing `/tools/<token>` and `/_podcast-studio/<token>`
namespaces were removed after the initial archive transfer. They intentionally
return `404` instead of redirecting secret-bearing URLs through logs and browser
history.
