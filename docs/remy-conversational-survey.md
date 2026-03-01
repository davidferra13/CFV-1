# Remy "Get to Know You" Conversational Survey

> Created: 2026-02-28

## Overview

Remy conducts an optional, conversational survey through the mascot chat to learn about the chef. Instead of filling out a boring form, the chef has a natural conversation with Remy — and the answers get persisted as high-importance memories + backfilled into the culinary profile.

## How It Works

1. **Chef clicks "Get to know me better"** in the mascot chat empty state
2. **Remy introduces himself** — who he is, privacy guarantee (data stays local), consent framing, then asks if they're ready
3. **Remy asks questions** — one at a time, conversationally. Reacts to answers, transitions naturally.
4. **Answers are saved** — as high-importance memories (`remy_memories`, importance 8) + backfilled to culinary profile where mapped
5. **Chef can skip, stop, or resume** anytime. Progress is tracked server-side.

## Survey Structure

25 questions across 5 groups:

| Group | Label          | Topics                                                             |
| ----- | -------------- | ------------------------------------------------------------------ |
| 1     | Kitchen DNA    | cooking style, origin, signature dish, cuisines, current technique |
| 2     | Business Style | event size, dream client, pricing, pain points, goals              |
| 3     | How You Work   | prep routine, busy days, shopping, team, bottleneck                |
| 4     | Communication  | email tone, detail level, Remy energy, nudge frequency             |
| 5     | Personal Touch | food memory, dream dinner, hardest lesson, pride, surprise         |

6 questions map to culinary profile keys and backfill automatically.

## State Management

Survey progress is stored in `ai_preferences.survey_state` (JSONB column):

```typescript
interface SurveyState {
  status: 'not_started' | 'in_progress' | 'completed'
  introCompleted: boolean
  currentGroup: number // 0-4
  currentQuestion: number // 0-4
  answered: string[] // e.g. ['kitchen_0', 'business_2']
  skipped: string[]
  startedAt: string
  completedAt?: string
}
```

## Files

| File                                                       | Purpose                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `lib/ai/remy-survey-constants.ts`                          | 25 questions, 5 groups, types, helpers                               |
| `lib/ai/remy-survey-actions.ts`                            | Server actions: start, save answer, skip, get state                  |
| `lib/ai/remy-survey-prompt.ts`                             | System prompt section builder for survey mode                        |
| `components/ai/survey-progress-bar.tsx`                    | Thin progress bar in mascot chat header                              |
| `supabase/migrations/20260330000012_remy_survey_state.sql` | Adds `survey_state` column                                           |
| `app/api/remy/stream/route.ts`                             | Modified — injects survey prompt when `activeForm === 'remy-survey'` |
| `lib/hooks/use-remy-mascot-send.ts`                        | Modified — passes `surveyActive` flag                                |
| `components/ai/remy-mascot-chat.tsx`                       | Modified — loads survey state, shows progress, survey starters       |

## Privacy

- All survey data stays local (Ollama only)
- Conversations are ephemeral (session-only React state)
- Answers saved as memories in the local Supabase database
- Remy explicitly tells the chef: "ChefFlow does NOT store your conversations on any server"
