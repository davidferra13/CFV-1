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
│  Private data detected:  FORCE local-only path    │
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

|         | Developer-Agent                  | Application Runtime            |
| ------- | -------------------------------- | ------------------------------ |
| Purpose | Helps build software             | Runs inside ChefFlow for users |
| Trust   | High (sees codebase)             | Mixed (handles PII)            |
| Latency | Moderate (seconds OK)            | Low (real-time UI)             |
| Privacy | Source code acceptable for cloud | Client data MUST stay local    |
| Failure | Blocked developer                | Broken product                 |

These domains share infrastructure (same Ollama) but have different routing policies.

## Provider Roles

| Provider       | Domain               | Role                                   | Privacy    |
| -------------- | -------------------- | -------------------------------------- | ---------- |
| Ollama (local) | Runtime (primary)    | All private data processing            | LOCAL ONLY |
| Groq           | Both (cloud-safe)    | Fast cheap worker for structured tasks | No PII     |
| Gemini         | Runtime (cloud-safe) | Domain content generation (culinary)   | No PII     |
| GitHub Models  | Dev-Agent            | Code-focused utilities, docs           | No PII     |
| Workers AI     | Both (cloud-safe)    | Edge inference, fallback               | No PII     |

## Task Classes

| Class                | LLM?      | Privacy     | Description                             |
| -------------------- | --------- | ----------- | --------------------------------------- |
| DETERMINISTIC        | No        | N/A         | Math, regex, SQL, conditionals          |
| MECHANICAL_SAFE      | Cheap     | Cloud-safe  | Structured extraction, classification   |
| MECHANICAL_PRIVATE   | Local     | LOCAL_ONLY  | Structured extraction of private data   |
| IMPLEMENTATION       | Mid+      | Source code | Writing/modifying code                  |
| REVIEW               | High      | Source code | Code quality, security, architecture    |
| RESEARCH             | Mid       | Source code | Exploration, documentation lookup       |
| PRIVATE_PARSE        | Local     | LOCAL_ONLY  | PII, financials, allergies, client data |
| PUBLIC_GENERATE_FOOD | Any cloud | Cloud-safe  | Culinary content (no PII)               |
| PUBLIC_GENERATE_CODE | Any cloud | Cloud-safe  | Code/docs (no PII)                      |
| ESCALATION           | Top       | Depends     | Ambiguous tasks                         |
| ORCHESTRATION        | Top       | Metadata    | Routing, coordination                   |

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

### Must Stay Local (Ollama only)

- Client PII (names, emails, phones, addresses)
- Dietary/allergy data (safety-critical)
- Financial data (quotes, invoices, revenue)
- Conversational data (chat messages, inquiries)
- Chef business data (pricing, client lists, lead scores)
- Contracts/legal documents
- Staff data (names, schedules, pay rates)

### Cloud-Safe

- Generic culinary content (techniques, specs, templates)
- Public code (open-source patterns, generic implementations)
- Classification metadata (intent labels, task types)
- Marketing copy (generic themes, occasions)

### The Test

Before routing to cloud: "If this payload appeared in the provider's training data, would it harm any client, chef, or the business?" If yes, local only.

## Permission Boundaries

| Model         | CAN                                                             | CANNOT                                                 |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| Groq          | Parse structured data, classify, draft, boilerplate             | Access private data, make judgment calls, self-certify |
| Ollama        | Process all private data, runtime AI with PII, offline fallback | Send data externally (architecturally impossible)      |
| Gemini        | Generate culinary content, domain templates                     | Access private data, replace Ollama for PII tasks      |
| GitHub Models | Code utilities, docs, code review                               | Access private data, complex multi-file implementation |
| Workers AI    | Edge classification, embeddings, content moderation             | Access private data, complex reasoning                 |

## Failure Policy

1. **Cheap model fails**: Retry once (transient only), then secondary, then fallback. Max 3 attempts total.
2. **Ollama offline (private task)**: Hard fail. User sees "Start Ollama to use this feature." NEVER cloud.
3. **Ollama offline (non-private task)**: Route to cloud alternative per table.
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
