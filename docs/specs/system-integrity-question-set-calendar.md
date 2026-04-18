# System Integrity Question Set: Calendar

> 40 questions across 10 domains. Covers all calendar views (month/week/day/year), data sources, iCal feed, availability sharing, and cross-system connections.
> Status: BUILT = works. GAP = needs fix. ACCEPT = known limitation, accepted by design.

---

## Domain 1: Auth & Access Control

| #   | Question                                                    | Answer                                                                                                                                                                    | Status |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Does every calendar page call `requireChef()`?              | Yes. All 5 pages verified: `page.tsx` (month), `day/page.tsx`, `week/page.tsx`, `year/page.tsx`, `share/page.tsx`. Each calls `requireChef()` directly.                   | BUILT  |
| 2   | Does the iCal feed route use token-based auth (no session)? | Yes. `/api/feeds/calendar/[token]/route.ts` validates token via DB lookup (`ical_feed_token` column). No session auth. Feed must be enabled (`ical_feed_enabled = true`). | BUILT  |
| 3   | Is the iCal feed rate-limited?                              | Yes. `checkRateLimit('ical-feed:{token}', 60, 60_000)`. 60 requests/minute per token. Returns 429 on exceeded.                                                            | BUILT  |
| 4   | Does the share page scope tokens to the authenticated chef? | Yes. `share/page.tsx` queries `chef_availability_share_tokens` filtered `.eq('tenant_id', chef.tenantId!)`.                                                               | BUILT  |

## Domain 2: Data Source Unification

| #   | Question                                                      | Answer                                                                                                                                                          | Status |
| --- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5   | Does `getUnifiedCalendar()` merge all 7 calendar sources?     | Yes. Merges in parallel: events, prep blocks, scheduled calls, availability blocks, waitlist entries, chef calendar entries, and inquiries with targeted dates. | BUILT  |
| 6   | Are all source queries tenant-scoped?                         | Yes. `getUnifiedCalendar()` calls `requireChef()` and scopes all 7 queries by `user.tenantId!`.                                                                 | BUILT  |
| 7   | Does the day view use the same data source as the month view? | Yes. Both `page.tsx` (month) and `day/page.tsx` call `getUnifiedCalendar(startDate, endDate)` from `lib/calendar/actions.ts`.                                   | BUILT  |
| 8   | Does the week planner merge prep blocks with events?          | Yes. `week/page.tsx` fetches `getWeekSchedule`, `getWeekPrepBlocks`, `getCalendarEntriesForRange`, and `getWeatherForDateRange` in parallel via `Promise.all`.  | BUILT  |
| 9   | Does the year view show event density accurately?             | Yes. `year/page.tsx` calls `getYearSummary()` which returns per-week event counts. Renders 52-week heat grid.                                                   | BUILT  |

## Domain 3: iCal Feed Security & Correctness

| #   | Question                                                                | Answer                                                                                                                                                                      | Status |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 10  | Does the iCal feed exclude client PII from event descriptions?          | Yes. Feed includes occasion, event_date, serve_time, departure_time, status, location_address, guest_count, and site_notes. No client email, phone, or dietary data.        | BUILT  |
| 11  | Does the iCal feed use `Cache-Control: private` to prevent CDN caching? | Yes. Response header: `'Cache-Control': 'private, max-age=300'`. Secret token in URL prevents shared cache exposure.                                                        | BUILT  |
| 12  | Does the iCal feed handle invalid/disabled tokens?                      | Yes. Returns 404 "Feed not found or disabled" for invalid tokens or tokens with `ical_feed_enabled = false`. Returns 400 for tokens shorter than 10 chars.                  | BUILT  |
| 13  | Does the iCal feed exclude only prep blocks (not events)?               | Yes. Feed queries `events` table only. Prep blocks, calls, calendar entries, and availability blocks are excluded. This is intentional; external calendar sees events only. | ACCEPT |

## Domain 4: Calendar Entry CRUD

| #   | Question                                              | Answer                                                                                                          | Status |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| 14  | Do calendar entry mutations require auth?             | Yes. `lib/calendar/entry-actions.ts` calls `requireChef()` in every exported function (create, update, delete). | BUILT  |
| 15  | Do calendar entries use Zod validation?               | Yes. `entry-actions.ts` validates input with Zod schemas for all entry types (personal, business, intention).   | BUILT  |
| 16  | Do availability signals send email on public entries? | Yes. Public calendar entries trigger availability signal emails to interested clients.                          | BUILT  |
| 17  | Do calendar entry mutations bust the calendar cache?  | Yes. `entry-actions.ts` calls `revalidatePath('/calendar')` after creates, updates, and deletes (4 sites).      | BUILT  |

## Domain 5: Drag-to-Reschedule

| #   | Question                                              | Answer                                                                                                                                        | Status |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 18  | Does drag-to-reschedule work on the unified calendar? | Yes. `unified-calendar-client.tsx` imports `rescheduleEvent` from `lib/calendar/reschedule-action.ts` and handles FullCalendar drag-and-drop. | BUILT  |
| 19  | Is drag restricted to event-type items only?          | Yes. Only event items can be dragged. Prep blocks, calls, and calendar entries are not draggable.                                             | BUILT  |
| 20  | Does reschedule bust all related caches?              | Yes. `reschedule-action.ts` calls `revalidatePath('/calendar')` after successful reschedule.                                                  | BUILT  |

## Domain 6: Error Handling

| #   | Question                                                      | Answer                                                                                                                                                | Status |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 21  | Does the calendar error.tsx hide raw error messages?          | Yes. Fixed this session. Shows static "Something went wrong loading the calendar." with opaque `error.digest` reference only.                         | BUILT  |
| 22  | Does the year view handle data fetch failures gracefully?     | Yes. `year/page.tsx` wraps `getYearSummary()` in try/catch. Shows static error card "Could not load year summary" with refresh prompt on failure.     | BUILT  |
| 23  | Are intelligence bars wrapped in error boundaries?            | Yes. Both `SchedulingInsightsBar` and `CapacitySeasonalBar` on the month page are wrapped in `<WidgetErrorBoundary compact>` + `<Suspense>`.          | BUILT  |
| 24  | Does the week planner handle missing weather data gracefully? | Yes. Weather fetch is in `safe()` wrapper (schedule-cards pattern). Falls back to empty object. UI conditionally renders weather only when available. | BUILT  |

## Domain 7: Cache Invalidation

| #   | Question                                                                 | Answer                                                                                                                                                                 | Status |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 25  | How many mutation paths bust `/calendar`?                                | 11+ sites across 6 files: availability actions (2), protected time (3), signal settings (1), reschedule (1), prep blocks (7 across 5 mutations), calendar entries (4). | BUILT  |
| 26  | Do prep block mutations also bust `/calendar/week` and `/calendar/year`? | Yes. `prep-block-actions.ts` revalidates `/calendar`, `/calendar/week`, and `/calendar/year` after mutations.                                                          | BUILT  |
| 27  | Do availability share token mutations bust `/calendar/share`?            | Yes. `availability-share-actions.ts` revalidates `/calendar/share` after token generation or revocation (2 sites).                                                     | BUILT  |
| 28  | Does event creation/update bust the calendar cache?                      | Yes. Event mutations in `lib/events/actions.ts` call `revalidatePath('/calendar')`.                                                                                    | BUILT  |

## Domain 8: Loading States

| #   | Question                                                   | Answer                                                                                                                            | Status |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 29  | Does the month view have a loading state for FullCalendar? | Yes. Dynamic import has `loading` option showing a centered spinner animation while the client-only FullCalendar component loads. | BUILT  |
| 30  | Does the day view have a loading skeleton?                 | Yes. `day/loading.tsx` provides a skeleton layout while server data is fetched.                                                   | BUILT  |
| 31  | Does the week view have a loading skeleton?                | Yes. `week/loading.tsx` provides a skeleton layout while server data is fetched.                                                  | BUILT  |
| 32  | Does the year view have a loading skeleton?                | Yes. `year/loading.tsx` provides a skeleton layout while server data is fetched.                                                  | BUILT  |

## Domain 9: Cross-System Connections

| #   | Question                                                              | Answer                                                                                                                                                                   | Status |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 33  | Does the calendar show weather data for events with coordinates?      | Yes. Day view fetches `getWeatherForDateRange()`. Week planner uses `getWeatherForEvents()`. Weather shown inline with event details.                                    | BUILT  |
| 34  | Do scheduling intelligence bars pull from the same analytics sources? | Yes. `SchedulingInsightsBar` and `CapacitySeasonalBar` from `lib/intelligence/` use the same event and scheduling data that feeds the dashboard.                         | BUILT  |
| 35  | Does the availability calendar integrate with the unified calendar?   | Yes. `availability-calendar-client.tsx` in the calendar directory handles availability blocks. These appear as items in the unified calendar via `getUnifiedCalendar()`. | BUILT  |
| 36  | Do inquiries with confirmed dates appear on the calendar?             | Yes. `getUnifiedCalendar()` includes inquiries with `confirmed_date` as soft lead indicators in the calendar.                                                            | BUILT  |

## Domain 10: Color System & Visual Consistency

| #   | Question                                                          | Answer                                                                                                                                                                        | Status |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 37  | Is there a canonical color system for calendar items?             | Yes. `lib/calendar/colors.ts` defines hex colors, border styles (solid/dashed/dotted), category mappings, and a full legend array for UI rendering.                           | BUILT  |
| 38  | Do all calendar views use the same color functions?               | Yes. `getCalendarColor()` and `getCalendarBorderStyle()` are imported from `lib/calendar/colors.ts` by `getUnifiedCalendar()`. Colors assigned at data layer, not view layer. | BUILT  |
| 39  | Does the color system distinguish blocking vs non-blocking items? | Yes. `colors.ts` defines blocking behavior defaults per category. Blocking items show solid borders; non-blocking show dashed/dotted.                                         | BUILT  |
| 40  | Does the legend cover all calendar item types?                    | Yes. Legend array in `colors.ts` covers: events (by status), prep blocks, calls, availability, waitlist, calendar entries (personal/business/intention), and inquiries.       | BUILT  |

---

## GAP Summary

### CRITICAL / HIGH

None.

### MEDIUM

None.

### LOW

None.

### ACCEPTED

- Q13: iCal feed exports events only (no prep blocks/calls/entries). External calendar subscribers see event schedule only. Intentional design: keeping feed simple and PII-minimal.

**Sweep score: 39/40 BUILT, 1 ACCEPT, 0 GAP (COMPLETE)**

This surface is fully cohesive. All 5 pages auth-gated, unified data source merges 7 sources, iCal feed token-secured and rate-limited, error boundary sanitized (no raw error.message), comprehensive cache invalidation, canonical color system, weather integration, and intelligence overlays all working.

**Key fix from this session:**

- Q21: Calendar `error.tsx` was leaking `error.message`. Fixed to show static message + opaque digest only.
- **Systemic fix:** 17 total `error.tsx` files across the app sanitized (dashboard, calendar, chat, events, events/[id], clients, culinary, staff, quotes, quotes/[id], inquiries, finance, settings, cannabis, goals, operations, global).
