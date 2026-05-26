# Exit Eval: Chef / CLIENT RESEARCH & RELATIONSHIP

> **Wave 1 | Batch 3 | 5 scenarios (#14-#18)**
> **Date:** 2026-05-25
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW on all scenarios)
> **Evaluator:** Claude (exit-eval rubric v1)

---

## Scenario #14: Research a new client before first meeting

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible | NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef needs to form a first impression and prepare for an initial consultation. They want to understand the client's lifestyle, family composition, dietary leanings, social entertaining style, and general vibe before proposing a menu or quoting. The operational decision is: "How do I tailor my pitch, pricing, and menu language to this specific person?" This is pre-meeting intelligence gathering that directly affects close rate.

**Context ChefFlow has:**

- Client name, email, phone (from inquiry)
- Referral source and referral detail
- Inquiry message text (often contains lifestyle clues: "we have two kids," "my husband is vegan")
- Past inquiry history if returning client
- AI-parsed inquiry insights (dietary_preference, allergy_mention, budget_mention, guest_count, location_mention via `insightType` enum)
- Communication history from Gmail sync
- Any prior events/quotes if they inquired before

**Data source?** Partially. Social media platforms (Instagram, Facebook, LinkedIn) are browsing destinations, not structured data APIs. There is no API to "summarize a person's lifestyle from their social profiles." Google search results are unstructured. This is fundamentally a browsing/judgment activity.

**Client-collaborative angle:** Strong. The client intake form (`lib/clients/intake-actions.ts`, `app/(chef)/clients/intake/`) and the client onboarding flow (`lib/clients/onboarding.ts`, `lib/clients/onboarding-actions.ts`) can collect much of what the chef hunts for externally: family composition, dietary restrictions, entertaining style, formality preference, occupation, typical guest count, budget range. The Dinner Circle join flow (`app/(public)/join/[token]/`) and guest portal (`app/(public)/event/[eventId]/guest/[secureToken]/`) already collect dietary notes. A pre-meeting intake questionnaire sent to the client could eliminate 60-70% of the research need.

**Physical reality:** Screen-based activity. Done at a desk or on a phone before the meeting. No kitchen/hands-free constraints. Standard screen interface is appropriate.

**Compounding:** High. Client profile data captured once serves every future event. The 30-panel client CRM (`components/clients/`) already stores: occupation, company name, Instagram handle, social media links, vibe notes, what they care about, formality level, communication style notes, dietary restrictions, allergies, household members, pets, kitchen profile, service defaults. Every piece of pre-meeting research that gets recorded into these fields pays dividends across the entire client relationship.

**Solution design:**

- Build a "Pre-Meeting Prep" card on the client detail page that surfaces: inquiry text, AI-parsed insights, any prior history, and profile completeness gaps
- Add a "Send Intake Form" one-click action from the inquiry/client page that sends the client a pre-meeting questionnaire collecting: family size, dietary needs, entertaining frequency, formality preference, typical budget, occasions they celebrate
- Wire exit links for external research: exit link #48 (Instagram), #49 (company website), plus a new "Google this client" exit link using `https://www.google.com/search?q={clientName}` and a LinkedIn search link `https://www.linkedin.com/search/results/all/?keywords={clientName}`
- Auto-populate client profile fields from intake form responses (no manual re-entry)
- Show a "Research Notes" freeform field on the client profile specifically for pre-meeting findings that the chef can jot down after browsing

**Where it appears:**

- Client detail page (pre-meeting prep card)
- Inquiry detail page (before converting to event)
- Client exit links row (`components/clients/client-exit-links.tsx`) -- already partially wired with exit IDs 48, 49

**What remains as permanent exit:**
The actual browsing of social media profiles. No API can replace the chef scrolling through a client's Instagram to get a feel for their aesthetic, their entertaining style, their home. The judgment call ("this person is casual and fun" vs. "this person is formal and precise") requires human pattern recognition on unstructured visual content.

**Priority:** High frequency (every new client) x Low-Medium effort = High priority
**Spec needed?** No. Intake form infrastructure already exists. Wire exit links + build prep card. Add to reclassification sprint doc.

---

## Scenario #15: Check client's social media for event context

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable | NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The client mentioned a theme, a mood board, or a reference ("I want it like my daughter's birthday last year" or "think Tuscany vibes"). The chef goes to Instagram/Pinterest/Facebook to find visual references the client posted or pinned. The operational decision is: "What does this client's aesthetic vocabulary actually look like?" This directly affects menu presentation, plating style, and table setting choices.

**Context ChefFlow has:**

- Client's Instagram handle (`clients.instagramHandle`)
- Client's social media links (`clients.socialMediaLinks` JSONB)
- Event occasion, service style, vibe notes
- Past event photos (if any exist in the system)
- Client's stated preferences and vibe notes

**Data source?** No. Social media content is not available via free APIs for this purpose. Instagram's API requires business accounts and does not expose arbitrary user feeds. Pinterest has no public browse API. This is inherently a visual browsing activity.

**Client-collaborative angle:** Strong. The client knows exactly what they want visually. Instead of the chef hunting through social media, the event portal could include an "Inspiration" section where the client pins links, uploads photos, or describes their vision. The guest portal already supports messages (`sendGuestMessage`). A dedicated "Event Mood Board" or "Inspiration Links" field on the event would let the client provide references directly.

**Physical reality:** Screen-based. Done during planning phase, not in kitchen. Phone or desktop. Standard UI.

**Compounding:** Medium. Each event's inspiration is somewhat unique, but client aesthetic preferences compound. A client who always wants "rustic farm" or "modern minimalist" builds a preference profile over time. The vibe notes field on the client profile captures this at a general level.

**Solution design:**

- Add an "Inspiration Links" array field on events where the chef (or client via portal) can paste URLs to Pinterest boards, Instagram posts, or any visual reference
- Surface the client's Instagram handle as a one-click exit link on the event detail page (exit link #48 is already defined and wired)
- Add a "Client's Vision" section to the event portal where the client can paste links or upload reference images
- On the chef's event view, show these references inline with thumbnail previews where possible

**Where it appears:**

- Event detail page (inspiration/vision section)
- Client portal event view (add vision/inspiration input)
- Client exit links row (already has Instagram exit link #48)

**What remains as permanent exit:**
Actually browsing Instagram, Pinterest, and other visual platforms. The chef will always want to scroll through a client's feed to absorb aesthetic context. ChefFlow can smooth the door out (one-click exit link) and capture what comes back (inspiration links, notes), but the browsing itself is permanent.

**Priority:** Medium frequency (themed/special events, not every dinner) x Low effort = Medium priority
**Spec needed?** No. Small feature: add inspiration_links to events + portal input. Sprint doc entry.

---

## Scenario #16: Look up client's company for corporate event

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible | NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** A corporate client is booking a team dinner, holiday party, or executive retreat. The chef needs to understand the company: size (determines likely budget), culture (casual tech startup vs. formal law firm affects menu), industry (finance = premium, nonprofit = budget-conscious), and key people (who is the actual decision maker vs. the EA booking). The operational decisions: menu formality, pricing tier, alcohol expectations, dietary diversity assumptions.

**Context ChefFlow has:**

- Corporate profile system is already built (`lib/clients/corporate-types.ts`, `lib/clients/corporate-actions.ts`): company name, billing address, billing contact, payment terms, tax ID, PO numbers, notes
- Client's occupation field (`clients.occupation`)
- Client's company name field (`clients.companyName`)
- Company website URL via exit links context (`companyUrl` key in `getClientContext()`)
- Past corporate events history
- Spend reports per corporate client (`SpendReport` type)
- Event guest count, budget range

**Data source?** Partially. Company websites are browsable destinations. LinkedIn company pages have limited API access. However, basic company info (industry, size, public description) could theoretically be pulled from public sources or manually captured once. The key insight is that corporate client intelligence compounds heavily; the chef serves the same company repeatedly.

**Client-collaborative angle:** Very strong. The corporate contact (usually an EA or office manager) knows everything the chef needs: headcount, budget authority, dietary mix, alcohol policy, company culture, past event history. A "Corporate Event Intake" questionnaire could collect: company size, event purpose, budget range, dietary restrictions prevalence, alcohol policy, dress code/formality, any company dietary policies (e.g., "we always provide vegan and halal options"), AV/presentation needs, billing workflow (PO required? invoicing process?).

**Physical reality:** Screen-based, planning phase. Desktop preferred for multi-tab research.

**Compounding:** Very high. Corporate clients are repeat customers by nature. A company profile captured once (culture, typical headcount, dietary policies, billing workflow, key contacts) serves every future event. The corporate profile system already exists in the DB and actions layer.

**Solution design:**

- Enrich the existing corporate profile with fields: industry, company size range, culture notes (casual/formal/mixed), typical dietary mix, alcohol policy, company dietary policies, key contacts beyond billing (EA, office manager, decision maker)
- Build a "Corporate Event Intake" questionnaire that the booking contact fills out, capturing company-specific context
- Wire exit link #49 (company website) and the Google search sub-link on the client detail page for corporate clients (already defined in registry)
- Add a LinkedIn company search exit link: `https://www.linkedin.com/company/{companyName}`
- Surface corporate profile data on the event detail page when the client has a corporate profile

**Where it appears:**

- Client detail page (corporate profile panel -- already exists as a concept in `corporate-actions.ts`)
- Event detail page (corporate context card when event is linked to a corporate client)
- Client exit links row (exit IDs 48, 49 already wired)
- New corporate intake questionnaire (client-facing)

**What remains as permanent exit:**
Deep company research: reading their website's "About" page, checking LinkedIn for org structure, looking up recent news. The chef will still visit the company website for nuanced cultural context that no questionnaire captures. But the factual data (size, industry, dietary policies, billing) can be collected once and reused.

**Priority:** Medium frequency (corporate events are a segment, not every client) x Medium effort = Medium priority
**Spec needed?** Yes, if the corporate profile is expanded significantly. The existing `corporate-types.ts` covers billing; adding operational/cultural fields warrants a small spec. However, the billing infrastructure is already built, so this is an extension, not a new system.

---

## Scenario #17: Check a client's dietary/allergy info from external source

**Original classification:** Permanent exit
**Reclassified to:** Reducible + Client-Collaborative | NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** A client says "I have Hashimoto's" or "my daughter has a FPIES allergy" or "we follow the FODMAP diet." The chef doesn't know the full implications: what ingredients to avoid, cross-contamination risks, severity level, safe substitutes. The operational decision: "What can I safely serve this person, and what will kill them?" This is a safety-critical information gap.

**Context ChefFlow has:**

- Full dietary conditions reference library (`lib/reference/dietary-conditions.ts`, `lib/reference/data/dietary-conditions.json`): conditions searchable by slug, category (allergy, intolerance, autoimmune, religious, lifestyle, metabolic), severity (life_threatening and below), with avoid lists, linked allergen tags, linked diet flags
- Allergy severity tiers (`lib/dietary/allergy-severity-types.ts`): preference/intolerance/allergy with protocols per tier
- Client allergies array, dietary restrictions array, dietary protocols array on client record
- Guest allergy system with severity, notes, emergency contact, EpiPen tracking
- Allergen matrix cross-check (`lib/formulas/allergen-matrix.ts`)
- FDA Big 9 allergen auto-check on menus
- Dietary alert system (`lib/clients/dietary-alert-actions.ts`) tracking changes with critical/warning/info severity
- Dietary dashboard and trend tracking
- Substitution reference data (`lib/reference/data/substitutions.json`)
- AI-powered allergy mention detection in conversation insights (`insightType: 'allergy_mention'`)

**Data source?** Yes. Medical/dietary condition databases are static reference data. ChefFlow already has a dietary conditions reference library with conditions, avoid lists, and linked allergen tags. The USDA database is partially integrated for nutrition. Food allergy databases (FARE, ACAAI guidelines) are static reference that can be embedded. This is almost entirely reducible.

**Client-collaborative angle:** Very strong. The client (or their parent/caregiver) knows their condition better than any database. The guest portal already collects dietary notes via `confirmGuestDietary`. The intake form can ask: "Do you or anyone in your household have food allergies or dietary conditions? If yes, please describe." The client's self-report combined with ChefFlow's reference library creates a complete picture. The allergy severity system already supports marking allergies with severity level, emergency contact info, and EpiPen status.

**Physical reality:** Screen-based, planning phase. Could also be a Remy voice query: "What can't someone with Hashimoto's eat?" The reference library is deterministic data that Remy could surface via voice.

**Compounding:** Very high. A client's dietary conditions are permanent (or long-term). Captured once, they inform every menu, every recipe selection, every allergen check for the lifetime of the relationship. The dietary alert system even tracks changes over time.

**Solution design:**

- Surface the dietary conditions reference library in the client profile UI: when the chef types a condition name (e.g., "celiac"), auto-link to the reference entry showing avoid list, severity, and safe alternatives
- Add a "Condition Lookup" quick-action on the client allergy panel: type a condition name, get the full reference card with avoid list and substitution suggestions
- Wire the substitution engine to suggest safe swaps when a condition's avoid list conflicts with a recipe's ingredients
- Ensure the client intake form and guest portal dietary section include a "Medical conditions" field (not just allergies) so the client can self-report conditions like Hashimoto's, FODMAP, etc.
- Add Remy voice query support: "What should I avoid for a client with [condition]?" pulling from the reference library

**Where it appears:**

- Client detail page dietary panel (`components/clients/dietary-dashboard.tsx`, `components/clients/allergy-records-panel.tsx`)
- Menu builder allergen cross-check (already exists)
- Guest portal dietary section (already collects dietary notes)
- Remy chat (condition lookup query)

**What remains as permanent exit:**
Rare or novel conditions not in the reference library. If a client says "I have alpha-gal syndrome from a tick bite," the chef may need to Google the latest research on which meats are affected. But for the 95%+ of common conditions, ChefFlow's reference library already has the data. Expanding the library over time reduces this further.

**Priority:** High frequency (every client with dietary needs) x Low effort (infrastructure exists) = Very high priority
**Spec needed?** No. The reference library, allergy system, and intake forms all exist. This is a wiring task: connect the condition lookup to the client profile UI and ensure the intake form collects conditions, not just allergies. Sprint doc entry.

---

## Scenario #18: View client's venue/home on map

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable | NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef needs to assess the client's location before an event: parking situation, loading dock access, neighborhood character (gated community? downtown high-rise? rural farmhouse?), proximity to grocery stores for last-minute runs, and general logistics. For new venues, Street View gives a preview of the physical space. The operational decisions: what to pack, how early to arrive, where to park the vehicle, whether equipment can be wheeled in or must be carried.

**Context ChefFlow has:**

- Client address (`clients.address`) plus additional addresses (`clients.additionalAddresses` JSONB with label, address, city, state, zip, access instructions, kitchen notes, equipment available)
- Parking instructions (`clients.parkingInstructions`)
- Access instructions (`clients.accessInstructions`)
- Gate code, security notes, house rules (`clients.gateCode`, `clients.securityNotes`, `clients.houseRules`)
- Nearest grocery store (`clients.nearestGroceryStore`)
- Event venue address (`events.venueAddress`)
- Venue profiles table (`venue_profiles`) with full kitchen recon: equipment, oven/burner count, counter space, refrigeration, parking notes, access instructions, photos, quirks, visit count
- Exit link #25: "View venue on Maps" (`https://www.google.com/maps/search/?api=1&query={venueAddress}`)
- Exit link #60: "Street View of venue" (`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={venueLat},{venueLon}`)
- Exit link for grocery stores near venue (exit link in registry using `@{venueLat},{venueLon}`)
- Exit link for driving directions (#20 area, `https://www.google.com/maps/dir/{homeAddress}/{venueAddress}`)
- Security access panel (`components/clients/security-access-panel.tsx`) for gate code, WiFi, parking, access, house rules

**Data source?** No. Google Maps, Street View, and Zillow are interactive visual tools. There is no API that replaces "look at the Street View to see if there's a steep driveway." Map embeds could bring the visual in-app, but the Google Maps JavaScript API requires a paid API key with usage-based billing, which conflicts with the no-cloud-services constraint. Exit links are the right pattern here.

**Client-collaborative angle:** Very strong. The client knows their own home/venue better than any map. The security access panel already captures gate code, parking, access instructions, and house rules. The client intake or Dinner Circle could collect: "Describe your parking situation," "Where should the chef unload equipment?", "Any stairs or elevators?", "Nearest grocery store for last-minute items." The address manager (`components/clients/address-manager.tsx`) already supports multiple addresses with access instructions and kitchen notes per address.

**Physical reality:** Screen-based, pre-event planning. Could benefit from a printable "venue brief" that includes the map link, address, parking notes, access code, and kitchen profile for quick reference on the day of.

**Compounding:** Very high. Venue intelligence is the textbook example of compounding knowledge. Visit once, learn the parking situation, the kitchen layout, the quirky oven, the neighbor's dog. ChefFlow already has venue profiles with visit count tracking. The 50th event at a client's house should need zero map research.

**Solution design:**

- Ensure exit links #25 (Maps), #60 (Street View), and the driving directions link are prominently surfaced on: event detail page, client detail page, and the day-of execution view
- Add a "Venue Recon" prompt after first visit: "You just visited [client's venue]. Record what you learned: parking, access, kitchen quirks." This captures the map-browsing knowledge into the venue profile
- Add venue photo capture to the venue profile (field exists: `venueProfiles.photos`)
- Include a "Pre-Visit Map" exit link cluster on new client/new venue events: Maps + Street View + driving directions, grouped together
- Add "nearest grocery store" to the venue profile (client profile already has `nearestGroceryStore`; mirror to venue profile or auto-populate)
- Print-friendly "venue brief" for day-of reference

**Where it appears:**

- Event detail page (venue section with map exit links -- partially wired)
- Client detail page (address section)
- Event execution/day-of page (`app/(chef)/events/[id]/execution/page.tsx`)
- Venue profile detail page
- Pre-event checklist (auto-generated item: "Review venue access notes")

**What remains as permanent exit:**
The actual Google Maps / Street View browsing. The chef will always want to visually scan the neighborhood, check for one-way streets, see the building entrance. This is an inherently visual-spatial activity that cannot be replaced by stored data. But after the first visit, the venue profile should make the map unnecessary for subsequent events.

**Priority:** High frequency (every new venue) x Low effort (exit links exist, venue profiles exist) = High priority
**Spec needed?** No. Infrastructure is built. This is a wiring/surfacing task: make sure exit links appear on the right pages, and prompt post-visit venue recon capture. Sprint doc entry.

---

## Batch Summary

| #   | Title                                                      | Reclassified To                  | Spec Needed?                   |
| --- | ---------------------------------------------------------- | -------------------------------- | ------------------------------ |
| 14  | Research a new client before first meeting                 | Partially Reducible              | No (sprint doc)                |
| 15  | Check client's social media for event context              | Bridgeable                       | No (sprint doc)                |
| 16  | Look up client's company for corporate event               | Partially Reducible              | Maybe (corp profile extension) |
| 17  | Check a client's dietary/allergy info from external source | Reducible + Client-Collaborative | No (wiring task)               |
| 18  | View client's venue/home on map                            | Bridgeable                       | No (sprint doc)                |

**Batch stats:** 5 evaluated. 0 Reducible, 1 Reducible + Client-Collaborative, 2 Partially Reducible, 2 Bridgeable, 0 Permanent. 0 new specs written. 5 need developer review.

**Key finding:** The original analysis classified all 5 as "Permanent exit." After rubric analysis grounded in the actual codebase, only 0 remain Permanent. ChefFlow's existing infrastructure (30-panel client CRM, dietary reference library, venue profiles, exit link system, intake forms, guest portal) provides substantial reduction potential for this entire category. Scenario #17 (dietary/allergy lookup) is the strongest win: the reference library already exists and just needs better UI surfacing.
