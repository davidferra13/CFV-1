# Critical Path Tracking & Dinner Circle Onboarding

> **Date:** 2026-03-30
> **Spec:** `docs/specs/critical-path-and-dinner-circle-onboarding.md`

## What Changed

Two features built on existing infrastructure:

### 1. Critical Path Tracker

Every inquiry/event now has a visible 10-item go/no-go checklist computed from existing data:

| #   | Key              | What It Checks                                                           |
| --- | ---------------- | ------------------------------------------------------------------------ |
| 1   | host_name        | Contact name on inquiry                                                  |
| 2   | host_contact     | Email or phone (either satisfies)                                        |
| 3   | event_date       | Confirmed date                                                           |
| 4   | event_address    | Street-level address (heuristic: needs street number + ZIP or 2+ commas) |
| 5   | guest_count      | Non-zero guest count                                                     |
| 6   | allergies        | Life-threatening allergies confirmed                                     |
| 7   | dietary          | Dietary restrictions on file                                             |
| 8   | menu_confirmed   | Event menu status is 'confirmed' or 'locked'                             |
| 9   | service_time     | Time component on confirmed_date or event start_time                     |
| 10  | deposit_received | Ledger entry with category 'deposit' or 'payment'                        |

The card appears as the first element on every inquiry detail page. Collapsible, shows progress bar, groups blockers by stage (quote, shopping, menu lock, service day).

### 2. Dinner Circle Client Status

When a client visits their Dinner Circle (public `/hub/g/{token}` URL), they now see a status banner above the tabs showing:

- Confirmed items (green checks with values)
- Missing items (what the chef still needs)
- Call-to-action to reply in chat or email

Item #10 (deposit/payment) is never shown to guests.

### 3. Reply Composer Integration

The response composer now has:

- "Include Dinner Circle link" toggle (on by default for first responses, off for subsequent)
- Auto-appends a casual invitation paragraph with the `/hub/g/{token}` URL
- Chef can edit or remove the invitation before sending
- Four template styles: casual, formal, minimal, enthusiastic

## Files Created

| File                                          | Purpose                                                             |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `lib/lifecycle/critical-path.ts`              | `getCriticalPath()` (chef) and `getCriticalPathForGuest()` (public) |
| `lib/lifecycle/dinner-circle-templates.ts`    | Email invitation templates (4 styles)                               |
| `components/lifecycle/critical-path-card.tsx` | Chef-facing critical path UI                                        |
| `components/hub/circle-client-status.tsx`     | Guest-facing status banner                                          |

## Files Modified

| File                                                 | What Changed                                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `app/(chef)/inquiries/[id]/page.tsx`                 | Added critical path fetch + card rendering, passed circle props to composer |
| `app/(public)/hub/g/[groupToken]/page.tsx`           | Added guest status fetch                                                    |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | Added CircleClientStatus banner above tabs                                  |
| `components/inquiries/inquiry-response-composer.tsx` | Added Dinner Circle invitation toggle + auto-append                         |

## No Database Changes

Critical path is computed on-the-fly from existing columns. No new tables, no new columns, no migrations.
