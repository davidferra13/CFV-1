# Release Gate Attestation Bridge

Date: 2026-04-22

## What changed

`scripts/verify-release.mjs` now executes the existing release contract instead of hard-coding a parallel release flow.

Before this change:

- `lib/release/release-gate-manifest.js` defined the gate taxonomy and warning policies, but the executor did not consume it as the source of truth.
- `lib/release/release-attestation.js` could write attestations, but `verify-release` did not emit one for the actual release run.
- the release executor skipped `audit:completeness:json`, so the surface completeness contract was not part of release verification.
- warning policy helpers existed, but build output was not classified into tracked advisories versus blockers.

After this change:

- release profiles are built from `lib/release/release-gate-manifest.js`
- `audit:completeness:json` runs as a machine-readable gate
- machine-readable step output is parsed and invalid JSON fails closed
- warning policies are classified through `evaluateReleaseGateWarnings(...)`
- every run writes a machine-readable attestation through `lib/release/release-attestation.js`, including failing runs

The executor still runs the existing scripts. This change bridges them into one authoritative report and attestation path.

## Why

ChefFlow already had the contract pieces for release gates, warning policy handling, and attestation writing.

The gap was the integration layer. `verify-release` still behaved like an isolated runner, which meant the release manifest was descriptive but not authoritative, and the attestation helper was present but not tied to the actual gate execution.

This slice closes that gap without introducing a second checker or a renamed control plane.

## Verification

Focused tests added and passed:

- `tests/unit/verify-release-profile.test.ts`
- `tests/unit/release-attestation-bridge.test.ts`
- `tests/unit/surface-completeness.test.ts`
- `tests/unit/web-beta-build-surface.test.ts`

Command run:

```bash
node --test --import tsx tests/unit/verify-release-profile.test.ts tests/unit/release-attestation-bridge.test.ts tests/unit/surface-completeness.test.ts tests/unit/web-beta-build-surface.test.ts
```

Live UI verification also passed against an isolated local server on `127.0.0.1:3115` by authenticating through `POST /api/e2e/auth`, loading `/dashboard`, and capturing `tmp-release-gate-dashboard-3115.png`.
