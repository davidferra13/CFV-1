# Gap Closure — Complete Reference

All 14 business gaps identified in the platform audit. Every gap has a migration, server actions, UI, and a companion doc. This file is the single source of truth for what was built and where to find it.

---

## GAP 1 — Contracts & Legal System

**Why**: No contract, no e-sign, no client acknowledgment existed.

| Layer          | File                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000003_contracts_system.sql`                                                                         |
| Server actions | `lib/contracts/actions.ts`                                                                                                        |
| Chef UI        | `app/(chef)/settings/contracts/page.tsx`                                                                                          |
| Client signing | `app/(client)/my-events/[id]/contract/page.tsx`                                                                                   |
| Components     | `components/contracts/contract-template-editor.tsx`, `send-contract-button.tsx`, `contract-status-badge.tsx`, `signature-pad.tsx` |
| Email          | `lib/email/templates/contract-sent.tsx`                                                                                           |
| Doc            | `docs/contracts-legal-system.md`                                                                                                  |

**Tables**: `contract_templates`, `event_contracts`
**Key actions**: `generateEventContract`, `sendContractToClient`, `signContract`, `voidContract`

---

## GAP 2 — Staff & Team Management

**Why**: No sous chefs, kitchen assistants, or service staff. Labor cost only tracked chef's own time.

| Layer          | File                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000005_staff_management.sql`                           |
| Server actions | `lib/staff/actions.ts`                                                              |
| Chef UI        | `app/(chef)/staff/page.tsx`                                                         |
| Components     | `components/staff/staff-member-form.tsx`, `components/events/event-staff-panel.tsx` |
| Doc            | `docs/staff-team-management.md`                                                     |

**Tables**: `staff_members`, `event_staff_assignments`
**Key actions**: `assignStaffToEvent`, `recordStaffHours`, `computeEventLaborCost`

---

## GAP 3 — Menu Approval Workflow

**Why**: Clients had no way to formally approve menus before an event.

| Layer          | File                                                            |
| -------------- | --------------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000004_menu_approval_workflow.sql` |
| Server actions | `lib/events/menu-approval-actions.ts`                           |
| Chef UI        | `components/events/menu-approval-status.tsx`                    |
| Client UI      | `app/(client)/my-events/[id]/approve-menu/page.tsx`             |
| Email          | `lib/email/templates/menu-approval-request.tsx`                 |
| Doc            | `docs/menu-approval-workflow.md`                                |

**Tables**: `menu_approval_requests` + columns on `events`
**Key actions**: `sendMenuForApproval`, `approveMenu`, `requestMenuRevision`

---

## GAP 4 — Availability & Waitlist Management

**Why**: No way to block dates, view availability, or manage a waitlist.

| Layer          | File                                                                |
| -------------- | ------------------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000006_availability_waitlist.sql`      |
| Server actions | `lib/availability/actions.ts`                                       |
| Calendar UI    | `app/(chef)/calendar/page.tsx` + `availability-calendar-client.tsx` |
| Waitlist UI    | `app/(chef)/waitlist/page.tsx` + `waitlist-add-form.tsx`            |
| Doc            | `docs/availability-waitlist-system.md`                              |

**Tables**: `chef_availability_blocks`, `waitlist_entries`
**Key actions**: `blockDate`, `getAvailabilityForMonth`, `addToWaitlist`, `autoBlockEventDate`

---

## GAP 5 — Admin Time Tracking

**Why**: No tracking of admin time (emails, calls, planning, bookkeeping) that is real labor cost.

| Layer          | File                                                                     |
| -------------- | ------------------------------------------------------------------------ |
| Migration      | `supabase/migrations/20260303000007_admin_time_tracking.sql`             |
| Server actions | `lib/admin-time/actions.ts`                                              |
| UI             | `app/(chef)/insights/time-analysis/page.tsx` + `admin-time-log-form.tsx` |
| Doc            | `docs/admin-time-tracking.md`                                            |

**Tables**: `admin_time_logs`
**Key actions**: `logAdminTime`, `getAdminTimeThisWeek`, `getMonthlyAdminTimeSummary`
**Exports**: `ADMIN_TIME_CATEGORIES`

---

## GAP 6 — Equipment Inventory

**Why**: No owned equipment inventory, maintenance schedule, or rental tracking.

| Layer          | File                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000008_equipment_inventory.sql`                  |
| Server actions | `lib/equipment/actions.ts`                                                    |
| UI             | `app/(chef)/operations/equipment/page.tsx` + `equipment-inventory-client.tsx` |
| Doc            | `docs/equipment-inventory-system.md`                                          |

**Tables**: `equipment_items`, `equipment_rentals`
**Key actions**: `logMaintenance`, `getEquipmentDueForMaintenance`, `getRentalCostForEvent`

---

## GAP 7 — Kitchen Rental Tracking

**Why**: No way to track commercial kitchen bookings for large prep jobs or their costs.

| Layer          | File                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000010_kitchen_rentals.sql`                     |
| Server actions | `lib/kitchen-rentals/actions.ts`                                             |
| UI             | `app/(chef)/operations/kitchen-rentals/page.tsx` + `kitchen-rental-form.tsx` |
| Doc            | `docs/kitchen-rental-tracking.md`                                            |

**Tables**: `kitchen_rentals`
**Key actions**: `createKitchenRental`, `getKitchenRentalsForEvent`, `getMonthlyKitchenCosts`

---

## GAP 8 — Vendor / Supplier Management

**Why**: No structured vendor directory, preferred sourcing tracking, or price history.

| Layer          | File                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000015_vendor_management.sql`             |
| Server actions | `lib/vendors/actions.ts`                                               |
| UI             | `app/(chef)/culinary/vendors/page.tsx` + `vendor-directory-client.tsx` |
| Doc            | `docs/vendor-supplier-management.md`                                   |

**Tables**: `vendors`, `vendor_price_points`
**Key actions**: `listVendors`, `setVendorPreferred`, `recordPricePoint`, `getPriceHistory`
**Exports**: `VENDOR_TYPE_LABELS`

---

## GAP 9 — Tax Workflow

**Why**: No IRS-compliant mileage log, no quarterly tax estimate, no accountant export.

| Layer          | File                                                        |
| -------------- | ----------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000009_tax_workflow.sql`       |
| Server actions | `lib/tax/actions.ts`                                        |
| UI             | `app/(chef)/finance/tax/page.tsx` + `tax-center-client.tsx` |
| Doc            | `docs/tax-workflow-system.md`                               |

**Tables**: `mileage_logs` (with generated `deduction_cents` column), `tax_settings`
**Key actions**: `logMileage`, `computeQuarterlyEstimate`, `generateAccountantExport`
**Constant**: `IRS_RATE_CENTS_PER_MILE = 70` — update each January

---

## GAP 10 — Food Safety & Compliance

**Why**: No certification expiry tracking, no temperature logs, no HACCP-style auditing.

| Layer           | File                                                            |
| --------------- | --------------------------------------------------------------- |
| Migration       | `supabase/migrations/20260303000011_food_safety_compliance.sql` |
| Server actions  | `lib/compliance/actions.ts`                                     |
| Settings UI     | `app/(chef)/settings/compliance/page.tsx` + `cert-form.tsx`     |
| Event component | `components/events/temp-log-panel.tsx`                          |
| Doc             | `docs/food-safety-compliance-system.md`                         |

**Tables**: `chef_certifications`, `event_temp_logs`
**Key actions**: `listCertifications`, `getExpiringCertifications`, `logTemperature`, `getAllergenRiskSummary`
**Exports**: `certExpiryStatus()`, `SAFE_TEMP_RANGES`
**Expiry tiers**: `expired` / `critical` (≤14d) / `warning` (≤60d) / `ok`

---

## GAP 11 — Contingency & Emergency Planning

**Why**: No system for what happens when the chef is sick, equipment fails, or sourcing falls through.

| Layer           | File                                                                       |
| --------------- | -------------------------------------------------------------------------- |
| Migration       | `supabase/migrations/20260303000016_contingency_planning.sql`              |
| Server actions  | `lib/contingency/actions.ts`                                               |
| Settings UI     | `app/(chef)/settings/emergency/page.tsx` + `emergency-contacts-client.tsx` |
| Event component | `components/events/contingency-panel.tsx`                                  |
| Doc             | `docs/contingency-emergency-planning.md`                                   |

**Tables**: `chef_emergency_contacts`, `event_contingency_notes`
**Key actions**: `upsertContingencyNote` (idempotent per event+scenario), `getEventContingencyNotes`
**Exports**: `SCENARIO_LABELS` (6 scenario types)

---

## GAP 12 — Recurring Services / Weekly Meal Prep

**Why**: No model for ongoing client relationships; dish history was purely mental.

| Layer          | File                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000017_recurring_services.sql`                 |
| Server actions | `lib/recurring/actions.ts`                                                  |
| UI             | `app/(chef)/clients/[id]/recurring/page.tsx` + `recurring-service-form.tsx` |
| Doc            | `docs/recurring-services-weekly-meal-prep.md`                               |

**Tables**: `recurring_services`, `served_dish_history`
**Key actions**: `createRecurringService`, `logServedDish`, `getServedHistoryForClient`, `getSuggestedMenuItems`
**Exports**: `SERVICE_TYPE_LABELS`, `REACTION_LABELS`

---

## GAP 13 — Professional Development Tracking

**Why**: No CPD tracking, competition log, press features, or learning goals.

| Layer          | File                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000018_professional_development.sql`                   |
| Server actions | `lib/professional/actions.ts`                                                       |
| UI             | `app/(chef)/settings/professional/page.tsx` + `professional-development-client.tsx` |
| Doc            | `docs/professional-development-tracking.md`                                         |

**Tables**: `professional_achievements` (public RLS policy), `learning_goals`
**Key actions**: `listAchievements(publicOnly?)`, `completeLearningGoal`, `createLearningGoal`
**Exports**: `ACHIEVE_TYPE_LABELS`, `GOAL_CATEGORY_LABELS`
**Note**: `is_public = true` achievements are readable without auth — safe for public chef profile page

---

## GAP 14 — Marketing Campaigns

**Why**: No way to re-engage past clients or send seasonal announcements from inside ChefFlow.

| Layer          | File                                                            |
| -------------- | --------------------------------------------------------------- |
| Migration      | `supabase/migrations/20260303000019_marketing_campaigns.sql`    |
| Server actions | `lib/marketing/actions.ts`                                      |
| UI             | `app/(chef)/marketing/page.tsx` + `campaign-builder-client.tsx` |
| Doc            | `docs/marketing-execution-system.md`                            |

**Tables**: `marketing_campaigns`, `campaign_recipients` + `marketing_unsubscribed` on `clients`
**Key actions**: `createCampaign`, `previewCampaignAudience`, `sendCampaignNow`, `getCampaignStats`
**Exports**: `CAMPAIGN_TYPE_LABELS`
**Segments**: `dormant_90_days`, `all_clients`, `client_ids`
**Note**: `marketing_unsubscribed` only blocks marketing emails — transactional emails unaffected

---

## Migration Index

| Timestamp        | Feature                  |
| ---------------- | ------------------------ |
| `20260303000003` | Contracts & Legal        |
| `20260303000004` | Menu Approval Workflow   |
| `20260303000005` | Staff Management         |
| `20260303000006` | Availability & Waitlist  |
| `20260303000007` | Admin Time Tracking      |
| `20260303000008` | Equipment Inventory      |
| `20260303000009` | Tax Workflow             |
| `20260303000010` | Kitchen Rentals          |
| `20260303000011` | Food Safety & Compliance |
| `20260303000015` | Vendor Management        |
| `20260303000016` | Contingency Planning     |
| `20260303000017` | Recurring Services       |
| `20260303000018` | Professional Development |
| `20260303000019` | Marketing Campaigns      |

**Next safe timestamp**: `20260303000020`

---

## Common Patterns Used Across All Gaps

```
requireChef() → Zod parse → supabase query with chef_id scope → revalidatePath()
```

- All monetary values in **cents** (integers)
- RLS via `get_current_user_role()` + `get_current_tenant_id()`
- `update_updated_at_column()` trigger reused on every table with `updated_at`
- Button variants: `primary` / `secondary` / `danger` / `ghost` (no `outline`)
- No `react-markdown` — use `<pre className="whitespace-pre-wrap font-sans">`
