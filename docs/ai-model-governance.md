# AI Model Governance Policy

> Canonical reference for the multi-model AI operating system.
> Source of truth: `lib/ai/dispatch/` (code) and this document (policy).

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│               DISPATCH LAYER                     │
│      lib/ai/dispatch/ (deterministic, no LLM)    │
│                                                   │
│  Input -> Privacy Gate -> Classifier -> Router    │
│                                                   │
│  Private data detected:  FORCE Ollama-compat path  │
│  Deterministic possible: FORCE no-LLM path        │
│  Otherwise:              Route per table           │
└──────────┬────────────────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
 DOMAIN A      DOMAIN B
 Dev-Agent     Runtime
```

## Two Domains (Hard Boundary)

|         | Developer-Agent                  | Application Runtime              |
| ------- | -------------------------------- | -------------------------------- |
| Purpose | Helps build software             | Runs inside ChefFlow for users   |
| Trust   | High (sees codebase)             | Mixed (handles PII)              |
| Latency | Moderate (seconds OK)            | Low (real-time UI)               |
| Privacy | Source code acceptable for cloud | Uses cloud Ollama-compat runtime |
| Failure | Blocked developer                | Broken product                   |

## Provider Roles

| Provider                   | Domain               | Role                                 | Privacy       |
| -------------------------- | -------------------- | ------------------------------------ | ------------- |
| Ollama-compat cloud (prod) | Runtime (primary)    | All Ollama-backed feature processing | Secure cloud  |
| Ollama local (dev only)    | Runtime (dev)        | Local dev/debug override             | Local machine |
| Gemini                     | Runtime (cloud-safe) | Domain content generation (culinary) | No PII        |

## Task Classes

| Class                | LLM?                | Privacy       | Description                             |
| -------------------- | ------------------- | ------------- | --------------------------------------- |
| DETERMINISTIC        | No                  | N/A           | Math, regex, SQL, conditionals          |
| MECHANICAL_SAFE      | Cheap               | Cloud-safe    | Structured extraction, classification   |
| MECHANICAL_PRIVATE   | Cloud/Ollama-compat | Ollama-compat | Structured extraction of private data   |
| IMPLEMENTATION       | Mid+                | Source code   | Writing/modifying code                  |
| REVIEW               | High                | Source code   | Code quality, security, architecture    |
| RESEARCH             | Mid                 | Source code   | Exploration, documentation lookup       |
| PRIVATE_PARSE        | Cloud/Ollama-compat | Ollama-compat | PII, financials, allergies, client data |
| PUBLIC_GENERATE_FOOD | Any cloud           | Cloud-safe    | Culinary content (no PII)               |
| PUBLIC_GENERATE_CODE | Any cloud           | Cloud-safe    | Code/docs (no PII)                      |
| ESCALATION           | Top                 | Depends       | Ambiguous tasks                         |
| ORCHESTRATION        | Top                 | Metadata      | Routing, coordination                   |

## Routing Table

| Task Class           | Primary       | Secondary       | Fallback   | Escalation |
| -------------------- | ------------- | --------------- | ---------- | ---------- |
| DETERMINISTIC        | none (no LLM) | -               | -          | developer  |
| MECHANICAL_SAFE      | groq          | workers-ai      | gemini     | developer  |
| MECHANICAL_PRIVATE   | ollama-fast   | ollama-standard | HARD_FAIL  | HARD_FAIL  |
| IMPLEMENTATION       | groq          | github-models   | gemini     | developer  |
| REVIEW               | github-models | groq            | -          | developer  |
| RESEARCH             | groq          | github-models   | gemini     | developer  |
| PRIVATE_PARSE        | ollama-fast   | ollama-standard | HARD_FAIL  | HARD_FAIL  |
| PUBLIC_GENERATE_FOOD | gemini        | groq            | workers-ai | developer  |
| PUBLIC_GENERATE_CODE | github-models | groq            | gemini     | developer  |
| ESCALATION           | groq          | -               | -          | developer  |
| ORCHESTRATION        | groq          | -               | -          | developer  |

**HARD_FAIL** = throw user-visible error. Private data never falls back to cloud.

## Privacy Policy

### Routed Through Ollama-Compatible Cloud Runtime

- Client PII (names, emails, phones, addresses)
- Dietary/allergy data (safety-critical)
- Financial data (quotes, invoices, revenue)
- Conversational data (chat messages, inquiries)
- Chef business data (pricing, client lists, lead scores)
- Contracts/legal documents
- Staff data (names, schedules, pay rates)

### Gemini Cloud (No PII)

- Generic culinary content (techniques, specs, templates)
- Public code (open-source patterns, generic implementations)
- Classification metadata (intent labels, task types)
- Marketing copy (generic themes, occasions)

### The Test

Before routing to Gemini: "If this payload appeared in the provider's training data, would it harm any client, chef, or the business?" If yes, route through Ollama-compatible runtime instead.

## Permission Boundaries

| Model                   | CAN                                           | CANNOT                                                |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------- |
| Ollama-compat cloud     | Process all private data, runtime AI with PII | Be used for generic/public tasks (use Gemini instead) |
| Ollama local (dev only) | Local dev/debug of the same features          | Be the production runtime                             |
| Gemini                  | Generate culinary content, domain templates   | Access private data, replace Ollama-compat for PII    |

## Failure Policy

1. **Cloud AI runtime fails**: Retry once (transient only), then hard fail with provider-agnostic message.
2. **AI runtime unavailable**: Hard fail. User sees provider-agnostic "AI unavailable" message. NEVER silent fallback.
3. **Gemini fails**: Retry once, then fallback per routing table.
4. **All providers fail**: Escalate to developer with structured error report.
5. **Ambiguous task**: Route to ESCALATION class. Fast model attempts classification. If it fails, developer decides.

## Governance Rules

1. **No self-certification.** Generator != reviewer.
2. **No silent fallback.** Every fallback transition is logged.
3. **No role creep.** If a cheap model is used for judgment tasks, that's a routing bug.
4. **No ad-hoc model selection.** All LLM access goes through the dispatch layer.
5. **Deterministic first.** If code can solve it, no LLM is invoked.

## Anti-Patterns

- Sending private data to cloud providers (even "just this once")
- Using Ollama for cloud-safe tasks (wastes GPU, starves private tasks)
- Letting models compete for the same task without routing rules
- Retrying a failed provider more than once before moving to fallback
- Routing deterministic tasks to any LLM

## File Locations

| File                               | Purpose                                        |
| ---------------------------------- | ---------------------------------------------- |
| `lib/ai/dispatch/types.ts`         | Shared types (TaskClass, PrivacyLevel, etc.)   |
| `lib/ai/dispatch/classifier.ts`    | Deterministic task classification              |
| `lib/ai/dispatch/privacy-gate.ts`  | Privacy scanning and hard gating               |
| `lib/ai/dispatch/routing-table.ts` | Canonical routing table                        |
| `lib/ai/dispatch/router.ts`        | Main dispatcher (chain walker)                 |
| `lib/ai/dispatch/index.ts`         | Barrel export                                  |
| `lib/ai/providers.ts`              | Provider configuration (env vars, model tiers) |
| `lib/ai/parse-ollama.ts`           | Ollama adapter                                 |
| `lib/ai/parse-groq.ts`             | Groq adapter                                   |
| `lib/ai/parse-github-models.ts`    | GitHub Models adapter                          |
| `lib/ai/parse-workers-ai.ts`       | Workers AI adapter                             |
| `lib/ai/gemini-service.ts`         | Gemini adapter                                 |
