# CI test enumeration proof (2026-09-28)

Branch: `fix/ci-test-glob-20260928`, based on `main e944ed554897ddb0d7686b38312c7e28083a3e71`.

- `node scripts/run-node-test-globs.mjs --list 'tests/unit/**/*.test.ts'` selected 520 files: 514 directly under `tests/unit` and 6 nested. The `**/` pattern includes both.
- The five unchanged `test:critical` patterns selected 10 distinct files: four `auth.*`, three `ledger.*`, and one each for events FSM, quotes math, and focus mode.
- The runner expands files in Node, sorts and deduplicates them, and invokes `node --test --import tsx` without a shell. An unmatched pattern exits nonzero rather than silently reducing coverage.
- Local Windows Node v24.19.0 `npm run test:critical`, using the existing main-checkout dependency directory as an ignored junction: 225 assertions, 224 passed, 1 failed, 22.30 seconds. Exact CI Node 20 verification requires the pushed branch workflow.

The existing `tests/unit/auth.tenant-isolation.test.ts` failure reports seven files for manual security review:

- `lib/ai/remy-routines-actions.ts`
- `lib/calling/vendor-action-extraction-actions.ts`
- `lib/cannabis/notifications.ts`
- `lib/client-contribution/actions.ts`
- `lib/compliance/compliance-infrastructure-actions.ts`
- `lib/openclaw/archive-digester-actions.ts`
- `lib/openclaw/enrichment-actions.ts`

The test remains unchanged and selected. This branch makes the failure visible; it does not classify those seven uses as safe or unsafe.
