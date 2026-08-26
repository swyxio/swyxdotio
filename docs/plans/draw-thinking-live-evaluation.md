# Thinking: live agent evaluation

2026-08-25. User explicitly approved three generic examples with a **$0.50 total cap**.
No personal notes/images, publication, deployment, or paid image generation were involved.

## Result: partial, not a quality pass

| Job | Original caller | Bounded-caller rerun | Visual assessment |
| --- | --- | --- | --- |
| Architecture comparison | Invalid model response before drawing | Six rounds; inserted the matching native preset, corrected an unsupported `align` edit, changed the retrieval label, and fitted the canvas | Useful. Equivalent inputs/outputs, feedback loop, and the illustrative/not-benchmark caveat are clear. |
| Delivery agent/tool loop | Three successful rounds inserted the preset; next request unavailable | Six rounds; inserted the preset but changed only its title | Partial. Structure is clear, but the tool/observation labels remain generic instead of explaining tracking. |
| Rough notes about public learning | Invalid model response | Inspected the blank canvas, then returned another invalid response | Failed. No explanatory figure was produced. |

The rerun's API-success/no-empty-scene gate passes the first two jobs, but **the delivery
example does not fully meet the semantic brief**. The automated live evaluation fails overall.
Do not represent the two native preset-based outputs as three independently successful essays.

The baseline used `8dd80c4`. The rerun adds low reasoning effort and raises the per-turn
completion limit from 1,200 to 2,000 tokens. It also explicitly rejects `finish_reason=length`
before executing tools or claiming a completed review. This closes a separately testable false
completion case; the generic invalid-response failures do **not** establish their precise cause.
No shared page/navigation/auth/tenant code changed.

## Spend and execution boundary

- 20 attempted model-step requests across baseline and rerun; no automatic retries.
- 16 successful responses supplied token usage: **$0.047455 token-based estimate**.
- Four failed/unavailable responses supplied no usable cost: reserve **$0.05 each**.
- Conservative accounted total: **$0.247455**, below the authorized $0.50 cap.
- This is not a provider invoice. Unknown usage was not treated as zero.
- Model: `@cf/qwen/qwen3.8-27b`, at the [published input/output rates](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/) of $0.45/$3.20 per million tokens.
- Real Cloudflare AI binding; real browser sandbox commands and native Excalidraw exports.
  Only identity is the existing localhost-only test fixture. No remote login or permission boundary was bypassed.
- Local Wrangler emitted intermittent internal errors; dev-runtime interference is possible,
  but not established as the cause. Root stopped its Wrangler before the evaluation ended.

## Evidence and repeatability

`tests/draw-agent.live.spec.js` is skipped unless `DRAW_LIVE_AGENT=1`; requires a persistent
`DRAW_LIVE_OUTPUT` directory, rejects non-localhost targets, disables test retries, and records
the cumulative spend ledger before dispatch. Media inference is blocked. It exercises the real
composer, keeps model replies unmocked, and saves generic responses, native scenes, PNGs and SVGs.
Use `DRAW_LIVE_RUN` to keep distinct attempts under the same cost ledger. Never reset the ledger
to reuse an exhausted authorization. Normal mocked regression tests need no paid opt-in.

Local records: `/tmp/draw-thinking-live-20260825/` (baseline) and its `low-reasoning/` subdirectory.
Copied live exports: `/Users/swyx/.codex/visualizations/2026/08/26/01a03c45-0d08-7932-9e33-b5e295e7cecf/live-agent/`.

## Recommended next bounded improvement

The agent spends most of its six rounds rediscovering commands/catalogs and inspecting IDs.
Give the three presets a small, validated semantic-label input so the model can insert a
fully adapted figure in one command, then reserve remaining rounds for visual correction.
For example, the argument map should accept concise claim/reason/evidence/objection text;
the evidence gap must remain explicit. This reuses native layout/binding/undo, not a new
layout engine. Retest the failed notes job and the incomplete delivery labels before calling
the assistant's essay output ready. This additional feature is a recommendation, not implemented here.
