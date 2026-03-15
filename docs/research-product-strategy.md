# ChefFlow Product Strategy Research

> Date: 2026-03-15
> Status: Complete
> Inputs: 47 market research items, 6 product research workstreams, 510+ verbatim quotes, 52 competitor tools scanned

This document synthesizes six research workstreams into actionable product decisions. It answers: what to build, for whom, at what price, and how to reach them.

---

## 1. THE WEDGE: What Makes ChefFlow Win

### Competitive Landscape Summary

| Category           | Key Players                          | Price Range       | ChefFlow Advantage                                                        |
| ------------------ | ------------------------------------ | ----------------- | ------------------------------------------------------------------------- |
| Creative CRM       | HoneyBook, Dubsado                   | $16-79/mo         | Not food-specific. No recipe costing, no dietary tracking, no kitchen ops |
| Catering Software  | Caterease, CaterZen, Better Cater    | $57-229/mo        | Expensive, no free tier, no private chef support                          |
| Recipe Tools       | meez, CookKeepBook                   | Free-$150/mo      | No client management, no proposals, no invoicing                          |
| Private Chef Tools | Traqly, Private Chef Manager, Clarro | Free-2.9% per txn | Shallow features, marketplace models, early stage                         |
| POS                | Toast, Square                        | $0-149/mo         | Wrong category. Brick-and-mortar focused                                  |

**Only direct competitor: Traqly** ("OS for independent chefs"). Early-stage, limited feature depth, no AI, no recipe engine, no financial intelligence.

### ChefFlow's Wedge (Pick ONE to Lead With)

Three candidates emerged from the research. Ranked by strength:

**1. Per-event financial intelligence (RECOMMENDED WEDGE)**

"You made $340 profit on Saturday's dinner party" is something no competitor delivers. Every chef forum complaint about profitability blindness points here. ChefFlow already has the ledger system. The gap is surfacing it simply.

Why this wins:

- Solves the #1 business problem (chronic undercharging, profitability blindness)
- Already built (ledger + recipe costing + event system)
- Measurable: chefs can calculate exact ROI from ChefFlow in dollars saved/earned
- Not replicable by generic tools (HoneyBook can't do food costing)

**2. Proposal-to-payment flow (chef-specific HoneyBook)**

The daily workflow: lead comes in, proposal goes out, contract signed, payment collected, menu planned, event executed. ChefFlow handles this end-to-end. HoneyBook handles it generically.

Why this is strong but secondary:

- HoneyBook already owns "proposals for creatives" positioning
- ChefFlow's version is better (food-specific) but harder to communicate in one sentence

**3. Remy as AI business partner for solo operators**

Nobody else has a private AI assistant that knows your clients, your margins, and your calendar. The isolation problem is real ("It's just you 90% of the time"). Remy addresses it.

Why this is tertiary:

- Requires Ollama (friction)
- Hard to demo before signup
- "AI" is noisy; chefs are skeptical

### Recommended Positioning

> "Know exactly what you make on every event. ChefFlow tracks your real profit from inquiry to plate, so you stop guessing and start earning what you're worth. Free to start. Built by a chef."

---

## 2. WHO TO BUILD FOR: Feature-to-Archetype Mapping

### The 6 GO Archetypes

| Rank | Archetype              | Score | ChefFlow Fit Today | Primary Gap                                      |
| ---- | ---------------------- | ----- | ------------------ | ------------------------------------------------ |
| 1    | Catering Chef          | 44/50 | 80%                | Staff scheduling, BEO generation                 |
| 2    | Personal Chef          | 43/50 | 90%                | Grocery list automation, recurring scheduling    |
| 3    | Wedding Specialist     | 42/50 | 80%                | Guest-level dietary tracking, tasting management |
| 4    | Traveling Private Chef | 42/50 | 90%                | Offline mode, mobile optimization                |
| 5    | Freelance/Gig Chef     | 40/50 | 85%                | Tax tools, portfolio/website                     |
| 6    | Private Dining Chef    | 37/50 | 85%                | Multi-course menu presentation                   |

### Feature Priority Matrix

**Tier 1: Universal (serves 6/6 archetypes, already built)**

These are ChefFlow's core. Every improvement here serves the entire market:

- Client CRM with dietary profiles
- Invoicing + Stripe payments
- Proposal/quote generation
- Recipe management + costing
- Menu creation + sharing
- Event calendar/scheduling
- Mobile-first design

**Tier 2: High-leverage additions (serves 4-5/6 archetypes)**

Build these next, in this order:

| Priority | Feature                                        | Archetypes Served | Status                                                  |
| -------- | ---------------------------------------------- | ----------------- | ------------------------------------------------------- |
| 1        | Contract templates library                     | 5/6               | Partially built (generator exists, no template library) |
| 2        | Pricing benchmarks expansion (GOLDMINE)        | 5/6               | Partially built                                         |
| 3        | Google Calendar sync                           | 5/6               | Built                                                   |
| 4        | Grocery list generation from menus             | 5/6               | Not built                                               |
| 5        | Allergen cross-referencing (recipe vs. client) | 5/6               | Not built                                               |
| 6        | Offline functionality                          | 4/6               | Not built                                               |

**Tier 3: Archetype-specific (build for market expansion)**

| Feature                                    | Primary Archetype       | When to Build                          |
| ------------------------------------------ | ----------------------- | -------------------------------------- |
| Staff scheduling per event                 | Catering, Wedding       | When catering segment grows            |
| Guest-level dietary tracking (200+ guests) | Catering, Wedding       | When wedding segment grows             |
| Tasting session management                 | Wedding, Private Dining | Differentiator, no competitor has this |
| Tax estimation (1099/quarterly)            | Freelance               | Nice-to-have, many alternatives exist  |
| Interactive pricing calculator             | All new chefs           | High-value onboarding tool             |

### Two Archetypes Need NOTHING New

**Traveling Private Chef** and **Personal Chef** are 90% fit TODAY. Marketing, not engineering, is the bottleneck. These are the lowest-cost-to-acquire segments.

---

## 3. JOBS TO BE DONE: What Chefs Hire Software For

### Critical Jobs (build/improve first)

| ID  | Job                                               | Quote                                                               | ChefFlow Status         |
| --- | ------------------------------------------------- | ------------------------------------------------------------------- | ----------------------- |
| F1  | "Consolidate my 6 scattered tools into one"       | "Most chefs juggle Google Docs, Excel, WhatsApp, Venmo, QuickBooks" | Partially solved        |
| F2  | "Spend more time cooking, less on admin"          | "I spend more time on invoices than I do cooking"                   | Partially solved        |
| F3  | "Know if I'm actually making money on each event" | "You can't charge enough to cover your costs"                       | Solved (surface better) |
| F4  | "Get paid reliably and on time"                   | "50% of freelancers have experienced not being paid"                | Solved                  |
| F5  | "Track allergies without risking someone's life"  | "Even the smallest food particle could be fatal"                    | Partially solved        |
| F6  | "Send professional proposals that win bookings"   | "Proposals used to add up to 8-10 hours per event"                  | Solved                  |

### Important Jobs (improve next)

| ID  | Job                                         | Quote                                                       | ChefFlow Status  |
| --- | ------------------------------------------- | ----------------------------------------------------------- | ---------------- |
| F7  | "Price my services correctly"               | "So worried about pricing too high that they price too low" | Partially solved |
| F8  | "Handle last-minute changes without chaos"  | "Last minute parties, last minute schedule changes"         | Partially solved |
| F9  | "Protect myself with clear contracts"       | "I did not set and reinforce boundaries enough"             | Solved           |
| F10 | "Find clients without platform commissions" | "You do all the work, the company does very little"         | Partially solved |
| F11 | "Generate grocery lists from my menus"      | "3/4 of what I delivered was advanced meal prep"            | Not solved       |

### Emotional Jobs (how chefs want to feel)

| ID  | Job                                      | ChefFlow Status                                                |
| --- | ---------------------------------------- | -------------------------------------------------------------- |
| E1  | Feel like a professional, not a hobbyist | Solved (proposals, invoicing, client portal)                   |
| E2  | Feel in control, not drowning            | Solved (dashboard, calendar, CRM)                              |
| E3  | Feel creatively valued, not commoditized | Partially (need better menu presentation)                      |
| E4  | Feel financially safe                    | Partially (need automated reminders, cancellation enforcement) |

### Consumption Chain (the adoption journey)

| Stage         | What Happens                                              | ChefFlow Action Needed                              |
| ------------- | --------------------------------------------------------- | --------------------------------------------------- |
| First thought | Chef finishes 14-hour day with 2 hours of invoicing ahead | Be the answer when they search                      |
| Search        | Ask other chefs, Facebook groups, USPCA                   | USPCA partnership, community presence               |
| Evaluate      | Price first, screenshots second, "is it for chefs?" third | Free tier, food-specific positioning                |
| Onboard       | Must produce one tangible output in 10 minutes            | First action = "Create an event" or "Cost a recipe" |
| Regular use   | Proposals in 20 min instead of 8 hours                    | Speed and reliability beat feature count            |
| Upgrade       | Bigger event, got burned by non-payment, tax season       | Natural growth triggers, not artificial limits      |
| Advocate      | "This saved me from serving an allergen"                  | Dramatic, specific saves drive word-of-mouth        |

---

## 4. PRICING: What to Charge

### Market Reality

- **Magic price point: $20/mo** for solo operators
- **Subscription fatigue: chefs already spend $70-120/mo** on generic software
- **Cost is #1 adoption barrier:** 40% of operators cite it
- **Free tiers drive adoption:** Dubsado (3 clients free), Square ($0), CookKeepBook (unlimited free)
- **Setup fees are resented:** Never charge them
- **Catering software has no free tiers:** ChefFlow's free tier would be disruptive

### Recommended Tiers

| Tier     | Price                  | Gate              | What's Included                                                                                                                                          |
| -------- | ---------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free** | $0                     | 3-5 active events | All core features: CRM, invoicing, proposals, recipes, menus, calendar, basic Remy                                                                       |
| **Pro**  | $25/mo ($19/mo annual) | Unlimited         | Everything free + unlimited events, automations, advanced analytics, integrations, financial exports, contract templates, advanced Remy, custom branding |
| **Team** | $59/mo ($49/mo annual) | Staff features    | Everything Pro + staff scheduling, multi-user, team permissions, staff cost tracking                                                                     |

### Why This Works

- **Free tier is the Dubsado model** (limited volume, all features). Chefs experience the full product before paying.
- **$25/mo undercuts HoneyBook ($39 Essentials)** while being dramatically cheaper than catering software ($65-229/mo).
- **Upgrade trigger is natural growth** (more clients/events), not artificial crippling.
- **Team tier captures catering/wedding expansion** without complicating the solo chef experience.
- **Never charge setup fees.** The data is clear.
- **20% annual discount** is table stakes.

### Positioning Statement

> "Everything HoneyBook does, but built for chefs. Free to start, $25/mo when you're ready. Your data stays on your machine."

---

## 5. ACQUISITION: How to Reach Chefs

### Tier 1 Channels (Start Here)

**1. USPCA Partnership**

- 70%+ of full-time personal chefs are members
- They have a formal partnership opportunities page
- One partnership = distribution to the entire personal chef market
- Action: Apply via uspca.com/partnership-opportunities

**2. Free Tool as Lead Magnet**

- meez started with free recipe storage, grew to 750+ customers in year one
- Gap in market: no free tools specifically for private chefs (all target restaurants)
- Build: Private chef pricing calculator or contract template generator
- Captures emails from the exact right audience

**3. Word-of-Mouth / Referral Program**

- Research is unambiguous: chefs ask other chefs, they don't click ads
- Incentive: Free months of Pro for referrals (chefs are cost-conscious)
- Strategy: City-by-city growth (own one metro, then expand)
- Every proposal sent through ChefFlow is marketing (client sees branded doc)

### Tier 2 Channels (Build Over 3-6 Months)

**4. Content Marketing (SEO)**

- High-intent, underserved searches: "how to price private chef services," "private chef contract template," "meal prep business pricing"
- Don't compete on "recipe costing calculator" (crowded)
- Free downloadable templates = email capture

**5. Community Participation**

- Facebook: Private Chef For Hire, Freelance Chefs groups
- Reddit: r/chefit, r/KitchenConfidential (be helpful, not promotional)
- Chefs Roll: 2M+ chef followers, potential co-marketing

**6. Culinary School Partnerships**

- ChefTec is in 200+ schools. meez got ICE early.
- Students form lifetime tool habits
- ICE has formal partner page (ice.edu/career-services-resources/partner-with-ice)
- Offer free educational tier (LTV of student-to-chef is enormous)

### What Doesn't Work

- **Paid social ads:** Poor ROI for niche B2B. Chefs don't click software ads.
- **Cold email:** Chefs are in kitchens, not inboxes.
- **NRA Show booth:** Too broad, too expensive ($10K+ for visibility among 2,000 exhibitors).
- **Feature-first marketing:** "Track 500 recipes" means nothing. "Know your exact profit" means everything.

### Founder Credibility

meez's Josh Sharkey succeeded because he was a real chef (20+ years, Michelin kitchens). Chefs trust chefs, not software people. **Every piece of ChefFlow marketing should lead with the developer's real chef background.**

---

## 6. BETA TESTER GAP (Critical Finding)

### Current State

ChefFlow has comprehensive feedback infrastructure, all built and production-ready:

- User feedback form (Settings page, 5-sentiment picker, admin dashboard)
- Feedback nudge modal (auto-triggers 7 days after signup)
- Post-event survey system (auto-creates on event completion)
- Beta survey system (JSONB-based, pre/post templates, token-based access)
- Beta onboarding system (30% discount, 5-step checklist, referral tracking)
- PostHog analytics integration (configured but no active API key)

### The Problem

**All of it is empty.** No beta testers enrolled. No feedback collected. No surveys sent. No analytics active. The 4 beta testers referenced in memory have not been formally onboarded.

### Recommended Action

This is the highest-leverage action available right now. Real user feedback from 4 people using the real app is worth more than all the market research combined.

1. Enroll the 4 beta testers using the existing onboarding system
2. Deploy the beta survey migrations (20260330000021, currently deferred)
3. Send the pre-beta survey
4. Activate PostHog for basic usage analytics
5. Schedule bi-weekly check-ins with testers

---

## 7. KEY GAPS: What to Build Next (Prioritized)

Based on all six research workstreams, these are the highest-impact additions:

### Must Build (before scaling acquisition)

| Priority | Feature                            | Why                                                        | Effort                      |
| -------- | ---------------------------------- | ---------------------------------------------------------- | --------------------------- |
| 1        | **Per-event profit dashboard**     | The wedge. "You made $340 on Saturday"                     | Low (data exists, needs UI) |
| 2        | **Allergen cross-referencing**     | Life-safety, no competitor does it, massive differentiator | Medium                      |
| 3        | **Grocery list generation**        | Top-requested, saves hours/week, creates switching cost    | Medium                      |
| 4        | **Interactive pricing calculator** | Onboarding tool, solves chronic undercharging              | Low-Medium                  |
| 5        | **Contract template library**      | 5/6 archetypes need it, currently just a generator         | Low                         |

### Should Build (to improve retention and conversion)

| Priority | Feature                                    | Why                                                                            | Effort |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------ | ------ |
| 6        | **Automated payment reminders**            | Reduces non-payment by up to 70%                                               | Low    |
| 7        | **Onboarding wizard**                      | First 10 minutes determine adoption. No config, just "create your first event" | Medium |
| 8        | **Beautiful client-facing menu templates** | Emotional job E3 (feel creatively valued)                                      | Medium |
| 9        | **Offline mode (PWA)**                     | 4/6 archetypes work in kitchens with no wifi                                   | High   |
| 10       | **Referral program**                       | Viral loop for word-of-mouth acquisition                                       | Medium |

---

## 8. STRATEGIC SUMMARY

### What we know

1. **ChefFlow's core product already fits all 6 GO archetypes.** The gaps are additive features, not architectural changes.
2. **Two archetypes (Personal Chef, Traveling Private Chef) are 90% fit today.** Marketing, not engineering, is the bottleneck.
3. **The competitive landscape is fragmented.** No dominant player for independent chefs. Traqly is the only direct competitor and they're early.
4. **$25/mo with a generous free tier** is the right price point. Undercuts HoneyBook, disrupts catering software's $65-229/mo range.
5. **Word of mouth is the only channel that matters.** USPCA partnership and referral programs beat paid ads.
6. **Zero real user feedback exists.** This is the single biggest gap, bigger than any feature.

### What to do next (in order)

1. **Activate beta testers.** Enroll the 4 testers, deploy surveys, start collecting feedback. This week.
2. **Surface per-event profitability.** Make the wedge visible. Dashboard showing "you made $X on this event" front and center.
3. **Build the pricing calculator.** Free tool, captures emails, solves undercharging. Lead magnet for acquisition.
4. **Apply to USPCA partnership.** One deal = distribution to 70%+ of personal chefs.
5. **Ship allergen cross-referencing.** Life-safety feature, no competitor has it, massive differentiator.
6. **Build grocery list generation.** The feature that makes chefs say "I can't go back."

### The one-sentence strategy

**Own "know your numbers" for independent chefs, then expand from financial intelligence into full business operations.**
