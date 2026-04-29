# Spec: Public-Only Monitored Cloud AI Gateway

> **Status:** draft, policy approval required before build
> **Priority:** P0 (blocking)
> **Depends on:** `docs/specs/full-cloud-ai-runtime-and-disclosure.md`
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event   | Date             | Agent/Session | Commit |
| ------- | ---------------- | ------------- | ------ |
| Created | 2026-04-29 17:15 | Codex planner |        |

---

## Developer Notes

### Raw Signal

The developer said the public AI should be a free monitored cloud model because it is not using private data and the product needs public responses to be instant. They immediately flagged the conflict with the current AI policy and asked what the right move is. After discussion, they asked to keep building out the spec and make it perfect.

### Developer Intent

- **Core goal:** Make unauthenticated public AI fast enough for real visitors without weakening ChefFlow's private-data AI boundary.
- **Key constraints:** Do not route private chef, client, event, ledger, payment, dietary, CRM, or recipe data to an uncontrolled provider. Do not let this become a general second AI provider for the app. Do not generate recipes.
- **Motivation:** Public Remy and public marketing AI need instant answers. The current single-runtime policy protects privacy, but it also blocks an obvious low-risk speed path for traffic that should contain no private data.
- **Success from the developer's perspective:** Public-only AI can use a monitored free or low-cost cloud model, private ChefFlow AI stays governed by the existing runtime policy, and the policy conflict is resolved explicitly instead of bypassed quietly.

---

## What This Does (Plain English)

This spec creates a narrow policy exception and implementation plan for unauthenticated public AI surfaces. A new public-only gateway may call a monitored cloud model for allowlisted public tasks, but it cannot receive authenticated context, tenant-private data, recipe generation requests, financial data, event data, or arbitrary prompts. Private ChefFlow AI continues to use the existing governed runtime path and must not fall back to this public gateway.

---

## Why It Matters

The live code already has public Remy routes that are unauthenticated and rate-limited, but they still use the shared Ollama-compatible runtime (`app/api/remy/landing/route.ts:1-5`, `app/api/remy/landing/route.ts:155-183`, `app/api/remy/public/route.ts:1-4`, `app/api/remy/public/route.ts:188-227`). The current policy says runtime selection is Ollama-compatible and must not silently switch providers (`lib/ai/parse-ollama.ts:1-4`, `docs/ai-model-governance.md:134-139`). A public cloud model is reasonable only if the exception is explicit, audited, and fenced away from private product AI.

---

## Locked Decisions

1. **This is not a general second AI provider.** It is a public-only gateway for specific unauthenticated tasks.
2. **Private product AI remains governed by the existing runtime policy.** `parseWithOllama()` and authenticated Remy routes must not use the public gateway as fallback (`lib/ai/parse-ollama.ts:160-195`, `docs/specs/full-cloud-ai-runtime-and-disclosure.md:57-62`).
3. **The gateway is allowlist-based.** Callers must pass a known public task ID. Arbitrary prompt passthrough is forbidden.
4. **The gateway fails closed.** If input classification sees private data, recipe generation, authenticated context, unsupported task ID, missing config, quota exhaustion, or provider unavailability, it returns a provider-agnostic public error.
5. **Recipe generation remains banned everywhere.** Existing public routes already block recipe generation before model calls, and this gateway must keep that boundary (`app/api/remy/landing/route.ts:119-128`, `app/api/remy/public/route.ts:152-161`).
6. **Free tier is not an architecture guarantee.** A free monitored model is acceptable only behind quotas, spend caps, rate limits, and health monitoring. If the free tier degrades, the product should fail closed or use deterministic public answers, not spill into private runtime paths.
7. **Tenant-public context is allowed only if it is proven public.** A tenant ID supplied by an unauthenticated request is not enough. The gateway may use chef-specific context only after verifying the exact fields are public-facing and the chef/profile is public.
8. **Disclosures must be mode-specific.** Public AI surfaces cannot keep saying no third-party AI if the public gateway uses one. Private settings cannot imply private data uses the public provider.

---

## Files to Create

| File                                        | Purpose                                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/public-cloud-gateway.ts`            | Public-only cloud model adapter with allowlisted task IDs, timeout, provider metadata, and no access to private context helpers.              |
| `lib/ai/public-cloud-policy.ts`             | Policy guard that classifies task ID, request surface, auth state, tenant-public eligibility, and forbidden content before any provider call. |
| `lib/ai/public-cloud-audit.ts`              | Content-minimized logging helper for provider, model, task ID, latency, decision, and safety result without storing raw prompts or responses. |
| `tests/unit/public-cloud-ai-policy.test.ts` | Unit tests proving private signals, recipe generation, unsupported tasks, and authenticated context are blocked.                              |

---

## Files to Modify

| File                                                 | What to Change                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/AI_POLICY.md`                                  | Add a "Public Non-Private AI Exception" section that explicitly permits only this gateway and preserves all private AI restrictions.              |
| `docs/ai-model-governance.md`                        | Record the public gateway as a separate policy exception, not part of normal runtime fallback.                                                    |
| `docs/specs/full-cloud-ai-runtime-and-disclosure.md` | Add a short amendment pointing to this spec so builders know the full-cloud spec does not ban the public-only exception.                          |
| `lib/ai/privacy-narrative.ts`                        | Add mode-specific public disclosure copy for public surfaces that use a monitored cloud model, without changing private Remy trust copy globally. |
| `app/api/remy/landing/route.ts`                      | Route eligible platform-level public chat through the public cloud gateway after existing validation, rate limiting, and instant-answer checks.   |
| `app/api/remy/public/route.ts`                       | Route eligible chef-public chat through the gateway only after public-profile eligibility is verified. Keep public context grounding.             |
| `app/api/remy/surface-runtime-utils.ts`              | Keep deterministic instant answers ahead of any model call and expose a shared public fallback message.                                           |
| `components/public/remy-concierge-widget.tsx`        | Update the footer disclosure only if this widget uses the public cloud gateway. Keep the SSE client contract unchanged.                           |
| `components/public/remy-concierge-section.tsx`       | Update the inline public disclosure if this section remains wired to `/api/remy/landing`.                                                         |

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

- No migration is required.
- Do not add persistence for public chat transcripts in this spec.

---

## Data Model

No database model changes. The new model is an in-memory request contract:

```ts
type PublicCloudTaskId = 'landing_concierge' | 'chef_public_concierge'

interface PublicCloudAiRequest {
  taskId: PublicCloudTaskId
  surface: 'public_landing' | 'public_chef_profile'
  message: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  publicContext?: Record<string, unknown>
  authenticatedUserId?: never
  tenantPrivateContext?: never
}
```

Constraints:

- `authenticatedUserId` must never be accepted.
- `tenantPrivateContext` must never be accepted.
- `publicContext` must be constructed by route-owned allowlist code, not passed through from the browser.
- Raw prompt and response text must not be persisted by the audit helper.

---

## Server Actions

No server actions are added. This is API route and server helper work.

| Function / Route                    | Auth | Input                                       | Output                                | Side Effects                                                                   |
| ----------------------------------- | ---- | ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| `assertPublicCloudAiAllowed(input)` | none | task ID, surface, message, context metadata | `{ allowed: true }` or blocked reason | Logs policy decision without raw content                                       |
| `streamPublicCloudAi(input)`        | none | allowed public request                      | SSE-compatible async token stream     | Logs provider, model, latency, token counts                                    |
| `POST /api/remy/landing`            | none | existing `{ message, history }`             | existing SSE shape                    | Rate limit, guardrails, deterministic fast path, then public gateway           |
| `POST /api/remy/public`             | none | existing `{ message, history, tenantId }`   | existing SSE shape                    | Rate limit, guardrails, public eligibility check, public context, then gateway |

Implementation rules:

- Preserve the existing public SSE grammar: `token`, `error`, and `done` (`components/public/remy-concierge-widget.tsx:130-149`, `components/public/remy-concierge-section.tsx:98-123`).
- Do not import private Remy context loaders into `public-cloud-gateway.ts`.
- Do not expose provider names or stack details in public errors.
- Do not store raw public chat content server-side.

---

## UI / Component Spec

### Page Layout

No structural redesign is required. The public widget and inline section keep their current layouts and streaming parser.

### States

- **Loading:** unchanged streaming state.
- **Empty:** unchanged starter prompts.
- **Error:** show the same friendly public unavailable message. Do not say "start Ollama" or expose provider internals.
- **Populated:** streamed answer appears exactly as today.

### Interactions

- Visitor sends a message from the public widget or section.
- Client posts to the same route as today.
- Route performs validation, rate limiting, guardrail checks, and instant-answer checks before calling the public gateway.
- If the gateway blocks or fails, the UI receives an SSE `error` event and does not append fabricated success text.

### Disclosure Copy

Public surfaces using the gateway should say the equivalent of:

> Public chat may use monitored cloud AI. Do not enter private client, payment, event, or recipe details.

Private authenticated surfaces must keep their own runtime-specific disclosure and must not import this public disclosure by default.

---

## Edge Cases and Error Handling

| Scenario                                                                                        | Correct Behavior                                                                                |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| User enters email, phone, address, payment, quote, dietary, allergy, event, or contract details | Block before provider call and ask the visitor to use the proper inquiry or portal flow.        |
| User asks for recipe generation                                                                 | Block before provider call. No recipe ideas, drafts, substitutions, or ingredient instructions. |
| Authenticated route tries to call the gateway                                                   | Throw server-side policy error.                                                                 |
| Unsupported task ID is passed                                                                   | Throw server-side policy error.                                                                 |
| Provider quota is exhausted                                                                     | Return public unavailable message, log quota event, do not fallback to private runtime.         |
| Provider latency exceeds timeout                                                                | Abort, emit SSE `error`, log timeout.                                                           |
| Public chef profile is not published or fields are not public                                   | Do not call the gateway with chef context. Use generic platform answer or public error.         |
| Provider terms allow training on inputs                                                         | Do not use that provider for this gateway.                                                      |

---

## Verification Steps

1. Unit test `assertPublicCloudAiAllowed()` with allowed landing and chef-public tasks.
2. Unit test blocks for email, phone, address, currency, dietary, allergy, event, quote, payment, ledger, contract, recipe generation, and authenticated context.
3. Verify `/api/remy/landing` still rate-limits before provider calls (`app/api/remy/landing/route.ts:69-82`).
4. Verify `/api/remy/landing` still runs existing guardrails before provider calls (`app/api/remy/landing/route.ts:95-153`).
5. Verify `/api/remy/public` still rate-limits and validates tenant input before public context loading (`app/api/remy/public/route.ts:89-125`).
6. Verify `/api/remy/public` does not call the gateway unless the chef profile/context fields are public.
7. Verify the public widget still parses the same SSE shape with no frontend protocol change (`components/public/remy-concierge-widget.tsx:130-149`).
8. Verify no raw prompt or response text is written to server logs by the new audit helper.
9. Search changed files for em dashes.
10. Search changed files for public "no third-party AI" claims that would become false.
11. Verify private routes and `parseWithOllama()` have no imports from `public-cloud-gateway.ts`.

---

## Out of Scope

- No changes to private ChefFlow AI routing.
- No cloud fallback for authenticated Remy, structured parsing, recipes, finance, events, client portal, staff, CRM, or ledger workflows.
- No database migrations.
- No public chat transcript persistence.
- No provider key rotation pool.
- No provider-specific legal rewrite beyond the product disclosure required by this gateway.

---

## Notes for Builder Agent

- Build the policy guard first. The provider adapter must be unreachable until the guard passes.
- Keep deterministic instant answers ahead of the model call. The current public routes already have fast paths (`app/api/remy/landing/route.ts:169-179`, `app/api/remy/public/route.ts:201-216`).
- Use a short timeout. Public chat must feel instant, but timeout failure is better than a hung widget.
- The public gateway must be dependency-inverted enough that the provider can change without touching route policy.
- "Free" is an operating preference, not a safety property. Quotas, monitoring, and provider terms are mandatory.
- Do not weaken existing recipe blocks. The gateway should make recipe generation harder to reach, not easier.

---

## Current-State Summary

- `parseWithOllama()` is the shared structured parser and explicitly says there is no Gemini fallback and that unavailable runtime raises `OllamaOfflineError` (`lib/ai/parse-ollama.ts:1-4`, `lib/ai/parse-ollama.ts:160-168`, `lib/ai/parse-ollama.ts:301-417`).
- The dispatch governance doc says runtime failure must not silently switch to an unrelated provider (`docs/ai-model-governance.md:134-139`).
- The provider config exposes only the `ollama` provider type today (`lib/ai/providers.ts:9-18`).
- The landing public Remy route is unauthenticated, rate-limited, validates request bodies, blocks harmful content, blocks recipe generation, checks runtime availability, and streams from the configured Ollama-compatible runtime (`app/api/remy/landing/route.ts:1-5`, `app/api/remy/landing/route.ts:69-82`, `app/api/remy/landing/route.ts:84-164`, `app/api/remy/landing/route.ts:181-247`).
- The chef-public Remy route is also unauthenticated and rate-limited, but it accepts a browser-supplied tenant ID and loads public context with an admin client (`app/api/remy/public/route.ts:1-4`, `app/api/remy/public/route.ts:89-125`, `lib/ai/remy-public-context.ts:27-44`).
- The public context loader intentionally limits selected chef fields and culinary-profile keys, then adds a grounding rule against fabrication (`lib/ai/remy-public-context.ts:30-44`, `lib/ai/remy-public-context.ts:55-69`, `lib/ai/remy-public-context.ts:141-144`).
- Existing privacy narrative copy says AI is not sent to third-party AI services, which would be false for public surfaces using this new gateway unless mode-specific copy is added (`lib/ai/privacy-narrative.ts:7-14`, `lib/ai/privacy-narrative.ts:26-39`).

---

## Spec Validation

### 1. What exists today that this touches?

It touches public Remy API routes, public Remy widgets, AI runtime policy, provider configuration, and AI privacy copy. Evidence: `app/api/remy/landing/route.ts:1-5`, `app/api/remy/public/route.ts:1-4`, `components/public/remy-concierge-widget.tsx:105-158`, `components/public/remy-concierge-section.tsx:73-134`, `lib/ai/providers.ts:9-18`, `docs/ai-model-governance.md:134-139`, `lib/ai/privacy-narrative.ts:26-39`.

### 2. What exactly changes?

Add a public-only gateway, policy guard, audit helper, unit tests, policy docs, route wiring for eligible public surfaces, and mode-specific public disclosure copy. No DB changes and no private runtime changes.

### 3. What assumptions are you making?

- **Verified:** Public routes already validate, rate-limit, and block recipe generation before model calls (`app/api/remy/landing/route.ts:69-153`, `app/api/remy/public/route.ts:95-186`).
- **Verified:** Public widgets consume a narrow SSE event grammar that can be preserved (`components/public/remy-concierge-widget.tsx:130-149`, `components/public/remy-concierge-section.tsx:98-123`).
- **Verified:** Existing privacy copy would become false if reused unchanged on public cloud-model surfaces (`lib/ai/privacy-narrative.ts:26-39`).
- **Unverified:** Exact free model provider, terms, quota, latency, and monitoring interface. This remains a provider-selection prerequisite.

### 4. Where will this most likely break?

- Policy leakage if a builder imports the public gateway into private routes or shared `parseWithOllama()` code.
- Disclosure drift because current copy centrally says no third-party AI (`lib/ai/privacy-narrative.ts:26-39`).
- Tenant-public leakage because `/api/remy/public` accepts `tenantId` from an unauthenticated body and loads data via admin client (`app/api/remy/public/route.ts:116-125`, `lib/ai/remy-public-context.ts:27-44`).

### 5. What is underspecified?

The exact provider is not selected. The spec resolves the product architecture but requires provider terms and quota validation before build. The tenant-public eligibility rule also needs implementation detail because current public context loading does not prove profile publication status.

### 6. What dependencies or prerequisites exist?

- Provider terms must prohibit training or retention that conflicts with ChefFlow's public disclosure.
- Provider must support streaming or an adapter must simulate the existing SSE token flow.
- Env config must include enabled flag, provider, API key, model, timeout, request cap, and quota cap.
- No migration is required.

### 7. What existing logic could this conflict with?

It conflicts with strict single-provider readings in `parseWithOllama()` comments and governance docs unless the policy exception is documented (`lib/ai/parse-ollama.ts:1-4`, `docs/ai-model-governance.md:134-139`). It conflicts with static privacy narrative text unless public-mode copy is added (`lib/ai/privacy-narrative.ts:26-39`).

### 8. What is the end-to-end data flow?

Public visitor message -> existing public component -> existing public Remy route -> request validation -> rate limit -> guardrails -> deterministic instant answer check -> public gateway policy guard -> cloud provider stream -> existing SSE `token/error/done` events -> existing UI message rendering.

### 9. What is the correct implementation order?

1. Add policy docs amendment.
2. Add `public-cloud-policy.ts` and tests.
3. Add `public-cloud-audit.ts`.
4. Add provider adapter behind the policy guard.
5. Wire `/api/remy/landing`.
6. Add public-profile eligibility check, then wire `/api/remy/public`.
7. Update disclosure copy only on surfaces actually using the gateway.
8. Verify no private imports and no raw content logging.

### 10. What are the exact success criteria?

- Public landing chat can respond through the monitored cloud gateway when enabled.
- Public chat still fails closed on private signals and recipe-generation requests.
- Private AI routes and `parseWithOllama()` cannot import or fallback to the public gateway.
- Public disclosure no longer claims no third-party AI on gateway-backed surfaces.
- Existing public SSE client parsing remains unchanged.

### 11. What are the non-negotiable constraints?

No private data. No authenticated context. No recipe generation. No private runtime fallback. No raw prompt or response persistence. No arbitrary prompt passthrough. No provider whose terms allow use of prompts for training in a way that contradicts disclosure.

### 12. What should NOT be touched?

Do not modify database schema, ledger logic, event FSM, private Remy routes except for negative import tests if needed, recipe flows, `types/database.ts`, or private AI runtime behavior.

### 13. Is this the simplest complete version?

Yes. The simplest complete version is a separate, allowlisted public gateway plus policy amendment. Reusing the private runtime fallback machinery would be simpler in lines of code but worse architecturally because it would blur the privacy boundary.

### 14. If implemented exactly as written, what would still be wrong?

The provider decision would still need operational approval. A free provider can disappear, throttle, change terms, or add retention behavior. The product should treat "free" as optional cost optimization behind monitoring, not as a durable production guarantee.

### Final Check

This spec is not implementation-ready until the developer approves the policy exception and the provider terms are reviewed. The architecture is production-appropriate once those two approvals exist.
