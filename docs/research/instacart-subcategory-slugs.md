# Research: Instacart Sub-Department Slugs to Break 1,000-Item Cap

> **Date:** 2026-03-30
> **Question:** How to discover and use sub-department slugs in Instacart's CollectionProductsWithFeaturedProducts API to bypass the 1,000-item-per-department cap?
> **Status:** complete

## Summary

Standalone subcategory slugs work with the same `CollectionProductsWithFeaturedProducts` persisted query (hash `5573f...`). They use the `slug` variable (not `collectionSlug`). The complete subcategory tree is embedded in the storefront HTML as URL-encoded JSON in a hydration `<script>` tag. By walking subcategories instead of parent departments, the 1,000-item cap is bypassed: Dairy (1,021 items via 11 subcategories vs 1,000 cap), Beverages (1,326 vs 1,000), Snacks & Candy (1,564 vs 1,000), Frozen (892 items, no cap but better coverage).

## How to Get the Subcategory Tree

The storefront page (`/store/{storeSlug}/storefront`) contains a URL-encoded JSON blob in one of the `<script>` tags (typically ~876KB). Decode it with `decodeURIComponent()`, parse as JSON, and extract all `"name"/"slug"` pairs. The `parent_collection_id` field in each collection's `trackingProperties` reveals the hierarchy.

No need to guess slugs. The full tree is available in the page hydration data.

## Slug Patterns

Slugs are NOT hierarchical (no `dairy/milk` or `dairy-milk`). They are standalone strings with three patterns:

1. **Plain words:** `milk`, `cheese`, `yogurt`, `eggs`, `butter`, `juice`, `coffee`, `tea`, `chips`, `dips`, `pasta`, `spices`
2. **Hyphenated phrases:** `ice-cream`, `snack-bars`, `hot-sauce`, `plant-based-milks`, `soda-soft-drinks`, `water-sparkling-water`, `coffee-creamers`, `gum-and-mints`, `sour-cream-cream-cheese-cottage-cheese`
3. **Numeric-prefixed:** `870-milk`, `1780-half-half`, `1781-cottage-cheese`, `9795-nuts-trail-mix`, `9797-crackers`, `9798-cookies-sweet-treats`, `3089-deli`, `3090-deli-meats`

## Verified Subcategory Slugs (Market Basket, 2026-03-30)

### Dairy & Eggs (parent=98) - 1,021 items vs 1,000 cap

| Slug                                   | Name                      | ID   | Items |
| -------------------------------------- | ------------------------- | ---- | ----- |
| yogurt                                 | Yogurt                    | 102  | 387   |
| cheese                                 | Cheese                    | 106  | 257   |
| milk                                   | Milk                      | 85   | 74    |
| plant-based-milks                      | Plant-Based Milk          | 83   | 63    |
| butter                                 | Butter                    | 105  | 57    |
| coffee-creamers                        | Coffee Creamer            | 103  | 51    |
| sour-cream-cream-cheese-cottage-cheese | Sour Cream & Cream Cheese | 107  | 35    |
| eggs                                   | Eggs                      | 101  | 34    |
| 1781-cottage-cheese                    | Cottage Cheese            | 1781 | 30    |
| creams                                 | Cream                     | 104  | 20    |
| 1780-half-half                         | Half & Half               | 1780 | 13    |

### Beverages (parent=123) - 1,326 items vs 1,000 cap

| Slug                             | Name                          | ID   | Items |
| -------------------------------- | ----------------------------- | ---- | ----- |
| juice                            | Juice                         | 127  | 329   |
| water-sparkling-water            | Water & Sparkling Water       | 126  | 206   |
| soda-soft-drinks                 | Soft Drinks                   | 129  | 197   |
| tea                              | Tea                           | 125  | 155   |
| coffee                           | Coffee                        | 124  | 139   |
| 870-milk                         | Milk                          | 870  | 138   |
| sports-drinks                    | Sports Drinks                 | 130  | 47    |
| drink-mixes                      | Drink Mixes                   | 132  | 38    |
| 990-protein-shakes               | Protein Drinks                | 990  | 30    |
| energy-drinks                    | Energy Drinks                 | 131  | 23    |
| 1194-mixers-non-alcoholic-drinks | Mixers & Non-Alcoholic Drinks | 1194 | 19    |
| kombucha                         | Kombucha & Probiotic Drinks   | 128  | 5     |

### Snacks & Candy (parent=205) - 1,564 items vs 1,000 cap

| Slug                          | Name                       | ID   | Items |
| ----------------------------- | -------------------------- | ---- | ----- |
| 9798-cookies-sweet-treats     | Cookies & Sweet Treats     | 9798 | 237   |
| chips                         | Chips                      | 206  | 236   |
| snack-bars                    | Snack Bars                 | 210  | 172   |
| 9797-crackers                 | Crackers                   | 9797 | 167   |
| chocolate-candy               | Chocolate & Candy          | 211  | 161   |
| dips                          | Dips                       | 207  | 145   |
| popcorn                       | Popcorn & Pretzels         | 214  | 121   |
| 9795-nuts-trail-mix           | Nuts & Trail Mix           | 9795 | 89    |
| 9796-dried-fruit-fruit-snacks | Dried Fruit & Fruit Snacks | 9796 | 65    |
| 873-more-snacks               | More Snacks                | 873  | 48    |
| 9805-pudding-gelatin          | Pudding & Gelatin          | 9805 | 42    |
| 9804-fruit-cups-applesauce    | Fruit Cups & Applesauce    | 9804 | 38    |
| gum-and-mints                 | Gum & Mints                | 213  | 34    |
| jerky                         | Jerky                      | 215  | 9     |

### Frozen (parent=271) - 892 items (not capped but now fully enumerated)

| Slug             | Name                              | ID  | Items |
| ---------------- | --------------------------------- | --- | ----- |
| ice-cream        | Ice Cream & Popsicles             | 274 | 234   |
| pizza-meals      | Frozen Pizzas & Meals             | 277 | 231   |
| apps-snacks      | Frozen Snacks                     | 276 | 106   |
| vegetables       | Frozen Vegetables                 | 273 | 88    |
| meat-seafood     | Frozen Meat & Seafood             | 278 | 86    |
| frozen-breakfast | Frozen Breakfast                  | 280 | 73    |
| frozen-fruits    | Frozen Fruits                     | 272 | 23    |
| breads-doughs    | Frozen Breads & Doughs            | 281 | 21    |
| desserts         | Frozen Desserts                   | 275 | 20    |
| broths-juice     | Frozen Broths & Juice Concentrate | 279 | 9     |
| ice              | Ice                               | 374 | 1     |

### Full Store Department Tree (all departments and subcategories)

Below is the complete map extracted from the storefront hydration data. Every slug below is verified working.

**Produce:** `fresh-fruits`, `fresh-vegetables`, `herbs`

**Meat & Seafood:** `beef`, `603-chicken`, `fish`, `pork`, `hot-dogs-sausages`, `shellfish`, `604-turkey`, `668-meat-alternatives`, `game-meats`, `968-lamb`

**Baked Goods:** `bread`, `breakfast-pastries`, `cookies-brownies`, `bagels-english-muffins`, `cakes-pies`, `buns-rolls`, `specialty-desserts`, `tortillas-flatbreads`, `frozen-baked-goods`

**Canned Goods & Soups:** `soups`, `canned-fish`, `canned-vegetables`, `canned-beans`, `canned-fruits`, `canned-meals`, `canned-tomatoes`, `canned-meat`, `broths-and-stocks`, `canned-coconut`

**Deli:** `3090-deli-meats`, `3091-cheese`, `3092-olives-dips-spreads`, `3093-tofu-meat-alternatives`, `34807-meat-cheese-combos`

**Prepared Foods:** `3101-salads`, `3102-chicken`, `3096-sandwiches-wraps`, `3098-sushi`, `3097-pizza-meals`, `3100-soups`, `3104-snack-packs`, `35528-prepared-breakfast`, `3099-party-platters`, `3103-other-prepared-meats`

**Dry Goods & Pasta:** `pasta`, `pastas-pizza-sauces`, `rices-grains`, `962-boxed-meals`, `canned-tomato`, `seeds`, `noodles`, `dried-beans`, `2190-more-dry-goods`

**Breakfast:** `634-cereal`, `oatmeal`, `nut-butters`, `fruit-preserves`, `toaster-pastries`, `pancake-waffle`, `breakfast-bars`, `granola`, `maple-syrup`

**Condiments & Sauces:** `871-pasta-sauces`, `salad-dressing`, `olives-pickles`, `mayo`, `pastes`, `mustard`, `asian-sauces`, `hot-sauce`, `ketchup`, `34506-barbecue-sauce`, `salsa`, `other-sauces`, `relish`, `horseradish-wasabi`, `salad-toppings`

**Baking Essentials:** `sugars`, `flours`, `honey-syrup-sweetners`, `baking-mixes`, `refrigerated-doughs`, `extracts`, `baking-chocolates-morsels`, `baking-powders`, `baking-milks`, `cake-decoratings`, `pie-crusts`, `marshmallows`, `ice-cream-cones`

**Oils, Vinegars & Spices:** `cooking-oils`, `spices`, `salt-pepper`, `vinegar`, `bread-crumbs`, `boullions`, `marinades`

**Household:** `paper-goods`, `laundry`, `cleaning-solutions`, `trash-bins-bags`, `foil-plastic`, `cleaning-tools`, `candles-air-fresheners`, `housewares`, `589-pest-control`

**Pets:** `875-cats`, `874-dogs`, `879-more-pet-supplies`, `877-birds`, `876-fish`

**Personal Care:** `lotion-soap`, `oral-hygiene`, `feminine-care`, `facial-care`, `hair-care`, `deodorants`, `ear-eye-care`, `shave-needs`, `3470-cosmetics`, `sexual-wellness`, `sun-care`, `adult-care`

**Kitchen Supplies:** `disposable-tabletop`, `food-storage`, `cookware-bakeware`, `gadgets-appliances`, `kitchen-utensils`, `plates-bowls`, `kitchen-organization`

**Health Care:** `vitamins-supplements`, `muscle-joint`, `cold-flu-allergy`, `first-aid`, `digestive-stomach`, `health-care-supplies`, `childrens-health`, `protein-performance-weight`, `specialty-treatments`

**Baby:** `diapering`, `baby-food-drinks`, `baby-health-care`, `bath-potty`, `bottles-forumla`

## Recommendations

**Strategy: Replace parent department walks with subcategory walks for capped departments.**

For departments that hit exactly 1,000 items (dairy, beverages, snacks-and-candy), walk their subcategories instead. This recovers 21+ additional Dairy items, 326+ additional Beverages items, and 564+ additional Snacks items that were previously invisible.

For all other departments (produce, meat-and-seafood, frozen, etc.) that don't hit the 1,000 cap, the parent-level walk is sufficient. But subcategory walks provide better `department` classification for free.

**Needs a spec:** Update `instacart-department-walker.mjs` to:

1. On startup, fetch the storefront HTML and extract the subcategory tree from hydration data
2. For departments with >900 items at parent level, switch to walking subcategories and deduplicating by item ID
3. Store the subcategory name as the `category` field (more granular than the parent department name)

**Quick fix:** As an interim measure, hardcode the subcategory slugs for dairy, beverages, and snacks-and-candy into the walker. The slugs are stable (tied to collection IDs, not dynamic).
