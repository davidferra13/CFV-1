# Remy Full Implementation Plan — 307 Missing Actions

> **Vision:** "Anything the user can manually do on the website, Remy should be able to do. There's no difference."
>
> **Current state:** 97 actions exist (40 Tier 1 reads, 49 Tier 2 writes, 8 Tier 3 banned)
> **Target state:** 404 actions total (97 existing + 307 new)
> **Registry:** `docs/remy-tool-registry.md`

---

## Architecture — How Actions Get Added

There are exactly **two patterns** for adding new Remy actions. Every one of the 307 missing actions follows one of these:

### Pattern A: Tier 1 (Read-Only) — 3 files touched

Tier 1 actions auto-execute and show results immediately. No chef approval needed.

**Files to modify:**

1. `lib/ai/command-task-descriptions.ts` — Add entry to `TASK_DESCRIPTIONS` array
2. `lib/ai/command-orchestrator.ts` — Add executor function + switch case + `supportedTaskTypes` entry

**Template:**

```typescript
// 1. In command-task-descriptions.ts:
{
  type: 'analytics.revenue_forecast',
  tier: 1,
  name: 'Revenue Forecast',
  description: 'Project future revenue based on pipeline and historical data.',
  inputSchema: '{ "months": "number — optional, forecast horizon, defaults to 3" }',
}

// 2. In command-orchestrator.ts:
// a) Add to supportedTaskTypes Set
// b) Add executor function:
async function executeRevenueForecast(inputs: Record<string, unknown>, tenantId: string) {
  const { getPipelineForecasts } = await import('@/lib/analytics/actions')
  return getPipelineForecasts(tenantId)
}
// c) Add switch case:
case 'analytics.revenue_forecast':
  data = await executeRevenueForecast(task.inputs, tenantId)
  break
```

### Pattern B: Tier 2 (Write) — 2 files touched

Tier 2 actions show a preview card. Chef clicks Approve to commit.

**Files to modify:**

1. `lib/ai/agent-actions/<domain>-actions.ts` — Create or extend with `AgentActionDefinition`
2. `lib/ai/agent-actions/index.ts` — Register the new actions

**Template:**

```typescript
// 1. In agent-actions/<domain>-actions.ts:
export const myActions: AgentActionDefinition[] = [{
  taskType: 'agent.my_action',
  name: 'My Action',
  tier: 2,
  safety: 'reversible', // or 'significant'
  description: 'What this does.',
  inputSchema: '{ "field": "type — description" }',

  async executor(inputs, ctx) {
    // Validate, resolve entities, build preview
    return {
      preview: { actionType: 'agent.my_action', summary: '...', fields: [...], safety: 'reversible' },
      commitPayload: { /* data for commitAction */ }
    }
  },

  async commitAction(payload, ctx) {
    // Call the real server action
    const result = await someServerAction(payload.field, ctx.tenantId)
    return { success: true, message: 'Done!', redirectUrl: '/optional/path' }
  }
}]

// 2. In agent-actions/index.ts:
import { myActions } from './my-actions'
registerAgentActions(myActions)
```

### Build vs Wire

For each missing action, the work falls into one of two buckets:

| Type      | What it means                                                                             | Effort                |
| --------- | ----------------------------------------------------------------------------------------- | --------------------- |
| **WIRE**  | Server action already exists in `lib/`. Just write the Remy routing (executor + handler). | ~15-30 min per action |
| **BUILD** | Server action doesn't exist yet. Must write the server action first, then wire it.        | ~30-60 min per action |

**Good news: ~70-80% of missing actions are WIRE — the server actions already exist.**

---

## Implementation Phases

7 phases, ordered by impact. Each phase is independently shippable.

---

## Phase 1: Core Module Completions (62 actions)

**Why first:** These are the 7 most-used modules. Filling their gaps gives Remy the deepest coverage where chefs spend the most time.

**Estimated effort:** ~80% wire, ~20% build
**Files created:** 0 new agent-action files (extend existing ones)
**Files modified:** `command-task-descriptions.ts`, `command-orchestrator.ts`, 7 existing agent-action files

### 1A. Clients (15 actions)

#### Tier 1 Reads (6) — add to `command-task-descriptions.ts` + orchestrator

| #   | Task Type                 | Name                    | Server Action                        | Wire/Build |
| --- | ------------------------- | ----------------------- | ------------------------------------ | ---------- |
| 1   | `client.health_score`     | Client Health Score     | `getSingleClientHealthScore()`       | WIRE       |
| 2   | `client.find_duplicates`  | Find Duplicate Clients  | `findDuplicateClients()`             | WIRE       |
| 3   | `client.referral_tree`    | Client Referral Tree    | `getClientReferralTree()`            | WIRE       |
| 4   | `client.profitability`    | Client Profitability    | `getClientFinancialDetail()`         | WIRE       |
| 5   | `client.next_best_action` | Client Next Best Action | `getNextInquiryAction()` + heuristic | BUILD      |
| 6   | `client.segment.list`     | List Client Segments    | `getSegments()`                      | WIRE       |

#### Tier 2 Writes (9) — add to `client-actions.ts`

| #   | Task Type                       | Name                        | Server Action                | Wire/Build |
| --- | ------------------------------- | --------------------------- | ---------------------------- | ---------- |
| 7   | `agent.update_client_status`    | Update Client Status        | `updateClientStatus()`       | WIRE       |
| 8   | `agent.mark_client_inactive`    | Mark Intentionally Inactive | `updateClientStatus()`       | WIRE       |
| 9   | `agent.archive_client`          | Archive Client              | `bulkArchiveClients()`       | WIRE       |
| 10  | `agent.restore_client`          | Restore Client              | `restoreClient()`            | WIRE       |
| 11  | `agent.cancel_invitation`       | Cancel Invitation           | `cancelInvitation()`         | WIRE       |
| 12  | `agent.update_household`        | Update Household Info       | `updateClientHousehold()`    | WIRE       |
| 13  | `agent.toggle_automated_emails` | Toggle Automated Emails     | `setClientAutomatedEmails()` | WIRE       |
| 14  | `agent.award_loyalty_bonus`     | Award Loyalty Bonus         | `awardPoints()`              | WIRE       |
| 15  | `agent.redeem_loyalty`          | Redeem Loyalty Reward       | `redeemPoints()`             | WIRE       |

### 1B. Events (19 actions)

#### Tier 1 Reads (3) — add to orchestrator

| #   | Task Type                 | Name                    | Server Action                            | Wire/Build |
| --- | ------------------------- | ----------------------- | ---------------------------------------- | ---------- |
| 16  | `event.readiness`         | Event Readiness Check   | `getEventClosureStatus()`                | WIRE       |
| 17  | `event.scope_check`       | Detect Scope Drift      | custom query (event vs quote comparison) | BUILD      |
| 18  | `event.dietary_conflicts` | Check Dietary Conflicts | `executeDietaryCheck()` reuse            | WIRE       |

#### Tier 2 Writes (16) — add to `event-actions.ts` and `event-ops-actions.ts`

| #   | Task Type                    | Name                         | Server Action                  | Wire/Build |
| --- | ---------------------------- | ---------------------------- | ------------------------------ | ---------- |
| 19  | `agent.reschedule_event`     | Reschedule Event             | `rescheduleEvent()`            | WIRE       |
| 20  | `agent.archive_event`        | Archive Event                | `deleteEvent()` (soft)         | WIRE       |
| 21  | `agent.restore_event`        | Restore Event                | `restoreEvent()`               | WIRE       |
| 22  | `agent.set_food_cost_budget` | Set Food Cost Budget         | `setEventFoodCostBudget()`     | WIRE       |
| 23  | `agent.financial_close`      | Mark Financial Closed        | `markResetComplete()`          | WIRE       |
| 24  | `agent.followup_sent`        | Mark Follow-Up Sent          | `markFollowUpSent()`           | WIRE       |
| 25  | `agent.update_travel_time`   | Update Travel Time           | `updateEventTravelTime()`      | WIRE       |
| 26  | `agent.log_charity_hours`    | Log Charity Hours            | `logCharityHours()`            | WIRE       |
| 27  | `agent.allergy_acknowledge`  | Acknowledge Dietary Conflict | direct Supabase update         | BUILD      |
| 28  | `agent.pre_event_checklist`  | Confirm Pre-Event Checklist  | `getOrCreateSafetyChecklist()` | WIRE       |
| 29  | `agent.toggle_countdown`     | Toggle Countdown             | direct Supabase update         | BUILD      |
| 30  | `agent.import_historical`    | Import Historical Event      | `createEvent()` with past date | WIRE       |
| 31  | `agent.start_time_tracking`  | Start Time Tracking          | `startEventActivity()`         | WIRE       |
| 32  | `agent.stop_time_tracking`   | Stop Time Tracking           | `stopEventActivity()`          | WIRE       |
| 33  | `agent.upload_event_photo`   | Upload Event Photo           | file upload action             | BUILD      |
| 34  | `agent.geocode_event`        | Geocode Event Address        | geocoding service              | BUILD      |

### 1C. Inquiries (8 actions)

#### Tier 1 Reads (3)

| #   | Task Type                  | Name                     | Server Action                         | Wire/Build |
| --- | -------------------------- | ------------------------ | ------------------------------------- | ---------- |
| 35  | `inquiry.note.list`        | List Inquiry Notes       | direct Supabase query                 | BUILD      |
| 36  | `inquiry.stats`            | Inquiry Stats            | `getInquiryStats()`                   | WIRE       |
| 37  | `inquiry.check_duplicates` | Check Inquiry Duplicates | `getInquiriesWithoutClient()` + match | BUILD      |

#### Tier 2 Writes (5)

| #   | Task Type                      | Name                   | Server Action               | Wire/Build |
| --- | ------------------------------ | ---------------------- | --------------------------- | ---------- |
| 38  | `agent.set_booking_likelihood` | Set Booking Likelihood | direct Supabase update      | BUILD      |
| 39  | `agent.update_inquiry_note`    | Update Inquiry Note    | direct Supabase update      | BUILD      |
| 40  | `agent.toggle_note_pin`        | Toggle Note Pin        | direct Supabase update      | BUILD      |
| 41  | `agent.restore_inquiry`        | Restore Inquiry        | `restoreInquiry()`          | WIRE       |
| 42  | `agent.bulk_archive_inquiries` | Bulk Archive Inquiries | `bulkTransitionInquiries()` | WIRE       |

### 1D. Quotes (7 actions)

#### Tier 1 Reads (4)

| #   | Task Type               | Name                   | Server Action         | Wire/Build |
| --- | ----------------------- | ---------------------- | --------------------- | ---------- |
| 43  | `quote.list`            | List Quotes            | `getQuotes()`         | WIRE       |
| 44  | `quote.details`         | Quote Details          | `getQuoteById()`      | WIRE       |
| 45  | `quote.version_history` | Quote Version History  | `getQuotesByEvent()`  | WIRE       |
| 46  | `quote.pricing_history` | Client Pricing History | `getQuotesByClient()` | WIRE       |

#### Tier 2 Writes (3)

| #   | Task Type                  | Name                       | Server Action                      | Wire/Build |
| --- | -------------------------- | -------------------------- | ---------------------------------- | ---------- |
| 47  | `agent.update_quote`       | Update Quote               | `updateQuote()`                    | WIRE       |
| 48  | `agent.revise_quote`       | Revise Quote (New Version) | `createQuote()` with revision link | WIRE       |
| 49  | `agent.record_lost_reason` | Record Lost Reason         | direct Supabase update             | BUILD      |

### 1E. Menus (10 actions)

#### Tier 1 Reads (2)

| #   | Task Type              | Name                 | Server Action         | Wire/Build |
| --- | ---------------------- | -------------------- | --------------------- | ---------- |
| 50  | `menu.template.list`   | List Menu Templates  | `getMenus()` filtered | WIRE       |
| 51  | `menu.preferences.get` | Get Menu Preferences | direct Supabase query | BUILD      |

#### Tier 2 Writes (8)

| #   | Task Type                  | Name                    | Server Action                   | Wire/Build |
| --- | -------------------------- | ----------------------- | ------------------------------- | ---------- |
| 52  | `agent.detach_menu`        | Detach Menu from Event  | `unlinkMenuFromEvent()`         | WIRE       |
| 53  | `agent.update_component`   | Update Component        | `updateComponent()`             | WIRE       |
| 54  | `agent.link_recipe_dish`   | Link Recipe to Dish     | `linkRecipeToMenu()`            | WIRE       |
| 55  | `agent.unlink_recipe_dish` | Unlink Recipe from Dish | `unlinkRecipeFromMenu()`        | WIRE       |
| 56  | `agent.archive_dish`       | Archive Dish            | `deleteDish()` (soft)           | WIRE       |
| 57  | `agent.restore_dish`       | Restore Dish            | direct Supabase update          | BUILD      |
| 58  | `agent.clone_menu`         | Clone Menu              | `duplicateMenu()` already wired | SKIP       |
| 59  | `agent.reorder_courses`    | Reorder Courses         | direct Supabase update          | BUILD      |

### 1F. Calendar & Scheduling (16 actions)

#### Tier 1 Reads (6)

| #   | Task Type                  | Name              | Server Action          | Wire/Build |
| --- | -------------------------- | ----------------- | ---------------------- | ---------- |
| 60  | `scheduling.today`         | Today's Schedule  | `getTodaysSchedule()`  | WIRE       |
| 61  | `scheduling.week_schedule` | Week Schedule     | `getWeekSchedule()`    | WIRE       |
| 62  | `calendar.year_density`    | Year Density      | `getYearSummary()`     | WIRE       |
| 63  | `calendar.unified`         | Unified Calendar  | `getUnifiedCalendar()` | WIRE       |
| 64  | `scheduling.gaps`          | Scheduling Gaps   | `getSchedulingGaps()`  | WIRE       |
| 65  | `waitlist.for_date`        | Waitlist for Date | filtered query         | BUILD      |

#### Tier 2 Writes (10)

| #   | Task Type                       | Name                         | Server Action                        | Wire/Build |
| --- | ------------------------------- | ---------------------------- | ------------------------------------ | ---------- |
| 66  | `agent.block_date`              | Block Date                   | `createCalendarEntry()` type=blocked | WIRE       |
| 67  | `agent.unblock_date`            | Unblock Date                 | `deleteCalendarEntry()`              | WIRE       |
| 68  | `agent.create_prep_block`       | Create Prep Block            | `createPrepBlock()`                  | WIRE       |
| 69  | `agent.update_prep_block`       | Update Prep Block            | `updatePrepBlock()`                  | WIRE       |
| 70  | `agent.complete_prep_block`     | Complete Prep Block          | `completePrepBlock()`                | WIRE       |
| 71  | `agent.mark_entry_complete`     | Mark Calendar Entry Complete | direct Supabase update               | BUILD      |
| 72  | `agent.add_to_waitlist`         | Add to Waitlist              | direct Supabase insert               | BUILD      |
| 73  | `agent.convert_waitlist`        | Convert Waitlist to Inquiry  | `createInquiry()` from waitlist      | WIRE       |
| 74  | `agent.update_capacity`         | Update Capacity              | `updateCapacitySettings()`           | WIRE       |
| 75  | `agent.set_availability_signal` | Set Availability Signal      | `createSignalEntry()`                | WIRE       |

### 1G. Recipes (8 actions — reads only, writes are Tier 3 banned)

#### Tier 1 Reads (7)

| #   | Task Type                | Name                    | Server Action                      | Wire/Build |
| --- | ------------------------ | ----------------------- | ---------------------------------- | ---------- |
| 76  | `recipe.details`         | Recipe Details          | `getRecipeById()`                  | WIRE       |
| 77  | `recipe.list`            | List Recipes            | `getRecipes()`                     | WIRE       |
| 78  | `recipe.nutrition`       | Recipe Nutrition        | `getRecipeById()` nutrition fields | WIRE       |
| 79  | `recipe.allergens`       | Detect Recipe Allergens | `getRecipeById()` allergen fields  | WIRE       |
| 80  | `recipe.debt`            | Recipe Debt             | custom query (recipes w/o costs)   | BUILD      |
| 81  | `recipe.production.list` | Production Log          | `getRecipeProductionLog()`         | WIRE       |
| 82  | `recipe.ingredient.list` | List Ingredients        | `getRecipeIngredients()`           | WIRE       |

#### Tier 2 Write (1 — non-recipe-content write)

| #   | Task Type              | Name               | Server Action          | Wire/Build |
| --- | ---------------------- | ------------------ | ---------------------- | ---------- |
| 83  | `agent.log_production` | Log Production Run | direct Supabase insert | BUILD      |

**Phase 1 Total: 62 actions (42 WIRE, 20 BUILD)**

---

## Phase 2: Finance & Analytics (52 actions)

**Why second:** Chefs ask Remy financial questions constantly. Currently Remy only has `finance.summary` and `finance.monthly_snapshot`. This phase makes Remy a financial intelligence layer.

**Estimated effort:** ~85% wire (analytics server actions are comprehensive)
**Files created:** 1 new agent-action file (`finance-extended-actions.ts`)
**Files modified:** `command-task-descriptions.ts`, `command-orchestrator.ts`, `financial-call-actions.ts`

### 2A. Financial Reads (17 Tier 1)

| #   | Task Type                         | Name                   | Server Action                | Wire/Build |
| --- | --------------------------------- | ---------------------- | ---------------------------- | ---------- |
| 84  | `finance.outstanding_balances`    | Outstanding Balances   | computed from ledger view    | WIRE       |
| 85  | `finance.p_and_l`                 | Profit & Loss Report   | `getRevenueAnalytics()`      | WIRE       |
| 86  | `finance.cash_flow`               | Cash Flow Forecast     | `getPipelineForecasts()`     | WIRE       |
| 87  | `finance.tax.summary`             | Tax Year Summary       | `getTaxSummary()`            | WIRE       |
| 88  | `finance.tax.quarterly`           | Quarterly Tax Estimate | `getQuarterlyEstimate()`     | WIRE       |
| 89  | `finance.expense.get`             | Get Expense Details    | direct Supabase query        | WIRE       |
| 90  | `finance.mileage.list`            | Mileage Logs           | direct Supabase query        | WIRE       |
| 91  | `finance.mileage.ytd`             | YTD Mileage Summary    | computed query               | WIRE       |
| 92  | `finance.tip.ytd`                 | YTD Tip Summary        | computed query               | WIRE       |
| 93  | `finance.payment_plan.list`       | Payment Plans          | direct Supabase query        | WIRE       |
| 94  | `finance.budget_guardrail`        | Budget Guardrail Check | computed from event budget   | WIRE       |
| 95  | `billing.payout_summary`          | Payout Summary         | `getPayoutSummary()`         | WIRE       |
| 96  | `analytics.revenue_by_source`     | Revenue by Source      | `getRevenueAnalytics()`      | WIRE       |
| 97  | `analytics.revenue_by_day`        | Revenue by Day of Week | `getRevenueAnalytics()`      | WIRE       |
| 98  | `analytics.effective_hourly_rate` | Effective Hourly Rate  | computed from events + hours | BUILD      |
| 99  | `finance.tax.settings`            | Sales Tax Settings     | direct Supabase query        | WIRE       |
| 100 | `finance.bank.transactions`       | Bank Transactions      | direct Supabase query        | WIRE       |

### 2B. Financial Writes (12 Tier 2)

| #   | Task Type                     | Name                        | Server Action                | Wire/Build |
| --- | ----------------------------- | --------------------------- | ---------------------------- | ---------- |
| 101 | `agent.export_expenses`       | Export Expenses CSV         | `exportLedgerCSV()`          | WIRE       |
| 102 | `agent.create_payment_plan`   | Create Payment Plan         | direct Supabase insert       | BUILD      |
| 103 | `agent.add_installment`       | Add Installment             | direct Supabase insert       | BUILD      |
| 104 | `agent.mark_installment_paid` | Mark Installment Paid       | direct Supabase update       | BUILD      |
| 105 | `agent.sales_tax_remit`       | Record Sales Tax Remittance | direct Supabase insert       | BUILD      |
| 106 | `agent.create_retainer`       | Create Retainer             | direct Supabase insert       | BUILD      |
| 107 | `agent.activate_retainer`     | Activate Retainer           | direct Supabase update       | BUILD      |
| 108 | `agent.create_dispute`        | Create Dispute              | direct Supabase insert       | BUILD      |
| 109 | `agent.resolve_dispute`       | Resolve Dispute             | direct Supabase update       | BUILD      |
| 110 | `agent.record_payroll`        | Record Payroll              | direct Supabase insert       | BUILD      |
| 111 | `agent.export_ledger`         | Export Ledger CSV           | `exportLedgerCSV()`          | WIRE       |
| 112 | `agent.export_revenue`        | Export Revenue CSV          | `exportLedgerCSV()` filtered | WIRE       |

### 2C. Analytics Reads (18 Tier 1)

| #   | Task Type                        | Name                   | Server Action               | Wire/Build |
| --- | -------------------------------- | ---------------------- | --------------------------- | ---------- |
| 113 | `analytics.revenue_forecast`     | Revenue Forecast       | `getPipelineForecasts()`    | WIRE       |
| 114 | `analytics.pipeline_forecast`    | Pipeline Forecast      | `getPipelineAnalytics()`    | WIRE       |
| 115 | `analytics.conversion_funnel`    | Conversion Funnel      | `getConversionRates()`      | WIRE       |
| 116 | `analytics.referral`             | Referral Analytics     | `getReferralAnalytics()`    | WIRE       |
| 117 | `analytics.retention`            | Retention Stats        | `getClientAnalytics()`      | WIRE       |
| 118 | `analytics.seasonal`             | Seasonal Performance   | `getSeasonalityPatterns()`  | WIRE       |
| 119 | `analytics.top_clients`          | Top Clients            | `getClientLTV()` sorted     | WIRE       |
| 120 | `analytics.food_cost_trend`      | Food Cost Trend        | `getCostTrends()`           | WIRE       |
| 121 | `analytics.quote_acceptance`     | Quote Acceptance Stats | `getQuoteInsights()`        | WIRE       |
| 122 | `analytics.dish_performance`     | Dish Performance       | `getCulinaryAnalytics()`    | WIRE       |
| 123 | `analytics.nps`                  | NPS Stats              | direct Supabase query       | BUILD      |
| 124 | `analytics.benchmarks`           | Benchmarks             | `getStageBenchmarks()`      | WIRE       |
| 125 | `analytics.demand_forecast`      | Demand Forecast        | `getDemandForecasts()`      | WIRE       |
| 126 | `analytics.pricing_suggestion`   | Pricing Suggestion     | `getPricingSuggestions()`   | WIRE       |
| 127 | `analytics.daily_report`         | Daily Report           | custom aggregation          | BUILD      |
| 128 | `analytics.revenue_gap`          | Revenue Gap Analysis   | `getRevenueAnalytics()`     | WIRE       |
| 129 | `analytics.menu_recommendations` | Menu Recommendations   | `getMenuRecommendations()`  | WIRE       |
| 130 | `analytics.open_dates`           | Open Date Suggestions  | `getSchedulingGaps()` reuse | WIRE       |

### 2D. Analytics/Report Writes (5 Tier 2)

| #   | Task Type                        | Name                     | Server Action              | Wire/Build |
| --- | -------------------------------- | ------------------------ | -------------------------- | ---------- |
| 131 | `agent.export_events_csv`        | Export Events CSV        | custom CSV builder         | BUILD      |
| 132 | `agent.export_event_csv`         | Export Single Event      | custom CSV builder         | BUILD      |
| 133 | `agent.run_custom_report`        | Run Custom Report        | `getCustomReports()`       | WIRE       |
| 134 | `agent.generate_enhanced_report` | Generate Enhanced Report | `generateEnhancedReport()` | WIRE       |
| 135 | `agent.export_revenue_csv`       | Export Revenue CSV       | reuse above                | WIRE       |

**Phase 2 Total: 52 actions (38 WIRE, 14 BUILD)**

---

## Phase 3: Operations, Safety & Staff (48 actions)

**Why third:** Staff management, safety compliance, and live-service operations are daily workflows that Remy currently can't touch beyond basic staff CRUD.

**Files created:** 3 new agent-action files (`safety-actions.ts`, `equipment-actions.ts`, `live-ops-actions.ts`)
**Files modified:** `staff-actions.ts`, `operations-actions.ts`

### 3A. Staff (12 actions)

#### Tier 1 Reads (5)

| #   | Task Type                 | Name                    | Server Action                  | Wire/Build |
| --- | ------------------------- | ----------------------- | ------------------------------ | ---------- |
| 136 | `staff.search`            | Search Staff            | `getStaffMembers()` filtered   | WIRE       |
| 137 | `staff.performance`       | Staff Performance Board | `getStaffPerformanceMetrics()` | WIRE       |
| 138 | `staff.onboarding.status` | Staff Onboarding Status | `getStaffOnboarding()`         | WIRE       |
| 139 | `staff.labor_cost`        | Compute Labor Cost      | computed from hours + rates    | WIRE       |
| 140 | `staff.coc.status`        | Code of Conduct Status  | direct Supabase query          | BUILD      |

#### Tier 2 Writes (7)

| #   | Task Type                      | Name                    | Server Action               | Wire/Build |
| --- | ------------------------------ | ----------------------- | --------------------------- | ---------- |
| 141 | `agent.update_staff`           | Update Staff Member     | `updateStaffMember()`       | WIRE       |
| 142 | `agent.remove_staff_event`     | Remove Staff from Event | `unassignStaffFromEvent()`  | WIRE       |
| 143 | `agent.set_staff_availability` | Set Staff Availability  | `updateStaffAvailability()` | WIRE       |
| 144 | `agent.clock_in`               | Clock In                | direct Supabase insert      | BUILD      |
| 145 | `agent.clock_out`              | Clock Out               | direct Supabase update      | BUILD      |
| 146 | `agent.generate_briefing`      | Generate Staff Briefing | custom query + format       | BUILD      |
| 147 | `agent.create_staff_login`     | Create Staff Login      | `createOnboardingTask()`    | WIRE       |

### 3B. Safety & Compliance (14 actions)

#### Tier 1 Reads (7) — new file: safety reads in orchestrator

| #   | Task Type                   | Name                | Server Action              | Wire/Build |
| --- | --------------------------- | ------------------- | -------------------------- | ---------- |
| 148 | `safety.temp_log.get`       | Get Temp Log        | direct Supabase query      | WIRE       |
| 149 | `safety.temp_log.analyze`   | Analyze Temp Log    | computed (threshold check) | BUILD      |
| 150 | `safety.incident.list`      | List Incidents      | direct Supabase query      | WIRE       |
| 151 | `safety.incident.get`       | Get Incident        | direct Supabase query      | WIRE       |
| 152 | `safety.certification.list` | List Certifications | direct Supabase query      | WIRE       |
| 153 | `safety.recall.list`        | Active Food Recalls | direct Supabase query      | WIRE       |
| 154 | `safety.haccp.get`          | HACCP Plan          | `getHACCPPlan()`           | WIRE       |

#### Tier 2 Writes (7) — new file: `agent-actions/safety-actions.ts`

| #   | Task Type                    | Name                 | Server Action          | Wire/Build |
| --- | ---------------------------- | -------------------- | ---------------------- | ---------- |
| 155 | `agent.log_temperature`      | Log Temperature      | direct Supabase insert | BUILD      |
| 156 | `agent.create_incident`      | Create Incident      | direct Supabase insert | BUILD      |
| 157 | `agent.update_incident`      | Update Incident      | direct Supabase update | BUILD      |
| 158 | `agent.create_certification` | Create Certification | direct Supabase insert | BUILD      |
| 159 | `agent.update_certification` | Update Certification | direct Supabase update | BUILD      |
| 160 | `agent.dismiss_recall`       | Dismiss Recall       | direct Supabase update | BUILD      |
| 161 | `agent.toggle_haccp_section` | Toggle HACCP Section | direct Supabase update | BUILD      |

### 3C. Documents (14 actions)

#### Tier 1 Reads (1)

| #   | Task Type            | Name               | Server Action            | Wire/Build |
| --- | -------------------- | ------------------ | ------------------------ | ---------- |
| 162 | `document.readiness` | Document Readiness | `getDocumentReadiness()` | WIRE       |

#### Tier 2 Writes (13) — extend `proactive-actions.ts` or new file

| #   | Task Type                          | Name                       | Server Action                             | Wire/Build |
| --- | ---------------------------------- | -------------------------- | ----------------------------------------- | ---------- |
| 163 | `agent.generate_invoice`           | Generate Invoice PDF       | `generateDocument('invoice')`             | WIRE       |
| 164 | `agent.generate_receipt`           | Generate Receipt           | `generateDocument('receipt')`             | WIRE       |
| 165 | `agent.generate_contract`          | Generate Contract          | `generateDocument('contract')`            | WIRE       |
| 166 | `agent.generate_quote_pdf`         | Generate Quote PDF         | `generateDocument('quote')`               | WIRE       |
| 167 | `agent.generate_prep_sheet`        | Generate Prep Sheet        | `generateDocument('prep-sheet')`          | WIRE       |
| 168 | `agent.generate_packing_list`      | Generate Packing List PDF  | `generateDocument('packing-list')`        | WIRE       |
| 169 | `agent.generate_checklist`         | Generate Checklist         | `generateDocument('checklist')`           | WIRE       |
| 170 | `agent.generate_execution_sheet`   | Generate Execution Sheet   | `generateDocument('execution-sheet')`     | WIRE       |
| 171 | `agent.generate_grocery_list`      | Generate Grocery List PDF  | `generateDocument('grocery-list')`        | WIRE       |
| 172 | `agent.generate_travel_route`      | Generate Travel Route      | `generateDocument('travel-route')`        | WIRE       |
| 173 | `agent.generate_foh_menu`          | Generate FOH Menu          | `generateDocument('front-of-house-menu')` | WIRE       |
| 174 | `agent.generate_content_shot_list` | Generate Content Shot List | `generateDocument('content-shot-list')`   | WIRE       |
| 175 | `agent.upload_document`            | Upload Document            | file upload action                        | BUILD      |

### 3D. Equipment & Contracts (8 actions)

| #   | Task Type                     | Name                         | Server Action                  | Wire/Build |
| --- | ----------------------------- | ---------------------------- | ------------------------------ | ---------- |
| 176 | `equipment.list`              | List Equipment (T1)          | direct Supabase query          | WIRE       |
| 177 | `equipment.depreciation`      | Equipment Depreciation (T1)  | `getEquipmentDepreciation()`   | WIRE       |
| 178 | `agent.create_equipment`      | Create Equipment (T2)        | direct Supabase insert         | BUILD      |
| 179 | `agent.update_equipment`      | Update Equipment (T2)        | direct Supabase update         | BUILD      |
| 180 | `agent.log_maintenance`       | Log Maintenance (T2)         | direct Supabase insert         | BUILD      |
| 181 | `agent.generate_contract_doc` | Generate Contract (T2)       | `generateDocument('contract')` | WIRE       |
| 182 | `contract.get`                | Get Event Contract (T1)      | direct Supabase query          | WIRE       |
| 183 | `contract.template.list`      | List Contract Templates (T1) | direct Supabase query          | WIRE       |

**Phase 3 Total: 48 actions (28 WIRE, 20 BUILD)**

---

## Phase 4: Engagement & Growth (47 actions)

**Why fourth:** Loyalty, campaigns, goals, and reviews drive business growth. These are Pro-tier features that differentiate ChefFlow.

**Files created:** 5 new agent-action files (`loyalty-actions.ts`, `campaign-actions.ts`, `goal-actions.ts`, `review-actions.ts`, `notification-actions.ts`)

### 4A. Loyalty Program (16 actions)

#### Tier 1 Reads (7)

| #   | Task Type                     | Name                      | Server Action                    | Wire/Build |
| --- | ----------------------------- | ------------------------- | -------------------------------- | ---------- |
| 184 | `loyalty.overview`            | Loyalty Overview          | `getLoyaltyOverview()`           | WIRE       |
| 185 | `loyalty.transactions`        | Loyalty Transactions      | `getLoyaltyTransactionHistory()` | WIRE       |
| 186 | `loyalty.approaching_rewards` | Approaching Rewards       | `getClientMilestones()`          | WIRE       |
| 187 | `loyalty.client_profile`      | Client Loyalty Profile    | `getClientLoyalty()`             | WIRE       |
| 188 | `loyalty.config.get`          | Loyalty Config            | `getLoyaltyConfig()`             | WIRE       |
| 189 | `loyalty.reward.list`         | List Rewards              | `listLoyaltyRewards()`           | WIRE       |
| 190 | `loyalty.pending_deliveries`  | Pending Reward Deliveries | direct Supabase query            | BUILD      |

#### Tier 2 Writes (9)

| #   | Task Type                     | Name                  | Server Action                   | Wire/Build |
| --- | ----------------------------- | --------------------- | ------------------------------- | ---------- |
| 191 | `agent.update_loyalty_config` | Update Loyalty Config | `updateLoyaltyConfig()`         | WIRE       |
| 192 | `agent.create_reward`         | Create Reward         | `createLoyaltyReward()`         | WIRE       |
| 193 | `agent.update_reward`         | Update Reward         | `updateLoyaltyReward()`         | WIRE       |
| 194 | `agent.redeem_reward`         | Redeem Reward         | `redeemPoints()`                | WIRE       |
| 195 | `agent.award_points`          | Award Bonus Points    | `awardPoints()`                 | WIRE       |
| 196 | `agent.award_event_points`    | Award Event Points    | `awardPoints()` (event context) | WIRE       |
| 197 | `agent.create_gift_card`      | Create Gift Card      | direct Supabase insert          | BUILD      |
| 198 | `agent.send_gift_card`        | Send Gift Card        | draft + insert                  | BUILD      |
| 199 | `agent.mark_delivery`         | Mark Reward Delivered | direct Supabase update          | BUILD      |

### 4B. Goals & Testimonials (12 actions)

#### Tier 1 Reads (6)

| #   | Task Type              | Name                | Server Action              | Wire/Build |
| --- | ---------------------- | ------------------- | -------------------------- | ---------- |
| 200 | `goals.list`           | Active Goals        | direct Supabase query      | WIRE       |
| 201 | `goals.dashboard`      | Goals Dashboard     | aggregated query           | WIRE       |
| 202 | `goals.revenue_path`   | Revenue Path        | computed                   | BUILD      |
| 203 | `testimonials.list`    | List Testimonials   | direct Supabase query      | WIRE       |
| 204 | `reviews.stats`        | Review Stats        | direct Supabase query      | WIRE       |
| 205 | `reviews.unified_feed` | Unified Review Feed | `getSavedPosts()` filtered | WIRE       |

#### Tier 2 Writes (6)

| #   | Task Type                   | Name                | Server Action          | Wire/Build |
| --- | --------------------------- | ------------------- | ---------------------- | ---------- |
| 206 | `agent.create_goal`         | Create Goal         | direct Supabase insert | BUILD      |
| 207 | `agent.update_goal`         | Update Goal         | direct Supabase update | BUILD      |
| 208 | `agent.log_goal_checkin`    | Log Goal Check-In   | direct Supabase insert | BUILD      |
| 209 | `agent.approve_testimonial` | Approve Testimonial | direct Supabase update | WIRE       |
| 210 | `agent.feature_testimonial` | Feature Testimonial | direct Supabase update | WIRE       |
| 211 | `agent.create_service_type` | Create Service Type | direct Supabase insert | BUILD      |

### 4C. Notifications & Tasks (10 actions)

#### Tier 1 Reads (4)

| #   | Task Type                       | Name                     | Server Action                  | Wire/Build |
| --- | ------------------------------- | ------------------------ | ------------------------------ | ---------- |
| 212 | `notifications.list`            | List Notifications       | `getNotifications()`           | WIRE       |
| 213 | `notifications.preferences.get` | Notification Preferences | `getNotificationPreferences()` | WIRE       |
| 214 | `task.list`                     | List Tasks               | `listTasks()`                  | WIRE       |
| 215 | `task.template.list`            | List Task Templates      | `listTemplates()`              | WIRE       |

#### Tier 2 Writes (6)

| #   | Task Type                         | Name                      | Server Action                     | Wire/Build |
| --- | --------------------------------- | ------------------------- | --------------------------------- | ---------- |
| 216 | `agent.mark_notifications_read`   | Mark Notifications Read   | `markNotificationsReadBatch()`    | WIRE       |
| 217 | `agent.mark_all_read`             | Mark All Read             | `markNotificationsReadBatch()`    | WIRE       |
| 218 | `agent.update_notification_prefs` | Update Notification Prefs | `updateNotificationPreferences()` | WIRE       |
| 219 | `agent.update_task`               | Update Task               | `updateTask()`                    | WIRE       |
| 220 | `agent.complete_task`             | Complete Task             | `completeTask()`                  | WIRE       |
| 221 | `agent.create_task_template`      | Create Task Template      | `createTemplate()`                | WIRE       |

### 4D. Campaigns & Marketing (9 actions)

#### Tier 1 Reads (5)

| #   | Task Type                       | Name                 | Server Action             | Wire/Build |
| --- | ------------------------------- | -------------------- | ------------------------- | ---------- |
| 222 | `campaign.list`                 | List Campaigns       | direct Supabase query     | WIRE       |
| 223 | `campaign.get`                  | Campaign Details     | direct Supabase query     | WIRE       |
| 224 | `campaign.stats`                | Campaign Stats       | `getMarketingAnalytics()` | WIRE       |
| 225 | `campaign.push_dinner.list`     | List Push Dinners    | direct Supabase query     | WIRE       |
| 226 | `marketing.email_template.list` | List Email Templates | direct Supabase query     | WIRE       |

#### Tier 2 Writes (4)

| #   | Task Type                   | Name                      | Server Action          | Wire/Build |
| --- | --------------------------- | ------------------------- | ---------------------- | ---------- |
| 227 | `agent.create_campaign`     | Create Campaign           | direct Supabase insert | BUILD      |
| 228 | `agent.create_push_dinner`  | Create Push Dinner        | direct Supabase insert | BUILD      |
| 229 | `agent.save_email_template` | Save Email Template       | direct Supabase insert | BUILD      |
| 230 | `agent.create_sequence`     | Create Marketing Sequence | direct Supabase insert | BUILD      |

**Phase 4 Total: 47 actions (32 WIRE, 15 BUILD)**

---

## Phase 5: Contingency, AARs & Calls (22 actions)

**Why fifth:** These are important operational features but used less frequently than the above.

**Files created:** 2 new agent-action files (`aar-actions.ts`, `contingency-extended-actions.ts`)

### 5A. After-Action Reviews (10 actions)

#### Tier 1 Reads (6)

| #   | Task Type             | Name                      | Server Action         | Wire/Build |
| --- | --------------------- | ------------------------- | --------------------- | ---------- |
| 231 | `aar.list`            | List Recent AARs          | direct Supabase query | WIRE       |
| 232 | `aar.get`             | Get AAR                   | direct Supabase query | WIRE       |
| 233 | `aar.get_by_event`    | Get AAR by Event          | direct Supabase query | WIRE       |
| 234 | `aar.events_without`  | Events Without AAR        | computed query        | WIRE       |
| 235 | `aar.stats`           | AAR Stats                 | computed query        | BUILD      |
| 236 | `aar.forgotten_items` | Forgotten Items Frequency | computed query        | BUILD      |

#### Tier 2 Writes (4)

| #   | Task Type                   | Name                    | Server Action                               | Wire/Build |
| --- | --------------------------- | ----------------------- | ------------------------------------------- | ---------- |
| 237 | `agent.create_aar`          | Create AAR              | direct Supabase insert                      | BUILD      |
| 238 | `agent.update_aar`          | Update AAR              | direct Supabase update                      | BUILD      |
| 239 | `agent.generate_aar_draft`  | Generate AAR Draft (AI) | `generateAAR()` from `lib/ai/aar-generator` | WIRE       |
| 240 | `agent.save_recipe_debrief` | Save Recipe Debrief     | direct Supabase insert                      | BUILD      |

### 5B. Contingency Planning (6 actions)

#### Tier 1 Reads (2)

| #   | Task Type                         | Name                  | Server Action         | Wire/Build |
| --- | --------------------------------- | --------------------- | --------------------- | ---------- |
| 241 | `contingency.get`                 | Get Contingency Notes | direct Supabase query | WIRE       |
| 242 | `contingency.backup_contact.list` | List Backup Contacts  | direct Supabase query | WIRE       |

#### Tier 2 Writes (4)

| #   | Task Type                     | Name                            | Server Action                             | Wire/Build |
| --- | ----------------------------- | ------------------------------- | ----------------------------------------- | ---------- |
| 243 | `agent.upsert_contingency`    | Upsert Contingency Note         | `upsertContingencyNote()`                 | WIRE       |
| 244 | `agent.generate_contingency`  | Generate Contingency Plans (AI) | `generateContingencyPlans()`              | WIRE       |
| 245 | `agent.create_backup_contact` | Create Backup Contact           | `createEmergencyContact()` already exists | WIRE       |
| 246 | `agent.update_backup_contact` | Update Backup Contact           | direct Supabase update                    | BUILD      |

### 5C. Calls & Scheduling (6 actions)

#### Tier 1 Reads (2)

| #   | Task Type   | Name             | Server Action         | Wire/Build |
| --- | ----------- | ---------------- | --------------------- | ---------- |
| 247 | `call.list` | List Calls       | direct Supabase query | WIRE       |
| 248 | `call.get`  | Get Call Details | direct Supabase query | WIRE       |

#### Tier 2 Writes (4)

| #   | Task Type               | Name               | Server Action          | Wire/Build |
| --- | ----------------------- | ------------------ | ---------------------- | ---------- |
| 249 | `agent.update_call`     | Update Call        | direct Supabase update | BUILD      |
| 250 | `agent.add_agenda_item` | Add Agenda Item    | direct Supabase insert | BUILD      |
| 251 | `agent.toggle_agenda`   | Toggle Agenda Item | direct Supabase update | BUILD      |
| 252 | `agent.remove_agenda`   | Remove Agenda Item | direct Supabase delete | BUILD      |

**Phase 5 Total: 22 actions (12 WIRE, 10 BUILD)**

---

## Phase 6: Advanced Features (46 actions)

**Why sixth:** Vendors, inventory, social media, surveys, live operations — these are sophisticated Pro features.

**Files created:** 4 new agent-action files (`vendor-actions.ts`, `social-actions.ts`, `survey-actions.ts`, `live-ops-actions.ts`)

### 6A. Vendors & Inventory (14 actions)

#### Tier 1 Reads (6)

| #   | Task Type                   | Name                | Server Action           | Wire/Build |
| --- | --------------------------- | ------------------- | ----------------------- | ---------- |
| 253 | `vendor.list`               | List Vendors        | direct Supabase query   | WIRE       |
| 254 | `inventory.stock`           | Current Stock       | `getInventorySummary()` | WIRE       |
| 255 | `inventory.expiry_alerts`   | Expiry Alerts       | computed query          | WIRE       |
| 256 | `inventory.par_alerts`      | Par Alerts          | computed query          | WIRE       |
| 257 | `inventory.reorder`         | Reorder Suggestions | `forecastDemand()`      | WIRE       |
| 258 | `inventory.waste.dashboard` | Waste Dashboard     | `getInventoryTrends()`  | WIRE       |

#### Tier 2 Writes (8)

| #   | Task Type                      | Name                   | Server Action            | Wire/Build |
| --- | ------------------------------ | ---------------------- | ------------------------ | ---------- |
| 259 | `agent.create_vendor`          | Create Vendor          | direct Supabase insert   | BUILD      |
| 260 | `agent.update_vendor`          | Update Vendor          | direct Supabase update   | BUILD      |
| 261 | `agent.create_purchase_order`  | Create Purchase Order  | `createPurchaseOrder()`  | WIRE       |
| 262 | `agent.submit_po`              | Submit PO              | `approvePurchaseOrder()` | WIRE       |
| 263 | `agent.receive_po`             | Receive PO Items       | `receiveInventory()`     | WIRE       |
| 264 | `agent.create_inventory_audit` | Create Inventory Audit | `auditInventory()`       | WIRE       |
| 265 | `agent.log_waste`              | Log Waste              | `logWaste()`             | WIRE       |
| 266 | `agent.upload_vendor_invoice`  | Upload Vendor Invoice  | `vendorInvoice()`        | WIRE       |

### 6B. Social Media & Portfolio (9 actions)

#### Tier 1 Reads (3)

| #   | Task Type            | Name               | Server Action            | Wire/Build |
| --- | -------------------- | ------------------ | ------------------------ | ---------- |
| 267 | `social.post.list`   | List Social Posts  | `getSocialPosts()`       | WIRE       |
| 268 | `social.connections` | Social Connections | `getSocialConnections()` | WIRE       |
| 269 | `portfolio.list`     | List Portfolio     | direct Supabase query    | WIRE       |

#### Tier 2 Writes (6)

| #   | Task Type                   | Name                   | Server Action           | Wire/Build |
| --- | --------------------------- | ---------------------- | ----------------------- | ---------- |
| 270 | `agent.create_social_post`  | Create Social Post     | `createSocialPost()`    | WIRE       |
| 271 | `agent.update_social_post`  | Update Social Post     | direct Supabase update  | WIRE       |
| 272 | `agent.generate_captions`   | Generate Captions (AI) | Ollama-based generation | BUILD      |
| 273 | `agent.add_portfolio_item`  | Add Portfolio Item     | direct Supabase insert  | BUILD      |
| 274 | `agent.reorder_portfolio`   | Reorder Portfolio      | direct Supabase update  | BUILD      |
| 275 | `agent.upload_social_asset` | Upload Social Asset    | `uploadPostMedia()`     | WIRE       |

### 6C. Live Operations (12 actions)

#### Tier 1 Reads (1)

| #   | Task Type      | Name          | Server Action         | Wire/Build |
| --- | -------------- | ------------- | --------------------- | ---------- |
| 276 | `station.list` | List Stations | `getActiveStations()` | WIRE       |

#### Tier 2 Writes (11)

| #   | Task Type                       | Name                    | Server Action          | Wire/Build |
| --- | ------------------------------- | ----------------------- | ---------------------- | ---------- |
| 277 | `agent.create_station`          | Create Station          | direct Supabase insert | BUILD      |
| 278 | `agent.update_station`          | Update Station          | direct Supabase update | BUILD      |
| 279 | `agent.fire_course`             | Fire Course             | direct Supabase update | BUILD      |
| 280 | `agent.mark_plated`             | Mark Plated             | direct Supabase update | BUILD      |
| 281 | `agent.mark_served`             | Mark Served             | direct Supabase update | BUILD      |
| 282 | `agent.mark_86`                 | Mark 86'd               | direct Supabase update | BUILD      |
| 283 | `agent.split_billing`           | Set Split Billing       | direct Supabase update | BUILD      |
| 284 | `agent.generate_split_invoices` | Generate Split Invoices | `generateDocument()`   | WIRE       |
| 285 | `agent.append_ops_log`          | Append Ops Log          | direct Supabase insert | BUILD      |
| 286 | `agent.log_station_waste`       | Log Station Waste       | `logWaste()`           | WIRE       |
| 287 | `agent.create_order_request`    | Create Order Request    | direct Supabase insert | BUILD      |

### 6D. Surveys & Feedback (4 actions)

| #   | Task Type               | Name                           | Server Action           | Wire/Build |
| --- | ----------------------- | ------------------------------ | ----------------------- | ---------- |
| 288 | `survey.list`           | List Surveys (T1)              | direct Supabase query   | WIRE       |
| 289 | `agent.create_survey`   | Create Survey (T2)             | direct Supabase insert  | BUILD      |
| 290 | `agent.send_survey`     | Send Survey (T2)               | draft + notification    | BUILD      |
| 291 | `agent.extract_answers` | Extract Survey Answers AI (T2) | Ollama-based extraction | BUILD      |

### 6E. Email & Communication Extensions (2 actions)

| #   | Task Type                       | Name                         | Server Action                 | Wire/Build |
| --- | ------------------------------- | ---------------------------- | ----------------------------- | ---------- |
| 292 | `agent.draft_campaign_outreach` | Draft Campaign Outreach (T2) | `draftPersonalizedOutreach()` | WIRE       |
| 293 | `agent.draft_review_request`    | Draft Review Request (T2)    | custom draft generator        | BUILD      |

### 6F. Admin/Compliance (5 actions)

| #   | Task Type              | Name                      | Server Action          | Wire/Build |
| --- | ---------------------- | ------------------------- | ---------------------- | ---------- |
| 294 | `admin_time.get`       | Admin Time for Event (T1) | direct Supabase query  | WIRE       |
| 295 | `charity.hours.list`   | Charity Hours List (T1)   | direct Supabase query  | WIRE       |
| 296 | `charity.financials`   | Charity Financials (T1)   | computed query         | BUILD      |
| 297 | `agent.log_admin_time` | Log Admin Time (T2)       | direct Supabase insert | BUILD      |
| 298 | `agent.export_data`    | Export All Chef Data (T2) | custom export builder  | BUILD      |

**Phase 6 Total: 46 actions (25 WIRE, 21 BUILD)**

---

## Phase 7: Prospecting & Settings (30 actions)

**Why last:** Prospecting is admin-only. Settings are rarely conversational. These are the lowest-frequency actions.

**Files created:** 2 new agent-action files (`prospecting-actions.ts`, `settings-actions.ts`)

### 7A. Prospecting — Admin Only (23 actions)

#### Tier 1 Reads (7)

| #   | Task Type                | Name              | Server Action                   | Wire/Build |
| --- | ------------------------ | ----------------- | ------------------------------- | ---------- |
| 299 | `prospect.list`          | List Prospects    | `getProspects()`                | WIRE       |
| 300 | `prospect.details`       | Prospect Details  | `getProspect()`                 | WIRE       |
| 301 | `prospect.stats`         | Prospect Stats    | `getProspectStats()`            | WIRE       |
| 302 | `prospect.pipeline`      | Pipeline by Stage | `getProspectsByPipelineStage()` | WIRE       |
| 303 | `prospect.stage_history` | Stage History     | `getStageHistory()`             | WIRE       |
| 304 | `prospect.outreach_log`  | Outreach Log      | `getOutreachLog()`              | WIRE       |
| 305 | `prospect.daily_queue`   | Daily Queue       | `buildDailyQueue()`             | WIRE       |

#### Tier 2 Writes (16)

| #   | Task Type                     | Name                   | Server Action                | Wire/Build |
| --- | ----------------------------- | ---------------------- | ---------------------------- | ---------- |
| 306 | `agent.add_prospect`          | Add Prospect           | `addProspectManually()`      | WIRE       |
| 307 | `agent.update_prospect`       | Update Prospect        | `updateProspect()`           | WIRE       |
| 308 | `agent.update_pipeline_stage` | Update Pipeline Stage  | `updatePipelineStage()`      | WIRE       |
| 309 | `agent.add_prospect_note`     | Add Prospect Note      | `addProspectNote()`          | WIRE       |
| 310 | `agent.log_outreach`          | Log Outreach           | `logOutreach()`              | WIRE       |
| 311 | `agent.log_prospect_call`     | Log Prospect Call      | `logProspectCall()`          | WIRE       |
| 312 | `agent.convert_prospect`      | Convert to Inquiry     | `convertProspectToInquiry()` | WIRE       |
| 313 | `agent.enrich_prospect`       | Re-Enrich Prospect     | `reEnrichProspect()`         | WIRE       |
| 314 | `agent.geocode_prospect`      | Geocode Prospect       | `geocodeProspect()`          | WIRE       |
| 315 | `agent.merge_prospects`       | Merge Prospects        | `mergeProspects()`           | WIRE       |
| 316 | `agent.find_similar`          | Find Similar Prospects | `findSimilarProspects()`     | WIRE       |
| 317 | `agent.lookalike_search`      | Lookalike Search       | `lookalikeProspect()`        | WIRE       |
| 318 | `agent.create_call_script`    | Create Call Script     | `createCallScript()`         | WIRE       |
| 319 | `agent.scrub_prospects`       | Scrub Prospects (AI)   | `scrubProspects()`           | WIRE       |
| 320 | `agent.import_prospects`      | Import CSV             | `importProspectsFromCSV()`   | WIRE       |
| 321 | `agent.export_prospects`      | Export CSV             | `exportProspectsToCSV()`     | WIRE       |

### 7B. Settings & Profile (7 actions)

#### Tier 1 Reads (4)

| #   | Task Type                     | Name                  | Server Action         | Wire/Build |
| --- | ----------------------------- | --------------------- | --------------------- | ---------- |
| 322 | `settings.gratuity.get`       | Gratuity Settings     | direct Supabase query | WIRE       |
| 323 | `billing.subscription.status` | Subscription Status   | direct Supabase query | WIRE       |
| 324 | `billing.modules.enabled`     | Enabled Modules       | direct Supabase query | WIRE       |
| 325 | `billing.connect.status`      | Stripe Connect Status | direct Supabase query | WIRE       |

#### Tier 2 Writes (3)

| #   | Task Type               | Name                     | Server Action              | Wire/Build |
| --- | ----------------------- | ------------------------ | -------------------------- | ---------- |
| 326 | `agent.update_profile`  | Update Profile           | chef profile update action | WIRE       |
| 327 | `agent.update_gratuity` | Update Gratuity Settings | direct Supabase update     | WIRE       |
| 328 | `agent.toggle_module`   | Toggle Module            | module toggle action       | WIRE       |

**Phase 7 Total: 30 actions (29 WIRE, 1 BUILD)**

---

## Summary — All 7 Phases

| Phase     | Focus                      | Actions | Wire    | Build   | New Files |
| --------- | -------------------------- | ------- | ------- | ------- | --------- |
| **1**     | Core Module Completions    | 62      | 42      | 20      | 0         |
| **2**     | Finance & Analytics        | 52      | 38      | 14      | 1         |
| **3**     | Operations, Safety & Staff | 48      | 28      | 20      | 3         |
| **4**     | Engagement & Growth        | 47      | 32      | 15      | 5         |
| **5**     | Contingency, AARs & Calls  | 22      | 12      | 10      | 2         |
| **6**     | Advanced Features          | 46      | 25      | 21      | 4         |
| **7**     | Prospecting & Settings     | 30      | 29      | 1       | 2         |
| **TOTAL** |                            | **307** | **206** | **101** | **17**    |

**67% of all actions are pure wiring — the server actions already exist.**

---

## Files Modified Per Phase

### Every phase touches these 2 files:

- `lib/ai/command-task-descriptions.ts` — Tier 1 task definitions (grows with each phase)
- `lib/ai/command-orchestrator.ts` — Tier 1 executor functions + switch cases (grows with each phase)

### Existing agent-action files extended:

- `lib/ai/agent-actions/client-actions.ts` (Phase 1)
- `lib/ai/agent-actions/event-actions.ts` (Phase 1)
- `lib/ai/agent-actions/event-ops-actions.ts` (Phase 1)
- `lib/ai/agent-actions/inquiry-actions.ts` (Phase 1)
- `lib/ai/agent-actions/quote-actions.ts` (Phase 1)
- `lib/ai/agent-actions/menu-edit-actions.ts` (Phase 1)
- `lib/ai/agent-actions/calendar-actions.ts` (Phase 1)
- `lib/ai/agent-actions/staff-actions.ts` (Phase 3)
- `lib/ai/agent-actions/operations-actions.ts` (Phase 3)
- `lib/ai/agent-actions/proactive-actions.ts` (Phase 3)
- `lib/ai/agent-actions/financial-call-actions.ts` (Phase 2)
- `lib/ai/agent-actions/grocery-actions.ts` (Phase 2)

### New agent-action files created:

| File                                                   | Phase | Actions                                              |
| ------------------------------------------------------ | ----- | ---------------------------------------------------- |
| `lib/ai/agent-actions/finance-extended-actions.ts`     | 2     | Payment plans, retainers, disputes, payroll, exports |
| `lib/ai/agent-actions/safety-actions.ts`               | 3     | Temp logs, incidents, certifications, HACCP, recalls |
| `lib/ai/agent-actions/equipment-actions.ts`            | 3     | Equipment CRUD, maintenance, rentals                 |
| `lib/ai/agent-actions/document-gen-actions.ts`         | 3     | All 13 document generators                           |
| `lib/ai/agent-actions/loyalty-actions.ts`              | 4     | Loyalty config, rewards, gift cards, deliveries      |
| `lib/ai/agent-actions/campaign-actions.ts`             | 4     | Campaigns, push dinners, email templates, sequences  |
| `lib/ai/agent-actions/goal-actions.ts`                 | 4     | Goals, check-ins, service types                      |
| `lib/ai/agent-actions/review-actions.ts`               | 4     | Testimonials, review requests                        |
| `lib/ai/agent-actions/notification-actions.ts`         | 4     | Notification management, task templates              |
| `lib/ai/agent-actions/aar-actions.ts`                  | 5     | AAR CRUD, AI draft generation                        |
| `lib/ai/agent-actions/contingency-extended-actions.ts` | 5     | Backup contacts, contingency notes                   |
| `lib/ai/agent-actions/call-actions.ts`                 | 5     | Call updates, agenda items                           |
| `lib/ai/agent-actions/vendor-actions.ts`               | 6     | Vendor CRUD, POs, inventory                          |
| `lib/ai/agent-actions/social-actions.ts`               | 6     | Social posts, captions, portfolio                    |
| `lib/ai/agent-actions/live-ops-actions.ts`             | 6     | Stations, course fire, 86, ops log                   |
| `lib/ai/agent-actions/survey-actions.ts`               | 6     | Survey CRUD, send, AI extraction                     |
| `lib/ai/agent-actions/prospecting-actions.ts`          | 7     | Full prospecting pipeline                            |
| `lib/ai/agent-actions/settings-actions.ts`             | 7     | Profile, preferences, modules                        |

### Registration hub updated:

- `lib/ai/agent-actions/index.ts` — import + register all 17 new files

---

## How Each Phase Ships

Each phase follows the same workflow:

1. **Add Tier 1 task descriptions** to `command-task-descriptions.ts`
2. **Add Tier 1 executor functions** to `command-orchestrator.ts` (function + switch case + supportedTaskTypes)
3. **Create/extend Tier 2 agent-action files** with executor + commitAction
4. **Register new agent-actions** in `index.ts`
5. **Test with Remy eval harness** — run representative prompts for each new action
6. **Commit and push** — each phase is a standalone feature branch

No database migrations needed. No new API routes. No UI changes. **All 307 actions are backend wiring — the chat UI, preview cards, and approval flow already work for any registered action.**

---

## What This Does NOT Include

These are explicitly out of scope for this build:

1. **New UI pages or components** — Remy uses the existing preview card system
2. **New database tables or migrations** — All tables already exist
3. **Client portal Remy** — This plan is chef portal only (per user's instruction)
4. **Landing page Remy** — Out of scope
5. **New server actions for BUILD items** — Some of the 101 BUILD actions need simple Supabase queries written. These are included in the effort estimate but are straightforward (INSERT/UPDATE/SELECT with tenant scoping)
6. **Personality/voice tuning** — Separate concern from action coverage
7. **Testing roadmap** — Separate document (`docs/remy-testing-roadmap.md`)

---

## Definition of Done

When all 7 phases are complete:

- **404 total actions** registered in Remy (97 existing + 307 new)
- Every action listed in `docs/remy-tool-registry.md` has status `EXISTS`
- `buildTaskListForPrompt()` returns all 404 actions to the intent parser
- The intent parser (Ollama) can classify user intent to any of the 404 task types
- Every Tier 1 action returns data immediately
- Every Tier 2 action shows a preview card that can be approved
- Every Tier 3 action explains why it's banned and how to do it manually
- **"Anything the user can manually do on the website, Remy can do."**
