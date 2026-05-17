# Ulysses Universe: Unified Commitment Engine for ChefFlow

> Design spec for a behavioral commitment system across all chef workflow domains.
> Approach: Unified engine (Approach A). Progressive friction. Chef-declared + system-suggested.
> Build horizon: 7 waves, each ships independently.
> Created: 2026-05-17

---

## Philosophy

The Ulysses Contract (Odysseus tied to the mast) is a commitment device: present-rational-self binds future-under-pressure-self. In ChefFlow, the gap is that 38 existing gate/lock/friction/guard primitives are almost all advisory. The chef can override anything trivially. The CIL commitment analyzer (built 2026-05-17) detects WHEN commitments break, but nothing yet PREVENTS or ESCALATES THE FRICTION of breaking them.

This spec fills that gap with one unified engine that all domains plug into.

### Design Decisions (Locked)

1. **Unified engine over domain-by-domain:** One `lib/commitment/` engine. All domains register as plugins. One friction calculator, one override UX, one analytics surface. Avoids 10 parallel systems that diverge.
2. **Progressive friction over hard binding:** Never fully blocks. Escalates with override history. Chefs sometimes NEED to override (last-minute dietary changes, emergency rebookings). Friction makes breaking conscious, not impossible.
3. **Chef-declared + system-suggested:** Chef sets explicit rules ("my pricing floor is $125/head"). System ALSO suggests commitments from observed patterns ("you always regret unlocking menus, want a cooldown?"). Chef must accept suggestions before they activate.
4. **Domain severity hierarchy:** Dietary safety starts at Tier 3 friction. Business health starts at Tier 1. Safety > financial > operational > relational > strategic.

---

## Layer 1: Commitment Registry

### Core Types

```typescript
// lib/commitment/types.ts

type CommitmentDomain =
  | 'pricing'
  | 'scheduling'
  | 'dietary'
  | 'menu'
  | 'closeout'
  | 'communication'
  | 'capacity'
  | 'contingency'
  | 'travel'
  | 'business_health'

type CommitmentSource = 'chef_declared' | 'system_suggested' | 'system_accepted'

type CommitmentStatus = 'active' | 'paused' | 'dismissed'

type FrictionTier = 1 | 2 | 3 | 4 | 5

type Commitment = {
  id: string
  tenantId: string
  domain: CommitmentDomain
  source: CommitmentSource
  rule: CommitmentRule
  status: CommitmentStatus
  frictionLevel: FrictionTier
  overrideCount: number
  lastOverrideAt: Date | null
  currentStreak: number // days since last override
  longestStreak: number // all-time best streak
  futureSelfletter: string | null // chef's note to future self
  createdAt: Date
  metadata: Record<string, unknown>
}
```

### CommitmentRule Discriminated Union

```typescript
type CommitmentRule =
  // Pricing domain
  | { type: 'pricing_floor'; minPerHead: number }
  | { type: 'margin_floor'; maxFoodCostPercent: number }
  | { type: 'no_late_discounts'; freezeDaysBeforeEvent: number }
  // Scheduling domain
  | { type: 'max_events_per_week'; limit: number }
  | { type: 'min_rest_days'; days: number; perWeeks: number }
  | { type: 'max_consecutive_work_days'; limit: number }
  | { type: 'protected_time_lock'; blockIds: string[] }
  | { type: 'no_same_day_doubles_after'; hour: number }
  // Dietary domain
  | { type: 'allergens_verified_before_confirm'; required: true }
  | { type: 'cross_contamination_check_required'; required: true }
  | { type: 'no_unverified_substitutions'; required: true }
  | { type: 'dietary_summary_sent_before'; days: number }
  // Menu domain
  | { type: 'menu_lock_cooldown'; hours: number }
  | { type: 'max_menu_revisions'; limit: number }
  | { type: 'no_new_dishes_within'; days: number }
  | { type: 'recipe_required_before_lock'; required: true }
  // Closeout domain
  | { type: 'invoice_within_days'; days: number }
  | { type: 'payment_followup_within_days'; days: number }
  | { type: 'cost_reconciliation_required'; required: true }
  | { type: 'no_new_events_until_closeout'; maxUnclosed: number }
  // Communication domain
  | { type: 'response_time_sla'; hours: number }
  | { type: 'cadence_integrity'; required: true }
  | { type: 'no_radio_silence'; maxDays: number }
  | { type: 'post_event_followup_within'; hours: number }
  // Capacity domain
  | { type: 'max_guests_without_sous'; limit: number }
  | { type: 'revenue_concentration_cap'; maxPercent: number }
  | { type: 'min_prep_time_per_tier'; hoursPerGuestTier: Record<string, number> }
  | { type: 'min_gap_between_events'; minutes: number }
  // Contingency domain
  | { type: 'emergency_contacts_before_confirm'; required: true }
  | { type: 'backup_plan_for_high_value'; minEventValue: number }
  | { type: 'insurance_current_required'; required: true }
  | { type: 'equipment_checklist_before_service'; required: true }
  // Travel domain
  | { type: 'travel_time_buffer'; minutes: number }
  | { type: 'travel_plan_before_confirm'; required: true }
  | { type: 'max_distance_without_overnight'; miles: number }
  | { type: 'travel_surcharge_required'; required: true }
  // Business health domain
  | { type: 'weekly_financial_review'; required: true }
  | { type: 'quarterly_rate_review'; required: true }
  | { type: 'certification_currency'; required: true }
  | { type: 'savings_reserve_percent'; percent: number }
  // Cross-domain
  | { type: 'no_free_work_tasting_fee'; minFee: number }
  | { type: 'no_free_work_revision_cap'; included: number; overageFee: number }
  | { type: 'no_free_work_consultation_fee'; minFee: number; afterMinutes: number }
  | { type: 'say_no_min_event_value'; minTotal: number }
  | { type: 'say_no_max_distance'; maxMiles: number }
  | { type: 'say_no_cancelled_clients_require_prepay'; required: true }
  | { type: 'time_of_day_no_responses_after'; hour: number }
  | { type: 'time_of_day_no_quotes_after'; hour: number }
  | { type: 'time_of_day_no_accepts_between'; startHour: number; endHour: number }
  | { type: 'custom'; description: string; validatorId: string }
// validators registered in lib/commitment/custom-validators.ts
```

### Database

One new table: `commitments`. No migration to existing tables. Reads existing tables for evaluation.

```sql
CREATE TABLE commitments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  domain TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'chef_declared',
  rule JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  friction_level INTEGER NOT NULL DEFAULT 1,
  override_count INTEGER NOT NULL DEFAULT 0,
  last_override_at TIMESTAMPTZ,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  future_self_letter TEXT,
  seasonal_profile TEXT,  -- enum: 'peak' | 'quiet' | 'holiday' | 'custom' | null (matches CommitmentSeason type)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commitments_tenant_domain ON commitments(tenant_id, domain, status);
CREATE INDEX idx_commitments_tenant_status ON commitments(tenant_id, status);

CREATE TABLE commitment_overrides (
  id TEXT PRIMARY KEY,
  commitment_id TEXT NOT NULL REFERENCES commitments(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  category TEXT,
  reason TEXT NOT NULL,
  friction_tier_at_override INTEGER NOT NULL,
  regret_prediction INTEGER,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_overrides_commitment ON commitment_overrides(commitment_id, created_at);
CREATE INDEX idx_overrides_tenant ON commitment_overrides(tenant_id, created_at);

CREATE TABLE commitment_suggestions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  domain TEXT NOT NULL,
  suggested_rule JSONB NOT NULL,
  rationale TEXT NOT NULL,
  evidence JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suggestions_tenant ON commitment_suggestions(tenant_id, status);
```

---

## Layer 2: Friction Gradient

### Five Tiers

| Tier | Name          | UX Behavior                                                                                                                                        | Escalation Trigger                                          |
| ---- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1    | **Awareness** | Inline banner: "This breaks your commitment: {rule}." Dismiss button.                                                                              | Default for new commitments                                 |
| 2    | **Pause**     | Modal with 10-second countdown timer before override button activates. Shows override history count.                                               | 2+ overrides in 30 days                                     |
| 3    | **Justify**   | Mandatory reason from taxonomy + free text. Category picker. Cannot proceed without.                                                               | 3+ overrides in 60 days OR consequence correlation detected |
| 4    | **Witness**   | Reason required + Future Self Letter shown + override logged as CIL signal urgency 4 + Remy mentions in next briefing.                             | 5+ overrides in 90 days                                     |
| 5    | **Ceremony**  | Full ceremony: reason, category, acknowledgment checkbox, 30-second cooldown, Future Self Letter, consequence data, logged as high-urgency signal. | 8+ overrides in 90 days OR override-then-issue correlation  |

### Domain Default Tiers

Dietary safety: starts at Tier 3.
Contingency (insurance, emergency contacts): starts at Tier 2.
All other domains: start at Tier 1.

### Streak Update Mechanism

`current_streak` on each active commitment is updated daily via Hermes cron job (fits existing night-shift pattern). The cron:

1. Increments `current_streak` for all active commitments with no override today
2. Updates `longest_streak` when `current_streak` exceeds it
3. Detects milestone boundaries (30/60/90/180/365 days) and emits CIL signals for Remy morning briefing
4. Resets `current_streak` to 0 on override (handled inline by the override ceremony, not cron)

Calculated-on-read was rejected because milestone detection requires daily evaluation, and the cron cost is negligible (one UPDATE per active commitment per day).

### De-escalation

60 days without an override on a commitment drops its friction one tier (min Tier 1). Chef can manually reset to Tier 1 once per quarter (itself tracked as a commitment act).

### Friction Calculator

```typescript
// lib/commitment/friction.ts

function calculateFrictionTier(commitment: Commitment): FrictionTier {
  const domainDefault = DOMAIN_DEFAULT_TIERS[commitment.domain]
  const overridesLast30 = countOverridesInWindow(commitment, 30)
  const overridesLast60 = countOverridesInWindow(commitment, 60)
  const overridesLast90 = countOverridesInWindow(commitment, 90)
  const hasConsequenceCorrelation = checkConsequenceCorrelation(commitment)

  let tier = domainDefault
  if (overridesLast30 >= 2) tier = Math.max(tier, 2)
  if (overridesLast60 >= 3 || hasConsequenceCorrelation) tier = Math.max(tier, 3)
  if (overridesLast90 >= 5) tier = Math.max(tier, 4)
  if (overridesLast90 >= 8 || hasProvenConsequences(commitment)) tier = Math.max(tier, 5)

  return tier as FrictionTier
}
```

---

## Layer 3: Override Ceremony (Unified Dialog)

One component. Every domain routes through it. Context-aware display:

1. Which commitment is being broken (human-readable rule description)
2. Override history: lifetime count + last 90 days + trend
3. Friction-tier-appropriate UI elements:
   - Tier 1: dismissible banner
   - Tier 2: 10-second countdown modal
   - Tier 3: mandatory category picker + reason field
   - Tier 4: all of Tier 3 + Future Self Letter display + CIL signal
   - Tier 5: all of Tier 4 + acknowledgment checkbox + 30-second cooldown + consequence data
4. Consequence data if available ("Last 3 times you overrode this, 2 events had post-event issues")
5. Streak impact: "Your 67-day streak will reset"

### Override Reason Taxonomy (7 categories)

- `time_constraint`: "Not enough time"
- `client_request`: "Client asked for this"
- `ingredient_substitution`: "Ingredient not available"
- `venue_change`: "Venue requirements changed"
- `simplified_service`: "Simplifying service scope"
- `financial_pressure`: "Need the revenue"
- `scheduling_cascade`: "Domino from another commitment"
- `chef_judgment`: "Professional judgment call"
- `other`: Free text

---

## The Ten Domains

### Domain 1: Pricing (Margin Protection)

**Chef-Declared:**

- Pricing floor: never quote below $X per head
- Margin floor: food cost never exceeds Y% of per-head price
- No late discounts: no price reductions within Z days of event

**System-Suggested (pattern-based):**

- "You quoted below $100/head 4 times this quarter, 3 had negative margins. Set $115 floor?"
- "Average margin on post-proposal discounts is 12% lower. Add no-discount-after-proposal rule?"

**Integration points:** Quote builder, proposal send action, pricing calculator.

### Domain 2: Scheduling (Burnout Prevention)

**Chef-Declared:**

- Max events per week
- Min rest days per 2-week period
- Max consecutive work days
- Protected time locks (cannot unblock without ceremony)
- No same-day doubles after X PM

**System-Suggested:**

- "11 consecutive days last month, satisfaction dropped 30%. Set 6-day max?"
- "Unblocked 3 vacation days for clients this quarter. Lock future vacation blocks?"

**Integration points:** Booking flow, availability actions, burnout capacity scoring.

### Domain 3: Menu Integrity (Quality Lock)

**Chef-Declared:**

- Menu lock cooldown: X hours after locking, cannot unlock
- Max menu revisions per event
- No new dishes within X days of service
- Recipe required before menu lock

**System-Suggested:**

- "Unlocked menus 6 times in 30 days. Add 24-hour cooldown?"
- "3 of last 5 events had menu changes within 48 hours. Add 72-hour freeze?"

**Integration points:** Menu lifecycle FSM, menu lock/unlock actions.

### Domain 4: Dietary Safety (Guest Protection)

**Default friction: Tier 3.** Guest safety is where progressive friction leans toward hard binding.

**Chef-Declared:**

- All allergens verified before event confirmation
- Cross-contamination analysis required before menu lock
- No unverified ingredient substitutions
- Dietary summary sent to client N days before event

**System-Suggested:**

- "Overridden dietary gates 4 times. 1 resulted in guest reaction note. Make gates hard-block?"
- "You skip cross-contamination checks on small events. Guest count doesn't change allergen risk. Universal enforcement?"

**Integration points:** Readiness gates, dietary safety checks, menu approval.

### Domain 5: Closeout Discipline (Financial Hygiene)

**Chef-Declared:**

- Invoice within X days of event completion
- Payment follow-up within X days
- Cost reconciliation required before marking complete
- No new events confirmed while N+ events await closeout

**System-Suggested:**

- "7 unclosed events averaging 23 days old. Cap at 3 unclosed before new confirmations?"
- "Average invoice delay is 12 days. Industry norm is 3. Set 5-day commitment?"

**Integration points:** Closeout loop, event confirmation flow, invoice actions.

### Domain 6: Communication (Client Relationship)

**Chef-Declared:**

- Response time SLA: reply within X hours during business hours
- Cadence integrity: never skip scheduled cadence touchpoints
- No radio silence beyond X days pre-event
- Post-event follow-up within 48 hours

**System-Suggested:**

- "Skipped 3 cadence emails this month. Clients missing cadence rebook at 40% lower rate. Add cadence skip protection?"
- "Average response time is 38 hours. Set 12-hour commitment?"

**Integration points:** Communication pipeline, cadence scheduler, follow-up sequences.

### Domain 7: Capacity (Sustainable Growth)

**Chef-Declared:**

- Max guests per event without sous chef
- Revenue concentration cap (Herfindahl protection)
- Minimum prep time per guest count tier
- Minimum gap between consecutive same-day events

**System-Suggested:**

- "Client A is 52% of revenue (Herfindahl: high). Set 40% concentration cap?"
- "Events with <2 hours prep per 10 guests had 3x more issues. Set minimum?"

**Integration points:** Booking flow, capacity planning, concentration risk calculator.

### Domain 8: Contingency (Preparation Safety Net)

**Default friction: Tier 2.**

**Chef-Declared:**

- Emergency contacts on file before event confirmation
- Backup plan required for events over $X value
- Business insurance must be current to confirm events
- Packing list verified before transitioning to in_progress

**System-Suggested:**

- "Confirmed 3 events without contingency notes. Require for events over $500?"
- "Insurance expires in 14 days. Auto-block confirmations when expired?"

**Integration points:** Event confirmation flow, contingency actions, compliance gates.

### Domain 9: Travel (Logistics Discipline)

**Chef-Declared:**

- Travel time buffer: X minutes between arrival and service start
- Travel plan required before event confirmation
- No events beyond X miles without overnight accommodation
- Travel surcharge auto-included for distant events

**System-Suggested:**

- "Last 3 events over 60 miles, arrived with <30 min buffer. Set 60-minute minimum?"
- "Forgot travel surcharge on 2 of 5 distant events. Auto-include?"

**Integration points:** Travel actions, event confirmation, quote builder.

### Domain 10: Business Health (Long-Term Viability)

**Chef-Declared:**

- Weekly financial review (dashboard viewed, system tracks)
- Quarterly rate review
- Certification currency (all required certs current, block if expired)
- Savings reserve advisory

**System-Suggested:**

- "Haven't reviewed analytics in 21 days. Margins shifted -4%. Set weekly review commitment?"
- "Food handler cert expires in 30 days. Auto-block when lapsed?"

**Integration points:** Analytics dashboard, certification tracking, business health checklist.

---

## Cross-Domain Compound Signals

These detectors live in **CIL** (detection layer), not the commitment engine (enforcement layer). The engine EMITS override events as CIL signals. These compound detectors CONSUME those signals alongside other CIL data. The engine provides the data feed; CIL owns pattern recognition.

### Spiral Detector

Overrides across 3+ domains within 2-week window. CIL signal urgency 5. Remy surfaces in morning briefing: "Commitment integrity dropped 40% this week across pricing, scheduling, dietary, and communication."

### Client Vortex Detector

One client driving overrides across multiple domains (pricing + menu + revision + closeout). Surfaces relationship cost: "Client {name} triggered overrides in 4 domains. Consider value vs. cost."

### Seasonal Erosion Detector

Override frequency mapped to calendar. Pre-warns before historically high-override months: "December is historically your highest override month (14 overrides last December)."

### Fatigue Cascade Detector

Four independent signals trending worse simultaneously: burnout score + override frequency + response times + closeout backlog. Predicts operational crash.

### New Client Risk Detector

First-time client events have higher override rates. Suggests stricter commitments for first engagements: "New client events have 3x the override rate of repeat clients."

---

## Dream Systems (35 Novel Behavioral Architectures)

### Dream 1: Future Self Letters

When setting a commitment, chef writes a note to future-stressed-self explaining WHY this matters. Displayed during Tier 4+ override ceremonies. Chef's own words, not system lectures. The literal Ulysses mechanism: present-self speaking to future-self.

### Dream 2: Commitment Seasons

Different commitment profiles for different times of year. Peak season (Nov-Dec, Jun-Aug): tighter scheduling, relaxed pricing. Quiet season (Jan-Feb): relaxed scheduling, lower pricing floor. Custom seasons. Auto-swap on boundaries.

### Dream 3: Event-Specific Commitment Contracts

Before accepting any event, chef commits to quality standards FOR THAT EVENT. Auto-tiers by event value/complexity. Post-event: system scores adherence. Running "commitment integrity score" average.

### Dream 4: Anti-Scope-Creep Lock

Post-proposal scope soft-lock. Minor changes (guest +/-2) = Tier 1. Medium changes (new course, dietary) = Tier 2 + re-pricing prompt. Major changes (venue, +50% guests) = Tier 3 mandatory re-proposal.

### Dream 5: Delegation Commitment (Bus-Factor Contract)

Pre-written crisis protocol. If incapacitated: which clients notified, which events cancelled/rescheduled, who accesses what, what templates used. Healthy chef writes injured chef's operating manual. From the real chef injury story.

### Dream 6: No Free Work Commitment

Tasting fee required (min $X, credited to booking). Revision cap with overage fees. Consultation fee after N minutes. Recipe development fee. Travel surcharge minimum. Tracks: "$1,200 in fees waived this quarter."

### Dream 7: Streak Counter + Integrity Score

Per-commitment streak tracking ("42 days without overriding pricing floor"). Rolling 90-day integrity score (0-100) across all domains, weighted by domain severity. 30/60/90/180/365-day milestone markers. Loss aversion: breaking a streak is psychologically harder than breaking a rule.

### Dream 8: Remy as Commitment Coach

Morning briefing: commitment status, capacity warnings, streak updates. Post-override coaching: non-judgmental, helps decide if commitment needs adjusting vs. temporary pressure. Monthly review: strongest/weakest domains, trend analysis ("you override more on Fridays"). Remy illuminates, never judges.

### Dream 9: Client-Facing Commitment Transparency

Optional public exposure. Profile badge: "94% commitment integrity." Contract addendum: specific promises. Post-event report: commitments honored. Internal discipline becomes external trust differentiation.

### Dream 10: Commitment Decay Detection

Gradual threshold erosion (floor creeping from $125 to $108 over months). Increasing override frequency. Friction tier ineffectiveness. Commitment abandonment (paused, never reactivated). Honest recalibration: "Your effective floor is $108. Recommit at $125 or reset to match reality?"

### Dream 11: Pre-Mortem Commitment

Before confirming event, 30-second pre-mortem: "Imagine this event went badly. What would have gone wrong?" Pick failure modes (sourcing, prep time, dietary, underpriced, logistics). Each selection auto-activates corresponding domain commitment for that event. Anxiety becomes protection.

### Dream 12: Vendor & Supplier Commitments

Preferred vendor lock, order lead time, no same-day market runs, quality tier lock. Supply chain discipline. Correlates same-day sourcing with quality issues.

### Dream 13: Learning Commitment

Debrief required within X days. One lesson per event. Recipe update trigger for in-service modifications. Photo documentation minimum. Feeds override-issue correlation.

### Dream 14: Temptation Catalog

Learns override triggers: time-of-day, day-of-week, client type, event proximity, season, emotional state signals (rapid-fire actions, skipping steps), communication triggers (override within 30 min of client message). Personalized temptation profile. Remy uses for intervention timing.

### Dream 15: Cooling-Off Period

Mandatory delay between decision and execution for high-impact actions. 4hr for pricing overrides. 24hr for client relationship drops. 48hr for commitment removal. Decision is queued, notification fires at end: "You decided 4 hours ago. Still want to proceed?"

### Dream 16: Accountability Witness

Chef designates human (spouse, sous chef, mentor) notified on Tier 4+ overrides. Weekly digest. Social accountability. Fully opt-in, chef chooses witness. Knowing someone SEES commitment breaks changes behavior more than any system friction.

### Dream 17: Commitment Archaeology

Retroactive simulation against historical events. "If your $125 floor had been active for 12 months: 8 events blocked (revenue lost: $3,200), but those 8 averaged -2% margin. Net savings: $3,800." Evidence from chef's own history.

### Dream 18: Best-Month Mirror

Identifies chef's best-performing month. Creates behavioral snapshot (events/week, per-head pricing, override rate, prep time, response time, closeout speed). Shows comparison when drifting. Chef compared to own peak, not industry benchmarks.

### Dream 19: Commitment Portfolios

Pre-configured bundles: Quality-First (strict everything), Growth (relaxed, volume-focused), Sustainability (balanced with strong boundaries), Recovery (strict caps, mandatory rest, daily check-ins). Chef picks to start, customizes. Seasonal auto-switching.

### Dream 20: Anti-Commitment Detection

Detects chefs with NO commitments exhibiting erratic behavior. "Your quotes range $60-$200 with no pattern. Chefs with pricing commitments have 40% more consistent margins. Set a floor?" Catches the chef who doesn't know they need commitments.

### Dream 21: "Say No" Pre-Commitment

Pre-declared refusal categories: under $X total value, over X miles, previously cancelled clients without prepay, too many dietary accommodations without surcharge. Auto-decline with graceful template, or flag for manual review.

### Dream 22: Commitment Negotiation

When two commitments conflict (max 3/week vs. never reject repeat clients), system offers resolution: honor one or the other, creative middle ground, or set permanent precedence. Learns priority hierarchy after 3 conflicts.

### Dream 23: Time-of-Day Commitments

Rules active only during windows. No client responses after 9pm (drafts queue, sends at 8am). No quote changes after 6pm. No event acceptances 10pm-7am. No business comms on protected days. Friction +1 tier during protected windows.

### Dream 24: Regret Minimizer

Pre-override question at Tier 3+: "If this goes wrong, how much will you regret?" (1-5). Post-event correlation: "Your regret predictions for pricing overrides underestimate by 60%. You think it'll be fine. It usually isn't."

### Dream 25: Recovery Protocol

Spiral circuit breaker. Activates when: integrity <50% for 2 weeks, OR burnout critical, OR chef manually triggers. Auto-pauses non-safety commitments. Activates Recovery Portfolio. Remy recovery coaching mode. 7-day check-in. Gradual re-activation over 2 weeks. Post-recovery debrief.

### Dream 26: Commitment DNA

Operational personality fingerprint from commitment patterns. Archetypes: Perfectionist (high quality, strict safety), Hustler (high volume, aggressive pricing), Balanced (moderate everything), Artisan (extreme menu integrity, low volume, high price), Caretaker (safety maxed, communication strict). Self-awareness + onboarding guidance.

### Dream 27: Reputation Firewall

Brand protection commitments: no unplated photos on social, review response SLA, portfolio updated quarterly, no public pricing, brand-consistent communication templates.

### Dream 28: Energy Budget

Emotional energy tracking beyond time: high-energy event cap per month, difficult client limit on active roster, creative energy reserve (1 day/week for development), admin energy boundary. Tracks expenditure by event complexity.

### Dream 29: Milestone Commitments

Business growth milestones with committed actions: "At 100 events, hire sous chef." "At $X/month for 3 months, raise floor." System tracks progress, triggers when milestone hit. Prevents goalpost-moving.

### Dream 30: Commitment-Aware Quoting

Quote builder checks all commitments before send. Shows: "Accepting this quote breaks 2 commitments: pricing floor ($125 vs $110 quoted) and capacity (4th event that week)." Compatibility pre-check.

### Dream 31: Client Education Commitment

Timeline transparency (realistic prep timelines, never promise faster than capability). Pricing transparency (explain components when questioned). Scope confirmation after every change request. Limitation honesty (refer rather than overcommit).

### Dream 32: Gratitude Commitment

Post-event rituals: thank vendors within 48hr, personal client thank-you within 24hr, team recognition, host venue thanks. Tracks vendor relationship reliability correlation.

### Dream 33: Living Recipe Commitment

Document new dishes within 7 days of serving. Update recipes after in-service modifications within 48hr. Cost-link required for "complete" status. Scaling verified for events above X guests. Addresses the core "10 years, zero documentation" problem.

### Dream 34: Commitment Diffusion

When a commitment works well in one domain, suggest analogous commitments in others. Pricing floor success -> suggest menu revision cap. Closeout deadline success -> suggest communication SLA. Commitments spread from strength.

### Dream 35: "Is This Still Me?" Quarterly Audit

Review all active commitments quarterly. For each: integrity score, override count, consequence data, options (keep/adjust/retire). Prevents zombie rules. Growth-aware recalibration.

---

## Commitment Cockpit (Dashboard Section)

### Layout

- **Top bar:** Overall Commitment Integrity Score (0-100) with 90-day trend arrow
- **Domain health grid:** 10 domains, each showing active count, current tier, longest streak, 30d override count, color (green >90% / yellow 70-90% / red <70%)
- **Active streaks:** Top 5 longest streaks with day counts
- **Recent overrides:** Last 5 with domain, reason, tier, consequence
- **System suggestions:** 2-3 recommendations from pattern harvester
- **Commitment weather:** Real-time pressure indicator (LOW / MODERATE / HIGH / CRITICAL)
- **Seasonal profile:** Current active season and loaded profile
- **Future Self Letter:** Most recent, visible as reminder

---

## Build Waves

### Wave 0: Foundation (DONE)

- CIL Commitment Analyzer (5 patterns)

### Wave 1: Engine + Top 3 Domains (10 items)

- Unified engine: registry, friction gradient, override ceremony
- Pricing, scheduling, dietary domains
- Streak counter + integrity score
- Commitment cockpit dashboard

### Wave 2: Next 4 Domains + Psychology (7 items)

- Menu, closeout, communication, capacity domains
- Future Self Letters, cooling-off periods, commitment portfolios

### Wave 3: Remaining Domains + Compound Intelligence (11 items)

- Contingency, travel, business health domains
- 5 compound signal detectors
- Commitment seasons, event-specific contracts
- Override-then-issue correlation

### Wave 4: Advanced Behavioral Systems (6 items)

- Temptation catalog, accountability witness
- Commitment archaeology, best-month mirror
- Commitment negotiation, regret minimizer

### Wave 5: Ecosystem + AI Coaching (8 items)

- Remy coach (morning, post-override, monthly)
- Anti-commitment detection, recovery protocol
- Commitment DNA, commitment diffusion
- "Is This Still Me?" audit

### Wave 6: Business Growth Layer (7 items)

- Anti-scope-creep, delegation, no-free-work
- Client-facing transparency, "say no" pre-commitment
- Milestone commitments, commitment-aware quoting

### Wave 7: Mastery Layer (10 items)

- Decay detection, vendor commitments, learning commitment
- Time-of-day, reputation firewall, energy budget
- Client education, gratitude, living recipe, pre-mortem

---

## Integration with Existing Systems

### CIL (Continuous Intelligence Layer)

Commitment engine feeds signals to CIL. CIL's commitment analyzer is the DETECTION layer; the engine is the ENFORCEMENT layer. They share data but have distinct roles.

### Readiness Gates

Existing readiness gates become commitment-aware. Gate overrides route through the unified override ceremony instead of the current simple reason field.

### Confirm Policy

Existing `lib/confirm/confirm-policy.ts` friction tiers inform the commitment friction gradient. The commitment engine extends but does not replace confirm policy.

### Remy

Remy gets commitment context: morning briefing includes commitment status, post-override coaching, monthly review. Requires Remy Routines Foundation (currently BLOCKED).

### Quote Builder

Commitment-aware quoting checks pricing + capacity + scheduling commitments before quote send. Shows compatibility report.

### Event FSM

Event state transitions check relevant commitments at each transition point (confirm, in_progress, completed). Override ceremony fires when transitions would break commitments.

---

## What This Is NOT

- NOT a performance review system. No one grades the chef except themselves.
- NOT a restriction engine. Every commitment can be overridden. Friction, never blocking.
- NOT surveillance. All data is per-tenant, visible only to the chef (and optionally their chosen witness).
- NOT a comparison tool. Chef is compared only to their own best, never to other chefs.
- NOT required. A chef with zero commitments uses ChefFlow normally. The system is purely opt-in.
