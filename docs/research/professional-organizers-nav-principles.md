# Research: Professional Organizer Principles for Nav Reduction

> **Date:** 2026-04-12
> **Question:** What frameworks do world-class professional organizers use, and how do those frameworks translate to reducing clutter in a software navigation bar?
> **Status:** complete

---

## Origin Context

The developer asked: "do research on the top professional organizers in the world that would tackle this project." The project is ChefFlow's navigation bar, which has grown to 13 nav groups, 145+ items, and a separate action bar. The spec `docs/specs/navigation-action-bar.md` already describes the core problem clearly: "the navigation currently presents as a flat encyclopedia. The most critical daily actions require the same number of clicks as rarely-used features." The goal is not to delete features but to find the right mental models for deciding what goes where - what lives at the surface, what gets buried, and what might be removed entirely.

---

## Summary

Every world-class professional organizer converges on the same insight: clutter is not about the objects (or features) themselves - it is about the mismatch between what is present and what actually serves the user's life (or workflow). The frameworks differ in their entry point (emotion vs. frequency vs. vision vs. category), but they all produce the same three outputs: things that stay at the surface, things that get relegated to a secondary tier, and things that get removed entirely. Translated to navigation, this means ChefFlow's 145+ items need to be evaluated against a single organizing question before any UI decision is made: "What does a chef actually do every day, versus every week, versus almost never?" The answer already exists in the developer's own survey data (Q5-Q9 in the nav-action-bar spec) and does not require user research to get started.

---

## Detailed Findings

### 1. Marie Kondo (KonMari Method)

**Core methodology:** Tidy by category, not by location. Handle every item and ask one question: "Does this spark joy?" Keep only what passes. Discard everything else with gratitude.

**Decision criteria:**

- The test is emotional and immediate, not analytical. If you hesitate, it probably does not spark joy.
- Critically: the frame is "what do I KEEP?" not "what do I discard?" This shifts from defensive preservation (why should I remove this?) to affirmative selection (why should I keep this?).
- Tidying is done in one decisive pass, not incrementally.

**Key principle for nav:** Flip the question. Instead of "why should we remove this nav item?", ask "which nav items would a chef reach for every day because they genuinely spark momentum?" If a feature does not pass that test, it does not belong at the top level. KonMari applied to nav means: pick the ~8 features a chef would feel relief to see immediately on login, and everything else goes into the "All Features" drawer.

**Already applied:** The nav-action-bar spec (`docs/specs/navigation-action-bar.md`) identifies exactly 8 daily-driver actions - Inbox, Calendar, Events, Clients, Menus, Money, Prep, Community. This is the KonMari shortlist already.

---

### 2. Peter Walsh (Vision-First Framework)

**Core methodology:** Walsh's signature insight is that clutter is not an object problem - it is a vision problem. Before touching a single item, you must clearly answer: "What is the life I want to live? What does this space look like in that life?" Then evaluate every item by asking: "Does this move me closer to that vision?"

**Decision criteria:**

- F.A.S.T. method: Fix a time, Anything not used in 12 months goes, Someone else's stuff leaves, Toss.
- Three categories for everything: Memory Items (keep the treasures), I-Might-Need-It Items (usually junk), Trash/Recycling.
- The "I might need it someday" category is where most clutter hides. Walsh treats this as a red flag, not a justification.

**Key principle for nav:** Define the vision for the session before touching the nav. Walsh would ask: "What does a chef want to feel when they open ChefFlow? What is the one job they open the app to do?" The answer from the developer's own survey is explicit: a chef opens ChefFlow to feel AT EASE - not productive, not efficient, AT EASE. Every nav item that produces anxiety rather than ease is Walsh-clutter. The "I might need it someday" nav items (features that are built but rarely used) belong in the "All Features" drawer, not at the top level. Walsh would argue that having them visible at the top level is actively harmful because they create the feeling of obligation.

---

### 3. Julie Morgenstern (SPACE Method)

**Core methodology:** Morgenstern is the most systematic of the major organizers. Her SPACE method is a five-step process: Sort (group similar items), Purge (decide what leaves), Assign a home (each item gets one specific location), Containerize (use structure to hold the groups), Equalize (maintain the system over time). She applies a prior step: Analyze (understand the obstacles that created the clutter) and Strategize (plan the zones before touching anything).

**Decision criteria:**

- "Kindergarten model": organize by activity zones, not by object type. A kindergarten classroom is organized around what children DO (reading corner, art table, blocks area) - not around what objects look like.
- Proximity rule: items used most often should be closest to hand. Items used weekly in the middle tier. Items used occasionally in the back. Items never used leave.
- The "Assign a home" step is critical: every item gets exactly one home. If a feature appears in multiple nav groups, it has no real home and causes confusion.

**Key principle for nav:** Morgenstern's zone model maps directly to nav architecture. ChefFlow's nav should be organized by what a chef DOES, not by what the features ARE. The current 13 groups (Pipeline, Events, Commerce, Culinary, Finance, Operations, etc.) are organized by feature category (object type). A Morgenstern redesign would re-sort by activity zone: "Running an Event", "Building a Menu", "Getting Paid", "Staying in Touch", "Running the Business". Items used daily go in the action bar (front of drawer). Items used weekly go in the visible nav groups. Items used monthly go inside collapsed sections. Items never used get audited for removal. Morgenstern would also enforce the "one home" rule: if a feature appears in two nav groups, that is a structural defect - pick one or create a new zone that makes sense.

---

### 4. Shira Gill (Clarify-Edit-Organize-Elevate-Maintain)

**Core methodology:** Gill's five-step framework - Clarify, Edit, Organize, Elevate, Maintain - differs from the others in that it explicitly starts with values clarification before any physical work. She also distinguishes "minimalism" from having less: minimalism means having the perfect amount of everything for you, based on your values and constraints.

**Decision criteria:**

- Clarify: what do you actually value? What kind of person/space/life are you building?
- Edit: remove anything that does not serve those values or fit the constraints (space, budget, time).
- Organize: once the excess is gone, organize what remains.
- Elevate: after editing and organizing, there is an opportunity to elevate quality - the remaining things should be the best version of each.
- Maintain: build triggers into the system for when to reset.

**Key principle for nav:** Gill's "Elevate" step is distinctive and underused in software thinking. After editing the nav down, the surviving features should be elevated - given better labels, better groupings, better visual hierarchy. A nav with 8 items that are beautifully labeled and consistently grouped is better than a nav with 8 items that are mediocre. Her "Maintain" step also applies directly: the nav needs a scheduled audit trigger, not a one-time fix. New features will always be added and the nav will re-clutter without a maintenance cadence.

---

### 5. Hideko Yamashita (Danshari - Refuse/Dispose/Separate)

**Core methodology:** Danshari (coined 2009) takes a three-phase approach focused on the relationship between person and possession. Dan (断) means refuse - stop new clutter from entering. Sha (捨) means dispose - remove what is already there. Ri (離) means separate - mentally detach from the emotional weight of objects.

**Decision criteria:**

- Dan targets the inflow problem: most clutter happens at the point of acquisition ("I might need this"), not at the point of removal.
- Sha is the purge, but it is informed by Dan - you cannot purge effectively if you keep accepting new items.
- Ri is a mindset shift: the goal is to be less dependent on having things available, trusting you can get what you need when you need it.

**Key principle for nav:** ChefFlow's nav clutter has a "Dan" problem. Features get added to the nav immediately when they are built, with no gate for whether they belong at the top level. Danshari applied to nav means: the point of entry is where the decision should be made. Before a new feature gets a nav item, ask: "Does this belong at the primary nav level, or does it start in the 'All Features' drawer and earn its way up?" The current situation - where everything that gets built immediately becomes a top-level nav item - is exactly the Danshari pattern of "accepting things because they exist," which is how clutter accumulates. The ri principle also applies: a chef should be able to trust that features are accessible even when not visible. Features buried in "All Features" are not deleted - they are accessible when needed. The chef does not need to see them to trust they exist.

---

### 6. The Minimalists (Joshua Fields Millburn and Ryan Nicodemus) - 90/90 Rule

**Core methodology:** Not professional organizers in the traditional sense, but their frameworks are widely adopted. The 90/90 rule: have you used this in the past 90 days? Will you use it in the next 90 days? If both answers are no, remove it.

**Decision criteria:**

- Frequency window is adjustable (120 days, 6 months) but must be decided in advance and applied consistently.
- The rule forces a concrete temporal test, not a subjective one. "I might use this someday" fails the rule automatically.
- The power is in having a rule at all - a rule makes the individual decision easier because the decision was already made at the rule level.

**Key principle for nav:** Apply a 90/90 equivalent to nav items using real usage data. If a nav item has not been clicked in the last 90 days by any user, it does not belong at the primary level. Analytics data (if available) would settle most of the hard cases immediately. For a solo developer without analytics, this can be estimated from the developer's own daily workflow: "Have I used this feature in the past 90 days? Would I use it in the next 90?" If both answers are no, the feature should start in the "All Features" drawer at minimum, and potentially be gated or hidden entirely.

---

### 7. Don Aslett (The Office Clutter Cure / De-Junking)

**Core methodology:** Aslett is less famous than Kondo but more directly applicable to work and office contexts. His approach is blunter than the others: identify junk by asking whether the item is currently being used, being useful, or will realistically be used again. He focuses heavily on the psychology of accumulation - people keep things because of guilt (it was expensive), hope (I will use this eventually), and identity (this is who I am).

**Decision criteria:**

- Is it being used now? If not, when was it last used?
- Is it useful, or does it just look useful?
- Would you buy it again today? (If not, it was never worth keeping.)
- The "expensive purchase" fallacy: the sunk cost of building a feature does not justify keeping it visible.

**Key principle for nav:** Aslett would target the identity clutter in ChefFlow's nav - features that exist not because chefs use them but because the developer built them and they represent work invested. "Cannabis events" nav items, "Prospecting", "Protection", and other specialized sections may fall into this category. Aslett would ask: do real chefs use this weekly? Not "could they" or "would they if they knew about it" - do they actually? If the answer is no, it is junk by Aslett's definition regardless of how much effort went into building it.

---

## Synthesis: Principles That Apply to Nav Reduction

Six cross-cutting principles emerge from all the frameworks above:

**Principle 1: Define the vision before touching anything (Walsh + Gill)**
The developer already has this: "a chef opens ChefFlow and feels AT EASE." Every nav decision should be tested against that feeling. Does adding this item to the top nav increase or decrease ease? That is the only question.

**Principle 2: Flip the frame from "what should I remove?" to "what would I keep?" (Kondo)**
Start with a blank nav. What 5-8 items would a chef reach for on their first day? Those get the action bar. Everything else starts in the "All Features" drawer and earns promotion through demonstrated daily use.

**Principle 3: Organize by activity zones, not by feature category (Morgenstern)**
The current 13 groups are organized by what features ARE (Culinary, Finance, Operations). They should be organized by what chefs DO (Run a Dinner, Build a Menu, Get Paid, Stay in Touch). This is the kindergarten model applied to software.

**Principle 4: Gate new features at the point of entry, not at the point of removal (Yamashita)**
Going forward, no new feature gets a primary nav item by default. Features enter the "All Features" drawer. They earn primary nav placement through demonstrated use.

**Principle 5: Use a concrete usage window to settle the hard cases (The Minimalists)**
For any feature that is disputed, apply the 90/90 rule. Has any user (including the developer) used this in the past 90 days? Will any user use it in the next 90 days? No to both = belongs in secondary tier at minimum.

**Principle 6: After cutting, elevate the survivors (Gill)**
Editing is not done when the nav is shorter. It is done when the nav is shorter AND the surviving items are better labeled, better grouped, and more visually coherent. The shortlist deserves more investment in naming and grouping than the full list did.

---

## Cognitive Science Reinforcement

The professional organizer principles above are reinforced by two well-established UX laws:

**Hick's Law:** Decision time increases logarithmically with the number of choices. A nav bar with 13 visible groups forces 13 micro-decisions every time a chef opens the sidebar. Grouping into 4-5 zones with the action bar surfacing the daily 8 reduces this to 1 decision (action bar) or 2 decisions (open All Features, then pick a zone).

**Miller's Law:** Working memory holds approximately 5-9 meaningful chunks. A nav bar with 13 groups exceeds this limit, which is why it feels like an encyclopedia rather than a tool. The action bar already solves this for daily use. The "All Features" drawer needs to be organized into no more than 7 groups to stay within working memory limits.

**Progressive Disclosure:** The action bar + "All Features" architecture the developer already specced is the correct implementation of progressive disclosure: show what is needed daily at the surface, reveal everything else on demand.

---

## Gaps and Unknowns

- **No usage analytics confirmed.** The 90/90 rule and data-driven pruning are blocked without click data. The developer should confirm whether any analytics are instrumented before applying frequency-based cuts.
- **Which of the 13 groups are actually used weekly vs. monthly vs. never** is not documented in any spec. A quick self-audit by the developer (30 minutes, marking each group as daily/weekly/monthly/never) would inform most pruning decisions without any user research.
- **The "All Features" drawer grouping** is still the current 13 groups organized as-is per the nav-action-bar spec. The Morgenstern zone model suggests this could be re-grouped by activity (5-7 zones) rather than retained as the original 13. That is a separate spec question.
- **Features that should be removed entirely** (not just deprioritized to "All Features") are not identified here. That requires the developer to review each group and apply the Aslett / 90/90 test honestly.

---

## Recommendations

**"Quick fix" (can be done without research or discussion):**

- Apply the KonMari "what would I keep?" frame to the action bar selection. Start blank and add items back rather than removing from the current full list. The spec already identifies 8, but this validates the reasoning.
- Enforce the Yamashita gate going forward: any new feature that gets built starts in the "All Features" drawer, never at the primary nav level. Add a comment in `nav-config.tsx` to this effect.
- Apply Gill's "Elevate" step to the 8 action bar items: review their labels and icons once the cut is made. They represent the most important real estate in the app.

**"Needs discussion" (requires developer input to resolve):**

- Decide whether the "All Features" drawer retains the current 13-group structure or gets re-organized into 5-7 activity zones per the Morgenstern zone model. This is a significant IA decision that will affect future feature placement conventions.
- Identify which of the 13 existing nav groups the developer has not personally used in the last 90 days. Those groups are candidates for the "All Features" drawer only (no surface-level placement) or for removal from nav entirely.
- Confirm whether usage analytics are instrumented. If they are, apply the 90/90 rule to the full item list before any manual decisions are made.

**"Needs a spec" (bigger work that follows from this research):**

- A full nav audit applying the 90/90 rule and the Morgenstern zone model to all 145+ items, producing a documented keep/demote/remove recommendation for each one. This would be the definitive spec for a nav reduction pass.
- A maintenance cadence for nav hygiene: a recurring quarterly review trigger so the nav does not re-clutter after this pass.
