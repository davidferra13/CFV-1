# Chromatic Atlas Claim Audit

**Status:** Research crawl draft - 2026-05-20

## Allowed Claims

| Claim type             | Allowed wording                                                                           | Required evidence                                   |
| ---------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Color expectation      | "Color can influence flavor expectations and identification in some controlled settings." | Sensory literature with DOI/PMID.                   |
| Color as discovery cue | "This color helps group visual search results; flavor role is sourced separately."        | Product policy plus evidence label.                 |
| Pigment behavior       | "Chlorophylls can degrade under heat/acid, changing green appearance."                    | Peer-reviewed pigment literature.                   |
| Nutrient value         | "USDA FDC reports nutrient values for this food/state."                                   | FDC ID, data type, release/access date.             |
| Botanical identity     | "Botanical identity resolved to [name] by [authority]."                                   | GRIN/GBIF/POWO/WFO record.                          |
| Compound occurrence    | "Database X reports compound Y for ingredient/state Z."                                   | Database record, license, source, threshold status. |
| Culinary role          | "Chefs often use this ingredient for [role] in [context]."                                | Culinary precedent or expert review label.          |
| Personal note          | "Chef/user note: this reads as..."                                                        | `personal-thesis`, author, date, context.           |

## Conditional Claims

| Claim                                      | Condition                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| "May taste sour/bitter/sweet"              | Needs sensory evidence, measured pH/acids, concentration/threshold, or clearly labeled chef heuristic. |
| "Contains aroma compound X"                | Needs food/organism/source record, not just chemical ontology.                                         |
| "Compound X may contribute to aroma/taste" | Needs concentration plus threshold/perception evidence.                                                |
| "Good substitute for Y"                    | Needs culinary role match, state match, allergen/dietary check, and confidence label.                  |
| "Similar role shape"                       | Radar/role axes must label evidence class and missing data.                                            |
| "Cultural color meaning"                   | Must name culture/region/time/source and avoid universal wording.                                      |

## Claims Requiring Stronger Evidence

- Ingredient-specific measured CIELAB values for real food states.
- Cultivar-specific acidity, sugar, texture, aroma, and color.
- Raw-to-cooked transformation behavior for each pilot ingredient.
- Volatile perception claims without odor thresholds.
- Bitter/sweet/sour intensity without sensory panel or measured concentration/threshold.
- pH claims where only secondary extension tables are available.

## Claims Allowed Only As Chef Heuristic

- "Cucumber adds cooling crunch."
- "Avocado gives green creaminess."
- "Parsley freshens heavy food."
- "Green bell pepper reads grassy."
- "Arugula adds peppery lift."
- "Green olive adds briny preserved weight."

These require visible `chef-heuristic` labeling until validated by culinary expert review or literature.

## Claims Allowed Only As Personal Thesis

- A chef's private color/flavor memory.
- A user's personal substitution preference.
- A tasting-menu color arc theory from one chef.
- A "this shade feels like..." interpretation.

These must never be shown as universal facts.

## Forbidden Claims

| Forbidden idea                                                        | Why rejected                                                                    | Safer replacement wording                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Same color equals same flavor                                         | Contradicted by green pilot concept and sensory evidence limits.                | "Same color can hide very different roles."                           |
| Same color ingredients are interchangeable                            | Ignores role, state, allergen, diet, culture, and chemistry.                    | "Substitution depends on the job in the dish."                        |
| Pigment proves flavor                                                 | Pigments support color behavior, not flavor perception.                         | "Pigment may explain color behavior; flavor needs separate evidence." |
| Compound presence proves perception                                   | Perception needs concentration and threshold/sensory evidence.                  | "Compound reported; perceptibility not established."                  |
| Radar chart proves balance                                            | Radar charts are visual summaries with perceptual pitfalls.                     | "Role-shape summary; see source labels and missing fields."           |
| AI discovered a scientific relationship                               | AI output is not evidence.                                                      | "Hypothesis generated; requires source validation."                   |
| Color-based substitution is safe without role/allergen/dietary checks | Unsafe and misleading.                                                          | "Run role, allergen, dietary, and state checks before substitution."  |
| Green means fresh/healthy/natural                                     | Cultural, processing, and ingredient exceptions.                                | "Green visual cue; freshness/nutrition require separate source."      |
| pH equals sourness                                                    | Sourness depends on acids, buffering, sugar, salt, temperature, and perception. | "Approximate acidity; sensory sourness not proven."                   |
| Brown means Maillard                                                  | Browning may be enzymatic, Maillard, caramelization, oxidation, or burning.     | "Browning mechanism requires context/source."                         |

## Banned Wording

- "Tastes like green."
- "Green flavor family."
- "Same shade, same flavor."
- "Color match substitute."
- "Pigment-driven flavor."
- "AI-discovered pairing."
- "Chemically proven delicious."
- "Radar proves balance."
- "Unknown means none."
- "No database record means absent."
- "This compound makes it taste..."
- "Safe substitute" without allergen/dietary/state checks.

## Rejected / Unsupported Ledger

| Claim                                                                | Status                 | Notes                                                                   |
| -------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| Green apple and green bell pepper are related because both are green | `rejected-unsupported` | Different botanical identity, role, texture, chemistry, and food state. |
| Chlorophyll-rich foods taste alike                                   | `rejected-unsupported` | Pigment family is not flavor role.                                      |
| FlavorDB overlap means good pairing                                  | `rejected-unsupported` | Overlap is hypothesis at best and license restricted.                   |
| FDC nutrient similarity means substitution fit                       | `rejected-unsupported` | Nutrient profile is not culinary role.                                  |
| Extension pH range proves exact pH                                   | `rejected-unsupported` | Ranges vary by cultivar/state/method.                                   |
| Missing compound in database means absent                            | `rejected-unsupported` | Missing data means Not enough evidence.                                 |
