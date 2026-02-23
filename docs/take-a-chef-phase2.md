# TakeAChef Phase 2 — Lead Management, Transcripts & Auto-Onboarding

**Date:** 2026-02-23
**Branch:** `feature/risk-gap-closure`
**Depends on:** Phase 1 (commit `84f937c`)

---

## What This Phase Solves

Phase 1 automated the Gmail-to-ChefFlow pipeline — every TakeAChef email flows in. Phase 2 addresses the operational gaps email parsing alone can't solve:

1. **Lead stagnancy** — leads pile up with no accountability. Now every lead enters as "untouched" with time-based escalation (amber → orange → red → critical).
2. **Message blind spot** — TakeAChef emails say _that_ a message was sent, not _what_ was said. TakeAChef locks transcripts after inquiry close. Chefs can now bulk-paste conversations to preserve them forever.
3. **Menu confusion** — TakeAChef requires sending a generic menu just to open conversation. The real menu emerges from messages. ChefFlow now only records the final confirmed menu, with a nudge at booking confirmation.
4. **No auto-onboarding** — booking confirmation now triggers activity log nudges and queue items guiding the chef through next steps.

---

## Migration

**File:** `supabase/migrations/20260322000052_tac_phase2.sql`

```sql
-- Manual lead likelihood tag (hot/warm/cold)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS chef_likelihood TEXT
  CHECK (chef_likelihood IN ('hot', 'warm', 'cold'));

-- Index for stagnancy queries (untouched TakeAChef leads)
CREATE INDEX IF NOT EXISTS idx_inquiries_tac_stagnancy
  ON inquiries(tenant_id, status, channel, created_at)
  WHERE channel = 'take_a_chef' AND status = 'new';
```

---

## New Components

### TacAddressLead (`components/inquiries/tac-address-lead.tsx`)

Quick-action bar for NEW TakeAChef inquiries. Shows stagnancy state with time-based coloring:

- < 12h: amber "New lead"
- 12–24h: orange "Respond today!"
- > 24h: red "Stale lead"

Actions: "I'll Send a Menu" (→ awaiting_client), "Not Interested" (→ declined), "Open in TakeAChef" (external link).

### TacTranscriptPrompt (`components/inquiries/tac-transcript-prompt.tsx`)

Amber banner encouraging transcript paste. Shows when:

- Channel is `take_a_chef`
- Status is `awaiting_chef` or `quoted`
- < 3 TakeAChef messages exist in the thread

Dismissible per-inquiry via localStorage.

### TacTranscriptPaste (`components/inquiries/tac-transcript-paste.tsx`)

Modal dialog for bulk transcript paste:

1. Chef pastes raw TakeAChef conversation
2. Parser splits by "Name - Date" or "Name:" patterns
3. Preview shows chat bubbles with direction detection
4. On confirm, messages saved via `saveTacTranscript()` server action
5. Falls back to single `internal_note` if parsing fails

### LikelihoodToggle (`components/inquiries/likelihood-toggle.tsx`)

3-button inline toggle (Hot / Warm / Cold) for manual lead scoring. Click to set, click again to unset (reverts to computed score). Persisted to `inquiries.chef_likelihood` column.

### TacMenuNudge (`components/inquiries/tac-menu-nudge.tsx`)

Shown on confirmed TakeAChef inquiries with a linked event but no menu. Explains the TakeAChef menu workflow and offers "Create Menu" or "I'll do it later" (dismissible via localStorage).

---

## New Server Actions

### `saveTacTranscript()` — `lib/messages/tac-transcript-actions.ts`

Batch-inserts parsed transcript messages into the `messages` table:

- Channel: `take_a_chef`, Status: `logged`
- Zod-validated input (max 200 messages)
- Timestamps staggered by 1s when not parsed from transcript
- Non-blocking activity log

### `setInquiryLikelihood()` — `lib/inquiries/likelihood-actions.ts`

Simple column update for `chef_likelihood`. Nullable — set to `null` to revert to auto scoring. Tenant-scoped.

---

## Modified Files

### Inquiry Detail Page (`app/(chef)/inquiries/[id]/page.tsx`)

- LikelihoodToggle in badge row (TakeAChef only)
- TacAddressLead panel for `new` status
- TacStatusPrompt panel for `awaiting_chef` status (was orphaned from Phase 1)
- TacMenuNudge panel for `confirmed` status with linked event
- TacTranscriptPrompt before Communication Log card

### Inquiry List Page (`app/(chef)/inquiries/page.tsx`)

- Stagnancy badges on TakeAChef inquiry rows with time-based escalation
- Chef likelihood badges (Hot/Warm/Cold) when set
- Border color escalation (amber → orange → red)

### Dashboard Widget (`components/dashboard/tac-dashboard-widget.tsx`)

Transformed from stats-only display to actionable command center:

- **Untouched Leads** section with per-lead action buttons
- **Awaiting Response** section with TakeAChef links
- **Summary stats** row with clickable counts
- **Inquiry Volume** grid (Today/Yesterday/Week/Month)
- Stale count badge in header

### Priority Queue (`lib/queue/providers/inquiry.ts`)

- TakeAChef `new` inquiries: +0.15 impact weight, +20 score boost, 12h response window
- > 12h untouched: `high` urgency
- > 24h untouched: `critical` urgency with "STALE" label
- Custom titles: "New TakeAChef lead from {Name}"

### TakeAChef Stats (`lib/gmail/take-a-chef-stats.ts`)

- Added `untouchedCount` and `staleCount` to `TakeAChefStats`
- New `getTakeAChefActionableLeads()` function returning lead details for dashboard

### Gmail Sync (`lib/gmail/sync.ts`)

- Activity log after auto-event creation: "Auto-created event from TakeAChef booking — Next: create the final menu."

---

## Menu Strategy

TakeAChef requires sending a menu to open any conversation. This initial menu is a generic door-opener — same menu for everyone. The real menu emerges from the back-and-forth messages (client may see a menu 3 times before finalizing).

**Decision:** ChefFlow does NOT auto-create menus from TakeAChef data. Instead:

1. **Transcript captures menu evolution** — the paste feature preserves the conversation where menu decisions actually happen
2. **Menu nudge at booking confirmation** — prompts the chef to create the final menu only after the booking is locked in
3. **`convertInquiryToEvent` and sync handlers never auto-create menus** — always a chef decision

---

## UX Guidance System

Every TakeAChef component now includes inline guidance so a chef who has never seen it before understands what to do and why. The `tac-transcript-prompt` was the gold standard — all other components were brought up to match.

### Dashboard Widget — First-Run Welcome

`components/dashboard/tac-welcome-guide.tsx` — dismissible guide ("How TakeAChef Integration Works") shown inside the dashboard widget. 4 numbered steps explaining the full flow. Stored in `localStorage: chefflow:tac-welcome-dismissed`. Empty state also improved: says "Connect your Gmail" instead of "Connect your TakeAChef account".

### Address Lead — Urgency Context

Time-based subtitle explaining why speed matters:

- < 12h: "Respond within 12 hours to stay competitive"
- 12-24h: "They'll move on to another chef"
- \> 24h: "Waiting longer means losing the booking"

Button descriptions: "Send a Menu marks this as addressed", "Not Interested declines the lead".

### Status Prompt — Action Descriptions

Redesigned as a 2x2 grid with each button explaining what state change it triggers. "Still Discussing" = no change, "Sent Proposal" = moves to Quoted, "They Want to Book" = moves to Confirmed, "Changed Their Mind" = closes inquiry.

### Likelihood Toggle — Labels + Tooltips

Added "Your gut feel:" label. Each button has a native tooltip: Hot = "strong interest, good fit", Warm = "interested but undecided", Cold = "shopping around or poor fit".

### Transcript Paste — Destination Clarity

Added: "Messages will appear in the Communication Log — same place as emails and notes." Dialog subtitle explains HOW to copy from TakeAChef (Ctrl+A, copy, paste).

### Menu Nudge — Clearer Next Step

Button text: "Create Menu for This Event". Helper: "Opens the event page where you can build the final menu from scratch or use a template."

### Inquiry Detail — Workflow Guide

`components/inquiries/tac-workflow-guide.tsx` — collapsible 4-step workflow overview. Highlights "you are here" based on inquiry status. Dismissible via `localStorage: chefflow:tac-workflow-guide-dismissed`.

---

## Architecture Notes

- All new server actions follow the tenant-scoping-from-session pattern
- All side effects (activity logs) are non-blocking with try/catch
- Transcript paste uses existing `messages` table with `channel: 'take_a_chef'`
- Likelihood is orthogonal to status — a lead can be `awaiting_chef` but `cold`
- No new AI/Ollama dependencies — all features are deterministic
- Priority queue scoring is computed on read, no stored scores
