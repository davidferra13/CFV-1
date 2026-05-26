# Exit Eval: Client / MENU, DIETARY & BEVERAGE RESEARCH

> Wave 2 | 8 scenarios | Evaluated: 2026-05-25
> Mode: Solo (NEEDS-DEVELOPER-REVIEW)

---

## Scenario #60: Find menu inspiration

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**Why client leaves:** Client is mood-shopping for their event. They want visual stimulation, cultural context, and plating ideas before committing to a menu direction. The decision is "what vibe do I want?" not "what specific dish?"

**Context ChefFlow has:**

- Client's past event menus and approved dishes
- Client cuisine preferences (stored in `my-preferences`)
- Event occasion, guest count, season
- Chef's full recipe library and menu catalog
- Chef's past menus for similar events
- Dish photos from chef's portfolio

**Data source?** No. Pinterest/Instagram/TikTok are creative browsing platforms, not structured data APIs. Inspiration is subjective and social.

**Client-collaborative angle:** Client can submit inspiration URLs directly into a menu submission (`lib/menus/client-menu-actions.ts` already accepts `inspiration_urls` array via `ClientMenuInputSchema`). The Dinner Circle could surface "what are you in the mood for?" prompts. Household members could vote on cuisine directions.

**Physical reality:** Screen-based. Client browses on phone/tablet in leisure time. No hands-free or print need.

**Compounding:** High. Cuisine preferences, saved inspiration links, and approved menus build a taste profile over time. The 5th booking should feel like the chef already knows.

**Solution design:**

- Surface chef's own portfolio as the FIRST inspiration source (existing menu catalog, dish photos, past event recaps)
- Client-facing "Inspire Me" tab showing chef's dishes filtered by occasion/cuisine/season
- Accept and store inspiration links submitted during menu collaboration (already built in `client_menu_submissions.inspiration_urls`)
- AI-suggested dishes from chef's repertoire based on client taste memory (`lib/culinary/taste-memory-actions.ts`)
- "Similar to what you loved" recommendations from past approved menus

**Where it appears:**

- Client portal menu collaboration flow (`/my-events/[id]/choose-menu`)
- Client menu submission form (inspiration_urls field already exists)
- Pre-event "What are you thinking?" Dinner Circle prompt
- Client preferences page (`/my-preferences`)

**What remains as permanent exit:**
Client will still browse Instagram/Pinterest/TikTok for open-ended creative inspiration. ChefFlow will never replace social media browsing. But the gap between "I saw something on Instagram" and "here's what I want" is bridgeable.

**Priority:** High frequency (rank 6 in client pain list) x Medium effort = High signal
**Spec needed?** No. Core infrastructure exists (inspiration_urls, taste memory, menu catalog). Needs client-facing UI wiring only.

---

## Scenario #61: Research a cuisine or dish

**Original classification:** Permanent exit
**Reclassified to:** Reducible

**Why client leaves:** Client sees an unfamiliar dish name on a proposed menu and wants context. "What is a gremolata?" "Is ceviche raw fish?" "What does 'sous vide' mean?" The decision is whether to approve the menu, and they need confidence.

**Context ChefFlow has:**

- Full menu with dish names and descriptions (`lib/menus/editor-actions.ts` stores `description` per dish)
- Chef notes per dish (via `chef_notes` field)
- Menu storytelling elements (`lib/menus/storytelling-actions.ts` with types: `course_note`, `chef_note`, `technique_note`, `sourcing_story`)
- Cuisine type on the menu record
- Client's cuisine preference history

**Data source?** Partially. A curated explanation from the chef is more valuable than Google. The chef knows the specific preparation. General food knowledge databases exist but the chef's version is authoritative.

**Client-collaborative angle:** If the client asks "what is this?", the chef's storytelling content answers before the question is asked. Dinner Circle can prompt "any questions about the menu?" to surface confusion early.

**Physical reality:** Screen-based. Client reviews menu on phone/laptop. Quick read, not hands-free.

**Compounding:** Medium. Once a client learns what ceviche is, they know forever. But the pattern of "chef explains their dishes" compounds into trust and faster approvals over time.

**Solution design:**

- Rich dish descriptions visible in client approve-menu view (already built: `menu-approval-client.tsx` shows course descriptions)
- Chef storytelling content surfaced to client (not just FOH staff): `menu_story_elements` has `foh_only` flag; non-FOH elements should surface to client
- Per-dish "Chef's Note" explaining technique, origin, and what to expect
- AI-generated dish context from chef's recipe data (ingredients, technique) when chef hasn't written a manual note
- "Ask about this dish" button in menu approval that creates a structured revision request

**Where it appears:**

- Menu approval page (`/my-events/[id]/approve-menu`) with expanded descriptions
- FOH menu shared with client (`lib/menus/foh-menu-client-actions.ts` already loads `description` per dish)
- Menu proposal email with dish context
- Dinner Circle "Menu Preview" module

**What remains as permanent exit:**
Deep cultural/historical food research ("the history of mole") stays on Google/YouTube. ChefFlow handles "what is THIS dish as YOUR chef will prepare it."

**Priority:** Medium frequency x Low effort = Medium-high signal (mostly already built)
**Spec needed?** No. Storytelling system exists. Need to expose non-foh_only elements to client view.

---

## Scenario #62: Check allergy seriousness

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**Why client leaves:** Client's daughter says "I'm allergic to shellfish" and the client Googles whether that's life-threatening, what cross-contamination means, and whether the chef needs to know. The decision is "how seriously do I need to communicate this?"

**Context ChefFlow has:**

- Allergy severity tiers with protocols (`lib/dietary/allergy-severity-types.ts`: preference, intolerance, allergy)
- Canonical severity catalog with clear definitions (`lib/dietary/catalog.ts`: preference/intolerance/allergy/anaphylaxis)
- Severity protocol descriptions ("Zero tolerance. Separate prep. No cross-contact.")
- Guest allergy records with emergency info, EpiPen status (`GuestAllergy` type includes `has_epipen`, `emergency_contact_name`)
- FDA Big 9 allergen list (`lib/constants/allergens.ts`)
- Kitchen allergen briefing system (`KitchenAllergyBriefing` type)
- Cross-contamination risk assessment (`CrossContaminationRisk` type)

**Data source?** Partially. Medical severity information is available from food safety databases. But ChefFlow should NOT provide medical advice. It should help classify severity for kitchen protocol purposes.

**Client-collaborative angle:** Strong. The client (or guest) classifies severity during intake. ChefFlow's tiered system (preference/intolerance/allergy) helps them self-categorize without needing medical research. The question "How serious is this?" becomes "Which tier fits?"

**Physical reality:** Screen-based. Client fills out dietary form at their own pace.

**Compounding:** High. Once a household member's allergy is recorded with severity, it persists across all future events. Never re-entered, never forgotten.

**Solution design:**

- Clear severity tier explanations visible to CLIENT during dietary form entry (already built in chef view; expose to client)
- "What does this mean for my event?" explainer: preference = chef avoids, intolerance = careful prep, allergy = zero tolerance
- Severity guidance prompts during guest dietary submission (public guest portal)
- Emergency info collection when severity is "allergy" (EpiPen, emergency contact)
- Explicit disclaimer: "For medical concerns, consult your doctor. This helps your chef prepare safely."

**Where it appears:**

- Client dietary profile (`/my-dietary`) with severity explanations
- Guest RSVP dietary form (public token page)
- Household member allergy entry (`/my-household`)
- Event guest allergy rollup with severity badges

**What remains as permanent exit:**
Actual medical advice ("can my child die from trace shellfish?") remains with doctors and medical sites. ChefFlow handles "tell your chef so they can protect your family."

**Priority:** Medium frequency x Low effort = Medium signal (severity system exists, needs client-facing explainers)
**Spec needed?** No. Infrastructure fully built. Needs client-facing copy and severity explainer UI.

---

## Scenario #63: Look up nutrition/macros

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why client leaves:** Client has fitness goals, is counting calories, or wants to know if the proposed menu fits their macro targets. The decision is "can I eat this meal and stay on track?"

**Context ChefFlow has:**

- Full menu nutrition analysis via Spoonacular API (`lib/nutrition/analysis-actions.ts`: calories, protein, carbs, fat, fiber, sodium per dish)
- USDA FoodData Central integration (`lib/nutrition/usda.ts`: 380K+ foods, government data)
- AI-estimated nutritional breakdown via Ollama (`lib/ai/menu-nutritional.ts`: per-course nutrition with confidence levels)
- Recipe ingredients with quantities
- Per-guest total calorie/macro estimates
- Dietary suitability flags ("Suitable for: gluten-free guests")
- Menu nutrition data stored in `menu_nutrition` table
- Open Food Facts integration (`lib/nutrition/open-food-facts.ts`)

**Data source?** Yes. USDA API, Spoonacular API, Open Food Facts. ChefFlow already drinks from these sources. The client should never visit MyFitnessPal for menu nutrition.

**Client-collaborative angle:** Client states macro goals in preferences. Chef/system provides menu nutrition summary against those goals. "This menu is ~650 cal/person, within your 700 cal target."

**Physical reality:** Screen-based. Client reviews on phone/laptop before approving menu.

**Compounding:** High. Client's nutrition goals persist. Every future menu proposal can be evaluated against stored targets automatically.

**Solution design:**

- Expose menu nutrition summary to client in approve-menu view (currently chef-only via `requireChef()`)
- Per-dish calorie/macro display with confidence indicator
- Total per-guest meal nutrition summary
- Client nutrition goal field in preferences (target calories, protein, etc.)
- "Fits your goals" / "Exceeds target" indicator on menu proposals
- Clear disclaimer: "Estimates only. Not medical/dietary advice."

**Where it appears:**

- Menu approval page nutrition panel
- Client preferences (macro targets)
- Menu proposal email summary
- Event recap (what you actually ate, nutrition-wise)

**What remains as permanent exit:**
Detailed food logging (tracking every bite across the day) stays in MyFitnessPal/Cronometer. ChefFlow handles "is this menu compatible with my goals?"

**Priority:** Medium frequency x Low effort = High signal (APIs already integrated, just need client-facing exposure)
**Spec needed?** No. All backend exists. Needs client-facing nutrition view in approve-menu.

---

## Scenario #64: Research wine pairings

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why client leaves:** Client wants to know what wine goes with the proposed menu. They search Vivino or Wine-Searcher for pairing suggestions, or they want the chef's recommendation.

**Context ChefFlow has:**

- Per-dish `beverage_pairing` field on every dish record (`lib/menus/actions.ts`, `lib/menus/editor-actions.ts`)
- Per-dish `beverage_pairing_notes` field for detailed pairing rationale
- Wine pairing records in `menu_wine_pairings` table (`lib/menus/storytelling-types.ts`: wine name, vineyard, vintage, notes, price per bottle)
- Beverage notes document generator (`lib/documents/generate-beverage-notes.ts`)
- Menu storytelling with `wine_pairing` type story elements
- Event beverage discovery data (`lib/events/beverage-discovery-actions.ts`: service type, expectations)
- FOH menu includes beverage pairings in client view

**Data source?** The chef IS the data source. Chef's pairing expertise is the authoritative answer. External wine databases are supplementary.

**Client-collaborative angle:** Client states beverage preferences (red/white/neither, budget per bottle). Chef provides expert pairings. Client doesn't need to research because the chef's recommendation is the product.

**Physical reality:** Screen-based. Client reviews pairings alongside menu approval.

**Compounding:** High. Client's wine preferences (bold reds, no oaky whites, budget range) persist. Chef tailors future pairings without re-asking.

**Solution design:**

- Surface beverage_pairing and beverage_pairing_notes to client in menu approval view (data already on dish records)
- Wine pairing summary section in client menu view
- Beverage preference field in client profile (budget, style preferences)
- Chef's pairing recommendation as the answer (not "go research it yourself")
- Optional: link to retailer for purchase (exit link, not replacement)

**Where it appears:**

- Menu approval page beverage section
- FOH menu client view (already includes `beverage_pairing` via `foh-menu-client-actions.ts`)
- Beverage notes PDF shared with client
- Event recap (what was paired)

**What remains as permanent exit:**
Actually buying the wine remains external (scenario #65). Researching rare/specific bottles on Vivino stays external. But "what should I drink with this menu?" is fully answered in-app.

**Priority:** Medium frequency x Low effort = High signal (data already stored per-dish, needs client-facing visibility)
**Spec needed?** No. All data infrastructure exists. Needs client-facing pairing display.

---

## Scenario #65: Buy wine/spirits

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable

**Why client leaves:** Client needs to actually purchase alcohol for the event. They go to a retailer, delivery app, or physical liquor store. Alcohol commerce is regulated and external.

**Context ChefFlow has:**

- Event beverage plan (`beverage_expectations`, `beverage_service_type` fields)
- Wine pairings with specific names, vineyards, vintages, and prices (`menu_wine_pairings`)
- Guest count (quantity needed)
- Event date (delivery timing)
- Who is responsible for beverage (chef_provides, client_provides, byob)

**Data source?** No. Alcohol retail is a regulated commerce platform. ChefFlow cannot sell alcohol.

**Client-collaborative angle:** Chef provides the shopping list (what to buy, how much). Client executes the purchase. Beverage service type field already tracks who is responsible.

**Physical reality:** Mixed. Online ordering or physical store visit. Client may screenshot the pairing list from their phone in a liquor store.

**Compounding:** Medium. Beverage plans repeat for similar events. "Last time we got the 2019 Barolo" is useful memory.

**Solution design:**

- Generate a clean beverage shopping list from wine pairings (names, quantities for guest count)
- Beverage notes PDF export for in-store reference (`lib/documents/generate-beverage-notes.ts` already exists)
- Store what was actually purchased in event record for future reference
- Clear assignment: "Client provides" vs "Chef provides" (already in `beverage_service_type`)
- Optional: links to retailer search pages for specific wines

**Where it appears:**

- Event detail beverage section
- Beverage notes PDF (printable shopping list)
- Pre-event checklist item ("Purchase wine from pairing list")
- Event recap (what was served)

**What remains as permanent exit:**
All actual purchasing: adding to cart, payment, delivery scheduling, age verification. ChefFlow is the shopping list, not the store.

**Priority:** Low-medium frequency x Minimal effort = Low signal (beverage notes PDF already generates)
**Spec needed?** No. Beverage notes document generation exists. Needs client-facing access to that PDF.

---

## Scenario #66: Ask household members what they want

**Original classification:** Reducible
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Client texts spouse "Do you want Italian or Japanese?", asks kids "Any requests?", or checks with the household about dietary needs. The decision requires input from people who aren't in front of ChefFlow.

**Context ChefFlow has:**

- Household member profiles with dietary restrictions, allergies, and notes (`lib/household/client-household-actions.ts`)
- Household member relationships (spouse, partner, child, parent, etc.)
- Client preferences including cuisine preferences and favorites
- Dinner Circle accommodation system for collecting preferences (`lib/dinner-circles/accommodation-actions.ts`)
- Taste memory system tracking what household members enjoyed (`lib/culinary/taste-memory-actions.ts`)
- Hub group meal boards for collaborative food decisions

**Data source?** No. This is social coordination between family members.

**Client-collaborative angle:** This IS the client-collaborative scenario. Household members should have their own preference input channel. A simple "What are you in the mood for?" link sent to household members captures preferences without the client being middleman.

**Physical reality:** Household conversations are often verbal/text. A shareable link that works on phone without login is the bridge.

**Compounding:** Very high. Household preferences build a complete family taste profile. After 3 events, the system knows "Dad hates cilantro, Mom loves spicy, kids only eat pasta and chicken." Every future menu proposal is pre-filtered.

**Solution design:**

- Household preference collection link (no-login, like guest RSVP dietary forms)
- "What sounds good?" quick poll for household members before menu creation
- Household dietary/preference rollup visible in menu approval context
- Cuisine voting or preference ranking for household members
- Auto-surface household restrictions in menu approval allergen badges (partially exists)

**Where it appears:**

- Household management page (`/my-household`) with "Ask for input" button
- Pre-menu collection flow (before chef proposes)
- Menu approval page showing "Household fit" indicator
- Dinner Circle preference collection module

**What remains as permanent exit:**
In-person conversations ("Hey honey, what do you feel like?") will always happen. The exit is "I need to text my family to find out." ChefFlow can collect this asynchronously so the question is pre-answered.

**Priority:** High frequency x Medium effort = High signal
**Spec needed?** Yes. Household preference polling is a new interaction pattern.

---

## Scenario #67: Request substitutions or revisions

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** Client sees the proposed menu and wants changes. "Can we swap the pork for chicken?" "My daughter won't eat mushrooms." "Can you add a pasta course?" They email, text, or call the chef instead of using the portal.

**Context ChefFlow has:**

- Menu revision request system (`lib/menus/revisions.ts`: full revision history, snapshot comparison)
- Menu approval portal with revision request flow (`app/(client)/my-events/[id]/approve-menu/menu-approval-client.tsx`)
- Per-course feedback notes in revision requests
- Substitution engine with curated rules (`lib/reference/substitutions.ts`: search by ingredient, filter by reason, quality impact)
- Client menu submission with dietary notes (`lib/menus/client-menu-actions.ts`)
- Allergen conflict detection on menu proposals (`lib/menus/approval-portal.ts`)
- Chef review workflow (accept, reject, modify, counter_propose)

**Data source?** No. This is a communication and workflow problem, not a data problem.

**Client-collaborative angle:** The client IS the collaborator. They state what they want changed. The menu approval page already has per-course notes and a revision request form. The gap is making this easier and more obvious than texting the chef.

**Physical reality:** Screen-based. Client reviews menu and marks what they want changed. Should be as easy as "tap dish, say what's wrong."

**Compounding:** Medium. Specific substitution requests don't repeat, but patterns do ("always dairy-free for Sarah"). The substitution engine can suggest alternatives automatically over time.

**Solution design:**

- Per-dish "Request Change" inline button (partially built: per-course notes in `menu-approval-client.tsx`)
- Structured substitution request: "Replace X with Y" or "Remove X" or "Add something"
- Auto-suggest substitutions from substitution engine based on reason (allergy, preference, dislike)
- Revision request status tracking visible to client ("Chef is reviewing your changes")
- Push notification when chef responds to revision request
- Make revision request MORE convenient than texting (one tap per dish)

**Where it appears:**

- Menu approval page (`/my-events/[id]/approve-menu`) with per-dish actions
- Menu revision history visible to client
- Notification: "Your chef updated the menu based on your feedback"
- Client portal event dashboard showing "Menu: Changes requested"

**What remains as permanent exit:**
Nothing. If the revision request flow is frictionless, there is zero reason to text/email/call for menu changes. The portal IS the channel.

**Priority:** High frequency x Low effort = Very high signal (system mostly built, needs UX polish)
**Spec needed?** No. All infrastructure exists. Needs UX refinement to be more obvious than texting.

---

## Batch Summary

| #   | Title                                | Reclassified To                  | Spec Needed? |
| --- | ------------------------------------ | -------------------------------- | ------------ |
| 60  | Find menu inspiration                | Partially Reducible              | No           |
| 61  | Research a cuisine or dish           | Reducible                        | No           |
| 62  | Check allergy seriousness            | Partially Reducible              | No           |
| 63  | Look up nutrition/macros             | Reducible                        | No           |
| 64  | Research wine pairings               | Reducible                        | No           |
| 65  | Buy wine/spirits                     | Bridgeable                       | No           |
| 66  | Ask household members what they want | Reducible + Client-Collaborative | Yes          |
| 67  | Request substitutions or revisions   | Reducible                        | No           |

---

## Key Findings

**ChefFlow is remarkably well-positioned in this category.** Unlike discovery or vendor coordination, nearly all the infrastructure for menu/dietary/beverage scenarios already exists in the codebase:

1. **Nutrition analysis** has three API integrations (Spoonacular, USDA, Open Food Facts) plus AI estimation, but they're chef-facing only. Client exposure is the gap.
2. **Wine pairings** have per-dish storage, storytelling elements, and PDF generation. Client visibility is the gap.
3. **Menu revisions** have full revision history, per-course notes, allergen conflict detection, and substitution engine. UX convenience vs. texting is the gap.
4. **Allergy severity** has a complete tiered system with protocols, emergency info, and cross-contamination assessment. Client-facing explainer copy is the gap.
5. **Household preferences** have profiles with dietary data but lack asynchronous collection from household members. This is the one scenario needing a new spec.

**The pattern:** The chef-side tooling is built. The client-side exposure is the recurring gap. Most scenarios need "make existing data visible in client portal" not "build new systems."

---

## Evidence Files Referenced

- `lib/nutrition/analysis-actions.ts` - Spoonacular nutrition lookup
- `lib/nutrition/usda.ts` - USDA FoodData Central integration
- `lib/ai/menu-nutritional.ts` - AI nutrition estimation
- `lib/menus/storytelling-actions.ts` - Wine pairings and menu stories
- `lib/menus/storytelling-types.ts` - WinePairing, StoryElement types
- `lib/menus/editor-actions.ts` - Per-dish beverage_pairing fields
- `lib/menus/foh-menu-client-actions.ts` - Client FOH menu view
- `lib/menus/revisions.ts` - Menu revision history
- `lib/menus/client-menu-actions.ts` - Client menu submissions with inspiration_urls
- `lib/menus/approval-portal.ts` - Menu proposal and allergen check
- `lib/dietary/allergy-severity-types.ts` - Severity tiers and protocols
- `lib/dietary/catalog.ts` - Canonical dietary catalog
- `lib/household/client-household-actions.ts` - Household member CRUD
- `lib/reference/substitutions.ts` - Substitution engine
- `lib/events/beverage-discovery-actions.ts` - Beverage service planning
- `lib/documents/generate-beverage-notes.ts` - Beverage notes PDF
- `lib/dinner-circles/accommodation-actions.ts` - Circle preference collection
- `lib/culinary/taste-memory-actions.ts` - Taste memory system
- `app/(client)/my-events/[id]/approve-menu/menu-approval-client.tsx` - Menu approval UI
- `app/(client)/my-household/household-client.tsx` - Household management UI
- `app/(client)/my-dietary/page.tsx` - Client dietary profile
- `app/(client)/my-preferences/preferences-client.tsx` - Client preferences UI

---

_All scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode, no chef input)_
