# Chromatic Atlas Radar Chart Research

**Status:** Research crawl draft - 2026-05-20

## Radar Rule

Radar charts may show ingredient role shape. They must not imply scientific proof unless the axis is measured/source-backed and labeled with unit/citation. Unknown values must not be plotted as zero.

## Chart Taxonomy

| Chart type                       | Accepted use                                                        | Rejected use                                                                     |
| -------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Radar / spider / web / star plot | Compact role-shape sketch for one ingredient or a small comparison. | Precise quantitative comparison, proof of balance, many overlapping ingredients. |
| Stat polygon                     | Same as radar; useful when axes are fixed and labeled.              | Area-as-score interpretation.                                                    |
| Polar area / rose chart          | Cyclical directional data or clearly radial categories.             | Ingredient flavor proof; mixed-unit sensory axes.                                |
| Radial bar                       | Decorative summary with few values.                                 | Dense expert analysis.                                                           |
| Parallel coordinates             | Expert mode comparison across many axes with missing-data handling. | Teen mode default.                                                               |
| Grouped bars                     | Measured numeric axes with units.                                   | Qualitative role shape.                                                          |
| Heatmap / role matrix            | Ingredient x role/source coverage scanning.                         | Individual ingredient story if source labels are hidden.                         |
| Table fallback                   | Required for all charted data.                                      | Optional enhancement only.                                                       |

## Why Radar Charts Can Mislead

- Axis order changes polygon shape and area.
- Area appears meaningful even when it is not encoded as data.
- Mixed units and scales can look comparable when they are not.
- Missing values are often mistaken for low values.
- Overlapping polygons become cluttered and hard to compare.
- Angle/area judgments are weaker than aligned position/length judgments in graphical perception research.
- Mobile screens amplify label crowding and touch-target problems.

Key source classes: Cleveland & McGill graphical perception research; accessibility guidance from MIT VIS, Harvard, and Mass.gov; library docs for implementation constraints. DOI for Cleveland & McGill must be resolved before expert-mode citation.

## Accepted Uses

- Show one ingredient's role shape with source/confidence badges.
- Compare two ingredients only when axes share the same scale and missing data is explicit.
- Teach teens that "green" can mean acid, water, heat, fat, bitter, or preserved roles.
- Let chefs scan fit by culinary job, not chemistry proof.
- Let experts drill into raw values, units, evidence labels, and citations.

## Rejected Uses

- Ranking ingredients by polygon area.
- Showing unknown values as zero.
- Mixing measured pH, chef heuristic, and personal thesis without visible evidence encoding.
- Claiming radar shape proves balance, health, flavor, or substitutability.
- Comparing more than two or three ingredients in a filled radar.
- Hiding source disagreement behind averaged scores.

## Candidate Axes

| Mode   | Axes                                                                                                                                                   | Rule                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Teen   | bright/sour, crunchy/watery, creamy/fatty, herbal/aromatic, spicy/hot, bitter/leafy                                                                    | Plain language, no false precision, unknown shown as gap.  |
| Chef   | acid lift, water/crunch, aromatic top note, heat/pungency, bitter/astringent, fat/body, preserved/briny, structure                                     | Role-based; substitution support only after safety checks. |
| Expert | pH/titratable acidity, water activity or moisture, lipid %, bitter compound evidence, volatile evidence, phenolic evidence, texture metric, confidence | Axis must have unit/source or be labeled heuristic.        |

## Normalization Policy

- Normalize only within a named axis definition.
- Store raw value, unit, source, transform, and normalized score.
- Never average measured and heuristic values without preserving components.
- Never convert missing data to zero.
- Use separate "evidence coverage" and "role strength" scores.
- If an axis is `chef-heuristic`, label it as such and do not display it as measured science.

## Confidence Display Policy

- Encode confidence through badges or line style, not color alone.
- Use evidence labels: measured, peer-reviewed, database-derived, inferred, culinary precedent, chef heuristic, personal thesis, speculative, rejected/unsupported.
- Show a source count and freshness indicator for expert mode.
- Show disagreement as split/source note rather than a merged false consensus.

## Missing Data Policy

- Unknown axis value becomes a visible gap or "Not enough evidence" marker.
- Tooltips and table rows must say why the value is missing.
- Missing must not shrink polygon area in a way that implies low intensity.
- Comparison charts must hide or hatch axes missing for either compared ingredient.

## Source / Evidence Encoding

| Evidence               | Visual policy                                         |
| ---------------------- | ----------------------------------------------------- |
| `measured`             | Solid line/point with unit and citation link.         |
| `peer-reviewed`        | Solid line/point with literature citation.            |
| `database-derived`     | Solid line/point with database badge and access date. |
| `inferred`             | Dashed line/point with derivation note.               |
| `culinary-precedent`   | Chef badge; no science styling.                       |
| `chef-heuristic`       | Heuristic badge; editable/reviewable.                 |
| `personal-thesis`      | Personal note only.                                   |
| `speculative`          | Do not plot by default.                               |
| `rejected-unsupported` | Never plotted.                                        |

## Mobile Behavior

- Default to a role matrix or compact bars below 420px width.
- Radar may appear as a single ingredient only, no filled comparison overlay.
- Labels must move outside the plot with wrapping.
- Touch target minimum 44px for data points/toggles.
- Table fallback must be visible from the same panel.

## Accessibility Fallback

- Every chart needs an HTML table with axis, value, unit, evidence label, confidence, source, and missing-data reason.
- Keyboard focus must reveal the same details as hover.
- Color is never the only encoding for evidence/confidence.
- Screen reader summary must state chart type, ingredient, axis count, high/low known roles, missing axes, and warning that role shape is not proof.

## Screen Reader Summary Format

`[Ingredient] role profile. Known high roles: [roles]. Known low roles: [roles]. Missing evidence: [axes]. Evidence mix: [counts by evidence class]. This chart summarizes culinary role shape and does not prove flavor, nutrition, or substitution safety. A data table follows.`

## Table Fallback Columns

| Column              |
| ------------------- |
| Axis                |
| Raw value           |
| Normalized score    |
| Unit                |
| Evidence class      |
| Source              |
| Access date         |
| Confidence          |
| Missing-data reason |
| Teen wording        |
| Expert wording      |

## Test Fixtures

| Fixture                      | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| All measured values          | Verify units/citations and normalized display.       |
| Mixed measured + heuristic   | Verify evidence labels stay visible.                 |
| Missing pH                   | Verify Not enough evidence, not zero.                |
| Same color, different roles  | Green apple vs avocado vs green bell pepper.         |
| Same species, different role | Jalapeno vs green bell pepper.                       |
| Food-state change            | Raw cucumber vs pickled cucumber.                    |
| Source conflict              | One study supports color effect; another shows null. |
| Accessibility                | Keyboard, screen reader summary, table fallback.     |
| Mobile                       | No label overlap, no unreadable polygon.             |

## Library Recommendation

Use custom SVG or Visx for the first build. Reason: evidence labels, gaps, hatching, keyboard interaction, table fallback, and source drilldowns are core product requirements and may be awkward in generic radar components. Recharts can be used for simple prototypes, but do not ship until missing-data gaps and accessibility fallback are proven.

## Ship Decision

A radar chart can ship only after:

- Every axis has a definition, source rule, normalization rule, and missing-data rule.
- Unknown values render as Not enough evidence, not zero.
- Mixed evidence classes are visible in chart and table.
- Teen, chef, and expert wording differ appropriately.
- Screen reader summary and HTML table fallback exist.
- Mobile layout is verified.
- Test fixtures cover measured, mixed, missing, disagreement, and unsafe substitution cases.
