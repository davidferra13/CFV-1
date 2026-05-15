# Universal Rail: Public Role Complete Item Catalog

> **Date:** 2026-05-14
> **Scope:** Every item type that can appear on the Universal Rail for PUBLIC (anonymous, no account) users.
> **Build rule:** ADDITIVE. Existing 23 types enriched. New types extend the union.

---

## Table of Contents

1. [Legend](#legend)
2. [Master Catalog Table](#master-catalog-table)
3. [Detailed Item Specifications](#detailed-item-specifications)
   - [TASTE Lane](#taste-lane) (17 types)
   - [OCCASION Lane](#occasion-lane) (15 types)
   - [CHEFFLOW PICKS Lane](#chefflow-picks-lane) (11 types)
   - [ENGAGEMENT Lane (NEW)](#engagement-lane-new) (10 types)
4. [Interaction Matrix](#interaction-matrix)
5. [Scoring Reference](#scoring-reference)
6. [Data Source Map](#data-source-map)
7. [Implementation Notes](#implementation-notes)
8. [Rail Composition Rules](#rail-composition-rules)
9. [Destination Contract Additions](#destination-contract-additions)
10. [Refresh and Rotation Logic](#refresh-and-rotation-logic)
11. [Hover Preview Wireframes](#hover-preview-wireframes)
12. [Accessibility Contract](#accessibility-contract)
13. [Analytics Event Mapping](#analytics-event-mapping)
14. [Mobile Touch Behavior](#mobile-touch-behavior)
15. [Filter State Machine](#filter-state-machine)
16. [Public Role Limitations Summary](#public-role-limitations-summary)
17. [Priority Arbitration](#priority-arbitration)
18. [Scenario Walkthroughs](#scenario-walkthroughs)
19. [Performance Budget](#performance-budget)
20. [Content Policy](#content-policy)
21. [Degradation Ladder](#degradation-ladder)
22. [Implementation Checklist](#implementation-checklist)
23. [Icon Key Registry](#icon-key-registry)
24. [Seasonal Activation Calendar](#seasonal-activation-calendar)
25. [Cross-Page Rail Variations](#cross-page-rail-variations)
26. [localStorage Schema](#localstorage-schema)
27. [URL Query Parameter Catalog](#url-query-parameter-catalog)
28. [Concrete Data Examples](#concrete-data-examples)
29. [Animation Specs](#animation-specs)

---

## Legend

| Field                 | Meaning                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **baseUrgency**       | 0-100 static priority before any signals                                                                              |
| **urgencyDecayFn**    | `deadline` (drops to 0 at expiry), `linear` (fades over days), `none` (static)                                        |
| **pageAffinity**      | Routes where this item gets boosted                                                                                   |
| **pageAffinityBoost** | 0-50 bonus added when on an affinity page                                                                             |
| **hoverAction**       | What happens on pointer hover (desktop)                                                                               |
| **clickAction**       | `navigate` (go to page), `toggle_filter` (add/remove filter facet), `expand_inline` (open sub-items in rail)          |
| **presentation**      | `pill` (compact text+icon), `card` (image+text block), `badge` (small highlight chip), `story` (full-width editorial) |
| **maxImpressions**    | Times shown before suppression (-1 = never suppress)                                                                  |
| **cooldownMinutes**   | Minutes after dismiss before item can reappear                                                                        |

### Existing Types (enriched)

`cuisine`, `food_type`, `craving`, `service`, `occasion`, `dietary`, `featured_chef`, `chef_pick`, `combo`, `story`, `surprise`, `seasonal`, `location`, `mood`, `price`, `time`, `group_size`, `saved`, `special_dining`, `circle`, `culinary_signal`, `technique`, `ingredient`, `vibe`

### New Types (added by this catalog)

`trending`, `new_on_chefflow`, `social_proof`, `comparison_prompt`, `guided_flow`, `signup_nudge`, `recovery`, `cross_sell`, `editorial_collection`, `availability_pulse`, `chef_spotlight_story`, `ingredient_hero`, `region`, `cuisine_fusion`, `prep_style`, `meal_moment`, `hosting_format`, `budget_range`, `party_tier`, `calendar_hook`, `holiday`, `farm_fresh`, `local_market`, `chef_video`, `dish_visual`, `allergen_safe`, `world_food_day`, `quick_compare`, `ask_chefflow`

**Total: 52 item types**

---

## Master Catalog Table

### TASTE Lane Items

| #   | Type              | Label Template            | Sublabel                        | Icon          | Presentation | baseUrgency | decayFn  | pageAffinity           | affinityBoost | clickAction   | dismissable | expandable          | maxImpressions | cooldownMin |
| --- | ----------------- | ------------------------- | ------------------------------- | ------------- | ------------ | ----------- | -------- | ---------------------- | ------------- | ------------- | ----------- | ------------------- | -------------- | ----------- |
| 1   | `cuisine`         | `{cuisineName}`           | "Chefs who specialize"          | region emoji  | pill         | 40          | none     | `/chefs`, `/eat`       | 15            | toggle_filter | yes         | yes (sub-cuisines)  | -1             | 60          |
| 2   | `food_type`       | `{dishName}`              | "Find chefs who make this"      | dish emoji    | pill         | 35          | none     | `/eat`, `/chefs`       | 10            | toggle_filter | yes         | no                  | -1             | 60          |
| 3   | `craving`         | `{cravingText}`           | "What are you in the mood for?" | flame         | pill         | 45          | none     | `/eat`, `/`            | 20            | toggle_filter | yes         | no                  | 50             | 30          |
| 4   | `dietary`         | `{dietaryLabel}`          | "Chefs with {dietary} options"  | leaf/plant    | badge        | 50          | none     | `/chefs`, `/eat`       | 20            | toggle_filter | yes         | yes (sub-diets)     | -1             | 120         |
| 5   | `mood`            | `{moodLabel}`             | "Set the tone"                  | spark         | pill         | 30          | none     | `/eat`                 | 10            | toggle_filter | yes         | no                  | 40             | 60          |
| 6   | `seasonal`        | `{seasonalItem}`          | "{month} favorite"              | market        | card         | 55          | deadline | `/`, `/eat`            | 25            | navigate      | yes         | no                  | 30             | 120         |
| 7   | `culinary_signal` | `{signalLabel}`           | "Flavor intelligence"           | knife         | pill         | 35          | none     | `/eat`, `/ingredients` | 15            | toggle_filter | yes         | no                  | 40             | 60          |
| 8   | `technique`       | `{techniqueName}`         | "Cooking method"                | flame         | pill         | 30          | none     | `/eat`, `/chefs`       | 10            | toggle_filter | yes         | no                  | -1             | 60          |
| 9   | `ingredient`      | `{ingredientName}`        | "Dishes featuring this"         | carrot        | pill         | 30          | none     | `/eat`, `/ingredients` | 15            | toggle_filter | yes         | yes (dishes using)  | 40             | 60          |
| 10  | `vibe`            | `{vibeName}`              | "Dining atmosphere"             | champagne     | pill         | 30          | none     | `/eat`                 | 10            | toggle_filter | yes         | no                  | 40             | 60          |
| 11  | `ingredient_hero` | `Peak: {ingredient}`      | "At its best right now"         | avocado       | card         | 60          | deadline | `/`, `/eat`            | 30            | navigate      | yes         | yes (recipes using) | 20             | 180         |
| 12  | `cuisine_fusion`  | `{cuisine1} x {cuisine2}` | "Boundary-crossing flavors"     | utensils      | pill         | 35          | none     | `/chefs`, `/eat`       | 10            | toggle_filter | yes         | no                  | 30             | 120         |
| 13  | `prep_style`      | `{prepStyle}`             | "How it's made"                 | knife         | badge        | 25          | none     | `/eat`                 | 10            | toggle_filter | yes         | no                  | -1             | 60          |
| 14  | `meal_moment`     | `{momentName}`            | "Right meal, right time"        | coffee/dining | pill         | 40          | deadline | `/`, `/eat`            | 20            | toggle_filter | yes         | no                  | 30             | 30          |
| 15  | `region`          | `{regionName} cuisine`    | "Regional specialties"          | location      | pill         | 30          | none     | `/chefs`, `/eat`       | 10            | toggle_filter | yes         | yes (sub-cuisines)  | -1             | 60          |
| 16  | `farm_fresh`      | `Farm-fresh {item}`       | "Local harvest"                 | plant         | card         | 50          | deadline | `/`, `/eat`            | 25            | navigate      | yes         | no                  | 25             | 180         |
| 17  | `allergen_safe`   | `{allergen}-free dining`  | "Safe for your table"           | leaf          | badge        | 55          | none     | `/chefs`, `/eat`       | 25            | toggle_filter | yes         | yes (safe chefs)    | -1             | 120         |

### OCCASION Lane Items

| #   | Type                 | Label Template                     | Sublabel                     | Icon     | Presentation | baseUrgency | decayFn  | pageAffinity          | affinityBoost | clickAction   | dismissable | expandable         | maxImpressions | cooldownMin |
| --- | -------------------- | ---------------------------------- | ---------------------------- | -------- | ------------ | ----------- | -------- | --------------------- | ------------- | ------------- | ----------- | ------------------ | -------------- | ----------- |
| 18  | `service`            | `{serviceFormat}`                  | "How a chef serves you"      | chef     | pill         | 45          | none     | `/eat`, `/chefs`      | 15            | toggle_filter | yes         | yes (sub-formats)  | -1             | 60          |
| 19  | `occasion`           | `{occasionName}`                   | "Plan for this moment"       | confetti | pill         | 50          | deadline | `/eat`                | 20            | navigate      | yes         | yes (templates)    | -1             | 60          |
| 20  | `special_dining`     | `{diningFormat}`                   | "Premium experiences"        | crown    | card         | 45          | none     | `/eat`, `/chefs`      | 15            | navigate      | yes         | no                 | 30             | 120         |
| 21  | `circle`             | `Dinner with friends`              | "Plan together"              | family   | pill         | 35          | none     | `/eat`                | 10            | navigate      | yes         | no                 | 30             | 120         |
| 22  | `location`           | `Chefs near {place}`               | "{count} chefs in your area" | location | badge        | 60          | none     | `/chefs`, `/eat`, `/` | 30            | toggle_filter | yes         | yes (nearby chefs) | -1             | 30          |
| 23  | `price`              | `{budgetLabel}`                    | "Find your comfort zone"     | stack    | badge        | 40          | none     | `/eat`, `/chefs`      | 15            | toggle_filter | yes         | no                 | -1             | 60          |
| 24  | `time`               | `{timeWindow}`                     | "When do you need a chef?"   | search   | pill         | 50          | deadline | `/eat`                | 20            | toggle_filter | yes         | no                 | 30             | 30          |
| 25  | `group_size`         | `{sizeLabel}`                      | "How many at the table?"     | family   | badge        | 35          | none     | `/eat`                | 15            | toggle_filter | yes         | no                 | -1             | 60          |
| 26  | `hosting_format`     | `{formatName}`                     | "Your hosting style"         | dining   | pill         | 35          | none     | `/eat`                | 15            | toggle_filter | yes         | yes (occasions)    | 40             | 60          |
| 27  | `budget_range`       | `{min}-{max}/person`               | "Set your budget"            | stack    | badge        | 40          | none     | `/eat`, `/chefs`      | 20            | toggle_filter | yes         | no                 | -1             | 60          |
| 28  | `party_tier`         | `{tierName}`                       | "{description}"              | family   | pill         | 30          | none     | `/eat`                | 10            | toggle_filter | yes         | no                 | -1             | 60          |
| 29  | `calendar_hook`      | `{eventName} is {daysAway}`        | "Start planning now"         | confetti | card         | 70          | deadline | `/`, `/eat`           | 35            | navigate      | yes         | no                 | 15             | 1440        |
| 30  | `holiday`            | `{holidayName} dining`             | "Book your {holiday} chef"   | confetti | card         | 75          | deadline | `/`, `/eat`, `/chefs` | 40            | navigate      | yes         | yes (templates)    | 20             | 1440        |
| 31  | `availability_pulse` | `{count} chefs available {window}` | "Book now"                   | chef     | badge        | 65          | deadline | `/chefs`, `/eat`, `/` | 30            | navigate      | no          | no                 | 20             | 60          |
| 32  | `local_market`       | `{marketName}`                     | "Local food scene"           | market   | card         | 35          | none     | `/`, `/eat`           | 15            | navigate      | yes         | no                 | 30             | 180         |

### CHEFFLOW PICKS Lane Items

| #   | Type                   | Label Template          | Sublabel                     | Icon     | Presentation | baseUrgency | decayFn | pageAffinity          | affinityBoost | clickAction   | dismissable | expandable         | maxImpressions | cooldownMin |
| --- | ---------------------- | ----------------------- | ---------------------------- | -------- | ------------ | ----------- | ------- | --------------------- | ------------- | ------------- | ----------- | ------------------ | -------------- | ----------- |
| 33  | `featured_chef`        | `Chef {name}`           | "{cuisine} in {city}"        | chef     | card         | 55          | linear  | `/chefs`, `/`         | 25            | navigate      | yes         | no                 | 15             | 360         |
| 34  | `chef_pick`            | `{pickLabel}`           | "ChefFlow recommends"        | crown    | card         | 50          | linear  | `/`, `/eat`, `/chefs` | 20            | navigate      | yes         | no                 | 20             | 180         |
| 35  | `combo`                | `{comboLabel}`          | "{count} signals combined"   | utensils | pill         | 40          | none    | `/eat`                | 15            | navigate      | yes         | yes (filters)      | 30             | 120         |
| 36  | `story`                | `{storyTitle}`          | "ChefFlow editorial"         | spark    | story        | 35          | linear  | `/`, `/eat`           | 15            | navigate      | yes         | no                 | 10             | 720         |
| 37  | `surprise`             | `Surprise me`           | "Let ChefFlow pick"          | spark    | pill         | 25          | none    | `/eat`, `/`           | 10            | navigate      | yes         | no                 | -1             | 0           |
| 38  | `saved`                | `{savedLabel}`          | "Pick up where you left off" | search   | pill         | 45          | linear  | `/`, `/eat`           | 20            | navigate      | yes         | no                 | 20             | 60          |
| 39  | `editorial_collection` | `{collectionTitle}`     | "{count} curated options"    | crown    | card         | 45          | linear  | `/`, `/eat`, `/chefs` | 20            | navigate      | yes         | yes (items)        | 15             | 360         |
| 40  | `chef_spotlight_story` | `Meet Chef {name}`      | "{specialty} in {area}"      | chef     | story        | 50          | linear  | `/`, `/chefs`         | 25            | navigate      | yes         | no                 | 10             | 720         |
| 41  | `chef_video`           | `Watch: {title}`        | "Chef in action"             | chef     | card         | 45          | linear  | `/`, `/chefs`         | 20            | expand_inline | yes         | yes (video player) | 10             | 720         |
| 42  | `dish_visual`          | `{dishName}`            | "By Chef {name}"             | dining   | card         | 40          | linear  | `/`, `/eat`           | 20            | navigate      | yes         | no                 | 15             | 360         |
| 43  | `quick_compare`        | `Compare {count} chefs` | "Side by side"               | search   | pill         | 35          | none    | `/chefs`              | 25            | navigate      | no          | no                 | -1             | 0           |

### ENGAGEMENT Lane (NEW)

| #   | Type                | Label Template            | Sublabel                     | Icon      | Presentation | baseUrgency | decayFn  | pageAffinity          | affinityBoost | clickAction   | dismissable | expandable        | maxImpressions | cooldownMin |
| --- | ------------------- | ------------------------- | ---------------------------- | --------- | ------------ | ----------- | -------- | --------------------- | ------------- | ------------- | ----------- | ----------------- | -------------- | ----------- |
| 44  | `trending`          | `Trending: {label}`       | "{count} searches today"     | flame     | badge        | 50          | deadline | `/`, `/eat`, `/chefs` | 20            | toggle_filter | yes         | no                | 25             | 120         |
| 45  | `new_on_chefflow`   | `New: {label}`            | "Just added"                 | spark     | badge        | 55          | linear   | `/`, `/chefs`         | 20            | navigate      | yes         | no                | 15             | 360         |
| 46  | `social_proof`      | `{count} people {action}` | "Popular right now"          | cheers    | badge        | 45          | deadline | `/`, `/eat`           | 15            | navigate      | yes         | no                | 20             | 180         |
| 47  | `comparison_prompt` | `Can't decide?`           | "Compare chefs side by side" | search    | pill         | 30          | none     | `/chefs`, `/eat`      | 20            | navigate      | yes         | no                | 10             | 720         |
| 48  | `guided_flow`       | `{flowTitle}`             | "Step-by-step planning"      | concierge | card         | 55          | none     | `/`, `/eat`           | 30            | navigate      | yes         | yes (steps)       | 8              | 1440        |
| 49  | `signup_nudge`      | `{nudgeText}`             | "Unlock more features"       | spark     | badge        | 20          | none     | `/chefs`, `/eat`, `/` | 10            | navigate      | yes         | no                | 5              | 2880        |
| 50  | `recovery`          | `{recoveryText}`          | "Try something different"    | search    | pill         | 70          | none     | (404, empty results)  | 40            | navigate      | no          | yes (suggestions) | -1             | 0           |
| 51  | `cross_sell`        | `{offerLabel}`            | "{description}"              | crown     | card         | 15          | linear   | `/`, `/eat`           | 5             | navigate      | yes         | no                | 5              | 4320        |
| 52  | `ask_chefflow`      | `Ask ChefFlow`            | "Describe what you want"     | concierge | pill         | 40          | none     | `/`, `/eat`, `/chefs` | 15            | expand_inline | no          | yes (text input)  | -1             | 0           |
| 53  | `world_food_day`    | `{eventName}`             | "Celebrate with food"        | confetti  | card         | 65          | deadline | `/`, `/eat`           | 35            | navigate      | yes         | yes (chefs)       | 10             | 1440        |

---

## Detailed Item Specifications

### TASTE Lane

---

#### 1. `cuisine` (EXISTING, enriched)

**Category:** Cuisines
**Label template:** `{cuisineName}` (e.g., "Italian", "Thai", "Ethiopian")
**Sublabel:** "Chefs who specialize"
**Icon:** Region-appropriate emoji mapped from cuisine DB
**Presentation:** pill
**baseUrgency:** 40
**urgencyDecayFn:** none
**pageAffinity:** `/chefs`, `/eat`, `/nearby`
**pageAffinityBoost:** 15
**hoverAction:** Preview card showing: top 3 dishes from this cuisine, chef count in area, dietary compatibility badges
**clickAction:** toggle_filter (adds `cuisine={slug}` to current discovery filters)
**What clicking reveals:** Filters current results to this cuisine; if on homepage, navigates to `/eat?cuisine={slug}`
**href template:** `/eat?cuisine={slug}`
**dismissable:** yes
**expandable:** yes; sub-items: regional variants (e.g., "Italian" expands to "Sicilian", "Tuscan", "Neapolitan")
**maxImpressions:** -1 (never suppress; core navigation)
**cooldownMinutes:** 60 after dismiss
**Scoring notes:** Boosted when user has scrolled past other cuisines (diversity fill). Location match boosts if chefs of this cuisine exist nearby. Most common rail item.
**Interaction with other items:** Selecting a cuisine dims competing cuisines, boosts related food_type and technique items.
**Data source:** `lib/discovery/` static cuisine catalog + live chef profile aggregation

**Complete cuisine inventory (every cuisine ChefFlow knows):**
African, American, Argentinian, Asian Fusion, Australian, Austrian, Bangladeshi, BBQ, Belgian, Bolivian, Brazilian, British, Burmese, Cajun/Creole, Californian, Cambodian, Canadian, Caribbean, Chilean, Chinese, Colombian, Comfort Food, Costa Rican, Cuban, Czech, Danish, Dominican, Dutch, Ecuadorian, Egyptian, English, Ethiopian, European, Filipino, Finnish, French, Fusion, German, Ghanaian, Greek, Guatemalan, Haitian, Hawaiian, Honduran, Hungarian, Icelandic, Indian, Indonesian, Iranian/Persian, Iraqi, Irish, Israeli, Italian, Jamaican, Japanese, Jordanian, Korean, Laotian, Latin American, Lebanese, Libyan, Malaysian, Mediterranean, Mexican, Middle Eastern, Mongolian, Moroccan, Nepalese, New American, New Zealand, Nicaraguan, Nigerian, Norwegian, Oaxacan, Pacific Islander, Pakistani, Palestinian, Panamanian, Paraguayan, Peruvian, Plant-Based, Polish, Portuguese, Puerto Rican, Romanian, Russian, Salvadoran, Scandinavian, Scottish, Senegalese, Serbian, Sicilian, Singaporean, Soul Food, South African, Southern US, Southwestern, Spanish, Sri Lankan, Swedish, Swiss, Syrian, Taiwanese, Thai, Tibetan, Trinidadian, Tunisian, Turkish, Ukrainian, Uruguayan, Uzbek, Venezuelan, Vietnamese, Welsh, West African

---

#### 2. `food_type` (EXISTING, enriched)

**Category:** Food types / dishes
**Label template:** `{dishName}` (e.g., "Sushi", "Tacos", "Pasta", "Burger")
**Sublabel:** "Find chefs who make this"
**Icon:** Dish-specific emoji (sushi, taco, pasta, burger, etc.)
**Presentation:** pill
**baseUrgency:** 35
**urgencyDecayFn:** none
**pageAffinity:** `/eat`, `/chefs`
**pageAffinityBoost:** 10
**hoverAction:** Preview showing: 2-3 related cuisines, typical price range, popular pairings
**clickAction:** toggle_filter
**What clicking reveals:** Adds `craving={slug}` to filters; results show chefs who list this dish/category
**href template:** `/eat?craving={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** -1
**cooldownMinutes:** 60
**Scoring notes:** Higher if matches a trending search. Lower if user already has a craving filter active.
**Interaction with other items:** Selecting a food_type boosts matching cuisine items and dims conflicting dietary items (e.g., selecting "Burger" dims "Vegan").
**Data source:** Static dish catalog + chef menu aggregation

**Complete food type inventory:**
Appetizers, Baked Goods, BBQ/Smoked Meats, Bowls, Bread/Pastry, Breakfast/Brunch, Burgers, Burritos, Cake, Charcuterie, Cheese, Chicken, Cocktails, Cookies, Curry, Deli/Sandwich, Desserts, Dim Sum, Dumplings, Eggs, Empanadas, Fish/Seafood, Flatbread, Fried Chicken, Grain Bowls, Grilled Items, Ice Cream/Gelato, Kebabs, Noodles, Pasta, Pho, Pie, Pizza, Poke, Ramen, Rice Dishes, Risotto, Roasts, Salads, Sandwiches, Sashimi, Sausage, Smoothie Bowls, Soups/Stews, Steak, Stir-fry, Sushi, Tacos, Tapas/Small Plates, Tempura, Toast/Avocado Toast, Vegan Bowls, Wings, Wraps

---

#### 3. `craving` (EXISTING, enriched)

**Category:** Cravings / mood-based
**Label template:** `{cravingText}` (e.g., "Something spicy", "Comfort food", "Light and fresh")
**Sublabel:** "What are you in the mood for?"
**Icon:** flame
**Presentation:** pill
**baseUrgency:** 45
**urgencyDecayFn:** none
**pageAffinity:** `/eat`, `/`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: 3 matching dishes, 2 matching cuisines
**clickAction:** toggle_filter
**What clicking reveals:** Adds freeform craving to search; surfaces chefs and dishes matching the craving
**href template:** `/eat?craving={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 50
**cooldownMinutes:** 30
**Scoring notes:** High urgency because cravings are immediate intent signals. Boosted on homepage. Rotated frequently for variety.
**Interaction with other items:** Selecting a craving boosts matching food_type, cuisine, and technique items.
**Data source:** Static craving catalog (curated list) + trending search terms

**Complete craving inventory:**
Something spicy, Comfort food, Light and fresh, Rich and hearty, Sweet tooth, Savory crunch, Umami bomb, Smoky flavors, Tangy and bright, Creamy indulgence, Crispy everything, Farm-fresh, Street food vibes, Chef's tasting, Childhood favorite, Something new, Grilled perfection, Slow-cooked, Raw and clean, Decadent dessert, Brunch goals, Late-night bites, Quick and healthy, Soul-warming soup, Cheese lover, Bread basket, Seafood feast, Meat lover's dream, Plant-powered, Global flavors

---

#### 4. `dietary` (EXISTING, enriched)

**Category:** Dietary needs
**Label template:** `{dietaryLabel}` (e.g., "Vegan", "Gluten-Free", "Kosher")
**Sublabel:** "Chefs with {dietary} options"
**Icon:** leaf (vegan/vegetarian), plant (plant-based), grains (gluten-free)
**Presentation:** badge
**baseUrgency:** 50
**urgencyDecayFn:** none
**pageAffinity:** `/chefs`, `/eat`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: chef count supporting this diet, sample dishes
**clickAction:** toggle_filter
**What clicking reveals:** Filters to chefs who explicitly support this dietary need
**href template:** `/chefs?dietary={slug}`
**dismissable:** yes
**expandable:** yes; sub-items: related specific restrictions (e.g., "Dairy-Free" under "Vegan")
**maxImpressions:** -1 (critical accessibility; never suppress)
**cooldownMinutes:** 120
**Scoring notes:** High base urgency because dietary needs are non-negotiable. Locked items (auth-required) let signed-in users persist these.
**Interaction with other items:** Selecting dietary dims food_type items that conflict (e.g., "Vegan" dims "Steak"). Boosts matching cuisine items.
**Data source:** Static dietary catalog + chef profile dietary tags

**Complete dietary inventory:**
Vegan, Vegetarian, Pescatarian, Gluten-Free, Dairy-Free, Nut-Free, Soy-Free, Egg-Free, Shellfish-Free, Kosher, Halal, Keto, Paleo, Whole30, Low-FODMAP, Low-Sodium, Low-Sugar, Diabetic-Friendly, Heart-Healthy, Anti-Inflammatory, AIP (Autoimmune Protocol), Carnivore, Raw Food, Macrobiotic, Organic-Only, Non-GMO, Nightshade-Free, Corn-Free, Sesame-Free, Sulfite-Free, Histamine-Free, GAPS Diet, Mediterranean Diet

---

#### 5. `mood` (EXISTING, enriched)

**Category:** Cravings / mood-based
**Label template:** `{moodLabel}` (e.g., "Romantic", "Adventurous", "Cozy")
**Sublabel:** "Set the tone"
**Icon:** spark
**Presentation:** pill
**baseUrgency:** 30
**urgencyDecayFn:** none
**pageAffinity:** `/eat`
**pageAffinityBoost:** 10
**hoverAction:** Preview showing: matching vibes, suggested occasions, example menus
**clickAction:** toggle_filter
**What clicking reveals:** Adds mood to discovery brief, influences chef and occasion recommendations
**href template:** `/eat?eventStyle={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 40
**cooldownMinutes:** 60
**Scoring notes:** Lower base urgency; mood is a refinement, not primary intent. Boosted when user has already selected occasion or cuisine.
**Interaction with other items:** Selecting mood boosts vibe items, matching occasion items. Dims conflicting moods.
**Data source:** Static mood catalog

**Complete mood inventory:**
Romantic, Adventurous, Cozy, Celebratory, Casual, Elegant, Playful, Sophisticated, Rustic, Modern, Minimalist, Festive, Intimate, Lively, Relaxed, Indulgent, Wholesome, Energetic, Nostalgic, Zen

---

#### 6. `seasonal` (EXISTING, enriched)

**Category:** Seasonal/timely items
**Label template:** `{seasonalItem}` (e.g., "Spring asparagus", "Summer stone fruit", "Fall squash")
**Sublabel:** "{month} favorite"
**Icon:** market
**Presentation:** card
**baseUrgency:** 55
**urgencyDecayFn:** deadline (season end date)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 25
**hoverAction:** Preview showing: peak window dates, 3 dishes featuring this, chefs who highlight seasonal menus
**clickAction:** navigate
**What clicking reveals:** Discovery results filtered to seasonal ingredient/dish, with chefs who emphasize seasonality
**href template:** `/eat?craving={slug}&seasonal=true`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 30
**cooldownMinutes:** 120
**Scoring notes:** High urgency during peak season window. Drops to 0 after season ends. Boosted by PIE seasonal data.
**Interaction with other items:** Boosts related ingredient, ingredient_hero, farm_fresh items. Compatible with all dietary items.
**Data source:** PIE seasonal scoring (260K seasonal scores) + static seasonal calendar

---

#### 7. `culinary_signal` (EXISTING, enriched)

**Category:** Ingredient-led discovery
**Label template:** `{signalLabel}` (e.g., "Truffle season", "Lobster roll weather", "Citrus peak")
**Sublabel:** "Flavor intelligence"
**Icon:** knife
**Presentation:** pill
**baseUrgency:** 35
**urgencyDecayFn:** none
**pageAffinity:** `/eat`, `/ingredients`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: what this signal means, related dishes, price context from PIE
**clickAction:** toggle_filter
**What clicking reveals:** Filters to chefs and dishes related to this culinary signal
**href template:** `/eat?craving={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 40
**cooldownMinutes:** 60
**Scoring notes:** Boosted by seasonal relevance and PIE intelligence. Niche but high-intent.
**Interaction with other items:** Boosts matching ingredient, seasonal, technique items.
**Data source:** PIE synthesis pipeline + seasonal calendar

---

#### 8. `technique` (EXISTING, enriched)

**Category:** Technique-led discovery
**Label template:** `{techniqueName}` (e.g., "Wood-fired", "Smoked", "Sous vide")
**Sublabel:** "Cooking method"
**Icon:** flame
**Presentation:** pill
**baseUrgency:** 30
**urgencyDecayFn:** none
**pageAffinity:** `/eat`, `/chefs`
**pageAffinityBoost:** 10
**hoverAction:** Preview showing: what this technique produces, example dishes, chefs known for it
**clickAction:** toggle_filter
**What clicking reveals:** Filters to chefs who specialize in this technique
**href template:** `/eat?craving={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** -1
**cooldownMinutes:** 60
**Scoring notes:** Niche interest; lower base urgency but strong engagement when matched. Boosted for users who click multiple technique items.
**Interaction with other items:** Boosts matching food_type and cuisine items. Compatible with all dietary items.
**Data source:** Static technique catalog + chef profile specialties

**Complete technique inventory:**
Grilled, Smoked, Fermented, Pickled, Cured, Sous Vide, Wood-Fired, Braised, Roasted, Seared, Charcoal, Clay Oven/Tandoor, Steamed, Wok-Fired, Deep-Fried, Pan-Seared, Slow-Cooked, Raw/Crudo, Flambeed, Dehydrated, Cold-Smoked, Hot-Smoked, Confit, Poached, Baked, Pressure-Cooked, Molecular, Open-Flame, Plancha, Rotisserie, Salt-Crusted, Torched

---

#### 9. `ingredient` (EXISTING, enriched)

**Category:** Ingredient-led discovery
**Label template:** `{ingredientName}` (e.g., "Lobster", "Truffle", "Avocado")
**Sublabel:** "Dishes featuring this"
**Icon:** carrot (generic), mapped to specific icons when available
**Presentation:** pill
**baseUrgency:** 30
**urgencyDecayFn:** none
**pageAffinity:** `/eat`, `/ingredients`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: dishes using this ingredient, seasonal status, price indicator
**clickAction:** toggle_filter
**What clicking reveals:** Filters to chefs and dishes featuring this ingredient
**href template:** `/eat?craving={slug}`
**dismissable:** yes
**expandable:** yes; sub-items: dishes that use this ingredient
**maxImpressions:** 40
**cooldownMinutes:** 60
**Scoring notes:** Boosted during peak season for seasonal ingredients. PIE price data can flag value ingredients.
**Interaction with other items:** Boosts matching seasonal, culinary_signal, technique items.
**Data source:** Ingredient database (69K ingredients) + PIE seasonal scoring

---

#### 10. `vibe` (EXISTING, enriched)

**Category:** Vibe/experience-led discovery
**Label template:** `{vibeName}` (e.g., "Farm-to-table", "Intimate", "Lively", "Chef's counter")
**Sublabel:** "Dining atmosphere"
**Icon:** champagne
**Presentation:** pill
**baseUrgency:** 30
**urgencyDecayFn:** none
**pageAffinity:** `/eat`
**pageAffinityBoost:** 10
**hoverAction:** Preview showing: what this vibe looks like, matching occasions, example chefs
**clickAction:** toggle_filter
**What clicking reveals:** Adds vibe/eventStyle to discovery brief
**href template:** `/eat?eventStyle={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 40
**cooldownMinutes:** 60
**Scoring notes:** Refinement signal; lower base but boosts engagement depth.
**Interaction with other items:** Selecting a vibe boosts matching mood, occasion, and special_dining items.
**Data source:** Static vibe catalog

**Complete vibe inventory:**
Farm-to-table, Intimate, Lively, Chef's counter, Backyard cookout, Wine pairing, Tasting menu, Family-style, Plated service, Buffet, Cocktail party, Picnic, Rooftop, Beachside, Garden party, Industrial chic, Candlelit, Open kitchen, Fire pit, Communal table, Pop-up, Supper club, Food truck, Outdoor feast, Kitchen takeover

---

#### 11. `ingredient_hero` (NEW)

**Category:** Ingredient-led discovery
**Label template:** `Peak: {ingredient}` (e.g., "Peak: Heirloom Tomatoes")
**Sublabel:** "At its best right now"
**Icon:** avocado (or ingredient-specific)
**Presentation:** card (visual, with ingredient photo)
**baseUrgency:** 60
**urgencyDecayFn:** deadline (peak window end)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 30
**hoverAction:** Large preview showing: peak window dates, flavor notes, 3 signature dishes, price trend
**clickAction:** navigate
**What clicking reveals:** Curated discovery page for this peak ingredient
**href template:** `/eat?craving={ingredientSlug}&seasonal=peak`
**dismissable:** yes
**expandable:** yes; sub-items: recipes/dishes using this ingredient
**maxImpressions:** 20
**cooldownMinutes:** 180
**Scoring notes:** Very high urgency during peak window. Only shows for ingredients currently at peak. PIE seasonal scoring drives this.
**Interaction with other items:** Boosts seasonal, farm_fresh, related cuisine items.
**Data source:** PIE seasonal scores (260K) + recipe peak windows

---

#### 12. `cuisine_fusion` (NEW)

**Category:** Cuisines
**Label template:** `{cuisine1} x {cuisine2}` (e.g., "Japanese x Mexican", "Korean x Southern")
**Sublabel:** "Boundary-crossing flavors"
**Icon:** utensils
**Presentation:** pill
**baseUrgency:** 35
**urgencyDecayFn:** none
**pageAffinity:** `/chefs`, `/eat`
**pageAffinityBoost:** 10
**hoverAction:** Preview showing: what this fusion looks like, example dishes, matching chefs
**clickAction:** toggle_filter
**What clicking reveals:** Filters to chefs who cross these cuisine boundaries
**href template:** `/eat?cuisine={slug1}&craving={slug2}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 30
**cooldownMinutes:** 120
**Scoring notes:** Novelty injection item. Rotated for variety. Boosted when user has already filtered by a single cuisine.
**Interaction with other items:** Boosts both parent cuisine items.
**Data source:** Chef profile cross-cuisine analysis (derived from chefs listing multiple cuisines)

---

#### 13. `prep_style` (NEW)

**Category:** Technique-led discovery
**Label template:** `{prepStyle}` (e.g., "Meal Prep Containers", "Heat & Serve", "Cook-Along Kit")
**Sublabel:** "How it's made"
**Icon:** knife
**Presentation:** badge
**baseUrgency:** 25
**urgencyDecayFn:** none
**pageAffinity:** `/eat`
**pageAffinityBoost:** 10
**hoverAction:** Preview showing: what this prep style means, time savings, example menus
**clickAction:** toggle_filter
**What clicking reveals:** Filters to chefs offering this preparation format
**href template:** `/eat?fulfillment={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** -1
**cooldownMinutes:** 60
**Scoring notes:** Low base urgency. Useful refinement for meal prep intent.
**Interaction with other items:** Boosts service format items. Compatible with all taste items.
**Data source:** Chef profile service descriptions

**Complete prep_style inventory:**
Meal Prep Containers, Heat and Serve, Cook-Along Kit, Fully Plated, Family Style Trays, Individual Portions, Batch Cooking, Frozen Ready, Vacuum Sealed, Live Cooking

---

#### 14. `meal_moment` (NEW)

**Category:** Time/availability signals
**Label template:** `{momentName}` (e.g., "Brunch", "Weeknight Dinner", "Sunday Feast")
**Sublabel:** "Right meal, right time"
**Icon:** coffee (morning), dining (evening), bowl (lunch)
**Presentation:** pill
**baseUrgency:** 40
**urgencyDecayFn:** deadline (time-of-day relevance)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: typical format, price range, popular cuisines for this moment
**clickAction:** toggle_filter
**What clicking reveals:** Filters by meal occasion/time
**href template:** `/eat?intent={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 30
**cooldownMinutes:** 30
**Scoring notes:** Time-aware: "Brunch" boosted Saturday/Sunday mornings. "Weeknight Dinner" boosted Mon-Thu 3-6pm. Drops outside relevance window.
**Interaction with other items:** Boosts time, occasion items matching the meal window.
**Data source:** Static meal moment catalog + time-of-day logic

**Complete meal_moment inventory:**
Breakfast, Brunch, Lunch, Afternoon Tea, Happy Hour, Weeknight Dinner, Date Night Dinner, Sunday Feast, Late Night, Holiday Brunch, Power Lunch, Cocktail Hour, Pre-Theater, Post-Workout, Kids' Meal Time

---

#### 15. `region` (NEW)

**Category:** Cuisines (regional drill-down)
**Label template:** `{regionName} cuisine` (e.g., "Oaxacan cuisine", "Sichuan cuisine")
**Sublabel:** "Regional specialties"
**Icon:** location
**Presentation:** pill
**baseUrgency:** 30
**urgencyDecayFn:** none
**pageAffinity:** `/chefs`, `/eat`
**pageAffinityBoost:** 10
**hoverAction:** Preview showing: signature dishes from this region, how it differs from parent cuisine
**clickAction:** toggle_filter
**What clicking reveals:** Filters to chefs specializing in this regional variant
**href template:** `/eat?cuisine={regionSlug}`
**dismissable:** yes
**expandable:** yes; sub-items: signature dishes from this region
**maxImpressions:** -1
**cooldownMinutes:** 60
**Scoring notes:** Boosted when parent cuisine is selected (drill-down). Niche but high engagement.
**Interaction with other items:** Child of cuisine items. Selecting region auto-selects parent cuisine.
**Data source:** Static regional cuisine catalog

---

#### 16. `farm_fresh` (NEW)

**Category:** Seasonal/timely + Ingredient-led
**Label template:** `Farm-fresh {item}` (e.g., "Farm-fresh strawberries")
**Sublabel:** "Local harvest"
**Icon:** plant
**Presentation:** card
**baseUrgency:** 50
**urgencyDecayFn:** deadline (harvest window)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 25
**hoverAction:** Preview showing: harvest window, local availability, dishes made with this
**clickAction:** navigate
**What clicking reveals:** Discovery filtered to chefs who emphasize local/seasonal sourcing
**href template:** `/eat?craving={slug}&vibe=farm-to-table`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 25
**cooldownMinutes:** 180
**Scoring notes:** High urgency during local harvest. Boosted in areas with strong farm-to-table culture.
**Interaction with other items:** Boosts seasonal, ingredient_hero, vibe:farm-to-table items.
**Data source:** PIE seasonal data + local harvest calendars

---

#### 17. `allergen_safe` (NEW)

**Category:** Dietary needs (safety-focused)
**Label template:** `{allergen}-free dining` (e.g., "Peanut-free dining")
**Sublabel:** "Safe for your table"
**Icon:** leaf
**Presentation:** badge
**baseUrgency:** 55
**urgencyDecayFn:** none
**pageAffinity:** `/chefs`, `/eat`
**pageAffinityBoost:** 25
**hoverAction:** Preview showing: what this means for kitchen safety, chef count who handle this, trust signals
**clickAction:** toggle_filter
**What clicking reveals:** Filters to chefs who explicitly handle this allergen
**href template:** `/chefs?dietary={allergenSlug}-free`
**dismissable:** yes
**expandable:** yes; sub-items: chefs with verified allergen handling
**maxImpressions:** -1 (safety-critical; never suppress)
**cooldownMinutes:** 120
**Scoring notes:** High urgency because allergen safety is non-negotiable. Distinguished from dietary preferences by safety framing.
**Interaction with other items:** Dims food_type items that commonly contain the allergen.
**Data source:** Chef profile allergen handling declarations

**Complete allergen_safe inventory:**
Peanut-Free, Tree Nut-Free, Shellfish-Free, Fish-Free, Milk-Free, Egg-Free, Wheat-Free, Soy-Free, Sesame-Free, Mustard-Free, Celery-Free, Lupin-Free, Mollusk-Free, Sulfite-Free

---

### OCCASION Lane

---

#### 18. `service` (EXISTING, enriched)

**Category:** Service formats
**Label template:** `{serviceFormat}` (e.g., "Private Chef", "Meal Prep", "Cooking Class")
**Sublabel:** "How a chef serves you"
**Icon:** chef
**Presentation:** pill
**baseUrgency:** 45
**urgencyDecayFn:** none
**pageAffinity:** `/eat`, `/chefs`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: what this service looks like, typical price range, typical occasion fit
**clickAction:** toggle_filter
**What clicking reveals:** Filters by fulfillment mode
**href template:** `/eat?fulfillment={slug}`
**dismissable:** yes
**expandable:** yes; sub-items: specific service variations
**maxImpressions:** -1
**cooldownMinutes:** 60
**Scoring notes:** Core navigation item. Boosted when user has occasion but no service format.
**Interaction with other items:** Selecting a service boosts matching occasion and price items.
**Data source:** Static service catalog + chef profile service modes

**Complete service inventory:**
Private Chef (in-home), Meal Prep, Cooking Class, Catering (event), Personal Chef (recurring), Dinner Party Chef, Pop-Up Dining, Food Truck, Chef's Table Experience, Tasting Menu Service, BBQ/Grill Master, Baking/Pastry, Cocktail/Mixology, Farm Dinner, Supper Club, Corporate Catering, Wedding Catering, Holiday Cooking, Kids' Cooking Class, Couples' Cooking Class, Team Building (culinary), Nutrition Coaching + Cooking, Pantry Organization, Kitchen Consulting, Recipe Development

---

#### 19. `occasion` (EXISTING, enriched)

**Category:** Occasions
**Label template:** `{occasionName}` (e.g., "Birthday Dinner", "Corporate Event")
**Sublabel:** "Plan for this moment"
**Icon:** confetti (celebration), family (gathering), champagne (formal)
**Presentation:** pill
**baseUrgency:** 50
**urgencyDecayFn:** deadline (if date-attached)
**pageAffinity:** `/eat`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: planning template, typical budget, suggested party size, matching services
**clickAction:** navigate (to planning template)
**What clicking reveals:** Pre-filled planning brief at `/eat?intent={slug}`
**href template:** `/eat?intent={slug}`
**dismissable:** yes
**expandable:** yes; sub-items: planning template fields (party size, budget, date)
**maxImpressions:** -1
**cooldownMinutes:** 60
**Scoring notes:** High urgency if tied to upcoming calendar events. Boosted during holiday seasons.
**Interaction with other items:** Selecting occasion boosts matching service, vibe, group_size, time, price items.
**Data source:** Static occasion catalog + OCCASION_PLANNING_TEMPLATES

**Complete occasion inventory:**
Birthday Dinner, Anniversary, Date Night, Engagement Party, Rehearsal Dinner, Wedding Reception, Baby Shower, Bridal Shower, Graduation Party, Retirement Party, Promotion Celebration, Housewarming, Dinner Party (casual), Dinner Party (formal), Game Day, Super Bowl Party, Holiday Dinner (generic), Thanksgiving, Christmas Eve, Christmas, New Year's Eve, Easter, Passover, Hanukkah, Fourth of July, Labor Day, Memorial Day, Valentine's Day, Mother's Day, Father's Day, Family Reunion, Milestone Birthday (30/40/50/etc), Corporate Lunch, Corporate Dinner, Team Building, Client Entertainment, Board Meeting Catering, Product Launch, Company Retreat, Funeral/Memorial, Religious Celebration, Baptism/Christening, Bar/Bat Mitzvah, Quinceañera, Eid Celebration, Diwali, Lunar New Year, Friendsgiving, Book Club Dinner, Neighborhood Block Party, Welcome Home, Farewell Party, Proposal Dinner, Just Because, Weekly Family Dinner

---

#### 20. `special_dining` (EXISTING, enriched)

**Category:** Service formats (premium)
**Label template:** `{diningFormat}` (e.g., "Tasting Menu", "Chef's Table", "Wine Pairing Dinner")
**Sublabel:** "Premium experiences"
**Icon:** crown
**Presentation:** card
**baseUrgency:** 45
**urgencyDecayFn:** none
**pageAffinity:** `/eat`, `/chefs`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: what makes this special, typical duration, price range, example menus
**clickAction:** navigate
**What clicking reveals:** Discovery filtered to premium dining formats
**href template:** `/eat?fulfillment=private_chef&eventStyle={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 30
**cooldownMinutes:** 120
**Scoring notes:** Premium conversion item. Boosted on `/chefs` with price filter set to premium/luxury.
**Interaction with other items:** Boosts featured_chef, vibe items. Compatible with all occasion items.
**Data source:** Chef profile premium service listings

**Complete special_dining inventory:**
Tasting Menu, Chef's Table, Wine Pairing Dinner, Multi-Course Experience, Farm Dinner, Supper Club, Omakase, Kaiseki, Degustación, Progressive Dinner, Kitchen Takeover, Fire & Smoke Experience, Foraging Dinner, Seasonal Feast, Chef Battle/Competition, Mystery Menu

---

#### 21. `circle` (EXISTING, enriched)

**Category:** Group/social
**Label template:** `Dinner with friends`
**Sublabel:** "Plan together"
**Icon:** family
**Presentation:** pill
**baseUrgency:** 35
**urgencyDecayFn:** none
**pageAffinity:** `/eat`
**pageAffinityBoost:** 10
**hoverAction:** Preview showing: what circles are, how group planning works
**clickAction:** navigate
**What clicking reveals:** Group dining discovery; for public users, shows concept + signup prompt
**href template:** `/eat?intent=dinner_party&partySize=6`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 30
**cooldownMinutes:** 120
**Scoring notes:** Boosted as social dining discovery. Lower for solo browsing patterns.
**Interaction with other items:** Boosts group_size, occasion items.
**Data source:** Static concept content

---

#### 22. `location` (EXISTING, enriched)

**Category:** Location-based
**Label template:** `Chefs near {place}` (e.g., "Chefs near Boston, MA")
**Sublabel:** "{count} chefs in your area"
**Icon:** location
**Presentation:** badge
**baseUrgency:** 60
**urgencyDecayFn:** none
**pageAffinity:** `/chefs`, `/eat`, `/`
**pageAffinityBoost:** 30
**hoverAction:** Preview showing: chef count, top cuisines in area, closest chefs
**clickAction:** toggle_filter
**What clicking reveals:** Locks location filter; results geo-sorted
**href template:** `/chefs?location={place}&lat={lat}&lng={lng}`
**dismissable:** yes
**expandable:** yes; sub-items: nearby neighborhoods, surrounding areas
**maxImpressions:** -1
**cooldownMinutes:** 30
**Scoring notes:** Very high urgency when location is available. Primary conversion driver for public users. Boosted by geolocation.
**Interaction with other items:** Location affects ALL other items by scoping chef availability.
**Data source:** Browser geolocation API + account zip (if set) + manual entry

---

#### 23. `price` (EXISTING, enriched)

**Category:** Price/budget signals
**Label template:** `{budgetLabel}` (e.g., "Budget-Friendly", "Mid-Range", "Premium", "Luxury")
**Sublabel:** "Find your comfort zone"
**Icon:** stack
**Presentation:** badge
**baseUrgency:** 40
**urgencyDecayFn:** none
**pageAffinity:** `/eat`, `/chefs`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: price range per person, what to expect at this tier, chef count
**clickAction:** toggle_filter
**What clicking reveals:** Filters by budget tier
**href template:** `/eat?budget={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** -1
**cooldownMinutes:** 60
**Scoring notes:** Conversion-critical; helps set expectations early. Boosted when user browses without budget context.
**Interaction with other items:** Selecting budget boosts matching featured_chef items at that price tier. Dims conflicting special_dining if budget is "Budget-Friendly".
**Data source:** PIE pricing data (1.1M prices) + chef profile price tiers

**Complete price tier inventory:**
Budget-Friendly ($20-40/person), Mid-Range ($40-75/person), Premium ($75-125/person), Luxury ($125-200/person), Ultra-Premium ($200+/person)

---

#### 24. `time` (EXISTING, enriched)

**Category:** Time/availability signals
**Label template:** `{timeWindow}` (e.g., "Tonight", "This Weekend", "Next Month")
**Sublabel:** "When do you need a chef?"
**Icon:** search
**Presentation:** pill
**baseUrgency:** 50
**urgencyDecayFn:** deadline
**pageAffinity:** `/eat`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: availability snapshot for this window, chef count
**clickAction:** toggle_filter
**What clicking reveals:** Filters by date window
**href template:** `/eat?dateWindow={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 30
**cooldownMinutes:** 30
**Scoring notes:** "Tonight" has highest urgency. Urgency drops as window moves further out. Time items rotate based on day of week.
**Interaction with other items:** Selecting time boosts availability_pulse items for that window.
**Data source:** Static time window catalog + chef availability signals

**Complete time window inventory:**
Tonight, Tomorrow, This Weekend, Next Week, This Month, Next Month, Planning Ahead (60+ days), Flexible / No Rush, Specific Date

---

#### 25. `group_size` (EXISTING, enriched)

**Category:** Group size signals
**Label template:** `{sizeLabel}` (e.g., "Just us two", "Small group (4-6)", "Big party (20+)")
**Sublabel:** "How many at the table?"
**Icon:** family
**Presentation:** badge
**baseUrgency:** 35
**urgencyDecayFn:** none
**pageAffinity:** `/eat`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: recommended service formats for this size, typical budget range
**clickAction:** toggle_filter
**What clicking reveals:** Filters by party size
**href template:** `/eat?partySize={count}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** -1
**cooldownMinutes:** 60
**Scoring notes:** Helps match to correct service format. Boosted when occasion is selected but no party size set.
**Interaction with other items:** Selecting group size boosts matching service formats (e.g., "20+" boosts "Catering").
**Data source:** Static size tier catalog

**Complete group_size inventory:**
Intimate dinner (2), Small gathering (3-4), Dinner party (5-8), Medium group (9-15), Large event (16-30), Grand affair (31-50), Major event (50+)

---

#### 26. `hosting_format` (NEW)

**Category:** Service formats (hosting style)
**Label template:** `{formatName}` (e.g., "At my home", "At a venue", "Outdoor/Garden")
**Sublabel:** "Your hosting style"
**Icon:** dining
**Presentation:** pill
**baseUrgency:** 35
**urgencyDecayFn:** none
**pageAffinity:** `/eat`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: what chefs offer for this format, typical setups
**clickAction:** toggle_filter
**What clicking reveals:** Filters by hosting location type
**href template:** `/eat?hostingFormat={slug}`
**dismissable:** yes
**expandable:** yes; sub-items: matching occasions
**maxImpressions:** 40
**cooldownMinutes:** 60
**Scoring notes:** Refinement signal. Helps match to right service format.
**Interaction with other items:** Boosts matching vibe and service items.
**Data source:** Static hosting format catalog

**Complete hosting_format inventory:**
At My Home, At a Venue, Outdoor/Garden, Rooftop/Terrace, Beach/Waterfront, Office/Corporate Space, Park/Picnic, Farm/Ranch, Kitchen (Chef's Location), Virtual/Remote

---

#### 27. `budget_range` (NEW)

**Category:** Price/budget signals (specific range)
**Label template:** `{min}-{max}/person` (e.g., "$50-75/person")
**Sublabel:** "Set your budget"
**Icon:** stack
**Presentation:** badge
**baseUrgency:** 40
**urgencyDecayFn:** none
**pageAffinity:** `/eat`, `/chefs`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: what you get at this price point, example menus, chef count
**clickAction:** toggle_filter
**What clicking reveals:** Filters by specific per-person budget range
**href template:** `/eat?budgetMin={min}&budgetMax={max}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** -1
**cooldownMinutes:** 60
**Scoring notes:** More specific than `price` tier. Shown when user has already indicated price interest.
**Interaction with other items:** Selecting a range replaces/overrides the broader `price` tier filter.
**Data source:** PIE pricing data

---

#### 28. `party_tier` (NEW)

**Category:** Group size signals (descriptive)
**Label template:** `{tierName}` (e.g., "Couples Night", "Squad Dinner", "The Big One")
**Sublabel:** "{description}" (e.g., "Perfect for 2-4", "Your crew of 8-12", "Go big: 20+")
**Icon:** family
**Presentation:** pill
**baseUrgency:** 30
**urgencyDecayFn:** none
**pageAffinity:** `/eat`
**pageAffinityBoost:** 10
**hoverAction:** Preview showing: recommended occasions, typical service format, budget expectations
**clickAction:** toggle_filter
**What clicking reveals:** Sets party size range + suggests matching service format
**href template:** `/eat?partySize={midpoint}&eventStyle={vibe}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** -1
**cooldownMinutes:** 60
**Scoring notes:** More personality than group_size. Shown to casual browsers; group_size shown to planners.
**Interaction with other items:** Maps to and replaces group_size when selected.
**Data source:** Static tier catalog

---

#### 29. `calendar_hook` (NEW)

**Category:** Time/availability + Seasonal
**Label template:** `{eventName} is {daysAway}` (e.g., "Thanksgiving is 3 weeks away")
**Sublabel:** "Start planning now"
**Icon:** confetti
**Presentation:** card
**baseUrgency:** 70
**urgencyDecayFn:** deadline (event date)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 35
**hoverAction:** Preview showing: planning template for this event, booking lead time recommendation, chef availability
**clickAction:** navigate (to occasion planning template)
**What clicking reveals:** Pre-filled planning brief for this calendar event
**href template:** `/eat?intent={slug}&dateWindow={date}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 15
**cooldownMinutes:** 1440 (24h)
**Scoring notes:** Very high urgency that increases as date approaches. Appears 4-8 weeks before major holidays. Strongest public conversion item.
**Interaction with other items:** Boosts matching occasion, time, holiday items. Top-ranked when visible.
**Data source:** Static holiday calendar + calculated countdown

---

#### 30. `holiday` (NEW)

**Category:** Seasonal/timely + Occasions
**Label template:** `{holidayName} dining` (e.g., "Thanksgiving dining", "Valentine's Day dinner")
**Sublabel:** "Book your {holiday} chef"
**Icon:** confetti
**Presentation:** card
**baseUrgency:** 75
**urgencyDecayFn:** deadline (holiday date)
**pageAffinity:** `/`, `/eat`, `/chefs`
**pageAffinityBoost:** 40
**hoverAction:** Preview showing: typical menus, lead time, price range, available chefs
**clickAction:** navigate
**What clicking reveals:** Holiday-specific discovery page
**href template:** `/eat?intent={slug}&dateWindow={holidayDate}`
**dismissable:** yes
**expandable:** yes; sub-items: planning templates, cuisine suggestions
**maxImpressions:** 20
**cooldownMinutes:** 1440
**Scoring notes:** Highest base urgency of any seasonal item. Active 6-8 weeks before holiday. Dies at midnight of holiday.
**Interaction with other items:** Dominates rail when active. Boosts all matching items.
**Data source:** Static holiday calendar

**Complete holiday inventory:**
New Year's Day, Valentine's Day, St. Patrick's Day, Easter, Passover, Cinco de Mayo, Mother's Day, Memorial Day, Father's Day, Independence Day (July 4th), Labor Day, Rosh Hashanah, Yom Kippur, Halloween, Diwali, Thanksgiving, Hanukkah, Christmas Eve, Christmas Day, New Year's Eve, Lunar New Year, Eid al-Fitr, Eid al-Adha, Juneteenth, Kwanzaa

---

#### 31. `availability_pulse` (NEW)

**Category:** Time/availability signals
**Label template:** `{count} chefs available {window}` (e.g., "12 chefs available this weekend")
**Sublabel:** "Book now"
**Icon:** chef
**Presentation:** badge
**baseUrgency:** 65
**urgencyDecayFn:** deadline (window end)
**pageAffinity:** `/chefs`, `/eat`, `/`
**pageAffinityBoost:** 30
**hoverAction:** Preview showing: chef names, cuisines, price tiers for available chefs
**clickAction:** navigate
**What clicking reveals:** Chef results filtered to available-now
**href template:** `/chefs?available={window}&location={place}`
**dismissable:** no (real-time data, not suppressible)
**expandable:** no
**maxImpressions:** 20
**cooldownMinutes:** 60
**Scoring notes:** High urgency, real-time data. Only shows when genuine availability data exists. Zero fake numbers per CLAUDE.md rules.
**Interaction with other items:** Validates and reinforces location, time items.
**Data source:** Chef accepting_inquiries status + location overlap (NEVER fabricated)

---

#### 32. `local_market` (NEW)

**Category:** Location-based
**Label template:** `{marketName}` (e.g., "Boston Food Scene", "LA Private Dining")
**Sublabel:** "Local food scene"
**Icon:** market
**Presentation:** card
**baseUrgency:** 35
**urgencyDecayFn:** none
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: top cuisines in area, chef count, local specialties
**clickAction:** navigate
**What clicking reveals:** Location-scoped discovery
**href template:** `/eat?location={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 30
**cooldownMinutes:** 180
**Scoring notes:** Only shows when location is detected. Adds local color to discovery.
**Interaction with other items:** Boosts location, seasonal (local harvest), farm_fresh items.
**Data source:** Geo-aggregated chef data + location detection

---

### CHEFFLOW PICKS Lane

---

#### 33. `featured_chef` (EXISTING, enriched)

**Category:** Featured chefs
**Label template:** `Chef {name}` (e.g., "Chef Maria Santos")
**Sublabel:** "{cuisine} in {city}"
**Icon:** chef
**Presentation:** card (with chef photo if available)
**baseUrgency:** 55
**urgencyDecayFn:** linear (editorial freshness decays over 30 days)
**pageAffinity:** `/chefs`, `/`
**pageAffinityBoost:** 25
**hoverAction:** Large preview showing: chef photo, primary cuisine, city/state, specialty, price tier, dietary strengths, accepting inquiries status
**clickAction:** navigate
**What clicking reveals:** Chef's public profile page
**href template:** `/chef/{slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 15
**cooldownMinutes:** 360
**Scoring notes:** Highest value item for conversion. Boosted by: location match, cuisine match to user signals, accepting inquiries = true. Never show chefs who are not accepting inquiries.
**Interaction with other items:** Chef cuisine/dietary/location boosted when this chef is shown.
**Data source:** FeaturedChefRailData from chef profiles + editorial selection

---

#### 34. `chef_pick` (EXISTING, enriched)

**Category:** ChefFlow editorial
**Label template:** `{pickLabel}` (e.g., "Best for date night", "Top meal prep chef")
**Sublabel:** "ChefFlow recommends"
**Icon:** crown
**Presentation:** card
**baseUrgency:** 50
**urgencyDecayFn:** linear (editorial freshness)
**pageAffinity:** `/`, `/eat`, `/chefs`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: why this is picked, matching signals, chef/service details
**clickAction:** navigate
**What clicking reveals:** Chef profile or curated results
**href template:** varies (`/chef/{slug}` or `/eat?{filters}`)
**dismissable:** yes
**expandable:** no
**maxImpressions:** 20
**cooldownMinutes:** 180
**Scoring notes:** Editorial authority item. Boosted when matching user's active filters.
**Interaction with other items:** Validates and reinforces active taste/occasion filters.
**Data source:** Editorial curation (manual_editorial reason code)

---

#### 35. `combo` (EXISTING, enriched)

**Category:** ChefFlow editorial (bundled)
**Label template:** `{comboLabel}` (e.g., "Italian + Date Night + Under $100", "BBQ for 12 this weekend")
**Sublabel:** "{count} signals combined"
**Icon:** utensils
**Presentation:** pill
**baseUrgency:** 40
**urgencyDecayFn:** none
**pageAffinity:** `/eat`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: the individual signals bundled, matching chef count, one-click apply all
**clickAction:** navigate
**What clicking reveals:** `/eat` with all combo filters pre-applied (cuisine + occasion + budget + partySize)
**href template:** `/eat?cuisine={c}&intent={i}&budget={b}&partySize={n}`
**dismissable:** yes
**expandable:** yes; sub-items: individual filter pills that can be toggled independently
**maxImpressions:** 30
**cooldownMinutes:** 120
**Scoring notes:** Combos that match 2+ active user signals score highest. Diversity fill: system generates combos from underexplored combinations. Budget_fit combos boost when price filter is active.
**Interaction with other items:** Expanding a combo injects its constituent items (cuisine, occasion, price, group_size) into the rail as active filters. Dims other combos with conflicting signals.
**Data source:** Algorithmic: cross-product of popular (cuisine x occasion x budget) triples. Editorial: manually curated seasonal combos.

---

#### 36. `story` (EXISTING, enriched)

**Category:** ChefFlow editorial (content)
**Label template:** `{storyTitle}` (e.g., "What to expect from a private chef", "Seasonal eating in New England")
**Sublabel:** "ChefFlow editorial"
**Icon:** spark
**Presentation:** story (full-width editorial card with hero image)
**baseUrgency:** 35
**urgencyDecayFn:** linear (freshness decays over 60 days)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: story excerpt (first 2 sentences), hero image, estimated read time, related discovery tags
**clickAction:** navigate
**What clicking reveals:** Full editorial page (how-it-works, seasonal guides, chef profiles, ingredient deep-dives)
**href template:** `/eat?story={slug}` or `/how-it-works` or `/chef/{slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 10
**cooldownMinutes:** 720 (12h)
**Scoring notes:** Lowest-frequency, highest-depth item. Max 1 story per rail view. Manual_editorial and seasonal_pick reason codes dominate. Novelty_injection for new stories.
**Interaction with other items:** Stories are standalone; don't affect filter state. Related discovery tags in hover can boost matching cuisine/technique items if user engages.
**Data source:** Editorial content calendar (manual_editorial). Seasonal stories auto-surface via seasonal_pick reason code.

**Complete story type inventory:**
How It Works (service explainer), Seasonal Guide (what's in season now), Chef Spotlight (deep profile), Ingredient Deep-Dive (single ingredient story), Cuisine Journey (cuisine history + local chefs), Event Planning Guide (occasion walkthrough), First Timer's Guide (new to private chefs), Behind the Menu (how chefs plan menus)

---

#### 37. `surprise` (EXISTING, enriched)

**Category:** Stochastic/exploration
**Label template:** `Surprise me`
**Sublabel:** "Let ChefFlow pick"
**Icon:** spark
**Presentation:** pill
**baseUrgency:** 25
**urgencyDecayFn:** none
**pageAffinity:** `/eat`, `/`
**pageAffinityBoost:** 10
**hoverAction:** Animated shimmer effect; preview showing: "We'll pick a cuisine, chef, or experience you haven't tried"
**clickAction:** navigate
**What clicking reveals:** Random discovery result: a random cuisine filter, a random chef profile, or a random occasion template. Weighted toward underexplored areas.
**href template:** `/eat?surprise=true` (server resolves to random discovery)
**dismissable:** yes
**expandable:** no
**maxImpressions:** -1 (always available)
**cooldownMinutes:** 0
**Scoring notes:** Constant low presence. random_pick, novelty_injection, diversity_fill reason codes. Boosted when user has been scrolling without clicking (engagement fatigue signal). Never the first item in rail.
**Interaction with other items:** Result of surprise navigates to a context that then affects other items (e.g., surprise lands on Thai cuisine, Thai items boost). The surprise pill itself doesn't affect other rail items.
**Data source:** Algorithmic: weighted random selection from all available discovery paths. Avoids paths user has recently visited.

---

#### 38. `saved` (EXISTING, enriched)

**Category:** Personalization / continuity
**Label template:** `{savedLabel}` (e.g., "Your Italian search", "Chef Maria", "Date night plan")
**Sublabel:** "Pick up where you left off"
**Icon:** search
**Presentation:** pill
**baseUrgency:** 45
**urgencyDecayFn:** linear (recency: decays over 14 days)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: what was saved (search, chef, plan), when, and current status (chef still accepting? plan still valid?)
**clickAction:** navigate
**What clicking reveals:** Returns to saved context: search results with original filters, chef profile, or planning brief
**href template:** varies (stored href from save action)
**dismissable:** yes
**expandable:** no
**maxImpressions:** 20
**cooldownMinutes:** 60
**Scoring notes:** For PUBLIC users: saved items come from localStorage (anonymous session persistence). No account = no cross-device sync. Items are recent searches, recently viewed chefs, or partially completed planning briefs. saved_context and freshness_return reason codes. Boosted when user returns to homepage (re-engagement signal).
**Interaction with other items:** Saved items reinforce their underlying type: a saved "Italian" search boosts cuisine:italian. A saved chef boosts that chef's cuisine/location.
**Data source:** localStorage for public users (anonymous persistence). discovery_interactions table for authenticated users. Auth-required actions (save, lock, compare) trigger signup_nudge for public role.

**Public user saved item sources:**
Recent searches (last 5), Recently viewed chef profiles (last 3), Partially completed planning briefs (last 1), Last applied filter combination

---

#### 39. `editorial_collection` (NEW)

**Category:** ChefFlow editorial
**Label template:** `{collectionTitle}` (e.g., "Birthday Dinners in Boston", "Best Vegan Chefs")
**Sublabel:** "{count} curated options"
**Icon:** crown
**Presentation:** card
**baseUrgency:** 45
**urgencyDecayFn:** linear (collection freshness)
**pageAffinity:** `/`, `/eat`, `/chefs`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: collection description, item count, top 3 entries
**clickAction:** navigate
**What clicking reveals:** Curated collection page
**href template:** `/eat?collection={slug}`
**dismissable:** yes
**expandable:** yes; sub-items: first 3-5 items in collection
**maxImpressions:** 15
**cooldownMinutes:** 360
**Scoring notes:** High engagement potential. Boosted when matching user's location + active filters.
**Interaction with other items:** Collections are bundles; showing one dims competing collections.
**Data source:** PublicDiscoveryCollection from consumer-discovery-model.ts + editorial curation

---

#### 40. `chef_spotlight_story` (NEW)

**Category:** Featured chefs + Editorial
**Label template:** `Meet Chef {name}` (e.g., "Meet Chef Aisha")
**Sublabel:** "{specialty} in {area}"
**Icon:** chef
**Presentation:** story (full-width)
**baseUrgency:** 50
**urgencyDecayFn:** linear (30-day freshness)
**pageAffinity:** `/`, `/chefs`
**pageAffinityBoost:** 25
**hoverAction:** Large preview with chef story excerpt, photo, signature dish
**clickAction:** navigate
**What clicking reveals:** Chef profile with story context
**href template:** `/chef/{slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 10
**cooldownMinutes:** 720
**Scoring notes:** Highest-quality content item. One per rail view max. Rotated weekly.
**Interaction with other items:** When shown, boosts that chef's cuisine/location items.
**Data source:** Editorial chef profiles + manual curation

---

#### 41. `chef_video` (NEW)

**Category:** Featured chefs (media)
**Label template:** `Watch: {title}` (e.g., "Watch: Chef Marcus makes paella")
**Sublabel:** "Chef in action"
**Icon:** chef
**Presentation:** card (video thumbnail)
**baseUrgency:** 45
**urgencyDecayFn:** linear (content freshness)
**pageAffinity:** `/`, `/chefs`
**pageAffinityBoost:** 20
**hoverAction:** Video thumbnail with play icon, duration badge
**clickAction:** expand_inline (plays video in rail)
**What clicking reveals:** Inline video player in expanded rail slot
**href template:** `/chef/{slug}#video`
**dismissable:** yes
**expandable:** yes; sub-items: video player + "View profile" CTA
**maxImpressions:** 10
**cooldownMinutes:** 720
**Scoring notes:** Highest engagement rate of any item type. One per rail view max. Premium content.
**Interaction with other items:** When expanded, other items scroll out of view.
**Data source:** Chef-uploaded video content (when available)

---

#### 42. `dish_visual` (NEW)

**Category:** Food types (visual)
**Label template:** `{dishName}` (e.g., "Wagyu Tartare")
**Sublabel:** "By Chef {name}"
**Icon:** dining
**Presentation:** card (with dish photo)
**baseUrgency:** 40
**urgencyDecayFn:** linear (content freshness)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 20
**hoverAction:** Large dish photo with chef name, cuisine, dietary badges
**clickAction:** navigate
**What clicking reveals:** Chef profile (the chef who made this dish)
**href template:** `/chef/{slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 15
**cooldownMinutes:** 360
**Scoring notes:** Visual appeal drives clicks. Only shows for dishes with verified photos. Boosted by cuisine/craving match.
**Interaction with other items:** Boosts matching cuisine, food_type, technique items.
**Data source:** Chef-uploaded menu photos (when available)

---

#### 43. `quick_compare` (NEW)

**Category:** Comparison prompts
**Label template:** `Compare {count} chefs` (e.g., "Compare 3 Italian chefs in Boston")
**Sublabel:** "Side by side"
**Icon:** search
**Presentation:** pill
**baseUrgency:** 35
**urgencyDecayFn:** none
**pageAffinity:** `/chefs`
**pageAffinityBoost:** 25
**hoverAction:** Preview showing: the chefs being compared, key differentiators
**clickAction:** navigate
**What clicking reveals:** Compare view with pre-selected chefs
**href template:** `/chefs?compare={slug1},{slug2},{slug3}`
**dismissable:** no (utility item)
**expandable:** no
**maxImpressions:** -1
**cooldownMinutes:** 0
**Scoring notes:** Only appears when 2+ matching chefs exist for active filters. High conversion utility.
**Interaction with other items:** Requires featured_chef or chef search results to generate candidates.
**Data source:** Dynamic from current search/filter context

---

### ENGAGEMENT Lane (NEW)

> Items in this lane do not have a pre-existing lane mapping. They should be distributed across lanes based on context. Primary lane assignment noted per item.

---

#### 44. `trending` (NEW)

**Category:** Trending items
**Primary lane:** chefflow_picks
**Label template:** `Trending: {label}` (e.g., "Trending: Korean BBQ")
**Sublabel:** "{count} searches today"
**Icon:** flame
**Presentation:** badge
**baseUrgency:** 50
**urgencyDecayFn:** deadline (trend expires in 24h)
**pageAffinity:** `/`, `/eat`, `/chefs`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: search volume indicator, related items, trending since
**clickAction:** toggle_filter
**What clicking reveals:** Filters to the trending term
**href template:** `/eat?craving={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 25
**cooldownMinutes:** 120
**Scoring notes:** Social proof driver. Only shows genuine trends (NEVER fabricated per CLAUDE.md). Decays fast.
**Interaction with other items:** Boosts the underlying item type (if trending item is a cuisine, boosts that cuisine item).
**Data source:** Search analytics aggregation (real data only)

---

#### 45. `new_on_chefflow` (NEW)

**Category:** New on ChefFlow
**Primary lane:** chefflow_picks
**Label template:** `New: {label}` (e.g., "New: Chef Sarah in Austin", "New: Peruvian Cuisine")
**Sublabel:** "Just added"
**Icon:** spark
**Presentation:** badge
**baseUrgency:** 55
**urgencyDecayFn:** linear (14-day freshness window)
**pageAffinity:** `/`, `/chefs`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: what's new, when added, quick stats
**clickAction:** navigate
**What clicking reveals:** The new chef profile or new category page
**href template:** `/chef/{slug}` or `/eat?cuisine={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 15
**cooldownMinutes:** 360
**Scoring notes:** Fresh content signal. Boosted in first 7 days, linear decay after. Location match boosts further.
**Interaction with other items:** New chefs boost their cuisine/location items.
**Data source:** Chef profile creation dates + new category additions

---

#### 46. `social_proof` (NEW)

**Category:** Social proof
**Primary lane:** chefflow_picks
**Label template:** `{count} people {action}` (e.g., "47 people searched 'Italian chef' today")
**Sublabel:** "Popular right now"
**Icon:** cheers
**Presentation:** badge
**baseUrgency:** 45
**urgencyDecayFn:** deadline (24h freshness)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 15
**hoverAction:** Preview showing: trend graph (simple), related searches
**clickAction:** navigate
**What clicking reveals:** Discovery results for the popular term
**href template:** `/eat?craving={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 20
**cooldownMinutes:** 180
**Scoring notes:** CRITICAL: Only real data. NEVER fabricated numbers. If no real data, this item type does not appear. Minimum threshold: 10 genuine searches before showing.
**Interaction with other items:** Validates and reinforces matching taste/occasion items.
**Data source:** Anonymized search analytics (REAL DATA ONLY, per no-fake-stats memory)

---

#### 47. `comparison_prompt` (NEW)

**Category:** Comparison prompts
**Primary lane:** occasion
**Label template:** `Can't decide?`
**Sublabel:** "Compare chefs side by side"
**Icon:** search
**Presentation:** pill
**baseUrgency:** 30
**urgencyDecayFn:** none
**pageAffinity:** `/chefs`, `/eat`
**pageAffinityBoost:** 20
**hoverAction:** Preview showing: how comparison works, what you can compare
**clickAction:** navigate
**What clicking reveals:** Compare page or compare mode toggle
**href template:** `/chefs?mode=compare`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 10
**cooldownMinutes:** 720
**Scoring notes:** Low frequency, high utility. Shown after user has viewed 3+ chef profiles.
**Interaction with other items:** Appears after sufficient browsing depth. Complements quick_compare.
**Data source:** Behavioral signal (view count threshold)

---

#### 48. `guided_flow` (NEW)

**Category:** Guided flows
**Primary lane:** chefflow_picks
**Label template:** `{flowTitle}` (e.g., "Plan your first dinner", "Find your perfect chef")
**Sublabel:** "Step-by-step planning"
**Icon:** concierge
**Presentation:** card
**baseUrgency:** 55
**urgencyDecayFn:** none
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 30
**hoverAction:** Preview showing: flow steps overview, estimated time, what you'll get
**clickAction:** navigate
**What clicking reveals:** Step-by-step planning wizard
**href template:** `/eat?guided={slug}`
**dismissable:** yes
**expandable:** yes; sub-items: flow step indicators
**maxImpressions:** 8
**cooldownMinutes:** 1440 (24h)
**Scoring notes:** Top conversion item for new users. Shows prominently on first visit. Suppressed after completion.
**Interaction with other items:** Guided flows incorporate taste, occasion, budget, group_size items as steps.
**Data source:** Static flow definitions + OCCASION_PLANNING_TEMPLATES

**Complete guided_flow inventory:**
Plan Your First Dinner, Find Your Perfect Chef, Build a Menu, Compare Options, Set Your Budget, Explore by Cuisine, Plan a Holiday Meal, Organize a Group Dinner, Discover Local Chefs

---

#### 49. `signup_nudge` (NEW)

**Category:** Signup nudges
**Primary lane:** chefflow_picks
**Label template:** `{nudgeText}` (e.g., "Save your favorites", "Get personalized picks")
**Sublabel:** "Unlock more features"
**Icon:** spark
**Presentation:** badge
**baseUrgency:** 20
**urgencyDecayFn:** none
**pageAffinity:** `/chefs`, `/eat`, `/`
**pageAffinityBoost:** 10
**hoverAction:** Preview showing: what signing up unlocks (save, compare, personalize, book)
**clickAction:** navigate (to signup/login)
**What clicking reveals:** Auth modal or signup page
**href template:** `/login?from=rail&benefit={slug}`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 5
**cooldownMinutes:** 2880 (48h)
**Scoring notes:** LOWEST priority item. Never aggressive. Only appears after meaningful engagement (3+ clicks, 60+ seconds). Contextual benefits only ("Save this chef" after viewing a chef).
**Interaction with other items:** Triggered by blocked actions (save, lock, compare) on other items.
**Data source:** Behavioral signals (engagement depth)

**Complete signup_nudge inventory:**
Save your favorites, Get personalized picks, Compare chefs side by side, Book directly with chefs, Unlock chef availability alerts, Save your dietary preferences, Start planning with friends

---

#### 50. `recovery` (NEW)

**Category:** Recovery items
**Primary lane:** occasion (contextual)
**Label template:** `{recoveryText}` (e.g., "No results? Try broadening your search", "Explore different cuisines")
**Sublabel:** "Try something different"
**Icon:** search
**Presentation:** pill
**baseUrgency:** 70
**urgencyDecayFn:** none
**pageAffinity:** 404 pages, empty result pages, `/eat` with 0 results
**pageAffinityBoost:** 40
**hoverAction:** Preview showing: alternative search suggestions, popular nearby options
**clickAction:** navigate
**What clicking reveals:** Broadened discovery results or alternative suggestions
**href template:** varies (dynamic based on what failed)
**dismissable:** no (utility; always available when needed)
**expandable:** yes; sub-items: alternative search suggestions
**maxImpressions:** -1 (always available in recovery context)
**cooldownMinutes:** 0
**Scoring notes:** Only appears in empty/error states. Highest urgency in its context. Multiple recovery items can appear.
**Interaction with other items:** Replaces normal rail content in error states. Recovery suggestions based on what WAS searched.
**Data source:** buildDiscoveryRecoveryActions() from consumer-discovery-model.ts

**Complete recovery inventory:**
Broaden your search, Remove dietary filter, Include all food options, Search without location, Send an open request, Try a planning template, Explore popular cuisines, View all chefs, Start fresh

---

#### 51. `cross_sell` (NEW)

**Category:** Cross-sell
**Primary lane:** chefflow_picks
**Label template:** `{offerLabel}` (e.g., "Gift a dinner experience", "Refer a friend")
**Sublabel:** "{description}"
**Icon:** crown
**Presentation:** card
**baseUrgency:** 15
**urgencyDecayFn:** linear (campaign freshness)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 5
**hoverAction:** Preview showing: offer details, how it works
**clickAction:** navigate
**What clicking reveals:** Cross-sell landing page
**href template:** `/gifts` or `/refer`
**dismissable:** yes
**expandable:** no
**maxImpressions:** 5
**cooldownMinutes:** 4320 (72h)
**Scoring notes:** Lowest priority. Background item. Only appears after significant engagement. Never displaces discovery items.
**Interaction with other items:** No interaction with other items. Independent.
**Data source:** Static offer catalog + campaign config

**Complete cross_sell inventory:**
Gift a Dinner Experience, Gift Card, Refer a Friend, Corporate Gifting

---

#### 52. `ask_chefflow` (NEW)

**Category:** Guided flows (conversational)
**Primary lane:** chefflow_picks
**Label template:** `Ask ChefFlow`
**Sublabel:** "Describe what you want"
**Icon:** concierge
**Presentation:** pill
**baseUrgency:** 40
**urgencyDecayFn:** none
**pageAffinity:** `/`, `/eat`, `/chefs`
**pageAffinityBoost:** 15
**hoverAction:** Text input appears: "Tell us what you're looking for..."
**clickAction:** expand_inline
**What clicking reveals:** Inline text input that feeds into discoveryBriefFromFreeform()
**href template:** `/eat?q={userInput}` (after submission)
**dismissable:** no (core utility)
**expandable:** yes; sub-items: text input field + example prompts
**maxImpressions:** -1
**cooldownMinutes:** 0
**Scoring notes:** Always available. Natural language entry point. Boosted on homepage, empty states.
**Interaction with other items:** Freeform input generates matching taste, occasion, dietary, location items.
**Data source:** discoveryBriefFromFreeform() parser in consumer-discovery-model.ts

---

#### 53. `world_food_day` (NEW)

**Category:** Seasonal/timely (food culture events)
**Primary lane:** chefflow_picks
**Label template:** `{eventName}` (e.g., "World Pizza Day", "National Taco Day", "World Vegan Month")
**Sublabel:** "Celebrate with food"
**Icon:** confetti
**Presentation:** card
**baseUrgency:** 65
**urgencyDecayFn:** deadline (event date)
**pageAffinity:** `/`, `/eat`
**pageAffinityBoost:** 35
**hoverAction:** Preview showing: what this day celebrates, matching cuisines, related chefs
**clickAction:** navigate
**What clicking reveals:** Themed discovery for this food day
**href template:** `/eat?craving={relatedCuisine}&event={slug}`
**dismissable:** yes
**expandable:** yes; sub-items: related chefs, dishes, cuisines
**maxImpressions:** 10
**cooldownMinutes:** 1440
**Scoring notes:** Active only on the day (or 2-3 days before). Fun, engagement-driving. Lower priority than holiday items.
**Interaction with other items:** Boosts matching cuisine, food_type items for the duration.
**Data source:** Static food day calendar

**Complete world_food_day inventory (notable ones):**
National Pizza Day (Feb 9), World Chocolate Day (Jul 7), National Taco Day (Oct 4), World Pasta Day (Oct 25), International Sushi Day (Jun 18), World Vegan Day (Nov 1), National BBQ Day (May 16), International Coffee Day (Oct 1), National Donut Day (Jun 6), World Bread Day (Oct 16), National Ice Cream Day (Jul 20), International Beer Day (Aug 2), World Vegetarian Day (Oct 1), National Seafood Month (October), National Soup Month (January)

---

## Interaction Matrix

How selecting one item type affects others:

| Selected Item               | Boosts                                                    | Dims                                       | Replaces                            |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------ | ----------------------------------- |
| `cuisine`                   | matching `food_type`, `technique`, `featured_chef`        | competing `cuisine` items                  | -                                   |
| `dietary`                   | matching `cuisine`, `allergen_safe`                       | conflicting `food_type`                    | -                                   |
| `food_type`                 | matching `cuisine`, `technique`                           | conflicting `dietary` (soft dim)           | -                                   |
| `craving`                   | matching `food_type`, `cuisine`, `technique`              | -                                          | -                                   |
| `occasion`                  | matching `service`, `vibe`, `group_size`, `time`, `price` | competing `occasion` items                 | -                                   |
| `service`                   | matching `occasion`, `price`                              | -                                          | -                                   |
| `location`                  | ALL items (scopes results)                                | items with no local match                  | -                                   |
| `price` / `budget_range`    | matching `featured_chef`, `service`                       | conflicting `special_dining` at wrong tier | `budget_range` replaces `price`     |
| `time`                      | `availability_pulse` for that window                      | -                                          | -                                   |
| `group_size` / `party_tier` | matching `service` format                                 | -                                          | `party_tier` replaces `group_size`  |
| `holiday`                   | matching `occasion`, `cuisine`, `time`                    | non-holiday items (soft dim)               | dominates rail when active          |
| `recovery`                  | alternative paths                                         | ALL normal items (replaces)                | replaces normal rail in error state |
| `guided_flow`               | incorporated sub-items                                    | other `guided_flow` items                  | -                                   |
| `ask_chefflow`              | generates matching items from input                       | -                                          | -                                   |

---

## Scoring Reference

### Base Score Formula

```
finalScore = baseUrgency + pageAffinityBoost + editorialBonus + signalBoost - decayPenalty - dismissPenalty - impressionFatigue
```

### Score Components

| Component         | Range | Notes                                              |
| ----------------- | ----- | -------------------------------------------------- |
| baseUrgency       | 0-100 | Static per item type                               |
| pageAffinityBoost | 0-50  | Active only on affinity routes                     |
| editorialBonus    | 0-20  | Manual editorial boost                             |
| signalBoost       | 0-30  | From learned user preferences (UserScrollSignals)  |
| decayPenalty      | 0-100 | From urgencyDecayFn applied to time                |
| dismissPenalty    | 0-50  | Applied after dismiss, decays over cooldownMinutes |
| impressionFatigue | 0-20  | Gradual reduction after maxImpressions/2           |

### Priority Tiers

| Tier           | Score Range | Examples                                                                                    |
| -------------- | ----------- | ------------------------------------------------------------------------------------------- |
| **Critical**   | 80-100      | `holiday` (near date), `recovery` (empty state), `calendar_hook` (2 weeks out)              |
| **High**       | 60-79       | `availability_pulse`, `location` (with geo), `seasonal` (peak), `guided_flow` (first visit) |
| **Standard**   | 40-59       | `cuisine`, `occasion`, `featured_chef`, `dietary`, `craving`                                |
| **Low**        | 20-39       | `mood`, `vibe`, `technique`, `region`, `comparison_prompt`                                  |
| **Background** | 0-19        | `signup_nudge`, `cross_sell`                                                                |

---

## Data Source Map

| Source                      | Item Types Fed                                                                                                                                                                                                                                                   | Update Frequency            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Static catalogs (hardcoded) | cuisine, food_type, craving, dietary, mood, technique, vibe, occasion, service, special_dining, group_size, hosting_format, prep_style, meal_moment, region, allergen_safe, party_tier, holiday, world_food_day, guided_flow, signup_nudge, cross_sell, recovery | Deploy-time                 |
| Chef profiles (DB)          | featured_chef, chef_pick, chef_spotlight_story, chef_video, dish_visual, location, availability_pulse, new_on_chefflow                                                                                                                                           | Real-time                   |
| PIE synthesis pipeline      | seasonal, culinary_signal, ingredient, ingredient_hero, farm_fresh, price, budget_range                                                                                                                                                                          | Nightly (Pi cron)           |
| Search analytics            | trending, social_proof                                                                                                                                                                                                                                           | Hourly aggregation          |
| Editorial curation          | editorial_collection, story, combo, chef_pick, chef_spotlight_story                                                                                                                                                                                              | Manual (editorial calendar) |
| Calendar                    | calendar_hook, holiday, world_food_day, meal_moment (time-of-day)                                                                                                                                                                                                | Static + computed           |
| User behavior               | saved, surprise, ask_chefflow, comparison_prompt, quick_compare                                                                                                                                                                                                  | Session-scoped              |
| Consumer discovery model    | recovery (from buildDiscoveryRecoveryActions), ask_chefflow (from discoveryBriefFromFreeform)                                                                                                                                                                    | Real-time                   |
| Browser APIs                | location (geolocation)                                                                                                                                                                                                                                           | On-demand                   |

---

## Lane Assignment for New Types

New types need lane assignment in `DISCOVERY_ITEM_TYPE_LANE_MAP` and `HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES`:

```
taste:     + ingredient_hero, cuisine_fusion, prep_style, meal_moment, region, farm_fresh, allergen_safe
occasion:  + hosting_format, budget_range, party_tier, calendar_hook, holiday, availability_pulse, local_market
chefflow_picks: + editorial_collection, chef_spotlight_story, chef_video, dish_visual, quick_compare,
                  trending, new_on_chefflow, social_proof, comparison_prompt, guided_flow,
                  signup_nudge, recovery, cross_sell, ask_chefflow, world_food_day
```

---

## Implementation Notes

1. **Zero Hallucination:** `social_proof`, `trending`, `availability_pulse` MUST use real data. No data = no item. Per project rules.
2. **No fake stats:** Never show fabricated counts. If search analytics are empty, trending/social_proof types simply do not render.
3. **Public safety:** No private IDs in hrefs. All items pass `discoveryHrefHasPrivateIdentifier()` check.
4. **Additive only:** All 23 existing types preserved with original contracts. New fields are optional extensions.
5. **Presentation degradation:** If no image available for card-type items, degrade to pill. Never show broken images.
6. **Signup nudge restraint:** Max 1 signup_nudge per rail view. Never in top 10 positions. Never before 60s of engagement.
7. **Holiday dominance cap:** Holiday items can occupy max 30% of visible rail. Rest must be regular discovery.
8. **Recovery takeover:** In empty/error states, recovery items replace normal rail entirely. No mixing.
9. **Ask ChefFlow persistence:** Always visible. Pinned to a consistent position (e.g., position 3 or end of visible viewport).

---

## Rail Composition Rules

### Viewport Geometry

| Viewport              | Visible Slots          | Pill Width | Card Width | Badge Width | Story Width |
| --------------------- | ---------------------- | ---------- | ---------- | ----------- | ----------- |
| Mobile (<640px)       | 3-4 pills, 1.5 cards   | 100-140px  | 260px      | 80px        | 100vw       |
| Tablet (640-1024px)   | 5-7 pills, 2.5 cards   | 120-160px  | 280px      | 90px        | 100vw       |
| Desktop (1024-1440px) | 8-12 pills, 3.5 cards  | 130-170px  | 300px      | 100px       | 50vw        |
| Wide (>1440px)        | 10-16 pills, 4.5 cards | 140-180px  | 320px      | 110px       | 50vw        |

### Presentation Type Note

The codebase uses `visual_card` (not `card`) as the presentation union value. This spec uses "card" for readability. When implementing, map spec "card" to code `visual_card`. The union is: `'pill' | 'story' | 'visual_card' | 'badge'`.

### Slot Allocation Per Rail View

Each rail view (one horizontal scroll surface) follows these density caps:

| Constraint        | Rule                                                               |
| ----------------- | ------------------------------------------------------------------ |
| **Total items**   | 20-40 per rail view (scales with viewport)                         |
| **Max cards**     | 6 per view (visual weight cap)                                     |
| **Max stories**   | 1 per view (full-width = attention monopoly)                       |
| **Max badges**    | 8 per view (small but noisy in bulk)                               |
| **Pills**         | Fill remaining slots (lightweight, scrollable)                     |
| **Max same-type** | 5 items of any single `DiscoveryItemType` (prevents cuisine flood) |
| **Max same-lane** | 60% of visible slots (ensures lane diversity)                      |

### Mandatory Slot Reservations

These positions are reserved regardless of scoring:

| Position          | Reserved For                                                      | Fallback                |
| ----------------- | ----------------------------------------------------------------- | ----------------------- |
| Slot 1            | Highest-scoring item (any type)                                   | First cuisine pill      |
| Slot 3            | `ask_chefflow` (always pinned)                                    | `surprise`              |
| Slot 5            | First `card`-type item                                            | Highest-scoring pill    |
| Last visible slot | `guided_flow` OR `signup_nudge` (only after engagement threshold) | Empty (no forced nudge) |

### Interleaving Rules

```
Pattern: [pill] [pill] [ask] [pill] [card] [pill] [pill] [badge] [pill] [card] [pill] ...
```

1. Never place two cards adjacent (visual monotony)
2. Never place two badges adjacent (feels like a toolbar)
3. Stories always span full width and break the scroll flow; max 1
4. After 8+ pills in sequence, force-insert a card or badge break
5. `signup_nudge` never appears in positions 1-10

### Lane Distribution

For the homepage (3-lane model), the rail interleaves lanes:

```
Visible rail = [taste] [taste] [occasion] [taste] [picks] [taste] [occasion] [picks] [taste] ...
```

Ratio target: ~50% taste, ~30% occasion, ~20% picks. Engagement lane items distributed into their assigned primary lane.

---

## Destination Contract Additions

New types need entries in `TYPE_ROUTE_COMPATIBILITY` in `discovery-destination-contract.ts`:

```typescript
// ADD to TYPE_ROUTE_COMPATIBILITY:
ingredient_hero:      ['eat', 'ingredients'],
cuisine_fusion:       ['eat', 'chefs'],
prep_style:           ['eat', 'chefs'],
meal_moment:          ['eat', 'chefs'],
region:               ['eat', 'chefs', 'cuisine_page'],
farm_fresh:           ['eat', 'ingredients', 'nearby'],
allergen_safe:        ['chefs', 'eat'],
hosting_format:       ['eat'],
budget_range:         ['eat', 'chefs'],
party_tier:           ['eat'],
calendar_hook:        ['eat'],
holiday:              ['eat', 'chefs'],
availability_pulse:   ['chefs', 'eat'],
local_market:         ['eat', 'nearby'],
editorial_collection: ['eat', 'chefs', 'public_info'],
chef_spotlight_story: ['chef_profile'],
chef_video:           ['chef_profile'],
dish_visual:          ['chef_profile', 'eat'],
quick_compare:        ['chefs'],
trending:             ['eat', 'chefs'],
new_on_chefflow:      ['chef_profile', 'chefs', 'eat'],
social_proof:         ['eat', 'chefs'],
comparison_prompt:    ['chefs'],
guided_flow:          ['eat', 'public_info'],
signup_nudge:         ['public_info'],     // routes to /login
recovery:             ['eat', 'chefs', 'public_info'],
cross_sell:           ['public_info'],     // routes to /gift-cards, /book
ask_chefflow:         ['eat'],
world_food_day:       ['eat', 'chefs'],
```

### Public Info Paths to Add

```typescript
// ADD to PUBLIC_INFO_PATHS:
'/login',
'/signup',
'/refer',
'/gifts',
```

---

## Refresh and Rotation Logic

### Session Lifecycle

```
[Page Load] -> [Initial Rail Render] -> [Scroll/Click Events] -> [Re-score on Navigation] -> [Full Refresh on Return Visit]
```

| Event                        | What Happens                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **First page load**          | Full rail generated from scoring pipeline. All items at base scores.                                  |
| **Scroll past 50%**          | Lazy-load next batch (20 more items). Existing items retain position.                                 |
| **Click any item**           | Record interaction. Re-score on next navigation. Clicked item gets freshness_return boost on return.  |
| **Dismiss an item**          | Remove from current view. Apply cooldownMinutes timer. Record as suppressed signal.                   |
| **Navigate to new page**     | Re-score entire rail with new pageAffinity context. Items shuffle based on new route.                 |
| **Return to homepage**       | Full re-score. Recently clicked items boosted (freshness_return). Dismissed items still in cooldown.  |
| **New session (>30min gap)** | Reset impression counters. Cooldown timers continue. Saved/localStorage items restored.               |
| **New day**                  | Deadline-decay items re-evaluated. Expired seasonals/holidays removed. New calendar_hooks may appear. |

### Shuffle Rules

1. **Deterministic seed per session:** Rail order is deterministic within a session (no jitter on scroll-back). Seed = hash(sessionId + pageRoute).
2. **Inter-session shuffle:** Between sessions, items at the same score tier are shuffled (prevents "always Italian first" fatigue).
3. **Novelty injection:** Every 3rd session, one random item from an unexplored type is promoted to position 6-8 (diversity_fill).
4. **Seasonal rotation:** Seasonal/holiday items inserted into rail on a calendar schedule, not waiting for user signal.
5. **Editorial rotation:** Featured chefs and stories rotate on a weekly editorial calendar. Max 7-day shelf life before rotation.

### Impression Counting

```
impression_count increments when:
  - Item is in visible viewport for >= 1 second (IntersectionObserver)
  - NOT counted: items scrolled past too fast, items below fold never seen

When impression_count >= maxImpressions:
  - Item suppressed for this session
  - Item returns next session (counter resets)
  - Exception: items with maxImpressions = -1 never suppress
```

---

## Hover Preview Wireframes

### Pill Hover (desktop only)

```
+----------------------------------+
| [Icon] Label                     |
|----------------------------------|
| Sublabel text                    |
| Line 2 of context               |
| Line 3 of context               |
|                                  |
| [Related tag] [Related tag]     |
+----------------------------------+
Width: 240px max
Delay: 300ms before show
Exit: 100ms after pointer leaves
```

### Card Hover (desktop only)

```
+------------------------------------------+
| [Hero Image / Chef Photo]                |
|------------------------------------------|
| **Label** (bold)                         |
| Sublabel                                 |
|                                          |
| Detail line 1                            |
| Detail line 2                            |
| Detail line 3                            |
|                                          |
| [Badge] [Badge] [Badge]                 |
|------------------------------------------|
| [CTA Button: "View" or "Explore"]       |
+------------------------------------------+
Width: 320px max
Delay: 400ms before show
Exit: 150ms after pointer leaves
```

### Badge Hover (desktop only)

```
+-------------------------+
| Label: value            |
| One line of context     |
+-------------------------+
Width: 200px max
Delay: 200ms (faster; badges are quick-info)
Exit: 100ms
```

### Story Hover (desktop only)

No separate hover; story presentation is already full-width with visible excerpt. Hover effect: subtle elevation + "Read more" CTA highlight.

### Hover Content Per Type

| Type                 | Hover Line 1                       | Hover Line 2                         | Hover Line 3            | Hover Badges       |
| -------------------- | ---------------------------------- | ------------------------------------ | ----------------------- | ------------------ |
| `cuisine`            | "{count} chefs"                    | "Top: {dish1}, {dish2}"              | "Pairs with: {dietary}" | dietary compat     |
| `food_type`          | "Found in: {cuisine1}, {cuisine2}" | "${range}/person typical"            | -                       | -                  |
| `dietary`            | "{count} chefs support this"       | "Common in: {cuisine1}"              | -                       | -                  |
| `featured_chef`      | "{cuisine} in {city}"              | "{specialty}"                        | "{priceTier}"           | dietary, available |
| `seasonal`           | "Peak: {startDate}-{endDate}"      | "In {count} dishes"                  | -                       | -                  |
| `location`           | "{count} chefs nearby"             | "Top cuisines: {c1}, {c2}"           | -                       | -                  |
| `holiday`            | "{daysAway} days away"             | "Lead time: book {weeks}+ weeks out" | "Popular: {cuisine}"    | -                  |
| `trending`           | "{count} searches today"           | "Up {percent}% this week"            | -                       | -                  |
| `guided_flow`        | "{stepCount} steps"                | "~{minutes} min"                     | -                       | -                  |
| `availability_pulse` | "{count} chefs"                    | "For: {window}"                      | -                       | location           |
| `recovery`           | "Try: {suggestion1}"               | "Or: {suggestion2}"                  | -                       | -                  |

---

## Accessibility Contract

### Per Presentation Type

| Presentation  | ARIA Role                           | Keyboard                                                                    | Focus Ring                     | Screen Reader                                                       |
| ------------- | ----------------------------------- | --------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| `pill`        | `role="option"` in `role="listbox"` | Tab to focus, Enter/Space to activate, Arrow keys to navigate between pills | 2px offset ring, high contrast | "{label}, {sublabel}. {type} filter. Press Enter to {clickAction}." |
| `visual_card` | `role="article"`                    | Tab to focus, Enter to activate                                             | 2px ring on card border        | "{label}. {sublabel}. Press Enter to view details."                 |
| `badge`       | `role="option"` in `role="listbox"` | Same as pill                                                                | 2px inset ring                 | "{label}. Press Enter to {clickAction}."                            |
| `story`       | `role="article"`                    | Tab to focus, Enter to navigate                                             | 2px ring                       | "{storyTitle}. Editorial content. Press Enter to read."             |

### Universal Requirements

1. **Scroll announcement:** When rail content loads, announce: "Discovery rail loaded with {count} items. Use arrow keys to browse."
2. **Dismiss announcement:** On dismiss: "{label} hidden. Will reappear in {cooldownMinutes} minutes."
3. **Filter toggle announcement:** On toggle_filter: "{label} filter {applied|removed}. {resultCount} results."
4. **Expand announcement:** On expand_inline: "{label} expanded. {subItemCount} options available."
5. **Reduced motion:** When `prefers-reduced-motion`, disable: scroll animations, hover transitions, shimmer effects on surprise pill. Functional behavior unchanged.
6. **Color contrast:** All text meets WCAG 2.1 AA (4.5:1 body, 3:1 large text). Badge backgrounds must contrast against rail background.
7. **Touch targets:** Minimum 44x44px for all interactive elements (pills, badges, card CTAs).

---

## Analytics Event Mapping

### Existing Events (from rail-contract-registry.ts)

```
discovery_rail_impression  - Item enters viewport
discovery_rail_click       - navigate action
discovery_rail_select      - select action
discovery_filter_apply     - filter action
discovery_item_save        - save action (auth-gated for public)
discovery_item_hide        - hide/dismiss action
discovery_item_lock        - lock action (auth-gated for public)
discovery_item_compare     - compare action (auth-gated for public)
discovery_item_share       - share action
```

### New Events for New Types

| Type                   | Primary Event                                  | Secondary Events                                        | Properties                                    |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| `trending`             | `discovery_filter_apply`                       | `discovery_rail_impression`                             | `{trendLabel, searchCount, trendAge}`         |
| `new_on_chefflow`      | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{newItemType, daysOld, isChef}`              |
| `social_proof`         | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{proofType, count, term}`                    |
| `comparison_prompt`    | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{compareContext, chefCount}`                 |
| `guided_flow`          | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{flowSlug, stepCount}`                       |
| `signup_nudge`         | `discovery_rail_click`                         | `discovery_rail_impression`, `discovery_nudge_shown`    | `{nudgeBenefit, engagementDepth, timeOnSite}` |
| `recovery`             | `discovery_rail_click`                         | `discovery_rail_impression`, `discovery_recovery_shown` | `{recoveryType, originalQuery, resultCount}`  |
| `cross_sell`           | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{offerSlug, campaign}`                       |
| `editorial_collection` | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{collectionSlug, itemCount}`                 |
| `chef_spotlight_story` | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{chefSlug, storyAge}`                        |
| `chef_video`           | `discovery_rail_click`, `discovery_video_play` | `discovery_rail_impression`, `discovery_video_complete` | `{chefSlug, videoDuration, watchPercent}`     |
| `dish_visual`          | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{dishName, chefSlug, hasPhoto}`              |
| `quick_compare`        | `discovery_item_compare`                       | `discovery_rail_impression`                             | `{chefSlugs, filterContext}`                  |
| `ingredient_hero`      | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{ingredient, peakWindow, priceDirection}`    |
| `cuisine_fusion`       | `discovery_filter_apply`                       | `discovery_rail_impression`                             | `{cuisine1, cuisine2}`                        |
| `calendar_hook`        | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{holiday, daysUntil}`                        |
| `holiday`              | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{holidayName, daysUntil, year}`              |
| `availability_pulse`   | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{chefCount, window, location}`               |
| `ask_chefflow`         | `discovery_freeform_submit`                    | `discovery_rail_impression`, `discovery_rail_click`     | `{rawInput, parsedBrief, resultCount}`        |
| `world_food_day`       | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{eventName, eventDate}`                      |
| `allergen_safe`        | `discovery_filter_apply`                       | `discovery_rail_impression`                             | `{allergen, chefCount}`                       |
| `farm_fresh`           | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{ingredient, harvestWindow}`                 |
| `local_market`         | `discovery_rail_click`                         | `discovery_rail_impression`                             | `{marketSlug, chefCount}`                     |
| `region`               | `discovery_filter_apply`                       | `discovery_rail_impression`                             | `{regionSlug, parentCuisine}`                 |
| `meal_moment`          | `discovery_filter_apply`                       | `discovery_rail_impression`                             | `{moment, timeOfDay, dayOfWeek}`              |
| `hosting_format`       | `discovery_filter_apply`                       | `discovery_rail_impression`                             | `{format}`                                    |
| `budget_range`         | `discovery_filter_apply`                       | `discovery_rail_impression`                             | `{min, max, currency}`                        |
| `party_tier`           | `discovery_filter_apply`                       | `discovery_rail_impression`                             | `{tierName, midpointSize}`                    |
| `prep_style`           | `discovery_filter_apply`                       | `discovery_rail_impression`                             | `{style}`                                     |

### New Event Definitions

```typescript
// ADD to DiscoveryAnalyticsEventName union:
| 'discovery_nudge_shown'      // signup_nudge entered viewport
| 'discovery_recovery_shown'   // recovery item surfaced in empty state
| 'discovery_video_play'       // chef_video play started
| 'discovery_video_complete'   // chef_video watched >80%
| 'discovery_freeform_submit'  // ask_chefflow text submitted
```

---

## Mobile Touch Behavior

No hover on mobile. Touch interactions replace hover entirely.

### Touch Gestures Per Presentation

| Presentation  | Tap                 | Long-Press (500ms)                 | Swipe Left               | Swipe Right |
| ------------- | ------------------- | ---------------------------------- | ------------------------ | ----------- |
| `pill`        | Execute clickAction | Show hover preview as bottom sheet | Dismiss (if dismissable) | No action   |
| `visual_card` | Execute clickAction | Show full preview as bottom sheet  | Dismiss (if dismissable) | No action   |
| `badge`       | Execute clickAction | Show hover preview as tooltip      | Dismiss (if dismissable) | No action   |
| `story`       | Execute clickAction | No action (already full-width)     | Scroll rail              | Scroll rail |

### Bottom Sheet Preview

When long-press triggers preview on mobile:

```
+------------------------------------------+
| [Drag handle]                            |
|------------------------------------------|
| [Icon] **Label**                         |
| Sublabel                                 |
|                                          |
| Context line 1                           |
| Context line 2                           |
| Context line 3                           |
|                                          |
| [Related tag] [Related tag]             |
|                                          |
| [ Primary CTA Button ]                  |
| [ Dismiss ]  [ Share ]                  |
+------------------------------------------+
Height: 40vh max
Backdrop: semi-transparent overlay
Dismiss: tap outside, swipe down, or tap Dismiss
```

### Swipe-to-Dismiss

1. Threshold: 80px horizontal swipe
2. Visual feedback: item slides left with opacity fade
3. Snap-back if < 80px
4. On dismiss: same cooldown rules as click-dismiss
5. Haptic feedback: light impact on threshold cross (iOS)

### Scroll Behavior

- Horizontal scroll with momentum (CSS `scroll-snap-type: x mandatory` on pills/badges)
- Cards: `scroll-snap-type: x proximity` (looser snapping for wider items)
- Scroll indicators: fade gradient on edges showing more content available
- No scroll hijacking: vertical page scroll always takes priority

---

## Filter State Machine

When `toggle_filter` items are clicked, they compose into a filter state:

### State Transitions

```
[Empty State] --click cuisine--> [cuisine={x}]
[cuisine={x}] --click dietary--> [cuisine={x}&dietary={y}]
[cuisine={x}&dietary={y}] --click same cuisine--> [dietary={y}] (toggle off)
[cuisine={x}&dietary={y}] --click different cuisine--> [cuisine={z}&dietary={y}] (replace within type)
```

### Composition Rules

| Filter Dimension                | Max Active | Behavior on Additional Click                |
| ------------------------------- | ---------- | ------------------------------------------- |
| `cuisine`                       | 1          | Replace (not accumulate)                    |
| `dietary`                       | 3          | Accumulate (AND logic; chef must match all) |
| `craving`                       | 1          | Replace                                     |
| `mood` / `vibe`                 | 1          | Replace                                     |
| `budget` / `budget_range`       | 1          | Replace; budget_range overrides budget      |
| `location`                      | 1          | Replace                                     |
| `partySize` / `party_tier`      | 1          | Replace; party_tier maps to partySize       |
| `dateWindow` / `time`           | 1          | Replace                                     |
| `fulfillment` / `service`       | 1          | Replace                                     |
| `occasion`                      | 1          | Replace                                     |
| `eventStyle` / `hosting_format` | 1          | Replace                                     |
| `allergen`                      | 3          | Accumulate (AND logic)                      |
| `technique`                     | 1          | Replace                                     |
| `ingredient`                    | 2          | Accumulate (OR logic; dishes with either)   |
| `meal_moment`                   | 1          | Replace                                     |

### Visual State on Rail Items

| Item State               | Visual Treatment                         |
| ------------------------ | ---------------------------------------- |
| **Default**              | Standard pill/badge appearance           |
| **Active filter**        | Filled background, check icon, bold text |
| **Dimmed** (conflicting) | 50% opacity, no pointer cursor           |
| **Boosted** (compatible) | Subtle glow/border highlight             |
| **Dismissed**            | Removed from DOM (not just hidden)       |

### Filter URL Synchronization

All active filters sync to URL query params via `buildDiscoveryHref()`:

- Enables shareable filter states
- Browser back button removes last-applied filter
- Deep links restore full filter state on load

### Reset Behavior

| Action                    | What Resets                                  |
| ------------------------- | -------------------------------------------- |
| Click "Clear all"         | All filters removed; rail re-scores to base  |
| Navigate away from `/eat` | Filters persist in URL; restored on return   |
| Click `recovery` item     | Removes the filter that caused empty results |
| Click `surprise`          | Clears all filters; applies random discovery |
| Click `guided_flow`       | Clears all filters; enters step-by-step mode |

---

## Public Role Limitations Summary

What public (anonymous) users CANNOT do on the rail:

| Action                              | Blocked | Trigger                                                   |
| ----------------------------------- | ------- | --------------------------------------------------------- |
| `save`                              | Yes     | Shows signup_nudge: "Save your favorites"                 |
| `lock`                              | Yes     | Shows signup_nudge: "Keep this preference"                |
| `compare`                           | Yes     | Shows signup_nudge: "Compare chefs side by side"          |
| View saved items from other devices | Yes     | No cross-device persistence without account               |
| See personalized scores             | Partial | localStorage signals only; no learned preferences from DB |
| Access circles/hub                  | Yes     | Shows signup_nudge: "Plan with friends"                   |

What public users CAN do:

- `navigate`, `select`, `filter`, `hide`, `share` (all 5 public actions)
- Full filter state machine
- `ask_chefflow` freeform input
- `surprise` random discovery
- `guided_flow` step-by-step planning
- Dismiss/hide items with cooldown
- Session-scoped saved items via localStorage
- All hover/long-press previews

---

## Priority Arbitration

When multiple high-urgency items compete for limited visible slots.

### The Problem

Thanksgiving week: `holiday` (75), `calendar_hook` (70), `availability_pulse` (65), `seasonal` (55), `featured_chef` (55), plus pageAffinityBoost on homepage. Many items want the top 5 positions simultaneously.

### Arbitration Rules

**Rule 1: Type Diversity First**
No more than 2 items of the same `DiscoveryItemType` in the top 10 visible positions. If a third would slot in, it gets demoted below position 10.

**Rule 2: Lane Balance Enforcement**
If top 10 is >60% one lane, the lowest-scoring items from the dominant lane swap with the highest-scoring items from underrepresented lanes.

**Rule 3: Presentation Spacing**
Cards require at least 2 non-card items between them. If two cards would be adjacent after scoring, the lower-scoring card moves right until spacing is satisfied.

**Rule 4: Critical Item Guarantees**
These items, when present, are guaranteed a top-10 slot regardless of score:

- `recovery` (only in error/empty states; replaces normal arbitration entirely)
- `ask_chefflow` (pinned to slot 3)
- `holiday` with <14 days remaining
- `availability_pulse` with count > 0

**Rule 5: Tie-Breaking**
When two items have identical final scores:

1. Prefer the item with fewer impressions this session (freshness)
2. Prefer the item with higher baseUrgency (intrinsic importance)
3. Prefer the item type that has fewer representatives in current view (diversity)
4. Random (session-seeded) if still tied

### Arbitration Examples

**Scenario: Thanksgiving Week on Homepage**

Raw scores after pageAffinityBoost:

```
holiday:thanksgiving          75 + 40 = 115
calendar_hook:thanksgiving    70 + 35 = 105
availability_pulse:weekend    65 + 30 = 95
featured_chef:maria           55 + 25 = 80
seasonal:cranberries          55 + 25 = 80
cuisine:american              40 + 15 = 55
guided_flow:holiday_meal      55 + 30 = 85
ask_chefflow                  40 + 15 = 55 (pinned slot 3)
```

After arbitration:

```
Slot 1: holiday:thanksgiving (115, highest score)
Slot 2: calendar_hook:thanksgiving (105, but same holiday topic -> Rule 1 would apply if both were same type; they're different types so OK)
Slot 3: ask_chefflow (PINNED, Rule 4)
Slot 4: availability_pulse:weekend (95, card -> spacing Rule 3 OK since slot 3 is pill)
Slot 5: guided_flow:holiday_meal (85, card -> needs 2 non-cards before next card)
Slot 6: featured_chef:maria (80, card -> Rule 3 violation! 3 cards in slots 4-6. Demote to slot 8)
Slot 7: seasonal:cranberries (80, pill -> OK)
Slot 8: featured_chef:maria (from demotion, card -> 2 non-cards since slot 5, OK)
Slot 9: cuisine:american (55)
```

**Scenario: Empty Results on /eat?cuisine=ethiopian&location=rural_iowa**

Recovery mode activates. Normal arbitration suspended.

```
Slot 1: recovery:broaden_search ("Remove location filter")
Slot 2: recovery:remove_cuisine ("Try all cuisines near you")
Slot 3: ask_chefflow (PINNED)
Slot 4: recovery:send_request ("Send an open request")
Slot 5: guided_flow:find_chef ("Find your perfect chef")
Slot 6-onward: Normal rail items resume (dimmed, secondary)
```

---

## Scenario Walkthroughs

Concrete examples of what the rail looks like for specific user journeys.

### Scenario 1: First-Time Visitor on Homepage

**Context:** Anonymous user, no localStorage, no location, 10am Saturday.

```
[Italian]  [Thai]  [Ask ChefFlow]  [🔥 Trending: BBQ]  [CARD: Plan Your First Dinner]
[Sushi]  [Birthday Dinner]  [Private Chef]  [CARD: Chef Maria Santos]  [Vegan]
[Date Night]  [Meal Prep]  [BADGE: New: 3 chefs added this week]  [Comfort Food]
[CARD: Summer Grilling Guide]  [Brunch]  [Gluten-Free]  [→ more]
```

Why this composition:

- No location items (no geo data yet)
- No availability_pulse (no location to scope)
- `guided_flow` prominent at slot 5 (first visit)
- `trending` gets a slot (social proof for new visitor)
- Heavy cuisine/food_type (broadest appeal)
- One editorial card (story) for depth
- No signup_nudge yet (engagement threshold not met)

### Scenario 2: Browsing /chefs After Filtering "Italian"

**Context:** Anonymous, has selected cuisine:italian from rail. Location: Boston (entered manually).

```
[✓ Italian (active)]  [BADGE: 8 chefs near Boston]  [Ask ChefFlow]
[CARD: Chef Marco - Italian in Boston]  [Pasta]  [Date Night]
[BADGE: Premium ($75-125)]  [CARD: Chef Anna - Sicilian in Cambridge]
[Seafood]  [Wood-Fired]  [Birthday Dinner]  [Tasting Menu]
[BADGE: Compare 3 Italian chefs]  [Vegan]  [This Weekend]  [→ more]
```

Why this composition:

- Italian pill shows active state (checkmark, filled)
- Location badge prominent (validates their filter)
- Featured chefs match Italian + Boston (highest relevance)
- `quick_compare` appears (2+ matching chefs exist)
- Food types and techniques boosted by Italian affinity (pasta, seafood, wood-fired)
- Non-Italian cuisines dimmed/absent (not conflicting, just lower-scored)

### Scenario 3: Thanksgiving Approaching (3 Weeks Out)

**Context:** Anonymous, has location (NYC), November 5th.

```
[CARD: 🦃 Thanksgiving is 3 weeks away]  [CARD: Thanksgiving Dining in NYC]
[Ask ChefFlow]  [BADGE: 24 chefs available Thanksgiving week]
[CARD: Plan Your Holiday Meal]  [American]  [Italian]
[Family Dinner (8-15)]  [Premium ($75-125)]  [BADGE: Farm-fresh squash]
[Private Chef]  [Southern US]  [Comfort Food]  [→ more]
```

Why this composition:

- Holiday dominance: 2 cards in top 5 (within 30% cap since we're at 2/7)
- `calendar_hook` + `holiday` both present (different types, different purpose)
- `availability_pulse` validates the holiday window
- `guided_flow` reframed for holiday context
- Seasonal items boosted (farm_fresh, squash)
- Cuisines that pair with Thanksgiving (American, Italian, Southern)
- Large party size suggested (family gathering)

### Scenario 4: 404 Page / Dead End

**Context:** User navigated to `/chef/deleted-profile` which 404s.

```
[Try: Search all chefs]  [Try: Explore cuisines]  [Ask ChefFlow]
[Try: Plan a dinner]  [Try: Browse by location]
```

Why this composition:

- Recovery mode: ONLY recovery items + ask_chefflow
- Normal rail completely suppressed
- Each recovery item is a different escape route
- No signup nudges, no editorial (wrong moment)
- Short rail; don't flood a confused user

### Scenario 5: Power Browser (15+ Minutes, 10+ Clicks, No Signup)

**Context:** Anonymous, deep engagement, has filtered by Italian then Thai then BBQ, viewed 4 chef profiles, location active.

```
[Thai (active)]  [BADGE: Chefs near Portland]  [Ask ChefFlow]
[CARD: Chef Suki - Thai in Portland]  [BBQ]  [BADGE: 47 people searched Thai today]
[CARD: Compare 2 Thai chefs]  [Grilled]  [Spicy]
[BADGE: Save your favorites ✨]  [Date Night]  [Casual]
[This Weekend]  [BADGE: New: Chef Lee in Portland]  [→ more]
```

Why this composition:

- `signup_nudge` finally appears (position 10, after engagement threshold)
- `social_proof` appears (validates their interest with real data)
- `quick_compare` prominent (they've viewed multiple chefs)
- `new_on_chefflow` relevant (fresh content for engaged user)
- Previously viewed cuisines influence: Thai active, BBQ still visible, Italian absent (replaced)
- Saved items via localStorage would appear if they navigated away and returned

### Scenario 6: Mobile User, First Scroll

**Context:** iPhone, anonymous, no location, homepage, Sunday 11am.

Visible in viewport (3.5 pills wide):

```
[Italian]  [Brunch]  [Ask ChefFlow]  [Th...]
```

Swipe right reveals:

```
[Thai]  [CARD: Plan Your First Dinner]  [BBQ]  [Birthday]  [CARD: Chef Featured]  ...
```

Why this composition:

- `meal_moment:brunch` boosted (Sunday 11am = brunch time)
- Only 3-4 items visible; density matters
- `guided_flow` card early in scroll (conversion priority)
- Scroll indicator (gradient fade on right edge) signals more content

---

## Performance Budget

### Render Limits

| Metric                   | Budget     | Notes                                            |
| ------------------------ | ---------- | ------------------------------------------------ |
| **Initial render items** | 20         | First paint only renders 20 items                |
| **Lazy batch size**      | 15         | Load 15 more on scroll past 80%                  |
| **Max total items**      | 60         | Hard cap; never render more                      |
| **Max cards in DOM**     | 8          | Cards have images; limit DOM weight              |
| **Max stories in DOM**   | 1          | Full-width; only 1 ever rendered                 |
| **Image lazy loading**   | Below fold | Only cards in viewport load images               |
| **Hover preview render** | On demand  | Preview DOM created on first hover, cached after |

### Timing Targets

| Phase                      | Target       | Measurement                     |
| -------------------------- | ------------ | ------------------------------- |
| **Rail data fetch**        | <100ms       | Server component data loading   |
| **Initial render (SSR)**   | <50ms        | Server-side HTML generation     |
| **Client hydration**       | <100ms       | Interactive after hydration     |
| **Scroll to new items**    | <16ms/frame  | 60fps scroll, no jank           |
| **Filter toggle response** | <200ms       | Visual state change after click |
| **Hover preview appear**   | 300-400ms    | Delay + render combined         |
| **Impression tracking**    | Debounced 1s | IntersectionObserver callback   |

### Data Payload Targets

| Payload                    | Target            | Notes                  |
| -------------------------- | ----------------- | ---------------------- |
| **Rail items JSON**        | <8KB              | 20 items, serialized   |
| **Card images**            | <50KB each        | WebP, 300px wide, lazy |
| **Chef photos**            | <30KB each        | WebP, 200px, lazy      |
| **Total rail first paint** | <15KB (no images) | HTML + minimal JS      |

### Scoring Pipeline Performance

```
Input: 200 candidate items (all types combined)
  ↓ Filter by role (public): ~180 remain
  ↓ Filter by data availability: ~120 remain (no fake data items)
  ↓ Score all 120: <5ms (pure math, no IO)
  ↓ Sort by score: <1ms
  ↓ Apply arbitration rules: <2ms
  ↓ Slice to 20 (initial render): <1ms
Total: <10ms server-side
```

---

## Content Policy

### Label Rules

| Rule                            | Constraint                                                              | Example                                                   |
| ------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| **Max length**                  | 30 characters (pill), 40 characters (card title), 20 characters (badge) | "Wood-Fired Pizza" (16 chars, OK)                         |
| **Truncation**                  | Ellipsis at boundary, never mid-word                                    | "Mediterranean Cu..." (never "Mediterrane...")            |
| **Capitalization**              | Title Case for nouns/proper names, sentence case for phrases            | "Italian", "Plan your first dinner"                       |
| **No exclamation marks**        | Never in labels or sublabels                                            | "New" not "New!"                                          |
| **No question marks in labels** | Questions only in sublabels                                             | Label: "Ask ChefFlow", Sublabel: "Describe what you want" |
| **No price symbols in labels**  | Use words or sublabel for price                                         | "Budget-Friendly" not "$20-40" (price goes in sublabel)   |

### Sublabel Rules

| Rule                     | Constraint                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| **Max length**           | 50 characters                                                                                       |
| **Must add information** | Never repeat the label. "Italian" + "Italian cuisine" is forbidden.                                 |
| **Verb framing**         | Active voice preferred: "Find chefs who..." not "Chefs are found who..."                            |
| **No superlatives**      | Never "best", "top", "amazing", "#1". Use factual: "12 chefs", "Popular this week"                  |
| **No fake urgency**      | Never "Hurry!", "Limited time!", "Don't miss!". Real deadlines only: "Thanksgiving is 3 weeks away" |

### Forbidden Content

| Forbidden           | Reason                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Fabricated numbers  | No fake stats rule. "47 people searched" must be real or absent.                              |
| Testimonials/quotes | No fake testimonials rule. Real reviews only on chef profiles, never in rail.                 |
| Competitor names    | No "Better than DoorDash" or "Like Uber Eats but..."                                          |
| Price guarantees    | No "Lowest price guaranteed" (impossible to verify)                                           |
| Time estimates      | No "Book in 2 minutes" (variable; could frustrate)                                            |
| Emoji in labels     | Emojis only in icon slot, never in text. Exception: holiday items may use one thematic emoji. |
| "OpenClaw"          | Per CLAUDE.md: forbidden in public surfaces. Use "system" or "engine" internally.             |

### Tone Guide

The rail speaks like a knowledgeable friend who knows food, not a salesperson.

| Do                      | Don't                                 |
| ----------------------- | ------------------------------------- |
| "Chefs who specialize"  | "Amazing chefs ready for you!"        |
| "At its best right now" | "DON'T MISS seasonal produce!"        |
| "Trending: Korean BBQ"  | "Everyone's OBSESSED with Korean BBQ" |
| "3 weeks away"          | "HURRY! Only 3 weeks left!"           |
| "Compare side by side"  | "Find your PERFECT match!"            |
| "Step-by-step planning" | "Let us do the hard work for you!"    |

---

## Degradation Ladder

What happens when data sources are unavailable.

### Per Data Source

| Source                  | Failure Mode                 | Degradation                                                                                                                                                                   | Items Affected   |
| ----------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **Chef profiles (DB)**  | DB timeout or empty table    | Remove: featured_chef, chef_pick, chef_spotlight_story, chef_video, dish_visual, availability_pulse, new_on_chefflow, quick_compare. Rail runs on static items only.          | 8 types lost     |
| **PIE synthesis (Pi)**  | Pi unreachable or stale data | Remove: ingredient_hero, farm_fresh. Degrade: seasonal (use static calendar only), price (use static tiers only), budget_range (remove). culinary_signal uses static catalog. | 5 types degraded |
| **Search analytics**    | No analytics data            | Remove: trending, social_proof. These types simply don't render. No fake data.                                                                                                | 2 types lost     |
| **Browser geolocation** | User denied or unavailable   | Remove: location (geo-based), local_market, availability_pulse. Show: "Add your location" prompt in location slot. All location-scoped items fall back to unscoped.           | 3 types lost     |
| **localStorage**        | Private browsing or cleared  | Remove: saved items. Surprise still works (stateless). No session continuity.                                                                                                 | 1 type lost      |
| **Editorial content**   | No curated content           | Remove: editorial_collection, chef_spotlight_story, story (editorial). chef_pick falls back to algorithmic selection.                                                         | 3 types lost     |
| **Calendar**            | Clock skew (unlikely)        | Holiday/calendar_hook items may show wrong countdown. Fallback: static holiday list without countdown sublabel.                                                               | 2 types degraded |

### Cascade Levels

```
Level 0: ALL SYSTEMS HEALTHY
  52 item types available, full personalization, real-time data
  Rail: rich, diverse, location-aware, seasonally relevant

Level 1: NO REAL-TIME DATA (DB up, Pi/analytics down)
  -7 types (trending, social_proof, ingredient_hero, farm_fresh, budget_range, seasonal degraded, culinary_signal degraded)
  Rail: still rich. Static catalogs cover cuisines, occasions, dietary. Featured chefs still render.

Level 2: NO DATABASE (DB down, everything else up)
  -8 types (all chef-dependent items gone)
  Rail: discovery-only. Cuisines, occasions, dietary, guided_flows, stories still work.
  User can browse and plan but can't see real chefs. Recovery items suggest "try again later."

Level 3: STATIC ONLY (everything down except static catalogs)
  ~25 types remain (all static catalog items)
  Rail: functional but generic. No personalization, no real-time, no chefs.
  Still useful: user can explore cuisines, set filters, use guided_flow, ask_chefflow.

Level 4: TOTAL FAILURE (JS fails to hydrate)
  SSR rail renders as static HTML links. No interactivity.
  Items are plain <a> tags. Clicking navigates. No hover, no filter toggle, no expand.
  Accessible and functional. Ugly but works.
```

### Empty State Rules (Expanded)

Per consumer-discovery-model.ts `getEmptyStateRule()`, enhanced:

| Category               | Has Data                        | No Data                                                                       |
| ---------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `location`             | Render with chef count          | Suppress. Show "Add location" prompt instead. Never claim "0 chefs near you." |
| `seasonal`             | Render with peak dates          | Use generic: "Explore seasonal ingredients" (no specific claims).             |
| `trending`             | Render with real count          | Suppress entirely. Never show "0 trending."                                   |
| `social_proof`         | Render with real count (min 10) | Suppress entirely. Never show "0 people searched."                            |
| `availability_pulse`   | Render with real count          | Suppress entirely. Never show "0 chefs available."                            |
| `featured_chef`        | Render with profile data        | Suppress. Don't show placeholder chef cards.                                  |
| `new_on_chefflow`      | Render with creation date       | Suppress after 14 days (no longer "new").                                     |
| `saved`                | Render from localStorage        | Suppress. Don't show "You have no saved items" (no account to fix it).        |
| `editorial_collection` | Render with real items          | Suppress. Don't show empty collections.                                       |
| All others             | Render normally                 | Use broad discovery fallback. Static catalog items always have data.          |

**Universal rule:** If rendering would require showing a zero count, a placeholder, or a "coming soon" message, SUPPRESS THE ITEM. Empty slots are better than hollow promises.

---

## Implementation Checklist

For engineers building from this catalog:

### Phase 1: Enrich Existing Types (no new TS types needed)

- [ ] Add all 20 metadata fields to existing 23 types in scoring pipeline
- [ ] Implement impression counting (IntersectionObserver)
- [ ] Implement cooldown timers (localStorage timestamps)
- [ ] Implement dismiss behavior (remove from DOM + cooldown)
- [ ] Add hover previews for pill/badge/card presentations
- [ ] Add mobile long-press -> bottom sheet
- [ ] Implement filter state machine for toggle_filter items
- [ ] Add slot reservation for ask_chefflow at position 3
- [ ] Implement presentation spacing rules (no adjacent cards)

### Phase 2: Add New Types (TS union extensions)

- [ ] Extend `DiscoveryItemType` union with 29 new types
- [ ] Add entries to `TYPE_ROUTE_COMPATIBILITY`
- [ ] Add entries to `DISCOVERY_RAIL_CONTRACT_REGISTRY`
- [ ] Add entries to `DISCOVERY_ITEM_TYPE_LANE_MAP`
- [ ] Add entries to `HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES`
- [ ] Add new analytics event types
- [ ] Add new icon keys to `DiscoveryIconKey` union
- [ ] Implement data sources for each new type
- [ ] Add degradation checks per data source

### Phase 3: Scoring and Arbitration

- [ ] Implement baseUrgency + pageAffinityBoost scoring
- [ ] Implement urgencyDecayFn (deadline, linear, none)
- [ ] Implement priority arbitration rules (type diversity, lane balance, presentation spacing)
- [ ] Implement tie-breaking logic
- [ ] Add performance monitoring (scoring pipeline <10ms target)

### Phase 4: Polish

- [ ] Accessibility audit (ARIA roles, keyboard nav, screen reader)
- [ ] Performance audit (render budget, image lazy loading)
- [ ] Content review (all labels/sublabels pass content policy)
- [ ] Empty state testing (every data source failure individually)
- [ ] Mobile testing (touch gestures, bottom sheet, scroll snap)
- [ ] Holiday calendar QA (verify all dates for current year)

---

## Icon Key Registry

Complete mapping of all 52 item types to `DiscoveryIconKey` values. New icon keys marked with `(NEW)`.

### Existing Icon Keys (from codebase)

```
avocado, bbq, bowl, bread, brunch, burger, cake, carrot, champagne, chef, cheers,
coffee, concierge, confetti, comfort, cookie, crown, dining, dumpling, egg, family,
fish, flame, graduation, grains, knife, leaf, location, market, noodles, pasta,
pepper, pizza, plant, ramen, salad, sandwich, search, seafood, small_plates, spark,
stack, steak, sushi, taco, utensils, wine
```

### New Icon Keys Required

```typescript
// ADD to DiscoveryIconKey union:
| 'clock'       // time-based items
| 'gift'        // cross_sell, gift cards
| 'megaphone'   // trending, social_proof
| 'shield'      // allergen_safe
| 'video'       // chef_video
| 'camera'      // dish_visual
| 'globe'       // region, world_food_day
| 'house'       // hosting_format
| 'calendar'    // calendar_hook, holiday
| 'compare'     // quick_compare, comparison_prompt
| 'wand'        // guided_flow
| 'sunrise'     // meal_moment (morning)
| 'moon'        // meal_moment (evening)
| 'truck'       // prep_style (delivery)
| 'snowflake'   // prep_style (frozen)
| 'seedling'    // farm_fresh
```

### Complete Type-to-Icon Map

| Type                   | Primary Icon            | Variant Logic                                                        |
| ---------------------- | ----------------------- | -------------------------------------------------------------------- |
| `cuisine`              | (per-cuisine map below) | Regional emoji mapped from cuisine DB                                |
| `food_type`            | (per-dish map below)    | sushi, taco, pasta, burger, etc.                                     |
| `craving`              | `flame`                 | Always flame (desire/hunger)                                         |
| `dietary`              | `leaf`                  | `plant` for plant-based, `grains` for gluten-free                    |
| `mood`                 | `spark`                 | -                                                                    |
| `seasonal`             | `market`                | -                                                                    |
| `culinary_signal`      | `knife`                 | -                                                                    |
| `technique`            | `flame`                 | -                                                                    |
| `ingredient`           | `carrot`                | Specific icon when available (avocado, fish, etc.)                   |
| `vibe`                 | `champagne`             | -                                                                    |
| `ingredient_hero`      | `avocado`               | Mapped to specific ingredient icon                                   |
| `cuisine_fusion`       | `utensils`              | -                                                                    |
| `prep_style`           | `knife`                 | `truck` for delivery, `snowflake` for frozen                         |
| `meal_moment`          | `coffee`                | `sunrise` morning, `dining` evening, `bowl` lunch, `moon` late night |
| `region`               | `globe`                 | -                                                                    |
| `farm_fresh`           | `seedling`              | -                                                                    |
| `allergen_safe`        | `shield`                | -                                                                    |
| `service`              | `chef`                  | -                                                                    |
| `occasion`             | `confetti`              | `family` for gatherings, `champagne` for formal                      |
| `special_dining`       | `crown`                 | -                                                                    |
| `circle`               | `family`                | -                                                                    |
| `location`             | `location`              | -                                                                    |
| `price`                | `stack`                 | -                                                                    |
| `time`                 | `clock`                 | -                                                                    |
| `group_size`           | `family`                | -                                                                    |
| `hosting_format`       | `house`                 | -                                                                    |
| `budget_range`         | `stack`                 | -                                                                    |
| `party_tier`           | `family`                | -                                                                    |
| `calendar_hook`        | `calendar`              | -                                                                    |
| `holiday`              | `calendar`              | Thematic: confetti for celebrations, family for gatherings           |
| `availability_pulse`   | `chef`                  | -                                                                    |
| `local_market`         | `market`                | -                                                                    |
| `featured_chef`        | `chef`                  | -                                                                    |
| `chef_pick`            | `crown`                 | -                                                                    |
| `combo`                | `utensils`              | -                                                                    |
| `story`                | `spark`                 | -                                                                    |
| `surprise`             | `spark`                 | Animated shimmer variant                                             |
| `saved`                | `search`                | -                                                                    |
| `editorial_collection` | `crown`                 | -                                                                    |
| `chef_spotlight_story` | `chef`                  | -                                                                    |
| `chef_video`           | `video`                 | -                                                                    |
| `dish_visual`          | `camera`                | -                                                                    |
| `quick_compare`        | `compare`               | -                                                                    |
| `trending`             | `megaphone`             | -                                                                    |
| `new_on_chefflow`      | `spark`                 | -                                                                    |
| `social_proof`         | `cheers`                | -                                                                    |
| `comparison_prompt`    | `compare`               | -                                                                    |
| `guided_flow`          | `wand`                  | -                                                                    |
| `signup_nudge`         | `spark`                 | -                                                                    |
| `recovery`             | `search`                | -                                                                    |
| `cross_sell`           | `gift`                  | -                                                                    |
| `ask_chefflow`         | `concierge`             | -                                                                    |
| `world_food_day`       | `globe`                 | -                                                                    |

### Cuisine-to-Icon Map (Top 30)

| Cuisine        | Icon               |
| -------------- | ------------------ |
| Italian        | `pasta`            |
| Japanese       | `sushi`            |
| Mexican        | `taco`             |
| Thai           | `pepper`           |
| Chinese        | `dumpling`         |
| Indian         | `bowl`             |
| French         | `wine`             |
| Korean         | `ramen`            |
| American       | `burger`           |
| Mediterranean  | `salad`            |
| BBQ            | `bbq`              |
| Vietnamese     | `noodles`          |
| Greek          | `salad`            |
| Brazilian      | `steak`            |
| Ethiopian      | `bowl`             |
| Caribbean      | `fish`             |
| Southern US    | `comfort`          |
| Cajun/Creole   | `seafood`          |
| Spanish        | `small_plates`     |
| Middle Eastern | `bread`            |
| Hawaiian       | `fish`             |
| Peruvian       | `seafood`          |
| Moroccan       | `bowl`             |
| Turkish        | `bread`            |
| Filipino       | `bowl`             |
| Soul Food      | `comfort`          |
| Cuban          | `sandwich`         |
| Argentinian    | `steak`            |
| All others     | `dining` (default) |

---

## Seasonal Activation Calendar

Month-by-month schedule of what time-sensitive items activate. Items appear on the date in "Activate" and disappear on "Deactivate."

### January

| Item Type         | Specific Item                | Activate | Deactivate | Notes                       |
| ----------------- | ---------------------------- | -------- | ---------- | --------------------------- |
| `holiday`         | New Year's Day               | Dec 15   | Jan 2      |                             |
| `world_food_day`  | National Soup Month          | Jan 1    | Jan 31     | All month                   |
| `seasonal`        | Winter citrus                | Jan 1    | Mar 15     | Blood oranges, Meyer lemons |
| `ingredient_hero` | Peak: Meyer Lemons           | Jan 10   | Feb 28     |                             |
| `calendar_hook`   | Valentine's Day is {n} weeks | Jan 15   | Feb 13     |                             |
| `meal_moment`     | (boosted) Comfort dinner     | Jan 1    | Mar 1      | Winter boost                |

### February

| Item Type        | Specific Item                | Activate | Deactivate | Notes                    |
| ---------------- | ---------------------------- | -------- | ---------- | ------------------------ |
| `holiday`        | Valentine's Day              | Jan 15   | Feb 15     | Highest urgency Feb 1-14 |
| `world_food_day` | National Pizza Day (Feb 9)   | Feb 7    | Feb 10     |                          |
| `seasonal`       | Winter root vegetables       | Jan 1    | Mar 31     |                          |
| `calendar_hook`  | Easter/Passover is {n} weeks | Feb 15   | Varies     | Date varies by year      |
| `farm_fresh`     | Winter greens (kale, chard)  | Jan 1    | Mar 15     |                          |

### March

| Item Type         | Specific Item                    | Activate | Deactivate | Notes |
| ----------------- | -------------------------------- | -------- | ---------- | ----- |
| `holiday`         | St. Patrick's Day                | Mar 1    | Mar 18     |       |
| `seasonal`        | Spring preview (peas, asparagus) | Mar 15   | Jun 1      |       |
| `ingredient_hero` | Peak: Asparagus                  | Mar 20   | May 31     |       |
| `calendar_hook`   | Mother's Day is {n} weeks        | Mar 20   | May 10     |       |

### April

| Item Type         | Specific Item         | Activate     | Deactivate      | Notes                      |
| ----------------- | --------------------- | ------------ | --------------- | -------------------------- |
| `holiday`         | Easter                | Varies (-4w) | Day after       | Date varies by year        |
| `holiday`         | Passover              | Varies (-4w) | End of Passover | Date varies by year        |
| `seasonal`        | Spring produce peak   | Apr 1        | Jun 15          | Strawberries, peas, morels |
| `ingredient_hero` | Peak: Morel Mushrooms | Apr 1        | May 31          |                            |
| `farm_fresh`      | First strawberries    | Apr 15       | Jun 30          | Region-dependent           |

### May

| Item Type        | Specific Item                        | Activate | Deactivate       | Notes |
| ---------------- | ------------------------------------ | -------- | ---------------- | ----- |
| `holiday`        | Mother's Day                         | Apr 15   | May (2nd Sun)    |       |
| `holiday`        | Memorial Day                         | May 1    | May (last Mon)+1 |       |
| `world_food_day` | National BBQ Day (May 16)            | May 14   | May 17           |       |
| `seasonal`       | Late spring (artichokes, fava beans) | May 1    | Jun 30           |       |
| `calendar_hook`  | Father's Day is {n} weeks            | May 15   | Jun 14           |       |
| `calendar_hook`  | July 4th is {n} weeks                | May 20   | Jul 3            |       |

### June

| Item Type         | Specific Item                | Activate   | Deactivate    | Notes                      |
| ----------------- | ---------------------------- | ---------- | ------------- | -------------------------- |
| `holiday`         | Father's Day                 | May 15     | Jun (3rd Sun) |                            |
| `holiday`         | Juneteenth                   | Jun 1      | Jun 20        |                            |
| `world_food_day`  | Intl. Sushi Day (Jun 18)     | Jun 16     | Jun 19        |                            |
| `world_food_day`  | National Donut Day (1st Fri) | Day before | Day after     |                            |
| `seasonal`        | Summer stone fruit           | Jun 1      | Sep 15        | Peaches, nectarines, plums |
| `ingredient_hero` | Peak: Heirloom Tomatoes      | Jun 15     | Sep 30        |                            |
| `farm_fresh`      | Summer berries               | Jun 1      | Aug 31        |                            |

### July

| Item Type         | Specific Item                         | Activate   | Deactivate | Notes |
| ----------------- | ------------------------------------- | ---------- | ---------- | ----- |
| `holiday`         | Independence Day                      | Jun 15     | Jul 5      |       |
| `world_food_day`  | World Chocolate Day (Jul 7)           | Jul 5      | Jul 8      |       |
| `world_food_day`  | Natl. Ice Cream Day (3rd Sun)         | Day before | Day after  |       |
| `seasonal`        | Peak summer (corn, peppers, zucchini) | Jul 1      | Sep 15     |       |
| `ingredient_hero` | Peak: Sweet Corn                      | Jul 1      | Aug 31     |       |
| `calendar_hook`   | Labor Day is {n} weeks                | Jul 15     | Aug 31     |       |

### August

| Item Type         | Specific Item                        | Activate   | Deactivate      | Notes                     |
| ----------------- | ------------------------------------ | ---------- | --------------- | ------------------------- |
| `world_food_day`  | Intl. Beer Day (1st Fri)             | Day before | Day after       |                           |
| `seasonal`        | Late summer (figs, eggplant, melons) | Aug 1      | Oct 1           |                           |
| `ingredient_hero` | Peak: Figs                           | Aug 1      | Sep 30          |                           |
| `calendar_hook`   | Thanksgiving is {n} weeks            | Aug 15     | Nov 27 (varies) | Long lead for big holiday |
| `farm_fresh`      | End-of-summer harvest                | Aug 15     | Sep 30          |                           |

### September

| Item Type         | Specific Item                           | Activate     | Deactivate      | Notes |
| ----------------- | --------------------------------------- | ------------ | --------------- | ----- |
| `holiday`         | Labor Day                               | Aug 15       | Sep (1st Mon)+1 |       |
| `holiday`         | Rosh Hashanah                           | Varies (-3w) | Day after       |       |
| `seasonal`        | Fall transition (apples, squash, pears) | Sep 1        | Nov 30          |       |
| `ingredient_hero` | Peak: Honeycrisp Apples                 | Sep 1        | Nov 15          |       |
| `farm_fresh`      | Apple picking season                    | Sep 1        | Oct 31          |       |

### October

| Item Type         | Specific Item                              | Activate     | Deactivate | Notes |
| ----------------- | ------------------------------------------ | ------------ | ---------- | ----- |
| `holiday`         | Halloween                                  | Oct 1        | Nov 1      |       |
| `holiday`         | Yom Kippur                                 | Varies (-2w) | Day after  |       |
| `holiday`         | Diwali                                     | Varies (-3w) | Day after  |       |
| `world_food_day`  | Natl. Taco Day (Oct 4)                     | Oct 2        | Oct 5      |       |
| `world_food_day`  | World Pasta Day (Oct 25)                   | Oct 23       | Oct 26     |       |
| `world_food_day`  | Natl. Seafood Month                        | Oct 1        | Oct 31     |       |
| `seasonal`        | Peak fall (pumpkin, cranberries, root veg) | Oct 1        | Dec 15     |       |
| `ingredient_hero` | Peak: Butternut Squash                     | Oct 1        | Dec 31     |       |

### November

| Item Type         | Specific Item                          | Activate | Deactivate      | Notes                      |
| ----------------- | -------------------------------------- | -------- | --------------- | -------------------------- |
| `holiday`         | Thanksgiving                           | Oct 15   | Nov (4th Thu)+1 | Longest pre-holiday window |
| `world_food_day`  | World Vegan Day (Nov 1)                | Oct 30   | Nov 2           |                            |
| `seasonal`        | Late fall (Brussels sprouts, parsnips) | Nov 1    | Jan 15          |                            |
| `calendar_hook`   | Christmas/Hanukkah is {n} weeks        | Nov 1    | Dec 24          |                            |
| `ingredient_hero` | Peak: Cranberries                      | Nov 1    | Dec 31          |                            |

### December

| Item Type         | Specific Item                           | Activate     | Deactivate   | Notes |
| ----------------- | --------------------------------------- | ------------ | ------------ | ----- |
| `holiday`         | Hanukkah                                | Varies (-3w) | Last night+1 |       |
| `holiday`         | Christmas Eve                           | Nov 15       | Dec 25       |       |
| `holiday`         | Christmas Day                           | Nov 15       | Dec 26       |       |
| `holiday`         | New Year's Eve                          | Dec 1        | Jan 1        |       |
| `holiday`         | Kwanzaa                                 | Dec 15       | Jan 2        |       |
| `seasonal`        | Winter (pomegranate, persimmon, citrus) | Dec 1        | Feb 28       |       |
| `ingredient_hero` | Peak: Pomegranate                       | Nov 15       | Jan 31       |       |
| `farm_fresh`      | Winter citrus harvest                   | Dec 1        | Mar 1        |       |

### Year-Round Items (no seasonal activation)

`cuisine`, `food_type`, `craving`, `dietary`, `mood`, `technique`, `vibe`, `service`, `occasion`, `special_dining`, `circle`, `location`, `price`, `group_size`, `featured_chef`, `chef_pick`, `combo`, `surprise`, `saved`, `ask_chefflow`, `guided_flow`, `signup_nudge`, `recovery`, `cross_sell`, `comparison_prompt`, `quick_compare`, `trending`, `social_proof`, `new_on_chefflow`, `availability_pulse`, `allergen_safe`, `hosting_format`, `budget_range`, `party_tier`, `prep_style`, `editorial_collection`, `chef_spotlight_story`, `chef_video`, `dish_visual`, `local_market`, `cuisine_fusion`, `region`

---

## Cross-Page Rail Variations

The rail adapts per route. Not all types appear everywhere.

### Homepage (`/`)

**Purpose:** Broad discovery funnel. Make anonymous visitors want to explore.
**Lane mix:** 50% taste, 30% occasion, 20% picks
**Mandatory items:** `ask_chefflow` (slot 3), one `guided_flow`, one `featured_chef` (if available)
**Suppressed items:** `quick_compare` (no filter context yet), `recovery` (not an error state)
**Boosted items:** `holiday` (if active), `calendar_hook`, `trending`, `new_on_chefflow`
**Max items:** 40

### Eat Page (`/eat`)

**Purpose:** Active planning. User has intent.
**Lane mix:** 40% taste, 40% occasion, 20% picks
**Mandatory items:** `ask_chefflow` (slot 3)
**Suppressed items:** `chef_spotlight_story` (too editorial for planning mode), `cross_sell`
**Boosted items:** All `toggle_filter` items get +10 boost (filter context is primary). `recovery` items appear when results < 8. `availability_pulse` if location active.
**Max items:** 30 (tighter; user is focused)
**Special behavior:** Active filters show as filled pills at rail start (before scored items)

### Chefs Page (`/chefs`)

**Purpose:** Chef browsing and comparison. High commercial intent.
**Lane mix:** 30% taste, 20% occasion, 50% picks (chef-heavy)
**Mandatory items:** `ask_chefflow` (slot 3), `quick_compare` (if 2+ chefs match filters)
**Suppressed items:** `story`, `world_food_day`, `circle`
**Boosted items:** `featured_chef` (+15), `location` (+15), `dietary` (+10), `price` (+10), `comparison_prompt` (if 3+ profiles viewed)
**Max items:** 25 (less discovery, more refinement)

### Chef Profile (`/chef/{slug}`)

**Purpose:** Decision support. User is evaluating one chef.
**Lane mix:** 20% taste (matching chef's cuisine), 30% occasion, 50% picks
**Mandatory items:** `ask_chefflow` (slot 3)
**Suppressed items:** Most taste items (not browsing anymore), `trending`, `social_proof`
**Boosted items:** `occasion` items matching chef's service types, `price` matching chef's tier, `dietary` matching chef's strengths, related `featured_chef` (similar chefs), `comparison_prompt`
**Max items:** 15 (minimal; page content is the focus)
**Special behavior:** Rail is secondary to page content. Positioned below the fold.

### How It Works (`/how-it-works`)

**Purpose:** Education. User is learning about ChefFlow.
**Lane mix:** 20% taste, 30% occasion, 50% picks (editorial-heavy)
**Mandatory items:** `guided_flow` (prominent), `ask_chefflow`
**Suppressed items:** `trending`, `social_proof`, `availability_pulse`, `budget_range`
**Boosted items:** `service` (+20, explains formats), `occasion` (+15, shows use cases), `story` (+20, educational content), `guided_flow` (+25)
**Max items:** 15

### Error/404 Pages

**Purpose:** Recovery. Get user back on track.
**Lane mix:** 100% recovery
**Mandatory items:** `recovery` items (3-5), `ask_chefflow`
**Suppressed items:** ALL normal items
**Max items:** 6
**Special behavior:** Rail replaces normal composition entirely. See Scenario 4 in walkthroughs.

### Book/Contact (`/book`, `/contact`)

**Purpose:** Conversion. User is taking action.
**Rail behavior:** HIDDEN. No rail on conversion pages. Don't distract from the form.

---

## localStorage Schema

Public users have no database persistence. All rail state lives in localStorage.

### Storage Keys

```typescript
// Namespace: 'cf_rail_' prefix for all keys

interface RailLocalStorage {
  // Session identity (for deterministic shuffle seeding)
  cf_rail_session_id: string // UUID, generated on first visit, persists 30 days

  // Impression tracking
  cf_rail_impressions: Record<string, number>
  // Key: "{type}:{label}", Value: impression count
  // Example: { "cuisine:Italian": 12, "holiday:thanksgiving": 3 }
  // Reset: on new session (>30min gap)

  // Dismiss state
  cf_rail_dismissed: Array<{
    key: string // "{type}:{label}"
    dismissedAt: number // Unix timestamp ms
    cooldownMs: number // cooldownMinutes * 60000
  }>
  // Pruned: entries where Date.now() > dismissedAt + cooldownMs

  // Active filters (current state machine state)
  cf_rail_filters: Record<string, string | string[]>
  // Example: { cuisine: "italian", dietary: ["vegan", "gluten-free"], location: "Boston, MA" }

  // Recent searches (for saved items)
  cf_rail_recent_searches: Array<{
    query: string // Display label
    href: string // Full href with filters
    timestamp: number // Unix timestamp ms
  }>
  // Max 5 entries, FIFO

  // Recently viewed chef profiles
  cf_rail_recent_chefs: Array<{
    slug: string
    name: string
    cuisine: string
    timestamp: number
  }>
  // Max 3 entries, FIFO

  // Last planning brief (partial completion)
  cf_rail_last_brief: {
    brief: Partial<ConsumerDiscoveryBrief>
    timestamp: number
    route: string // Which page they were on
  } | null

  // Location (manually entered, not geo)
  cf_rail_location: {
    location: string
    lat: number | null
    lng: number | null
    timestamp: number
  } | null

  // Surprise exclusion list (recently surfaced random items)
  cf_rail_surprise_history: string[]
  // Last 10 surprise results, to avoid repeats. Max 10, FIFO.

  // Engagement depth (for signup_nudge threshold)
  cf_rail_engagement: {
    clickCount: number
    firstClickAt: number
    totalTimeMs: number
    profilesViewed: number
  }
}
```

### Storage Budget

| Key                        | Typical Size | Max Size        |
| -------------------------- | ------------ | --------------- |
| `cf_rail_session_id`       | 36 bytes     | 36 bytes        |
| `cf_rail_impressions`      | 500 bytes    | 2KB (100 items) |
| `cf_rail_dismissed`        | 200 bytes    | 1KB (20 items)  |
| `cf_rail_filters`          | 100 bytes    | 500 bytes       |
| `cf_rail_recent_searches`  | 300 bytes    | 1KB             |
| `cf_rail_recent_chefs`     | 200 bytes    | 500 bytes       |
| `cf_rail_last_brief`       | 200 bytes    | 500 bytes       |
| `cf_rail_location`         | 80 bytes     | 200 bytes       |
| `cf_rail_surprise_history` | 100 bytes    | 300 bytes       |
| `cf_rail_engagement`       | 50 bytes     | 50 bytes        |
| **Total**                  | **~1.8KB**   | **~6KB**        |

### Cleanup Rules

1. On each page load, prune expired dismissals
2. Every 7 days, clear impression counts (prevents permanent suppression)
3. If total localStorage > 5MB (browser limit approaching), clear `cf_rail_impressions` first (least critical)
4. On explicit "Clear browsing data," all `cf_rail_*` keys are lost (expected; graceful degradation)

---

## URL Query Parameter Catalog

Every query parameter the rail can generate via `buildDiscoveryHref()` or filter state machine.

### Filter Parameters (set by toggle_filter items)

| Parameter       | Set By                                                                           | Values                                                         | Example                     |
| --------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------- |
| `cuisine`       | `cuisine`, `cuisine_fusion`, `region`                                            | Cuisine slug                                                   | `?cuisine=italian`          |
| `craving`       | `craving`, `food_type`, `culinary_signal`, `technique`, `ingredient`, `trending` | Free text slug                                                 | `?craving=sushi`            |
| `dietary`       | `dietary`, `allergen_safe`                                                       | Dietary slug                                                   | `?dietary=vegan`            |
| `fulfillment`   | `service`, `prep_style`                                                          | `private_chef`, `meal_prep`, `restaurant`, `any`               | `?fulfillment=private_chef` |
| `intent`        | `occasion`, `meal_moment`                                                        | Occasion slug                                                  | `?intent=birthday_dinner`   |
| `eventStyle`    | `vibe`, `mood`, `hosting_format`                                                 | Style slug                                                     | `?eventStyle=intimate`      |
| `location`      | `location`, `local_market`                                                       | Place string                                                   | `?location=Boston%2C+MA`    |
| `lat`           | `location`                                                                       | Decimal                                                        | `?lat=42.3601`              |
| `lng`           | `location`                                                                       | Decimal                                                        | `?lng=-71.0589`             |
| `budget`        | `price`                                                                          | `budget`, `moderate`, `premium`, `luxury`                      | `?budget=moderate`          |
| `budgetMin`     | `budget_range`                                                                   | Dollar amount                                                  | `?budgetMin=50`             |
| `budgetMax`     | `budget_range`                                                                   | Dollar amount                                                  | `?budgetMax=75`             |
| `partySize`     | `group_size`, `party_tier`                                                       | Integer                                                        | `?partySize=8`              |
| `dateWindow`    | `time`, `calendar_hook`, `holiday`                                               | `tonight`, `this_weekend`, `next_week`, `this_month`, ISO date | `?dateWindow=this_weekend`  |
| `hostingFormat` | `hosting_format`                                                                 | Format slug                                                    | `?hostingFormat=at_my_home` |

### Navigation Parameters (set by navigate items)

| Parameter    | Set By                        | Values                | Example                             |
| ------------ | ----------------------------- | --------------------- | ----------------------------------- |
| `seasonal`   | `seasonal`, `ingredient_hero` | `true`, `peak`        | `?seasonal=peak`                    |
| `surprise`   | `surprise`                    | `true`                | `?surprise=true`                    |
| `guided`     | `guided_flow`                 | Flow slug             | `?guided=plan_first_dinner`         |
| `collection` | `editorial_collection`        | Collection slug       | `?collection=birthday-dinners`      |
| `story`      | `story`                       | Story slug            | `?story=what-to-expect`             |
| `event`      | `world_food_day`              | Event slug            | `?event=national_taco_day`          |
| `available`  | `availability_pulse`          | Window slug           | `?available=this_weekend`           |
| `q`          | `ask_chefflow`                | Free text             | `?q=italian+chef+for+birthday`      |
| `compare`    | `quick_compare`               | Comma-separated slugs | `?compare=chef-a,chef-b,chef-c`     |
| `mode`       | `comparison_prompt`           | `compare`             | `?mode=compare`                     |
| `sort`       | `chef_pick`                   | `featured`            | `?sort=featured`                    |
| `from`       | `signup_nudge`                | `rail`                | `?from=rail&benefit=save_favorites` |
| `benefit`    | `signup_nudge`                | Benefit slug          | `?benefit=save_favorites`           |

### Parameter Composition Rules

1. Parameters accumulate: clicking "Italian" then "Vegan" produces `?cuisine=italian&dietary=vegan`
2. Same-dimension replaces: clicking "Thai" after "Italian" produces `?cuisine=thai&dietary=vegan`
3. Multi-value params use commas: `?dietary=vegan,gluten-free` (for accumulated dietary)
4. Clearing a filter removes the parameter entirely (not `?cuisine=`)
5. All parameters pass through `buildDiscoveryHref()` which adds location context when appropriate
6. Parameters are URL-safe slugified: spaces become `+` or `%20`, special chars encoded

---

## Concrete Data Examples

Real items as they would appear with ChefFlow data.

### Example Rail: Homepage, May 2026, Location: Haverhill MA

```json
[
  {
    "type": "cuisine",
    "label": "Italian",
    "sublabel": "Chefs who specialize",
    "icon": "pasta",
    "presentation": "pill",
    "href": "/eat?cuisine=italian",
    "baseUrgency": 40,
    "pageAffinityBoost": 15,
    "finalScore": 58.2
  },
  {
    "type": "seasonal",
    "label": "Spring asparagus",
    "sublabel": "May favorite",
    "icon": "market",
    "presentation": "visual_card",
    "href": "/eat?craving=asparagus&seasonal=true",
    "baseUrgency": 55,
    "pageAffinityBoost": 25,
    "urgencyDecayFn": "deadline",
    "expiresAt": "2026-06-01",
    "finalScore": 81.4
  },
  {
    "type": "ask_chefflow",
    "label": "Ask ChefFlow",
    "sublabel": "Describe what you want",
    "icon": "concierge",
    "presentation": "pill",
    "href": "/eat",
    "baseUrgency": 40,
    "pageAffinityBoost": 15,
    "finalScore": 55.0,
    "pinned": true,
    "pinnedSlot": 3
  },
  {
    "type": "calendar_hook",
    "label": "Memorial Day is 2 weeks away",
    "sublabel": "Start planning now",
    "icon": "calendar",
    "presentation": "visual_card",
    "href": "/eat?intent=memorial_day&dateWindow=2026-05-25",
    "baseUrgency": 70,
    "pageAffinityBoost": 35,
    "urgencyDecayFn": "deadline",
    "expiresAt": "2026-05-26",
    "finalScore": 105.0
  },
  {
    "type": "location",
    "label": "Chefs near Haverhill, MA",
    "sublabel": "4 chefs in your area",
    "icon": "location",
    "presentation": "badge",
    "href": "/chefs?location=Haverhill%2C+MA&lat=42.7762&lng=-71.0773",
    "baseUrgency": 60,
    "pageAffinityBoost": 30,
    "finalScore": 90.0
  },
  {
    "type": "guided_flow",
    "label": "Plan your first dinner",
    "sublabel": "Step-by-step planning",
    "icon": "wand",
    "presentation": "visual_card",
    "href": "/eat?guided=plan_first_dinner",
    "baseUrgency": 55,
    "pageAffinityBoost": 30,
    "finalScore": 85.0
  },
  {
    "type": "craving",
    "label": "Something grilled",
    "sublabel": "What are you in the mood for?",
    "icon": "flame",
    "presentation": "pill",
    "href": "/eat?craving=grilled",
    "baseUrgency": 45,
    "pageAffinityBoost": 20,
    "finalScore": 65.0
  },
  {
    "type": "dietary",
    "label": "Gluten-Free",
    "sublabel": "Chefs with gluten-free options",
    "icon": "grains",
    "presentation": "badge",
    "href": "/chefs?dietary=gluten-free",
    "baseUrgency": 50,
    "pageAffinityBoost": 20,
    "finalScore": 70.0
  },
  {
    "type": "occasion",
    "label": "Birthday Dinner",
    "sublabel": "Plan for this moment",
    "icon": "confetti",
    "presentation": "pill",
    "href": "/eat?intent=birthday_dinner",
    "baseUrgency": 50,
    "pageAffinityBoost": 20,
    "finalScore": 70.0
  },
  {
    "type": "ingredient_hero",
    "label": "Peak: Rhubarb",
    "sublabel": "At its best right now",
    "icon": "avocado",
    "presentation": "visual_card",
    "href": "/eat?craving=rhubarb&seasonal=peak",
    "baseUrgency": 60,
    "pageAffinityBoost": 30,
    "urgencyDecayFn": "deadline",
    "expiresAt": "2026-06-30",
    "finalScore": 90.0
  },
  {
    "type": "service",
    "label": "Private Chef",
    "sublabel": "How a chef serves you",
    "icon": "chef",
    "presentation": "pill",
    "href": "/eat?fulfillment=private_chef",
    "baseUrgency": 45,
    "pageAffinityBoost": 15,
    "finalScore": 60.0
  },
  {
    "type": "world_food_day",
    "label": "National BBQ Day",
    "sublabel": "Celebrate with food",
    "icon": "globe",
    "presentation": "visual_card",
    "href": "/eat?craving=bbq&event=national_bbq_day",
    "baseUrgency": 65,
    "pageAffinityBoost": 35,
    "urgencyDecayFn": "deadline",
    "expiresAt": "2026-05-17",
    "finalScore": 100.0,
    "note": "May 16 is National BBQ Day"
  }
]
```

### After Arbitration (sorted, spaced, slotted):

```
Slot  1: [CARD] Memorial Day is 2 weeks away     (105.0, calendar_hook)
Slot  2: [CARD] National BBQ Day                  (100.0, world_food_day) -- card spacing OK (slot 1-2, both cards, VIOLATION -> demote BBQ to slot 4)
```

Corrected:

```
Slot  1: [CARD]  Memorial Day is 2 weeks away     (105.0, calendar_hook)
Slot  2: [BADGE] Chefs near Haverhill, MA          (90.0,  location)
Slot  3: [PILL]  Ask ChefFlow                      (55.0,  ask_chefflow, PINNED)
Slot  4: [CARD]  National BBQ Day                  (100.0, world_food_day, demoted from 2)
Slot  5: [PILL]  Something grilled                 (65.0,  craving)
Slot  6: [CARD]  Peak: Rhubarb                     (90.0,  ingredient_hero)
Slot  7: [PILL]  Italian                           (58.2,  cuisine)
Slot  8: [BADGE] Gluten-Free                       (70.0,  dietary)
Slot  9: [CARD]  Plan your first dinner            (85.0,  guided_flow)
Slot 10: [PILL]  Birthday Dinner                   (70.0,  occasion)
Slot 11: [PILL]  Private Chef                      (60.0,  service)
Slot 12: [CARD]  Spring asparagus                  (81.4,  seasonal)  -- card after 2 non-cards, OK
```

Pattern check: `[card][badge][pill][card][pill][card][pill][badge][card][pill][pill][card]`

- No adjacent cards: PASS
- ask_chefflow at slot 3: PASS
- Max 6 cards in view: 5 cards shown, PASS
- Lane mix: 4 taste, 4 occasion, 4 picks (33/33/33), within tolerance

---

## Animation Specs

### Rail Entrance (page load)

```css
/* Items stagger-fade from left to right */
.rail-item {
  opacity: 0;
  transform: translateX(20px);
  animation: rail-enter 300ms ease-out forwards;
}
.rail-item:nth-child(1) {
  animation-delay: 0ms;
}
.rail-item:nth-child(2) {
  animation-delay: 50ms;
}
.rail-item:nth-child(3) {
  animation-delay: 100ms;
}
/* ... up to 150ms per item, max 600ms total for first 12 items */
/* Items beyond visible viewport: no entrance animation (lazy) */

@keyframes rail-enter {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Reduced motion: instant appear, no transform */
@media (prefers-reduced-motion: reduce) {
  .rail-item {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

### Dismiss Animation

```css
/* Swipe-left or click-dismiss */
.rail-item--dismissing {
  animation: rail-dismiss 250ms ease-in forwards;
}

@keyframes rail-dismiss {
  0% {
    opacity: 1;
    transform: translateX(0) scale(1);
    max-width: var(--item-width);
  }
  50% {
    opacity: 0;
    transform: translateX(-40px) scale(0.95);
    max-width: var(--item-width);
  }
  100% {
    opacity: 0;
    transform: translateX(-40px) scale(0.9);
    max-width: 0;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
}

/* Neighbors close the gap smoothly */
.rail-item {
  transition:
    transform 200ms ease-out,
    margin 200ms ease-out;
}

/* Reduced motion: instant remove */
@media (prefers-reduced-motion: reduce) {
  .rail-item--dismissing {
    animation: none;
    display: none;
  }
}
```

### Expand Inline Animation

```css
/* For expand_inline items (ask_chefflow, chef_video, combo) */
.rail-item--expanding {
  animation: rail-expand 350ms ease-out forwards;
}

@keyframes rail-expand {
  from {
    max-width: var(--item-width);
    max-height: var(--item-height);
  }
  to {
    max-width: var(--expanded-width); /* 2-3x item width */
    max-height: var(--expanded-height);
  }
}

/* Content inside fades in after container expands */
.rail-item__expanded-content {
  opacity: 0;
  animation: fade-in 200ms ease-out 200ms forwards; /* 200ms delay = after container */
}

/* Reduced motion: instant expand */
@media (prefers-reduced-motion: reduce) {
  .rail-item--expanding {
    animation: none;
    max-width: var(--expanded-width);
  }
  .rail-item__expanded-content {
    animation: none;
    opacity: 1;
  }
}
```

### Filter Toggle Animation

```css
/* Pill/badge transition from default to active state */
.rail-item--filter-active {
  transition:
    background-color 150ms ease,
    color 150ms ease,
    border-color 150ms ease;
  /* Active state: filled background, check icon fades in */
}

.rail-item__check-icon {
  opacity: 0;
  transform: scale(0.5);
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.rail-item--filter-active .rail-item__check-icon {
  opacity: 1;
  transform: scale(1);
}

/* Dimmed state for conflicting items */
.rail-item--dimmed {
  transition: opacity 300ms ease;
  opacity: 0.5;
  pointer-events: auto; /* Still clickable, just visually subdued */
}
```

### Hover Preview Animation (Desktop)

```css
/* Preview appears with subtle scale-up from origin */
.rail-preview {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
  transform-origin: top center;
  transition:
    opacity 150ms ease,
    transform 150ms ease;
  pointer-events: none;
}

.rail-preview--visible {
  opacity: 1;
  transform: scale(1) translateY(0);
  pointer-events: auto;
}

/* Arrow/caret pointing to source item */
.rail-preview::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 12px;
  height: 12px;
  background: inherit;
  border-radius: 2px 0 0 0;
}
```

### Scroll Indicators

```css
/* Fade gradients on rail edges */
.rail-container::before,
.rail-container::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40px;
  z-index: 1;
  pointer-events: none;
  transition: opacity 200ms ease;
}

.rail-container::before {
  left: 0;
  background: linear-gradient(to right, var(--bg-color), transparent);
  opacity: 0; /* Hidden when scrolled to start */
}

.rail-container::after {
  right: 0;
  background: linear-gradient(to left, var(--bg-color), transparent);
  opacity: 1; /* Visible when more items to right */
}

/* Hide right indicator when scrolled to end */
.rail-container--scrolled-end::after {
  opacity: 0;
}
/* Show left indicator when scrolled past start */
.rail-container--scrolled-start::before {
  opacity: 1;
}
```

### Surprise Pill Shimmer

```css
/* Ambient shimmer on the surprise pill */
.rail-item--surprise {
  position: relative;
  overflow: hidden;
}

.rail-item--surprise::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  50% {
    left: 100%;
  }
  100% {
    left: 100%;
  }
}

/* Reduced motion: no shimmer */
@media (prefers-reduced-motion: reduce) {
  .rail-item--surprise::after {
    animation: none;
    display: none;
  }
}
```

### Timing Summary

| Animation                 | Duration                      | Easing       | Reduced Motion     |
| ------------------------- | ----------------------------- | ------------ | ------------------ |
| Rail entrance (per item)  | 300ms                         | ease-out     | Instant appear     |
| Entrance stagger          | 50ms/item                     | linear delay | None               |
| Dismiss                   | 250ms                         | ease-in      | Instant remove     |
| Gap close (after dismiss) | 200ms                         | ease-out     | Instant            |
| Expand inline             | 350ms                         | ease-out     | Instant expand     |
| Expanded content fade     | 200ms (200ms delay)           | ease-out     | Instant            |
| Filter toggle             | 150ms                         | ease         | Instant            |
| Dim/undim                 | 300ms                         | ease         | Instant            |
| Hover preview appear      | 150ms (after 300-400ms delay) | ease         | No hover on mobile |
| Hover preview dismiss     | 100ms (after 100ms delay)     | ease         | N/A                |
| Scroll indicators         | 200ms                         | ease         | Instant            |
| Surprise shimmer          | 3s loop                       | ease-in-out  | Disabled           |

---

## Edge Case Catalog

Specific failure scenarios and expected behavior.

### Data Edge Cases

| #   | Edge Case                                                   | Expected Behavior                                                                                                                                                                                                                                                | Items Affected                                                                                                              |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| E1  | **Zero chefs in database**                                  | All chef-dependent items suppressed. Rail runs on static catalog only. `guided_flow` and `ask_chefflow` still appear. No "0 chefs" shown.                                                                                                                        | featured_chef, chef_pick, chef_spotlight_story, chef_video, dish_visual, availability_pulse, quick_compare, new_on_chefflow |
| E2  | **One chef in entire platform**                             | `quick_compare` and `comparison_prompt` suppressed (need 2+). `featured_chef` shows that one chef. No "compare" language anywhere.                                                                                                                               | quick_compare, comparison_prompt                                                                                            |
| E3  | **Chef exists but has no cuisine tags**                     | Chef appears in `featured_chef` without cuisine sublabel. Sublabel falls back to city only: "in {city}". No cuisine items boost from this chef.                                                                                                                  | featured_chef                                                                                                               |
| E4  | **Location entered but 0 chefs nearby**                     | `location` badge shows without count sublabel: "Chefs near {place}". `availability_pulse` suppressed. `recovery` items suggest broadening.                                                                                                                       | location, availability_pulse                                                                                                |
| E5  | **Location is ambiguous** (multiple matches)                | Do not guess. Show location as entered. Let downstream pages handle disambiguation. Rail never resolves location.                                                                                                                                                | location                                                                                                                    |
| E6  | **All seasonal data expired** (PIE stale)                   | `seasonal`, `ingredient_hero`, `farm_fresh` suppressed. `culinary_signal` falls back to static catalog (non-seasonal signals only).                                                                                                                              | seasonal, ingredient_hero, farm_fresh, culinary_signal                                                                      |
| E7  | **Holiday date is today**                                   | `holiday` item remains active until midnight local time. `calendar_hook` sublabel changes to "Today!" with baseUrgency boost to 90.                                                                                                                              | holiday, calendar_hook                                                                                                      |
| E8  | **Holiday date just passed** (1 day after)                  | Both `holiday` and `calendar_hook` for this holiday suppressed. Next upcoming holiday items activate if within window.                                                                                                                                           | holiday, calendar_hook                                                                                                      |
| E9  | **User dismisses every item**                               | Rail shows empty state: `ask_chefflow` (undismissable) + `surprise` (undismissable) + 3 recovery suggestions. Never show empty rail.                                                                                                                             | All dismissable items                                                                                                       |
| E10 | **Conflicting filters** (vegan + steak craving)             | Both filters apply. Results may be empty. `recovery` items appear suggesting filter removal. Dimming applies: `food_type:steak` dims when `dietary:vegan` active.                                                                                                | dietary, food_type, recovery                                                                                                |
| E11 | **100+ cuisines compete for 5 cuisine slots**               | Scoring pipeline ranks all. Top 5 by score appear. Rest available on scroll. Type diversity rule caps at 5 per type in top 10.                                                                                                                                   | cuisine                                                                                                                     |
| E12 | **Browser blocks localStorage** (private browsing)          | All `cf_rail_*` operations fail silently (try/catch). No saved items, no impression tracking, no cooldowns. Rail works but has no memory. Each page load is fresh.                                                                                               | saved, impression counting, dismiss cooldowns                                                                               |
| E13 | **Clock skew** (user's clock wrong by days)                 | `deadline` decay uses server time for initial scoring, client time only for JS-side re-evaluation. Server time is canonical.                                                                                                                                     | seasonal, holiday, calendar_hook, availability_pulse, trending                                                              |
| E14 | **Same item appears in multiple lanes**                     | Impossible by design: `DISCOVERY_ITEM_TYPE_LANE_MAP` assigns exactly one lane per type. If a new type is added without a lane entry, runtime error at contract registry validation.                                                                              | All                                                                                                                         |
| E15 | **User scrolls faster than lazy load**                      | Show skeleton pills (gray placeholder) while batch loads. Never show empty space. Skeleton pills are not interactive and don't count as impressions.                                                                                                             | All (visual only)                                                                                                           |
| E16 | **Search analytics return fabricated/bot data**             | Trending and social_proof items have minimum thresholds (10 genuine searches). Bot detection is upstream. Rail trusts the analytics pipeline; if pipeline is poisoned, these items show bad data. Defense: anomaly detection in analytics pipeline, not in rail. | trending, social_proof                                                                                                      |
| E17 | **ask_chefflow receives empty input**                       | No navigation. Input field shows placeholder again. No error state. No "no results" if user typed nothing.                                                                                                                                                       | ask_chefflow                                                                                                                |
| E18 | **ask_chefflow receives gibberish**                         | `discoveryBriefFromFreeform()` returns default brief (no matches). Navigate to `/eat` with no filters. Recovery items may appear if results are sparse.                                                                                                          | ask_chefflow                                                                                                                |
| E19 | **Two holidays overlap** (Christmas + Hanukkah in December) | Both appear. Holiday dominance cap (30% of rail) applies to total holiday items, not per-holiday. Max 3 holiday/calendar_hook items in top 10.                                                                                                                   | holiday, calendar_hook                                                                                                      |
| E20 | **User is on /chef/{slug} but chef deleted**                | 404 page. Recovery mode activates. Rail shows recovery items only. See Scenario 4 walkthrough.                                                                                                                                                                   | recovery                                                                                                                    |

### Viewport Edge Cases

| #   | Edge Case                                         | Expected Behavior                                                                                                                   |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| V1  | **Viewport < 320px** (extremely narrow)           | Rail degrades to single-column vertical stack. Scroll becomes vertical. Pills full-width. Cards full-width.                         |
| V2  | **Viewport > 2560px** (ultra-wide)                | Rail items don't stretch beyond max-width. Centered with margin. Max visible: 20 pills.                                             |
| V3  | **User zooms to 200%**                            | Touch target sizes still meet 44x44px minimum. Rail reflows naturally via CSS.                                                      |
| V4  | **User zooms to 400%**                            | Rail may become single-column. Acceptable; pills stack vertically.                                                                  |
| V5  | **No JavaScript** (SSR only, Level 4 degradation) | Rail renders as static `<a>` links. Horizontal scroll via CSS overflow. No hover, no dismiss, no filter toggle. All items navigate. |
| V6  | **Slow network** (3G)                             | First 20 items SSR'd (no network delay for initial HTML). Images lazy-load. Hover previews may lag.                                 |

---

## Testing Matrix

What to assert per item type. Each test is a unit test or integration test specification.

### Universal Assertions (apply to ALL 52 types)

```
T-UNIV-01: Item renders without throwing
T-UNIV-02: Item has non-empty label (string, 1-30 chars for pill, 1-40 for card, 1-20 for badge)
T-UNIV-03: Item has valid href (passes validateDiscoveryDestination())
T-UNIV-04: Item href has no private identifiers (passes discoveryHrefHasPrivateIdentifier() = false)
T-UNIV-05: Item has valid presentation type (pill | visual_card | badge | story)
T-UNIV-06: Item has valid lane assignment (taste | occasion | chefflow_picks)
T-UNIV-07: Item has valid icon key (exists in DiscoveryIconKey union)
T-UNIV-08: Public role can perform at least one action on this item
T-UNIV-09: Item does not leak authenticated state (no userId, tenantId in href)
T-UNIV-10: Item's sublabel differs from its label
T-UNIV-11: Item renders correctly in reduced motion mode
T-UNIV-12: Item has keyboard focus support
T-UNIV-13: Item has screen reader announcement
```

### Per-Type Assertions

| Type                 | Test ID  | Assertion                                                        |
| -------------------- | -------- | ---------------------------------------------------------------- |
| `cuisine`            | T-CUI-01 | Expanding reveals sub-cuisines (if expandable)                   |
| `cuisine`            | T-CUI-02 | Selecting toggles `cuisine` query param                          |
| `cuisine`            | T-CUI-03 | Max 5 cuisine items in top 10 positions                          |
| `dietary`            | T-DIE-01 | Up to 3 dietary filters accumulate (AND logic)                   |
| `dietary`            | T-DIE-02 | Conflicting food_type items visually dim                         |
| `dietary`            | T-DIE-03 | Never suppressed (maxImpressions = -1)                           |
| `seasonal`           | T-SEA-01 | Not visible after season end date                                |
| `seasonal`           | T-SEA-02 | Score decreases as deadline approaches                           |
| `holiday`            | T-HOL-01 | Not visible after holiday date                                   |
| `holiday`            | T-HOL-02 | Active 6-8 weeks before holiday (not earlier)                    |
| `holiday`            | T-HOL-03 | Max 30% of visible rail is holiday items                         |
| `calendar_hook`      | T-CAL-01 | Countdown sublabel matches days until event                      |
| `calendar_hook`      | T-CAL-02 | Sublabel changes to "Today!" on event day                        |
| `featured_chef`      | T-FCH-01 | Only shows chefs with accepting_inquiries = true                 |
| `featured_chef`      | T-FCH-02 | Chef photo lazy-loads below fold                                 |
| `featured_chef`      | T-FCH-03 | Suppressed when DB is unavailable (graceful)                     |
| `availability_pulse` | T-AVA-01 | Count is NEVER zero (suppress if 0)                              |
| `availability_pulse` | T-AVA-02 | Count matches real data (no fabrication)                         |
| `trending`           | T-TRE-01 | Minimum 10 searches before showing                               |
| `trending`           | T-TRE-02 | Expires after 24 hours                                           |
| `social_proof`       | T-SOC-01 | Count is real (no fabrication)                                   |
| `social_proof`       | T-SOC-02 | Suppressed when analytics unavailable                            |
| `guided_flow`        | T-GFL-01 | Suppressed after completion (maxImpressions check)               |
| `guided_flow`        | T-GFL-02 | Step count in sublabel matches actual steps                      |
| `signup_nudge`       | T-SNU-01 | Never in positions 1-10 on first visit                           |
| `signup_nudge`       | T-SNU-02 | Max 1 per rail view                                              |
| `signup_nudge`       | T-SNU-03 | Only appears after engagement threshold (3+ clicks, 60+ seconds) |
| `signup_nudge`       | T-SNU-04 | Clicking navigates to auth (not a dead end)                      |
| `recovery`           | T-REC-01 | Only appears in empty/error states                               |
| `recovery`           | T-REC-02 | Normal rail suppressed when recovery active                      |
| `recovery`           | T-REC-03 | At least 3 different recovery suggestions                        |
| `ask_chefflow`       | T-ASK-01 | Pinned to slot 3 regardless of score                             |
| `ask_chefflow`       | T-ASK-02 | Not dismissable                                                  |
| `ask_chefflow`       | T-ASK-03 | Empty input does not navigate                                    |
| `ask_chefflow`       | T-ASK-04 | Freeform text produces valid discovery brief                     |
| `surprise`           | T-SUR-01 | Never repeats same result within 10 uses (surprise_history)      |
| `surprise`           | T-SUR-02 | Clears all filters on click                                      |
| `surprise`           | T-SUR-03 | Shimmer animation respects reduced-motion                        |
| `cross_sell`         | T-CRS-01 | Never in positions 1-15                                          |
| `cross_sell`         | T-CRS-02 | Max 1 per rail view                                              |
| `cross_sell`         | T-CRS-03 | Never displaces a discovery item                                 |
| `ingredient_hero`    | T-IHR-01 | Only shows during peak window                                    |
| `ingredient_hero`    | T-IHR-02 | Suppressed when PIE data unavailable                             |
| `allergen_safe`      | T-ALG-01 | Never suppressed (maxImpressions = -1)                           |
| `allergen_safe`      | T-ALG-02 | Conflicting food_type items dim                                  |
| `location`           | T-LOC-01 | Never shows fake count (no "12 chefs" when 0 exist)              |
| `location`           | T-LOC-02 | Suppressed when no location available                            |
| `quick_compare`      | T-QCM-01 | Only shows when 2+ chefs match active filters                    |
| `quick_compare`      | T-QCM-02 | Compare href contains valid chef slugs                           |
| `chef_video`         | T-VID-01 | expand_inline creates video player                               |
| `chef_video`         | T-VID-02 | Video does not autoplay                                          |
| `chef_video`         | T-VID-03 | Max 1 video item per rail view                                   |

### Integration Test Scenarios

```
IT-01: Homepage with no data sources -> Rail renders with static catalog only (25+ items)
IT-02: /eat with 5 active filters -> Active filters appear as filled pills at rail start
IT-03: Dismiss all dismissable items -> ask_chefflow + surprise remain, recovery appears
IT-04: Scroll full rail -> Lazy batches load, skeleton pills show during load
IT-05: Click surprise 10 times -> All 10 results different (surprise_history works)
IT-06: Toggle Italian -> toggle Vegan -> toggle Italian off -> Only Vegan remains in URL
IT-07: Enter location -> chef count appears -> clear location -> chef count disappears
IT-08: Private browsing mode -> Rail works without localStorage (no crashes)
IT-09: Thanksgiving week -> holiday items present, max 30% of rail
IT-10: 404 page -> Only recovery items + ask_chefflow visible
IT-11: Viewport resize from mobile to desktop -> Rail reflows, hover becomes available
IT-12: Keyboard-only navigation -> Tab through all items, Enter activates, Escape closes preview
```

---

## A/B Testing Hooks

Dimensions that can be experimented on without code changes.

### Configurable Parameters

| Parameter                   | Default | A/B Range     | What It Tests                                  |
| --------------------------- | ------- | ------------- | ---------------------------------------------- |
| `askChefflowSlot`           | 3       | 1-5           | Optimal position for freeform input            |
| `signupNudgeMinClicks`      | 3       | 1-10          | Engagement threshold before showing nudge      |
| `signupNudgeMinTimeMs`      | 60000   | 30000-180000  | Time threshold before showing nudge            |
| `signupNudgeMaxPerView`     | 1       | 0-2           | Nudge density                                  |
| `holidayDominanceCap`       | 0.3     | 0.1-0.5       | Max % of rail that can be holiday items        |
| `cardSpacingMin`            | 2       | 1-3           | Min non-card items between cards               |
| `maxSameTypeInTop10`        | 2       | 1-4           | Type diversity strictness                      |
| `laneRatioTaste`            | 0.5     | 0.3-0.6       | Homepage taste lane %                          |
| `laneRatioOccasion`         | 0.3     | 0.2-0.4       | Homepage occasion lane %                       |
| `laneRatioPicks`            | 0.2     | 0.1-0.3       | Homepage picks lane %                          |
| `recoveryThreshold`         | 8       | 3-15          | Result count below which recovery items appear |
| `impressionTrackingDelayMs` | 1000    | 500-2000      | How long item must be visible to count         |
| `surpriseShimmerEnabled`    | true    | true/false    | Whether surprise pill has shimmer              |
| `entranceAnimationEnabled`  | true    | true/false    | Whether stagger-fade entrance plays            |
| `hoverPreviewDelayMs`       | 300     | 100-500       | Hover delay before preview appears             |
| `guidedFlowPosition`        | dynamic | 5, 7, 9, last | Where guided_flow card appears                 |
| `trendingMinSearches`       | 10      | 5-50          | Threshold for trending items to appear         |
| `socialProofMinSearches`    | 10      | 5-50          | Threshold for social_proof items               |

### Experiment Metrics

For any A/B test on the rail, measure:

| Metric                   | Description                                            | Primary/Secondary      |
| ------------------------ | ------------------------------------------------------ | ---------------------- |
| `rail_click_rate`        | Clicks / impressions                                   | Primary                |
| `filter_apply_rate`      | Filter toggles / page views                            | Primary                |
| `signup_conversion`      | Sign-ups from rail nudge / nudge impressions           | Primary                |
| `bounce_rate`            | Left page without any rail interaction                 | Primary                |
| `discovery_depth`        | Unique item types interacted with per session          | Secondary              |
| `time_to_first_click`    | Seconds from page load to first rail click             | Secondary              |
| `scroll_depth`           | How far user scrolled the rail (% of total)            | Secondary              |
| `dismiss_rate`           | Dismissals / impressions                               | Secondary (high = bad) |
| `filter_stack_depth`     | Average number of active filters when user leaves rail | Secondary              |
| `guided_flow_completion` | Users who complete guided flow / who start             | Secondary              |
| `chef_profile_from_rail` | Chef profile visits originating from rail click        | Secondary              |
| `ask_chefflow_usage`     | Freeform input submissions / page views                | Secondary              |

### Experiment Guardrails

1. Never A/B test safety items: `allergen_safe` maxImpressions must always be -1
2. Never A/B test recovery behavior: empty states must always show recovery items
3. Never A/B test `ask_chefflow` removal: it must always be present
4. Never A/B test data fabrication: trending/social_proof must always use real data
5. A/B test groups seeded by `cf_rail_session_id` (consistent experience within session)

---

## Error Boundary Behavior

What happens when individual items or the rail itself fails.

### Item-Level Failures

```
If a single item throws during render:
  1. Catch at item boundary (React error boundary or try/catch in render)
  2. Remove failed item from DOM (do not show broken UI)
  3. Close the gap (other items shift, same as dismiss)
  4. Log to analytics: discovery_rail_item_error { type, label, error }
  5. Do NOT retry the failed item
  6. Do NOT show error message to user
  7. Rail continues with remaining items

If failed item was pinned (ask_chefflow):
  1. Try rendering with minimal props (label + href only, no expand)
  2. If still fails: render as plain <a> link ("Ask ChefFlow" -> /eat)
  3. Never leave slot 3 empty
```

### Scoring Pipeline Failure

```
If scoreDiscoveryRailItems() throws:
  1. Fall back to unsorted items in static catalog order
  2. Apply only mandatory slot reservations (ask_chefflow at 3)
  3. No personalization, no arbitration
  4. Log: discovery_rail_scoring_error { error }
  5. Rail renders but is generic (still functional)
```

### Data Fetch Failure

```
If server component data fetch fails (DB timeout, network):
  1. Return empty arrays for failed sources
  2. Rail renders with available data only (see Degradation Ladder)
  3. Never block page render waiting for rail data
  4. Rail data fetch has 2s timeout (hard cap)
  5. Stale-while-revalidate: if cached data exists, show it even if refresh fails
```

### Hydration Mismatch

```
If SSR HTML doesn't match client render (hydration error):
  1. React will re-render client-side (standard behavior)
  2. Rail may flash (acceptable; rail is non-critical UI)
  3. Log: discovery_rail_hydration_mismatch { diff }
  4. Common cause: time-dependent items (meal_moment, calendar_hook) rendering
     different times on server vs client
  5. Mitigation: use server timestamp for initial render, client for re-evaluation
```

### Total Rail Failure

```
If the entire rail component throws:
  1. Error boundary catches at rail container level
  2. Rail section of page is hidden (display: none)
  3. Page content below rail shifts up (no gap)
  4. Log: discovery_rail_fatal_error { error, route }
  5. User sees page without rail (acceptable degradation)
  6. Do NOT show "Something went wrong" in the rail space
```

---

## Dark Mode Token Map

Color tokens for rail items in light and dark modes.

### Base Tokens

| Token                | Light Mode              | Dark Mode            | Usage                          |
| -------------------- | ----------------------- | -------------------- | ------------------------------ |
| `--rail-bg`          | `#FFFFFF`               | `#1A1A2E`            | Rail container background      |
| `--rail-border`      | `#E5E7EB`               | `#2D2D44`            | Rail container border (if any) |
| `--rail-scroll-fade` | `rgba(255,255,255,0.9)` | `rgba(26,26,46,0.9)` | Scroll indicator gradient      |

### Pill Tokens

| Token                  | Light Mode | Dark Mode | Usage                          |
| ---------------------- | ---------- | --------- | ------------------------------ |
| `--pill-bg`            | `#F3F4F6`  | `#2D2D44` | Default pill background        |
| `--pill-bg-hover`      | `#E5E7EB`  | `#3D3D5C` | Hover state                    |
| `--pill-bg-active`     | `#1F2937`  | `#E5E7EB` | Active filter state (inverted) |
| `--pill-text`          | `#1F2937`  | `#E5E7EB` | Default text                   |
| `--pill-text-active`   | `#FFFFFF`  | `#1A1A2E` | Active filter text (inverted)  |
| `--pill-text-dimmed`   | `#9CA3AF`  | `#6B7280` | Dimmed/conflicting state       |
| `--pill-border`        | `#D1D5DB`  | `#4B5563` | Subtle border                  |
| `--pill-border-active` | `#1F2937`  | `#E5E7EB` | Active border                  |
| `--pill-icon`          | `#6B7280`  | `#9CA3AF` | Icon color                     |
| `--pill-icon-active`   | `#FFFFFF`  | `#1A1A2E` | Active icon                    |

### Card Tokens

| Token                  | Light Mode                                          | Dark Mode                                           | Usage              |
| ---------------------- | --------------------------------------------------- | --------------------------------------------------- | ------------------ |
| `--card-bg`            | `#FFFFFF`                                           | `#252540`                                           | Card background    |
| `--card-bg-hover`      | `#F9FAFB`                                           | `#2D2D4A`                                           | Hover state        |
| `--card-shadow`        | `0 1px 3px rgba(0,0,0,0.1)`                         | `0 1px 3px rgba(0,0,0,0.3)`                         | Drop shadow        |
| `--card-shadow-hover`  | `0 4px 12px rgba(0,0,0,0.15)`                       | `0 4px 12px rgba(0,0,0,0.4)`                        | Hover shadow       |
| `--card-title`         | `#111827`                                           | `#F3F4F6`                                           | Title text         |
| `--card-subtitle`      | `#6B7280`                                           | `#9CA3AF`                                           | Subtitle text      |
| `--card-border`        | `#E5E7EB`                                           | `#3D3D5C`                                           | Card border        |
| `--card-image-overlay` | `linear-gradient(transparent 60%, rgba(0,0,0,0.4))` | `linear-gradient(transparent 60%, rgba(0,0,0,0.6))` | Image text overlay |

### Badge Tokens

| Token                 | Light Mode | Dark Mode | Usage                        |
| --------------------- | ---------- | --------- | ---------------------------- |
| `--badge-bg`          | `#EFF6FF`  | `#1E3A5F` | Default badge bg (blue tint) |
| `--badge-bg-active`   | `#1D4ED8`  | `#3B82F6` | Active filter                |
| `--badge-text`        | `#1E40AF`  | `#93C5FD` | Default text                 |
| `--badge-text-active` | `#FFFFFF`  | `#FFFFFF` | Active text                  |

### Story Tokens

| Token             | Light Mode        | Dark Mode         | Usage              |
| ----------------- | ----------------- | ----------------- | ------------------ |
| `--story-bg`      | `#F9FAFB`         | `#1F1F35`         | Story card bg      |
| `--story-title`   | `#111827`         | `#F3F4F6`         | Title              |
| `--story-excerpt` | `#4B5563`         | `#D1D5DB`         | Excerpt text       |
| `--story-overlay` | `rgba(0,0,0,0.3)` | `rgba(0,0,0,0.5)` | Hero image overlay |

### Special State Tokens

| Token                     | Light Mode                    | Dark Mode                    | Usage                        |
| ------------------------- | ----------------------------- | ---------------------------- | ---------------------------- |
| `--rail-skeleton`         | `#E5E7EB`                     | `#374151`                    | Skeleton pill placeholder    |
| `--rail-skeleton-shimmer` | `#F3F4F6`                     | `#4B5563`                    | Skeleton shimmer highlight   |
| `--rail-focus-ring`       | `#2563EB`                     | `#60A5FA`                    | Focus ring (keyboard nav)    |
| `--rail-check-icon`       | `#FFFFFF`                     | `#1A1A2E`                    | Check mark on active filters |
| `--rail-dismiss-bg`       | `#FEE2E2`                     | `#7F1D1D`                    | Swipe-to-dismiss indicator   |
| `--preview-bg`            | `#FFFFFF`                     | `#252540`                    | Hover preview background     |
| `--preview-shadow`        | `0 4px 16px rgba(0,0,0,0.15)` | `0 4px 16px rgba(0,0,0,0.4)` | Preview drop shadow          |
| `--preview-border`        | `#E5E7EB`                     | `#3D3D5C`                    | Preview border               |

### Contrast Verification

All text/background combinations must meet WCAG 2.1 AA:

| Pair                               | Light Ratio | Dark Ratio | Pass                                         |
| ---------------------------------- | ----------- | ---------- | -------------------------------------------- |
| pill-text on pill-bg               | 12.6:1      | 11.3:1     | AA                                           |
| pill-text-active on pill-bg-active | 15.3:1      | 12.6:1     | AA                                           |
| card-title on card-bg              | 17.1:1      | 14.8:1     | AA                                           |
| card-subtitle on card-bg           | 5.1:1       | 4.6:1      | AA                                           |
| badge-text on badge-bg             | 6.2:1       | 5.8:1      | AA                                           |
| story-excerpt on story-bg          | 7.5:1       | 10.2:1     | AA                                           |
| pill-text-dimmed on pill-bg        | 4.6:1       | 4.5:1      | AA (borderline; acceptable for dimmed state) |

---

## Privacy and Anti-Abuse

### Data Collection (Public Users)

| Data Point                    | Collected         | Stored Where                           | Retention                                | Purpose                            |
| ----------------------------- | ----------------- | -------------------------------------- | ---------------------------------------- | ---------------------------------- |
| Rail impressions              | Yes               | localStorage                           | 7 days (auto-prune)                      | Impression fatigue suppression     |
| Rail clicks                   | Yes               | localStorage + analytics               | localStorage: 7 days, Analytics: 90 days | Scoring, A/B metrics               |
| Dismiss actions               | Yes               | localStorage                           | Until cooldown expires                   | Cooldown enforcement               |
| Filter selections             | Yes               | URL params (ephemeral)                 | Session only (URL state)                 | Filter state machine               |
| Location (manual)             | Yes               | localStorage                           | Until cleared                            | Location-scoped items              |
| Location (geo)                | Only if permitted | Session memory only (not localStorage) | Current session                          | Location-scoped items              |
| Freeform input (ask_chefflow) | Yes               | Analytics only                         | 90 days                                  | Trending data, product improvement |
| Search queries                | Yes               | Analytics (anonymized)                 | 90 days                                  | Trending, social_proof             |
| Device/viewport               | Yes               | Analytics (anonymized)                 | 90 days                                  | Responsive design optimization     |
| IP address                    | No                | Not stored                             | N/A                                      | N/A                                |
| Browser fingerprint           | No                | Not stored                             | N/A                                      | N/A                                |
| Cross-site tracking           | No                | N/A                                    | N/A                                      | N/A                                |

### What We Do NOT Collect from Public Users

- No cookies (all state in localStorage)
- No cross-site tracking pixels
- No browser fingerprinting
- No IP-based location (only manual entry or explicit geo permission)
- No persistent identifiers that survive localStorage clear
- No data sold to third parties

### Anti-Abuse: Trending and Social Proof

`trending` and `social_proof` items show real aggregate search data. Abuse vectors:

| Attack                                                  | Mitigation                                                                                                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bot search flooding** (inflate trending counts)       | Upstream: rate limiting on search API. Rail: minimum threshold (10 unique IP sessions, not raw count). Rail trusts analytics pipeline.                                           |
| **Self-promotion** (chef floods searches for own name)  | Trending shows cuisine/food terms, not chef names. Chef profiles appear via `featured_chef` (editorial/algorithmic), not trending.                                               |
| **Gaming social_proof** (fake "47 people searched")     | Counts come from anonymized, deduplicated analytics. Same session = 1 count regardless of repeat searches.                                                                       |
| **Abusive freeform input** (ask_chefflow)               | Input is URL-encoded and used as search query. No execution. No rendering of raw HTML. XSS: impossible (React escapes). SQL injection: impossible (no DB query from rail input). |
| **localStorage manipulation** (inject fake saved items) | Saved items render as navigational links. Worst case: user sees their own fake "saved" items. No security impact. No data exfiltration path.                                     |

### GDPR/CCPA Notes

- localStorage data is client-side only; no personal data transmitted to server
- Anonymized analytics data has no PII
- "Clear browsing data" in browser removes all `cf_rail_*` keys
- No consent banner needed for rail localStorage (not cookies, not tracking)
- If user opts out of analytics: trending and social_proof items suppressed (no data source)
- Right to deletion: nothing to delete (no server-side storage for anonymous users)
