# Exit Eval: Chef / PROFESSIONAL DEVELOPMENT

> **Wave 1 | 4 scenarios | Evaluator: Claude (Solo Mode)**
> **Date:** 2026-05-25
> **Status:** NEEDS-DEVELOPER-REVIEW (all scenarios)

---

## Scenario #53: Take an online course or certification

**Original classification:** Permanent exit. Could track certifications.
**Reclassified to:** Partially Reducible

**Why chef leaves:** The chef needs to expand their skill set or maintain mandatory certifications (ServSafe, food handler permits, allergen awareness). The operational reason is twofold: (1) staying legally compliant to operate, and (2) growing capabilities to serve new client segments (e.g., learning pastry to stop subcontracting it out, learning a new cuisine because clients keep requesting it). The chef leaves to access structured educational content that lives on external platforms.

**Context ChefFlow has:**

- Certification tracker with expiration dates, renewal reminders, and status computation (`lib/compliance/certification-actions.ts`) covering 12 cert types (ServSafe, food handler, business license, liability insurance, etc.)
- Professional achievements log with "certification" and "course" types (`lib/professional/actions.ts`)
- Learning goals tracker with 8 categories (technique, cuisine, business, sustainability, pastry, beverage, nutrition, other)
- Chef's service config and cuisine specialties
- Client request history showing what cuisines/techniques clients are asking for
- Event history showing gaps (e.g., "declined 4 Thai dinner requests this quarter")
- Public profile where certifications can be displayed (`is_public` flag on achievements)

**Data source?** No. Online courses are interactive, multi-session learning experiences. Not a data source ChefFlow can ingest. However, certification status/expiry data IS a data source (state health department databases have lookup APIs in some jurisdictions).

**Client-collaborative angle:** Minimal direct angle. Indirectly, clients who see certifications on the chef's public profile gain trust. The Dinner Circle doesn't collect anything here, but the chef's completed certifications can surface in client-facing event portals as trust signals (already partially built via `lib/profile/trust-visual-actions.ts`).

**Physical reality:** Learning happens on laptops/tablets at home, not in the kitchen. No hands-free or print needs for the learning itself. The resulting certificate PDF might need to be uploaded/stored, which is a screen task.

**Compounding:** High. Every certification earned is permanent proof. Every course completed expands the chef's service menu. ChefFlow already captures this via professional achievements and learning goals, and it compounds through: (1) public profile credibility, (2) expanded service offerings in the service config, (3) historical record of professional growth. The gap is that ChefFlow doesn't connect "I completed a Thai cooking course" to "now I can accept Thai dinner inquiries" automatically.

**Solution design:**

- Surface "skill gap" intelligence: analyze declined inquiries and client requests to suggest relevant courses/certifications ("You declined 4 Thai dinner requests this quarter. Consider: [CIA Thai Cuisine Online], [James Beard Foundation Workshop]")
- Auto-link completed learning goals to service config expansion (completing a "Thai Cuisine" learning goal prompts "Add Thai to your cuisine offerings?")
- Certification renewal reminders already exist; enhance with direct links to renewal portals per cert type
- Add a curated resource directory (static, not a course platform) linking to top culinary education providers per learning goal category

**Where it appears:**

- Settings > Professional Development (existing page, `app/(chef)/settings/professional/`)
- Settings > Protection > Certifications (existing page)
- Dashboard intelligence card (when a cert is expiring or a skill gap pattern emerges)
- Remy proactive suggestion ("3 clients asked about vegan tasting menus this month; your learning goal for plant-based cuisine is still active")

**What remains as permanent exit:**
The actual course/certification experience. ChefFlow will never be Coursera or ServSafe's testing platform. The chef always leaves to learn. What ChefFlow captures is what they learned, when it expires, and how it connects to their business.

**Priority:** Low frequency (courses are quarterly/annual, not daily) x Low effort (tracking already built, intelligence layer is additive) = Low-medium rank signal
**Spec needed?** No. Existing professional development and certification tracking covers the capture side. The "skill gap intelligence" is a CIL analyzer enhancement, not a standalone spec.

---

## Scenario #54: Read industry news

**Original classification:** Permanent exit.
**Reclassified to:** Bridgeable

**Why chef leaves:** The chef needs to stay current on food trends, local restaurant scene, seasonal ingredient movements, and industry business news. The operational reason: trend awareness directly affects menu design ("clients are asking about tinned fish because Bon Appetit ran a feature"), local scene knowledge affects competitive positioning ("new private chef launched in my area"), and seasonal/sourcing news affects purchasing decisions ("tomato crop failed in Florida, prices spiking").

**Context ChefFlow has:**

- PIE seasonal calendar and price trend intelligence (detects price spikes, seasonal shifts)
- CIL signal sources tracking market and pricing patterns
- Chef's region and service area
- Menu history showing which cuisines and ingredients the chef works with
- Industry links section on dashboard already provides exit links to Eater, Bon Appetit, Food & Wine (exit link ID 54 in registry, `app/(chef)/dashboard/_sections/industry-links-section.tsx`)

**Data source?** Partially. RSS feeds and news APIs (Eater, Food & Wine, etc.) are data sources that could be aggregated. But the browsing experience (reading a full article, watching a video, following a thread of inspiration) is not reducible to a data feed. The actionable nuggets (price changes, trend signals, local openings) ARE data-sourceable.

**Client-collaborative angle:** None. Industry news is chef-facing professional development.

**Physical reality:** Reading happens during downtime, on phone or tablet. Not a kitchen task. Standard screen interface. No special physical needs.

**Compounding:** Medium. Individual news articles are ephemeral, but trend patterns compound. If ChefFlow captures "chef read about tinned fish trend" and later "chef added tinned fish course to 3 menus," that's a pattern. The compounding is in connecting trend awareness to business decisions, not in storing the articles themselves.

**Solution design:**

- Enhance the existing Industry Links dashboard section with a lightweight "trend radar": aggregate RSS headlines from 3-5 top food publications, filtered by chef's region and cuisine focus
- Surface PIE-detected price anomalies alongside industry news ("Tomato prices up 30% this week" next to "Florida crop report from Eater")
- Allow chef to "clip" a headline/link to an event or menu as inspiration reference (one-tap save to a menu's notes or an inspiration board)
- Remy daily briefing could include one "industry pulse" line sourced from aggregated headlines

**Where it appears:**

- Dashboard > Industry Links section (existing, enhance with RSS aggregation)
- Remy daily narrative (add industry pulse signal)
- Menu editor sidebar (clipped inspiration links)

**What remains as permanent exit:**
Reading full articles, watching videos, deep-diving into publications. ChefFlow surfaces headlines and actionable signals; the chef still visits Eater, Bon Appetit, and Food & Wine for the full reading experience. The exit link infrastructure already handles this cleanly.

**Priority:** Medium frequency (daily habit for engaged chefs) x Medium effort (RSS aggregation is straightforward, but curation/filtering takes tuning) = Medium rank signal
**Spec needed?** No. The dashboard industry links section exists. RSS aggregation is an incremental enhancement, not a standalone feature requiring a spec. Could be a CIL analyzer ("trend radar") added to the existing signal framework.

---

## Scenario #55: Network with other chefs

**Original classification:** Permanent exit.
**Reclassified to:** Partially Reducible

**Why chef leaves:** The chef needs professional community for three operational reasons: (1) finding substitute chefs when they can't take a gig or need coverage, (2) sharing sourcing/vendor intel ("who has good scallops right now?"), and (3) professional support and knowledge exchange. Today this happens on Instagram DMs, WhatsApp groups, and at industry events.

**Context ChefFlow has:**

- **Full chef-to-chef social network** (`app/(chef)/network/page.tsx`) with 5 tabs: Feed, Channels, Discover, Connections, Collab
- Social feed with posts, stories, reactions, comments, trending hashtags
- Topic-based channels (culinary topics)
- Chef discovery and connection requests
- Trusted Circle for close professional relationships
- **Collaboration infrastructure** (`lib/network/collab-actions.ts`): structured handoffs for lead swaps, backup coverage, referrals
- Collab availability signals (broadcast "I'm available for X")
- Private Spaces for ongoing chef collaboration
- Introduction bridges for warm intros between chefs
- Co-hosting revenue dashboard and event archive
- **Subcontracting** (`lib/community/subcontract-actions.ts`): formal agreements with COI verification
- **Network feature definitions** (`lib/network/features.ts`): 12 post types including availability, referral asks/offers, collab requests, sourcing intel, operational tips, equipment feedback, event recap learnings, urgent needs, professional proof, questions to network
- Network referral intelligence bar

**Data source?** No. Human relationships and conversations are not data sources.

**Client-collaborative angle:** Indirect. When a chef can't take a gig, the Collab handoff system allows them to refer to a trusted chef, and the client benefits from a warm handoff rather than a cold search. The Dinner Circle could surface "Chef X recommended Chef Y for your event" to the client.

**Physical reality:** Networking happens on phones during downtime. Standard mobile interface. No kitchen/hands-free needs.

**Compounding:** Very high. Professional relationships compound enormously. The trusted circle, collaboration history, referral track record, and availability patterns all build over time. A chef who has been on ChefFlow for 2 years has a rich professional network graph that makes finding subs, sharing intel, and collaborating trivially easy.

**Solution design:**

- ChefFlow already has the most comprehensive chef networking platform in the codebase. The major gap is adoption: the network is only as valuable as the number of chefs on it.
- Enhance the "urgent needs" post type with event-context pre-fill ("I need a sous chef for Saturday's 40-person dinner" auto-populates from the event)
- Surface network connections contextually on event pages ("3 chefs in your trusted circle are available this weekend")
- Add "Ask the Network" as a Remy command that posts a question to the chef's channels

**Where it appears:**

- Network page (existing, fully built with 5 tabs)
- Event detail page (contextual "find help" suggestions from trusted circle)
- Remy chat (network query commands)
- Dashboard (network activity digest)

**What remains as permanent exit:**
Instagram DMs for sharing food photos socially (not professionally). WhatsApp groups with chefs who aren't on ChefFlow. In-person industry events and conferences. The social/personal dimension of chef relationships that transcends professional networking. As ChefFlow adoption grows, the professional networking exit shrinks.

**Priority:** High frequency (weekly for active chefs) x Low effort (already built, needs contextual wiring and adoption) = Medium-high rank signal
**Spec needed?** No. The network infrastructure is comprehensive. The remaining work is contextual wiring (event page integration, Remy commands) and adoption, not new features.

---

## Scenario #56: Find a sous chef / assistant for a large event

**Original classification:** Could maintain a trusted-staff roster
**Reclassified to:** Reducible

**Why chef leaves:** A large event (40+ guests, multi-course, complex venue) exceeds what one chef can handle alone. The chef needs extra hands for prep, service, or cleanup. Today they text friends, post on Instagram, or call staffing agencies. The operational reason: capacity planning for a specific event, with requirements around skills, availability, rate, and trust.

**Context ChefFlow has:**

- **Trusted Staff Roster** (`lib/business-ops/staff-roster-actions.ts`): full CRUD for trusted contacts with role (sous_chef, line_cook, server, bartender, dishwasher, assistant, driver), hourly/day rates, availability notes, reliability rating (1-5), last worked date/event, food handler cert and ServSafe tracking, dietary restrictions, notes, and promotion path to full staff member
- **Staff Management** (`lib/staff/actions.ts`): formal staff_members table with assignment to events, scheduling, clock-in/clock-out, payroll
- **Staffing Scheduler** (`lib/staff/staffing-actions.ts`): week-view scheduler, time tracking, payroll reports
- **Staff Trust & Delegation** (`lib/intelligence/staff-trust-delegation-contract.ts`): 8 collaborator kinds, visibility levels, assignment scopes
- **Subcontracting** (`lib/community/subcontract-actions.ts`): formal chef-to-chef subcontract agreements with role, rate, COI verification, insurance requirements
- **Network Collab** (`lib/network/collab-actions.ts`): "urgent needs" and "collab requests" post types to broadcast staffing needs to the chef network
- **Event readiness bus** (`lib/events/event-readiness-bus-actions.ts`): event-level staffing readiness checks

**Data source?** Partially. The chef's own trusted staff roster is an internal data source. The network's availability signals are a queryable data source. Staffing agencies remain external.

**Client-collaborative angle:** Low. The client doesn't typically participate in staffing decisions. However, for high-end events, the client may want to approve additional staff (especially if staff will interact with guests). The event portal could show "Your chef is bringing [Name] as sous chef for this event."

**Physical reality:** Staffing decisions happen days/weeks before the event. Standard screen interface. No kitchen/hands-free needs for the decision; on the day, staff briefings might benefit from a printed or mobile-shared rundown.

**Compounding:** Very high. The trusted staff roster is a perfect compounding asset. Every time a chef works with someone, they can rate reliability, note strengths/weaknesses, and track pay history. After 20 events, the chef has a deeply profiled bench of trusted people. The system remembers who worked well at which type of event, who has food handler certs, who's available on weekends vs. weekdays.

**Solution design:**

- The trusted staff roster and staffing infrastructure already exist. The gap is the connection between "I have a large event" and "here are the right people from my roster."
- Add event-contextual staff suggestion: when an event exceeds a guest count threshold (e.g., 20+), surface "Suggested staff" from the trusted roster, filtered by role needed, availability, and reliability rating
- Pre-fill a network "urgent needs" post from event context when the roster can't fill the need
- Show staffing cost estimate on the event detail page when staff are assigned (already partially built via staffing scheduler)
- Add "last worked similar event" intelligence to roster suggestions (e.g., "Sarah worked your last 40-person dinner and is rated 5 stars")

**Where it appears:**

- Event detail page > Staffing section (existing staff assignment, enhance with roster suggestions)
- Business Ops page (existing trusted staff roster management)
- Network > Collab tab (existing "urgent needs" broadcasts)
- Event readiness checklist (staffing readiness gate)

**What remains as permanent exit:**
Cold outreach to people not in the roster or network (Instagram posts, staffing agency calls). First-time discovery of new staff when the existing bench is exhausted. As the roster and network grow, this exit narrows significantly.

**Priority:** High frequency (every large event, multiple times per month for busy chefs) x Low effort (roster and network already built, needs contextual suggestion wiring) = High rank signal
**Spec needed?** No. All the primitives exist (trusted staff roster, staff management, network collab, event staffing). The remaining work is contextual wiring: surface roster suggestions on event pages, pre-fill network posts from event data. This is integration work, not a new feature.

---

## Batch Summary

| #   | Title                                          | Reclassified To     | Spec Needed? |
| --- | ---------------------------------------------- | ------------------- | ------------ |
| 53  | Take an online course or certification         | Partially Reducible | No           |
| 54  | Read industry news                             | Bridgeable          | No           |
| 55  | Network with other chefs                       | Partially Reducible | No           |
| 56  | Find a sous chef / assistant for a large event | Reducible           | No           |

**Notes:**

- All 4 scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode, no chef input)
- Scenario #56 is the highest priority: all primitives exist, just needs contextual wiring on event pages
- Scenario #55 has the most comprehensive existing infrastructure of any exit scenario evaluated; the network/collab system is extensive
- Scenario #53 and #54 are low-priority; tracking and exit links already handle the core need
- No standalone specs warranted; all remaining work is incremental enhancement to existing systems
