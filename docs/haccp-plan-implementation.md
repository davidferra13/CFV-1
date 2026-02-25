# HACCP Plan Generator — Implementation Doc

**Date:** 2026-03-26
**Feature:** Auto-generated HACCP plans per chef archetype
**Tier:** Free (no billing gate)

---

## What Changed

Added a complete HACCP (Hazard Analysis & Critical Control Points) plan system that auto-generates FDA-compliant food safety plans based on the chef's selected business type.

### New Files

| File                                                   | Purpose                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `lib/haccp/types.ts`                                   | Type definitions — hazards, CCPs, process steps, overrides     |
| `lib/haccp/templates.ts`                               | Template engine — archetype-specific plans for all 6 types     |
| `lib/haccp/actions.ts`                                 | Server actions — CRUD, toggle sections, notes, review tracking |
| `components/haccp/haccp-plan-view.tsx`                 | Full reference document (printable)                            |
| `components/haccp/haccp-section-card.tsx`              | Reusable section card with toggle + notes                      |
| `components/haccp/haccp-wizard.tsx`                    | Guided step-by-step review mode                                |
| `app/(chef)/settings/compliance/haccp/page.tsx`        | Main HACCP page (server component)                             |
| `app/(chef)/settings/compliance/haccp/tabs-client.tsx` | Client-side tab switcher                                       |
| `supabase/migrations/20260326000001_haccp_plans.sql`   | `haccp_plans` table with RLS                                   |

### Modified Files

| File                                      | Change                                      |
| ----------------------------------------- | ------------------------------------------- |
| `app/(chef)/settings/compliance/page.tsx` | Added HACCP section with "View Plan" link   |
| `components/navigation/nav-config.tsx`    | Added HACCP Plan nav entry under Compliance |

---

## How It Works

1. Chef selects a business archetype (private-chef, caterer, meal-prep, restaurant, food-truck, bakery)
2. On first visit to `/settings/compliance/haccp`, the plan auto-generates from templates
3. Plan includes: prerequisite programs, hazard analysis (process steps), critical control points, record-keeping requirements
4. Chef can toggle sections on/off and add custom notes (stored as JSONB overrides)
5. "Mark as Reviewed" tracks the last review date for compliance auditing
6. Two views: Reference Document (full printable doc) and Guided Review (step-by-step wizard)

## Archetype Coverage

All 6 archetypes get shared content (receiving, cold storage, prep, cooking, cleanup) plus archetype-specific additions:

- **Private Chef:** Transport, client kitchen assessment, allergen isolation
- **Caterer:** Hot/cold holding, event venue risks, serving protocols
- **Meal Prep:** Rapid cooling, batch production, packaging/labeling, delivery
- **Restaurant:** High-volume throughput, holding times, reheating
- **Food Truck:** Limited water/equipment, mobile storage, waste management
- **Bakery:** Allergen cross-contact (flour/nuts/dairy/eggs), cooling, cream/custard temps

## Database

Single table `haccp_plans` with JSONB `plan_data` column. One plan per chef (UNIQUE on `chef_id`). RLS scoped via `user_roles`. Chef customizations (toggles, notes) stored as `section_overrides` within the JSONB — no additional tables needed.

## Migration

`20260326000001_haccp_plans.sql` — must be applied before this feature works. Additive only (new table, no changes to existing tables).
