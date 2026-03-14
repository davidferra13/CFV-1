# AI Dispatch Layer - Implementation Summary

## What Changed

All AI calls in the codebase now route through a centralized dispatch layer (`lib/ai/dispatch/`) instead of importing provider parsers directly. This gives us a single place to enforce privacy, routing, fallback chains, and cost tracking across all 6 AI providers.

## Architecture

```
Caller (server action / agent action)
  |
  v
dispatch() / dispatchPrivate() / dispatchCloudSafe()
  |
  v
Classifier (deterministic task classification, no LLM)
  |
  v
Privacy Gate (scans payloads for PII, allergies, financials)
  |
  v
Routing Table (task class -> provider chain lookup)
  |
  v
Router (walks chain: primary -> secondary -> fallback -> escalation)
  |
  v
Provider Adapter (lazy import of parse-ollama / parse-groq / gemini-service / etc.)
  |
  v
Cost Tracker (records latency, success/failure, fallback usage)
```

## Files Created

| File                               | Purpose                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| `lib/ai/dispatch/types.ts`         | Core types: TaskClass, PrivacyLevel, DispatchResult, DispatchOptions |
| `lib/ai/dispatch/classifier.ts`    | Deterministic task classification (keyword + content-type based)     |
| `lib/ai/dispatch/privacy-gate.ts`  | Scans payloads for PII/financial/dietary data patterns               |
| `lib/ai/dispatch/routing-table.ts` | Single source of truth: task class -> provider chain                 |
| `lib/ai/dispatch/router.ts`        | Main dispatcher, fallback walking, provider invocation               |
| `lib/ai/dispatch/cost-tracker.ts`  | In-memory per-provider/per-task metrics (rolling window)             |
| `lib/ai/dispatch/index.ts`         | Barrel export                                                        |
| `docs/ai-model-governance.md`      | Policy document (routing rules, privacy boundaries, anti-patterns)   |
| `scripts/audit-model-routing.ts`   | Scans for direct provider imports outside dispatch layer             |
| `scripts/migrate-to-dispatch.ts`   | First-pass bulk migration script (108 single-line calls)             |
| `scripts/migrate-multiline-fix.ts` | Second-pass migration for multi-line calls (69 calls)                |

## Migration Stats

- **62 files migrated** from `parseWithOllama` to `dispatchPrivate`
- **0 audit violations** remaining (verified by `scripts/audit-model-routing.ts`)
- **0 dispatch-related type errors** (verified by `npx tsc --noEmit --skipLibCheck`)
- **15 additional call sites** fixed post-migration (DispatchResult unwrapping)

## How to Use

### Private data (client PII, allergies, financials)

```ts
import { dispatchPrivate } from '@/lib/ai/dispatch'

const { result } = await dispatchPrivate(systemPrompt, userContent, MySchema, {
  taskDescription: 'parse client inquiry with PII',
  contentType: 'structured_extraction',
})
// result is the Zod-validated T, not the DispatchResult wrapper
```

### Cloud-safe data (generic content, no PII)

```ts
import { dispatchCloudSafe } from '@/lib/ai/dispatch'

const { result } = await dispatchCloudSafe(systemPrompt, userContent, MySchema, {
  taskDescription: 'generate kitchen technique list',
  contentType: 'generation',
})
```

### With formula-first fallback

```ts
import { withAiFallback } from '@/lib/ai/with-ai-fallback'
import { dispatchPrivate } from '@/lib/ai/dispatch'

const { result, source } = await withAiFallback(
  () => myDeterministicFormula(data), // Formula runs first
  async () => {
    const { result } = await dispatchPrivate(
      // AI enhances if Ollama online
      systemPrompt,
      userContent,
      schema,
      options
    )
    return result
  }
)
```

## Routing Rules (Summary)

| Task Class           | Primary       | Secondary       | Fallback   | Escalation      |
| -------------------- | ------------- | --------------- | ---------- | --------------- |
| PRIVATE_PARSE        | ollama-fast   | ollama-standard | HARD_FAIL  | HARD_FAIL       |
| MECHANICAL_PRIVATE   | ollama-fast   | ollama-standard | HARD_FAIL  | HARD_FAIL       |
| MECHANICAL_SAFE      | groq          | workers-ai      | gemini     | ollama-fast     |
| PUBLIC_GENERATE_FOOD | gemini        | groq            | workers-ai | ollama-standard |
| PUBLIC_GENERATE_CODE | github-models | groq            | gemini     | ollama-standard |

Private tasks NEVER fall back to cloud providers. They HARD_FAIL with OllamaOfflineError.

## Governance Enforcement

Run the audit to check for direct provider imports:

```bash
npx tsx scripts/audit-model-routing.ts          # report mode
npx tsx scripts/audit-model-routing.ts --strict  # CI mode (exit 1 on violations)
```

The audit allows imports in: dispatch layer itself, provider configs, adapters, scripts, and tests.

## What's NOT Changed

- **Gemini SDK calls** in `gemini-service.ts` and `campaign-outreach.ts` (`draftCampaignConcept`) still use the Gemini SDK directly. These are public-data paths with a different SDK pattern (not structured parsing).
- **Pre-existing type errors** in ~8 AI files are unrelated to the migration (wrong column names, missing properties, etc.).
- **`parseWithOllama`** still exists in `lib/ai/parse-ollama.ts` and is imported by the dispatch layer as the Ollama adapter. It's just no longer called directly by application code.
