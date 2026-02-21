# Build: Private AI — Local Only Rule

## What Changed

The hybrid LLM routing system has been hardened. Previously, all 14 privacy-sensitive AI
functions routed to local Ollama **with a Gemini fallback** — meaning if Ollama was offline,
client PII, financials, and other sensitive data would silently flow to Google's API anyway.

That fallback has been removed. Private data now stays local unconditionally.

## Why

The previous design was "privacy-first in intent but not in practice." The fallback existed for
reliability, but it undermined the privacy guarantee. A chef who believes their client data stays
local deserves that guarantee to actually hold — not just when Ollama happens to be running.

The new contract: if Ollama is offline, the feature fails with a clear error. The user is told
to start Ollama. Data is never sent externally.

## Files Changed

### Core

| File                     | Change                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/ai/parse-ollama.ts` | Removed all `parseWithAI` (Gemini) fallback calls. Added `OllamaOfflineError` class. Now throws instead of falling back on: not configured, unreachable, empty response, invalid JSON, failed Zod validation after repair. The Ollama→Ollama repair pass is preserved (still local). |

### Callers Updated (re-throw OllamaOfflineError)

These 6 files previously swallowed all errors and returned neutral/empty defaults. They now
re-throw `OllamaOfflineError` specifically so the UI can display a meaningful error.

| File                             | Behavior when Ollama offline |
| -------------------------------- | ---------------------------- |
| `lib/ai/sentiment-analysis.ts`   | Throws — UI shows error      |
| `lib/ai/client-portal-triage.ts` | Throws — UI shows error      |
| `lib/ai/allergen-risk.ts`        | Throws — UI shows error      |
| `lib/ai/expense-categorizer.ts`  | Throws — UI shows error      |
| `lib/ai/carry-forward-match.ts`  | Throws — UI shows error      |
| `lib/ai/temp-log-anomaly.ts`     | Throws — UI shows error      |

### Callers Unchanged (already hard-fail or no catch)

These files already re-threw errors or had no catch block, so they already behaved correctly:

- `lib/ai/parse-inquiry.ts` — no catch, exceptions bubble
- `lib/ai/client-preference-profile.ts` — re-throws
- `lib/ai/lead-scoring.ts` — re-throws
- `lib/ai/pricing-intelligence.ts` — re-throws
- `lib/ai/tax-deduction-identifier.ts` — re-throws
- `lib/ai/business-insights.ts` — re-throws

### Edge Case: parse-client.ts

`lib/ai/parse-client.ts` falls back to a **heuristic regex parser** (not an LLM) when AI fails.
This is acceptable: the heuristic parser makes no external API calls and keeps data local.
It was left unchanged.

### Documentation / Rules

| File               | Change                                                               |
| ------------------ | -------------------------------------------------------------------- |
| `CLAUDE.md`        | Added "Private AI — Local Only" section under Architecture Reminders |
| `memory/MEMORY.md` | Added "Private AI Rule" section                                      |

## The OllamaOfflineError Contract

```ts
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

// In any caller that has try/catch around parseWithOllama:
try {
  return await parseWithOllama(systemPrompt, userContent, schema)
} catch (err) {
  if (err instanceof OllamaOfflineError) throw err // surface to UI
  console.error('[module] Failed:', err)
  return safeDefaults
}
```

- `OllamaOfflineError` extends `Error` with `name = 'OllamaOfflineError'`
- The message always starts with the standard prompt: _"Ollama is required for this feature. Start Ollama (http://localhost:11434) and ensure it is running."_
- Never catch `OllamaOfflineError` silently. Always re-throw it.

## Private Data Categories (must always use parseWithOllama)

- Client PII: names, email, phone, addresses, messages
- Health/safety: dietary restrictions, allergies
- Financial: budget, quotes, payment history, revenue, expenses, pricing history
- Business intelligence: lead scores, insights, analytics
- Operational: temperature logs, staff briefings, event details

## Routing Summary After This Change

| Category                           | Route        | Fallback             |
| ---------------------------------- | ------------ | -------------------- |
| Private data (14 functions)        | Local Ollama | **None — hard fail** |
| Creative/generative (34 functions) | Gemini       | Throws if no API key |
| Heuristic (parse-client fallback)  | Regex        | N/A                  |
