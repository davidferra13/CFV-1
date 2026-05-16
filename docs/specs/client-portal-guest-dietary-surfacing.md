# Client Portal Guest Dietary Surfacing

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test (2026-05-16)
> **Depends On:** None (dinner circles and dietary collection already built)

---

## Problem Statement

Dinner circles already collect guest dietary restrictions via token-based links (no login required). But the client hosting the event doesn't know this exists. There's no prominent "Collect your guests' dietary info" action in the client portal. The feature is built; it's just buried.

A client hosting 20 people needs to send ONE link and have every guest fill in their own allergies, preferences, and restrictions. Then see a summary before the chef finalizes the menu.

---

## Solution

### 1. "Invite Guests" Action on Client Portal Event Page

On the client portal event page (`app/client/[token]/page.tsx`), add a prominent card after event confirmation:

- Headline: "Help [Chef] plan the perfect menu"
- Subtext: "Share this link with your guests so they can submit dietary needs and preferences"
- One-click copy of the dinner circle guest link
- Native share sheet button (mobile)
- Guest count tracker: "4 of 20 guests have responded"
- Deadline suggestion: "We recommend collecting responses by [7 days before event]"

### 2. Guest Dietary Summary View

On the same portal page, below the invite card:

- Summary table: allergies (count), vegetarian (count), vegan (count), gluten-free (count), no restrictions (count)
- Expandable detail: each guest's name + their specific restrictions
- "All guests responded" green checkmark when complete
- This data already exists in the circle; this is a read-only display

### 3. Chef-Side Visibility

Chef already sees circle dietary data. Add a nudge on the event detail page:

- "3 of 20 guests have submitted dietary info. Send a reminder?" (one-click reminder to circle)
- Dietary summary card matches what the client sees (same data, same format)

### Files Likely Touched

- `app/client/[token]/page.tsx` (add guest invite card + dietary summary)
- `components/client-portal/guest-invite-card.tsx` (new)
- `components/client-portal/dietary-summary-panel.tsx` (new)
- `lib/dinner-circles/guest-dietary-summary.ts` (new, aggregate query)
- `lib/lifecycle/trigger-engine.ts` (add dietary collection reminder at confirmation)
- `app/(chef)/events/[id]/page.tsx` (add dietary progress nudge)

---

## Verification

- [ ] Client portal shows "Invite Guests" card after event confirmation
- [ ] Share link generates correct dinner circle guest token
- [ ] Guest count tracker updates as guests respond
- [ ] Dietary summary displays accurate aggregation
- [ ] Chef sees matching dietary summary on event detail
- [ ] Reminder action sends circle notification to non-responders
