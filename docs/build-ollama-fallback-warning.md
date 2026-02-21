# Build: Ollama Privacy Transparency

## What Changed

Surfaced a clear visual warning when the local Ollama AI is offline and operations are falling back to Google Gemini. Also fixed `'use server'` compliance for shared AI types and constants.

---

## Files Changed

| File                                           | Type     | What                                                                                                    |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `lib/ai/ollama-errors.ts`                      | New      | `OllamaOfflineError` class — no `'use server'`, safe to import anywhere                                 |
| `lib/ai/expense-categorizer-constants.ts`      | New      | `EXPENSE_CATEGORIES`, `EXPENSE_CATEGORY_LABELS`, `ExpenseCategory` type — split from server action file |
| `lib/ai/parse-ollama.ts`                       | Modified | Imports `OllamaOfflineError` from `ollama-errors`; no longer defines or exports the class               |
| `lib/ai/expense-categorizer.ts`                | Modified | Imports constants from `expense-categorizer-constants`; only exports async function + types             |
| `components/ai/expense-categorize-suggest.tsx` | Modified | Imports constants from `expense-categorizer-constants`, server action from `expense-categorizer`        |
| `components/dashboard/ollama-status-badge.tsx` | Modified | Three states; suppresses when not configured; amber "Cloud Mode" warning when offline                   |
| `components/navigation/chef-nav.tsx`           | Modified | Badge rendered in sidebar bottom on every chef page                                                     |
| `app/api/ollama-status/route.ts`               | Modified | Adds `configured: boolean` to response                                                                  |

---

## The Core Problem Fixed

`parseWithOllama` previously fell back to Gemini silently (`console.warn` only) when Ollama was unreachable. Chefs had no in-app indication that sensitive data (client PII, inquiries, expenses) was leaving the device.

Additionally, the `OllamaStatusBadge` only existed on the dashboard — invisible when AI ops are triggered from event pages, inquiry pages, recipe pages, etc.

---

## `'use server'` Compliance Fixes

Next.js requires `'use server'` files to only export async functions. Two violations existed:

**`parse-ollama.ts`** exported `class OllamaOfflineError` — fixed by moving it to `lib/ai/ollama-errors.ts` (no directive).

**`expense-categorizer.ts`** exported `const EXPENSE_CATEGORIES` and `const EXPENSE_CATEGORY_LABELS` — fixed by moving them to `lib/ai/expense-categorizer-constants.ts` (no directive).

Import rule for callers:

```ts
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from '@/lib/ai/expense-categorizer-constants'
import { categorizeExpense, type CategorizationResult } from '@/lib/ai/expense-categorizer'
```

---

## Badge Behavior

| Ollama state                             | Badge                 | Meaning                               |
| ---------------------------------------- | --------------------- | ------------------------------------- |
| Not configured (`OLLAMA_BASE_URL` unset) | Hidden                | Cloud AI is expected; no alarm needed |
| Configured + online                      | Green · "Local · Xms" | Data stays on device                  |
| Configured + offline                     | Amber · "Cloud Mode"  | Data routing to Google Gemini         |

The amber badge tooltip reads: _"Local processing offline — operations are routing to cloud. Restart local service to keep data on-device."_

Badge polls `/api/ollama-status` every 30 seconds. Appears in the sidebar bottom on every chef page (expanded mode only — rail is too narrow).

---

## `OllamaOfflineError` Contract

Thrown by `parseWithOllama` on any failure. Never falls back to Gemini.

Callers that have a broad `catch` must re-throw it:

```ts
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

try {
  return await parseWithOllama(prompt, content, schema)
} catch (err) {
  if (err instanceof OllamaOfflineError) throw err // surface to UI
  // handle other errors here
}
```

Callers with no `catch` (pure parsers like `parse-inquiry.ts`) let it propagate naturally — correct behavior.
