# AI Model Governance Policy

> Canonical reference for runtime AI routing and action policy.
> Source of truth: `lib/ai/dispatch/` (code) and this document (policy).

## Architecture

ChefFlow now uses a real dispatch layer in `lib/ai/dispatch/`:

1. Privacy gate
2. Deterministic classifier
3. Runtime routing
4. Confidence-to-action policy

Every Ollama-backed runtime path should enter through this layer directly or through wrappers that consume it, such as:

- `lib/ai/providers.ts`
- `lib/ai/llm-router.ts`
- `lib/ai/parse-ollama.ts`

The dispatch layer is deterministic. It does not call an LLM to decide which LLM should be used.

## Runtime Modes

The runtime supports three endpoint modes for Ollama-compatible inference:

| Mode     | Condition                                      | Behavior |
| -------- | ---------------------------------------------- | -------- |
| `local`  | Only a local endpoint is configured            | Run on-device |
| `cloud`  | Only a cloud endpoint is configured            | Run in cloud |
| `hybrid` | Local and cloud endpoints are both configured  | Route automatically |

### Endpoint Configuration

The dispatch layer resolves endpoints from environment variables in this order:

- `OLLAMA_LOCAL_BASE_URL`
- `OLLAMA_CLOUD_BASE_URL`
- `OLLAMA_BASE_URL` as a shared fallback

Model overrides follow the same pattern:

- `OLLAMA_LOCAL_MODEL`
- `OLLAMA_CLOUD_MODEL`
- `OLLAMA_MODEL`
- tier-specific variants such as `OLLAMA_LOCAL_MODEL_FAST`

## Routing Rules

### Deterministic First

If a task can be handled without an LLM, it must not be routed to Ollama.

Examples:

- portion math
- direct availability checks
- fixed transforms

### Privacy Routing

The privacy gate classifies work as:

| Level         | Meaning |
| ------------- | ------- |
| `public`      | Safe to route without tenant-sensitive context |
| `internal`    | Internal workflow metadata, but no detected sensitive payload |
| `restricted`  | PII, financials, dietary data, legal data, staff data, or mutation preparation |

Restricted work should stay on-device when a local runtime exists. If only cloud is configured, the cloud Ollama-compatible runtime is used.

### Local-First Policy

When both endpoints are available:

1. Restricted work prefers local
2. Latency-sensitive work prefers local
3. Public work may use cloud when the caller marks device capability as low
4. Otherwise the default is local

## Task Classes

The classifier currently resolves these runtime classes:

| Class             | Meaning |
| ----------------- | ------- |
| `deterministic`   | No LLM required |
| `read`            | Read and interpret existing context |
| `write`           | Prepares or performs a state mutation |
| `parse`           | Structured extraction or classification |
| `generation`      | Drafting, rewriting, summarizing |
| `automation`      | Background workflow intelligence |
| `orchestration`   | Coordination across AI subsystems |

## Confidence Action Policy

The shared threshold policy is implemented in `lib/ai/dispatch/router.ts`.

Default thresholds:

- High confidence: `>= 0.85`
- Medium confidence: `>= 0.60` and `< 0.85`
- Low confidence: `< 0.60`

Default dispositions:

| Confidence | Disposition |
| ---------- | ----------- |
| High       | `execute` |
| Medium     | `queue_for_approval` |
| Low        | `request_input` |

### Safety Overrides

Safety boundaries always override raw confidence:

- `restricted` actions are blocked
- `significant` actions queue for approval
- Surfaces that cannot safely auto-execute fall back to `queue_for_approval` or `request_input`

This means high-confidence write actions in Remy still queue for approval unless a safer reversible lane explicitly opts into auto-execution.

### Current Integrations

The threshold policy is already applied in these places:

- `lib/ai/command-intent-parser.ts`
  Low-confidence plans are held before execution.
- `lib/ai/queue/actions.ts`
  Queue tiers can be downgraded from `auto` to `draft` or `hold` when `_aiConfidence` is provided.
- `lib/ai/parse-ollama.ts`
  Dispatch reasoning, privacy class, and execution location are logged on each routed parse.

## Failure Policy

1. Retry transient Ollama failures once.
2. Fail with a provider-agnostic message if the runtime stays unavailable.
3. Never silently switch to an unrelated provider.
4. Log routing decisions and execution outcomes with enough context to explain what happened.

## Governance Rules

1. All runtime model selection must flow through dispatch-aware helpers.
2. Deterministic code beats model calls.
3. Restricted data must not quietly drift onto a less private lane.
4. Confidence thresholds are advisory only until safety checks pass.
5. Reversible execution is preferred; irreversible actions require explicit approval.

## File Map

| File | Purpose |
| ---- | ------- |
| `lib/ai/dispatch/types.ts` | Shared routing and action types |
| `lib/ai/dispatch/privacy-gate.ts` | Payload sensitivity scanning |
| `lib/ai/dispatch/classifier.ts` | Deterministic task classification |
| `lib/ai/dispatch/routing-table.ts` | Runtime endpoint and model resolution |
| `lib/ai/dispatch/router.ts` | Dispatch decisions and confidence policy |
| `lib/ai/providers.ts` | Dispatch-aware Ollama config surface |
| `lib/ai/llm-router.ts` | Health checks plus runtime route selection |
| `lib/ai/parse-ollama.ts` | Shared structured Ollama adapter |
