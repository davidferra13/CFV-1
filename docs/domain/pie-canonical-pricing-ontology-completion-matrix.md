# PIE Canonical Pricing Ontology Completion Matrix

Status: implemented contract for queue item `BQ-20260520T022441Z-pie-canonical-pricing-ontology-completion-matrix`.

Machine-readable source: `lib/pricing/pie-canonical-pricing-ontology.ts`

## Scope Contract

PIE prices canonical buyable identities, not loose strings. The completion matrix maps:

- every current broad PIE food category from `lib/pricing/pie-categories.ts`
- every current subcategory floor from `lib/pricing/subcategory-floors.ts`
- every high-risk family named by the queue item
- every PIE surface that should consume this ontology at wiring time

No routes, server actions, API routes, or DB queries were added. Auth and tenant-scope requirements therefore remain satisfied by non-use in this batch.

## Canonical Identity Rules

Each price identity must preserve:

- biological source
- edible part
- culinary form
- processing state
- cultural or market name when it changes buying behavior
- aliases
- price family
- buyable equivalence
- unsafe equivalence
- substitution group
- unit basis
- yield basis
- fallback order
- pricing risks
- proof requirements

PIE may share current price truth only inside an explicit buyable equivalence group after unit/package conversion. PIE may use fallback order for lower-confidence costing, but unsafe equivalences must never share current price truth.

## Broad Category Matrix

The machine matrix covers all current `PIE_FOOD_CATEGORIES`:

| Existing category        | Canonical family coverage                                                    |
| ------------------------ | ---------------------------------------------------------------------------- |
| Produce                  | produce                                                                      |
| Protein                  | proteins                                                                     |
| Meat & Seafood           | proteins, seafood                                                            |
| Dairy                    | dairy                                                                        |
| Bakery                   | bakery, dry goods                                                            |
| Grains & Bakery          | bakery, dry goods                                                            |
| Pantry                   | dry goods, oils, spices, canned, fermented, extracts, additives              |
| Frozen                   | frozen                                                                       |
| Deli                     | prepared goods, proteins, fermented                                          |
| Prepared Foods           | prepared goods, proteins, fermented                                          |
| Snacks & Candy           | prepared goods, dry goods                                                    |
| Snacks                   | prepared goods, dry goods                                                    |
| Condiments & Sauces      | prepared goods, fermented, spices, oils                                      |
| Oils, Vinegars, & Spices | oils, spices, fermented                                                      |
| Baking Essentials        | dry goods, sweeteners, extracts, additives                                   |
| Dry Goods & Pasta        | dry goods                                                                    |
| Canned Goods & Soups     | canned                                                                       |
| Beverages                | beverages, fermented, extracts                                               |
| Alcohol                  | beverages, fermented, extracts                                               |
| Breakfast                | dry goods, dairy, prepared goods                                             |
| International            | produce, proteins, seafood, dry goods, spices, oils, fermented               |
| Organic                  | produce, proteins, seafood, dairy, dry goods                                 |
| Natural                  | produce, proteins, seafood, dairy, dry goods                                 |
| flipp-circular           | source rows must resolve through normalized product and canonical ingredient |

## Subcategory Matrix

Every key in `SUBCATEGORY_FLOOR_CENTS` now receives:

- canonical id: `pie.price_identity.<subcategory>`
- parent ids: `pie.family.<family>` plus specific ontology parents where known
- price family: `pie.price_family.<family>`
- identity kind: direct, buyable equivalence, or fallback-only
- unit basis
- yield basis
- proof requirements

The focused unit test asserts there are no missing current subcategory mappings and no empty canonical IDs, parent IDs, unit basis, yield basis, or canonical proof requirements.

## High-Risk Family Matrix

| Family             | Direct price identities                                                                                          | Must not share price truth                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tomatoes           | fresh tomato, cherry tomato, heirloom tomato, canned tomato, tomato paste, passata, sun-dried tomato             | fresh tomato != canned tomato; fresh tomato != tomato paste; tomato sauce != passata without label proof; sun-dried tomato != fresh tomato             |
| Cilantro/coriander | fresh cilantro leaf, coriander seed, ground coriander, coriander root                                            | cilantro leaf != coriander seed; ground coriander != whole coriander seed; coriander root != cilantro bunch                                            |
| Chiles/peppers     | fresh chile, fresh bell pepper, dried chile, smoked chile, chile powder, chile paste, hot sauce                  | fresh chile != dried chile; poblano != ancho without dried-form proof; chipotle != fresh jalapeno; hot sauce != fresh chile; bell pepper != hot chile  |
| Dairy cream        | heavy cream, whipping cream, sour cream, creme fraiche, coconut cream                                            | heavy cream != sour cream; heavy cream != coconut cream; half and half != heavy cream                                                                  |
| Soy                | soybean, edamame, tofu, yuba, soy milk, miso, soy sauce, tamari, tempeh, natto, soy oil                          | soybean != tofu; edamame != dried soybean; soy milk != soy sauce; miso != soy sauce; soy oil != soybean                                                |
| Wheat              | wheat berries, all purpose flour, bread flour, semolina, bulgur, couscous, seitan, bread crumbs                  | wheat berries != flour; semolina != all purpose flour; couscous != bulgur; seitan != flour; fresh bread != dry breadcrumbs                             |
| Chicken            | whole chicken, chicken breast, chicken thigh, chicken wing, ground chicken, chicken stock, schmaltz, bones, skin | whole chicken != chicken breast; bone-in thigh != boneless skinless thigh; chicken stock != raw chicken; schmaltz != chicken skin without render yield |
| Citrus             | whole citrus, zest, juice, preserved peel, citrus oil, citrus extract                                            | whole lemon != lemon juice; zest != juice; preserved peel != fresh peel; citrus oil != citrus extract                                                  |
| Sugar              | cane sugar, beet sugar, white sugar, brown sugar, powdered sugar, molasses, syrup                                | white sugar != brown sugar; powdered sugar != granulated sugar; molasses != brown sugar; syrup != dry sugar                                            |
| Seafood            | fresh finfish, shell-on shrimp, peeled shrimp, mollusk, smoked fish, canned seafood, fish sauce                  | shell-on shrimp != peeled shrimp; fresh salmon != smoked salmon; fresh tuna != canned tuna; fish sauce != fresh fish                                   |
| Herbs              | fresh herb, dried herb, ground herb, herb paste                                                                  | fresh herb != dried herb; dried herb != herb paste; bunch != jar without yield conversion                                                              |
| Oils               | olive oil, extra virgin olive oil, vegetable oil, sesame oil, coconut oil, rendered animal fat                   | extra virgin olive oil != olive oil blend; toasted sesame oil != neutral sesame oil; coconut oil != coconut cream                                      |
| Spices             | whole spice, ground spice, spice blend, vanilla extract, saffron                                                 | whole spice != ground spice; spice blend != single spice; saffron != turmeric; vanilla extract != vanilla bean                                         |
| Canned goods       | canned vegetable, canned bean, canned seafood, canned fruit                                                      | canned item != fresh item; drained weight != net weight without label proof; oil-packed != water-packed                                                |
| Frozen goods       | frozen produce, frozen seafood, frozen prepared good                                                             | frozen item != fresh item; frozen prepared good != raw frozen ingredient                                                                               |
| Fermented goods    | yogurt, cheese, miso, soy sauce, kimchi, sourdough, fish sauce                                                   | fermented good != raw source; miso != soy sauce; kimchi != cabbage; yogurt != milk; fish sauce != fish                                                 |
| Extracts           | vanilla extract, citrus extract, almond extract, starch, gum, protein isolate                                    | extract != raw source; vanilla extract != vanilla bean; citrus oil != citrus juice; starch != flour                                                    |
| Additives          | leavener, thickener, emulsifier, curing agent, acidulant, flavor enhancer, colorant                              | additive != raw source; baking soda != baking powder; curing salt != table salt; gelatin != agar                                                       |

## Consuming Surfaces

The matrix lists the fire-time wiring surfaces that should consume this ontology:

| Surface                  | File                                       | Contract                                                                            |
| ------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| Pricing resolver         | `lib/pricing/resolve-price.ts`             | Resolve by canonical price identity before fallback tier selection.                 |
| Buyable price contract   | `lib/pricing/buyable-price-contract.ts`    | Expose required proof and missing proof for the exact buyable identity.             |
| Reliability              | `lib/pricing/pie-reliability.ts`           | Downgrade confidence for fallback-only or unsafe-equivalence matches.               |
| Normalizer               | `lib/pricing/name-normalizer.ts`           | Normalize aliases without collapsing unsafe source/part/form/process boundaries.    |
| Matching utilities       | `lib/pricing/ingredient-matching-utils.ts` | Suggest canonical identities with explicit parent and unsafe-equivalence metadata.  |
| Vendor catalog ingestion | `lib/openclaw/catalog-actions.ts`          | Attach vendor SKUs to canonical IDs and preserve package, process, and unit proof.  |
| Recipe costing           | `lib/recipes/bulk-price-actions.ts`        | Cost recipe lines against exact price identities and yield transforms.              |
| Substitutions            | `lib/ingredients/substitution-actions.ts`  | Use substitution groups, never unsafe price equivalence, for culinary alternatives. |

## Completion Proof

The unit test `tests/unit/pie-canonical-pricing-ontology.test.ts` proves:

- every existing PIE food category has a canonical family mapping
- every existing subcategory floor has a canonical id, parent id, price family, unit basis, yield basis, and canonical proof requirement
- all required high-risk families are present
- fresh versus processed forms are explicitly separated for all acceptance examples
- all consuming surfaces named by the queue item are listed
- the requested scope families are declared, including sweeteners for sugar

## Known Gaps

No current category or subcategory coverage gaps remain in the machine matrix. Runtime wiring into the listed consumers is intentionally listed for fire-time integration; this queue item created the canonical contract and completion matrix without changing resolver behavior.
