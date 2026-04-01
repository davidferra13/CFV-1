# Research: Remy Cloud Routing Options

> **Date:** 2026-03-31
> **Question:** How should Remy stop depending on the developer's local machine for non-private traffic without breaking the local-only privacy boundary for private client and chef conversations?
> **Status:** complete

## Origin Context

### Raw Signal

The developer said the public chatbot, authenticated user chatbot, and the rest of the AI experience are all tied directly to their computer's AI, and it is too slow to be usable. They described waits of roughly two minutes for a single task and said it does not even work for one person, let alone any real traffic. They want a respectable cloud-hosted or third-party AI for anything non-private so responses feel immediate and can happen concurrently.

They also said private work should still hand off to the local model on their computer. In their words, this needs to behave like a swarm: public-safe work should go fast in the cloud, while very private work should stay local. They emphasized that they intentionally trained the current model and that this change should feel like swapping the brain without losing behavior, quality, or domain fit.

### Developer Intent

- Move non-private Remy traffic off the developer's hardware immediately.
- Keep private client and chef lanes local-only unless a privacy-safe redaction architecture is built first.
- Preserve current Remy voice, prompt behavior, and domain quality as much as possible.
- Give the builder a precise implementation path instead of a vague "use cloud AI" instruction.

## Summary

The codebase already has the conceptual privacy split needed for a hybrid architecture, but live Remy traffic is still hardwired to local Ollama across public, client, and chef routes. The safest v1 is route-level hybrid routing: move only the public Remy lanes to a cloud endpoint, keep client and chef routes local-only, and make the split deterministic in code instead of trying to invent a message-by-message swarm inside already-private routes.

For the first implementation spec, the best fit is an Ollama-compatible cloud endpoint for public Remy because the current public routes already use the Ollama client and prompt shape. Gemini is the strongest fallback option if a remote Ollama-compatible endpoint is not available, because the repo already ships `@google/genai` and uses Gemini for non-PII tasks today.

## Detailed Findings

### 1. The current Remy runtime is still local-first everywhere

The public landing route is explicitly unauthenticated, rate-limited, and still uses local Ollama "for consistency" (`app/api/remy/landing/route.ts:1-5`). After validation and rate limiting, it checks local Ollama availability, builds a prompt, and calls `new Ollama({ host: config.baseUrl })` with the fast model (`app/api/remy/landing/route.ts:94-133`).

The tenant-scoped public route says the quiet part out loud: "No PII involved - could use cloud model, but uses Ollama for consistency" (`app/api/remy/public/route.ts:1-4`). It then loads only public-safe chef context and sends the prompt to local Ollama with the fast model (`app/api/remy/public/route.ts:125-170`).

The client portal lane is explicitly private and local-only. The route comment says client data is PII and must use Ollama, with no cloud models ever (`app/api/remy/client/route.ts:1-4`). It requires authenticated client context, performs a localhost Ollama health check, loads client-scoped context, and streams from the standard local model (`app/api/remy/client/route.ts:82-192`).

The chef lane is the strictest private path. The stream route comment says it processes full business context and must stay local via Ollama (`app/api/remy/stream/route.ts:1-3`). It performs a localhost health check, loads context/classification/memories, and routes through `routeForRemy()` before streaming from the single PC endpoint (`app/api/remy/stream/route.ts:163-179`, `app/api/remy/stream/route.ts:547-558`, `app/api/remy/stream/route.ts:978-1090`).

The router itself is still single-endpoint local infrastructure. `lib/ai/llm-router.ts` says all AI tasks route to the PC Ollama at `localhost:11434`, the Pi is retired, and `routeForRemy()` always returns the PC endpoint plus a fast local model (`lib/ai/llm-router.ts:1-6`, `lib/ai/llm-router.ts:76-96`).

### 2. The privacy boundary exists in code, but not yet as Remy provider routing

The public-safe context loader intentionally pulls only public chef profile data and a small allowlist of culinary-profile keys, then adds a grounding rule that Remy may only reference facts in that profile block (`lib/ai/remy-public-context.ts:1-4`, `lib/ai/remy-public-context.ts:31-81`, `lib/ai/remy-public-context.ts:84-111`).

The client context loader is the opposite: it pulls client name, dietary restrictions, allergies, events, quotes, loyalty data, and other tenant-scoped PII, then grounds responses to that private data (`lib/ai/remy-client-context.ts:1-4`, `lib/ai/remy-client-context.ts:41-90`, `lib/ai/remy-client-context.ts:184-252`).

The codebase also already uses a privacy policy split outside of Remy. `lib/ai/privacy-audit.ts` is documented as the single source of truth for local Ollama versus cloud Gemini, and its header explicitly marks creative/marketing, vision/OCR, and public regulatory/template data as Gemini-safe (`lib/ai/privacy-audit.ts:2-14`). A concrete example exists in `lib/ai/campaign-outreach.ts`, where campaign concept copy uses Gemini while personalized outreach with client data stays on Ollama (`lib/ai/campaign-outreach.ts:5-13`, `lib/ai/campaign-outreach.ts:25-29`, `lib/ai/campaign-outreach.ts:31-105`).

The practical conclusion is that the repo already knows the difference between public-safe and private AI work. Remy simply has not been wired to use that boundary for provider selection yet.

### 3. Public Remy can move to cloud without touching private lanes

The landing-page public widget already talks only to `/api/remy/landing` and parses a simple SSE stream of `token` and `error` events (`components/public/remy-concierge-widget.tsx:3-5`, `components/public/remy-concierge-widget.tsx:72-110`, `components/public/remy-concierge-widget.tsx:117-149`). That contract is narrow enough that the backend can swap providers without changing the UI, as long as the SSE event shape stays identical.

The tenant-scoped public route already requires `tenantId` and already loads public-safe context only, so its data boundary is narrow enough for cloud routing as well (`app/api/remy/public/route.ts:101-110`, `app/api/remy/public/route.ts:136-170`, `lib/ai/remy-public-context.ts:24-81`).

By contrast, the private lanes are not safe candidates for v1 cloud offload. The client route injects private client context before the model call (`app/api/remy/client/route.ts:177-188`, `lib/ai/remy-client-context.ts:41-90`), and the chef lane injects full operating context and memories before the model call (`app/api/remy/stream/route.ts:547-570`, `app/api/remy/stream/route.ts:994-1040`, `lib/ai/remy-context.ts:5`). A message-level swarm inside those lanes would need a brand-new redaction architecture, not just a provider switch.

### 4. Existing docs overstate browser-only/local-only behavior

Several docs and settings screens still say Remy conversations live only in the browser and never reach the server. The local storage module says conversations are stored only in the browser and ChefFlow servers never see or store conversation content (`lib/ai/remy-local-storage.ts:1-14`).

That is incomplete today. The chef chat hook auto-saves Remy responses as artifacts, saves task results, and extracts memories on the server after a response completes (`lib/hooks/use-remy-send.ts:184-220`, `lib/hooks/use-remy-send.ts:590-630`). Those writes land in `remy_artifacts` and `remy_memories` (`lib/ai/remy-artifact-actions.ts:39-94`, `lib/ai/remy-memory-actions.ts:74-172`), and server-side conversation tables still exist in the schema (`types/database.ts:41258-41650`).

The privacy settings page still claims Remy runs on private infrastructure only, that conversation history lives in the browser, and that there is no conversation database table or log file (`app/(chef)/settings/ai-privacy/page.tsx:145-171`, `app/(chef)/settings/ai-privacy/page.tsx:246-248`). `docs/remy-complete-reference.md` repeats that Remy runs on local Ollama only and stores conversations in browser IndexedDB only (`docs/remy-complete-reference.md:10`, `docs/remy-complete-reference.md:594`, `docs/remy-complete-reference.md:599`). Any cloud-routing implementation has to update those statements or they become even more misleading.

### 5. Provider option comparison

#### Option A: Ollama-compatible cloud endpoint

This is the best fit for preserving current Remy behavior with the least code churn. The live public Remy routes already use the `ollama` JavaScript client and build chat requests with the same message structure that a remote Ollama host expects (`app/api/remy/landing/route.ts:109-133`, `app/api/remy/public/route.ts:145-170`).

Ollama's official cloud docs say cloud models are automatically offloaded to Ollama's cloud service while "offering the same capabilities as local models," and the same JS client can either run a cloud model through the local daemon or target `https://ollama.com` directly as a remote host with bearer auth and streaming (`https://docs.ollama.com/cloud`, lines 88-91, 147-160, 178-186, 236-252).

Pros:

- Minimal route rewrite because the public routes already speak Ollama.
- Best chance of preserving current prompt behavior and streaming semantics.
- Supports a future "remote same-model" path if the exact Remy model can be hosted behind an Ollama-compatible endpoint.

Risks:

- The repo does not verify that the developer's claimed trained model exists in a cloud-servable form. Current defaults are stock Qwen models, not a visible fine-tuned artifact (`lib/ai/providers.ts:20-26`, `lib/ai/providers.ts:33-50`).
- Cloud model choice, cost, and latency still need deployment-time validation.

#### Option B: Gemini

Gemini is the best fallback if a remote Ollama-compatible host is not available. The repo already includes `@google/genai` (`package.json:225`) and already uses Gemini for non-PII parsing and content generation (`lib/ai/parse.ts:2-7`, `lib/ai/parse.ts:40-61`, `lib/ai/campaign-outreach.ts:5-13`, `lib/ai/campaign-outreach.ts:25-29`, `lib/ai/campaign-outreach.ts:31-105`).

Official Gemini pricing shows low paid-tier rates for Gemini Flash / Flash-Lite and marks paid-tier API use as "Used to improve our products: No" on the pricing page (`https://ai.google.dev/gemini-api/docs/pricing`, lines 491-509, 501-509, 766-780). Google's rate-limit docs also show paid-tier upgrades are immediate once billing is set up (`https://ai.google.dev/gemini-api/docs/rate-limits`, lines 296-300).

Pros:

- Lowest integration risk after Ollama-compatible cloud because the SDK is already installed and used in production code.
- Lower cost than frontier-model vendors for high-volume public prompts.
- Clear existing precedent in the repo for non-PII cloud AI.

Risks:

- It is not the same runtime or model family as the current public Ollama routes, so prompt tuning and regression evaluation would be required.
- A Gemini-based Remy cloud path would need a new streaming adapter instead of reusing the existing Ollama chat loop.

#### Option C: Groq

Groq is the speed-first option, but it is not the best first implementation in this repo. The codebase currently checks for `GROQ_API_KEY` in health tooling but has no live Remy adapter for it (`scripts/api-health-check.ts:404-405`; `docs/ai-model-governance.md:4`, `docs/ai-model-governance.md:129`, `docs/ai-model-governance.md:144-149`).

Groq's official docs say its Responses API is compatible with OpenAI's Responses API, but the API is currently in beta, does not support stateful conversations yet, and omits several OpenAI-style features such as `previous_response_id`, `store`, and `prompt_cache_key` (`https://console.groq.com/docs/responses-api`, lines 219-225, 265-266, 965-976). Groq's chat docs do support streaming and async streaming (`https://console.groq.com/docs/text-chat`, lines 266-325, 446-504).

Pros:

- Strong latency story for public-safe chat.
- Easy to evaluate later if the team wants an OpenAI-compatible cloud API.

Risks:

- New integration surface in this repo.
- Beta/feature-gap risk is a bad fit for the first cut of a production Remy routing change.

#### Option D: OpenAI

OpenAI is a viable enterprise option, but it is not the lowest-friction fit for this codebase. The repo has no live Remy/OpenAI adapter today, although OpenAI's docs state that API inputs and outputs are not used to train their models (`https://developers.openai.com/api/docs/concepts`, lines 602-607). OpenAI's published pricing is materially higher than Gemini Flash-Lite for high-volume text traffic (`https://openai.com/api/pricing/`, lines 22-72).

Pros:

- Strong documentation and enterprise controls.
- Clean policy posture for API data.

Risks:

- Highest migration cost among the main options discussed here.
- Does not solve the developer's "same brain" concern by itself.

### 6. Recommended implementation shape

The builder should implement a deterministic provider policy, not an LLM-decided swarm.

Recommended v1:

1. `landing` lane -> cloud provider
2. `public` lane -> cloud provider
3. `client` lane -> local-only
4. `chef` lane -> local-only

This matches the code's existing privacy boundary (`app/api/remy/public/route.ts:1-4`; `lib/ai/remy-public-context.ts:1-4`; `app/api/remy/client/route.ts:1-4`; `app/api/remy/stream/route.ts:1-3`) and avoids the dangerous mistake of trying to make the already-private routes dynamically decide what is private after private context has already been loaded.

The first spec should therefore be built around a route-level split plus a regression check for public Remy behavior. The repo already contains a Remy eval harness for the chef lane (`scripts/remy-eval/eval-harness.ts:1-18`, `scripts/remy-eval/eval-harness.ts:29-33`); that should inform how the team validates voice and safety after swapping the public model.

## Gaps and Unknowns

1. The repo does not verify the developer's claim that the current Remy model is specially trained. The visible defaults are stock Qwen models (`lib/ai/providers.ts:20-26`, `lib/ai/providers.ts:33-50`).
2. There is no measured latency/cost benchmark in the repo for any cloud provider. Current evidence is architectural plus the developer's report of unusable local latency.
3. The exact cloud model and endpoint the team wants to pay for are not encoded anywhere yet. That is a deployment decision, not a code discovery gap.
4. The docs around Remy privacy/storage are already inconsistent with the live code, so a builder could easily preserve false statements unless the spec calls the docs out explicitly (`lib/ai/remy-local-storage.ts:1-14`; `lib/hooks/use-remy-send.ts:184-220`; `app/(chef)/settings/ai-privacy/page.tsx:145-171`; `docs/remy-complete-reference.md:10`, `docs/remy-complete-reference.md:594`, `docs/remy-complete-reference.md:599`).

## Recommendations

- **Quick fix:** Move only `/api/remy/landing` and `/api/remy/public` behind a cloud adapter first. Leave `/api/remy/client` and `/api/remy/stream` local-only.
- **Needs a spec:** Add a deterministic Remy lane policy, an Ollama-compatible public cloud adapter, explicit env/config contracts, health checks, and docs updates.
- **Needs discussion:** Decide whether the first cloud deployment target is an Ollama-compatible endpoint for parity or Gemini for faster time-to-ship.
- **Needs discussion:** Decide the acceptance bar for "same brain" behavior, then validate it with a small golden-prompt set before switching traffic.
