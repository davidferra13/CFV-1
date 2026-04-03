# Spec: Discover State Normalization Hardening

> **Status:** verified
> **Priority:** P1 (stability)
> **Depends on:** food-directory-import.md (verified)
> **Estimated complexity:** small (4 files modified, 1 file created)
> **Created:** 2026-04-02
> **Built by:** Codex (2026-04-02)
>
> **Build notes:** This spec records a targeted fix and proof for the `/discover` state-normalization issue. It is intentionally narrow. It does not include vendor/product work, UI redesign, or full-database cleanup.

---

## What This Does (Plain English)

Hardens the public `/discover` directory so US state counts, filtering, and display are based on canonical state codes instead of raw imported values. The bug previously inflated the landing page to `80 states` and allowed malformed values like `SON` to behave like real filters. After hardening, the running app shows `51 states`, accepts both `MA` and `Massachusetts`, and treats invalid tokens as empty-state filters.

---

## Why It Matters

The directory is user-facing and large (`329,744` public food businesses). A broken state model makes the landing stats look untrustworthy and creates inconsistent browse behavior. This is not a cosmetic issue. It directly affects the honesty of the primary discovery surface.

The right fix is narrow:

- canonicalize state values at read time
- prevent future bad imports
- add regression proof for the exact user-visible cases

This spec deliberately does **not** expand into unrelated cleanup or feature work.

---

## Verified Evidence

### Runtime Proof

Verified on the active app runtime at `http://127.0.0.1:3100` on 2026-04-02.

Playwright proof artifacts:

- `test-results/manual-proof-2026-04-02/proof.json`
- `test-results/manual-proof-2026-04-02/discover-home.png`
- `test-results/manual-proof-2026-04-02/discover-massachusetts.png`
- `test-results/manual-proof-2026-04-02/discover-son.png`

Captured proof summary:

```json
{
  "checkedAt": "2026-04-02",
  "baseUrl": "http://127.0.0.1:3100",
  "home": {
    "shows51States": true,
    "shows80States": false,
    "hasDirectoryTitle": true
  },
  "massachusetts": {
    "showsBrowsingMassachusetts": true,
    "showsNoResults": false,
    "articleCount": 24
  },
  "invalidState": {
    "showsNoResults": true,
    "articleCount": 0
  }
}
```

### Data Evidence

Current database facts observed during diagnosis:

- `329,744` public directory listings
- `90` malformed or noncanonical state rows
- `29` bad tokens beyond the expected 50 states plus DC

Examples of bad state values observed:

- full names such as `TENNESSEE`, `OHIO`, `TEXAS`
- junk tokens such as `SON`, `EV`, `RT`, `SO`, `IAM`, `C`, `M`

---

## Root Cause

The bug had three parts:

1. Import path accepted raw state values
   - `scripts/import-crawler-data.mjs` wrote crawler state data without enforcing canonical two-letter US codes.

2. Discover query path grouped and filtered on raw values
   - `lib/discover/actions.ts` used raw `state` values for stats, facets, and filtering behavior.
   - That split valid rows across tokens like `MA` and `Massachusetts`.
   - It also let invalid junk tokens count toward the landing page.

3. UI surfaced the bad aggregate directly
   - `app/(public)/discover/page.tsx` displayed `stats.states.length`, so the raw data error appeared directly in the UI as `80 states`.

---

## Scope

This spec covers only:

- public `/discover` state normalization
- state-based stats, facets, filtering, and listing detail display
- future import hardening for state values
- narrow regression proof for the user-visible browse flow

---

## Non-Goals

- vendor or product directory work
- chef/operator directory expansion
- browse redesign or UX overhaul
- SEO work unrelated to state correctness
- broad data-model refactors
- full-database cleanup beyond an optional narrow follow-up
- proving the entire app is healthy

---

## Files to Create

| File                                              | Purpose                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `tests/unit/discover.state-normalization.test.ts` | Proves canonicalization behavior for valid and invalid state inputs |

---

## Files to Modify

| File                              | What to Change                                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/discover/constants.ts`       | Add shared canonical US state normalization helpers and canonical state definitions.                                                                  |
| `lib/discover/actions.ts`         | Normalize incoming state filters, normalize state grouping for stats/facets, return empty results for invalid tokens, normalize listing detail state. |
| `scripts/import-crawler-data.mjs` | Normalize imported state values before insert. Fall back to trusted folder-state context when raw crawler values are invalid.                         |

---

## Database Changes

None required for runtime correctness.

The live behavior can be corrected without any schema migration by canonicalizing at read time and hardening the import path for future rows.

### Optional Follow-Up

A separate, explicit cleanup may be run later for legacy malformed rows:

- normalize only confidently mappable full-name states to two-letter codes
- do not guess ambiguous junk values
- unresolved values may be set to `NULL` or left untouched pending review

This follow-up is intentionally **not** bundled into the core fix.

---

## Data Model

### Canonical State Rules

The public directory must behave as a US-only browse surface with exactly:

- 50 states
- Washington, DC

All browse logic must use canonical two-letter codes.

### Normalization Contract

| Input           | Canonical Output |
| --------------- | ---------------- |
| `MA`            | `MA`             |
| `Massachusetts` | `MA`             |
| `massachusetts` | `MA`             |
| `Tennessee`     | `TN`             |
| `SON`           | `null`           |
| empty / unknown | `null`           |

### Behavioral Rules

- Canonicalize before grouping states
- Canonicalize before applying filters
- Invalid state filters must not fall through to raw SQL matches
- Listing detail pages should display normalized state values when possible

---

## Server / Query Behavior

### `getDirectoryStats()`

Must group listings by canonical state code, not raw `directory_listings.state`.

Required outcome:

- landing page reports `51` states, not `80`

### `getDirectoryFacets()`

Must return canonical state choices only.

Required outcome:

- dropdowns and browse surfaces do not expose junk tokens like `SON`

### `getDirectoryListings(filters)`

Must normalize incoming `filters.state` before querying.

Required behavior:

- `MA` and `Massachusetts` resolve to the same result set
- invalid tokens short-circuit to an empty result
- raw invalid values must not leak into the query path

### `getDirectoryListingBySlug()`

Must normalize state display when a stored value is noncanonical but mappable.

Required behavior:

- detail pages should not display malformed full-name or junk state tokens when a canonical form is known

---

## Import Requirements

`scripts/import-crawler-data.mjs` must enforce canonical state handling on ingest.

Required behavior:

- normalize `biz.address.state`
- if invalid, fall back to trusted state context from the crawler folder path
- if still invalid, do not write a fake state token

The importer must never knowingly create new junk values such as `SON`.

---

## UI / Component Spec

No UI redesign is required.

The only required user-visible outcomes are:

1. `/discover` shows a truthful state count
2. valid state filters behave consistently whether entered as code or full name
3. invalid state filters render the existing empty-state behavior

Expected examples:

- `/discover` -> `51 states`
- `/discover?state=MA` -> valid result set
- `/discover?state=Massachusetts` -> equivalent valid result set
- `/discover?state=SON` -> `No listings match these filters`

---

## Regression Requirements

This issue must be protected by narrow automated proof. One regression spec is sufficient if it covers exactly these cases:

1. Landing page correctness
   - `/discover` shows `51 states`
   - `/discover` does **not** show `80 states`

2. Valid state normalization
   - `/discover?state=Massachusetts` shows a non-empty result set
   - behavior is equivalent to `/discover?state=MA`

3. Invalid state handling
   - `/discover?state=SON` shows the empty state
   - no listing cards render

### Unit Coverage

Unit coverage must prove the normalization function itself:

- `MA` -> `MA`
- `Massachusetts` -> `MA`
- invalid `SON` -> `null`

---

## Acceptance Criteria

The work is complete only when all of the following are true:

1. Landing page shows `51 states` on the running app.
2. Landing page no longer shows `80 states`.
3. `MA` and `Massachusetts` resolve to equivalent browse behavior.
4. Invalid state tokens show the normal empty-state UI.
5. Future imports cannot create new noncanonical junk state tokens.
6. Proof artifacts exist for the landing page, valid filter, and invalid filter cases.
7. Scope remains narrow. No unrelated directory, vendor, product, or UI expansion is introduced.

---

## Out of Scope

- broad cleanup of all historical bad rows
- data enrichment
- listing quality scoring changes
- city normalization
- URL redesign
- discover SEO expansions
- directory landing page redesign

---

## Open Questions

1. Should the `90` malformed legacy rows be cleaned in a separate maintenance pass, or left alone since read-time normalization already protects the UI?
2. If legacy cleanup is approved later, should unresolved junk values be nulled or preserved for manual audit?

---

## Notes for Builder Agent

1. Do not broaden this into a discover refactor. The problem is state normalization, not general browse quality.
2. Prefer one shared normalization helper over ad hoc mappings in multiple files.
3. Reject invalid state filters explicitly instead of letting them degrade into fuzzy behavior.
4. Treat the importer as a future-data guardrail, not as the primary runtime fix.
5. Keep proof tight. Three browser cases and one unit normalization test are sufficient.
