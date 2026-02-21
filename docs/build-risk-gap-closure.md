# Build: Full Risk Gap Closure — 8 Phases, 43 Features

**Branch:** `feature/risk-gap-closure`
**Commit:** `3ccbe3a`
**Files:** 166 changed, 13,324 insertions
**Migrations:** 21 additive (20260322000003–20260322000023)
**Date:** 2026-02-21

---

## Context

A comprehensive 20-category risk audit revealed that ChefFlow excelled at operational event management but almost completely ignored the protection layer — the things that prevent catastrophic business failure. Three categories scored F (Insurance, Physical Health, Love of Craft) and nine scored D. A 21st theme — Professional Momentum — was added to address stagnation risk.

This build closes every identified gap across 43 features in 8 phases.

---

## Phase 1: Business Protection Foundation

| Feature                   | Files                                                                                                                                                                               | Status   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Insurance Module          | `lib/protection/insurance-actions.ts`, `components/protection/insurance-list.tsx`, `insurance-policy-form.tsx`, `app/(chef)/settings/protection/insurance/page.tsx`                 | Complete |
| Business Health Checklist | `lib/protection/business-health-actions.ts`, `business-health-constants.ts`, `components/protection/business-health-checklist.tsx`, `components/dashboard/business-health-card.tsx` | Complete |
| Certification Tracker     | `lib/protection/certification-actions.ts`, `components/protection/certification-list.tsx`, `certification-form.tsx`, `certification-expiry-badge.tsx`                               | Complete |
| NDA & Photo Permissions   | `lib/clients/nda-actions.ts`, `components/protection/nda-panel.tsx` — integrated into `app/(chef)/clients/[id]/page.tsx`                                                            | Complete |
| Incident Documentation    | `lib/safety/incident-actions.ts`, `components/safety/incident-form.tsx`, `incident-list.tsx`, `incident-resolution-tracker.tsx`, 3 pages                                            | Complete |
| Contract Legal Disclaimer | Verified in `lib/ai/contract-generator.ts` + `components/ai/contract-generator-panel.tsx` — amber banner already present                                                            | Verified |
| Protection Hub            | `app/(chef)/settings/protection/page.tsx` — status grid for all protection modules                                                                                                  | Complete |

**Migration files:** 20260322000003 through 20260322000007

---

## Phase 2: Operational Safety Net

| Feature                      | Key Files                                                                                                   | Status   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| Pre-Service Safety Checklist | `lib/events/safety-checklist-actions.ts`, `components/events/pre-service-safety-checklist.tsx`              | Complete |
| Alcohol Service Log          | `lib/events/alcohol-log-actions.ts`, `components/events/alcohol-service-log.tsx`                            | Complete |
| Backup Chef Protocol         | `lib/safety/backup-chef-actions.ts`, `components/safety/backup-chef-list.tsx`, `backup-chef-form.tsx`, page | Complete |
| FDA/USDA Recall Monitoring   | `lib/safety/recall-actions.ts`, `components/safety/recall-alerts.tsx`, `app/api/cron/recall-check/route.ts` | Complete |
| Scope Drift Detection        | `lib/events/scope-drift.ts`, `scope-drift-actions.ts`, `components/events/scope-drift-banner.tsx`           | Complete |
| Cross-Contamination Protocol | `lib/events/cross-contamination-actions.ts`, `components/events/cross-contamination-checklist.tsx`          | Complete |
| Equipment Redundancy         | `lib/events/equipment-checklist-actions.ts`                                                                 | Complete |

**Migration files:** 20260322000008 through 20260322000011

---

## Phase 3: Personal Protection Layer

| Feature                 | Key Files                                                                                                                                                    | Status   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Burnout Risk Indicator  | `lib/wellbeing/burnout-score.ts`, `wellbeing-actions.ts`, `components/dashboard/burnout-indicator-card.tsx`                                                  | Complete |
| Capacity Ceiling        | `lib/scheduling/capacity-check.ts`, `capacity-actions.ts`, `components/settings/capacity-settings-form.tsx`, `components/events/capacity-warning-banner.tsx` | Complete |
| Protected Time Blocking | `lib/scheduling/protected-time-actions.ts`, `components/calendar/protected-time-form.tsx`                                                                    | Complete |
| Shareable Availability  | `lib/scheduling/availability-share-actions.ts`, `components/calendar/availability-share-settings.tsx`, `app/(public)/availability/[token]/page.tsx`          | Complete |
| Off-Hours Protection    | `lib/notifications/off-hours-check.ts`, `components/settings/off-hours-form.tsx`                                                                             | Complete |

**Migration file:** 20260322000012 (capacity columns on chefs)

---

## Phase 4: Reputation & Trust Protection

| Feature                    | Key Files                                                                                                                                  | Status   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Social Post Pre-Flight     | `lib/social/preflight-check.ts`, `components/social/disclosure-preflight-panel.tsx`                                                        | Complete |
| Brand Mention Monitoring   | `lib/reputation/mention-actions.ts`, `components/reputation/mention-feed.tsx`, `app/api/cron/brand-monitor/route.ts`                       | Complete |
| Crisis Response Protocol   | `lib/protection/crisis-actions.ts` (in protection hub), `components/protection/crisis-playbook.tsx`                                        | Complete |
| Referral Chain Health      | `lib/clients/referral-health.ts`, `referral-health-actions.ts`                                                                             | Complete |
| Relationship Cooling Alert | `lib/clients/cooling-alert.ts`, `cooling-actions.ts`, `components/clients/cooling-alert-widget.tsx`, `app/api/cron/cooling-alert/route.ts` | Complete |

**Migration files:** 20260322000013, 20260322000014

---

## Phase 5: Financial & Legal Health

| Feature                       | Key Files                                                                                                              | Status   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| Revenue Concentration Warning | `lib/finance/concentration-risk.ts`, `concentration-actions.ts`, `components/dashboard/concentration-warning-card.tsx` | Complete |
| Break-Even Calculator         | `lib/finance/break-even-actions.ts`, `components/finance/break-even-calculator.tsx`, page                              | Complete |
| Business Continuity Plan      | `lib/protection/continuity-actions.ts`, `components/protection/continuity-plan-form.tsx`, page                         | Complete |
| Chargeback Rate Monitor       | `lib/finance/chargeback-rate.ts`, `chargeback-actions.ts`, `components/finance/chargeback-rate-card.tsx`               | Complete |
| Vendor Payment Aging          | `lib/vendors/payment-aging.ts`, `payment-aging-actions.ts`, `components/finance/vendor-payment-aging.tsx`              | Complete |

**Migration file:** 20260322000015 (lost_reason columns on quotes)

---

## Phase 6: Professional Momentum & Growth

| Feature                         | Key Files                                                                                                                                                                   | Status   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Professional Momentum Dashboard | `lib/professional/momentum-actions.ts`, `components/professional/momentum-dashboard.tsx`, page, `app/api/cron/momentum-snapshot/route.ts`                                   | Complete |
| Capability Inventory            | `lib/professional/capability-actions.ts`, `components/professional/capability-inventory.tsx`, page                                                                          | Complete |
| Lost Quote Reason Tracker       | `lib/quotes/loss-analysis-actions.ts`, `components/analytics/loss-analysis-chart.tsx`                                                                                       | Complete |
| Continuing Education Log        | `lib/professional/education-actions.ts`, `components/professional/education-log.tsx`                                                                                        | Complete |
| Creative Project Space          | `lib/professional/creative-project-actions.ts`, `components/professional/creative-project-card.tsx`, `creative-project-form.tsx`, `app/(chef)/culinary/my-kitchen/page.tsx` | Complete |
| Menu Diversity Tracker          | `lib/professional/menu-diversity.ts`, `components/professional/menu-diversity-signal.tsx`                                                                                   | Complete |
| Quarterly Growth Check-In       | `lib/professional/growth-checkin-actions.ts`, `components/professional/growth-checkin-modal.tsx`, `growth-checkin-history.tsx`, `app/api/cron/quarterly-checkin/route.ts`   | Complete |

**Migration files:** 20260322000016 through 20260322000018, 20260322000022, 20260322000023

---

## Phase 7: Staff & HR Improvements

| Feature                      | Key Files                                                                                                 | Status   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| Staff Onboarding Checklist   | `lib/staff/onboarding-actions.ts`, `onboarding-constants.ts`, `components/staff/onboarding-checklist.tsx` | Complete |
| Code of Conduct Sign-Off     | `lib/staff/coc-actions.ts`, `components/staff/coc-acknowledgment-button.tsx`                              | Complete |
| Contractor Agreement Tracker | `lib/staff/contractor-agreement-actions.ts`, `components/staff/contractor-agreement-panel.tsx`            | Complete |

**Migration files:** 20260322000019, 20260322000020

---

## Phase 8: Digital & Portfolio Protection

| Feature                         | Key Files                                                                                                                                                     | Status   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Portfolio Permission Management | `lib/portfolio/permission-check.ts`, `permission-actions.ts`, `components/events/photo-permission-indicator.tsx`, `components/portfolio/permission-audit.tsx` | Complete |
| Portfolio Removal Workflow      | `lib/protection/removal-request-actions.ts`, `components/protection/removal-request-form.tsx`, `removal-task-tracker.tsx`, `removal-request-list.tsx`, page   | Complete |
| SEO Health Checker              | `lib/portal/seo-health.ts`, `components/settings/portal-seo-health.tsx`                                                                                       | Complete |

**Migration file:** 20260322000021

---

## Infrastructure Changes

### Navigation

- Added "Protection" NavGroup in `components/navigation/nav-config.tsx` with Business Health, Incidents, Backup Chef, Brand Mentions items
- Added 6 settings shortcut entries for protection pages
- Added "My Kitchen" under Culinary group

### Notification System

- Added 12 new `NotificationAction` types: `insurance_expiring_30d/7d`, `cert_expiring_90d/30d/7d`, `new_negative_mention`, `recall_alert_matched`, `capacity_limit_approaching`, `relationship_cooling`, `burnout_risk_high`, `no_education_logged_90d`, `quarterly_checkin_due`
- Added `new_guest_lead` action (fixed pre-existing bug in `lib/guest-leads/actions.ts`)
- Added `'lead'`, `'protection'`, `'wellbeing'` to `NotificationCategory`
- Added tier mappings for all new actions in `lib/notifications/tier-config.ts`
- Added `lib/notifications/off-hours-check.ts` for quiet hours suppression

### Cron Endpoints (6 new)

| Endpoint                      | Frequency | Purpose                          |
| ----------------------------- | --------- | -------------------------------- |
| `/api/cron/recall-check`      | Daily     | FDA + USDA recall monitoring     |
| `/api/cron/brand-monitor`     | Daily     | Brand mention search             |
| `/api/cron/renewal-reminders` | Daily     | Insurance + cert expiry checks   |
| `/api/cron/cooling-alert`     | Weekly    | Relationship cooling detection   |
| `/api/cron/momentum-snapshot` | Weekly    | Compute momentum scores          |
| `/api/cron/quarterly-checkin` | Daily     | Quarterly check-in due detection |

### Integration Points

- NDA panel added to `app/(chef)/clients/[id]/page.tsx` after AllergyRecordsPanel
- Contract generator verified: disclaimer banner present in both `lib/ai/contract-generator.ts` and `components/ai/contract-generator-panel.tsx`

---

## Database Migrations Summary

All 21 migrations are strictly additive — no drops, no deletes, no type changes.

| Migration | Table/Change                                                   |
| --------- | -------------------------------------------------------------- |
| 000003    | `chef_insurance_policies`                                      |
| 000004    | `chef_business_health_items`                                   |
| 000005    | `chef_certifications`                                          |
| 000006    | ALTER `clients` ADD nda\_\* + photo_permission columns         |
| 000007    | `chef_incidents`                                               |
| 000008    | `event_safety_checklists`                                      |
| 000009    | `event_alcohol_logs` + ALTER `events` ADD alcohol_being_served |
| 000010    | `chef_backup_contacts`                                         |
| 000011    | ALTER `events` ADD scope_drift columns                         |
| 000012    | ALTER `chefs` ADD capacity + off_hours columns                 |
| 000013    | `chef_brand_mentions`                                          |
| 000014    | `chef_crisis_plans`                                            |
| 000015    | ALTER `quotes` ADD lost_reason + lost_notes                    |
| 000016    | `chef_capability_inventory`                                    |
| 000017    | `chef_education_log`                                           |
| 000018    | `chef_creative_projects`                                       |
| 000019    | `staff_onboarding_items`                                       |
| 000020    | `contractor_service_agreements`                                |
| 000021    | ALTER `event_photos` ADD permission columns                    |
| 000022    | `chef_growth_checkins`                                         |
| 000023    | `chef_momentum_snapshots` + `chef_availability_share_tokens`   |

**Before applying:** Back up the database with `supabase db dump --linked > backup-$(date +%Y%m%d).sql`

---

## Verification

- `npx tsc --noEmit --skipLibCheck` → 0 errors
- `npx next build --no-lint` → Success
- All RLS policies follow tenant_id scoping pattern
- All server actions use `requireChef()` for auth
- All `'use server'` files export only async functions
- No destructive migrations

---

## Important Notes for types/database.ts

The new tables (21 migrations) are not yet reflected in `types/database.ts` because the migrations haven't been pushed to the remote database. All server actions use `(supabase as any).from('table_name')` as a temporary workaround. After running `supabase db push` and regenerating types with `supabase gen types typescript --linked > types/database.ts`, the `as any` casts can be removed.
