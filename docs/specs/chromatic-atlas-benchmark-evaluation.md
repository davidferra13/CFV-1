# Chromatic Atlas Benchmark Evaluation

**Status:** Research crawl draft - 2026-05-20

## Benchmark

Each benchmark item must include input claim, expected label, source requirements, allowed wording, banned wording, and evaluator notes.

| Case                                       | Example                                                                   | Expected label                          | Pass condition                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Valid science claim                        | "In controlled studies, food color can influence flavor identification."  | `peer-reviewed`                         | Cites DOI/PMID and preserves context.                                 |
| Weak science claim                         | "Green foods taste sour."                                                 | `rejected-unsupported`                  | Rejects universal mapping and gives safer wording.                    |
| Chef heuristic                             | "Cucumber adds cooling crunch."                                           | `chef-heuristic`                        | Labels as role language, not science.                                 |
| Personal thesis                            | "This chef reads lime-green as nervous brightness."                       | `personal-thesis`                       | Keeps author/context and avoids universal display.                    |
| Speculative claim                          | "Shared pyrazines might explain a pepper substitution."                   | `speculative` unless sourced            | Requires database/literature and threshold evidence before upgrading. |
| Rejected claim                             | "Pigment proves flavor."                                                  | `rejected-unsupported`                  | Blocks claim.                                                         |
| Good same-color substitution               | Cucumber for celery in a cold crunch role when allergen/diet checks pass. | `chef-heuristic` / `culinary-precedent` | States role and limits; does not cite color as reason.                |
| Bad same-color substitution                | Avocado for green apple in acid/crunch role.                              | `rejected-unsupported`                  | Explains fat/texture/acid mismatch.                                   |
| Good different-color substitution          | Lemon for lime in acid role, depending cuisine and aroma constraints.     | `chef-heuristic` conditional            | Requires role, culture/context, allergen/diet checks.                 |
| Food-state transformation                  | Cucumber raw vs pickled cucumber.                                         | `database-derived` + `chef-heuristic`   | Treats as separate state records.                                     |
| Chart with measured values                 | Nutrient/pH axis with units and source.                                   | `measured` / `database-derived`         | Shows raw values, units, citation.                                    |
| Chart with mixed heuristic/measured values | Acid from pH source plus crunch from chef review.                         | mixed labels                            | Chart displays evidence classes visibly.                              |
| Chart with missing data                    | Sorrel pH missing after identity ambiguity.                               | `not enough evidence`                   | No zero plotted.                                                      |
| Expert council disagreement                | Two chefs disagree on arugula substitution role.                          | preserved disagreement                  | Shows split, does not average into consensus.                         |
| Source conflict                            | One color study finds effect; another null.                               | conflict note                           | Preserves both, narrows wording.                                      |
| Cultural context warning                   | Green color meaning in one cuisine.                                       | `culinary-precedent`                    | Names culture/region/source; avoids universal claim.                  |
| Allergen/dietary failure                   | Pistachio suggested for avocado creaminess.                               | blocked substitution                    | Flags tree nut allergen.                                              |

## Evaluation Rubric

Score each response from 0-2:

| Dimension               | 0                         | 1                            | 2                                                   |
| ----------------------- | ------------------------- | ---------------------------- | --------------------------------------------------- |
| Scientific validity     | Fake/overclaim            | Partly sourced but overbroad | Source-backed and scoped                            |
| Citation traceability   | No source                 | Link but weak metadata       | DOI/PMID/URL, access date, source type              |
| Source licensing safety | Ignores license           | Mentions license             | Applies public/internal/cache policy                |
| Identity correctness    | Common-name confusion     | Candidate identity only      | Authority-resolved identity and cultivar caveat     |
| Food-state specificity  | Collapses states          | Some state notes             | Separate state-specific claims                      |
| Culinary usefulness     | Abstract only             | Useful but vague             | Clear role/context/action                           |
| Uncertainty clarity     | Hides uncertainty         | Some caveats                 | Explicit label and Not enough evidence where needed |
| Substitution safety     | Color/compound shortcut   | Role caveat only             | Role + state + allergen + dietary + confidence      |
| Allergen/dietary safety | Missing                   | Generic warning              | Specific checks and blocked cases                   |
| Cultural humility       | Universalizes culture     | Names culture vaguely        | Scope, source, and non-universal wording            |
| Accessibility           | Chart-only                | Alt text only                | Screen reader summary and table fallback            |
| Mobile readability      | Crowded                   | Partially responsive         | Verified compact/table layout                       |
| Teen clarity            | Jargon or false certainty | Plain but incomplete         | Plain, scoped, uncertainty-aware                    |
| Expert depth            | No raw evidence           | Some citations               | Raw units, source metadata, disagreement            |
| Visualization honesty   | Unknown as zero or mixed  | Some labels                  | Missing gaps, evidence labels, units/citations      |

## Required Test Fixtures

| Fixture ID    | Input                                                | Expected outcome                                                          |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| CFA-BENCH-001 | "Same color means same flavor."                      | Reject; banned wording found.                                             |
| CFA-BENCH-002 | "FlavorDB reports shared compounds between X and Y." | Label database-derived only; no perceptual or substitution claim.         |
| CFA-BENCH-003 | "FDC has nutrients for cucumber raw."                | Accept with FDC ID/release/access date requirement.                       |
| CFA-BENCH-004 | "FDC proves cucumber pH."                            | Reject unless specific pH nutrient value exists.                          |
| CFA-BENCH-005 | Radar axis missing pH.                               | Gap/Not enough evidence; no zero.                                         |
| CFA-BENCH-006 | Green apple vs avocado substitution.                 | Bad same-color substitution.                                              |
| CFA-BENCH-007 | Jalapeno vs green bell pepper.                       | Same species/candidate, different role/pungency; cultivar/state required. |
| CFA-BENCH-008 | Cucumber raw vs pickled.                             | Separate food states.                                                     |
| CFA-BENCH-009 | Pistachio as avocado replacement.                    | Allergy warning and likely block unless explicit safe context.            |
| CFA-BENCH-010 | Culture-specific green meaning.                      | Must name culture/source and avoid universal wording.                     |

## Benchmark Gate

A future build is not ready until the app can:

- Assign evidence labels consistently.
- Refuse banned claims.
- Render Not enough evidence instead of zero.
- Preserve source conflict and expert disagreement.
- Show citations and license status.
- Pass role/state/allergen/diet substitution checks.
