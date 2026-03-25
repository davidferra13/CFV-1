# Remy Privacy Architecture — Implementation Summary

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`
**Status:** Implemented — pending migration push and integration testing

---

## What Changed

ChefFlow's Remy AI privacy model has been upgraded from "we promise not to look" (Level 1) to "we can't look" (Level 3 — privacy by architecture).

### Core Principle

> "We don't have your data" is infinitely stronger than "We have your data but we promise not to look."

---

## Architecture Overview

### Data Flow

```
Chef types message in Remy drawer
        ↓
Browser sends request to ChefFlow API
        ↓
API routes to Ollama on localhost (local PC)
        ↓
Ollama processes locally, generates response
        ↓
Response streams back to browser
        ↓
Displayed in Remy drawer
        ↓
Conversation stored in browser IndexedDB ONLY
        ↓
Nothing written to PostgreSQL. Nothing logged.
ChefFlow servers do not retain prompts or responses.
```

### What ChefFlow Stores vs. What It Doesn't

| Data                                                        | Stored?                | Where?                         | Who can see it?          |
| ----------------------------------------------------------- | ---------------------- | ------------------------------ | ------------------------ |
| Chef's business data (clients, events, recipes, financials) | Yes                    | PostgreSQL (encrypted at rest) | The chef (tenant-scoped) |
| Remy conversation content (prompts + responses)             | **No**                 | Browser only (IndexedDB)       | The chef only            |
| Anonymous usage metrics (counts only)                       | Yes                    | PostgreSQL                     | ChefFlow (aggregate)     |
| Error logs (stack traces, model errors)                     | Yes                    | Server logs                    | ChefFlow engineering     |
| Conversation shared via "Send to Support"                   | Only if chef initiates | PostgreSQL                     | ChefFlow support team    |

### External Services Disclosure

Some ChefFlow features use external APIs for non-conversation data:

- **Spoonacular** — nutrition & recipe data
- **Kroger / Instacart** — grocery pricing & availability
- **MealMe** — local store search

These services receive item-level data only (e.g., "broccoli price"), never PII or conversation content. This is separate from Remy's conversation processing, which is entirely private.

---

## Files Created

| File                                                               | Purpose                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `database/migrations/20260322000049_remy_privacy_architecture.sql` | `remy_usage_metrics` + `remy_support_shares` tables           |
| `lib/ai/remy-local-storage.ts`                                     | IndexedDB wrapper for browser-local conversation storage      |
| `lib/ai/remy-metrics.ts`                                           | Anonymous usage metric recording (counts only, never content) |
| `lib/ai/support-share-action.ts`                                   | Server action for voluntary "Send to Support" sharing         |
| `lib/remotion/remy-privacy-schematic.tsx`                          | 55-second animated explainer video (6 scenes)                 |

## Files Modified

| File                                               | What Changed                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `app/(chef)/settings/ai-privacy/page.tsx`          | Complete rewrite — 3-section transparency page + external API disclosure + anonymous metrics summary |
| `components/ai-privacy/data-flow-schematic.tsx`    | Simplified to private loop diagram (Chef → Local Ollama → Chef) with blocked external paths          |
| `components/ai-privacy/remy-onboarding-wizard.tsx` | Simplified — privacy mentioned once confidently, not belabored                                       |
| `components/ai-privacy/remy-gate.tsx`              | Updated to factual, confident language                                                               |
| `components/ai/remy-drawer.tsx`                    | Added "Send to Support" button, updated privacy language in welcome/footer                           |

---

## New Database Tables

### `remy_usage_metrics`

Anonymous counters per tenant/date/category. Never contains conversation content.

- `conversation_count`, `message_count`, `feature_category`
- `avg_response_time_ms`, `error_count`, `model_version`
- Unique constraint on `(tenant_id, metric_date, feature_category)` for upsert
- RLS: tenant-scoped

### `remy_support_shares`

Only populated when a chef explicitly taps "Send to Support" inside a conversation.

- `conversation_json` — the specific conversation shared
- `support_note` — optional note from chef
- `status` — `open` | `in_review` | `resolved` | `closed`
- RLS: tenant-scoped

---

## Remotion Video — 6 Scenes

The `RemyPrivacySchematic` composition (1650 frames @ 30fps = 55 seconds):

1. **"You talk to Remy"** (0-5s) — Chat mockup with message
2. **"Remy processes it privately"** (5-15s) — Data packet travels to local Ollama, pulse animation
3. **"Your answer comes back"** (15-22s) — Closed loop, bidirectional arrows
4. **"What doesn't happen"** (22-35s) — Blocked paths to OpenAI, Google, etc.
5. **"Where your conversation lives"** (35-45s) — Browser/IndexedDB visualization
6. **"The bottom line"** (45-55s) — "We can't read your conversations. Because they're not on our servers."

---

## Transition Plan

The existing `remy_conversations` and `remy_messages` tables are NOT dropped. They will be deprecated in code:

- New conversations go to IndexedDB (browser-local)
- Old conversations remain accessible (read-only from the database)
- A future migration can archive/remove the old tables once the transition is verified

---

## What Makes This Best-in-Class

| What the best companies do               | How ChefFlow does it                                |
| ---------------------------------------- | --------------------------------------------------- |
| Proton Lumo: Zero-access encryption      | ChefFlow: No conversation storage on servers at all |
| Apple PCC: Stateless computation         | ChefFlow: Conversations processed and discarded     |
| Ollama/llamafile: 100% local             | ChefFlow: Ollama on local PC infrastructure         |
| Brave Leo: IP stripping, no cloud AI     | ChefFlow: Private infrastructure only               |
| DuckDuckGo AI Chat: Anonymous by default | ChefFlow: Privacy is structural, not configurable   |

---

## Verification Checklist

- [ ] Run migration on linked PostgreSQL
- [ ] Verify `remy_usage_metrics` table exists with correct schema
- [ ] Verify `remy_support_shares` table exists with correct schema
- [ ] Test transparency page renders 3 sections + external API disclosure
- [ ] Test "Send to Support" button in Remy drawer
- [ ] Verify Remotion composition renders without errors
- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx next build --no-lint` passes
