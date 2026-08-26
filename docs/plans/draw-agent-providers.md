# Drawing assistant providers

The shared drawing assistant supports Cloudflare AI, OpenAI, DeepSeek, and Featherless.
The same authenticated account, spending cap, durable usage limits, sandbox commands,
native undo and workflow actions apply to every provider, in every workspace mode.
There is no automatic provider fallback and selecting a provider does not send a request.

## Configure keys

These are **shared site keys**, not per-user BYOK. All signed-in users can use configured
providers under the existing funded-AI limits. Keys remain server-side and must never be
placed in client code, browser storage, prompts, chat messages, or `PUBLIC_` variables.

For local development, add these to the uncommitted `.dev.vars` in the checkout running
Wrangler. The `.env.example` file only documents the names; it must not contain real keys.

```dotenv
OPENAI_API_KEY=your-private-key
DEEPSEEK_API_KEY=your-private-key
FEATHERLESS_API_KEY=your-private-key
FEATHERLESS_MODEL=organization/exact-model-id
```

For production, the release owner can use interactive `wrangler secret put` for each key
against the main `swyxdotio` Worker; do not pass secret values as command-line arguments.
Set `FEATHERLESS_MODEL` as a server environment variable. No remote secret configuration or
deployment was performed by this feature task. No new dependencies are required.

## Models and capability differences

| Provider      | Model                     | Canvas access                                              | Cost policy                                                                    |
| ------------- | ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Cloudflare AI | `@cf/qwen/qwen3.8-27b`    | Viewport image + native scene tools                        | $0.45 input / $3.20 output per million tokens                                  |
| OpenAI        | `gpt-5.4-mini-2026-03-17` | Viewport image + native scene tools                        | $0.75 input / $4.50 output per million tokens                                  |
| DeepSeek      | `deepseek-v4-flash`       | Native text/geometry only; no screenshot sent              | Peak uncached rates: $0.44 input / $1.32 output per million tokens             |
| Featherless   | Server-configured model   | Vision only when the model metadata explicitly supports it | Verified model-catalog token, request and image rates; plan billing may differ |

Featherless checks an active model with native tools, the authenticated `/v1/plan` model-size
entitlement, at least 16K effective context and 2K output capacity, and complete nonnegative pricing
metadata. Effective context is the smaller of the model and plan limits, less the output reserve.
A false or missing catalog `available_on_current_plan` flag is advisory when the authenticated
plan permits the model; the picker remains selectable and shows an execution-unverified notice.
Metadata does not prove inference access. Real inference denials stop the run without retries,
provider fallback, or assumptions that the account needs an upgrade.
Unverifiable required limits/capabilities/prices still disable the configured model. No guessed model or
prompt-based imitation of tool calling is used. Metadata checks are read-only, not inference.

OpenAI uses stateless Responses requests (`store:false`, strict tools, no reasoning tokens).
DeepSeek uses its documented beta strict-tool endpoint with thinking disabled; the experimental
vision model is deliberately not selected implicitly. Featherless uses native OpenAI-compatible
chat tools. All inference calls have bounded output; external requests have a 90-second timeout,
no automatic retries, fixed destinations, redirect rejection, and a bounded response body.

Before inference the server reserves a conservative text/input-image/output estimate and uses
at least the existing durable per-turn reservation. Usage estimates use the selected provider's
rates, not Qwen's rates for every model. Missing token usage retains the estimate, never zero.
Provider/account/authorization errors stop the run without trying a different key or provider.

## Integration and verification

- `GET /tools/api/draw/agent` returns secret-free provider/model/capability/configuration metadata.
  Google session and matching `X-Tools-User` are required.
- `POST` accepts a provider ID (`cloudflare`, `openai`, `deepseek`, `featherless`), not a key,
  model ID, base URL, or arbitrary provider request parameters. Cloudflare is the default.
- `DrawAgent.svelte` owns the picker; page/navigation props and shared-shell hooks are unchanged.
  Selection is disabled during a run. Failed metadata loading prevents sending; reopening retries.
  An internal scroll area contains notices, model settings and transcript; header/composer stay
  fixed so mobile Send and Stop cannot be clipped by the added settings. Preserve the central
  shell's bindable lifecycle props, focus helper, mobile font sizes and background inset on merge.
- Provider transport and error paths are unit-tested with mocked HTTP responses. Browser tests
  cover disclosure, selection, missing configuration, no inference on selection, and text-only requests.
- No new-provider live model-quality claim follows from these tests. Production activation and
  any paid canary remain separate release steps.

## Local credential check (2026-08-25)

At the user's direction, the existing OpenAI and Featherless keys were located in newspicychat's
local environment files without changing that project or printing credentials. No DeepSeek key
was found there. The keys are configured only in this isolated checkout's ignored `.dev.vars`.

Read-only OpenAI model metadata confirms access to `gpt-5.4-mini-2026-03-17`. Featherless's
authenticated catalog reports `available_on_current_plan:false` for `Qwen/Qwen3.8-27B` and zero
results for the available-plan/tool-use filter. **Correction:** this does not establish lack of
account entitlement. The same key's `/v1/plan` independently returned HTTP 200 with Feather Chat
(formerly Premium), `max_model_size:null`, `max_context_length:32768`, and `concurrency:4`.
The current plan docs advertise access to all catalog models; native Qwen/Kimi tools are documented.
The prior conclusion that account/model access must change was unjustified. The corrected adapter
accepts the authenticated plan entitlement and warns about the conflicting catalog flag.
Actual tool-call execution remains unverified; no new inference call was made to settle it.
During the correction's read-only recheck, `/v1/plan` returned 200 but the configured model-detail
endpoint returned 404 in this session. Therefore the corrected full metadata preflight did not
pass live here, independently of the catalog-flag fix. This is a metadata-availability result,
not evidence of missing plan entitlement or a need to upgrade.
The raw `owner/model` detail URL works here; the encoded-slash form returned HTTP 403 despite
being documented, so the adapter uses the documented raw slash with each segment encoded.
No inference was requested with either key. Keys are not included in the handoff commit.

Verification: 146 drawing/auth/usage unit tests, 41 browser tests (paid test skipped), typecheck with zero
errors/warnings, and production build passed. Browser fixtures use fake credentials and mocked
inference, not the reused keys.

The catalog-flag correction adds two regression tests (148 drawing/auth/usage unit tests total),
checks that the warning leaves Featherless selectable, bounds context by the authenticated plan,
and confirms an actual mocked inference 403 stops without retry or fallback. No live tool-call
success or new live inference cost is claimed.

Sources checked 2026-08-25: [OpenAI model](https://developers.openai.com/api/docs/models/gpt-5.4-mini),
[Responses tools](https://developers.openai.com/api/docs/guides/function-calling),
[DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/),
[DeepSeek strict tools](https://api-docs.deepseek.com/guides/tool_calls/),
[Featherless model metadata](https://featherless.ai/docs/api-reference-models),
[Featherless native tools](https://featherless.ai/docs/tool-calling),
[Featherless plans](https://featherless.ai/docs/plans),
[Authenticated plan limits](https://featherless.ai/docs/api-reference-plan),
[Featherless vision](https://featherless.ai/docs/vision).
