# System Integrity Question Set: Onboarding-to-Production Readiness

> **Purpose:** Trace every piece of onboarding data to its downstream consumers. Does onboarding data actually light up the platform? Or are there dead wires?
> **Created:** 2026-04-18
> **Pre-build score:** 33.5/49 (68.4%)
> **Post-build score:** 44/49 (89.8%)

---

## A. Archetype Propagation (8 questions)

The chef selects an archetype during interview. Does the entire platform adapt?

| #   | Question                                                                                                                 | Pre-Build | Evidence                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Does the sidebar/nav adapt labels based on archetype? (meal-prep: "Prep Orders" not "Events")                            | YES       | `ActionBar` receives `archetype` prop from layout. `getArchetypeCopy()` maps "Events" to "Orders"/"Bookings"/"Reservations" per archetype              |
| A2  | Does Remy's system prompt include the chef's business archetype for conversational guidance?                             | YES       | `loadChefProfile()` now loads `archetype` from chefs table. `buildRemySystemPrompt()` injects "Business type: {archetype}" into BUSINESS CONTEXT block |
| A3  | Does the embeddable widget adapt copy/fields based on archetype?                                                         | NO        | `app/embed/` has zero archetype references. Generic inquiry form for all                                                                               |
| A4  | Do email templates use archetype-appropriate language? (e.g. "your order" not "your event" for meal-prep)                | NO        | All 40+ email templates use generic "event" language. No archetype reference in `lib/email/`                                                           |
| A5  | Does the event creation form adapt labels/fields by archetype?                                                           | YES       | Form title now uses `getArchetypeCopy()`: "Create Prep Order" for meal-prep, "Create Reservation" for restaurant, etc.                                 |
| A6  | Does the client portal adapt its language based on the chef's archetype?                                                 | NO        | `app/(client)/` has zero archetype references                                                                                                          |
| A7  | Do empty states across the app use archetype-appropriate language?                                                       | YES       | Events list empty state uses `getArchetypeCopy()`: "No prep orders yet" for meal-prep, "No bookings yet" for food-truck, etc. CTA label matches        |
| A8  | Does the public profile page show the archetype or archetype-derived labels? (e.g. "Private Chef" or "Catering Company") | YES       | `getPublicChefProfile()` now selects `archetype`. Public profile renders label below display name: "Private Chef", "Catering", etc.                    |

**A score: 5/8**

## B. Profile Data Downstream (7 questions)

Profile data (business_name, bio, cuisines, city, state, photo, service_area) is set during wizard. Where does it flow?

| #   | Question                                                                                                          | Pre-Build | Evidence                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Does the public profile page render all profile fields set during onboarding?                                     | YES       | `app/(public)/chef/[slug]/page.tsx` renders display_name, bio, tagline, profile_image_url, cuisines, social_links, website_url. Quality gate for incomplete profiles |
| B2  | Do quotes/proposals show the chef's business name and contact info from profile?                                  | YES       | `quick-proposal-actions.ts:124,168`, `generate-quote.ts:647,674`, `contract-generator.ts` all read `chefs.business_name, email, phone`                               |
| B3  | Do contracts include the chef's profile data (name, address, phone)?                                              | YES       | `contract-generator.ts` reads `full_name, business_name, email, phone` from chefs table                                                                              |
| B4  | Do email templates personalize with the chef's business name?                                                     | YES       | `email/notifications.ts` passes `chefName` to all 40+ templates. `sequence-actions.ts:502` replaces `{{chef_name}}`                                                  |
| B5  | Does the chef directory listing reflect onboarding profile data?                                                  | YES       | Onboarding triple-write in `persistProfileData()` writes to `chef_directory_listings` (business_name, cuisines, city, state, website_url, profile_photo_url)         |
| B6  | Does Remy know the chef's business name and location for context?                                                 | YES       | `loadChefProfile()` now selects `city, state`. System prompt includes "Location: {city}, {state}" in BUSINESS CONTEXT                                                |
| B7  | If profile is incomplete after onboarding skip, does the dashboard warn the chef that their public page is gated? | YES       | Dashboard now checks bio/tagline/display_name quality. Shows amber warning banner with "Complete Profile" link when public page would be gated                       |

**B score: 7/7**

## C. Pricing Propagation (6 questions)

Pricing config is set during wizard. Does it reach every surface that prices things?

| #   | Question                                                                           | Pre-Build | Evidence                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Does the quote engine use `chef_pricing_config` rates set during onboarding?       | YES       | `compute.ts:62-80` resolveConfig() reads chef_pricing_config. Falls back to constants.ts defaults if missing                                       |
| C2  | Does event cost estimation use onboarding pricing data?                            | YES       | `plate-cost-actions.ts` reads chef_pricing_config for overhead/labor rates                                                                         |
| C3  | If pricing was skipped, does the chef know their quotes use system defaults?       | YES       | Quote creation page now checks `hasAnyRatesConfigured`. Shows amber banner: "Your pricing rates haven't been configured yet" with "Set Rates" link |
| C4  | Does the pricing settings page show the values set during onboarding (not blank)?  | YES       | `settings/pricing/page.tsx` reads chef_pricing_config. Onboarding `completeStep('pricing')` persists to this table                                 |
| C5  | Does Remy reference the chef's actual pricing when discussing costs with the chef? | YES       | `inquiry-response-actions.ts:84` and `correspondence.ts` read chef_pricing_config for AI-drafted pricing responses                                 |
| C6  | Does the public profile show pricing tiers/ranges if the chef configured them?     | YES       | `app/(public)/chef/[slug]/page.tsx:279` shows `booking_base_price_cents` as "Starting at $X"                                                       |

**C score: 6/6**

## D. Portfolio and Menu Downstream (5 questions)

Portfolio photos and first menu are created during wizard. Where do they appear?

| #   | Question                                                                             | Pre-Build | Evidence                                                                                                             |
| --- | ------------------------------------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------- |
| D1  | Do portfolio photos from onboarding appear on the public profile page?               | YES       | `app/(public)/chef/[slug]/page.tsx:236` calls `getPublicPortfolio(chef.id)`. Photos render in `ChefCredentialsPanel` |
| D2  | Do portfolio photos appear in quote/proposal presentations?                          | YES       | `proposal-builder-actions.ts:21,65` has `'photos'` section type. Proposals can include photo sections                |
| D3  | Does the first menu created during onboarding appear in the menu library?            | YES       | Menus table is universal. Onboarding menu is indistinguishable from any other menu                                   |
| D4  | Can the chef find and edit their onboarding menu from the normal menu management UI? | YES       | Menu management at `/culinary/menus` reads all menus for the tenant                                                  |
| D5  | Does the embeddable widget display portfolio photos or menu items?                   | NO        | `app/embed/` has zero portfolio/photo/menu references. Widget is inquiry-only                                        |

**D score: 4/5**

## E. Gmail and Communication Readiness (5 questions)

Gmail connection is set during wizard. Does the communication pipeline work?

| #   | Question                                                                                                | Pre-Build | Evidence                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | After connecting Gmail in wizard, does inbox sync actually start?                                       | YES       | `gmail/sync.ts` processes emails into inquiries. OAuth callback triggers sync state                                                                               |
| E2  | Do inquiries from Gmail appear in the inquiry pipeline?                                                 | YES       | Gmail sync creates inquiry records. `inquiries/page.tsx` shows them                                                                                               |
| E3  | If Gmail was skipped, is the chef prompted to connect it from a natural touchpoint (not just settings)? | YES       | `inbox/page.tsx:69-71` shows "Gmail is disconnected" banner. `inquiries/page.tsx:240` shows connection status. `marketplace/page.tsx:344` prompts "Connect Gmail" |
| E4  | Does the communication preferences page reflect the Gmail connection state?                             | YES       | `settings/integrations/page.tsx` shows Gmail connection status                                                                                                    |
| E5  | Does Remy know whether the chef has Gmail connected and adjust suggestions accordingly?                 | YES       | `remy-context.ts:157` calls `loadEmailDigest(tenantId)`. Remy has email context when connected                                                                    |

**E score: 5/5**

## F. First-Session Experience (8 questions)

What does a brand-new chef see immediately after onboarding?

| #   | Question                                                                                | Pre-Build | Evidence                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Does the dashboard show onboarding progress/checklist until phases are complete?        | YES       | `OnboardingBanner` + `OnboardingChecklistWidget` on dashboard. Shows progress and "Continue Setup" CTA                                                                              |
| F2  | Does the "Today's Schedule" card have a CTA to create the first event when empty?       | YES       | Empty state now shows "Create your first one to get started" with "Create Event" link to `/events/new` when no events exist. Falls back to "View Calendar" when future events exist |
| F3  | Does Remy deliver archetype-specific first-session guidance? (not just generic welcome) | YES       | `getArchetypeWelcome()` in `remy-personality-engine.ts` delivers tailored welcome per archetype (6 variants + default). "Your catering command center is set up" for caterers, etc. |
| F4  | Are all dashboard metrics honest zeros (not broken/error states) for a new chef?        | YES       | Hero metrics show `$0`, `0 events`, `0 inquiries`. Accurate zeros, not error states. Below fold in collapsed panel                                                                  |
| F5  | Does the priority queue show relevant first-time tasks?                                 | YES       | Priority queue shows "All caught up. Nothing urgent right now." with green banner. ChecklistWidget provides first-time tasks                                                        |
| F6  | Can a new chef create a quote immediately without hitting a blocker?                    | YES       | Manual quote creation at `createQuote()` needs only a dollar amount. Pricing engine falls back to defaults                                                                          |
| F7  | Can a new chef create an event immediately without hitting a blocker?                   | YES       | Event form has zero hard dependencies on onboarding data. Empty client list handled gracefully                                                                                      |
| F8  | Does the dashboard primary CTA button match the archetype?                              | YES       | `getDashboardPrimaryAction()` in `ui-copy.ts:11-18` maps: meal-prep="New Prep Order", restaurant="New Reservation", etc.                                                            |

**F score: 8/8**

## G. Imported Data Reaches Production (6 questions)

Clients, recipes, staff, and loyalty config imported during hub. Do they work in production features?

| #   | Question                                                                                                   | Pre-Build | Evidence                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| G1  | Do imported clients appear in the client picker when creating events/quotes?                               | YES       | Clients table is universal. `getClients()` returns all tenant clients regardless of import source                             |
| G2  | Do imported client dietary restrictions and allergies flow into event planning and Remy context?           | YES       | `dietary-conflict-actions.ts:119` reads event dietary_restrictions/allergies. `remy-context.ts:566` loads client dietary data |
| G3  | Do imported recipes appear in the recipe library and menu builder?                                         | YES       | Recipes table is universal. `getRecipes()` returns all tenant recipes                                                         |
| G4  | Do imported staff members appear in the staff assignment picker for events?                                | YES       | `staff_members` table is universal. `listStaffMembers()` returns all tenant staff                                             |
| G5  | Does the loyalty config set during hub activate the loyalty system on the client portal?                   | YES       | `loyalty/actions.ts` reads `loyalty_config` for the tenant. `app/(client)/my-rewards/page.tsx` shows client rewards           |
| G6  | Does the portal invitation link from client import (D1 in cohesion set) actually deliver a working portal? | YES       | `generateOnboardingLink()` creates tokenized URL. Client onboarding portal is a separate working system                       |

**G score: 6/6**

## H. Cross-System Awareness (5 questions)

Do systems that seem unrelated actually share onboarding data?

| #   | Question                                                                                                | Pre-Build | Evidence                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Does the chef network profile use onboarding profile data (photo, bio, cuisines, location)?             | YES       | `network/actions.ts` reads display_name, business_name, bio, profile_image_url, city, state for chef profiles                                            |
| H2  | Does the analytics system know the chef's start date (onboarding_completed_at) for growth calculations? | N/A       | Analytics uses record `created_at` dates for period calculations. No need for a separate "start date" concept                                            |
| H3  | Does the tax/finance system use the chef's location (city, state) from onboarding for tax jurisdiction? | NO        | Tax center has no reference to chef location from `chefs.city/state`. Tax jurisdiction not auto-populated                                                |
| H4  | Does the ingredient sourcing system use the chef's location for regional pricing?                       | YES       | `persistProfileData()` now writes city/state to both `chefs` table AND `chef_preferences.home_city/home_state`. Web sourcing reads from chef_preferences |
| H5  | Does the calendar/availability system know the chef's timezone from onboarding location?                | N/A       | Calendar uses browser/system timezone. No timezone field in onboarding. Not a gap: timezone detection is automatic                                       |

**H score: 3/4 (excluding N/A)**

---

## Scoring

| Domain                         | Score  | Max    | Details                                                                                                       |
| ------------------------------ | ------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| A. Archetype Propagation       | 5      | 8      | Nav labels, form titles, empty states, Remy prompt, public profile. Widget/emails/client portal still generic |
| B. Profile Data Downstream     | 7      | 7      | Full marks. Location + profile-gated warning added                                                            |
| C. Pricing Propagation         | 6      | 6      | Full marks. Default pricing warning on quote creation                                                         |
| D. Portfolio and Menu          | 4      | 5      | Strong. Widget doesn't show portfolio/menu                                                                    |
| E. Gmail and Communication     | 5      | 5      | Full marks                                                                                                    |
| F. First-Session Experience    | 8      | 8      | Full marks. Event CTA + archetype-specific Remy greeting                                                      |
| G. Imported Data in Production | 6      | 6      | Full marks                                                                                                    |
| H. Cross-System Awareness      | 3      | 4      | Location bridge built. Tax jurisdiction still manual                                                          |
| **TOTAL**                      | **44** | **49** | **89.8% (excluding 2 N/A)**                                                                                   |

---

## Gap Analysis: What to Fix

### High Leverage (benefits ALL users) -- ALL FIXED

1. ~~**A2 - Remy archetype awareness.**~~ DONE. Archetype + location in system prompt BUSINESS CONTEXT block.
2. ~~**H4 - Location bridge.**~~ DONE. `persistProfileData()` writes city/state to chef_preferences.
3. ~~**B6 - Remy location context.**~~ DONE. `loadChefProfile()` selects city, state, archetype.
4. ~~**B7 - Public profile gated warning.**~~ DONE. Dashboard amber banner when profile would show "Coming Soon".
5. ~~**C3 - Default pricing warning.**~~ DONE. Quote creation page shows warning when no rates configured.
6. ~~**F2 - Schedule empty state CTA.**~~ DONE. "Create Event" CTA when zero events exist.
7. ~~**F3 - Archetype-specific Remy welcome.**~~ DONE. 6 archetype variants in `getArchetypeWelcome()`.
8. ~~**A8 - Public profile archetype label.**~~ DONE. Archetype label rendered below display name on public page.

### Medium Leverage (benefits specific archetypes) -- ALL FIXED

9. ~~**A1 - Nav archetype labels.**~~ DONE. ActionBar renders archetype-specific "Events" label via `getArchetypeCopy()`.
10. ~~**A5 - Event form archetype labels.**~~ DONE. "Create Prep Order" / "Create Reservation" / "Create Booking" etc.
11. ~~**A7 - Empty state archetype language.**~~ DONE. Events list empty state uses archetype-aware copy.

### Low Leverage (nice-to-have)

12. **A3 - Widget archetype adaptation.** Embed widget adapts inquiry form copy.
13. **A4 - Email archetype language.** "Your order" not "your event" for meal-prep.
14. **A6 - Client portal archetype language.** Client-facing language matches chef type.
15. **D5 - Widget portfolio/menu.** Embed widget shows portfolio photos.
16. **H3 - Tax jurisdiction from location.** Auto-populate tax jurisdiction from onboarding location.
