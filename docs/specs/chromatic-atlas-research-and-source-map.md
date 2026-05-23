# Chromatic Atlas — Research and Source Map

**Status:** Bootstrap draft — 2026-05-19
**Crawl run:** `docs/specs/chromatic-atlas-research-crawl-report.md`

---

## Purpose

This document is the persistent source strategy for the Chromatic Flavor Atlas. It defines which research tracks exist, which sources are being evaluated, and what governance rules apply to claims made from those sources. It is updated whenever new tracks are discovered or source evaluations are resolved.

---

## Evidence Classes

All claims in the Atlas must be labeled with one of the following evidence classes:

| Class                  | Definition                                                                           | Allowed for product claims                        |
| ---------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `measured`             | Instrument-measured value (CIELAB, nutrient assay, GC-MS compound) with citation     | Yes, with unit and citation                       |
| `peer-reviewed`        | Published in peer-reviewed scientific journal; DOI or PMID required                  | Yes, with citation                                |
| `database-derived`     | From a named, maintained scientific database (USDA FDC, FooDB, BitterDB, etc.)       | Yes, with database name + access date             |
| `inferred`             | Logically derived from multiple measured/peer-reviewed sources; derivation explained | Conditional; requires derivation note             |
| `culinary-precedent`   | Established chef/culinary practice documented in authoritative culinary sources      | Chef mode only; labeled                           |
| `chef-heuristic`       | Widely shared practitioner knowledge without formal citation                         | Chef mode only; labeled "common practice"         |
| `personal-thesis`      | User's or chef's individual interpretation or preference                             | Personal label only; never presented as universal |
| `speculative`          | Plausible hypothesis without supporting evidence                                     | Label required; not presented as fact             |
| `rejected-unsupported` | Claim examined and found to lack adequate supporting evidence                        | Never used in product; documented in claim audit  |

---

## Research Tracks

### Track 1 — Sensory: Color-Flavor Perception

**Research question:** What does peer-reviewed science say about how color influences flavor perception?

**Primary source tier:**

- Academic journals: Food Quality and Preference; Chemical Senses; Chemosensory Perception; Flavour; Appetite
- Key researchers: Charles Spence (Oxford), Betina Piqueras-Fiszman, Gil Morrot, Frédéric Brochet
- Crossmodal correspondence studies
- PMID/DOI required for all claims

**Known source clusters:**

- Spence, C. (crossmodal correspondences; color-taste interactions) — extensive, peer-reviewed
- Morrot, G., Brochet, F., Dubourdieu, D. (2001). The color of odors. Brain and Language. PMID: 11720688
- Piqueras-Fiszman, B. & Spence, C. (2015). Sensory expectations. Food Quality and Preference.
- Hoegg, J. & Alba, J.W. (2007). Taste perception: more than meets the tongue. Journal of Consumer Research.

**Allowed claims:** Color biases flavor expectation and perception in controlled settings.
**Banned claims:** Color determines flavor. Color predicts taste outcome.

**Track status:** Active — Agent A

---

### Track 2 — Pigment / Plant Chemistry / Color Science

**Research question:** What pigments produce food color, how do they behave under heat/pH/oxidation, and how do standard color measurement systems apply?

**Primary source tier:**

- Peer-reviewed plant chemistry and food science journals
- Government/university datasets
- CIELAB, Munsell, CIE standards documentation

**Known source clusters:**

- Schwartz, S.J. et al. — chlorophylls in foods
- Rodriguez-Amaya, D.B. — carotenoids (comprehensive, peer-reviewed)
- Castaneda-Ovando, A. et al. — anthocyanins chemistry review
- McGee, H. — On Food and Cooking (culinary precedent only, not peer-reviewed science)

**Track status:** Active — Agent B

---

### Track 3 — Flavor / Aroma / Compound Databases

**Research question:** Which compound databases cover volatile aromatics, tastants, bitter compounds, and phenolics relevant to ChefFlow ingredients?

**Primary databases:**

- FlavorDB (IIIT Hyderabad) — URL: https://cosylab.iiitd.edu.in/flavordb/
- FlavorDB2 — updated version
- Flavornet (Cornell) — URL: https://www.flavornet.org/
- FooDB (University of Alberta) — URL: https://foodb.ca/
- ChemTastesDB — bitter/taste compounds
- BitterDB — URL: https://bitterdb.agri.huji.ac.il/
- PubChem (NCBI/NIH) — URL: https://pubchem.ncbi.nlm.nih.gov/
- ChEBI (EBI) — URL: https://www.ebi.ac.uk/chebi/
- HMDB (Human Metabolome Database) — URL: https://hmdb.ca/
- COCONUT (natural products) — URL: https://coconut.naturalproducts.net/
- LOTUS (natural products) — URL: https://lotus.naturalproducts.net/
- KNApSAcK — URL: https://knapsack.nibb.ac.jp/
- Natural Products Atlas — URL: https://www.npatlas.org/

**Critical rule:** Compound presence in a database record does NOT prove perceptible flavor unless odor threshold / taste threshold data accompanies it.

**Track status:** Active — Agent C

---

### Track 4 — Food Composition / Nutrients / Acidity / pH

**Research question:** What composition data (nutrients, pH, acidity) is available for ChefFlow green pilot ingredients, across food states?

**Primary source tier:**

- USDA FoodData Central (FDC) — URL: https://fdc.nal.usda.gov/
- USDA FDC API — URL: https://api.nal.usda.gov/fdc/v1/
- pH reference: academic tables (no single authoritative global pH database exists)
- State specificity: raw / cooked / canned / dried / pickled tracked separately

**Track status:** Active — Agent D

---

### Track 5 — Plant Identity / Taxonomy / Cultivar

**Research question:** What are the authoritative identity sources for ChefFlow green pilot ingredients, and how do cultivar differences affect color and flavor?

**Primary source tier:**

- USDA GRIN (Germplasm Resources Information Network) — URL: https://npgsweb.ars-grin.gov/gringlobal/taxon/taxonomysearch
- GBIF (Global Biodiversity Information Facility) — URL: https://www.gbif.org/
- Kew Plants of the World Online — URL: https://powo.science.kew.org/
- World Flora Online — URL: https://www.worldfloraonline.org/
- USDA PLANTS Database — URL: https://plants.usda.gov/

**Track status:** Active — Agent E

---

### Track 6 — Literature APIs / Metadata / Licensing

**Research question:** How can ChefFlow access, store, and display scientific literature metadata legally?

**Primary APIs:**

- PubMed/NCBI E-utilities — URL: https://www.ncbi.nlm.nih.gov/home/develop/api/
- PubMed Central (PMC) OA — URL: https://www.ncbi.nlm.nih.gov/pmc/tools/openftlist/
- Europe PMC — URL: https://europepmc.org/RestfulWebService
- OpenAlex — URL: https://openalex.org/ (completely open, no key required)
- Crossref — URL: https://www.crossref.org/services/metadata-delivery/
- Semantic Scholar — URL: https://www.semanticscholar.org/product/api
- Zenodo — URL: https://zenodo.org/
- Figshare — URL: https://figshare.com/
- OSF (Open Science Framework) — URL: https://osf.io/

**Track status:** Active — Agent F

---

### Track 7 — Radar / Visualization Research

**Research question:** Which chart types best represent ingredient role profiles honestly, including missing data and confidence levels?

**Research domains:**

- Radar / spider / star / web charts
- Polar charts, rose charts, radial bar
- Parallel coordinates, grouped bars, heatmaps
- Perception research on chart types
- Library options: Recharts, D3, Visx, Chart.js, Nivo, ECharts, custom SVG

**Track status:** Active — Agent G

---

### Track 8 — Culinary Precedent / Culture / Workflow

**Research question:** How do professional chefs use color in menu composition and what cultural meanings does color carry in food traditions?

**Source tier:** Culinary precedent (labeled as such — NOT scientific evidence)

- Published culinary literature (Escoffier, modernist cuisine, plating texts)
- Cultural food anthropology sources
- Chef practitioner accounts

**Track status:** Active — Agent H

---

## Source Governance Rules

1. Scientific claims require peer-reviewed literature, academic publications, government/university datasets, or academic databases.
2. Culinary sources provide precedent, practitioner language, and hypotheses only.
3. AI output is never evidence. Zero AI-generated claims in the research corpus.
4. Source disagreement is preserved, not collapsed into false consensus.
5. Missing data means "not enough evidence" — not zero, not absence.
6. Compound presence does not imply perceptible flavor without threshold/perception evidence.
7. Same color never means same flavor.
8. Every source record must include: URL or DOI or PMID, access date, license note, and what it does/does not support.
9. If licensing cannot be determined, mark the source `restricted/unknown`.
10. If a source is not primary enough for science, downgrade to `hypothesis/precedent`.

---

## Unresolved Questions

- [ ] Does FlavorDB2 have an open API or only static download?
- [ ] What license does FooDB use for commercial applications?
- [ ] Is there a single authoritative global food pH database, or only scattered academic tables?
- [ ] How do cultivar-level color differences affect the image-color extraction pipeline?
- [ ] Is the Green pilot (24 ingredients) the right first proof set, or should it be narrowed?
- [ ] What image color extraction method is scientifically defensible?

---

## 2026-05-20 Crawl Integration

New research outputs:

- `docs/specs/chromatic-atlas-source-registry.md` - source records, evidence classes, license and display policy.
- `docs/specs/chromatic-atlas-field-source-matrix.md` - product fields mapped to allowed/disallowed sources.
- `docs/specs/chromatic-atlas-green-pilot-research.md` - green pilot coverage, unknowns, and recommended smaller first proof set.
- `docs/specs/chromatic-atlas-claim-audit.md` - allowed, conditional, forbidden, and rejected claims.
- `docs/specs/chromatic-atlas-radar-chart-research.md` - radar/chart honesty, accessibility, and ship gate.
- `docs/specs/chromatic-atlas-benchmark-evaluation.md` - benchmark cases and evaluation rubric.

Resolved or sharpened gaps:

- FlavorDB2 has useful web/downloadable records but still needs production API and license review.
- FooDB is valuable but CC BY-NC 4.0; use is restricted for commercial product display.
- No single authoritative global food pH database was found in this crawl.
- The 24-ingredient Green pilot is too broad for a first proof if completeness is required.
- Recommended first proof set: green apple, lime, cucumber, celery, green bell pepper, jalapeno, avocado, green olive.
- Uncontrolled web photos are rejected as measured color evidence.
- Radar charts remain blocked until missing-data, evidence-label, accessibility, and mobile behavior are proven.

---

_This document is updated after each research crawl when new tracks or source gaps are discovered._
