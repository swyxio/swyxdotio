# Scripts

## validate-yaml.js

Validates YAML configuration files (`podcasts.yml` and `talks.yml`) to catch syntax errors before deployment.

### Usage

```bash
# Run validation manually
npm run validate:yaml

# Validation runs automatically before build
npm run build
```

### What it checks

- YAML syntax is valid and parseable
- Files contain valid array structures
- Catches implicit key errors (common YAML syntax issues)

### Common errors caught

- Leading whitespace before root-level list items (-)
- Leading whitespace before root-level comments (#)
- Special characters (like `**`) in field values without quotes
- Missing colons after field names
- Invalid YAML structure

The validation will fail the build if any YAML files are malformed, preventing deployment of broken configurations.

## Podcast migration

The podcast scripts preserve Transistor RSS metadata, download media into an
ignored resumable staging directory, upload assets to Cloudflare R2, and verify
feed parity.

```bash
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

Uploads target remote R2 by default. Pass `--local` only for an intentional
Wrangler local-storage smoke test. The scripts keep checkpoint manifests under
`.podcast-migration/`, so rerunning a command resumes completed downloads and
uploads.

Before the final Transistor redirect cutover, freeze publishing and repeat the
migration command with `--refresh-feed --refresh-assets` so same-URL media edits
are also detected.
