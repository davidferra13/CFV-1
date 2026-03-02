# Email Classification Overhaul — March 2026

## Problem

Testing the inbox with real Gmail data revealed ~70 of 78 triage items were spam/marketing (Google Apps Script notifications, Rocket Money, TurboTax, real estate blasts, etc.). The original classifier relied on a hardcoded domain list + Ollama AI — both brittle and expensive.

## Solution: 6-Layer Classification Pipeline

Each layer short-circuits if matched — Ollama only runs when all deterministic layers miss.

### Layer 1: Platform Detection (existing)

Known booking platforms (TakeAChef, Thumbtack, Yhangry, etc.) detected by sender domain. Routes to dedicated parsers — no classification needed.

**File:** `lib/gmail/classify.ts` → `detectPlatformEmail()`

### Layer 2: Gmail Labels (new)

Gmail classifies billions of emails. We now capture `message.labelIds` from the API and check:

- `SPAM` → spam (high)
- `CATEGORY_PROMOTIONS` → marketing (high)
- `CATEGORY_SOCIAL` → marketing (high)
- `CATEGORY_UPDATES` → marketing (medium)
- `CATEGORY_FORUMS` → marketing (medium)

**File:** `lib/gmail/classify.ts` → `checkGmailLabels()`

### Layer 3: RFC Headers (new)

Standard email headers that definitively identify mailing lists:

- `List-Unsubscribe` (RFC 2369) → marketing (high)
- `Precedence: bulk|list|junk` → marketing (high)

**File:** `lib/gmail/classify.ts` → `checkEmailHeaders()`

### Layer 4: Heuristic (enhanced)

Known marketing domains + sender patterns. Enhanced with body-level unsubscribe detection:

- noreply sender + unsubscribe in body → marketing
- 2+ unsubscribe patterns in body → marketing

**File:** `lib/gmail/classify.ts` → `isObviousMarketingOrNotification()`

### Layer 5: Sender Reputation (new, self-improving)

Learns from the chef's triage behavior:

- Dismissing emails from a domain increments `mark_done_count`
- 3+ dismissals with 0 replies and 0 inquiries → auto-classify as marketing
- Replying or creating inquiry from a domain → mark as trusted

**Files:**

- `lib/gmail/sender-reputation.ts` — `recordSenderAction()`, `checkSenderReputation()`
- `lib/communication/actions.ts` — records reputation on mark-done actions
- `supabase/migrations/20260330000019_sender_reputation.sql` — `email_sender_reputation` table

### Layer 6: Ollama AI (existing fallback)

Only runs when all deterministic layers miss. Uses `qwen3:4b` (fast tier) with the classification prompt.

## Data Flow

```
Gmail API (format=full)
  → getFullMessage() extracts: labelIds, List-Unsubscribe, Precedence
  → classifyEmail() checks layers 1-6 in order
  → First match wins → email is classified
  → spam/marketing → excluded from triage inbox
  → inquiry/personal/existing_thread → enters triage inbox
```

## Files Changed

| File                                                       | Change                                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `lib/google/types.ts`                                      | Added `labelIds`, `listUnsubscribe`, `precedence` to `ParsedEmail`           |
| `lib/gmail/client.ts`                                      | Extract 3 new fields from API response in `getFullMessage()`                 |
| `lib/gmail/classify.ts`                                    | Added layers 2-5, updated signature with optional `metadata` param           |
| `lib/gmail/sync.ts`                                        | Pass metadata to `classifyEmail()`                                           |
| `lib/gmail/sender-reputation.ts`                           | NEW — sender reputation tracking                                             |
| `lib/gmail/cleanup-spam.ts`                                | NEW — retroactive cleanup of existing spam                                   |
| `lib/communication/actions.ts`                             | Added reputation recording in `markCommunicationResolved` and `bulkMarkDone` |
| `supabase/migrations/20260330000019_sender_reputation.sql` | NEW — `email_sender_reputation` table                                        |

## Retroactive Cleanup

`cleanupExistingSpam()` in `lib/gmail/cleanup-spam.ts` resolves existing spam events from known marketing domains. Run once after deploying to clear the ~70 existing spam items.
