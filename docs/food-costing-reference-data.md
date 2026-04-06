# Food Costing Reference Data

> **Purpose:** Exhaustive lookup tables for the ChefFlow costing engine and knowledge layer. This is the data that `lib/costing/knowledge.ts` implements. Every table here is a static dataset baked into the system.
> **Audience:** Developers, builder agents, the auto-costing engine, and the help/tooltip system.
> **Last updated:** 2026-04-05
> **Canonical source:** This file is the single source of truth for all static costing reference data.

---

## 1. Unit Conversions

### 1a. Weight

| From         | To  | Factor |
| ------------ | --- | ------ |
| 1 oz         | g   | 28.35  |
| 1 lb         | g   | 453.59 |
| 1 lb         | oz  | 16     |
| 1 kg         | lb  | 2.205  |
| 1 kg         | g   | 1,000  |
| 1 metric ton | kg  | 1,000  |
| 1 short ton  | lb  | 2,000  |

### 1b. Volume

| From     | To     | Factor |
| -------- | ------ | ------ |
| 1 tsp    | mL     | 4.93   |
| 1 tbsp   | tsp    | 3      |
| 1 tbsp   | mL     | 14.79  |
| 1 fl oz  | tbsp   | 2      |
| 1 fl oz  | mL     | 29.57  |
| 1 cup    | fl oz  | 8      |
| 1 cup    | mL     | 236.59 |
| 1 pint   | cups   | 2      |
| 1 pint   | mL     | 473.18 |
| 1 quart  | pints  | 2      |
| 1 quart  | cups   | 4      |
| 1 quart  | L      | 0.946  |
| 1 gallon | quarts | 4      |
| 1 gallon | L      | 3.785  |
| 1 L      | mL     | 1,000  |

### 1c. Volume-to-Weight (Ingredient Densities)

These are approximate. Exact values vary by brand, grind, humidity, and packing method.

| Ingredient                    | 1 Cup (g) | 1 Cup (oz) | Notes                      |
| ----------------------------- | --------- | ---------- | -------------------------- |
| Water                         | 237       | 8.35       | Baseline reference         |
| All-purpose flour             | 125       | 4.4        | Spooned and leveled        |
| Bread flour                   | 130       | 4.6        |                            |
| Cake flour                    | 115       | 4.0        |                            |
| Whole wheat flour             | 130       | 4.6        |                            |
| Almond flour                  | 96        | 3.4        |                            |
| Coconut flour                 | 128       | 4.5        |                            |
| Cornstarch                    | 128       | 4.5        |                            |
| Granulated sugar              | 200       | 7.05       |                            |
| Brown sugar (packed)          | 220       | 7.75       |                            |
| Powdered sugar (sifted)       | 120       | 4.2        |                            |
| Honey                         | 340       | 12.0       |                            |
| Maple syrup                   | 315       | 11.1       |                            |
| Molasses                      | 328       | 11.6       |                            |
| Corn syrup                    | 328       | 11.6       |                            |
| Butter                        | 227       | 8.0        | 2 sticks                   |
| Vegetable oil                 | 218       | 7.7        |                            |
| Olive oil                     | 216       | 7.6        |                            |
| Coconut oil (melted)          | 218       | 7.7        |                            |
| Heavy cream                   | 232       | 8.2        |                            |
| Milk (whole)                  | 244       | 8.6        |                            |
| Buttermilk                    | 245       | 8.6        |                            |
| Sour cream                    | 230       | 8.1        |                            |
| Yogurt (plain)                | 245       | 8.6        |                            |
| Cream cheese                  | 232       | 8.2        |                            |
| Grated Parmesan               | 100       | 3.5        | Finely grated              |
| Shredded cheddar              | 113       | 4.0        |                            |
| Ricotta                       | 250       | 8.8        |                            |
| Kosher salt (Morton)          | 135       | 4.8        | Coarser crystals           |
| Kosher salt (Diamond Crystal) | 73        | 2.6        | Flakier, less dense        |
| Table salt                    | 288       | 10.2       | Fine crystals, much denser |
| Sea salt (fine)               | 230       | 8.1        |                            |
| Black pepper (ground)         | 105       | 3.7        |                            |
| Rice (long-grain, dry)        | 185       | 6.5        |                            |
| Rice (short-grain, dry)       | 200       | 7.0        |                            |
| Quinoa (dry)                  | 170       | 6.0        |                            |
| Rolled oats                   | 80        | 2.8        |                            |
| Breadcrumbs (dry)             | 115       | 4.0        |                            |
| Panko                         | 60        | 2.1        | Much lighter               |
| Cocoa powder (unsweetened)    | 85        | 3.0        |                            |
| Chocolate chips               | 170       | 6.0        |                            |
| Peanut butter                 | 258       | 9.1        |                            |
| Tomato paste                  | 262       | 9.2        |                            |
| Tomato sauce                  | 245       | 8.6        |                            |
| Diced tomatoes (canned)       | 227       | 8.0        | Drained weight             |
| Beans (cooked, drained)       | 180       | 6.3        |                            |
| Beans (dried)                 | 180       | 6.3        |                            |
| Lentils (dried)               | 190       | 6.7        |                            |
| Chickpeas (cooked)            | 164       | 5.8        |                            |
| Walnuts (chopped)             | 120       | 4.2        |                            |
| Almonds (sliced)              | 92        | 3.2        |                            |
| Pecans (chopped)              | 110       | 3.9        |                            |
| Sesame seeds                  | 144       | 5.1        |                            |
| Chia seeds                    | 160       | 5.6        |                            |
| Flax seeds                    | 150       | 5.3        |                            |
| Raisins                       | 145       | 5.1        |                            |
| Dried cranberries             | 120       | 4.2        |                            |
| Coconut (shredded)            | 85        | 3.0        |                            |
| Spinach (raw, packed)         | 30        | 1.1        |                            |
| Kale (raw, chopped)           | 67        | 2.4        |                            |
| Arugula (packed)              | 20        | 0.7        |                            |
| Diced onion                   | 160       | 5.6        |                            |
| Corn kernels                  | 154       | 5.4        |                            |

### 1d. Count-to-Weight (Common Produce and Proteins)

| Item                     | Typical Weight  | Notes         |
| ------------------------ | --------------- | ------------- |
| 1 garlic clove           | 5 g (0.18 oz)   |               |
| 1 garlic head            | 50 g (1.75 oz)  | 10-12 cloves  |
| 1 small onion            | 115 g (4 oz)    |               |
| 1 medium onion           | 150 g (5.3 oz)  |               |
| 1 large onion            | 225 g (8 oz)    |               |
| 1 shallot                | 30 g (1 oz)     |               |
| 1 medium potato (russet) | 170 g (6 oz)    |               |
| 1 large potato (russet)  | 280 g (10 oz)   |               |
| 1 medium sweet potato    | 150 g (5.3 oz)  |               |
| 1 medium carrot          | 70 g (2.5 oz)   |               |
| 1 large carrot           | 100 g (3.5 oz)  |               |
| 1 celery stalk           | 65 g (2.3 oz)   |               |
| 1 medium tomato          | 150 g (5.3 oz)  |               |
| 1 Roma tomato            | 60 g (2.1 oz)   |               |
| 1 cherry tomato          | 17 g (0.6 oz)   |               |
| 1 bell pepper            | 150 g (5.3 oz)  |               |
| 1 jalapeno               | 14 g (0.5 oz)   |               |
| 1 serrano                | 6 g (0.2 oz)    |               |
| 1 habanero               | 8 g (0.3 oz)    |               |
| 1 medium zucchini        | 200 g (7 oz)    |               |
| 1 medium cucumber        | 200 g (7 oz)    |               |
| 1 medium eggplant        | 450 g (16 oz)   |               |
| 1 head broccoli          | 350 g (12.3 oz) |               |
| 1 head cauliflower       | 575 g (20 oz)   |               |
| 1 head iceberg lettuce   | 540 g (19 oz)   |               |
| 1 head romaine           | 350 g (12.3 oz) |               |
| 1 bunch spinach          | 340 g (12 oz)   |               |
| 1 bunch kale             | 200 g (7 oz)    |               |
| 1 bunch parsley          | 55 g (2 oz)     |               |
| 1 bunch cilantro         | 50 g (1.75 oz)  |               |
| 1 bunch basil            | 42 g (1.5 oz)   |               |
| 1 bunch thyme            | 28 g (1 oz)     |               |
| 1 bunch rosemary         | 28 g (1 oz)     |               |
| 1 bunch mint             | 42 g (1.5 oz)   |               |
| 1 bunch dill             | 35 g (1.2 oz)   |               |
| 1 bunch chives           | 28 g (1 oz)     |               |
| 1 bunch scallions        | 110 g (3.9 oz)  | 6-8 stalks    |
| 1 large egg              | 50 g (1.75 oz)  | Without shell |
| 1 egg yolk               | 18 g (0.63 oz)  |               |
| 1 egg white              | 33 g (1.16 oz)  |               |
| 1 lemon                  | 100 g (3.5 oz)  | Whole fruit   |
| 1 lemon (juice yield)    | 45 mL (3 tbsp)  |               |
| 1 lemon (zest yield)     | 7 g (1 tbsp)    |               |
| 1 lime                   | 67 g (2.4 oz)   | Whole fruit   |
| 1 lime (juice yield)     | 30 mL (2 tbsp)  |               |
| 1 orange                 | 200 g (7 oz)    | Whole fruit   |
| 1 orange (juice yield)   | 80 mL (1/3 cup) |               |
| 1 avocado (whole)        | 200 g (7 oz)    |               |
| 1 avocado (flesh only)   | 150 g (5.3 oz)  |               |
| 1 banana (peeled)        | 120 g (4.2 oz)  |               |
| 1 medium apple           | 180 g (6.3 oz)  |               |
| 1 medium pear            | 180 g (6.3 oz)  |               |
| 1 medium peach           | 150 g (5.3 oz)  |               |
| 1 mango (flesh only)     | 200 g (7 oz)    |               |
| 1 inch fresh ginger      | 6 g (0.2 oz)    |               |
| 1 inch fresh turmeric    | 5 g (0.18 oz)   |               |
| 1 stick cinnamon         | 3 g (0.1 oz)    |               |
| 1 bay leaf               | 0.6 g           |               |
| 1 star anise             | 2 g             |               |

---

## 2. Yield Factors

### 2a. Trim / Fabrication Yield (Raw Loss Before Cooking)

| Ingredient                          | Yield % | EP from 10 lb AP | Primary Loss                        |
| ----------------------------------- | ------- | ---------------- | ----------------------------------- |
| **Proteins**                        |         |                  |                                     |
| Beef tenderloin (whole, untrimmed)  | 55-65%  | 5.5-6.5 lb       | Chain, silverskin, fat, head, tail  |
| Beef tenderloin (PSMO)              | 80-85%  | 8.0-8.5 lb       | Silverskin, minor trim              |
| Beef ribeye (boneless)              | 85-90%  | 8.5-9.0 lb       | Fat cap, silverskin                 |
| Beef ribeye (bone-in)               | 75-80%  | 7.5-8.0 lb       | Bone, fat cap                       |
| Beef brisket (whole packer)         | 75-80%  | 7.5-8.0 lb       | Fat cap, hard fat                   |
| Beef short ribs (bone-in)           | 50-55%  | 5.0-5.5 lb       | Bone, membrane, excess fat          |
| Beef chuck (boneless)               | 85-90%  | 8.5-9.0 lb       | Silverskin, hard fat                |
| Ground beef                         | 100%    | 10 lb            | No trim                             |
| Pork loin (boneless)                | 90-95%  | 9.0-9.5 lb       | Silverskin                          |
| Pork shoulder (bone-in)             | 70-75%  | 7.0-7.5 lb       | Bone, fat, glands                   |
| Pork belly                          | 95-100% | 9.5-10 lb        | Minimal trim                        |
| Pork tenderloin                     | 90-95%  | 9.0-9.5 lb       | Silverskin, chain                   |
| Baby back ribs                      | 90-95%  | 9.0-9.5 lb       | Membrane, excess fat                |
| Spare ribs                          | 85-90%  | 8.5-9.0 lb       | Membrane, rib tips                  |
| Whole chicken                       | 60-65%  | 6.0-6.5 lb       | Bones, skin, giblets, fat           |
| Chicken breast (bone-in, skin-on)   | 75-80%  | 7.5-8.0 lb       | Bone, skin                          |
| Chicken breast (boneless, skinless) | 90-95%  | 9.0-9.5 lb       | Tenderloin, minor trim              |
| Chicken thigh (bone-in, skin-on)    | 70-75%  | 7.0-7.5 lb       | Bone, excess skin/fat               |
| Chicken thigh (boneless, skinless)  | 95-100% | 9.5-10 lb        | Minimal trim                        |
| Whole duck                          | 55-60%  | 5.5-6.0 lb       | Bones, excess fat, neck             |
| Duck breast                         | 85-90%  | 8.5-9.0 lb       | Silver skin, excess fat             |
| Whole turkey                        | 55-60%  | 5.5-6.0 lb       | Bones, skin, giblets, neck          |
| Turkey breast (bone-in)             | 70-75%  | 7.0-7.5 lb       | Bone, skin                          |
| Lamb rack (frenched)                | 65-70%  | 6.5-7.0 lb       | Bones, fat cap, chain               |
| Lamb shoulder (bone-in)             | 65-70%  | 6.5-7.0 lb       | Bone, fat, glands                   |
| Lamb leg (bone-in)                  | 70-75%  | 7.0-7.5 lb       | Bone, fat                           |
| Whole salmon                        | 55-65%  | 5.5-6.5 lb       | Head, bones, skin, belly, fins      |
| Salmon fillet (skin-on)             | 90-95%  | 9.0-9.5 lb       | Pin bones, belly trim               |
| Salmon fillet (skinless)            | 95-100% | 9.5-10 lb        | Pin bones                           |
| Whole branzino/snapper              | 40-50%  | 4.0-5.0 lb       | Head, bones, skin, fins, guts       |
| Tuna loin                           | 90-95%  | 9.0-9.5 lb       | Bloodline, sinew                    |
| Halibut fillet                      | 90-95%  | 9.0-9.5 lb       | Minimal trim                        |
| Cod fillet                          | 92-98%  | 9.2-9.8 lb       | Minimal                             |
| Shrimp (shell-on, head-on)          | 45-55%  | 4.5-5.5 lb       | Head, shell, vein                   |
| Shrimp (shell-on, headless)         | 60-70%  | 6.0-7.0 lb       | Shell, vein                         |
| Shrimp (peeled, deveined)           | 95-100% | 9.5-10 lb        | None                                |
| Whole lobster                       | 25-30%  | 2.5-3.0 lb       | Shell, tomalley, roe                |
| Lobster tail                        | 65-70%  | 6.5-7.0 lb       | Shell                               |
| Crab (whole Dungeness)              | 25-30%  | 2.5-3.0 lb       | Shell, guts                         |
| Crab legs (king/snow)               | 50-55%  | 5.0-5.5 lb       | Shell                               |
| Mussels                             | 30-35%  | 3.0-3.5 lb       | Shell                               |
| Clams                               | 25-30%  | 2.5-3.0 lb       | Shell                               |
| Scallops (dry-packed, U10)          | 95-100% | 9.5-10 lb        | Side muscle                         |
| Squid/calamari (whole)              | 65-70%  | 6.5-7.0 lb       | Head, guts, beak, skin              |
| Octopus                             | 50-55%  | 5.0-5.5 lb       | Head, beak (plus cooking shrinkage) |
| **Produce**                         |         |                  |                                     |
| Onion                               | 85-90%  | 8.5-9.0 lb       | Skin, root, top                     |
| Shallot                             | 80-85%  | 8.0-8.5 lb       | Skin, root                          |
| Garlic                              | 85-88%  | 8.5-8.8 lb       | Skin, root plate                    |
| Leek                                | 50-55%  | 5.0-5.5 lb       | Dark green tops, root, outer layer  |
| Carrot                              | 80-85%  | 8.0-8.5 lb       | Peel, top                           |
| Celery                              | 75-80%  | 7.5-8.0 lb       | Leaves, base, outer strings         |
| Potato (peeled)                     | 80-85%  | 8.0-8.5 lb       | Peel, eyes                          |
| Sweet potato (peeled)               | 80-85%  | 8.0-8.5 lb       | Peel                                |
| Beet (peeled)                       | 75-80%  | 7.5-8.0 lb       | Skin, top, tail                     |
| Turnip (peeled)                     | 80-85%  | 8.0-8.5 lb       | Skin, top                           |
| Parsnip                             | 80-85%  | 8.0-8.5 lb       | Peel, top, core if woody            |
| Broccoli (florets only)             | 60-70%  | 6.0-7.0 lb       | Stem, leaves                        |
| Broccoli (florets + peeled stem)    | 80-85%  | 8.0-8.5 lb       | Leaves, outer stem peel             |
| Cauliflower                         | 55-65%  | 5.5-6.5 lb       | Core, leaves, stem                  |
| Asparagus                           | 55-65%  | 5.5-6.5 lb       | Woody ends                          |
| Green beans                         | 88-92%  | 8.8-9.2 lb       | Stem ends                           |
| Brussels sprouts                    | 80-85%  | 8.0-8.5 lb       | Outer leaves, stem                  |
| Corn (kernels from cob)             | 45-50%  | 4.5-5.0 lb       | Cob, husk, silk                     |
| Artichoke (heart only)              | 30-40%  | 3.0-4.0 lb       | Outer leaves, choke, stem           |
| Fennel                              | 65-70%  | 6.5-7.0 lb       | Stalks, core, fronds                |
| Bell pepper                         | 80-85%  | 8.0-8.5 lb       | Seeds, stem, ribs                   |
| Mushrooms (button/cremini)          | 95-98%  | 9.5-9.8 lb       | Stem tip                            |
| Mushrooms (shiitake)                | 85-90%  | 8.5-9.0 lb       | Stems (tough)                       |
| Mushrooms (oyster)                  | 90-95%  | 9.0-9.5 lb       | Stem base                           |
| Eggplant                            | 85-90%  | 8.5-9.0 lb       | Stem, optional peel                 |
| Zucchini                            | 90-95%  | 9.0-9.5 lb       | Stem end                            |
| Cucumber                            | 85-95%  | 8.5-9.5 lb       | Peel (optional), seeds (optional)   |
| Tomato                              | 90-95%  | 9.0-9.5 lb       | Core, optional peel/seeds           |
| Lettuce (iceberg)                   | 74-80%  | 7.4-8.0 lb       | Core, outer leaves                  |
| Lettuce (romaine)                   | 70-75%  | 7.0-7.5 lb       | Outer leaves, root                  |
| Spinach (baby, pre-washed)          | 92-98%  | 9.2-9.8 lb       | Stems (minimal)                     |
| Spinach (bunch)                     | 70-80%  | 7.0-8.0 lb       | Stems, damaged leaves               |
| Kale (leaves only)                  | 60-70%  | 6.0-7.0 lb       | Stems, ribs                         |
| Cabbage                             | 80-85%  | 8.0-8.5 lb       | Core, outer leaves                  |
| Herbs (basil, mint, cilantro)       | 40-60%  | 4.0-6.0 lb       | Stems                               |
| Herbs (thyme, rosemary)             | 35-50%  | 3.5-5.0 lb       | Woody stems                         |
| **Fruit**                           |         |                  |                                     |
| Apple (peeled, cored)               | 75-80%  | 7.5-8.0 lb       | Peel, core                          |
| Pear (peeled, cored)                | 75-80%  | 7.5-8.0 lb       | Peel, core                          |
| Peach (peeled, pitted)              | 75-80%  | 7.5-8.0 lb       | Skin, pit                           |
| Mango (flesh only)                  | 60-65%  | 6.0-6.5 lb       | Skin, pit                           |
| Pineapple (trimmed)                 | 50-55%  | 5.0-5.5 lb       | Skin, core, top                     |
| Watermelon (flesh only)             | 50-55%  | 5.0-5.5 lb       | Rind, seeds                         |
| Cantaloupe (flesh only)             | 50-55%  | 5.0-5.5 lb       | Rind, seeds                         |
| Strawberries (hulled)               | 90-92%  | 9.0-9.2 lb       | Hull, leaves                        |
| Blueberries                         | 95-98%  | 9.5-9.8 lb       | Stems (minimal)                     |
| Raspberries                         | 95-98%  | 9.5-9.8 lb       | None (fragile, handle loss)         |
| Banana (peeled)                     | 65-70%  | 6.5-7.0 lb       | Peel                                |
| Avocado (flesh only)                | 65-70%  | 6.5-7.0 lb       | Skin, pit                           |
| Citrus (segments, no membrane)      | 45-55%  | 4.5-5.5 lb       | Peel, pith, membrane, seeds         |
| Citrus (juice only)                 | 30-40%  | 3.0-4.0 lb       | Peel, pith, pulp, seeds             |
| Pomegranate (arils)                 | 40-45%  | 4.0-4.5 lb       | Skin, membrane                      |
| Coconut (fresh meat)                | 30-35%  | 3.0-3.5 lb       | Shell, water, brown skin            |
| Grapes                              | 95-98%  | 9.5-9.8 lb       | Stems                               |

### 2b. Cooking Yield (Thermal Loss)

| Item / Method                     | Cooking Yield % | Notes                              |
| --------------------------------- | --------------- | ---------------------------------- |
| **Proteins**                      |                 |                                    |
| Beef roast (oven-roasted, medium) | 70-75%          |                                    |
| Beef roast (braised)              | 60-65%          | Long cook, more moisture loss      |
| Beef brisket (smoked, 12+ hrs)    | 50-60%          | Extreme moisture and fat loss      |
| Beef brisket (braised)            | 55-65%          |                                    |
| Beef steak (grilled/seared)       | 75-85%          | Quick cook, less loss              |
| Beef stew meat (braised)          | 65-70%          |                                    |
| Ground beef (80/20)               | 70-75%          | Fat renders out                    |
| Ground beef (90/10)               | 80-85%          | Less fat to render                 |
| Pork shoulder (braised/smoked)    | 55-65%          |                                    |
| Pork loin (roasted)               | 75-80%          |                                    |
| Pork chop (grilled)               | 80-85%          |                                    |
| Pork belly (roasted/braised)      | 60-70%          | Fat renders                        |
| Baby back ribs (smoked)           | 65-75%          |                                    |
| Bacon                             | 30-40%          | Extreme fat render + moisture loss |
| Pancetta (rendered)               | 50-60%          |                                    |
| Chicken breast (roasted/grilled)  | 75-85%          |                                    |
| Chicken breast (poached)          | 85-90%          | Gentlest method, least loss        |
| Chicken thigh (braised)           | 70-75%          |                                    |
| Whole chicken (roasted)           | 70-75%          |                                    |
| Chicken wings (fried)             | 70-75%          |                                    |
| Duck breast (skin-on, rendered)   | 60-70%          | Significant fat render             |
| Whole duck (roasted)              | 55-65%          |                                    |
| Turkey (whole, roasted)           | 65-70%          |                                    |
| Lamb rack (roasted)               | 75-80%          |                                    |
| Lamb shoulder (braised)           | 55-65%          |                                    |
| Lamb shank (braised)              | 55-60%          |                                    |
| Salmon (roasted/seared)           | 80-85%          |                                    |
| Salmon (poached)                  | 85-90%          |                                    |
| White fish (sauteed)              | 80-85%          |                                    |
| Shrimp (sauteed/grilled)          | 80-85%          |                                    |
| Octopus (braised)                 | 45-55%          | Extreme shrinkage                  |
| Squid (quick sauteed)             | 75-80%          |                                    |
| **Starches (gain weight)**        |                 |                                    |
| White rice (dry to cooked)        | 250-300%        | Absorbs water                      |
| Brown rice (dry to cooked)        | 250-275%        |                                    |
| Pasta (dry to cooked)             | 200-225%        |                                    |
| Fresh pasta (to cooked)           | 130-150%        | Less absorption                    |
| Dried beans (soaked + cooked)     | 200-250%        |                                    |
| Lentils (dry to cooked)           | 200-250%        |                                    |
| Quinoa (dry to cooked)            | 275-300%        |                                    |
| Couscous (dry to hydrated)        | 250-275%        |                                    |
| Barley (dry to cooked)            | 300-350%        |                                    |
| Polenta (dry to cooked)           | 400-500%        | Very high water absorption         |
| Bread dough (baked)               | 85-90%          | Loses moisture in oven             |
| **Vegetables**                    |                 |                                    |
| Mushrooms (sauteed)               | 50-60%          | Massive moisture loss              |
| Spinach (wilted/sauteed)          | 15-20%          | Extreme volume and weight loss     |
| Kale (sauteed)                    | 40-50%          |                                    |
| Chard (sauteed)                   | 30-40%          |                                    |
| Tomatoes (roasted)                | 60-70%          |                                    |
| Tomatoes (slow-roasted/confit)    | 40-50%          |                                    |
| Onions (sauteed soft)             | 70-80%          |                                    |
| Onions (caramelized)              | 25-35%          | Long cook, extreme moisture loss   |
| Peppers (roasted, peeled)         | 60-70%          | Lose skin + moisture               |
| Eggplant (roasted)                | 60-70%          |                                    |
| Zucchini (sauteed)                | 70-80%          |                                    |
| Cabbage (braised)                 | 50-60%          |                                    |
| Root vegetables (roasted)         | 75-85%          |                                    |
| Corn (grilled on cob)             | 90-95%          | Minimal loss                       |
| Green beans (blanched)            | 90-95%          |                                    |
| Broccoli (roasted)                | 75-85%          |                                    |

### 2c. Combined Yield Formula

```
Combined Yield % = Trim Yield % x Cooking Yield %
True Cost Per Servable Unit = Purchase Price / Combined Yield
```

**Quick reference examples:**

| Item                          | AP Price/lb | Trim Yield | Cook Yield | Combined | True EP Cost/lb |
| ----------------------------- | ----------- | ---------- | ---------- | -------- | --------------- |
| Beef brisket (smoked)         | $5.00       | 78%        | 55%        | 43%      | $11.63          |
| Whole chicken (roasted)       | $2.50       | 63%        | 72%        | 45%      | $5.56           |
| Salmon (skin-on, seared)      | $12.00      | 92%        | 82%        | 75%      | $16.00          |
| Pork shoulder (pulled)        | $3.50       | 72%        | 60%        | 43%      | $8.14           |
| Lamb rack (frenched, roasted) | $28.00      | 68%        | 78%        | 53%      | $52.83          |
| Spinach (sauteed)             | $5.00       | 75%        | 18%        | 14%      | $35.71          |
| Mushrooms (sauteed)           | $6.00       | 96%        | 55%        | 53%      | $11.32          |
| Onions (caramelized)          | $1.20       | 88%        | 30%        | 26%      | $4.62           |

---

## 3. Portion Standards

### 3a. By Course (Standard American Plated)

| Course              | Standard (oz) | Tasting (oz)        | Buffet (oz per head) |
| ------------------- | ------------- | ------------------- | -------------------- |
| Amuse-bouche        | 1-2           | 1-2                 | N/A                  |
| Appetizer (cold)    | 3-4           | 2-3                 | 4-5                  |
| Appetizer (hot)     | 4-5           | 2-3                 | 5-6                  |
| Soup (cup)          | 6-8           | 3-4                 | 6-8                  |
| Soup (bowl)         | 10-12         | N/A                 | N/A                  |
| Salad (side)        | 2-3           | 1.5-2               | 3-4                  |
| Salad (entree)      | 5-7           | N/A                 | N/A                  |
| Intermezzo / sorbet | N/A           | 2-3                 | N/A                  |
| Fish course         | N/A           | 3-4 protein         | N/A                  |
| Entree protein      | 5-8           | 3-4                 | 6-8                  |
| Entree starch       | 4-6           | 2-3                 | 5-6                  |
| Entree vegetable    | 3-4           | 2-3                 | 4-5                  |
| Cheese course       | N/A           | 2-3 (2-3 varieties) | N/A                  |
| Pre-dessert         | N/A           | 1-2                 | N/A                  |
| Dessert             | 4-6           | 3-4                 | 4-5                  |
| Petit fours         | N/A           | 1-2 (2-3 pieces)    | N/A                  |
| Bread per person    | 1.5-2         | 1-1.5               | 2-3                  |
| Butter per person   | 0.5-1         | 0.5                 | 0.75-1               |

### 3b. By Service Style (Multiplier vs. Plated Baseline)

| Style                          | Food Volume Multiplier            | Notes                                                                |
| ------------------------------ | --------------------------------- | -------------------------------------------------------------------- |
| Plated                         | 1.0x (baseline)                   | Most controlled. Least waste.                                        |
| Family style                   | 1.15-1.25x                        | Guests self-serve. Overproduce to avoid empty platters.              |
| Buffet                         | 1.25-1.40x                        | Must maintain visual fullness. Plan 1.5x on popular items.           |
| Passed hors d'oeuvres          | N/A (use piece count)             | 8-12 pieces/person/hr (first hour), 4-6/hr after. Min 3-4 varieties. |
| Stations / action              | 1.20-1.30x                        | Each station needs critical mass independently.                      |
| Tasting menu                   | 0.6-0.7x per course, 5-12 courses | Total volume often exceeds 3-course meal despite smaller portions.   |
| Cocktail reception (no dinner) | 1.30-1.40x on passed apps         | This IS the meal. Plan heavier.                                      |

### 3c. By Context / Demographic (Adjustment to Standard)

| Factor                                        | Adjustment                               | Rationale                                |
| --------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Corporate lunch                               | -10%                                     | People eat lighter at work events        |
| Wedding dinner                                | Standard (0%)                            | Normal consumption, heavier on drinks    |
| Holiday / celebration                         | +10-15%                                  | People indulge                           |
| Cocktail reception only (no dinner following) | +30-40% on apps                          | Apps are the meal                        |
| Children under 12                             | -40-50% (half portions)                  |                                          |
| Outdoor summer event                          | -10% heavy proteins, +20% light items    | Heat suppresses appetite for heavy food  |
| Outdoor winter event                          | +10-15% on hearty items                  | Cold increases appetite for comfort food |
| Late-night event (after 9 PM)                 | -15-20%                                  | Most guests have eaten earlier           |
| Health-conscious crowd                        | -10% starches/desserts, +10% veg/salads  |                                          |
| Heavy drinking event                          | +15-20% overall                          | Alcohol increases appetite               |
| Brunch                                        | -10-15% vs dinner portions               | Lighter courses overall                  |
| Afternoon tea                                 | 3-4 savory bites + 3-4 sweets per person | Standardized format                      |

### 3d. Protein Portion by Cooking Method

| Protein Type               | Raw Portion (oz)               | Cooked Portion (oz)  | Notes                       |
| -------------------------- | ------------------------------ | -------------------- | --------------------------- |
| Steak (entree)             | 8-10                           | 6-8                  | Bone-in may be 12-16 oz raw |
| Chicken breast (entree)    | 7-8                            | 5-6                  |                             |
| Chicken thigh (entree)     | 6-7 (boneless)                 | 4.5-5.5              |                             |
| Fish fillet (entree)       | 6-8                            | 5-7                  |                             |
| Shrimp (entree)            | 6-8 (shell-on)                 | 4-5 (peeled, cooked) | Roughly 5-7 large shrimp    |
| Lamb chop (entree)         | 2-3 chops (10-12 oz total raw) | 7-9                  |                             |
| Pork chop (entree)         | 8-10                           | 6-8                  |                             |
| Pulled pork (entree)       | N/A (batch cooked)             | 5-6                  |                             |
| Braised short rib (entree) | 10-12 (bone-in, raw)           | 5-6 (meat only)      |                             |

---

## 4. Operator-Specific Cost Lines

### 4a. Cost Lines by Business Type

Each operator type has cost lines that go beyond Food + Labor + Overhead. These are the additional items that must be captured in a complete cost-plus calculation.

**Private Chef / Personal Chef:**
| Cost Line | Typical Range | Frequency |
|-----------|--------------|-----------|
| Travel (mileage) | IRS rate ($0.67/mile in 2026) or actual fuel | Per event |
| Travel time | Hourly rate x drive hours | Per event |
| Parking | $0-50 | Per event |
| Grocery shopping time | 1-3 hours x hourly rate | Per event |
| Client kitchen limitations | $0-200 (rental equipment) | Occasional |
| Disposables | $5-30 | Per event |
| Cleaning supplies | $5-15 | Per event |

**Caterer / Event Production:**
| Cost Line | Typical Range | Frequency |
|-----------|--------------|-----------|
| Venue rental | $0-5,000 | Per event |
| Equipment rental | $100-2,000 | Per event |
| Linen rental | $100-800 | Per event |
| China/glass/flatware rental | $3-15 per setting | Per event |
| Chafing dishes / warmers | $8-25 each | Per event |
| Staff (servers, bartenders) | $25-45/hr per person | Per event |
| Delivery/transport | $50-500 | Per event |
| Floral/decor | $0-5,000 | Per event (if included) |
| Permits / licenses | $50-500 | Per event |

**Food Truck / Mobile:**
| Cost Line | Typical Range | Frequency |
|-----------|--------------|-----------|
| Commissary kitchen rental | $500-2,000/month | Monthly |
| Generator fuel | $15-40/day | Per service |
| Parking permit / vending fee | $25-500/day | Per service |
| Vehicle maintenance | $200-600/month | Monthly |
| Vehicle insurance | $200-500/month | Monthly |
| Propane | $20-40/tank | Weekly |
| POS system fees | $30-100/month | Monthly |
| Packaging (containers, bags, utensils) | $0.50-1.50 per order | Per transaction |

**Ghost Kitchen / Delivery-Only:**
| Cost Line | Typical Range | Frequency |
|-----------|--------------|-----------|
| Kitchen rental (shared space) | $1,500-5,000/month | Monthly |
| Platform commission (DoorDash, UberEats) | 15-30% of order total | Per order |
| Packaging per order | $0.75-2.50 | Per order |
| Tablet fees (platform) | $0-200/month | Monthly |
| Photography / menu content | $200-1,000 | One-time / quarterly |
| Marketing / promotions on platform | $100-500/month | Monthly |

**Bakery / Pastry:**
| Cost Line | Typical Range | Frequency |
|-----------|--------------|-----------|
| Packaging (boxes, bags, inserts, labels) | $0.25-3.00 per item | Per unit |
| Decoration labor (cakes) | $25-75/hr, 2-20 hrs per piece | Per order |
| Specialty equipment (molds, rings, tips) | $50-500 | Amortized |
| Waste rate (unsold perishables) | 5-15% of daily production | Daily |
| Display materials | $50-300 | Monthly |

**Restaurant (Dine-In):**
| Cost Line | Typical Range | Frequency |
|-----------|--------------|-----------|
| Rent / lease | $2,000-25,000/month | Monthly |
| Utilities | $500-3,000/month | Monthly |
| Beverage program (COGS) | 18-35% of bev revenue | Ongoing |
| Comps / voids | 1-3% of food revenue | Ongoing |
| Linen service | $200-600/month | Monthly |
| Smallwares replacement | $100-500/month | Monthly |
| POS system | $100-400/month | Monthly |
| Credit card processing | 2.5-3.5% of revenue | Per transaction |
| Waste removal | $100-500/month | Monthly |
| Pest control | $50-150/month | Monthly |
| Music licensing (BMI/ASCAP) | $300-1,500/year | Annual |

**Meal Prep / Subscription:**
| Cost Line | Typical Range | Frequency |
|-----------|--------------|-----------|
| Containers + lids | $0.30-1.00 per meal | Per unit |
| Labels (nutritional, branding) | $0.05-0.15 per label | Per unit |
| Insulated packaging | $1.50-4.00 per shipment | Per delivery |
| Gel packs / cold chain | $0.50-1.50 per shipment | Per delivery |
| Delivery labor or service | $3-10 per delivery | Per delivery |
| Subscription platform fees | $50-300/month | Monthly |
| Nutritional analysis software | $30-100/month | Monthly |

**Wholesale / CPG:**
| Cost Line | Typical Range | Frequency |
|-----------|--------------|-----------|
| Co-packing fees | $5,000-50,000 per run | Per production run |
| Packaging (jars, bottles, labels, cartons) | $0.50-5.00 per unit | Per unit |
| Freight / distribution | $0.25-2.00 per unit | Per unit |
| Slotting fees (retail placement) | $5,000-25,000 per SKU per chain | One-time |
| Broker commissions | 5-10% of wholesale price | Ongoing |
| Product liability insurance | $500-5,000/year | Annual |
| Lab testing / nutritional analysis | $500-2,000 per SKU | Per product launch |
| Spoilage / returns | 2-8% of shipped product | Ongoing |

**Pop-Up / Temporary Event:**
| Cost Line | Typical Range | Frequency |
|-----------|--------------|-----------|
| Venue fee / booth rental | $100-5,000 | Per event |
| Temporary health permit | $50-500 | Per event |
| Equipment transport | $50-300 | Per event |
| Setup / breakdown labor | 2-6 hours x rate | Per event |
| Tent / canopy rental | $100-1,000 | Per event |
| Tables / display rental | $50-300 | Per event |
| Signage / branding | $50-500 | Per event |

**Institutional (Schools, Hospitals, Corporate):**
| Cost Line | Typical Range | Frequency |
|-----------|--------------|-----------|
| Contract price lock (6-12 months) | Fixed per meal | Per contract period |
| Nutritional compliance overhead | 2-5% of labor | Ongoing |
| Commodity program credits | -$0.10-0.50 per meal | Ongoing (offset) |
| Waste documentation labor | 0.5-1 hr/day | Daily |
| Specialized dietary prep | +10-20% labor on restricted meals | Per meal |
| Tray / dish washing (industrial) | $0.15-0.40 per tray | Per meal |

### 4b. Universal Cost Lines (All Operator Types)

| Cost Line                      | Typical Range                   | Notes                                            |
| ------------------------------ | ------------------------------- | ------------------------------------------------ |
| Credit card processing         | 2.5-3.5% of revenue             | Unavoidable for cashless operations              |
| Sales tax (prepared food)      | 0-10% depending on jurisdiction | Some states exempt grocery but not prepared food |
| Business insurance (liability) | $500-3,000/year                 | Required                                         |
| Health department fees         | $100-500/year                   | Annual inspection / permit                       |
| Business license               | $50-500/year                    | Varies by municipality                           |
| Workers comp (if employees)    | 1-5% of payroll                 | State-mandated                                   |
| Accounting / bookkeeping       | $100-500/month                  | Often overlooked                                 |
| Marketing / client acquisition | Variable                        | Real cost of getting each new client             |

---

## 5. Seasonal Availability (North America, Temperate)

### 5a. Produce Peak Seasons

| Item                                       | Peak Season      | Off-Season Price Premium                |
| ------------------------------------------ | ---------------- | --------------------------------------- |
| Asparagus                                  | Mar-Jun          | +40-60%                                 |
| Strawberries                               | Apr-Jun          | +50-80%                                 |
| Peas (fresh)                               | Apr-Jun          | +60-100%                                |
| Rhubarb                                    | Apr-Jun          | Often unavailable off-season            |
| Artichokes                                 | Mar-May, Sep-Oct | +30-50%                                 |
| Cherries                                   | Jun-Aug          | +60-100%                                |
| Blueberries                                | Jun-Aug          | +40-70%                                 |
| Raspberries                                | Jun-Sep          | +50-80%                                 |
| Peaches / Nectarines                       | Jun-Sep          | +40-60%                                 |
| Tomatoes (field)                           | Jul-Sep          | +30-60% (hothouse available year-round) |
| Corn                                       | Jul-Sep          | +40-60%                                 |
| Zucchini / Summer squash                   | Jun-Sep          | +20-40%                                 |
| Eggplant                                   | Jul-Oct          | +30-50%                                 |
| Bell peppers                               | Jul-Oct          | +20-40% (hothouse available year-round) |
| Melons (watermelon, cantaloupe)            | Jun-Sep          | +40-70%                                 |
| Figs                                       | Aug-Oct          | +80-150% or unavailable                 |
| Grapes (table)                             | Jul-Nov          | +20-40%                                 |
| Apples                                     | Aug-Nov          | +10-20% (good storage crop)             |
| Pears                                      | Aug-Nov          | +15-25%                                 |
| Pumpkin / Winter squash                    | Sep-Dec          | +20-40%                                 |
| Cranberries                                | Sep-Nov          | Frozen available year-round             |
| Brussels sprouts                           | Sep-Mar          | +15-25% off-season                      |
| Root vegetables (turnips, parsnips, beets) | Oct-Mar          | +15-25%                                 |
| Citrus (oranges, lemons, grapefruit)       | Nov-Apr          | +20-40%                                 |
| Kale / Collards                            | Oct-Mar          | Year-round but best in cold             |
| Cabbage                                    | Year-round       | Minimal seasonal swing                  |
| Onions                                     | Year-round       | Minimal seasonal swing                  |
| Carrots                                    | Year-round       | Minimal seasonal swing                  |
| Potatoes                                   | Year-round       | Minimal seasonal swing (storage crop)   |

### 5b. Protein Seasonal Availability

| Item                | Peak Season | Notes                                              |
| ------------------- | ----------- | -------------------------------------------------- |
| Wild Alaskan salmon | May-Sep     | Frozen available year-round; fresh only in season  |
| Copper River salmon | May-Jun     | 4-6 week window. Premium pricing.                  |
| Dungeness crab      | Nov-Jun     | West Coast. Price spikes Nov-Dec.                  |
| King crab           | Oct-Jan     | Alaska. Extremely seasonal.                        |
| Snow crab           | Apr-Jul     | Atlantic/Pacific                                   |
| Soft-shell crab     | May-Sep     | Atlantic. Very short peak.                         |
| Maine lobster       | Jun-Dec     | Cheapest Jul-Sep (new shell). Premium Dec.         |
| Oysters             | Sep-Apr     | "R months" tradition. Available year-round farmed. |
| Wild shrimp (Gulf)  | May-Dec     | Farmed available year-round                        |
| Halibut (Pacific)   | Mar-Nov     | Season set by regulation                           |
| Swordfish           | Jun-Oct     | Atlantic                                           |
| Striped bass (wild) | Apr-Oct     | Atlantic. Regulated.                               |
| Turkey              | Year-round  | Price spike Oct-Nov (Thanksgiving demand)          |
| Lamb                | Year-round  | Spring lamb premium Mar-Apr (Easter)               |
| Venison             | Oct-Feb     | Farm-raised available year-round                   |
| Duck                | Year-round  | Slight premium Nov-Dec                             |

### 5c. Holiday Demand Spikes

| Holiday               | Items Affected                                 | Typical Price Increase                |
| --------------------- | ---------------------------------------------- | ------------------------------------- |
| Thanksgiving (Nov)    | Turkey, cranberries, sweet potatoes, pumpkin   | Turkey +20-40%, others +10-20%        |
| Christmas / NYE (Dec) | Prime rib, beef tenderloin, lamb rack, lobster | Beef +15-30%, lobster +20-40%         |
| Easter (Mar/Apr)      | Lamb, ham, asparagus                           | Lamb +15-25%                          |
| Super Bowl (Feb)      | Chicken wings, avocados                        | Wings +20-40%, avocados +15-25%       |
| July 4th              | Ground beef, hot dogs, ribs, corn              | Ribs +10-20%                          |
| Valentine's Day (Feb) | Filet mignon, lobster, chocolate, strawberries | Lobster +15-25%, strawberries +30-50% |

---

## 6. Dietary Restriction Cost Impact

| Restriction                    | Cost Multiplier             | Primary Cost Drivers                                              |
| ------------------------------ | --------------------------- | ----------------------------------------------------------------- |
| Standard (no restrictions)     | 1.0x                        | Baseline                                                          |
| Gluten-free                    | 1.10-1.25x                  | GF flour 2-4x cost, GF pasta 2-3x, cross-contact prevention labor |
| Dairy-free                     | 1.05-1.15x                  | Plant butter 1.5-2x, oat/coconut cream 1.5-2x, cashew cheese 3-4x |
| Vegan                          | 1.00-1.15x                  | Depends on protein: tofu cheap, specialty proteins expensive      |
| Nut-free                       | 1.00-1.05x                  | Minimal; substitution-based (sunflower butter, seed-based)        |
| Kosher                         | 1.15-1.40x                  | Kosher meat 1.5-2.5x, separate prep equipment, certification      |
| Halal                          | 1.05-1.15x                  | Halal meat 1.1-1.5x                                               |
| Keto / Low-carb                | 1.10-1.20x                  | More protein/fat per plate, less cheap starch filler              |
| Organic                        | 1.30-2.00x                  | Varies wildly: chicken 2x, berries 2-3x, grains 1.5-2x            |
| Paleo                          | 1.15-1.30x                  | No cheap grains/legumes; more protein, more specialty flours      |
| Raw / Uncooked                 | 1.10-1.20x                  | Sushi-grade required for fish, highest quality produce            |
| Multiple restrictions combined | Multiply individual factors | GF + dairy-free + organic stacks to 1.50-2.50x                    |

---

## 7. Common Pack Sizes (Purchasing Reference)

| Item                                | Common Pack Sizes                            | Notes                                          |
| ----------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| Chicken breast (boneless, skinless) | 40 lb case, 10 lb bag                        | IQF (individually quick frozen) for portioning |
| Ground beef                         | 10 lb chub, 5 lb pack, bulk by the lb        | 80/20 most common                              |
| Beef tenderloin                     | 5-8 lb whole (PSMO), by the lb               |                                                |
| Salmon fillet                       | By the lb, 10 lb case                        | Skin-on or skinless                            |
| Shrimp                              | 2 lb bag, 5 lb block (IQF)                   | Sized by count per lb (16/20, 21/25, 26/30)    |
| Butter                              | 1 lb (4 sticks), 36 lb case                  |                                                |
| Heavy cream                         | 1 qt, 1/2 gal, case of 12 qt                 |                                                |
| Milk                                | 1 gal, case of 4 gal                         |                                                |
| Eggs                                | 1 dozen, 15 dozen case (flat), 30 dozen case |                                                |
| All-purpose flour                   | 5 lb bag, 25 lb bag, 50 lb bag               |                                                |
| Sugar                               | 4 lb bag, 10 lb bag, 50 lb bag               |                                                |
| Olive oil                           | 500 mL, 1 L, 3 L tin, 1 gal, 6 gal case      |                                                |
| Vegetable oil                       | 1 gal, 35 lb container                       |                                                |
| Kosher salt (Diamond Crystal)       | 3 lb box, 26 oz box                          |                                                |
| Kosher salt (Morton)                | 3 lb box, 25 lb bag                          |                                                |
| Rice                                | 5 lb bag, 25 lb bag, 50 lb bag               |                                                |
| Canned tomatoes (#10 can)           | 6.5 lb per can, case of 6                    | #10 = institutional size                       |
| Canned beans (#10 can)              | 6.5 lb per can, case of 6                    |                                                |
| Onions                              | 3 lb bag, 10 lb bag, 50 lb sack              |                                                |
| Potatoes                            | 5 lb bag, 10 lb bag, 50 lb case              |                                                |
| Carrots                             | 2 lb bag, 5 lb bag, 25 lb case               |                                                |
| Mixed greens                        | 1 lb clamshell, 3 lb case                    |                                                |
| Herbs (fresh)                       | 1 oz pack (retail), 1 lb bunch (wholesale)   |                                                |
| Lemons                              | Each, 5 lb bag, 40 lb case                   |                                                |
| Garlic                              | Each head, 1 lb bag, 30 lb case              |                                                |
| Parmesan                            | Wedge by the lb, 24 lb wheel                 |                                                |
| Cream cheese                        | 8 oz block, 3 lb block                       |                                                |
| Bread                               | Loaf, case of 6-12                           |                                                |
| Pasta (dry)                         | 1 lb box, 10 lb case, 20 lb case             |                                                |
| Wine (cooking)                      | 750 mL, 1.5 L                                |                                                |
| Soy sauce                           | 10 fl oz, 1 gal, 5 gal                       |                                                |

---

## 8. Scaling Factors (Non-Linear Adjustments)

| Component                      | Scaling Behavior at 2x+           | Recommended Adjustment               |
| ------------------------------ | --------------------------------- | ------------------------------------ |
| Salt / seasoning               | Over-seasons if doubled exactly   | Scale to 75-80%, adjust to taste     |
| Baking powder / baking soda    | Over-leavens if doubled exactly   | Scale to 80-90%                      |
| Yeast                          | Over-rises if doubled exactly     | Scale to 80-90%, adjust proof time   |
| Garlic / shallots / aromatics  | Flavor concentrates               | Scale to 85-90%                      |
| Chili / hot peppers            | Heat compounds                    | Scale to 70-80%                      |
| Vanilla extract                | Concentrates at volume            | Scale to 80-85%                      |
| Thickeners (flour, cornstarch) | Non-linear thickening             | Scale to 85-90%, test                |
| Fat for sauteing               | Constrained by pan size           | Add pans, not more fat per pan       |
| Reduction sauces               | Time increases non-linearly       | Use wider pans for more surface area |
| Gelatin                        | Non-linear setting at large batch | Scale to 85-90%                      |
| Acids (vinegar, citrus)        | Sharpness compounds               | Scale to 80-85%                      |

---

## 9. Cross-Utilization Map

| Primary Product             | Trim / Byproduct                      | Reuse As                                              |
| --------------------------- | ------------------------------------- | ----------------------------------------------------- |
| Beef tenderloin             | Chain meat, trim                      | Ground beef, stew meat, staff meal                    |
| Beef brisket                | Fat trimmings                         | Rendered beef tallow, burger blend                    |
| Chicken (whole fabrication) | Carcass, back, neck                   | Chicken stock                                         |
| Chicken (breast portioning) | Tenderloins                           | Chicken fingers, stir-fry, staff meal                 |
| Duck (whole fabrication)    | Carcass, fat                          | Duck stock, rendered duck fat                         |
| Pork (shoulder trim)        | Fat, skin                             | Rendered lard, chicharrones                           |
| Fish (fillet fabrication)   | Bones, head, skin                     | Fish fumet, crispy skin garnish                       |
| Shrimp (peeling)            | Shells, heads                         | Shrimp stock, bisque base                             |
| Lobster                     | Shells, bodies                        | Lobster stock, lobster butter                         |
| Vegetables (mirepoix prep)  | Onion ends, carrot peels, celery tops | Vegetable stock                                       |
| Herbs (leaf picking)        | Stems                                 | Bouquet garni, herb oil, stock                        |
| Corn (cutting kernels)      | Cobs                                  | Corn stock, corn cob jelly                            |
| Tomatoes (peeling/seeding)  | Skins, seeds, juice                   | Tomato water, stock base                              |
| Bread (day-old)             | Stale bread                           | Breadcrumbs, croutons, bread pudding, panzanella      |
| Citrus (juicing)            | Peels                                 | Zest, candied peel, oleo saccharum, cleaning solution |
| Overripe fruit              | Bruised/soft fruit                    | Purees, compotes, sorbets, smoothie base              |
| Rendered bacon              | Bacon fat                             | Cooking fat, vinaigrettes, cornbread                  |
| Parmesan                    | Rinds                                 | Stock/soup enrichment, bean cooking                   |
| Pickle brine                | Spent brine                           | Marinades, salad dressings, brine new vegetables      |
| Whey (from cheese/yogurt)   | Liquid whey                           | Bread dough, smoothies, brining                       |
| Coffee grounds              | Spent grounds                         | Rubs, composting                                      |
| Wine (opened, oxidizing)    | Leftover wine                         | Vinegar, cooking wine, reductions                     |

**Estimated margin recovery from cross-utilization: 3-8 percentage points off food cost when practiced consistently.**

---

## 10. Beverage Costing Reference Data

### 10a. Beverage Cost Targets

| Category              | Target Cost % | Typical Margin | Notes                                        |
| --------------------- | ------------- | -------------- | -------------------------------------------- |
| Well liquor           | 15-18%        | 82-85%         | Highest margin category in foodservice       |
| Call liquor           | 18-20%        | 80-82%         |                                              |
| Premium liquor        | 18-22%        | 78-82%         | Higher cost but higher price point           |
| Super-premium liquor  | 20-25%        | 75-80%         | Rare/luxury spirits                          |
| Cocktails (classic)   | 18-22%        | 78-82%         | 2-3 ingredients, simple build                |
| Cocktails (craft)     | 22-28%        | 72-78%         | Fresh juices, syrups, garnishes add cost     |
| Wine by the glass     | 25-35%        | 65-75%         | Standard: bottle cost / 4-5 glasses          |
| Wine by the bottle    | 30-40%        | 60-70%         | Lower markup than by-the-glass               |
| Draft beer            | 20-28%        | 72-80%         | Keg math (see yield table)                   |
| Bottled/canned beer   | 25-30%        | 70-75%         | Less margin than draft                       |
| Craft beer (draft)    | 25-30%        | 70-75%         | Higher keg cost                              |
| Non-alcoholic drinks  | 10-20%        | 80-90%         | Soda fountain syrup cost is nearly zero      |
| Coffee (drip)         | 12-18%        | 82-88%         | Per-cup cost is extremely low at volume      |
| Espresso drinks       | 15-22%        | 78-85%         | Milk is the expensive part, not the coffee   |
| Fresh-squeezed juice  | 25-35%        | 65-75%         | Citrus yield is low (30-40% of fruit weight) |
| Smoothies             | 22-30%        | 70-78%         | Frozen fruit, protein powder, dairy          |
| Iced tea (house-made) | 8-15%         | 85-92%         | Tea is very cheap per gallon                 |
| Lemonade (fresh)      | 18-25%        | 75-82%         | Sugar + lemon yield drives cost              |

### 10b. Beverage Yield Reference

| Item                          | Yield                           | Notes                           |
| ----------------------------- | ------------------------------- | ------------------------------- |
| 750 mL liquor bottle          | 17 standard pours (1.5 oz each) | 25.4 oz total                   |
| 1 L liquor bottle             | 22 standard pours               | 33.8 oz total                   |
| 1.75 L liquor bottle (handle) | 39 standard pours               | 59.2 oz total                   |
| 750 mL wine bottle            | 5 glasses (5 oz pour)           | 4.2 glasses at 6 oz pour        |
| 750 mL wine bottle            | 25 tasting pours (1 oz each)    | For wine tastings               |
| Half-barrel keg (15.5 gal)    | 124 pints (16 oz)               | Account for 5-10% foam loss     |
| Sixth-barrel keg (5.16 gal)   | 41 pints                        | Common for craft beer           |
| 1 lb coffee beans             | 40-45 cups (6 oz brewed)        | Standard ratio: 2 tbsp per 6 oz |
| 5 lb bag coffee               | 200-225 cups                    |                                 |
| 1 gallon simple syrup         | 128 oz / ~85 cocktails          | At 1.5 oz per drink             |
| 1 case lemons (140 ct)        | ~560 oz juice / ~373 cocktails  | At 1.5 oz juice per cocktail    |

### 10c. Ice and Displacement

| Glass Size   | Ice Fill   | Liquid Capacity | Notes                            |
| ------------ | ---------- | --------------- | -------------------------------- |
| 12 oz        | Standard   | 8-9 oz          | 25-33% displacement              |
| 16 oz        | Standard   | 11-12 oz        |                                  |
| 22 oz        | Standard   | 15-16 oz        |                                  |
| Rocks (8 oz) | Large cube | 5-6 oz          | Single large cube, less dilution |
| Pint (16 oz) | No ice     | 16 oz           | Draft beer, no displacement      |

### 10d. Bar Service Planning (Events)

| Service Type    | Drinks/Person/Hour (First) | Drinks/Person/Hour (After) | Notes                          |
| --------------- | -------------------------- | -------------------------- | ------------------------------ |
| Open bar        | 2.0-2.5                    | 1.0-1.5                    | Budget liberally               |
| Limited bar     | 1.5-2.0                    | 0.75-1.0                   | Beer, wine, signature cocktail |
| Beer and wine   | 1.5-2.0                    | 0.75-1.0                   | Lower cost per drink           |
| Cash bar        | 1.0-1.5                    | 0.5-1.0                    | Guests self-regulate           |
| Consumption bar | 1.5-2.0                    | 1.0-1.5                    | Tab-based; harder to predict   |

**Bottle planning for events (open bar, 4-hour event):**

| Drink Type | Per 100 Guests | Notes                               |
| ---------- | -------------- | ----------------------------------- |
| Liquor     | 10-12 bottles  | Mix of vodka, gin, whiskey, tequila |
| Wine       | 18-22 bottles  | 60% white, 40% red (adjust by menu) |
| Beer       | 2-3 cases      | Mix of light and craft              |
| Mixers     | 15-20 L total  | Tonic, soda, juice, ginger ale      |
| Garnishes  | $40-80         | Citrus, olives, cherries, herbs     |

---

## 11. Waste and Spoilage Rates

### 11a. Expected Spoilage by Operation Type

| Operation Type | Expected Rate | Primary Drivers                                      |
| -------------- | ------------- | ---------------------------------------------------- |
| Fine dining    | 5-8%          | Wide ingredient variety, premium perishables         |
| Casual dining  | 4-7%          | Broad menu, moderate turnover                        |
| Private chef   | 1-3%          | Buy per job, minimal sitting inventory               |
| Catering       | 2-5%          | Buy per event, some surplus for safety               |
| Food truck     | 3-8%          | Limited storage, weather-dependent demand            |
| Ghost kitchen  | 3-8%          | Unpredictable order volume, perishable-heavy         |
| Bakery         | 5-15%         | Daily production of perishable items, unsold product |
| Meal prep      | 3-7%          | Batch production, tight shelf life windows           |
| Restaurant     | 4-10%         | Menu size is the biggest driver                      |
| Institutional  | 3-6%          | High volume, formal tracking, predictable demand     |
| Pop-up         | 2-5%          | One-shot inventory, plan conservatively              |
| Wholesale/CPG  | 2-8%          | Shipping damage, returns, shelf-life expiry          |

### 11b. Spoilage by Ingredient Category

| Category            | Shelf Life (Refrigerated) | Typical Spoilage Risk | Notes                                 |
| ------------------- | ------------------------- | --------------------- | ------------------------------------- |
| Fresh herbs         | 3-7 days                  | High (15-30%)         | Buy close to use date; stems in water |
| Berries             | 2-5 days                  | High (10-20%)         | Fragile, mold quickly                 |
| Fresh seafood       | 1-2 days                  | High (5-15%)          | Use day of purchase if possible       |
| Leafy greens        | 5-7 days                  | Medium-High (8-15%)   | Wilt, slime, bruise                   |
| Fresh mushrooms     | 5-7 days                  | Medium (5-10%)        | Paper bag, not plastic                |
| Dairy (cream, milk) | 7-14 days                 | Medium (3-8%)         | Check dates on delivery               |
| Soft cheese         | 7-14 days                 | Medium (3-8%)         | Mold risk after opening               |
| Fresh poultry       | 2-3 days                  | Medium (3-5%)         | Use or freeze within 48 hours         |
| Ground meat         | 1-2 days                  | Medium (3-5%)         | Highest bacteria risk                 |
| Hard cheese         | 3-6 weeks                 | Low (1-3%)            | Cut off mold, still usable            |
| Root vegetables     | 2-4 weeks                 | Low (2-5%)            | Good storage crop                     |
| Citrus              | 2-3 weeks                 | Low (2-4%)            | Dries out before rotting              |
| Eggs                | 3-5 weeks                 | Very Low (1-2%)       | Excellent shelf life                  |
| Dry goods           | 6-12 months               | Very Low (<1%)        | Pantry staples, minimal risk          |
| Frozen items        | 3-12 months               | Very Low (<1%)        | Freezer burn is the main concern      |

### 11c. Effective Cost Adjustment for Spoilage

```text
Effective Cost Per Sold Unit = Total Production Cost / (Total Units Produced x (1 - Spoilage Rate))
```

**Example:** You produce 100 croissants at $1.20 each ($120 total). 10 go unsold (10% spoilage). Your effective cost per sold croissant is $120 / 90 = $1.33, not $1.20. If you price at $3.50, your actual food cost is 38%, not 34%.

---

## 12. Non-Revenue Food Allowances

| Category        | Typical Range (% of food cost) | Notes                                             |
| --------------- | ------------------------------ | ------------------------------------------------- |
| Staff meals     | 1-3%                           | $3-5/person/shift; higher at restaurants          |
| Comps / voids   | 1-3%                           | Restaurants highest; private chef/catering lowest |
| Client tastings | 0.5-2%                         | Private chef and catering; spread across bookings |
| R&D / testing   | 1-3%                           | New menu development, recipe testing              |
| Quality control | 0.5-1%                         | Tasting during service for seasoning and plating  |
| **Total**       | **2-6%**                       | **Budget 3-4% as a baseline**                     |

**Tasting cost recovery model for private chefs and caterers:**

```text
Tasting Cost Per Event = (Total Annual Tasting Cost) / (Number of Booked Events)
```

If you do 20 tastings/year at $150 average cost and book 12 events from them, each booked event carries $250 in tasting cost ($3,000 / 12). Build this into your overhead or add a tasting fee.

---

## 13. Purchasing Strategy Reference

### 13a. Price Position by Channel

| Channel                             | Price vs. Broadline Delivered | Delivery  | Min Order | Best For                           |
| ----------------------------------- | ----------------------------- | --------- | --------- | ---------------------------------- |
| Broadline delivered (Sysco, USF)    | Baseline (1.0x)               | Yes       | $200-500  | Volume, range, consistency         |
| Specialty distributor               | 1.10-1.30x                    | Yes       | $150-400  | Quality, unique items              |
| Cash-and-carry (Restaurant Depot)   | 0.85-0.95x                    | No        | None      | No delivery fee, immediate         |
| Wholesale club (Costco, Sam's)      | 0.80-0.90x (select items)     | No        | None      | Butter, cream, eggs, dry goods     |
| Direct farm / ranch                 | 0.80-1.20x (varies widely)    | Sometimes | Varies    | Quality, story, relationship       |
| Farmers market                      | 1.00-1.30x                    | No        | None      | Peak-season produce, direct        |
| Retail grocery                      | 1.20-1.50x                    | No        | None      | Emergency, tiny quantities only    |
| Online wholesale (WebstaurantStore) | 0.90-1.00x                    | Yes       | Varies    | Equipment, dry goods, shelf-stable |

### 13b. Delivery Fee Impact

| Order Size | Delivery Fee | Fee as % of Order | Impact on Effective Food Cost |
| ---------- | ------------ | ----------------- | ----------------------------- |
| $200       | $50          | 25%               | Devastating; avoid            |
| $300       | $50          | 17%               | Too high; consolidate more    |
| $500       | $50          | 10%               | Acceptable for weekly drops   |
| $750       | $50          | 7%                | Target minimum                |
| $1,000     | $50          | 5%                | Good efficiency               |
| $1,500+    | $0 (waived)  | 0%                | Most broadliners waive here   |

### 13c. Volume Discount Comparison (Common Staples)

| Item              | Retail (per unit) | Wholesale (per unit)  | Savings | Break-Even Volume     |
| ----------------- | ----------------- | --------------------- | ------- | --------------------- |
| All-purpose flour | $0.80/lb (5 lb)   | $0.35/lb (50 lb)      | 56%     | Must use 50 lb/month  |
| Butter            | $5.00/lb          | $3.50/lb (36 lb cs)   | 30%     | Must use 36 lb/month  |
| Olive oil         | $12/L (retail)    | $7/L (6-gal case)     | 42%     | Must use 6 gal/month  |
| Eggs              | $4.50/doz         | $2.80/doz (15 doz cs) | 38%     | Must use 15 doz/month |
| Chicken breast    | $4.50/lb          | $2.80/lb (40 lb cs)   | 38%     | Must use 40 lb/month  |
| Heavy cream       | $6.00/qt          | $3.50/qt (12 qt cs)   | 42%     | Must use 12 qt/month  |

---

## 14. Re-Costing Frequency Reference

| Operation Type | Frequency      | Trigger Events for Immediate Re-Cost                     |
| -------------- | -------------- | -------------------------------------------------------- |
| Private chef   | Per event      | Every proposal uses current prices                       |
| Caterer        | Per event      | Custom menus require current pricing                     |
| Restaurant     | Monthly        | Supplier price increase, menu change, seasonal shift     |
| Bakery         | Monthly        | Flour/butter/egg price changes (high-volume amplifies)   |
| Food truck     | Monthly        | Tight menu makes review fast                             |
| Ghost kitchen  | Monthly        | Platform pricing must stay competitive                   |
| Meal prep      | Weekly         | Tight margins, perishable-heavy, price-sensitive clients |
| Institutional  | Quarterly      | Contract pricing buffers short-term swings               |
| Wholesale/CPG  | Per production | Batch economics change with each ingredient lot          |
| Fine dining    | Bi-weekly      | Seasonal ingredients, premium pricing demands accuracy   |
| Pop-up         | Per event      | One-shot economics, no averaging across months           |

---

## 15. Presentation and Garnish Cost Reference

| Item                     | Typical Cost       | Per-Plate Usage | Per-Plate Cost | Category           |
| ------------------------ | ------------------ | --------------- | -------------- | ------------------ |
| Microgreens (mixed)      | $25-40/lb          | 0.1-0.25 oz     | $0.16-0.63     | Garnish            |
| Pea shoots               | $15-25/lb          | 0.15-0.3 oz     | $0.14-0.47     | Garnish            |
| Edible flowers (mixed)   | $15-30/pack (50ct) | 1-3 per plate   | $0.30-1.80     | Garnish            |
| Edible gold leaf         | $30-80/book (25sh) | 1 sheet         | $1.20-3.20     | Luxury garnish     |
| Fresh herbs (chiffonade) | $2-4/bunch         | Pinch           | $0.05-0.15     | Standard garnish   |
| Herb oil                 | $2-5/batch (8 oz)  | 0.25 oz drizzle | $0.06-0.16     | Sauce/drizzle      |
| Balsamic reduction       | $12-40/bottle      | 0.25 oz         | $0.18-0.60     | Sauce/drizzle      |
| Truffle oil              | $15-30/bottle      | 3-5 drops       | $0.10-0.25     | Finishing          |
| Fresh truffle shavings   | $40-120/oz         | 0.1-0.2 oz      | $4.00-24.00    | Luxury             |
| Candied nuts             | $8-15/lb           | 0.5-1 oz        | $0.25-0.94     | Texture garnish    |
| Caviar                   | $50-200/oz         | 0.25-0.5 oz     | $12.50-100.00  | Luxury             |
| Cocoa powder/matcha      | Negligible         | Dusting         | $0.01-0.05     | Q-factor territory |

**Total garnish cost by service level:**

| Service Level  | Typical Garnish Cost/Plate | As % of $15 Plate | As % of $40 Plate |
| -------------- | -------------------------- | ----------------- | ----------------- |
| Casual         | $0.10-0.30                 | 0.7-2.0%          | 0.3-0.8%          |
| Upscale casual | $0.30-0.75                 | 2.0-5.0%          | 0.8-1.9%          |
| Fine dining    | $0.75-3.00                 | 5.0-20%           | 1.9-7.5%          |
| Luxury         | $3.00-25.00+               | 20%+              | 7.5%+             |

---

## 16. Breakeven Analysis Templates

### 16a. Formula

```text
Breakeven Units = Fixed Costs / (Revenue Per Unit - Variable Cost Per Unit)
Breakeven Revenue = Fixed Costs / (1 - (Variable Costs / Revenue))
Breakeven Revenue = Fixed Costs / Contribution Margin Ratio
```

### 16b. By Operation Type

| Operation Type | Typical Monthly Fixed Costs | Avg Revenue/Unit | Avg Variable Cost/Unit | Breakeven/Month  |
| -------------- | --------------------------- | ---------------- | ---------------------- | ---------------- |
| Food truck     | $3,500-6,000                | $12-16/meal      | $4.50-6.00/meal        | 350-600 meals    |
| Ghost kitchen  | $2,500-6,000                | $18-28/order     | $8-14/order            | 200-430 orders   |
| Private chef   | $1,000-3,000                | $400-800/event   | $150-350/event         | 3-6 events       |
| Caterer        | $2,000-5,000                | $1,500-5,000/evt | $600-2,500/event       | 2-4 events       |
| Bakery         | $3,000-8,000                | $5-12/item       | $1.50-4.50/item        | 500-1,200 items  |
| Meal prep      | $2,000-5,000                | $10-15/meal      | $4-7/meal              | 300-700 meals    |
| Restaurant     | $8,000-30,000               | $25-55/cover     | $10-22/cover           | 400-1,000 covers |
| Pop-up         | $500-2,000 (per event)      | $15-30/person    | $6-12/person           | 40-130 covers    |

### 16c. Contribution Margin Ratio Reference

```text
Contribution Margin Ratio = (Selling Price - Variable Cost) / Selling Price
```

| Food Cost % | Labor % (Variable) | Other Variable % | Total Variable % | Contribution Margin Ratio |
| ----------- | ------------------ | ---------------- | ---------------- | ------------------------- |
| 28%         | 15%                | 5%               | 48%              | 0.52                      |
| 30%         | 18%                | 5%               | 53%              | 0.47                      |
| 32%         | 20%                | 5%               | 57%              | 0.43                      |
| 35%         | 22%                | 5%               | 62%              | 0.38                      |
| 38%         | 25%                | 5%               | 68%              | 0.32                      |

---

## 17. Tax Reference (US, General)

### 17a. Sales Tax Exemptions for Food Operators

| Item                            | Typically Exempt (with resale cert) | Typically Taxable | Notes                            |
| ------------------------------- | ----------------------------------- | ----------------- | -------------------------------- |
| Raw ingredients for resale      | Yes                                 |                   | Core food cost                   |
| Beverages for resale            | Yes                                 |                   | Including alcohol in most states |
| Packaging given to customer     | Yes                                 |                   | Containers, bags, wraps          |
| Equipment and smallwares        |                                     | Yes               | Always taxable                   |
| Cleaning supplies               |                                     | Yes               |                                  |
| Paper goods (internal use)      |                                     | Yes               |                                  |
| Staff meal ingredients          |                                     | Varies            | Complex; state-specific          |
| Prepared food sold to customers |                                     | Usually           | Operator collects and remits     |
| Catering services               |                                     | Usually           | Some states tax service portion  |
| Grocery items (unprepared)      | Yes (in most states)                |                   | Lower or zero rate               |

### 17b. Impact of Missing Resale Certificate

| Monthly Ingredient Spend | Tax Rate | Monthly Tax Paid | Annual Cost | Notes                  |
| ------------------------ | -------- | ---------------- | ----------- | ---------------------- |
| $1,000                   | 7%       | $70              | $840        | Small operation        |
| $3,000                   | 7%       | $210             | $2,520      | Solo private chef      |
| $5,000                   | 7%       | $350             | $4,200      | Small catering company |
| $10,000                  | 7%       | $700             | $8,400      | Restaurant             |
| $25,000                  | 7%       | $1,750           | $21,000     | High-volume operation  |
