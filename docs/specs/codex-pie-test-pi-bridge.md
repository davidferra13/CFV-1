# Codex Build Spec: PIE Pi Bridge Tests

> **Priority:** P0 - Circuit breaker logic untested. Failure = 2s timeout on every request
> **Risk:** LOW - test-only, no production code modified
> **Estimated scope:** ~200 lines, 1 new test file

## Context

`lib/pricing/pi-bridge.ts` connects to the Raspberry Pi's price API over direct ethernet (port 7700). Has a circuit breaker pattern: 3 failures = open circuit, 5min cooldown, half-open probe. Serves 1.1M prices at sub-5ms latency. Zero tests for the circuit breaker logic.

## File to Create

`tests/unit/pie.pi-bridge.test.ts`

## What to Test

### 1. Circuit breaker state machine

- Initial state = closed (requests allowed)
- 1 failure: state stays closed, failures = 1
- 2 failures: state stays closed, failures = 2
- 3 failures: state transitions to OPEN (requests blocked)
- After 5 minutes in OPEN: transitions to HALF_OPEN (one probe allowed)
- Successful probe in HALF_OPEN: transitions back to CLOSED, failures reset to 0
- Failed probe in HALF_OPEN: transitions back to OPEN

### 2. `shouldAllowRequest()` behavior

- closed = true
- open (recently failed) = false
- open (5min+ elapsed) = true (one probe)
- half_open = true (one probe)

### 3. `recordSuccess()` and `recordFailure()` state transitions

- recordSuccess: failures = 0, state = closed, lastSuccess updated
- recordFailure: failures++, lastFailure updated
- recordFailure at threshold: state = open

### 4. `lookupPrice()` integration

- Pi reachable: returns price object with ingredientId, priceCents, unit, source
- Pi unreachable: returns null (not throw)
- Pi timeout (>2s): returns null, records failure
- Circuit open: skips fetch entirely, returns null immediately

### 5. `lookupPricesBatch()` behavior

- Multiple ingredients, Pi reachable: returns Map of results
- Circuit open: returns empty Map immediately (no network call)
- Partial failure mid-batch: returns what succeeded, records failure

## Test Approach

Mock `fetch` (or whatever HTTP client is used). Use `jest.useFakeTimers()` to control the 5-minute cooldown window. Do NOT actually hit the Pi.

## Important

The circuit breaker state is module-level (singleton). Tests must reset circuit state between test cases. Look for how the circuit object is structured and reset it in `beforeEach`.

## Acceptance Criteria

- `npm run test -- tests/unit/pie.pi-bridge.test.ts` passes
- All 5 test groups covered
- No modifications to production code
