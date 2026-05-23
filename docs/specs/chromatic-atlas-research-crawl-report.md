# Chromatic Atlas Research Crawl Report

**Run ID:** CRAWL-2026-05-20-001  
**Run Date:** 2026-05-20  
**Lead Orchestrator:** Codex  
**Scope:** Research, source mapping, evidence governance, and build-readiness documentation only.  
**No app build:** Confirmed. No application code intentionally edited.

## Executive Summary

The Chromatic Flavor Atlas can move toward a source-backed build only if color remains a probabilistic discovery cue, not a flavor or substitution proof. The strongest source classes are USDA/FDC for nutrients and named food states, taxonomy authorities for identity, peer-reviewed sensory/pigment literature for scoped scientific claims, and selected open chemistry databases for compound identity. The major blockers are licensing restrictions, pH/acidity gaps, cultivar variance, compound-perception thresholds, and radar chart honesty.

The 24-ingredient Green pilot is likely too broad as a first product proof. A smaller first proof set of green apple, lime, cucumber, celery, green bell pepper, jalapeno, avocado, and green olive would prove the core thesis with fewer unsupported fields.

## Scope

- Docs/research-only crawl.
- No build queue item created.
- No app server started.
- No UI or application code edited.
- Pre-existing dirty workspace was present and not reverted.

## Docs Touched

| Doc                                                     | Status              |
| ------------------------------------------------------- | ------------------- |
| `docs/specs/chromatic-atlas-source-registry.md`         | Created             |
| `docs/specs/chromatic-atlas-field-source-matrix.md`     | Created             |
| `docs/specs/chromatic-atlas-green-pilot-research.md`    | Created             |
| `docs/specs/chromatic-atlas-claim-audit.md`             | Created             |
| `docs/specs/chromatic-atlas-radar-chart-research.md`    | Created             |
| `docs/specs/chromatic-atlas-benchmark-evaluation.md`    | Created             |
| `docs/specs/chromatic-atlas-research-and-source-map.md` | Updated             |
| `docs/specs/chromatic-flavor-atlas-dream-app.md`        | Updated             |
| `docs/specs/chromatic-atlas-research-crawl-report.md`   | Rewritten/finalized |

## Research Lanes Completed

| Lane | Domain                                    | Status           | Main finding                                                                                                              |
| ---- | ----------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| A    | Sensory / color / flavor perception       | Complete         | Color supports expectation/identification claims; intensity and flavor-equivalence claims remain conditional or rejected. |
| B    | Pigment / plant chemistry / color science | Complete         | Pigments explain color behavior, not flavor. Measured color needs strict method metadata.                                 |
| C    | Flavor / aroma / compound databases       | Complete         | Compound sources are useful but often license-restricted; presence does not prove perception.                             |
| D    | Food composition / nutrients / pH         | Complete         | USDA FDC is strong for nutrients/states; pH/acidity coverage is weak.                                                     |
| E    | Plant identity / taxonomy / cultivar      | Complete         | Common names and cultivar variance are core risks.                                                                        |
| F    | Literature APIs / metadata / licensing    | Complete         | Metadata can be stored broadly; full text, abstracts, figures, and repository files need license review.                  |
| G    | Radar / visualization research            | Complete locally | Radar can show role shape only with missing-data, evidence, accessibility, and mobile safeguards.                         |
| H    | Culinary precedent / culture / workflow   | Complete locally | Culinary material supports precedent/workflow/hypotheses only, not scientific proof.                                      |

## Sources Audited

Approved/restricted/unknown source details are in `docs/specs/chromatic-atlas-source-registry.md`.

| Source class                                                               | Status                                        | Notes                                                                     |
| -------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| Peer-reviewed sensory literature                                           | Approved for scoped science                   | DOI/PMID required; preserve disagreement.                                 |
| Peer-reviewed pigment/color science                                        | Approved for color behavior                   | Does not support flavor or substitution claims.                           |
| USDA FoodData Central                                                      | Approved for nutrients and food-state records | pH/organic acid data usually Not enough evidence.                         |
| Taxonomy authorities                                                       | Approved for identity                         | Cultivar and culinary market names still need separate handling.          |
| Open chemistry databases: ChemTastesDB, ChEBI, COCONUT, LOTUS              | Approved with caveats                         | Identity/occurrence only; not perception.                                 |
| Restricted chemistry databases: FlavorDB/2, FooDB, BitterDB, HMDB, NPAtlas | Restricted                                    | Valuable but noncommercial/no-derivatives constraints affect product use. |
| Flavornet, KNApSAcK                                                        | Unknown/restricted                            | Discovery-only until license cleared.                                     |
| Literature metadata APIs                                                   | Approved for metadata                         | Full text/abstract/figures require license review.                        |
| Culinary sources                                                           | Restricted to precedent/heuristic             | Not scientific evidence.                                                  |
| AI output                                                                  | Rejected                                      | Never evidence.                                                           |

## Green Pilot Coverage Table

| Cluster                                | Readiness            | Main blocker                                                         |
| -------------------------------------- | -------------------- | -------------------------------------------------------------------- |
| Green Acid / Fruit                     | Conditional          | Cultivar/type and pH/organic acids; sorrel identity/FDC weak.        |
| Green Water / Crunch / Body            | Strongest first lane | Texture mostly heuristic, but FDC/state coverage is good.            |
| Green Heat / Pyrazine / Aromatic       | Conditional          | Volatile/perception claims need literature/database and thresholds.  |
| Green Fat / Bitter / Leafy / Preserved | Conditional          | Cure/fermentation/cultivar and bitter compound evidence are complex. |

Recommended first proof set: green apple, lime, cucumber, celery, green bell pepper, jalapeno, avocado, green olive.

## Field Coverage Table

| Field group                             | Readiness                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Identity/common name/scientific name    | Queue-ready after authority lookup workflow is specified.                                                   |
| Nutrients/FDC state records             | Queue-ready for sourced values with FDC ID/release/access date.                                             |
| Color measurement                       | Blocked until calibrated capture/instrument protocol exists.                                                |
| Pigment family/behavior                 | Conditional; source-backed general behavior, but ingredient-specific values missing.                        |
| Aroma/tastant/bitter/phenolic compounds | Conditional; database source and license issues, threshold gaps.                                            |
| pH/acidity                              | Blocked for many pilot foods unless direct measurement or peer-reviewed ingredient-state studies are added. |
| Culinary role/substitution              | Conditional; needs expert validation and safety checks.                                                     |
| Radar chart axis scores                 | Blocked until axis definitions, normalization, missing-data behavior, and test fixtures are approved.       |

## Highest-Confidence Source Classes

- USDA FoodData Central for nutrient values and named food states.
- GRIN, GBIF, POWO/WCVP, WFO for botanical identity.
- Peer-reviewed sensory literature for color-expectation boundaries.
- Peer-reviewed pigment/color literature for color behavior.
- ChemTastesDB, ChEBI, COCONUT, LOTUS for open chemistry vocabulary/occurrence discovery with caveats.
- PubMed/Crossref/OpenAlex/Europe PMC for citation metadata and license discovery.

## Major Blockers

- pH/acidity lacks a single authoritative source and is sparse in FDC.
- Many useful compound databases are noncommercial, no-derivatives, or license unknown.
- Compound presence lacks perceptual threshold/concentration context.
- Cultivar/type/state ambiguity is high for apple, lime, grape, chile, basil, mint, olive, avocado, sorrel, arugula, and brassicas.
- Measured color requires calibrated capture or instrument measurement.
- Radar charts can mislead without gaps, evidence labels, table fallback, and mobile/accessibility proof.

## Exact Next Research Tasks

1. Resolve eight recommended pilot identities through GRIN/GBIF/POWO/WFO and record taxon IDs.
2. Pull FDC records for the eight pilot foods with fdc_id, data type, release, nutrients, and state.
3. Resolve license use for FlavorDB2, FooDB, BitterDB, Flavornet, and KNApSAcK for internal vs public display.
4. Find peer-reviewed ingredient-state pH/acid sources for green apple, lime, cucumber, celery, green bell pepper, jalapeno, avocado, and green olive.
5. Define calibrated color capture protocol and fixture.
6. Define expert council rubric for culinary roles and substitutions.
7. Resolve Cleveland & McGill DOI/citation for visualization research.
8. Build benchmark fixtures as data, not UI.

## Queue-Readiness Assessment

No queue item was created. The following are ready to draft as future queue items if the user asks:

- Source registry ingestion model and citation metadata schema.
- Eight-ingredient Green proof data crawl.
- Evidence label and claim-audit rules engine.
- Radar chart data fixture and honesty test suite.

Blocked from queue/build:

- Full 24-ingredient pilot as complete product data.
- Radar chart UI shipping.
- Automated substitution recommendations.
- Color-based flavor or pairing claims.

## Claims Still Forbidden After This Crawl

- Same color equals same flavor.
- Same color ingredients are interchangeable.
- Pigment proves flavor.
- Compound presence proves perception.
- Radar chart proves balance.
- AI discovered a scientific relationship.
- Color-based substitution is safe without role/allergen/dietary checks.
- Missing data means zero.
- Database absence means compound absence.

## Hard Stops

- If licensing cannot be determined, mark `restricted/unknown`.
- If a source is not primary enough for science, downgrade to `culinary-precedent`, `chef-heuristic`, or `speculative`.
- If fields cannot be sourced, mark **Not enough evidence**.
- If sources disagree, preserve disagreement.
- Do not collapse culture-specific claims into universal wording.
- Do not build app UI from this crawl without a queue item and explicit authorization.
