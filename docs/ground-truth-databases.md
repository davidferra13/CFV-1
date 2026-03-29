# Ground Truth Reference Databases

ChefFlow depends on external knowledge about the real world. Without it, core features are hollow (displaying guesses instead of verified data). These reference databases provide that foundation.

## Database Inventory

### Built and Active

| Database                  | What It Answers                         | File(s)                                                     | Update Frequency                     |
| ------------------------- | --------------------------------------- | ----------------------------------------------------------- | ------------------------------------ |
| **Price Intelligence**    | What does food cost?                    | OpenClaw Pi (`price-intel` cartridge), synced via port 8081 | Daily (14 cron scrapers)             |
| **Allergen Reference**    | What are the major allergens?           | `lib/constants/allergens.ts`                                | Static (FDA Big 9 + 15 culinary)     |
| **Allergen Risk Matrix**  | Does this dish contain this allergen?   | `lib/formulas/allergen-matrix.ts`                           | Static (keyword lookup)              |
| **Dietary Rule Sets**     | Does this ingredient violate this diet? | `lib/constants/dietary-rules.ts`                            | Static (13 diets, 1000+ keywords)    |
| **Food Safety Standards** | What temp kills salmonella in chicken?  | `lib/constants/food-safety.ts`                              | Static (FDA Food Code 2022)          |
| **Seasonal Produce**      | What's in season in New England?        | `lib/calendar/seasonal-produce.ts`                          | Static (180 items, 6 seasons)        |
| **Portion Standards**     | How much food per guest per course?     | `lib/recipes/portion-standards.ts`                          | Static (11 categories, 7 courses)    |
| **Unit Conversions**      | How many grams in a cup of flour?       | `lib/units/conversion-engine.ts`                            | Static (70+ aliases, 120+ densities) |
| **USDA Pricing**          | What are average retail prices?         | `lib/grocery/usda-prices.ts`                                | Quarterly (186 Northeast items)      |
| **USDA Nutrition (API)**  | What are the macros per 100g?           | `lib/nutrition/usda-client.ts`                              | Live API (380K items, 24h cache)     |
| **Dietary Complexity**    | How hard is this event to accommodate?  | `lib/formulas/dietary-complexity.ts`                        | Static (weighted scoring formula)    |

### Archived

| Database             | What It Answered              | Location                        |
| -------------------- | ----------------------------- | ------------------------------- |
| **OSM Lead Crawler** | Who operates food businesses? | `F:\Pi-Backup\` (tar.gz, 209MB) |

### Planned (OpenClaw jobs, need scraping)

| Database                | What It Would Answer            | Difficulty                                  |
| ----------------------- | ------------------------------- | ------------------------------------------- |
| **Market Rates**        | What do chefs/caterers charge?  | Hard (Thumbtack, Bark, wedding directories) |
| **Supplier Directory**  | Who sells food near me?         | Hard (Google Places, Yelp, distributors)    |
| **Venue Kitchen Intel** | What's in this venue's kitchen? | Very hard (wedding sites, venue pages)      |

## Architecture

All reference data follows these rules:

1. **TypeScript exports, not database tables.** Reference data that rarely changes lives as typed constants in `lib/constants/` or `lib/formulas/`. No schema bloat for static data.
2. **Formula over AI.** Every lookup is deterministic keyword matching or math. No LLM calls for reference data queries.
3. **One-way pipeline.** OpenClaw (Pi) builds databases and pushes to ChefFlow. OpenClaw never reads client data, recipes, events, or anything from the live app.
4. **Honest about gaps.** If a lookup returns no match, the UI shows "unknown" or "verify manually." Never fabricates data.

## Adding a New Reference Database

1. Create the file in `lib/constants/` (static data) or `lib/formulas/` (data + computation)
2. Export typed constants and lookup functions
3. Add an entry to this document
4. Update `CLAUDE.md` Key File Locations if it's a major addition
