## Scenario #34: Watch a technique video

**Original classification:** Permanent
**Reclassified to:** Bridgeable (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need visual culinary instruction that recipe method text cannot carry: knife cuts, doneness cues, sauce texture, plating hand motion, equipment setup, or a chef-specific technique they have not performed before.
**Context ChefFlow has:**

- Staff role, assigned station, event date, event menu, guest count, chef notes, and event briefing context.
- Staff-visible recipe name, description, servings, prep time, cook time, and method text from `/staff-recipes`.
- Chef-side recipe step photos and slideshow capability, but not currently surfaced in the staff recipe card.
- Event dietary alerts and kitchen/site notes from tokenized staff briefings.

**Data source?** No. YouTube, training sites, and certification libraries are content destinations, not simple lookup APIs. ChefFlow can store chef-approved links, step photos, captions, and internal SOP clips as data, but broad technique browsing remains external.
**Client-collaborative angle:** Low. Clients rarely know culinary technique details, but Dinner Circle can collect event constraints that affect technique choice, such as plating preference, kitchen equipment limits, and guest-facing presentation expectations.
**Physical reality:** Technique learning should happen before service when possible. During prep, staff need glanceable step cards, embedded approved reference media, large controls, and hands-free audio/Remy summaries. Full video watching with messy hands is a poor mid-prep interface.
**Compounding:** High. Once a chef approves a video, records a step photo, or adds a house SOP, it becomes reusable training context for every future staff member, station, recipe, and event.

**Solution design:**

- Add chef-approved reference links and optional embedded media to recipe steps and station tasks.
- Surface chef-side step photos/slideshow inside staff recipe cards, scoped read-only.
- Add a "training reference" section per recipe/station with approved source, last reviewed date, and chef notes.
- Track which staff members viewed required media before an event when the reference is safety-critical or technique-critical.

**Where it appears:**

- `/staff-recipes` recipe card and station-filtered recipe view
- `/staff-portal/[id]` event briefing when a token assignment includes a station or technique-critical task
- Chef recipe detail/training setup surfaces where approved references are attached

**What remains as permanent exit:**
Staff may still leave for open-ended technique research, paid training portals, certification videos, or unfamiliar equipment demonstrations not yet approved by the chef.

**Priority:** Medium frequency x medium effort = medium-high because it compounds strongly, but not every event requires video technique support.
**Spec needed?** yes

## Scenario #35: Translate recipe or instruction text

**Original classification:** Reducible
**Reclassified to:** Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff cannot confidently execute recipe methods, task notes, or event instructions in the language they work fastest in, so they open Google Translate or a phone translation app.
**Context ChefFlow has:**

- Staff profile identity, role, email, assigned tasks, assigned stations, and staff-only authenticated routes.
- Recipe method text and recipe metadata in `/staff-recipes`.
- Token briefing fields for chef notes, special requests, kitchen notes, site notes, access instructions, dietary alerts, and task labels.
- Existing translation actions through `lib/translate/translate-actions.ts`, currently used by menu translation rather than staff recipes or task instructions.

**Data source?** Yes. Translation APIs such as LibreTranslate, Google Translate, Microsoft Translator, or an internal cached translation table can convert the text. ChefFlow already has the source text and should cache reviewed translations where safety matters.
**Client-collaborative angle:** Low. The client generally does not supply staff-language needs. The durable source should be staff language preference and chef-reviewed terminology, not client input.
**Physical reality:** Translation must be available before prep and in a large, stable, readable card during prep. Safety-critical phrases, allergens, temperatures, and ratios need bilingual display or chef-reviewed glossary protection, not a brittle live-only translation.
**Compounding:** Medium-high. Staff preferred language and reviewed recipe translations can be reused across future events, recipes, stations, and token briefings.

**Solution design:**

- Add a staff preferred-language field and a language switcher for staff recipes, tasks, and token briefings.
- Reuse the existing translation layer for recipe method, task label, task notes, chef notes, dietary alerts, and station notes.
- Cache per-recipe and per-event translations with source text hash, target language, reviewed status, and fallback-to-original behavior.
- Protect safety-critical text with a chef-reviewed glossary for allergens, temperatures, cook states, and common culinary verbs.

**Where it appears:**

- `/staff-recipes`
- `/staff-tasks` and `/staff-station`
- `/staff-portal/[id]` token briefing

**What remains as permanent exit:**
Staff may still leave for unsupported languages, speech/image translation, or independent confirmation of a translation when the meaning is safety-critical and not chef-reviewed.

**Priority:** Medium-high frequency x medium effort = high for multilingual teams and contractors.
**Spec needed?** yes

## Scenario #36: Ask about a vague prep step

**Original classification:** Reducible
**Reclassified to:** Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need the chef's intent for ambiguous instructions like "cook until right," "finish sauce," "season to taste," "plate clean," or "prep garnish." The operational gap is not recipe access; it is unresolved judgment and missing house standard.
**Context ChefFlow has:**

- Staff task title, description, due date/time, priority, event context, and notes.
- Staff recipe method text, station assignment, station clipboard component names, par levels, need-to-make values, waste fields, and notes.
- Token briefing chef notes, event special requests, kitchen/site notes, dietary alerts, and chef phone number.
- Chef-side staff briefing generation and print/copy flow for event-level instructions.

**Data source?** No. The missing source is human/chef operational judgment. After the chef answers, ChefFlow should turn the answer into internal recipe annotation, task clarification, or station SOP data.
**Client-collaborative angle:** Low to medium. Clients do not know prep technique, but they can clarify preferences that cause vague prep language, such as "less spicy," "very crispy," "family-style," or plating expectations through Dinner Circle before staff ask.
**Physical reality:** In prep, staff may have wet hands, gloves, heat, and noise. The right surface is a one-tap "question/blocker" with voice note/photo optional, large status feedback, and a chef answer that can be printed or read aloud by Remy.
**Compounding:** High. Every resolved clarification can become a reusable house note on the recipe, station component, task template, or event briefing.

**Solution design:**

- Add inline staff questions on recipe steps, staff tasks, and station clipboard rows.
- Route questions to the chef with event, staff member, station, recipe, and exact source text attached.
- Let chef resolve as one-time answer or promote to durable recipe/SOP clarification.
- Show resolved clarifications in staff recipe cards, token briefings, and print packets.

**Where it appears:**

- `/staff-recipes` recipe cards
- `/staff-station` clipboard rows and station shift controls
- Chef staff/task/event inbox surfaces for answering and promoting clarifications

**What remains as permanent exit:**
Live sensory judgment and urgent chef decisions may still require a phone call or in-person check, especially when food quality or guest safety is at risk.

**Priority:** High frequency x medium effort = top-tier staff reference priority.
**Spec needed?** yes

## Scenario #37: Find allergen training or safety policy

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need authoritative rules, training status, or policy instructions beyond the event's dietary alert list: allergen handling, cross-contamination procedure, food safety temperatures, ServSafe-style training, state rules, or internal escalation policy.
**Context ChefFlow has:**

- Staff event briefings show life-threatening allergies first and separate dietary restrictions.
- Chef-side staff briefing generation includes timeline, menu, allergies, kitchen notes, and print/copy support.
- Internal allergen constants, food safety quick-reference data, and chef-side `/reference/food-safety` table with FDA/USDA-sourced entries.
- Staff onboarding items for food handler certification, code of conduct, confidentiality, social media policy, W-9, and service agreement.
- Dinner Circle and guest dietary flows can collect allergies, dietary restrictions, and severity data before the event.

**Data source?** Mixed. FDA/USDA food safety tables, internal policy docs, allergen constants, and event dietary records are data sources ChefFlow can surface. External certification and legally authoritative training portals such as ServSafe or state health sites remain outside ChefFlow.
**Client-collaborative angle:** High for event-specific allergy intelligence. Clients and guests know dietary restrictions, allergy severity, and cross-contact sensitivity; Dinner Circle should collect that before the staff briefing is generated.
**Physical reality:** Staff need a pre-shift training record and a day-of quick reference. During service, this should be a red/yellow alert, printable one-page safety sheet, and large mobile reference, not a long policy PDF.
**Compounding:** High. Staff certifications, policy acknowledgments, allergy history, kitchen risks, and incident outcomes all become stronger over repeated events.

**Solution design:**

- Add a staff-facing safety and SOP library with food safety quick reference, allergen handling, escalation policy, and chef-specific policies.
- Attach required safety/SOP references to event briefings when dietary risk or station role requires them.
- Show staff certification and acknowledgment status in chef-side staff profiles and staff-side portal.
- Convert Dinner Circle allergy responses into staff-safe event risk cards and printable safety sheets.

**Where it appears:**

- `/staff-portal/[id]` dietary alert and event briefing
- Staff authenticated portal as a Safety/SOP reference surface
- Chef staff profile onboarding and event staff briefing surfaces

**What remains as permanent exit:**
External certification, state-specific legal interpretation, inspections, and official training completion remain outside ChefFlow.

**Priority:** Medium frequency x medium effort = high because safety severity is high even if lookup frequency is lower.
**Spec needed?** yes

## Scenario #38: Look up substitution guidance mid-prep

**Original classification:** Reducible
**Reclassified to:** Reducible + Client-Collaborative (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need to know what they are allowed to swap when an ingredient is missing, unsafe for a guest, poor quality, unavailable, or not matching the chef's intended result. The operational gap is approved decision support, not generic substitution ideas.
**Context ChefFlow has:**

- Recipes, recipe methods, event menu context, station components, and station clipboard state.
- Event allergies and dietary restrictions in token briefings.
- Guest/client dietary data from Dinner Circle and guest dietary collection.
- System substitution reference data, chef personal substitutions, substitution history, allergy conflict checks, ingredient prices, and shopping substitution logging.
- Staff recipe cards currently expose method text but not ingredient-level approved substitutions or recipe ingredient details.

**Data source?** Yes. Internal substitution rules, chef-approved `ingredient_substitutions`, recipe ingredients, event/guest allergy records, client dietary records, and substitution history should be the primary source. External recipe sites should not be the staff decision authority.
**Client-collaborative angle:** High when substitution is allergy, dietary, or preference driven. Dinner Circle should collect guest restrictions, severity, and preference notes so the safe substitution set is known before staff prep.
**Physical reality:** Mid-prep substitution help must be fast, large, and safe: "approved," "ask chef," or "do not use." Messy hands make search-heavy flows weak; voice lookup and printed approved swaps per recipe/station are better.
**Compounding:** High. Every chef-approved swap, rejected swap, allergy-safe path, and event-specific substitution becomes reusable operational memory.

**Solution design:**

- Show approved substitutions directly on staff recipe cards and station clipboard rows.
- Filter substitutions against event allergies, dietary restrictions, guest severity, chef preferences, and recipe intent.
- Add a one-tap "request substitution approval" flow when no approved swap exists.
- Promote approved one-off substitutions into chef-managed substitution rules after the event.

**Where it appears:**

- `/staff-recipes`
- `/staff-station`
- Chef `/culinary/substitutions` and event shopping/substitution history surfaces

**What remains as permanent exit:**
Unknown ingredients, vendor availability, urgent quality calls, and substitutions with no chef-approved rule may still require a chef call or external research.

**Priority:** High frequency x medium-high effort = high because it affects service speed, safety, and chef intent.
**Spec needed?** yes

## Scenario #39: Check company code of conduct or terms

**Original classification:** Reducible
**Reclassified to:** Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need to know the current company expectations, confidentiality rules, social media rules, legal terms, agreement status, or event-specific conduct expectations. Today that likely lives in public placeholder pages, HR docs, email, or chef-managed onboarding records.
**Context ChefFlow has:**

- Public `/staff-terms` page, but it is explicitly a draft placeholder and not attorney-reviewed.
- Staff onboarding checklist items for code of conduct, NDA/confidentiality, social media policy, client confidentiality briefing, W-9, and service agreement.
- Chef-side contractor agreement storage and status.
- Chef-side code-of-conduct acknowledgment state on event assignments, but the current action is chef-authenticated rather than staff self-acknowledgment.
- Staff auth, staff protected route policy, staff dashboard, staff schedule, staff tasks, staff recipes, staff station, and staff time surfaces.

**Data source?** Yes. The primary sources are internal legal/policy versions, staff onboarding records, contractor agreements, event assignment acknowledgment records, and future attorney-reviewed policy text. External legal review remains a platform/admin process, not a staff day-to-day destination.
**Client-collaborative angle:** Medium for event-specific house rules. Clients can provide home rules, photo/social preferences, confidentiality constraints, building rules, or household expectations through Dinner Circle or event intake; company terms themselves are not client-authored.
**Physical reality:** Policy review should be pre-shift and self-service, with versioned acknowledgments. Day-of staff need a short conduct summary and event-specific rules in the briefing, with full legal text one tap away.
**Compounding:** High. Versioned policy acknowledgment, staff onboarding state, agreement status, and client house rules create durable compliance memory across future events.

**Solution design:**

- Replace placeholder staff terms with versioned staff/contractor policy content and reviewed status.
- Add staff-side policy library and acknowledgment state for code of conduct, confidentiality, social media, safety, and service agreement documents.
- Move event COC acknowledgment to a staff-appropriate flow while preserving chef oversight.
- Attach client house rules and event-specific conduct notes to staff briefings and printable packets.

**Where it appears:**

- `/staff-terms`
- Authenticated staff portal policy/reference area
- Chef staff profile onboarding, contractor agreement, and event staff assignment surfaces

**What remains as permanent exit:**
Attorney review, contract negotiation, tax classification advice, and external document signing providers may remain outside ChefFlow, but reading current policies and recording acknowledgments should not.

**Priority:** Medium frequency x medium effort = medium-high because legal readiness and staff trust compound, even if day-of lookup frequency is lower than recipe clarification.
**Spec needed?** yes

## Batch Summary

| #   | Title                                   | Reclassified To                                           | Spec Needed? |
| --- | --------------------------------------- | --------------------------------------------------------- | ------------ |
| 34  | Watch a technique video                 | Bridgeable (NEEDS-DEVELOPER-REVIEW)                       | yes          |
| 35  | Translate recipe or instruction text    | Reducible (NEEDS-DEVELOPER-REVIEW)                        | yes          |
| 36  | Ask about a vague prep step             | Reducible (NEEDS-DEVELOPER-REVIEW)                        | yes          |
| 37  | Find allergen training or safety policy | Partially Reducible (NEEDS-DEVELOPER-REVIEW)              | yes          |
| 38  | Look up substitution guidance mid-prep  | Reducible + Client-Collaborative (NEEDS-DEVELOPER-REVIEW) | yes          |
| 39  | Check company code of conduct or terms  | Reducible (NEEDS-DEVELOPER-REVIEW)                        | yes          |
