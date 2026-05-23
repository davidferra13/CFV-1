# Global Culinary Ingredient Ontology

Status: canonical proposed ontology, created 2026-05-20.

Machine-readable source: `docs/domain/global-culinary-ingredient-ontology.json`

## Purpose

This ontology gives ChefFlow a durable ingredient spine for raw edible materials, edible parts, derivatives, processed forms, preserved forms, fermented forms, extracts, additives, staples, seasonings, liquids, fats, sweeteners, and culturally named variants.

The ontology is intentionally a graph, not a single strict tree. A culinary item can have multiple parents:

- `miso` is a fermented form, a legume derivative, a soybean product, and an umami seasoning.
- `ghee` is a dairy derivative, clarified fat, cooking fat, and South Asian pantry staple.
- `masa harina` is a maize derivative, nixtamalized grain product, flour, and staple base.
- `kimchi` is a vegetable preparation, lacto-fermented preserved form, condiment, side dish, and Korean cultural variant.

## Node Contract

Every node should be modeled with this shape:

```json
{
  "id": "stable_slug",
  "canonicalName": "Readable name",
  "aliases": ["alternate name", "regional name"],
  "parentIds": ["ingredient.parent"],
  "typeTags": ["raw_biological_material", "seasoning"],
  "origin": {
    "kingdom": "plant",
    "species": "optional"
  },
  "ediblePart": "seed",
  "derivedFrom": ["ingredient.raw.plant.seed.cereal.maize"],
  "processes": ["dried", "nixtamalized", "milled"],
  "cultureTags": ["mexican", "central_american"],
  "notes": "Optional culinary boundary note."
}
```

## Top-Level Model

| Family                  | Meaning                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw biological material | Edible plants, animals, fungi, algae, insects, microbes, and their parts.                                                                       |
| Edible part             | Fruit, seed, root, leaf, stem, flower, muscle, offal, milk, egg, roe, fat, sap, resin, and similar culinary parts.                              |
| Culinary derivative     | Products derived from a raw material by milling, pressing, rendering, extracting, culturing, separating, or combining.                          |
| Processed form          | Cut, ground, toasted, roasted, milled, refined, cooked, extruded, clarified, or otherwise transformed food forms.                               |
| Preserved form          | Dried, salted, cured, smoked, pickled, candied, frozen, canned, confit, or oil-packed forms.                                                    |
| Fermented form          | Microbially transformed foods and drinks such as bread, yogurt, cheese, soy sauce, miso, vinegar, beer, wine, kimchi, and fish sauce.           |
| Extract                 | Juices, oils, essences, distillates, starches, gums, proteins, syrups, and flavor extracts.                                                     |
| Additive                | Functional culinary ingredients such as leaveners, stabilizers, thickeners, curing agents, acids, emulsifiers, colorants, and flavor enhancers. |
| Staple                  | Base foods that anchor meals: rice, bread, noodles, porridges, tuber mashes, flatbreads, batters, and legume bases.                             |
| Seasoning               | Salt, acid, spice, herb, umami agent, condiment, sauce, paste, relish, and prepared flavor base.                                                |
| Liquid                  | Water, stock, broth, dairy liquids, plant milks, juices, alcoholic liquids, vinegars, sauces, and brines.                                       |
| Fat                     | Animal fats, plant oils, dairy fats, nut oils, seed oils, and clarified fats.                                                                   |
| Sweetener               | Cane, beet, palm, fruit, bee, grain, starch, syrup, molasses, and refined sugar products.                                                       |
| Cultural variant        | A culturally named ingredient or preparation whose identity matters even when biologically similar to another item.                             |

## Raw Biological Materials

### Plants

Plants are organized by culinary edible part first, then botanical or market family where useful.

- Fruit
  - Orchard fruit: apple, pear, quince.
  - Stone fruit: peach, nectarine, plum, cherry, apricot.
  - Berry and aggregate fruit: strawberry, raspberry, blackberry, blueberry, cranberry, currant.
  - Citrus: lemon, lime, orange, bitter orange, grapefruit, yuzu, calamansi, citron.
  - Tropical fruit: banana, plantain, mango, papaya, pineapple, guava, passionfruit, lychee, rambutan, jackfruit, durian, coconut.
  - Culinary vegetable fruit: tomato, capsicum pepper, chile, eggplant, cucumber, squash, pumpkin, okra.
- Seed
  - Cereal grain: wheat, rice, maize, barley, rye, oat, sorghum, millet, teff, fonio.
  - Pseudocereal: buckwheat, quinoa, amaranth, chia.
  - Pulse and legume: soybean, chickpea, lentil, pea, common bean, mung bean, fava bean, cowpea, pigeon pea.
  - Oilseed: sesame, sunflower, pumpkin seed, flaxseed, hemp seed, mustard seed, rapeseed.
  - Tree nut and culinary nut: almond, walnut, hazelnut, pistachio, cashew, pecan, macadamia, Brazil nut, pine nut.
- Root, tuber, rhizome, and corm
  - Potato, sweet potato, yam, cassava, taro, lotus root.
  - Ginger, turmeric, galangal.
  - Beet, carrot, parsnip, radish, turnip, rutabaga.
- Bulb and allium
  - Onion, garlic, shallot, leek, scallion, chive.
- Leaf and herb
  - Lettuce, spinach, chard, kale, cabbage, collard, mustard greens, amaranth greens, watercress.
  - Basil, cilantro, parsley, mint, dill, thyme, rosemary, oregano, tarragon, sage, shiso.
- Stem and shoot
  - Asparagus, bamboo shoot, celery, rhubarb, sugarcane.
- Flower, bud, and stigma
  - Cauliflower, broccoli, artichoke, squash blossom, banana blossom, clove, saffron.
- Bark, sap, resin, and gum
  - Cinnamon, cassia, maple sap, gum arabic, mastic.

### Fungi

- Mushrooms: button, cremini, portobello, shiitake, oyster, enoki, maitake, porcini, morel, chanterelle, truffle.
- Yeasts: baker's yeast, brewer's yeast, nutritional yeast.
- Molds used culinarily: koji, Penicillium roqueforti, Penicillium camemberti.

### Algae

- Seaweeds: nori, kombu, wakame, dulse, hijiki.
- Hydrocolloid sources: agar, carrageenan.

### Animals

- Mammal
  - Muscle meat: beef, veal, pork, lamb, mutton, goat, venison, rabbit.
  - Offal: liver, kidney, heart, tongue, tripe, sweetbreads, blood, bone marrow.
  - Milk: cow, goat, sheep, buffalo.
  - Fat: tallow, lard, suet.
- Bird
  - Meat: chicken, duck, goose, turkey, quail.
  - Egg: chicken egg, duck egg, quail egg.
- Aquatic animal
  - Finfish: salmon, tuna, cod, haddock, halibut, sardine, anchovy, mackerel, trout, eel.
  - Crustacean: shrimp, prawn, crab, lobster, crayfish.
  - Mollusk: clam, mussel, oyster, scallop, squid, octopus.
  - Echinoderm: sea urchin.
  - Roe: fish roe, caviar, tobiko, masago.
- Insect
  - Cricket, mealworm, grasshopper, chapulines, ant.

## Derived And Processed Families

### Milled And Ground

- Flour: wheat flour, atta, maida, rice flour, corn flour, masa harina, chickpea flour, buckwheat flour.
- Meal and grits: cornmeal, polenta, semolina, grits.
- Powder: cocoa powder, chile powder, garlic powder, onion powder, mushroom powder.

### Pressed, Extracted, And Separated

- Juice: citrus juice, grape juice, sugarcane juice, pomegranate juice.
- Oil: olive oil, sesame oil, coconut oil, peanut oil, soybean oil, sunflower oil, palm oil, mustard oil, canola oil.
- Starch: cornstarch, potato starch, tapioca starch, arrowroot.
- Protein: gluten, soy protein, pea protein.
- Gum and hydrocolloid: gum arabic, xanthan gum, guar gum, agar, carrageenan.

### Dairy

- Milk, cream, butter, buttermilk, yogurt, kefir, whey, casein.
- Cheese families: fresh cheese, soft cheese, washed rind cheese, blue cheese, hard cheese, stretched-curd cheese.
- Cultural examples: paneer, ricotta, queso fresco, feta, mozzarella, brie, camembert, roquefort, cheddar, parmesan, pecorino.

### Soy And Legume Derivatives

- Soy milk, tofu, doufu, bean curd, yuba, okara.
- Tempeh, miso, natto, soy sauce, shoyu, tamari, doenjang, douchi.
- Chickpea flour, besan, hummus.
- Lentil dal, split pea, mung bean starch, glass noodle.

## Preserved Forms

- Dried: dried fruit, raisin, prune, date, dried mushroom, dried chile, dried fish, katsuobushi, jerky, biltong.
- Salted and cured: salt cod, bacalao, cured ham, bacon, pancetta, prosciutto, bottarga.
- Smoked: smoked fish, smoked meat, smoked cheese, lapsang tea.
- Pickled: vinegar pickle, brined pickle, olive, caper, achar.
- Lacto-fermented preserved: sauerkraut, kimchi, pao cai, fermented cucumber.
- Candied: candied citrus peel, marron glace, candied ginger.
- Confit and oil-packed: duck confit, garlic confit, oil-packed tuna, oil-packed chile.

## Fermented Forms

- Grain ferment: sourdough, injera, dosa batter, idli batter, beer, sake, rice wine, makgeolli.
- Legume ferment: miso, soy sauce, tamari, tempeh, natto, doenjang, douchi.
- Dairy ferment: yogurt, kefir, cheese, cultured butter, sour cream, creme fraiche.
- Vegetable ferment: kimchi, sauerkraut, pao cai, lacto-fermented pickle.
- Fruit ferment: wine, cider, vinegar.
- Fish and shellfish ferment: fish sauce, nuoc mam, nam pla, shrimp paste, belacan, terasi, garum.

## Seasoning Families

- Salt: sea salt, rock salt, kosher salt, black salt, kala namak.
- Acid: vinegar, citrus, tamarind, sumac, verjus.
- Herb: basil, cilantro, parsley, mint, dill, thyme, rosemary, oregano, tarragon, sage, shiso.
- Spice: peppercorn, chile, cumin, coriander seed, cardamom, cinnamon, clove, nutmeg, mace, fennel seed, fenugreek, star anise.
- Umami: soy sauce, fish sauce, miso, parmesan, dried mushroom, kombu, MSG, yeast extract.
- Prepared condiment: mustard, ketchup, mayonnaise, hot sauce, chutney, relish, salsa, harissa, gochujang, tahini, pesto.

## Liquids, Fats, And Sweeteners

- Liquids: water, vegetable stock, chicken stock, beef stock, fish stock, dashi, milk, cream, coconut milk, soy milk, almond milk, oat milk, wine, beer, cider, spirits, kombucha, kvass.
- Fats: olive oil, coconut oil, avocado oil, sesame oil, peanut oil, butter, ghee, lard, tallow, schmaltz, duck fat.
- Sweeteners: cane sugar, beet sugar, palm sugar, jaggery, gur, panela, piloncillo, maple syrup, date syrup, molasses, agave syrup, honey, rice syrup, corn syrup, malt syrup, glucose, dextrose, fructose, invert sugar.

## Additives And Functional Ingredients

- Leavener: yeast, baking soda, baking powder, baker's ammonia.
- Thickener and gelling agent: gelatin, pectin, agar, carrageenan, xanthan gum, guar gum, starch.
- Emulsifier: egg yolk, lecithin, mustard.
- Curing agent: nitrate, nitrite, curing salt, Prague powder.
- Acidulant: citric acid, lactic acid, acetic acid, cream of tartar.
- Flavor enhancer: MSG, yeast extract, hydrolyzed vegetable protein.
- Colorant: annatto, achiote, turmeric, saffron, beet powder, caramel color.

## Staple Bases

- Grain staple: bread, roti, naan, pita, tortilla, injera, lavash, noodles, pasta, ramen, soba, udon, rice noodle, congee, polenta, grits, ugali.
- Legume staple: dal, hummus, refried beans, bean paste.
- Tuber staple: mashed potato, cassava flour, farinha, gari, fufu.
- Fermented staple: sourdough, dosa batter, idli batter, injera.

## Alias Rules

1. Keep one canonical ID per culinary concept.
2. Store aliases as search and parsing helpers, not separate canonical records unless the cultural name implies a distinct preparation or market behavior.
3. Promote an alias into its own node when it has unique process, ingredient constraints, legal identity, allergen implications, sourcing behavior, price behavior, or menu meaning.
4. Preserve regional names even when they map to the same biological material: `aubergine`, `eggplant`, and `brinjal`; `cilantro` and `coriander leaf`; `chickpea`, `garbanzo`, and `chana`.
5. Use `derivedFrom` for material lineage and `parentIds` for category membership.

## ChefFlow Consumption Rules

1. Recipe parsing should resolve user text through aliases, then attach the canonical ingredient ID.
2. Menu intelligence should keep both canonical identity and cultural display name when the named variant carries guest-facing meaning.
3. Procurement should group by biological material when vendors sell substitutions, but preserve processed form when sourcing is materially different.
4. Allergy and dietary logic should traverse `derivedFrom`, not only visible display names.
5. PIE, costing, and market intelligence should price the purchasable form, not only the biological source.
6. Pantry and inventory should track state: raw, cut, cooked, dried, opened, frozen, fermented, preserved, rendered, extracted, or prepared.
7. Culturally named variants should not be collapsed away in guest-facing menus, client preferences, or chef memory.
