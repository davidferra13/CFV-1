# Daily Ops System — "Open App, Approve, Go Cook"

**Session Date:** 2026-02-21
**Feature:** Daily workflow management for private chefs
**Status:** Implemented

---

## Problem

Private chefs are their own boss, and the mental load of figuring out _what to do each day_ drowns out the creative work (menus, recipes, cooking) that actually makes the business great. ChefFlow already tracked everything — but didn't **organize the chef's day** into a clear, actionable flow.

## Solution

Two-part system:

1. **Remy Morning Plan** — AI-generated daily plan using data from all existing systems
2. **Daily Ops page (`/daily`)** — Structured execution view with 4 swim lanes

### The 4 Swim Lanes

| Lane              | Purpose                         | Examples                                                                   |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------- |
| **Quick Admin**   | Clear the deck fast             | Respond to messages, approve drafts, upload receipts, simple confirmations |
| **Event Prep**    | Time-sensitive operational work | DOP tasks, grocery lists, prep lists, packing, travel confirmation         |
| **Creative Time** | Deep work, no time pressure     | Menu development, recipe documentation (recipe debt), new dish ideas       |
| **Relationship**  | Client cultivation              | Re-engage dormant clients, birthday outreach, referral asks, networking    |

### How It Works

The plan engine (`lib/daily-ops/plan-engine.ts`) pulls from 10+ existing data sources:

- **Priority Queue** (8 domains: inquiry, message, quote, event, financial, post_event, client, culinary)
- **DOP Task Digest** (per-event operational checklists)
- **Next Best Actions** (per-client relationship recommendations)
- **Overdue Follow-ups** (completed events needing follow-up)
- **Chef Todos** (manual to-do list)
- **Recipe Debt** (undocumented recipes)
- **Upcoming Calls** (scheduled calls/meetings for today)
- **Protected Time** (personal time blocks)

Each item is categorized into a swim lane with a time estimate and deep link. The chef works through the lanes in order: admin first (usually <20 min), then prep, then creative time.

### Auto-Drafted Communications (Pro Tier)

The draft engine (`lib/daily-ops/draft-engine.ts`) auto-generates routine communications via local Ollama:

- **Auto-draft:** Post-event follow-ups, event confirmations, birthday messages
- **Link-only:** Pricing discussions, custom quotes, difficult client situations

All drafts are stored in `daily_plan_drafts` with one-tap approve/dismiss. Privacy: all generation runs locally via Ollama — no client data leaves the machine.

### Dashboard Integration

- **Daily Ops banner** at the top of the dashboard shows: "5 admin, 3 prep, 2 creative — ~45 min"
- **Nav entry** added to both desktop sidebar and mobile tabs

### Remy Integration

- Remy's context includes daily plan stats
- When the chef asks "what should I do today?", Remy references the daily plan
- Remy's personality updated with Daily Ops awareness section

## Architecture

### Files Created

| File                                               | Purpose                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `lib/daily-ops/types.ts`                           | Type definitions (PlanItem, PlanLane, DailyPlan)                 |
| `lib/daily-ops/plan-engine.ts`                     | Pure computation — categorizes items into 4 lanes                |
| `lib/daily-ops/actions.ts`                         | Server actions (getDailyPlan, completePlanItem, dismissPlanItem) |
| `lib/daily-ops/draft-engine.ts`                    | Auto-draft routine comms via Ollama                              |
| `app/(chef)/daily/page.tsx`                        | Daily Ops page                                                   |
| `components/daily-ops/daily-plan-view.tsx`         | Main client component                                            |
| `components/daily-ops/plan-lane.tsx`               | Swim lane component                                              |
| `components/daily-ops/plan-item.tsx`               | Individual item with actions                                     |
| `components/daily-ops/remy-summary.tsx`            | Remy's daily summary                                             |
| `components/daily-ops/completion-celebration.tsx`  | "All clear" state                                                |
| `components/daily-ops/daily-plan-banner.tsx`       | Dashboard banner                                                 |
| `supabase/migrations/20260322000040_daily_ops.sql` | DB tables                                                        |

### Files Modified

| File                                   | Change                                   |
| -------------------------------------- | ---------------------------------------- |
| `app/(chef)/dashboard/page.tsx`        | Added daily plan banner                  |
| `components/navigation/nav-config.tsx` | Added /daily to nav + mobile tabs        |
| `lib/ai/remy-context.ts`               | Added daily plan stats to Remy's context |
| `lib/ai/remy-personality.ts`           | Added Daily Ops awareness section        |
| `lib/ai/remy-types.ts`                 | Added dailyPlan field to RemyContext     |

### Database Tables

- `daily_plan_drafts` — Auto-generated draft communications (chef_id, plan_date, draft_type, body, status)
- `daily_plan_dismissals` — Items dismissed/snoozed for a given day (chef_id, item_key, dismissed_date)

Both tables have RLS policies scoped to the chef's tenant.

## Tier Assignment

- **Daily Ops page + plan engine:** Free tier (core workflow)
- **Auto-drafted communications:** Pro tier (AI-assisted drafting via smart-assistant module)

## Key Design Decisions

1. **No new data fetches** — The plan engine reuses all existing server actions. No new database queries were needed for the core plan.
2. **Dismissals are per-day** — Dismissed items come back tomorrow. No permanent suppression.
3. **Time estimates are rough** — Better to have approximate numbers than none. The chef learns their own pace.
4. **Admin first, creative last** — This is the core insight. Clear the mental overhead fast, then protect creative time.
5. **Celebration state** — When all lanes are clear, the page says "Go cook." This is the reward.
6. **Flexible per-chef** — Every chef has different hours and workflows. The system organizes by priority, not by clock time. Chefs configure their own protected time blocks.
