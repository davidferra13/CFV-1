# Research Roadmap: Chef Verticals & Beyond

Research-only document. No code changes.

Created: 2026-03-14

---

## MASTER RESEARCH TRACKER

Everything in one place. If it's research, it's on this list.

### Chef Vertical Cluster Research (the big initiative)

| #   | Cluster                             | Archetypes Covered                                                                                 | Date       | Status | File                                                     |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------- |
| A1  | Independent Chef Ops                | Personal chef, Meal prep chef, Home cook entrepreneur                                              | 2026-03-14 | DONE   | `docs/research-cluster-a1-personal-mealprep-homecook.md` |
| A2  | Event & Experiential                | Catering chef, Wedding specialist chef                                                             | 2026-03-14 | DONE   | `docs/research-cluster-a2-catering-wedding.md`           |
| A3  | Restaurant & Kitchen Ops            | Chef-owner, Ghost kitchen operator                                                                 | 2026-03-14 | DONE   | `docs/research-cluster-a3-chefowner-ghostkitchen.md`     |
| A4  | Freelance & Pop-up                  | Freelance/gig chef, Pop-up chef, Supper club host                                                  | 2026-03-14 | DONE   | `docs/research-cluster-a4-freelance-popup-supperclub.md` |
| A5  | Specialized Diet & Baking           | Pastry chef / baker                                                                                | 2026-03-14 | DONE   | `docs/research-cluster-a5-pastry-baker.md`               |
| C1  | Mobile & Outdoor Food               | Food truck operator, BBQ/pitmaster for hire, Festival/event circuit chef                           | 2026-03-14 | DONE   | `docs/research-cluster-c1-mobile-outdoor-food.md`        |
| C2  | Institutional Chefs                 | Corporate dining chef, Film/production set chef, Camp chef, Embassy/diplomatic chef                | 2026-03-14 | DONE   | `docs/research-cluster-c2-institutional-chefs.md`        |
| C3  | Production & Scale                  | Commissary kitchen operator, Meal kit company chef, Wholesale prepared foods chef, Food co-op chef | 2026-03-14 | DONE   | `docs/research-cluster-c3-production-scale.md`           |
| C4  | Niche & Seasonal                    | Seasonal resort chef, Hunting/fishing lodge chef, Pet food chef                                    | 2026-03-14 | DONE   | `docs/research-cluster-c4-niche-seasonal.md`             |
| B1  | Institutional & Traveling (B-tier)  | Yacht chef, Estate chef, Retreat chef, Traveling private chef                                      | 2026-03-14 | DONE   | `docs/research-cluster-b1-institutional-traveling.md`    |
| B2  | Education, Media & Content (B-tier) | Cooking class instructor, Recipe developer, Culinary consultant, Farmers market vendor             | 2026-03-14 | DONE   | `docs/research-cluster-b2-education-media-content.md`    |
| 7   | Competitor Tool Deep Scan           | All 43 archetypes (cross-cutting, 52 tools analyzed)                                               | 2026-03-14 | DONE   | `docs/research-cluster-7-competitor-tool-scan.md`        |
| S   | Synthesis Agent                     | Reads all cluster reports, produces unified intelligence doc                                       | 2026-03-14 | DONE   | `docs/research-synthesis-all-archetypes.md`              |

### Standalone Research (completed, not part of cluster system)

| Topic                                     | Date       | Status | File                                              |
| ----------------------------------------- | ---------- | ------ | ------------------------------------------------- |
| API market                                | 2026-02-26 | DONE   | `docs/api-market-research.md`                     |
| Loyalty program                           | 2026-02-27 | DONE   | `docs/loyalty-program-research.md`                |
| Printer market                            | 2026-02-28 | DONE   | `docs/printer-market-research.md`                 |
| Onboarding research                       | 2026-03-06 | DONE   | `docs/onboarding-research.md`                     |
| Private chef market (original)            | 2026-03-09 | DONE   | `docs/private-chef-platform-market-research.md`   |
| Competitor client experience              | 2026-03-09 | DONE   | `docs/competitor-client-experience-research.md`   |
| Platform branding                         | 2026-03-09 | DONE   | `docs/platform-branding-research.md`              |
| Dashboard customization                   | 2026-03-09 | DONE   | `docs/dashboard-customization-research.md`        |
| Local LLM optimization                    | 2026-03-09 | DONE   | `docs/local-llm-optimization-research.md`         |
| The ChefFlow Thesis                       | 2026-03-14 | DONE   | `docs/the-chefflow-thesis.md`                     |
| Growth Radar (prospecting productization) | 2026-03-14 | DONE   | `docs/growth-radar-research.md`                   |
| Pricing, Distribution & Switching         | 2026-03-14 | DONE   | `docs/research-pricing-distribution-switching.md` |
| Chef Tech Adoption & Behavior             | 2026-03-14 | DONE   | `docs/research-chef-tech-adoption.md`             |

### What's Left (in order)

All research complete. Nothing remaining.

---

## Why This Exists

ChefFlow was built for two years based on one chef's needs (private chef). That's a strong foundation, but it's also a blind spot. We never asked:

- What do personal chefs need that's different from private chefs?
- What are meal prep chefs drowning in?
- What makes catering chefs tear their hair out?
- What do restaurant owners wish existed?
- What are restaurants (as businesses) complaining about?

This roadmap structures the research so we can answer those questions systematically, then decide what to build.

---

## Complete Chef Archetype Registry (43 archetypes)

Every type of chef who could use ChefFlow, grouped by category.

### Tier 1 - Solo Operators (8)

| #   | Archetype              | Description                                              | Research Priority |
| --- | ---------------------- | -------------------------------------------------------- | ----------------- |
| 1   | Private chef           | Full-time, one household, lives nearby or on-site        | Done              |
| 2   | Personal chef          | Multiple households, weekly rotations, meal drops        | P1                |
| 3   | Meal prep chef         | Batch cook, package, label, deliver (often D2C)          | P1                |
| 4   | Freelance/gig chef     | One-off bookings through platforms, no recurring clients | P2                |
| 5   | Pop-up chef            | Temporary dining experiences, rotating venues            | P2                |
| 6   | Supper club host       | Private dining events in their own space                 | P2                |
| 7   | Home cook entrepreneur | Cottage food, selling from home kitchen                  | P2                |
| 8   | Food truck operator    | Solo, mobile, street food / market circuit               | P3                |

### Tier 2 - Event-Based (4)

| #   | Archetype                      | Description                                    | Research Priority |
| --- | ------------------------------ | ---------------------------------------------- | ----------------- |
| 9   | Catering chef                  | Events, weddings, corporate, large volume      | P1                |
| 10  | Wedding specialist chef        | Weddings only, tastings, high-touch proposals  | P2                |
| 11  | BBQ/pitmaster for hire         | Outdoor events, competitions, smoking/grilling | P3                |
| 12  | Private dining experience chef | Multi-course tasting menus in client homes     | P2                |

### Tier 3 - Restaurant World (5)

| #   | Archetype                          | Description                                | Research Priority |
| --- | ---------------------------------- | ------------------------------------------ | ----------------- |
| 13  | Chef-owner                         | Owns and runs the kitchen                  | P1                |
| 14  | Executive chef                     | Runs kitchen, doesn't own the business     | P2                |
| 15  | Sous chef stepping out             | Transitioning from employee to independent | P2                |
| 16  | Ghost kitchen operator             | Delivery-only, no storefront               | P2                |
| 17  | Cloud kitchen multi-brand operator | Multiple virtual brands, one kitchen       | P3                |

### Tier 4 - Specialized/Niche (7)

| #   | Archetype                     | Description                                   | Research Priority |
| --- | ----------------------------- | --------------------------------------------- | ----------------- |
| 18  | Pastry chef / baker           | Cakes, desserts, custom orders                | P2                |
| 19  | Raw/vegan chef                | Plant-based specialist                        | P3                |
| 20  | Allergen-free chef            | Celiac, nut-free, specialized dietary         | P3                |
| 21  | Medical/therapeutic diet chef | Renal diets, cancer recovery, elder nutrition | P3                |
| 22  | Sports/performance chef       | Athletes, teams, macro-focused                | P3                |
| 23  | Baby/toddler food chef        | Pediatric nutrition, purees, family meals     | P3                |
| 24  | Pet food chef                 | Fresh pet meals (yes, this market exists)     | P4                |

### Tier 5 - Institutional/Corporate (7)

| #   | Archetype                | Description                              | Research Priority |
| --- | ------------------------ | ---------------------------------------- | ----------------- |
| 25  | Corporate dining chef    | Office cafeterias, tech company kitchens | P3                |
| 26  | Retreat/wellness chef    | Yoga retreats, wellness centers, spas    | P2                |
| 27  | Yacht/marine chef        | Private boats, charter vessels           | P2                |
| 28  | Estate chef              | Large estates, multiple properties       | P2                |
| 29  | Film/production set chef | Craft services, on-location              | P3                |
| 30  | Camp chef                | Outdoor camps, expeditions, glamping     | P3                |
| 31  | Embassy/diplomatic chef  | Official residence kitchens              | P4                |

### Tier 6 - Education & Media (3)

| #   | Archetype                               | Description                                   | Research Priority |
| --- | --------------------------------------- | --------------------------------------------- | ----------------- |
| 32  | Cooking class instructor                | In-home, studio, or virtual classes           | P2                |
| 33  | Recipe developer / food content creator | Monetized content, brand deals                | P3                |
| 34  | Culinary consultant                     | Menu development, kitchen design, turnarounds | P3                |

### Tier 7 - Production/Scale (5)

| #   | Archetype                     | Description                             | Research Priority |
| --- | ----------------------------- | --------------------------------------- | ----------------- |
| 35  | Commissary kitchen operator   | Produces for multiple outlets/brands    | P3                |
| 36  | Meal kit company chef         | Designs and portions meal kits          | P3                |
| 37  | Wholesale prepared foods chef | Sells to cafes, grocery stores, markets | P3                |
| 38  | Farmers market vendor chef    | Prepared foods at markets               | P2                |
| 39  | Food co-op chef               | Community-supported kitchen             | P4                |

### Tier 8 - Seasonal/Traveling (4)

| #   | Archetype                   | Description                               | Research Priority |
| --- | --------------------------- | ----------------------------------------- | ----------------- |
| 40  | Seasonal resort chef        | Ski lodges, beach resorts, hunting lodges | P3                |
| 41  | Traveling private chef      | Follows clients to vacation homes         | P2                |
| 42  | Festival/event circuit chef | Food festivals, music festivals           | P3                |
| 43  | Hunting/fishing lodge chef  | Remote, seasonal                          | P4                |

### ABC Classification

**A - Most Important (13 archetypes)**
These are the core market. Independent operators who run their own business, handle their own clients, and need tools for the full cycle (booking, pricing, communication, delivery, payments). ChefFlow already solves many of their problems or is one feature away.

1. Private chef (Done)
2. Personal chef
3. Meal prep chef
4. Catering chef
5. Chef-owner
6. Freelance/gig chef
7. Pop-up chef
8. Pastry chef / baker
9. Supper club host
10. Wedding specialist chef
11. Private dining experience chef
12. Ghost kitchen operator
13. Home cook entrepreneur

**B - Second Most Important (16 archetypes)**
Adjacent markets. They share workflows with A-tier (clients, scheduling, recipes, finances) but have a specialized context that may need vertical-specific features. Worth building for once A-tier is solid.

14. Executive chef
15. Sous chef stepping out
16. Retreat/wellness chef
17. Yacht/marine chef
18. Estate chef
19. Traveling private chef
20. Cooking class instructor
21. Farmers market vendor chef
22. Cloud kitchen multi-brand operator
23. Sports/performance chef
24. Allergen-free chef
25. Medical/therapeutic diet chef
26. Baby/toddler food chef
27. Raw/vegan chef
28. Recipe developer / food content creator
29. Culinary consultant

**C - Least Important (14 archetypes)**
Niche, institutional, or far from our core product. These users either have enterprise-grade tools already, operate at a scale that doesn't fit our model, or represent tiny markets. Research last, build only if there's clear demand.

30. Food truck operator
31. BBQ/pitmaster for hire
32. Corporate dining chef
33. Film/production set chef
34. Camp chef
35. Commissary kitchen operator
36. Meal kit company chef
37. Wholesale prepared foods chef
38. Seasonal resort chef
39. Festival/event circuit chef
40. Embassy/diplomatic chef
41. Hunting/fishing lodge chef
42. Pet food chef
43. Food co-op chef

### Why This Ranking

**A-tier logic:** They are solo or small-team operators who own the client relationship, set their own prices, and run everything themselves. That's exactly who ChefFlow is built for. They need CRM, quoting, scheduling, recipes, payments, and communication tools all in one place. Most have no good software and use spreadsheets, Venmo, and text messages.

**B-tier logic:** They share the same needs but operate in a context that adds complexity (institutional settings, niche diets, content creation). They could use ChefFlow today for the basics but would eventually want features we don't have yet.

**C-tier logic:** Either too niche (pet food, embassy), too institutional (corporate dining, film sets), or already served by established tools (food trucks have Square/Toast, commissaries have production software). Not worth chasing until ChefFlow dominates the A-tier.

### Research Priority Key

- **P1** - Research now (Phase 1). Closest to current product or largest opportunity.
- **P2** - Research soon (Phase 2). Natural extensions, moderate opportunity.
- **P3** - Research later (Phase 3). Interesting but needs positioning work first.
- **P4** - Research eventually. Niche or speculative.

---

## PART 1: Skeleton Roadmap (Entire Platform)

### Phase 1 - Chef Vertical Research (NOW)

Understand the pain points, workflows, and unmet needs of each chef type. No code. Pure research.

| Vertical                   | Status      | Research Doc                                    |
| -------------------------- | ----------- | ----------------------------------------------- |
| Private chefs              | Done        | `docs/private-chef-platform-market-research.md` |
| Personal chefs             | Not started | TBD                                             |
| Meal prep chefs            | Not started | TBD                                             |
| Catering chefs             | Not started | TBD                                             |
| Chef-owners (restaurant)   | Not started | TBD                                             |
| Restaurants (the business) | Not started | TBD                                             |

### Phase 2 - Client-Side Research (NEXT)

What are the people hiring chefs complaining about? What do they wish were different?

- Compliance issues (health dept, insurance, liability)
- Communication gaps (dietary needs lost, timelines unclear)
- Pricing transparency (hidden fees, unclear quotes)
- Trust and vetting (how do they know a chef is legit?)
- Booking friction (too many emails, no central system)

### Phase 3 - Broader Industry Research (LATER)

Beyond cooking, into the operational and regulatory world:

- Food safety compliance (ServSafe, local health codes, cottage food laws)
- Insurance and liability (what coverage do chefs actually need?)
- Business licensing (varies wildly by state/city/country)
- Tax and accounting (1099 chaos, expense tracking, sales tax on food)
- Supply chain (ingredient sourcing, vendor management, wholesale access)
- Staffing (sous chefs, servers, bartenders for events)
- Equipment (commissary kitchens, transport, rental)

### Phase 4 - Feature Mapping (AFTER RESEARCH)

Map research findings to product decisions:

- What features are universal across all chef types?
- What's vertical-specific (only catering needs X, only meal prep needs Y)?
- What's our competitive advantage in each vertical?
- Where do we build vs. integrate vs. ignore?

---

## PART 2: Chef Vertical Research Plan

Each vertical follows the same research structure so findings are comparable.

### Research Template (per vertical)

For each chef type, answer:

1. **Who are they?** - Demographics, typical business size, solo vs. team, revenue range
2. **What's their workflow?** - A typical day/week, from booking to delivery
3. **What tools do they use now?** - Software, spreadsheets, paper, nothing
4. **What are they complaining about?** - Forums, Reddit, Facebook groups, reviews of competitor tools
5. **What competitor tools exist for them?** - Direct competitors, adjacent tools they've co-opted
6. **What's broken?** - The top 3-5 pain points that no tool solves well
7. **What would make them switch?** - The "if only X existed, I'd pay for it" signals
8. **How do they find clients?** - Word of mouth, platforms, social media, agencies
9. **How do they handle money?** - Invoicing, deposits, payment terms, tipping
10. **What's their relationship with tech?** - Tech-savvy? Tech-resistant? Phone-first?

### Research Sources (per vertical)

- Reddit (r/chefit, r/KitchenConfidential, r/MealPrepPro, r/Catering, r/restaurateur)
- Facebook groups (private chef groups, catering business groups, meal prep communities)
- Trustpilot/G2/Capterra reviews of competitor tools
- Industry publications (Chef's Roll, National Restaurant Association, USPCA)
- YouTube (chef vlogs, "day in the life" content, business advice channels)
- Podcasts (chef business podcasts, food industry shows)
- Job boards and gig platforms (what are chefs advertising?)

---

## PART 2a: Vertical Deep Dives

### 1. Personal Chefs

**How they differ from private chefs:**

- Private chef = one family, full-time or near-full-time, lives nearby or on-site
- Personal chef = multiple clients, weekly meal prep drops, rotates between households

**Research questions specific to personal chefs:**

- How do they manage multiple client households per week?
- How do they handle different dietary needs across clients?
- What does their scheduling look like (batch cooking days vs. delivery days)?
- How do they price (per meal, per week, per person)?
- What's the client communication cadence?
- How do they handle grocery shopping for multiple households?
- What's their biggest operational bottleneck?

**Where to look:**

- USPCA (United States Personal Chef Association) member forums
- r/personalchef, r/chefit
- Facebook: "Personal Chef Network," "Personal Chef Business Owners"
- Competitor tools: Eat This Much (meal planning), Prepear, Plan to Eat

---

### 2. Meal Prep Chefs

**How they differ:**

- May or may not cook in client's home (often use commissary/home kitchen)
- Batch production, packaging, labeling, delivery logistics
- Often sell direct-to-consumer (not hired by one client)
- Cottage food laws and commercial kitchen regulations matter heavily

**Research questions specific to meal prep:**

- How do they manage orders and subscriptions?
- What's the packaging/labeling workflow?
- How do they handle delivery logistics?
- What food safety/licensing do they need?
- How do they price (per meal, per plan, subscription tiers)?
- What's their marketing channel (Instagram, local Facebook, word of mouth)?
- How do they handle dietary customization at scale?
- What's their biggest cost driver (ingredients, packaging, delivery)?

**Where to look:**

- r/MealPrepPro, r/mealprep
- Facebook: "Meal Prep Business Owners," "Home Food Business"
- Cottage food law databases (state-by-state)
- Competitor tools: CookUnity (marketplace), Territory Foods, Kettlebell Kitchen
- Shopify/Square stores (many meal preppers use e-commerce)

---

### 3. Catering Chefs

**How they differ:**

- Event-based (not recurring), large volume
- Need staff coordination, equipment logistics, venue management
- Proposals and contracts are complex (multi-course, bar packages, rentals)
- Margins are tighter, scale is bigger

**Research questions specific to catering:**

- How do they handle proposals and multi-option menus?
- What's the staffing model (permanent team vs. day-of hires)?
- How do they manage equipment transport and setup?
- What does event-day coordination look like?
- How do they handle tastings and revisions?
- What's the deposit/payment structure?
- How do they track food cost across large events?
- What's their relationship with venues and vendors?

**Where to look:**

- r/Catering, r/weddingplanning (client-side complaints)
- Facebook: "Catering Professionals," "Wedding Caterers Network"
- Industry: National Association for Catering & Events (NACE)
- Competitor tools: Total Party Planner, Caterease, Better Cater, CaterZen
- Review sites: WeddingWire, The Knot (caterer reviews from clients)

---

### 4. Chef-Owners (Restaurant)

**How they differ:**

- They cook AND run a business
- HR, payroll, vendor management, menu engineering, food cost analysis
- Fixed location, recurring overhead (rent, utilities, staff)
- Regulatory burden (health inspections, liquor license, labor laws)

**Research questions specific to chef-owners:**

- What's the split between cooking and admin?
- What software are they drowning in (POS, scheduling, inventory, accounting)?
- What do they wish was integrated?
- How do they handle menu changes and food cost updates?
- What's their biggest staffing pain point?
- How do they manage vendor relationships and ordering?
- What reporting do they actually look at vs. what they ignore?
- What made them pick their current tools?

**Where to look:**

- r/restaurateur, r/KitchenConfidential
- Facebook: "Restaurant Owner Community," "Independent Restaurant Coalition"
- Industry: National Restaurant Association (NRA) reports
- Competitor tools: Toast, Square for Restaurants, MarketMan, BlueCart, 7shifts
- Podcasts: Restaurant Unstoppable, The Garnish

---

### 5. Restaurants (The Business)

**How they differ from chef-owners:**

- This is the business perspective, not the chef perspective
- Owners/operators who may not cook at all
- Focus on margins, labor costs, customer retention, marketing
- Multi-unit operators have different needs than single-location

**Research questions specific to restaurants:**

- What are the top 3 operational complaints?
- Where does money leak (waste, theft, labor, bad pricing)?
- What's the tech stack look like (and what do they hate about it)?
- How do they handle online ordering, delivery, and third-party platforms?
- What's the customer retention strategy (loyalty, email, social)?
- What compliance headaches keep them up at night?
- How do they handle reviews and reputation?
- What would they pay for that doesn't exist yet?

**Where to look:**

- NRA's State of the Industry reports
- Toast/Square/Lightspeed industry reports (free, published annually)
- r/restaurateur, r/smallbusiness
- Yelp business owner forums
- Competitor tools: Toast, Lightspeed, Olo, ChowNow, Owner.com
- Industry podcasts and newsletters

---

## PART 3: Research Execution Order

Priority order for completing the research:

1. **Personal chefs** - closest to our current product, easiest to expand into
2. **Meal prep chefs** - growing market, underserved by current tools
3. **Catering chefs** - we already have event infrastructure, natural fit
4. **Chef-owners** - bigger market, more competition, needs careful positioning
5. **Restaurants** - largest market but most crowded, research last to inform strategy

Each vertical research doc should take one focused session to complete. Findings feed directly into Phase 4 (feature mapping).

---

## PART 4: What We're NOT Researching Yet

These are important but not immediate:

- International markets (regulations vary too much, US-first)
- Ghost kitchens / cloud kitchens (emerging, but niche)
- Food trucks (different enough to be its own vertical)
- Corporate dining / institutional food service (enterprise sales, different go-to-market)
- Dietitians and nutritionists (adjacent but not chefs)

These go on the radar for Phase 3 (Broader Industry Research) or later.

---

## How to Use This Document

1. Pick the next vertical from the execution order
2. Create a research doc: `docs/research-[vertical-name].md`
3. Follow the research template (10 questions)
4. Use the sources listed for that vertical
5. Document findings with sources/links
6. When all 5 verticals are done, move to Phase 4 (feature mapping)
