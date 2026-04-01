# Spec: Remy Hybrid Cloud Routing

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date             | Agent/Session      | Commit |
| ------------- | ---------------- | ------------------ | ------ |
| Created       | 2026-03-31 21:03 | Planner + Research |        |
| Status: ready | 2026-03-31 21:03 | Planner + Research |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer said this feature already exists and that the builder needs a spec, developer notes, and research so they know exactly how to build it. They described the current situation as all chatbot traffic being tied directly to their computer's AI, which is so slow that a single action can take roughly two minutes. In their words, it is impossible to use like this and would never scale.

They want non-private AI traffic to move to a respectable cloud-hosted or third-party AI so it is immediate, fast, and can handle concurrent work. Private work should still pass to the local model on their computer. They described wanting a swarm-like split where the cloud handles fast public-safe work and the local model handles truly private work.

They also said they intentionally trained the current model and that this change should feel like swapping out the brain rather than rebuilding the product's behavior from scratch. Their standard for success is not just "works," but "performs the same and just as well, and even better."

### Developer Intent

- **Core goal:** Decouple public Remy traffic from the developer's local hardware while preserving local-only handling for private client and chef conversations.
- **Key constraints:** Never route private client or chef context to cloud in this v1; preserve Remy's voice, prompts, and domain usefulness; keep the public SSE contract stable so the existing widgets do not need a UI rewrite.
- **Motivation:** The current architecture is too slow to be usable and will never scale if every public interaction depends on one local Ollama box.
- **Success from the developer's perspective:** Public Remy becomes fast and immediate even if local Ollama is unavailable, while private Remy stays local and behavior remains recognizably "the same brain" or better.

---

## What This Does (Plain English)

This spec moves the public Remy chat lanes off the chef's local machine and onto an Ollama-compatible cloud endpoint, while leaving private client and chef lanes on local Ollama only. The landing-page concierge and tenant public widget keep the same UI and SSE behavior, but their backend provider becomes cloud-configurable. Client portal and chef drawer/chat remain local-first and fail closed if local Ollama is unavailable.

---

## Why It Matters

Right now every live Remy chat path still depends on local Ollama, which makes public chat too slow and inherently unscalable (`app/api/remy/landing/route.ts:94-133`, `app/api/remy/public/route.ts:125-170`, `app/api/remy/client/route.ts:166-192`, `app/api/remy/stream/route.ts:978-1090`). This spec removes the public bottleneck without weakening the privacy boundary already encoded in the private lanes (`lib/ai/remy-public-context.ts:1-4`, `lib/ai/remy-client-context.ts:1-4`, `app/api/remy/stream/route.ts:1-3`).

---

## Files to Create

| File                             | Purpose                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/remy-provider-policy.ts` | Deterministic lane-to-provider policy: public routes use cloud, private routes use local only.                            |
| `lib/ai/remy-public-llm.ts`      | Shared public-route LLM helper that talks to an Ollama-compatible cloud endpoint and preserves the existing SSE contract. |

---

## Files to Modify

| File                                      | What to Change                                                                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/providers.ts`                     | Add explicit config helpers for public-cloud Ollama host, API key, model, and local-fallback flag without changing private-lane config.         |
| `app/api/remy/landing/route.ts`           | Replace direct local Ollama setup with the shared public LLM helper; keep validation, rate limiting, and SSE event shape unchanged.             |
| `app/api/remy/public/route.ts`            | Replace direct local Ollama setup with the shared public LLM helper; keep tenant scoping, public context loading, and SSE shape unchanged.      |
| `app/api/remy/client/route.ts`            | Add explicit local-only policy assertion and preserve the current "no cloud models ever" behavior.                                              |
| `app/api/remy/stream/route.ts`            | Add explicit local-only policy assertion and preserve the current chef-only local route behavior.                                               |
| `scripts/api-health-check.ts`             | Add health/config checks for the new public-cloud env contract.                                                                                 |
| `docs/ai-model-governance.md`             | Replace stale `lib/ai/dispatch/*` references with the real files that now govern Remy provider selection.                                       |
| `app/(chef)/settings/ai-privacy/page.tsx` | Update privacy copy so it no longer claims all Remy traffic is private-infrastructure-only or that no conversation-related server tables exist. |
| `docs/remy-complete-reference.md`         | Update the opening architecture summary and data-flow description to reflect public-cloud routing plus existing server-side artifacts/memories. |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No migration is part of this spec.
- Do not add or modify `remy_*` tables as part of this routing change.

---

## Data Model

No database schema changes are required. This feature introduces a runtime policy model, not a persistence model.

Key runtime entities:

- `RemyLane`
  - `landing`
  - `public`
  - `client`
  - `chef`
- `RemyProviderPolicy`
  - `mode: 'cloud' | 'local'`
  - `allowLocalFallback: boolean`
  - `modelTier: 'fast' | 'standard' | 'complex'`
  - `reason: string`
- `RemyPublicCloudConfig`
  - `baseUrl`
  - `apiKey`
  - `model`
  - `timeoutMs`

Constraints:

- `landing` and `public` must resolve to `mode: 'cloud'` in v1.
- `client` and `chef` must resolve to `mode: 'local'` in v1.
- Public routes may optionally fall back to local only when an explicit env flag enables it.
- Private routes must never fall back to cloud.
- Existing `remy_conversations`, `remy_messages`, `remy_memories`, `remy_artifacts`, and `remy_support_shares` tables remain unchanged and are out of scope for this spec (`types/database.ts:41258-41650`).

---

## Server Actions

| Action / Surface              | Auth              | Input                                | Output                                            | Side Effects                                   |
| ----------------------------- | ----------------- | ------------------------------------ | ------------------------------------------------- | ---------------------------------------------- |
| `getRemyProviderPolicy(lane)` | none              | `lane`                               | `{ mode, allowLocalFallback, modelTier, reason }` | None                                           |
| `streamPublicRemyChat(input)` | none              | `{ lane, systemPrompt, userPrompt }` | Async token stream + provider metadata            | None                                           |
| `POST /api/remy/landing`      | none              | `{ message, history }`               | SSE (`token`, `error`, `done`)                    | Rate limit only; no DB writes                  |
| `POST /api/remy/public`       | none              | `{ message, history, tenantId }`     | SSE (`token`, `error`, `done`)                    | Rate limit + public context load; no DB writes |
| `POST /api/remy/client`       | `requireClient()` | existing request body                | existing SSE                                      | Must assert local-only lane before model call  |
| `POST /api/remy/stream`       | `requireChef()`   | existing request body                | existing SSE                                      | Must assert local-only lane before model call  |

Implementation details:

- `streamPublicRemyChat()` must preserve the current public SSE schema. Do not add new event types unless the public widgets are updated too (`components/public/remy-concierge-widget.tsx:117-149`).
- Public routes must emit the same friendly error shape they emit today; only the provider changes.
- Private routes must fail closed if a builder accidentally configures cloud mode globally.

---

## UI / Component Spec

No new UI surfaces are introduced.

### Page Layout

- Keep the existing landing-page floating concierge widget and inline concierge section unchanged in structure (`components/public/remy-concierge-widget.tsx:3-5`, `docs/app-complete-audit.md:1492`, `docs/app-complete-audit.md:1724-1735`).
- Keep the existing client portal and chef drawer/chat layouts unchanged (`docs/app-complete-audit.md:1598`, `docs/app-complete-audit.md:1839-1851`).

### States

- **Loading:** Keep the current public widget spinner and streaming behavior; no new skeletons are needed.
- **Empty:** Keep the current empty chat experience; this spec does not redesign the public chat UI.
- **Error:** Public routes keep a friendly public-facing error. Client and chef routes keep their current local-Ollama-required errors.
- **Populated:** Responses still stream token-by-token into the existing message bubbles.

### Interactions

- Public users continue typing into the existing widgets; the browser still POSTs to the same endpoints.
- The browser must not know or care whether the public response came from local or cloud.
- The public streaming parser must keep working without modification, so the backend must continue emitting `data: {"type":"token"|"error"|"done","data":...}` blocks (`components/public/remy-concierge-widget.tsx:121-149`).
- Client and chef chat interactions remain unchanged from the UI perspective.

---

## Edge Cases and Error Handling

| Scenario                                                             | Correct Behavior                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REMY_PUBLIC_AI_MODE=cloud` but cloud base URL or API key is missing | Public routes return the existing friendly public error and log a clear server-side config error. Do not silently route private traffic to cloud.                                                                                                   |
| Cloud endpoint times out before sending tokens                       | Public route returns SSE `error`, closes the stream, and does not leave the widget hanging.                                                                                                                                                         |
| Cloud endpoint fails and `REMY_PUBLIC_LOCAL_FALLBACK=true`           | Public route retries once against local Ollama only. This fallback is public-only.                                                                                                                                                                  |
| Cloud endpoint fails and local fallback is disabled                  | Public route stays offline with a friendly error; no hidden fallback.                                                                                                                                                                               |
| Local Ollama is offline while public cloud mode is healthy           | Public landing and tenant-public chat still work. Client and chef routes still return local-only failure messages.                                                                                                                                  |
| Builder tries to reuse `routeForRemy()` for public traffic           | Reject that implementation. `routeForRemy()` is explicitly PC-only and would keep public traffic on local hardware (`lib/ai/llm-router.ts:1-6`, `lib/ai/llm-router.ts:76-96`).                                                                      |
| Builder changes `getOllamaConfig()` to point at cloud                | Reject that implementation. It would leak private routes onto cloud because client and chef lanes use the shared local config today (`app/api/remy/client/route.ts:166-188`, `app/api/remy/stream/route.ts:978-1040`, `lib/ai/providers.ts:18-26`). |

---

## Verification Steps

1. Configure public-cloud env vars:
   - `REMY_PUBLIC_AI_MODE=cloud`
   - `REMY_PUBLIC_OLLAMA_BASE_URL=<reachable remote Ollama-compatible host>`
   - `REMY_PUBLIC_OLLAMA_API_KEY=<bearer token>`
   - `REMY_PUBLIC_OLLAMA_MODEL_FAST=<explicit model name>`
   - Keep existing local `OLLAMA_BASE_URL` for private routes
2. Stop local Ollama.
3. Open the landing page and send a public widget message. Verify the existing widget streams a response successfully through `/api/remy/landing` even while local Ollama is down (`components/public/remy-concierge-widget.tsx:104-149`, `app/api/remy/landing/route.ts:94-133`).
4. Hit `/api/remy/public` from a tenant-scoped public page. Verify the reply stays grounded to public chef profile data only (`app/api/remy/public/route.ts:136-170`, `lib/ai/remy-public-context.ts:31-111`).
5. With local Ollama still stopped, hit `/api/remy/client` and `/api/remy/stream`. Verify both still fail with local-only errors and do not cloud-fallback (`app/api/remy/client/route.ts:144-175`, `app/api/remy/stream/route.ts:163-179`, `app/api/remy/stream/route.ts:978-989`).
6. Restart local Ollama and verify client and chef chat behavior still works as before.
7. Confirm that a public chat does not create or change `remy_conversations`, `remy_messages`, `remy_memories`, or `remy_artifacts`; this spec must not add public persistence to those tables (`types/database.ts:41258-41650`).
8. Run the updated health check and verify it reports the public-cloud config separately from local Ollama (`scripts/api-health-check.ts:390-405` plus the new Remy public-cloud checks added in this spec).
9. Run a small golden-prompt comparison for public Remy voice/safety before cutover, using the existing Remy eval harness as the reference pattern for structured evaluation (`scripts/remy-eval/eval-harness.ts:1-18`, `scripts/remy-eval/eval-harness.ts:29-33`).

---

## Out of Scope

- No message-by-message privacy classifier or mid-conversation swarm inside `/api/remy/client` or `/api/remy/stream`.
- No migration or redesign of `remy_*` persistence tables.
- No change to chef warmup behavior in `app/api/remy/warmup/route.ts`; that route remains local-chef-only (`app/api/remy/warmup/route.ts:1-20`).
- No API key rotation pool, free-tier juggling, or multi-key failover system.
- No fine-tuning/training pipeline work for Remy models.

---

## Notes for Builder Agent

- Public lanes are already the safe place to start because they are narrow and already isolated from client/chef PII (`lib/ai/remy-public-context.ts:1-4`, `lib/ai/remy-public-context.ts:31-111`).
- Do not use `routeForRemy()` for public traffic. It is explicitly a single-endpoint PC router and will defeat this whole spec (`lib/ai/llm-router.ts:1-6`, `lib/ai/llm-router.ts:76-96`).
- Do not repoint `getOllamaConfig()` to cloud. Add separate public-cloud config helpers so private routes keep their current local contract (`lib/ai/providers.ts:18-26`, `app/api/remy/client/route.ts:166-188`, `app/api/remy/stream/route.ts:978-1040`).
- Keep the public SSE contract unchanged. The current public widget only understands `token` and `error` events and otherwise silently ignores malformed events (`components/public/remy-concierge-widget.tsx:121-149`).
- Update the privacy/docs surfaces touched by this spec. They are already drifted today, and cloud-routing public traffic will make that drift worse if you leave the copy untouched (`app/(chef)/settings/ai-privacy/page.tsx:145-171`, `docs/remy-complete-reference.md:10`, `docs/remy-complete-reference.md:594`, `docs/remy-complete-reference.md:599`).

---

## Spec Validation

### 1. What exists today that this touches?

- Public Remy currently enters through the landing widget and the tenant public route, both of which still call local Ollama (`components/public/remy-concierge-widget.tsx:3-5`, `components/public/remy-concierge-widget.tsx:72-110`, `app/api/remy/landing/route.ts:1-5`, `app/api/remy/landing/route.ts:94-133`, `app/api/remy/public/route.ts:1-4`, `app/api/remy/public/route.ts:125-170`).
- Private Remy already has explicit local-only comments and private context loading in client and chef lanes (`app/api/remy/client/route.ts:1-4`, `app/api/remy/client/route.ts:166-192`, `app/api/remy/stream/route.ts:1-3`, `app/api/remy/stream/route.ts:547-570`, `app/api/remy/stream/route.ts:978-1040`, `lib/ai/remy-client-context.ts:41-90`, `lib/ai/remy-context.ts:5`).
- Provider/routing infrastructure is still single-endpoint local-only (`lib/ai/providers.ts:11-26`, `lib/ai/providers.ts:42-60`, `lib/ai/llm-router.ts:1-6`, `lib/ai/llm-router.ts:76-96`, `lib/ai/parse-ollama.ts:3`, `lib/ai/parse-ollama.ts:86-98`).
- Docs/settings/persistence surfaces around Remy are already involved and already inconsistent (`lib/ai/remy-local-storage.ts:1-14`, `lib/hooks/use-remy-send.ts:184-220`, `lib/hooks/use-remy-send.ts:590-630`, `lib/ai/remy-artifact-actions.ts:39-94`, `lib/ai/remy-memory-actions.ts:74-172`, `lib/ai/remy-conversation-actions.ts:25-158`, `app/(chef)/settings/ai-privacy/page.tsx:145-171`, `docs/remy-complete-reference.md:10`, `docs/remy-complete-reference.md:594`, `docs/remy-complete-reference.md:599`, `types/database.ts:41258-41650`).

### 2. What exactly changes?

- Add a deterministic provider-policy file and a shared public LLM helper.
- Rewrite only the public Remy routes (`/api/remy/landing`, `/api/remy/public`) so they stop instantiating local Ollama directly (`app/api/remy/landing/route.ts:109-133`, `app/api/remy/public/route.ts:145-170`).
- Add explicit local-only assertions to the private Remy routes so a future config mistake cannot silently cloud-route them (`app/api/remy/client/route.ts:166-188`, `app/api/remy/stream/route.ts:978-1040`).
- Extend config and health tooling for public-cloud envs without changing private-lane base config (`lib/ai/providers.ts:18-26`, `scripts/api-health-check.ts:390-405`).
- Update the docs/settings screens that would otherwise become more incorrect (`docs/ai-model-governance.md:4`, `docs/ai-model-governance.md:129`, `docs/ai-model-governance.md:144-149`, `app/(chef)/settings/ai-privacy/page.tsx:145-171`, `docs/remy-complete-reference.md:10`, `docs/remy-complete-reference.md:594`, `docs/remy-complete-reference.md:599`).

### 3. What assumptions are you making?

- **Verified:** Public Remy can be cloud-safe because its context loader is public-safe and grounded to an allowlist (`lib/ai/remy-public-context.ts:1-4`, `lib/ai/remy-public-context.ts:31-111`).
- **Verified:** Client and chef Remy are not safe to cloud-route in v1 because they load private client/business context before model invocation (`app/api/remy/client/route.ts:177-188`, `lib/ai/remy-client-context.ts:41-90`, `app/api/remy/stream/route.ts:547-570`, `app/api/remy/stream/route.ts:994-1040`, `lib/ai/remy-context.ts:5`).
- **Unverified:** The developer said the current model is intentionally trained, but the repo only shows stock Qwen defaults today (`lib/ai/providers.ts:20-26`, `lib/ai/providers.ts:33-50`, `app/api/remy/warmup/route.ts:18-20`).
- **Unverified:** Exact current latency distribution is not instrumented in-repo; the code only shows long timeout expectations and "replies may take a moment" UX (`app/api/remy/landing/route.ts:113-133`, `app/api/remy/public/route.ts:149-170`, `app/api/remy/client/route.ts:190-193`, `components/public/remy-concierge-widget.tsx:499`).

### 4. Where will this most likely break?

- The public SSE adapter is the highest-risk point because the widget expects a very small event grammar and parses the raw stream directly (`components/public/remy-concierge-widget.tsx:117-149`).
- Privacy leakage is the next biggest risk if a builder tries to reuse private context builders or global local config for the public-cloud path (`lib/ai/remy-public-context.ts:31-111`, `lib/ai/remy-client-context.ts:41-90`, `lib/ai/providers.ts:18-26`).
- Config drift is the third risk because current governance/docs already point builders at files that are not the live runtime path (`docs/ai-model-governance.md:4`, `docs/ai-model-governance.md:129`, `docs/ai-model-governance.md:144-149`, `app/api/remy/public/route.ts:8`, `app/api/remy/stream/route.ts:12`).

### 5. What is underspecified?

- Automatic public fallback behavior is underspecified today, so this spec makes it explicit: public routes may fall back to local only when `REMY_PUBLIC_LOCAL_FALLBACK=true`; otherwise they fail closed.
- Cloud model selection is underspecified today, so this spec requires an explicit `REMY_PUBLIC_OLLAMA_MODEL_FAST` env rather than a silent hardcoded model choice.
- The public/private split is underspecified in docs today, so this spec names the exact lanes and fences off the private ones (`app/api/remy/public/route.ts:1-4`, `app/api/remy/client/route.ts:1-4`, `app/api/remy/stream/route.ts:1-3`).

### 6. What dependencies or prerequisites exist?

- A reachable Ollama-compatible cloud endpoint, API key, and explicit cloud model name are required for public-cloud mode.
- Existing local Ollama config remains required for private lanes (`lib/ai/providers.ts:11-26`, `app/api/remy/client/route.ts:144-188`, `app/api/remy/stream/route.ts:163-179`).
- No DB migration is required.
- The repo already has a green docs baseline from the last recorded build, but this is still a docs-only planning session (`docs/build-state.md:17-21`, `docs/session-log.md:197-206`).

### 7. What existing logic could this conflict with?

- `lib/ai/providers.ts` is shared by many private/local callers; changing its existing local helpers instead of adding public-cloud helpers would leak the wrong provider into private lanes (`lib/ai/providers.ts:18-26`, `lib/ai/providers.ts:42-60`, `app/api/remy/client/route.ts:166-188`, `app/api/remy/stream/route.ts:978-1040`).
- `lib/ai/llm-router.ts` is chef/private routing infrastructure, not public-cloud infrastructure (`lib/ai/llm-router.ts:1-6`, `lib/ai/llm-router.ts:76-96`).
- Privacy/settings docs already conflict with live persistence behavior and will conflict harder after this change if left untouched (`lib/hooks/use-remy-send.ts:184-220`, `lib/hooks/use-remy-send.ts:590-630`, `app/(chef)/settings/ai-privacy/page.tsx:145-171`, `docs/remy-complete-reference.md:10`, `docs/remy-complete-reference.md:594`, `docs/remy-complete-reference.md:599`).

### 8. What is the end-to-end data flow?

- **Landing public flow:** public widget -> `POST /api/remy/landing` -> validation + rate limit -> provider policy -> public cloud LLM helper -> SSE `token/error/done` -> widget appends streamed content (`components/public/remy-concierge-widget.tsx:104-149`, `app/api/remy/landing/route.ts:56-133`).
- **Tenant public flow:** tenant public UI -> `POST /api/remy/public` -> validation + tenantId -> public context load -> provider policy -> public cloud LLM helper -> SSE response (`app/api/remy/public/route.ts:101-170`, `lib/ai/remy-public-context.ts:24-111`).
- **Chef/private flow remains:** drawer -> `/api/remy/stream` -> guardrails + local health check -> classify/context/memories -> `routeForRemy()` local endpoint -> streamed response -> client hook saves local IndexedDB copy plus server artifacts/memories (`app/api/remy/stream/route.ts:163-179`, `app/api/remy/stream/route.ts:547-570`, `app/api/remy/stream/route.ts:978-1090`, `lib/hooks/use-remy-send.ts:425-462`, `lib/hooks/use-remy-send.ts:590-630`, `lib/ai/remy-artifact-actions.ts:39-94`, `lib/ai/remy-memory-actions.ts:74-172`).

### 9. What is the correct implementation order?

1. Add public-cloud env helpers to `lib/ai/providers.ts`.
2. Add `lib/ai/remy-provider-policy.ts`.
3. Add `lib/ai/remy-public-llm.ts`.
4. Rewire `/api/remy/landing` and `/api/remy/public`.
5. Add explicit no-cloud assertions to `/api/remy/client` and `/api/remy/stream`.
6. Update `scripts/api-health-check.ts`.
7. Update governance/privacy/docs copy.
8. Verify public-cloud success with local Ollama down, then verify private lanes still fail closed.

This order prevents the common mistake of rewiring routes before the provider contract exists (`app/api/remy/landing/route.ts:109-133`, `app/api/remy/public/route.ts:145-170`, `lib/ai/providers.ts:18-26`).

### 10. What are the exact success criteria?

- Public widgets continue working without any frontend streaming-parser changes (`components/public/remy-concierge-widget.tsx:117-149`).
- Public routes still answer when local Ollama is stopped.
- Private routes do not cloud-fallback and continue to require local Ollama (`app/api/remy/client/route.ts:144-188`, `app/api/remy/stream/route.ts:163-179`, `app/api/remy/stream/route.ts:978-989`).
- Public routes do not start writing to `remy_conversations`, `remy_messages`, `remy_memories`, or `remy_artifacts` (`types/database.ts:41258-41650`).
- Privacy/governance docs no longer claim "all Remy runs only on private infrastructure" or "there is no server-side conversation-related storage" (`app/(chef)/settings/ai-privacy/page.tsx:145-171`, `docs/remy-complete-reference.md:10`, `docs/remy-complete-reference.md:594`, `docs/remy-complete-reference.md:599`).

### 11. What are the non-negotiable constraints?

- Public lanes only; private lanes stay local-only in this spec (`app/api/remy/public/route.ts:1-4`, `app/api/remy/client/route.ts:1-4`, `app/api/remy/stream/route.ts:1-3`).
- Preserve tenant scoping and public grounding rules (`app/api/remy/public/route.ts:101-110`, `lib/ai/remy-public-context.ts:31-111`).
- Preserve existing auth requirements in client and chef routes (`app/api/remy/client/route.ts:82-83`, `app/api/remy/stream/route.ts:7`, `app/api/remy/stream/route.ts:77`).
- Do not introduce API key rotation or free-tier dependency as an operational crutch; the health check pattern assumes stable provider credentials (`scripts/api-health-check.ts:390-405`).
- Keep the public SSE contract stable (`components/public/remy-concierge-widget.tsx:121-149`).

### 12. What should NOT be touched?

- Do not redesign local Remy persistence in `lib/hooks/use-remy-send.ts`, `lib/ai/remy-artifact-actions.ts`, `lib/ai/remy-memory-actions.ts`, or `lib/ai/remy-conversation-actions.ts` as part of this routing spec (`lib/hooks/use-remy-send.ts:184-220`, `lib/ai/remy-artifact-actions.ts:39-94`, `lib/ai/remy-memory-actions.ts:74-172`, `lib/ai/remy-conversation-actions.ts:25-158`).
- Do not change `app/api/remy/warmup/route.ts`; it is still chef/local infrastructure (`app/api/remy/warmup/route.ts:1-20`).
- Do not add DB migrations or new Remy persistence tables.

### 13. Is this the simplest complete version?

Yes. The simplest complete version is route-level hybrid routing: public routes to cloud, private routes stay local. Anything more ambitious, like message-level privacy classification inside chef/client chat, would be a new architecture because those routes already load private context before the model call (`app/api/remy/client/route.ts:177-188`, `app/api/remy/stream/route.ts:547-570`, `app/api/remy/stream/route.ts:994-1040`).

### 14. If implemented exactly as written, what would still be wrong?

- Client and chef Remy would still be bottlenecked by local hardware. That is intentionally not solved here (`app/api/remy/client/route.ts:166-192`, `app/api/remy/stream/route.ts:978-1090`).
- The broader privacy narrative would still need a separate cleanup pass because server-side artifacts/memories already contradict the pure browser-only story even before this change (`lib/hooks/use-remy-send.ts:184-220`, `lib/hooks/use-remy-send.ts:590-630`, `app/(chef)/settings/ai-privacy/page.tsx:145-171`, `docs/remy-complete-reference.md:10`, `docs/remy-complete-reference.md:594`, `docs/remy-complete-reference.md:599`).
- Exact "same brain" parity is still a runtime validation question because the repo does not prove the existence of a fine-tuned Remy model artifact; current visible defaults are stock Qwen models, so parity must be checked with a golden-prompt eval before rollout (`lib/ai/providers.ts:20-26`, `lib/ai/providers.ts:33-50`, `scripts/remy-eval/eval-harness.ts:1-18`, `scripts/remy-eval/eval-harness.ts:29-33`).

### Final Check

This spec is production-ready for the v1 public-cloud/private-local split.

The remaining uncertainty is not architectural correctness; it is deployment-time provider selection and behavior parity. To resolve that, the operator must provide a reachable Ollama-compatible cloud endpoint and explicit public model name, then run a small golden-prompt regression pass before switching traffic (`lib/ai/providers.ts:20-26`, `scripts/remy-eval/eval-harness.ts:1-18`, `scripts/remy-eval/eval-harness.ts:29-33`).

If a builder ignores that and globally repoints `OLLAMA_BASE_URL` to cloud, they will break the privacy boundary. That is the primary implementation trap this spec is designed to prevent (`lib/ai/providers.ts:18-26`, `app/api/remy/client/route.ts:166-188`, `app/api/remy/stream/route.ts:978-1040`).
