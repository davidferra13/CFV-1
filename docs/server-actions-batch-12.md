# Server Actions Batch — 12 New Feature Action Files

**Date:** 2026-02-20
**Branch:** `feature/scheduling-improvements`

---

## Summary

Added 12 new server action files covering daily briefings, dietary conflict detection, event cloning, preference learning, event countdowns, photo tagging, mileage tracking, grocery routing, email templates, payment plans, enhanced analytics, and course planning.

All files follow the established ChefFlow server action patterns:
- `'use server'` directive at file top
- `requireChef()` for auth and role enforcement
- `createServerClient()` for Supabase access
- `(supabase as any)` for new/un-typed tables
- Tenant scoping on every query
- Zod schemas for input validation
- `revalidatePath()` after mutations
- snake_case → camelCase mapping in return objects
- All money in cents (integers)
- Exported TypeScript types for return values

---

## Files Created

### 1. `lib/briefing/daily-actions.ts`
- **Table:** `chef_daily_briefings`
- **Exports:** `generateDailyBriefing(date?)`, `getDailyBriefing(date?)`
- **Purpose:** Computes a daily summary from events, tasks, revenue, and deadlines. Upserts into chef_daily_briefings with JSONB content containing `eventsToday`, `tasksDue`, `revenueThisWeekCents`, and `upcomingDeadlines`.

### 2. `lib/events/dietary-conflict-actions.ts`
- **Table:** `dietary_conflict_alerts`
- **Exports:** `checkDietaryConflicts(eventId)`, `acknowledgeDietaryConflict(alertId)`, `getDietaryConflicts(eventId)`
- **Purpose:** Cross-references event guest allergies/restrictions against menu items and recipe ingredients. Classifies severity as critical/warning/info based on allergen type.

### 3. `lib/events/clone-actions.ts`
- **Tables:** `events`, `menus`, `dishes`, `event_state_transitions`
- **Exports:** `cloneEvent(sourceEventId, newDate, newClientId?)`
- **Purpose:** Deep-copies an event including all menus and dishes. New event starts in draft status with all readiness flags reset. Supports optional client reassignment.

### 4. `lib/clients/preference-learning-actions.ts`
- **Table:** `client_preference_patterns`
- **Exports:** `learnClientPreferences(clientId)`, `getClientPatterns(clientId)`
- **Purpose:** Analyzes a client's event history to extract patterns (favorite day of week, guest count range, occasion type, service style, time preference). Also incorporates profile data (cuisines, allergies). Confidence scores based on occurrence frequency.

### 5. `lib/events/countdown-actions.ts`
- **Table:** `events` (uses `countdown_enabled` column)
- **Exports:** `getEventCountdown(eventId)`, `toggleCountdown(eventId, enabled)`, `getUpcomingCountdowns()`
- **Purpose:** Provides countdown data (days/hours until event) and toggle for dashboard display. Returns up to 5 upcoming events with countdown enabled.

### 6. `lib/events/photo-tagging-actions.ts`
- **Table:** `event_photos` (if available)
- **Exports:** `suggestPhotoTags(photoUrl)`, `confirmPhotoTag(photoId, tags)`
- **Purpose:** Heuristic-based tag suggestions from URL/filename patterns. Maps common food keywords to tag sets. No AI dependency. `confirmPhotoTag` stores tags in event_photos table (graceful no-op if table missing).

### 7. `lib/finance/mileage-enhanced-actions.ts`
- **Table:** `mileage_logs`
- **Exports:** `logRoundTrip(input)`, `getMileageByPurpose(taxYear)`
- **Purpose:** Inserts two mileage entries per round trip (outbound + return). Reports mileage grouped by purpose with estimated IRS deduction (67 cents/mile for 2026).

### 8. `lib/scheduling/grocery-route-actions.ts`
- **Tables:** `events`, `menus`, `dishes`, `recipe_ingredients`, `vendors`
- **Exports:** `getGroceryRoute(eventId)`, `optimizeStoreOrder(eventId)`
- **Purpose:** Builds a shopping list from event recipes grouped by vendor/store. Route optimization suggests store visit order by item count (fewest stops, most items first).

### 9. `lib/marketing/email-template-actions.ts`
- **Table:** `campaign_templates` (from migration 20260303000019)
- **Exports:** `saveEmailTemplate(input)`, `listEmailTemplates()`, `deleteEmailTemplate(id)`
- **Purpose:** CRUD for campaign email templates. Save upserts by name (cannot overwrite system templates). Delete is blocked for system templates. snake_case → camelCase mapping on all returns.

### 10. `lib/clients/payment-plan-actions.ts`
- **Tables:** `events`, `quotes`
- **Exports:** `getPaymentPlan(eventId)`, `calculateInstallments(totalCents, numberOfPayments, eventDate)`
- **Purpose:** Generates installment payment options: 2-pay (50/50), 3-pay (40/30/30), 4-pay (equal). Due dates work backwards from event date. `calculateInstallments` is a pure function for custom scenarios.

### 11. `lib/analytics/custom-report-enhanced-actions.ts`
- **Tables:** `events`, `clients`, `event_financial_summary`
- **Exports:** `getClientRetentionRate(startDate?, endDate?)`, `getRevenueBySource(startDate?, endDate?)`
- **Purpose:** Retention = percentage of clients with 2+ events in period. Revenue by source joins events with client referral_source, uses financial summaries for actual paid amounts.

### 12. `lib/operations/course-planning-actions.ts`
- **Table:** `service_courses` (from migration 20260312000006)
- **Exports:** `generateDefaultCourses(eventId, courseNames)`, `reorderCourses(courseIds)`, `getEventCourses(eventId)`, `updateCourseNotes(courseId, notes)`
- **Purpose:** Manages service course order for events. Generate creates sequentially numbered entries. Reorder updates course_number based on array position. Includes notes support.

---

## Database Dependencies

These server actions reference the following tables that need migrations:

| Table | Migration Source | Status |
|---|---|---|
| `chef_daily_briefings` | Needs new migration | **Pending** |
| `dietary_conflict_alerts` | Needs new migration | **Pending** |
| `client_preference_patterns` | Needs new migration | **Pending** |
| `service_courses` | Migration 20260312000006 | Assumed present |
| `campaign_templates` | Migration 20260303000019 | Assumed present |
| `mileage_logs` | Existing table | Assumed present |
| `event_photos` | Optional — graceful fallback | N/A |
| `events.countdown_enabled` | Migration 20260312000007 | Assumed present |

New tables (`chef_daily_briefings`, `dietary_conflict_alerts`, `client_preference_patterns`) will need migrations created separately.

---

## Connection to System

- All actions are tenant-scoped and follow the multi-tenant architecture
- Financial calculations use cents (integer arithmetic)
- Event FSM is respected (clone creates drafts, countdown handles all statuses)
- Dietary conflict detection bridges the menu system with the allergy/restriction data model
- Preference learning bridges the CRM (clients) with the events system
- Grocery routing bridges the recipe/ingredient system with the vendor catalog
- Payment plans bridge the quote/pricing system with installment logic
- All files are drop-in ready for UI wiring via `import { ... } from '@/lib/...'`
