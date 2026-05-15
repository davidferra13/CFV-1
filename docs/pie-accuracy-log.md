# PIE Accuracy Log

Tracks PIE pricing accuracy over time. Each run samples ingredients,
compares PIE's mean price against median (ground truth), and scores
accuracy as % within 15% of ground truth.

## 2026-05-05 (Self-Consistency Only)

**Sample:** 87 ingredients (100 attempted, 13 skipped for insufficient data), random stratified
**Overall accuracy:** 97.7% within 15%
**Mean absolute error:** 1.9%
**Passing:** 85 / 87
**Failing:** 2 / 87

**By category:**

- Dairy: 50% accurate (n=2, mean err=9.2%) - WATCH
- Other: 80% accurate (n=5, mean err=10%) - includes non-food contamination
- Produce: 100% accurate (n=5, mean err=3.4%)
- Protein: 100% accurate (n=1, mean err=3.9%)
- Meat & Seafood: 100% accurate (n=1, mean err=0%)
- Dairy & Eggs: 100% accurate (n=1, mean err=0%)
- Grains & Bakery: 100% accurate (n=4, mean err=3%)
- Canned Goods & Soups: 100% accurate (n=3, mean err=3.2%)
- Oils, Vinegars, & Spices: 100% accurate (n=3, mean err=3%)
- Beverages: 100% accurate (n=5, mean err=0.5%)
- Frozen: 100% accurate (n=3, mean err=0%)
- Prepared Foods: 100% accurate (n=3, mean err=1.5%)
- Condiments & Sauces: 100% accurate (n=2, mean err=0%)
- Snacks & Candy: 100% accurate (n=3, mean err=1.6%)
- Pantry: 100% accurate (n=1, mean err=0%)

**Worst offenders:**

1. U by Kotex Balance Daily Wrapped Panty Liners - PIE $3.07 vs truth $2.19 (40.2% off) - **non-food, should be filtered from census**
2. Dunkin' Extra Extra Coffee Creamer - PIE $5.17 vs truth $4.37 (18.3% off) - price variance across 662 products, skewed by size variants
3. Nutella & Go with Breadsticks - PIE $7.97 vs truth $7.13 (11.8% off) - PASS
4. Van Camp's Pork and Beans - PIE $3.22 vs truth $3.56 (9.6% off) - PASS
5. Krazy Glue Super Glue - PIE $3.48 vs truth $3.83 (9.1% off) - non-food contamination

**Actions taken:**

- [x] First-ever accuracy measurement completed
- [x] Non-food items (Kotex, Krazy Glue) verified: already excluded by `PIE_FOOD_CATEGORIES` in production code. Test script wasn't filtering; production pipeline does. Not a real defect.
- [ ] Dunkin' Creamer: multiple package sizes mapping to same canonical; needs size normalization
- [x] Sync pipeline broken since April 23 (Pi sync-to-chefflow failing due to ChefFlow HTTP down). Direct sync script (`scripts/direct-pi-sync.cjs`) written and running, bypassing HTTP layer.
- [x] Normalization expansion script (`scripts/norm-expand.cjs`) written to increase multi-source coverage from 273 ingredients.

**Confidence recalibration needed:** No. Accuracy far exceeds all tier targets.

| Confidence Tier  | Target          | Actual                       | Verdict |
| ---------------- | --------------- | ---------------------------- | ------- |
| HIGH (>0.7)      | >95% within 15% | 97.7%                        | PASS    |
| MEDIUM (0.4-0.7) | >80% within 15% | 97.7%                        | PASS    |
| LOW (<0.4)       | >60% within 15% | N/A (not sampled separately) | -       |

**Methodology note:** This test compares PIE's mean price against its own median (self-consistency check). It does NOT compare against real shelf prices, which would require manual price checks. True accuracy against shelf prices is estimated to be lower, especially for:

- Products sold in multiple sizes (size variants inflate mean)
- Regional price differences (national mean vs local shelf)
- Stale data (0% 7-day freshness at time of test)

**Delta from last run:** First run (baseline established)

---

## 2026-05-14 - Ground Truth Pipeline Established

**METHODOLOGY CHANGE:** From this point forward, accuracy is measured against REAL
receipt prices from chef imports, not self-referential consistency checks. The prior
measurement (97.7%) was comparing PIE's mean vs PIE's own median. That measures
internal consistency, not real-world accuracy.

Real ground truth validation pipeline now active:

- Receipt prices are compared against PIE's resolve-price estimate at import time
- Compound learning predictions get resolved against real observations
- Cron runs full validation every cycle
- SLA target: 90% of prices within 15% of actual receipt price

Run `npx tsx scripts/pie-accuracy-real.mts --append-log` for on-demand measurement.
Cron endpoint: `GET /api/cron/pie-accuracy-check`

---
