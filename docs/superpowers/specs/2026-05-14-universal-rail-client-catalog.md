# Universal Rail: Client Role - Complete Item Catalog

> **Date:** 2026-05-14
> **Role:** `client` (signed-in, has account, books chefs, plans events)
> **Scope:** Every item type that can appear on the client Universal Rail
> **Architecture:** Extends public discovery rail (23 types) with 115 operational/lifecycle item types

---

## Table of Contents

1. [Inherited: Public Discovery Items](#1-inherited-public-discovery-items)
2. [Event Lifecycle](#2-event-lifecycle)
3. [Event Completion Gaps](#3-event-completion-gaps)
4. [Quote Lifecycle](#4-quote-lifecycle)
5. [Inquiry Lifecycle](#5-inquiry-lifecycle)
6. [Communication Signals](#6-communication-signals)
7. [Payment Signals](#7-payment-signals)
8. [Dietary Profile](#8-dietary-profile)
9. [Household Members](#9-household-members)
10. [Dinner Circle Activity](#10-dinner-circle-activity)
11. [Saved Chefs & Items](#11-saved-chefs--items)
12. [Chef Recommendations](#12-chef-recommendations)
13. [Seasonal Opportunities](#13-seasonal-opportunities)
14. [Gift Cards](#14-gift-cards)
15. [Referral Rewards](#15-referral-rewards)
16. [Review Prompts](#16-review-prompts)
17. [Tip Prompts](#17-tip-prompts)
18. [Rebook Suggestions](#18-rebook-suggestions)
19. [Budget & Spending](#19-budget--spending)
20. [Preference Evolution](#20-preference-evolution)
21. [Onboarding Gaps](#21-onboarding-gaps)
22. [Calendar Integration](#22-calendar-integration)
23. [Special Dates](#23-special-dates)
24. [Recipe Collection](#24-recipe-collection)
25. [Meal Planning](#25-meal-planning)
26. [Recurring Event Reminders](#26-recurring-event-reminders)
27. [Client Passport](#27-client-passport)
28. [Discovery Preference Prompts](#28-discovery-preference-prompts)
29. [Cross-Sell & Upsell](#29-cross-sell--upsell)
30. [Loyalty & Rewards](#30-loyalty--rewards)
31. [Hub & Social](#31-hub--social)
32. [Safety & Compliance](#32-safety--compliance)
33. [Real-Time Event Signals](#33-real-time-event-signals)
34. [Guest Management Signals](#34-guest-management-signals)
35. [Payment Disputes & Failures](#35-payment-disputes--failures)
36. [Ticketed Events & Pop-Ups](#36-ticketed-events--pop-ups)
37. [Food Social & Opportunity Marketplace](#37-food-social--opportunity-marketplace)
38. [Meal Requests & Fulfillment](#38-meal-requests--fulfillment)
39. [Ingredient Substitutions](#39-ingredient-substitutions)
40. [Chef Dual-Role Toggle](#40-chef-dual-role-toggle)
41. [Remy AI Integration](#41-remy-ai-integration)
42. [Discovery Shortlist & Compare](#42-discovery-shortlist--compare)
43. [Search History & Pinned](#43-search-history--pinned)
44. [Account Health & Security](#44-account-health--security)
45. [Cancellation & Refund Timeline](#45-cancellation--refund-timeline)
46. [Additional Social & Media](#46-additional-social--media)
47. [Scoring & Assembly Rules](#47-scoring--assembly-rules)

---

## Legend

| Field                 | Description                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **baseUrgency**       | 0-100 static score before context modifiers                                                                |
| **urgencyDecayFn**    | `deadline` (exponential near date), `linear` (steady decay), `none` (static), `step` (jumps at thresholds) |
| **pageAffinity**      | Routes where this item gets boosted                                                                        |
| **pageAffinityBoost** | 0-50 added when on an affinity page                                                                        |
| **presentation**      | `pill`, `card`, `badge`, `alert`, `progress`, `story`, `banner`                                            |
| **clickAction**       | `navigate`, `toggle_filter`, `expand_inline`, `quick_action`, `open_modal`                                 |
| **privacy**           | `private`, `chef_visible`, `household_visible`, `event_visible`                                            |

---

## 1. Inherited: Public Discovery Items

Clients inherit all 23 public discovery item types. These items gain **personalization boosts** from client history (past events, saved chefs, dietary profile, taste passport). The base contracts are defined in `rail-contract-registry.ts`; client-specific modifications noted below.

### 1.1 Taste Lane Items (10 types)

#### DISC-001: Cuisine

| Property              | Value                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **type**              | `client_cuisine`                                                                                                 |
| **category**          | Discovery > Taste                                                                                                |
| **label**             | `{cuisineName}` (e.g. "Thai", "Italian")                                                                         |
| **sublabel**          | `"{n} chefs near you"` or `"You loved this at {lastEventName}"`                                                  |
| **icon**              | Cuisine-specific from 46-key icon map (e.g. `taco`, `sushi`, `pasta`)                                            |
| **presentation**      | `pill` (default), `visual_card` (when image available)                                                           |
| **baseUrgency**       | 15                                                                                                               |
| **urgencyDecayFn**    | `none`                                                                                                           |
| **pageAffinity**      | `/chefs`, `/my-preferences/discovery`, `/my-passport`                                                            |
| **pageAffinityBoost** | 10                                                                                                               |
| **hoverAction**       | Preview: top 3 chefs for this cuisine, last event date, preference strength                                      |
| **clickAction**       | `toggle_filter`                                                                                                  |
| **click reveals**     | Filters chef search to this cuisine                                                                              |
| **href**              | `/eat?cuisine={slug}`                                                                                            |
| **dismissable**       | yes                                                                                                              |
| **expandable**        | yes: sub-cuisines (e.g. "Italian" expands to "Tuscan", "Sicilian", "Roman")                                      |
| **maxImpressions**    | 50                                                                                                               |
| **cooldownMinutes**   | 240 (4hr)                                                                                                        |
| **expiresAt**         | Never (evergreen)                                                                                                |
| **scoring**           | +3 if ordered this cuisine in past 90d; +5 if saved chef serves it; -2 if explicitly hidden; +1.4 seasonal match |
| **interactions**      | Boosts related `food_type` and `ingredient` items from same cuisine family                                       |
| **dataSource**        | `cuisines` constant registry (400+ entries), `discovery_interactions`, `events`                                  |
| **privacy**           | `private`                                                                                                        |

#### DISC-002: Food Type

| Property              | Value                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------- |
| **type**              | `client_food_type`                                                                      |
| **category**          | Discovery > Taste                                                                       |
| **label**             | `{foodTypeName}` (e.g. "Tacos", "Ramen", "Charcuterie Board")                           |
| **sublabel**          | `"Popular for {occasion}"` or `"You ordered this {n} times"`                            |
| **icon**              | Food-specific (e.g. `ramen`, `taco`, `burger`)                                          |
| **presentation**      | `pill`                                                                                  |
| **baseUrgency**       | 12                                                                                      |
| **urgencyDecayFn**    | `none`                                                                                  |
| **pageAffinity**      | `/chefs`, `/my-meals`, `/my-recipes`                                                    |
| **pageAffinityBoost** | 8                                                                                       |
| **hoverAction**       | Preview: example dishes, chefs who specialize, price range                              |
| **clickAction**       | `toggle_filter`                                                                         |
| **click reveals**     | Filters to chefs/menus with this food type                                              |
| **href**              | `/eat?craving={slug}`                                                                   |
| **dismissable**       | yes                                                                                     |
| **expandable**        | no                                                                                      |
| **maxImpressions**    | 40                                                                                      |
| **cooldownMinutes**   | 240                                                                                     |
| **expiresAt**         | Never                                                                                   |
| **scoring**           | +3 per past order; +2 if in taste passport `explicitDishes[]`; seasonal boost in-season |
| **interactions**      | Pairs with `cuisine` and `ingredient` items                                             |
| **dataSource**        | `discovery_interactions`, `events`, taste passport                                      |
| **privacy**           | `private`                                                                               |

#### DISC-003: Craving

| Property              | Value                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **type**              | `client_craving`                                                                                                     |
| **category**          | Discovery > Taste                                                                                                    |
| **label**             | `"{cravingText}"` (e.g. "Something spicy", "Comfort food tonight")                                                   |
| **sublabel**          | `"Based on your favorites"` or `"Trending near you"`                                                                 |
| **icon**              | `flame` (spicy), `comfort` (cozy), `spark` (adventurous)                                                             |
| **presentation**      | `pill`                                                                                                               |
| **baseUrgency**       | 20                                                                                                                   |
| **urgencyDecayFn**    | `linear` (decays 5/day)                                                                                              |
| **pageAffinity**      | `/chefs`, `/book-now`                                                                                                |
| **pageAffinityBoost** | 12                                                                                                                   |
| **hoverAction**       | Preview: 3 matching chefs/menus                                                                                      |
| **clickAction**       | `toggle_filter`                                                                                                      |
| **click reveals**     | Filtered chef results matching craving                                                                               |
| **href**              | `/eat?craving={slug}`                                                                                                |
| **dismissable**       | yes                                                                                                                  |
| **expandable**        | no                                                                                                                   |
| **maxImpressions**    | 20                                                                                                                   |
| **cooldownMinutes**   | 480                                                                                                                  |
| **expiresAt**         | 7 days after generation                                                                                              |
| **scoring**           | +4 if matches recent search; +2 if matches taste passport; contextual time-of-day boost (dinner cravings peak 4-7pm) |
| **interactions**      | Suppresses conflicting dietary items                                                                                 |
| **dataSource**        | `discovery_interactions`, search history, Remy chat signals                                                          |
| **privacy**           | `private`                                                                                                            |

#### DISC-004: Dietary

| Property              | Value                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| **type**              | `client_dietary`                                                                                        |
| **category**          | Discovery > Taste                                                                                       |
| **label**             | `{dietaryLabel}` (e.g. "Gluten-Free", "Vegan", "Halal")                                                 |
| **sublabel**          | `"{n} chefs certified"` or `"Safe for {memberName}"`                                                    |
| **icon**              | `leaf` (vegan/vegetarian), `plant` (plant-based), diet-specific                                         |
| **presentation**      | `badge`                                                                                                 |
| **baseUrgency**       | 25 (higher: safety-critical)                                                                            |
| **urgencyDecayFn**    | `none`                                                                                                  |
| **pageAffinity**      | `/chefs`, `/my-dietary`, `/my-household`, `/book-now`                                                   |
| **pageAffinityBoost** | 15                                                                                                      |
| **hoverAction**       | Preview: trust level (verified/declared), household members affected, safe chefs count                  |
| **clickAction**       | `toggle_filter`                                                                                         |
| **click reveals**     | Filters to chefs who accommodate this restriction                                                       |
| **href**              | `/eat?dietary={slug}`                                                                                   |
| **dismissable**       | no (if allergy/restriction polarity)                                                                    |
| **expandable**        | yes: shows household members with this restriction                                                      |
| **maxImpressions**    | unlimited (safety)                                                                                      |
| **cooldownMinutes**   | 0 (always shown if active)                                                                              |
| **expiresAt**         | Never (profile-linked)                                                                                  |
| **scoring**           | +10 if allergy polarity; +5 if restriction; +2 if preference; always pinned if `trust_level = verified` |
| **interactions**      | Suppresses items with conflicting ingredients; boosts compatible cuisine/food_type items                |
| **dataSource**        | `discovery_profile_items`, `client_passports`, household dietary profiles                               |
| **privacy**           | `chef_visible` (allergens shared with booked chefs)                                                     |

#### DISC-005: Mood

| Property              | Value                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **type**              | `client_mood`                                                                                 |
| **category**          | Discovery > Taste                                                                             |
| **label**             | `"{moodLabel}"` (e.g. "Cozy night in", "Adventurous", "Celebratory")                          |
| **sublabel**          | `"Perfect for tonight"` or `"Try something new"`                                              |
| **icon**              | `comfort` (cozy), `champagne` (celebratory), `spark` (adventurous)                            |
| **presentation**      | `pill`                                                                                        |
| **baseUrgency**       | 10                                                                                            |
| **urgencyDecayFn**    | `linear` (decays 3/day)                                                                       |
| **pageAffinity**      | `/chefs`, `/book-now`                                                                         |
| **pageAffinityBoost** | 8                                                                                             |
| **hoverAction**       | Preview: matching service styles and example menus                                            |
| **clickAction**       | `toggle_filter`                                                                               |
| **click reveals**     | Mood-filtered chef search                                                                     |
| **href**              | `/eat?mood={slug}`                                                                            |
| **dismissable**       | yes                                                                                           |
| **expandable**        | no                                                                                            |
| **maxImpressions**    | 15                                                                                            |
| **cooldownMinutes**   | 360                                                                                           |
| **expiresAt**         | 3 days                                                                                        |
| **scoring**           | +3 if matches upcoming event occasion; time-of-day contextual (evening moods boost after 5pm) |
| **interactions**      | Pairs with `occasion` and `vibe` items                                                        |
| **dataSource**        | Computed from time, weather (future), recent activity                                         |
| **privacy**           | `private`                                                                                     |

#### DISC-006: Seasonal

| Property              | Value                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| **type**              | `client_seasonal`                                                                                 |
| **category**          | Discovery > Taste                                                                                 |
| **label**             | `"{seasonalLabel}"` (e.g. "Summer corn is peaking", "Truffle season")                             |
| **sublabel**          | `"Available {timeWindow}"` or `"Chefs featuring this now"`                                        |
| **icon**              | Season-specific (`leaf` fall, `flame` summer grill, etc.)                                         |
| **presentation**      | `story`                                                                                           |
| **baseUrgency**       | 18                                                                                                |
| **urgencyDecayFn**    | `deadline` (peaks mid-season, decays at end)                                                      |
| **pageAffinity**      | `/chefs`, `/my-recipes`, `/my-meals`                                                              |
| **pageAffinityBoost** | 10                                                                                                |
| **hoverAction**       | Preview: peak window dates, chefs featuring seasonal menus, example dishes                        |
| **clickAction**       | `navigate`                                                                                        |
| **click reveals**     | Seasonal collection page                                                                          |
| **href**              | `/eat?seasonal={slug}`                                                                            |
| **dismissable**       | yes                                                                                               |
| **expandable**        | yes: seasonal ingredient list, dishes, chefs                                                      |
| **maxImpressions**    | 30                                                                                                |
| **cooldownMinutes**   | 720                                                                                               |
| **expiresAt**         | End of season window                                                                              |
| **scoring**           | +1.4 editorial boost; +3 if client has ordered seasonal items before; peak-window multiplier 1.5x |
| **interactions**      | Boosts matching `ingredient` and `cuisine` items                                                  |
| **dataSource**        | PIE seasonal scores (260K entries), editorial calendar                                            |
| **privacy**           | `private`                                                                                         |

#### DISC-007: Culinary Signal

| Property              | Value                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| **type**              | `client_culinary_signal`                                                                 |
| **category**          | Discovery > Taste                                                                        |
| **label**             | `"{signalLabel}"` (e.g. "Fish sauce lovers", "Fermentation fans")                        |
| **sublabel**          | `"A flavor thread you follow"`                                                           |
| **icon**              | `knife`, `flame`, ingredient-specific                                                    |
| **presentation**      | `pill`                                                                                   |
| **baseUrgency**       | 8                                                                                        |
| **urgencyDecayFn**    | `none`                                                                                   |
| **pageAffinity**      | `/my-preferences/discovery`, `/my-recipes`                                               |
| **pageAffinityBoost** | 6                                                                                        |
| **hoverAction**       | Preview: related cuisines, ingredients, chefs who use this technique                     |
| **clickAction**       | `toggle_filter`                                                                          |
| **click reveals**     | Filtered results by culinary signal                                                      |
| **href**              | `/eat?signal={slug}`                                                                     |
| **dismissable**       | yes                                                                                      |
| **expandable**        | no                                                                                       |
| **maxImpressions**    | 25                                                                                       |
| **cooldownMinutes**   | 480                                                                                      |
| **expiresAt**         | Never                                                                                    |
| **scoring**           | +1.4 editorial boost; derived from repeated ingredient/technique patterns in past orders |
| **interactions**      | Feeds into preference evolution tracking                                                 |
| **dataSource**        | `discovery_interactions`, recipe/menu history analysis                                   |
| **privacy**           | `private`                                                                                |

#### DISC-008: Technique

| Property              | Value                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| **type**              | `client_technique`                                                               |
| **category**          | Discovery > Taste                                                                |
| **label**             | `"{techniqueName}"` (e.g. "Wood-Fired", "Sous Vide", "Live Fire")                |
| **sublabel**          | `"{n} chefs specialize"`                                                         |
| **icon**              | `flame` (fire techniques), `knife` (prep techniques)                             |
| **presentation**      | `pill`                                                                           |
| **baseUrgency**       | 8                                                                                |
| **urgencyDecayFn**    | `none`                                                                           |
| **pageAffinity**      | `/chefs`, `/my-preferences/discovery`                                            |
| **pageAffinityBoost** | 6                                                                                |
| **hoverAction**       | Preview: what this technique means, example dishes, matching chefs               |
| **clickAction**       | `toggle_filter`                                                                  |
| **click reveals**     | Chefs filtered by technique specialty                                            |
| **href**              | `/eat?technique={slug}`                                                          |
| **dismissable**       | yes                                                                              |
| **expandable**        | no                                                                               |
| **maxImpressions**    | 25                                                                               |
| **cooldownMinutes**   | 480                                                                              |
| **expiresAt**         | Never                                                                            |
| **scoring**           | +2 if client has experienced this technique; +1 novelty injection if never tried |
| **interactions**      | Pairs with `cuisine` items that commonly use the technique                       |
| **dataSource**        | Chef profiles, menu descriptions                                                 |
| **privacy**           | `private`                                                                        |

#### DISC-009: Ingredient

| Property              | Value                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------- |
| **type**              | `client_ingredient`                                                                    |
| **category**          | Discovery > Taste                                                                      |
| **label**             | `"{ingredientName}"` (e.g. "Truffle", "Wagyu", "Heirloom Tomato")                      |
| **sublabel**          | `"In season now"` or `"Featured by {n} chefs"`                                         |
| **icon**              | Ingredient-specific from image map                                                     |
| **presentation**      | `visual_card` (premium ingredients), `pill` (common)                                   |
| **baseUrgency**       | 10                                                                                     |
| **urgencyDecayFn**    | `deadline` (seasonal), `none` (year-round)                                             |
| **pageAffinity**      | `/my-recipes`, `/my-meals`, `/chefs`                                                   |
| **pageAffinityBoost** | 8                                                                                      |
| **hoverAction**       | Preview: season window, price range (PIE data), dishes featuring it, compatible diets  |
| **clickAction**       | `toggle_filter`                                                                        |
| **click reveals**     | Menus/chefs featuring this ingredient                                                  |
| **href**              | `/eat?ingredient={slug}`                                                               |
| **dismissable**       | yes                                                                                    |
| **expandable**        | yes: related ingredients, substitutions                                                |
| **maxImpressions**    | 30                                                                                     |
| **cooldownMinutes**   | 480                                                                                    |
| **expiresAt**         | End of season (seasonal) or never (staples)                                            |
| **scoring**           | +3 if in taste passport; +2 if seasonal peak; -10 if allergen conflict (hard suppress) |
| **interactions**      | Hard-suppressed by conflicting `dietary` allergy items                                 |
| **dataSource**        | PIE ingredient database, seasonal scores, `discovery_profile_items`                    |
| **privacy**           | `private`                                                                              |

#### DISC-010: Vibe

| Property              | Value                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| **type**              | `client_vibe`                                                                |
| **category**          | Discovery > Taste                                                            |
| **label**             | `"{vibeLabel}"` (e.g. "Romantic", "Elevated Casual", "Rustic Farm")          |
| **sublabel**          | `"Match your style"`                                                         |
| **icon**              | `champagne` (elegant), `comfort` (cozy), `crown` (fine dining)               |
| **presentation**      | `visual_card`                                                                |
| **baseUrgency**       | 8                                                                            |
| **urgencyDecayFn**    | `none`                                                                       |
| **pageAffinity**      | `/book-now`, `/chefs`                                                        |
| **pageAffinityBoost** | 8                                                                            |
| **hoverAction**       | Preview: what this vibe means, example settings, price range, matching chefs |
| **clickAction**       | `toggle_filter`                                                              |
| **click reveals**     | Vibe-filtered chef search                                                    |
| **href**              | `/eat?vibe={slug}`                                                           |
| **dismissable**       | yes                                                                          |
| **expandable**        | no                                                                           |
| **maxImpressions**    | 20                                                                           |
| **cooldownMinutes**   | 360                                                                          |
| **expiresAt**         | Never                                                                        |
| **scoring**           | +3 if matches past event vibes; +2 if matches upcoming occasion              |
| **interactions**      | Pairs with `occasion` and `mood` items                                       |
| **dataSource**        | `client_passports.service_style`, past event data                            |
| **privacy**           | `private`                                                                    |

### 1.2 Occasion Lane Items (8 types)

#### DISC-011: Service

| Property              | Value                                                                                |
| --------------------- | ------------------------------------------------------------------------------------ |
| **type**              | `client_service`                                                                     |
| **category**          | Discovery > Occasion                                                                 |
| **label**             | `"{serviceType}"` (e.g. "Private Dinner", "Meal Prep", "Cooking Class")              |
| **sublabel**          | `"Your most booked"` or `"{n} available near you"`                                   |
| **icon**              | Service-specific (`chef`, `concierge`, `dining`)                                     |
| **presentation**      | `pill`                                                                               |
| **baseUrgency**       | 15                                                                                   |
| **urgencyDecayFn**    | `none`                                                                               |
| **pageAffinity**      | `/book-now`, `/chefs`, `/browse-dates`                                               |
| **pageAffinityBoost** | 12                                                                                   |
| **hoverAction**       | Preview: service description, typical price range, top chefs                         |
| **clickAction**       | `toggle_filter`                                                                      |
| **click reveals**     | Service-filtered chef search                                                         |
| **href**              | `/eat?service={slug}`                                                                |
| **dismissable**       | yes                                                                                  |
| **expandable**        | yes: sub-formats (e.g. "Private Dinner" -> "Plated", "Family Style", "Tasting Menu") |
| **maxImpressions**    | 40                                                                                   |
| **cooldownMinutes**   | 240                                                                                  |
| **expiresAt**         | Never                                                                                |
| **scoring**           | +5 if client's most-booked service type; +3 if matches passport `service_style`      |
| **interactions**      | Boosts compatible `occasion` and `price` items                                       |
| **dataSource**        | `events`, `client_passports`, chef availability                                      |
| **privacy**           | `private`                                                                            |

#### DISC-012: Occasion

| Property              | Value                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **type**              | `client_occasion`                                                                                                     |
| **category**          | Discovery > Occasion                                                                                                  |
| **label**             | `"{occasionName}"` (e.g. "Birthday Dinner", "Date Night", "Team Lunch")                                               |
| **sublabel**          | `"Coming up: {date}"` or `"Plan ahead"`                                                                               |
| **icon**              | `confetti` (birthday), `champagne` (anniversary), `cheers` (celebration), `family` (family), `graduation` (milestone) |
| **presentation**      | `visual_card`                                                                                                         |
| **baseUrgency**       | 20                                                                                                                    |
| **urgencyDecayFn**    | `deadline` (if tied to a known date)                                                                                  |
| **pageAffinity**      | `/book-now`, `/browse-dates`, `/my-calendar`                                                                          |
| **pageAffinityBoost** | 15                                                                                                                    |
| **hoverAction**       | Preview: occasion template (party size, budget, vibe), matching chefs, time to book                                   |
| **clickAction**       | `navigate`                                                                                                            |
| **click reveals**     | Occasion-specific booking flow with pre-filled template                                                               |
| **href**              | `/book-now?occasion={slug}`                                                                                           |
| **dismissable**       | yes                                                                                                                   |
| **expandable**        | yes: suggested chefs, menu ideas, budget estimate                                                                     |
| **maxImpressions**    | 25                                                                                                                    |
| **cooldownMinutes**   | 360                                                                                                                   |
| **expiresAt**         | 7 days after occasion date (if date-linked)                                                                           |
| **scoring**           | +8 if calendar event detected; +5 if annual pattern (birthday/anniversary); +3 if matches passport                    |
| **interactions**      | Spawns `special_date` items when calendar data available                                                              |
| **dataSource**        | `events`, calendar integration, occasion templates (6 built-in)                                                       |
| **privacy**           | `private`                                                                                                             |

#### DISC-013: Special Dining

| Property              | Value                                                                          |
| --------------------- | ------------------------------------------------------------------------------ |
| **type**              | `client_special_dining`                                                        |
| **category**          | Discovery > Occasion                                                           |
| **label**             | `"{format}"` (e.g. "Chef's Table Experience", "Wine Pairing Dinner")           |
| **sublabel**          | `"Elevated dining"` or `"Limited availability"`                                |
| **icon**              | `crown`, `wine`, `dining`                                                      |
| **presentation**      | `visual_card`                                                                  |
| **baseUrgency**       | 12                                                                             |
| **urgencyDecayFn**    | `none`                                                                         |
| **pageAffinity**      | `/chefs`, `/book-now`                                                          |
| **pageAffinityBoost** | 10                                                                             |
| **hoverAction**       | Preview: format description, typical price, chef availability                  |
| **clickAction**       | `navigate`                                                                     |
| **click reveals**     | Chefs offering this format                                                     |
| **href**              | `/eat?special={slug}`                                                          |
| **dismissable**       | yes                                                                            |
| **expandable**        | no                                                                             |
| **maxImpressions**    | 20                                                                             |
| **cooldownMinutes**   | 720                                                                            |
| **expiresAt**         | Never                                                                          |
| **scoring**           | +4 if client tier is gold/platinum; +2 if budget range includes premium/luxury |
| **interactions**      | Boosts `price` items in premium range                                          |
| **dataSource**        | Chef profiles, menu types                                                      |
| **privacy**           | `private`                                                                      |

#### DISC-014: Circle

| Property              | Value                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| **type**              | `client_circle`                                                                       |
| **category**          | Discovery > Occasion                                                                  |
| **label**             | `"{circleName}"` (e.g. "Your Dinner Club", "Smith Family Circle")                     |
| **sublabel**          | `"{n} members"` or `"Planning: {eventStubTitle}"`                                     |
| **icon**              | `family`, `cheers`                                                                    |
| **presentation**      | `card`                                                                                |
| **baseUrgency**       | 22                                                                                    |
| **urgencyDecayFn**    | `step` (jumps when new activity)                                                      |
| **pageAffinity**      | `/my-hub`, `/my-hub/g/*`, `/my-events`                                                |
| **pageAffinityBoost** | 15                                                                                    |
| **hoverAction**       | Preview: latest activity, member count, next planned event, unread count              |
| **clickAction**       | `navigate`                                                                            |
| **click reveals**     | Circle detail page                                                                    |
| **href**              | `/my-hub/g/{groupToken}`                                                              |
| **dismissable**       | no (active membership)                                                                |
| **expandable**        | yes: recent messages, active polls, planned events                                    |
| **maxImpressions**    | unlimited                                                                             |
| **cooldownMinutes**   | 60                                                                                    |
| **expiresAt**         | Never (while member)                                                                  |
| **scoring**           | +1.1 editorial boost; +5 per unread message; +8 if active poll; +10 if event planning |
| **interactions**      | Spawns `circle_poll`, `circle_event_stub` sub-items                                   |
| **dataSource**        | `hub_groups`, `hub_messages`, `hub_polls`, `event_stubs`                              |
| **privacy**           | `event_visible` (circle members see shared context)                                   |

#### DISC-015: Location

| Property              | Value                                                                      |
| --------------------- | -------------------------------------------------------------------------- |
| **type**              | `client_location`                                                          |
| **category**          | Discovery > Occasion                                                       |
| **label**             | `"{locationName}"` (e.g. "Haverhill, MA", "Within 25 miles")               |
| **sublabel**          | `"{n} chefs available"`                                                    |
| **icon**              | `location`                                                                 |
| **presentation**      | `pill`                                                                     |
| **baseUrgency**       | 10                                                                         |
| **urgencyDecayFn**    | `none`                                                                     |
| **pageAffinity**      | `/chefs`, `/browse-dates`                                                  |
| **pageAffinityBoost** | 8                                                                          |
| **hoverAction**       | Preview: map snippet, chef count by distance band                          |
| **clickAction**       | `toggle_filter`                                                            |
| **click reveals**     | Location-filtered results                                                  |
| **href**              | `/eat?location={zip}`                                                      |
| **dismissable**       | yes                                                                        |
| **expandable**        | no                                                                         |
| **maxImpressions**    | 30                                                                         |
| **cooldownMinutes**   | 240                                                                        |
| **expiresAt**         | Never                                                                      |
| **scoring**           | +3 when on location-relevant pages; auto-set from `user_location_defaults` |
| **interactions**      | Filters all other discovery items by proximity                             |
| **dataSource**        | `user_location_defaults`, browser geolocation (opt-in)                     |
| **privacy**           | `private`                                                                  |

#### DISC-016: Price

| Property              | Value                                                              |
| --------------------- | ------------------------------------------------------------------ |
| **type**              | `client_price`                                                     |
| **category**          | Discovery > Occasion                                               |
| **label**             | `"{priceLabel}"` (e.g. "Budget-Friendly", "Premium", "Luxury")     |
| **sublabel**          | `"${min}-${max}/person"`                                           |
| **icon**              | `stack` (budget), `crown` (luxury)                                 |
| **presentation**      | `pill`                                                             |
| **baseUrgency**       | 10                                                                 |
| **urgencyDecayFn**    | `none`                                                             |
| **pageAffinity**      | `/chefs`, `/book-now`, `/my-spending`                              |
| **pageAffinityBoost** | 8                                                                  |
| **hoverAction**       | Preview: price range breakdown, chef count per tier                |
| **clickAction**       | `toggle_filter`                                                    |
| **click reveals**     | Budget-filtered chef search                                        |
| **href**              | `/eat?budget={tier}`                                               |
| **dismissable**       | yes                                                                |
| **expandable**        | no                                                                 |
| **maxImpressions**    | 30                                                                 |
| **cooldownMinutes**   | 240                                                                |
| **expiresAt**         | Never                                                              |
| **scoring**           | +5 if matches passport `budget_range`; auto-pin if set in passport |
| **interactions**      | Filters `chef_pick` and `featured_chef` items                      |
| **dataSource**        | `client_passports`, PIE pricing data, `events` payment history     |
| **privacy**           | `private`                                                          |

#### DISC-017: Time

| Property              | Value                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- |
| **type**              | `client_time`                                                                      |
| **category**          | Discovery > Occasion                                                               |
| **label**             | `"{timeLabel}"` (e.g. "This Weekend", "Tonight", "Planning Ahead")                 |
| **sublabel**          | `"{n} chefs available"`                                                            |
| **icon**              | `calendar`-style                                                                   |
| **presentation**      | `pill`                                                                             |
| **baseUrgency**       | 25 ("tonight") to 8 ("planning ahead")                                             |
| **urgencyDecayFn**    | `deadline`                                                                         |
| **pageAffinity**      | `/book-now`, `/browse-dates`                                                       |
| **pageAffinityBoost** | 12                                                                                 |
| **hoverAction**       | Preview: available dates, chef count, quick-book option                            |
| **clickAction**       | `toggle_filter`                                                                    |
| **click reveals**     | Time-filtered availability                                                         |
| **href**              | `/browse-dates?window={slug}`                                                      |
| **dismissable**       | yes                                                                                |
| **expandable**        | no                                                                                 |
| **maxImpressions**    | 20                                                                                 |
| **cooldownMinutes**   | 120                                                                                |
| **expiresAt**         | End of time window                                                                 |
| **scoring**           | +10 if `need_tonight` planning state; +5 if `this_weekend`; contextual time-of-day |
| **interactions**      | Pairs with `occasion` items                                                        |
| **dataSource**        | Chef availability, consumer planning state                                         |
| **privacy**           | `private`                                                                          |

#### DISC-018: Group Size

| Property              | Value                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------- |
| **type**              | `client_group_size`                                                                    |
| **category**          | Discovery > Occasion                                                                   |
| **label**             | `"{sizeLabel}"` (e.g. "Dinner for Two", "Party of 12", "Large Event 25+")              |
| **sublabel**          | `"Your usual: {defaultGuestCount}"`                                                    |
| **icon**              | `family`, `cheers`                                                                     |
| **presentation**      | `pill`                                                                                 |
| **baseUrgency**       | 8                                                                                      |
| **urgencyDecayFn**    | `none`                                                                                 |
| **pageAffinity**      | `/book-now`, `/chefs`                                                                  |
| **pageAffinityBoost** | 8                                                                                      |
| **hoverAction**       | Preview: matching service formats, typical price per person                            |
| **clickAction**       | `toggle_filter`                                                                        |
| **click reveals**     | Size-filtered chef search                                                              |
| **href**              | `/eat?partySize={n}`                                                                   |
| **dismissable**       | yes                                                                                    |
| **expandable**        | no                                                                                     |
| **maxImpressions**    | 20                                                                                     |
| **cooldownMinutes**   | 240                                                                                    |
| **expiresAt**         | Never                                                                                  |
| **scoring**           | +4 if matches passport `default_guest_count`; +3 if matches upcoming event guest count |
| **interactions**      | Influences `service` and `price` items                                                 |
| **dataSource**        | `client_passports`, `event_guests` history                                             |
| **privacy**           | `private`                                                                              |

### 1.3 ChefFlow Picks Lane (6 types)

#### DISC-019: Featured Chef

| Property              | Value                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **type**              | `client_featured_chef`                                                                                                    |
| **category**          | Discovery > ChefFlow Picks                                                                                                |
| **label**             | `"Chef {name}"`                                                                                                           |
| **sublabel**          | `"{specialty}"` or `"New in your area"`                                                                                   |
| **icon**              | Chef avatar                                                                                                               |
| **presentation**      | `visual_card` (ProofCard style)                                                                                           |
| **baseUrgency**       | 15                                                                                                                        |
| **urgencyDecayFn**    | `linear` (decays as feature period ends)                                                                                  |
| **pageAffinity**      | `/chefs`, `/book-now`                                                                                                     |
| **pageAffinityBoost** | 10                                                                                                                        |
| **hoverAction**       | Preview: chef photo, rating, specialties, availability, starting price                                                    |
| **clickAction**       | `navigate`                                                                                                                |
| **click reveals**     | Chef profile page                                                                                                         |
| **href**              | `/chefs/{slug}`                                                                                                           |
| **dismissable**       | yes                                                                                                                       |
| **expandable**        | yes: sample menus, reviews, availability calendar                                                                         |
| **maxImpressions**    | 10                                                                                                                        |
| **cooldownMinutes**   | 1440 (24hr)                                                                                                               |
| **expiresAt**         | End of feature period                                                                                                     |
| **scoring**           | +1.2 editorial boost; +5 if cuisine matches taste passport; +3 if location match; +8 if previously booked (rebook signal) |
| **interactions**      | Boosts related `cuisine` and `service` items                                                                              |
| **dataSource**        | Editorial calendar, chef profiles, `consumer_saved_chefs`                                                                 |
| **privacy**           | `private`                                                                                                                 |

#### DISC-020: Chef Pick

| Property              | Value                                                                      |
| --------------------- | -------------------------------------------------------------------------- |
| **type**              | `client_chef_pick`                                                         |
| **category**          | Discovery > ChefFlow Picks                                                 |
| **label**             | `"{pickTitle}"` (e.g. "Perfect for date night", "Best meal prep near you") |
| **sublabel**          | `"Curated for you"`                                                        |
| **icon**              | `concierge`, `crown`                                                       |
| **presentation**      | `card`                                                                     |
| **baseUrgency**       | 12                                                                         |
| **urgencyDecayFn**    | `linear`                                                                   |
| **pageAffinity**      | `/chefs`, `/book-now`                                                      |
| **pageAffinityBoost** | 8                                                                          |
| **hoverAction**       | Preview: why this pick, chef details, quick-book option                    |
| **clickAction**       | `navigate`                                                                 |
| **click reveals**     | Chef/menu detail                                                           |
| **href**              | `/chefs/{slug}` or `/eat?pick={id}`                                        |
| **dismissable**       | yes                                                                        |
| **expandable**        | yes: alternative picks in same category                                    |
| **maxImpressions**    | 8                                                                          |
| **cooldownMinutes**   | 1440                                                                       |
| **expiresAt**         | 14 days                                                                    |
| **scoring**           | Personalized: weighted by taste passport match, location, budget fit       |
| **interactions**      | Pairs with active `occasion` or `mood` items                               |
| **dataSource**        | Recommendation engine, editorial, chef profiles                            |
| **privacy**           | `private`                                                                  |

#### DISC-021: Combo

| Property              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| **type**              | `client_combo`                                                         |
| **category**          | Discovery > ChefFlow Picks                                             |
| **label**             | `"{comboTitle}"` (e.g. "Italian + Date Night + $50-80/person")         |
| **sublabel**          | `"A perfect match"`                                                    |
| **icon**              | `spark`                                                                |
| **presentation**      | `card`                                                                 |
| **baseUrgency**       | 10                                                                     |
| **urgencyDecayFn**    | `linear`                                                               |
| **pageAffinity**      | `/chefs`, `/book-now`                                                  |
| **pageAffinityBoost** | 8                                                                      |
| **hoverAction**       | Preview: combo breakdown, matching chefs, estimated cost               |
| **clickAction**       | `navigate`                                                             |
| **click reveals**     | Pre-filtered search with all combo facets applied                      |
| **href**              | `/eat?cuisine={}&occasion={}&budget={}`                                |
| **dismissable**       | yes                                                                    |
| **expandable**        | yes: individual facets as sub-pills                                    |
| **maxImpressions**    | 10                                                                     |
| **cooldownMinutes**   | 720                                                                    |
| **expiresAt**         | 14 days                                                                |
| **scoring**           | Highest when all facets match user history; +2 per matching facet      |
| **interactions**      | Constructed from co-occurring `cuisine` + `occasion` + `price` signals |
| **dataSource**        | User interaction clustering, taste passport                            |
| **privacy**           | `private`                                                              |

#### DISC-022: Story

| Property              | Value                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| **type**              | `client_story`                                                                        |
| **category**          | Discovery > ChefFlow Picks                                                            |
| **label**             | `"{storyTitle}"` (e.g. "The Art of Farm Dinners", "Why Meal Prep Changed Everything") |
| **sublabel**          | `"{readTime} min read"`                                                               |
| **icon**              | Story-specific hero image                                                             |
| **presentation**      | `story`                                                                               |
| **baseUrgency**       | 5                                                                                     |
| **urgencyDecayFn**    | `linear` (slow decay)                                                                 |
| **pageAffinity**      | `/my-preferences/discovery`                                                           |
| **pageAffinityBoost** | 5                                                                                     |
| **hoverAction**       | Preview: story excerpt, related chefs/items                                           |
| **clickAction**       | `navigate`                                                                            |
| **click reveals**     | Story page                                                                            |
| **href**              | `/stories/{slug}`                                                                     |
| **dismissable**       | yes                                                                                   |
| **expandable**        | no                                                                                    |
| **maxImpressions**    | 5                                                                                     |
| **cooldownMinutes**   | 2880 (48hr)                                                                           |
| **expiresAt**         | 30 days                                                                               |
| **scoring**           | Low base; +3 if topic matches recent searches; classified as `ambient` slot kind      |
| **interactions**      | Does not compete with operational items                                               |
| **dataSource**        | Editorial content                                                                     |
| **privacy**           | `private`                                                                             |

#### DISC-023: Surprise

| Property              | Value                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| **type**              | `client_surprise`                                                                                  |
| **category**          | Discovery > ChefFlow Picks                                                                         |
| **label**             | `"{surprisePrompt}"` (e.g. "Surprise me", "Ingredient roulette", "Cook outside your comfort zone") |
| **sublabel**          | `"Feeling adventurous?"`                                                                           |
| **icon**              | `spark`, `search`                                                                                  |
| **presentation**      | `pill`                                                                                             |
| **baseUrgency**       | 8                                                                                                  |
| **urgencyDecayFn**    | `none`                                                                                             |
| **pageAffinity**      | `/chefs`, `/my-preferences/discovery`                                                              |
| **pageAffinityBoost** | 5                                                                                                  |
| **hoverAction**       | Preview: "Tap to discover something unexpected"                                                    |
| **clickAction**       | `quick_action` (randomized result)                                                                 |
| **click reveals**     | Random chef/cuisine/menu outside normal preferences                                                |
| **href**              | `/eat?surprise=true`                                                                               |
| **dismissable**       | yes                                                                                                |
| **expandable**        | no                                                                                                 |
| **maxImpressions**    | 10                                                                                                 |
| **cooldownMinutes**   | 1440                                                                                               |
| **expiresAt**         | Regenerates daily                                                                                  |
| **scoring**           | +2 if `exploring` planning state; novelty injection reason code                                    |
| **interactions**      | Intentionally ignores preference signals to inject diversity                                       |
| **dataSource**        | Random selection with anti-repetition logic                                                        |
| **privacy**           | `private`                                                                                          |

#### DISC-024: Saved

| Property              | Value                                                           |
| --------------------- | --------------------------------------------------------------- |
| **type**              | `client_saved`                                                  |
| **category**          | Discovery > ChefFlow Picks                                      |
| **label**             | `"{savedItemLabel}"` (original item label)                      |
| **sublabel**          | `"Saved {timeAgo}"`                                             |
| **icon**              | Original item icon with save badge overlay                      |
| **presentation**      | `pill`                                                          |
| **baseUrgency**       | 12                                                              |
| **urgencyDecayFn**    | `linear` (slow: -0.5/day)                                       |
| **pageAffinity**      | `/my-preferences/discovery`, `/chefs`                           |
| **pageAffinityBoost** | 10                                                              |
| **hoverAction**       | Preview: original item preview + "Remove from saved" option     |
| **clickAction**       | Original item's click action                                    |
| **click reveals**     | Same as original item                                           |
| **href**              | Original item's href                                            |
| **dismissable**       | yes (removes from saved)                                        |
| **expandable**        | no                                                              |
| **maxImpressions**    | unlimited                                                       |
| **cooldownMinutes**   | 120                                                             |
| **expiresAt**         | Never (until manually removed)                                  |
| **scoring**           | +0.8 editorial boost; pinned to position 1 in assembly          |
| **interactions**      | Preserves original item's interaction rules                     |
| **dataSource**        | `discovery_interactions` (save action), control rail saved keys |
| **privacy**           | `private`                                                       |

---

## 2. Event Lifecycle

Items that track a client's events through every stage of the FSM.

#### EVT-001: Event Tomorrow

| Property              | Value                                                                         |
| --------------------- | ----------------------------------------------------------------------------- |
| **type**              | `event_tomorrow`                                                              |
| **category**          | Event Lifecycle                                                               |
| **label**             | `"{eventTitle} is tomorrow"`                                                  |
| **sublabel**          | `"with Chef {name} at {time}"`                                                |
| **icon**              | `calendar-alert`                                                              |
| **presentation**      | `alert`                                                                       |
| **baseUrgency**       | 90                                                                            |
| **urgencyDecayFn**    | `deadline` (peaks day-of)                                                     |
| **pageAffinity**      | `/my-events`, `/my-events/{id}`, `/my-calendar`                               |
| **pageAffinityBoost** | 20                                                                            |
| **hoverAction**       | Preview: event summary, chef name, time, guest count, menu, completion status |
| **clickAction**       | `navigate`                                                                    |
| **click reveals**     | Event detail page                                                             |
| **href**              | `/my-events/{id}`                                                             |
| **dismissable**       | no                                                                            |
| **expandable**        | yes: checklist of incomplete items, guest RSVPs, chef contact                 |
| **maxImpressions**    | unlimited                                                                     |
| **cooldownMinutes**   | 0                                                                             |
| **expiresAt**         | Event start time                                                              |
| **scoring**           | Highest priority item. Always in top 3 positions.                             |
| **interactions**      | Suppresses related `event_completion_gap` items (absorbed into expand)        |
| **dataSource**        | `events` (date, status), `event_guests`, completion contract                  |
| **privacy**           | `household_visible`                                                           |

#### EVT-002: Event Today

| Property              | Value                                                     |
| --------------------- | --------------------------------------------------------- |
| **type**              | `event_today`                                             |
| **category**          | Event Lifecycle                                           |
| **label**             | `"Today: {eventTitle}"`                                   |
| **sublabel**          | `"Chef {name} arrives at {arrivalTime}"`                  |
| **icon**              | `chef-hat-active`                                         |
| **presentation**      | `banner`                                                  |
| **baseUrgency**       | 98                                                        |
| **urgencyDecayFn**    | `deadline`                                                |
| **pageAffinity**      | All pages                                                 |
| **pageAffinityBoost** | 50                                                        |
| **hoverAction**       | Preview: live timeline, chef ETA, menu, guest RSVPs       |
| **clickAction**       | `navigate`                                                |
| **click reveals**     | Live event timeline                                       |
| **href**              | `/my-events/{id}/live`                                    |
| **dismissable**       | no                                                        |
| **expandable**        | yes: live timeline steps, chef contact, emergency actions |
| **maxImpressions**    | unlimited                                                 |
| **cooldownMinutes**   | 0                                                         |
| **expiresAt**         | Event end time                                            |
| **scoring**           | Maximum urgency. Position 0 always.                       |
| **interactions**      | Suppresses all non-critical items from top 5 positions    |
| **dataSource**        | `events`, `event_transitions`, readiness gates            |
| **privacy**           | `event_visible`                                           |

#### EVT-003: Event Upcoming (7 days)

| Property              | Value                                                                          |
| --------------------- | ------------------------------------------------------------------------------ |
| **type**              | `event_upcoming`                                                               |
| **category**          | Event Lifecycle                                                                |
| **label**             | `"{eventTitle} in {n} days"`                                                   |
| **sublabel**          | `"{completionPct}% ready"`                                                     |
| **icon**              | `calendar`                                                                     |
| **presentation**      | `card`                                                                         |
| **baseUrgency**       | 55                                                                             |
| **urgencyDecayFn**    | `deadline` (ramps up as date approaches)                                       |
| **pageAffinity**      | `/my-events`, `/my-calendar`, `/my-bookings`                                   |
| **pageAffinityBoost** | 15                                                                             |
| **hoverAction**       | Preview: date, chef, guest count, menu status, payment status, completion gaps |
| **clickAction**       | `navigate`                                                                     |
| **click reveals**     | Event detail                                                                   |
| **href**              | `/my-events/{id}`                                                              |
| **dismissable**       | no                                                                             |
| **expandable**        | yes: completion gaps as sub-items                                              |
| **maxImpressions**    | unlimited                                                                      |
| **cooldownMinutes**   | 0                                                                              |
| **expiresAt**         | Event date                                                                     |
| **scoring**           | 55 + (7 - daysUntil) \* 5; +10 if incomplete; +5 per blocking gap              |
| **interactions**      | Parent of `event_completion_gap` items                                         |
| **dataSource**        | `events`, completion contract                                                  |
| **privacy**           | `household_visible`                                                            |

#### EVT-004: Event Proposed (Awaiting Acceptance)

| Property              | Value                                                        |
| --------------------- | ------------------------------------------------------------ |
| **type**              | `event_proposed`                                             |
| **category**          | Event Lifecycle                                              |
| **label**             | `"New proposal from Chef {name}"`                            |
| **sublabel**          | `"For {eventTitle} on {date}"`                               |
| **icon**              | `document-check`                                             |
| **presentation**      | `alert`                                                      |
| **baseUrgency**       | 70                                                           |
| **urgencyDecayFn**    | `deadline` (proposal expiry)                                 |
| **pageAffinity**      | `/my-events`, `/my-events/{id}/proposal`                     |
| **pageAffinityBoost** | 20                                                           |
| **hoverAction**       | Preview: proposal summary, price, menu overview, expiry date |
| **clickAction**       | `navigate`                                                   |
| **click reveals**     | Proposal detail page with accept/reject                      |
| **href**              | `/my-events/{id}/proposal`                                   |
| **dismissable**       | no                                                           |
| **expandable**        | yes: menu highlights, price breakdown                        |
| **maxImpressions**    | unlimited                                                    |
| **cooldownMinutes**   | 0                                                            |
| **expiresAt**         | Proposal expiry date                                         |
| **scoring**           | 70 + days-until-expiry penalty (exponential last 3 days)     |
| **interactions**      | Triggers related `quote_expiring` if near deadline           |
| **dataSource**        | `events` (status = proposed), `quotes`                       |
| **privacy**           | `private`                                                    |

#### EVT-005: Event Confirmed

| Property              | Value                                                             |
| --------------------- | ----------------------------------------------------------------- |
| **type**              | `event_confirmed`                                                 |
| **category**          | Event Lifecycle                                                   |
| **label**             | `"{eventTitle} confirmed"`                                        |
| **sublabel**          | `"{daysUntil} days away"`                                         |
| **icon**              | `check-circle`                                                    |
| **presentation**      | `card`                                                            |
| **baseUrgency**       | 30                                                                |
| **urgencyDecayFn**    | `deadline`                                                        |
| **pageAffinity**      | `/my-events`, `/my-calendar`                                      |
| **pageAffinityBoost** | 10                                                                |
| **hoverAction**       | Preview: event details, what's still needed (pre-event checklist) |
| **clickAction**       | `navigate`                                                        |
| **click reveals**     | Event detail                                                      |
| **href**              | `/my-events/{id}`                                                 |
| **dismissable**       | no                                                                |
| **expandable**        | yes: pre-event checklist items                                    |
| **maxImpressions**    | unlimited                                                         |
| **cooldownMinutes**   | 0                                                                 |
| **expiresAt**         | Event date                                                        |
| **scoring**           | Ramps as date approaches                                          |
| **interactions**      | Spawns `pre_event_checklist` items                                |
| **dataSource**        | `events` (status = confirmed), readiness gates                    |
| **privacy**           | `household_visible`                                               |

#### EVT-006: Post-Event Summary Ready

| Property              | Value                                                   |
| --------------------- | ------------------------------------------------------- |
| **type**              | `event_summary_ready`                                   |
| **category**          | Event Lifecycle                                         |
| **label**             | `"Your {eventTitle} summary is ready"`                  |
| **sublabel**          | `"See what was served"`                                 |
| **icon**              | `document`                                              |
| **presentation**      | `card`                                                  |
| **baseUrgency**       | 45                                                      |
| **urgencyDecayFn**    | `linear` (decays 3/day)                                 |
| **pageAffinity**      | `/my-events`, `/my-events/{id}/event-summary`           |
| **pageAffinityBoost** | 15                                                      |
| **hoverAction**       | Preview: event highlights, dish count, photos available |
| **clickAction**       | `navigate`                                              |
| **click reveals**     | Event summary/recap page                                |
| **href**              | `/my-events/{id}/event-summary`                         |
| **dismissable**       | yes                                                     |
| **expandable**        | yes: key stats, photo count, review prompt              |
| **maxImpressions**    | 10                                                      |
| **cooldownMinutes**   | 720                                                     |
| **expiresAt**         | 14 days post-event                                      |
| **scoring**           | Higher if photos available; +5 if review not yet left   |
| **interactions**      | Spawns `review_prompt` and `tip_prompt` items           |
| **dataSource**        | `events` (status = completed), `event_transitions`      |
| **privacy**           | `household_visible`                                     |

#### EVT-007: Event Cancelled

| Property              | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| **type**              | `event_cancelled`                                          |
| **category**          | Event Lifecycle                                            |
| **label**             | `"{eventTitle} was cancelled"`                             |
| **sublabel**          | `"Refund: {refundStatus}"` or `"Rebook?"`                  |
| **icon**              | `x-circle`                                                 |
| **presentation**      | `alert`                                                    |
| **baseUrgency**       | 50                                                         |
| **urgencyDecayFn**    | `linear` (decays 5/day)                                    |
| **pageAffinity**      | `/my-events`, `/my-spending`                               |
| **pageAffinityBoost** | 10                                                         |
| **hoverAction**       | Preview: cancellation reason, refund status, rebook option |
| **clickAction**       | `navigate`                                                 |
| **click reveals**     | Event detail with cancellation info                        |
| **href**              | `/my-events/{id}`                                          |
| **dismissable**       | yes                                                        |
| **expandable**        | yes: refund timeline, rebook CTA                           |
| **maxImpressions**    | 5                                                          |
| **cooldownMinutes**   | 1440                                                       |
| **expiresAt**         | 7 days post-cancellation                                   |
| **scoring**           | +10 if refund pending; +5 if rebookable                    |
| **interactions**      | Spawns `rebook_suggestion` item                            |
| **dataSource**        | `events` (status = cancelled), payments                    |
| **privacy**           | `private`                                                  |

---

## 3. Event Completion Gaps

Individual missing requirements surfaced by the completion contract.

#### GAP-001: Guest Count Missing

| Property              | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| **type**              | `gap_guest_count`                                          |
| **category**          | Event Completion                                           |
| **label**             | `"How many guests for {eventTitle}?"`                      |
| **sublabel**          | `"Chef needs this to plan"`                                |
| **icon**              | `users-question`                                           |
| **presentation**      | `badge`                                                    |
| **baseUrgency**       | 60                                                         |
| **urgencyDecayFn**    | `deadline` (event date)                                    |
| **pageAffinity**      | `/my-events/{id}`, `/my-events/{id}/guests`                |
| **pageAffinityBoost** | 20                                                         |
| **hoverAction**       | Preview: current guest list (if any), quick-add count      |
| **clickAction**       | `navigate`                                                 |
| **click reveals**     | Guest management page                                      |
| **href**              | `/my-events/{id}/guests`                                   |
| **dismissable**       | no                                                         |
| **expandable**        | no                                                         |
| **maxImpressions**    | unlimited                                                  |
| **cooldownMinutes**   | 0                                                          |
| **expiresAt**         | Event date                                                 |
| **scoring**           | Blocking requirement. Always shown within event context.   |
| **interactions**      | Child of parent `event_upcoming` or `event_confirmed` item |
| **dataSource**        | Completion contract: `event.missing_requirements`          |
| **privacy**           | `chef_visible`                                             |

#### GAP-002: Menu Not Confirmed

| Property              | Value                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| **type**              | `gap_menu_unconfirmed`                                                           |
| **category**          | Event Completion                                                                 |
| **label**             | `"Approve menu for {eventTitle}"`                                                |
| **sublabel**          | `"Chef {name} sent options"`                                                     |
| **icon**              | `utensils-question`                                                              |
| **presentation**      | `alert`                                                                          |
| **baseUrgency**       | 65                                                                               |
| **urgencyDecayFn**    | `deadline`                                                                       |
| **pageAffinity**      | `/my-events/{id}`, `/my-events/{id}/approve-menu`, `/my-events/{id}/choose-menu` |
| **pageAffinityBoost** | 20                                                                               |
| **hoverAction**       | Preview: menu summary, course count, dietary accommodations                      |
| **clickAction**       | `navigate`                                                                       |
| **click reveals**     | Menu approval page                                                               |
| **href**              | `/my-events/{id}/approve-menu`                                                   |
| **dismissable**       | no                                                                               |
| **expandable**        | yes: menu courses preview                                                        |
| **maxImpressions**    | unlimited                                                                        |
| **cooldownMinutes**   | 0                                                                                |
| **expiresAt**         | Event date                                                                       |
| **scoring**           | Milestone step in journey. High priority when menu_review step is active.        |
| **interactions**      | Blocked until proposal accepted                                                  |
| **dataSource**        | `events.menu_approval_status`, journey steps                                     |
| **privacy**           | `household_visible`                                                              |

#### GAP-003: Contract Unsigned

| Property              | Value                                                          |
| --------------------- | -------------------------------------------------------------- |
| **type**              | `gap_contract_unsigned`                                        |
| **category**          | Event Completion                                               |
| **label**             | `"Sign contract for {eventTitle}"`                             |
| **sublabel**          | `"From Chef {name}"`                                           |
| **icon**              | `pen-line`                                                     |
| **presentation**      | `alert`                                                        |
| **baseUrgency**       | 65                                                             |
| **urgencyDecayFn**    | `deadline`                                                     |
| **pageAffinity**      | `/my-events/{id}`, `/my-events/{id}/contract`, `/my-documents` |
| **pageAffinityBoost** | 20                                                             |
| **hoverAction**       | Preview: contract summary, key terms, sign CTA                 |
| **clickAction**       | `navigate`                                                     |
| **click reveals**     | Contract signing page                                          |
| **href**              | `/my-events/{id}/contract`                                     |
| **dismissable**       | no                                                             |
| **expandable**        | no                                                             |
| **maxImpressions**    | unlimited                                                      |
| **cooldownMinutes**   | 0                                                              |
| **expiresAt**         | Event date                                                     |
| **scoring**           | +10 if contract status = `sent` or `viewed` but not `signed`   |
| **interactions**      | Blocks `deposit_paid` journey step                             |
| **dataSource**        | `contracts` (status != signed)                                 |
| **privacy**           | `private`                                                      |

#### GAP-004: Payment Due

| Property              | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| **type**              | `gap_payment_due`                                           |
| **category**          | Event Completion                                            |
| **label**             | `"Payment due for {eventTitle}"`                            |
| **sublabel**          | `"${amount} due {dueDate}"`                                 |
| **icon**              | `dollar-sign-alert`                                         |
| **presentation**      | `alert`                                                     |
| **baseUrgency**       | 75                                                          |
| **urgencyDecayFn**    | `deadline` (due date)                                       |
| **pageAffinity**      | `/my-events/{id}`, `/my-events/{id}/pay`, `/my-spending`    |
| **pageAffinityBoost** | 25                                                          |
| **hoverAction**       | Preview: amount, due date, payment methods, split status    |
| **clickAction**       | `navigate`                                                  |
| **click reveals**     | Payment page                                                |
| **href**              | `/my-events/{id}/pay`                                       |
| **dismissable**       | no                                                          |
| **expandable**        | yes: payment plan breakdown if split                        |
| **maxImpressions**    | unlimited                                                   |
| **cooldownMinutes**   | 0                                                           |
| **expiresAt**         | Never (until paid)                                          |
| **scoring**           | 75 base; +15 if overdue; +5 per day overdue (capped at +25) |
| **interactions**      | Spawns `payment_overdue` if past due                        |
| **dataSource**        | `payments`, `invoices`, payment splitting                   |
| **privacy**           | `private`                                                   |

#### GAP-005: Dietary Info Missing

| Property              | Value                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------- |
| **type**              | `gap_dietary_missing`                                                                   |
| **category**          | Event Completion                                                                        |
| **label**             | `"Add dietary needs for {eventTitle}"`                                                  |
| **sublabel**          | `"{n} guests without dietary info"`                                                     |
| **icon**              | `leaf-alert`                                                                            |
| **presentation**      | `badge`                                                                                 |
| **baseUrgency**       | 50                                                                                      |
| **urgencyDecayFn**    | `deadline`                                                                              |
| **pageAffinity**      | `/my-events/{id}/guests`, `/my-dietary`                                                 |
| **pageAffinityBoost** | 15                                                                                      |
| **hoverAction**       | Preview: guests without dietary info, quick-add                                         |
| **clickAction**       | `navigate`                                                                              |
| **click reveals**     | Guest dietary management                                                                |
| **href**              | `/my-events/{id}/guests`                                                                |
| **dismissable**       | no                                                                                      |
| **expandable**        | yes: per-guest dietary status                                                           |
| **maxImpressions**    | unlimited                                                                               |
| **cooldownMinutes**   | 0                                                                                       |
| **expiresAt**         | Event date                                                                              |
| **scoring**           | Safety-critical. +10 if any guest has known allergies elsewhere but not for this event. |
| **interactions**      | Linked to `dietary_profile` items                                                       |
| **dataSource**        | `event_guests`, `hub_guest_profiles`, completion contract                               |
| **privacy**           | `chef_visible`                                                                          |

#### GAP-006: Pre-Event Checklist Incomplete

| Property              | Value                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| **type**              | `gap_pre_event_checklist`                                                                         |
| **category**          | Event Completion                                                                                  |
| **label**             | `"Confirm details for {eventTitle}"`                                                              |
| **sublabel**          | `"{n} items need attention"`                                                                      |
| **icon**              | `clipboard-check`                                                                                 |
| **presentation**      | `progress`                                                                                        |
| **baseUrgency**       | 55                                                                                                |
| **urgencyDecayFn**    | `deadline`                                                                                        |
| **pageAffinity**      | `/my-events/{id}`, `/my-events/{id}/pre-event-checklist`                                          |
| **pageAffinityBoost** | 20                                                                                                |
| **hoverAction**       | Preview: checklist items with check/uncheck status                                                |
| **clickAction**       | `navigate`                                                                                        |
| **click reveals**     | Pre-event checklist page                                                                          |
| **href**              | `/my-events/{id}/pre-event-checklist`                                                             |
| **dismissable**       | no                                                                                                |
| **expandable**        | yes: individual checklist items                                                                   |
| **maxImpressions**    | unlimited                                                                                         |
| **cooldownMinutes**   | 0                                                                                                 |
| **expiresAt**         | Event date                                                                                        |
| **scoring**           | Ramps aggressively in final 48 hours                                                              |
| **interactions**      | Readiness gate for `confirmed` -> `in_progress` transition                                        |
| **dataSource**        | Readiness gates: `prep_timeline`, `dietary_constraints`, `arrival_logistics`, `service_plan_flow` |
| **privacy**           | `chef_visible`                                                                                    |

---

## 4. Quote Lifecycle

#### QUO-001: Quote Received

| Property              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| **type**              | `quote_received`                                                       |
| **category**          | Quote Lifecycle                                                        |
| **label**             | `"New quote from Chef {name}"`                                         |
| **sublabel**          | `"${amount} for {serviceType}"`                                        |
| **icon**              | `receipt`                                                              |
| **presentation**      | `alert`                                                                |
| **baseUrgency**       | 65                                                                     |
| **urgencyDecayFn**    | `deadline` (quote expiry)                                              |
| **pageAffinity**      | `/my-quotes`, `/my-inquiries`                                          |
| **pageAffinityBoost** | 20                                                                     |
| **hoverAction**       | Preview: quote summary, price, menu highlights, expiry countdown       |
| **clickAction**       | `navigate`                                                             |
| **click reveals**     | Quote detail                                                           |
| **href**              | `/my-quotes/{id}`                                                      |
| **dismissable**       | no                                                                     |
| **expandable**        | yes: price breakdown, menu preview                                     |
| **maxImpressions**    | unlimited                                                              |
| **cooldownMinutes**   | 0                                                                      |
| **expiresAt**         | Quote expiry date                                                      |
| **scoring**           | 65 base; +10 if expiring within 48h; +5 if only quote for this inquiry |
| **interactions**      | Linked to parent `inquiry` item                                        |
| **dataSource**        | `quotes` (status = sent)                                               |
| **privacy**           | `private`                                                              |

#### QUO-002: Quote Expiring Soon

| Property              | Value                                                        |
| --------------------- | ------------------------------------------------------------ |
| **type**              | `quote_expiring`                                             |
| **category**          | Quote Lifecycle                                              |
| **label**             | `"Quote expires {timeRemaining}"`                            |
| **sublabel**          | `"From Chef {name}: ${amount}"`                              |
| **icon**              | `clock-alert`                                                |
| **presentation**      | `alert`                                                      |
| **baseUrgency**       | 80                                                           |
| **urgencyDecayFn**    | `deadline` (exponential last 48h)                            |
| **pageAffinity**      | `/my-quotes`, `/my-inquiries`                                |
| **pageAffinityBoost** | 25                                                           |
| **hoverAction**       | Preview: quote details, accept/reject CTAs, expiry countdown |
| **clickAction**       | `navigate`                                                   |
| **click reveals**     | Quote detail with urgent accept CTA                          |
| **href**              | `/my-quotes/{id}`                                            |
| **dismissable**       | no                                                           |
| **expandable**        | no                                                           |
| **maxImpressions**    | unlimited                                                    |
| **cooldownMinutes**   | 0                                                            |
| **expiresAt**         | Quote expiry                                                 |
| **scoring**           | Exponential urgency curve in final 48 hours                  |
| **interactions**      | Replaces `quote_received` item when within expiry window     |
| **dataSource**        | `quotes` (status = sent, expiry within 48h)                  |
| **privacy**           | `private`                                                    |

#### QUO-003: Quote Expired

| Property              | Value                                           |
| --------------------- | ----------------------------------------------- |
| **type**              | `quote_expired`                                 |
| **category**          | Quote Lifecycle                                 |
| **label**             | `"Quote from Chef {name} expired"`              |
| **sublabel**          | `"Request a new one?"`                          |
| **icon**              | `clock-x`                                       |
| **presentation**      | `badge`                                         |
| **baseUrgency**       | 30                                              |
| **urgencyDecayFn**    | `linear` (decays 5/day)                         |
| **pageAffinity**      | `/my-quotes`, `/my-inquiries`                   |
| **pageAffinityBoost** | 10                                              |
| **hoverAction**       | Preview: original quote summary, re-inquiry CTA |
| **clickAction**       | `navigate`                                      |
| **click reveals**     | Expired quote with re-inquiry option            |
| **href**              | `/my-quotes/{id}`                               |
| **dismissable**       | yes                                             |
| **expandable**        | no                                              |
| **maxImpressions**    | 5                                               |
| **cooldownMinutes**   | 1440                                            |
| **expiresAt**         | 7 days post-expiry                              |
| **scoring**           | Low base, decays quickly                        |
| **interactions**      | May spawn `rebook_suggestion`                   |
| **dataSource**        | `quotes` (status = expired)                     |
| **privacy**           | `private`                                       |

#### QUO-004: Quote Accepted

| Property              | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| **type**              | `quote_accepted`                                           |
| **category**          | Quote Lifecycle                                            |
| **label**             | `"You accepted Chef {name}'s quote"`                       |
| **sublabel**          | `"Next: {nextStep}"` (e.g. "Sign contract", "Pay deposit") |
| **icon**              | `check-circle`                                             |
| **presentation**      | `card`                                                     |
| **baseUrgency**       | 50                                                         |
| **urgencyDecayFn**    | `step` (jumps when next action needed)                     |
| **pageAffinity**      | `/my-events`, `/my-quotes`                                 |
| **pageAffinityBoost** | 15                                                         |
| **hoverAction**       | Preview: event timeline, next required action              |
| **clickAction**       | `navigate`                                                 |
| **click reveals**     | Event detail (transitions to event lifecycle)              |
| **href**              | `/my-events/{id}`                                          |
| **dismissable**       | no                                                         |
| **expandable**        | yes: journey step progress                                 |
| **maxImpressions**    | 10                                                         |
| **cooldownMinutes**   | 240                                                        |
| **expiresAt**         | When next journey step completes                           |
| **scoring**           | Transitional. Bridges quote -> event lifecycle.            |
| **interactions**      | Replaced by `event_upcoming` or `event_confirmed` items    |
| **dataSource**        | `quotes` (status = accepted), `events` (status = accepted) |
| **privacy**           | `private`                                                  |

---

## 5. Inquiry Lifecycle

#### INQ-001: Inquiry Sent

| Property              | Value                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| **type**              | `inquiry_sent`                                                            |
| **category**          | Inquiry Lifecycle                                                         |
| **label**             | `"Inquiry sent to Chef {name}"`                                           |
| **sublabel**          | `"Waiting for response"`                                                  |
| **icon**              | `send`                                                                    |
| **presentation**      | `card`                                                                    |
| **baseUrgency**       | 35                                                                        |
| **urgencyDecayFn**    | `linear` (increases if no response)                                       |
| **pageAffinity**      | `/my-inquiries`, `/my-inquiries/{id}`                                     |
| **pageAffinityBoost** | 15                                                                        |
| **hoverAction**       | Preview: inquiry details, date sent, chef response time estimate          |
| **clickAction**       | `navigate`                                                                |
| **click reveals**     | Inquiry detail                                                            |
| **href**              | `/my-inquiries/{id}`                                                      |
| **dismissable**       | no                                                                        |
| **expandable**        | no                                                                        |
| **maxImpressions**    | unlimited                                                                 |
| **cooldownMinutes**   | 0                                                                         |
| **expiresAt**         | When chef responds or inquiry expires                                     |
| **scoring**           | 35 base; +2/day waiting (anxiety builds); +10 if 5+ days with no response |
| **interactions**      | Transitions to `inquiry_quoted` or `inquiry_declined`                     |
| **dataSource**        | `inquiries` (status = new)                                                |
| **privacy**           | `private`                                                                 |

#### INQ-002: Inquiry Awaiting Client

| Property              | Value                                             |
| --------------------- | ------------------------------------------------- |
| **type**              | `inquiry_awaiting_client`                         |
| **category**          | Inquiry Lifecycle                                 |
| **label**             | `"Chef {name} replied to your inquiry"`           |
| **sublabel**          | `"Action needed"`                                 |
| **icon**              | `message-circle-alert`                            |
| **presentation**      | `alert`                                           |
| **baseUrgency**       | 60                                                |
| **urgencyDecayFn**    | `linear` (decays 3/day if ignored)                |
| **pageAffinity**      | `/my-inquiries`, `/my-inquiries/{id}`             |
| **pageAffinityBoost** | 20                                                |
| **hoverAction**       | Preview: chef message preview, response options   |
| **clickAction**       | `navigate`                                        |
| **click reveals**     | Inquiry conversation                              |
| **href**              | `/my-inquiries/{id}`                              |
| **dismissable**       | no                                                |
| **expandable**        | no                                                |
| **maxImpressions**    | unlimited                                         |
| **cooldownMinutes**   | 0                                                 |
| **expiresAt**         | When client responds                              |
| **scoring**           | Action required. High visibility.                 |
| **interactions**      | Boosts related `quote_received` if quote attached |
| **dataSource**        | `inquiries` (status = awaiting_client)            |
| **privacy**           | `private`                                         |

#### INQ-003: Inquiry Quoted

| Property              | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| **type**              | `inquiry_quoted`                                       |
| **category**          | Inquiry Lifecycle                                      |
| **label**             | `"Chef {name} quoted your inquiry"`                    |
| **sublabel**          | `"${amount} - Review now"`                             |
| **icon**              | `receipt-check`                                        |
| **presentation**      | `alert`                                                |
| **baseUrgency**       | 65                                                     |
| **urgencyDecayFn**    | `deadline` (quote expiry)                              |
| **pageAffinity**      | `/my-inquiries`, `/my-quotes`                          |
| **pageAffinityBoost** | 20                                                     |
| **hoverAction**       | Preview: quote amount, menu preview, accept/review CTA |
| **clickAction**       | `navigate`                                             |
| **click reveals**     | Quote detail from inquiry                              |
| **href**              | `/my-inquiries/{id}`                                   |
| **dismissable**       | no                                                     |
| **expandable**        | yes: quote breakdown                                   |
| **maxImpressions**    | unlimited                                              |
| **cooldownMinutes**   | 0                                                      |
| **expiresAt**         | Quote expiry                                           |
| **scoring**           | Same as `quote_received`                               |
| **interactions**      | Triggers `quote_received` item creation                |
| **dataSource**        | `inquiries` (status = quoted), linked `quotes`         |
| **privacy**           | `private`                                              |

#### INQ-004: Inquiry Declined

| Property              | Value                                                        |
| --------------------- | ------------------------------------------------------------ |
| **type**              | `inquiry_declined`                                           |
| **category**          | Inquiry Lifecycle                                            |
| **label**             | `"Chef {name} can't take this one"`                          |
| **sublabel**          | `"Try other chefs?"`                                         |
| **icon**              | `user-x`                                                     |
| **presentation**      | `badge`                                                      |
| **baseUrgency**       | 35                                                           |
| **urgencyDecayFn**    | `linear` (decays 3/day)                                      |
| **pageAffinity**      | `/my-inquiries`, `/chefs`                                    |
| **pageAffinityBoost** | 10                                                           |
| **hoverAction**       | Preview: decline reason (if given), similar chefs suggestion |
| **clickAction**       | `navigate`                                                   |
| **click reveals**     | Inquiry detail + browse similar chefs CTA                    |
| **href**              | `/my-inquiries/{id}`                                         |
| **dismissable**       | yes                                                          |
| **expandable**        | yes: suggested alternative chefs                             |
| **maxImpressions**    | 5                                                            |
| **cooldownMinutes**   | 720                                                          |
| **expiresAt**         | 7 days                                                       |
| **scoring**           | +5 if event date is soon (urgency to find replacement)       |
| **interactions**      | Spawns `chef_recommendation` items                           |
| **dataSource**        | `inquiries` (status = declined)                              |
| **privacy**           | `private`                                                    |

#### INQ-005: Inquiry Expired

| Property              | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| **type**              | `inquiry_expired`                                             |
| **category**          | Inquiry Lifecycle                                             |
| **label**             | `"Inquiry to Chef {name} expired"`                            |
| **sublabel**          | `"No response received"`                                      |
| **icon**              | `clock-x`                                                     |
| **presentation**      | `badge`                                                       |
| **baseUrgency**       | 25                                                            |
| **urgencyDecayFn**    | `linear`                                                      |
| **pageAffinity**      | `/my-inquiries`                                               |
| **pageAffinityBoost** | 8                                                             |
| **hoverAction**       | Preview: original inquiry details, re-send or try other chefs |
| **clickAction**       | `navigate`                                                    |
| **click reveals**     | Expired inquiry with retry options                            |
| **href**              | `/my-inquiries/{id}`                                          |
| **dismissable**       | yes                                                           |
| **expandable**        | no                                                            |
| **maxImpressions**    | 3                                                             |
| **cooldownMinutes**   | 1440                                                          |
| **expiresAt**         | 5 days                                                        |
| **scoring**           | Low. Informational.                                           |
| **interactions**      | Spawns `chef_recommendation` items                            |
| **dataSource**        | `inquiries` (status = expired)                                |
| **privacy**           | `private`                                                     |

---

## 6. Communication Signals

#### COM-001: New Message from Chef

| Property              | Value                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| **type**              | `new_chef_message`                                                    |
| **category**          | Communication                                                         |
| **label**             | `"Message from Chef {name}"`                                          |
| **sublabel**          | `"{messagePreview}..."` (truncated)                                   |
| **icon**              | `message-circle`                                                      |
| **presentation**      | `alert`                                                               |
| **baseUrgency**       | 55                                                                    |
| **urgencyDecayFn**    | `linear` (decays 2/day)                                               |
| **pageAffinity**      | `/my-chat`, `/my-chat/{id}`, `/my-events`                             |
| **pageAffinityBoost** | 15                                                                    |
| **hoverAction**       | Preview: message text, timestamp, quick-reply                         |
| **clickAction**       | `navigate`                                                            |
| **click reveals**     | Chat conversation                                                     |
| **href**              | `/my-chat/{chefId}`                                                   |
| **dismissable**       | yes (marks as read)                                                   |
| **expandable**        | no                                                                    |
| **maxImpressions**    | unlimited                                                             |
| **cooldownMinutes**   | 0                                                                     |
| **expiresAt**         | When read                                                             |
| **scoring**           | +10 if event-related; +5 if from a chef with upcoming event           |
| **interactions**      | Badge count on nav chat icon                                          |
| **dataSource**        | `notifications` (action = new_chat_message_to_client, read_at = null) |
| **privacy**           | `private`                                                             |

#### COM-002: Contract Ready

| Property              | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| **type**              | `contract_ready`                                              |
| **category**          | Communication                                                 |
| **label**             | `"Contract ready from Chef {name}"`                           |
| **sublabel**          | `"For {eventTitle}"`                                          |
| **icon**              | `file-signature`                                              |
| **presentation**      | `alert`                                                       |
| **baseUrgency**       | 60                                                            |
| **urgencyDecayFn**    | `deadline` (event date)                                       |
| **pageAffinity**      | `/my-events/{id}/contract`, `/my-documents`                   |
| **pageAffinityBoost** | 20                                                            |
| **hoverAction**       | Preview: contract summary, key terms                          |
| **clickAction**       | `navigate`                                                    |
| **click reveals**     | Contract page                                                 |
| **href**              | `/my-events/{id}/contract`                                    |
| **dismissable**       | no                                                            |
| **expandable**        | no                                                            |
| **maxImpressions**    | unlimited                                                     |
| **cooldownMinutes**   | 0                                                             |
| **expiresAt**         | When signed                                                   |
| **scoring**           | Journey milestone. High priority.                             |
| **interactions**      | Same as `gap_contract_unsigned`; coalesces with it            |
| **dataSource**        | `contracts` (status = sent), `notifications` (contract_ready) |
| **privacy**           | `private`                                                     |

#### COM-003: Menu Updated

| Property              | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| **type**              | `menu_updated`                                         |
| **category**          | Communication                                          |
| **label**             | `"Menu updated for {eventTitle}"`                      |
| **sublabel**          | `"Chef {name} made changes"`                           |
| **icon**              | `utensils-refresh`                                     |
| **presentation**      | `card`                                                 |
| **baseUrgency**       | 45                                                     |
| **urgencyDecayFn**    | `deadline` (event date)                                |
| **pageAffinity**      | `/my-events/{id}`, `/my-events/{id}/approve-menu`      |
| **pageAffinityBoost** | 15                                                     |
| **hoverAction**       | Preview: what changed (diff), re-approval needed?      |
| **clickAction**       | `navigate`                                             |
| **click reveals**     | Menu approval page                                     |
| **href**              | `/my-events/{id}/approve-menu`                         |
| **dismissable**       | yes (if no re-approval needed)                         |
| **expandable**        | yes: change summary                                    |
| **maxImpressions**    | 10                                                     |
| **cooldownMinutes**   | 120                                                    |
| **expiresAt**         | Event date                                             |
| **scoring**           | +10 if re-approval required; +5 if event within 7 days |
| **interactions**      | Resets `gap_menu_unconfirmed` if re-approval needed    |
| **dataSource**        | `notifications` (menu_shared/menu_update)              |
| **privacy**           | `household_visible`                                    |

#### COM-004: Photos Ready

| Property              | Value                                         |
| --------------------- | --------------------------------------------- |
| **type**              | `photos_ready`                                |
| **category**          | Communication                                 |
| **label**             | `"Photos from {eventTitle} are ready"`        |
| **sublabel**          | `"{n} photos"`                                |
| **icon**              | `camera`                                      |
| **presentation**      | `card`                                        |
| **baseUrgency**       | 30                                            |
| **urgencyDecayFn**    | `linear` (decays 2/day)                       |
| **pageAffinity**      | `/my-events/{id}/recap`, `/my-events/history` |
| **pageAffinityBoost** | 10                                            |
| **hoverAction**       | Preview: photo thumbnails                     |
| **clickAction**       | `navigate`                                    |
| **click reveals**     | Event recap/photos                            |
| **href**              | `/my-events/{id}/recap`                       |
| **dismissable**       | yes                                           |
| **expandable**        | yes: photo grid preview                       |
| **maxImpressions**    | 5                                             |
| **cooldownMinutes**   | 1440                                          |
| **expiresAt**         | 14 days                                       |
| **scoring**           | Engagement driver. +5 if review not yet left. |
| **interactions**      | Boosts `review_prompt` item                   |
| **dataSource**        | `notifications` (photos_ready), `hub_media`   |
| **privacy**           | `event_visible`                               |

#### COM-005: Event Reminder (7d / 2d / 1d)

| Property              | Value                                                |
| --------------------- | ---------------------------------------------------- |
| **type**              | `event_reminder`                                     |
| **category**          | Communication                                        |
| **label**             | `"{eventTitle} in {n} days"`                         |
| **sublabel**          | `"With Chef {name}"`                                 |
| **icon**              | `bell`                                               |
| **presentation**      | `badge` (7d), `card` (2d), `alert` (1d)              |
| **baseUrgency**       | 40 (7d), 65 (2d), 85 (1d)                            |
| **urgencyDecayFn**    | `step`                                               |
| **pageAffinity**      | `/my-events`, `/my-calendar`                         |
| **pageAffinityBoost** | 15                                                   |
| **hoverAction**       | Preview: event summary, completion status, any gaps  |
| **clickAction**       | `navigate`                                           |
| **click reveals**     | Event detail                                         |
| **href**              | `/my-events/{id}`                                    |
| **dismissable**       | yes                                                  |
| **expandable**        | no                                                   |
| **maxImpressions**    | 3 per reminder tier                                  |
| **cooldownMinutes**   | 480                                                  |
| **expiresAt**         | Event date                                           |
| **scoring**           | Step function: jumps at 7d, 2d, 1d thresholds        |
| **interactions**      | Coalesces with `event_upcoming` to avoid duplication |
| **dataSource**        | `notifications` (event*reminder*\*)                  |
| **privacy**           | `household_visible`                                  |

---

## 7. Payment Signals

#### PAY-001: Payment Overdue

| Property              | Value                                           |
| --------------------- | ----------------------------------------------- |
| **type**              | `payment_overdue`                               |
| **category**          | Payment                                         |
| **label**             | `"Payment overdue: ${amount}"`                  |
| **sublabel**          | `"{daysOverdue} days late for {eventTitle}"`    |
| **icon**              | `dollar-sign-alert-red`                         |
| **presentation**      | `alert`                                         |
| **baseUrgency**       | 92                                              |
| **urgencyDecayFn**    | `none` (stays high)                             |
| **pageAffinity**      | All pages                                       |
| **pageAffinityBoost** | 30                                              |
| **hoverAction**       | Preview: amount, original due date, pay now CTA |
| **clickAction**       | `navigate`                                      |
| **click reveals**     | Payment page                                    |
| **href**              | `/my-events/{id}/pay`                           |
| **dismissable**       | no                                              |
| **expandable**        | no                                              |
| **maxImpressions**    | unlimited                                       |
| **cooldownMinutes**   | 0                                               |
| **expiresAt**         | Never (until paid)                              |
| **scoring**           | Near-maximum urgency. Top 3 position always.    |
| **interactions**      | Suppresses non-critical discovery items         |
| **dataSource**        | `payments`/`invoices` (past due)                |
| **privacy**           | `private`                                       |

#### PAY-002: Payment Confirmed

| Property              | Value                                      |
| --------------------- | ------------------------------------------ |
| **type**              | `payment_confirmed`                        |
| **category**          | Payment                                    |
| **label**             | `"Payment received: ${amount}"`            |
| **sublabel**          | `"For {eventTitle}"`                       |
| **icon**              | `check-circle-green`                       |
| **presentation**      | `badge`                                    |
| **baseUrgency**       | 15                                         |
| **urgencyDecayFn**    | `linear` (decays 5/day)                    |
| **pageAffinity**      | `/my-spending`, `/my-events/{id}`          |
| **pageAffinityBoost** | 5                                          |
| **hoverAction**       | Preview: receipt summary, download receipt |
| **clickAction**       | `navigate`                                 |
| **click reveals**     | Receipt/invoice detail                     |
| **href**              | `/my-events/{id}/invoice`                  |
| **dismissable**       | yes                                        |
| **expandable**        | no                                         |
| **maxImpressions**    | 3                                          |
| **cooldownMinutes**   | 1440                                       |
| **expiresAt**         | 3 days                                     |
| **scoring**           | Confirmation signal. Low urgency.          |
| **interactions**      | Clears related `gap_payment_due` item      |
| **dataSource**        | `notifications` (event_paid_to_client)     |
| **privacy**           | `private`                                  |

#### PAY-003: Refund Processed

| Property              | Value                                                             |
| --------------------- | ----------------------------------------------------------------- |
| **type**              | `refund_processed`                                                |
| **category**          | Payment                                                           |
| **label**             | `"Refund: ${amount}"`                                             |
| **sublabel**          | `"For {eventTitle} - {refundReason}"`                             |
| **icon**              | `arrow-down-circle`                                               |
| **presentation**      | `card`                                                            |
| **baseUrgency**       | 40                                                                |
| **urgencyDecayFn**    | `linear` (decays 3/day)                                           |
| **pageAffinity**      | `/my-spending`, `/my-receipts`                                    |
| **pageAffinityBoost** | 10                                                                |
| **hoverAction**       | Preview: refund amount, timeline to account, original transaction |
| **clickAction**       | `navigate`                                                        |
| **click reveals**     | Refund detail                                                     |
| **href**              | `/my-spending`                                                    |
| **dismissable**       | yes                                                               |
| **expandable**        | no                                                                |
| **maxImpressions**    | 5                                                                 |
| **cooldownMinutes**   | 720                                                               |
| **expiresAt**         | 7 days                                                            |
| **scoring**           | Informational. Moderate urgency.                                  |
| **interactions**      | Clears related `event_cancelled` urgency                          |
| **dataSource**        | `notifications` (refund_processed_to_client)                      |
| **privacy**           | `private`                                                         |

#### PAY-004: Recurring Payment Due

| Property              | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| **type**              | `recurring_payment_due`                                    |
| **category**          | Payment                                                    |
| **label**             | `"Recurring payment: ${amount}"`                           |
| **sublabel**          | `"Due {dueDate} - {frequency}"`                            |
| **icon**              | `repeat-dollar`                                            |
| **presentation**      | `badge`                                                    |
| **baseUrgency**       | 50                                                         |
| **urgencyDecayFn**    | `deadline`                                                 |
| **pageAffinity**      | `/my-recurring`, `/my-spending`                            |
| **pageAffinityBoost** | 15                                                         |
| **hoverAction**       | Preview: plan details, remaining payments, auto-pay status |
| **clickAction**       | `navigate`                                                 |
| **click reveals**     | Recurring payment detail                                   |
| **href**              | `/my-recurring`                                            |
| **dismissable**       | no                                                         |
| **expandable**        | yes: payment schedule                                      |
| **maxImpressions**    | unlimited                                                  |
| **cooldownMinutes**   | 0                                                          |
| **expiresAt**         | Due date                                                   |
| **scoring**           | +10 if auto-pay not enabled; ramps near due date           |
| **interactions**      | None                                                       |
| **dataSource**        | `recurring_invoices` (is_active = true)                    |
| **privacy**           | `private`                                                  |

#### PAY-005: Payment Split Pending

| Property              | Value                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| **type**              | `payment_split_pending`                                               |
| **category**          | Payment                                                               |
| **label**             | `"Your share: ${amount}"`                                             |
| **sublabel**          | `"Split payment for {eventTitle}"`                                    |
| **icon**              | `split-dollar`                                                        |
| **presentation**      | `alert`                                                               |
| **baseUrgency**       | 55                                                                    |
| **urgencyDecayFn**    | `deadline`                                                            |
| **pageAffinity**      | `/my-events/{id}/split`, `/my-spending`                               |
| **pageAffinityBoost** | 15                                                                    |
| **hoverAction**       | Preview: total, your share, who else is splitting, paid/unpaid status |
| **clickAction**       | `navigate`                                                            |
| **click reveals**     | Payment split page                                                    |
| **href**              | `/my-events/{id}/split`                                               |
| **dismissable**       | no                                                                    |
| **expandable**        | yes: per-person split breakdown                                       |
| **maxImpressions**    | unlimited                                                             |
| **cooldownMinutes**   | 0                                                                     |
| **expiresAt**         | When paid                                                             |
| **scoring**           | +5 if others have already paid (social pressure)                      |
| **interactions**      | Related to `gap_payment_due`                                          |
| **dataSource**        | Payment splitting tables                                              |
| **privacy**           | `event_visible`                                                       |

---

## 8. Dietary Profile

#### DIET-001: Dietary Profile Incomplete

| Property              | Value                                                           |
| --------------------- | --------------------------------------------------------------- |
| **type**              | `dietary_profile_incomplete`                                    |
| **category**          | Dietary Profile                                                 |
| **label**             | `"Complete your dietary profile"`                               |
| **sublabel**          | `"{completionPct}% done - chefs need this"`                     |
| **icon**              | `leaf-plus`                                                     |
| **presentation**      | `progress`                                                      |
| **baseUrgency**       | 40                                                              |
| **urgencyDecayFn**    | `step` (jumps when event booked)                                |
| **pageAffinity**      | `/my-dietary`, `/my-passport`, `/my-profile`                    |
| **pageAffinityBoost** | 20                                                              |
| **hoverAction**       | Preview: what's missing (allergies? preferences? restrictions?) |
| **clickAction**       | `navigate`                                                      |
| **click reveals**     | Dietary profile page                                            |
| **href**              | `/my-dietary`                                                   |
| **dismissable**       | yes (with "remind me later" cooldown)                           |
| **expandable**        | yes: missing categories                                         |
| **maxImpressions**    | 15                                                              |
| **cooldownMinutes**   | 2880 (48hr)                                                     |
| **expiresAt**         | When complete                                                   |
| **scoring**           | +20 if event booked with no dietary info; +10 if new account    |
| **interactions**      | Feeds into event completion gaps                                |
| **dataSource**        | `discovery_profile_items`, dietary trust levels                 |
| **privacy**           | `chef_visible`                                                  |

#### DIET-002: Allergy Confirmation Needed

| Property              | Value                                                            |
| --------------------- | ---------------------------------------------------------------- |
| **type**              | `allergy_confirmation`                                           |
| **category**          | Dietary Profile                                                  |
| **label**             | `"Confirm allergy: {allergen}"`                                  |
| **sublabel**          | `"Detected from {source}"`                                       |
| **icon**              | `shield-alert`                                                   |
| **presentation**      | `alert`                                                          |
| **baseUrgency**       | 70                                                               |
| **urgencyDecayFn**    | `none`                                                           |
| **pageAffinity**      | `/my-dietary`, `/my-passport`                                    |
| **pageAffinityBoost** | 20                                                               |
| **hoverAction**       | Preview: allergen details, source of detection, severity options |
| **clickAction**       | `quick_action` (confirm/deny inline)                             |
| **click reveals**     | Inline allergy confirmation with severity selector               |
| **href**              | `/my-dietary`                                                    |
| **dismissable**       | no (safety-critical)                                             |
| **expandable**        | no                                                               |
| **maxImpressions**    | unlimited                                                        |
| **cooldownMinutes**   | 0                                                                |
| **expiresAt**         | When confirmed or denied                                         |
| **scoring**           | Safety-critical. Trust level = `review_needed`. Always shown.    |
| **interactions**      | Blocks sharing dietary info with chefs until confirmed           |
| **dataSource**        | Preference capture with trust_level = review_needed              |
| **privacy**           | `chef_visible` (after confirmed)                                 |

---

## 9. Household Members

#### HH-001: Household Member Incomplete

| Property              | Value                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------- |
| **type**              | `household_member_incomplete`                                                           |
| **category**          | Household                                                                               |
| **label**             | `"Complete {memberName}'s profile"`                                                     |
| **sublabel**          | `"Missing: {missingFields}"`                                                            |
| **icon**              | `user-plus`                                                                             |
| **presentation**      | `badge`                                                                                 |
| **baseUrgency**       | 25                                                                                      |
| **urgencyDecayFn**    | `step` (jumps when event includes this member)                                          |
| **pageAffinity**      | `/my-household`, `/my-events/{id}/guests`                                               |
| **pageAffinityBoost** | 15                                                                                      |
| **hoverAction**       | Preview: member name, what's missing (dietary, allergies, preferences)                  |
| **clickAction**       | `navigate`                                                                              |
| **click reveals**     | Household member edit page                                                              |
| **href**              | `/my-household`                                                                         |
| **dismissable**       | yes                                                                                     |
| **expandable**        | yes: missing field list                                                                 |
| **maxImpressions**    | 10                                                                                      |
| **cooldownMinutes**   | 2880                                                                                    |
| **expiresAt**         | When complete                                                                           |
| **scoring**           | +15 if member is guest at upcoming event; +5 if has known allergies but no severity set |
| **interactions**      | Feeds `gap_dietary_missing` for events                                                  |
| **dataSource**        | `hub_guest_profiles`                                                                    |
| **privacy**           | `household_visible`                                                                     |

#### HH-002: Household Dietary Alert

| Property              | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| **type**              | `household_dietary_alert`                                     |
| **category**          | Household                                                     |
| **label**             | `"{memberName} has a new allergy"`                            |
| **sublabel**          | `"Update for upcoming events"`                                |
| **icon**              | `shield-user`                                                 |
| **presentation**      | `alert`                                                       |
| **baseUrgency**       | 65                                                            |
| **urgencyDecayFn**    | `step`                                                        |
| **pageAffinity**      | `/my-household`, `/my-dietary`, `/my-events`                  |
| **pageAffinityBoost** | 20                                                            |
| **hoverAction**       | Preview: member, allergen, affected upcoming events           |
| **clickAction**       | `navigate`                                                    |
| **click reveals**     | Household member dietary page                                 |
| **href**              | `/my-household`                                               |
| **dismissable**       | no (safety)                                                   |
| **expandable**        | yes: affected events list                                     |
| **maxImpressions**    | unlimited                                                     |
| **cooldownMinutes**   | 0                                                             |
| **expiresAt**         | When acknowledged                                             |
| **scoring**           | Safety-critical. +15 if upcoming event exists.                |
| **interactions**      | Triggers `gap_dietary_missing` on affected events             |
| **dataSource**        | `notifications` (guest_dietary_alert, client_allergy_changed) |
| **privacy**           | `chef_visible` (for booked events)                            |

---

## 10. Dinner Circle Activity

#### CIR-001: Circle Poll Active

| Property              | Value                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| **type**              | `circle_poll_active`                                                            |
| **category**          | Dinner Circle                                                                   |
| **label**             | `"Vote: {pollQuestion}"`                                                        |
| **sublabel**          | `"In {circleName} - {votesCount}/{memberCount} voted"`                          |
| **icon**              | `bar-chart`                                                                     |
| **presentation**      | `card`                                                                          |
| **baseUrgency**       | 45                                                                              |
| **urgencyDecayFn**    | `deadline` (poll end date)                                                      |
| **pageAffinity**      | `/my-hub`, `/my-hub/g/{token}`                                                  |
| **pageAffinityBoost** | 15                                                                              |
| **hoverAction**       | Preview: poll options, current vote distribution (if visible), your vote status |
| **clickAction**       | `navigate`                                                                      |
| **click reveals**     | Circle page with poll focused                                                   |
| **href**              | `/my-hub/g/{groupToken}`                                                        |
| **dismissable**       | no (until voted)                                                                |
| **expandable**        | yes: poll options for inline voting                                             |
| **maxImpressions**    | unlimited                                                                       |
| **cooldownMinutes**   | 0                                                                               |
| **expiresAt**         | Poll close date                                                                 |
| **scoring**           | +10 if you haven't voted; +5 if most members have voted (social pressure)       |
| **interactions**      | Sub-item of parent `circle` item                                                |
| **dataSource**        | `hub_polls`, `hub_poll_votes`                                                   |
| **privacy**           | `event_visible`                                                                 |

#### CIR-002: Circle Planning Event

| Property              | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| **type**              | `circle_planning`                                          |
| **category**          | Dinner Circle                                              |
| **label**             | `"{circleName} is planning a dinner"`                      |
| **sublabel**          | `"Status: {stubStatus}"` (planning/seeking_chef/adopted)   |
| **icon**              | `users-planning`                                           |
| **presentation**      | `card`                                                     |
| **baseUrgency**       | 40                                                         |
| **urgencyDecayFn**    | `step` (jumps at status transitions)                       |
| **pageAffinity**      | `/my-hub`, `/my-hub/g/{token}`                             |
| **pageAffinityBoost** | 15                                                         |
| **hoverAction**       | Preview: event stub details, member RSVPs, chef candidates |
| **clickAction**       | `navigate`                                                 |
| **click reveals**     | Circle event planning page                                 |
| **href**              | `/my-hub/g/{groupToken}`                                   |
| **dismissable**       | no                                                         |
| **expandable**        | yes: planning brief, chef candidates, your RSVP status     |
| **maxImpressions**    | unlimited                                                  |
| **cooldownMinutes**   | 120                                                        |
| **expiresAt**         | When event stub is adopted or cancelled                    |
| **scoring**           | +10 if `seeking_chef`; +5 if your RSVP is pending          |
| **interactions**      | Links to `event_upcoming` when adopted                     |
| **dataSource**        | `event_stubs`, `hub_group_candidates`                      |
| **privacy**           | `event_visible`                                            |

#### CIR-003: Circle New Message

| Property              | Value                                     |
| --------------------- | ----------------------------------------- |
| **type**              | `circle_message`                          |
| **category**          | Dinner Circle                             |
| **label**             | `"New in {circleName}"`                   |
| **sublabel**          | `"{senderName}: {preview}..."`            |
| **icon**              | `message-circle`                          |
| **presentation**      | `badge`                                   |
| **baseUrgency**       | 30                                        |
| **urgencyDecayFn**    | `linear` (decays 2/day)                   |
| **pageAffinity**      | `/my-hub`, `/my-hub/g/{token}`            |
| **pageAffinityBoost** | 10                                        |
| **hoverAction**       | Preview: last 2-3 messages                |
| **clickAction**       | `navigate`                                |
| **click reveals**     | Circle conversation                       |
| **href**              | `/my-hub/g/{groupToken}`                  |
| **dismissable**       | yes (marks read)                          |
| **expandable**        | no                                        |
| **maxImpressions**    | unlimited                                 |
| **cooldownMinutes**   | 60                                        |
| **expiresAt**         | When read                                 |
| **scoring**           | +5 per unread message; batch if 3+ unread |
| **interactions**      | Badge on hub nav icon                     |
| **dataSource**        | `hub_messages`, hub notification counts   |
| **privacy**           | `event_visible`                           |

#### CIR-004: Circle RSVP Needed

| Property              | Value                                                            |
| --------------------- | ---------------------------------------------------------------- |
| **type**              | `circle_rsvp`                                                    |
| **category**          | Dinner Circle                                                    |
| **label**             | `"RSVP for {eventTitle}"`                                        |
| **sublabel**          | `"In {circleName} - {date}"`                                     |
| **icon**              | `calendar-check`                                                 |
| **presentation**      | `alert`                                                          |
| **baseUrgency**       | 55                                                               |
| **urgencyDecayFn**    | `deadline`                                                       |
| **pageAffinity**      | `/my-hub`, `/my-hub/g/{token}`                                   |
| **pageAffinityBoost** | 15                                                               |
| **hoverAction**       | Preview: event details, who's going, RSVP buttons                |
| **clickAction**       | `quick_action` (inline RSVP)                                     |
| **click reveals**     | Accept/Decline/Maybe inline                                      |
| **href**              | `/my-hub/g/{groupToken}`                                         |
| **dismissable**       | no                                                               |
| **expandable**        | no                                                               |
| **maxImpressions**    | unlimited                                                        |
| **cooldownMinutes**   | 0                                                                |
| **expiresAt**         | RSVP deadline or event date                                      |
| **scoring**           | +10 if RSVP deadline approaching; +5 if most members have RSVP'd |
| **interactions**      | Creates `event_upcoming` once adopted                            |
| **dataSource**        | `hub_group_members` (rsvp_status), `event_stubs`                 |
| **privacy**           | `event_visible`                                                  |

#### CIR-005: Meal Board Update

| Property              | Value                                       |
| --------------------- | ------------------------------------------- |
| **type**              | `meal_board_update`                         |
| **category**          | Dinner Circle                               |
| **label**             | `"Meal planned: {mealTitle}"`               |
| **sublabel**          | `"In {circleName} for {date}"`              |
| **icon**              | `utensils`                                  |
| **presentation**      | `badge`                                     |
| **baseUrgency**       | 20                                          |
| **urgencyDecayFn**    | `linear`                                    |
| **pageAffinity**      | `/my-hub/g/{token}/meal-board`, `/my-meals` |
| **pageAffinityBoost** | 10                                          |
| **hoverAction**       | Preview: meal details, type, who planned it |
| **clickAction**       | `navigate`                                  |
| **click reveals**     | Meal board                                  |
| **href**              | `/my-hub/g/{groupToken}/meal-board`         |
| **dismissable**       | yes                                         |
| **expandable**        | no                                          |
| **maxImpressions**    | 10                                          |
| **cooldownMinutes**   | 360                                         |
| **expiresAt**         | Meal date                                   |
| **scoring**           | +5 if you have a pending meal request       |
| **interactions**      | None                                        |
| **dataSource**        | `meal_board_entries`, `meal_requests`       |
| **privacy**           | `event_visible`                             |

---

## 11. Saved Chefs & Items

#### SAV-001: Saved Chef Activity

| Property              | Value                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| **type**              | `saved_chef_activity`                                                 |
| **category**          | Saved                                                                 |
| **label**             | `"Chef {name} has new availability"`                                  |
| **sublabel**          | `"Open dates in {month}"` or `"New menu posted"`                      |
| **icon**              | Chef avatar with heart badge                                          |
| **presentation**      | `card`                                                                |
| **baseUrgency**       | 25                                                                    |
| **urgencyDecayFn**    | `linear`                                                              |
| **pageAffinity**      | `/my-hub/favorite-operators`, `/chefs`                                |
| **pageAffinityBoost** | 10                                                                    |
| **hoverAction**       | Preview: chef profile snippet, new availability dates, new menu items |
| **clickAction**       | `navigate`                                                            |
| **click reveals**     | Chef profile                                                          |
| **href**              | `/chefs/{slug}`                                                       |
| **dismissable**       | yes                                                                   |
| **expandable**        | yes: available dates, new menus                                       |
| **maxImpressions**    | 5                                                                     |
| **cooldownMinutes**   | 1440                                                                  |
| **expiresAt**         | 7 days                                                                |
| **scoring**           | +5 per booking with this chef; +3 if recently saved                   |
| **interactions**      | Boosts `rebook_suggestion` if previously booked                       |
| **dataSource**        | `consumer_saved_chefs`, chef availability updates                     |
| **privacy**           | `private`                                                             |

#### SAV-002: Saved Recipe

| Property              | Value                                             |
| --------------------- | ------------------------------------------------- |
| **type**              | `saved_recipe`                                    |
| **category**          | Saved                                             |
| **label**             | `"Saved: {recipeName}"`                           |
| **sublabel**          | `"From {eventTitle}"` or `"From Chef {name}"`     |
| **icon**              | `book-heart`                                      |
| **presentation**      | `pill`                                            |
| **baseUrgency**       | 8                                                 |
| **urgencyDecayFn**    | `none`                                            |
| **pageAffinity**      | `/my-recipes`, `/my-meals`                        |
| **pageAffinityBoost** | 10                                                |
| **hoverAction**       | Preview: recipe thumbnail, ingredients, prep time |
| **clickAction**       | `navigate`                                        |
| **click reveals**     | Recipe detail                                     |
| **href**              | `/my-recipes/{id}`                                |
| **dismissable**       | yes (unsaves)                                     |
| **expandable**        | no                                                |
| **maxImpressions**    | unlimited                                         |
| **cooldownMinutes**   | 720                                               |
| **expiresAt**         | Never                                             |
| **scoring**           | +2 if seasonal ingredients match current season   |
| **interactions**      | Feeds `preference_evolution` signals              |
| **dataSource**        | Saved recipes collection                          |
| **privacy**           | `private`                                         |

---

## 12. Chef Recommendations

#### REC-001: Personalized Chef Recommendation

| Property              | Value                                                                       |
| --------------------- | --------------------------------------------------------------------------- |
| **type**              | `chef_recommendation`                                                       |
| **category**          | Recommendations                                                             |
| **label**             | `"Try Chef {name}"`                                                         |
| **sublabel**          | `"Based on your love of {cuisineOrSignal}"`                                 |
| **icon**              | Chef avatar                                                                 |
| **presentation**      | `visual_card`                                                               |
| **baseUrgency**       | 15                                                                          |
| **urgencyDecayFn**    | `linear` (slow)                                                             |
| **pageAffinity**      | `/chefs`, `/book-now`                                                       |
| **pageAffinityBoost** | 10                                                                          |
| **hoverAction**       | Preview: chef profile, why recommended, specialties, rating, starting price |
| **clickAction**       | `navigate`                                                                  |
| **click reveals**     | Chef profile                                                                |
| **href**              | `/chefs/{slug}`                                                             |
| **dismissable**       | yes                                                                         |
| **expandable**        | yes: recommendation reasoning, sample menus                                 |
| **maxImpressions**    | 5                                                                           |
| **cooldownMinutes**   | 2880                                                                        |
| **expiresAt**         | 14 days                                                                     |
| **scoring**           | Weighted: taste match (40%), location (25%), budget (20%), novelty (15%)    |
| **interactions**      | Generated after `inquiry_declined` or `inquiry_expired`; also periodic      |
| **dataSource**        | Recommendation engine using taste passport, location, budget, past events   |
| **privacy**           | `private`                                                                   |

---

## 13. Seasonal Opportunities

#### SEA-001: Seasonal Event Opportunity

| Property              | Value                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **type**              | `seasonal_opportunity`                                                                        |
| **category**          | Seasonal                                                                                      |
| **label**             | `"{opportunityTitle}"` (e.g. "Farm dinner season is starting", "Holiday booking window open") |
| **sublabel**          | `"Book by {deadline} for best availability"`                                                  |
| **icon**              | `leaf`, `snowflake`, `sun`, `flower` (season-specific)                                        |
| **presentation**      | `story`                                                                                       |
| **baseUrgency**       | 20                                                                                            |
| **urgencyDecayFn**    | `deadline` (booking window)                                                                   |
| **pageAffinity**      | `/chefs`, `/book-now`, `/browse-dates`                                                        |
| **pageAffinityBoost** | 10                                                                                            |
| **hoverAction**       | Preview: what's special about this season, available chefs, typical pricing                   |
| **clickAction**       | `navigate`                                                                                    |
| **click reveals**     | Seasonal collection/landing page                                                              |
| **href**              | `/eat?seasonal={slug}`                                                                        |
| **dismissable**       | yes                                                                                           |
| **expandable**        | yes: featured chefs, sample menus, booking CTA                                                |
| **maxImpressions**    | 8                                                                                             |
| **cooldownMinutes**   | 2880                                                                                          |
| **expiresAt**         | End of booking window                                                                         |
| **scoring**           | +5 if client has booked seasonal events before; +3 if local farm partners available           |
| **interactions**      | Boosts `seasonal` discovery items                                                             |
| **dataSource**        | Editorial calendar, seasonal scoring (PIE), chef availability                                 |
| **privacy**           | `private`                                                                                     |

---

## 14. Gift Cards

#### GC-001: Gift Card Received

| Property              | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| **type**              | `gift_card_received`                                   |
| **category**          | Gift Cards                                             |
| **label**             | `"You received a gift card!"`                          |
| **sublabel**          | `"${amount} from {senderName}"`                        |
| **icon**              | `gift`                                                 |
| **presentation**      | `alert`                                                |
| **baseUrgency**       | 50                                                     |
| **urgencyDecayFn**    | `linear` (slow)                                        |
| **pageAffinity**      | `/my-gift-cards`, `/my-rewards`                        |
| **pageAffinityBoost** | 15                                                     |
| **hoverAction**       | Preview: amount, sender, design, redeem CTA            |
| **clickAction**       | `navigate`                                             |
| **click reveals**     | Gift card detail                                       |
| **href**              | `/my-gift-cards`                                       |
| **dismissable**       | yes                                                    |
| **expandable**        | no                                                     |
| **maxImpressions**    | 5                                                      |
| **cooldownMinutes**   | 1440                                                   |
| **expiresAt**         | 14 days (the notification; card itself may not expire) |
| **scoring**           | First-time engagement driver                           |
| **interactions**      | Boosts `book-now` and discovery items                  |
| **dataSource**        | `gift_cards`, `notifications` (gift_card_redeemed)     |
| **privacy**           | `private`                                              |

#### GC-002: Gift Card Balance

| Property              | Value                                                    |
| --------------------- | -------------------------------------------------------- |
| **type**              | `gift_card_balance`                                      |
| **category**          | Gift Cards                                               |
| **label**             | `"Gift card balance: ${amount}"`                         |
| **sublabel**          | `"Use it on your next booking"`                          |
| **icon**              | `gift`                                                   |
| **presentation**      | `badge`                                                  |
| **baseUrgency**       | 12                                                       |
| **urgencyDecayFn**    | `none`                                                   |
| **pageAffinity**      | `/my-gift-cards`, `/book-now`, `/my-events/{id}/pay`     |
| **pageAffinityBoost** | 10                                                       |
| **hoverAction**       | Preview: balance, original amount, applicable bookings   |
| **clickAction**       | `navigate`                                               |
| **click reveals**     | Gift card management                                     |
| **href**              | `/my-gift-cards`                                         |
| **dismissable**       | yes                                                      |
| **expandable**        | no                                                       |
| **maxImpressions**    | 10                                                       |
| **cooldownMinutes**   | 2880                                                     |
| **expiresAt**         | Card expiry date                                         |
| **scoring**           | +5 when on payment pages; +3 if balance covers a booking |
| **interactions**      | Shows as payment option in `gap_payment_due` expand      |
| **dataSource**        | `gift_cards` (balance > 0)                               |
| **privacy**           | `private`                                                |

#### GC-003: Gift Card Expiring

| Property              | Value                                          |
| --------------------- | ---------------------------------------------- |
| **type**              | `gift_card_expiring`                           |
| **category**          | Gift Cards                                     |
| **label**             | `"Gift card expires {timeRemaining}"`          |
| **sublabel**          | `"${balance} remaining"`                       |
| **icon**              | `gift-alert`                                   |
| **presentation**      | `alert`                                        |
| **baseUrgency**       | 60                                             |
| **urgencyDecayFn**    | `deadline`                                     |
| **pageAffinity**      | `/my-gift-cards`, `/book-now`                  |
| **pageAffinityBoost** | 20                                             |
| **hoverAction**       | Preview: balance, expiry date, book now CTA    |
| **clickAction**       | `navigate`                                     |
| **click reveals**     | Gift card + booking flow                       |
| **href**              | `/my-gift-cards`                               |
| **dismissable**       | no                                             |
| **expandable**        | no                                             |
| **maxImpressions**    | unlimited                                      |
| **cooldownMinutes**   | 0                                              |
| **expiresAt**         | Expiry date                                    |
| **scoring**           | Exponential urgency in final 7 days            |
| **interactions**      | Boosts booking discovery items                 |
| **dataSource**        | `gift_cards` (expiry approaching, balance > 0) |
| **privacy**           | `private`                                      |

---

## 15. Referral Rewards

#### REF-001: Referral Status

| Property              | Value                                               |
| --------------------- | --------------------------------------------------- |
| **type**              | `referral_status`                                   |
| **category**          | Referral                                            |
| **label**             | `"Referral update: {refereeName}"`                  |
| **sublabel**          | `"Status: {status}"` (contacted/booked/completed)   |
| **icon**              | `users-plus`                                        |
| **presentation**      | `badge`                                             |
| **baseUrgency**       | 20                                                  |
| **urgencyDecayFn**    | `step`                                              |
| **pageAffinity**      | `/my-referrals`, `/my-rewards`                      |
| **pageAffinityBoost** | 10                                                  |
| **hoverAction**       | Preview: referral progress, reward status, timeline |
| **clickAction**       | `navigate`                                          |
| **click reveals**     | Referral detail                                     |
| **href**              | `/my-referrals`                                     |
| **dismissable**       | yes                                                 |
| **expandable**        | no                                                  |
| **maxImpressions**    | 5                                                   |
| **cooldownMinutes**   | 1440                                                |
| **expiresAt**         | 14 days after status change                         |
| **scoring**           | +10 when referral completes (reward earned!)        |
| **interactions**      | Triggers loyalty point award on completion          |
| **dataSource**        | `referrals`                                         |
| **privacy**           | `private`                                           |

#### REF-002: Referral Invite Prompt

| Property              | Value                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| **type**              | `referral_invite`                                                                        |
| **category**          | Referral                                                                                 |
| **label**             | `"Invite friends, earn rewards"`                                                         |
| **sublabel**          | `"Get ${rewardAmount} per successful referral"`                                          |
| **icon**              | `share`                                                                                  |
| **presentation**      | `pill`                                                                                   |
| **baseUrgency**       | 8                                                                                        |
| **urgencyDecayFn**    | `none`                                                                                   |
| **pageAffinity**      | `/my-referrals`, `/my-rewards`, `/my-hub/friends`                                        |
| **pageAffinityBoost** | 8                                                                                        |
| **hoverAction**       | Preview: reward structure, share link                                                    |
| **clickAction**       | `navigate`                                                                               |
| **click reveals**     | Referral sharing page                                                                    |
| **href**              | `/my-referrals`                                                                          |
| **dismissable**       | yes                                                                                      |
| **expandable**        | no                                                                                       |
| **maxImpressions**    | 8                                                                                        |
| **cooldownMinutes**   | 4320 (3 days)                                                                            |
| **expiresAt**         | Never                                                                                    |
| **scoring**           | +5 after a great event (happy client = likely to refer); suppress if already referred 3+ |
| **interactions**      | Post-event companion to review/tip prompts                                               |
| **dataSource**        | Referral program rules, `referrals` count                                                |
| **privacy**           | `private`                                                                                |

---

## 16. Review Prompts

#### REV-001: Leave a Review

| Property              | Value                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **type**              | `review_prompt`                                                                           |
| **category**          | Reviews                                                                                   |
| **label**             | `"How was Chef {name}?"`                                                                  |
| **sublabel**          | `"Rate your {eventTitle} experience"`                                                     |
| **icon**              | `star`                                                                                    |
| **presentation**      | `card`                                                                                    |
| **baseUrgency**       | 40                                                                                        |
| **urgencyDecayFn**    | `linear` (decays 2/day)                                                                   |
| **pageAffinity**      | `/my-reviews`, `/my-events/{id}`, `/my-events/history`                                    |
| **pageAffinityBoost** | 15                                                                                        |
| **hoverAction**       | Preview: event recap highlights, star rating selector                                     |
| **clickAction**       | `navigate`                                                                                |
| **click reveals**     | Review form                                                                               |
| **href**              | `/my-events/{id}/recap` (with review section focused)                                     |
| **dismissable**       | yes                                                                                       |
| **expandable**        | yes: quick star rating inline                                                             |
| **maxImpressions**    | 8                                                                                         |
| **cooldownMinutes**   | 1440                                                                                      |
| **expiresAt**         | 30 days post-event                                                                        |
| **scoring**           | Highest 1-3 days post-event; +5 if photos were shared; badge: `share_review` journey step |
| **interactions**      | Appears after `event_summary_ready`; pairs with `tip_prompt`                              |
| **dataSource**        | `events` (status = completed), `reviews` (not exists for this event)                      |
| **privacy**           | `private`                                                                                 |

---

## 17. Tip Prompts

#### TIP-001: Add a Tip

| Property              | Value                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| **type**              | `tip_prompt`                                                                 |
| **category**          | Tips                                                                         |
| **label**             | `"Tip Chef {name}?"`                                                         |
| **sublabel**          | `"For {eventTitle}"`                                                         |
| **icon**              | `heart-dollar`                                                               |
| **presentation**      | `badge`                                                                      |
| **baseUrgency**       | 30                                                                           |
| **urgencyDecayFn**    | `linear` (decays 3/day)                                                      |
| **pageAffinity**      | `/my-events/{id}`, `/my-spending`                                            |
| **pageAffinityBoost** | 10                                                                           |
| **hoverAction**       | Preview: suggested tip amounts, quick-tip CTA                                |
| **clickAction**       | `quick_action` (inline tip selector)                                         |
| **click reveals**     | Tip amount selector with 15%/18%/20%/custom                                  |
| **href**              | `/my-events/{id}/pay`                                                        |
| **dismissable**       | yes                                                                          |
| **expandable**        | no                                                                           |
| **maxImpressions**    | 5                                                                            |
| **cooldownMinutes**   | 2880                                                                         |
| **expiresAt**         | 14 days post-event                                                           |
| **scoring**           | +5 if review was positive (4-5 stars); appears after review_prompt           |
| **interactions**      | Only appears after `event_summary_ready`; after or alongside `review_prompt` |
| **dataSource**        | `events` (completed), payment records (no tip recorded)                      |
| **privacy**           | `private`                                                                    |

---

## 18. Rebook Suggestions

#### RBK-001: Rebook Suggestion

| Property              | Value                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **type**              | `rebook_suggestion`                                                                                    |
| **category**          | Rebook                                                                                                 |
| **label**             | `"Book Chef {name} again?"`                                                                            |
| **sublabel**          | `"It's been {n} months since your last dinner"` or `"Annual {occasion} coming up"`                     |
| **icon**              | `repeat`                                                                                               |
| **presentation**      | `card`                                                                                                 |
| **baseUrgency**       | 20                                                                                                     |
| **urgencyDecayFn**    | `step` (jumps at 30d, 60d, 90d since last event)                                                       |
| **pageAffinity**      | `/chefs`, `/book-now`, `/my-events/history`                                                            |
| **pageAffinityBoost** | 10                                                                                                     |
| **hoverAction**       | Preview: last event summary, chef availability, quick rebook                                           |
| **clickAction**       | `navigate`                                                                                             |
| **click reveals**     | Chef profile with rebook context                                                                       |
| **href**              | `/chefs/{slug}?rebook=true`                                                                            |
| **dismissable**       | yes                                                                                                    |
| **expandable**        | yes: last event details, next available dates                                                          |
| **maxImpressions**    | 5                                                                                                      |
| **cooldownMinutes**   | 4320 (3 days)                                                                                          |
| **expiresAt**         | 30 days after generation                                                                               |
| **scoring**           | +5 per past booking with this chef; +8 if annual occasion approaching; +3 if chef has new availability |
| **interactions**      | Feeds from `saved_chef_activity`; spawned after `event_cancelled`                                      |
| **dataSource**        | `events` (past, with same chef), `consumer_saved_chefs`, annual pattern detection                      |
| **privacy**           | `private`                                                                                              |

---

## 19. Budget & Spending

#### BUD-001: Spending Summary

| Property              | Value                                                |
| --------------------- | ---------------------------------------------------- |
| **type**              | `spending_summary`                                   |
| **category**          | Budget                                               |
| **label**             | `"This year: ${totalSpent} on private dining"`       |
| **sublabel**          | `"{eventCount} events"`                              |
| **icon**              | `bar-chart-dollar`                                   |
| **presentation**      | `badge`                                              |
| **baseUrgency**       | 5                                                    |
| **urgencyDecayFn**    | `none`                                               |
| **pageAffinity**      | `/my-spending`, `/my-receipts`                       |
| **pageAffinityBoost** | 15                                                   |
| **hoverAction**       | Preview: spending breakdown by month, category, chef |
| **clickAction**       | `navigate`                                           |
| **click reveals**     | Spending dashboard                                   |
| **href**              | `/my-spending`                                       |
| **dismissable**       | yes                                                  |
| **expandable**        | yes: monthly breakdown                               |
| **maxImpressions**    | 5                                                    |
| **cooldownMinutes**   | 10080 (7 days)                                       |
| **expiresAt**         | Regenerates monthly                                  |
| **scoring**           | Very low base. Ambient information.                  |
| **interactions**      | Influences `price` discovery filter suggestions      |
| **dataSource**        | `payments`, `invoices` (aggregated)                  |
| **privacy**           | `private`                                            |

---

## 20. Preference Evolution

#### PREF-001: Taste Trend Detection

| Property              | Value                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| **type**              | `preference_trend`                                                              |
| **category**          | Preference Evolution                                                            |
| **label**             | `"You've been exploring more {trend}"` (e.g. "Thai", "plant-based", "grilling") |
| **sublabel**          | `"{n} interactions this month"`                                                 |
| **icon**              | `trending-up`                                                                   |
| **presentation**      | `pill`                                                                          |
| **baseUrgency**       | 8                                                                               |
| **urgencyDecayFn**    | `none`                                                                          |
| **pageAffinity**      | `/my-preferences/discovery`, `/my-passport`                                     |
| **pageAffinityBoost** | 10                                                                              |
| **hoverAction**       | Preview: trend data, related chefs, save to profile?                            |
| **clickAction**       | `quick_action` (confirm: "Add to preferences?")                                 |
| **click reveals**     | Option to formalize preference or dismiss                                       |
| **href**              | `/my-preferences/discovery`                                                     |
| **dismissable**       | yes                                                                             |
| **expandable**        | no                                                                              |
| **maxImpressions**    | 5                                                                               |
| **cooldownMinutes**   | 4320                                                                            |
| **expiresAt**         | 14 days                                                                         |
| **scoring**           | Requires 5+ interactions in same category within 30 days to trigger             |
| **interactions**      | Strengthens related `cuisine`/`food_type`/`ingredient` scoring                  |
| **dataSource**        | `discovery_interactions` (aggregated), `discovery_preference_ranking` weights   |
| **privacy**           | `private`                                                                       |

---

## 21. Onboarding Gaps

#### ONB-001: New Client Welcome

| Property              | Value                                                 |
| --------------------- | ----------------------------------------------------- |
| **type**              | `onboarding_welcome`                                  |
| **category**          | Onboarding                                            |
| **label**             | `"Welcome! Let's get you set up"`                     |
| **sublabel**          | `"3 quick steps to personalize"`                      |
| **icon**              | `sparkle`                                             |
| **presentation**      | `banner`                                              |
| **baseUrgency**       | 60                                                    |
| **urgencyDecayFn**    | `linear` (decays 5/day)                               |
| **pageAffinity**      | All pages                                             |
| **pageAffinityBoost** | 20                                                    |
| **hoverAction**       | Preview: setup steps (dietary, preferences, passport) |
| **clickAction**       | `navigate`                                            |
| **click reveals**     | Onboarding wizard                                     |
| **href**              | `/my-passport`                                        |
| **dismissable**       | yes                                                   |
| **expandable**        | yes: step progress                                    |
| **maxImpressions**    | 10                                                    |
| **cooldownMinutes**   | 1440                                                  |
| **expiresAt**         | When onboarding complete or 14 days                   |
| **scoring**           | Highest for brand-new accounts                        |
| **interactions**      | Spawns individual `onboarding_*` gap items            |
| **dataSource**        | Account creation date, profile completeness           |
| **privacy**           | `private`                                             |

#### ONB-002: Profile Incomplete

| Property              | Value                                      |
| --------------------- | ------------------------------------------ |
| **type**              | `onboarding_profile`                       |
| **category**          | Onboarding                                 |
| **label**             | `"Add your photo and name"`                |
| **sublabel**          | `"Chefs see this when you inquire"`        |
| **icon**              | `user-circle`                              |
| **presentation**      | `badge`                                    |
| **baseUrgency**       | 35                                         |
| **urgencyDecayFn**    | `step` (jumps when first inquiry sent)     |
| **pageAffinity**      | `/my-profile`, `/my-passport`              |
| **pageAffinityBoost** | 15                                         |
| **hoverAction**       | Preview: what's missing, why it matters    |
| **clickAction**       | `navigate`                                 |
| **click reveals**     | Profile edit page                          |
| **href**              | `/my-profile`                              |
| **dismissable**       | yes                                        |
| **expandable**        | no                                         |
| **maxImpressions**    | 8                                          |
| **cooldownMinutes**   | 2880                                       |
| **expiresAt**         | When complete                              |
| **scoring**           | +15 when first inquiry is about to be sent |
| **interactions**      | Part of onboarding flow                    |
| **dataSource**        | `clients` (profile fields)                 |
| **privacy**           | `private`                                  |

#### ONB-003: Location Not Set

| Property              | Value                                                                   |
| --------------------- | ----------------------------------------------------------------------- |
| **type**              | `onboarding_location`                                                   |
| **category**          | Onboarding                                                              |
| **label**             | `"Set your location"`                                                   |
| **sublabel**          | `"So we can find chefs near you"`                                       |
| **icon**              | `map-pin`                                                               |
| **presentation**      | `badge`                                                                 |
| **baseUrgency**       | 45                                                                      |
| **urgencyDecayFn**    | `none`                                                                  |
| **pageAffinity**      | `/my-profile`, `/chefs`                                                 |
| **pageAffinityBoost** | 15                                                                      |
| **hoverAction**       | Preview: zip code entry                                                 |
| **clickAction**       | `quick_action` (inline zip entry)                                       |
| **click reveals**     | Zip code input                                                          |
| **href**              | `/my-profile`                                                           |
| **dismissable**       | yes                                                                     |
| **expandable**        | no                                                                      |
| **maxImpressions**    | 10                                                                      |
| **cooldownMinutes**   | 1440                                                                    |
| **expiresAt**         | When set                                                                |
| **scoring**           | Critical for discovery. All location-based items degraded without this. |
| **interactions**      | Unlocks `location` discovery items and chef proximity                   |
| **dataSource**        | `user_location_defaults` (empty)                                        |
| **privacy**           | `private`                                                               |

---

## 22. Calendar Integration

#### CAL-001: Calendar Sync Suggestion

| Property              | Value                                                    |
| --------------------- | -------------------------------------------------------- |
| **type**              | `calendar_sync`                                          |
| **category**          | Calendar                                                 |
| **label**             | `"Add {eventTitle} to your calendar"`                    |
| **sublabel**          | `"{date} at {time}"`                                     |
| **icon**              | `calendar-plus`                                          |
| **presentation**      | `badge`                                                  |
| **baseUrgency**       | 20                                                       |
| **urgencyDecayFn**    | `deadline`                                               |
| **pageAffinity**      | `/my-events/{id}`, `/my-calendar`                        |
| **pageAffinityBoost** | 10                                                       |
| **hoverAction**       | Preview: event date/time, calendar download (.ics)       |
| **clickAction**       | `quick_action` (download .ics)                           |
| **click reveals**     | Calendar file download                                   |
| **href**              | `/my-events/{id}`                                        |
| **dismissable**       | yes                                                      |
| **expandable**        | no                                                       |
| **maxImpressions**    | 3                                                        |
| **cooldownMinutes**   | 2880                                                     |
| **expiresAt**         | Event date                                               |
| **scoring**           | Low urgency. Convenience.                                |
| **interactions**      | Appears after event is confirmed                         |
| **dataSource**        | `events` (confirmed status, no calendar export recorded) |
| **privacy**           | `private`                                                |

---

## 23. Special Dates

#### SPD-001: Anniversary/Birthday Approaching

| Property              | Value                                                                          |
| --------------------- | ------------------------------------------------------------------------------ |
| **type**              | `special_date_approaching`                                                     |
| **category**          | Special Dates                                                                  |
| **label**             | `"{occasionType} coming up {date}"` (e.g. "Anniversary dinner in 3 weeks")     |
| **sublabel**          | `"Book early for best availability"`                                           |
| **icon**              | `confetti` (birthday), `champagne` (anniversary), `heart` (valentine)          |
| **presentation**      | `card`                                                                         |
| **baseUrgency**       | 30                                                                             |
| **urgencyDecayFn**    | `deadline` (ramps in final 2 weeks)                                            |
| **pageAffinity**      | `/book-now`, `/my-calendar`, `/chefs`                                          |
| **pageAffinityBoost** | 15                                                                             |
| **hoverAction**       | Preview: date, occasion type, suggested chefs, quick-book CTA                  |
| **clickAction**       | `navigate`                                                                     |
| **click reveals**     | Pre-filled booking flow for this occasion                                      |
| **href**              | `/book-now?occasion={type}&date={date}`                                        |
| **dismissable**       | yes                                                                            |
| **expandable**        | yes: past celebrations, suggested chefs                                        |
| **maxImpressions**    | 8                                                                              |
| **cooldownMinutes**   | 2880                                                                           |
| **expiresAt**         | Date + 1 day                                                                   |
| **scoring**           | +10 if booked for this occasion last year; detected from annual event patterns |
| **interactions**      | Boosts `occasion` discovery items                                              |
| **dataSource**        | Annual pattern detection from `events`, user-entered special dates             |
| **privacy**           | `private`                                                                      |

---

## 24. Recipe Collection

#### RCP-001: New Recipe from Past Event

| Property              | Value                                             |
| --------------------- | ------------------------------------------------- |
| **type**              | `recipe_from_event`                               |
| **category**          | Recipes                                           |
| **label**             | `"Recipe available: {recipeName}"`                |
| **sublabel**          | `"From your {eventTitle} dinner"`                 |
| **icon**              | `book-open`                                       |
| **presentation**      | `card`                                            |
| **baseUrgency**       | 20                                                |
| **urgencyDecayFn**    | `linear` (decays 2/day)                           |
| **pageAffinity**      | `/my-recipes`, `/my-events/{id}/recap`            |
| **pageAffinityBoost** | 10                                                |
| **hoverAction**       | Preview: recipe name, chef, difficulty, prep time |
| **clickAction**       | `navigate`                                        |
| **click reveals**     | Recipe detail                                     |
| **href**              | `/my-recipes/{id}`                                |
| **dismissable**       | yes                                               |
| **expandable**        | no                                                |
| **maxImpressions**    | 5                                                 |
| **cooldownMinutes**   | 2880                                              |
| **expiresAt**         | 14 days                                           |
| **scoring**           | +3 if seasonal ingredients; engagement driver     |
| **interactions**      | Appears post-event alongside summary              |
| **dataSource**        | Chef-shared recipes linked to completed events    |
| **privacy**           | `private`                                         |

---

## 25. Meal Planning

#### MPL-001: Meal Plan Suggestion

| Property              | Value                                                            |
| --------------------- | ---------------------------------------------------------------- |
| **type**              | `meal_plan_suggestion`                                           |
| **category**          | Meal Planning                                                    |
| **label**             | `"Plan this week's meals?"`                                      |
| **sublabel**          | `"Based on your saved recipes and preferences"`                  |
| **icon**              | `utensils-calendar`                                              |
| **presentation**      | `card`                                                           |
| **baseUrgency**       | 10                                                               |
| **urgencyDecayFn**    | `step` (weekly cycle)                                            |
| **pageAffinity**      | `/my-meals`, `/my-recipes`                                       |
| **pageAffinityBoost** | 15                                                               |
| **hoverAction**       | Preview: suggested meals for the week                            |
| **clickAction**       | `navigate`                                                       |
| **click reveals**     | Meal planning page                                               |
| **href**              | `/my-meals`                                                      |
| **dismissable**       | yes                                                              |
| **expandable**        | yes: this week's suggestions                                     |
| **maxImpressions**    | 5                                                                |
| **cooldownMinutes**   | 4320                                                             |
| **expiresAt**         | Sunday (weekly reset)                                            |
| **scoring**           | +5 if client uses meal board in circles; +3 if has saved recipes |
| **interactions**      | Feeds `ingredient` discovery items based on meal plan            |
| **dataSource**        | Saved recipes, meal board history, taste passport                |
| **privacy**           | `private`                                                        |

---

## 26. Recurring Event Reminders

#### RCR-001: Recurring Event Due

| Property              | Value                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| **type**              | `recurring_event_due`                                                           |
| **category**          | Recurring                                                                       |
| **label**             | `"Time to schedule your {recurringType}"`                                       |
| **sublabel**          | `"Last one was {lastDate}"` (e.g. "Monthly meal prep with Chef {name}")         |
| **icon**              | `repeat-calendar`                                                               |
| **presentation**      | `card`                                                                          |
| **baseUrgency**       | 35                                                                              |
| **urgencyDecayFn**    | `step` (jumps at interval due date)                                             |
| **pageAffinity**      | `/book-now`, `/my-events`, `/my-calendar`                                       |
| **pageAffinityBoost** | 15                                                                              |
| **hoverAction**       | Preview: last event details, chef availability, quick rebook                    |
| **clickAction**       | `navigate`                                                                      |
| **click reveals**     | Rebook flow pre-filled                                                          |
| **href**              | `/book-now?rebook={lastEventId}`                                                |
| **dismissable**       | yes                                                                             |
| **expandable**        | yes: past instances, next suggested date                                        |
| **maxImpressions**    | 5                                                                               |
| **cooldownMinutes**   | 2880                                                                            |
| **expiresAt**         | When booked or 14 days                                                          |
| **scoring**           | +5 per consecutive booking (loyalty pattern); triggered by detected periodicity |
| **interactions**      | Related to `rebook_suggestion` but pattern-based                                |
| **dataSource**        | Event periodicity detection (same chef + similar service at regular intervals)  |
| **privacy**           | `private`                                                                       |

---

## 27. Client Passport

#### PAS-001: Passport Incomplete

| Property              | Value                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| **type**              | `passport_incomplete`                                                           |
| **category**          | Client Passport                                                                 |
| **label**             | `"Your dining passport: {completionPct}%"`                                      |
| **sublabel**          | `"Better matches with a complete passport"`                                     |
| **icon**              | `passport`                                                                      |
| **presentation**      | `progress`                                                                      |
| **baseUrgency**       | 25                                                                              |
| **urgencyDecayFn**    | `step` (jumps when booking attempted)                                           |
| **pageAffinity**      | `/my-passport`, `/my-profile`, `/my-preferences`                                |
| **pageAffinityBoost** | 15                                                                              |
| **hoverAction**       | Preview: what's filled, what's missing (budget, style, communication, autonomy) |
| **clickAction**       | `navigate`                                                                      |
| **click reveals**     | Passport completion flow                                                        |
| **href**              | `/my-passport`                                                                  |
| **dismissable**       | yes                                                                             |
| **expandable**        | yes: missing passport fields                                                    |
| **maxImpressions**    | 8                                                                               |
| **cooldownMinutes**   | 2880                                                                            |
| **expiresAt**         | When 100%                                                                       |
| **scoring**           | +15 when booking (chefs use passport data); +5 per field missing                |
| **interactions**      | Improves all recommendation scoring when complete                               |
| **dataSource**        | `client_passports` field completeness                                           |
| **privacy**           | `chef_visible`                                                                  |

---

## 28. Discovery Preference Prompts

#### DPR-001: Tune Your Preferences

| Property              | Value                                                                       |
| --------------------- | --------------------------------------------------------------------------- |
| **type**              | `discovery_tune`                                                            |
| **category**          | Discovery Preferences                                                       |
| **label**             | `"Refine your taste profile"`                                               |
| **sublabel**          | `"Get better recommendations"`                                              |
| **icon**              | `sliders`                                                                   |
| **presentation**      | `pill`                                                                      |
| **baseUrgency**       | 10                                                                          |
| **urgencyDecayFn**    | `none`                                                                      |
| **pageAffinity**      | `/my-preferences/discovery`                                                 |
| **pageAffinityBoost** | 20                                                                          |
| **hoverAction**       | Preview: current preference summary, adjust CTA                             |
| **clickAction**       | `navigate`                                                                  |
| **click reveals**     | Discovery preference tuning page                                            |
| **href**              | `/my-preferences/discovery`                                                 |
| **dismissable**       | yes                                                                         |
| **expandable**        | no                                                                          |
| **maxImpressions**    | 5                                                                           |
| **cooldownMinutes**   | 10080 (7 days)                                                              |
| **expiresAt**         | Never                                                                       |
| **scoring**           | +5 after 10+ interactions; +3 if many `recovery_prompt` reason codes firing |
| **interactions**      | Reduces noise in discovery by improving preference signals                  |
| **dataSource**        | `discovery_interactions` count, `discovery_profile_items`                   |
| **privacy**           | `private`                                                                   |

---

## 29. Cross-Sell & Upsell

#### XS-001: Gift Card for Friends

| Property              | Value                                                                                |
| --------------------- | ------------------------------------------------------------------------------------ |
| **type**              | `gift_card_promo`                                                                    |
| **category**          | Cross-Sell                                                                           |
| **label**             | `"Gift a dinner experience"`                                                         |
| **sublabel**          | `"Starting at ${minAmount}"`                                                         |
| **icon**              | `gift`                                                                               |
| **presentation**      | `pill`                                                                               |
| **baseUrgency**       | 5                                                                                    |
| **urgencyDecayFn**    | `none`                                                                               |
| **pageAffinity**      | `/my-gift-cards`, `/my-rewards`                                                      |
| **pageAffinityBoost** | 8                                                                                    |
| **hoverAction**       | Preview: gift card designs, denomination options                                     |
| **clickAction**       | `navigate`                                                                           |
| **click reveals**     | Gift card purchase flow                                                              |
| **href**              | `/my-gift-cards`                                                                     |
| **dismissable**       | yes                                                                                  |
| **expandable**        | no                                                                                   |
| **maxImpressions**    | 3                                                                                    |
| **cooldownMinutes**   | 10080                                                                                |
| **expiresAt**         | Never                                                                                |
| **scoring**           | +10 near holidays; +5 if client has 3+ completed events (loyal); slot: `promotional` |
| **interactions**      | Follows slot policy: max 20% non-practical, no adjacent promotional                  |
| **dataSource**        | Holiday calendar, client loyalty tier                                                |
| **privacy**           | `private`                                                                            |

#### XS-002: Upgrade Service

| Property              | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| **type**              | `upgrade_prompt`                                           |
| **category**          | Cross-Sell                                                 |
| **label**             | `"Upgrade to tasting menu?"`                               |
| **sublabel**          | `"For your upcoming {eventTitle}"`                         |
| **icon**              | `crown`                                                    |
| **presentation**      | `pill`                                                     |
| **baseUrgency**       | 8                                                          |
| **urgencyDecayFn**    | `deadline` (event date)                                    |
| **pageAffinity**      | `/my-events/{id}`, `/book-now`                             |
| **pageAffinityBoost** | 8                                                          |
| **hoverAction**       | Preview: upgrade options, price difference, what changes   |
| **clickAction**       | `navigate`                                                 |
| **click reveals**     | Event upgrade/modification flow                            |
| **href**              | `/my-events/{id}`                                          |
| **dismissable**       | yes                                                        |
| **expandable**        | yes: upgrade options                                       |
| **maxImpressions**    | 3                                                          |
| **cooldownMinutes**   | 2880                                                       |
| **expiresAt**         | Event date - 7 days (must upgrade early)                   |
| **scoring**           | Only for clients with budget headroom; slot: `promotional` |
| **interactions**      | Never shown if payment is overdue                          |
| **dataSource**        | `client_passports` budget range, event details             |
| **privacy**           | `private`                                                  |

---

## 30. Loyalty & Rewards

#### LOY-001: Points Earned

| Property              | Value                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| **type**              | `points_earned`                                                          |
| **category**          | Loyalty                                                                  |
| **label**             | `"+{points} points earned!"`                                             |
| **sublabel**          | `"From {source}"` (event, referral, review)                              |
| **icon**              | `star-plus`                                                              |
| **presentation**      | `badge`                                                                  |
| **baseUrgency**       | 20                                                                       |
| **urgencyDecayFn**    | `linear` (decays 5/day)                                                  |
| **pageAffinity**      | `/my-rewards`                                                            |
| **pageAffinityBoost** | 10                                                                       |
| **hoverAction**       | Preview: total balance, tier progress, available rewards                 |
| **clickAction**       | `navigate`                                                               |
| **click reveals**     | Rewards dashboard                                                        |
| **href**              | `/my-rewards`                                                            |
| **dismissable**       | yes                                                                      |
| **expandable**        | no                                                                       |
| **maxImpressions**    | 3                                                                        |
| **cooldownMinutes**   | 1440                                                                     |
| **expiresAt**         | 3 days                                                                   |
| **scoring**           | Positive reinforcement. Brief visibility.                                |
| **interactions**      | None                                                                     |
| **dataSource**        | `loyalty_transactions` (type = earned), `notifications` (points_awarded) |
| **privacy**           | `private`                                                                |

#### LOY-002: Tier Upgrade

| Property              | Value                                                            |
| --------------------- | ---------------------------------------------------------------- |
| **type**              | `tier_upgrade`                                                   |
| **category**          | Loyalty                                                          |
| **label**             | `"You reached {tierName}!"`                                      |
| **sublabel**          | `"New perks unlocked"`                                           |
| **icon**              | `trophy`                                                         |
| **presentation**      | `alert`                                                          |
| **baseUrgency**       | 45                                                               |
| **urgencyDecayFn**    | `linear` (decays 3/day)                                          |
| **pageAffinity**      | `/my-rewards`                                                    |
| **pageAffinityBoost** | 15                                                               |
| **hoverAction**       | Preview: new tier benefits, progress to next tier                |
| **clickAction**       | `navigate`                                                       |
| **click reveals**     | Tier benefits page                                               |
| **href**              | `/my-rewards`                                                    |
| **dismissable**       | yes                                                              |
| **expandable**        | yes: tier benefits list                                          |
| **maxImpressions**    | 5                                                                |
| **cooldownMinutes**   | 2880                                                             |
| **expiresAt**         | 7 days                                                           |
| **scoring**           | Celebration moment. High visibility briefly.                     |
| **interactions**      | Unlocks tier-specific discovery items                            |
| **dataSource**        | `clients` (loyalty_tier change), `notifications` (tier_upgraded) |
| **privacy**           | `private`                                                        |

#### LOY-003: Badge Earned

| Property              | Value                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **type**              | `badge_earned`                                                                                                                                                |
| **category**          | Loyalty                                                                                                                                                       |
| **label**             | `"New badge: {badgeName}"`                                                                                                                                    |
| **sublabel**          | `"{badgeDescription}"`                                                                                                                                        |
| **icon**              | Badge-specific icon                                                                                                                                           |
| **presentation**      | `badge`                                                                                                                                                       |
| **baseUrgency**       | 25                                                                                                                                                            |
| **urgencyDecayFn**    | `linear` (decays 5/day)                                                                                                                                       |
| **pageAffinity**      | `/my-rewards`, `/my-passport`                                                                                                                                 |
| **pageAffinityBoost** | 10                                                                                                                                                            |
| **hoverAction**       | Preview: badge image, how earned, rarity                                                                                                                      |
| **clickAction**       | `navigate`                                                                                                                                                    |
| **click reveals**     | Badge detail in rewards                                                                                                                                       |
| **href**              | `/my-rewards`                                                                                                                                                 |
| **dismissable**       | yes                                                                                                                                                           |
| **expandable**        | no                                                                                                                                                            |
| **maxImpressions**    | 3                                                                                                                                                             |
| **cooldownMinutes**   | 1440                                                                                                                                                          |
| **expiresAt**         | 5 days                                                                                                                                                        |
| **scoring**           | Gamification engagement. 8 badge types (first_event, tasting_menu_pro, world_traveler, party_host, loyal_patron, big_spender, repeat_monthly, referral_champ) |
| **interactions**      | None                                                                                                                                                          |
| **dataSource**        | Badge evaluation engine                                                                                                                                       |
| **privacy**           | `private`                                                                                                                                                     |

#### LOY-004: Raffle Entry

| Property              | Value                                                   |
| --------------------- | ------------------------------------------------------- |
| **type**              | `raffle_entry`                                          |
| **category**          | Loyalty                                                 |
| **label**             | `"Raffle entry earned!"`                                |
| **sublabel**          | `"Drawing on {date}"`                                   |
| **icon**              | `ticket`                                                |
| **presentation**      | `badge`                                                 |
| **baseUrgency**       | 15                                                      |
| **urgencyDecayFn**    | `deadline` (drawing date)                               |
| **pageAffinity**      | `/my-rewards`                                           |
| **pageAffinityBoost** | 8                                                       |
| **hoverAction**       | Preview: prize, drawing date, your entries              |
| **clickAction**       | `navigate`                                              |
| **click reveals**     | Raffle detail                                           |
| **href**              | `/my-rewards`                                           |
| **dismissable**       | yes                                                     |
| **expandable**        | no                                                      |
| **maxImpressions**    | 3                                                       |
| **cooldownMinutes**   | 2880                                                    |
| **expiresAt**         | Drawing date + 1 day                                    |
| **scoring**           | Engagement. Low urgency.                                |
| **interactions**      | Spawns `raffle_winner` if won                           |
| **dataSource**        | `notifications` (raffle_entry_earned, raffle_new_round) |
| **privacy**           | `private`                                               |

#### LOY-005: Raffle Winner

| Property              | Value                                      |
| --------------------- | ------------------------------------------ |
| **type**              | `raffle_winner`                            |
| **category**          | Loyalty                                    |
| **label**             | `"You won the raffle!"`                    |
| **sublabel**          | `"Prize: {prizeDescription}"`              |
| **icon**              | `trophy-star`                              |
| **presentation**      | `alert`                                    |
| **baseUrgency**       | 70                                         |
| **urgencyDecayFn**    | `linear`                                   |
| **pageAffinity**      | All pages                                  |
| **pageAffinityBoost** | 20                                         |
| **hoverAction**       | Preview: prize details, claim instructions |
| **clickAction**       | `navigate`                                 |
| **click reveals**     | Prize claim page                           |
| **href**              | `/my-rewards`                              |
| **dismissable**       | no (until claimed)                         |
| **expandable**        | no                                         |
| **maxImpressions**    | unlimited                                  |
| **cooldownMinutes**   | 0                                          |
| **expiresAt**         | Claim deadline                             |
| **scoring**           | High urgency until claimed                 |
| **interactions**      | None                                       |
| **dataSource**        | `notifications` (raffle_winner)            |
| **privacy**           | `private`                                  |

#### LOY-006: Milestone Approaching

| Property              | Value                                                          |
| --------------------- | -------------------------------------------------------------- |
| **type**              | `milestone_approaching`                                        |
| **category**          | Loyalty                                                        |
| **label**             | `"{n} more guests to reach {milestoneName}"`                   |
| **sublabel**          | `"Unlock: {rewardDescription}"`                                |
| **icon**              | `target`                                                       |
| **presentation**      | `progress`                                                     |
| **baseUrgency**       | 12                                                             |
| **urgencyDecayFn**    | `none`                                                         |
| **pageAffinity**      | `/my-rewards`                                                  |
| **pageAffinityBoost** | 10                                                             |
| **hoverAction**       | Preview: progress bar, reward preview, next event contribution |
| **clickAction**       | `navigate`                                                     |
| **click reveals**     | Milestone progress                                             |
| **href**              | `/my-rewards`                                                  |
| **dismissable**       | yes                                                            |
| **expandable**        | yes: milestone rewards at 100/250/500/1000 guests served       |
| **maxImpressions**    | 5                                                              |
| **cooldownMinutes**   | 4320                                                           |
| **expiresAt**         | When reached                                                   |
| **scoring**           | +5 if within 10% of milestone                                  |
| **interactions**      | Motivation to book more events                                 |
| **dataSource**        | Loyalty milestone thresholds, total guests served              |
| **privacy**           | `private`                                                      |

---

## 31. Hub & Social

#### HUB-001: Friend Request

| Property              | Value                                          |
| --------------------- | ---------------------------------------------- |
| **type**              | `friend_request`                               |
| **category**          | Hub                                            |
| **label**             | `"{name} wants to connect"`                    |
| **sublabel**          | `"Accept friend request"`                      |
| **icon**              | `user-plus`                                    |
| **presentation**      | `alert`                                        |
| **baseUrgency**       | 40                                             |
| **urgencyDecayFn**    | `linear` (decays 2/day)                        |
| **pageAffinity**      | `/my-hub`, `/my-hub/friends`                   |
| **pageAffinityBoost** | 15                                             |
| **hoverAction**       | Preview: requester profile, mutual connections |
| **clickAction**       | `quick_action` (accept/decline)                |
| **click reveals**     | Accept/decline inline                          |
| **href**              | `/my-hub/friends`                              |
| **dismissable**       | no (requires action)                           |
| **expandable**        | no                                             |
| **maxImpressions**    | unlimited                                      |
| **cooldownMinutes**   | 0                                              |
| **expiresAt**         | 30 days                                        |
| **scoring**           | Social engagement signal                       |
| **interactions**      | None                                           |
| **dataSource**        | `hub_guest_profiles`, friend request system    |
| **privacy**           | `private`                                      |

#### HUB-002: Circle Invitation

| Property              | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| **type**              | `circle_invitation`                                        |
| **category**          | Hub                                                        |
| **label**             | `"Invited to {circleName}"`                                |
| **sublabel**          | `"By {inviterName} - {groupType}"`                         |
| **icon**              | `users-plus`                                               |
| **presentation**      | `alert`                                                    |
| **baseUrgency**       | 45                                                         |
| **urgencyDecayFn**    | `linear` (decays 2/day)                                    |
| **pageAffinity**      | `/my-hub`, `/my-hub/notifications`                         |
| **pageAffinityBoost** | 15                                                         |
| **hoverAction**       | Preview: circle description, member count, recent activity |
| **clickAction**       | `navigate`                                                 |
| **click reveals**     | Circle preview with join CTA                               |
| **href**              | `/my-hub/g/{groupToken}`                                   |
| **dismissable**       | no (requires response)                                     |
| **expandable**        | yes: circle details                                        |
| **maxImpressions**    | unlimited                                                  |
| **cooldownMinutes**   | 0                                                          |
| **expiresAt**         | 14 days                                                    |
| **scoring**           | +5 if dinner planning active in circle                     |
| **interactions**      | Creates `circle` rail item on join                         |
| **dataSource**        | `hub_group_members` (pending invitations)                  |
| **privacy**           | `private`                                                  |

#### HUB-003: Shared Chef Recommendation

| Property              | Value                                                             |
| --------------------- | ----------------------------------------------------------------- |
| **type**              | `shared_chef`                                                     |
| **category**          | Hub                                                               |
| **label**             | `"{friendName} recommends Chef {chefName}"`                       |
| **sublabel**          | `"Check them out"`                                                |
| **icon**              | `share-chef`                                                      |
| **presentation**      | `card`                                                            |
| **baseUrgency**       | 20                                                                |
| **urgencyDecayFn**    | `linear`                                                          |
| **pageAffinity**      | `/my-hub`, `/chefs`                                               |
| **pageAffinityBoost** | 10                                                                |
| **hoverAction**       | Preview: chef profile, friend's note, match with your preferences |
| **clickAction**       | `navigate`                                                        |
| **click reveals**     | Chef profile                                                      |
| **href**              | `/chefs/{slug}`                                                   |
| **dismissable**       | yes                                                               |
| **expandable**        | no                                                                |
| **maxImpressions**    | 5                                                                 |
| **cooldownMinutes**   | 2880                                                              |
| **expiresAt**         | 14 days                                                           |
| **scoring**           | +5 social proof; +3 if chef matches taste passport                |
| **interactions**      | Social discovery channel                                          |
| **dataSource**        | Hub share-chef system                                             |
| **privacy**           | `private`                                                         |

---

## 32. Safety & Compliance

#### SAF-001: Allergy Cross-Contact Warning

| Property              | Value                                                             |
| --------------------- | ----------------------------------------------------------------- |
| **type**              | `allergy_warning`                                                 |
| **category**          | Safety                                                            |
| **label**             | `"Allergy alert: {allergen} in {eventTitle} menu"`                |
| **sublabel**          | `"Review with Chef {name}"`                                       |
| **icon**              | `shield-alert-red`                                                |
| **presentation**      | `alert`                                                           |
| **baseUrgency**       | 95                                                                |
| **urgencyDecayFn**    | `none`                                                            |
| **pageAffinity**      | All pages                                                         |
| **pageAffinityBoost** | 40                                                                |
| **hoverAction**       | Preview: which dishes, which guest, severity level                |
| **clickAction**       | `navigate`                                                        |
| **click reveals**     | Event dietary detail with chef contact                            |
| **href**              | `/my-events/{id}`                                                 |
| **dismissable**       | no                                                                |
| **expandable**        | yes: affected dishes, affected guests                             |
| **maxImpressions**    | unlimited                                                         |
| **cooldownMinutes**   | 0                                                                 |
| **expiresAt**         | When resolved                                                     |
| **scoring**           | Safety-critical. Near-maximum priority. Only below `event_today`. |
| **interactions**      | Blocks event progression if unresolved                            |
| **dataSource**        | Dietary trust system, menu ingredient analysis, allergen families |
| **privacy**           | `chef_visible`                                                    |

---

## 33. Real-Time Event Signals

Items that surface during active events and time-sensitive chef communications.

#### RTS-001: Chef Running Late

| Property              | Value                                                                         |
| --------------------- | ----------------------------------------------------------------------------- |
| **type**              | `chef_running_late`                                                           |
| **category**          | Real-Time Event                                                               |
| **label**             | `"Chef {name} is running late"`                                               |
| **sublabel**          | `"New ETA: {newTime}"`                                                        |
| **icon**              | `clock-alert`                                                                 |
| **presentation**      | `alert`                                                                       |
| **baseUrgency**       | 88                                                                            |
| **urgencyDecayFn**    | `none`                                                                        |
| **pageAffinity**      | All pages                                                                     |
| **pageAffinityBoost** | 30                                                                            |
| **hoverAction**       | Preview: original time, new ETA, chef message, contact option                 |
| **clickAction**       | `navigate`                                                                    |
| **click reveals**     | Live event timeline with updated ETA                                          |
| **href**              | `/my-events/{id}/live`                                                        |
| **dismissable**       | no                                                                            |
| **expandable**        | no                                                                            |
| **maxImpressions**    | unlimited                                                                     |
| **cooldownMinutes**   | 0                                                                             |
| **expiresAt**         | Chef arrival                                                                  |
| **scoring**           | Near-critical. Only behind `event_today` and `allergy_warning`.               |
| **interactions**      | Appears within `event_today` context; may trigger anxiety-reduction messaging |
| **dataSource**        | `notifications` (running_late)                                                |
| **privacy**           | `event_visible`                                                               |

#### RTS-002: Event Countdown

| Property              | Value                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| **type**              | `event_countdown`                                                               |
| **category**          | Real-Time Event                                                                 |
| **label**             | `"{eventTitle} in {hours}h {minutes}m"`                                         |
| **sublabel**          | `"Everything is set"` or `"{n} items still need attention"`                     |
| **icon**              | `hourglass`                                                                     |
| **presentation**      | `progress`                                                                      |
| **baseUrgency**       | 75                                                                              |
| **urgencyDecayFn**    | `deadline` (exponential in final 6 hours)                                       |
| **pageAffinity**      | `/my-events/{id}/countdown`, `/my-events/{id}`                                  |
| **pageAffinityBoost** | 25                                                                              |
| **hoverAction**       | Preview: countdown timer, completion checklist status, chef contact             |
| **clickAction**       | `navigate`                                                                      |
| **click reveals**     | Countdown page with live timer                                                  |
| **href**              | `/my-events/{id}/countdown`                                                     |
| **dismissable**       | no                                                                              |
| **expandable**        | yes: final checklist items                                                      |
| **maxImpressions**    | unlimited                                                                       |
| **cooldownMinutes**   | 0                                                                               |
| **expiresAt**         | Event start time                                                                |
| **scoring**           | Activates within 24 hours of event. Replaces `event_tomorrow` in final 6 hours. |
| **interactions**      | Absorbs `event_tomorrow`; shows completion gaps inline                          |
| **dataSource**        | `events` (date within 24h), readiness gates, completion contract                |
| **privacy**           | `household_visible`                                                             |

#### RTS-003: Event In Progress

| Property              | Value                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| **type**              | `event_in_progress`                                                       |
| **category**          | Real-Time Event                                                           |
| **label**             | `"{eventTitle} is happening now"`                                         |
| **sublabel**          | `"Chef {name} is serving"`                                                |
| **icon**              | `chef-hat-active`                                                         |
| **presentation**      | `banner`                                                                  |
| **baseUrgency**       | 96                                                                        |
| **urgencyDecayFn**    | `none`                                                                    |
| **pageAffinity**      | All pages                                                                 |
| **pageAffinityBoost** | 50                                                                        |
| **hoverAction**       | Preview: current service stage, live timeline, course progress            |
| **clickAction**       | `navigate`                                                                |
| **click reveals**     | Live event timeline                                                       |
| **href**              | `/my-events/{id}/live`                                                    |
| **dismissable**       | no                                                                        |
| **expandable**        | yes: service timeline with current stage highlighted                      |
| **maxImpressions**    | unlimited                                                                 |
| **cooldownMinutes**   | 0                                                                         |
| **expiresAt**         | Event end                                                                 |
| **scoring**           | Replaces `event_today` once FSM transitions to `in_progress`. Position 0. |
| **interactions**      | Suppresses all non-critical items from top 3 positions                    |
| **dataSource**        | `events` (status = in_progress), `event_transitions`                      |
| **privacy**           | `event_visible`                                                           |

#### RTS-004: Chef Open Slot Alert

| Property              | Value                                                                               |
| --------------------- | ----------------------------------------------------------------------------------- |
| **type**              | `chef_open_slot`                                                                    |
| **category**          | Real-Time Event                                                                     |
| **label**             | `"Chef {name} has an opening {date}"`                                               |
| **sublabel**          | `"Last-minute availability"`                                                        |
| **icon**              | `calendar-open`                                                                     |
| **presentation**      | `card`                                                                              |
| **baseUrgency**       | 35                                                                                  |
| **urgencyDecayFn**    | `deadline` (slot date)                                                              |
| **pageAffinity**      | `/chefs`, `/book-now`, `/browse-dates`                                              |
| **pageAffinityBoost** | 15                                                                                  |
| **hoverAction**       | Preview: chef profile, date, service types available, quick-book                    |
| **clickAction**       | `navigate`                                                                          |
| **click reveals**     | Chef profile with highlighted availability                                          |
| **href**              | `/chefs/{slug}?date={date}`                                                         |
| **dismissable**       | yes                                                                                 |
| **expandable**        | no                                                                                  |
| **maxImpressions**    | 5                                                                                   |
| **cooldownMinutes**   | 720                                                                                 |
| **expiresAt**         | Slot date                                                                           |
| **scoring**           | +8 if saved chef; +5 if cuisine matches taste passport; +10 if within 48h (urgency) |
| **interactions**      | Stronger version of `saved_chef_activity`; from `notifications` (open_slot)         |
| **dataSource**        | `notifications` (open_slot), `consumer_saved_chefs`                                 |
| **privacy**           | `private`                                                                           |

#### RTS-005: Repeat Booking Request from Chef

| Property              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| **type**              | `repeat_booking_request`                                               |
| **category**          | Real-Time Event                                                        |
| **label**             | `"Chef {name} wants to book you again"`                                |
| **sublabel**          | `"For {suggestedDate} or your preferred date"`                         |
| **icon**              | `repeat-chef`                                                          |
| **presentation**      | `card`                                                                 |
| **baseUrgency**       | 40                                                                     |
| **urgencyDecayFn**    | `linear` (decays 3/day)                                                |
| **pageAffinity**      | `/chefs`, `/book-now`, `/my-events`                                    |
| **pageAffinityBoost** | 12                                                                     |
| **hoverAction**       | Preview: chef's message, suggested dates, past event recap             |
| **clickAction**       | `navigate`                                                             |
| **click reveals**     | Booking flow pre-filled with chef and suggested date                   |
| **href**              | `/book-now?chef={slug}&date={date}`                                    |
| **dismissable**       | yes                                                                    |
| **expandable**        | yes: past events with this chef                                        |
| **maxImpressions**    | 5                                                                      |
| **cooldownMinutes**   | 2880                                                                   |
| **expiresAt**         | 14 days                                                                |
| **scoring**           | +5 per past booking with this chef; personal touch from chef side      |
| **interactions**      | Stronger than `rebook_suggestion` (chef-initiated vs system-generated) |
| **dataSource**        | `notifications` (repeat_booking_request)                               |
| **privacy**           | `private`                                                              |

---

## 34. Guest Management Signals

Items triggered by guest activity on client-hosted events.

#### GST-001: Guest RSVP Received

| Property              | Value                                                                   |
| --------------------- | ----------------------------------------------------------------------- |
| **type**              | `guest_rsvp_received`                                                   |
| **category**          | Guest Management                                                        |
| **label**             | `"{guestName} RSVP'd for {eventTitle}"`                                 |
| **sublabel**          | `"{acceptedCount}/{invitedCount} confirmed"`                            |
| **icon**              | `user-check`                                                            |
| **presentation**      | `badge`                                                                 |
| **baseUrgency**       | 25                                                                      |
| **urgencyDecayFn**    | `linear` (decays 3/day)                                                 |
| **pageAffinity**      | `/my-events/{id}/guests`, `/my-events/{id}`                             |
| **pageAffinityBoost** | 10                                                                      |
| **hoverAction**       | Preview: who RSVP'd, total count, dietary info if provided              |
| **clickAction**       | `navigate`                                                              |
| **click reveals**     | Guest management page                                                   |
| **href**              | `/my-events/{id}/guests`                                                |
| **dismissable**       | yes                                                                     |
| **expandable**        | no                                                                      |
| **maxImpressions**    | 10                                                                      |
| **cooldownMinutes**   | 240                                                                     |
| **expiresAt**         | Event date                                                              |
| **scoring**           | +5 if guest provided dietary info (actionable); batches if 3+ RSVPs     |
| **interactions**      | Updates `gap_guest_count` completion; may trigger `gap_dietary_missing` |
| **dataSource**        | `notifications` (guest_rsvp_received), `event_guests`                   |
| **privacy**           | `event_visible`                                                         |

#### GST-002: Guest Count Changed

| Property              | Value                                                            |
| --------------------- | ---------------------------------------------------------------- |
| **type**              | `guest_count_changed`                                            |
| **category**          | Guest Management                                                 |
| **label**             | `"Guest count changed: {newCount} for {eventTitle}"`             |
| **sublabel**          | `"Was {oldCount} - notify Chef {name}?"`                         |
| **icon**              | `users-change`                                                   |
| **presentation**      | `alert`                                                          |
| **baseUrgency**       | 50                                                               |
| **urgencyDecayFn**    | `deadline` (event date)                                          |
| **pageAffinity**      | `/my-events/{id}/guests`, `/my-events/{id}`                      |
| **pageAffinityBoost** | 15                                                               |
| **hoverAction**       | Preview: old vs new count, affected menu/pricing implications    |
| **clickAction**       | `navigate`                                                       |
| **click reveals**     | Guest management with chef notification option                   |
| **href**              | `/my-events/{id}/guests`                                         |
| **dismissable**       | no (chef needs to know)                                          |
| **expandable**        | yes: who added/removed, pricing impact                           |
| **maxImpressions**    | unlimited                                                        |
| **cooldownMinutes**   | 0                                                                |
| **expiresAt**         | When chef acknowledges                                           |
| **scoring**           | +15 if event within 7 days; +10 if count increased (menu impact) |
| **interactions**      | Triggers chef notification; may affect pricing/menu              |
| **dataSource**        | `notifications` (guest_count_changed), `event_guests`            |
| **privacy**           | `chef_visible`                                                   |

---

## 35. Payment Disputes & Failures

#### DIS-001: Payment Dispute Created

| Property              | Value                                                          |
| --------------------- | -------------------------------------------------------------- |
| **type**              | `payment_dispute`                                              |
| **category**          | Payment Dispute                                                |
| **label**             | `"Payment dispute opened"`                                     |
| **sublabel**          | `"For {eventTitle} - ${amount}"`                               |
| **icon**              | `alert-triangle`                                               |
| **presentation**      | `alert`                                                        |
| **baseUrgency**       | 80                                                             |
| **urgencyDecayFn**    | `none`                                                         |
| **pageAffinity**      | `/my-spending`, `/my-events/{id}`                              |
| **pageAffinityBoost** | 25                                                             |
| **hoverAction**       | Preview: dispute status, amount, timeline, what to expect      |
| **clickAction**       | `navigate`                                                     |
| **click reveals**     | Dispute detail in spending                                     |
| **href**              | `/my-spending`                                                 |
| **dismissable**       | no                                                             |
| **expandable**        | yes: dispute timeline, evidence needed                         |
| **maxImpressions**    | unlimited                                                      |
| **cooldownMinutes**   | 0                                                              |
| **expiresAt**         | When resolved                                                  |
| **scoring**           | High urgency. May require client action (evidence submission). |
| **interactions**      | Suppresses promotional items; related to event                 |
| **dataSource**        | `notifications` (dispute_created)                              |
| **privacy**           | `private`                                                      |

#### DIS-002: Dispute Funds Withdrawn

| Property              | Value                                                   |
| --------------------- | ------------------------------------------------------- |
| **type**              | `dispute_funds_withdrawn`                               |
| **category**          | Payment Dispute                                         |
| **label**             | `"Funds held: ${amount}"`                               |
| **sublabel**          | `"Pending dispute resolution for {eventTitle}"`         |
| **icon**              | `dollar-lock`                                           |
| **presentation**      | `alert`                                                 |
| **baseUrgency**       | 75                                                      |
| **urgencyDecayFn**    | `none`                                                  |
| **pageAffinity**      | `/my-spending`                                          |
| **pageAffinityBoost** | 20                                                      |
| **hoverAction**       | Preview: amount held, expected resolution timeline      |
| **clickAction**       | `navigate`                                              |
| **click reveals**     | Dispute detail                                          |
| **href**              | `/my-spending`                                          |
| **dismissable**       | no                                                      |
| **expandable**        | no                                                      |
| **maxImpressions**    | unlimited                                               |
| **cooldownMinutes**   | 0                                                       |
| **expiresAt**         | When dispute resolved                                   |
| **scoring**           | Persistent until resolved. Informational but important. |
| **interactions**      | Child of `payment_dispute`                              |
| **dataSource**        | `notifications` (dispute_funds_withdrawn)               |
| **privacy**           | `private`                                               |

#### DIS-003: Payment Failed

| Property              | Value                                                           |
| --------------------- | --------------------------------------------------------------- |
| **type**              | `payment_failed`                                                |
| **category**          | Payment Dispute                                                 |
| **label**             | `"Payment failed for {eventTitle}"`                             |
| **sublabel**          | `"Update payment method"`                                       |
| **icon**              | `credit-card-x`                                                 |
| **presentation**      | `alert`                                                         |
| **baseUrgency**       | 85                                                              |
| **urgencyDecayFn**    | `none`                                                          |
| **pageAffinity**      | `/my-events/{id}/pay`, `/my-spending`                           |
| **pageAffinityBoost** | 25                                                              |
| **hoverAction**       | Preview: failure reason, retry CTA, alternative payment methods |
| **clickAction**       | `navigate`                                                      |
| **click reveals**     | Payment page with retry                                         |
| **href**              | `/my-events/{id}/pay`                                           |
| **dismissable**       | no                                                              |
| **expandable**        | no                                                              |
| **maxImpressions**    | unlimited                                                       |
| **cooldownMinutes**   | 0                                                               |
| **expiresAt**         | When payment succeeds                                           |
| **scoring**           | Critical. Blocks event confirmation. Top 5 position.            |
| **interactions**      | Spawns `payment_overdue` if not resolved within grace period    |
| **dataSource**        | `notifications` (payment_failed)                                |
| **privacy**           | `private`                                                       |

---

## 36. Ticketed Events & Pop-Ups

Items for public ticketed events and dinner circle pop-up lifecycle.

#### TKT-001: Ticket Available

| Property              | Value                                                                               |
| --------------------- | ----------------------------------------------------------------------------------- |
| **type**              | `ticket_available`                                                                  |
| **category**          | Ticketed Events                                                                     |
| **label**             | `"Tickets: {eventTitle}"`                                                           |
| **sublabel**          | `"${price} - {remainingCount} left"`                                                |
| **icon**              | `ticket`                                                                            |
| **presentation**      | `card`                                                                              |
| **baseUrgency**       | 30                                                                                  |
| **urgencyDecayFn**    | `deadline` (event date)                                                             |
| **pageAffinity**      | `/chefs`, `/book-now`, `/my-hub`                                                    |
| **pageAffinityBoost** | 12                                                                                  |
| **hoverAction**       | Preview: event details, price tiers, remaining tickets, chef info                   |
| **clickAction**       | `navigate`                                                                          |
| **click reveals**     | Ticketed event page with purchase flow                                              |
| **href**              | `/events/{id}/tickets`                                                              |
| **dismissable**       | yes                                                                                 |
| **expandable**        | yes: ticket tiers, menu preview                                                     |
| **maxImpressions**    | 8                                                                                   |
| **cooldownMinutes**   | 1440                                                                                |
| **expiresAt**         | Event date or sold out                                                              |
| **scoring**           | +10 if from saved chef; +5 if cuisine matches; +8 if low inventory (<20% remaining) |
| **interactions**      | Boosts from circle membership (event in your circle)                                |
| **dataSource**        | `ticket_types`, `tickets`, chef events                                              |
| **privacy**           | `private`                                                                           |

#### TKT-002: Ticket Purchased Confirmation

| Property              | Value                                                              |
| --------------------- | ------------------------------------------------------------------ |
| **type**              | `ticket_purchased`                                                 |
| **category**          | Ticketed Events                                                    |
| **label**             | `"Ticket confirmed: {eventTitle}"`                                 |
| **sublabel**          | `"{ticketCount} tickets - {date}"`                                 |
| **icon**              | `ticket-check`                                                     |
| **presentation**      | `card`                                                             |
| **baseUrgency**       | 35                                                                 |
| **urgencyDecayFn**    | `deadline` (event date)                                            |
| **pageAffinity**      | `/my-events`, `/my-calendar`                                       |
| **pageAffinityBoost** | 10                                                                 |
| **hoverAction**       | Preview: ticket details, event date/time/location, add to calendar |
| **clickAction**       | `navigate`                                                         |
| **click reveals**     | Ticket detail with QR code                                         |
| **href**              | `/my-events/{id}`                                                  |
| **dismissable**       | no                                                                 |
| **expandable**        | yes: ticket QR, venue details, dietary submission form             |
| **maxImpressions**    | unlimited                                                          |
| **cooldownMinutes**   | 240                                                                |
| **expiresAt**         | Event date                                                         |
| **scoring**           | Ramps as event approaches (same as `event_upcoming`)               |
| **interactions**      | Feeds into event lifecycle; dietary info collection                |
| **dataSource**        | `tickets` (purchased), `events`                                    |
| **privacy**           | `private`                                                          |

#### TKT-003: Pop-Up Lifecycle Stage

| Property              | Value                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| **type**              | `popup_stage`                                                         |
| **category**          | Ticketed Events                                                       |
| **label**             | `"{popupName}: {stageLabel}"`                                         |
| **sublabel**          | Stage-specific (see below)                                            |
| **icon**              | Stage-specific                                                        |
| **presentation**      | `card` (concept/menu_build), `alert` (orders_open), `banner` (day_of) |
| **baseUrgency**       | 20 (concept) to 85 (day_of)                                           |
| **urgencyDecayFn**    | `step` (jumps at stage transitions)                                   |
| **pageAffinity**      | `/my-hub/g/{token}`, `/my-events`                                     |
| **pageAffinityBoost** | 15                                                                    |
| **hoverAction**       | Preview: current stage, what's needed, timeline to next stage         |
| **clickAction**       | `navigate`                                                            |
| **click reveals**     | Pop-up detail page                                                    |
| **href**              | `/my-hub/g/{groupToken}`                                              |
| **dismissable**       | no                                                                    |
| **expandable**        | yes: stage-specific sub-items                                         |
| **maxImpressions**    | unlimited                                                             |
| **cooldownMinutes**   | 0                                                                     |
| **expiresAt**         | When stage advances or event closes                                   |
| **scoring**           | See stage table below                                                 |
| **interactions**      | Drives different sub-items per stage                                  |
| **dataSource**        | Dinner circle pop-up lifecycle config                                 |
| **privacy**           | `event_visible`                                                       |

**Pop-Up Stage Details:**

| Stage             | sublabel                          | icon              | baseUrgency | Key Sub-Items                     |
| ----------------- | --------------------------------- | ----------------- | ----------- | --------------------------------- |
| `concept`         | `"Help shape the menu"`           | `lightbulb`       | 20          | Vote on cuisine, suggest dishes   |
| `menu_build`      | `"Menu being finalized"`          | `utensils`        | 25          | Dietary submission, course voting |
| `orders_open`     | `"Order now - closes {deadline}"` | `shopping-cart`   | 55          | Ticket/order purchase CTA         |
| `production_lock` | `"Orders locked - prep starting"` | `lock`            | 30          | Final dietary confirmation        |
| `day_of`          | `"Pop-up is today!"`              | `chef-hat-active` | 85          | Venue, time, QR ticket            |
| `closed`          | `"How was it?"`                   | `check`           | 35          | Review prompt, feedback           |
| `analyzed`        | `"Results: {summarySnippet}"`     | `bar-chart`       | 10          | Cost analysis, photos             |

#### TKT-004: Corporate Approval Gate

| Property              | Value                                                              |
| --------------------- | ------------------------------------------------------------------ |
| **type**              | `corporate_approval`                                               |
| **category**          | Ticketed Events                                                    |
| **label**             | `"Approval needed: {eventTitle}"`                                  |
| **sublabel**          | `"Status: {gateStatus}"` (pending/in_review/approved/rejected)     |
| **icon**              | `building-check`                                                   |
| **presentation**      | `alert` (pending), `badge` (in_review), `card` (approved/rejected) |
| **baseUrgency**       | 55 (pending), 40 (in_review), 20 (approved), 60 (rejected)         |
| **urgencyDecayFn**    | `step`                                                             |
| **pageAffinity**      | `/my-events`, `/my-hub/g/{token}`                                  |
| **pageAffinityBoost** | 15                                                                 |
| **hoverAction**       | Preview: approval chain status, who needs to approve, timeline     |
| **clickAction**       | `navigate`                                                         |
| **click reveals**     | Approval detail                                                    |
| **href**              | `/my-events/{id}`                                                  |
| **dismissable**       | no (until resolved)                                                |
| **expandable**        | yes: approval chain with per-approver status                       |
| **maxImpressions**    | unlimited                                                          |
| **cooldownMinutes**   | 0                                                                  |
| **expiresAt**         | When gate resolves                                                 |
| **scoring**           | +15 if rejected (needs action); blocks event progression           |
| **interactions**      | Gates the `event_confirmed` transition for corporate events        |
| **dataSource**        | Corporate approval gates from dinner circle config                 |
| **privacy**           | `event_visible`                                                    |

---

## 37. Food Social & Opportunity Marketplace

Items from the 11 food social rail families. Client-specific signals from the social layer.

#### FSR-001: Last-Minute Deal

| Property              | Value                                                                                |
| --------------------- | ------------------------------------------------------------------------------------ |
| **type**              | `last_minute_deal`                                                                   |
| **category**          | Food Social > Opportunity Marketplace                                                |
| **label**             | `"{dealTitle}"` (e.g. "20% off dinner with Chef {name} this Saturday")               |
| **sublabel**          | `"Expires {deadline}"`                                                               |
| **icon**              | `tag-discount`                                                                       |
| **presentation**      | `card`                                                                               |
| **baseUrgency**       | 35                                                                                   |
| **urgencyDecayFn**    | `deadline`                                                                           |
| **pageAffinity**      | `/chefs`, `/book-now`                                                                |
| **pageAffinityBoost** | 12                                                                                   |
| **hoverAction**       | Preview: deal details, chef profile, savings, book CTA                               |
| **clickAction**       | `navigate`                                                                           |
| **click reveals**     | Chef profile with deal applied                                                       |
| **href**              | `/chefs/{slug}?deal={dealId}`                                                        |
| **dismissable**       | yes                                                                                  |
| **expandable**        | no                                                                                   |
| **maxImpressions**    | 5                                                                                    |
| **cooldownMinutes**   | 720                                                                                  |
| **expiresAt**         | Deal deadline                                                                        |
| **scoring**           | Max 18% of rail (`opportunity_marketplace` cap); +5 if saved chef; +3 location match |
| **interactions**      | Slot kind: `promotional`. Follows 20% non-practical cap. No adjacent promotional.    |
| **dataSource**        | `opportunity_marketplace` social rail family                                         |
| **privacy**           | `private`                                                                            |

#### FSR-002: What to Eat Now

| Property              | Value                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| **type**              | `what_to_eat_now`                                                                                             |
| **category**          | Food Social > What To Eat                                                                                     |
| **label**             | `"{suggestion}"` (e.g. "Craving ramen? Chef {name} is available tonight")                                     |
| **sublabel**          | `"Based on your preferences + what's trending"`                                                               |
| **icon**              | `spark`, `flame`                                                                                              |
| **presentation**      | `pill`                                                                                                        |
| **baseUrgency**       | 18                                                                                                            |
| **urgencyDecayFn**    | `linear` (decays 5/day)                                                                                       |
| **pageAffinity**      | `/chefs`, `/my-meals`                                                                                         |
| **pageAffinityBoost** | 8                                                                                                             |
| **hoverAction**       | Preview: why this suggestion, chef availability, quick-book                                                   |
| **clickAction**       | `navigate`                                                                                                    |
| **click reveals**     | Chef/menu matching suggestion                                                                                 |
| **href**              | `/eat?suggestion={id}`                                                                                        |
| **dismissable**       | yes                                                                                                           |
| **expandable**        | no                                                                                                            |
| **maxImpressions**    | 8                                                                                                             |
| **cooldownMinutes**   | 480                                                                                                           |
| **expiresAt**         | 24 hours                                                                                                      |
| **scoring**           | Time-of-day contextual (dinner suggestions peak 4-7pm); taste passport weighted                               |
| **interactions**      | Three recovery modes: `continue` (keep suggesting), `clarify` (ask preferences), `recover` (change direction) |
| **dataSource**        | `what_to_eat_now` social rail family, taste passport, chef availability                                       |
| **privacy**           | `private`                                                                                                     |

#### FSR-003: Partner Venue Opportunity

| Property              | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| **type**              | `partner_venue`                                             |
| **category**          | Food Social > Partner                                       |
| **label**             | `"{venueName} hosts private dinners"`                       |
| **sublabel**          | `"Book a chef + venue experience"`                          |
| **icon**              | `building-dining`                                           |
| **presentation**      | `card`                                                      |
| **baseUrgency**       | 10                                                          |
| **urgencyDecayFn**    | `none`                                                      |
| **pageAffinity**      | `/chefs`, `/book-now`                                       |
| **pageAffinityBoost** | 8                                                           |
| **hoverAction**       | Preview: venue photos, capacity, chef pairings, price range |
| **clickAction**       | `navigate`                                                  |
| **click reveals**     | Venue + chef pairing page                                   |
| **href**              | `/venues/{slug}`                                            |
| **dismissable**       | yes                                                         |
| **expandable**        | yes: available chefs at this venue                          |
| **maxImpressions**    | 3                                                           |
| **cooldownMinutes**   | 4320                                                        |
| **expiresAt**         | 30 days                                                     |
| **scoring**           | Slot: `promotional`. Low frequency. Location-dependent.     |
| **interactions**      | From `partner_vendor_opportunity` social rail family        |
| **dataSource**        | Partner venue registry                                      |
| **privacy**           | `private`                                                   |

#### FSR-004: Food Trend Alert

| Property              | Value                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| **type**              | `food_trend`                                                          |
| **category**          | Food Social > Signals                                                 |
| **label**             | `"{trendTitle}"` (e.g. "Omakase is trending in your area")            |
| **sublabel**          | `"{n} chefs now offering this"`                                       |
| **icon**              | `trending-up`                                                         |
| **presentation**      | `pill`                                                                |
| **baseUrgency**       | 8                                                                     |
| **urgencyDecayFn**    | `linear` (slow)                                                       |
| **pageAffinity**      | `/chefs`, `/my-preferences/discovery`                                 |
| **pageAffinityBoost** | 5                                                                     |
| **hoverAction**       | Preview: trend data, matching chefs, how it fits your taste profile   |
| **clickAction**       | `toggle_filter`                                                       |
| **click reveals**     | Filtered chef/menu search for trend                                   |
| **href**              | `/eat?trend={slug}`                                                   |
| **dismissable**       | yes                                                                   |
| **expandable**        | no                                                                    |
| **maxImpressions**    | 5                                                                     |
| **cooldownMinutes**   | 2880                                                                  |
| **expiresAt**         | 14 days                                                               |
| **scoring**           | From `food_signal_notifications` family; +3 if matches taste passport |
| **interactions**      | Feeds `preference_trend` detection                                    |
| **dataSource**        | Trend analysis from discovery interactions across user base           |
| **privacy**           | `private`                                                             |

#### FSR-005: Circle Discovery Shared

| Property              | Value                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- |
| **type**              | `circle_shared_discovery`                                                          |
| **category**          | Food Social > Shared Circle                                                        |
| **label**             | `"{memberName} saved {itemLabel} in {circleName}"`                                 |
| **sublabel**          | `"Check it out"`                                                                   |
| **icon**              | `users-heart`                                                                      |
| **presentation**      | `badge`                                                                            |
| **baseUrgency**       | 15                                                                                 |
| **urgencyDecayFn**    | `linear`                                                                           |
| **pageAffinity**      | `/my-hub/g/{token}`, `/chefs`                                                      |
| **pageAffinityBoost** | 8                                                                                  |
| **hoverAction**       | Preview: what was shared, who shared it, relevance to your tastes                  |
| **clickAction**       | `navigate`                                                                         |
| **click reveals**     | Shared item (chef, cuisine, recipe)                                                |
| **href**              | Depends on shared item type                                                        |
| **dismissable**       | yes                                                                                |
| **expandable**        | no                                                                                 |
| **maxImpressions**    | 5                                                                                  |
| **cooldownMinutes**   | 720                                                                                |
| **expiresAt**         | 7 days                                                                             |
| **scoring**           | Max 24% of rail (`shared_circle_discovery` cap); social proof signal               |
| **interactions**      | Requires opt-in (visibility_consent family). Only from circles you've joined.      |
| **dataSource**        | `shared_circle_discovery` social rail family, `hub_messages` (type = notification) |
| **privacy**           | `event_visible`                                                                    |

#### FSR-006: Life Event Celebration

| Property              | Value                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------- |
| **type**              | `life_event_celebration`                                                               |
| **category**          | Food Social > Life Events                                                              |
| **label**             | `"Celebrate {eventType}?"` (e.g. "New baby! Plan a celebration dinner")                |
| **sublabel**          | `"Special occasions deserve special meals"`                                            |
| **icon**              | `confetti`, `heart`, `baby` (event-specific)                                           |
| **presentation**      | `card`                                                                                 |
| **baseUrgency**       | 20                                                                                     |
| **urgencyDecayFn**    | `linear` (decays 2/day)                                                                |
| **pageAffinity**      | `/book-now`                                                                            |
| **pageAffinityBoost** | 10                                                                                     |
| **hoverAction**       | Preview: occasion-matched chefs, celebration menu ideas, booking CTA                   |
| **clickAction**       | `navigate`                                                                             |
| **click reveals**     | Pre-filled booking for celebration                                                     |
| **href**              | `/book-now?occasion={eventType}`                                                       |
| **dismissable**       | yes                                                                                    |
| **expandable**        | yes: suggested formats (intimate dinner, party, tasting menu)                          |
| **maxImpressions**    | 3                                                                                      |
| **cooldownMinutes**   | 4320                                                                                   |
| **expiresAt**         | 14 days                                                                                |
| **scoring**           | From `relationship_life_event` family. Triggered by circle activity or calendar. Rare. |
| **interactions**      | Feeds `occasion` discovery items                                                       |
| **dataSource**        | Circle announcements, calendar integration, annual pattern detection                   |
| **privacy**           | `private`                                                                              |

---

## 38. Meal Requests & Fulfillment

Items from the meal board request lifecycle in circles.

#### MRQ-001: Meal Request Scheduled

| Property              | Value                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| **type**              | `meal_request_scheduled`                                                 |
| **category**          | Meal Requests                                                            |
| **label**             | `"Your meal request was scheduled"`                                      |
| **sublabel**          | `"{mealTitle} on {date} in {circleName}"`                                |
| **icon**              | `utensils-check`                                                         |
| **presentation**      | `card`                                                                   |
| **baseUrgency**       | 25                                                                       |
| **urgencyDecayFn**    | `deadline` (meal date)                                                   |
| **pageAffinity**      | `/my-hub/g/{token}/meal-board`, `/my-meals`                              |
| **pageAffinityBoost** | 10                                                                       |
| **hoverAction**       | Preview: meal details, date, who's cooking, dietary accommodations       |
| **clickAction**       | `navigate`                                                               |
| **click reveals**     | Meal board entry                                                         |
| **href**              | `/my-hub/g/{groupToken}/meal-board`                                      |
| **dismissable**       | yes                                                                      |
| **expandable**        | no                                                                       |
| **maxImpressions**    | 5                                                                        |
| **cooldownMinutes**   | 720                                                                      |
| **expiresAt**         | Meal date                                                                |
| **scoring**           | Confirmation signal. Moderate visibility.                                |
| **interactions**      | Clears pending meal request item                                         |
| **dataSource**        | `notifications` (meal_request_scheduled_to_client), `meal_board_entries` |
| **privacy**           | `event_visible`                                                          |

#### MRQ-002: Meal Request Declined

| Property              | Value                                                              |
| --------------------- | ------------------------------------------------------------------ |
| **type**              | `meal_request_declined`                                            |
| **category**          | Meal Requests                                                      |
| **label**             | `"Meal request couldn't be filled"`                                |
| **sublabel**          | `"For {requestedMeal} - try alternatives?"`                        |
| **icon**              | `utensils-x`                                                       |
| **presentation**      | `badge`                                                            |
| **baseUrgency**       | 20                                                                 |
| **urgencyDecayFn**    | `linear`                                                           |
| **pageAffinity**      | `/my-hub/g/{token}/meal-board`                                     |
| **pageAffinityBoost** | 8                                                                  |
| **hoverAction**       | Preview: why declined, alternative suggestions                     |
| **clickAction**       | `navigate`                                                         |
| **click reveals**     | Meal board with new request option                                 |
| **href**              | `/my-hub/g/{groupToken}/meal-board`                                |
| **dismissable**       | yes                                                                |
| **expandable**        | no                                                                 |
| **maxImpressions**    | 3                                                                  |
| **cooldownMinutes**   | 1440                                                               |
| **expiresAt**         | 5 days                                                             |
| **scoring**           | Informational. Low urgency.                                        |
| **interactions**      | None                                                               |
| **dataSource**        | `notifications` (meal_request_declined_to_client), `meal_requests` |
| **privacy**           | `event_visible`                                                    |

#### MRQ-003: Meal Request Fulfilled

| Property              | Value                                                               |
| --------------------- | ------------------------------------------------------------------- |
| **type**              | `meal_request_fulfilled`                                            |
| **category**          | Meal Requests                                                       |
| **label**             | `"Your meal is ready: {mealTitle}"`                                 |
| **sublabel**          | `"Leave feedback?"`                                                 |
| **icon**              | `utensils-star`                                                     |
| **presentation**      | `badge`                                                             |
| **baseUrgency**       | 20                                                                  |
| **urgencyDecayFn**    | `linear`                                                            |
| **pageAffinity**      | `/my-hub/g/{token}/meal-board`                                      |
| **pageAffinityBoost** | 10                                                                  |
| **hoverAction**       | Preview: meal details, feedback prompt                              |
| **clickAction**       | `navigate`                                                          |
| **click reveals**     | Meal feedback form                                                  |
| **href**              | `/my-hub/g/{groupToken}/meal-board`                                 |
| **dismissable**       | yes                                                                 |
| **expandable**        | no                                                                  |
| **maxImpressions**    | 5                                                                   |
| **cooldownMinutes**   | 720                                                                 |
| **expiresAt**         | 5 days                                                              |
| **scoring**           | +5 if no feedback given yet                                         |
| **interactions**      | Spawns meal feedback reaction (loved/liked/neutral/disliked)        |
| **dataSource**        | `notifications` (meal_request_fulfilled_to_client), `meal_feedback` |
| **privacy**           | `event_visible`                                                     |

#### MRQ-004: Meal Recommendation

| Property              | Value                                                     |
| --------------------- | --------------------------------------------------------- |
| **type**              | `meal_recommendation`                                     |
| **category**          | Meal Requests                                             |
| **label**             | `"Recommended for you: {mealTitle}"`                      |
| **sublabel**          | `"In {circleName}"`                                       |
| **icon**              | `utensils-spark`                                          |
| **presentation**      | `pill`                                                    |
| **baseUrgency**       | 12                                                        |
| **urgencyDecayFn**    | `linear`                                                  |
| **pageAffinity**      | `/my-hub/g/{token}/meal-board`, `/my-meals`               |
| **pageAffinityBoost** | 8                                                         |
| **hoverAction**       | Preview: meal details, why recommended, order/request CTA |
| **clickAction**       | `navigate`                                                |
| **click reveals**     | Meal board with recommendation highlighted                |
| **href**              | `/my-hub/g/{groupToken}/meal-board`                       |
| **dismissable**       | yes                                                       |
| **expandable**        | no                                                        |
| **maxImpressions**    | 5                                                         |
| **cooldownMinutes**   | 1440                                                      |
| **expiresAt**         | 7 days                                                    |
| **scoring**           | +3 if matches taste passport; personalized                |
| **interactions**      | Discovery-adjacent; feeds preference signals              |
| **dataSource**        | `notifications` (meal_recommendation_sent_to_client)      |
| **privacy**           | `event_visible`                                           |

---

## 39. Ingredient Substitutions

Items from pop-up and event ingredient management.

#### SUB-001: Ingredient Substitution Proposed

| Property              | Value                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| **type**              | `ingredient_substitution`                                                        |
| **category**          | Ingredient Substitution                                                          |
| **label**             | `"Substitution: {original} -> {replacement}"`                                    |
| **sublabel**          | `"For {eventTitle} - review needed"`                                             |
| **icon**              | `arrow-swap`                                                                     |
| **presentation**      | `alert`                                                                          |
| **baseUrgency**       | 50                                                                               |
| **urgencyDecayFn**    | `deadline` (event date)                                                          |
| **pageAffinity**      | `/my-events/{id}`, `/my-hub/g/{token}`                                           |
| **pageAffinityBoost** | 15                                                                               |
| **hoverAction**       | Preview: what's being replaced, why, allergen impact, chef's note                |
| **clickAction**       | `quick_action` (acknowledge/flag)                                                |
| **click reveals**     | Acknowledge substitution or flag concern                                         |
| **href**              | `/my-events/{id}`                                                                |
| **dismissable**       | no (if allergen-relevant)                                                        |
| **expandable**        | yes: allergen comparison, chef reasoning                                         |
| **maxImpressions**    | unlimited                                                                        |
| **cooldownMinutes**   | 0                                                                                |
| **expiresAt**         | Event date                                                                       |
| **scoring**           | +20 if substitution involves a declared allergen; +10 if event within 3 days     |
| **interactions**      | Triggers `allergy_warning` if substitution introduces known allergen             |
| **dataSource**        | Dinner circle ingredient status (`substitution_pending`), substitution proposals |
| **privacy**           | `chef_visible`                                                                   |

#### SUB-002: Ingredient Unavailable

| Property              | Value                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| **type**              | `ingredient_unavailable`                                                  |
| **category**          | Ingredient Substitution                                                   |
| **label**             | `"Ingredient unavailable: {ingredientName}"`                              |
| **sublabel**          | `"Chef {name} will suggest alternatives for {eventTitle}"`                |
| **icon**              | `x-circle-ingredient`                                                     |
| **presentation**      | `badge`                                                                   |
| **baseUrgency**       | 35                                                                        |
| **urgencyDecayFn**    | `deadline` (event date)                                                   |
| **pageAffinity**      | `/my-events/{id}`                                                         |
| **pageAffinityBoost** | 10                                                                        |
| **hoverAction**       | Preview: which dish affected, chef's plan, your dietary constraints check |
| **clickAction**       | `navigate`                                                                |
| **click reveals**     | Event menu detail                                                         |
| **href**              | `/my-events/{id}`                                                         |
| **dismissable**       | yes (informational)                                                       |
| **expandable**        | no                                                                        |
| **maxImpressions**    | 5                                                                         |
| **cooldownMinutes**   | 720                                                                       |
| **expiresAt**         | When substitution resolved                                                |
| **scoring**           | Informational unless allergen-adjacent                                    |
| **interactions**      | May spawn `ingredient_substitution` when chef proposes replacement        |
| **dataSource**        | Dinner circle ingredient status (`unavailable`)                           |
| **privacy**           | `chef_visible`                                                            |

---

## 40. Chef Dual-Role Toggle

For chef users who also book events as clients.

#### DRT-001: Switch to Client Mode

| Property              | Value                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **type**              | `dual_role_toggle`                                                                             |
| **category**          | Dual Role                                                                                      |
| **label**             | `"Explore as a diner"`                                                                         |
| **sublabel**          | `"See client-style discovery on your rail"`                                                    |
| **icon**              | `switch-user`                                                                                  |
| **presentation**      | `pill`                                                                                         |
| **baseUrgency**       | 5                                                                                              |
| **urgencyDecayFn**    | `none`                                                                                         |
| **pageAffinity**      | `/chefs`, `/my-preferences`, settings pages                                                    |
| **pageAffinityBoost** | 5                                                                                              |
| **hoverAction**       | Preview: what changes in client mode (discovery items, booking flow)                           |
| **clickAction**       | `quick_action` (toggle)                                                                        |
| **click reveals**     | Inline toggle: enables client discovery items on chef rail                                     |
| **href**              | `/settings/role-preferences`                                                                   |
| **dismissable**       | yes                                                                                            |
| **expandable**        | no                                                                                             |
| **maxImpressions**    | 3                                                                                              |
| **cooldownMinutes**   | 10080 (7 days)                                                                                 |
| **expiresAt**         | Never                                                                                          |
| **scoring**           | Only appears for users with both chef and client roles. Background priority.                   |
| **interactions**      | When enabled: all DISC-\* client items become eligible on chef rail with `client_mode` context |
| **dataSource**        | User role flags (has both `chef` and `client` roles)                                           |
| **privacy**           | `private`                                                                                      |

#### DRT-002: Client Mode Active

| Property              | Value                                                                          |
| --------------------- | ------------------------------------------------------------------------------ |
| **type**              | `client_mode_active`                                                           |
| **category**          | Dual Role                                                                      |
| **label**             | `"Client mode on"`                                                             |
| **sublabel**          | `"Tap to return to chef view"`                                                 |
| **icon**              | `switch-user-active`                                                           |
| **presentation**      | `pill`                                                                         |
| **baseUrgency**       | 3                                                                              |
| **urgencyDecayFn**    | `none`                                                                         |
| **pageAffinity**      | All pages (when client mode active)                                            |
| **pageAffinityBoost** | 0                                                                              |
| **hoverAction**       | Preview: toggle back to chef-only rail                                         |
| **clickAction**       | `quick_action` (toggle off)                                                    |
| **click reveals**     | Disables client discovery items                                                |
| **href**              | `/settings/role-preferences`                                                   |
| **dismissable**       | no (persistent indicator while active)                                         |
| **expandable**        | no                                                                             |
| **maxImpressions**    | unlimited                                                                      |
| **cooldownMinutes**   | 0                                                                              |
| **expiresAt**         | When toggled off                                                               |
| **scoring**           | Pinned to last position as persistent indicator. Does not compete for urgency. |
| **interactions**      | Visual indicator only. Pinned end-of-rail.                                     |
| **dataSource**        | User session preference                                                        |
| **privacy**           | `private`                                                                      |

---

## 41. Remy AI Integration

Remy is ChefFlow's AI concierge. During discovery, planning, and event management, Remy generates client-facing signals that should surface on the rail.

#### RMY-001: Decision Blocker

| Property              | Value                                                                                                                                                                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **type**              | `remy_decision_blocker`                                                                                                                                                                                                                                                                         |
| **category**          | Remy AI                                                                                                                                                                                                                                                                                         |
| **label**             | `"Stuck? {blockerSummary}"` (e.g. "Missing votes from 2 circle members", "Budget doesn't match options")                                                                                                                                                                                        |
| **sublabel**          | `"Remy can help"`                                                                                                                                                                                                                                                                               |
| **icon**              | `brain-alert`                                                                                                                                                                                                                                                                                   |
| **presentation**      | `card`                                                                                                                                                                                                                                                                                          |
| **baseUrgency**       | 45                                                                                                                                                                                                                                                                                              |
| **urgencyDecayFn**    | `step` (jumps when blocker severity increases)                                                                                                                                                                                                                                                  |
| **pageAffinity**      | `/eat`, `/chefs`, `/book-now`, `/my-hub/g/*`                                                                                                                                                                                                                                                    |
| **pageAffinityBoost** | 20                                                                                                                                                                                                                                                                                              |
| **hoverAction**       | Preview: blocker type, severity, Remy's suggested resolution                                                                                                                                                                                                                                    |
| **clickAction**       | `quick_action` (accept Remy suggestion or dismiss)                                                                                                                                                                                                                                              |
| **click reveals**     | Remy resolution options (e.g. "Send vote reminder", "Widen budget", "Drop weak constraint")                                                                                                                                                                                                     |
| **href**              | Context-dependent (discovery page, circle, booking)                                                                                                                                                                                                                                             |
| **dismissable**       | yes                                                                                                                                                                                                                                                                                             |
| **expandable**        | yes: detailed blocker analysis                                                                                                                                                                                                                                                                  |
| **maxImpressions**    | 8                                                                                                                                                                                                                                                                                               |
| **cooldownMinutes**   | 240                                                                                                                                                                                                                                                                                             |
| **expiresAt**         | When blocker resolves                                                                                                                                                                                                                                                                           |
| **scoring**           | Blocker severity multiplier: `blocking` 1.5x, `warning` 1.0x, `info` 0.5x. 12 types: missing_votes, dietary_conflict, dietary_confirmation, budget_mismatch, weak_budget_proof, location_disagreement, no_date, weak_data, stale_shortlist, too_many_candidates, too_few_candidates, group_size |
| **interactions**      | Triggers `remy_recovery_nudge` if blocker persists; suppresses related discovery noise                                                                                                                                                                                                          |
| **dataSource**        | `lib/remy/blocker-detection.ts`, discovery session state                                                                                                                                                                                                                                        |
| **privacy**           | `private` (circle-context blockers: `event_visible`)                                                                                                                                                                                                                                            |

#### RMY-002: Recovery Nudge

| Property              | Value                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **type**              | `remy_recovery_nudge`                                                                                                                                        |
| **category**          | Remy AI                                                                                                                                                      |
| **label**             | `"{nudgeMessage}"` (e.g. "Seeing the same results? Try widening your search", "No progress in 5 min")                                                        |
| **sublabel**          | `"Tap for a fresh approach"`                                                                                                                                 |
| **icon**              | `brain-refresh`                                                                                                                                              |
| **presentation**      | `pill`                                                                                                                                                       |
| **baseUrgency**       | 30                                                                                                                                                           |
| **urgencyDecayFn**    | `linear` (decays if user takes action)                                                                                                                       |
| **pageAffinity**      | `/eat`, `/chefs`                                                                                                                                             |
| **pageAffinityBoost** | 15                                                                                                                                                           |
| **hoverAction**       | Preview: what Remy detected (stuck signal), proposed recovery action                                                                                         |
| **clickAction**       | `quick_action` (apply recovery)                                                                                                                              |
| **click reveals**     | Recovery action options: fresh_mix, reset_search, broaden_cuisine, widen_radius, drop_constraint, switch_to_occasion_first                                   |
| **href**              | Current discovery page (in-place action)                                                                                                                     |
| **dismissable**       | yes                                                                                                                                                          |
| **expandable**        | no                                                                                                                                                           |
| **maxImpressions**    | 5                                                                                                                                                            |
| **cooldownMinutes**   | 600 (10 min)                                                                                                                                                 |
| **expiresAt**         | When user takes any discovery action                                                                                                                         |
| **scoring**           | Triggered by 7 stuck signals: long_dwell, repeated_filters, repeated_rejects, no_results, low_diversity, similar_cards, no_decision_progress. +5 per signal. |
| **interactions**      | Follows `remy_decision_blocker` if blocker not resolved; uses `WhatToEatRecovery` modes (continue/clarify/recover)                                           |
| **dataSource**        | `lib/remy/staleness-recovery-contracts.ts`, session interaction tracking                                                                                     |
| **privacy**           | `private`                                                                                                                                                    |

#### RMY-003: Memory Proposal

| Property              | Value                                                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **type**              | `remy_memory_proposal`                                                                                                                                                            |
| **category**          | Remy AI                                                                                                                                                                           |
| **label**             | `"Remember: {memoryDescription}?"` (e.g. "You prefer Italian for date nights", "No shellfish for Sarah")                                                                          |
| **sublabel**          | `"Remy noticed a pattern"`                                                                                                                                                        |
| **icon**              | `brain-heart`                                                                                                                                                                     |
| **presentation**      | `badge`                                                                                                                                                                           |
| **baseUrgency**       | 20                                                                                                                                                                                |
| **urgencyDecayFn**    | `linear` (decays 2/day)                                                                                                                                                           |
| **pageAffinity**      | `/my-preferences/discovery`, `/my-passport`, `/my-dietary`                                                                                                                        |
| **pageAffinityBoost** | 10                                                                                                                                                                                |
| **hoverAction**       | Preview: what Remy wants to remember, how it will be used, source evidence                                                                                                        |
| **clickAction**       | `quick_action` (confirm/reject/edit)                                                                                                                                              |
| **click reveals**     | Inline confirmation: Accept, Reject, Edit before saving                                                                                                                           |
| **href**              | `/my-preferences/discovery`                                                                                                                                                       |
| **dismissable**       | yes (counts as reject)                                                                                                                                                            |
| **expandable**        | yes: source interactions that triggered this proposal                                                                                                                             |
| **maxImpressions**    | 5                                                                                                                                                                                 |
| **cooldownMinutes**   | 1440                                                                                                                                                                              |
| **expiresAt**         | 7 days                                                                                                                                                                            |
| **scoring**           | +10 if allergy-related (safety); +5 if from post_decision_feedback (high confidence). Sources: explicit_remember_request, post_decision_feedback, taste_interview, group_summary. |
| **interactions**      | On accept: creates `discovery_profile_item` with `remy_chat` signal source. Feeds preference evolution.                                                                           |
| **dataSource**        | `lib/remy/memory-consent-contracts.ts`, Remy session memory                                                                                                                       |
| **privacy**           | `private` (allergy memories: `chef_visible` after confirmed)                                                                                                                      |

#### RMY-004: Taste Interview Step

| Property              | Value                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| **type**              | `remy_taste_interview`                                                                                          |
| **category**          | Remy AI                                                                                                         |
| **label**             | `"Quick question: {interviewQuestion}"` (e.g. "How do you feel about spicy food?", "Favorite comfort meal?")    |
| **sublabel**          | `"Help Remy learn your taste"`                                                                                  |
| **icon**              | `brain-question`                                                                                                |
| **presentation**      | `card`                                                                                                          |
| **baseUrgency**       | 15                                                                                                              |
| **urgencyDecayFn**    | `none`                                                                                                          |
| **pageAffinity**      | `/my-preferences/discovery`, `/eat`, `/my-passport`                                                             |
| **pageAffinityBoost** | 10                                                                                                              |
| **hoverAction**       | Preview: question with quick-answer options                                                                     |
| **clickAction**       | `quick_action` (inline answer)                                                                                  |
| **click reveals**     | Answer options (multiple choice or scale)                                                                       |
| **href**              | `/my-preferences/discovery`                                                                                     |
| **dismissable**       | yes                                                                                                             |
| **expandable**        | no                                                                                                              |
| **maxImpressions**    | 3 per question                                                                                                  |
| **cooldownMinutes**   | 2880                                                                                                            |
| **expiresAt**         | When answered or 14 days                                                                                        |
| **scoring**           | Low base. Only surfaces during active discovery sessions or onboarding. Max 1 interview item on rail at a time. |
| **interactions**      | On answer: feeds taste passport; spawns `remy_memory_proposal` if answer reveals strong preference              |
| **dataSource**        | Remy interview flow, taste passport gaps                                                                        |
| **privacy**           | `private`                                                                                                       |

#### RMY-005: Budget Mismatch Alert

| Property              | Value                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **type**              | `remy_budget_mismatch`                                                                    |
| **category**          | Remy AI                                                                                   |
| **label**             | `"Budget doesn't match options"`                                                          |
| **sublabel**          | `"${passportBudget}/person vs ${avgChefPrice}/person available"`                          |
| **icon**              | `dollar-alert`                                                                            |
| **presentation**      | `alert`                                                                                   |
| **baseUrgency**       | 40                                                                                        |
| **urgencyDecayFn**    | `none`                                                                                    |
| **pageAffinity**      | `/eat`, `/chefs`, `/book-now`                                                             |
| **pageAffinityBoost** | 15                                                                                        |
| **hoverAction**       | Preview: budget comparison, adjustment suggestions, matching chefs at adjusted budget     |
| **clickAction**       | `quick_action` (adjust budget or see matches)                                             |
| **click reveals**     | Budget adjustment slider or "Show chefs in my range" filter                               |
| **href**              | `/eat?budget={adjustedTier}`                                                              |
| **dismissable**       | yes                                                                                       |
| **expandable**        | yes: price comparison breakdown                                                           |
| **maxImpressions**    | 5                                                                                         |
| **cooldownMinutes**   | 480                                                                                       |
| **expiresAt**         | When budget filter adjusted                                                               |
| **scoring**           | Triggered by `does_not_fit` from Remy budget realism check. Only during active discovery. |
| **interactions**      | Related to DISC-016 (`client_price`); adjusts price filter suggestions                    |
| **dataSource**        | `lib/remy/budget-realism.ts`, `client_passports.budget_range`, PIE pricing                |
| **privacy**           | `private`                                                                                 |

#### RMY-006: Dietary Safety Warning

| Property              | Value                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **type**              | `remy_dietary_safety`                                                                                                  |
| **category**          | Remy AI                                                                                                                |
| **label**             | `"Dietary concern: {chefName} may not accommodate {restriction}"`                                                      |
| **sublabel**          | `"Remy flagged this for your safety"`                                                                                  |
| **icon**              | `shield-brain`                                                                                                         |
| **presentation**      | `alert`                                                                                                                |
| **baseUrgency**       | 70                                                                                                                     |
| **urgencyDecayFn**    | `none`                                                                                                                 |
| **pageAffinity**      | `/chefs/{slug}`, `/eat`, `/book-now`                                                                                   |
| **pageAffinityBoost** | 25                                                                                                                     |
| **hoverAction**       | Preview: which restriction, which chef, safety triage result (do_not_recommend / needs_confirmation)                   |
| **clickAction**       | `navigate`                                                                                                             |
| **click reveals**     | Chef profile with dietary accommodation detail                                                                         |
| **href**              | `/chefs/{slug}`                                                                                                        |
| **dismissable**       | no (if `do_not_recommend` triage)                                                                                      |
| **expandable**        | yes: affected allergens, chef's stated accommodations, Remy's confidence                                               |
| **maxImpressions**    | unlimited (safety)                                                                                                     |
| **cooldownMinutes**   | 0                                                                                                                      |
| **expiresAt**         | When chef removed from consideration or restriction confirmed safe                                                     |
| **scoring**           | Safety-critical during discovery. `do_not_recommend` = 70; `needs_confirmation` = 50. Blocks quick-book for this chef. |
| **interactions**      | Related to SAF-001 (allergy_warning) but pre-booking. Prevents unsafe bookings.                                        |
| **dataSource**        | `lib/remy/safety-triage.ts`, dietary trust system, chef accommodation data                                             |
| **privacy**           | `chef_visible` (after inquiry sent)                                                                                    |

---

## 42. Discovery Shortlist & Compare

Items from the shortlist and compare systems during active discovery.

#### SHL-001: Shortlist Compare Ready

| Property              | Value                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **type**              | `shortlist_compare_ready`                                                                                      |
| **category**          | Discovery Shortlist                                                                                            |
| **label**             | `"Compare your {n} shortlisted options"`                                                                       |
| **sublabel**          | `"Side-by-side: price, cuisine, availability"`                                                                 |
| **icon**              | `columns-compare`                                                                                              |
| **presentation**      | `card`                                                                                                         |
| **baseUrgency**       | 35                                                                                                             |
| **urgencyDecayFn**    | `linear` (decays 2/day if no action)                                                                           |
| **pageAffinity**      | `/eat`, `/chefs`                                                                                               |
| **pageAffinityBoost** | 20                                                                                                             |
| **hoverAction**       | Preview: shortlisted items summary, comparison dimensions available                                            |
| **clickAction**       | `open_modal` (compare drawer)                                                                                  |
| **click reveals**     | Side-by-side comparison across 7 dimensions                                                                    |
| **href**              | `/eat?compare=true`                                                                                            |
| **dismissable**       | yes                                                                                                            |
| **expandable**        | yes: shortlisted items as sub-pills                                                                            |
| **maxImpressions**    | 10                                                                                                             |
| **cooldownMinutes**   | 240                                                                                                            |
| **expiresAt**         | When shortlist cleared or booking made                                                                         |
| **scoring**           | Triggers when `summarizeShortlist().compareReady === true` (2+ items). +5 if `comparing_chefs` planning state. |
| **interactions**      | Bridges discovery to booking. Feeds from DISC-\* interactions.                                                 |
| **dataSource**        | `lib/discovery/shortlist-contracts.ts`, session shortlist state                                                |
| **privacy**           | `private`                                                                                                      |

#### SHL-002: Share Shortlist with Circle

| Property              | Value                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| **type**              | `shortlist_share_circle`                                                                                    |
| **category**          | Discovery Shortlist                                                                                         |
| **label**             | `"Share your {n} picks with {circleName}?"`                                                                 |
| **sublabel**          | `"Start a group vote"`                                                                                      |
| **icon**              | `share-users`                                                                                               |
| **presentation**      | `card`                                                                                                      |
| **baseUrgency**       | 25                                                                                                          |
| **urgencyDecayFn**    | `linear`                                                                                                    |
| **pageAffinity**      | `/eat`, `/my-hub/g/*`                                                                                       |
| **pageAffinityBoost** | 15                                                                                                          |
| **hoverAction**       | Preview: shortlisted items, circle name, "Start a poll" CTA                                                 |
| **clickAction**       | `quick_action` (share to circle)                                                                            |
| **click reveals**     | Circle selector + poll creation                                                                             |
| **href**              | `/my-hub/g/{groupToken}`                                                                                    |
| **dismissable**       | yes                                                                                                         |
| **expandable**        | no                                                                                                          |
| **maxImpressions**    | 5                                                                                                           |
| **cooldownMinutes**   | 720                                                                                                         |
| **expiresAt**         | When shared or shortlist cleared                                                                            |
| **scoring**           | Triggers when `summarizeShortlist().sendToCircleReady === true`. +8 if `coordinating_group` planning state. |
| **interactions**      | On share: creates circle poll from shortlist; transitions to `circle_poll_active`                           |
| **dataSource**        | `lib/discovery/shortlist-contracts.ts`, `hub_groups` (active circles)                                       |
| **privacy**           | `event_visible`                                                                                             |

#### SHL-003: Shortlist Stale Warning

| Property              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| **type**              | `shortlist_stale`                                                      |
| **category**          | Discovery Shortlist                                                    |
| **label**             | `"Your shortlist hasn't been updated in {n} days"`                     |
| **sublabel**          | `"Refresh or clear?"`                                                  |
| **icon**              | `clock-list`                                                           |
| **presentation**      | `badge`                                                                |
| **baseUrgency**       | 15                                                                     |
| **urgencyDecayFn**    | `linear`                                                               |
| **pageAffinity**      | `/eat`, `/chefs`                                                       |
| **pageAffinityBoost** | 8                                                                      |
| **hoverAction**       | Preview: shortlist contents, last update date, clear/refresh options   |
| **clickAction**       | `quick_action` (refresh or clear)                                      |
| **click reveals**     | Options: keep, refresh (re-score), clear                               |
| **href**              | `/eat`                                                                 |
| **dismissable**       | yes                                                                    |
| **expandable**        | no                                                                     |
| **maxImpressions**    | 3                                                                      |
| **cooldownMinutes**   | 2880                                                                   |
| **expiresAt**         | When shortlist updated or cleared                                      |
| **scoring**           | Triggered by Remy `stale_shortlist` blocker. Low urgency nudge.        |
| **interactions**      | May trigger `remy_recovery_nudge` if combined with other stuck signals |
| **dataSource**        | Shortlist last-modified timestamp, Remy blocker detection              |
| **privacy**           | `private`                                                              |

---

## 43. Search History & Pinned

Items from the client's search history and pinned searches.

#### SRH-001: Recent Search

| Property              | Value                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **type**              | `recent_search`                                                                               |
| **category**          | Search History                                                                                |
| **label**             | `"{searchTitle}"` (e.g. "Thai chefs near me", "Meal prep Boston")                             |
| **sublabel**          | `"Searched {timeAgo}"`                                                                        |
| **icon**              | `search-clock`                                                                                |
| **presentation**      | `pill`                                                                                        |
| **baseUrgency**       | 10                                                                                            |
| **urgencyDecayFn**    | `linear` (decays 3/day)                                                                       |
| **pageAffinity**      | `/eat`, `/chefs`                                                                              |
| **pageAffinityBoost** | 10                                                                                            |
| **hoverAction**       | Preview: search query, result count, re-run CTA                                               |
| **clickAction**       | `navigate` (re-runs search)                                                                   |
| **click reveals**     | Search results for this query                                                                 |
| **href**              | `{searchUrl}` (stored in history entry)                                                       |
| **dismissable**       | yes (removes from history)                                                                    |
| **expandable**        | no                                                                                            |
| **maxImpressions**    | 15                                                                                            |
| **cooldownMinutes**   | 120                                                                                           |
| **expiresAt**         | 7 days                                                                                        |
| **scoring**           | Max 3 recent search items on rail at once. Most recent first.                                 |
| **interactions**      | Warm restart signal for returning clients                                                     |
| **dataSource**        | `lib/search/search-recents.ts`, localStorage `cf:search:history:{tenantId}:{userId}` (max 12) |
| **privacy**           | `private`                                                                                     |

#### SRH-002: Pinned Search

| Property              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| **type**              | `pinned_search`                                                        |
| **category**          | Search History                                                         |
| **label**             | `"{searchTitle}"`                                                      |
| **sublabel**          | `"Pinned"`                                                             |
| **icon**              | `pin-search`                                                           |
| **presentation**      | `pill`                                                                 |
| **baseUrgency**       | 18                                                                     |
| **urgencyDecayFn**    | `none`                                                                 |
| **pageAffinity**      | `/eat`, `/chefs`                                                       |
| **pageAffinityBoost** | 12                                                                     |
| **hoverAction**       | Preview: search query, result count, unpin option                      |
| **clickAction**       | `navigate` (re-runs search)                                            |
| **click reveals**     | Pinned search results                                                  |
| **href**              | `{searchUrl}`                                                          |
| **dismissable**       | yes (unpins)                                                           |
| **expandable**        | no                                                                     |
| **maxImpressions**    | unlimited                                                              |
| **cooldownMinutes**   | 60                                                                     |
| **expiresAt**         | Never (until unpinned)                                                 |
| **scoring**           | Higher than recent searches. Persists across sessions. Max 8 pinned.   |
| **interactions**      | Treated like saved discovery items; feeds preference signals on re-use |
| **dataSource**        | `lib/search/search-recents.ts`, localStorage (pinned = true, max 8)    |
| **privacy**           | `private`                                                              |

---

## 44. Account Health & Security

Items for account completeness and security setup.

#### ACC-001: Phone Verification Prompt

| Property              | Value                                                                               |
| --------------------- | ----------------------------------------------------------------------------------- |
| **type**              | `phone_verification`                                                                |
| **category**          | Account Health                                                                      |
| **label**             | `"Verify your phone number"`                                                        |
| **sublabel**          | `"Get SMS updates about your events"`                                               |
| **icon**              | `phone-check`                                                                       |
| **presentation**      | `badge`                                                                             |
| **baseUrgency**       | 30                                                                                  |
| **urgencyDecayFn**    | `step` (jumps when first event booked)                                              |
| **pageAffinity**      | `/my-profile`, `/my-events`                                                         |
| **pageAffinityBoost** | 15                                                                                  |
| **hoverAction**       | Preview: why verify (SMS reminders, chef contact, 2FA), inline verify CTA           |
| **clickAction**       | `quick_action` (inline verification code flow)                                      |
| **click reveals**     | Phone verification inline component                                                 |
| **href**              | `/my-profile`                                                                       |
| **dismissable**       | yes                                                                                 |
| **expandable**        | no                                                                                  |
| **maxImpressions**    | 8                                                                                   |
| **cooldownMinutes**   | 2880                                                                                |
| **expiresAt**         | When verified                                                                       |
| **scoring**           | +15 if event booked (SMS reminders valuable); +10 if notification prefs include sms |
| **interactions**      | Part of account health flow; enables SMS notifications                              |
| **dataSource**        | `lib/phone/verification.ts`, user phone_verified flag                               |
| **privacy**           | `private`                                                                           |

#### ACC-002: Security Setup (2FA)

| Property              | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| **type**              | `security_setup`                                           |
| **category**          | Account Health                                             |
| **label**             | `"Protect your account with 2FA"`                          |
| **sublabel**          | `"Secure your payment info and bookings"`                  |
| **icon**              | `shield-lock`                                              |
| **presentation**      | `badge`                                                    |
| **baseUrgency**       | 15                                                         |
| **urgencyDecayFn**    | `none`                                                     |
| **pageAffinity**      | `/my-profile`, settings pages                              |
| **pageAffinityBoost** | 10                                                         |
| **hoverAction**       | Preview: 2FA benefits, setup time estimate ("takes 1 min") |
| **clickAction**       | `navigate`                                                 |
| **click reveals**     | 2FA setup page                                             |
| **href**              | `/my-profile`                                              |
| **dismissable**       | yes                                                        |
| **expandable**        | no                                                         |
| **maxImpressions**    | 5                                                          |
| **cooldownMinutes**   | 10080 (7 days)                                             |
| **expiresAt**         | When 2FA enabled                                           |
| **scoring**           | +10 if has payment methods saved; low urgency otherwise    |
| **interactions**      | Part of account health; requires phone_verified            |
| **dataSource**        | `lib/mfa/sms-actions.ts`, MFA enrollment status            |
| **privacy**           | `private`                                                  |

#### ACC-003: Notification Preferences Setup

| Property              | Value                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| **type**              | `notification_prefs_setup`                                                                          |
| **category**          | Account Health                                                                                      |
| **label**             | `"Choose how you hear from your chef"`                                                              |
| **sublabel**          | `"Email, SMS, or push notifications"`                                                               |
| **icon**              | `bell-settings`                                                                                     |
| **presentation**      | `badge`                                                                                             |
| **baseUrgency**       | 25                                                                                                  |
| **urgencyDecayFn**    | `step` (jumps when first event booked)                                                              |
| **pageAffinity**      | `/my-profile`, `/my-notifications`                                                                  |
| **pageAffinityBoost** | 12                                                                                                  |
| **hoverAction**       | Preview: current settings (or "not set"), quick-setup options                                       |
| **clickAction**       | `navigate`                                                                                          |
| **click reveals**     | Notification preferences page                                                                       |
| **href**              | `/my-notifications`                                                                                 |
| **dismissable**       | yes                                                                                                 |
| **expandable**        | no                                                                                                  |
| **maxImpressions**    | 5                                                                                                   |
| **cooldownMinutes**   | 4320                                                                                                |
| **expiresAt**         | When preferences set or 30 days                                                                     |
| **scoring**           | +10 if first event booked and no prefs set; fires when `getNotificationPreferences()` returns empty |
| **interactions**      | Part of onboarding flow alongside ONB-\* items                                                      |
| **dataSource**        | `lib/notifications/settings-actions.ts`, `CategoryPreference`                                       |
| **privacy**           | `private`                                                                                           |

---

## 45. Cancellation & Refund Timeline

Granular cancellation substates beyond EVT-007.

#### CXL-001: Cancellation Refund Pending

| Property              | Value                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| **type**              | `cancellation_refund_pending`                                                                                   |
| **category**          | Cancellation                                                                                                    |
| **label**             | `"Refund in progress: ${amount}"`                                                                               |
| **sublabel**          | `"Expected by {estimatedDate}"`                                                                                 |
| **icon**              | `dollar-clock`                                                                                                  |
| **presentation**      | `card`                                                                                                          |
| **baseUrgency**       | 55                                                                                                              |
| **urgencyDecayFn**    | `step` (jumps at 3d, 7d, 14d with no resolution)                                                                |
| **pageAffinity**      | `/my-spending`, `/my-events/{id}`                                                                               |
| **pageAffinityBoost** | 15                                                                                                              |
| **hoverAction**       | Preview: refund amount, original payment, estimated timeline, grace period status                               |
| **clickAction**       | `navigate`                                                                                                      |
| **click reveals**     | Refund tracking detail                                                                                          |
| **href**              | `/my-spending`                                                                                                  |
| **dismissable**       | no                                                                                                              |
| **expandable**        | yes: cancellation details, tier-based refund calculation, grace period info                                     |
| **maxImpressions**    | unlimited                                                                                                       |
| **cooldownMinutes**   | 0                                                                                                               |
| **expiresAt**         | When `refund_processed` fires                                                                                   |
| **scoring**           | Replaces `event_cancelled` urgency for refund-pending state. +10 if past estimated date (overdue).              |
| **interactions**      | Spawned by `event_cancelled` cascade; replaced by PAY-003 (`refund_processed`) on completion                    |
| **dataSource**        | `notifications` (cancellation_pending_refund), `CancellationPreview` (gracePeriodApplies, gracePeriodExpiresAt) |
| **privacy**           | `private`                                                                                                       |

#### CXL-002: Invoice Viewed Without Action

| Property              | Value                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| **type**              | `invoice_viewed_no_action`                                                                        |
| **category**          | Cancellation                                                                                      |
| **label**             | `"You viewed your invoice but haven't paid"`                                                      |
| **sublabel**          | `"${amount} for {eventTitle}"`                                                                    |
| **icon**              | `eye-dollar`                                                                                      |
| **presentation**      | `badge`                                                                                           |
| **baseUrgency**       | 40                                                                                                |
| **urgencyDecayFn**    | `deadline` (payment due date)                                                                     |
| **pageAffinity**      | `/my-events/{id}/invoice`, `/my-spending`                                                         |
| **pageAffinityBoost** | 12                                                                                                |
| **hoverAction**       | Preview: invoice summary, pay now CTA                                                             |
| **clickAction**       | `navigate`                                                                                        |
| **click reveals**     | Invoice with payment button                                                                       |
| **href**              | `/my-events/{id}/pay`                                                                             |
| **dismissable**       | yes                                                                                               |
| **expandable**        | no                                                                                                |
| **maxImpressions**    | 5                                                                                                 |
| **cooldownMinutes**   | 720                                                                                               |
| **expiresAt**         | When paid                                                                                         |
| **scoring**           | Behavioral nudge. Triggered when `invoice_viewed` interaction recorded but no payment within 24h. |
| **interactions**      | Precursor to `gap_payment_due`; softer reminder                                                   |
| **dataSource**        | `lib/clients/interaction-ledger-core.ts` (invoice_viewed code), payment status                    |
| **privacy**           | `private`                                                                                         |

---

## 46. Additional Social & Media

#### SOC-001: Circle Member Photos Added

| Property              | Value                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| **type**              | `circle_photos_added`                                                                    |
| **category**          | Social Media                                                                             |
| **label**             | `"{memberName} added {n} photos from {eventTitle}"`                                      |
| **sublabel**          | `"In {circleName}"`                                                                      |
| **icon**              | `camera-users`                                                                           |
| **presentation**      | `badge`                                                                                  |
| **baseUrgency**       | 15                                                                                       |
| **urgencyDecayFn**    | `linear` (decays 2/day)                                                                  |
| **pageAffinity**      | `/my-hub/g/{token}`, `/my-events/{id}/recap`                                             |
| **pageAffinityBoost** | 8                                                                                        |
| **hoverAction**       | Preview: photo grid thumbnails, uploader name                                            |
| **clickAction**       | `navigate`                                                                               |
| **click reveals**     | Circle media gallery                                                                     |
| **href**              | `/my-hub/g/{groupToken}`                                                                 |
| **dismissable**       | yes                                                                                      |
| **expandable**        | yes: photo grid                                                                          |
| **maxImpressions**    | 5                                                                                        |
| **cooldownMinutes**   | 720                                                                                      |
| **expiresAt**         | 7 days                                                                                   |
| **scoring**           | +3 if you attended the event; social engagement driver                                   |
| **interactions**      | Distinct from COM-004 (chef photos); this is member-contributed. Boosts `review_prompt`. |
| **dataSource**        | `lib/hub/media-actions.ts` (uploaded_by_profile_id), `hub_media`                         |
| **privacy**           | `event_visible`                                                                          |

---

## 47. Scoring & Assembly Rules

### 47.1 Item Lifecycle State Machine

Every rail item follows this lifecycle (mirrors `ChefRailLifecycleState` from `chef-rail-contracts.ts`):

```
candidate -> eligible -> shown -> acted_on | snoozed | dismissed | resolved | expired | suppressed
                                    |            |          |
                                    v            v          v
                                 converted    eligible   cooldown -> eligible
                                              (after       (after
                                              snooze       cooldownMinutes)
                                              period)
```

| State        | Description                                              | Visibility         |
| ------------ | -------------------------------------------------------- | ------------------ |
| `candidate`  | Data conditions met; not yet scored                      | Hidden             |
| `eligible`   | Scored above threshold; ready for assembly               | Hidden             |
| `shown`      | Assembled into rail; visible to client                   | Visible            |
| `acted_on`   | Client clicked, expanded, or interacted                  | Visible (briefly)  |
| `snoozed`    | Client swiped away / "remind me later"                   | Hidden (temporary) |
| `dismissed`  | Client explicitly dismissed; enters cooldown             | Hidden             |
| `resolved`   | Underlying condition resolved (e.g. payment made)        | Removed            |
| `converted`  | Client completed the item's goal (e.g. booked, reviewed) | Removed            |
| `expired`    | Past `expiresAt` without action                          | Removed            |
| `suppressed` | Hard-negative score (-8) or system override              | Hidden             |

**Transition rules:**

- `candidate -> eligible`: score >= 0 AND not in cooldown AND impressions < maxImpressions
- `eligible -> shown`: passes assembly slot policy checks
- `shown -> acted_on`: any click/hover/expand interaction
- `acted_on -> converted`: goal completed (navigate + action taken)
- `acted_on -> shown`: interaction without conversion (returns to rail)
- `shown -> dismissed`: explicit dismiss action; starts cooldownMinutes timer
- `dismissed -> eligible`: after cooldownMinutes elapsed (if still valid)
- Any state -> `expired`: current time > expiresAt
- Any state -> `resolved`: underlying data condition no longer true
- Any state -> `suppressed`: score drops below -8 hard-negative threshold

### 47.2 Composite Scoring Formula

Each item's final score is computed as:

```
finalScore = (baseUrgency + urgencyModifier + pageAffinityScore + contextModifier + preferenceScore) * decayMultiplier * rarityMultiplier
```

**Component breakdown:**

| Component           | Formula                                                             | Range        |
| ------------------- | ------------------------------------------------------------------- | ------------ |
| `baseUrgency`       | Static per item type                                                | 0-100        |
| `urgencyModifier`   | From urgency decay function (see below)                             | -50 to +25   |
| `pageAffinityScore` | `pageAffinityBoost` if current route matches `pageAffinity`, else 0 | 0-50         |
| `contextModifier`   | Sum of applicable client-specific modifiers (see table below)       | -30 to +50   |
| `preferenceScore`   | From taste passport match (discovery items only)                    | -12 to +10   |
| `decayMultiplier`   | From `urgencyDecayFn` (see below)                                   | 0.0 to 1.5   |
| `rarityMultiplier`  | From food social rail family (see below)                            | 0.74 to 1.25 |

**Urgency decay functions:**

| Function   | Formula                                               | Use Case                                  |
| ---------- | ----------------------------------------------------- | ----------------------------------------- |
| `none`     | `modifier = 0`                                        | Evergreen items (cuisines, dietary)       |
| `linear`   | `modifier = -rate * daysSinceCreation`                | Notifications, temporary signals          |
| `deadline` | `modifier = 25 * (1 / max(1, hoursUntilDeadline/24))` | Events, expiring quotes, time-sensitive   |
| `step`     | `modifier = stepValue` at defined thresholds          | Lifecycle transitions, periodic reminders |

**Deadline decay curve (exponential urgency near deadline):**

```
hoursLeft > 168 (7d):  modifier = 0
hoursLeft 48-168:      modifier = +5
hoursLeft 24-48:       modifier = +10
hoursLeft 6-24:        modifier = +15
hoursLeft 1-6:         modifier = +20
hoursLeft < 1:         modifier = +25
```

**Rarity multipliers (food social rail families only):**

| Rarity    | Multiplier  | Item Types                        |
| --------- | ----------- | --------------------------------- |
| `common`  | 1.0x        | Most items                        |
| `limited` | 0.88x       | FSR-003 (partner venues)          |
| `rare`    | 0.74x       | FSR-006 (life events)             |
| `urgent`  | 1.25x boost | Any item flagged urgent by system |

### 47.3 Priority Tiers

| Tier                | Score Range | Item Types                                                                                                                                                                                | Assembly Rule                                           |
| ------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Critical**        | 90+         | `event_today`, `event_in_progress`, `allergy_warning`, `payment_overdue`, `chef_running_late`, `remy_dietary_safety` (do_not_recommend)                                                   | Always positions 0-2. Never suppressed. Never cooldown. |
| **Action Required** | 60-89       | `event_tomorrow`, `event_countdown`, `quote_expiring`, `gap_*`, `event_proposed`, `allergy_confirmation`, `payment_failed`, `payment_dispute`, `remy_dietary_safety` (needs_confirmation) | Top 5 positions. Override discovery.                    |
| **Active**          | 30-59       | `event_upcoming`, `quote_received`, `inquiry_*`, `review_prompt`, `circle_*`, `remy_decision_blocker`, `shortlist_compare_ready`, `cancellation_refund_pending`                           | Mixed with discovery.                                   |
| **Ambient**         | 10-29       | `rebook_suggestion`, `saved_chef_activity`, `loyalty_*`, `preference_*`, `remy_memory_proposal`, `search_*`, `meal_*`                                                                     | Fill remaining slots.                                   |
| **Background**      | 0-9         | `story`, `spending_summary`, `surprise`, `discovery_tune`, `dual_role_toggle`                                                                                                             | Low-priority fill. Max 2 background items.              |

### 47.4 Slot Policy

From `control-rail-contracts.ts`, extended for client rail:

| Rule                      | Value                             | Rationale                           |
| ------------------------- | --------------------------------- | ----------------------------------- |
| Max visible items         | 20 (before "show more")           | Cognitive load limit                |
| Max non-practical slots   | 20% of visible                    | Prevents ad/editorial overload      |
| No adjacent non-practical | Enforced                          | Variety rhythm                      |
| First slot                | Must be practical                 | Anchor with actionable content      |
| Pinned items              | Position 0                        | User-chosen priority                |
| Saved items               | Position 1                        | User-chosen bookmarks               |
| Critical tier             | Positions 0-2 (override pin/save) | Safety and urgency trump preference |
| Max per category          | 3 (except Critical: unlimited)    | Prevents one category dominating    |
| Max promotional           | 2 total                           | Anti-spam for deals/upsells         |
| Remy items cap            | 2 concurrent                      | AI doesn't overwhelm                |
| Safety items              | Uncapped, always shown            | Never suppress allergy/dietary      |

### 47.5 Client-Specific Scoring Modifiers

| Signal                        | Modifier                     | Affected Items                           |
| ----------------------------- | ---------------------------- | ---------------------------------------- |
| Has upcoming event within 7d  | +15                          | EVT-_, GAP-_, COM-_, RTS-_               |
| Has upcoming event within 24h | +25 (replaces 7d)            | EVT-_, GAP-_, RTS-\*                     |
| Has unread messages           | +10                          | COM-001, CIR-003                         |
| New account (< 14 days)       | +20 ONB-_, +5 DISC-_         | ONB-_, DISC-_, ACC-\*                    |
| Loyalty tier gold+            | +5                           | DISC-013, XS-002, LOY-\*                 |
| Has active circles            | +8                           | CIR-_, HUB-_, FSR-005                    |
| Passport complete             | +3                           | REC-001, DISC-019, DISC-020, FSR-002     |
| Dietary allergies declared    | Pin always                   | SAF-001, DIET-\*, RMY-006                |
| Payment overdue               | Suppress promotional/ambient | XS-\*, FSR-001, FSR-003, story, surprise |
| Active discovery session      | +10                          | RMY-001, RMY-002, SHL-_, SRH-_, DISC-\*  |
| No events ever                | +15                          | ONB-_, DISC-_, booking CTAs              |
| Has saved chefs               | +5                           | SAV-001, RTS-004, RBK-001                |
| Remy enabled                  | +3                           | RMY-\* (only shown if Remy is active)    |
| Multiple circles              | +3 per circle (cap +12)      | CIR-\*, FSR-005                          |
| Phone not verified            | +10 on booking pages         | ACC-001                                  |

### 47.6 Item Coalescing Rules

When multiple items would clutter the rail, they coalesce:

| Condition                                      | Result                                      | Coalesced ID          |
| ---------------------------------------------- | ------------------------------------------- | --------------------- |
| 3+ unread circle messages (same circle)        | Single "3 new in {circleName}" badge        | `CIR-003` (batched)   |
| 2+ event completion gaps (same event)          | Single "{n} items need attention" card      | `GAP-BATCH-{eventId}` |
| 3+ notifications from same source              | Single batched notification                 | `COM-BATCH-{source}`  |
| Quote received + inquiry quoted (same inquiry) | Single "Quote ready" (highest urgency wins) | `QUO-001`             |
| Saved chef + rebook suggestion (same chef)     | Single "Rebook Chef {name}" card            | `RBK-001`             |
| 3+ guest RSVPs within 1 hour                   | Single "{n} guests RSVP'd" badge            | `GST-001` (batched)   |
| 2+ Remy blockers (same session)                | Single "Remy found {n} issues" card         | `RMY-001` (batched)   |
| Recent search + pinned search (same query)     | Pinned wins (higher urgency)                | `SRH-002`             |
| Multiple meal requests (same circle)           | Single "{n} meal updates" badge             | `MRQ-BATCH`           |

**Coalescing algorithm:**

1. Group items by coalesce key (entity ID + category)
2. If group size >= coalesce threshold: merge into single item
3. Merged item uses highest urgency from group
4. Merged sublabel shows count: "{n} items"
5. Expand reveals individual items as sub-list

### 47.7 Expiry Cascade & Spawn Chains

When an item transitions state, it may spawn or clear related items:

| Trigger                                | Spawns                                               | Clears                                           |
| -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `event_today` ends                     | `event_summary_ready`, `review_prompt`, `tip_prompt` | `event_countdown`, all `gap_*` for this event    |
| `event_in_progress` ends               | `event_summary_ready`                                | `event_today`, `chef_running_late`               |
| `quote_expiring` expires               | `quote_expired`                                      | `quote_received`                                 |
| `quote_accepted`                       | `event_proposed` or `event_upcoming`                 | `quote_received`, `quote_expiring`               |
| `inquiry_sent` gets response           | `inquiry_awaiting_client` or `inquiry_quoted`        | -                                                |
| `inquiry_declined`                     | `chef_recommendation` (alternatives)                 | `inquiry_sent`                                   |
| `event_cancelled`                      | `cancellation_refund_pending`, `rebook_suggestion`   | All `gap_*`, `event_upcoming`, `event_confirmed` |
| `cancellation_refund_pending` resolves | `refund_processed`                                   | -                                                |
| `onboarding_welcome` dismissed         | Individual `onboarding_*` persist                    | -                                                |
| `remy_decision_blocker` resolved       | (depends on resolution)                              | `remy_recovery_nudge` if related                 |
| `shortlist_compare_ready` -> booking   | `event_proposed` (after inquiry)                     | `shortlist_*`, `remy_*` discovery items          |
| `gap_payment_due` paid                 | `payment_confirmed`                                  | `invoice_viewed_no_action`                       |
| `popup_stage` advances                 | Next stage item                                      | Previous stage item                              |
| `circle_rsvp` responded                | `circle_planning` updated                            | -                                                |
| `allergy_warning` resolved             | -                                                    | `remy_dietary_safety` for same chef              |

### 47.8 Mobile Presentation Rules

The rail adapts for mobile viewports (< 768px):

| Rule                       | Desktop                   | Mobile                                   |
| -------------------------- | ------------------------- | ---------------------------------------- |
| Scroll behavior            | Free scroll with momentum | Snap-scroll (one card per flick)         |
| Max visible without scroll | 6-8 items                 | 3-4 items (larger cards)                 |
| Card presentation          | Compact inline            | Full-width cards                         |
| `pill` presentation        | Horizontal row of pills   | Wrapping pill cloud (max 2 rows)         |
| `story` presentation       | Inline card with image    | Full-bleed story card                    |
| `banner` presentation      | Top rail banner           | Full-width sticky header                 |
| `alert` presentation       | Inline with red accent    | Modal-style overlay on first show        |
| Hover actions              | On hover                  | On long-press                            |
| Expand behavior            | Inline dropdown           | Bottom sheet                             |
| Quick actions              | Inline buttons            | Bottom sheet with large tap targets      |
| `visual_card`              | 200px wide                | Full viewport width                      |
| Critical items             | Inline position 0-2       | Sticky top card until dismissed/resolved |

**Mobile-specific assembly rules:**

- Max 3 items above the fold (first view)
- Critical items take full first card position
- Discovery pills collapse to single "Explore" row
- Non-practical items limited to 1 above the fold

### 47.9 Cold Start Strategy

For new clients with no event history, no taste passport, and no discovery interactions:

| Phase                  | Trigger                         | Rail Composition                                                                          |
| ---------------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| **First visit**        | Account created, 0 interactions | 60% onboarding (ONB-_), 30% popular discovery (DISC-_), 10% editorial (stories)           |
| **Profile started**    | 1+ preference set               | 40% onboarding, 40% preference-matched discovery, 20% surprise/editorial                  |
| **First inquiry sent** | Inquiry exists                  | 30% inquiry lifecycle, 40% discovery, 20% onboarding remainders, 10% chef recommendations |
| **First event booked** | Event in any state              | 50% event lifecycle + gaps, 30% discovery (personalized), 20% ambient                     |
| **Established**        | 3+ events completed             | Normal scoring. All 139 item types eligible. Full personalization.                        |

**Cold start discovery scoring:**

- Tier 1 cuisines (popularity 90-100): +5 boost
- Local chefs (within 25mi): +8 boost
- Occasion templates: +3 boost (birthday, date night most common starters)
- `surprise` items: +2 boost (encourages exploration)
- Editorial stories: +2 boost (education value)

### 47.10 Rate Limiting & Anti-Overwhelm

| Rule                                    | Limit                           | Rationale                                           |
| --------------------------------------- | ------------------------------- | --------------------------------------------------- |
| Max items computed per render           | 50 candidates                   | Performance budget                                  |
| Max items visible                       | 20 (+ "show more")              | Cognitive load                                      |
| Max alerts simultaneously               | 3                               | Alert fatigue prevention                            |
| Max promotional items                   | 2                               | Anti-spam                                           |
| Max Remy items                          | 2                               | AI doesn't dominate                                 |
| Max items from same entity (event/chef) | 3                               | Variety enforcement                                 |
| Max new items per session               | 10                              | Prevents rail "explosion" on return                 |
| Minimum time between additions          | 30 seconds                      | Prevents visual instability                         |
| Max dismissals before "quiet mode"      | 5 in 10 min triggers quiet mode | User is overwhelmed; reduce to Critical+Action only |
| Quiet mode duration                     | 30 minutes                      | Cool-down period                                    |
| Global cooldown after interaction       | 2 seconds                       | Prevents accidental double-actions                  |

**Quiet mode:**
When a client dismisses 5+ items in 10 minutes, the rail enters quiet mode:

- Only Critical and Action Required tiers shown
- All Ambient and Background suppressed
- Discovery items reduced to pinned/saved only
- Exits after 30 minutes or manual "show all" toggle

### 47.11 Analytics Event Mapping

Every item interaction fires a structured analytics event:

```typescript
interface RailAnalyticsEvent {
  event:
    | 'rail_item_shown'
    | 'rail_item_clicked'
    | 'rail_item_expanded'
    | 'rail_item_dismissed'
    | 'rail_item_converted'
    | 'rail_item_expired'
    | 'rail_item_hovered'
    | 'rail_quiet_mode_entered'
    | 'rail_quiet_mode_exited'
  itemType: string // e.g. 'event_tomorrow'
  itemId: string // unique instance ID
  category: string // e.g. 'Event Lifecycle'
  position: number // 0-indexed rail position
  score: number // final computed score
  tier: 'critical' | 'action_required' | 'active' | 'ambient' | 'background'
  presentation: string // pill, card, badge, alert, etc.
  pageRoute: string // current page when interaction occurred
  sessionItemCount: number // total items shown this session
  timeToInteraction: number // ms from shown to first interaction
  impressionCount: number // times this item instance was shown
  wasCoalesced: boolean // part of a batched group
  source: 'scroll' | 'click' | 'expand' | 'hover' | 'dismiss' | 'system'
}
```

**Key metrics per item type:**

| Metric                   | Formula                         | Health Threshold                               |
| ------------------------ | ------------------------------- | ---------------------------------------------- |
| Click-through rate (CTR) | clicks / impressions            | > 5% for Action Required; > 2% for Active      |
| Conversion rate          | conversions / clicks            | > 20% for gaps/payments; > 10% for discovery   |
| Dismiss rate             | dismissals / impressions        | < 30% (above = item is annoying)               |
| Time to action           | median ms from shown to clicked | < 30s for Critical; < 5min for Action Required |
| Impression efficiency    | conversions / impressions       | > 1% (below = item is noise)                   |
| Quiet mode trigger rate  | quiet_mode_entered / sessions   | < 5% (above = rail is overwhelming)            |

### 47.12 Performance Budget

| Constraint                       | Budget                                   | Enforcement                                                  |
| -------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| Scoring computation              | < 16ms (one frame)                       | Pre-compute scores; cache until data changes                 |
| Assembly (sorting + slot policy) | < 8ms                                    | Pre-sorted candidate pool                                    |
| DOM elements rendered            | Max 25 items (20 visible + 5 buffer)     | Virtual scroll for overflow                                  |
| Image preloading                 | First 5 items only                       | Lazy-load remainder on scroll                                |
| Data freshness polling           | 30 second interval                       | SSE for real-time items (events, messages); polling for rest |
| Re-render triggers               | Data change OR route change OR 60s timer | Not on scroll (scroll = CSS only)                            |
| Total rail payload               | < 50KB JSON                              | Paginate if exceeded                                         |
| Animation budget                 | 60fps, max 3 concurrent animations       | CSS-only transitions; no JS animation                        |

**Real-time vs polled data sources:**

| Source                       | Update Method           | Latency |
| ---------------------------- | ----------------------- | ------- |
| Event FSM transitions        | SSE                     | < 2s    |
| New messages / notifications | SSE                     | < 2s    |
| Chef running late            | SSE                     | < 2s    |
| Discovery interactions       | Client-side (immediate) | 0ms     |
| Remy signals                 | Client-side (immediate) | 0ms     |
| Shortlist changes            | Client-side (immediate) | 0ms     |
| Quote/inquiry status         | Polling (30s)           | < 30s   |
| Payment status               | Polling (60s)           | < 60s   |
| Loyalty/badge updates        | Polling (5min)          | < 5min  |
| Seasonal/editorial           | Polling (1hr)           | < 1hr   |
| Recommendations              | Pre-computed (daily)    | < 24hr  |

---

## Appendix A: Full Item Type Registry

| ID       | Type                          | Category                | baseUrgency | Dismissable              |
| -------- | ----------------------------- | ----------------------- | ----------- | ------------------------ |
| DISC-001 | `client_cuisine`              | Discovery > Taste       | 15          | yes                      |
| DISC-002 | `client_food_type`            | Discovery > Taste       | 12          | yes                      |
| DISC-003 | `client_craving`              | Discovery > Taste       | 20          | yes                      |
| DISC-004 | `client_dietary`              | Discovery > Taste       | 25          | no (if allergy)          |
| DISC-005 | `client_mood`                 | Discovery > Taste       | 10          | yes                      |
| DISC-006 | `client_seasonal`             | Discovery > Taste       | 18          | yes                      |
| DISC-007 | `client_culinary_signal`      | Discovery > Taste       | 8           | yes                      |
| DISC-008 | `client_technique`            | Discovery > Taste       | 8           | yes                      |
| DISC-009 | `client_ingredient`           | Discovery > Taste       | 10          | yes                      |
| DISC-010 | `client_vibe`                 | Discovery > Taste       | 8           | yes                      |
| DISC-011 | `client_service`              | Discovery > Occasion    | 15          | yes                      |
| DISC-012 | `client_occasion`             | Discovery > Occasion    | 20          | yes                      |
| DISC-013 | `client_special_dining`       | Discovery > Occasion    | 12          | yes                      |
| DISC-014 | `client_circle`               | Discovery > Occasion    | 22          | no                       |
| DISC-015 | `client_location`             | Discovery > Occasion    | 10          | yes                      |
| DISC-016 | `client_price`                | Discovery > Occasion    | 10          | yes                      |
| DISC-017 | `client_time`                 | Discovery > Occasion    | 8-25        | yes                      |
| DISC-018 | `client_group_size`           | Discovery > Occasion    | 8           | yes                      |
| DISC-019 | `client_featured_chef`        | Discovery > Picks       | 15          | yes                      |
| DISC-020 | `client_chef_pick`            | Discovery > Picks       | 12          | yes                      |
| DISC-021 | `client_combo`                | Discovery > Picks       | 10          | yes                      |
| DISC-022 | `client_story`                | Discovery > Picks       | 5           | yes                      |
| DISC-023 | `client_surprise`             | Discovery > Picks       | 8           | yes                      |
| DISC-024 | `client_saved`                | Discovery > Picks       | 12          | yes                      |
| EVT-001  | `event_tomorrow`              | Event Lifecycle         | 90          | no                       |
| EVT-002  | `event_today`                 | Event Lifecycle         | 98          | no                       |
| EVT-003  | `event_upcoming`              | Event Lifecycle         | 55          | no                       |
| EVT-004  | `event_proposed`              | Event Lifecycle         | 70          | no                       |
| EVT-005  | `event_confirmed`             | Event Lifecycle         | 30          | no                       |
| EVT-006  | `event_summary_ready`         | Event Lifecycle         | 45          | yes                      |
| EVT-007  | `event_cancelled`             | Event Lifecycle         | 50          | yes                      |
| GAP-001  | `gap_guest_count`             | Event Completion        | 60          | no                       |
| GAP-002  | `gap_menu_unconfirmed`        | Event Completion        | 65          | no                       |
| GAP-003  | `gap_contract_unsigned`       | Event Completion        | 65          | no                       |
| GAP-004  | `gap_payment_due`             | Event Completion        | 75          | no                       |
| GAP-005  | `gap_dietary_missing`         | Event Completion        | 50          | no                       |
| GAP-006  | `gap_pre_event_checklist`     | Event Completion        | 55          | no                       |
| QUO-001  | `quote_received`              | Quote Lifecycle         | 65          | no                       |
| QUO-002  | `quote_expiring`              | Quote Lifecycle         | 80          | no                       |
| QUO-003  | `quote_expired`               | Quote Lifecycle         | 30          | yes                      |
| QUO-004  | `quote_accepted`              | Quote Lifecycle         | 50          | no                       |
| INQ-001  | `inquiry_sent`                | Inquiry Lifecycle       | 35          | no                       |
| INQ-002  | `inquiry_awaiting_client`     | Inquiry Lifecycle       | 60          | no                       |
| INQ-003  | `inquiry_quoted`              | Inquiry Lifecycle       | 65          | no                       |
| INQ-004  | `inquiry_declined`            | Inquiry Lifecycle       | 35          | yes                      |
| INQ-005  | `inquiry_expired`             | Inquiry Lifecycle       | 25          | yes                      |
| COM-001  | `new_chef_message`            | Communication           | 55          | yes                      |
| COM-002  | `contract_ready`              | Communication           | 60          | no                       |
| COM-003  | `menu_updated`                | Communication           | 45          | conditional              |
| COM-004  | `photos_ready`                | Communication           | 30          | yes                      |
| COM-005  | `event_reminder`              | Communication           | 40-85       | yes                      |
| PAY-001  | `payment_overdue`             | Payment                 | 92          | no                       |
| PAY-002  | `payment_confirmed`           | Payment                 | 15          | yes                      |
| PAY-003  | `refund_processed`            | Payment                 | 40          | yes                      |
| PAY-004  | `recurring_payment_due`       | Payment                 | 50          | no                       |
| PAY-005  | `payment_split_pending`       | Payment                 | 55          | no                       |
| DIET-001 | `dietary_profile_incomplete`  | Dietary                 | 40          | yes                      |
| DIET-002 | `allergy_confirmation`        | Dietary                 | 70          | no                       |
| HH-001   | `household_member_incomplete` | Household               | 25          | yes                      |
| HH-002   | `household_dietary_alert`     | Household               | 65          | no                       |
| CIR-001  | `circle_poll_active`          | Dinner Circle           | 45          | no                       |
| CIR-002  | `circle_planning`             | Dinner Circle           | 40          | no                       |
| CIR-003  | `circle_message`              | Dinner Circle           | 30          | yes                      |
| CIR-004  | `circle_rsvp`                 | Dinner Circle           | 55          | no                       |
| CIR-005  | `meal_board_update`           | Dinner Circle           | 20          | yes                      |
| SAV-001  | `saved_chef_activity`         | Saved                   | 25          | yes                      |
| SAV-002  | `saved_recipe`                | Saved                   | 8           | yes                      |
| REC-001  | `chef_recommendation`         | Recommendations         | 15          | yes                      |
| SEA-001  | `seasonal_opportunity`        | Seasonal                | 20          | yes                      |
| GC-001   | `gift_card_received`          | Gift Cards              | 50          | yes                      |
| GC-002   | `gift_card_balance`           | Gift Cards              | 12          | yes                      |
| GC-003   | `gift_card_expiring`          | Gift Cards              | 60          | no                       |
| REF-001  | `referral_status`             | Referral                | 20          | yes                      |
| REF-002  | `referral_invite`             | Referral                | 8           | yes                      |
| REV-001  | `review_prompt`               | Reviews                 | 40          | yes                      |
| TIP-001  | `tip_prompt`                  | Tips                    | 30          | yes                      |
| RBK-001  | `rebook_suggestion`           | Rebook                  | 20          | yes                      |
| BUD-001  | `spending_summary`            | Budget                  | 5           | yes                      |
| PREF-001 | `preference_trend`            | Preference Evolution    | 8           | yes                      |
| ONB-001  | `onboarding_welcome`          | Onboarding              | 60          | yes                      |
| ONB-002  | `onboarding_profile`          | Onboarding              | 35          | yes                      |
| ONB-003  | `onboarding_location`         | Onboarding              | 45          | yes                      |
| CAL-001  | `calendar_sync`               | Calendar                | 20          | yes                      |
| SPD-001  | `special_date_approaching`    | Special Dates           | 30          | yes                      |
| RCP-001  | `recipe_from_event`           | Recipes                 | 20          | yes                      |
| MPL-001  | `meal_plan_suggestion`        | Meal Planning           | 10          | yes                      |
| RCR-001  | `recurring_event_due`         | Recurring               | 35          | yes                      |
| PAS-001  | `passport_incomplete`         | Client Passport         | 25          | yes                      |
| DPR-001  | `discovery_tune`              | Discovery Prefs         | 10          | yes                      |
| XS-001   | `gift_card_promo`             | Cross-Sell              | 5           | yes                      |
| XS-002   | `upgrade_prompt`              | Cross-Sell              | 8           | yes                      |
| LOY-001  | `points_earned`               | Loyalty                 | 20          | yes                      |
| LOY-002  | `tier_upgrade`                | Loyalty                 | 45          | yes                      |
| LOY-003  | `badge_earned`                | Loyalty                 | 25          | yes                      |
| LOY-004  | `raffle_entry`                | Loyalty                 | 15          | yes                      |
| LOY-005  | `raffle_winner`               | Loyalty                 | 70          | no                       |
| LOY-006  | `milestone_approaching`       | Loyalty                 | 12          | yes                      |
| HUB-001  | `friend_request`              | Hub                     | 40          | no                       |
| HUB-002  | `circle_invitation`           | Hub                     | 45          | no                       |
| HUB-003  | `shared_chef`                 | Hub                     | 20          | yes                      |
| SAF-001  | `allergy_warning`             | Safety                  | 95          | no                       |
| RTS-001  | `chef_running_late`           | Real-Time Event         | 88          | no                       |
| RTS-002  | `event_countdown`             | Real-Time Event         | 75          | no                       |
| RTS-003  | `event_in_progress`           | Real-Time Event         | 96          | no                       |
| RTS-004  | `chef_open_slot`              | Real-Time Event         | 35          | yes                      |
| RTS-005  | `repeat_booking_request`      | Real-Time Event         | 40          | yes                      |
| GST-001  | `guest_rsvp_received`         | Guest Management        | 25          | yes                      |
| GST-002  | `guest_count_changed`         | Guest Management        | 50          | no                       |
| DIS-001  | `payment_dispute`             | Payment Dispute         | 80          | no                       |
| DIS-002  | `dispute_funds_withdrawn`     | Payment Dispute         | 75          | no                       |
| DIS-003  | `payment_failed`              | Payment Dispute         | 85          | no                       |
| TKT-001  | `ticket_available`            | Ticketed Events         | 30          | yes                      |
| TKT-002  | `ticket_purchased`            | Ticketed Events         | 35          | no                       |
| TKT-003  | `popup_stage`                 | Ticketed Events         | 20-85       | no                       |
| TKT-004  | `corporate_approval`          | Ticketed Events         | 20-60       | no                       |
| FSR-001  | `last_minute_deal`            | Food Social             | 35          | yes                      |
| FSR-002  | `what_to_eat_now`             | Food Social             | 18          | yes                      |
| FSR-003  | `partner_venue`               | Food Social             | 10          | yes                      |
| FSR-004  | `food_trend`                  | Food Social             | 8           | yes                      |
| FSR-005  | `circle_shared_discovery`     | Food Social             | 15          | yes                      |
| FSR-006  | `life_event_celebration`      | Food Social             | 20          | yes                      |
| MRQ-001  | `meal_request_scheduled`      | Meal Requests           | 25          | yes                      |
| MRQ-002  | `meal_request_declined`       | Meal Requests           | 20          | yes                      |
| MRQ-003  | `meal_request_fulfilled`      | Meal Requests           | 20          | yes                      |
| MRQ-004  | `meal_recommendation`         | Meal Requests           | 12          | yes                      |
| SUB-001  | `ingredient_substitution`     | Ingredient Substitution | 50          | no (if allergen)         |
| SUB-002  | `ingredient_unavailable`      | Ingredient Substitution | 35          | yes                      |
| DRT-001  | `dual_role_toggle`            | Dual Role               | 5           | yes                      |
| DRT-002  | `client_mode_active`          | Dual Role               | 3           | no                       |
| RMY-001  | `remy_decision_blocker`       | Remy AI                 | 45          | yes                      |
| RMY-002  | `remy_recovery_nudge`         | Remy AI                 | 30          | yes                      |
| RMY-003  | `remy_memory_proposal`        | Remy AI                 | 20          | yes                      |
| RMY-004  | `remy_taste_interview`        | Remy AI                 | 15          | yes                      |
| RMY-005  | `remy_budget_mismatch`        | Remy AI                 | 40          | yes                      |
| RMY-006  | `remy_dietary_safety`         | Remy AI                 | 70          | no (if do_not_recommend) |
| SHL-001  | `shortlist_compare_ready`     | Discovery Shortlist     | 35          | yes                      |
| SHL-002  | `shortlist_share_circle`      | Discovery Shortlist     | 25          | yes                      |
| SHL-003  | `shortlist_stale`             | Discovery Shortlist     | 15          | yes                      |
| SRH-001  | `recent_search`               | Search History          | 10          | yes                      |
| SRH-002  | `pinned_search`               | Search History          | 18          | yes                      |
| ACC-001  | `phone_verification`          | Account Health          | 30          | yes                      |
| ACC-002  | `security_setup`              | Account Health          | 15          | yes                      |
| ACC-003  | `notification_prefs_setup`    | Account Health          | 25          | yes                      |
| CXL-001  | `cancellation_refund_pending` | Cancellation            | 55          | no                       |
| CXL-002  | `invoice_viewed_no_action`    | Cancellation            | 40          | yes                      |
| SOC-001  | `circle_photos_added`         | Social Media            | 15          | yes                      |

**Total: 139 item types** (24 discovery + 115 operational/lifecycle)

---

## Appendix B: Data Source Summary

| Source                                                   | Item Types Fed                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `events` + `event_transitions`                           | EVT-_, GAP-_, COM-005, REV-001, TIP-001, RBK-001, RTS-002, RTS-003          |
| `quotes`                                                 | QUO-\*                                                                      |
| `inquiries`                                              | INQ-\*                                                                      |
| `notifications`                                          | COM-_, PAY-_, LOY-_, GC-001, RTS-001, RTS-004, RTS-005, GST-_, DIS-_, MRQ-_ |
| `contracts`                                              | GAP-003, COM-002                                                            |
| `payments` / `invoices`                                  | PAY-_, GAP-004, BUD-001, DIS-_                                              |
| `recurring_invoices`                                     | PAY-004                                                                     |
| `clients` / `client_passports`                           | PAS-001, ONB-002, DISC-016, LOY-002, DRT-\*                                 |
| `discovery_profile_items` + `discovery_interactions`     | DISC-\*, PREF-001, DPR-001, FSR-002, FSR-004                                |
| `consumer_saved_chefs`                                   | SAV-001, RBK-001, RTS-004                                                   |
| `hub_groups` / `hub_messages` / `hub_polls`              | CIR-_, HUB-_, FSR-005                                                       |
| `event_stubs` / `hub_group_candidates`                   | CIR-002, TKT-003                                                            |
| `meal_board_entries` / `meal_requests` / `meal_feedback` | CIR-005, MPL-001, MRQ-\*                                                    |
| `hub_guest_profiles` / `event_guests`                    | HH-001, GAP-005, GST-\*                                                     |
| `gift_cards`                                             | GC-\*                                                                       |
| `referrals`                                              | REF-\*                                                                      |
| `reviews`                                                | REV-001                                                                     |
| `loyalty_transactions`                                   | LOY-001, LOY-003                                                            |
| `user_location_defaults`                                 | ONB-003, DISC-015                                                           |
| `ticket_types` / `tickets`                               | TKT-001, TKT-002                                                            |
| Completion contract engine                               | GAP-\*, EVT-003                                                             |
| PIE seasonal scores                                      | DISC-006, DISC-009, SEA-001                                                 |
| Recommendation engine                                    | REC-001, DISC-019, DISC-020, FSR-002                                        |
| Readiness gates                                          | GAP-006, EVT-005, RTS-002                                                   |
| Dietary trust system                                     | DIET-002, SAF-001, SUB-001                                                  |
| Dinner circle config (pop-up lifecycle)                  | TKT-003, TKT-004, SUB-\*                                                    |
| Food social rail families                                | FSR-\*                                                                      |
| Partner venue registry                                   | FSR-003                                                                     |
| Trend analysis engine                                    | FSR-004                                                                     |
| User role flags                                          | DRT-\*                                                                      |
| Remy blocker detection                                   | RMY-001, RMY-005                                                            |
| Remy staleness/recovery                                  | RMY-002                                                                     |
| Remy memory consent                                      | RMY-003, RMY-004                                                            |
| Remy safety triage                                       | RMY-006                                                                     |
| Shortlist contracts                                      | SHL-\*                                                                      |
| Search history (localStorage)                            | SRH-\*                                                                      |
| Phone verification                                       | ACC-001                                                                     |
| MFA enrollment                                           | ACC-002                                                                     |
| Notification preferences                                 | ACC-003                                                                     |
| Cancellation preview/history                             | CXL-001                                                                     |
| Interaction ledger                                       | CXL-002                                                                     |
| Hub media (member uploads)                               | SOC-001                                                                     |

---

## Appendix C: Coverage Matrix vs Prompt Categories

Verification that every requested category is covered:

| Requested Category             | Items                                            | Count   |
| ------------------------------ | ------------------------------------------------ | ------- |
| All public discovery items     | DISC-001 through DISC-024                        | 24      |
| Event lifecycle                | EVT-001 through EVT-007, RTS-002, RTS-003        | 9       |
| Event completion gaps          | GAP-001 through GAP-006                          | 6       |
| Quote lifecycle                | QUO-001 through QUO-004                          | 4       |
| Inquiry lifecycle              | INQ-001 through INQ-005                          | 5       |
| Communication signals          | COM-001 through COM-005                          | 5       |
| Payment signals                | PAY-001 through PAY-005, DIS-001 through DIS-003 | 8       |
| Dietary profile completeness   | DIET-001, DIET-002                               | 2       |
| Household member completeness  | HH-001, HH-002                                   | 2       |
| Dinner circle activity         | CIR-001 through CIR-005                          | 5       |
| Saved chefs and saved items    | SAV-001, SAV-002, DISC-024                       | 3       |
| Chef recommendations           | REC-001, RTS-005                                 | 2       |
| Seasonal opportunities         | SEA-001, DISC-006                                | 2       |
| Gift cards                     | GC-001 through GC-003                            | 3       |
| Referral rewards               | REF-001, REF-002                                 | 2       |
| Review prompts                 | REV-001                                          | 1       |
| Tip prompts                    | TIP-001                                          | 1       |
| Rebook suggestions             | RBK-001, RTS-005                                 | 2       |
| Budget tracking                | BUD-001                                          | 1       |
| Preference evolution           | PREF-001, FSR-004                                | 2       |
| Onboarding gaps                | ONB-001 through ONB-003                          | 3       |
| Calendar integration           | CAL-001                                          | 1       |
| Special dates                  | SPD-001                                          | 1       |
| Recipe collection              | RCP-001, SAV-002                                 | 2       |
| Meal planning signals          | MPL-001, MRQ-001 through MRQ-004                 | 5       |
| Recurring event reminders      | REC-001 (recurring)                              | 1       |
| Client passport completeness   | PAS-001                                          | 1       |
| Discovery preference prompts   | DPR-001                                          | 1       |
| Cross-sell                     | XS-001, XS-002, FSR-001, FSR-003                 | 4       |
| Loyalty & rewards              | LOY-001 through LOY-006                          | 6       |
| Hub & social                   | HUB-001 through HUB-003, FSR-005, FSR-006        | 5       |
| Safety & compliance            | SAF-001, SUB-001, SUB-002                        | 3       |
| Real-time event signals        | RTS-001 through RTS-005                          | 5       |
| Guest management               | GST-001, GST-002                                 | 2       |
| Ticketed events & pop-ups      | TKT-001 through TKT-004                          | 4       |
| Food social marketplace        | FSR-001 through FSR-006                          | 6       |
| Ingredient substitutions       | SUB-001, SUB-002                                 | 2       |
| Chef dual-role toggle          | DRT-001, DRT-002                                 | 2       |
| Remy AI integration            | RMY-001 through RMY-006                          | 6       |
| Discovery shortlist & compare  | SHL-001 through SHL-003                          | 3       |
| Search history & pinned        | SRH-001, SRH-002                                 | 2       |
| Account health & security      | ACC-001 through ACC-003                          | 3       |
| Cancellation & refund timeline | CXL-001, CXL-002                                 | 2       |
| Additional social & media      | SOC-001                                          | 1       |
| **TOTAL**                      |                                                  | **139** |

---

_Generated 2026-05-14. v3: 139 item types across 47 categories. Covers all client pages, all lifecycle states, all DB sources, all notification types, all food social families, ticketed events, pop-up lifecycle, ingredient substitutions, payment disputes, guest management, real-time event signals, chef dual-role, Remy AI integration (6 items), discovery shortlist/compare, search history, account health/security, cancellation refund timeline, and circle media sharing._
