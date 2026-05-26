# Exit Eval: Guest / DIETARY, ALLERGY & HEALTH CONTEXT

> Wave 4 | 6 scenarios | Evaluator: Claude (solo mode)
> Date: 2026-05-25
> Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #29: Ask a doctor about allergy seriousness

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** The guest has been told they have an allergy (or suspects one) and needs a medical professional to determine the clinical severity: is it a preference, an intolerance, a true IgE-mediated allergy, or anaphylaxis-risk? This is a medical diagnosis question. The guest needs to know whether cross-contamination could send them to the ER or just cause discomfort. That answer determines what the chef must do in the kitchen.

**Context ChefFlow has:**

- Guest name, event association, RSVP status
- Self-reported allergies (free text) from `/dietary-confirm/[token]` page
- Severity level selector: preference, intolerance, allergy, life-threatening (`SEVERITY_OPTIONS` in `app/(public)/dietary-confirm/[token]/page.tsx`)
- Structured allergy severity records in `guest_allergies` table with EpiPen flag and emergency contact (`lib/dietary/allergy-severity-actions.ts`)
- Reference database of 30+ dietary conditions with severity classifications, avoid lists, cross-contact notes, and client questions to ask (`lib/reference/data/dietary-conditions.json`, `lib/reference/dietary-conditions.ts`)
- FDA Big 9 critical allergen list in `lib/dietary/safety-check.ts`
- Kitchen allergy briefing generator with separation protocols (`getKitchenAllergyBriefing`)

**Data source?** No. Medical diagnosis is not an API. It requires a doctor-patient relationship, clinical history, and potentially testing (skin prick, blood IgE panels).

**Client-collaborative angle:** The guest themselves is the primary source. The dietary confirmation form already collects severity level. The Circle household profile (`lib/hub/household-actions.ts`) stores per-member allergies and dietary restrictions. The key gap is that ChefFlow collects the answer but does not help the guest understand why the severity distinction matters. A guest who does not know their severity will pick "preference" by default, which is dangerous if the truth is anaphylaxis.

**Physical reality:** This is a pre-event workflow, not a kitchen moment. Screen-based forms are appropriate. The guest is at home deciding what to tell the chef.

**Compounding:** High. Once a guest knows their allergy severity and records it, that data serves every future event with every chef on the platform. The `guest_allergies` table already persists across events when linked to a profile.

**Solution design:**

- Add educational microcopy to the severity selector on `/dietary-confirm/[token]` explaining what each level means in kitchen terms ("Life-threatening: chef will use separate equipment, prep your dishes first, verify every label")
- Surface the `clientQuestions` from `dietary-conditions.json` as prompts: "Not sure? Your doctor can help. Common questions to ask: Is this IgE-mediated? Should I carry an EpiPen?"
- Add a "consult your doctor for medical advice" disclaimer near the severity selector (the P1 gap identified in the exit-points analysis)
- After severity selection, conditionally show the EpiPen and emergency contact fields (currently only chef-facing in `setGuestEmergencyInfo`)

**Where it appears:**

- `/dietary-confirm/[token]` severity selector
- Guest portal dietary section in `portal-client.tsx`
- Circle household profile dietary editor
- RSVP allergy fields on `/share/[token]`

**What remains as permanent exit:**
The actual doctor visit. ChefFlow should never diagnose. The guest must consult their physician for clinical severity determination. ChefFlow captures and acts on the answer.

**Priority:** Medium frequency (most guests with allergies already know severity) x Low effort (microcopy + conditional field display) = P2
**Spec needed?** No. Microcopy additions and conditional field visibility. Small enough for inline build.

---

## Scenario #30: Look up whether an ingredient is safe

**Original classification:** Permanent
**Reclassified to:** Reducible

**Why guest leaves:** The guest sees a dish on the menu (via `/menu-pick/[token]`, `/catalog-pick/[token]`, or guest portal) and does not know whether a specific ingredient is safe for their allergy. Example: "Does tahini contain tree nuts?" or "Is ghee safe for dairy allergy?" They leave to Google because the menu picker currently shows no ingredient-level detail or allergen flags.

**Context ChefFlow has:**

- Complete dietary conditions reference database with avoid lists, safe alternatives, cross-contact risks, and common mistakes (`lib/reference/data/dietary-conditions.json`, 30+ conditions)
- Food safety reference data (`lib/reference/data/food-safety.json`, `lib/reference/food-safety.ts`)
- Allergen flag data on dishes (`dishes.allergen_flags` column, used by `lib/dietary/safety-check.ts`)
- Guest's self-reported allergies from dietary confirmation
- `checkDishAgainstAllergens` function in `lib/menus/allergen-check` (imported by safety-check.ts)
- `searchConditions` function that can match ingredients to conditions
- `findByAllergenTag` and `findByDietFlag` lookups

**Data source?** Yes. ChefFlow already has the data. The `dietary-conditions.json` includes avoid lists ("milk, cream, butter, cheese, yogurt, whey, casein, ghee..."), safe alternatives ("oat milk, soy milk, almond milk..."), and cross-contact notes. The `food-safety.json` has additional reference data. The problem is that this data is chef-facing only. None of it surfaces on guest token pages.

**Client-collaborative angle:** The chef knows the actual ingredients in each dish. The `allergen_flags` field on dishes exists but is not displayed on menu-pick or catalog-pick pages (grep confirmed: zero matches for "allergen" or "dietary_tag" in `menu-pick-client.tsx` and `catalog-pick-client.tsx`). The chef's ingredient knowledge should reach the guest without the guest having to ask.

**Physical reality:** Pre-event screen workflow. Guest is browsing the menu on their phone, deciding what to pick. Inline allergen badges and expandable ingredient notes are the natural pattern.

**Compounding:** High. Once a chef tags allergens on a dish, every guest at every event sees them. Once the reference database maps "tahini" to "sesame allergy," that mapping serves every future query.

**Solution design:**

- Display `allergen_flags` as visual badges on dishes in `/menu-pick/[token]` and `/catalog-pick/[token]`
- Add expandable "Ingredients" and "Allergen info" sections per dish on guest-facing pickers
- When a guest has submitted dietary info, auto-highlight dishes that conflict with their allergies (the `checkMenuSafety` function in `lib/dietary/safety-check.ts` already does this computation)
- Surface the "safe alternatives" and "avoid details" from `dietary-conditions.json` as contextual help when a guest's allergy matches a dish flag
- Add a "Chef's note" field per dish visible to guests (already exists in schema as dish description, but not rendered on pickers)

**Where it appears:**

- `/menu-pick/[token]` dish cards
- `/catalog-pick/[token]` dish cards
- Guest portal menu view in `portal-client.tsx`
- `/share/[token]` menu summary section

**What remains as permanent exit:**
Novel or obscure ingredient questions that are not in the reference database. "Is this specific brand of miso gluten-free?" requires label reading, not database lookup.

**Priority:** High frequency (every guest with allergies facing an unfamiliar menu) x Medium effort (render existing data on guest surfaces) = P0
**Spec needed?** Yes. Guest-facing allergen display across 4 surfaces, auto-conflict highlighting, and reference data surfacing.

---

## Scenario #31: Check medication, pregnancy, or cannabis interaction

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** The guest needs to know whether a specific food, ingredient, or cannabis component interacts with their medication, pregnancy status, or health condition. Example: "Can I eat soft cheese while pregnant?" or "Does CBD interact with my blood thinner?" This is regulated health guidance that requires medical/pharmacological expertise.

**Context ChefFlow has:**

- Cannabis public information page (`app/(public)/cannabis/public/page.tsx`) with dining format descriptions
- Cannabis guest onboarding flow with age verification, participation preference, familiarity, and consumption method fields (in `portal-client.tsx`)
- Cannabis acknowledgment system requiring explicit guest consent
- `lib/chef/cannabis-actions.ts` for cannabis event management
- `lib/cannabis/guest-onboarding-actions.ts` for guest-side cannabis intake
- Dietary conditions reference with severity classifications
- The dietary confirm form already captures "notes" as free text where a guest could mention pregnancy or medication

**Data source?** No. Medication interactions require pharmacological databases (e.g., FDA drug interaction checker, Drugs.com). Pregnancy food safety requires medical guidelines (ACOG, FDA). Cannabis-drug interactions are an active research area with no definitive public API. ChefFlow should never provide this guidance.

**Client-collaborative angle:** Limited. The host may know a guest is pregnant (social knowledge), but medication and health conditions are private. The chef needs to know the dietary RESULT ("no soft cheese, no raw fish, no alcohol") without needing to know the medical REASON. The dietary confirmation form's free-text notes field is the right capture surface.

**Physical reality:** Pre-event research. Guest is at home or on their phone. They may consult their doctor or pharmacist in person. This is not a kitchen or event-time scenario.

**Compounding:** Medium. Pregnancy is temporary (the restriction disappears). Medication interactions change when prescriptions change. Cannabis tolerance is personal and variable. The underlying allergy/restriction data compounds, but the medical context driving it is transient.

**Solution design:**

- Add "Consult your healthcare provider" disclaimer on cannabis onboarding flow (currently absent)
- Add pregnancy-aware food safety note on dietary confirmation: "Pregnant? Common restrictions include: raw fish, soft cheese, deli meats, high-mercury fish. Please consult your provider."
- On the cannabis participation selector in guest portal, add: "If you take medication, consult your doctor before participating in cannabis dining"
- Store the dietary RESULT, not the medical reason. If a guest says "no raw fish (pregnant)," capture "no raw fish" as the restriction and "(pregnant)" in notes
- Link to `/cannabis/public` from cannabis acknowledgment sections for general education

**Where it appears:**

- `/dietary-confirm/[token]` notes section
- Guest portal cannabis onboarding in `portal-client.tsx`
- `/cannabis/public` information page
- RSVP dietary fields on `/share/[token]`

**What remains as permanent exit:**
All of it. The doctor/pharmacist visit is permanent. ChefFlow provides safety disclaimers and captures the dietary outcome. It never provides medical advice.

**Priority:** Low-medium frequency (subset of guests with medications or pregnancy) x Low effort (disclaimer copy additions) = P2
**Spec needed?** No. Copy additions to existing forms. No new features.

---

## Scenario #32: Ask household member what they can eat

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative

**Why guest leaves:** A guest needs to provide dietary information for their household (spouse, children, elderly parent) and does not know everyone's restrictions from memory. They text a family member: "Can little Sophia eat shellfish?" or "Mom, are you still avoiding gluten?" The information exists within the household but is not centralized.

**Context ChefFlow has:**

- Household member model in hub: `hub_household_members` table with `dietary_restrictions`, `allergies`, `dislikes`, `favorites`, `notes`, `age_group`, and `relationship` fields (`lib/hub/household-actions.ts`)
- `HouseholdDietarySummary` type aggregating all members' allergies and dietary restrictions across the household
- `getHouseholdMembers(profileToken)` returns all members for a profile
- `getCircleHouseholdSummary(groupId)` and `getCircleDietarySummaryByToken(groupToken)` aggregate dietary data across all Circle members and their households
- Dinner Circle guest dietary summary (`lib/dinner-circles/guest-dietary-summary.ts`) aggregating counts
- Plus-one fields during RSVP on `/share/[token]` that capture plus-one allergies and dietary notes
- Chef-side `householdMembers` table in main schema with `relationship` enum (partner, child, family_member, regular_guest)

**Data source?** No. The information lives in humans' heads. But ChefFlow can be the place where it gets recorded once and persists.

**Client-collaborative angle:** This is the core of the scenario. The Circle/household model is designed exactly for this. When a guest joins a Circle, they can add household members with their dietary data. The missing piece: the dietary confirmation email (`lib/dietary-outreach/actions.ts`) only targets individual guests, not household members. And the `/dietary-confirm/[token]` page collects data for one person, not a household.

**Physical reality:** Pre-event, phone or computer. The guest is filling out a form. If they could add household members directly on the dietary confirmation page, they could hand the phone to each family member or fill it out together at the dinner table.

**Compounding:** Very high. A household's dietary profile, once captured, serves every future event. "Sophia is allergic to shellfish" is recorded once and propagated to every chef who cooks for this family. The `propagateDietaryToEvents` function in `lib/dietary/propagate.ts` already handles propagation from client records to events.

**Solution design:**

- Extend `/dietary-confirm/[token]` with "Add household member" capability: name, relationship, allergies, dietary restrictions, severity
- Pre-populate household data from existing `hub_household_members` if the guest has a Circle profile
- Allow each household member to be listed with their own dietary row on the confirmation page
- Include household members in the `sendDietaryOutreach` flow: generate per-member tokens or a single household token
- Surface the household dietary summary on the guest portal so the guest can verify all members' data is correct
- On RSVP plus-one fields, link the plus-one to a household member record if one exists

**Where it appears:**

- `/dietary-confirm/[token]` (primary: add household members)
- `/share/[token]` RSVP plus-one section
- Circle household profile at `/hub/me/[profileToken]`
- Guest portal dietary section

**What remains as permanent exit:**
First-time capture: the guest still needs to ask their family member in person or by text the first time. After that, the data is in ChefFlow and never needs to be re-asked.

**Priority:** High frequency (every household with 2+ people attending) x Medium effort (extend dietary-confirm form, link to household model) = P0
**Spec needed?** Yes. Household dietary collection on guest token surfaces, linking to existing hub household model.

---

## Scenario #33: Photograph ingredient labels for chef

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why guest leaves:** A guest with a severe allergy wants to share a product label photo with the chef so the chef can verify ingredients. Example: "Here's the label on the olive oil we have at home" or "This is the sauce my child reacted to." Currently the guest must photograph it with their native camera, then text/email it to the chef separately. The guest portal has a messaging capability (`sendGuestMessage` in `portal-client.tsx`) but it is text-only, no attachments.

**Context ChefFlow has:**

- Guest-to-chef messaging via `sendGuestMessage` action (text only, confirmed in portal-client.tsx line 1173)
- Guest wall messaging on `/share/[token]` via `postGuestMessage` in `lib/guests/message-actions.ts` (text + emoji only)
- Circle photo upload capability (hub media features exist)
- Private messaging threads between chef and Circle members (`lib/hub/private-message-actions.ts`)
- Guest photo gallery on share pages (upload exists for event photos)
- Dietary confirmation with free-text allergy field and notes

**Data source?** No. The label is a physical object. But the photo of it is a digital artifact that needs a home.

**Client-collaborative angle:** The host may have the product in their kitchen (since the event is often at the host's home). The Circle's media/photo capabilities could serve as the channel. But the primary flow is guest-to-chef, not guest-to-host.

**Physical reality:** The guest is holding a product in their hand, using their phone camera. The flow should be: open camera, take photo, upload directly to the chef thread. Minimal steps. The native camera app is unavoidable (ChefFlow should not build a camera), but the upload destination should be in-app, not a separate text message.

**Compounding:** Medium. A specific product label is one-time, but the pattern of "guest sends chef a photo for verification" recurs across events. Having a photo thread in the guest portal means the chef can reference it during prep.

**Solution design:**

- Add image/file attachment support to the guest portal messaging (`sendGuestMessage` in portal-client.tsx)
- Add a specific "Share a label or photo with your chef" prompt in the dietary section of the guest portal
- Store uploaded images linked to the guest record and event for chef reference during prep
- Include uploaded photos in the kitchen allergy briefing or prep sheet context
- On the dietary confirmation page, add an optional "Upload a photo (e.g., ingredient label)" field

**Where it appears:**

- Guest portal chef message section (attachment support)
- `/dietary-confirm/[token]` optional photo upload
- Circle private chat (already has media capabilities)

**What remains as permanent exit:**
The camera app. Taking the photo is always external. ChefFlow provides the upload destination so the photo does not have to travel through SMS/email.

**Priority:** Medium frequency (guests with severe allergies at host-provided-ingredient events) x Medium effort (file upload on guest portal, storage, chef-side display) = P1
**Spec needed?** No. Standard file upload addition to existing messaging. Can be scoped as part of a broader "guest portal media" enhancement.

---

## Scenario #34: Clarify dietary ambiguity verbally

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why guest leaves:** The guest submitted dietary information but the chef or host has follow-up questions. "You said 'no nuts,' does that include coconut?" or "You marked vegetarian but mentioned fish is okay?" The nuance requires back-and-forth conversation that a one-shot form cannot handle. Currently the guest must be contacted via phone, text, or email outside ChefFlow.

**Context ChefFlow has:**

- Guest-to-chef messaging on the guest portal (`sendGuestMessage`, text-based, line 1173 of portal-client.tsx)
- Private messaging threads in Circles (`lib/hub/private-message-actions.ts`) with full thread model
- Dietary confirmation form with severity, restrictions, allergies, and free-text notes (`/dietary-confirm/[token]`)
- Dietary conditions reference with `clientQuestions` field: pre-written clarifying questions per condition (e.g., "Is this an allergy or lactose intolerance?", "Can you tolerate baked milk products?")
- Dietary outreach email system (`lib/dietary-outreach/actions.ts`) that sends individual confirmation links
- `sendGuestMessage` exists but is guest-initiated only; there is no chef-to-guest message push on the guest portal

**Data source?** No. This is human-to-human conversation about personal dietary nuance.

**Client-collaborative angle:** The host often knows the guest's real restrictions better than the form data suggests. "Oh, Sarah says vegetarian but she eats sushi." The Circle is the natural surface for this, where the host can clarify on behalf of the guest.

**Physical reality:** Pre-event, asynchronous. Both text (messaging) and voice (phone) are valid. For most clarifications, text is sufficient. Voice is needed for complex or emotional situations (e.g., parent explaining a child's severe allergy history).

**Compounding:** High. Once the ambiguity is resolved, the clarified data should update the guest's dietary record permanently. "No nuts except coconut is fine" becomes a structured note that persists across future events.

**Solution design:**

- Add chef-to-guest messaging: allow the chef to send a question to the guest portal (notification via email with deep link back to portal)
- Auto-generate clarifying questions from `dietary-conditions.json` `clientQuestions` when a guest's submission triggers a known ambiguity pattern (e.g., "vegetarian" + "fish" in notes)
- Surface these as structured follow-up prompts on the dietary confirmation success page: "Your chef may want to know: [question]"
- When clarification is received, update the guest's dietary record with the resolved answer
- For Circle members, use the private chat thread for dietary clarification conversations

**Where it appears:**

- Guest portal message thread (needs chef-to-guest direction)
- `/dietary-confirm/[token]` success page (structured follow-up prompts)
- Dietary outreach email (follow-up link for clarification)
- Circle private chat for member-based clarification

**What remains as permanent exit:**
Complex or emotionally sensitive conversations (parent describing a child's anaphylaxis history, explaining a new diagnosis) may still happen by phone. The verbal/in-person channel for high-stakes health discussions is permanent.

**Priority:** High frequency (ambiguous dietary submissions are common) x Medium effort (chef-to-guest messaging, auto-generated clarifying questions) = P1
**Spec needed?** Yes. Chef-to-guest messaging on guest portal + auto-generated dietary clarification prompts from reference data.

---

## Batch Summary

| #   | Title                                                | Reclassified To                  | Spec Needed? |
| --- | ---------------------------------------------------- | -------------------------------- | ------------ |
| 29  | Ask a doctor about allergy seriousness               | Permanent                        | No           |
| 30  | Look up whether an ingredient is safe                | Reducible                        | Yes          |
| 31  | Check medication, pregnancy, or cannabis interaction | Permanent                        | No           |
| 32  | Ask household member what they can eat               | Reducible + Client-Collaborative | Yes          |
| 33  | Photograph ingredient labels for chef                | Reducible                        | No           |
| 34  | Clarify dietary ambiguity verbally                   | Partially Reducible              | Yes          |

### Key Findings

**ChefFlow's dietary infrastructure is strong on the chef side, weak on the guest side.** The reference database (`dietary-conditions.json`), safety check engine (`lib/dietary/safety-check.ts`), allergy severity tracking (`lib/dietary/allergy-severity-actions.ts`), kitchen briefing generator, cross-contamination risk checker, and dietary propagation pipeline are all built and functional. The gap is that almost none of this intelligence reaches the guest-facing token surfaces.

**Three specs warranted:**

1. Guest-facing allergen display on menu/catalog pickers (Scenario #30)
2. Household dietary collection on guest token surfaces (Scenario #32)
3. Chef-to-guest messaging + auto-generated dietary clarification prompts (Scenario #34)

**Two permanent exits correctly identified:**

- Medical diagnosis (#29) and medication/pregnancy/cannabis interaction (#31) are genuine medical questions ChefFlow should never answer. The product boundary is: capture the dietary outcome, never provide the medical advice.

**Existing infrastructure to leverage:**

- `lib/reference/data/dietary-conditions.json`: 30+ conditions with avoid lists, safe alternatives, cross-contact risks, client questions, common mistakes
- `lib/dietary/safety-check.ts`: `checkMenuSafety()` already computes per-guest dish conflicts
- `lib/hub/household-actions.ts`: Full household model with per-member dietary data
- `lib/dietary-outreach/actions.ts`: Email-based dietary collection pipeline
- `lib/hub/private-message-actions.ts`: Thread-based private messaging in Circles
