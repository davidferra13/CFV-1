# Spec: BYOAI Phase 2A - Remy Prompt API

> **Status:** superseded
> **Superseded by:** `app/api/remy/context/route.ts` (already exists, 460 lines)
> **Priority:** n/a

## Timeline

| Event      | Date             | Agent/Session      | Commit |
| ---------- | ---------------- | ------------------ | ------ |
| Created    | 2026-04-26 17:30 | Planner (Opus 4.6) |        |
| Superseded | 2026-04-26 18:00 | Planner (Opus 4.6) |        |

---

## Why Superseded

The `/api/remy/context` endpoint already exists and does everything this spec described, plus more:

- Full auth + rate limiting + guardrails
- Greeting fast-paths and curated replies
- Intent classification with command/question/mixed routing
- Server-side command execution with task results
- Parallel context gathering (same as streaming route)
- `buildRemySystemPrompt()` with `isLocalAi=true`
- Returns JSON: `{ systemPrompt, userMessage, model, options, tasks, ... }`

The mascot send hook (`lib/hooks/use-remy-mascot-send.ts`) already uses it when `localAi?.enabled` is true, streaming responses through `OllamaLocalProvider` (`lib/ai/local-ai-provider.ts`).

No action needed. Moving to the actual Phase 2 gaps.
