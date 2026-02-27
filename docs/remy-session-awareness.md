# Remy Session Awareness — Implementation Doc

> **Date:** 2026-02-27
> **Status:** Complete
> **Scope:** Make Remy fully aware of the chef's in-session activity, current time, and browsing history

---

## What Changed

### 1. Timestamp Awareness

Remy now knows the current time, day of week, and date. This enables time-aware responses like "You've got 3 events this week" or "It's late — want me to save this as a draft?"

**Where:** `app/api/remy/stream/route.ts` — `buildRemySystemPrompt()` injects `CURRENT TIME: 2:30 PM on Thursday, February 27, 2026`

### 2. Navigation Breadcrumb Trail

Remy sees the chef's last 10 page visits this session. Instead of only knowing the current page, Remy can now say "I see you've been looking at events and recipes — are you prepping for something?"

**New module:** `lib/ai/remy-activity-tracker.ts`

- `trackPageVisit(pathname)` — records visits to sessionStorage, deduplicates consecutive visits
- `labelForPath(path)` — maps pathnames to human-readable labels (40+ static routes + dynamic UUID detection)
- `getNavTrail()` — returns the trail

**Wired in:** `components/ai/remy-drawer.tsx` — useEffect tracks pathname changes

### 3. Recent Mutations Tracker

Remy sees the chef's last 10 actions (create/update/delete) this session. "I see you just created an expense for Whole Foods — want me to check your margins on that event?"

**Same module:** `lib/ai/remy-activity-tracker.ts`

- `trackAction(action, entity)` — records mutations to sessionStorage
- `getRecentActions()` — returns the list
- `getSessionActivity()` — combined getter for API requests

**20 trackAction() calls added across 10 files:**

| File                                                 | Mutations Tracked                         |
| ---------------------------------------------------- | ----------------------------------------- |
| `components/events/event-nl-form.tsx`                | Event creation                            |
| `components/events/event-kanban-board.tsx`           | Kanban drag transitions                   |
| `components/events/event-transitions.tsx`            | Propose, confirm, start, complete, cancel |
| `components/events/record-payment-modal.tsx`         | Payment recording                         |
| `components/inquiries/inquiry-transitions.tsx`       | Status changes, convert, release, delete  |
| `components/expenses/expense-form.tsx`               | Manual entry, receipt upload              |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`   | Delete, duplicate                         |
| `app/(chef)/menus/[id]/menu-detail-client.tsx`       | Update, duplicate, delete, archive        |
| `components/clients/personal-info-editor.tsx`        | Personal info update                      |
| `components/finance/add-manual-transaction-form.tsx` | Manual transaction                        |

### 4. Fixed Gaps (from audit)

- **dailyPlan** — was loaded by `remy-context.ts` but never injected into the streaming route's system prompt. Now injected.
- **emailDigest** — was in the old `remy-actions.ts` but missing from the streaming route. Now injected.

### 5. Input Validation

All new fields validated server-side in `lib/ai/remy-input-validation.ts`:

- `recentPages`: max 10 entries, path capped at 200 chars, label at 100 chars
- `recentActions`: max 10 entries, action at 100 chars, entity at 200 chars

### 6. System Prompt Sections

The system prompt now includes (when data is available):

- `CURRENT TIME:` — always present
- `TODAY'S DAILY PLAN:` — when dailyPlan has items
- `EMAIL INBOX:` — when emailDigest has emails
- `NAVIGATION TRAIL (this session):` — when pages visited
- `RECENT ACTIONS (this session):` — when mutations tracked

Grounding rule updated to reference all new data sources.

---

## Privacy

All session data stays in `sessionStorage` (cleared on tab close). Data only leaves the browser when the chef sends a message to Remy, at which point the trail is included in the request — consistent with the existing privacy architecture.

---

## Architecture

```
Chef uses the app
  → useEffect tracks page visits (sessionStorage)
  → trackAction() calls after mutations (sessionStorage)

Chef sends message to Remy
  → getSessionActivity() reads sessionStorage
  → Sent as recentPages + recentActions in POST body
  → Server validates via validateRecentPages/validateRecentActions
  → buildRemySystemPrompt() injects into system prompt
  → Ollama receives full context
```

---

## Future Improvements

- Add trackAction() to more mutation points (staff assignment, quote sending, settings changes)
- Consider adding `trackAction()` to `useFormAction()` hook if one is created
- Could add "time on page" to navigation trail for richer context
