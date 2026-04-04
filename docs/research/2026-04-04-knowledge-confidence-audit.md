# Research: Knowledge Confidence Audit + Research Gap Analysis

> **Date:** 2026-04-04
> **Question:** Across every persona, system, and market assumption attached to ChefFlow, what do we actually know vs. what are we guessing?
> **Status:** complete

## Origin Context

The developer requested this audit as ChefFlow enters its validation phase (anti-clutter rule since 2026-04-01). Build phase is over. The question is no longer "can we build it?" but "should we, and does the evidence support it?" This audit inventories every knowledge claim across 30+ personas and 7 axes, scores the gaps, and prescribes the highest-ROI research to close them.

## Summary

ChefFlow has deep, verified knowledge about private chef workflows and has built far beyond what the market offers. The platform is production-grade with 265+ pages. However, the project has near-zero primary user validation data (1 beta tester), no conversion/retention metrics, and operates on an unvalidated monetization model. The single most dangerous assumption is that private chefs will voluntarily pay for a free tool. The single highest-ROI research is executing the already-designed Wave-1 survey.

---

# PHASE 1: CONFIDENCE INVENTORY

## A. Chef-Side Personas

### Private Chef (Solo Operator)

| Claim                                                                  | Tier           | Source                                                                                           | Notes                                                           |
| ---------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Manages 3-8 recurring clients                                          | T1: VERIFIED   | `docs/research/2026-04-04-chef-persona-workflow-research.md`, USPCA data, Epicurate testimonials | Multiple independent sources confirm                            |
| Event-based work (dinner parties, meal prep, vacation cooking)         | T1: VERIFIED   | Same report + competitive landscape research                                                     | Universal across all sources                                    |
| 18 emails per booking with unspecialized tools                         | T1: VERIFIED   | Epicurate user testimonial cited in chef persona research                                        | Single source but specific and quantified                       |
| Menu repetition anxiety is a real pain point                           | T1: VERIFIED   | Chef persona workflow research, multi-persona synthesis                                          | Chefs track "what I served last time" manually                  |
| Grocery cost tracking is the #1 financial pain                         | T1: VERIFIED   | Multiple research reports + chef-tax-export gap check                                            | Per-event expense allocation gap confirmed across all verticals |
| Uses 4-7 disconnected tools (Google Docs, Excel, WhatsApp, QuickBooks) | T1: VERIFIED   | Competitive landscape, workflow research, forum data                                             | Universal finding                                               |
| Prices by day/meal/hour with grocery pass-through                      | T1: VERIFIED   | Chef persona workflow research, pricing patterns research                                        | Standard pricing model confirmed                                |
| Per-event profitability almost never calculated                        | T1: VERIFIED   | Operational financial persona research                                                           | "Income is what hit my bank account"                            |
| Average daily input tolerance: <2 minutes                              | T1: VERIFIED   | Multi-persona transparency synthesis                                                             | Chefs abandon tools requiring more                              |
| Tool engagement is anxiety-driven, not habit-driven                    | T1: VERIFIED   | Multi-persona synthesis                                                                          | Opens tools when something feels wrong                          |
| ChefFlow's event system matches this workflow                          | T1: VERIFIED   | Codebase: `lib/events/transitions.ts`, 8-state FSM, 40+ handlers                                 | Built and functional                                            |
| ChefFlow's client profiles match dietary tracking need                 | T1: VERIFIED   | Codebase: `app/(chef)/clients/`, `lib/clients/` (48 pages)                                       | Taste profiles, allergies, dislikes, history                    |
| Intake questionnaire flow exists                                       | T1: VERIFIED   | Codebase: `app/intake/[token]/`, `lib/clients/intake-actions.ts`                                 | Token-based public form                                         |
| Receipt scanning exists                                                | T1: VERIFIED   | Codebase: `lib/ai/receipt-ocr.ts`, `lib/ocr/receipt-parser.ts`, `components/receipts/`           | OCR + event-linked capture                                      |
| Menu proposal for client review/approval exists                        | T1: VERIFIED   | Codebase: `app/(chef)/menus/` (28 action files), approval workflows                              | Interactive menu approval                                       |
| ChefFlow actually reduces the 18-email problem                         | T3: ASSUMPTION | No user data. Logical inference from feature set.                                                | No usage telemetry exists                                       |
| Private chefs will discover ChefFlow organically                       | T4: BLIND SPOT | No acquisition channel data whatsoever                                                           | Zero evidence on how chefs find new tools                       |
| Private chefs prefer self-hosted over cloud SaaS                       | T4: BLIND SPOT | No data. Developer's architectural choice, not user-validated                                    | Could be an adoption barrier                                    |

### Solo Chef

| Claim                                                    | Tier         | Source                   | Notes                                             |
| -------------------------------------------------------- | ------------ | ------------------------ | ------------------------------------------------- |
| Identical workflow to private chef, different self-label | T1: VERIFIED | Multi-persona synthesis  | "Solo chef" = private chef in different packaging |
| Same ChefFlow coverage applies                           | T1: VERIFIED | Same features serve both | No separate product surface needed                |

### Personal/Family Chef

| Claim                                               | Tier           | Source                                                                                                  | Notes                                       |
| --------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Recurring household service, weekly meal prep focus | T1: VERIFIED   | Chef persona research                                                                                   | Distinct from event-based private chef      |
| Container labeling and delivery logistics matter    | T2: PARTIAL    | Research mentions it; codebase has serving labels (`lib/documents/`) but no container management system | Built for events, not recurring weekly prep |
| Recurring scheduling exists                         | T1: VERIFIED   | Codebase: `lib/scheduling/` (25 action files), recurring event handling                                 | Calendar supports recurring                 |
| Weekly rotating menu workflow supported             | T3: ASSUMPTION | Menu system exists but no "weekly rotation" feature tested                                              | Assumed adequate, not validated             |

### Meal Prep Specialist

| Claim                                                  | Tier             | Source                                                                                                                                                                     | Notes                                          |
| ------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Batch cooking, container labeling, delivery logistics  | T2: PARTIAL      | Research identifies need; ChefFlow has prep timelines and serving labels but no delivery logistics                                                                         | Delivery tracking not built                    |
| Inventory tracking matters more than for private chefs | T5: CONTRADICTED | Research says inventory is "wrong for solo chefs" but meal prep specialists DO need it; ChefFlow has equipment inventory but not ingredient inventory for batch operations | Feature exists but for wrong persona alignment |

### Small Business (2-5)

| Claim                                         | Tier           | Source                                                                                       | Notes                       |
| --------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------- | --------------------------- |
| Needs staff scheduling + payroll              | T1: VERIFIED   | Multi-persona synthesis, operational research                                                | 5 min daily input tolerance |
| Staff module exists                           | T1: VERIFIED   | Codebase: `app/(chef)/staff/` (12 pages), `lib/staff/` (16 action files), permissions matrix | Built and extensive         |
| Staff scheduling adequate for 2-5 person team | T3: ASSUMPTION | Staff module exists but no validation from actual 2-5 person teams                           | No user data                |
| Payroll integration exists                    | T2: PARTIAL    | Tax reporting page exists; no actual payroll provider integration (ADP, Gusto)               | Internal tracking only      |

### Catering Team (10+)

| Claim                                | Tier             | Source                                                                        | Notes                                               |
| ------------------------------------ | ---------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| Needs BEO generation                 | T1: VERIFIED     | Multi-persona synthesis, cross-persona research                               | Universal catering requirement                      |
| BEO is NOT built                     | T5: CONTRADICTED | Research says it's the #1 gap for this segment; codebase has no BEO generator | 20 research file mentions, zero code                |
| Multi-department distribution needed | T1: VERIFIED     | Research                                                                      | Event detail handles single chef, not multi-station |
| Staffing allocation needed           | T2: PARTIAL      | Staff module exists but not event-specific multi-role assignment              | Built for simple team, not catering crew            |
| Not current target                   | T1: VERIFIED     | Multi-persona synthesis explicitly says "Skip" or "Needs spec"                | Intentional scope boundary                          |

### Grazing/Charcuterie Operator

| Claim                                                  | Tier           | Source                                                                | Notes                           |
| ------------------------------------------------------ | -------------- | --------------------------------------------------------------------- | ------------------------------- |
| Artisan producer, board assembly, event-based delivery | T1: VERIFIED   | Beta tester Elena (grazebyelena), direct observation                  | Primary user data from 1 tester |
| Elena is in Kittery, ME area                           | T1: VERIFIED   | `memory/project_beta_tester_elena.md`                                 | Direct relationship             |
| Needs sourcing story attached to products              | T2: PARTIAL    | Community impact research mentions it; no product-story feature built | Marketing need, not ops need    |
| ChefFlow's event system works for this persona         | T3: ASSUMPTION | Elena drove specs but no usage validation                             | Assumed fit, not measured       |

### Farm-to-Table Chef

| Claim                                                       | Tier         | Source                                                       | Notes                                                 |
| ----------------------------------------------------------- | ------------ | ------------------------------------------------------------ | ----------------------------------------------------- |
| Seasonal menus + supplier relationships + dynamic food cost | T1: VERIFIED | Multi-persona synthesis, vertical persona research           | Distinct from standard private chef                   |
| OpenClaw price engine partially serves this                 | T2: PARTIAL  | `lib/openclaw/` (33 files), seasonal analysis exists         | Price data exists; supplier CRM does not              |
| Supplier CRM not built                                      | T1: VERIFIED | Codebase search confirms no supplier relationship management | Vendor directory exists but not relationship tracking |

### Cannabis Chef

| Claim                         | Tier         | Source                                                       | Notes                                           |
| ----------------------------- | ------------ | ------------------------------------------------------------ | ----------------------------------------------- |
| Legally unstable vertical     | T1: VERIFIED | Research explicitly flags federal tightening                 | Multi-persona synthesis: "too legally unstable" |
| Cannabis module exists in app | T1: VERIFIED | Codebase: cannabis-specific pages, compliance tracking, RSVP | Built and functional                            |
| No changes recommended        | T1: VERIFIED | Research recommendation                                      | Maintain, don't expand                          |

### Luxury/Estate Chef

| Claim                                           | Tier           | Source                                                                                      | Notes                            |
| ----------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| "House book" per venue, never-repeat-dish logic | T1: VERIFIED   | Multi-persona synthesis                                                                     | Documented need                  |
| Client profiles + menu history prevent repeats  | T1: VERIFIED   | Codebase: client profiles, menu history, repeat detection (`lib/menus/`)                    | Built                            |
| Presentation quality is a polish item           | T3: ASSUMPTION | Research calls it "polish item" but no evidence this persona has been engaged               | Zero luxury chef input           |
| Confidentiality/NDA needs                       | T2: PARTIAL    | Settings has NDA page; no evidence luxury chefs actually need ChefFlow-level NDA management | Feature exists, need unvalidated |

---

## B. Client-Side Personas

| Persona                     | Claim                                                              | Tier             | Source                                                            | Notes                                               |
| --------------------------- | ------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| **First-time client**       | Needs step-by-step guidance, price transparency, written agreement | T1: VERIFIED     | Multi-persona synthesis, lifecycle gaps research                  | Universal finding                                   |
|                             | Lifecycle stepper + contract signing + event journey exist         | T1: VERIFIED     | Codebase: event system, contract generation, lifecycle tracking   | Built                                               |
|                             | Intake questionnaire exists                                        | T1: VERIFIED     | `app/intake/[token]/`, `lib/clients/intake-actions.ts`            | Token-based public form                             |
| **Repeat client**           | "Don't make me repeat myself" - expects chef remembers everything  | T1: VERIFIED     | Multi-persona synthesis: Finding 7                                | Every source confirms                               |
|                             | Client profiles with full history exist                            | T1: VERIFIED     | `app/(chef)/clients/` (48 pages), taste profiles, dietary records | Built                                               |
|                             | Proactive rebooking nudge validated                                | T2: PARTIAL      | Research says "needs validation" before building                  | Concept validated, execution unvalidated            |
| **Event organizer**         | Wants BEO, milestone check-ins, delivery tracking                  | T1: VERIFIED     | Multi-persona synthesis                                           | Clear need                                          |
|                             | BEO not built, delivery tracking not built                         | T5: CONTRADICTED | Research identifies need; code doesn't exist                      | Gap for this persona                                |
| **Corporate client**        | Budget approval chains, dietary diversity, headcount changes       | T3: ASSUMPTION   | No research specifically on corporate private chef clients        | Inferred from general corporate event patterns      |
|                             | No corporate-specific workflow exists                              | T4: BLIND SPOT   | No code, no research, no persona investigation                    | Complete gap                                        |
| **Wedding client**          | High anxiety, long lead time, vendor coordination                  | T1: VERIFIED     | WeddingWire/WeddingBee forum data in multi-persona synthesis      | Real client posts document anxiety                  |
|                             | Post-booking silence is #1 anxiety                                 | T1: VERIFIED     | 5+ independent sources                                            | "Our caterer isn't responding, I'm worried"         |
|                             | Auto-triggered midpoint check-in NOT wired                         | T5: CONTRADICTED | Research says build it (30-60 lines); not built                   | Templates exist, automation does not                |
| **Weekly meal prep client** | Recurring schedule, rotating menus                                 | T2: PARTIAL      | Research identifies need; calendar supports recurring events      | No meal-prep-specific client experience validated   |
| **Guest/attendee**          | Dietary safety, clear labeling, post-event feedback                | T1: VERIFIED     | Guest portal verified in codebase                                 | `app/(public)/event/[eventId]/guest/[secureToken]/` |

---

## C. Operational Personas

| Persona           | Claim                                                  | Tier             | Source                                                                    | Notes                                                                                                                     |
| ----------------- | ------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Back office**   | AP tied to events, POS reconciliation                  | T1: VERIFIED     | Operational research                                                      | Ledger + expense tracking exist                                                                                           |
| **Scheduling**    | Project-based scheduling with standby pools            | T2: PARTIAL      | Calendar exists; standby pools not built                                  | Research says "low priority"                                                                                              |
| **Procurement**   | Vendor relationship management, price tracking         | T2: PARTIAL      | OpenClaw price engine exists (33 files); vendor CRM does not              | Price data yes, relationship tracking no                                                                                  |
| **Finance/CPA**   | Event-based P&L, Section 179, per-event allocation     | T5: CONTRADICTED | Tax export research found multiple paths with different truth definitions | `docs/research/chef-tax-export-intent-and-gap-check-2026-04-01.md`: revenue derived from wrong sources in multiple places |
| **Employees**     | Self-service shift swaps, tip transparency, prep lists | T2: PARTIAL      | Staff module exists; shift swap not self-service                          | Built for manager, not employee self-service                                                                              |
| **Contractors**   | Shift confirmation, pay rate visibility                | T3: ASSUMPTION   | Contractor agreements page exists; no contractor-facing portal            | Admin-side only                                                                                                           |
| **Admin/manager** | Information bottleneck, 10-15 hrs/week scheduling      | T1: VERIFIED     | Operational research                                                      | ChefFlow calendar addresses this                                                                                          |

---

## D. Compliance and Legal

| Area                   | Claim                                      | Tier             | Source                                                                                | Notes                                                                                                           |
| ---------------------- | ------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Health/food safety** | Private chefs rarely inspected             | T1: VERIFIED     | Multi-persona synthesis                                                               | Low regulatory burden but need defensible records                                                               |
|                        | Temp log panel exists on event detail      | T1: VERIFIED     | Codebase confirmed                                                                    | Event-linked safety records                                                                                     |
|                        | HACCP compliance settings exist            | T1: VERIFIED     | `app/(chef)/settings/compliance/`                                                     | Built                                                                                                           |
| **Tax**                | Per-event expense allocation is #1 gap     | T1: VERIFIED     | Tax export research + multi-persona synthesis                                         | Universal finding                                                                                               |
|                        | Tax export paths disagree on revenue truth | T5: CONTRADICTED | `docs/research/chef-tax-export-intent-and-gap-check-2026-04-01.md`                    | Multiple paths, different definitions. Quoted price vs. realized cash. Created_at vs. transaction date          |
| **Insurance**          | COI tracking per event                     | T2: PARTIAL      | Insurance/protection settings exist; renewal cron exists                              | Built but per-event COI attachment unverified                                                                   |
| **Contracts/legal**    | Service agreements, cancellation terms     | T2: PARTIAL      | Contract generation exists; cancellation workflow entirely missing                    | `docs/research/private-chef-service-lifecycle-gaps.md`: "cancellation and reschedule workflow entirely missing" |
| **Allergen liability** | Cross-contamination documentation          | T1: VERIFIED     | Allergen flagging in recipes, dietary tracking in clients, allergy cards in documents | Multiple systems address this                                                                                   |

---

## E. System and Infrastructure

| Area                | Claim                                                  | Tier             | Source                                                                  | Notes                                                                         |
| ------------------- | ------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Payments**        | Unified ledger across Stripe/cash/Venmo                | T1: VERIFIED     | `lib/ledger/` (append-only, immutable)                                  | Production-grade                                                              |
|                     | Zelle-first for repeat clients                         | T1: VERIFIED     | Payment research                                                        | Offline payment types supported                                               |
|                     | ACH option not surfaced                                | T2: PARTIAL      | Stripe supports ACH; not exposed in UI                                  | Research says savings matter at $2K+ bookings                                 |
| **Email**           | Gmail-dominant, templates save 20-40 min               | T1: VERIFIED     | Research + codebase                                                     | Resend integration, 75+ templates                                             |
|                     | Gmail sync with 15+ platform parsers                   | T1: VERIFIED     | Codebase confirmed                                                      | Most differentiated email feature                                             |
|                     | Inbound inquiry parsing is highest-value email feature | T1: VERIFIED     | Payments/email integration research                                     | Not outbound templating                                                       |
| **Calendar**        | Multi-view calendar exists                             | T1: VERIFIED     | `app/(chef)/calendar/` (day, week, year), `lib/scheduling/` (25 files)  | Comprehensive                                                                 |
|                     | Two-way Google Calendar sync                           | T5: CONTRADICTED | Research identifies gap; grep confirms NOT implemented                  | Push to GCal exists; pull personal blocks back does NOT. Double-booking risk. |
|                     | .ics dispatch to clients on event confirm              | T5: CONTRADICTED | Research says clients expect this; not found in event confirmation flow | Missing feature                                                               |
| **Files/documents** | 15+ document types, 39 generators                      | T1: VERIFIED     | `lib/documents/` codebase audit                                         | Industrial strength                                                           |
| **AI (Remy)**       | 100+ AI files, 15+ agent action domains                | T1: VERIFIED     | Codebase audit                                                          | Massive, privacy-correct implementation                                       |
|                     | Remy actually helps chefs save time                    | T4: BLIND SPOT   | No usage data whatsoever                                                | Zero telemetry on Remy engagement or value                                    |
| **Price engine**    | 162K prices, 54K ingredients                           | T1: VERIFIED     | `memory/reference_openclaw_db_schema.md`                                | Pi-based, operational                                                         |
|                     | Price data is accurate enough for chef decisions       | T3: ASSUMPTION   | Coverage health monitoring exists but no chef validation                | Chefs haven't verified prices match their local stores                        |
| **Self-hosted ops** | Docker PostgreSQL, local FS, Cloudflare tunnel         | T1: VERIFIED     | Codebase + CLAUDE-REFERENCE.md                                          | Running in production                                                         |
|                     | Self-hosted model is a competitive advantage           | T3: ASSUMPTION   | No user data. Developer preference.                                     | Could be adoption barrier for non-technical chefs                             |
| **Database**        | Ledger-first, 8-state FSM, immutable entries           | T1: VERIFIED     | Codebase audit                                                          | Architectural strength                                                        |
| **Realtime**        | SSE with in-memory EventEmitter                        | T1: VERIFIED     | `lib/realtime/`                                                         | Functional                                                                    |

---

## F. Market and Business Model

| Question                    | Tier           | Source                                                                                          | What We Know                                                                                                                                                   | What's Missing                                                                                        |
| --------------------------- | -------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Pricing strategy**        | T3: ASSUMPTION | `memory/project_monetization_shift.md`, `docs/research/respectful-monetization-direction.md`    | Decision made: all free + $12/month voluntary supporter contributions. Market shows $25/month is normal for adjacent SaaS.                                     | Zero data on whether chefs will voluntarily pay. No conversion testing. No price sensitivity testing. |
| **Competitive landscape**   | T1: VERIFIED   | `docs/research/private-chef-platform-competitive-landscape.md`, competitive intelligence report | 10+ marketplaces, 6+ chef SaaS tools, 7+ generic CRMs mapped. Take a Chef + Private Chef Manager are same company. Pricing: 2.9% per booking or $29/month Pro. | Authenticated product interiors not tested. Real user sentiment unknown.                              |
| **User acquisition**        | T4: BLIND SPOT | No data                                                                                         | Nothing. Zero research on how private chefs discover new tools.                                                                                                | This is the most critical gap for launch. Building a product nobody finds is building nothing.        |
| **Retention/churn**         | T4: BLIND SPOT | No data                                                                                         | Nothing. No data on what makes a chef stop using a business tool.                                                                                              | Essential for knowing if the product sticks.                                                          |
| **Monetization validation** | T4: BLIND SPOT | No data                                                                                         | The $12/month model was chosen philosophically, not empirically. Cal.com uses similar model at scale, but Cal.com targets developers, not chefs.               | Will private chefs voluntarily pay? What conversion rate is sustainable?                              |
| **Market size**             | T2: PARTIAL    | Infrastructure gap research cites $16.88B personal chef services market (2024), $31.48B by 2034 | Global market size estimated.                                                                                                                                  | No US-specific chef population count. No estimate of addressable private chefs.                       |
| **Willingness to pay**      | T4: BLIND SPOT | No data                                                                                         | Competitor pricing documented ($9-79/month across tools). ChefFlow chose free.                                                                                 | No data on what ChefFlow's target users would pay.                                                    |
| **Referral dynamics**       | T3: ASSUMPTION | Multi-persona synthesis mentions word-of-mouth as #1 acquisition for chefs                      | Assumed chefs recommend tools; no data on through what channels or at what rate.                                                                               | Survey question needed.                                                                               |

---

## G. Public-Facing Surfaces

| Surface               | Tier                  | Source                                                           | What We Know                                                                        | What's Missing                                                               |
| --------------------- | --------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Marketing site**    | T1: VERIFIED (exists) | `app/(public)/` (80+ pages)                                      | Massive public surface with directory, profiles, how-it-works, services, about      | T4: BLIND SPOT on conversion. Zero analytics data on visitor-to-signup rate. |
| **SEO**               | T4: BLIND SPOT        | No data                                                          | Nothing. No keyword research, no search console data, no organic traffic data.      | What do private chefs search when looking for tools?                         |
| **Content strategy**  | T4: BLIND SPOT        | No data                                                          | No content marketing plan. No blog. No educational content.                         | What content attracts the target persona organically?                        |
| **Social proof**      | T4: BLIND SPOT        | No data                                                          | 1 beta tester (Elena). No testimonials, no case studies, no usage metrics to share. | Cannot demonstrate product value to prospects.                               |
| **Onboarding funnel** | T3: ASSUMPTION        | Onboarding is opt-in, non-blocking (CLAUDE.md rule)              | Onboarding exists but time-to-value never measured.                                 | How long until a new chef gets value? What's the drop-off?                   |
| **Embeddable widget** | T1: VERIFIED (built)  | `public/embed/chefflow-widget.js`, `app/embed/inquiry/[chefId]/` | Self-contained vanilla JS widget, production-ready                                  | T4: BLIND SPOT on effectiveness. No data on inquiry conversion via widget.   |
| **E-Phone Book**      | T3: ASSUMPTION        | `memory/project_ephonebook_vision.md`                            | Vision documented. External food operator directory.                                | Nothing built. No market validation.                                         |

---

# PHASE 2: GAP PRIORITIZATION

## All Tier 3, 4, and 5 Items Scored

| #   | Gap                                         | Tier | Impact (1-5) | Urgency (1-5) | Researchability (1-5) | Score   | Reasoning                                                                                                                            |
| --- | ------------------------------------------- | ---- | ------------ | ------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **User acquisition channels unknown**       | T4   | 5            | 5             | 4                     | **100** | Building a product nobody can find is building nothing. Can be researched via surveys + competitor channel analysis.                 |
| 2   | **Monetization model unvalidated**          | T4   | 5            | 4             | 4                     | **80**  | Revenue = survival. $12/month voluntary model is philosophical, not empirical. Survey + competitor conversion benchmarks can inform. |
| 3   | **Retention/churn drivers unknown**         | T4   | 5            | 4             | 3                     | **60**  | Can't fix what you can't measure. Requires user interviews or analytics (harder to desk-research).                                   |
| 4   | **Remy AI value unvalidated**               | T4   | 4            | 3             | 2                     | **24**  | 100+ files of AI code with zero usage data. Requires live users to validate.                                                         |
| 5   | **Self-hosted model as adoption barrier**   | T4   | 4            | 3             | 3                     | **36**  | Could prevent every non-technical chef from using the product. Surveyable.                                                           |
| 6   | **Tax export paths disagree on truth**      | T5   | 4            | 4             | 5                     | **80**  | Codebase audit can fix this. Financial lies = trust destruction. Desk-researchable (code audit).                                     |
| 7   | **Two-way calendar sync missing**           | T5   | 3            | 3             | 5                     | **45**  | Research says double-booking risk. Fix is engineering, not research.                                                                 |
| 8   | **Auto-triggered midpoint email not wired** | T5   | 3            | 3             | 5                     | **45**  | Research validated need; implementation is 30-60 lines.                                                                              |
| 9   | **Cancellation workflow missing**           | T5   | 4            | 3             | 5                     | **60**  | Service lifecycle research flags "entirely missing." Code fix needed.                                                                |
| 10  | **SEO and organic discovery unknown**       | T4   | 4            | 4             | 4                     | **64**  | No keyword data. Can be researched with tools (Ahrefs, Search Console).                                                              |
| 11  | **Social proof / testimonials: zero**       | T4   | 4            | 4             | 2                     | **32**  | Requires actual users. Cannot desk-research.                                                                                         |
| 12  | **Corporate client persona unexplored**     | T4   | 2            | 2             | 4                     | **16**  | Not current target. Low urgency.                                                                                                     |
| 13  | **Price engine accuracy for local stores**  | T3   | 3            | 2             | 3                     | **18**  | Requires chef validation of prices against their actual shopping.                                                                    |
| 14  | **Onboarding time-to-value unmeasured**     | T3   | 3            | 3             | 2                     | **18**  | Requires live users + analytics.                                                                                                     |
| 15  | **BEO not built**                           | T5   | 2            | 1             | 5                     | **10**  | Only matters if targeting catering teams (currently not).                                                                            |
| 16  | **Meal prep delivery logistics missing**    | T2   | 2            | 1             | 4                     | **8**   | Secondary persona. Low urgency.                                                                                                      |
| 17  | **Client .ics calendar invite missing**     | T5   | 2            | 2             | 5                     | **20**  | Small engineering fix.                                                                                                               |
| 18  | **Weekly meal prep rotation workflow**      | T3   | 2            | 1             | 3                     | **6**   | Secondary persona.                                                                                                                   |
| 19  | **Luxury chef persona never engaged**       | T3   | 2            | 1             | 3                     | **6**   | Not primary target.                                                                                                                  |
| 20  | **Market size (US chef count) unknown**     | T2   | 3            | 2             | 4                     | **24**  | Useful for fundraising pitch, not for product.                                                                                       |

## Top 10 Gaps (Sorted by Score)

| Rank | Gap                                     | Score | Tier |
| ---- | --------------------------------------- | ----- | ---- |
| 1    | User acquisition channels unknown       | 100   | T4   |
| 2    | Monetization model unvalidated          | 80    | T4   |
| 3    | Tax export paths disagree on truth      | 80    | T5   |
| 4    | SEO and organic discovery unknown       | 64    | T4   |
| 5    | Retention/churn drivers unknown         | 60    | T4   |
| 6    | Cancellation workflow missing           | 60    | T5   |
| 7    | Two-way calendar sync missing           | 45    | T5   |
| 8    | Auto-triggered midpoint email not wired | 45    | T5   |
| 9    | Self-hosted model as adoption barrier   | 36    | T4   |
| 10   | Social proof / testimonials: zero       | 32    | T4   |

---

# PHASE 3: RESEARCH RECOMMENDATIONS

## Gap #1: User Acquisition Channels Unknown (Score: 100)

**Question:** Through which 3 channels do private chefs most commonly discover and adopt new business tools?

**Research method:** Survey (Wave-1 operator survey, already designed) + competitor channel audit (where do Take a Chef, HoneyBook, meez advertise?)

**Multi-lens analysis:**

- **DEVELOPER:** Need to know which integrations matter (if chefs come from Instagram, build Instagram DM parsing; if from Google, invest in SEO).
- **ENTREPRENEUR:** CAC (customer acquisition cost) determines viability. Word-of-mouth is free but slow. Paid channels need ROI math.
- **USER:** Chefs don't search for "chef management software." They search for solutions to specific pains: "how to invoice private chef clients" or "private chef contract template."
- **OPERATOR:** If the primary channel is word-of-mouth, the product needs built-in referral mechanics. If it's search, the product needs content.

**Expected output:** Channel ranking table with estimated reach, cost, and conversion potential per channel.

**Estimated effort:** 6-8 hours (survey analysis + competitor ad/content audit + SEO keyword research).

**Decision fork:**

- YES (search-driven): Invest in SEO, content marketing, landing pages for specific pain-point queries.
- YES (referral-driven): Build referral program, make sharing frictionless, invest in social proof.
- YES (marketplace-driven): Prioritize platform integrations (Thumbtack, Bark, Take a Chef inquiry parsing).

---

## Gap #2: Monetization Model Unvalidated (Score: 80)

**Question:** Will at least 5% of active private chef users convert to $12/month voluntary supporter contributions within 90 days of regular use?

**Research method:** Survey (pricing section in Wave-1) + comparative analysis of voluntary-pay models (Cal.com, Obsidian, Blender Foundation, Wikipedia).

**Multi-lens analysis:**

- **DEVELOPER:** If voluntary model fails, the fallback is traditional SaaS ($15-25/month). This changes nothing in the codebase (Stripe billing already built) but changes everything in the business.
- **ENTREPRENEUR:** Market proves $25/month is normal. Voluntary model is a bet on goodwill + community. If conversion is <2%, revenue won't sustain a single developer.
- **USER:** Chefs are cost-sensitive. Free is compelling. But "free forever" can signal "might disappear" to business users who need reliability.
- **OPERATOR:** Need to know break-even user count at $12/month x conversion rate. If 1000 users at 5% = 50 paying = $600/month. Is that enough?

**Expected output:** Financial model with scenarios (2%, 5%, 10% conversion at $12/month) + comparative data from voluntary-pay platforms.

**Estimated effort:** 4-6 hours.

**Decision fork:**

- YES (5%+ conversion realistic): Stay the course. Focus on user growth.
- NO (<2% conversion expected): Introduce a paid tier or raise voluntary amount. Competitive data shows $25/month is the market rate. Consider "pay what you want" with suggested $25.

---

## Gap #3: Tax Export Paths Disagree on Truth (Score: 80)

**Question:** Do all accountant-facing output paths in ChefFlow produce identical revenue, expense, and profit figures for the same date range?

**Research method:** Codebase audit. Trace every export path identified in `docs/research/chef-tax-export-intent-and-gap-check-2026-04-01.md`.

**Multi-lens analysis:**

- **DEVELOPER:** This is a pure code fix. Identify all revenue computation paths, unify them to use ledger as single source of truth.
- **ENTREPRENEUR:** Financial inaccuracy = legal liability. If a chef files taxes based on ChefFlow exports and the numbers are wrong, that's a product-ending event.
- **USER:** Chef gives export to CPA. CPA finds numbers don't match. Chef loses trust in the platform permanently.
- **OPERATOR:** This needs to be fixed before any chef relies on financial exports for real tax filing.

**Expected output:** Audit table: every export path, what data source it uses, where discrepancies exist, fix plan.

**Estimated effort:** 3-4 hours (code reading, no external research needed).

**Decision fork:**

- This is not a decision; it's a bug. Fix it. The research already identified the problem. A builder agent should spec and execute the fix.

---

## Gap #4: SEO and Organic Discovery Unknown (Score: 64)

**Question:** What are the top 20 search queries private chefs use when looking for business tools, and does ChefFlow rank for any of them?

**Research method:** Keyword research (Google Keyword Planner, Ahrefs, or Ubersuggest) + competitor SEO audit (what does Private Chef Manager rank for?).

**Multi-lens analysis:**

- **DEVELOPER:** SEO findings determine which landing pages to build and what metadata to optimize.
- **ENTREPRENEUR:** Organic search is free, sustained traffic. If competitors own all relevant keywords, paid acquisition becomes the only option (expensive).
- **USER:** Chefs search for problems, not products: "private chef invoice template," "how to price catering," "personal chef contract." Content that answers these queries = discovery.
- **OPERATOR:** Monthly search volumes determine total addressable audience via search. If volumes are <100/month for all relevant terms, search is not a viable channel.

**Expected output:** Keyword table with search volume, difficulty, current ranking, and competitor presence.

**Estimated effort:** 4-5 hours.

**Decision fork:**

- YES (viable search volume): Build content strategy targeting top 10 queries. Create landing pages.
- NO (volumes too low): Abandon SEO. Focus on community, referral, and direct outreach.

---

## Gap #5: Retention/Churn Drivers Unknown (Score: 60)

**Question:** What is the #1 reason a private chef would stop using a business management tool within 90 days of starting?

**Research method:** User interviews (requires live users) + secondary research (competitor review analysis on G2/Capterra for churn signals).

**Multi-lens analysis:**

- **DEVELOPER:** Churn reason determines what to fix. If it's "too slow," optimize performance. If it's "too complex," simplify onboarding. If it's "doesn't save me time," the value prop is wrong.
- **ENTREPRENEUR:** Churn rate determines business viability. >10% monthly churn = product-market fit problem. <5% monthly churn = scalable.
- **USER:** The 2-minute rule (from multi-persona synthesis) suggests complexity and time-to-value are the primary risks.
- **OPERATOR:** Need early warning signals. What behavior predicts churn? (e.g., not logging in for 7 days, never creating a second event)

**Expected output:** Ranked list of churn drivers with evidence weight and mitigation strategies.

**Estimated effort:** 8-12 hours (requires interviews or extensive review mining; harder than desk research).

**Decision fork:**

- If churn is complexity-driven: Simplify onboarding, reduce features shown initially, implement progressive disclosure.
- If churn is value-driven: The product doesn't solve a painful enough problem. Fundamental pivot needed.
- If churn is habit-driven: Build push notifications, morning briefing, proactive nudges (some already exist).

---

## Gap #6: Cancellation Workflow Missing (Score: 60)

**Question:** Does the absence of a cancellation/reschedule workflow block any current user journey?

**Research method:** Codebase audit + lifecycle gap research review.

**Multi-lens analysis:**

- **DEVELOPER:** The 8-state FSM has "cancelled" as a terminal state but no workflow for getting there (refund logic, client notification, calendar cleanup, deposit handling).
- **ENTREPRENEUR:** Cancellations are inevitable. Handling them gracefully is a trust signal. Handling them poorly (or not at all) is a trust destroyer.
- **USER:** Client cancels 48 hours before event. Chef needs: refund policy enforcement, calendar slot reopened, partial payment handling, follow-up email.
- **OPERATOR:** Cancellation rate and reason tracking is essential business intelligence.

**Expected output:** Spec for cancellation workflow covering the FSM transition, financial handling, notification, and calendar cleanup.

**Estimated effort:** 2-3 hours research, then a builder spec.

**Decision fork:**

- This is not a decision; it's a gap. The lifecycle research already validated the need. Needs a spec.

---

## Gap #7: Two-Way Calendar Sync Missing (Score: 45)

**Question:** Does the absence of inbound Google Calendar sync cause double-booking for any current or near-term user?

**Research method:** Codebase audit (confirm current state) + user scenario analysis.

**Multi-lens analysis:**

- **DEVELOPER:** Push-to-GCal exists. Pull-from-GCal does not. Google Calendar API supports watch/webhook for change notifications.
- **ENTREPRENEUR:** Double-booking is a catastrophic user experience. One instance could lose a client worth $5K+/year.
- **USER:** Chef books a personal dentist appointment on Google Calendar. ChefFlow doesn't know. Client books same slot via inquiry. Chef is now double-booked.
- **OPERATOR:** This is infrastructure, not a feature. It prevents a class of errors.

**Expected output:** Engineering assessment: effort to implement, API requirements, sync conflict resolution strategy.

**Estimated effort:** 2 hours research, then engineering spec.

**Decision fork:**

- Build it. The risk of double-booking is concrete and the research validated it.

---

## Gap #8: Auto-Triggered Midpoint Email Not Wired (Score: 45)

**Question:** Will an automated midpoint check-in email reduce client anxiety complaints (measured by reply rate or client satisfaction)?

**Research method:** Implementation + measurement. Research already validated the need (5+ independent sources on post-booking silence anxiety).

**Multi-lens analysis:**

- **DEVELOPER:** 30-60 lines of code. Cron job queries events at midpoint. Sends template.
- **ENTREPRENEUR:** Free to implement. High trust signal. Low risk.
- **USER:** Client gets "everything is on track" email. Anxiety drops. Relationship trust increases.
- **OPERATOR:** Monitor reply rate. If clients reply with questions/changes, that's captured signal.

**Expected output:** Implementation (not more research). This is a validated quick fix.

**Estimated effort:** 1 hour research (already done), 2 hours build.

**Decision fork:**

- Build it. Research is conclusive. This is the definition of "validated quick fix."

---

## Gap #9: Self-Hosted Model as Adoption Barrier (Score: 36)

**Question:** Would more than 30% of target private chefs reject a tool that requires self-hosting (Docker, local database, no cloud signup)?

**Research method:** Survey question in Wave-1 + analysis of competitor deployment models.

**Multi-lens analysis:**

- **DEVELOPER:** Self-hosted = full data ownership, no vendor lock-in, no recurring cloud costs. But requires Docker, PostgreSQL, and terminal comfort.
- **ENTREPRENEUR:** If 70%+ of target users can't self-host, the TAM (total addressable market) shrinks to technical chefs only. Cloud offering may be necessary.
- **USER:** Most private chefs are not technical. "Download Docker" is a non-starter for many. A hosted option (even as a paid tier) may be required.
- **OPERATOR:** Self-hosted means no centralized metrics, no usage analytics, no crash reporting. Every user is an island.

**Expected output:** Decision matrix: self-hosted only vs. self-hosted + cloud option vs. cloud-first.

**Estimated effort:** 3-4 hours (survey question design + competitor deployment analysis).

**Decision fork:**

- YES (>30% rejection): Must offer a cloud-hosted option. This is a major architectural and business decision.
- NO (<30% rejection): Self-hosted is viable for the current target. Focus on simplifying setup (one-click installer, Docker Compose, etc.).

---

## Gap #10: Social Proof / Testimonials: Zero (Score: 32)

**Question:** Can we collect 3 credible testimonials from real food operators within 30 days?

**Research method:** Direct outreach to Elena + any other contacts. Survey follow-up asking for testimonial permission.

**Multi-lens analysis:**

- **DEVELOPER:** Testimonials need a display surface (landing page component, trust section).
- **ENTREPRENEUR:** Social proof is the #1 conversion driver for SaaS. Zero testimonials = zero trust for new visitors.
- **USER:** "Another chef I know uses this" is more persuasive than any feature list.
- **OPERATOR:** Testimonial collection should be systematized (post-event feedback flow already exists; add testimonial request).

**Expected output:** 3 testimonials with name, business type, and specific value statement.

**Estimated effort:** 2-4 hours outreach, ongoing collection.

**Decision fork:**

- YES (testimonials collected): Feature prominently on landing page. Use in all marketing.
- NO (can't collect): Product hasn't demonstrated enough value to real users yet. This is a signal, not just a gap.

---

# PHASE 4: META-ANALYSIS

## 1. Pattern Detection

The blind spots cluster around one systematic category: **demand-side validation.**

ChefFlow has exceptional supply-side knowledge (what chefs need, how they work, what tools exist, what the competitive landscape looks like) and exceptional build-side execution (265+ pages, 200+ server actions, industrial document generation). But there is near-zero evidence that anyone outside the development team has:

- Found the product
- Signed up for it
- Used it for real work
- Paid for it
- Recommended it to someone else

Every blind spot (acquisition, retention, monetization, SEO, social proof, onboarding time-to-value) is a demand-side question. The project has thoroughly researched "what should we build?" and executed the build, but has not yet answered "will anyone use it?"

## 2. Over-Research Audit

**Over-researched relative to importance:**

- **Persona coverage breadth.** 11+ research reports covering 30+ personas when the primary target is 1 persona (solo private chef). The cannabis chef, executive chef, sous chef, and event organizer personas each have documented research but are explicitly out of scope. This research was useful for establishing scope boundaries but should not continue.
- **Competitive intelligence depth.** Two detailed competitive reports exist (general landscape + Take a Chef / Private Chef Manager deep dive). The competitive picture is clear. Further competitive research has diminishing returns unless it involves authenticated product testing (which is prescribed in the handoff doc).
- **Transparency/engagement/momentum.** Three separate research reports investigated transparency, engagement, and gamification across 30+ personas. The conclusion was simple: "gamification is irrelevant, execution quality matters." This could have been one report.

**Under-researched relative to importance:**

- User acquisition (0 research)
- Monetization validation (0 primary data)
- Onboarding experience (0 measurement)
- SEO/organic discovery (0 keyword research)

## 3. Most Dangerous Assumption

**"Private chefs will voluntarily pay $12/month for a tool they can use for free."**

This assumption underpins the entire business model. Every hour of development, every research report, every architectural decision assumes revenue will eventually come from voluntary contributions. If this assumption is wrong:

- The platform has no revenue path
- The self-hosted model (which eliminates hosting revenue) becomes purely a cost center
- The "all features free" promise prevents pivoting to a freemium model without breaking trust
- The project becomes a personal tool for one chef (the developer), not a sustainable business

No data supports this assumption. The developer chose it philosophically (aligning with values around accessibility and anti-paywall stance), which is a valid reason to choose it, but it has not been tested against the market. Cal.com's voluntary model works at developer scale (millions of users, VC-funded). ChefFlow would need to understand whether the same psychology applies to a niche of private chefs.

## 4. Launch Readiness

If ChefFlow launched to 100 private chefs tomorrow with only Tier 1 knowledge:

**First support ticket (Day 1):** "How do I set this up?" Self-hosted installation requires Docker, PostgreSQL, and command-line knowledge. The typical private chef (artisan, not engineer) will not get past setup without hand-holding or a cloud-hosted option.

**First churn reason (Week 2):** "It takes too long to do anything." The 2-minute rule is validated. With 265+ pages and 80+ settings pages, a new chef will be overwhelmed. No progressive disclosure, no guided first-event workflow. The dashboard shows 12+ widgets (violating the 7-widget maximum from the interface philosophy).

**First "this doesn't work for me" (Month 1):** "I can't sync my Google Calendar both ways." Double-booking from missing inbound calendar sync. Or: "My accountant says these numbers don't match." Tax export path inconsistencies.

**First trust-breaking incident (Month 2):** A chef uses the financial exports for tax filing. The numbers disagree between export paths. CPA flags discrepancy. Chef loses trust permanently.

## 5. Research ROI

**Highest uncertainty reduction per hour: Execute the Wave-1 operator survey.**

The survey is already designed (`docs/research/survey-wave-1-analysis-codebook-2026-04-02.md`). Distribution channels are planned (`docs/research/survey-distribution-brief-2026-04-02.md`). It covers acquisition channels, pricing sensitivity, tool switching behavior, and feature prioritization.

One survey execution (estimated 8-12 hours of distribution + analysis) would answer or partially answer gaps #1, #2, #5, and #9 simultaneously. That's 4 of the top 10 gaps from a single research action, representing 300 points of composite gap score.

No other single research action comes close to this ROI.

---

# APPENDIX: COMPLETE TIER SUMMARY

| Tier             | Count | Description                                      |
| ---------------- | ----- | ------------------------------------------------ |
| T1: VERIFIED     | 58    | Documented, built, or independently corroborated |
| T2: PARTIAL      | 16    | Directional evidence, incomplete confirmation    |
| T3: ASSUMPTION   | 14    | Beliefs without evidence                         |
| T4: BLIND SPOT   | 13    | Zero data, haven't even formed assumption        |
| T5: CONTRADICTED | 9     | Evidence conflicts with implementation           |

**The ratio tells the story:** ChefFlow knows more about what to build (T1: 58 items) than about whether anyone will use it (T4: 13 items, all demand-side). The build is far ahead of the validation.

---

# ADDENDUM: DEEP SYNC (Added 2026-04-04)

A second pass explored every data asset, unread research file, spec, memory note, and captured artifact in the 50GB repo. This addendum captures intelligence the original 4-phase audit missed.

## What The Original Audit Missed

### 1. Security Debt (CRITICAL, Not In Original Audit)

Source: `docs/research/attack-surface-audit.md`, `docs/research/ai-injection-and-abuse-audit.md`, `docs/research/infrastructure-audit.md`, `docs/research/supply-chain-audit.md`

| Finding                                                                            | Severity | Status                                          |
| ---------------------------------------------------------------------------------- | -------- | ----------------------------------------------- |
| SSE/Realtime has ZERO authentication (cross-tenant data leak risk)                 | CRITICAL | Unfixed                                         |
| Developer's real password committed in 5 files in public repo                      | CRITICAL | Partially addressed (security audit 2026-03-29) |
| Ollama bound to 0.0.0.0 with no auth; all private data flows through it            | HIGH     | Unfixed                                         |
| Google OAuth allows dangerous email account linking (account takeover)             | HIGH     | Unfixed                                         |
| 17 npm vulnerabilities (6 moderate, 11 high); xlsx has unfixed prototype pollution | HIGH     | Unfixed                                         |
| 49+ hardcoded test credentials in public repo                                      | MEDIUM   | Unfixed                                         |

**Why this matters for the audit:** Security gaps are not persona or market questions. They are launch blockers. A cross-tenant data leak on day 1 would end the product. This category was entirely absent from the original confidence inventory.

**New tier classification:** T5: CONTRADICTED. The product presents itself as privacy-first (local AI, self-hosted, no cloud dependency) while having zero authentication on its realtime channel and an exposed AI endpoint.

### 2. AI Module Quality Regression (Not In Original Audit)

Source: `docs/simulation-report.md`, `docs/simulation-history.md`

26 simulation runs documented (2026-03-20 to 2026-04-03). Latest run:

| Module           | Pass Rate | Trend                                |
| ---------------- | --------- | ------------------------------------ |
| allergen_risk    | 100%      | Stable                               |
| correspondence   | 100%      | Stable                               |
| menu_suggestions | 100%      | Stable                               |
| quote_draft      | 100%      | Stable                               |
| inquiry_parse    | 0%        | **Regressed from 100% (2026-03-28)** |
| client_parse     | 0%        | **Regressed from 100% (2026-03-28)** |

**Why this matters:** Inquiry and client parsing are core intake functions. If Remy can't parse an incoming inquiry or client data, the AI concierge is broken for its #1 use case. This regression happened between 2026-03-28 and 2026-03-30 and has not been fixed.

**New tier classification:** T5: CONTRADICTED. The audit lists Remy as "T1: VERIFIED (100+ files, massive implementation)" but the runtime quality data shows 2 of 6 modules are failing.

### 3. The 43-Archetype Research Was Never Executed

Source: `prompts/research-agent-master-prompt.md`

The original audit references "11+ persona research reports, 30+ personas mapped." What it doesn't say: a comprehensive 43-archetype, 7-cluster research system was fully designed (master prompt, cluster assignments, source lists, output format, wave deployment plan) and **never executed.**

| Cluster | Name                                 | Archetypes | Status    |
| ------- | ------------------------------------ | ---------- | --------- |
| 1       | Independent Chef Operations          | 5          | NEVER RUN |
| 2       | Event & Experiential Dining          | 6          | NEVER RUN |
| 3       | Restaurant & Kitchen Operations      | 5          | NEVER RUN |
| 4       | Specialized Diet & Baking            | 7          | NEVER RUN |
| 5       | Institutional, Corporate & Traveling | 11         | NEVER RUN |
| 6       | Education, Media & Production Scale  | 7          | NEVER RUN |
| 7       | Competitor Tool Deep Scan            | All 43     | NEVER RUN |

The 18 persona reports that DO exist (2026-04-03 to 2026-04-04) were a narrower, workflow-focused replacement. They cover workflows well but miss: verbatim quote databases, per-archetype market sizing, tool landscape per archetype, acquisition channel mapping, and "assumption busters" that the cluster research was designed to surface.

**Estimated labor:** 80-120 hours across 7 research clusters.

**What this means:** The market intelligence is directionally correct but not empirically validated at the archetype level. The A/B/C archetype rankings remain assumption-based.

### 4. QoL Infrastructure Debt (179 Unprotected Forms)

Source: `docs/research/qol-comprehensive-audit.md`, `docs/research/qol-features-state-of-art-2025-2026.md`

Only 5 of 184 forms have auto-save/draft protection. The remaining 179 forms lose all user input on browser crash, navigation, or session timeout.

**Why this matters:** The 2-minute rule says chefs abandon tools that waste their time. Losing 10 minutes of menu entry to a browser crash would be a churn event. This is not a feature gap; it's a reliability gap.

### 5. Unused Data Assets

The repo contains data that exists but is not synthesized into any research or product decision:

| Asset                        | Location                                   | Size       | Intelligence Value                                                                                            |
| ---------------------------- | ------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------- |
| Instacart captured responses | `.openclaw-deploy/captured-responses.json` | 4.4MB      | 27 response captures with session data; Instacart GQL schema reverse-engineered                               |
| Scraped price samples        | `scripts/openclaw-scraped-prices.json`     | 100+ KB    | 62,000+ real prices with markup %, confidence, wholesale vs retail                                            |
| Department hashes            | `.openclaw-deploy/department-hashes.json`  | 738KB      | 1,395 Instacart API operation hashes (reverse-engineered GQL)                                                 |
| Scan queue manifest          | `.openclaw-deploy/scan-queue.json`         | 3.4KB      | 5 chains complete, 3 broken (Walmart/Target/Shaw's), 5 queued (Costco/BJ's/Restaurant Depot/Wegmans/ShopRite) |
| Uptime history               | `docs/uptime-history.json`                 | 90KB       | Thousands of hourly health check entries; no trend analysis exists                                            |
| Database backups             | `backups/`                                 | 13GB total | Production snapshots with real chef/client/event data; latest 2026-04-04                                      |
| Tenant merge snapshots       | `backups/tenant-merge-backup-*.json`       | 1.2MB      | Structured JSON of tenant consolidation                                                                       |
| Sentinel QA screenshots      | `results/sentinel-report.json`             | 50KB       | 7 images from loyalty feature testing (2026-03-30)                                                            |

**Key gap:** The 62,000+ scraped prices are raw data. No analysis exists on: price accuracy vs. chef's actual receipts, geographic coverage adequacy, or whether the 25-35% ingredient coverage rate is sufficient for real menu costing.

### 6. Feature Flags Gated But Invisible

Source: `lib/features.ts`

Three experimental features exist in code, gated behind flags, with zero documentation on when/why to activate:

| Flag                         | Feature                      | Status      |
| ---------------------------- | ---------------------------- | ----------- |
| `COMM_TRIAGE_ENABLED`        | Communication prioritization | OFF         |
| `OPS_COPILOT_ENABLED`        | Operations AI assistance     | OFF         |
| `OPS_AUTONOMY_LEVEL` (0/1/2) | Automation intensity         | 0 (minimum) |

No spec, no research, and no validation plan exists for any of these. They represent engineering work that has no path to activation.

### 7. 11 OpenClaw Specs Queued, Zero Executed

Source: `docs/specs/` directory scan

| Spec                                 | Status              |
| ------------------------------------ | ------------------- |
| OpenClaw Total Capture               | Designed, not built |
| Unified Pricing Intelligence         | Designed, not built |
| Mission Control Dashboard            | Designed, not built |
| Playwright Sentinel                  | Designed, not built |
| Email Agent Orchestration            | Designed, not built |
| Directory Images Cartridge           | Designed, not built |
| Data Completeness Engine             | Designed, not built |
| Capture Countdown/Pixel Schedule     | Designed, not built |
| Refresh Status Badge                 | Designed, not built |
| Chef Pricing Override Infrastructure | Designed, not built |
| Lead Engine Cartridge                | Designed, not built |

Combined with the anti-clutter rule (no new features without user validation), these specs are in limbo: designed but blocked from execution.

### 8. Privacy Promise vs. Cloud Direction Contradiction

Source: `docs/research/full-cloud-ai-runtime-and-disclosure.md`, `docs/research/remy-cloud-routing-options.md`

The product positions itself as "local-only processing" and "conversation content never stored server-side." But research documents a cloud-first AI runtime direction where all Ollama calls route through `OLLAMA_BASE_URL` (a cloud endpoint in production).

This is a T5: CONTRADICTED item. The public privacy promise and the actual architecture are diverging. If a user reads "local AI processing" and then discovers their data routes through a cloud endpoint, trust is broken.

### 9. No Unified Market Thesis

18 research reports exist (2026-04-03 to 2026-04-04). The multi-persona transparency synthesis was limited scope. No document exists that:

- Ties all 18 reports into one market thesis
- Converts persona research into go-to-market strategy
- Maps research findings to an SEO keyword list
- Converts workflow findings into competitive positioning language
- Produces a one-page "why ChefFlow wins" narrative backed by evidence

The research is deep but fragmented. It answers "what do chefs need?" but not "how do we reach them and why do they pick us?"

---

## Revised Tier Summary (Post-Deep Sync)

| Tier             | Original Count | Revised Count | Change | New Items                                                                                                                                                       |
| ---------------- | -------------- | ------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1: VERIFIED     | 58             | 58            | 0      | None removed or added                                                                                                                                           |
| T2: PARTIAL      | 16             | 18            | +2     | Price engine accuracy (62K samples, no chef validation); QoL auto-save (5/184 forms)                                                                            |
| T3: ASSUMPTION   | 14             | 16            | +2     | Feature flag activation plan; 43-archetype rankings                                                                                                             |
| T4: BLIND SPOT   | 13             | 17            | +4     | Security posture for launch; AI module regression root cause; OpenClaw coverage sufficiency; uptime trend analysis                                              |
| T5: CONTRADICTED | 9              | 13            | +4     | SSE zero auth vs. privacy-first claim; Remy 100% vs. 0% parsing regression; privacy promise vs. cloud runtime; 11 specced features blocked by anti-clutter rule |

**Updated totals:** 58 verified, 18 partial, 16 assumptions, 17 blind spots, 13 contradictions. **122 total knowledge claims assessed.**

---

## Revised Top 10 Gaps (Post-Deep Sync)

| Rank | Gap                                      | Score | Change                                             |
| ---- | ---------------------------------------- | ----- | -------------------------------------------------- |
| 1    | **User acquisition channels unknown**    | 100   | Unchanged                                          |
| 2    | **SSE/Realtime zero authentication**     | 100   | **NEW** (Impact 5 x Urgency 5 x Researchability 4) |
| 3    | **Monetization model unvalidated**       | 80    | Unchanged                                          |
| 4    | **Tax export paths disagree on truth**   | 80    | Unchanged                                          |
| 5    | **Remy parsing modules regressed to 0%** | 75    | **NEW** (Impact 5 x Urgency 5 x Researchability 3) |
| 6    | **SEO and organic discovery unknown**    | 64    | Unchanged                                          |
| 7    | **Privacy promise vs. cloud runtime**    | 60    | **NEW** (Impact 4 x Urgency 3 x Researchability 5) |
| 8    | **Retention/churn drivers unknown**      | 60    | Unchanged                                          |
| 9    | **Cancellation workflow missing**        | 60    | Unchanged                                          |
| 10   | **179 forms without auto-save**          | 50    | **NEW** (Impact 5 x Urgency 2 x Researchability 5) |

**What moved off:** Two-way calendar sync (45), auto-triggered midpoint email (45), self-hosted barrier (36), social proof (32) all dropped below the new entries.

---

## Revised Meta-Analysis

### Most Dangerous Assumption (Updated)

Still: **"Private chefs will voluntarily pay $12/month for a free tool."**

But now with a second-order danger: **"The product is secure enough to launch."** The SSE zero-auth finding means a cross-tenant data leak is possible on day 1. This would not just lose users; it would generate negative press in a niche market where word travels fast.

### What Breaks First (Updated)

If ChefFlow launched to 100 private chefs tomorrow:

**Before Day 1:** Security researcher finds SSE endpoint, demonstrates cross-tenant data access, posts to Twitter. Product reputation damaged before first real user onboards.

**Day 1:** Setup friction (self-hosted). 70%+ of chefs can't install Docker.

**Week 1:** Chef tries Remy, asks it to parse an inquiry. Parsing module returns garbage (0% pass rate regression). Chef concludes AI is broken.

**Week 2:** Chef enters a 15-minute menu on a form. Browser crashes. Work is lost (179 unprotected forms). Chef doesn't come back.

### Single Highest-ROI Action (Updated)

**Still the Wave-1 survey** for demand-side questions. But the security fixes (SSE auth, Ollama binding, credential rotation) are now **pre-launch blockers**, not research questions. They don't need research; they need a builder.

**Parallel tracks:**

1. **Builder:** Fix SSE auth + Ollama binding + Remy parsing regression (3-5 days)
2. **Research:** Execute Wave-1 survey (8-12 hours distribution + analysis)
3. **Research:** Synthesize 18 reports into unified market thesis + go-to-market (4-6 hours)
