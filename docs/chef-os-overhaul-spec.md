# ChefFlow OS Overhaul: Implementation Specification

> This document is the complete implementation spec for transforming ChefFlow from
> a SaaS application into the ultimate operating system for culinary professionals.
> Every decision traces back to the 55 research documents, 510+ chef quotes, and
> 34 archetypes studied during the research phase.

---

## Pre-Build Fixes (Do Alongside Overhaul 1)

### Fix 1: Dashboard Reset Banner Silent Failure

**File:** `components/dashboard/dashboard-reset-banner.tsx` (lines 38-40)

**Current:** `catch { // silently fail - not critical }`

**Fix:** Add `toast.error('Failed to reset widgets. Try again.')` in catch block. This violates
Law 2 of the Zero Hallucination Rule: user action shows as complete but was never persisted.

### Fix 2: Stale Cache Tags (4 tags, never revalidated)

**File:** `lib/chef/layout-data-cache.ts`

| Tag                            | Mutation File                     | Add `revalidateTag()` After    |
| ------------------------------ | --------------------------------- | ------------------------------ |
| `cannabis-access-{authUserId}` | `lib/admin/cannabis-actions.ts`   | Cannabis tier update           |
| `chef-archetype-{chefId}`      | `lib/archetypes/actions.ts`       | Archetype change               |
| `deletion-status-{chefId}`     | `lib/chef/actions.ts`             | Deletion request create/cancel |
| `is-admin-{normalizedEmail}`   | `lib/admin/chef-admin-actions.ts` | Admin flag toggle              |

---

## OVERHAUL 1: Day Briefing

### What Changes

The dashboard's first screen transforms from a widget grid into a narrative day briefing.
Existing widgets move below the briefing for drill-in.

### Research Driver

> "You've got to be really disciplined and organised, the minute you're not on top of what
> you need to do it can all collapse." - Chef interview, LinkedIn

> "You're always somewhere new and can't risk leaving a notebook or binder at home." - Meez blog

Chefs need one screen before leaving the house: where am I going, what am I cooking,
who has allergies that could kill them, what do I need to buy, who owes me money.

### Architecture

**New file:** `app/(chef)/dashboard/_sections/day-briefing.tsx`

This replaces the current header + priority banner + shortcut strip as the first thing
rendered. It's a server component with Suspense boundary.

**Data sources (all existing, no new queries needed):**

| Data                       | Source                                                | Exists? |
| -------------------------- | ----------------------------------------------------- | ------- |
| Today's events             | `getTodaysScheduleEnriched()`                         | Yes     |
| Dietary alerts per event   | `getClientAllergyRecords(clientId)`                   | Yes     |
| Guest count per event      | `events.guest_count`                                  | Yes     |
| Kitchen notes              | `clients.kitchen_*` columns                           | Yes     |
| Parking/access             | `clients.parking_instructions`, `access_instructions` | Yes     |
| Outstanding balances       | `getUpcomingPaymentsDue()`                            | Yes     |
| Weather                    | Existing weather fetch by coords                      | Yes     |
| Travel time between events | `events.location_*` + geocoding                       | Yes     |
| Tomorrow preview           | `getNextUpcomingEvent()`                              | Yes     |

**New server action:** `getDayBriefing(date?: string)`

```typescript
type DayBriefing = {
  date: string
  eventCount: number
  totalGuests: number
  criticalAlerts: DietaryAlert[] // anaphylaxis only
  events: BriefingEvent[]
  outstandingBalance: { totalCents: number; clientCount: number }
  tomorrow: { eventCount: number; firstEvent?: string } | null
}

type BriefingEvent = {
  id: string
  time: string // "10:30 AM"
  clientName: string
  occasion: string
  guestCount: number
  kitchen: {
    // from client profile
    size: string | null
    quirks: string | null // oven runs hot, no dishwasher, etc.
    parking: string | null
  }
  dietary: {
    critical: AllergyRecord[] // anaphylaxis severity
    warnings: AllergyRecord[] // allergy severity
    restrictions: string[] // vegan, kosher, etc.
    pendingRsvps: number // guests who haven't submitted dietary
  }
  financial: {
    quotedCents: number
    depositCollected: boolean
    balanceDueCents: number
    effectiveHourlyRateCents: number | null
    groceryBudgetCents: number | null // from deposit - estimated food cost
  }
  travel: {
    fromPrevious: string | null // "22 min from Miller residence"
    address: string
  }
  menuConfirmed: boolean
  groceryRunDone: boolean // from prep checklist status
}

type DietaryAlert = {
  clientName: string
  personName: string // "Noah (age 5)"
  allergen: string
  severity: 'anaphylaxis' | 'allergy'
  notes: string | null // "EpiPen in drawer by fridge"
}
```

**Component:** `<DayBriefing briefing={data} />`

Renders as a narrative card, not a widget grid:

```
[Date + Event Count + Guest Count + Critical Alert Count]

[Event 1 Card]
  Time - Client Name (occasion, X guests)
  Kitchen: [size], [quirks]. Parking: [instructions]
  DIETARY ALERTS (red section, non-collapsible):
    [Person]: [allergen] - [severity] - [notes]
  Menu: [confirmed/pending]. Groceries: [done/needed]
  Money: $X quoted. Deposit: [collected/pending]. Balance: $X due.
  Rate: $X/hr (vs your $Y avg)
  Travel: [time] from [previous location]

[Event 2 Card]
  ...

[Outstanding Balance Banner]
  You're owed $X across Y clients. [View]

[Tomorrow Preview]
  Tomorrow: [event count] events. First: [time] [client].
  OR: Rest day. No events scheduled.
```

### Modification to Existing Dashboard

**File:** `app/(chef)/dashboard/page.tsx`

Insert `<Suspense fallback={<DayBriefingSkeleton />}><DayBriefing /></Suspense>` as the
first child after the header, before the shortcut strip. The shortcut strip, priority
banner, and all existing section cards render below it unchanged.

Conditional: if no events today, show a compact "No events today" state with tomorrow
preview and outstanding balance only. Don't show the full briefing layout for rest days.

### New Files

| File                                              | Purpose                                      |
| ------------------------------------------------- | -------------------------------------------- |
| `app/(chef)/dashboard/_sections/day-briefing.tsx` | Server component, fetches + renders briefing |
| `components/dashboard/day-briefing-card.tsx`      | Client component for individual event card   |
| `components/dashboard/dietary-alert-strip.tsx`    | Red non-collapsible allergy alert row        |
| `lib/dashboard/day-briefing-actions.ts`           | `getDayBriefing()` server action             |

### Modified Files

| File                            | Change                                           |
| ------------------------------- | ------------------------------------------------ |
| `app/(chef)/dashboard/page.tsx` | Insert DayBriefing section before shortcut strip |

### Database Changes

None. All data sources exist.

---

## OVERHAUL 2: Safety System

### What Changes

Dietary safety becomes a system-wide layer with client intake forms, household dietary
matrix, menu-allergy validator, constraint-safe meal counter, and event-day dietary card.

### Research Driver

> "I shook my head at the client and shared with her that I was afraid to cook for them
> and that it would be too risky." - Virginia Stockwell, personal chef

> "A caterer ignored allergen requests, put almonds on platters and raspberries in a
> wedding cake despite the bride's raspberry allergy, causing anaphylactic shock at the
> reception." - Wedding industry research

> "150-200 food allergy deaths per year in the US. Every 10 seconds, a food allergy
> reaction sends someone to the ER." - FDA statistics

### 2A: Client Dietary Intake Form

**New public route:** `app/embed/dietary/[token]/page.tsx`

Magic-link based (no auth required). Chef sends link to client. Client fills out
dietary info for every person in their household.

**Flow:**

1. Chef clicks "Send Dietary Form" on client profile
2. System generates a signed token (JWT with clientId + tenantId, 30-day expiry)
3. Email sent to client with link: `cheflowhq.com/embed/dietary/{token}`
4. Client lands on 4-step form (no login required)

**4-Step Form:**

Step 1: Big 9 Allergens (FDA mandatory)

- Milk, Eggs, Fish, Shellfish, Tree Nuts, Peanuts, Wheat, Soybeans, Sesame
- Per allergen: checkbox + severity selector (anaphylaxis / allergy / intolerance / preference)
- "None of these" skip option

Step 2: Additional Allergens + EU 5

- Celery, Mustard, Lupin, Molluscs, Sulfites
- Free-text field for unlisted allergens
- Same severity selector per item

Step 3: Lifestyle Diets + Preferences

- Checkboxes: Vegan, Vegetarian, Pescatarian, Kosher, Halal, Gluten-Free, Keto, Paleo, Low-Sodium, Diabetic-Friendly
- Dislikes: free-text (comma-separated)
- Spice tolerance: none / mild / medium / hot / very hot

Step 4: Household Members

- "Add another person" button
- Per person: Name, Relationship (partner, child, regular guest), Age (optional)
- Each person gets their own allergy/diet selectors (repeat Steps 1-3 per person)
- Pre-populated with existing data from `clients` table if available

**Data Storage:**

New table: `client_household_members`

```sql
CREATE TABLE client_household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'household_member'
    CHECK (relationship IN ('self','partner','child','regular_guest','other')),
  age INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_household_members_client ON client_household_members(client_id);
```

Extend `client_allergy_records` with optional `household_member_id`:

```sql
ALTER TABLE client_allergy_records
  ADD COLUMN household_member_id UUID REFERENCES client_household_members(id) ON DELETE CASCADE;

CREATE INDEX idx_allergy_records_household ON client_allergy_records(household_member_id);
```

New table: `client_dietary_restrictions`

```sql
CREATE TABLE client_dietary_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  household_member_id UUID REFERENCES client_household_members(id) ON DELETE CASCADE,
  restriction TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'intake_form'
    CHECK (source IN ('chef_entered','intake_form','client_stated','ai_detected')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(client_id, household_member_id, LOWER(restriction))
);
```

**New files:**

| File                                          | Purpose                                                 |
| --------------------------------------------- | ------------------------------------------------------- |
| `app/embed/dietary/[token]/page.tsx`          | Public intake form page                                 |
| `components/embed/dietary-intake-form.tsx`    | 4-step form component                                   |
| `lib/dietary/intake-actions.ts`               | Server actions: generate token, submit form, fetch data |
| `lib/dietary/intake-token.ts`                 | JWT generation and validation                           |
| `supabase/migrations/NEXT_dietary_intake.sql` | household_members + dietary_restrictions tables         |

**Modified files:**

| File                                           | Change                                                |
| ---------------------------------------------- | ----------------------------------------------------- |
| `components/clients/allergy-records-panel.tsx` | Add "Send Dietary Form" button, show per-member view  |
| `lib/events/readiness.ts`                      | Extend allergy gate to check household_member records |

### 2B: Menu-Allergy Validator

**Existing:** `checkMenuAllergyConflicts()` in `lib/events/readiness.ts` (lines 740-801)
already does text matching of allergen names against dish names, descriptions, and recipe
ingredients. `dietary_conflict_alerts` table exists with severity classification.

**Enhancement:**

Extend `checkMenuAllergyConflicts()` to:

1. Include `client_household_members` allergy records (not just primary client)
2. Add ingredient synonym matching (e.g., "casein" = dairy, "albumin" = egg)
3. Surface conflicts as hard blocks (not just warnings) when severity is anaphylaxis

**New file:** `lib/dietary/allergen-synonyms.ts`

```typescript
export const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  peanut: ['peanut', 'groundnut', 'arachis', 'goober'],
  tree_nut: [
    'almond',
    'cashew',
    'walnut',
    'pecan',
    'pistachio',
    'macadamia',
    'hazelnut',
    'brazil nut',
  ],
  dairy: ['milk', 'cream', 'butter', 'cheese', 'whey', 'casein', 'lactose', 'ghee', 'yogurt'],
  egg: ['egg', 'albumin', 'meringue', 'mayonnaise', 'aioli'],
  wheat: ['wheat', 'flour', 'bread', 'pasta', 'semolina', 'durum', 'spelt', 'farro'],
  soy: ['soy', 'soya', 'edamame', 'tofu', 'tempeh', 'miso', 'tamari'],
  fish: ['fish', 'anchovy', 'sardine', 'cod', 'salmon', 'tuna', 'bass', 'tilapia'],
  shellfish: [
    'shrimp',
    'crab',
    'lobster',
    'crawfish',
    'prawn',
    'scallop',
    'clam',
    'mussel',
    'oyster',
  ],
  sesame: ['sesame', 'tahini', 'halvah'],
}
```

**Modified files:**

| File                                     | Change                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `lib/events/readiness.ts`                | Extend `checkMenuAllergyConflicts()` with synonym matching + household members |
| `lib/events/dietary-conflict-actions.ts` | Update severity classification to use synonym map                              |

### 2C: Household Dietary Matrix

**New component:** `components/clients/household-dietary-matrix.tsx`

One-screen view showing every person in the household with their constraints in a grid.
Chef prints this or pulls it up on their phone in the client's kitchen.

```
| Person          | Allergens            | Severity    | Diets    | Dislikes     |
|-----------------|----------------------|-------------|----------|--------------|
| Sarah (self)    | -                    | -           | Vegan    | Cilantro     |
| Michael (partner)| -                   | -           | -        | -            |
| Noah (child, 5) | Peanut, Tree Nut, Egg| Anaphylaxis | -        | -            |
| Guest 1         | (pending RSVP)       |             |          |              |
```

**Bottom row:** "Safe for everyone: No peanuts, no tree nuts, no eggs, no dairy (vegan)."

This is a pure read component. Data from `client_household_members` + `client_allergy_records`

- `client_dietary_restrictions`.

**Print button:** `window.print()` with `@media print` styles.

### 2D: Constraint-Safe Meal Counter

**New column on `chefs` table:**

```sql
ALTER TABLE chefs
  ADD COLUMN verified_constraint_meals INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN verified_constraint_events INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN constraint_incidents INTEGER NOT NULL DEFAULT 0;
```

**Trigger:** On event transition to `completed`, if the event has any guest with allergy
records (severity = allergy or anaphylaxis), increment `verified_constraint_meals` by
guest count and `verified_constraint_events` by 1.

**New server action:** `incrementConstraintCounter(eventId)` called from event FSM
transition side effects in `lib/events/transitions.ts`.

**Display:** Chef profile public page shows:
"423 allergen-safe meals across 52 events, zero incidents."

### 2E: Event-Day Dietary Card

**Modified file:** `app/(chef)/events/[id]/_components/` (event detail overview tab)

When the event date is today, a non-collapsible red/amber dietary alert card renders
at the TOP of the overview tab (before event details, before map, before everything).

Uses existing `DietaryRollup` + `AllergyRecordsPanel` data but rendered in
emergency-alert style (red background for anaphylaxis, amber for allergies).

Includes: person name, allergen, severity, chef notes ("EpiPen in drawer by fridge"),
cross-contamination checklist link.

---

## OVERHAUL 3: Money Reality

### What Changes

Grocery float solved at system level. Effective hourly rate prominent everywhere.
Close-out becomes the profitability moment. "Who owes me money" is persistent.

### Research Driver

> "Dealing with the never-ending chase for payments is a pain, and sometimes I'm left
> hanging for weeks for the expenses I've fronted." - Chef interview, LinkedIn

> "51.9% of bakers who participated in this survey stated that they do not pay themselves
> for their baking." - Better Baker Club Survey

> Chefs front $500-2,000 per event in grocery costs on personal credit and wait 3-10 days
> for reimbursement.

### 3A: Grocery Float Solution

**Current state:** Deposits exist. `deposit_amount_cents` / `deposit_percentage` on events.
`estimated_food_cost_cents` column exists on events table (currently null, not populated).
Effective hourly rate computed in `getEventProfitSummary()`.

**Enhancement 1: Auto-populate estimated food cost from menu**

When a chef assigns a menu to an event, compute total ingredient cost from recipe data
and write to `events.estimated_food_cost_cents`.

**New server action:** `calculateEstimatedFoodCost(eventId)` in `lib/events/food-cost-actions.ts`

```typescript
export async function calculateEstimatedFoodCost(eventId: string): Promise<number> {
  // 1. Fetch event menu items
  // 2. For each menu item with a linked recipe, sum ingredient costs
  // 3. Multiply by guest count
  // 4. Write to events.estimated_food_cost_cents
  // 5. Return total
}
```

**Enhancement 2: Deposit suggestion based on grocery cost**

On the quote form, after guest count and menu are set, show:

```
Estimated grocery cost: $480 (from menu recipes)
Suggested deposit: $576 (groceries + 20% buffer)
Current deposit: $600 [COVERED]
```

If deposit < estimated grocery cost:

```
WARNING: Your deposit ($300) doesn't cover estimated groceries ($480).
You'll front $180 on personal credit. [Increase deposit]
```

**Modified files:**

| File                               | Change                                               |
| ---------------------------------- | ---------------------------------------------------- |
| `components/quotes/quote-form.tsx` | Add grocery float warning below deposit field        |
| `lib/events/food-cost-actions.ts`  | New: `calculateEstimatedFoodCost()`                  |
| Event menu assignment action       | Call `calculateEstimatedFoodCost()` when menu linked |

### 3B: Effective Hourly Rate Everywhere

**Already computed in:** `getEventProfitSummary()`, `getEventCloseOutData()`,
`getEventFinancialSummaryFull()`. Already displayed on event detail money tab
and financial summary view.

**New locations to surface it:**

1. **Quote form** - After chef enters quoted price and guest count:
   "At this price with your average time investment, your effective rate would be ~$X/hr.
   Your average across all events: $Y/hr. Market: $Z/hr."

   Source: Chef's historical average from `getEventProfitSummary()` across completed events.
   New server action: `getChefAverageHourlyRate(tenantId)`.

2. **Dashboard Day Briefing** - Per event: "Rate: $X/hr (vs your $Y avg)"

3. **Monthly summary card** (new dashboard widget) - "This month: X events, $Y revenue,
   $Z avg hourly rate."

### 3C: Close-Out Profitability Moment

**Current state:** Close-out wizard has 4 steps (Tip, Receipts, Mileage, Quick AAR).
`getEventCloseOutData()` returns `financial.effectiveHourlyRateCents`.

**Enhancement:** Add Step 5: Profitability Summary (after Quick AAR, before "Done").

```
EVENT PROFITABILITY
Revenue: $1,200 (quoted) + $150 (tip) = $1,350
Food cost: $380 (32% of revenue) [vs your 28% average]
Mileage: $45 (64 miles x $0.70/mi)
Other expenses: $0
PROFIT: $925
Effective rate: $97/hr [35% above your average]

This was your 3rd most profitable event this quarter.
```

**Modified files:**

| File                                      | Change                                            |
| ----------------------------------------- | ------------------------------------------------- |
| Close-out wizard component                | Add Step 5 profitability summary                  |
| `lib/events/financial-summary-actions.ts` | Add `getChefQuartileRank(eventId)` for comparison |

### 3D: "Who Owes Me Money" Persistent Banner

**New component:** `components/finance/outstanding-balance-banner.tsx`

A thin, persistent banner that appears on dashboard, client profile, and event detail
when any client has an outstanding balance.

```
You're owed $2,400 across 3 clients. [View details]
```

**Data source:** `getUpcomingPaymentsDue()` already exists in alerts cards.

**Display locations:**

- Dashboard: below Day Briefing
- Client profile: top of page (if this client owes)
- Event detail: top of Money tab (if this event has balance due)

**Modified files:**

| File                               | Change                                     |
| ---------------------------------- | ------------------------------------------ |
| `app/(chef)/dashboard/page.tsx`    | Add OutstandingBalanceBanner               |
| `app/(chef)/clients/[id]/page.tsx` | Add client-specific balance banner         |
| Event detail money tab             | Already shows balance, make more prominent |

---

## OVERHAUL 4: Bridge Moment

### What Changes

Post-event bridge prompt converts one-time clients to recurring. Configurable
follow-up sequences replace hardcoded Inngest delays.

### Research Driver

> Weekly meal prep = $29,700+ per client over 2 years. Recurring features create 8x
> switching cost. Annual churn drops from 30-50% to 10-20%.

> No platform in the world facilitates the conversion from "great dinner party" to
> "come every week."

### 4A: Post-Event Bridge Prompt (Client-Facing)

**Current state:** Post-event emails are: Day 3 thank-you, Day 7 review request,
Day 14 referral ask. No rebooking prompt.

**Enhancement:** Modify Day 3 thank-you email to include a bridge CTA:

```
Hi [Client Name],

Thank you for a wonderful evening! It was a pleasure cooking for your family.

If you'd like [Chef Name] to cook for you regularly, we offer weekly meal prep
starting at $[rate]/week. Your dietary preferences and kitchen setup are already
saved, so getting started is seamless.

[Book Weekly Meal Prep] (link to /embed/rebook/{token})
```

**New public route:** `app/embed/rebook/[token]/page.tsx`

Simple form: preferred day of week, guest count, any changes to dietary needs.
Pre-populated from client profile. Submits as a recurring service inquiry.

**Modified files:**

| File                                     | Change                               |
| ---------------------------------------- | ------------------------------------ |
| `lib/follow-up/sequence-templates.ts`    | Add bridge CTA to thank-you template |
| `lib/follow-up/sequence-engine.ts`       | Pass recurring rate data to template |
| New: `app/embed/rebook/[token]/page.tsx` | Public rebooking form                |
| New: `lib/recurring/rebook-actions.ts`   | Token generation, form submission    |

### 4B: Chef-Side Bridge Suggestion

After close-out wizard Step 5 (profitability), if client has 2+ completed events,
show a suggestion card:

```
The Chens have booked 3 events with you.
Recurring clients at this frequency average $29,700 over 2 years.
[Offer Weekly Program] → pre-filled message template
```

**New component:** `components/events/bridge-suggestion-card.tsx`

Data: count of completed events for this client from `events` table.

### 4C: Configurable Follow-Up Sequences

**Current state:** `follow_up_sends` table exists. `sequence-engine.ts` reads from
`followup_rules` table (if active rules exist) or falls back to `DEFAULT_STEPS`.
Processing via `getNextPendingSends()` + `processPendingSend()`.

**Enhancement:** Build a settings UI for managing sequences.

**New route:** `app/(chef)/settings/follow-ups/page.tsx`

UI shows:

- Current sequence steps (editable: delay days, subject, template)
- Add/remove steps
- Enable/disable individual steps
- Preview email for each step

**Modified files:**

| File                                                     | Change                      |
| -------------------------------------------------------- | --------------------------- |
| New: `app/(chef)/settings/follow-ups/page.tsx`           | Sequence management UI      |
| New: `components/settings/follow-up-sequence-editor.tsx` | Editor component            |
| `lib/follow-up/follow-up-actions.ts`                     | Add CRUD for followup_rules |

**Migration:** Ensure `followup_rules` table exists (may need creation if only referenced
but not migrated). Schema:

```sql
CREATE TABLE IF NOT EXISTS followup_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'event_completed',
  step_number INTEGER NOT NULL,
  delay_days INTEGER NOT NULL,
  subject TEXT NOT NULL,
  template_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(chef_id, trigger_type, step_number)
);
```

---

## OVERHAUL 5: Speed Response

### What Changes

Onboarding stripped to 5-minute first quote. Smart auto-response for mid-service
inquiries. One-tap quote from inquiry detail.

### Research Driver

> Responding within 5 minutes = 21x more likely to qualify the lead. 78% buy from
> first responder. But chefs are mid-service when inquiries come in.

> 98%+ of users become inactive if no value delivered within 2 weeks.

### 5A: Onboarding to First Quote in 5 Minutes

**Current state:** 5-step wizard (Profile, Branding, Public URL, Stripe, Done) then
Migration Hub with 5 phases (Profile, Clients, Loyalty, Recipes, Staff).

**Enhancement:** Restructure wizard to prioritize first quote.

**New Step 1:** "Your name" - just display_name (1 field)
**New Step 2:** "Send your first quote" - pre-built template selector

Template selector shows 6 event types:

- Dinner Party (8 guests, $150/person)
- Weekly Meal Prep (4 servings, $350/week)
- Catering Event (25 guests, $75/person)
- Cooking Class (6 students, $125/person)
- Tasting Menu (4 guests, $200/person)
- Holiday Dinner (12 guests, $125/person)

Chef picks one, enters client name + email, adjusts price if needed, sends quote.
That's the "aha moment." Everything else deferred.

**New Step 3:** "Set up payments" (Stripe Connect, same as current Step 4)
**New Step 4:** "Customize your profile" (branding + URL, same as current Steps 2-3)
**New Step 5:** Done

Migration Hub stays the same but now appears after the chef has already experienced value.

**New files:**

| File                                         | Purpose                                               |
| -------------------------------------------- | ----------------------------------------------------- |
| `components/onboarding/quick-quote-step.tsx` | Template selector + mini quote form                   |
| `lib/onboarding/quote-templates.ts`          | 6 pre-built quote templates with market-rate defaults |

**Modified files:**

| File                                          | Change                                                |
| --------------------------------------------- | ----------------------------------------------------- |
| `components/onboarding/onboarding-wizard.tsx` | Restructure steps: name, quote, Stripe, profile, done |

### 5B: Smart Auto-Response

**New setting:** `chef_auto_response_enabled` (boolean) + `chef_auto_response_template` (text)
on chefs table.

When enabled and a new inquiry arrives (via email, embed form, or marketplace), the system
sends an immediate acknowledgment using the chef's pre-approved template:

```
Hi [Client Name],

Thanks for reaching out! I'm currently with a client and will follow up within
[X hours]. In the meantime, here's a quick look at what I offer for [event type].

Looking forward to connecting!
[Chef Name]
```

**Trigger:** Inquiry creation in `lib/inquiries/actions.ts` `createInquiry()`.

**Guard:** Only fires if:

- `chef_auto_response_enabled = true`
- Client has an email address
- No auto-response sent to this client in the last 24 hours (prevent spam)
- Chef is not currently the one creating the inquiry manually

**Modified files:**

| File                                         | Change                                           |
| -------------------------------------------- | ------------------------------------------------ |
| `lib/inquiries/actions.ts`                   | Add auto-response trigger after inquiry creation |
| `app/(chef)/settings/communication/page.tsx` | Add auto-response toggle + template editor       |

**Migration:**

```sql
ALTER TABLE chefs
  ADD COLUMN auto_response_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN auto_response_template TEXT,
  ADD COLUMN auto_response_delay_text TEXT DEFAULT 'a few hours';
```

### 5C: One-Tap Quote from Inquiry

**Current state:** From inquiry detail, "Create Quote" button links to
`/quotes/new?inquiry_id=X&client_id=Y`. Full quote form with many fields.

**Enhancement:** Add "Quick Quote" button that pre-fills everything from inquiry data

- GOLDMINE benchmarks + chef history.

When clicked:

1. Read inquiry: guest_count, occasion, event_date, client dietary info
2. Look up GOLDMINE benchmark for guest count
3. Look up chef's average price for this event type
4. Pre-fill quote with: higher of (benchmark, chef average)
5. Show single confirmation screen: "Quote $X for [occasion] on [date] for [guests] guests. [Send Quote]"

One tap to confirm = quote created + email sent to client.

**New component:** `components/inquiries/quick-quote-button.tsx`

**Modified files:**

| File                | Change                                               |
| ------------------- | ---------------------------------------------------- |
| Inquiry detail page | Add QuickQuoteButton alongside existing Create Quote |

---

## OVERHAUL 6: Profile as Relationship Memory

### What Changes

Client profile reorganized by stakes (safety first). Household dietary matrix added.
Client preference data positioned as switching cost.

### Research Driver

> "Clients can be super picky, and they can change their minds a lot - you have to
> meticulously keep track of all those changes." - Chef interview, LinkedIn

> The switching cost research says: "Accumulated knowledge lives only in the chef's head."
> When it lives in ChefFlow instead, leaving ChefFlow means losing years of relationship data.

### 6A: Profile Reorganization

**Current order (31+ panels):** Header, warnings, stats, profitability, LTV, menu history,
outreach, communication, personal details, connections, pets, addresses, allergy records,
preferences, kitchen profile, security, service defaults, assessment, fun Q&A, business
intel, financial detail, loyalty, photos, NDA, notes, milestones, event history, feedback.

**New order (by stakes):**

**Section 1: SAFETY** (red accent)

- Household Dietary Matrix (new, Overhaul 2C)
- Allergy Records Panel (existing, enhanced with household members)
- "Send Dietary Form" button (new, Overhaul 2A)

**Section 2: OPERATIONAL** (amber accent)

- Kitchen Profile (existing)
- Security & Access (existing)
- Service Defaults (existing)
- Additional Addresses (existing)

**Section 3: RELATIONSHIP** (blue accent)

- Personal Details + Pets (existing)
- Client Connections (existing)
- Communication History (existing)
- Notes + Milestones (existing)
- Fun Q&A (existing)

**Section 4: BUSINESS** (green accent)

- Statistics + Profitability (existing)
- LTV Trajectory (existing)
- Financial Detail (existing)
- Loyalty (existing)
- Chef's Assessment (existing)
- NDA (existing)
- Event History + Feedback (existing)

**Modified files:**

| File                               | Change                                  |
| ---------------------------------- | --------------------------------------- |
| `app/(chef)/clients/[id]/page.tsx` | Reorder panel rendering into 4 sections |

### 6B: Preference Memory as Switching Cost

No code changes needed. This is a positioning change. The intake form (2A), household
matrix (2C), kitchen profile, and service defaults already capture deep preference data.

The moat is structural: every detail entered into ChefFlow is data the chef loses if they
switch to a competitor. Document this in marketing/onboarding copy.

---

## OVERHAUL 7: Verified Trust Layer

### What Changes

Verified event count, constraint-safe meal counter, and earned expertise badges displayed
on chef public profile.

### Research Driver

> 30-47% of online reviews are fake. Consumer trust in reviews dropped from 79% to 42%.
> The only trust signal that can't be faked is a verified transaction record.

> "A marketplace competitor can copy chef profiles and booking flows in months. They
> cannot replicate a verified track record of 10,000+ constraint-safe meals across
> hundreds of chefs."

### 7A: Verified Event Count

**Already exists:** `events` table with status = 'completed' provides exact count.

**New display:** Chef public profile page (`app/(public)/chef/[slug]/page.tsx` or equivalent)
shows: "127 events completed through ChefFlow" with a verification badge.

**New server action:** `getVerifiedChefStats(chefId)` in `lib/chef/verified-stats.ts`

```typescript
type VerifiedChefStats = {
  completedEvents: number
  totalGuestsServed: number
  constraintSafeMeals: number // from chefs.verified_constraint_meals
  constraintEvents: number // from chefs.verified_constraint_events
  constraintIncidents: number // from chefs.constraint_incidents
  memberSince: string
  badges: EarnedBadge[]
}
```

### 7B: Earned Expertise Badges

Badges earned through verified platform data, not self-reported.

```typescript
type EarnedBadge = {
  id: string
  label: string // "Top-9 Allergen Expert"
  description: string // "200+ verified allergen-safe meals"
  tier: 'bronze' | 'silver' | 'gold'
  earnedAt: string
}
```

**Badge definitions:**

| Badge                 | Bronze               | Silver               | Gold                  |
| --------------------- | -------------------- | -------------------- | --------------------- |
| Allergen-Safe Chef    | 50 meals             | 200 meals            | 500 meals             |
| Repeat Client Builder | 5 repeat clients     | 15 repeat clients    | 30 repeat clients     |
| Event Veteran         | 25 events            | 100 events           | 250 events            |
| Dietary Specialist    | 10 constraint events | 50 constraint events | 100 constraint events |

**New file:** `lib/chef/badge-engine.ts`

Computes badges from `chefs` table counters + `events` table queries. Run on event
completion and cache result on chef profile.

**New column:**

```sql
ALTER TABLE chefs ADD COLUMN earned_badges JSONB DEFAULT '[]'::jsonb;
```

Updated by `recalculateBadges(chefId)` called from event completion side effects.

---

## Build Sequence

| Order | Overhaul                                       | Dependencies                                           | Estimated Scope |
| ----- | ---------------------------------------------- | ------------------------------------------------------ | --------------- |
| 1     | Pre-build fixes                                | None                                                   | 1 hour          |
| 2     | Overhaul 2A-2B (Intake + Validator)            | Migration for household_members + dietary_restrictions | Large           |
| 3     | Overhaul 1 (Day Briefing)                      | 2A data for dietary alerts                             | Medium          |
| 4     | Overhaul 2C-2E (Matrix + Counter + Event Card) | 2A tables exist                                        | Medium          |
| 5     | Overhaul 3A-3B (Grocery Float + Hourly Rate)   | None                                                   | Medium          |
| 6     | Overhaul 3C-3D (Close-out + Balance Banner)    | None                                                   | Small           |
| 7     | Overhaul 5A (Onboarding)                       | None                                                   | Medium          |
| 8     | Overhaul 5B-5C (Auto-response + Quick Quote)   | None                                                   | Small           |
| 9     | Overhaul 4A-4C (Bridge + Sequences)            | Follow-up rules migration                              | Medium          |
| 10    | Overhaul 6A (Profile Reorg)                    | 2C household matrix exists                             | Small           |
| 11    | Overhaul 7A-7B (Trust Layer + Badges)          | 2D constraint counter exists                           | Medium          |

---

## Database Migrations Required

1. `client_household_members` table (new)
2. `client_dietary_restrictions` table (new)
3. `client_allergy_records.household_member_id` column (alter)
4. `chefs.verified_constraint_meals`, `verified_constraint_events`, `constraint_incidents` columns (alter)
5. `chefs.auto_response_enabled`, `auto_response_template`, `auto_response_delay_text` columns (alter)
6. `chefs.earned_badges` column (alter)
7. `followup_rules` table (create if not exists)

All migrations are additive. No drops, no renames, no column type changes.

---

## Files Summary

### New Files (24)

| File                                                | Overhaul       |
| --------------------------------------------------- | -------------- |
| `lib/dashboard/day-briefing-actions.ts`             | 1              |
| `app/(chef)/dashboard/_sections/day-briefing.tsx`   | 1              |
| `components/dashboard/day-briefing-card.tsx`        | 1              |
| `components/dashboard/dietary-alert-strip.tsx`      | 1              |
| `app/embed/dietary/[token]/page.tsx`                | 2A             |
| `components/embed/dietary-intake-form.tsx`          | 2A             |
| `lib/dietary/intake-actions.ts`                     | 2A             |
| `lib/dietary/intake-token.ts`                       | 2A             |
| `lib/dietary/allergen-synonyms.ts`                  | 2B             |
| `components/clients/household-dietary-matrix.tsx`   | 2C             |
| `lib/chef/verified-stats.ts`                        | 2D, 7A         |
| `lib/events/food-cost-actions.ts`                   | 3A             |
| `components/finance/outstanding-balance-banner.tsx` | 3D             |
| `app/embed/rebook/[token]/page.tsx`                 | 4A             |
| `lib/recurring/rebook-actions.ts`                   | 4A             |
| `components/events/bridge-suggestion-card.tsx`      | 4B             |
| `app/(chef)/settings/follow-ups/page.tsx`           | 4C             |
| `components/settings/follow-up-sequence-editor.tsx` | 4C             |
| `components/onboarding/quick-quote-step.tsx`        | 5A             |
| `lib/onboarding/quote-templates.ts`                 | 5A             |
| `components/inquiries/quick-quote-button.tsx`       | 5C             |
| `lib/chef/badge-engine.ts`                          | 7B             |
| `supabase/migrations/NEXT_dietary_intake.sql`       | 2A             |
| `supabase/migrations/NEXT_chef_os_overhaul.sql`     | 2D, 4C, 5B, 7B |

### Modified Files (18)

| File                                              | Overhaul | Change                                        |
| ------------------------------------------------- | -------- | --------------------------------------------- |
| `components/dashboard/dashboard-reset-banner.tsx` | Fix      | Add toast on error                            |
| `lib/chef/layout-data-cache.ts` related mutations | Fix      | Add revalidateTag                             |
| `app/(chef)/dashboard/page.tsx`                   | 1, 3D    | Insert DayBriefing + BalanceBanner            |
| `components/clients/allergy-records-panel.tsx`    | 2A       | Add intake form button + member view          |
| `lib/events/readiness.ts`                         | 2B       | Extend allergy gate with synonyms + household |
| `lib/events/dietary-conflict-actions.ts`          | 2B       | Synonym matching                              |
| Event detail overview tab                         | 2E       | Event-day dietary card at top                 |
| `components/quotes/quote-form.tsx`                | 3A, 3B   | Grocery float warning + hourly rate hint      |
| Close-out wizard                                  | 3C       | Add profitability summary step                |
| `lib/events/financial-summary-actions.ts`         | 3C       | Add quartile rank query                       |
| `app/(chef)/clients/[id]/page.tsx`                | 3D, 6A   | Balance banner + reorder sections             |
| `lib/follow-up/sequence-templates.ts`             | 4A       | Bridge CTA in thank-you                       |
| `lib/follow-up/sequence-engine.ts`                | 4A       | Pass recurring rate to template               |
| `lib/follow-up/follow-up-actions.ts`              | 4C       | CRUD for followup_rules                       |
| `components/onboarding/onboarding-wizard.tsx`     | 5A       | Restructure steps                             |
| `lib/inquiries/actions.ts`                        | 5B       | Auto-response trigger                         |
| `app/(chef)/settings/communication/page.tsx`      | 5B       | Auto-response settings                        |
| `lib/events/transitions.ts`                       | 2D, 7B   | Increment counters + recalculate badges       |
