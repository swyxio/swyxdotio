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
