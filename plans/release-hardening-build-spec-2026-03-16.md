# Release Hardening Build Spec - 2026-03-16

Owner: `Platform`
Status: `Active`
Scope: `Commercial release hardening`

## Objective

Move the current ChefFlow build from "feature-rich but release-fragile" to a deterministic commercial-release candidate by hardening five surfaces:

1. Release gate determinism
2. Public-route reachability
3. External callback and webhook trust boundaries
4. Health and readiness semantics
5. Runtime verification after restart

## Architecture Specification

### 1. Release Gate Architecture

Canonical gates:

- `npm run verify:release`
- `npm run verify:release:web-beta`

Required preconditions for release:

- TypeScript scope may include the stable `.next/types/**/*.ts` tree required by Next.js, but must exclude ephemeral generated trees such as `.next-dev-*`, `.next-verify-*`, and build-probe directories.
- Lint must be clean under the configured profile.
- Public auth/routing policy must cover every public route under `app/(public)`.
- Health endpoints must degrade correctly under missing-env conditions.
- Webhook validation must fail closed on SSRF-class targets.

### 2. Public Route Policy

Single source of truth:

- `lib/auth/route-policy.ts`

Design rule:

- Every route under `app/(public)` must be reachable without authentication unless explicitly documented otherwise.
- Route-policy coverage is enforced by unit test, not by convention.

### 3. External Callback Security

Single validation boundary:

- `lib/security/url-validation.ts`

Contract:

- Validation throws on invalid callback targets.
- Valid targets return a normalized `URL`.
- Invalid targets are rejected before any persistence or outbound request.

Blocked targets:

- `localhost`
- loopback and private IPv4 ranges
- link-local and metadata endpoints
- non-HTTPS URLs
- credentialed URLs

Protected integration surfaces:

- Zapier subscription API
- Chef-managed webhook endpoint creation
- Server-side Zapier webhook subscription actions

### 4. Health and Readiness Semantics

Shared builder:

- `lib/health/public-health.ts`

Endpoint split:

- `/api/health`
  - fast public operational signal
  - checks env presence and circuit breaker state
  - supports `strict=1`
- `/api/health/readiness`
  - deeper readiness signal
  - adds background-job visibility
  - supports `strict=1`

Response contract:

- request ID header
- health status header
- scope header
- machine-readable `checks` and `details`

### 5. Verification Topology

Source-level verification:

- route coverage tests
- validator tests
- health endpoint tests
- release profile tests

Runtime verification:

- clean process restart
- strict health probes
- targeted smoke path checks
- data-integrity signal checks via existing release and unit gates

## Delivery Timeline

### Phase 0 - Immediate Hardening

Duration: `same day`

- Remove ephemeral generated type-tree pollution from the base TypeScript config
- Restore webhook validation fail-closed behavior
- Restore public feedback route accessibility
- Align `/api/health` with monitored contract
- Clear lint noise on sign-in entry path

Exit criteria:

- All targeted failing unit tests are green
- `lint:strict` is green

### Phase 1 - Release Gate Proof

Duration: `0.5 to 1 day`

- Run `typecheck`
- Run targeted and profile-specific unit suites
- Run `verify:release:web-beta`
- Run full `verify:release`

Exit criteria:

- Both release profiles pass
- No red blocker remains in release-gate paths

### Phase 2 - Restart and Runtime Certification

Duration: `same day after Phase 1`

- Stop stale local Next/NPM build processes
- Start a clean application process from the validated build
- Probe health/readiness endpoints
- Run focused smoke verification against public and auth entry paths

Exit criteria:

- Clean process boot
- Health endpoints respond as expected
- Core paths render and authenticate without regression

### Phase 3 - Commercial Readiness Decision

Duration: `1 to 2 days after runtime certification`

- Review monitoring configuration
- Confirm environment separation
- Confirm billing/webhook/security posture in production-like env
- Decide go/no-go for paid or cohort release

Exit criteria:

- Release gate green
- Runtime verification green
- No open auth, billing, SSRF, or data-loss blocker

## Non-Negotiable Stop-Ship Rules

- Any failing release gate in `verify:release` or `verify:release:web-beta`
- Any public route that incorrectly requires authentication
- Any external callback flow that accepts internal or non-TLS targets
- Any health endpoint that masks degraded state under strict mode
- Any unresolved typecheck instability that prevents reproducible builds
