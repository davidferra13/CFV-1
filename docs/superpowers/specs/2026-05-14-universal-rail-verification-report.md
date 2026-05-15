# Universal Rail Catalog Verification Report

**Date:** 2026-05-14
**Scope:** 7 role catalogs (Public, Guest, Client, Chef, Staff, Partner, Admin)
**Method:** 3 parallel verification agents + codebase alignment check

---

## Summary

| Role      | Items (Actual) | Items (Claimed) | Delta  | Expected Min |
| --------- | -------------- | --------------- | ------ | ------------ |
| Public    | 53             | 52              | +1     | ~50          |
| Guest     | 60             | 60              | 0      | ~60          |
| Client    | 139            | 139             | 0      | ~80          |
| Chef      | 226            | 253             | -27    | ~120         |
| Staff     | 57             | 57              | 0      | ~40          |
| Partner   | 76             | 76              | 0      | ~35          |
| Admin     | 169            | 152             | +17    | ~70          |
| **TOTAL** | **780**        | **789**         | **-9** |              |

- **Unique item types (estimated):** ~680 (after deduplicating ~100 shared discovery items across public/guest/client/chef)
- All catalogs exceed their expected minimums
- 3 catalogs have counting errors in their headers

---

## Gaps Found

### Missing Fields (All 7 Catalogs)

These 4 fields from the canonical 22-field spec are **absent from every catalog:**

| Field              | Impact                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `subcategory`      | No sub-grouping within categories. Flat hierarchy only.                                                            |
| `relevanceSignals` | RAIL_SCORE relevance component (W_r) cannot be independently computed. Signals are scattered across scoring notes. |
| `freshnessWindow`  | No explicit freshness duration. Embedded in `expiresAt` logic instead.                                             |
| `renderHints`      | No structured render guidance. Covered partially by `Presentation` and `Icon` fields.                              |

### Additional Missing Fields Per Catalog

| Catalog | Missing                             | Notes                                                            |
| ------- | ----------------------------------- | ---------------------------------------------------------------- |
| Public  | `privacy`                           | Entirely absent. Even public items should declare privacy level. |
| Public  | `hoverAction` in master table       | Present in detail specs but not table columns                    |
| Public  | `href` in master table              | Present in detail specs but not table columns                    |
| Chef    | `href/hrefTemplate` in master table | Separate reference section exists                                |
| Chef    | `scoringNotes` in master table      | Present in detail specs section only                             |
| Admin   | `baseUrgency`                       | Uses `severity` enum + `priority_formula` instead                |
| Admin   | `urgencyDecayFn`                    | Uses `staleness_window` instead                                  |
| Admin   | `hoverAction`                       | Entirely absent                                                  |
| Admin   | `clickAction`                       | Uses `action_label` + `href` instead                             |
| Admin   | `expandable`                        | Not supported                                                    |
| Admin   | `maxImpressions`                    | Not supported                                                    |
| Admin   | `cooldownMinutes`                   | Uses `dismiss_behavior` enum instead                             |
| Admin   | `pageAffinity`                      | Uses `admin_module` instead                                      |
| Admin   | `privacy`                           | Full system visibility by design, no per-item scoping            |

### Missing Real-World Scenarios

| Role    | Gap                                                                                    |
| ------- | -------------------------------------------------------------------------------------- |
| Staff   | Equipment malfunction/issue reporting (partial coverage via `station_equipment_check`) |
| Partner | Account deactivation/suspension notice                                                 |
| Chef    | 27 items claimed in header but not present in master table (253 claimed, 226 found)    |

### Missing Categories

No categories with ZERO items were found. All catalogs have comprehensive category coverage.

---

## Overlaps & Conflicts

### Counting Errors

| Catalog | Issue                                                                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public  | Header says 52 types, table has 53 (off by 1)                                                                                                                 |
| Chef    | Header architecture says 253 items/49 categories, intro says 38 categories. Master table only reaches #226. Off by 27 items. Two conflicting category counts. |
| Admin   | Summary claims 152 items, file contains 169 (+17). Per-category counts also stale.                                                                            |

### Schema Divergence (CRITICAL)

**7 catalogs use at least 3 fundamentally different schemas:**

| Schema Family     | Catalogs               | Key Differences                                                                                   |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| Discovery-style   | Public, Guest          | Scoring formula: `baseUrgency + boosts - penalties`                                               |
| Operational-style | Client, Staff, Partner | Similar to discovery but adds operational fields                                                  |
| Admin-style       | Admin                  | Completely different: `severity` enum, `priority_formula`, `dismiss_behavior`, no numeric urgency |
| Chef hybrid       | Chef                   | 8-weighted-dimension formula with category weights                                                |

### Privacy Vocabulary Fragmentation (4 Different Systems)

| Catalog | Privacy Values                                                                            |
| ------- | ----------------------------------------------------------------------------------------- |
| Public  | NO privacy field                                                                          |
| Guest   | `public`, `account_private`, `behavior_private`, `preference_private`, `aggregate_public` |
| Client  | `private`, `chef_visible`, `household_visible`, `event_visible`                           |
| Chef    | `tenant`, `shared`, `system`                                                              |
| Staff   | `tenant-scoped` (single value)                                                            |
| Partner | `partner-scoped` (single value)                                                           |
| Admin   | No privacy field (god-mode by design)                                                     |

No documented mapping between these vocabularies exists.

### Urgency Calibration (Cross-Role)

Complementary items are well-calibrated:

| Scenario        | Chef | Client            | Verdict                       |
| --------------- | ---- | ----------------- | ----------------------------- |
| Quote expiring  | 90   | 80                | Sensible: chef controls quote |
| New inquiry     | 95   | 35 (inquiry_sent) | Sensible: chef must respond   |
| Event today     | 100  | 98                | Sensible: near-equal priority |
| Payment overdue | 95   | 75 (payment_due)  | Sensible: chef's revenue      |

Discovery item urgency correctly drops for clients (cuisine: public=40, guest=41, client=15) since operational items dominate.

**One concern:** Client `client_dietary` at baseUrgency 25 vs Public `dietary` at 50. Dietary is safety-critical. The +10 allergy polarity boost helps but baseline may be too low.

---

## Quality Issues

### baseUrgency Scale Mismatch

**All catalogs use 0-100 scale.** The requirement specifies 1-10. Internally consistent but inconsistent with spec. This is a deliberate design choice (0-100 provides finer granularity) and should be formalized.

### clickAction Values Outside Spec

| Value        | Catalog | Spec Allows? |
| ------------ | ------- | ------------ |
| `open_modal` | Client  | NO           |
| `deep_link`  | Chef    | NO           |

Spec allows: `navigate`, `toggle_filter`, `expand_inline`, `quick_action`

### hoverAction Enum Violations

| Catalog                  | Issue                                                                    |
| ------------------------ | ------------------------------------------------------------------------ |
| Staff                    | All 57 items use prose descriptions instead of `preview`/`expand`/`none` |
| Partner                  | All 76 items use prose descriptions instead of enum values               |
| Public/Guest/Client/Chef | All use `preview` only. `expand` and `none` are dead enum values.        |
| Admin                    | Field entirely absent                                                    |

### Scoring Formula Incompatibility

**4 different scoring approaches, none match reference RAIL_SCORE:**

```
Reference: RAIL_SCORE = (URGENCY * W_u) + (RELEVANCE * W_r) + (FRESHNESS * W_f)
                      + (USER_AFFINITY * W_a) - (FATIGUE * W_d) + (BOOST)
```

| Catalog | Formula                                                                                                                                                                                                         | Compatible?                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Public  | `baseUrgency + pageAffinityBoost + editorialBonus + signalBoost - decayPenalty - dismissPenalty - impressionFatigue`                                                                                            | Partial: additive without weights         |
| Guest   | Inherits public                                                                                                                                                                                                 | Partial                                   |
| Client  | Not explicitly defined                                                                                                                                                                                          | Unknown                                   |
| Chef    | `(urgency*0.22 + moneyImpact*0.16 + eventRisk*0.20 + relationshipValue*0.12 + confidence*0.10 + freshness*0.08 + actionability*0.12 + expiresSoonBoost - agePenalty) * categoryWeight * pageAffinityMultiplier` | Incompatible: 8 weighted dimensions       |
| Staff   | `baseUrgency + pageAffinityBoost + timeWindowBoost + unreadBoost + safetyBoost - suppressionPenalty - completedPenalty`                                                                                         | Partial                                   |
| Partner | Similar to staff                                                                                                                                                                                                | Partial                                   |
| Admin   | `severity` enum + `priority_formula` expressions                                                                                                                                                                | Incompatible: entirely different paradigm |

### Additional urgencyDecayFn Values

| Value      | Catalogs     | In Spec?                               |
| ---------- | ------------ | -------------------------------------- |
| `deadline` | All          | Yes                                    |
| `linear`   | All          | Yes                                    |
| `none`     | All          | Yes                                    |
| `step`     | Client, Chef | Extended                               |
| `inverse`  | Chef         | Extended (urgency INCREASES over time) |

### Additional Presentation Values

| Value                            | Catalogs                            | Standard?                       |
| -------------------------------- | ----------------------------------- | ------------------------------- |
| `pill`, `card`, `badge`, `story` | All                                 | Yes                             |
| `alert`                          | Guest, Client, Chef, Staff, Partner | Extended                        |
| `progress`                       | Guest, Client                       | Extended                        |
| `banner`                         | Client                              | Extended                        |
| `metric`                         | Chef                                | Extended                        |
| `countdown`                      | Chef                                | Extended                        |
| `visual_card`                    | Codebase                            | Exists in code, not in catalogs |

### Near-Duplicate Items

| Catalog | Items                                    | Issue                                                                |
| ------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Admin   | `review-moderation` + `moderation-queue` | Near-duplicate "Review Moderation Queue" headings with different IDs |

### Vague Labels

| Catalog | Item                | Label           | Issue                        |
| ------- | ------------------- | --------------- | ---------------------------- |
| Public  | `comparison_prompt` | "Can't decide?" | Too vague, needs specificity |

---

## Cross-Role Issues

### Privacy Boundaries: PASS

All catalogs enforce proper isolation:

- Staff: explicitly forbids chef financials, client PII, business metrics (34 forbidden fields listed)
- Partner: scoped to own referrals/events only, cannot see other partners
- Admin: god-mode by design, no data leaks to other roles
- Client: proper `chef_visible`, `household_visible` granularity
- Chef: `tenant` scoping enforced

### Guest-to-Client Conversion: PASS

Guest catalog includes 8 conversion nudge items (profile_progress, taste_profile_completion, first_booking_nudge, etc.) that progressively encourage account deepening. Client catalog picks up with operational items. Clear progression.

### Chef-as-Diner Toggle: PASS

Chef catalog includes 6 CLIENT-AS-DINER items (#215-220) with reduced urgency (25 vs operational items at 60-100). Uses `diner_` prefix. Properly compartmentalized.

### Staff-Tenant Scoping: PASS

Every staff item's privacy field states "tenant-scoped." Global rules explicitly require `requireStaff()` authentication and tenant match.

---

## Scoring Compatibility

### Items That Cannot Directly Feed RAIL_SCORE

All 169 admin items use `severity` + `priority_formula` instead of numeric `baseUrgency`. An adapter layer mapping severity to numeric values would be needed:

- critical = 90, high = 70, medium = 50, low = 30, info = 10

### Missing Decay Functions

Admin catalog uses `staleness_window` instead of `urgencyDecayFn`. No explicit decay function type (deadline/linear/none).

### Unreasonable Impression/Cooldown Values

No unreasonable values found. Items with `maxImpressions: -1` (never suppress) are all justified: active-state items, error states, clock reminders, safety alerts.

---

## Existing Code Alignment

### DiscoveryItemType Preservation: PASS

All 24 existing `DiscoveryItemType` values from `lib/discovery/homepage-discovery-rail.ts` are preserved in the public catalog:

```
cuisine, food_type, craving, service, occasion, dietary, featured_chef,
chef_pick, combo, story, surprise, seasonal, location, mood, price, time,
group_size, saved, special_dining, circle, culinary_signal, technique,
ingredient, vibe
```

### Rail Contract Registry: Extended, Not Contradicted: PASS

All 24 existing contracts in `DISCOVERY_RAIL_CONTRACT_REGISTRY` remain valid. New catalogs extend with role-specific items.

### Database Tables: PASS

All referenced data sources map to existing tables in the 480+ table schema. No phantom tables referenced.

### Routes: PASS

All 8 `DiscoveryDestinationFamily` routes exist:

- `/eat`, `/chefs`, `/nearby`, `/ingredients`, `/cuisines/[slug]`, `/chef/[slug]`, `/hub`, plus 6 `PUBLIC_INFO_PATHS`

### Code Gaps to Note

| Issue                                     | Detail                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `PRACTICAL_TYPES` set missing 3 types     | `technique`, `ingredient`, `vibe` classify as `ambient` by default. May be intentional.                  |
| No discovery-specific DB tables           | No `discovery_sessions`, `discovery_impressions`, etc. State handled client-side or via existing tables. |
| `visual_card` presentation exists in code | Not referenced in any catalog. Catalogs should adopt or formally supersede.                              |

---

## Recommendations

### Top 10 Highest-Impact Fixes (Priority Order)

1. **Unify the scoring formula.** 4 different formulas across 7 catalogs. Define a single RAIL_SCORE with role-specific weight profiles. The chef formula's 8-dimension approach is the most sophisticated; consider it as the base with simplified weight profiles for simpler roles.

2. **Unify privacy vocabulary.** 4 different privacy systems. Define a single enum (`public`, `account_private`, `tenant_scoped`, `role_scoped`, `system`) with role-appropriate defaults.

3. **Fix the admin schema divergence.** Admin uses a completely different field set. Either (a) create an adapter mapping admin fields to the canonical 22, or (b) formally define admin as a separate rail system with its own contract.

4. **Add the 4 universally missing fields.** `relevanceSignals`, `freshnessWindow`, `renderHints`, `subcategory` are absent everywhere. Define them or formally remove from the canonical 22-field spec.

5. **Fix counting errors.** Chef catalog off by 27 items (226 vs 253 claimed). Admin off by 17 (169 vs 152 claimed). Public off by 1. Update headers to match actual content.

6. **Formalize baseUrgency scale as 0-100.** All catalogs already use it. Update the spec to match reality rather than the other way around.

7. **Standardize hoverAction.** Staff/Partner use prose descriptions. Convert to enum values (`preview`, `expand`, `none`). Consider whether `expand` and `none` are actually needed (currently unused).

8. **Ratify extended clickAction values.** `open_modal` (client) and `deep_link` (chef) are useful but not in spec. Add them to the allowed set or map to existing values.

9. **Add `privacy` field to public catalog.** Even public items should declare `public` privacy for consistency.

10. **Raise client `dietary` baseUrgency.** Currently 25, while public has 50. Dietary is safety-critical. The +10 allergy boost helps but baseline should be higher (suggest 40+).

### Items That Should Be Added

- Staff: Equipment malfunction/failure reporting item
- Partner: Account suspension/deactivation notice item
- Chef: The 27 "missing" items (if they exist in detailed specs, add to master table)

### Items That Should Be Merged or Split

- Admin: `review-moderation` + `moderation-queue` are near-duplicates. Consolidate or clearly differentiate in labels.

### Suggested Priority for Building

1. **Public + Guest catalogs first** (shared discovery foundation, 113 items)
2. **Chef operational catalog** (highest item count, most business value, 226 items)
3. **Client operational catalog** (lifecycle/event items, 139 items)
4. **Admin catalog** (monitoring/god-mode, 169 items)
5. **Staff catalog** (tenant-scoped operational, 57 items)
6. **Partner catalog** (referral/venue scoped, 76 items)

Build the scoring formula adapter first, then catalogs can implement against a unified interface.
