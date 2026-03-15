# Research Roadmap: The Demand Side - Who Needs Food and Why Can't They Find It?

Research-only document. No code changes.

Created: 2026-03-14

---

## MASTER RESEARCH TRACKER

| #   | Cluster                     | Focus                                                                                                   | Date       | Status               | File                                           |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- | -------------------- | ---------------------------------------------- |
| D0  | The Broken Search           | How food discovery is broken across every platform today                                                | 2026-03-14 | DONE                 | `docs/research-d0-the-broken-search.md`        |
| D1  | Feed My Household           | Recurring meal needs: families, professionals, elderly, new parents                                     | 2026-03-14 | DONE                 | `docs/research-d1-feed-my-household.md`        |
| D2  | Handle My Event             | One-time high-stakes: weddings, parties, holidays, milestones, funerals                                 | 2026-03-14 | DONE                 | `docs/research-d2-handle-my-event.md`          |
| D3  | Find Me Something to Eat    | Immediate discovery: hungry now, tourists, cuisine-specific, late-night, groups                         | 2026-03-14 | DONE                 | `docs/research-d3-find-me-something-to-eat.md` |
| D4  | Meet My Dietary Needs       | Constraint-driven trust: allergies, medical diets, religious, performance nutrition                     | -          | ASSIGNED TO OPENCLAW | TBD                                            |
| D5  | Feed My Organization        | Business buyers: offices, productions, retreats, conferences, schools                                   | -          | ASSIGNED TO OPENCLAW | TBD                                            |
| D6  | Elevate a Travel Experience | Location-specific premium: villas, yachts, vacation rentals, destination events                         | -          | ASSIGNED TO OPENCLAW | TBD                                            |
| D7  | Give Me a Food Experience   | Experiential: supper clubs, chef's tables, cooking classes, food tours, pop-ups                         | -          | ASSIGNED TO OPENCLAW | TBD                                            |
| D8  | Constraint Profiles         | How budget, dietary, group size, timing, frequency, and location change behavior across all need-states | -          | NOT STARTED          | TBD                                            |
| D9  | Synthesis                   | Reads all cluster reports, produces unified demand-side intelligence                                    | -          | NOT STARTED          | `docs/research-synthesis-demand-side.md`       |

### Research Execution Order

1. **D0 - The Broken Search** - Start here. This is the thesis. Understand how food discovery is broken before studying individual need-states.
2. **D1 - Feed My Household** - Largest recurring market. Daily need, underserved, highest lifetime value.
3. **D3 - Find Me Something to Eat** - The universal question nobody answers well. Highest search volume.
4. **D2 - Handle My Event** - High-value, high-intent moments. People actively searching and willing to pay premium.
5. **D4 - Meet My Dietary Needs** - Underserved, high-loyalty, trust-critical. Willing to pay for safety.
6. **D7 - Give Me a Food Experience** - Growing market, experience economy, discovery-driven.
7. **D5 - Feed My Organization** - B2B, different motion, large contracts.
8. **D6 - Elevate a Travel Experience** - Premium, seasonal, referral-driven.
9. **D8 - Constraint Profiles** - Cross-cutting analysis after individual need-states are understood.
10. **D9 - Synthesis** - Unified intelligence from all clusters.

---

## Why This Exists

ChefFlow was built for chefs. That's the supply side, and we know it deeply (43 archetypes, 9 cluster research docs done, workflows mapped).

But a platform doesn't work with only supply. The other half, the demand side, is where the money comes from, where the growth comes from, and where the biggest unsolved problem lives.

**The unsolved problem: there is no universal way to find food.**

Think about what exists today:

| Platform               | What it does                 | What it misses                                                                                                                |
| ---------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Google                 | Lists businesses by SEO rank | No intent understanding, no dietary filtering, no availability, no booking, no trust signals beyond reviews                   |
| Yelp                   | Restaurant reviews           | Only restaurants. No chefs, no caterers, no meal prep, no food trucks. Reviews are gamed.                                     |
| DoorDash / UberEats    | Delivery from restaurants    | Only delivery. Only restaurants that pay commission. No chefs, no catering, no experiences. Price-driven, not quality-driven. |
| The Knot / WeddingWire | Wedding vendor search        | Only weddings. Only caterers who pay to list. No reviews you can trust.                                                       |
| Thumbtack / Bark       | Service provider matching    | Generic (plumbers, photographers, chefs all in one). No food-specific intelligence. Lead-gen model that annoys providers.     |
| Instagram              | Visual discovery             | No search, no filtering, no booking, no pricing, no availability. Pure serendipity.                                           |
| OpenTable / Resy       | Restaurant reservations      | Only dine-in restaurants. No other food service types.                                                                        |

**Every platform solves one slice. Nobody solves the whole thing.** A person who wants food has to know in advance which type of food service they need, then go to the right platform for that type. That's backwards. The platform should understand what you need and show you all your options.

---

## Why Need-States, Not Archetypes

The chef research used 43 archetypes because chefs are defined by what they do. A pastry chef and a catering chef have fundamentally different workflows, tools, pricing models, and daily operations. The archetype defines the business. Researching each one separately makes sense because the product features they need are different.

**Clients are different. Clients are defined by what they need right now, not who they are.**

The same person is multiple "types" depending on the day:

- Monday: "I need weekly meals handled" (Feed My Household)
- Saturday: "What's good for dinner tonight?" (Find Me Something to Eat)
- March: "I'm planning my kid's graduation party" (Handle My Event)
- Always: "My daughter has a nut allergy" (Meet My Dietary Needs)

Researching "dual-income families" and "single professionals" separately produces 80% identical findings because their search behavior is nearly identical when they're both just trying to solve dinner. The real variable isn't who they are. It's what they need in this moment.

**Need-states map directly to product features.** Each need-state has a distinct search journey, distinct decision factors, distinct UX requirements, and distinct failure modes. That's what we need to understand to build the platform.

---

## The 7 Need-States

### D1: Feed My Household

**The moment:** "I need meals handled. Not just tonight, but every week. I'm tired of figuring out dinner."

**Who enters this state:** Busy families, single professionals, elderly/homebound individuals, new parents, health-conscious people, anyone who's exhausted by the daily "what's for dinner" question.

**Example searches:**

- "personal chef near me"
- "weekly meal prep service [city]"
- "meal delivery that's actually good"
- "hire someone to cook for my family"
- "healthy meal service not HelloFresh"
- "meals for elderly parents"
- "postpartum meal delivery"

**Why it matters:** This is the recurring revenue engine. These people don't need food once. They need it solved permanently. Highest lifetime value per user, most predictable demand for providers.

**What probably breaks:** Discovery (how do you even find a personal chef?), pricing transparency (what does this actually cost?), trust (inviting someone into your kitchen every week), the "that's not for people like me" barrier.

---

### D2: Handle My Event

**The moment:** "I have an event coming up and the food needs to be handled. I can't mess this up."

**Who enters this state:** Wedding couples, party hosts, holiday hosts, corporate event planners, milestone celebration organizers, fundraiser committees, memorial/funeral families, block party organizers.

**Example searches:**

- "wedding caterer [city]"
- "private chef for dinner party"
- "catering for 50 people"
- "Thanksgiving dinner catering"
- "birthday party food ideas"
- "funeral reception catering"
- "BBQ catering for graduation party"

**Why it matters:** High-value transactions. A single event booking can be $2,000-$50,000+. These people are actively searching, ready to pay, and the stakes are high (you don't get a second chance at your wedding dinner). But the search experience is terrible: SEO-gamed results, pay-to-play vendor directories, no way to compare real options.

**What probably breaks:** The proposal/quote process (too slow, too opaque), comparing options (no standardized information), trust (reviews are gamed on wedding sites), dietary accommodation for large groups, the gap between "I found a caterer" and "I'm confident this will go well."

---

### D3: Find Me Something to Eat

**The moment:** "I'm hungry. What's good? What's open? What's near me?"

**Who enters this state:** Everyone. Tourists, locals bored of their usual spots, date-night planners, group dining organizers, late-night searchers, cuisine-specific seekers, people in a new neighborhood.

**Example searches:**

- "best Thai near me"
- "restaurants open now"
- "what to eat in Austin"
- "good sushi downtown"
- "restaurants for large groups"
- "romantic dinner [city]"
- "late night food [city]"
- "hidden gem restaurants [neighborhood]"

**Why it matters:** This is the highest-volume need-state. Billions of food discovery searches happen every year. Google dominates but satisfies poorly: results are SEO-ranked not quality-ranked, reviews are unreliable, and the results only show restaurants. No pop-ups, no food trucks, no chef experiences, no hidden gems. This is the "front door" that could drive massive platform adoption if solved well.

**What probably breaks:** Result quality (SEO gaming beats actual quality), limited to restaurants (misses food trucks, pop-ups, chefs, etc.), no real-time availability, dietary filtering is an afterthought, no distinction between "good for a date" and "good for a quick bite."

---

### D4: Meet My Dietary Needs

**The moment:** "I have specific requirements and I can't risk getting it wrong. This is about safety, not preference."

**Who enters this state:** Severe allergy families, medical diet patients (renal, cardiac, cancer recovery), athletes with macro targets, parents of children with food sensitivities, people with religious dietary requirements (kosher, halal, Jain), diabetics, vegans/vegetarians tired of token options.

**Example searches:**

- "nut-free catering [city]"
- "celiac safe restaurant near me"
- "renal diet meal delivery"
- "halal caterer for wedding"
- "meal prep for bodybuilding"
- "vegan private chef"
- "diabetic meal service"

**Why it matters:** These people have the hardest time finding food they can trust. Cross-contamination can be life-threatening. "We have a gluten-free option" is not the same as "our kitchen is certified celiac-safe." No platform today lets you filter by verified dietary compliance. These users are underserved, extremely loyal when they find a trustworthy provider, and willing to pay premium for safety.

**What probably breaks:** Verification (no platform verifies dietary claims), trust (one bad experience can be dangerous), the gap between "we accommodate allergies" and "we are truly safe," finding providers who specialize vs. providers who check a box.

---

### D5: Feed My Organization

**The moment:** "My company/team/production/school needs food for a group of people, regularly or for an event."

**Who enters this state:** Office meal planners, film/TV production coordinators, retreat/wellness program directors, conference organizers, school/camp food coordinators, hospital/care facility administrators.

**Example searches:**

- "office catering [city]"
- "craft services Los Angeles"
- "corporate lunch delivery"
- "retreat meal planning"
- "school lunch catering"
- "conference food service"

**Why it matters:** B2B food is a massive market. A single corporate account can mean daily orders for 50-200 people. But the buying process is different from consumer: procurement approval, dietary diversity requirements across a group (not just one person's needs), invoicing/billing complexity, and reliability at scale.

**What probably breaks:** Finding providers who handle group dietary diversity (20 people, 8 different dietary needs), the proposal/quoting process for recurring business, billing complexity, the gap between "we do catering" and "we can handle your 150-person office 3x/week with 12 dietary profiles."

---

### D6: Elevate a Travel Experience

**The moment:** "I'm somewhere special and I want the food to match. This isn't about convenience, it's about making the trip memorable."

**Who enters this state:** Vacation home renters, yacht owners/charterers, destination wedding couples, luxury Airbnb/villa hosts (offering chef as add-on), estate/family office managers hiring for properties.

**Example searches:**

- "private chef Cabo villa"
- "yacht chef hire Mediterranean"
- "chef for vacation rental Aspen"
- "destination wedding caterer Tuscany"
- "in-home chef experience [resort town]"

**Why it matters:** Premium pricing (clients in this state expect to pay well), seasonal demand spikes, and a referral-driven market. But discovery is nearly impossible. How do you find a private chef in a place you've never been? Google gives you restaurant results. Travel forums give you outdated recommendations. There's no platform purpose-built for "I need a chef where I'm going."

**What probably breaks:** Discovery in unfamiliar locations, vetting someone you'll never meet until they show up, logistics (provisioning, kitchen equipment in a rental, dietary needs communicated across time zones), the fact that this need is inherently location-specific and seasonal.

---

### D7: Give Me a Food Experience

**The moment:** "I don't just want to eat. I want something memorable. An experience, not just a meal."

**Who enters this state:** Foodies/culinary explorers, supper club attendees, cooking class seekers, food tour participants, "something different" seekers, people buying food experiences as gifts.

**Example searches:**

- "supper club near me"
- "private chef experience for two"
- "cooking class [city]"
- "chef's table experience"
- "unique dining experience [city]"
- "food tour [neighborhood]"
- "surprise dinner experience gift"

**Why it matters:** The experience economy is growing fast. People increasingly spend on experiences over things, and food experiences are a major category. But discovery is fragmented: some are on Airbnb Experiences, some on Instagram only, some on niche platforms, most invisible. There's no single place to find "food experiences near me" that spans supper clubs, pop-ups, cooking classes, chef's tables, tasting menus, food tours, and private dining.

**What probably breaks:** Discovery (most food experiences have no web presence beyond Instagram), booking (DMs and email, no real system), trust (is this legit or someone's kitchen with no food safety?), the gap between "I want something different" and being able to actually find it.

---

## D0: The Broken Search - The Thesis

This is researched first because it's the foundation. Before studying individual need-states, we need to understand how food discovery itself is broken.

### What D0 Must Answer

**How people search for food today:**

- What are the highest-volume food-related searches on Google? (volume, intent, satisfaction rate)
- When someone types "private chef near me," what do they actually get? Walk through the full experience.
- When someone types "catering for 50 people," what happens? How many clicks to get a real answer?
- When someone types "best Thai food [city]," how accurate and helpful are the results?
- How do people search differently on phone vs. desktop?
- What percentage of food searches end without a satisfactory result?
- What role does social media play (Instagram, TikTok) in food discovery vs. traditional search?

**Where every platform fails (deep dive):**

- Google: SEO gaming, paid ads, no dietary filtering, no availability, no real-time info, no booking, intent-blind
- Yelp: Review manipulation, restaurant-only, declining trust, no chefs/catering/meal prep/food trucks
- DoorDash/UberEats: Commission-inflated prices, limited to delivery restaurants, algorithm-driven not quality-driven, race to the bottom
- Instagram/TikTok: No structured search, no filtering, no booking, no pricing, no availability, pure serendipity, algorithm-controlled visibility
- The Knot/WeddingWire: Pay-to-play listings, wedding-only, vendor-biased reviews, no real comparison tools
- Thumbtack/Bark: Generic (plumbers and chefs in one), lead-gen spam, annoying for providers, no food expertise
- OpenTable/Resy: Reservation-only, dine-in restaurants only, no other food types
- Airbnb Experiences: Limited food experiences, no standalone platform, buried in travel context

**The gap nobody fills:**

- Universal food discovery across ALL food service types (restaurants, chefs, caterers, trucks, meal prep, bakers, pop-ups, experiences)
- Intent-aware search ("I need food for a party of 30" vs. "I want sushi tonight" vs. "I need a weekly chef")
- Dietary-first filtering (show me ONLY options that are truly celiac-safe, not "we have gluten-free pasta")
- Real-time availability (what's actually open/available right now, not a static listing page)
- Transparent pricing (what will this actually cost, not "request a quote" and wait 3 days)
- Trust signals that matter (verified dietary compliance, real client reviews, food safety records, not just star ratings)

---

## D8: Constraint Profiles

After the 7 need-state docs are complete, this doc maps how constraints change behavior across all of them. Instead of creating client archetypes, we profile the constraint dimensions that shape every food decision.

### The 6 Constraint Dimensions

**1. Budget**

| Level              | Range                      | Behavior                                                                    |
| ------------------ | -------------------------- | --------------------------------------------------------------------------- |
| Price-sensitive    | Minimizing cost is primary | Will sacrifice convenience, variety, and experience for savings             |
| Mid-range          | Willing to pay for quality | Compares options, looks for value, sensitive to surprise costs              |
| Premium            | Expects to pay well        | Prioritizes quality and experience, less price-shopping, more trust-seeking |
| Money-is-no-object | Cost is not a factor       | Wants the best, period. Referral-driven, not search-driven.                 |

Research question: At each budget level, how does search behavior change? What platforms do they use? What information do they need?

**2. Dietary**

| Level            | Examples                              | Behavior                                                                          |
| ---------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| None             | No restrictions                       | Standard search, widest options                                                   |
| Preference-based | Vegan, keto, paleo, organic           | Filters by preference but low-risk if imperfect                                   |
| Medical          | Celiac, nut allergy, renal, diabetic  | Safety-critical. Needs verified compliance, not just claims. Trust is everything. |
| Religious        | Kosher, halal, Jain, Hindu vegetarian | Needs certified compliance. Community-referred, not platform-discovered.          |

Research question: How does each dietary level change trust requirements, search behavior, and willingness to pay?

**3. Group Size**

| Level       | Range         | Behavior                                                                                   |
| ----------- | ------------- | ------------------------------------------------------------------------------------------ |
| Solo        | 1 person      | Convenience-driven. Delivery, meal prep, quick options.                                    |
| Couple      | 2 people      | Experience matters more. Date night, cooking together, private chef for two.               |
| Family      | 3-6 people    | Variety needed (kids vs. adults), dietary diversity within group, cost per person matters. |
| Small group | 7-20 people   | Logistics start mattering. Can a restaurant handle us? Do we need catering?                |
| Large event | 20-200 people | Catering territory. Proposals, tastings, staff, equipment, venues.                         |
| Mass        | 200+ people   | Enterprise catering. Procurement, compliance, logistics at scale.                          |

Research question: At what group size does search behavior shift from "find a restaurant" to "hire a service"?

**4. Timing**

| Level         | Window              | Behavior                                                                 |
| ------------- | ------------------- | ------------------------------------------------------------------------ |
| Right now     | Within the hour     | Delivery apps, "open now" searches, impulse-driven                       |
| This week     | 1-7 days            | More research, comparison shopping, booking                              |
| Next month    | 2-8 weeks           | Proposals, tastings, planning. Event territory.                          |
| 3+ months out | Long-range planning | Weddings, large events, seasonal (holidays). High research, high stakes. |

Research question: How does the time horizon change willingness to research, price sensitivity, and platform choice?

**5. Frequency**

| Level      | Pattern              | Behavior                                                                                      |
| ---------- | -------------------- | --------------------------------------------------------------------------------------------- |
| One-time   | Single occasion      | Discovery-focused. Willing to search. Less price-sensitive per transaction.                   |
| Occasional | Monthly / seasonal   | Developing preferences. May reuse providers. Semi-loyal.                                      |
| Weekly     | Ongoing relationship | Subscription-minded. Values consistency, convenience, relationship with provider.             |
| Daily      | Every day            | Institutional or heavy-use individual. Needs variety at scale. Most price-sensitive per unit. |

Research question: How does frequency change loyalty, price sensitivity, and the value of a platform relationship?

**6. Location**

| Level        | Context               | Behavior                                                                                          |
| ------------ | --------------------- | ------------------------------------------------------------------------------------------------- |
| Home base    | Local, familiar area  | Knows some options, searching to expand or fill a specific need                                   |
| New to area  | Recently relocated    | Needs full discovery. Doesn't know what's good. Relies entirely on platforms/reviews.             |
| Traveling    | Temporary, unfamiliar | Tourist behavior. Wants authentic/local, limited time to research, higher trust bar for unknowns. |
| Remote/rural | Limited options       | Fewer providers, may need wider search radius, delivery logistics matter more.                    |

Research question: How does location context change discovery behavior, trust requirements, and willingness to pay for convenience?

---

## Research Template (per need-state)

For each need-state (D1-D7), answer:

1. **The trigger** - What makes someone enter this need-state? What's the moment?
2. **The search journey** - Step by step, what do they do? What do they type, where, and what do they find?
3. **Where it breaks** - Platform by platform, what fails for this specific need?
4. **The decision factors** - What matters most? (Price, trust, dietary safety, availability, convenience, quality, reviews, speed)
5. **The constraints that matter most** - Which of the 6 constraint dimensions has the biggest impact on behavior in this need-state?
6. **The trust barrier** - What are they afraid of? What would make them trust a new platform for this need?
7. **The competitive landscape** - Who tries to serve this need today? How well? What's missing?
8. **The willingness to pay** - How do they think about money for this need? Perception vs. reality gap?
9. **The retention hook** - What turns a one-time search into a repeat user?
10. **The unmet need** - What would they use if it existed but doesn't? The "if only" signal.

### Research Sources

**All need-states:**

- Reddit (r/Cooking, r/EatCheapAndHealthy, r/MealPrepSunday, r/food, city-specific food subs)
- Google Trends (search volume, seasonal patterns, related queries)
- Yelp / Google Reviews / TripAdvisor (what people praise and complain about)
- Social media (Instagram food accounts, TikTok food content, Twitter/X food complaints)
- Platform reviews (App Store reviews of DoorDash, UberEats, Yelp, OpenTable - what users hate)

**Need-state specific:**

- D1 (Household): r/MealPrepSunday, r/EatCheapAndHealthy, mom groups, personal chef forums
- D2 (Events): The Knot, WeddingWire, r/weddingplanning, party planning Facebook groups, Nextdoor
- D3 (Discovery): TripAdvisor forums, Eater/Infatuation comments, city subreddits, food TikTok
- D4 (Dietary): r/Celiac, r/FoodAllergies, FARE community, kosher/halal forums, fitness subs
- D5 (Organization): Office manager forums, production coordinator groups, HR communities
- D6 (Travel): FlyerTalk, luxury travel forums, villa rental communities, yacht charter forums
- D7 (Experience): Airbnb Experiences reviews, supper club communities, cooking class platforms

---

## Cross-Cutting Questions (All Need-States)

These questions span every need-state and drive platform-level product decisions.

### The First-Time Barrier

- Why do most people never hire a chef? What's the psychological barrier?
- What percentage of people think "private chefs are for rich people"? Is that changing?
- What's the "gateway" experience that opens the door? (Dinner party chef? Meal prep trial? Gift certificate?)
- How do delivery apps (DoorDash, UberEats) create a ceiling that prevents people from discovering better options?

### The Discovery Gap

- What would the perfect "find food" experience look like?
- How would it handle the difference between "I'm hungry now" and "I need a caterer for June"?
- What role does AI play in food discovery? (Recommendation, intent parsing, dietary matching, natural language search)
- How do you solve the cold-start problem? (New platform, not enough listings yet)
- What makes someone switch from Google to a dedicated food platform?

### Trust & Safety

- What makes someone trust a food provider they've never used?
- How important are reviews vs. certifications vs. word of mouth vs. platform verification?
- For allergy/medical clients: what level of verification would make them trust a platform with their safety?
- For event clients: what makes them confident the food will be right on the day?
- How does trust differ across need-states? (Lower bar for "find me dinner" vs. very high bar for "feed my allergic child")

### Pricing Psychology

- What do people think food services cost vs. what they actually cost?
- Where is the biggest perception gap? (Private chefs? Catering? Meal prep? Experiences?)
- What pricing transparency would change behavior? (Upfront ranges, instant quotes, comparison tools)
- How do delivery app markups (30%+) affect willingness to pay for alternatives?
- At what price point does "hiring a chef" go from "luxury" to "honestly that's reasonable"?

### Marketplace Dynamics

- How do two-sided food marketplaces grow? Chicken-and-egg: need providers to attract users, need users to attract providers.
- What made DoorDash win delivery? What made OpenTable win reservations? What can we learn?
- Where is the trust bottleneck? (Provider quality? Platform reliability? Payment security?)
- What's the organic referral mechanic? How do food platforms grow without burning cash on ads?

---

## How This Connects to Everything Else

### Chef Verticals Roadmap (supply side)

The chef research answers: "Who makes food and what tools do they need?"
This research answers: "Who needs food, how do they search, and where does it break?"
Together: the complete picture of a food marketplace.

### Product Strategy

Understanding demand shapes:

- **Search and discovery UX** (intent-aware, dietary-first, real-time, universal)
- **Provider profiles** (what information clients need to see to make a decision)
- **Matching algorithms** (connecting the right need-state to the right provider type)
- **Booking flows** (different for "dinner tonight" vs. "wedding in 6 months" vs. "weekly meal prep")
- **Trust systems** (verified dietary compliance, real reviews, safety records)
- **Pricing transparency** (ranges, instant estimates, comparison tools)
- **How we position ChefFlow** (not "chef management software" but "the platform where you find food")
- **What Remy knows** (client intent patterns, dietary handling, booking expectations, pricing psychology)

### The Vision

ChefFlow starts as the best tool for chefs. It becomes the best tool for anyone who makes food professionally. Then it becomes the place where anyone who needs food finds what they're looking for. Not another DoorDash. Not another Yelp. The platform that understands food the way no one else does, and actually delivers answers instead of links.

---

## What We're NOT Researching Yet

- International markets (US-first; regulations, food culture, and search behavior vary too much)
- Grocery shopping behavior (buying ingredients is adjacent but different from buying food services)
- Food manufacturing / CPG (industrial scale, different market entirely)
- Agricultural / farm-to-table supply chain (upstream of our scope)
- Nutrition science / dietary research (we use dietary data, we don't produce it)

These inform later phases as the platform expands beyond food services into the broader food ecosystem.
