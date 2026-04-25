# Yield Normalization Engine: Deterministic Verification Harness

## Scope

Yield Normalization Engine inside local OpenClaw SQLite only.

## Single Highest-Leverage Action

Build a deterministic verification harness for the Yield Normalization Engine so the feature can be re-proved on demand without relying on whatever happens to be in `current_prices`.

## Why This Is The Highest-Leverage Remaining Action

- The core schema already exists for `ingredient_yields`, `true_costs`, and `yield_normalizer_checkpoints` in `.openclaw-build/lib/db.mjs`.
- The batch service already exists in `.openclaw-build/services/yield-normalizer.mjs`, including yield seeding, resumable checkpoints, batched writes, and sample logging.
- The remaining gap is repeatable proof. Today the service only logs results and explicitly does nothing when the local mirror has no `current_prices`.
- In practice, the local mirror in this checkout started empty, so validation required one-off manual seed rows outside a checked-in flow.

## Evidence

- `.openclaw-build/lib/db.mjs:424-470`
  The new schema is already present. This is not a missing-table problem.
- `.openclaw-build/lib/db.mjs:524-621`
  Additive migrations are already present. This is not a migration-spine problem.
- `.openclaw-build/services/yield-normalizer.mjs:696-860`
  The service already handles checkpointing, batching, safe skips, and `true_costs` upserts.
- `.openclaw-build/services/yield-normalizer.mjs:863-878`
  Output validation is currently log-only. There are no assertions and no repeatable pass/fail harness.
- `.openclaw-build/services/yield-normalizer.mjs:699-706`
  The run depends on whatever is already in `current_prices`.
- `.openclaw-build/services/yield-normalizer.mjs:880-881`
  The service explicitly reports that an empty local mirror yields no computed rows.

## Constraints

- Additive only. No breaking schema changes.
- Do not connect to ChefFlow PostgreSQL.
- Do not add external dependencies.
- Stay within Yield Normalization Engine scope only.
- Preserve the current CLI entrypoint behavior of `.openclaw-build/services/yield-normalizer.mjs`.

## Exact Build

### 1. Refactor the service into a callable runtime function

Update `.openclaw-build/services/yield-normalizer.mjs` to export a callable function, for example:

```js
export async function runYieldNormalizer(options = {}) { ... }
```

Requirements:

- Keep the current CLI behavior intact:
  - direct `node .openclaw-build/services/yield-normalizer.mjs` must still run the job
- Allow the verifier to call the same production logic directly
- Do not split the file into unnecessary abstractions
- Keep `getDb()` as the default database source

### 2. Add a deterministic verifier script

Create:

`scripts/openclaw/verify-yield-normalization.mjs`

Behavior:

- Use the real local SQLite mirror via `.openclaw-build/lib/db.mjs`
- Create a dedicated verification source:
  - `source_id = 'yield-normalization-fixture'`
- Seed a deterministic fixture set into `current_prices` using stable IDs with a clear prefix
- Call the exported runtime function from `.openclaw-build/services/yield-normalizer.mjs`
- Query `true_costs` for only the fixture rows
- Assert exact expected values
- Print a compact verification summary
- Exit `0` on success, non-zero on failure

### 3. Use this exact fixture dataset

Seed these rows if missing:

| current_price_id                 | canonical_ingredient_id | raw_product_name   | raw_price_cents | unit    | expected_yield | expected_usable_cents |
| -------------------------------- | ----------------------- | ------------------ | --------------: | ------- | -------------: | --------------------: |
| `yield-fixture:chicken-whole`    | `chicken-whole`         | `Whole Chicken`    |             399 | `lb`    |           0.62 |                   644 |
| `yield-fixture:beef-chuck-roast` | `beef-chuck-roast`      | `Beef Chuck Roast` |             749 | `lb`    |           0.66 |                  1135 |
| `yield-fixture:salmon-whole`     | `salmon-whole`          | `Whole Salmon`     |             899 | `lb`    |           0.56 |                  1605 |
| `yield-fixture:potato-russet`    | `potato-russet`         | `Russet Potatoes`  |             129 | `lb`    |           0.74 |                   174 |
| `yield-fixture:spinach`          | `spinach`               | `Fresh Spinach`    |             349 | `lb`    |           0.70 |                   499 |
| `yield-fixture:parsley`          | `parsley`               | `Italian Parsley`  |             179 | `bunch` |           0.72 |                   249 |
| `yield-fixture:lemon`            | `lemon`                 | `Fresh Lemons`     |             199 | `lb`    |           0.55 |                   362 |
| `yield-fixture:yellow-onion`     | `yellow-onion`          | `Yellow Onions`    |             129 | `lb`    |           0.88 |                   147 |
| `yield-fixture:garlic`           | `garlic`                | `Fresh Garlic`     |             299 | `lb`    |           0.82 |                   365 |
| `yield-fixture:romaine-lettuce`  | `romaine-lettuce`       | `Romaine Lettuce`  |             249 | `each`  |           0.84 |                   296 |

Notes:

- The verifier must seed the matching `source_registry` row if missing
- The verifier must not require any external API data
- The verifier must use the existing yield seeds already maintained by the service

### 4. Make verification cleanup deterministic

The verifier must clean up only its own fixture rows after validation:

- delete fixture `true_costs` rows by `current_price_id`
- delete fixture `current_prices` rows by ID prefix or explicit list
- delete fixture `source_registry` row only if it is the dedicated verifier source

Cleanup requirements:

- Use a transaction
- Never touch non-fixture rows
- Leave the shared yield seed data in place

### 5. Add a short spec-level note inside the verifier

At the top of `scripts/openclaw/verify-yield-normalization.mjs`, include a short comment that explains:

- this script is the deterministic verification path for Yield Normalization Engine
- it exists because the local OpenClaw mirror may be empty
- it intentionally seeds and cleans up fixture rows only

## Acceptance Criteria

- Running `node scripts/openclaw/verify-yield-normalization.mjs` succeeds from this repo root
- The verifier uses the real service logic, not a duplicate implementation
- The verifier proves all 10 expected usable-cost outputs exactly
- The verifier prints:
  - total fixture rows processed
  - total matches
  - total skipped
  - 5 sample computed rows
- The verifier exits non-zero if any expected cents value differs
- After verification cleanup, no fixture `current_prices` rows remain
- No existing runtime behavior is broken

## Non-Goals

- Do not add scheduling or cron wiring
- Do not change ChefFlow/Postgres code
- Do not expand yield coverage beyond the current embedded dataset
- Do not redesign the `true_costs` model

## Implementation Notes

- Prefer direct imports over shelling out to `node` from the verifier
- If a tiny refactor is needed to export the service runner, keep it local to the same file
- Keep logs minimal and factual
- Use integer cents throughout

## Done Definition

The Yield Normalization Engine has a checked-in, deterministic, additive verification path that can be run by any agent in this repo without manual seeding.
