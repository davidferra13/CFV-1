# Spec: Homepage Cuisine Discovery Rail Expansion

> **Status:** implemented
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** cuisine discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |
| Implemented in production             | 2026-05-13 | Build agent         |        |
| Status: implemented                   | 2026-05-14 | Housekeeping        |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete._

### Raw Signal

The developer wants to expand the homepage discovery rail massively, but this queued item must focus only on cuisine.

Key phrases from the session:

- "we need to talk about massive expansion ideas for the homepage discovery rail"
- "i want to focus on making sure the rail has EVERYTHING IT SHOULD"
- "we alreayd know the website has over 600 cuisine types"
- "tell me how we can add everythign wihtout it being extremely impratical but add spontinutidy from time to time"
- "please just focus on cusine for now"
- "Add the following specification to the May 12, 2026 build queue."
- "Do not implement it in this pass. This item is being queued for a later build agent."

The core product direction is not to put 600+ cuisine chips directly on the homepage. The product should make every cuisine reachable while keeping the homepage rail small, useful, and occasionally surprising.

### Developer Intent

- **Core goal:** Build a cuisine-only discovery rail system that exposes the full cuisine universe without turning the homepage into a giant impractical list.
- **Catalog scale:** The system must assume 600+ cuisine types already exist or will exist in the product taxonomy.
- **Homepage principle:** The rail should be a small visible window into a complete cuisine atlas, not the atlas itself.
- **Spontaneity principle:** Add controlled surprise from time to time. Spontaneity should feel interesting and relevant, not random or chaotic.
- **Implementation timing:** This is queued only. A later build agent should implement it.

---

## What This Does

Create a cuisine-focused homepage discovery system that gives users access to every cuisine in the catalog while showing only a curated, rotating subset on the homepage.

The homepage should show a compact cuisine rail with smart slots such as popular cuisines, regional deep dives, hidden gems, cuisines similar to what the user likes, region groupings, and occasional wildcard cuisine picks. The complete 600+ cuisine catalog should live behind a deeper browse/search destination.

---

## Product Principle

Do not try to show all cuisines in one homepage carousel.

Instead:

- Store and support the full cuisine catalog.
- Give every cuisine a canonical destination or filterable destination.
- Show only a small number of cuisine cards or pills on the homepage at a time.
- Rotate, personalize, and occasionally surprise.
- Always provide an "Explore all cuisines" escape hatch.

Target mental model:

> Cuisine rail = small visible window into a huge cuisine atlas.

---

## Homepage Cuisine Rail

The homepage cuisine rail should support these cuisine discovery modules.

### Popular Cuisines

Examples:

- Italian
- Mexican
- Japanese
- Indian
- Thai
- Chinese
- Greek

Purpose: familiar entry points that reduce friction.

### Regional Deep Dives

Examples:

- Sichuan
- Oaxaca
- Kerala
- Levantine
- Tuscan
- Hunan
- Yucatecan

Purpose: make the catalog feel culturally rich without overwhelming users.

### Hidden Gems

Examples:

- Georgian
- Uzbek
- Sri Lankan
- Senegalese
- Burmese
- Basque
- Peranakan

Purpose: expose long-tail cuisine coverage in a curated way.

### Similar To What You Like

Examples:

- If the user likes Thai: Lao, Cambodian, Vietnamese, Malaysian.
- If the user likes Mexican: Oaxacan, Yucatecan, Salvadoran, Peruvian.
- If the user likes Indian: Pakistani, Sri Lankan, Bangladeshi, Nepalese.

Purpose: use bridge logic to introduce new cuisines through familiar anchors.

### By Region

Examples:

- East Asia
- Southeast Asia
- South Asia
- Middle East
- West Africa
- Mediterranean
- Latin America
- Eastern Europe

Purpose: let users browse clusters instead of memorizing cuisine names.

### Flavor / Mood Groupings

Examples:

- Spice Route: Sichuan, Thai, Ethiopian, Jamaican, Andhra, Korean, Mexican.
- Comfort Cuisines: Italian, Southern, Korean, Polish, Filipino, Greek, Moroccan.

Purpose: let cuisine discovery start from craving, not only geography.

### Surprise Cuisine

Examples:

- "Try something new"
- "Cuisine you may not know"
- "Random regional pick"
- "Today's hidden cuisine"

Purpose: add spontaneity without making the rail feel arbitrary.

---

## Full Catalog Destination

The homepage must include a clear path to browse the complete cuisine catalog.

Required capabilities:

- Search cuisines.
- Browse A-Z.
- Browse by continent.
- Browse by country.
- Browse by region.
- Browse by flavor profile.
- Browse by popularity.
- Browse hidden gems.
- Jump to a random cuisine.

The later build agent should prefer existing public discovery destinations if they can support this cleanly. If a new cuisine atlas route is needed, define it intentionally and test it. Do not add fake links or placeholder routes.

---

## Cuisine Metadata

Every cuisine should be backed by metadata so the rail can be generated by rules instead of hand-curated lists.

Recommended fields:

- `name`
- `slug`
- `country`
- `region`
- `continent`
- `parentCuisine`
- `subCuisine`
- `popularityScore`
- `familiarityScore`
- `spiceLevel`
- `dietCompatibility`
- `signatureIngredients`
- `signatureDishes`
- `relatedCuisines`
- `seasonalRelevance`
- `userAffinityScore`
- `noveltyScore`
- `coverageScore`

`coverageScore` is important. Do not aggressively surface cuisines that have no meaningful downstream chef, menu, article, recipe, or discovery result coverage unless the UX honestly explains that the catalog entry is exploratory.

---

## Slot Model

The homepage rail should be generated from slots, not a static flat list.

Example homepage session:

- 2 popular cuisines
- 2 related cuisines
- 2 regional deep dives
- 1 hidden gem
- 1 wildcard or "Surprise me" item
- 1 "Explore all cuisines" item

Example output:

- Italian
- Mexican
- Sichuan
- Oaxacan
- Georgian
- Vietnamese
- Kerala
- Surprise Me
- Explore All

Another session:

- Japanese
- Thai
- Levantine
- Basque
- Sri Lankan
- Korean
- Yucatecan
- Random Cuisine
- Explore All

Rules:

- Do not show more than a controlled number of cuisine items on the homepage at once.
- Always include at least one familiar cuisine.
- Always include at least one discovery-oriented cuisine.
- Prefer cuisines with meaningful downstream coverage.
- Avoid repeating the same cuisine too often across sessions.
- Avoid showing a rail full of only one geography unless that is the user's explicit intent.
- Keep the complete catalog reachable through search/browse.

---

## Controlled Spontaneity

Spontaneity should be an injected slot, not the whole rail.

Requirements:

- Wildcard cuisine should appear only sometimes, roughly 10-20% of sessions or as an explicit "Surprise me" action.
- Surprises should respect known dietary constraints, location availability, and user history when possible.
- Surprises should be biased toward cuisines with enough public discovery coverage.
- Use bridge logic when introducing less familiar cuisines.
- Avoid surfacing obscure cuisines repeatedly if the user ignores or hides them.

Good examples:

- "Because you like Thai: try Lao."
- "Because you like Mexican: try Oaxacan."
- "Because you like Indian: try Sri Lankan."
- "Because you like Japanese: try Korean temple food."
- "Because you like Italian: try Ligurian."

Bad examples:

- A completely random cuisine with no available chef/menu/search result.
- A homepage filled only with obscure cuisines.
- Repeating the same wildcard after dismissal.

---

## Routing Rules

Every cuisine item must route to a real public destination.

Allowed patterns should be decided by the later build agent based on existing route support, but the intent is:

- Cuisine intent can feed `/eat` with cuisine context.
- Cuisine filters can feed `/chefs` when chef discovery supports the cuisine.
- Region or A-Z browsing can feed a complete cuisine atlas destination if built.
- Public chef pages remain the canonical proof destination for chef-specific results.

Hard rules:

- No placeholder routes.
- No fake result pages.
- No private operational data.
- No private recipes, private menus, ingredient costs, internal notes, client data, quotes, invoices, or event IDs.

---

## UX Requirements

- The rail should show roughly 6-10 cuisine cards or pills at a time, depending on viewport and density.
- Mobile must not become a compressed 600-item picker.
- Text must not overlap on mobile or desktop.
- "Explore all cuisines" must be obvious enough that users understand the catalog is bigger than the homepage rail.
- Cuisine names should be readable and culturally respectful.
- Regional and sub-cuisine labels should not be collapsed into inaccurate parent categories.
- The UI should make long-tail cuisine discovery feel intentional, not like a data dump.

---

## Acceptance Criteria

- A user can reach every cuisine in the catalog from the public discovery experience.
- The homepage never displays the full 600+ cuisine list directly.
- The homepage rail has a rule-based slot model for cuisine selection.
- Popular, regional, hidden-gem, related, and surprise cuisine logic are covered.
- "Explore all cuisines" or equivalent complete browsing exists.
- Wildcard/spontaneous cuisine behavior is controlled and tested.
- Cuisine items only link to real public destinations.
- Long-tail cuisines degrade honestly when public coverage is thin.
- Tests cover routing, deduplication, slot composition, coverage gating, hidden/dismissed behavior, and wildcard frequency boundaries.

---

## Out Of Scope

- Meal type expansion.
- Diet/constraint rail expansion.
- Ingredient-led discovery expansion.
- Occasion/mood rail expansion outside cuisine-specific groupings.
- Technique discovery.
- Planning shortlist implementation.
- Booking or inquiry write-path changes.
- Production implementation during the queue-recording pass.
