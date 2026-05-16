# Referrer Circle Visibility

> **Status:** SPEC-READY
> **Priority:** P2
> **Origin:** "Picky Client" persona stress test (2026-05-16)
> **Depends On:** Inquiry-to-Booking Orchestration (referral deep link)

---

## Problem Statement

The daughter introduced her mother to the chef. She raved about the food. She played telephone for six weeks. Then she was cut out entirely and never heard what happened.

Did mom book? Was the event good? Should she refer more people?

The referrer is the most valuable node in the chef's network, and ChefFlow gives them zero feedback. Referrers who feel ignored stop referring. Referrers who feel appreciated become a growth engine.

---

## Solution: Referrer Lifecycle Notifications

When a referral results in a booking, the referrer gets lightweight, privacy-respecting updates at key milestones.

### Notification Triggers

| Event                           | Referrer Notification                                          | Privacy Rule                        |
| ------------------------------- | -------------------------------------------------------------- | ----------------------------------- |
| Referred client submits inquiry | "Your referral to [Chef] was received! We'll keep you posted." | No client details shared            |
| Inquiry converts to booking     | "[Chef] booked an event thanks to your referral!"              | Occasion type only, no date/details |
| Event completed                 | "The event you helped make happen was a success! Thank you."   | No specifics                        |
| Client leaves a review          | "Your referral left a [5-star] review for [Chef]!"             | Only if review is public            |
| Referral reward earned          | "You've earned [X] for your referral."                         | If rewards system active            |

### Privacy Controls

- Referrer NEVER sees: client's full name, event date, address, guest count, pricing, menu details, or any private communication
- Client can opt out of referrer notifications entirely ("Don't notify my referrer")
- Chef can disable referrer notifications globally or per-event
- Notifications are informational only; no links to the client's portal or event details

### Referrer Dashboard Enhancement

**What exists:** `app/(client)/my-referrals/page.tsx` with stats (invited, signed up, points).

**What to add:**

- Status progression per referral: `referred -> inquired -> booked -> completed`
- Visual status badges (not just counts)
- "Thank you" message display when rewards are earned
- Total impact metric: "You've helped [Chef] book [N] events"

### Referrer Appreciation Flow

After event completion, if the referrer is in the chef's dinner circle:

- Chef gets a prompt: "Send a thank-you to [Referrer] for this referral?"
- One-click sends a personalized thank-you (template with chef customization)
- Optional: small gesture (discount on next booking, priority booking window)

### Files Likely Touched

- `lib/referrals/referrer-notifications.ts` (new, milestone notification logic)
- `lib/email/templates/referrer-milestone.tsx` (new, lightweight notification template)
- `lib/lifecycle/trigger-engine.ts` (add referrer notification triggers at booking + completion)
- `app/(client)/my-referrals/page.tsx` (enhance with status progression)
- `components/referrals/referral-status-timeline.tsx` (new)
- `lib/referrals/client-referral-actions.ts` (add status progression queries)
- `lib/referrals/appreciation-actions.ts` (new, thank-you flow)
- `components/events/referrer-thank-you-prompt.tsx` (new, post-event chef prompt)

---

## What This Does NOT Cover

- Referrer access to client's portal or event details (strict privacy boundary)
- Multi-level referral chains (referrer of referrer)
- Public referral leaderboards (privacy concern)
- Monetary referral commissions (separate from rewards system)

---

## Verification

- [ ] Referral inquiry submission triggers "received" notification to referrer
- [ ] Booking confirmation triggers "booked" notification to referrer
- [ ] Event completion triggers "success" notification to referrer
- [ ] Client can opt out of referrer notifications
- [ ] Chef can disable referrer notifications globally
- [ ] Referrer dashboard shows status progression per referral
- [ ] Post-event thank-you prompt appears for chef
- [ ] No private client data leaks to referrer in any notification
