# Remy Session Awareness — Implementation Doc

> **Date:** 2026-02-27
> **Status:** Complete (Phase 2 — 2026-02-27)
> **Scope:** Full session awareness — time, navigation, mutations, errors, session duration, form-in-progress

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

**32 trackAction() calls added across 18 files:**

| File                                                 | Mutations Tracked                         |
| ---------------------------------------------------- | ----------------------------------------- |
| `components/events/event-nl-form.tsx`                | Event creation                            |
| `components/events/event-kanban-board.tsx`           | Kanban drag transitions                   |
| `components/events/event-transitions.tsx`            | Propose, confirm, start, complete, cancel |
| `components/events/record-payment-modal.tsx`         | Payment recording                         |
| `components/inquiries/inquiry-transitions.tsx`       | Status changes, convert, release, delete  |
| `components/inquiries/decline-with-reason-modal.tsx` | Inquiry decline                           |
| `components/expenses/expense-form.tsx`               | Manual entry, receipt upload              |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`   | Delete, duplicate                         |
| `app/(chef)/menus/[id]/menu-detail-client.tsx`       | Update, duplicate, delete, archive        |
| `components/clients/personal-info-editor.tsx`        | Personal info update                      |
| `components/finance/add-manual-transaction-form.tsx` | Manual transaction                        |
| `components/quotes/quote-form.tsx`                   | Quote create, update                      |
| `components/aar/aar-form.tsx`                        | AAR create, update                        |
| `components/staff/staff-member-form.tsx`             | Staff create, update                      |
| `components/calendar/calendar-entry-modal.tsx`       | Calendar entry creation                   |
| `components/goals/goal-check-in-modal.tsx`           | Goal check-in                             |
| `components/settings/preferences-form.tsx`           | Preferences update                        |
| `components/reviews/import-platform-review.tsx`      | Review import                             |

### 4. Error Awareness (Phase 2)

Remy sees the chef's last 5 errors this session. "I see you hit a connection error when saving that expense — let me help troubleshoot."

**Central tracking:** `lib/errors/map-error-to-ui.ts` — `mapErrorToUI()` now automatically calls `trackError()` for every error that goes through the centralized error handler. This captures all transition failures (events, quotes, inquiries) in one place.

**Targeted tracking in catch blocks:**

- `event-nl-form.tsx` — NL parsing failures, event creation errors
- `expense-form.tsx` — receipt extraction, expense creation, receipt save
- `aar-form.tsx` — AAR save failures
- `staff-member-form.tsx` — staff save failures
- `calendar-entry-modal.tsx` — entry creation failures

**System prompt section:** `RECENT ERRORS (this session):` — shows error message, context, and timestamp. Instructs Remy to proactively offer help.

### 5. Session Duration (Phase 2)

Remy knows how long the chef has been working this session. "You've been at it for 3 hours — want me to help you finish up faster?"

**Module:** `lib/ai/remy-activity-tracker.ts` — `initSessionTimer()` + `getSessionMinutes()`

**Wired in:** `components/ai/remy-drawer.tsx` — `initSessionTimer()` called on mount

**System prompt:** Shows `SESSION DURATION: 2h 15m`. If >2 hours, adds "grinding mode" note — Remy becomes more efficient and direct.

### 6. Form-in-Progress Awareness (Phase 2)

Remy knows when the chef is actively filling out a form. "I see you're working on a new quote — need help with pricing?"

**Module:** `lib/ai/remy-activity-tracker.ts` — `setActiveForm(label)` + `getActiveForm()`

**7 forms instrumented with mount/unmount hooks:**

| Form               | Label                          |
| ------------------ | ------------------------------ |
| EventNLForm        | "New Event (natural language)" |
| EventForm          | "New Event" / "Edit Event"     |
| QuoteForm          | "New Quote" / "Edit Quote"     |
| ExpenseForm        | "New Expense"                  |
| AARForm            | "New/Edit After-Action Review" |
| StaffMemberForm    | "New/Edit Staff Member"        |
| CalendarEntryModal | "New Calendar Entry"           |

**System prompt:** `CURRENTLY WORKING ON: "New Quote"` — Remy's answers become contextual to that form.

### 7. Fixed Gaps (from audit)

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
  → trackError() calls on failures (sessionStorage)
  → setActiveForm() on form mount/unmount (sessionStorage)
  → initSessionTimer() records session start (sessionStorage)

Chef sends message to Remy
  → getSessionActivity() reads all 5 channels from sessionStorage
  → Sent as recentPages, recentActions, recentErrors, sessionMinutes, activeForm in POST body
  → Server validates all fields in validateRemyRequestBody()
  → buildRemySystemPrompt() injects into system prompt conditionally
  → Ollama receives full context
```

---

## System Prompt Sections (complete)

The system prompt now includes (when data is available):

- `CURRENT TIME:` — always present
- `TODAY'S DAILY PLAN:` — when dailyPlan has items
- `EMAIL INBOX:` — when emailDigest has emails
- `NAVIGATION TRAIL (this session):` — when pages visited
- `RECENT ACTIONS (this session):` — when mutations tracked
- `RECENT ERRORS (this session):` — when errors occurred
- `SESSION DURATION:` — when >0 minutes (with "grinding mode" >2h)
- `CURRENTLY WORKING ON:` — when chef is mid-form

## Future Improvements

- Consider adding `trackAction()` to `useFormAction()` hook if one is created
- Could add "time on page" to navigation trail for richer context
- Could track which form fields the chef has filled in for even more contextual help
