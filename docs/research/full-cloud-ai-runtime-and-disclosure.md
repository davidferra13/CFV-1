# Research: Full Cloud AI Runtime and Disclosure

> **Date:** 2026-03-31
> **Question:** After the developer clarified that all runtime AI should move to cloud, what is the simplest correct architecture and what existing product/disclosure surfaces become incorrect?
> **Status:** complete

## Origin Context

### Raw Signal

The developer said the earlier hybrid plan was still not acceptable. They said everything should run on cloud because anything tied to their own hardware will be slow, annoying, and unacceptable. They also said the website's current privacy and locality story needs to be addressed because it no longer matches the desired architecture.

The useful signal is not "hide privacy." The useful signal is that the local-only trust story is incompatible with the new product direction. If the runtime becomes cloud-first, the website, onboarding, settings, and trust messaging must stop claiming local-only, browser-only, or machine-only processing.

### Developer Intent

- Make cloud the default runtime for all current local Ollama-backed user-facing AI paths.
- Do not leave pieces of the product secretly depending on a local daemon.
- Do not leave marketing, onboarding, or settings copy describing the old local-only architecture.
- Give the builder one canonical architecture, not competing hybrid and full-cloud plans.

## Summary

The simplest correct full-cloud move is not a brand-new routing platform. It is to make the existing shared Ollama runtime remote by default, remove the remaining hardcoded localhost assumptions, leave existing Gemini cloud features alone, and rewrite all product copy that still claims local-only or browser-only AI handling.

This is a broader change than the earlier Remy-only hybrid proposal because the repo has many non-Remy `parseWithOllama()` consumers and several direct `localhost:11434` dependencies. A builder following only the old hybrid research would undershoot the real scope.

## Detailed Findings

### 1. A central cloud pivot is feasible because the runtime is already partially centralized

The shared Ollama config lives in `lib/ai/providers.ts`, which still defaults to `http://localhost:11434` and tier-based model resolution (`lib/ai/providers.ts:11-26`, `lib/ai/providers.ts:42-60`). The main structured parsing path is `parseWithOllama()`, which reads the shared config, builds a single Ollama client, and is used as the common runtime path for many AI features (`lib/ai/parse-ollama.ts:91-126`).

That means a remote Ollama-compatible host can reach a large portion of the system through central config rather than per-feature rewrites. This is the main reason a full-cloud pivot is simpler than introducing a second routing stack.

### 2. The repo already has a cloud split, but it is inconsistent

Some cloud AI already exists in the live code. `lib/ai/parse.ts` is explicitly a Gemini-backed server parser and requires `GEMINI_API_KEY` (`lib/ai/parse.ts:2-7`, `lib/ai/parse.ts:40-61`). The repo therefore already supports cloud AI operationally.

At the same time, a large set of user-facing features still route through local Ollama assumptions. Examples include:

- Remy landing/public/client/chef routes (`app/api/remy/landing/route.ts:109-133`, `app/api/remy/public/route.ts:145-170`, `app/api/remy/client/route.ts:144-188`, `app/api/remy/stream/route.ts:163-179`, `app/api/remy/stream/route.ts:978-1040`)
- receipt OCR (`lib/ai/receipt-ocr.ts:1-5`, `lib/ai/receipt-ocr.ts:17`, `lib/ai/receipt-ocr.ts:50-55`)
- Remy vision actions (`lib/ai/remy-vision-actions.ts:3-15`, `lib/ai/remy-vision-actions.ts:17-27`)

The runtime strategy is therefore mixed today: some features are already cloud, while many others still assume the developer's local machine.

### 3. Hardcoded localhost assumptions are the real implementation trap

A builder who only changes `OLLAMA_BASE_URL` will miss several direct localhost dependencies.

Verified examples:

- Remy client preflight checks `http://localhost:11434/api/tags` directly (`app/api/remy/client/route.ts:144-160`)
- Remy chef stream preflight checks `http://localhost:11434/api/tags` directly (`app/api/remy/stream/route.ts:163-179`)
- receipt OCR hardcodes `process.env.OLLAMA_URL || 'http://localhost:11434'` (`lib/ai/receipt-ocr.ts:17`)
- Remy vision actions fall back across local endpoint literals (`lib/ai/remy-vision-actions.ts:12-15`)
- developer alerts still ping localhost directly (`lib/email/developer-alerts.ts:180-188`)

This is why the full-cloud spec has to cover more than just Remy route files.

### 4. Local-only trust/disclosure copy is widespread and would become false

The local-only story is duplicated across many product surfaces, not just one settings page.

Examples:

- AI privacy settings page says Remy runs on private AI infrastructure and conversation history lives in the browser (`app/(chef)/settings/ai-privacy/page.tsx:145-171`)
- the same page says Remy conversations are processed entirely on private infrastructure (`app/(chef)/settings/ai-privacy/page.tsx:246-248`)
- onboarding wizard says conversations are processed locally and never stored on servers (`components/ai-privacy/remy-onboarding-wizard.tsx:155-163`)
- onboarding wizard recap says "no third-party AI" and "Conversations stay in your browser" (`components/ai-privacy/remy-onboarding-wizard.tsx:339-340`)
- the data-flow schematic literally labels the flow as private infrastructure and browser-only storage (`components/ai-privacy/data-flow-schematic.tsx:41`, `components/ai-privacy/data-flow-schematic.tsx:142-145`, `components/ai-privacy/data-flow-schematic.tsx:272-274`)
- operator-facing marketing says Remy runs locally and data never leaves the computer (`app/(public)/for-operators/page.tsx:45-47`)
- Remy drawer says responses are slow because Remy runs on a private, local AI (`components/ai/remy-drawer.tsx:1407-1409`)
- auto-response settings say personalization uses local AI and data stays on the machine (`components/communication/auto-response-settings.tsx:102-104`)
- source badge tooltip says a result was enhanced by local AI (`components/ai/ai-source-badge.tsx:24-31`)
- Remy reference doc still says local Ollama only and browser IndexedDB only (`docs/remy-complete-reference.md:10`, `docs/remy-complete-reference.md:591-599`)

A full-cloud rollout without a disclosure sweep would leave the product visibly false in multiple places.

### 5. Monitoring and operator guidance also assume local runtime

The operational surfaces are not yet cloud-accurate either.

- `GET /api/ollama-status` reports whether Ollama is configured and whether the URL is remote, but the route still exists specifically to describe local Ollama availability and dashboard polling (`app/api/ollama-status/route.ts:1-21`)
- `lib/ai/ollama-errors.ts` still centers the user message around "Local AI is offline. Start Ollama to use this feature." (`lib/ai/ollama-errors.ts:15-18`, `lib/ai/ollama-errors.ts:52-69`)
- `lib/ai/ollama-wake.ts` is still written around waking/restarting a PC Ollama instance (`lib/ai/ollama-wake.ts:1-5`, `lib/ai/ollama-wake.ts:307-315`)

So the builder must update runtime operations, not only product-facing copy.

### 6. The old hybrid recommendation is no longer the right planning target

The earlier research report recommended a route-level split where only public Remy moved to cloud and client/chef stayed local (`docs/research/remy-cloud-routing-options.md:24-26`, `docs/research/remy-cloud-routing-options.md:138-147`, `docs/research/remy-cloud-routing-options.md:158-160`).

That was a reasonable answer to the earlier question, but it is not aligned with the current direction. The developer has now explicitly rejected hybrid as insufficient, and the current canonical spec supersedes that path (`docs/specs/full-cloud-ai-runtime-and-disclosure.md:1-7`, `docs/specs/full-cloud-ai-runtime-and-disclosure.md:238-246`, `docs/specs/remy-hybrid-cloud-routing.md:1-7`).

## Gaps and Unknowns

1. The exact remote Ollama-compatible vendor/account choice is not encoded in the repo.
2. Real cost and throughput under production load remain unverified.
3. There may be additional non-product documents outside the enumerated surfaces that still describe local-only AI behavior.
4. The repo does not prove whether the current Remy behavior depends on any fine-tuned model artifact beyond visible stock Qwen defaults.

## Recommendations

- **Needs a spec:** Use `docs/specs/full-cloud-ai-runtime-and-disclosure.md` as the canonical implementation plan.
- **Quick fix:** Mark the older hybrid research as superseded so builders do not follow the wrong architecture.
- **Locked architecture decision:** Use one remote Ollama-compatible cloud runtime as the production primary for all current former-Ollama user-facing AI traffic. Existing Gemini-native features stay on Gemini.
- **Locked fallback decision:** Do not allow silent or automatic production fallback to local hardware. Keep any local Ollama path behind an explicit non-production debug override only.
- **Locked disclosure decision:** Every user-facing trust surface should communicate the equivalent of: "ChefFlow uses cloud AI processing for AI features. Inputs and outputs may be processed by secure third-party AI infrastructure." Individual surfaces can shorten it, but they cannot claim local-only, browser-only, or no-third-party-AI handling unless literally true.
- **Locked rollout gate:** Do not call the rollout complete until former-Ollama features pass verification with local Ollama fully stopped and the disclosure sweep is finished.
- **Operational follow-up, not architecture debate:** The exact provider account, spend caps, alert thresholds, and redundancy posture still need to be chosen during implementation rollout, but they should not reopen the full-cloud direction.
