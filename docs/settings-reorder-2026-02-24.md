# Settings Page Reorder — 2026-02-24

## What Changed

Reordered all 20 settings categories on `/settings` for better information architecture. No functionality changed — purely a display order update.

## Why

The original order had related categories scattered apart:

- Availability Rules (#6), Booking Page (#7), and Event Configuration (#8) were separated by 4 unrelated categories
- Notifications & Alerts was buried at #16, below rarely-used items like Desktop App and Chef Network
- AI & Privacy was `defaultOpen` at #4, giving it outsized prominence for a set-once category
- Desktop App was stranded mid-page between daily-use categories

## New Order (with rationale)

| Zone                          | Categories                                                                                                                           | Why here                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **Setup (1-6)**               | Business Defaults, Profile & Branding, Availability Rules, Booking Page, Event Configuration, Payments & Billing                     | Day-one setup items. Identity, scheduling, events, money.                        |
| **Daily ops (7-12)**          | Communication & Workflow, Notifications & Alerts, Connected Accounts & Integrations, AI & Privacy, Client Reviews, Appearance        | Things chefs interact with regularly or revisit periodically.                    |
| **Aspirational/rare (13-20)** | Professional Growth, Chef Network, Legal & Protection, Sample Data, API & Developer, Desktop App, Share Feedback, Account & Security | Niche, power-user, or one-time items. Destructive actions (delete account) last. |

## Old → New Mapping

| Old # | Category                          | New # |
| ----- | --------------------------------- | ----- |
| 1     | Business Defaults                 | 1     |
| 2     | Payments & Billing                | 6     |
| 3     | Profile & Branding                | 2     |
| 4     | AI & Privacy                      | 10    |
| 5     | Connected Accounts & Integrations | 9     |
| 6     | Availability Rules                | 3     |
| 7     | Booking Page                      | 4     |
| 8     | Event Configuration               | 5     |
| 9     | Communication & Workflow          | 7     |
| 10    | Professional Growth               | 13    |
| 11    | Legal & Protection                | 15    |
| 12    | Client Reviews                    | 11    |
| 13    | Chef Network                      | 14    |
| 14    | Desktop App                       | 18    |
| 15    | Appearance                        | 12    |
| 16    | Notifications & Alerts            | 8     |
| 17    | Sample Data                       | 16    |
| 18    | Share Feedback                    | 19    |
| 19    | API & Developer                   | 17    |
| 20    | Account & Security                | 20    |

## Other Changes

- Removed `defaultOpen` from AI & Privacy (was position #4, now #10 — no longer needs auto-expand)
- Added numbered section comments (`{/* -- 1. Business Defaults -- */}`) for maintainability
- Business Defaults retains `defaultOpen` as the first category

## Files Modified

- `app/(chef)/settings/page.tsx` — category render order
- `docs/app-complete-audit.md` — settings table updated to match new order
