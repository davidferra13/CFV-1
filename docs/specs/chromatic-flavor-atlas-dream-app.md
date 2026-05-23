# Chromatic Flavor Atlas — Dream App Spec

**Status:** Bootstrap draft — created from orchestration prompt on 2026-05-19.
**Research crawl run:** 2026-05-19
**Source map:** `docs/specs/chromatic-atlas-research-and-source-map.md`

---

## Vision

The Chromatic Flavor Atlas is a food-intelligence surface inside ChefFlow that lets chefs, students, and food learners navigate ingredients by their sensory and compositional identity — using color as a probabilistic index, never as a deterministic flavor key.

The Atlas does NOT claim: same color = same flavor. It uses color as a discovery entry point, paired with role, state, source, and confidence metadata.

---

## What It Is

An ingredient profile system that exposes:

- Visual color identity (measured from image data or referenced from pigment literature)
- Pigment family and behavior (chlorophyll, carotenoid, anthocyanin, betalain, browning)
- Flavor profile: aroma descriptors, tastants, bitterness, phenolics
- Compositional signals: nutrients, pH/acidity, fat/water behavior
- Culinary role: in what context is this ingredient used, and why
- Food state specificity: raw vs cooked vs fermented vs dried vs pickled
- Substitution intelligence: by role, with allergen/dietary checks
- Cultural context: what color means in specific cultural food traditions
- Evidence metadata: every claim labeled with source type and confidence

---

## Who It Serves

| Mode   | User                 | Depth                                            |
| ------ | -------------------- | ------------------------------------------------ |
| Teen   | Young cook, learner  | Plain language, visual, no jargon                |
| Chef   | Working professional | Culinary precision, substitution logic, workflow |
| Expert | R&D, food scientist  | Sourced data, compound names, citations          |

---

## The Color-Flavor Honesty Contract

Color is treated as a **probabilistic sensory/compositional index only when**:

1. Role is specified (fruit acid vs leafy bitter vs fat-rich vs aromatic)
2. Food state is specified (raw vs cooked changes color AND flavor)
3. Source is specified (farm, cultivar, region affect both)
4. Confidence is labeled (measured / inferred / culinary precedent / speculative)

**Banned claims:**

- Same color implies same flavor
- Color alone predicts substitutability
- Pigment presence implies perceptible flavor
- Compound presence implies perceptible taste (without threshold/perception evidence)
- AI discovered a scientific relationship
- Radar chart proves nutritional or flavor balance

---

## Radar Chart (Ingredient Role Profile)

A spider/radar chart showing ingredient role shape across axes like:

- Acidic / bright
- Bitter / astringent
- Fatty / rich
- Aromatic / volatile
- Sweet / neutral
- Structural / textural

**Chart rules:**

- Axes must be labeled with evidence source and confidence
- Unknown values must NOT be plotted as zero
- Missing data shown explicitly (gap in shape, not flat line)
- Chart is a visual role summary, not a scientific measurement
- Teen mode: plain axis names, no numbers
- Expert mode: axis values linked to source citations

---

## Product Fields (Full Target Set)

See `docs/specs/chromatic-atlas-field-source-matrix.md` for allowed source types per field.

| Field                                | Notes                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Ingredient common name               | Requires disambiguation                                                      |
| Scientific/botanical identity        | USDA GRIN / GBIF / Kew authority                                             |
| Cultivar/variety                     | Variance warnings required                                                   |
| Food state                           | Raw / cooked / fermented / dried / pickled / juiced / pureed                 |
| Color family                         | Categorical bucket                                                           |
| Measured image color                 | From photo pipeline or literature reference                                  |
| CIELAB / Munsell / CIE values        | Lab measurement or authoritative reference                                   |
| Pigment family                       | Chlorophyll / carotenoid / anthocyanin / betalain / browning                 |
| Pigment behavior                     | Heat, pH, oxidation, light stability                                         |
| Aroma compounds                      | From compound database; threshold evidence required for "perceptible" claims |
| Tastants                             | Sourced from ChemTastesDB / literature                                       |
| Bitter compounds                     | BitterDB / literature                                                        |
| Phenolics / flavonoids / polyphenols | USDA / FooDB / literature                                                    |
| Organic acids / pH                   | USDA FDC / academic acid measurement studies                                 |
| Nutrients                            | USDA FDC                                                                     |
| Texture / mouthfeel                  | Culinary precedent; limited measurable sourcing                              |
| Culinary role                        | Chef heuristic + culinary literature                                         |
| Substitution role                    | Role-matched, allergen-checked, dietary-checked                              |
| Bad substitution / clash case        | Known culinary failure or sourced incompatibility                            |
| Cultural precedent                   | Culinary anthropology sources; culture-specific                              |
| Personal color note                  | Labeled personal thesis                                                      |
| Radar chart axis score               | Evidence-labeled, missing-data policy enforced                               |
| Confidence score                     | Per-field, per-source                                                        |
| Source freshness                     | Date of last source check                                                    |
| Citation display                     | Format for teen / chef / expert modes                                        |

---

## Green Pilot Set

The initial proof-of-concept covers 24 green ingredients across 4 culinary role clusters:

- Cluster 1: Green Acid/Fruit (green apple, lime, kiwi, green grape, tomatillo, sorrel)
- Cluster 2: Green Water/Crunch/Body (zucchini, cucumber, celery, green bean, asparagus)
- Cluster 3: Green Heat/Pyrazine/Aromatic (jalapeno, green bell pepper, cilantro, basil, mint, dill, parsley)
- Cluster 4: Green Fat/Bitter/Leafy/Preserved (avocado, pistachio, green olive, kale, spinach, arugula, broccoli rabe)

Clusters chosen because "green" spans completely different flavor families — proving the color-does-not-mean-flavor thesis within a single hue.

---

## Research Foundation Required

Before any build:

- Source registry (`chromatic-atlas-source-registry.md`) approved
- Field-source matrix (`chromatic-atlas-field-source-matrix.md`) complete
- Green pilot research (`chromatic-atlas-green-pilot-research.md`) evidence-labeled
- Claim audit (`chromatic-atlas-claim-audit.md`) approved
- Radar chart research (`chromatic-atlas-radar-chart-research.md`) complete
- Benchmark evaluation (`chromatic-atlas-benchmark-evaluation.md`) scored

---

## Links to Research Docs

- `docs/specs/chromatic-atlas-research-and-source-map.md` — source strategy
- `docs/specs/chromatic-atlas-source-registry.md` — source records
- `docs/specs/chromatic-atlas-field-source-matrix.md` — field/source matrix
- `docs/specs/chromatic-atlas-green-pilot-research.md` — green pilot evidence
- `docs/specs/chromatic-atlas-claim-audit.md` — allowed/banned claims
- `docs/specs/chromatic-atlas-radar-chart-research.md` — chart research
- `docs/specs/chromatic-atlas-benchmark-evaluation.md` — evaluation rubric
- `docs/specs/chromatic-atlas-research-crawl-report.md` — crawl run log

---

_This spec will be updated only when handoff links to new research docs need to be added. Product design and implementation begin only after research foundation is approved._

## 2026-05-20 Research Handoff Note

The research crawl produced the linked source registry, field matrix, green pilot, claim audit, radar research, benchmark, and crawl report. The app remains blocked from build until source licensing, smaller pilot scope, per-field evidence policy, and chart honesty fixtures are approved.
