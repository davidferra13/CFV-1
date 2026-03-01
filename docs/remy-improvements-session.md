# Remy Improvements — Cross-Chat, Nudges, Survey Extraction

Three improvements to the Remy AI system built on top of the dual-chat architecture and conversational survey.

## Feature 1: Cross-Chat Awareness

**What:** Mascot chat and drawer chat now share conversation context. When a chef discusses a topic in one channel, Remy is aware of it in the other.

**How it works:**

- After each message exchange, both hooks store a "channel digest" (last 3 exchanges, ~80 chars each) in `sessionStorage`
- When sending a message, each hook reads the OTHER channel's digest and includes it in the API request
- The API route injects a small "CONTEXT FROM OTHER CHAT CHANNEL" section into the system prompt
- Digest generation is deterministic (text excerpts) — no LLM calls (Formula > AI)

**Files:**

- `lib/ai/remy-activity-tracker.ts` — added `updateChannelDigest()`, `getOtherChannelDigest()`
- `lib/hooks/use-remy-mascot-send.ts` — calls `updateChannelDigest('mascot', ...)` after response
- `lib/hooks/use-remy-send.ts` — calls `updateChannelDigest('drawer', ...)` after response
- `app/api/remy/stream/route.ts` — accepts `otherChannelDigest`, injects into system prompt

## Feature 2: Proactive Mascot Nudges

**What:** Remy proactively pops up speech bubbles on the mascot avatar based on chef activity — without requiring the chef to open any chat.

**How it works:**

- `useRemyNudges` hook runs a 30-second interval evaluating deterministic rules against the activity tracker
- When a rule fires: dispatches `NUDGE` body event (wiggle animation) + shows a speech bubble
- All messages are pre-defined strings — zero LLM calls
- Strict safety guards: no nudges while chat is open, while streaming, during non-idle states
- Cooldowns: 3-minute global, per-rule cooldowns (15-60 min), 5 max per session
- Dismissing a nudge extends global cooldown to 10 minutes

**Rules:**
| Rule | Condition | Message |
|------|-----------|---------|
| error-help | 2+ errors in 5 min | "Spotted some errors — want help?" |
| long-settings | On /settings/\* > 5 min | "Need help finding a setting?" |
| long-session | Session > 2 hours | "Take a break, chef!" |
| idle-check | 10+ min no actions | "I'm here if you need anything!" |
| survey-nudge | Survey not started | "Want to do a quick get-to-know-you?" |

**Files:**

- `lib/ai/remy-nudge-rules.ts` — rule definitions + evaluator + cooldown management
- `lib/hooks/use-remy-nudges.ts` — React hook with interval + safety guards
- `components/ai/remy-wrapper.tsx` — wires nudge hook, passes to mascot button
- `components/ai/remy-mascot-button.tsx` — renders nudge messages in SpeechBubble

## Feature 3: Survey Answer Extraction

**What:** After each survey response, Ollama fast tier (qwen3:4b) automatically extracts the factual answer from the chef's conversational reply and saves it as a structured memory.

**How it works:**

- When a mascot chat response completes during survey mode, `extractSurveyAnswer()` is called non-blocking
- Uses `parseWithOllama({ modelTier: 'fast' })` to distill conversational text into factual statements
- Calls `saveSurveyAnswer()` which saves as high-importance memory + backfills culinary profile
- Handles skip/next/idk responses by returning empty (no memory saved)
- Handles multi-answer responses (chef answers multiple questions at once)
- Never delays the next message — all extraction is background async

**Files:**

- `lib/ai/remy-survey-extraction.ts` — server action with Ollama extraction + Zod schema
- `lib/hooks/use-remy-mascot-send.ts` — triggers extraction after survey responses
- `components/ai/remy-mascot-chat.tsx` — computes current question, passes to hook

## Survey Intro Update

The survey introduction now mentions Remy's personalization and training. Before asking the chef to take the survey, Remy explains:

- He's specifically trained for private chefs (not a generic chatbot)
- He understands event planning, dietary needs, menu costing, grocery runs, quotes, invoicing, scheduling
- He adapts to the chef's cooking style, business preferences, and communication style

Updated in `lib/ai/remy-survey-prompt.ts`.
