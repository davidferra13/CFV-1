# System Integrity Question Set: Calendar & Scheduling

> 50 binary pass/fail questions across 10 domains.
> Executed 2026-04-17. Sweep covers availability, booking, calendar feeds, event timing, and scheduling logic.

---

## Domain A: Availability & Blocking (5 questions)

| #   | Question                                            | P/F  | Evidence                                                                                                                                                     |
| --- | --------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Does `blockDate` validate input with Zod?           | PASS | `actions.ts:20-26` BlockDateSchema validates date format regex, block_type enum, optional start/end time and reason.                                         |
| A2  | Does `unblockDate` prevent deleting auto-blocks?    | PASS | `actions.ts:82`: `.eq('is_event_auto', false)` filter. Only manual blocks can be manually removed.                                                           |
| A3  | Does `autoBlockEventDate` enforce tenant isolation? | PASS | `actions.ts:94-98`: verifies `chefId` matches session user's `tenantId` or `entityId`. Throws on mismatch.                                                   |
| A4  | Is auto-block creation idempotent?                  | PASS | `actions.ts:102-109`: checks existing block by `chef_id + event_id` before inserting. Returns silently if already blocked.                                   |
| A5  | Does event cancellation remove auto-blocks?         | PASS | `actions.ts:124-131`: `removeEventAutoBlock(eventId)` deletes blocks with `is_event_auto=true` for that event_id. Called from `transitionEvent()` on cancel. |

## Domain B: Scheduling Rules (5 questions)

| #   | Question                                                          | P/F  | Evidence                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Does `validateDateAgainstRules` enforce all 6 rule types?         | PASS | `rules-actions.ts:102-257`: (1) day-of-week block, (2) min lead days, (3) min buffer days, (4) max events/week, (5) max events/month, (6) preferred days advisory. All verified with correct logic. |
| B2  | Does day-of-week check use UTC noon to avoid DST boundary issues? | PASS | `rules-actions.ts:128`: `new Date(date + 'T12:00:00Z')` and `getUTCDay()`. Noon UTC prevents midnight DST flip.                                                                                     |
| B3  | Does rule validation exclude cancelled events from counts?        | PASS | `rules-actions.ts:163,196,224`: all event count queries use `.not('status', 'in', '("cancelled")')`.                                                                                                |
| B4  | Does rule validation support exclude-self for edit mode?          | PASS | `rules-actions.ts:167,200,229`: `excludeEventId` parameter applied to buffer, week, and month queries via `.neq('id', excludeEventId)`.                                                             |
| B5  | Are rules upserted with conflict-on-tenant_id (not insert)?       | PASS | `rules-actions.ts:73-84`: `.upsert({...}, { onConflict: 'tenant_id' })`. One rule set per chef, never duplicates.                                                                                   |

## Domain C: Conflict Detection (5 questions)

| #   | Question                                                            | P/F  | Evidence                                                                                                                                                         |
| --- | ------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Does `checkDateConflicts` check both manual blocks AND events?      | PASS | `actions.ts:238-249`: parallel queries for `chef_availability_blocks` and `events` on same date. Both contribute to warnings.                                    |
| C2  | Does `checkDateConflicts` merge scheduling rules validation?        | PASS | `actions.ts:288-299`: imports and calls `validateDateAgainstRules()`, merges blockers and warnings with `[Rule]` prefix. Catches errors for missing rules table. |
| C3  | Does series session conflict detection handle time-window overlaps? | PASS | `actions.ts:394-396`: `buildWindowMinutes()` converts start/end to minutes, `overlapsWindowMinutes()` detects overlap. Not just same-date but same-time-window.  |
| C4  | Does `checkBookingConflict` check daily AND weekly limits?          | PASS | `capacity-planning-actions.ts:521`: checks blocked days, daily max, weekly max, and time-block overlap against existing events.                                  |
| C5  | Does overlap detection use a sweep-line algorithm?                  | PASS | `overlap-detection.ts:29`: sorts ranges by start, sweeps with active set, returns `OverlapPair[]`. O(n log n) correctness.                                       |

## Domain D: Calendar Feed (iCal) (5 questions)

| #   | Question                                                          | P/F  | Evidence                                                                                                                                                  |
| --- | ----------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Is the iCal feed rate-limited?                                    | PASS | `route.ts:19-23`: `checkRateLimit('ical-feed:${token}', 60, 60_000)`. 60 requests/minute per token.                                                       |
| D2  | Does the feed validate token + enabled flag?                      | PASS | `route.ts:28-37`: queries chefs table by `ical_feed_token` AND `ical_feed_enabled = true`. Returns 404 if not found or disabled.                          |
| D3  | Does the feed use `private` Cache-Control to prevent CDN caching? | PASS | `route.ts:80-81`: `'Cache-Control': 'private, max-age=300'`. Comment explains: "The feed URL contains a secret token."                                    |
| D4  | Does ICS generation properly escape special characters?           | PASS | `route.ts:88-89`: `escapeIcs()` escapes backslash, semicolon, comma, newline. RFC 5545 compliant.                                                         |
| D5  | Does the feed map event statuses to correct ICS STATUS values?    | PASS | `route.ts:121-130`: draft/proposed -> TENTATIVE, accepted/paid/confirmed/in_progress/completed -> CONFIRMED, cancelled -> CANCELLED. All 8 states mapped. |

## Domain E: Rescheduling (5 questions)

| #   | Question                                               | P/F  | Evidence                                                                                                                         |
| --- | ------------------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Does rescheduling enforce status restrictions?         | PASS | `reschedule-action.ts:10,35-39`: `RESCHEDULABLE_STATUSES = ['draft', 'proposed', 'accepted', 'paid']`. Confirmed+ events locked. |
| E2  | Does rescheduling verify tenant ownership?             | PASS | `reschedule-action.ts:30-31`: `if (event.tenant_id !== user.tenantId) return error 'Unauthorized'`.                              |
| E3  | Does rescheduling validate date format?                | PASS | `reschedule-action.ts:43-44`: regex `/^\d{4}-\d{2}-\d{2}$/` validation.                                                          |
| E4  | Does rescheduling handle no-op (same date) gracefully? | PASS | `reschedule-action.ts:48-49`: `if (event.event_date === newDate) return { success: true }`. No unnecessary DB write.             |
| E5  | Does rescheduling trigger Google Calendar re-sync?     | PASS | `reschedule-action.ts:62-70`: `syncEventToGoogleCalendar(eventId)` in non-blocking try/catch.                                    |

## Domain F: Calendar Aggregation (5 questions)

| #   | Question                                                          | P/F  | Evidence                                                                                                                                                               |
| --- | ----------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Does the unified calendar aggregate all 7 item types?             | PASS | `calendar/actions.ts:48-56`: `UnifiedCalendarItemType` union: event, prep_block, call, availability_block, waitlist, calendar_entry, inquiry.                          |
| F2  | Does the calendar handle date objects from postgres.js correctly? | PASS | `calendar/actions.ts:32-35`: `dateFieldToISO()` checks `instanceof Date` and normalizes to `YYYY-MM-DD`. Handles both Date and string types from postgres.js 3.x.      |
| F3  | Does the color system cover all calendar item types?              | PASS | `colors.ts:25-71`: 30+ color entries covering events (3 statuses), prep (10 types), calls, personal (3), business (7), intentions (2), leads (2), availability blocks. |
| F4  | Does drag-to-reschedule use optimistic updates?                   | PASS | Per explore agent: `unified-calendar-view.tsx:193` `handleEventDrop()` with optimistic update + `rescheduleEvent()` call.                                              |
| F5  | Does the calendar pre-fetch data server-side?                     | PASS | `calendar/page.tsx`: pre-fetches current month +/- 7 days via `getUnifiedCalendar()`. Client component re-fetches on view range change.                                |

## Domain G: Availability Sharing (5 questions)

| #   | Question                                                      | P/F  | Evidence                                                                                                                                                                       |
| --- | ------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | Does share token generation use cryptographic randomness?     | PASS | `availability-share-actions.ts:35-36`: `crypto.randomBytes(16).toString('hex')`. 128-bit entropy.                                                                              |
| G2  | Does the public availability endpoint expose NO private data? | PASS | `availability-share-actions.ts:115-118`: returns only `date + available boolean + chefDisplayName`. No client names, financials, or event details.                             |
| G3  | Does the public endpoint validate token active + expiry?      | PASS | `availability-share-actions.ts:136-141`: checks `is_active` and `expires_at < now`. Returns `{ valid: false }` on either.                                                      |
| G4  | Can share tokens be revoked?                                  | PASS | `availability-share-actions.ts:60-77`: `revokeShareToken()` sets `is_active = false`. Tenant-scoped.                                                                           |
| G5  | Does the public endpoint use admin client to bypass RLS?      | PASS | `availability-share-actions.ts:121`: `createServerClient({ admin: true })`. Required because public pages have no session. Appropriate: only reads availability, no mutations. |

## Domain H: Capacity Planning (5 questions)

| #   | Question                                                               | P/F  | Evidence                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Does capacity scoring account for prep, travel, shopping, and cleanup? | PASS | `capacity-planning-actions.ts:14-25`: `CapacityPlanningSettings` includes `default_prep_hours`, `default_travel_minutes`, `default_shopping_hours`, `default_cleanup_hours`, `buffer_between_events_minutes`. All used in `buildTimeBlocks()`. |
| H2  | Does `computeDayCapacity` produce graduated severity levels?           | PASS | `capacity.ts:18+`: score 0-100+ with labels: free (0-10), light (11-30), moderate (31-60), heavy (61-90), overloaded (91+). Multi-event penalty of 30 points.                                                                                  |
| H3  | Does the system detect insufficient rest days?                         | PASS | `capacity.ts:126`: `checkRestDays()` warns at 5+ consecutive working days, critical at 6+. Feeds into dashboard week strip.                                                                                                                    |
| H4  | Does `findGroceryWindows` look for free days before events?            | PASS | `capacity.ts:72`: checks 1-day and 2-days-before event date for free/light capacity. Consolidates multiple events into single shopping trips.                                                                                                  |
| H5  | Does capacity check distinguish daily vs weekly limits?                | PASS | `capacity-check.ts:63`: `checkCapacity()` takes both `currentWeekCount` and `currentMonthCount`, returns `CapacityWarning[]` per limit type.                                                                                                   |

## Domain I: Waitlist System (5 questions)

| #   | Question                                                               | P/F      | Evidence                                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Does the waitlist entry schema validate date format?                   | PASS     | `actions.ts:29-30`: `requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`. Same for `requested_date_end`.                                                                                                                                     |
| I2  | Does the waitlist cron auto-expire past-date entries?                  | PASS     | `waitlist-sweep/route.ts`: daily sweep finds entries with future dates, contacts on availability. Entries with past dates auto-expire.                                                                                                            |
| I3  | Does waitlist-to-event conversion create a draft event?                | PASS     | `waitlist-actions.ts:225-270`: `convertWaitlistToEvent()` creates draft event from waitlist entry, marks entry as `booked`, links `converted_event_id`.                                                                                           |
| I4  | Are there two parallel waitlist implementations?                       | **FAIL** | `lib/availability/actions.ts` (lines 463+) and `lib/scheduling/waitlist-actions.ts` both have full CRUD against same `waitlist_entries` table. Dual implementations risk divergent behavior (e.g., different validation, different side effects). |
| I5  | Does `notifyWaitlistOpening` check date availability before notifying? | PASS     | `waitlist-actions.ts:175`: queries `waitlist_entries` where requested date falls in range. The cron at `waitlist-sweep/route.ts` verifies no blocks exist before notifying.                                                                       |

## Domain J: Prep Timeline & Event Timing (5 questions)

| #   | Question                                                                  | P/F  | Evidence                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Does `generatePrepTimeline` categorize tasks by time-before-service?      | PASS | `prep-timeline.ts:101`: categories: day-before (>24h), morning (>4h), afternoon (>1h), final-hour (>15min), plating (<15min).                                                                       |
| J2  | Does the prep block engine suggest required block types on event confirm? | PASS | `prep-block-engine.ts:267`: `REQUIRED_BLOCK_TYPES = ['grocery_run', 'prep_session', 'packing', 'equipment_prep', 'admin']`. `suggestPrepBlocks()` generates suggestions per type with timing logic. |
| J3  | Does gap detection flag events missing required prep blocks?              | PASS | `prep-block-engine.ts:435`: `detectGaps()` finds events with missing blocks. Severity: critical (<48h), warning (<7d), info (7d+).                                                                  |
| J4  | Does the countdown system compute correct days/hours until event?         | PASS | `countdown-actions.ts:48`: `getEventCountdown()` computes `daysUntil` and `hoursUntil` from `event_date + serve_time`. Accessible by both chef and client.                                          |
| J5  | Does the ICS generator use TZID for timezone-aware scheduling?            | PASS | `generate-ics.ts:39-42`: `DTSTART;TZID=${event.timezone}:${startLocal}` when timezone provided. Falls back to floating time (no TZID) when absent.                                                  |

---

## Summary

| Domain                          | Pass   | Fail  | Total  |
| ------------------------------- | ------ | ----- | ------ |
| A: Availability & Blocking      | 5      | 0     | 5      |
| B: Scheduling Rules             | 5      | 0     | 5      |
| C: Conflict Detection           | 5      | 0     | 5      |
| D: Calendar Feed (iCal)         | 5      | 0     | 5      |
| E: Rescheduling                 | 5      | 0     | 5      |
| F: Calendar Aggregation         | 5      | 0     | 5      |
| G: Availability Sharing         | 5      | 0     | 5      |
| H: Capacity Planning            | 5      | 0     | 5      |
| I: Waitlist System              | 4      | 1     | 5      |
| J: Prep Timeline & Event Timing | 5      | 0     | 5      |
| **Total**                       | **49** | **1** | **50** |

**Pass rate: 98% (49/50), 1 structural issue**

---

## Actionable Failures

### I4: Duplicate waitlist implementations (STRUCTURAL)

Two files both manage waitlist CRUD against the same `waitlist_entries` table:

- `lib/availability/actions.ts` (lines 463+): `addToWaitlist`, `contactWaitlistEntry`, `convertWaitlistEntry`, `expireWaitlistEntry`, `getWaitlistEntries`, `getWaitlistForDate`
- `lib/scheduling/waitlist-actions.ts`: `addToWaitlist`, `getWaitlistEntries`, `updateWaitlistEntry`, `notifyWaitlistOpening`, `getWaitlistStats`, `convertWaitlistToEvent`

Both use `requireChef()` and tenant-scope correctly, but:

- Different validation (one uses Zod schema, other does not)
- Different conversion logic (`convertWaitlistEntry` vs `convertWaitlistToEvent`)
- Different importers call different files, risking inconsistent behavior

**Recommendation:** Consolidate into `lib/scheduling/waitlist-actions.ts` (more complete, has stats + notification). Deprecate the availability/actions.ts waitlist functions and redirect imports.

---

## Architectural Notes (Not Failures)

**Timezone handling:** Calendar layer operates on naive dates (YYYY-MM-DD). Only `generate-ics.ts` and `calendar-sync.ts` have timezone awareness (Google Calendar hardcodes `America/New_York`). This is adequate for a single-location chef but would need rework for multi-timezone operations. Not a failure for current scope.

**Rescheduling after confirmation:** `RESCHEDULABLE_STATUSES` intentionally excludes `confirmed`. This is correct, since confirmed events have auto-blocks, prep blocks, and Google Calendar sync that would need cascading updates. The design forces cancellation + re-creation for post-confirmation date changes.
