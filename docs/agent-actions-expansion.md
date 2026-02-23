# Agent Actions Expansion — 2026-02-22

## Summary

Expanded Remy's agent action registry from **15 actions** (across 7 domains) to **47+ actions** (across 17 domains). This makes Remy a comprehensive assistant that can help with nearly every area of the ChefFlow platform.

## What Changed

### New Action Files Created

| File                        | Actions          | Domain                                                                                                                                                        |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `menu-edit-actions.ts`      | 8                | Update menu, add/update dish, add component, duplicate menu, save as template, send for approval, transition menu status                                      |
| `draft-email-actions.ts`    | 1 (10 sub-types) | Thank-you, referral request, testimonial request, quote cover letter, decline, cancellation, payment reminder, re-engagement, milestone, food safety incident |
| `event-ops-actions.ts`      | 8                | Clone event, save debrief, complete safety checklist, record tip, log mileage, log alcohol, generate prep timeline, acknowledge scope drift                   |
| `staff-actions.ts`          | 3                | Create staff member, assign staff to event, record staff hours                                                                                                |
| `notes-tags-actions.ts`     | 4                | Add client note, add/remove client tag, add inquiry note                                                                                                      |
| `calendar-actions.ts`       | 2                | Create calendar entry, update calendar entry                                                                                                                  |
| `financial-call-actions.ts` | 5                | Update expense, log call outcome, cancel call, decline inquiry, update inquiry                                                                                |
| `grocery-actions.ts`        | 2                | Run grocery price quote, log actual grocery cost                                                                                                              |
| `proactive-actions.ts`      | 4                | "What's next?" suggestions, add emergency contact, create document folder, search documents                                                                   |

### Updated Files

| File                                          | Change                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `agent-actions/index.ts`                      | Imports and registers all 9 new action modules                                       |
| `components/ai/remy-drawer.tsx`               | Added drag-to-resize from left edge (320px–800px range, persisted in sessionStorage) |
| `components/public/remy-concierge-widget.tsx` | Already had resize handles — no changes needed                                       |

## Architecture

All actions follow the established pattern:

- **Tier 2** (chef must approve before execution) — no tier 1 write actions
- **executor()** — Parses natural language via Ollama, resolves entities (clients, events, menus), builds a preview card
- **commitAction()** — Executes on chef approval, calls the actual server action
- **Safety levels**: `reversible` for most, `significant` for state transitions and financial ops

## Proactive "What's Next?" Feature

The `agent.whats_next` action queries the chef's current state and suggests the most important next action:

1. **Overdue tasks** (highest priority)
2. **Unanswered inquiries**
3. **Upcoming events needing prep**
4. **Completed events needing debrief**

If all clear, suggests marketing outreach or recipe development.

## Remy Drawer Resize

The in-app Remy chat drawer now supports drag-to-resize:

- Grab the left edge of the drawer and drag to resize
- Width range: 320px (min) to 800px (max)
- Width persisted in `sessionStorage` so it stays during the session
- Hover effect on resize handle for discoverability

## What Remy Can Now Do (Complete List)

### Original (15 actions)

- Create/update/transition events
- Create/update/invite clients
- Create/transition inquiries, convert to events
- Create/update recipes, add ingredients
- Create menus, link to events
- Create/transition quotes
- Schedule calls, create todos, log expenses
- 5 restricted actions (ledger, roles, delete, email send, refund)

### New (32+ actions)

- Update menus, add/update dishes, add components
- Duplicate menus, save as templates
- Send menus for client approval, transition menu status
- Draft 10 types of emails (thank-you through food safety incident)
- Clone events to new dates
- Save debrief reflections for completed events
- Complete safety checklists
- Record tips and log mileage
- Log alcohol served at events
- Generate AI prep timelines
- Acknowledge scope drift
- Create staff members, assign to events, record hours
- Add client notes, add/remove client tags
- Add inquiry notes
- Create calendar entries (blocked/available/personal/travel)
- Update expenses, log call outcomes, cancel calls
- Decline and update inquiries
- Run grocery price quotes, log actual grocery costs
- Proactive "What's next?" suggestions
- Add emergency contacts
- Create document folders, search documents
