# PIE Pricing Reference

Use this reference when culinary ontology work supports ChefFlow PIE, price proof, recipe costing, vendor/SKU matching, substitution, fallback, or reliability scoring.

## PIE Principle

PIE should price canonical ingredient identities, not loose strings. The ontology decides what can safely share price truth, what can inherit a fallback price, and what must remain separate because the culinary form, unit basis, yield, or buying behavior differs.

## Add These Fields For PIE

Extend the default ontology entry with:

```json
{
  "price_family": "",
  "buyable_equivalence_group": [],
  "not_equivalent_to": [],
  "unit_basis": [],
  "yield_basis": "",
  "substitution_group": "",
  "sku_match_hints": [],
  "price_fallback_order": [],
  "pricing_risks": [],
  "proof_requirements": []
}
```

## PIE Relationship Semantics

- `buyable_equivalent_to`: can usually share a current price after unit conversion.
- `price_family_of`: belongs to a related family but should not automatically share price.
- `fallback_candidate_for`: may be used when exact price is missing, with lower reliability.
- `not_price_equivalent_to`: same source or name family, but unsafe to price as the same item.
- `yield_transform_from`: can derive cost only with a yield, trim, hydration, render, or concentration factor.
- `sku_label_alias_of`: vendor/store label that maps to a canonical identity.

## Reliability Rules

Lower confidence when:

- The ingredient string is ambiguous: "cream", "greens", "pepper", "chile", "flour", "oil".
- Source and form are mixed: "tomato" vs "tomato paste"; "coconut" vs "coconut milk".
- The unit basis differs: each, bunch, lb, oz, fluid oz, can, jar, case.
- Yield matters: shell-on shrimp, bone-in meat, trimmed herbs, cooked beans, dried mushrooms.
- The SKU is a prepared food rather than a raw/buyable ingredient.
- Cultural names are close but not equivalent.

## PIE Output Pattern

For a PIE-facing answer, include:

1. Canonical branch.
2. Buyable price groups.
3. Unsafe equivalences.
4. Unit and yield basis.
5. Price fallback order.
6. Substitution notes.
7. Reliability risks.
8. Concrete examples of recipe strings and SKU strings.

## Example: Tomato

```json
{
  "id": "plant.tomato.fruit.fresh",
  "canonical_name": "fresh tomato",
  "parent_id": "plant.tomato.fruit",
  "biological_source": "Solanum lycopersicum",
  "edible_part": "fruit",
  "culinary_form": "fresh whole produce",
  "processing_state": "raw",
  "price_family": "tomato-fresh",
  "buyable_equivalence_group": ["roma tomato", "vine tomato", "beefsteak tomato"],
  "not_equivalent_to": ["tomato paste", "passata", "sun-dried tomato"],
  "unit_basis": ["lb", "kg", "each"],
  "yield_basis": "trimmed edible weight",
  "substitution_group": "fresh tomato",
  "sku_match_hints": ["tomato", "roma", "vine ripe", "beefsteak"],
  "price_fallback_order": ["roma tomato", "vine tomato", "generic fresh tomato"],
  "pricing_risks": ["seasonal volatility", "variety ambiguity", "unit ambiguity"],
  "proof_requirements": ["freshness date", "store or vendor", "unit conversion basis"]
}
```

## Common PIE Families To Model Carefully

- Tomatoes: fresh, canned, paste, puree, passata, sauce, sun-dried, powder.
- Coriander/cilantro: fresh leaf, seed, ground seed, root.
- Chiles/peppers: fresh, dried, smoked, powder, flakes, paste, sauce.
- Dairy cream: heavy cream, whipping cream, sour cream, creme fraiche, coconut cream.
- Soy: soybean, edamame, tofu, yuba, soy milk, miso, soy sauce, tamari, tempeh, natto, soy oil.
- Wheat: berries, flour grades, semolina, bulgur, couscous, seitan, bread crumbs.
- Chicken: whole, parts, ground, stock, schmaltz, bones, skin.
- Citrus: whole fruit, zest, juice, preserved peel, extract, oil.
- Sugar: cane sugar, beet sugar, brown sugar, powdered sugar, molasses, syrup.
