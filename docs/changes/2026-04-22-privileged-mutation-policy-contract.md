# Privileged Mutation Policy Contract

Date: 2026-04-22

## What changed

`lib/auth/server-action-inventory.ts` now extends the existing shared mutation inventory with privileged-mutation policy metadata.

Before this change:

- the inventory could tell which server actions mutated data, but not which ones carried privileged blast radius
- admin, finance, contract, and client mutations had no shared policy contract for auth and observability expectations
- integrity tests could verify mutation discovery, but not whether high-risk files still mapped into one canonical policy owner

After this change:

- page-facing mutations resolve to `standard`, `sensitive`, or `critical`
- the shared contract emits triggers, required controls, and violation codes for missing auth or observability signals
- inventory summaries now report privileged, sensitive, critical, and violating mutation counts
- unit coverage proves the failure path for a sensitive client mutation with missing observability
- `tests/system-integrity/q80-revalidation-after-mutation.spec.ts` ensures known privileged-action files still classify through the shared contract

## Why

ChefFlow already had a canonical owner for server-action mutation discovery. The missing layer was policy truth, not another registry.

Adding a sibling privileged-action catalog would have split ownership between mutation discovery and privilege classification, which is exactly the kind of auth drift the system-integrity suite is supposed to catch. Extending the existing inventory keeps one owner, one scan path, and one automation surface.

## Verification

- `node --test --import tsx tests/unit/server-action-auth-inventory.test.ts`
- `npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q80-revalidation-after-mutation.spec.ts`
- Focused typecheck passed with a temporary tsconfig targeting the changed files via `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc -p <temp-config> --pretty false`

Repo-wide CI typecheck is still blocked on unrelated existing dirty-checkout errors in `lib/openclaw/ingredient-knowledge-queries.ts` and `lib/openclaw/public-ingredient-queries.ts`. This slice did not change those files.
