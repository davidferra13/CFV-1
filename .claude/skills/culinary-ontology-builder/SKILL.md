---
name: culinary-ontology-builder
description: Designs, extends, audits, and normalizes culinary ingredient ontologies with biological sources, edible parts, culinary forms, aliases, processed forms, preserved forms, fermented forms, extracts, additives, staples, seasonings, liquids, fats, sweeteners, and culturally named variants. Use when the user asks for ingredient taxonomy, ingredient normalization, recipe parsing schemas, SKU/vendor matching, food aliases, parent-child culinary relationships, or PIE pricing identity/fallback/substitution work.
---

# Culinary Ontology Builder

Use this skill to turn messy ingredient language into structured culinary identity. It is for ontology, normalization, and pricing-aware ingredient reasoning; it is not for ordinary recipe writing unless ingredient identity is the task.

## Routing

Classify the request before output:

- **New ontology**: create a taxonomy branch or global schema.
- **Ontology extension**: add one family, cuisine, process, or ingredient class.
- **Normalization**: map raw ingredient strings to canonical identities.
- **Alias audit**: separate synonyms, cultural names, overloaded names, and false friends.
- **PIE work**: model what can safely share price truth, fallback, substitutions, unit basis, yield basis, and reliability risk. Read `references/PIE-PRICING.md`.

Ask only if the answer depends on scope: output format, cuisine/region, granularity, or whether this is ChefFlow/PIE-facing.

## Modeling Rules

Always separate:

- Biological source: species, animal, plant, fungus, algae, microbe, mineral, or blend.
- Edible part: fruit, seed, leaf, root, tuber, muscle, fat, milk, egg, sap, extract, etc.
- Culinary form: fresh, dried, ground, milled, pressed, rendered, fermented, cured, smoked, canned, frozen, refined, blended, cooked, or prepared.
- Cultural name: named form, regional term, trade term, or cuisine-specific identity.
- Alias class: true synonym, regional synonym, marketing name, variety, false friend, or ambiguous string.

Prefer explicit relationships:

- `parent_of`
- `part_of`
- `derived_from`
- `processed_into`
- `preserved_as`
- `fermented_into`
- `extracted_from`
- `refined_from`
- `alias_of`
- `regional_variant_of`
- `culinary_equivalent_of`
- `not_equivalent_to`

Do not collapse culturally distinct ingredients just because they share a source. Mark ambiguity instead of inventing false precision.

## Default Entry Shape

Use this shape unless the user asks for another format:

```json
{
  "id": "",
  "canonical_name": "",
  "parent_id": "",
  "category": "",
  "biological_source": "",
  "edible_part": "",
  "culinary_form": "",
  "processing_state": "",
  "culinary_roles": [],
  "aliases": [],
  "regional_names": [],
  "relationships": [],
  "ambiguity_notes": "",
  "examples": []
}
```

## Workflow

1. Preserve the user's raw terms.
2. Define the ontology purpose: search, parsing, pricing, substitutions, nutrition, procurement, or audit.
3. Choose granularity: global, family, ingredient, SKU, or recipe-string level.
4. Build the parent-child branch before aliases.
5. Attach processed, preserved, fermented, extracted, refined, and blended forms as derived nodes.
6. Add aliases and cultural names with relationship type and ambiguity notes.
7. For PIE, add pricing fields from `references/PIE-PRICING.md`.
8. Close with gaps, uncertain classifications, and recommended next expansion slices.

## Quality Bar

A good output proves the model handles source, part, form, process, culture, aliasing, and ambiguity. For PIE, it must also prove which identities can safely share price truth and which cannot.

## Example User Requests

- "Use culinary-ontology-builder to model tomatoes for PIE."
- "Normalize these recipe ingredients into canonical ontology entries."
- "Create an ontology branch for soy and its fermented products."
- "Audit whether these vendor SKUs can map to recipe ingredients."
- "Build alias rules for cilantro, coriander leaf, and coriander seed."
