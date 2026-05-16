# One-Click Rebook

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test (2026-05-16)
> **Depends On:** None (circle-rebook-button exists, event data exists)

---

## Problem Statement

Client had an amazing anniversary dinner. Husband's birthday is in 3 months. She wants the same chef, similar vibe, maybe a different menu. But she'd have to go through the full inquiry flow again like a stranger.

Repeat clients should never feel like first-timers. The system knows everything: their dietary needs, their address, their guest count patterns, their chef, their preferences. Use it.

---

## Solution

### 1. "Book Again" Button on Client Portal

On any completed event in the client portal:

- Prominent "Book Again with [Chef]" button
- Pre-fills a new inquiry/event with:
  - Same chef (locked)
  - Same location (editable)
  - Same guest count (editable)
  - Known dietary restrictions (pre-loaded from circle/profile)
  - Previous menu available as "Start from last menu" option
  - Client contact info (already known)
- Client only needs to add: new date, occasion, any changes
- Submit creates inquiry in "fast-track" mode (chef sees "Repeat Client" badge)

### 2. Chef-Side Repeat Client Intelligence

When a repeat client inquiry arrives:

- "Repeat Client" badge on inquiry card with event history count
- Link to past events with menus, notes, dietary data, spend history
- Suggested menu: "Last time you served [Menu Name]. Reuse or start fresh?"
- Auto-populated quote draft based on previous pricing (adjusted for current costs via PIE)
- Response time expectation: repeat clients should get sub-12h response (priority queue bump)

### 3. Seasonal Rebook Prompts

For clients who've booked annually recurring events (anniversary, birthday, holiday):

- 60 days before the anniversary of their last event, send a gentle prompt:
  - "Your anniversary dinner with [Chef] was a year ago. Planning this year's celebration?"
  - One-click "Yes, book again" -> pre-filled rebook flow
  - "Not this year" -> no further prompts for 11 months
- Chef can enable/disable seasonal prompts per client
- Only triggers for events rated 4+ stars (don't prompt unhappy clients)

### Files Likely Touched

- `app/client/[token]/page.tsx` (add "Book Again" button on completed events)
- `components/client-portal/rebook-button.tsx` (new, pre-fill logic)
- `lib/events/rebook-actions.ts` (new, clone event data into new inquiry)
- `lib/inquiries/actions.ts` (accept pre-fill data, set repeat-client flag)
- `components/inquiries/repeat-client-badge.tsx` (new)
- `components/inquiries/past-event-context-panel.tsx` (new, shows history on inquiry detail)
- `lib/lifecycle/seasonal-rebook.ts` (new, detect annual patterns, schedule prompts)
- `lib/email/templates/seasonal-rebook-prompt.tsx` (new)
- `lib/queue/providers/inquiry.ts` (priority bump for repeat clients)

---

## Verification

- [ ] "Book Again" button appears on completed events in client portal
- [ ] New inquiry pre-fills location, guest count, dietary, contact info from past event
- [ ] Chef sees "Repeat Client" badge with event history link
- [ ] Quote draft auto-populates from previous pricing
- [ ] Repeat client inquiry gets priority queue bump
- [ ] Seasonal rebook prompt fires 60 days before annual anniversary
- [ ] "Not this year" suppresses prompts for 11 months
- [ ] Only events rated 4+ stars trigger seasonal prompts
