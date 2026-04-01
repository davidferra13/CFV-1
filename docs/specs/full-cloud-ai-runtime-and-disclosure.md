# Spec: Full Cloud AI Runtime and Truthful Disclosure

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Supersedes:** `docs/specs/remy-hybrid-cloud-routing.md`
> **Research:** `docs/research/full-cloud-ai-runtime-and-disclosure.md`

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-03-31 21:15 | Planner       |        |
| Status: ready | 2026-03-31 21:15 | Planner       |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer said the current system is still unacceptable because anything tied to their own hardware is slow, annoying, and not good enough. They want everything running in the cloud, not partly local and partly cloud. They explicitly said they no longer want privacy architecture to dictate performance decisions.

They also asked for a spec that addresses how the website talks about privacy. The useful signal under that rant is that the current local-only privacy story is no longer compatible with the product direction. The website, onboarding, settings, and trust copy all need to be rewritten so they describe the actual cloud architecture instead of the old local-only story.

### Developer Intent

- **Core goal:** Remove local-hardware dependency from all user-facing AI runtime paths and make cloud execution the default architecture.
- **Key constraints:** Do not leave hidden local-only paths, hardcoded localhost health checks, or "start Ollama" UX behind in production paths. Do not leave user-facing copy claiming local-only/private-infrastructure/browser-only behavior if the runtime is cloud.
- **Motivation:** Local AI on the developer's machine is too slow to be a viable product and creates an unacceptable user experience.
- **Success from the developer's perspective:** No normal user-facing AI feature depends on local hardware, the product feels fast, and the website's trust/privacy language matches the actual cloud-first system.

---

## What This Does (Plain English)

This spec moves every current Ollama-backed user-facing AI workflow to a cloud-hosted Ollama-compatible runtime, while leaving existing Gemini cloud features as cloud. It removes hardcoded localhost assumptions, local-only error flows, and UI copy that tells people AI runs on private local infrastructure or that their data never leaves their machine. After this is built, ChefFlow is cloud-first for AI runtime, and the website explains that truthfully.

---

## Why It Matters

The current runtime is split between existing cloud Gemini features and a large set of Ollama-backed features that still assume a local machine at `localhost:11434` (`lib/ai/providers.ts:20-26`, `lib/ai/parse-ollama.ts:81-99`, `lib/ai/llm-router.ts:1-6`, `app/api/remy/client/route.ts:144-188`, `app/api/remy/stream/route.ts:163-179`). That architecture is the root cause of the slow experience and the misleading local-only trust copy spread across the site (`app/(chef)/settings/ai-privacy/page.tsx:145-171`, `components/ai-privacy/remy-onboarding-wizard.tsx:155-163`, `app/(public)/for-operators/page.tsx:45-47`, `docs/remy-complete-reference.md:10`).

---

## Locked Decisions

- Production uses one remote Ollama-compatible cloud runtime as the primary endpoint for all current former-Ollama user-facing AI traffic. Do not keep a hybrid production split where some former-Ollama lanes still depend on local hardware.
- Existing Gemini-native features stay on Gemini. Do not force them through the remote Ollama-compatible runtime just for naming consistency.
- Production has no silent or automatic local fallback. If the cloud runtime is down or misconfigured, the product must fail clearly with provider-agnostic AI-unavailable messaging and operator alerts.
- Local Ollama remains allowed only as an explicit non-production debug override through runtime policy. It is not a supported production dependency and must never activate by accident in production.
- The baseline disclosure meaning is locked. Every user-facing trust surface must communicate the equivalent of: "ChefFlow uses cloud AI processing for AI features. Inputs and outputs may be processed by secure third-party AI infrastructure. Product surfaces must not promise local-only, browser-only, or no-third-party-AI handling unless that is still literally true."
- Rollout is not complete until local Ollama can be fully stopped and the verification sweep still passes across former-Ollama features and disclosure surfaces.

---

## Files to Create

| File                                             | Purpose                                                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/runtime-provider-policy.ts`              | Single source of truth for runtime AI mode: cloud-first in production, optional local override only for development/debug. |
| `components/ai-privacy/ai-processing-notice.tsx` | Shared disclosure component so cloud-processing/trust language is centralized instead of duplicated across pages.          |

---

## Files to Modify

| File                                                  | What to Change                                                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/providers.ts`                                 | Stop presenting Ollama as implicitly local. Make base URL/model config production-cloud-first and document local use as dev-only override.            |
| `lib/ai/parse-ollama.ts`                              | Remove local-only/privacy-first assumptions and treat `parseWithOllama()` as an Ollama-compatible cloud parser unless a dev-local override is active. |
| `lib/ai/ollama-errors.ts`                             | Replace "start Ollama/local AI offline" UX text with provider-agnostic cloud-runtime failure messaging.                                               |
| `lib/ai/llm-router.ts`                                | Replace PC-only routing with primary cloud endpoint routing; do not describe runtime as `localhost:11434`-only.                                       |
| `lib/ai/ollama-wake.ts`                               | Fence to local dev-only or retire from production paths. Remove "restart Ollama on PC" assumptions from the runtime path.                             |
| `app/api/remy/landing/route.ts`                       | Keep endpoint contract, but treat Ollama host as remote cloud by default.                                                                             |
| `app/api/remy/public/route.ts`                        | Keep endpoint contract, but treat Ollama host as remote cloud by default.                                                                             |
| `app/api/remy/client/route.ts`                        | Remove hardcoded localhost health check and "start Ollama" user messaging. Use runtime provider policy instead.                                       |
| `app/api/remy/stream/route.ts`                        | Remove hardcoded localhost health check and PC-only routing assumptions. Use runtime provider policy instead.                                         |
| `app/api/remy/warmup/route.ts`                        | Convert to cloud preflight/ping or retire if remote warmup is unnecessary. It must not imply local model loading on the chef's machine.               |
| `app/api/ollama-status/route.ts`                      | Treat this as runtime-provider status for a remote Ollama-compatible host, or rename internally while keeping external callers working.               |
| `lib/ai/receipt-ocr.ts`                               | Remove `http://localhost:11434` fallback and local-only copy.                                                                                         |
| `lib/ai/remy-vision-actions.ts`                       | Remove local endpoint list/fallbacks and local-only comments.                                                                                         |
| `lib/email/developer-alerts.ts`                       | Stop pinging `localhost:11434` directly for alerts in production assumptions.                                                                         |
| `components/ai/remy-drawer.tsx`                       | Replace browser/local AI trust copy and slow-local footer copy with accurate cloud-runtime messaging.                                                 |
| `components/ai/remy-hub-dashboard.tsx`                | Replace "private infrastructure" active-state copy.                                                                                                   |
| `components/ai-privacy/remy-onboarding-wizard.tsx`    | Replace local/browser-only trust language with accurate cloud-processing disclosure.                                                                  |
| `components/ai-privacy/data-flow-schematic.tsx`       | Replace local-only/private-server diagram with cloud-processing diagram.                                                                              |
| `app/(chef)/settings/ai-privacy/page.tsx`             | Rewrite the full page so it no longer claims local-only processing, browser-only conversations, or no server-side storage.                            |
| `app/(public)/for-operators/page.tsx`                 | Replace "runs locally / data never leaves your computer" marketing copy.                                                                              |
| `app/(chef)/prospecting/page.tsx`                     | Remove "Requires Ollama" and "your data never leaves your machine" operator copy.                                                                     |
| `app/(chef)/recipes/import/import-hub-client.tsx`     | Remove `Requires Ollama` wording from availability text.                                                                                              |
| `components/communication/auto-response-settings.tsx` | Replace "uses local AI, data stays on your machine" wording.                                                                                          |
| `components/ai/ai-source-badge.tsx`                   | Replace "local AI (Ollama)" badge tooltip with provider-agnostic or cloud-accurate language.                                                          |
| `docs/remy-complete-reference.md`                     | Rewrite the top-level architecture and storage/data-flow sections.                                                                                    |
| `docs/ai-model-governance.md`                         | Replace local-only/privacy-gate language and stale dispatch references with the actual cloud-first runtime model.                                     |
| `docs/chefflow-product-definition.md`                 | Remove local-PC/localhost assumptions in product docs.                                                                                                |
| `docs/chefflow-system-manual.md`                      | Remove "Ollama runs on localhost:11434" operational assumptions from the system manual.                                                               |

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

- No DB migration is required for this spec.
- This spec is runtime and disclosure work only.

---

## Data Model

No persistence model changes are required. The key change is the runtime-provider model.

### Runtime Entities

- `RuntimeProviderPolicy`
  - `mode: 'cloud' | 'local-dev'`
  - `primaryProvider: 'ollama-compatible-cloud' | 'gemini'`
  - `allowLocalDevOverride: boolean`
  - `isProductionCloudRequired: boolean`
- `AiProcessingDisclosure`
  - `headline`
  - `summary`
  - `conversationHandling`
  - `storageHandling`
  - `supportSharingHandling`

### Constraints

- Production runtime defaults to cloud for all former Ollama-backed features.
- Production former-Ollama traffic uses one cloud primary instead of a route-by-route local/cloud split.
- Existing Gemini features stay cloud and are not migrated just for naming consistency.
- Any local Ollama usage that remains must be explicitly fenced to development/debug mode, not normal user traffic.
- There is no production local fallback. If cloud runtime is unavailable, the system fails clearly and alerts instead of silently using someone's machine.
- User-facing disclosure text must match actual runtime behavior. No "local-only," "private infrastructure only," "browser-only," or "data never leaves your machine" claim may remain unless it is still literally true in that surface.

---

## Server Actions

| Action / Surface                                              | Auth              | Input    | Output                                                                        | Side Effects                                                                        |
| ------------------------------------------------------------- | ----------------- | -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `getRuntimeProviderPolicy()`                                  | none              | none     | `{ mode, primaryProvider, allowLocalDevOverride, isProductionCloudRequired }` | None                                                                                |
| `parseWithOllama(systemPrompt, userContent, schema, options)` | existing          | existing | existing parsed result                                                        | Same call signature; runtime target changes from local to cloud-compatible endpoint |
| `routeForRemy()`                                              | existing          | existing | `{ host, model, endpointName }`                                               | Must resolve cloud primary in production                                            |
| `GET /api/ollama-status`                                      | none              | none     | provider health payload                                                       | Reports cloud-runtime health, not local-machine presence                            |
| `POST /api/remy/landing`                                      | none              | existing | existing SSE                                                                  | Must no longer depend on local machine availability                                 |
| `POST /api/remy/public`                                       | none              | existing | existing SSE                                                                  | Must no longer depend on local machine availability                                 |
| `POST /api/remy/client`                                       | `requireClient()` | existing | existing SSE                                                                  | Uses cloud runtime by default; no localhost preflight                               |
| `POST /api/remy/stream`                                       | `requireChef()`   | existing | existing SSE                                                                  | Uses cloud runtime by default; no localhost preflight                               |

Implementation rule:

- Preserve the existing API contracts and call signatures where possible. The fastest safe implementation is to change runtime resolution centrally rather than rewrite every feature API.
- Do not add a new production "smart fallback" that silently switches back to local hardware. That would recreate the current failure mode in a less visible form.

---

## UI / Component Spec

### Page Layout

The pages and components do not need structural redesign. What changes is the trust/disclosure content embedded in them.

- Replace local-only/private-only trust cards with accurate "cloud AI processing" explanation.
- Replace local/browser-only diagrams with a cloud-processing diagram.
- Replace any "Requires Ollama" or "start Ollama" instructional text with provider-agnostic availability or maintenance text.

### States

- **Loading:** unchanged unless a component currently waits specifically for local warmup.
- **Empty:** unchanged.
- **Error:** never tell the user to start a local Ollama process for production runtime paths.
- **Populated:** unchanged functionally, but local-only trust badges/tooltips must be rewritten.

### Interactions

- Remy UI contracts stay the same: widgets still stream, drawers still open, buttons still trigger the same routes.
- The trust/disclosure surfaces should all reuse the new shared disclosure component or shared disclosure copy source instead of duplicating strings.
- Settings/onboarding screens must explain real behavior, not reassure through false locality claims.
- The canonical baseline disclosure meaning is: cloud AI processing is used for AI features, secure third-party AI infrastructure may process inputs/outputs, and local-only/browser-only/no-third-party-AI promises are not allowed unless still literally true.

---

## Edge Cases and Error Handling

| Scenario                                                  | Correct Behavior                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cloud Ollama-compatible host is down                      | User sees AI-unavailable messaging; no "start Ollama" instruction in production paths.                 |
| `OLLAMA_BASE_URL` still points to localhost in production | Hard fail startup/health checks or report misconfiguration loudly; do not silently ship local runtime. |
| Dev wants local testing                                   | Allowed only behind explicit dev-only override; never the default production path.                     |
| Builder tries to add production local fallback            | Reject that design. Production fallback to a local machine is explicitly out of spec.                  |
| Existing Gemini feature is already cloud                  | Leave it cloud; do not force it through remote Ollama just for uniformity.                             |
| User-facing copy still says local-only after rollout      | Treat as a bug. This spec requires a disclosure sweep, not just a runtime change.                      |
| Monitoring/alerts still ping localhost                    | Treat as incomplete implementation. Production monitoring must watch the cloud runtime.                |

---

## Verification Steps

1. Point production-style config at a remote Ollama-compatible host. Do not run local Ollama.
2. Verify `parseWithOllama()` consumers still work against the remote host without per-feature local startup.
3. Verify all Remy lanes work without local Ollama:
   - `/api/remy/landing`
   - `/api/remy/public`
   - `/api/remy/client`
   - `/api/remy/stream`
4. Verify representative non-Remy former-Ollama features work without local Ollama:
   - receipt OCR
   - recipe text import / brain dump
   - prospecting scrub AI
   - auto-response personalization
5. Verify no production-facing error asks the user to "start Ollama."
6. Verify no user-facing page/component still claims:
   - AI runs locally
   - conversations stay only in the browser
   - data never leaves the machine
   - no third-party AI
7. Verify `GET /api/ollama-status` reports remote-provider health, not local daemon presence.
8. Verify cloud runtime latency is materially lower than the prior local flow for the same Remy paths.
9. Verify local Ollama can remain fully off during the whole production-style verification sweep.
10. Verify production config cannot silently fall back to local runtime when the remote provider is unhealthy or missing.

---

## Out of Scope

- No database redesign.
- No attempt to hide or downplay cloud processing from users.
- No legal rewrite of the entire public privacy policy beyond product-specific AI/runtime claims; broader legal review can follow separately.
- No rename sweep of every internal `Ollama` identifier purely for aesthetics if the runtime behavior is correct.

---

## Notes for Builder Agent

- The simplest complete implementation is not a new multi-provider routing empire. It is:
  1. make the primary Ollama runtime remote,
  2. remove hardcoded localhost assumptions,
  3. leave existing Gemini cloud features alone,
  4. rewrite the trust/disclosure copy truthfully.
- Keep the production former-Ollama runtime single-homed to one remote Ollama-compatible provider. Do not build route-level hybrid production routing back into the system.
- Do not add local production fallback. Local is for explicit non-production debugging only.
- Do not build this as "delete the privacy text." Build it as "replace false local-only claims with accurate cloud-processing claims."
- Do not leave production paths that tell users to start a local daemon.
- Centralize disclosure copy so the site does not drift again.
- The baseline disclosure copy meaning is locked in this spec; individual surfaces can shorten it, but they cannot contradict it.
- The earlier hybrid Remy-only spec is superseded by this full-cloud spec.

---

## Spec Validation

### 1. What exists today that this touches?

- Central runtime config still defaults Ollama to localhost and presents it as local (`lib/ai/providers.ts:11-26`).
- Central structured parser is explicitly local-only/privacy-first and throws "never Gemini / start Ollama" style errors (`lib/ai/parse-ollama.ts:1-4`, `lib/ai/parse-ollama.ts:81-99`, `lib/ai/parse-ollama.ts:124-126`).
- Remy routes already mostly honor `getOllamaConfig()`, but client and chef routes still hardcode `http://localhost:11434/api/tags` health checks (`app/api/remy/landing/route.ts:109-133`, `app/api/remy/public/route.ts:145-170`, `app/api/remy/client/route.ts:144-188`, `app/api/remy/stream/route.ts:163-179`, `app/api/remy/stream/route.ts:978-1040`).
- The Remy router still assumes a single PC endpoint at localhost (`lib/ai/llm-router.ts:1-6`, `lib/ai/llm-router.ts:76-96`).
- Additional direct-local paths exist outside Remy, including receipt OCR and Remy vision (`lib/ai/receipt-ocr.ts:1-5`, `lib/ai/receipt-ocr.ts:17`, `lib/ai/receipt-ocr.ts:50-55`, `lib/ai/remy-vision-actions.ts:3-15`, `lib/ai/remy-vision-actions.ts:17-27`).
- User-facing trust/disclosure copy currently claims local/private/browser-only behavior in settings, onboarding, diagrams, dashboard, drawer, operator marketing, prospecting, imports, auto-response settings, and badges (`app/(chef)/settings/ai-privacy/page.tsx:145-171`, `app/(chef)/settings/ai-privacy/page.tsx:246-248`, `components/ai-privacy/remy-onboarding-wizard.tsx:155-163`, `components/ai-privacy/remy-onboarding-wizard.tsx:195-197`, `components/ai-privacy/remy-onboarding-wizard.tsx:339-340`, `components/ai-privacy/data-flow-schematic.tsx:41`, `components/ai-privacy/data-flow-schematic.tsx:142-145`, `components/ai-privacy/data-flow-schematic.tsx:272-274`, `components/ai/remy-hub-dashboard.tsx:206-208`, `components/ai/remy-drawer.tsx:1031-1034`, `components/ai/remy-drawer.tsx:1407-1409`, `app/(public)/for-operators/page.tsx:45-47`, `app/(chef)/prospecting/page.tsx:295-299`, `app/(chef)/recipes/import/import-hub-client.tsx:68-79`, `components/communication/auto-response-settings.tsx:102-104`, `components/ai/ai-source-badge.tsx:24-31`).
- Reference docs also still describe Remy as local-only/browser-only and runtime Ollama as localhost (`docs/remy-complete-reference.md:10`, `docs/remy-complete-reference.md:591-599`, `docs/ai-model-governance.md:15`, `docs/ai-model-governance.md:34`, `docs/ai-model-governance.md:41-45`, `docs/chefflow-product-definition.md:3285`, `docs/chefflow-product-definition.md:3404`, `docs/chefflow-system-manual.md:1191`).

### 2. What exactly changes?

- Runtime changes:
  - cloud-first provider policy
  - remote Ollama-compatible host becomes primary runtime for all former Ollama-backed features
  - remove hardcoded localhost health checks and local-daemon assumptions
- Disclosure changes:
  - replace all local-only/private-only/browser-only trust copy with accurate cloud-processing language
  - replace diagrams and onboarding copy, not just settings-page copy
- Monitoring/ops changes:
  - status routes, alerts, and wake/restart flows must no longer assume a local daemon as the production dependency (`app/api/ollama-status/route.ts:1-30`, `lib/email/developer-alerts.ts:180-188`, `lib/ai/ollama-wake.ts:1-5`, `lib/ai/ollama-wake.ts:307-315`).

### 3. What assumptions are you making?

- **Verified:** Most former-Ollama features already route through shared config or `parseWithOllama`, so a central remote-host change reaches a large percentage of the system (`lib/ai/providers.ts:11-26`, `lib/ai/parse-ollama.ts:91-126`, `app/api/remy/landing/route.ts:109-111`, `app/api/remy/public/route.ts:145-147`).
- **Verified:** Some production paths still hardcode localhost and must be explicitly cleaned up (`app/api/remy/client/route.ts:146-160`, `app/api/remy/stream/route.ts:165-176`, `lib/ai/receipt-ocr.ts:17`, `lib/ai/remy-vision-actions.ts:12-15`, `lib/email/developer-alerts.ts:184-185`).
- **Verified:** The website currently makes many claims that would become false under a full-cloud rollout (`app/(chef)/settings/ai-privacy/page.tsx:145-171`, `components/ai-privacy/remy-onboarding-wizard.tsx:155-163`, `app/(public)/for-operators/page.tsx:45-47`, `docs/remy-complete-reference.md:10`).
- **Unverified:** Exact cloud provider choice, throughput, and cost envelope for the new primary Ollama-compatible host. The codebase does not encode that deployment decision today.
- **Decision now locked despite vendor uncertainty:** the production architecture is one remote Ollama-compatible primary with no production local fallback. Vendor/account selection is operational, not a reason to reopen the architecture.

### 4. Where will this most likely break?

- Hardcoded localhost checks are the highest risk because they will silently keep some routes and tools tied to local hardware even after central config is changed (`app/api/remy/client/route.ts:146-160`, `app/api/remy/stream/route.ts:165-176`, `lib/ai/receipt-ocr.ts:17`, `lib/email/developer-alerts.ts:184-185`).
- User trust copy is the next risk because there are many duplicated local-only statements, not one single page (`components/ai-privacy/remy-onboarding-wizard.tsx:155-163`, `components/ai-privacy/data-flow-schematic.tsx:41`, `components/ai/remy-drawer.tsx:1407-1409`, `app/(public)/for-operators/page.tsx:45-47`).
- Monitoring/ops flows are third because they still assume local restart semantics (`lib/ai/ollama-errors.ts:15-18`, `lib/ai/ollama-errors.ts:52-69`, `lib/ai/ollama-wake.ts:307-315`, `docs/incident-response.md:109`).

### 5. What is underspecified?

- The exact wording of the new cloud-processing disclosure is underspecified today; this spec resolves that by requiring a shared disclosure source/component.
- The production-vs-dev local override policy is underspecified today; this spec resolves that by requiring a runtime policy file with explicit dev-only local override.
- The exact list of disclosure surfaces is easy to miss if a builder only updates the settings page; this spec resolves that by enumerating the known current copy surfaces.

### 6. What dependencies or prerequisites exist?

- A production-ready remote Ollama-compatible host and credentials are required for former-Ollama features.
- Production credentials/config must support a single remote primary for former-Ollama traffic and must not enable automatic local fallback.
- Existing Gemini cloud features remain in place and are not prerequisites beyond current config.
- No database migration is needed.
- A copy review is required across product trust surfaces before rollout because current claims would be false after the runtime change (`app/(chef)/settings/ai-privacy/page.tsx:145-171`, `components/ai-privacy/remy-onboarding-wizard.tsx:155-163`, `app/(public)/for-operators/page.tsx:45-47`).

### 7. What existing logic could this conflict with?

- Existing privacy/local-only comments and policy docs conflict directly with the requested architecture (`lib/ai/parse-ollama.ts:1-4`, `docs/ai-model-governance.md:15`, `docs/chefflow-product-definition.md:3404`).
- Existing "start Ollama" UX conflicts with cloud-first runtime (`lib/ai/ollama-errors.ts:15-18`, `app/api/remy/client/route.ts:152`, `app/api/remy/stream/route.ts:170`).
- Existing monitoring and wake utilities conflict with the new production dependency model (`app/api/ollama-status/route.ts:12-21`, `lib/email/developer-alerts.ts:180-188`, `lib/ai/ollama-wake.ts:1-5`).

### 8. What is the end-to-end data flow?

- **Former-Ollama structured workflows:** user action -> feature server action -> `parseWithOllama()` -> remote Ollama-compatible cloud host -> parsed JSON result -> normal DB/UI follow-through (`lib/ai/parse-ollama.ts:91-126`).
- **Remy flows:** user message -> Remy API route -> shared provider config / router -> remote Ollama-compatible host -> streamed response -> existing UI render and persistence hooks (`app/api/remy/landing/route.ts:109-133`, `app/api/remy/public/route.ts:145-170`, `app/api/remy/client/route.ts:186-200`, `app/api/remy/stream/route.ts:978-1090`).
- **Existing Gemini flows:** remain cloud as-is and are not rerouted through the former-Ollama path (`lib/ai/parse.ts:2-7`, `lib/ai/parse.ts:40-61`).

### 9. What is the correct implementation order?

1. Add runtime provider policy file.
2. Make `providers.ts` and `parse-ollama.ts` cloud-first.
3. Remove hardcoded localhost checks from Remy and other direct-local modules.
4. Update status/monitoring/wake/error flows.
5. Replace user-facing disclosure copy and diagrams with shared cloud-processing disclosure.
6. Verify representative AI features without local Ollama running.
7. Sweep docs/reference material last so builders have the final architecture recorded accurately.

### 10. What are the exact success criteria?

- No normal user-facing AI feature requires local Ollama to be running.
- Former-Ollama production traffic has one remote primary and no production local fallback path.
- No production-facing error tells the user to start Ollama.
- No user-facing trust surface still claims local-only/private-infrastructure/browser-only behavior if it is no longer true.
- `parseWithOllama()` consumers still work through the new remote runtime without mass call-site rewrites.
- Remy latency is materially improved versus the old local path.

### 11. What are the non-negotiable constraints?

- Cloud-first runtime in production.
- One remote Ollama-compatible primary for former-Ollama production traffic.
- No production local fallback.
- Truthful disclosure. Do not hide cloud processing by deleting warnings or keeping false local-only copy.
- Existing Gemini cloud features stay cloud; do not regress them.
- No local-daemon dependency in standard user traffic.

### 12. What should NOT be touched?

- No DB schema changes.
- No broad legal-policy rewrite outside product AI/runtime claims unless separately requested.
- No unnecessary rename pass of every `Ollama` identifier if behavior is correct and docs are updated.

### 13. Is this the simplest complete version?

Yes. The simplest complete version is not "invent a whole new routing platform." It is "make the existing shared Ollama runtime remote, remove localhost assumptions, and update all disclosure copy to match." The code already centralizes many calls through `providers.ts` and `parseWithOllama()` (`lib/ai/providers.ts:11-26`, `lib/ai/parse-ollama.ts:91-126`), so a central cloud-first pivot is simpler than rewriting every feature around a new SDK.

### 14. If implemented exactly as written, what would still be wrong?

- There would still be a follow-up cleanup opportunity to rename internal "Ollama/local" terminology that remains only for backward-compatible API naming.
- Broader legal/privacy-policy review could still be needed if there are non-product documents outside this spec's enumerated surfaces that describe local-only AI behavior.
- Cost control, rate limiting, and provider redundancy would still need operational follow-up once the new cloud runtime is live, but they are not reasons to retain local production fallback.

### Final Check

This spec is production-ready for the requested direction: full cloud AI runtime plus truthful website/disclosure updates.

The only remaining uncertainty is provider operations, not product direction. Specifically:

- exact remote Ollama-compatible vendor/account setup,
- throughput/cost under real traffic,
- whether broader legal/privacy policy text outside the touched product surfaces also needs review.

Those do not block the builder from implementing this spec correctly. They do block pretending the rollout is "done" before runtime and disclosure verification are both complete.
