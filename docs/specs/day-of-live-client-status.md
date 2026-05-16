# Day-Of Live Client Status

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test (2026-05-16)
> **Depends On:** Live Service Execution Tracker (LIFECYCLE #19, already in queue)

---

## Problem Statement

It's 3:15pm. Chef was supposed to arrive at 3:00pm. Client is panicking. No text. No status. No way to know if the chef is running late, stuck in traffic, or forgot entirely.

The Live Service Execution Tracker (queue #19) handles chef-side day-of tracking. This spec adds the CLIENT-FACING view: a simple, real-time status page the client can check instead of calling the chef mid-prep.

---

## Solution

### 1. Client-Facing Day-Of Status Page

On event day, the client portal event page transforms into a live status view:

| Chef Status | Client Sees                                                       |
| ----------- | ----------------------------------------------------------------- |
| Not started | "Your chef is preparing for tonight. Arrival expected at [time]." |
| En route    | "Your chef is on the way. ETA: [time]."                           |
| Arrived     | "Your chef has arrived and is setting up."                        |
| Prepping    | "Prep is underway. Dinner on track for [service time]."           |
| Cooking     | "Your dinner is being prepared."                                  |
| Plating     | "Almost ready. Dishes are being plated."                          |
| Serving     | "Enjoy your meal!"                                                |
| Cleaning up | "Your chef is cleaning up. Almost done."                          |
| Complete    | "All done. Thank you for a wonderful evening."                    |

### 2. Status Updates from Chef

Chef updates their status via the existing Live Service Execution Tracker (mobile-optimized):

- One-tap status transitions (en route -> arrived -> prepping -> etc.)
- Optional ETA update when en route
- Optional brief note ("Running 10 min late, traffic on 495")
- Notes are visible to client on the status page

### 3. Delay Notification

If the chef is more than 15 minutes past expected arrival and hasn't updated status:

- System sends client a proactive message: "[Chef] may be running a few minutes behind. We'll update you as soon as we hear from them."
- Simultaneously nudges chef: "Your client is expecting you. Update your status?"
- This prevents the client from panicking AND prompts the chef to communicate

### 4. No Constant Notifications

The client checks the status page when THEY want to. No push notification for every status change (that's annoying). Only notify for:

- Delay (>15 min past ETA without update)
- Arrival confirmation
- Completion

### Files Likely Touched

- `app/client/[token]/page.tsx` (transform to live status view on event day)
- `components/client-portal/day-of-live-status.tsx` (new, real-time status display)
- `lib/events/live-status-client.ts` (new, client-facing status queries)
- `lib/events/delay-detection.ts` (new, 15-min delay logic + notifications)
- `lib/email/templates/delay-notification.tsx` (new, proactive delay message)
- `lib/lifecycle/trigger-engine.ts` (add delay detection trigger)
- Reuses SSE infrastructure for real-time updates (already built for other features)

---

## Verification

- [ ] Client portal shows live status on event day
- [ ] Status updates from chef reflect in client view within 30 seconds
- [ ] Delay notification fires at 15 min past ETA without chef update
- [ ] Chef receives nudge when delay notification fires
- [ ] Client only gets notified for: delay, arrival, completion
- [ ] ETA and chef notes display on client status page
- [ ] Status page works on mobile (primary use case)
